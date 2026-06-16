/**
 * GET /api/admin/db-cluster
 *
 * Probes all configured Neon (and Replit) databases independently and returns
 * live connection status, latency, and failover chain priority for each node.
 *
 * Results are cached for 12 seconds to avoid hammering free-tier pools.
 * Each probe opens a disposable pool (max:1) with a strict 4-second timeout
 * so a dead node never blocks the whole response.
 */

import { Router, type IRouter } from "express";
import pg from "pg";
import { requireAdmin } from "../middlewares/adminAuth";
import { getActiveDbUrl } from "@workspace/db";

const { Pool } = pg;
const router: IRouter = Router();

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface DbNodeStatus {
  id: string;
  label: string;
  role: string;
  host: string;
  inFailoverChain: boolean;
  failoverPriority: number | null;
  status: "ok" | "error" | "timeout" | "unconfigured";
  latencyMs: number | null;
  isActive: boolean;
  error?: string;
}

interface ClusterResponse {
  checkedAt: string;
  activeHost: string;
  totalNodes: number;
  healthyNodes: number;
  nodes: DbNodeStatus[];
}

/* ── Node definitions ───────────────────────────────────────────────────────── */

const NODE_DEFS = [
  {
    id: "replit_primary",
    label: "Replit Primary",
    role: "Local dev database (auto-provisioned)",
    envKey: "DATABASE_URL",
    inFailoverChain: true,
    failoverPriority: 1,
  },
  {
    id: "neon_main",
    label: "Neon Main",
    role: "Production primary — ep-proud-hill",
    envKey: "DATABASE_URL_MAIN",
    inFailoverChain: true,
    failoverPriority: 2,
  },
  {
    id: "neon_secondary",
    label: "Neon Secondary",
    role: "Overflow fallback — ep-small-cake",
    envKey: "DATABASE_URL_TRYNEX_DB",
    inFailoverChain: true,
    failoverPriority: 3,
  },
  {
    id: "neon_failover",
    label: "Neon Failover",
    role: "Last-resort failover — ep-crimson-dawn",
    envKey: "DATABASE_FAILOVER",
    inFailoverChain: true,
    failoverPriority: 4,
  },
  {
    id: "neon_products",
    label: "Products DB",
    role: "Dedicated products/catalogue shard — ep-crimson-mud",
    envKey: "DATABASE_PRODUCTS",
    inFailoverChain: false,
    failoverPriority: null,
  },
  {
    id: "neon_analytics",
    label: "Analytics DB",
    role: "Analytics & events shard — ep-cool-mountain",
    envKey: "DATABASE_ANALYTICS",
    inFailoverChain: false,
    failoverPriority: null,
  },
] as const;

/* ── Helper: extract safe host label from a connection string ────────────────── */
function maskUrl(url: string): string {
  try {
    // REDACTED_SECRET  →  HOST
    const after = url.split("@")[1] ?? "";
    const host = after.split("/")[0].split("?")[0];
    return host || "unknown";
  } catch {
    return "unknown";
  }
}

/* ── Probe a single database ─────────────────────────────────────────────────── */
async function probeNode(
  def: (typeof NODE_DEFS)[number],
  activeUrl: string
): Promise<DbNodeStatus> {
  const url = process.env[def.envKey];

  if (!url) {
    return {
      id: def.id,
      label: def.label,
      role: def.role,
      host: "not configured",
      inFailoverChain: def.inFailoverChain,
      failoverPriority: def.failoverPriority,
      status: "unconfigured",
      latencyMs: null,
      isActive: false,
    };
  }

  const host = maskUrl(url);
  const isActive = maskUrl(activeUrl) === host;

  const testPool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 4_000,
    idleTimeoutMillis: 1_000,
  });

  const start = Date.now();
  try {
    const client = await testPool.connect();
    await client.query("SELECT 1");
    client.release();
    const latencyMs = Date.now() - start;

    return {
      id: def.id,
      label: def.label,
      role: def.role,
      host,
      inFailoverChain: def.inFailoverChain,
      failoverPriority: def.failoverPriority,
      status: "ok",
      latencyMs,
      isActive,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout =
      msg.toLowerCase().includes("timeout") ||
      msg.toLowerCase().includes("connect etimedout");
    return {
      id: def.id,
      label: def.label,
      role: def.role,
      host,
      inFailoverChain: def.inFailoverChain,
      failoverPriority: def.failoverPriority,
      status: isTimeout ? "timeout" : "error",
      latencyMs: null,
      isActive,
      error: msg.slice(0, 120),
    };
  } finally {
    testPool.end().catch(() => {});
  }
}

/* ── Simple 12-second in-process cache ─────────────────────────────────────── */
let _cache: { ts: number; data: ClusterResponse } | null = null;
const CACHE_TTL_MS = 12_000;

/* ── Route ──────────────────────────────────────────────────────────────────── */
router.get(
  "/admin/db-cluster",
  requireAdmin,
  async (_req, res): Promise<void> => {
    if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
      res.json(_cache.data);
      return;
    }

    const activeUrl = await getActiveDbUrl();

    // Probe all nodes in parallel — slow/dead nodes timeout independently
    const nodes = await Promise.all(
      NODE_DEFS.map((def) => probeNode(def, activeUrl))
    );

    const healthyNodes = nodes.filter((n) => n.status === "ok").length;

    const payload: ClusterResponse = {
      checkedAt: new Date().toISOString(),
      activeHost: maskUrl(activeUrl),
      totalNodes: nodes.filter((n) => n.status !== "unconfigured").length,
      healthyNodes,
      nodes,
    };

    _cache = { ts: Date.now(), data: payload };
    res.json(payload);
  }
);

/* ── Manual refresh (busts cache) ───────────────────────────────────────────── */
router.post(
  "/admin/db-cluster/refresh",
  requireAdmin,
  async (_req, res): Promise<void> => {
    _cache = null;

    const activeUrl = await getActiveDbUrl();
    const nodes = await Promise.all(
      NODE_DEFS.map((def) => probeNode(def, activeUrl))
    );

    const healthyNodes = nodes.filter((n) => n.status === "ok").length;

    const payload: ClusterResponse = {
      checkedAt: new Date().toISOString(),
      activeHost: maskUrl(activeUrl),
      totalNodes: nodes.filter((n) => n.status !== "unconfigured").length,
      healthyNodes,
      nodes,
    };

    _cache = { ts: Date.now(), data: payload };
    res.json(payload);
  }
);

export default router;
