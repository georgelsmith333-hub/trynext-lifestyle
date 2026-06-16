/* ═══════════════════════════════════════════════════════
   Cloudflare Pages Function — API reverse proxy
   Route: /api/* → RENDER_API_URL (permanent backend)

   This function forwards every /api/... request from the
   Cloudflare Pages frontend to the permanent Render backend,
   stripping the host/origin so CORS works correctly.
═══════════════════════════════════════════════════════ */

export const onRequest: PagesFunction<{
  API_URL: string;
}> = async ({ request, env, params }) => {
  const apiUrl = env.API_URL;
  if (!apiUrl) {
    return new Response(JSON.stringify({ error: "API_URL not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Reconstruct the path from wildcard params
  const pathSegments = (params["path"] as string[] | string) ?? [];
  const pathStr = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;

  const originalUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${pathStr}${originalUrl.search}`, apiUrl);

  // Forward the request, stripping host/origin to avoid CORS preflight issues
  const headers = new Headers(request.headers);
  headers.set("Host", new URL(apiUrl).host);
  headers.delete("origin");
  headers.delete("referer");

  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "follow",
  });

  try {
    const response = await fetch(proxyRequest);

    // Forward the response, adding CORS headers for the Pages domain
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", originalUrl.origin);
    responseHeaders.set("Access-Control-Allow-Credentials", "true");
    responseHeaders.set("Vary", "Origin");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to reach API backend", detail: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
