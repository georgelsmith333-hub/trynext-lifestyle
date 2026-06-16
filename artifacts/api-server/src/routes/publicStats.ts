import { Router, type IRouter } from "express";
import { db, ordersTable } from "@workspace/db";
import { sql, desc, gte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { redisCacheGet, redisCacheSet } from "../lib/redis";

const router: IRouter = Router();

// ── Redis-backed cache (60 seconds TTL) ──────────────────────────────────────
// public-stats hits the DB 3× per request. Redis survives Render restarts;
// the in-process fallback inside redis.ts covers dev / Redis-not-configured.
const STATS_CACHE_KEY = "trynex:public-stats";
const STATS_TTL_S = 60;

async function fetchStats() {
  const now = new Date();
  const BST_OFFSET_MS = 6 * 60 * 60 * 1000;
  const nowBST = new Date(now.getTime() + BST_OFFSET_MS);
  const startOfTodayBST = new Date(
    Date.UTC(nowBST.getUTCFullYear(), nowBST.getUTCMonth(), nowBST.getUTCDate())
  );
  const startOfToday = new Date(startOfTodayBST.getTime() - BST_OFFSET_MS);

  const [todayCountRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, startOfToday));

  const [totalCountRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(ordersTable);

  const [lastOrderRow] = await db
    .select({ createdAt: ordersTable.createdAt })
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  const todayOrders = todayCountRow?.total ?? 0;
  const totalOrders = totalCountRow?.total ?? 0;

  let minutesSinceLastOrder: number | null = null;
  if (lastOrderRow?.createdAt) {
    const diff = Date.now() - new Date(lastOrderRow.createdAt).getTime();
    minutesSinceLastOrder = Math.floor(diff / 60000);
  }

  return { todayOrders, totalOrders, minutesSinceLastOrder };
}

router.get("/public-stats", async (_req, res) => {
  try {
    const cached = await redisCacheGet<Record<string, unknown>>(STATS_CACHE_KEY);
    if (cached) {
      res.set("X-Cache-Status", "HIT");
      res.json(cached);
      return;
    }
    const data = await fetchStats();
    await redisCacheSet(STATS_CACHE_KEY, data, STATS_TTL_S);
    res.set("X-Cache-Status", "MISS");
    res.json(data);
  } catch (err) {
    logger.warn({ err }, "Failed to get public stats");
    const stale = await redisCacheGet<Record<string, unknown>>(STATS_CACHE_KEY).catch(() => null);
    if (stale) {
      res.set("X-Cache-Status", "STALE");
      res.json(stale);
      return;
    }
    res.json({ todayOrders: 0, totalOrders: 0, minutesSinceLastOrder: null });
  }
});

export default router;
