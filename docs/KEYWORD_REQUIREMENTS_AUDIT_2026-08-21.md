# Trynext Prior-Discussion Keyword and Requirement Audit — Final Register

**Date:** 2026-08-21  
**Scope:** Trynext Lifestyle production hardening, customer-surface verification, three-Render coordination, Cloudflare Pages gateway, Neon/R2 contracts, mockup pipeline, admin boundary, CI/release controls, and future-readiness requirements.

## Executive classification

The current release is **operational on the verified Cloudflare Pages hostname** and the public read path is healthy through Render 2. The catalogue contains 70 products, the six family surfaces render, Design Studio V2 can create a text-based custom item and add it to cart, checkout validation blocks incomplete submissions, the public mockup contract returns 108 canonical smart-v4 rows, and the three-Render role controls are present and source-verified. The merged PWA correction is live and reduces install-time precache from approximately 341,909 KiB to approximately 16,514 KiB.

The release is not yet A-to-Z verified. The apex custom domain still serves a stale Nginx site instead of the current Pages release; authenticated admin operations, real order ingestion, notification delivery, external imports, and PSD/PSB provenance remain unverified; photorealistic mockup quality is not independently established; legacy source-kit-v3 assets remain publicly deployable; and direct Render 2/3 health-alias propagation requires a controlled redeployment. No real payment or customer order was submitted during this audit.

> **Classification rule:** VERIFIED means the relevant production route or contract was exercised successfully. PARTIALLY VERIFIED means the primary behavior works but a material variant, environment, or evidence dimension remains incomplete. UNVERIFIED means source/configuration exists without sufficient live proof. BLOCKED means verification requires protected access, a real transaction, provider credentials, external DNS control, or user-supplied master assets.

## Final K01–K52 register

