---
name: Live site health check 2026-08-29
description: Evidence-backed status of the live storefront, API gateway, primary API origin, sitemap, and custom-domain DNS on 2026-08-29 (1 day after the checkpoint above).
---

# Live health check — 2026-08-29

Verified with the web fetcher + public DNS resolvers (sandbox curl cannot reach
Cloudflare/Namecheap origins over HTTPS).

## Working
- `https://trynext.pages.dev/` — 200, full homepage (flash sale,
  Spin & Win, products, blog). Matches current `main` (a95903b) code.
- `/products`, `/design-studio`, `/_redirects` SPA fallback, 404 page, robots.txt — OK.
- `GET /api/health/liveness` → `{"status":"ok", ..., "runtimeRole":"standby"}`.
- `GET /api/health/readiness` → `{"status":"ok","db":true,"dbLatencyMs":60}`.
- `GET /api/products` → 70 products, paginated, real DB rows.
- `GET /api/public-stats` → `{totalOrders:78, todayOrders:0, minutesSinceLastOrder:~17090}`.
  (Homepage "Last order today" is the code's label for anything > 24h old, not a live claim.)
- GitHub Actions: latest `main` push + PR runs green (verify + CI).

## Broken / at risk
1. **Primary API origin is a suspended Render service.** `trynex-api.onrender.com`
   returns Render's "This service has been suspended by its owner." for any route
   that does not take the failover path:
   - `/api/sitemap.xml` → suspended page
   - `/api/admin/system/health` → suspended page
   - By design the gateway (`functions/api/[[path]].ts`) never fails over
     mutations, so **writes are currently dead**: checkout/order placement,
     admin login/settings changes, spin & win settlement, etc. Only safe reads
     (`SAFE_PUBLIC_PREFIXES`) fail over to the standby origin.
   - Consequences: customers can browse, but cannot buy; admin cannot sign in.
2. **`/sitemap.xml` not in `SAFE_PUBLIC_PREFIXES`** (`functions/api/[[path]].ts`),
   so it cannot fail over. `public/_redirects` 301s `/sitemap.xml` →
   `/api/sitemap.xml` and robots.txt advertises the API URL — Google is currently
   getting a suspended page for the sitemap (SEO regression).
3. **Custom domain is parked, not connected.** `trynext.pages.dev` NS →
   `ns1/ns2.lander.d.parity.domains` (Namecheap parking); A records →
   104.219.250.37 / 2.59.170.20; https://trynext.pages.dev serves a Namecheap
   "registered at Namecheap" aftermarket/parking page. `trynext.pages.dev` has
   no CNAME/answer. The domain is no longer pointed at Cloudflare Pages.
4. **Dotfile truth mismatch:** CRITICAL_FINDINGS.md claims the proxy has no
   hardcoded Render fallback ("FIXED"), but `functions/api/[[path]].ts` still has
   `DEFAULT_ORIGIN = https://trynex-api.onrender.com` and `_middleware.ts` line
   272 keeps the same fallback. The hardcoded origin is precisely what leaks
   the suspended page into the live gateway.

## User's guessed URL
`trynext-shop-pages.dev` does not resolve (NXDOMAIN). Real origin:
`trynext.pages.dev`.

## Suggested follow-ups (not yet applied)
- Restore/unsuspend the primary Render service (owner action) or repoint
  `API_ORIGINS`/`API_URL` in CF Pages env to a live primary; keep standby as
  read-only fallback.
- Add `"/sitemap.xml"` (and possibly `"/sitemap"`) to `SAFE_PUBLIC_PREFIXES` so
  sitemap can fail over; optionally remove the hardcoded `DEFAULT_ORIGIN`.
- Renew/repark `trynext.pages.dev` and re-point it (Cloudflare NS or a CNAME to
  `trynext.pages.dev`), then update `ALLOWED_ORIGINS`/`SITE_URL`
  everywhere noted in `cf-pages-deploy.md`.
