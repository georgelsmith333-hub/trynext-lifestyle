# Trynext Three-Render Implementation Evidence

**Date:** 2026-08-21  
**Evidence owner:** Manus AI  
**Scope:** Production hardening, Cloudflare Pages gateway, Render 1/2/3 coordination, and live customer-surface verification.

## Executive conclusion

The three-Render compute topology is now provisioned and the public safe-read gateway is live. Render 1 remains the preserved existing primary service and is currently suspended by Render after exceeding its workspace bandwidth allowance. Render 2 is a live standby, Render 3 is a live DR standby, and both connect to the existing canonical Neon data path without creating a new production database. The public storefront is currently serving catalog and health responses through Render 2 while Render 1 is suspended.[1] [4] [5]

The architecture is **not** three independent e-commerce writers. Render 1 remains the sole production write authority when active. Render 2 and Render 3 reject all `POST`, `PUT`, `PATCH`, and `DELETE` requests through runtime-role enforcement, have schedulers disabled, and have full backup synchronization disabled. Cloudflare Pages performs ordered safe-read failover only; it does not replay mutations to a later origin.

> **Current release result:** browser-safe public read failover is **VERIFIED**; mutation non-replay and standby write blocking are **VERIFIED**; Render 3 public selection has not been forced because Render 2 is healthy; the mockup API is reachable but currently returns an empty payload and therefore remains **PARTIALLY VERIFIED**.

## Implemented topology

| Environment | Service | Current role | Direct live evidence | Writes | Scheduler | Full backup sync |
|---|---|---|---|---|---|---|
| Render 1 | `trynext-api` | Existing primary, currently suspended | Render suspension response; service preserved and not deleted | Sole authority when active | Existing primary owner when restored; hardening branch still needs coordinated deployment after restoration | Disabled in the hardened contract; Render 1 must be updated before reactivation |
| Render 2 | `trynext-api-standby-2` | Secondary standby | Readiness returned `status=ok`, `db=true`, `runtimeRole=standby` | Rejected with `standby_read_only` by the hardened runtime | Disabled | Disabled |
| Render 3 | `trynext-api-standby-3` | Tertiary DR standby | Readiness returned `status=ok`, `db=true`, `runtimeRole=dr` | Rejected with `standby_read_only` by the hardened runtime | Disabled | Disabled |

Render 2 readiness was directly verified at 22:04:26 UTC with `dbLatencyMs=59`, `schedulerEnabled=false`, and `backupSyncEnabled=false`. Render 3 readiness was directly verified at 22:04:38 UTC with the same disabled-workload controls and `runtimeRole=dr`. These direct probes also woke both free-tier standby services before public gateway verification.

## Cloudflare Pages gateway release

The active production Pages project is `trynext-lifestyle-shop`, connected to the `main` branch of `georgelsmith333-hub/trynext-lifestyle`. Its production `API_ORIGINS` is the ordered list below:

```text
https://trynex-api.onrender.com,
https://trynex-api-standby-2.onrender.com,
https://trynext-api-standby-3.onrender.com
```

The final production deployment was `f12ed021`, built successfully from commit `1b241b72f87aebd6b7b77e78d1140b40105a1fa5` and aliased to `https://trynext.pages.dev`. The deployment completed its queued, initialize, clone, build, and deploy stages successfully at 22:18:25 UTC.[6] [7]

Three production gateway corrections were required before the public failover became functional. The first corrected the wrong repository path by deploying the root `functions/api/[[path]].ts`. The second normalized the root Pages route parameter. The third derived the route from `request.url.pathname`, because the root catch-all did not reliably populate `params.path`. The final correction recognized that normal storefront cookies must not disable safe-read failover; it preserved Authorization pinning, disabled caching for cookie-bearing requests, and stripped cookies before forwarding allowlisted public reads.

## Public browser verification

The final probe was executed from the actual storefront browser session, including its ordinary cookies. This is stronger than a build-only check because it exercises the same public origin and browser request shape used by customers.

