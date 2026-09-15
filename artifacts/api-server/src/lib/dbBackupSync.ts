/**
 * Full-database backup sync.
 *
 * Mirrors every table in the active production database (Neon Main) into each
 * configured backup/shard database (Neon Failover, Products shard, Analytics
 * shard, and — if configured — Neon Secondary) so they always reflect the
 * live data, not just whatever they happened to have when first provisioned.
 *
 * Runs on a schedule (see scheduler.ts) and can also be triggered on demand
 * via POST /api/admin/backup/sync-now.
 *
 * Strategy per target (safe full mirror):
 *   1. Verify the source database is reachable and has data.
 *   2. Verify the target URL is not the same as the source URL.
 *   3. Verify source and target schemas match (no silent drift).
 *   4. Truncate shared target tables with identity reset and CASCADE.
 *   5. Insert rows from source in parent-before-child order.
 *   6. Re-sync any integer sequences (serial/identity primary keys).
 *
 * This is a full mirror (not an incremental diff), which is appropriate here
 * because these targets are cold-standby/failover copies, not independently
 * written-to databases.
 */

import pg from "pg";
import { logger } from "./logger";
import { getActiveDbUrl } from "@workspace/db";

const { Pool } = pg;

export interface BackupTarget {
  id: string;
  label: string;
  envKey: string;
}

export const BACKUP_TARGETS: BackupTarget[] = [
  { id: "neon_failover", label: "Neon Failover", envKey: "DATABASE_FAILOVER" },
  { id: "neon_secondary", label: "Neon Secondary", envKey: "DATABASE_URL_TRYNEXT_DB" },
  { id: "neon_products", label: "Products shard", envKey: "DATABASE_PRODUCTS" },
  { id: "neon_analytics", label: "Analytics shard", envKey: "DATABASE_ANALYTICS" },
];

export interface TargetSyncResult {
  id: string;
  label: string;
  status: "ok" | "skipped" | "blocked" | "error";
  tablesCopied?: number;
  rowsCopied?: number;
  message?: string;
  durationMs?: number;
}

export interface SchemaRepairResult {
  id: string;
  label: string;
  status: "repaired" | "skipped" | "blocked" | "error";
  message: string;
  durationMs: number;
}

