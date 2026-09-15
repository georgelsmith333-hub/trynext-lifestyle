# Trynext Lifestyle Production Resource and Quota Audit

**Author:** Manus AI  
**Snapshot date:** 2026-08-20  
**Status:** Audit complete for the evidence available in the authenticated session. No secondary Render environment was created or configured, no production database writer was added, and the hardening branch was not pushed or deployed.

## Executive conclusion

The Render suspension is confirmed as a **workspace-level outbound-bandwidth exhaustion event**. The primary Render workspace, “George’s workspace,” shows the 5 GB Hobby/Free allowance consumed and the `trynext-api` service suspended by Render. Cloudflare Pages remains reachable and serves static files, but every current `/api/*` request is proxied to the suspended Render origin and returns HTTP 503.

The exact byte split could not be recovered because the Hobby dashboard did not expose the historical numeric graph in this authenticated session, the two supplied Render API credentials returned HTTP 400, and the Render logs view did not return historical rows. It would be unsafe to invent a byte attribution. The strongest evidence-based ranking is nevertheless clear: **the recurring full mirror of the active Neon database into four configured targets is the leading service-initiated suspect; API-proxied binary traffic and uncached API responses are the leading user-driven suspects; small polling JSON is a secondary request amplifier; Cloudflare Pages static mockup images are not the cause.**

The recommended budget-conscious architecture is **two separate Render Hobby workspaces in active-passive mode, sharing the existing Neon topology and a single write authority, with Cloudflare Pages as the only browser-facing gateway and R2 for binary assets**. The recommended operationally simpler architecture, if the monthly fee is acceptable, is **one Render Pro workspace with the same egress controls**. A third Hobby workspace should not be created yet; it adds operational complexity before the first failover path has been verified.

> **Approval gate:** No secondary Render service or environment should be created or configured until the user explicitly approves one of the architectures below.

## 1. Current production baseline

The live Cloudflare Pages project is `trynext-lifestyle-shop`, project ID `26a10b86-20c1-4464-bc84-eeb4b1e3b3ad`, connected to `georgelsmith333-hub/trynext-lifestyle` on the `main` branch. Its latest production deployment is `340a43c3`, built from commit `5504e45` (`fix(mockups): rebuild apparel from layered PSD masters`, captured 2026-08-17). The live Pages environment variables `API_ORIGIN`, `API_URL`, and `TRYNEXT_API_URL` all point to `https://trynex-api.onrender.com`. Pages Functions are enabled.

The authenticated Render dashboard shows one service, `trynext-api`, service ID `srv-d7b774mdqaus73carp70`, a Node service in Oregon at `https://trynex-api.onrender.com`. The workspace banner explicitly states that the 5 GB free bandwidth allowance has been used and the workspace is suspended. The service Metrics page exposes an Outbound Bandwidth panel but, for the current Free/Hobby state, does not expose the historical numeric breakdown needed for category attribution. It identifies 512 MB memory and 0.15 CPU limits.

There is configuration drift that must be resolved during a later approved release: the committed `render.yaml` describes a service named `trynext-api-server` on the Starter plan with `maxInstances: 3`, `minInstances: 1`, and an attached Render Postgres resource named `trynext-db`, while the live dashboard shows `trynext-api` as a Free service and the project evidence identifies four Neon database bindings. The blueprint must not be treated as proof of the live service contract until it is reconciled manually.