| Public request | Result | Evidence |
|---|---:|---|
| `GET /api/products` | **VERIFIED — HTTP 200** | `X-Trynext-Origin: trynex-api-standby-2.onrender.com`; `total=70`; `totalPages=6`; first page count `12` |
| `GET /api/health/readiness` | **VERIFIED — HTTP 200** | Served by Render 2; JSON reported `db=true`, `runtimeRole=standby`, `schedulerEnabled=false`, `backupSyncEnabled=false` |
| `GET /api/health/liveness` | **VERIFIED — HTTP 200** | Served by Render 2; JSON reported `runtimeRole=standby` |
| `GET /api/mockups` | **PARTIALLY VERIFIED — HTTP 200** | Served by Render 2, but the current response payload is empty (`count=0`) |
| `OPTIONS /api/products` | **VERIFIED — HTTP 204** | Answered at the Cloudflare edge with the expected CORS headers and no origin call |
| `POST /api/orders` | **VERIFIED — protected** | Remained pinned to suspended Render 1 and returned HTTP 503 with `x-render-routing: suspend-by-user`; no replay reached Render 2 or Render 3 |

The public homepage was reloaded after the final deployment and no longer displayed `The catalogue could not load right now`. The full catalogue route rendered live product cards across T-shirts, bottles, long sleeves, caps, mugs, and hoodies.[1] [2] The API reports 70 products, while the UI currently renders 50 products per page with `Previous 1 2 Next`; the apparent “70 versus 20/50” discrepancy is a pagination/display-label issue, not missing API rows. A clearer label such as `Showing 50 of 70 products` would reduce customer confusion.

## Customer-surface verification

The public `/products` route rendered category filters, search, sort, price filters, availability filtering, pagination, product cards, image paths, and family coverage. The product-detail route for Birthday Celebration Tee rendered its image, price, fit variants, sizes, colors, quantity controls, Add to Bag, WhatsApp order, product details, reviews, bundle, and related products.

The Design Studio route rendered its editor with Front, Back, L.Sleeve, R.Sleeve, and Neck controls; eight garment colors; sizes XS through XXXL; upload, text, AI Art, layers, templates, QR, export, Print Zone, Texture, 3D Preview, and Add to Cart controls.[3] Switching to Back changed the URL to `?view=back`, updated the heading, and rendered a nonblank garment canvas. The studio surface is therefore **VERIFIED as available and interactive**. This session did not claim that every mockup family is photorealistic or that every generated asset is visually perfect.

The cart regression verified required validation and successful addition. Clicking Add to Bag without a size produced `Please select a size`. Selecting size M and adding the product changed the header to `Cart (1)`, displayed `Added to Bag!`, and exposed Checkout. The cart drawer preserved the product and selected size. Checkout opened `/checkout` with delivery fields, guest checkout, optional order notes, payment-step navigation, and an order summary. No personal data was entered, no payment was initiated, and no real order was submitted.

## Resource and quota hardening

The resource audit identified the recurring 30-minute full Neon mirror from `dbBackupSync.ts`—copying all tables to multiple targets—as the leading bandwidth suspect behind the Render 5 GB+ suspension. Additional contributors included uncached API-proxied binary traffic, polling, and response paths that were not sufficiently bounded. R2 is not treated as an unlimited replacement for Render or Pages.

The hardening changes reduce systemic risk without multiplying the production write surface:

| Risk | Hardening control |
|---|---|
| Duplicate order or payment writes | Standby runtime-role middleware rejects all mutating methods; Cloudflare never replays mutations |
| Duplicate schedulers and workers | `SCHEDULER_ENABLED=false` on Render 2/3 |
| Repeated full database mirrors | `BACKUP_SYNC_ENABLED=false` by default and manual backup route blocked unless explicitly enabled |
| Browser reads pinned to suspended primary | Cloudflare safe-read allowlist now uses the actual request pathname and tolerates ordinary storefront cookies |
| Edge cache leakage | Cookie-bearing safe reads are not cached; cookies are stripped before forwarding |
| Unbounded origin retry | Ordered origins and bounded retryable statuses are used; no round-robin writes |
| Rollback risk | Prior Pages deployment `40f6f6f5` remains preserved as the prior production target; the final deployment is separately identified as `f12ed021` |

