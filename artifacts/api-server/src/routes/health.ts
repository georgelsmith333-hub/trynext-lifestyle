import { Router, type IRouter, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getConfiguredGoogleClientId } from "./auth";
import { ObjectStorageService } from "../lib/objectStorage";
import { getRedisStatus } from "../lib/redis";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  // Run DB + Redis checks concurrently so a slow dependency doesn't block the other.
  // getRedisStatus() bypasses the in-process fallback so a real Upstash outage
  // is reported as "error" instead of silently succeeding via in-memory map.
  const [dbResult, redisResult] = await Promise.allSettled([
    db.execute(sql`SELECT 1`),
    getRedisStatus(),
  ]);

  const dbStatus = dbResult.status === "fulfilled" ? "ok" : "error";

  // Extract Redis mode — default to "error" if the check itself threw (shouldn't happen).
  const redisMode = redisResult.status === "fulfilled" ? redisResult.value.mode : "error";
  const redisDetail = redisResult.status === "fulfilled" ? redisResult.value.detail : undefined;

  const storageBackend = new ObjectStorageService().getBackendName();

  // Overall status hierarchy:
  //   "error"    — DB is unreachable (requests cannot be served)
  //   "degraded" — Upstash Redis was configured but is unreachable (cache misses, no data loss)
  //   "ok"       — all configured services healthy (redis "not_configured" is intentional, not a problem)
  let overallStatus: "ok" | "degraded" | "error";
  if (dbStatus === "error") {
    overallStatus = "error";
  } else if (redisMode === "error") {
    overallStatus = "degraded";
  } else {
    overallStatus = "ok";
  }

  res.json({
    status: overallStatus,
    db: dbStatus,
    redis: redisMode,
    ...(redisDetail ? { redis_detail: redisDetail } : {}),
    storage: storageBackend,
    runtimeRole: process.env.TRYNEXT_RUNTIME_ROLE ?? "primary",
    schedulerEnabled: process.env.SCHEDULER_ENABLED !== "false",
    backupSyncEnabled: process.env.BACKUP_SYNC_ENABLED === "true",
    ts: new Date().toISOString(),
  });
});

// Storage backend health. Reports the active backend, whether it is a
// portable (production-ready) backend, and best-effort connectivity by
// minting a presigned upload URL (which exercises the credentials without
// writing any real data).
router.get("/health/storage", async (_req, res) => {
  const svc = new ObjectStorageService();
  const backend = svc.getBackendName();
  let reachable = false;
  let error: string | null = null;
  try {
    // For S3/R2 this signs a PutObject URL; for the Replit sidecar it
    // signs a GET URL via the local sidecar. Either way, success means
    // the backend is reachable with the configured credentials.
    await svc.getObjectEntityUploadURL();
    reachable = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  res.json({
    backend,
    portable: backend === "r2" || backend === "s3",
    reachable,
    error,
  });
});

// Strict-contract auth diagnostic. Returns ONLY the three required
// booleans so external monitors / curl-based smoke checks have a stable
// shape. Never returns secret values. The richer diagnostic with
// per-column / per-table booleans lives at /api/auth/health.
router.get("/health/auth", async (_req, res) => {
  let dbReachable = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbReachable = true;
  } catch {
    // dbReachable stays false
  }
  res.json({
    google_configured: Boolean(await getConfiguredGoogleClientId()),
    jwt_secret_present: Boolean(process.env.JWT_SECRET),
    db_reachable: dbReachable,
  });
});

// NOTE: /admin/system/health and /admin/system/env-status must remain defined
// only in routes/systemHealth.ts. Keep this router free of duplicate handlers so
// the nested `services.*` and `vars` shapes stay the single source of truth.

// Note: POST /api/admin/system/flush-cache is handled by routes/systemHealth.ts
// which is mounted correctly at /api and uses redisCacheDel.

// ── GET /api/health/liveness ──────────────────────────────────────────────
// Lightweight liveness probe for external monitoring (K8s, UptimeRobot, etc.).
// Returns fast 200 with minimal overhead — no DB query needed.
router.get("/health/liveness", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    runtimeRole: process.env.TRYNEXT_RUNTIME_ROLE ?? "primary",
  });
});

// ── GET /api/health/readiness and /api/readyz ──────────────────────────────
// Readiness probe — checks that the API can serve real requests by
// pinging the database. Keep both paths as aliases because the gateway,
// monitors, and older deployment documentation use both contracts.
const readinessHandler = async (_req: Request, res: Response) => {
  let dbOk = false;
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1 AS ok`);
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    // dbOk stays false
  }

  const overall = dbOk ? "ok" : "error";
  const httpStatus = dbOk ? 200 : 503;

  res.status(httpStatus).json({
    status: overall,
    db: dbOk,
    dbLatencyMs,
    uptime: Math.floor(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    runtimeRole: process.env.TRYNEXT_RUNTIME_ROLE ?? "primary",
    schedulerEnabled: process.env.SCHEDULER_ENABLED !== "false",
    backupSyncEnabled: process.env.BACKUP_SYNC_ENABLED === "true",
    timestamp: new Date().toISOString(),
  });
};

router.get("/health/readiness", readinessHandler);
router.get("/readyz", readinessHandler);

export default router;