| ID | Requirement | Final classification | Evidence and limitation |
|---|---|---|---|
| K01 | Live public site | **VERIFIED** | Homepage and public Pages hostname render successfully without a fatal customer-surface error at [1]. The apex alias remains a separate gap under K50/K52. |
| K02 | Catalogue, 70 products, and pagination | **VERIFIED** | `/api/products?limit=100` returns 70 products; `/products` renders 50 per page with pagination and family filters at [2]. |
| K03 | Duplicate products or duplicate images | **PARTIALLY VERIFIED** | Product IDs/slugs and scanned active image paths show no duplicate identity collision, and no duplicate product-image basenames were found in the audited tree [3]. Perceptual similarity and every database row across all environments were not independently proven. |
| K04 | Six product families | **VERIFIED** | T-shirt, long sleeve, hoodie, mug, cap, and water bottle appear in the API/category contract and were exercised through live catalogue/detail or studio routes [2][4]. |
| K05 | Product detail | **VERIFIED** | At least one live detail route for each family rendered image, price, variants or size, colors, stock, add-to-cart, and related surfaces [4]. |
| K06 | Cart | **VERIFIED** | Add, remove, subtotal, custom preview, and cart persistence were exercised without a fatal error [5]. |
| K07 | Checkout guard | **VERIFIED** | Checkout preserved the cart and blocked incomplete delivery data with required-field and phone-format validation; no order was submitted [5]. |
| K08 | Real order ingestion | **PARTIALLY VERIFIED** | Mutation routing and standby rejection were verified with a non-submitting order probe; a real order was intentionally not created, so end-to-end ingestion and idempotency remain unverified [6]. |
| K09 | Uploaded customization image in order details | **UNVERIFIED** | Source wiring for design preview/original-file retrieval exists, but authenticated order-detail verification requires a real or existing authenticated order and was not completed [7]. |
| K10 | Order notes highlight | **UNVERIFIED** | Checkout exposes order notes and source wiring exists, but persistence and visual highlighting in authenticated admin order details were not live-tested [7]. |
| K11 | Design Studio V2 | **VERIFIED** | The V2 editor loaded with picker, tools, views, text/layer controls, export, product switching, and cart output; hoodie and water-bottle routes were exercised [4][5]. |
| K12 | Design Studio V1 rollback/compatibility | **PARTIALLY VERIFIED** | V1 compatibility/source boundaries remain present for rollback, but a complete live V1 parity regression was not performed [8]. |
| K13 | Front, back, sleeve, and neck views | **PARTIALLY VERIFIED** | The controls are present and hoodie back view rendered; full six-family, every-view visual geometry verification was not completed [4]. |
| K14 | Color consistency | **PARTIALLY VERIFIED** | Family color controls and canonical smart-v4 rows exist, and representative front/back routes work. Exhaustive visual identity matching across every color/view remains open [3][4]. |
| K15 | Sizes and fit | **VERIFIED** | Apparel detail routes expose S–XXL and fit/variant choices; non-apparel one-size behavior is present in API metadata [2][4]. |
| K16 | Mockup gallery | **VERIFIED** | Public `/api/mockups` returns 108 canonical rows, including front/back families and `isCanonical=true`; empty-table fallback is wired in source [9]. |
| K17 | smart-v4 and apparel-v5 provenance | **PARTIALLY VERIFIED** | Active runtime uses smart-v4 and no active source-kit-v3 reference was found, but apparel-v5 is not present in the runtime tree and legacy source-kit-v3 still ships in the public bundle [3][9]. |
| K18 | Realistic mockups | **UNVERIFIED** | PNG integrity, dimensions, alpha mode, and coverage were verified, but photographic realism was not independently established by a controlled visual-quality review [3]. |
| K19 | PSD/PSB smart mockups | **UNVERIFIED** | No live evidence establishes layered PSD/PSB masters, provenance, or a complete admin ingestion workflow. User-supplied master files are still required [7][9]. |
| K20 | Mockup consistency | **PARTIALLY VERIFIED** | Canonical front/back matrix and normalized rows exist, but every family/color/view pairing and photorealistic geometric match remains unverified [3][9]. |
| K21 | Water-bottle correction | **PARTIALLY VERIFIED** | Water Bottle Studio route rendered the correct family, silhouette, color controls, text layer, and cart output. Full photorealistic and all-view geometry certification remains open [4][5]. |
| K22 | Hoodie correction | **PARTIALLY VERIFIED** | Hoodie route and back view render with family controls and product metadata. Hood, pocket, sleeve, and all-color photographic matching remains unverified [4]. |
| K23 | Long-sleeve correction | **PARTIALLY VERIFIED** | Long Sleeve route and metadata render. Cuff, sleeve, back, and every-color geometry have not received exhaustive visual certification [4]. |
| K24 | Upload artwork, text, and layers | **VERIFIED** | Text layer creation, artwork guard, layer presence, and add-to-cart output were exercised in V2 [5]. File-upload persistence into a real order remains under K09. |
| K25 | AI art and background removal | **PARTIALLY VERIFIED** | Local fallback and provider-key gating are implemented, with truthful read-only behavior in source; external provider success and background-removal quality were not live-tested [7]. |
| K26 | Admin panel | **PARTIALLY VERIFIED** | Anonymous `/admin` boundary did not expose protected data. Authenticated dashboard, order list, gallery, and settings operations were not verified in this session [7]. |
| K27 | Advanced AI admin agent | **PARTIALLY VERIFIED** | Source contains provider-gated AI tools and read-only safety boundaries, but authenticated provider availability and live tool behavior remain unverified [7]. |
| K28 | Autonomous self-deploy/self-improvement | **PARTIALLY VERIFIED** | Release controls intentionally require explicit deployment approval and do not permit unsafe autonomous production mutation. An autonomous self-improving agent is therefore not claimed as implemented [7][10]. |
| K29 | Notifications | **UNVERIFIED** | Notification ownership/idempotency is not fully proven through a live order or provider delivery test; no real message was sent during the audit [7]. |
| K30 | External import, Facebook, and eBay | **UNVERIFIED** | Import/admin source surfaces exist, but provider authentication, live import truthfulness, and degraded-mode behavior were not verified [7]. |
| K31 | Multi-Neon routing | **PARTIALLY VERIFIED** | Source implements the four-existing-database selector with a data-score failover chain and excludes the product database from the transactional chain. Full live failover and limit behavior were not forced [11]. |
| K32 | One canonical writer | **VERIFIED** | Runtime role enforcement rejects standby/DR mutations; the gateway pins mutations to Render 1 and does not replay them to read origins. No real order was created [6][10]. |
| K33 | Render 1 suspended primary | **VERIFIED** | Existing primary service is preserved and suspended rather than deleted; restoration remains a controlled operational action [10]. |
| K34 | Render 2 standby | **VERIFIED** | Render 2 is live, returns products/mockups/readiness, and reports standby role with scheduler and backup sync disabled [10]. |
| K35 | Render 3 DR | **VERIFIED** | Render 3 is live, returns readiness/mockups, reports DR role, and has scheduler and backup sync disabled [10]. Direct alias propagation still needs a coordinated redeploy. |
| K36 | Cloudflare intelligent gateway | **VERIFIED** | Ordered origins, safe-read failover, cookie-aware reads, CORS OPTIONS at edge, and non-replayed mutations were verified in the active Pages Function [6][10]. |
| K37 | Cold-start resilience | **PARTIALLY VERIFIED** | Bounded frontend retries, abort propagation, and gateway cold-start retry logic are present; repeated worst-case hibernation recovery was not measured as a timed load test [10]. |
| K38 | Scheduler ownership | **VERIFIED** | Standbys explicitly disable scheduler/background ownership; health metadata reports the controls, leaving one canonical primary owner [10]. |
| K39 | Backup-sync bandwidth | **VERIFIED** | Full mirror/backup sync is disabled by default on standby/DR and is not run on every environment [10]. |
| K40 | Render 5 GB suspension | **PARTIALLY VERIFIED** | The architecture and asset/resource audit identify heavy public asset/PWA footprint and free-tier runtime exposure as material contributors, and the PWA fix removes approximately 325 MB from install-time precache. Provider billing/network logs were not available to prove a single exclusive root cause [3][10]. |
| K41 | R2 storage | **PARTIALLY VERIFIED** | Source wiring uses R2 signed upload/download URLs, original-file relocation, and mockup thumbnail persistence. A complete authenticated upload/download round trip was not performed [7]. |
| K42 | Image pipeline | **PARTIALLY VERIFIED** | Representative images loaded, smart-v4 files are valid 1024×1024 RGBA PNGs, and no zero-byte files were found. Full all-route HTTP image audit and photographic quality remain open [3][4]. |
| K43 | API route audit | **PARTIALLY VERIFIED** | Public health, products, mockups, CORS, and non-submitting order routes were exercised; protected/admin and real mutation contracts remain incomplete [6][7]. |
| K44 | Health, readiness, and liveness | **PARTIALLY VERIFIED** | Public `/api/readyz`, `/api/healthz`, and modern health routes return the expected public contract through Pages. Direct Render 2/3 alias propagation and every legacy route after redeployment require final controlled verification [6][10]. |
| K45 | CORS | **VERIFIED** | `OPTIONS /api/products` returned HTTP 204 with expected edge CORS behavior, while normal reads stayed same-origin through Pages [6]. |
| K46 | Security | **PARTIALLY VERIFIED** | Source scan found no audited secret patterns, anonymous admin access did not expose data, standby mutations are rejected, and CI security scan passes. Authenticated CSRF/session, provider-secret rotation, and full history scanning remain operational follow-ups [7][10]. |
| K47 | CI and GitHub | **VERIFIED** | PR 17 passed active-app verification, CI build-and-check, and security scan before squash merge; local typecheck/build/tests also passed [12]. |
| K48 | Rollback safety | **VERIFIED** | Prior Pages deployments remain identifiable, Git history preserves the previous release, and the current change was merged through a reviewed PR [10][12]. |
| K49 | Mobile and performance | **PARTIALLY VERIFIED** | Responsive customer routes were visually exercised and the live PWA precache was reduced to approximately 16.5 MiB. Several JavaScript chunks remain above 500 kB, and a timed mobile performance profile was not completed [10][12]. |
| K50 | SEO and content truthfulness | **PARTIALLY VERIFIED** | Public content, policy, blog, FAQ, and metadata surfaces render. The apex domain serves stale Nginx content, and operational/legal policy claims require content-owner review [10]. |
| K51 | Admin mockup upload/gallery | **UNVERIFIED** | Source supports mockup metadata and gallery concepts, but authenticated upload, master-file ingestion, preview, and ingest-status workflows were not live-tested [7][9]. |
| K52 | Full future readiness | **PARTIALLY VERIFIED** | Core public reads, three-Render roles, gateway controls, studio/cart/checkout guard, and release gates are in place. Apex DNS, authenticated admin, real-order/notifications/imports, PSD/PSB masters, photorealism, legacy asset cleanup, and final Render redeployment remain explicit owners’ actions [10]. |

