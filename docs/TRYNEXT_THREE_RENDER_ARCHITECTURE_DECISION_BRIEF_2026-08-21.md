# Trynext Three-Render Architecture Decision Brief

**Date:** 2026-08-21  
**Status:** Architecture definition only. Render 2 and Render 3 have not been created or configured. No production database, writer, scheduler, or Cloudflare route has been changed.

## Confirmed interpretation of the requested target

The attached specification is understood as a firm target of **three Render environments total**, not a choice between one, two, or three. Render 1 is the existing suspended `trynext-api` environment and must remain intact. Render 2 is a new secondary standby. Render 3 is a new tertiary standby or disaster-recovery capacity.

The three environments must be treated as **three stateless compute locations around one coordinated data architecture**, not as three independent e-commerce backends. The design must not create three order authorities, three payment processors, three inventory writers, three notification systems, three full database mirrors, or three continuously active cron systems.

> The target is three Render environments, but the source of truth remains singular.

## Target topology

```text
Customer browser
      |
      v
Cloudflare Pages static storefront and static mockups
      |
      v
Cloudflare Pages API gateway / route-aware failover
      |
      +--> Render 1: existing primary compute
      |
      +--> Render 2: secondary standby compute
      |
      +--> Render 3: tertiary standby compute
                    |
                    v
        Existing canonical services only:
        Neon topology + R2 + Redis + approved external providers
```

Cloudflare must be the only browser-facing API gateway. The gateway should use an ordered origin policy rather than round-robin load balancing. Normal traffic goes to Render 1. Eligible safe reads may fail over to Render 2 and then Render 3 after bounded timeout or 502/503/504 conditions. Sensitive writes must not be automatically replayed after an ambiguous failure.

## Render role contract

| Environment | Role | Normal traffic | Writes | Scheduled/background work |
|---|---|---|---|---|
| Render 1 | Existing primary | All normal traffic | Sole production write authority | Sole active owner initially; later may use a distributed lease for controlled takeover |
| Render 2 | Secondary standby | Health/readiness only until activated; safe reads during controlled failover | No independent order, payment, inventory, product, customer, or admin authority | Disabled by default; no duplicate backup mirror, notification worker, or cron |
| Render 3 | Tertiary standby/DR | Health/readiness only until both earlier origins are unavailable; safe reads during controlled failover | Same restrictions as Render 2 | Disabled by default; activation is controlled and evidenced |

A standby service may connect to the same canonical databases for readiness and safe reads, but connection credentials and application authorization must prevent it from becoming an unplanned competing writer. Application role flags alone are not a security boundary; write authorization must also be enforced at the API route and database-credential level.

## One canonical production writer

The only permitted production write path is Render 1 while it is active. Render 2 and Render 3 must not independently create orders, initiate payments, decrement inventory, mutate products, change customer state, process payment webhooks, send duplicate notifications, or execute admin mutations.

If Render 1 becomes unavailable during a sensitive operation, the gateway must return a truthful retryable error unless the operation has a durable idempotency record and the backend can prove safe replay. A timeout is an **unknown result**, not permission to send the same POST to another Render environment.

The existing order idempotency hardening is therefore essential before any automatic write recovery is considered. Read failover can be enabled first; write failover remains disabled until order, payment, inventory, webhook, and notification replay tests pass.

## Existing four-Neon topology and required mapping

The current source and audit identify these bindings:

| Binding | Intended role | Required rule |
|---|---|---|
| `DATABASE_URL_MAIN` / active database URL | Canonical production data authority | Sole normal writer for orders, inventory, customers, products, carts, and admin state. |
| `DATABASE_FAILOVER` | Validated database failover target | Not a competing writer; activate only through a documented database failover procedure. |
| `DATABASE_ANALYTICS` | Analytics/reporting target | Eventually consistent and read-oriented; never an order or inventory authority. |
| `DATABASE_URL_TRYNEXT_DB` | Existing secondary/cold-copy binding | Preserve and verify actual contents and intended role before use. |
| `DATABASE_PRODUCTS` | Referenced by the current backup-sync code | Must be verified in the live environment before implementation; it may be configured in addition to the four documented bindings or may be skipped. Do not assume either state. |

No new Neon database should be created. The existing `dbBackupSync.ts` currently mirrors every source table into every configured backup target every 30 minutes. That behavior must not be copied into Render 2 or Render 3. It should first be changed into an explicitly owned, bounded, measured, and failure-safe synchronization strategy. The current full mirror is the leading suspected cause of the Render bandwidth suspension.

