/*
 * Cloudflare Pages gateway — authoritative Render origin roles.
 *
 * This file is the single source of truth for which Render service serves
 * which workload. URLs are public endpoints (never secrets). The committed
 * values take effect on the next Pages deployment and deliberately do NOT
 * depend on Cloudflare dashboard env vars, so a stale/missing dashboard
 * value can never pin traffic to a dead origin again.
 *
 * Dashboard env vars (optional overrides):
 *   API_PRIMARY_ORIGIN  — exactly one URL for writes/admin/AI (primary).
 *   API_READ_ORIGINS    — comma-separated URLs for safe public reads.
 *   API_ORIGINS         — legacy ordered list; used ONLY when the two above
 *                         and this file do not provide a role.
 *
 * Roles (4-Render multi-route):
 *   primary      4th Render service — SOLE write authority: checkout, orders,
 *                admin, AI generation, auth, edits, backups/scheduler.
 *   reads        Render 2 — the currently healthy stateless, read-only standby
 *                serving catalog/health/blog/sitemap traffic during bounded
 *                failover. It rejects mutations server-side via
 *                TRYNEXT_RUNTIME_ROLE (standby/dr).
 *   retired      Render 1 (trynext-api) — suspended by Render (5GB bandwidth
 *                allowance). NOT routed to. Re-add below ONLY after it is
 *                restored, redeployed with standby role + schedulers off,
 *                and re-verified (see docs/FOUR_RENDER_MULTI_ROUTE_CONTRACT).
 */

export const REQUEST_TIMEOUT_MS = 3_500;
export const READ_TOTAL_BUDGET_MS = 7_000;
export const RETRYABLE_STATUSES = new Set([502, 503, 504]);
export const ORIGIN_DOWN_SKIP_MS = 15_000;
export const ORIGIN_DOWN_THRESHOLD = 2;

/** Prefixes that are safe, anonymous, idempotent public reads. */
export const SAFE_PUBLIC_PREFIXES = [
  "/products",
  "/categories",
  "/mockups",
  "/public-stats",
  "/blog",
  "/testimonials",
  "/settings",
  "/health",
  "/healthz",
  "/readyz",
  "/sitemap.xml",
];

/**
 * GET routes that cost provider capacity or create provider-side work.
 * They are NEVER replayed to another origin and always go to the primary.
 */
export const PRIMARY_ONLY_READ_PREFIXES = [
  "/ai/generate",
  "/health/liveness",
  "/health/readiness",
  "/healthz",
  "/readyz",
  "/sitemap.xml",
];

export interface OriginRoles {
  primary: string[];
  reads: string[];
}

/**
 * Production origin map. Order within a role is the failover order.
 * The fourth Render service is the sole write authority. Keep this committed
 * origin aligned with the promoted service; Cloudflare may override it with
 * API_PRIMARY_ORIGIN during a controlled migration.
 */
export const PRODUCTION_ORIGINS: OriginRoles = {
  primary: [
    "https://trynex-lifestyle-main-render.onrender.com",
  ],
  reads: [
    "https://trynext-api-standby-2.onrender.com",
  ],
};

export interface ResolvedOrigins {
  primary: string[];
  reads: string[];
}

function splitUrls(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(
    raw
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean),
  )];
}

/**
 * Resolve role origins with precedence:
 *   explicit role env var → committed config → legacy API_ORIGINS (reads only).
 * Primary NEVER falls back to the legacy list (it historically contained the
 * suspended service and must not silently receive production writes).
 */
export function resolveOrigins(env: Record<string, string | undefined>): ResolvedOrigins {
  const legacy = splitUrls(env.API_ORIGINS);

  const primaryFromEnv = splitUrls(env.API_PRIMARY_ORIGIN);
  const primary = primaryFromEnv.length > 0
    ? primaryFromEnv
    : PRODUCTION_ORIGINS.primary;

  const readsFromEnv = splitUrls(env.API_READ_ORIGINS);
  const configuredReads = [...PRODUCTION_ORIGINS.reads, ...PRODUCTION_ORIGINS.primary];
  const reads = readsFromEnv.length > 0
    ? readsFromEnv
    : configuredReads.length > 0
      ? configuredReads
      : legacy;

  return {
    primary,
    reads: [...new Set(reads)],
  };
}

/** Runtime safety helpers shared by the gateway. */
export function isSafePublicRead(method: string, path: string, request: Request): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  // Browser session cookies are fine for anonymous catalog/health reads, but
  // Authorization-bearing requests are user-specific and must stay pinned.
  if (request.headers.get("authorization")) return false;
  return SAFE_PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isPrimaryOnlyRead(method: string, path: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  return PRIMARY_ONLY_READ_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
