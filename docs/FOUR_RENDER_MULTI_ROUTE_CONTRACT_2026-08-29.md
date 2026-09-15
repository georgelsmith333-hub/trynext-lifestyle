# Trynext 4-Render Multi-Route Contract

**Date:** 2026-08-29
**Status:** gateway code merged and live (`main` = `2985b5d`, PR #55). **Promotion is
NOT done:** `PRODUCTION_ORIGINS.primary` is still empty, so writes/admin/AI fail closed
with 503 by design. See "Promoting the 4th service — current state and runbook" for the
three owner paths (A: CI orchestrator, B: Render dashboard, C: interim restore).

## Topology

| Slot | Render service | Role env | Workload | Notes |
|---|---|---|---|---|
| PRIMARY (new) | 4th Render service (discovered by `tools/render-orchestrate.sh`) | `TRYNEXT_RUNTIME_ROLE=primary` | ALL mutations: checkout/orders, admin (login, settings, products), auth, AI generate, scheduler owner | Sole write authority; gateway NEVER replays mutations |
| READ-1 | `trynext-api-standby-2` | `standby` | Safe public reads: products, categories, mockups, public-stats, blog, testimonials, settings, health, sitemap.xml | Round-robin; server-side rejects writes (`standby_read_only`) |
| READ-2 | `trynext-api-standby-3` | `dr` | Same safe public reads | Round-robin; server-side rejects writes |
| RETIRED | `trynext-api` (Render 1) | old `primary` | — | Suspended by Render (5GB bandwidth allowance). NOT routed to. Re-add to reads ONLY after restored + re-roled standby + verified |

Legacy `trynex-api.onrender.com` is no longer referenced by any production code
or gateway default — see the fixed stale claims below.

## Gateway routing (`functions/api/[[path]].ts` + `functions/gateway-config.ts`)

- **Writes / admin / auth / AI** → PRIMARY only (first configured primary origin).
  No replay after ambiguous timeout; idempotency keys preserved.
- **Safe public reads** → READ origins in round-robin (load splitting), bounded
  failover on 502/503/504/network errors, 15s down-skip after 2 consecutive
  failures, primary is the LAST read candidate only if all reads fail.
- **OPTIONS** answered at the edge. Cookies stripped for anonymous safe reads;
  Authorization-bearing requests stay pinned to primary.
- **Fail closed:** if a role has no origin (config empty and no env override),
  the gateway returns 503 JSON with a truthful `detail` — never a hardcoded
  Render host.
- **Sitemap is a safe read** — `/api/sitemap.xml` no longer lands on a dead
  primary (fixes the SEO regression found 2026-08-29).

### Origin precedence

1. `API_PRIMARY_ORIGIN` / `API_READ_ORIGINS` (CF Pages env, optional overrides)
2. Committed `PRODUCTION_ORIGINS` in `functions/gateway-config.ts` (authoritative default)
3. Legacy `API_ORIGINS` (reads only — writes never fall back to it, because the
   legacy list historically contained the suspended service)

## Promoting the 4th service — current state and runbook

**Status as of 2026-08-29 (after PR #55 merged as `2985b5d`):** the gateway code is
live, but `PRODUCTION_ORIGINS.primary` is still empty and `API_PRIMARY_ORIGIN` is not
set in Cloudflare Pages, so every write/admin/auth/AI route answers the fail-closed
JSON 503 (`detail: "No primary API origin configured"`). That is the intended safety
behaviour — it replaced the old "silently pin traffic to the suspended host" bug —
but it means **checkout, admin login and AI generation stay down until the primary
is wired**. Reads and `/sitemap.xml` are healthy.

### Why the promotion cannot be run from the agent sandbox

- The sandbox only reaches `api.github.com`. `api.render.com`, `*.onrender.com` and
  Cloudflare are network-blocked (`curl` fails at TLS), so no Render API call can be
  made locally — that is why the tool is driven by a GitHub Actions runner.
- The agent's GitHub App identity cannot write `.github/workflows/**`
  (`refusing to allow a GitHub App to create or update workflow ... without
  `workflows` permission`), is refused by the Contents API (403), and cannot list
  Actions secrets (403). The workflow is therefore versioned at
  `tools/ci/render-orchestrate.workflow.yml` and installed by the owner.
- Whether the `RENDER_API_KEY` secret exists is not observable from the agent side;
  the workflow's first step reports it explicitly instead of failing opaquely.

### Path A — CI-orchestrated promotion (recommended: auditable, no manual env edits)

1. Owner: **Settings → Secrets and variables → Actions → New repository secret**
   `RENDER_API_KEY` = a Render API key for the workspace that owns the Trynext
   services (never pasted into chat, source, or logs).
2. Owner: create `.github/workflows/render-orchestrate.yml` by pasting the body of
   `tools/ci/render-orchestrate.workflow.yml` (Add file → Commit directly).
3. Agent: run the workflow with **`apply=false`** (inventory). Confirm from the log
   that a 4th Trynext service actually exists and record `id`, `name`, `url`, plan and
   `lastDeploy`. If it does not exist, stop — creating services from CI is out of
   scope for this tool.
4. Agent: re-run with **`apply=true`** and `target=<4th service id>` so the target is
   explicit instead of "newest service". The tool copies env from `trynext-api`
   (a suspended service still keeps readable env), forces
   `TRYNEXT_RUNTIME_ROLE=primary`, mirrors `SCHEDULER_ENABLED`, forces
   `BACKUP_SYNC_ENABLED=false`, deploys `main`, waits for `live`, and probes
   readiness + sitemap.
5. Agent: put the reported primary URL into `PRODUCTION_ORIGINS.primary` in **both**
   `functions/gateway-config.ts` and `artifacts/trynex-storefront/functions/gateway-config.ts`,
   PR, merge (Pages auto-deploys from `main`), then run the checklist below.

Bandwidth caveat: a 4th service inside the **same** Render workspace does **not** add
a second 5 GB allowance (see `docs/RESOURCE_QUOTA_AUDIT_2026-08-20.md` §Quota model).
Confirm in the inventory which workspace the target lives in before expecting relief.

### Path B — Dashboard-driven promotion (no API key, no CI change)

1. Owner, in the Render dashboard: create the 4th web service from
   `georgelsmith333-hub/trynext-lifestyle` (same build/start command, root dir, region
   and plan as `trynext-api-standby-2`), and copy its environment from the old
   `trynext-api` (Render "Copy from" / manual paste).
2. Owner sets exactly: `TRYNEXT_RUNTIME_ROLE=primary`, `SCHEDULER_ENABLED=true`,
   `BACKUP_SYNC_ENABLED=false`, then deploys `main` and waits for `Live`.
3. Owner gives the agent the **public URL** of that service (a URL is not a secret).
4. Agent commits it into both `gateway-config.ts` copies, PR, merge, verify.

Safety rule for both paths: **exactly one** service may ever hold
`TRYNEXT_RUNTIME_ROLE=primary` (or unset, which defaults to primary) while it is
reachable — two primaries would run two schedulers and two backup-sync writers
against the same Neon topology. `trynext-api` must remain suspended or be re-roled to
`standby` before the new primary goes live.

### Path C — interim write restore while the promotion finishes

Owner unsuspends/restores `trynext-api` in Render and sets
`API_PRIMARY_ORIGIN=https://trynex-api.onrender.com` in Cloudflare Pages
environment (dashboard only, no deploy). Reads keep using the standbys, and writes
come back within minutes. Remove that variable once the 4th service is promoted.

## Verification checklist after the primary is wired

Via `https://trynext.pages.dev`:

- `GET /api/health/liveness` → 200 with `runtimeRole:"primary"` when it lands on the
  primary, or `"standby"`/`"dr"` when it lands on a read origin (both correct).
- `GET /api/admin/system/health` → **401/403 JSON**, never
  `503 "No primary API origin configured"` and never Render's suspended page.
- `POST /api/orders` with an empty body → 4xx validation JSON from the API
  (proves mutations reach a writer and are not replayed).
- `GET /api/products`, `GET /api/public-stats`, `GET /sitemap.xml` → 200.
- Response headers `X-Trynext-Origin` and `X-Trynext-Route` name the origin and the
  route class actually used (`read` may round-robin between standby-2/3).

## Rollback

Comment out `PRODUCTION_ORIGINS.primary` (and clear `API_PRIMARY_ORIGIN`): the
gateway fails closed for writes and keeps serving reads. There is no dead-host
fallback to roll back to, by design.

## Stale claims fixed on 2026-08-29

- `CRITICAL_FINDINGS.md` claimed the hardcoded Render fallback was removed.
  It was still present in `functions/api/[[path]].ts` (default origin) and
  `_middleware.ts` (line ~272). Both are now removed; the gateway fails closed.
- `docs/THREE_RENDER_*` is superseded by this contract.

## Safety invariants (unchanged from the three-render contract)

- Standby/DR services reject mutations server-side (`standby_read_only`).
- No mutation is ever replayed to a standby.
- Schedulers/backup sync stay disabled on standbys.
- No secrets in GitHub/source/this doc — only public URLs and env keys.
