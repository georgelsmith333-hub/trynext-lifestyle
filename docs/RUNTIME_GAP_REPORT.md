# Trynex Lifestyle — Runtime Gap Report

**Last inspected:** 2026-08-17

This report compares repository claims with the actual public storefront and live API behavior. It intentionally records unresolved gaps rather than converting code presence into a completion claim.

| Gap | Evidence | Impact | Corrective direction | Status |
|---|---|---|---|---|
| Catalog advertises six families but live API returns only five categories | Homepage exposes long sleeves and water bottles; `/api/products?limit=100` returned 10 products across Caps, Custom Orders, Hoodies, Mugs, and T-Shirts only | Customers cannot discover two advertised families through the catalog | Confirm real inventory/product data, then provision long-sleeve and water-bottle products through a reviewed admin/import path; do not fabricate production inventory | **BLOCKED — product data required** |
| All live catalog images are external URLs | Live API analysis found 10/10 `imageUrl` values use external `https://` hosts and no local paths | Product detail is exposed to third-party availability and failed images | Migrate approved production assets to Cloudflare R2 or versioned Pages assets; retain attribution/licensing records | **UNVERIFIED / HIGH RISK** |
| Product detail hero and thumbnails appeared blank/broken in browser QA | `/product/premium-pullover-hoodie` rendered external Unsplash URLs but the screenshot showed blank image surfaces | Direct customer conversion path loses primary product imagery | ProductDetail now normalizes URLs and applies a local placeholder on error; redeploy and repeat live visual QA | **FIXED LOCALLY — DEPLOYMENT VERIFICATION PENDING** |
| Render blueprint health path is stale | `render.yaml` used `/health`; active API health routes are `/api/healthz`, `/api/health/liveness`, and `/api/health/readiness` | Infrastructure may report a healthy service incorrectly or fail to detect readiness | Blueprint changed to `/api/health/readiness`; verify Render configuration applies the blueprint | **FIXED LOCALLY — DEPLOYMENT VERIFICATION PENDING** |
| API and Pages deploy independently | Prior live investigation showed Pages commits can be live while Render still serves an older API build | Frontend/backend contract drift can produce generic errors | Record both deployment IDs/commits in release status and verify API restart after every backend change | **KNOWN / PROCESS CONTROL** |
| Additive DB schema repair remains gated | Live repair returned zero target repairs while `ALLOW_DB_SCHEMA_REPAIR` was not proven enabled | Backup targets remain schema-drifted; full mirror cannot complete | Set a controlled time-limited production flag, run repair, verify every target, then disable the flag | **BLOCKED — operator configuration** |
| Admin AI local fallback is deployed but final authenticated inference evidence is incomplete | Provider list changed to Trynext Local Agent; browser session reset before final clean authenticated prompt | Admin may display availability without proving response path | Re-authenticate, send a harmless prompt, capture response/error, and keep provider state truthful | **UNVERIFIED** |
| Telegram order notification is not configured | Live dashboard reported Telegram `not_configured` | New orders may not notify operators | Configure bot token and settings-backed chat destination, then test a non-customer notification | **BLOCKED — external configuration** |
| Facebook/Instagram import UI exists without full external runtime evidence | Admin UI advertises extraction and SEO generation; no successful authenticated external import was proven | Marketplace/social order workflows may be mistaken for production-ready | Verify permissions, source identity, stopped/progress state, idempotency, and no open redirects | **UNVERIFIED** |
| Large client bundles remain | Build contains a 1.16 MB 3D vendor chunk, 677 KB main index, 438 KB V2 studio, and 24 MB ONNX WASM asset | Slow first load and mobile memory pressure | Measure real route timing, then lazy-load 3D/ONNX/editor-only features and optimize approved images | **UNVERIFIED / PERFORMANCE** |
| CI previously omitted shared declaration build | API typecheck failed on a fresh checkout until `pnpm run typecheck:libs` ran | CI could reject valid code or hide real errors behind TS6305 | Focused workflow now builds shared declarations before app checks | **FIXED LOCALLY — CI RUN PENDING** |
| Admin/self-deployment is intentionally not autonomous | Repository has deployment controls but no evidence of safe self-modifying agent behavior | Unrestricted self-deployment would create security and rollback risk | Keep explicit authorization, audit logs, allowlisted actions, preview gate, and rollback | **DESIGN DECISION** |

## Failure-policy requirement

Every unresolved external dependency must produce a truthful state in the customer or admin UI. It must not silently fall back to realistic fake orders, fake revenue, fake provider success, or fabricated product availability.

## Next runtime verification order

1. Deploy the local product-image fallback and Render blueprint health-path correction through the approved preview-to-production path.
2. Re-run the product-detail image check on the live domain.
3. Re-authenticate admin and verify the AI local-agent response and backup repair status.
4. Complete safe customer-flow regression across cart, checkout, order tracking, and admin order visibility.
