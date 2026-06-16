/**
 * CF Pages Function — /api/* proxy
 *
 * Forwards every request under /api/* to the configured API server
 * (API_URL env var in CF Pages settings).  Handles CORS and rewrites
 * Set-Cookie headers so session cookies work on the CF Pages domain.
 *
 * How to configure:
 *   CF Pages → trynex-lifestyle-shop → Settings → Environment Variables
 *   API_URL = https://<your-api-host>  (no trailing slash)
 *
 * The API host can be:
 *   - The Replit dev domain while prototyping
 *   - A Render / Railway free-tier worker URL
 *   - A Cloudflare Worker URL (for full edge deployment)
 */

interface Env {
  /** Base URL of the API server.  Set in CF Pages env vars.  No trailing slash. */
  API_URL: string;
}

/** CF-internal request headers we must NOT forward to the upstream API. */
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "cf-request-id",
  "cdn-loop",
  "x-real-ip",
]);

/** Response headers that must NOT be forwarded to the browser. */
const STRIP_RESPONSE_HEADERS = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
]);

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  /* ── CORS preflight ──────────────────────────────────────────────────── */
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": url.origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, Cookie",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  /* ── Guard: API_URL must be configured ──────────────────────────────── */
  const apiBase = (env.API_URL ?? "").replace(/\/+$/, "");
  if (!apiBase) {
    return Response.json(
      { error: "API_URL is not configured in CF Pages environment variables." },
      { status: 503 }
    );
  }

  /* ── Build upstream target URL ───────────────────────────────────────── */
  const targetUrl = `${apiBase}${url.pathname}${url.search}`;

  /* ── Forward request headers ─────────────────────────────────────────── */
  const fwdHeaders = new Headers();
  for (const [k, v] of request.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(k.toLowerCase())) {
      fwdHeaders.set(k, v);
    }
  }
  fwdHeaders.set("X-Forwarded-Host", url.host);
  fwdHeaders.set("X-Forwarded-Proto", url.protocol.replace(/:$/, ""));
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) fwdHeaders.set("X-Real-IP", clientIp);

  /* ── Call upstream ───────────────────────────────────────────────────── */
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers: fwdHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual",
    });
  } catch (err) {
    console.error("[api-proxy] upstream fetch failed:", err);
    return Response.json(
      { error: "API server is unreachable.", detail: String(err) },
      { status: 502 }
    );
  }

  /* ── Build response headers ──────────────────────────────────────────── */
  const respHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    if (!STRIP_RESPONSE_HEADERS.has(k.toLowerCase()) && k.toLowerCase() !== "set-cookie") {
      respHeaders.set(k, v);
    }
  }

  /* ── Rewrite Set-Cookie: drop Domain=, relax SameSite ───────────────── */
  // CF Pages serves on HTTPS so Secure is fine; strip Domain so browser
  // sets the cookie on the CF Pages hostname (not the API server hostname).
  const rawCookies: string[] = [];
  // getAll() is available in Workers; fall back to single header otherwise.
  if (typeof (upstream.headers as any).getAll === "function") {
    rawCookies.push(...(upstream.headers as any).getAll("set-cookie"));
  } else {
    const single = upstream.headers.get("set-cookie");
    if (single) rawCookies.push(single);
  }
  for (const cookie of rawCookies) {
    const rewritten = cookie
      .replace(/;\s*Domain=[^;]*/gi, "")
      .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
    respHeaders.append("set-cookie", rewritten);
  }

  /* ── Stream upstream body back ───────────────────────────────────────── */
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
};
