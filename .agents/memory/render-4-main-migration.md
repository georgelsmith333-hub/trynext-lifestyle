---
name: Render 4 as primary + multi-route split (2026-08-29)
description: Owner-approved migration to a 4-Render topology — new 4th Render is the sole write primary; reads round-robin across standby-2/standby-3; Render 1 retired (suspended).
---

# Render 4 main migration

## Owner decision (2026-08-29)
- Use the 4th Render service as the **actual main** (sole write authority) from now.
- Split other workloads across the 4 Renders to reduce per-service usage / free-tier limits.
- "No more failing issues" — remove all hardcoded/dead origin fallbacks.

## What was implemented (branch `arena/01a04ad7-trynext-lifestyle`)
- `functions/gateway-config.ts` (root + artifacts copy): authoritative role map
`PRODUCTION_ORIGINS` (reads = standby-2; primary = filled post-promotion).
## Current provider reality (2026-09-01)

Only the promoted primary and `trynext-api-standby-2` are currently reachable.
The legacy Render service and `trynext-api-standby-3` are suspended, so the
gateway must not list either suspended origin as an active read failover target.

**Why:** A configured-but-suspended origin adds avoidable timeout/failure work and
can make the failover topology look healthier than it is.

**How to apply:** Re-check the Render service inventory before changing
`PRODUCTION_ORIGINS`; add a standby only after its health endpoint is reachable
and it is configured as read-only with schedulers disabled.
- `functions/api/[[path]].ts` (root + artifacts copy): role routing — writes/admin/AI →
  primary only; safe reads → round-robin across read origins with bounded failover +
  15s down-skip; OPTIONS at edge; fail-closed 503 with truthful detail; `/sitemap.xml`
  added to safe reads (SEO fix). No hardcoded Render origin anywhere.
- `artifacts/trynex-storefront/functions/_middleware.ts`: removed stale
  `trynex-api.onrender.com` fallback (serves plain SPA if API_URL unset).
- `artifacts/trynex-storefront/functions/api/gateway.test.ts`: 10 tests, all green.
- `.github/workflows/render-orchestrate.yml` + `tools/render-orchestrate.sh`:
  inventory / promote / deploy / verify via Render API. Needs repo secret
  `RENDER_API_KEY` (user must add it — never commit the key).
- `docs/FOUR_RENDER_MULTI_ROUTE_CONTRACT_2026-08-29.md`, handoff updated.

## Current continuation (2026-09-01)
The fourth Render primary is committed in the gateway and the local API runs with
`runtimeRole:"primary"`. The confirmed public URL is
`https://trynext.pages.dev`; the old custom domain is not a production
route. The latest local release contains the URL/CORS/notification cleanup.

Delivery remains blocked when the protected GitHub secret is present in the project
inventory but unavailable to shell or temporary workflow processes, and this checkout
has no `origin` remote. Do not copy a credential from an attachment or put it in
source. The correct recovery is an authorized GitHub integration or the normal secure
source-control flow, followed by Pages auto-deploy verification.

UptimeRobot is optional alerting and not a runtime dependency. Pages is static, while
the primary Render service is configured to stay available; standby cold starts are
handled by the gateway's bounded read failover.

Never "fix" production by sending writes to a standby or restoring the retired
hardcoded Render fallback. After delivery, verify: `/api/__probe` → 404 JSON from the
primary, `/api/admin/system/health` → 401, `/api/health/liveness` →
`runtimeRole:"primary"`, and public products/sitemap → 200.

## Verify after promotion + deploy
- `POST /api/__probe` (no route) → 404 JSON from primary (proves write path live).
- `GET /api/admin/system/health` → 401 (proves admin reaches primary, not a dead page).
- `GET /api/health/liveness` → `runtimeRole:"primary"`.
- `GET /api/products` and `GET /api/sitemap.xml` → 200 (reads + SEO fixed).
