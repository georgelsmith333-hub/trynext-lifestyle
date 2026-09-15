---
name: Trynext API routes, ports, DB config
description: Health route path, port layout, DB failover config, autoSeed fix
---

## Health endpoint
- Route is `/api/healthz` (NOT `/api/health`). Returns `{"status":"ok","db":"ok"}`.
- `/api/health/storage` and `/api/health/auth` also exist on the health router.

## Port layout
- API server: PORT=8082 (set in workflow command `PORT=8082 NODE_ENV=development node ./dist/index.mjs`)
- Storefront Vite dev: PORT=8080
- `API_PORT` env var in Replit = 8080 (used by Vite proxy config, but Replit's own proxy handles /api/* routing to 8082 directly — Vite proxy irrelevant in Replit env)

## DB failover state (as of 2026-06-29)
- DATABASE_URL_MAIN (ep-proud-hill) = QUOTA EXCEEDED — do not use
- DATABASE_FAILOVER (ep-crimson-dawn-apycvzvv.c-7.us-east-1.aws.neon.tech) = ACTIVE
- DB priority order in lib/db/src/index.ts: DATABASE_URL_MAIN → DATABASE_FAILOVER → DATABASE_URL_TRYNEXT_DB → DATABASE_URL
- `dbReady` promise exported from lib/db/src/index.ts — must be awaited before any DB operations at module load time

## migrateOrdersTable race condition fix
- In artifacts/api-server/src/routes/orders.ts: migrateOrdersTable() must be wrapped in dbReady import (not called bare at module load)
- Fixed: `import("@workspace/db").then(({ dbReady }) => dbReady).then(() => migrateOrdersTable()).catch(() => {});`

## Missing tables
- `notifications` and `mockups` tables were absent from DATABASE_FAILOVER — created manually with SQL matching schema/index.ts definitions.

## Seeded data (DATABASE_FAILOVER)
- 9 products, 5 categories, 20 blog posts, 8 testimonials, 5 promo codes, 3 hampers, 15 settings

## GitHub
- Repo: georgelsmith333-hub/trynext-lifestyle (main branch)
- Push method: GitHub REST API (blobs→tree→commit→PATCH ref) — git CLI blocked by Replit askpass
- Latest commit: cf8d030c38c4
