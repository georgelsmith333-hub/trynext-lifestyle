/**
 * Resilient PostgreSQL connection with automatic failover.
 *
 * Priority order for connection URLs:
 *   1. DATABASE_URL_MAIN     (Neon primary — ep-proud-hill) ← preferred when set
 *   2. DATABASE_URL          (Replit built-in / local dev fallback)
 *   3. DATABASE_URL_TRYNEX_DB (Neon secondary — ep-small-cake)
 *   4. DATABASE_FAILOVER     (Neon failover  — ep-crimson-dawn)
 *
 * Neon (DATABASE_URL_MAIN) is tried first so production data is always used
 * when the Neon credentials are configured.  The Replit built-in Postgres
 * remains as an automatic fallback for local dev without any extra config.
 *
 * The module probes all URLs at startup (non-blocking) and switches
 * transparently to the first reachable one. All callers use the same
 * `db` and `pool` exports — no changes required elsewhere.
 */

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/* ─── Candidate URL resolution ───────────────────────────────────────────── */
function getCandidateUrls(): string[] {
  const candidates = [
    process.env.DATABASE_URL_MAIN,   // Neon primary — preferred production DB
    process.env.DATABASE_URL,        // Replit built-in / local dev fallback
    process.env.DATABASE_URL_TRYNEX_DB,
    process.env.DATABASE_FAILOVER,
  ].filter((url): url is string => typeof url === "string" && url.trim().length > 0);

  // Preserve insertion order, deduplicate
  return [...new Set(candidates)];
}

const urls = getCandidateUrls();

if (urls.length === 0) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/* ─── Internal mutable state (switched on failover) ─────────────────────── */
let _activePool: pg.Pool = new Pool({
  connectionString: urls[0],
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

let _activeDb: NodePgDatabase<typeof schema> = drizzle(_activePool, { schema });
let _activeUrl = urls[0];

/* ─── Transparent proxies (callers see a stable reference) ──────────────── */
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (_activePool as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    return (_activeDb as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/* ─── Non-blocking startup probe + failover ─────────────────────────────── */
async function probeAndFailover(): Promise<void> {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const testPool =
      i === 0
        ? _activePool
        : new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5_000 });

    try {
      const client = await testPool.connect();
      client.release();

      if (i > 0) {
        // Primary is down — switch to this fallback permanently for this process
        const prev = _activePool;
        _activePool = testPool;
        _activeDb = drizzle(_activePool, { schema });
        _activeUrl = url;
        await prev.end().catch(() => {});

        const host = url.split("@").pop()?.split("?")[0] ?? "unknown";
        console.warn(
          `[DB] Primary unreachable. Switched to fallback #${i + 1} (${host})`,
        );
      }

      return; // Found a working connection
    } catch {
      if (i > 0) await testPool.end().catch(() => {});
      // else leave _activePool in place (it may recover)
    }
  }

  console.error(
    "[DB] WARNING: All database connection candidates failed at probe time. " +
    "The server will still start — queries will fail until a DB becomes reachable.",
  );
}

// Fire probe async — does not block module load or server startup
probeAndFailover().catch(() => {});

/* ─── DB health helper (used by /api/health/auth) ───────────────────────── */
export async function getActiveDbUrl(): Promise<string> {
  return _activeUrl;
}

export * from "./schema";