## Production fixes completed in this audit phase

The safe reproducible performance defect was corrected in `artifacts/trynex-storefront/vite.config.ts`. Large product images were removed from install-time PWA precache because `src/sw.ts` already provides bounded runtime image caching. The local build reduced precache from approximately 341,909 KiB across 218 entries to approximately 16,514 KiB across 128 entries. The change passed storefront typecheck, storefront build, `git diff --check`, active-app verification, CI build-and-check, and security scan. It was merged as PR [17](https://github.com/georgelsmith333-hub/trynext-lifestyle/pull/17), and cache-busted production inspection confirmed that actual `products/` entries are no longer present in the live service-worker precache manifest.

The `/api/readyz` compatibility alias is present in the merged main release. Public Pages readiness currently returns HTTP 200 with `db=true`, `runtimeRole=standby`, `schedulerEnabled=false`, and `backupSyncEnabled=false`. Direct Render 2/3 service redeployment remains a controlled operational follow-up because the public gateway can serve the compatibility contract even while an individual Render service may still run the previous image.

## Required next actions and ownership

| Priority | Action | Owner or required input | Classification until completed |
|---|---|---|---|
| P0 | Correct apex DNS and attach `trynext.pages.dev` to the same current Pages release; preserve `www` parity. | Domain/DNS owner with access to the external DNS provider. | BLOCKED |
| P0 | Perform a coordinated Render 2/3 redeploy from merged main and then verify `/api/readyz` directly on both services. | Render workspace access or approved deployment trigger. | PARTIALLY VERIFIED |
| P0 | Authenticate to admin and verify dashboard, orders, original-file download, notes, mockup gallery, and AI provider status using an existing safe session. | Existing admin session; no new credentials should be written to files. | UNVERIFIED |
| P1 | Create one controlled non-payment test order in a non-production/test-safe manner, or provide an existing order ID, to verify upload preview, original file, notes, notification idempotency, and admin display. | User approval and a safe test-order strategy. | BLOCKED by safety boundary |
| P1 | Replace or validate mockups with user-supplied PSD/PSB masters and independently review photorealism, geometry, and front/back/color pairing. | Complete layered master asset package from the user. | BLOCKED |
| P1 | Remove or archive the 56 MB source-kit-v3 directory in a reviewed compatibility decision. | Product owner confirmation that V1 rollback does not require those public files. | PARTIALLY VERIFIED |
| P2 | Complete timed mobile performance, full image-load, notification, external-import, and provider integration tests. | Authenticated provider sessions and controlled test data. | UNVERIFIED |

## References

[1]: https://trynext.pages.dev/ "Trynext Lifestyle public Pages hostname"
[2]: https://trynext.pages.dev/api/products?limit=100 "Trynext public products API"
[3]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/docs/LIVE_SITE_DEEP_AUDIT_2026-08-21.md "Accumulated live site and asset audit evidence"
[4]: https://trynext.pages.dev/design-studio "Trynext Design Studio V2"
[5]: https://trynext.pages.dev/checkout "Trynext checkout surface"
[6]: https://trynext.pages.dev/api/readyz "Trynext public readiness contract"
[7]: https://github.com/georgelsmith333-hub/trynext-lifestyle/tree/main/artifacts "Trynext application source and admin/API implementation"
[8]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/docs/THREE_RENDER_IMPLEMENTATION_EVIDENCE_2026-08-21.md "Three-Render implementation evidence"
[9]: https://trynext.pages.dev/api/mockups "Trynext public mockups API"
[10]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/docs/LIVE_CONTRACT_PROBE_2026-08-21.md "Fresh public contract probe evidence"
[11]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/docs/KEYWORD_SOURCE_ROUTE_MAP_2026-08-21.md "Keyword-to-source and route map"
[12]: https://github.com/georgelsmith333-hub/trynext-lifestyle/pulls?q=is%3Apr+is%3Amerged "Merged Trynext pull requests and checks"
