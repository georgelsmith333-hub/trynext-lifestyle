/* ═══════════════════════════════════════════════════════════════════════
   Sitemap Ping Utility
   ───────────────────────────────────────────────────────────────────────
   Notifies Google and Bing to re-crawl our sitemap immediately after
   new content is published (products, blog posts). Without this, search
   engines may not discover new content for days.

   Both Google and Bing support the ?sitemap= ping endpoint as a fast
   alternative to the Search Console manual submission flow.
   Response codes 200/301 indicate the ping was accepted.
   Fire-and-forget — we never await this in request handlers.
═══════════════════════════════════════════════════════════════════════ */

const SITEMAP_URL = "https://trynext.pages.dev/sitemap.xml";

const PING_URLS = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
];

/**
 * Fire-and-forget sitemap ping. Call this after publishing any new
 * product or blog post. Never awaited in request handlers — it runs
 * in the background and errors are silently swallowed.
 */
export function pingSitemaps(): void {
  for (const url of PING_URLS) {
    fetch(url, { method: "GET" }).catch(() => {});
  }
}
