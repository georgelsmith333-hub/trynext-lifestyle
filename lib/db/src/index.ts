/**
 * Resilient PostgreSQL connection with automatic failover.
 *
 * Priority order for connection URLs:
 *   1. DATABASE_URL_MAIN     (Neon primary — transactional source)
 *   2. DATABASE_FAILOVER     (Neon failover — transactional standby)
 *   3. DATABASE_ANALYTICS     (full mirror — preserves orders and admin data)
 *   4. DATABASE_URL_TRYNEXT_DB (Neon secondary — transactional standby)
 *   5. DATABASE_URL            (Replit built-in — local development last resort)
 *
 * DATABASE_PRODUCTS is intentionally excluded from this chain. It is a catalog
 * satellite and may not contain orders, admin data, or the current schema.
 *
 * The probe validates that a connection both connects AND has the expected
 * transactional schema (`products` and `orders`). This prevents a catalog-only
 * database from silently becoming the live source of truth.
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
    process.env.DATABASE_URL_MAIN,      // Neon primary — preferred production DB
    process.env.DATABASE_FAILOVER,      // Neon failover — ep-crimson-dawn
    process.env.DATABASE_ANALYTICS,     // Full mirror — preserves historical orders/admin data
    process.env.DATABASE_URL_TRYNEXT_DB, // Neon secondary (if configured)
    process.env.DATABASE_URL,           // Replit built-in — last resort
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

const primaryUrl = urls[0];

/* ─── Internal mutable state (switched on failover) ─────────────────────── */
let _activePool: pg.Pool = new Pool({
  connectionString: primaryUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

let _activeDb: NodePgDatabase<typeof schema> = drizzle(_activePool, { schema });
let _activeUrl = primaryUrl;

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

/* ─── Schema validation helper ───────────────────────────────────────────── */
/**
 * Returns true if this pool can connect AND the database has the expected
 * schema (products table exists). This prevents falling back to an empty
 * local database when Neon is reachable but the local DB has no tables.
 */
type ProbeResult = {
  ok: boolean;
  pool?: pg.Pool;
  error?: string;
  orders: number;
  products: number;
  mockups: number;
};

async function hasSchema(testPool: pg.Pool): Promise<{ products: boolean; orders: boolean; mockups: boolean }> {
  const client = await testPool.connect();
  try {
    const result = await client.query(
      `SELECT
         EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') AS products,
         EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') AS orders,
         EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockups') AS mockups`
    );
    return result.rows[0] ?? { products: false, orders: false, mockups: false };
  } finally {
    client.release();
  }
}

/* ─── Probe a single candidate URL (creates and ends its own test pool) ─── */
async function probeCandidate(url: string): Promise<ProbeResult> {
  const testPool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    const schema = await hasSchema(testPool);
    if (!schema.products || !schema.orders) {
      await testPool.end().catch(() => {});
      const missing = [!schema.products ? "products" : null, !schema.orders ? "orders" : null].filter(Boolean).join(", ");
      return { ok: false, error: `missing transactional schema: ${missing}`, orders: 0, products: 0, mockups: 0 };
    }
    const client = await testPool.connect();
    try {
      const result = await client.query(
        `SELECT
           ${schema.orders ? "(SELECT count(*)::int FROM orders)" : "0"} AS orders,
           ${schema.products ? "(SELECT count(*)::int FROM products)" : "0"} AS products,
           ${schema.mockups ? "(SELECT count(*)::int FROM mockups)" : "0"} AS mockups`
      );
      const row = result.rows[0] ?? {};
      return {
        ok: true,
        pool: testPool,
        orders: Number(row.orders ?? 0),
        products: Number(row.products ?? 0),
        mockups: Number(row.mockups ?? 0),
      };
    } finally {
      client.release();
    }
  } catch (err) {
    await testPool.end().catch(() => {});
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      orders: 0,
      products: 0,
      mockups: 0,
    };
  }
}

