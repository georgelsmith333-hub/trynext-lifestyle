---
name: Neon quota + Cloudflare token status
description: Neon MAIN + FAILOVER are over quota; system auto-runs on PRODUCTS DB; Cloudflare API tokens all expired (401).
---

## Neon DB quota situation (as of 2026-07-26)

- **DATABASE_URL_MAIN** (ep-proud-hill, c-5): exceeded *data transfer* quota — returns error on connect
- **DATABASE_FAILOVER** (ep-crimson-dawn, c-7): exceeded *compute time* quota — returns error on connect
- **DATABASE_PRODUCTS** (ep-crimson-mud, c-7): 21 tables incl. `_migrations` — **active fallback, all queries land here**
- **DATABASE_ANALYTICS** (ep-cool-mountain, c-7): 20 tables (no `_migrations`) — 5th candidate, schema valid; `_migrations` will be created on first activation by `runMigrations()`
- System auto-fails over every 60 s via reprobe timer in `lib/db/src/index.ts`; will promote MAIN back automatically when quota resets

**Why:** Free-tier Neon quota exceeded. User must upgrade plans or wait for monthly reset on both accounts (georgelsmith333@gmail.com = MAIN, improvewithamit@gmail.com = FAILOVER).

## Cloudflare API tokens

All tokens stored in secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_API_TOKEN_V2, CLOUDFLARE_KEYS_TOKEN) return HTTP 401 (invalid/expired).
- Cloudflare Pages auto-deploys from GitHub (git-connected) — our GitHub push triggers CF Pages automatically
- Admin deploy page cannot query CF status until a valid token is set
- To fix: generate new token at dash.cloudflare.com → Profile → API Tokens → Create Token (use "Edit Cloudflare Pages" template)

## What IS working

- API: db=ok (PRODUCTS), redis=ok (Upstash), storage=r2 (Cloudflare R2)
- GitHub push: `NEW_GITHUB_PERSONAL_ACCESS_TOKEN` works; remote updated; push successful
- Render deploy: srv-d7b774mdqaus73carp70 (trynex-api.onrender.com) — triggered successfully
- deployment.ts token fallback chain now starts with `NEW_GITHUB_PERSONAL_ACCESS_TOKEN`

## Re-checked 2026-07-28

Same shape, still true: MAIN (data-transfer quota) and FAILOVER (compute-time quota) both still erroring on connect — this is a Neon billing-tier limit, not something fixable from app code. PRODUCTS and ANALYTICS are both healthy, both have 21 tables, and are confirmed in sync with each other (73 orders / 40 customers, same last-order timestamp on both). No action possible without the account owner upgrading a Neon plan or waiting for the monthly quota reset.
