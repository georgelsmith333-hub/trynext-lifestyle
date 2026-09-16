/*
 * Cloudflare Pages Function — route-aware API gateway for the 4-Render
 * multi-route topology.
 *
 * Routing:
 *   WRITES (POST/PUT/PATCH/DELETE), ADMIN, AUTH and AI generation
 *       → PRIMARY only (4th Render). Never replayed to a standby, even after
 *         an ambiguous timeout, so a mutation can never be duplicated.
 *   SAFE PUBLIC READS (anonymous GET/HEAD on the allowlist below)
 *       → READ origins in round-robin (load splitting across Render 2/3),
 *         with bounded failover on 502/503/504/network failure and a short
 *         down-skip so a suspended origin is not hammered. The primary is the
 *         LAST read candidate so it stays light.
 *   OPTIONS → answered at the edge.
 *
 * Origins come from functions/gateway-config.ts (authoritative, committed) or
 * the dashboard env overrides (API_PRIMARY_ORIGIN / API_READ_ORIGINS). There is
 * no hardcoded Render fallback: if a role has no origin the gateway fails
 * closed with a truthful JSON error instead of pinning traffic to a dead host.
 */

import {
  REQUEST_TIMEOUT_MS,
  READ_TOTAL_BUDGET_MS,
  RETRYABLE_STATUSES,
  ORIGIN_DOWN_SKIP_MS,
  ORIGIN_DOWN_THRESHOLD,
  isSafePublicRead,
  isPrimaryOnlyRead,
  resolveOrigins,
} from "../gateway-config";

const CANONICAL_STOREFRONT_URL = "https://trynext.shop";

interface GatewayEnv {
  API_URL?: string;
  API_ORIGIN?: string;
  TRYNEXT_API_URL?: string;
  API_ORIGINS?: string;
  API_PRIMARY_ORIGIN?: string;
  API_READ_ORIGINS?: string;
}

const DOWN_STATE = new Map<string, { fails: number; skipUntil: number }>();
let readCursor = 0;

function markFailure(origin: string): void {
  const entry = DOWN_STATE.get(origin) ?? { fails: 0, skipUntil: 0 };
  entry.fails += 1;
  if (entry.fails >= ORIGIN_DOWN_THRESHOLD) {
    entry.skipUntil = Date.now() + ORIGIN_DOWN_SKIP_MS;
  }
  DOWN_STATE.set(origin, entry);
}

function markSuccess(origin: string): void {
  DOWN_STATE.delete(origin);
}

function isSkipped(origin: string): boolean {
  const entry = DOWN_STATE.get(origin);
  if (!entry) return false;
  if (Date.now() >= entry.skipUntil) {
    DOWN_STATE.delete(origin);
    return false;
  }
  return true;
}

/** Read origins in round-robin order, skipping origins briefly marked down. */
function orderedReadOrigins(origins: string[]): string[] {
  const healthy = origins.filter((origin) => !isSkipped(origin));
  const pool = healthy.length > 0 ? healthy : origins;
  if (pool.length === 0) return [];
  const start = readCursor % pool.length;
  readCursor += 1;
  return [...pool.slice(start), ...pool.slice(0, start)];
}

function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Idempotency-Key");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Vary", "Origin");
  return headers;
}

function makeTargetUrl(origin: string, path: string, search: string): URL {
  return new URL(`/api/${path}${search}`, `${origin}/`);
}

function shouldRetryReadResponse(response: Response): boolean {
  if (RETRYABLE_STATUSES.has(response.status)) return true;
  return response.status === 404
    && response.headers.get("x-render-routing")?.toLowerCase() === "no-server";
}

function publicReadCacheControl(path: string): string {
  // Catalog reads are safe to serve stale while a suspended Render instance
  // wakes. Mutations bump the API-side generation and the short browser TTL
  // keeps admin/catalog changes visible quickly.
  if (path === "products" || path.startsWith("products/") || path === "categories") {
    return "public, max-age=15, s-maxage=60, stale-while-revalidate=300";
  }
  return "public, max-age=10, s-maxage=30, stale-while-revalidate=60";
}

async function canonicalizeSitemapResponse(
  response: Response,
  path: string,
): Promise<{ body: BodyInit | null; changed: boolean }> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (path !== "sitemap.xml" || !response.ok || !contentType.includes("xml")) {
    return { body: response.body, changed: false };
  }

  const body = await response.text();
  const canonicalBody = body.replace(
    /https:\/\/[a-z0-9-]+\.pages\.dev/gi,
    CANONICAL_STOREFRONT_URL,
  );
  return { body: canonicalBody, changed: canonicalBody !== body };
}

/** Reset in-memory routing state; exported for tests only. */
export function __resetGatewayState(): void {
  DOWN_STATE.clear();
  readCursor = 0;
}