| Layer | Live or committed evidence | Audit interpretation |
|---|---|---|
| Cloudflare Pages | Production deployment `340a43c3`; GitHub `main`; Pages Functions enabled | Static frontend and mockup CDN are available, but API traffic is not offloaded from Render. |
| Pages API gateway | Current production proxy forwards every `/api/*` request to one Render origin | No API caching, no origin failover, no compression policy, and no response-size guard. |
| Render | One authenticated workspace; `trynext-api` suspended after 5 GB | Single suspension boundary and no usable numeric category split in the current session. |
| Neon | Four existing bindings: main, failover, analytics, and `DATABASE_URL_TRYNEXT_DB` | Existing topology must be preserved; only one authority may accept production writes. |
| R2 | Account metrics show 15 Standard objects and 937,062 bytes payload | R2 is small in the measured account snapshot and is not holding the large repository mockup catalog. |
| GitHub Actions | 639 total historical runs; latest 100 span 2026-08-15 to 2026-08-17 | CI churn is material for GitHub/Pages consumption, but the workflows do not call the live Render API. |

## 2. Live measurements

Read-only HTTP sampling on 2026-08-20 returned HTTP 503 and 256 downloaded bytes for the Pages-proxied `/api/products?limit=12`, `/api/mockups`, and `/api/public-stats` endpoints. The same HTTP 503 and 256 bytes were returned directly from `https://trynex-api.onrender.com/api/healthz`. These values describe the suspended state and are not healthy payload sizes.

The live Pages homepage returned HTTP 200 and 17,447 bytes. A legacy source-kit-v3 mockup image returned HTTP 200 and 743,398 bytes with `server: cloudflare`, an ETag, and a public cache header. This confirms that static mockup bytes are served by Cloudflare Pages rather than Render. It also confirms that the current API path is distinct: the API responses were dynamic 503s, not Pages-cached static assets.

The Cloudflare R2 account metrics endpoint returned 15 Standard objects and 937,062 bytes of payload storage, with zero objects in the uploaded or infrequent-access categories. A separate read-only R2 bucket-list request returned an authentication error and is excluded from the measured facts. The Workers observability query for the preceding 30 days returned zero events; this is treated as missing or empty observability, not proof of zero Pages Function requests. The billing usage query returned an authentication error.

The GitHub Actions API reported 639 total historical workflow runs. The latest 100 runs span 2026-08-15 through 2026-08-17 and contain 83 successes, 5 failures, and 12 cancellations. The two workflows are local typecheck, test, build, security, and artifact jobs. They do not invoke the live Render API or download the production mockup catalog as part of their declared steps. They can increase GitHub Actions minutes and Pages build consumption, but they are not a credible direct cause of Render’s outbound suspension.

## 3. Ranked bandwidth-cause analysis

### 3.1 Leading suspect: recurring full Neon mirror

`artifacts/api-server/src/lib/dbBackupSync.ts` reads every shared source table, counts rows, verifies schemas, truncates each target, and selects and inserts every row into each configured target. The configured targets are `DATABASE_FAILOVER`, `DATABASE_URL_TRYNEXT_DB`, `DATABASE_PRODUCTS`, and `DATABASE_ANALYTICS`. The implementation runs targets sequentially and performs a full replacement rather than an incremental diff. `scheduler.ts` invokes this job every 30 minutes and also schedules a run 30 seconds after boot.

This is not merely database failover metadata. It is a repeated full data transfer from Render to four external Neon connections. Render documents that service-initiated traffic to the public internet counts toward outbound bandwidth, so the Neon mirror is a direct candidate for the quota consumption.[5]

The deterministic budget math is severe even for a small database. A 30-minute schedule produces 48 scheduled runs per day, or approximately 1,440 runs in a 30-day month. If the source payload equivalent is only 1 MiB and four targets receive the full mirror, the target writes alone represent approximately 5.625 GiB per month before protocol overhead, TLS, schema queries, and other traffic. Conversely, the 5 GiB allowance divided across four targets and 1,440 monthly runs is only approximately **0.889 MiB of source payload per run** if the mirror were the sole consumer. This proves that a full four-target mirror can exhaust a 5 GiB allowance at surprisingly small data sizes; it does not claim that the current database is exactly that size.

### 3.2 High-risk user and service path: binary traffic through Render