The three environments do not create a guaranteed pooled 15 GB capacity. Separate free-tier workspaces may provide separate allowances, but the system must remain efficient even if only one origin is active. The most important resource fix is reducing duplicate and uncached traffic, not merely adding Render services.

## Evidence classification and remaining risks

| Area | Classification | Explanation |
|---|---|---|
| Render 2 direct readiness and database access | **VERIFIED** | HTTP 200-equivalent readiness with `db=true`, standby role, scheduler and backup disabled |
| Render 3 direct readiness and DR controls | **VERIFIED** | HTTP 200-equivalent readiness with `db=true`, DR role, scheduler and backup disabled |
| Public safe-read failover while Render 1 is suspended | **VERIFIED** | Browser catalog and health reads served by Render 2 with `X-Trynext-Origin` evidence |
| Public mutation non-replay | **VERIFIED** | POST stayed on Render 1 and returned a truthful 503; no standby write attempt |
| Cloudflare CORS preflight | **VERIFIED** | OPTIONS returned 204 at the edge |
| Storefront catalog and six-family coverage | **VERIFIED** | 70 API total, 50 first-page cards, second-page pagination, family filters and visible image paths |
| Design Studio availability and view controls | **VERIFIED** | Editor, controls, Back view, colors, sizes, upload/export surfaces loaded |
| Full image/mockup quality across every variant | **UNVERIFIED** | The mockup endpoint is reachable but empty, and this evidence does not claim photorealistic parity |
| Public Render 3 selection | **UNVERIFIED** | Render 2 is healthy, so the ordered gateway has not naturally advanced to Render 3 |
| Real order creation and payment | **BLOCKED by safety boundary** | No real customer order or payment was created during verification |
| Render 1 restoration on hardened code | **BLOCKED until suspension reset/recovery** | Render 1 was preserved but not modified while suspended; its return must be coordinated with the hardening branch and primary restoration gates |

The principal operational risks are free-tier cold starts, Render 1 remaining suspended until its allowance resets or the service is restored, empty mockup metadata on the standby-backed API, and the need to deploy the hardened runtime contract to Render 1 before it resumes as the primary. A future controlled failover test should temporarily make Render 2 unavailable or use a non-production preview to prove Render 3 selection without changing the public production origin order.

## Release and rollback record

The main branch now contains the gateway corrections through commit `1b241b72`. The earlier successful production deployments `40f6f6f5` and `6f0ead27` remain useful rollback and diagnostic references. No Render service was deleted, no new Neon database was created, no production writer was added, and no credential was written to source control or this document.

## References

[1]: https://trynext.pages.dev/ "Trynext Lifestyle public storefront"
[2]: https://trynext.pages.dev/products "Trynext Lifestyle full catalogue"
[3]: https://trynext.pages.dev/design-studio "Trynext Lifestyle Design Studio"
[4]: https://trynex-api-standby-2.onrender.com/api/health/readiness "Render 2 readiness endpoint"
[5]: https://trynext-api-standby-3.onrender.com/api/health/readiness "Render 3 readiness endpoint"
[6]: https://trynext.pages.dev/ "TrynextShop production alias"
[7]: https://github.com/georgelsmith333-hub/trynext-lifestyle/commit/1b241b72f87aebd6b7b77e78d1140b40105a1fa5 "Final gateway hardening commit"
[8]: https://github.com/georgelsmith333-hub/trynext-lifestyle/pull/14 "Cookie-aware safe-read failover pull request"
[9]: https://trynext.pages.dev/api/products "Trynext public products API"
[10]: https://trynext.pages.dev/api/mockups "Trynext public mockups API"