## Background-job ownership

There must be exactly one active owner for each recurring workload. The initial safe ownership model is:

| Workload | Initial owner | Standby behavior |
|---|---|---|
| Database backup/synchronization | Render 1 only, after the strategy is reduced and measured | Disabled on Render 2 and Render 3 |
| Analytics refresh | One designated worker path only | Disabled on standby services |
| Order notifications | One idempotent worker path only | No duplicate sends; takeover requires a lease |
| Cleanup and maintenance | One designated scheduler only | Disabled on standby services |
| Health checks | Cloudflare plus Render service checks | Lightweight and bounded |
| Customer polling | Browser only, reduced and visibility-aware | Never duplicated by standby services |

The long-term resilience version should use a durable Neon or Redis lease so that exactly one active environment can own a job after a controlled failover. The current in-process scheduler has no cross-service ownership mechanism, so simply deploying the same application three times would create duplicate schedulers and is unsafe.

## Cloudflare route policy

The gateway should classify requests by method and route. The first release should use a conservative allowlist.

| Route class | Examples | Automatic failover policy |
|---|---|---|
| Public safe reads | `GET /api/products`, `GET /api/products/:id`, `GET /api/products/featured`, `GET /api/mockups`, `GET /api/public-stats`, public categories/blog/reviews/testimonials/settings after route validation | Primary, then secondary, then tertiary on bounded timeout/502/503/504. No blind retry after a response has begun. |
| Health and readiness | `/api/healthz`, `/api/readyz`, `/api/health/readiness`, dependency-specific health routes | Probe each origin with short timeouts; readiness must include the dependencies required by the route class. |
| Viewer/status writes | `PUT /api/products/:id/viewers` and similar heartbeat writes | Primary only initially; may be dropped or locally degraded if primary is unavailable. |
| Personalized reads | Customer orders, account messages, private drafts, admin reads | Primary only until session consistency and failover semantics are explicitly tested. |
| Sensitive mutations | Checkout, order creation, payment initiation, inventory mutation, product mutation, account mutation, admin mutation, refunds, payment webhooks | Never automatically fail over unless durable idempotency and replay safety are proven for that exact route. |
| Binary and storage writes | Upload finalization, object moves, mockup persistence, image optimization | Prefer direct signed R2 upload/download. Primary only for metadata/finalization; no blind replay. |
| AI and external-provider operations | Background removal, AI generation, imports, external API actions | Primary or one designated worker only; provider calls require rate limits, idempotency, and truthful degraded errors. |

The exact final allowlist must be generated from the deployed route map and tested route by route. A method-only rule is not sufficient because some GET endpoints can have personalized or side-effecting behavior.

## Bandwidth and quota controls

Three separate Hobby workspaces can provide approximately three separate 5 GB allowances only if Render 1, Render 2, and Render 3 are genuinely in separate workspaces. Three services inside one workspace still share that workspace’s allowance. The allowances are not pooled into a guaranteed 15 GB capacity, and adding environments does not fix the current egress cause.

The first implementation wave must therefore reduce traffic before adding capacity. The full four-target database mirror must not continue at the current 30-minute full-replacement cadence. Public static storefront assets and smart-v4 mockups should remain on Pages. Binary uploads should use direct signed R2 URLs. Private downloads should use short-lived signed URLs rather than API streaming where possible. Safe metadata responses should have bounded edge caching, ETags, pagination, and explicit invalidation. Design Studio, order tracking, account messages, admin refresh, and viewer polling should become visibility-aware, backoff-aware, and stopped when the tab or operation is inactive.

R2 must be measured by object count, storage, Class A operations, Class B reads, signed URL use, cache hit rate, and duplicate-object rate. The current audit measured 15 Standard R2 objects and 937,062 bytes of payload, but the bucket inventory and detailed operation billing were not available in the session. R2 is not an unlimited free replacement for Pages or Render.

## Failover matrix