The storage design correctly supports presigned R2/S3 upload URLs, allowing a browser to upload directly to object storage. However, the API still exposes `GET /api/storage/public-objects/*` and `GET /api/storage/objects/*`, which stream object bytes through Render to the browser. `POST /api/storage/optimize` downloads an object, transforms it in Render memory, and returns a binary image response. These paths can consume Render egress whenever they are used instead of direct signed downloads.

Order submission can persist Design Studio composites through `saveMockupImage`. A data URL is decoded in Render, capped at 8 MiB, written to R2/S3 through a service-initiated request, and returned as an API object path. The background-removal route accepts a base64 data URL up to a 10 MB string-length limit, sends the decoded image to remove.bg, and returns a base64 PNG data URL inside JSON. A successful use can therefore create a multi-megabyte Render response in addition to the request and the service’s outbound call to remove.bg. These are low-frequency compared with catalog reads, but high-volume per event.

### 3.3 API gateway policy: no cache or compression offload

The current production Pages Function reconstructs every `/api/*` URL against the one Render origin, forwards the request body for non-GET methods, and streams the response body back to the browser. It does not cache safe GET responses, normalize response compression, cap response size, or separate metadata paths from binary paths. Therefore Cloudflare Pages is not currently protecting Render from repeated API response egress. The hardening branch contains a safer multi-origin gateway, but it is local only and has not been pushed or deployed.

The product route does have a 60-second Redis cache for simple non-search listings, but that cache is server-side and the Pages proxy still receives every client request. The mockup override route has no public cache in the current server implementation, while Design Studio explicitly requests it with `cache: "no-store"`.

### 3.4 Secondary request amplifier: polling

The following intervals are present in production source. The daily counts are theoretical per continuously active page and are included to show request pressure, not actual measured user traffic.

| Surface | Interval | Theoretical requests per active page per 24 hours | Payload class |
|---|---:|---:|---|
| Design Studio `/api/mockups` | 30 seconds | 2,880 | Mockup metadata JSON; image bytes are separate static/override requests. |
| Product viewer heartbeat | 30 seconds | 2,880 | Tiny JSON request and response. |
| Account unread count | 8 seconds | 10,800 | Tiny count JSON. |
| Account open messages | 5 seconds | 17,280 | Text-centric JSON; can grow if attachments are later embedded. |
| Track Order | 12 seconds | 7,200 | Order-status JSON. |
| Admin database cluster | 30 seconds | 2,880 | Operational health JSON. |
| Home public stats | 60 seconds | 1,440 | Tiny JSON; server-side Redis cache is 60 seconds. |

The polling traffic is unlikely to explain 5 GiB by itself because most responses are small JSON objects. It can, however, amplify any uncompressed catalog, mockup, attachment, or order response and can consume the Cloudflare Pages Functions request allowance when many tabs remain open.

### 3.5 Not a leading cause: Pages static mockup images

The read-only repository measurement found 202 smart-v4 images totaling approximately 56.29 MiB, 108 source-kit-v3 images totaling approximately 54.44 MiB, 108 legacy source-kit images totaling approximately 51.98 MiB, and approximately 0.26 MiB in the small `public/products` directory. The entire public tree is approximately 329 MiB. These are Pages static assets, not Render responses. The live static mockup sample was served by Cloudflare, so downloading those assets does not explain Render’s 5 GiB outbound meter.

## 4. Constraints across the current providers

Render Hobby/Free includes 5 GB outbound bandwidth per workspace per month. The prior verified Render documentation indicates that adding services inside one workspace does not create multiple 5 GB pools; genuinely separate workspaces have separate allowances. Render Pro includes 25 GB per workspace according to the pricing and outbound-bandwidth documentation.[5] [7]

Cloudflare Pages static assets are served separately from Pages Functions. Pages Functions requests count toward the Workers/Pages Functions quota, while R2 egress is free but R2 storage and Class A/Class B operations remain metered.[1] [2] [3] [4] R2 is therefore appropriate for direct binary delivery, but it is not an unlimited substitute for careful request and operation design.

