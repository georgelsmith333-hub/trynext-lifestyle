---
title: Trynext reliability, live editing, studio, and mockup recovery
date: 2026-09-01
status: proposed
---

# Trynext reliability, live editing, studio, and mockup recovery

## Goal

Make the Trynext storefront behave like a production full-stack application after
idle periods and reloads: catalog content should appear quickly, cache failures
must not become minute-long waits, admin edits must become visible to the writer
and other sessions, Design Studio actions must use real API contracts, and the
homepage/studio/mockup experience must be visually dependable.

The canonical customer origin is:

`https://trynext.pages.dev`

The fourth Render service remains the sole write/admin/AI primary:

`https://trynex-lifestyle-main-render.onrender.com`

## Known constraints and blockers

1. The current protected `UPSTASH_REDIS_REST_TOKEN` is rejected by Upstash during
   the startup health `SET`; the application correctly reports degraded health
   and falls back to process-local memory. A token pasted into chat must not be
   reused. The primary token must be replaced through the secure secret flow.
2. The current repository has no Upstash connector. A secondary database must be
   created in the user's Upstash account before its REST URL/token can be wired.
3. The current mockup sources are raster/PNG-oriented derivatives. They are not
   native Photoshop Smart Object PSD/PSB masters. Native Smart Object rendering
   requires a separate Photoshop/Photopea-compatible renderer and source masters;
   the browser compositor must not claim that capability without those inputs.

## Recommended architecture

### 1. Cache resilience

Use two pre-created Upstash Redis REST backends:

- Primary: `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN`
- Secondary: `UPSTASH_REDIS_REST_URL_SECONDARY` +
  `UPSTASH_REDIS_REST_TOKEN_SECONDARY`

The API cache adapter will:

- Verify each configured backend with a bounded health request.
- Keep a per-backend circuit state with short open and longer half-open periods.
- Read primary first, then secondary when primary is unavailable.
- Write to every healthy backend without making a secondary failure block the
  request after the primary write succeeds.
- Delete/invalidate on every healthy backend.
- Use a bounded request timeout and fall back to the database/local cache rather
  than waiting on a dead provider.
- Expose backend state in health/admin diagnostics without returning credentials.

This is cache replication, not business-data migration. PostgreSQL remains the
source of truth; expired or missing cache entries are rebuilt from PostgreSQL.

The Render blueprint will declare the exact `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL_SECONDARY`, and
`UPSTASH_REDIS_REST_TOKEN_SECONDARY` names as unsynced deployment variables. The
actual values remain in provider/Replit secret stores.

### 2. Fast catalog loading

The current gateway can spend up to 12 seconds per cold read origin, while
multiple homepage requests start together. The fix will:

- Give safe catalog/health reads a bounded total request budget rather than a
  full timeout for every origin.
- Prefer a warm origin for the catalog path and keep bounded failover for
  provider errors.
- Preserve the primary-only rule for mutations, admin, auth, and AI operations.
- Keep successful anonymous catalog responses edge-cacheable with explicit
  `X-Trynext-Origin`, `X-Trynext-Route`, and edge-cache diagnostics.
- Avoid caching cookie- or authorization-bearing requests.
- Deduplicate the homepage's product/category/settings requests in the browser.
- Request the initial product page instead of loading the full catalog when the
  page does not need every product.
- Keep skeletons and retry/error states visible without replacing the page with
  an indefinite spinner.

### 3. API contract and Design Studio

Create a route matrix from the server router and generated client. Each studio
action will have:

- One typed client request and one server route contract.
- One gateway routing test proving that it reaches the primary when it is
  provider-side work.
- Explicit loading, success, empty, and error UI states.
- No silent catch that drops a failed upload, generation, background removal,
  edit, or export.

The studio will preserve the current product-specific rendering behavior while
repairing endpoint reachability and error recovery. Expensive AI work remains
primary-only and will not be replayed to a standby.

### 4. Admin freshness

Admin pages will use a common freshness policy:

- Refetch current data on mount and when the tab regains focus.
- Poll operational data at a finite interval while the page is open.
- Invalidate or patch all affected React Query keys after a successful mutation.
- Show the saved result immediately in the initiating view.
- Keep admin/authenticated requests private and pinned to the primary.
- Add a visible last-updated/connection state for operational pages.

If the existing project has no stable realtime transport for a given page, use
bounded polling rather than introducing a new WebSocket system prematurely.

### 5. Homepage and studio visual recovery

The visual pass will be implemented after reliability fixes and verified at
desktop and mobile sizes. It will:

- Restore the homepage's intended hero motion, section reveals, and product
  discovery hierarchy without blocking interaction.
- Correct the live copy source so stale headings cannot override current
  settings.
- Respect `prefers-reduced-motion`, preserve keyboard focus, and reserve image
  space to avoid layout shift.
- Keep one clear primary action per major section.
- Use real loaded/error/empty states in screenshots, not only ideal data.

### 6. Mockup correctness boundary

The immediate deliverable is a reliable browser compositor using reviewed source
photos, alpha cutouts, print-zone geometry, curvature, fabric texture, and smart
shading. It will:

- Validate every required surface asset before activation.
- Fail visibly when a source asset cannot load.
- Keep white/light garments on the white premium canvas without gray alpha leaks.
- Keep dark garments readable and use product-specific silhouettes.
- Make front/back/sleeve/neck composition and export share one failure boundary.
- Add regression fixtures for representative white, dark, and curved products.

True native PSD/PSB Smart Object replacement is a separate integration boundary.
It can be added only after real Smart Object masters and a renderer are supplied;
the current PNG/canvas path will not be described as native PSD parity.

## Verification gates

### Local

- Redis health reports `ok` with the replacement primary token, or reports the
  exact healthy secondary state if primary is intentionally unavailable.
- Product/category requests complete within the bounded local budget on cold and
  warm calls.
- API and storefront typecheck/build/tests pass.
- Gateway tests cover read failover, primary-only routes, cache hits, and
  bounded failure.
- Studio tests cover generate/remove-background/edit/export error states.
- Admin mutation tests verify writer cache refresh and subsequent refetch.

### Live

- `https://trynext.pages.dev/` returns the current build.
- `/api/health/liveness`, `/api/health/readiness`, `/api/products`, and
  `/api/sitemap.xml` return 200.
- `/api/health/liveness` on the primary Render origin returns
  `runtimeRole:"primary"`.
- `/api/__probe` reaches the primary and returns the expected 404 JSON.
- `/api/admin/system/health` returns 401 without admin credentials.
- Authenticated admin edits and a safe write smoke test reach the fourth Render
  primary and become visible after refresh.

## Monitoring

For UptimeRobot:

- Monitor the public customer path:
  `https://trynext.pages.dev/api/health/liveness`
- Monitor the primary service separately:
  `https://trynex-lifestyle-main-render.onrender.com/api/health/liveness`
- Use HTTP monitoring every 5 minutes and expect HTTP 200 containing
  `"status":"ok"`.

UptimeRobot is alerting only; it is not used to keep the app alive or to repair
the cache.

## Rollout order

1. Replace the invalid primary REST token securely and verify Upstash.
2. Add the secondary database variables and implement cache failover.
3. Fix gateway/catalog cold-load behavior and deploy the release.
4. Repair API/studio contract coverage and admin freshness.
5. Restore homepage/studio motion and copy with responsive screenshot review.
6. Validate mockup assets/compositing and document the native PSD/PSB boundary.
7. Run the live verification gates and deliver to Cloudflare Pages.