function dataScore(result: ProbeResult): number {
  // Historical orders are the strongest signal for the operational database;
  // products and mockups break ties between catalog mirrors.
  return result.orders * 1_000_000 + result.products * 1_000 + result.mockups;
}

async function chooseBestCandidate(): Promise<{ url: string; result: ProbeResult; index: number } | null> {
  const probed = await Promise.all(urls.map(async (url, index) => ({ url, index, result: await probeCandidate(url) })));
  const healthy = probed.filter((item) => item.result.ok && item.result.pool);
  if (healthy.length === 0) return null;
  healthy.sort((a, b) => dataScore(b.result) - dataScore(a.result) || a.index - b.index);
  const winner = healthy[0];
  for (const item of healthy.slice(1)) await item.result.pool!.end().catch(() => {});
  return winner;
}

function hostOf(url: string): string {
  return url.split("@").pop()?.split("?")[0] ?? "unknown";
}

/* ─── Switch the active pool to a new URL (thread-safe-ish by design) ───── */
async function switchTo(url: string, pool: pg.Pool): Promise<void> {
  const prev = _activePool;
  _activePool = pool;
  _activeDb = drizzle(_activePool, { schema });
  _activeUrl = url;
  await prev.end().catch(() => {});
}

/* ─── Non-blocking startup probe + failover ─────────────────────────────── */
async function probeAndFailover(): Promise<void> {
  const winner = await chooseBestCandidate();
  if (!winner) {
    console.error(
      "[DB] WARNING: All database connection candidates failed at probe time. " +
      "The server will still start — queries will fail until a DB becomes reachable.",
    );
    return;
  }
  await switchTo(winner.url, winner.result.pool!);
  const label = winner.index === 0 ? "primary" : `candidate #${winner.index + 1}`;
  console.info(
    `[DB] Connected to ${label} (${hostOf(winner.url)}; orders=${winner.result.orders}, products=${winner.result.products}, mockups=${winner.result.mockups})`,
  );
}

/* ─── Periodic re-probe: auto-recover to primary, failover if active dies ─ */
let _reprobeTimer: NodeJS.Timeout | null = null;
let _reprobeIntervalMs = 60_000; // re-evaluate every 60 seconds

async function reprobe(): Promise<void> {
  try {
    const winner = await chooseBestCandidate();
    if (!winner) return;
    if (winner.url !== _activeUrl) {
      const prevHost = hostOf(_activeUrl);
      const label = winner.index === 0 ? "primary" : `candidate #${winner.index + 1}`;
      await switchTo(winner.url, winner.result.pool!);
      console.warn(
        `[DB] Re-probe: switched from ${prevHost} to ${label} (${hostOf(winner.url)}; orders=${winner.result.orders}, products=${winner.result.products}, mockups=${winner.result.mockups})`,
      );
    } else {
      await winner.result.pool!.end().catch(() => {});
    }
  } catch {
    // Ignore individual probe errors — the next tick will retry.
  }
}

function startReprobeTimer(): void {
  if (_reprobeTimer) return;
  _reprobeTimer = setInterval(() => {
    reprobe().catch(() => {});
  }, _reprobeIntervalMs);
  _reprobeTimer.unref();
}

/**
 * Manually trigger a re-probe of the whole database chain. Useful in tests
 * and admin endpoints that want to force a failover check.
 */
export async function probeDatabaseChain(): Promise<{ activeUrl: string; index: number }> {
  await reprobe();
  return { activeUrl: _activeUrl, index: urls.indexOf(_activeUrl) };
}

// Exported promise — await this before running migrations or seeding
// so the correct database is active before any schema queries run.
export const dbReady: Promise<void> = probeAndFailover()
  .then(() => {
    startReprobeTimer();
  })
  .catch(() => {
    // Even if the initial probe fails, start the timer so we recover later.
    startReprobeTimer();
  });

/* ─── DB health helper (used by /api/health/auth) ───────────────────────── */
export async function getActiveDbUrl(): Promise<string> {
  return _activeUrl;
}

export * from "./schema";