export const onRequest: PagesFunction<GatewayEnv> = async (context) => {
  const { request, env, params } = context;
  const originalUrl = new URL(request.url);
  const pathSegments = (params["path"] as string[] | string) ?? [];
  const rawPath = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;
  // The request pathname is authoritative for Pages root catch-all Functions;
  // params.path may be empty or may include the /api prefix depending on the
  // runtime route matcher. Keep params only as a compatibility fallback.
  const pathnamePath = originalUrl.pathname
    .replace(/^\/+/, "")
    .replace(/^api(?:\/|$)/i, "")
    .replace(/^\/+/, "");
  const parameterPath = rawPath.replace(/^\/?api(?:\/|$)/i, "").replace(/^\/+/, "");
  const path = pathnamePath || parameterPath;
  const method = request.method.toUpperCase();
  const apiPath = `/${path}`;
  const safeRead = isSafePublicRead(method, apiPath, request);
  const primaryOnlyRead = isPrimaryOnlyRead(method, apiPath);
  const origin = originalUrl.origin;
  const responseCors = corsHeaders(origin);
  const edgeCache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheable = safeRead
    && method === "GET"
    && !request.headers.get("cookie")
    && !originalUrl.searchParams.has("search");
  const cacheKeyUrl = new URL(originalUrl.toString());
  cacheKeyUrl.searchParams.set("_trynext_origin", origin);
  const cacheKey = new Request(cacheKeyUrl.toString(), { method: "GET" });

  if (cacheable && edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      const cachedHeaders = new Headers(cached.headers);
      responseCors.forEach((value, key) => cachedHeaders.set(key, value));
      cachedHeaders.set("X-Trynext-Edge-Cache", "HIT");
      return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cachedHeaders });
    }
  }

  if (method === "OPTIONS") {
    responseCors.set("Cache-Control", "public, max-age=600");
    return new Response(null, { status: 204, headers: responseCors });
  }

  const roles = resolveOrigins(env as Record<string, string | undefined>);
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  // Writes, admin, auth, and AI generation go to the PRIMARY only.
  const candidates = (safeRead && !primaryOnlyRead)
    ? orderedReadOrigins(roles.reads)
    : roles.primary.slice(0, 1);
  const routeKind = (safeRead && !primaryOnlyRead) ? "read" : "write";

  if (candidates.length === 0) {
    const failed = new Headers(responseCors);
    failed.set("Content-Type", "application/json");
    failed.set("Cache-Control", "no-store");
    return new Response(
      JSON.stringify({
        error: "api_unavailable",
        message: "The API is temporarily unavailable.",
        status: 503,
        detail: routeKind === "write"
          ? "No primary API origin configured"
          : "No read API origin configured",
      }),
      { status: 503, headers: failed },
    );
  }

  let lastStatus = 503;
  let lastError = "No API origin responded";
  const readDeadline = routeKind === "read" ? Date.now() + READ_TOTAL_BUDGET_MS : null;

  for (const apiOrigin of candidates) {
    const remainingReadBudget = readDeadline === null ? REQUEST_TIMEOUT_MS : readDeadline - Date.now();
    if (remainingReadBudget <= 0) {
      lastError = `Read budget exhausted after ${READ_TOTAL_BUDGET_MS}ms`;
      break;
    }
    const targetUrl = makeTargetUrl(apiOrigin, path, originalUrl.search);
    const headers = new Headers(request.headers);
    headers.set("Host", new URL(apiOrigin).host);
    headers.delete("origin");
    headers.delete("referer");
    if (safeRead && !primaryOnlyRead) headers.delete("cookie");

    const requestInit: RequestInit & { duplex?: "half" } = {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : request.body,
      redirect: "follow",
    };
    if (requestInit.body) requestInit.duplex = "half";
    const proxyRequest = new Request(targetUrl.toString(), requestInit);

    try {
      const response = await fetch(proxyRequest, {
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remainingReadBudget)),
      });
      lastStatus = response.status;
      if (routeKind === "read" && shouldRetryReadResponse(response)) {
        lastError = `Origin ${apiOrigin} returned ${response.status}`;
        markFailure(apiOrigin);
        continue;
      }

      markSuccess(apiOrigin);
      const responseHeaders = new Headers(response.headers);
      responseCors.forEach((value, key) => responseHeaders.set(key, value));
      responseHeaders.set("X-Trynext-Origin", new URL(apiOrigin).host);
      responseHeaders.set("X-Trynext-Route", routeKind);
      const canonicalizedSitemap = await canonicalizeSitemapResponse(response, path);
      if (canonicalizedSitemap.changed) {
        responseHeaders.delete("content-length");
        responseHeaders.set("X-Trynext-Sitemap-Canonical", CANONICAL_STOREFRONT_URL);
      }
      if (safeRead && response.ok) {
        responseHeaders.set("Cache-Control", publicReadCacheControl(path));
      } else if (!safeRead || primaryOnlyRead) {
        responseHeaders.set("Cache-Control", "private, no-store");
      }

      if (cacheable && edgeCache && response.ok) {
        responseHeaders.set("X-Trynext-Edge-Cache", "MISS");
      }
      const output = new Response(canonicalizedSitemap.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
      if (cacheable && edgeCache && response.ok) {
        const waitUntil = (context as unknown as { waitUntil?: (promise: Promise<unknown>) => void }).waitUntil;
        const cacheCopy = output.clone();
        const write = edgeCache.put(cacheKey, cacheCopy).catch(() => undefined);
        if (waitUntil) waitUntil(write);
        else await write;
      }
      return output;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      markFailure(apiOrigin);
      if (routeKind === "write") break;
    }
  }

  const failed = new Headers(responseCors);
  failed.set("Content-Type", "application/json");
  failed.set("Cache-Control", "no-store");
  return new Response(
    JSON.stringify({ error: "api_unavailable", message: "The API is temporarily unavailable.", status: lastStatus, detail: lastError }),
    { status: 503, headers: failed },
  );
};