The current four-Neon topology must be treated as an existing data-plane constraint. The architecture must not create a fifth production database, must not round-robin writes among the four existing bindings, and must not let a standby Render service invent its own catalog or order authority. The safe model is one production write authority, with the other configured databases used only according to explicit failover, analytics, or backup roles and protected by bounded connection pools.

## 5. Architecture comparison

### Architecture A — One Render workspace with aggressive egress reduction

This option keeps one Render service and one workspace, fixes the full-mirror behavior, routes all static and public binary assets directly through Pages/R2, adds short edge caching for safe metadata, reduces or removes unnecessary polling, and keeps all production writes serialized through the existing primary Neon authority. The current hardening gateway can later provide policy-aware routing without creating a second service.

Its principal advantage is consistency and operational simplicity. There is one API deployment boundary and no split-brain risk. Its weakness is that one 5 GB workspace remains a hard outage boundary: if the corrected traffic model still exceeds 5 GB, Render can suspend the only API service again. It is suitable only if measured healthy traffic remains comfortably below the allowance after the full mirror and binary paths are corrected.

### Architecture B — Two separate Hobby workspaces, active-passive compute

This option deploys the same stateless API build into a second, genuinely separate Render Hobby workspace. Cloudflare Pages remains the only browser-facing gateway and holds an ordered origin list: primary first, standby second. GET/HEAD metadata reads may fail over after bounded timeout/502/503/504 conditions. Writes remain primary-only unless the request carries a durable idempotency key and the backend can prove safe replay. The standby shares the existing Neon topology and does not receive a new database or become an independent writer.

Under normal operation, the primary consumes its own 5 GB allowance while the standby remains mostly unused. If the primary workspace is suspended or unavailable, the gateway can direct eligible traffic to the standby, giving a second approximately 5 GB workspace allowance. The allowances are not a single pooled 10 GB bucket, and they are not a guarantee that the site can safely emit 10 GB of traffic without fixing the underlying egress cause. The extra workspace adds deployment, secret, health, monitoring, and failover-test complexity, but it provides the strongest budget-conscious outage boundary without duplicating the data authority.

### Architecture C — One Render Pro workspace with the same egress controls

This option upgrades the existing workspace to Pro and keeps one primary API service or a small set of stateless services inside that workspace. The verified plan documentation indicates 25 GB included outbound bandwidth. It preserves the simplest control plane and avoids cross-workspace secret and deployment drift. It still requires the full-mirror correction, direct R2/Pages delivery, API caching, bounded polling, and idempotent writes; a larger allowance is not permission to keep the current full-database replication pattern.

Its main weakness is cost and the fact that one workspace remains a single suspension and control-plane boundary. Its main advantage is that it provides substantially more headroom than 5 GB without introducing a second workspace’s operational burden. It is the best operational choice if the monthly fee is acceptable and the business values simplicity over a no-cost failover boundary.

| Criterion | Architecture A: one Hobby workspace | Architecture B: two Hobby workspaces | Architecture C: one Pro workspace |
|---|---|---|---|
| Included bandwidth | 5 GB per workspace | Approximately 5 GB per workspace; about 10 GB only across genuinely separate workspaces | 25 GB per workspace |
| Database writers | One existing Neon write authority | One existing Neon write authority shared by stateless primary/standby compute | One existing Neon write authority |
| Existing four Neon databases | Preserve; stop treating full mirrors as routine traffic | Preserve; same environment contract in both services; no new database | Preserve; same environment contract |
| Consistency | Strongest and simplest | Strong if standby is passive and writes never round-robin | Strongest and simplest |
| Failure behavior | Full API outage if the only workspace suspends | Eligible reads can fail over; ambiguous writes must not be replayed blindly | Larger headroom, but one workspace boundary remains |
| Free-tier exposure | Highest | Lower outage exposure but more quota surfaces | No Hobby suspension threshold at 5 GB, but paid plan exposure |
| Operational complexity | Lowest | Highest; requires gateway, health, secrets, and failover tests | Medium to low |
| Scalability | Limited by 5 GB and one service boundary | Better failure isolation, not automatic capacity scaling | Better headroom and simpler scaling within one control plane |
| Recommendation | Viable only after egress reduction is proven | **Recommended budget-conscious path** | **Recommended if paid plan is acceptable** |

