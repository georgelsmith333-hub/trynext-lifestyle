# Trynex Lifestyle — Master Reconciliation

**Last reconciled:** 2026-08-17

This matrix reconciles the current repository, prior audit records, and the authenticated live investigation. Statuses are evidence-based; a source file or prior message is not sufficient to mark a customer-facing feature complete.

| Requirement / subsystem | Implementation location | Connected? | Local/build evidence | Runtime evidence | Status | Remaining work |
|---|---|---:|---|---|---|---|
| Production storefront | `artifacts/trynex-storefront` | Yes | Storefront typecheck/build previously passed | Cloudflare Pages production exists | **IMPLEMENTED BUT UNVERIFIED** | Repeat full live customer flow and responsive QA after latest deployment. |
| Production API | `artifacts/api-server` | Yes | API typecheck and 12 tests previously passed | Render `trynext-api` deployed commit `3b0e9f070`; health green | **IMPLEMENTED BUT UNVERIFIED** | Re-run authenticated endpoint smoke tests against the latest API. |
| Pages-to-Render API proxy | `functions/api/[[path]].ts` | Yes | Source inspected | Live admin and storefront previously reached API | **IMPLEMENTED BUT UNVERIFIED** | Verify cookies, CORS, errors, streaming, and cache behavior end to end. |
| Source-of-truth architecture | `docs/SOURCE_OF_TRUTH.md`, `wrangler.toml`, `render.yaml` | Yes | Documents and manifests present | Pages/Render evidence exists | **FIXED / UNVERIFIED** | Reconcile Render blueprint health path and actual provider settings. |
| Admin authentication | Admin login/session middleware | Yes | Tests and source present | Authenticated admin session observed | **IMPLEMENTED BUT UNVERIFIED** | Verify expiry, logout, unauthorized access, and CSRF on every mutation family. |
| Database transactional routing | `lib/db/src/index.ts` | Yes | Typecheck passed after hardening | Live DB Cluster no longer treated Products as transactional candidate | **FIXED / RUNTIME VERIFIED** | Verify canonical transactional node selection under degraded conditions. |
| Database cluster operator UI | `routes/dbCluster.ts`, `AdminDatabaseCluster.tsx` | Yes | Typecheck/build passed | Live page showed transactional vs satellite classification | **FIXED / RUNTIME VERIFIED** | Test stale, duplicate-host, and partial-probe states. |
| Backup circuit breaker | `dbBackupSync.ts`, `scheduler.ts`, `routes/backup.ts` | Yes | Typecheck/tests passed | Schema drift no longer counted as connectivity failure | **FIXED / RUNTIME VERIFIED** | Run controlled additive repair and exact post-repair verification. |
| Additive schema repair | `dbBackupSync.ts`, `routes/backup.ts`, `AdminBackup.tsx` | Yes | Guarded route/control implemented | Repair request previously returned 0/4 targets repaired; flag not proven enabled | **BLOCKED** | Configure controlled `ALLOW_DB_SCHEMA_REPAIR=true` window and verify each target. |
| Six product families | Shared mockup/product definitions | Yes | Source-kit audit reported 108 pairs / 0 errors | Catalog and product data observed live | **IMPLEMENTED BUT UNVERIFIED** | Run all family × face × zone × export × cart regression. |
| PSD gallery overrides | Mockup gallery/runtime assets | Yes | Historical audit and commits | Live visual verification incomplete | **IMPLEMENTED BUT UNVERIFIED** | Recheck source assets and admin/customer gallery outputs. |
| T-shirt aliases | Studio/product mapping | Yes | Historical fix exists | Live matrix incomplete | **IMPLEMENTED BUT UNVERIFIED** | Test all aliases from catalog through studio and cart. |
| Apparel alpha wedges | Mockup composition | Yes | Historical fix exists | Visual recheck incomplete | **IMPLEMENTED BUT UNVERIFIED** | Inspect representative apparel outputs for edge artifacts. |
| Water-bottle route/catalog | Product route and mockups | Yes | Historical fix exists | Live catalog route previously checked | **IMPLEMENTED BUT UNVERIFIED** | Complete full product-to-cart regression. |
| Design Studio V2 | `src/pages/studio/DesignStudioV2.tsx` | Yes | Storefront builds | Production route is documented | **IMPLEMENTED BUT UNVERIFIED** | Complete parity matrix against V1, especially mobile/export/cart. |
| Design Studio V1 | `src/pages/DesignStudio.tsx` | Yes | Source exists | Compatibility route documented | **LEGACY / PRESERVED** | Retain until parity and rollback evidence are complete. |
| Shared print-zone geometry | `mockups.tsx`, `composer.ts` | Yes | Source and audit artifacts exist | Partial visual evidence | **IMPLEMENTED BUT UNVERIFIED** | Prove artwork survives editor, PNG, mockup, cart, textures, and 3D. |
| 3D previews | Product viewer components | Yes | Dependencies and source exist | Curved-product behavior documented | **IMPLEMENTED BUT UNVERIFIED** | Test performance, loading, mobile, and visual consistency. |
| AI admin provider display | `routes/ai.ts`, admin AI page | Yes | Provider fallback code/typecheck passed | Local-agent provider displayed live | **FIXED / PARTIAL** | Prove successful inference after current API deployment; expose truthful failure causes. |
| AI admin tools/deployment | `aiExecute.ts`, deployment routes/UI | Partially | Source/UI exist | No evidence of safe autonomous deployment | **PARTIALLY IMPLEMENTED** | Keep explicit authorization, audit trail, rollback, and provider/tool health. |
| Image generation/removal | `/api/image`, provider/client paths | Unknown | Requires focused audit | No complete live evidence | **UNVERIFIED** | Trace request/response/provider/failure path and test unavailable-provider behavior. |
| Catalog/cart/checkout | Storefront pages and order routes | Yes | Partial tests/source | No complete live purchase evidence | **UNVERIFIED** | Test totals, persistence, duplicate submission, failure handling, and order creation. |
| Orders/admin visibility | Orders API/admin pages | Yes | API tests exist | Dashboard/order counts observed | **IMPLEMENTED BUT UNVERIFIED** | Reconcile real dataset, status updates, cancellation, and notifications. |
| Telegram notifications | API notification routes/settings | Partial | Source exists | Live dashboard showed not configured | **BLOCKED** | Configure and test notification channel or show truthful unavailable state. |
| Social/Facebook import | `admin/facebook-import` and related API | Partial | UI/source exists | No external runtime evidence | **UNVERIFIED** | Verify permissions, source identity, stopped state, progress, and no open redirects. |
| SEO/metadata | `SEOHead.tsx`, sitemap, robots | Yes | Source exists | No complete crawl/render evidence | **UNVERIFIED** | Test titles, canonical, OG, JSON-LD, sitemap, robots, and private-route exclusion. |
| Security scanning | Workflows/scripts/docs | Partial | Prior credential cleanup performed | New scan not yet recorded in this pass | **IMPLEMENTED BUT UNVERIFIED** | Add/verify secret scan and inspect Git history for exposed values. |
| CI focused checks | `.github/workflows/active-app-verification.yml` | Yes | Workflow present | Run status requires current repository/deployment evidence | **IMPLEMENTED BUT UNVERIFIED** | Verify workflow run and add lint/security/smoke coverage. |
| Performance | Vite bundles, 3D/canvas, API | Partial | Prior build warned about large chunks | No measured baseline in current pass | **UNVERIFIED** | Measure bundle/network/render costs before targeted lazy-loading changes. |
| Mobile | `artifacts/trynext-mobile` and responsive storefront | Partial | Mobile artifact exists | Browser matrix incomplete | **UNVERIFIED** | Test studio, controls, cart, checkout, touch, keyboard, and overflow. |
| Accessibility | Storefront/admin controls | Partial | Prior audit found icon-label issues | No full live audit | **UNVERIFIED** | Keyboard/focus/labels/ARIA/contrast/focus-error audit. |

## Evidence policy

A requirement is **VERIFIED COMPLETE** only when code exists, the connection is proven, targeted tests/builds pass, the actual runtime responds correctly, and the intended customer or operator experience has been inspected. Prior historical fixes remain valuable but are marked unverified until the current critical-path regression is rerun.

## Highest-priority remaining sequence

1. Finish the live AI request verification after the latest Render deployment and fix only the remaining root cause.
2. Re-authenticate and complete the Backup/DB Cluster live smoke test; configure a controlled schema-repair window only after confirming the target topology.
3. Run the six-family studio, mockup, export, cart, and mobile regression matrix.
4. Verify checkout/order/notification behavior with safe non-payment test data.
5. Run security, SEO, accessibility, performance, and failure-mode checks.
6. Update release status and handoff with exact evidence and rollback references.