async function getTables(pool: pg.Pool): Promise<string[]> {
  const r = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name <> '_migrations'
     ORDER BY table_name`,
  );
  return r.rows.map((row: { table_name: string }) => row.table_name);
}

interface ColumnInfo {
  name: string;
  dataType: string;
}

type Queryable = Pick<pg.Pool, "query">;

async function getColumns(pool: Queryable, table: string): Promise<ColumnInfo[]> {
  const r = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((row: { column_name: string; data_type: string }) => ({
    name: row.column_name,
    dataType: row.data_type,
  }));
}

/** node-postgres does not auto-serialize JS objects/arrays for json/jsonb columns. */
function serializeForColumn(value: unknown, dataType: string): unknown {
  if (value === null || value === undefined) return value;
  if ((dataType === "json" || dataType === "jsonb") && typeof value === "object") {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Returns { child: parent } foreign key edges so inserts can happen in
 * parent-before-child order and deletes in child-before-parent order.
 */
async function getForeignKeyEdges(pool: pg.Pool): Promise<Array<{ child: string; parent: string }>> {
  const r = await pool.query(`
    SELECT tc.table_name AS child, ccu.table_name AS parent
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      AND tc.table_name <> ccu.table_name
  `);
  return r.rows;
}

/** Topologically sorts tables so every parent comes before its children. */
function topoSortTables(tables: string[], edges: Array<{ child: string; parent: string }>): string[] {
  const tableSet = new Set(tables);
  const dependsOn = new Map<string, Set<string>>();
  for (const t of tables) dependsOn.set(t, new Set());
  for (const { child, parent } of edges) {
    if (tableSet.has(child) && tableSet.has(parent)) {
      dependsOn.get(child)!.add(parent);
    }
  }

  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(t: string): void {
    if (visited.has(t)) return;
    if (visiting.has(t)) return; // cycle guard — leave order as-is
    visiting.add(t);
    for (const dep of dependsOn.get(t) ?? []) visit(dep);
    visiting.delete(t);
    visited.add(t);
    result.push(t);
  }

  for (const t of [...tables].sort()) visit(t);
  return result;
}

async function countSourceRows(pool: pg.Pool, tables: string[]): Promise<number> {
  let total = 0;
  for (const table of tables) {
    const r = await pool.query(`SELECT COUNT(*)::int AS n FROM "${table}"`);
    total += Number(r.rows[0]?.n ?? 0);
  }
  return total;
}

async function verifySchemasMatch(
  sourcePool: pg.Pool,
  targetPool: pg.Pool,
  tables: string[],
): Promise<void> {
  for (const table of tables) {
    const sourceColumns = await getColumns(sourcePool, table);
    const targetColumns = await getColumns(targetPool, table);
    const sourceMap = new Map(sourceColumns.map((c) => [c.name, c.dataType]));
    const targetMap = new Map(targetColumns.map((c) => [c.name, c.dataType]));

    // The mirror writes an explicit source-column list, so target-only legacy
    // columns are safe when they remain nullable/defaulted. Block only when a
    // source column is missing or has an incompatible type on the target.
    for (const [name, dataType] of sourceMap) {
      if (!targetMap.has(name)) {
        throw new Error(`Schema mismatch for table "${table}": column "${name}" missing on target. Run migrations on the target first.`);
      }
      if (targetMap.get(name) !== dataType) {
        throw new Error(
          `Schema mismatch for table "${table}": column "${name}" has type ${dataType} on source but ${targetMap.get(name)} on target. Run migrations on the target first.`,
        );
      }
    }
  }
}

const ADDITIVE_SCHEMA_PATCHES = [
  // Live Analytics source fields retained for compatibility with the active
  // production mirror while the shared schema package catches up.
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS product_type text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS color_name text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS side text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS fallback_url text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS print_zone_x integer`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS print_zone_y integer`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS print_zone_w integer`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS print_zone_h integer`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text`,
  // The admin order workflow accepts verified/wrong for legacy payment review;
  // reconcile the target check constraint before mirroring those historical rows.
  `ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check`,
  `ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'processing', 'ongoing', 'shipped', 'delivered', 'cancelled'))`,
  `ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check`,
  `ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'submitted', 'verified', 'paid', 'not_paid', 'wrong', 'refunded'))`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_url text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_name text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_mime text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_size integer`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_sha256 text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS source_kit_key text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS face text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS color text`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS manifest_json jsonb`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS ingestion_status text NOT NULL DEFAULT 'preview-only'`,
  `ALTER TABLE mockups ADD COLUMN IF NOT EXISTS ingestion_error text`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb`,
  `CREATE INDEX IF NOT EXISTS mockups_source_kit_key_idx ON mockups(source_kit_key)`,
  `CREATE INDEX IF NOT EXISTS mockups_ingestion_status_idx ON mockups(ingestion_status)`,
] as const;

export async function repairTargetSchemas(): Promise<SchemaRepairResult[]> {
  if (process.env.ALLOW_DB_SCHEMA_REPAIR !== "true") {
    return BACKUP_TARGETS.map((target) => ({
      id: target.id,
      label: target.label,
      status: "blocked" as const,
      message: "Schema repair is disabled. Set ALLOW_DB_SCHEMA_REPAIR=true for an additive-only repair window, then retry.",
      durationMs: 0,
    }));
  }

  const results: SchemaRepairResult[] = [];
  for (const target of BACKUP_TARGETS) {
    const start = Date.now();
    const targetUrl = process.env[target.envKey];
    if (!targetUrl) {
      results.push({ id: target.id, label: target.label, status: "skipped", message: `${target.envKey} not configured`, durationMs: Date.now() - start });
      continue;
    }

    const pool = new Pool({ connectionString: targetUrl, max: 1, connectionTimeoutMillis: 10_000 });
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const statement of ADDITIVE_SCHEMA_PATCHES) await client.query(statement);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
      results.push({ id: target.id, label: target.label, status: "repaired", message: "Additive schema patch applied; run Sync Now to verify and mirror data.", durationMs: Date.now() - start });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: target.id, label: target.label, status: "error", message: message.slice(0, 240), durationMs: Date.now() - start });
    } finally {
      await pool.end().catch(() => {});
    }
  }
  return results;
}

async function syncOneTarget(
  sourceUrl: string,
  target: BackupTarget,
): Promise<TargetSyncResult> {
  const start = Date.now();
  const targetUrl = process.env[target.envKey];

  if (!targetUrl || targetUrl.trim().length === 0) {
    return { id: target.id, label: target.label, status: "skipped", message: `${target.envKey} not configured` };
  }

  if (sourceUrl === targetUrl || sourceUrl.replace(/^postgres:\/\/[^:]+:[^@]+@/, "") === targetUrl.replace(/^postgres:\/\/[^:]+:[^@]+@/, "")) {
    return { id: target.id, label: target.label, status: "skipped", message: "Target URL matches source URL" };
  }

  const sourcePool = new Pool({ connectionString: sourceUrl, max: 2, connectionTimeoutMillis: 10_000 });
  const targetPool = new Pool({ connectionString: targetUrl, max: 2, connectionTimeoutMillis: 10_000 });

  try {
    const sourceTables = await getTables(sourcePool);
    const targetTables = new Set(await getTables(targetPool));
    const sharedTables = sourceTables.filter((t) => targetTables.has(t));
    // A target can retain stricter constraints than the active source during
    // rolling schema transitions. Include both graphs so target-only foreign
    // keys still force parent-before-child inserts.
    const allEdges = [
      ...(await getForeignKeyEdges(sourcePool)),
      ...(await getForeignKeyEdges(targetPool)),
    ];
    const edges = [...new Map(allEdges.map((edge) => [`${edge.child}:${edge.parent}`, edge])).values()];
    const insertOrder = topoSortTables(sharedTables, edges);

    // Safety verification: source must be reachable and have some data.
    const sourceRows = await countSourceRows(sourcePool, sharedTables);
    if (sourceTables.length === 0) {
      throw new Error("Source database has no public tables to sync");
    }
    if (sourceRows === 0) {
      logger.warn({ target: target.label }, "[backupSync] Source database appears empty; skipping sync to avoid wiping target");
      return { id: target.id, label: target.label, status: "skipped", message: "Source database appears empty" };
    }

    await verifySchemasMatch(sourcePool, targetPool, insertOrder);

    const client = await targetPool.connect();
    let rowsCopied = 0;
    try {
      await client.query("BEGIN");

      // A plain DELETE leaves serial sequences and any trigger-side rows in an
      // ambiguous state. TRUNCATE is atomic, resets identities, and CASCADE
      // makes repeated full mirrors idempotent even when a target has stale
      // child rows from an older schema.
      const truncateList = insertOrder.map((table) => `"${table}"`).join(", ");
      if (truncateList) {
        await client.query(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`);
      }

      // Insert in parent-before-child order so FK constraints are satisfied.
      const BATCH_SIZE = 100;
      for (const table of insertOrder) {
        const columns = await getColumns(sourcePool, table);
        if (columns.length === 0) continue;

        const { rows } = await sourcePool.query(`SELECT * FROM "${table}"`);
        if (rows.length === 0) continue;

        const colList = columns.map((c) => `"${c.name}"`).join(", ");

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const values: unknown[] = [];
          const valueGroups: string[] = [];
          for (const row of batch) {
            const rowStart = values.length;
            for (const c of columns) values.push(serializeForColumn(row[c.name], c.dataType));
            const placeholders = columns.map((_, j) => `$${rowStart + j + 1}`).join(", ");
            valueGroups.push(`(${placeholders})`);
          }
          // ON CONFLICT DO NOTHING makes the mirror idempotent: if a prior run
          // committed some rows before crashing, we won't duplicate them.
          const insertSql = `INSERT INTO "${table}" (${colList}) VALUES ${valueGroups.join(", ")} ON CONFLICT DO NOTHING`;
          await client.query(insertSql, values);
          rowsCopied += batch.length;
        }

        // Best-effort sequence resync for integer primary keys named "id"
        try {
          await client.query(
            `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`,
            [table],
          );
        } catch {
          // Table has no serial "id" sequence (e.g. uuid PK) — safe to ignore
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    const durationMs = Date.now() - start;
    logger.info(
      { target: target.label, tables: insertOrder.length, rows: rowsCopied, durationMs },
      "[backupSync] Target synced",
    );
    return { id: target.id, label: target.label, status: "ok", tablesCopied: insertOrder.length, rowsCopied, durationMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ target: target.label, err: message }, "[backupSync] Target sync failed");
    const blockedBySchema = message.startsWith("Schema mismatch for table");
    return { id: target.id, label: target.label, status: blockedBySchema ? "blocked" : "error", message, durationMs: Date.now() - start };
  } finally {
    await sourcePool.end().catch(() => {});
    await targetPool.end().catch(() => {});
  }
}

/**
 * Mirrors the live Neon Main database into every configured backup target.
 * Safe to call repeatedly (e.g. on a schedule) — always does a full replace.
 */
export async function runBackupSync(): Promise<TargetSyncResult[]> {
  // Use the currently active database as the source of truth so that failover
  // does not break backup sync when the configured primary is over quota.
  const sourceUrl = await getActiveDbUrl();
  if (!sourceUrl) {
    logger.warn("[backupSync] No source database configured — skipping sync");
    return [];
  }

  const results: TargetSyncResult[] = [];
  for (const target of BACKUP_TARGETS) {
    const result = await syncOneTarget(sourceUrl, target);
    results.push(result);
  }
  return results;
}