## 6. Recommended release sequence after approval

The first approved implementation wave should not create another writer or database. It should correct the egress model in a rollback-safe branch: disable or replace scheduled full replacement with an explicitly bounded and measured backup strategy; ensure all public static and binary assets use Pages/R2 or signed URLs; add edge caching for safe catalog and mockup metadata; reduce no-store polling; and add per-route byte/request telemetry without logging customer artwork or secrets.

The second wave should reconcile the live Render contract with source control and restore one known-good primary service. The readiness contract must distinguish process liveness from Neon/Redis/R2 dependency readiness. The current hardening branch’s idempotency and read-failover gateway should be reviewed, tested, and deployed only after database repair and release gates pass.

Only after the primary is healthy should Architecture B create a same-build, same-secret-contract passive Render service in the separate workspace. The Pages gateway should first enable read-only failover for safe GET/HEAD routes. Order creation, payment initiation, inventory mutations, admin mutations, and other ambiguous writes must remain primary-only until durable idempotency records are verified. The third workspace option is deferred until two-workspace health, quota, and controlled failover evidence exists.

Architecture C follows the same release sequence; the only change is the Render plan boundary. It does not remove the need for egress controls or the one-writer Neon rule.

## 7. Final approval request

The audit is complete to the extent supported by the current authenticated evidence. The exact historical Render category split remains unavailable, but the source audit identifies a technically credible and deterministic primary suspect: the 30-minute full mirror to four Neon targets. The safe next action is not to create another Render environment immediately. It is to approve an architecture and an egress-control release gate.

**Please approve one option by name:**

| Approval choice | Meaning |
|---|---|
| **A — One Hobby workspace after egress reduction** | First fix traffic and keep one service; no secondary Render configuration. |
| **B — Two separate Hobby workspaces, active-passive** | After primary restoration and egress controls, configure one passive standby in the second workspace; no new database and no second writer. |
| **C — One Pro workspace** | Upgrade the current workspace and retain one writer; no secondary workspace required initially. |

Until that approval is received, the secondary Render environment will remain untouched.

## References

[1]: https://developers.cloudflare.com/pages/platform/limits/ "Cloudflare Pages limits"  
[2]: https://developers.cloudflare.com/pages/functions/pricing/ "Cloudflare Pages Functions pricing"  
[3]: https://developers.cloudflare.com/workers/platform/limits/ "Cloudflare Workers limits"  
[4]: https://developers.cloudflare.com/r2/pricing/ "Cloudflare R2 pricing"  
[5]: https://render.com/docs/outbound-bandwidth "Render outbound bandwidth"  
[6]: https://render.com/docs/service-metrics "Render service metrics"  
[7]: https://render.com/pricing "Render pricing"  
[8]: https://render.com/docs/disks "Render persistent disks"  
[9]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/artifacts/api-server/src/lib/dbBackupSync.ts "Trynext full Neon mirror implementation"
[10]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/artifacts/api-server/src/lib/scheduler.ts "Trynext scheduler intervals"
[11]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/artifacts/trynex-storefront/functions/api/%5B%5Bpath%5D%5D.ts "Trynext Pages API proxy"
[12]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/artifacts/api-server/src/routes/storage.ts "Trynext storage routes"
[13]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/artifacts/api-server/src/routes/removeBg.ts "Trynext background-removal route"
[14]: https://github.com/georgelsmith333-hub/trynext-lifestyle/blob/main/artifacts/trynex-storefront/src/pages/DesignStudio.tsx "Trynext Design Studio polling and image processing"