| Scenario | Render 1 | Render 2 | Render 3 | Expected behavior |
|---|---|---|---|---|
| Normal | Active primary | Standby | Standby | All normal traffic and writes use Render 1. |
| Render 1 unavailable | Unavailable | Active for eligible safe reads | Standby | Reads may use Render 2; sensitive writes return a safe retryable error. |
| Render 1 and 2 unavailable | Unavailable | Unavailable | Active for eligible safe reads | Render 3 serves only the approved read allowlist; writes remain protected. |
| Render 1 returns | Recovering | Possibly active | Standby | Do not automatically move ambiguous writes; recover and drain under operator control. |
| Neon primary unavailable | Any | Any | Any | Use only the previously validated Neon failover procedure; do not let three Render services independently promote databases. |
| Render 2 unavailable | Active | Unavailable | Standby | Render 1 remains primary; Render 3 is not activated unnecessarily. |
| Render 3 unavailable | Active | Standby | Unavailable | Render 1/2 design continues normally. |
| Cloudflare unavailable | Unknown | Unknown | Unknown | Render redundancy does not repair a Cloudflare outage; document the actual public consequence. |
| R2 unavailable | Degraded | Degraded | Degraded | Reject or defer affected asset operations safely; do not corrupt orders or silently lose artwork. |
| External provider unavailable | Degraded | Degraded | Degraded | Return truthful provider-unavailable state; do not retry indefinitely from all three environments. |

## Implementation gates before Render 2 or Render 3 configuration

The following gates must pass in order:

1. **Architecture gate:** Confirm that Render 2 and Render 3 will be in separate workspaces, not merely additional services in the existing workspace.
2. **Role gate:** Confirm that Render 1 remains the existing service and that Render 2/3 are standby compute only.
3. **Neon gate:** Inspect the live environment contract and map all four existing bindings, including the unexplained `DATABASE_PRODUCTS` reference, without creating a database.
4. **Egress gate:** Replace or disable the current full mirror behavior before exposing more than one running application environment. Record transfer counts and bytes.
5. **Scheduler gate:** Add explicit standby scheduler disabling and one-owner job controls. The current in-process scheduler cannot be duplicated unchanged across three services.
6. **Gateway gate:** Deploy the route-aware gateway only after local tests prove safe read failover and no automatic mutation replay.
7. **Build gate:** Build the exact same tested commit for all three environments. Do not let Render 2/3 track an unreviewed branch.
8. **Secret gate:** Enter secrets through Render environment configuration only. Never commit credentials to GitHub, source files, or `render.yaml`.
9. **Primary restoration gate:** Verify Render 1 after its allowance reset or approved service recovery: health, readiness, Neon, Redis, R2, catalog, checkout guard, and order idempotency.
10. **Standby gate:** Configure Render 2, test it directly without public failover, then configure Render 3 only after Render 2 passes.
11. **Failover gate:** Test simulated Render 1, Render 2, and Render 3 failures; verify safe reads, truthful write failures, no duplicate orders, no duplicate payments, no duplicate inventory decrements, and no duplicate notifications.
12. **Rollback gate:** Preserve the prior Pages deployment and single-origin configuration so the gateway can be reverted without a database rollback.

## What “three Render environments” does and does not provide

Three environments provide three independent compute/control-plane locations and, if placed in separate workspaces, separate bandwidth allowances. They do not provide a shared 15 GB pool, automatic database replication, automatic payment failover, guaranteed continuous uptime, or permission to round-robin production writes. They do not remove the need for Cloudflare gateway health logic, Neon connection discipline, R2 operation monitoring, idempotency, or a one-owner job model.

The correct implementation is therefore **three Render environments around one controlled data authority**, not three copies of the whole production system running independently.

## Current decision requested

The architecture target is understood and accepted as:

**Render 1 existing primary + Render 2 secondary standby + Render 3 tertiary standby/DR, with Cloudflare route-aware failover, the existing four-Neon topology preserved, one canonical production writer, no duplicate schedulers, and measured quota controls.**

This document defines the architecture. It does not authorize creating Render 2 or Render 3. A separate explicit implementation confirmation is still required before any Render workspace, service, environment variable, deployment, or Cloudflare production route is changed.

## Current implementation-session access evidence

The user has now explicitly approved proceeding with the three-Render implementation. The local source-control worktree was placed on the isolated branch `hardening/three-render-implementation-2026-08-21` from the verified `main` commit. The existing Render dashboard was opened read-only, but the current browser session returned a blank dashboard view on two successive checks, so the visible workspace list and the two additional Render accounts cannot yet be treated as accessible. The previously supplied Render API credentials were already recorded as returning HTTP 400. No Render service or workspace mutation has been attempted because the required account/workspace access is not currently observable.
