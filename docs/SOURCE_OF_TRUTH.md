# Trynext Lifestyle — Production Source of Truth

**Last reconciled:** 2026-09-01

This document defines the production path for Trynext Lifestyle. It must be updated when deployment, routing, authentication, database, or storefront ownership changes.

## Active production architecture

| Concern | Production source of truth | Status and evidence |
|---|---|---|
| Public storefront | `artifacts/trynex-storefront/` | **ACTIVE**. Vite + React storefront and admin panel. |
| Storefront route entry | `artifacts/trynex-storefront/src/main.tsx` and `src/App.tsx` | **ACTIVE**. `/design-studio` is the public V1 studio; V2 remains an explicit comparison/rollback route. |
| Active design studio | `src/pages/studio/DesignStudioV2.tsx` | **ACTIVE / parity incomplete**. Production route is `/design-studio`; `/design-studio-v2` is explicit comparison. |
| Legacy design studio | `src/pages/DesignStudio.tsx` | **LEGACY / PRESERVED**. `/design-studio-v1` remains available until parity is evidenced. |
| Shared product geometry | `src/pages/design-studio/mockups.tsx` | **SHARED**. Product families and print zones must not be duplicated. |
| Canvas composition | `src/pages/design-studio/composer.ts` | **SHARED**. Used for export, textures, mockups, and cart representations. |
| 3D preview | `src/components/garment3d.tsx` and studio viewer components | **ACTIVE** for curved products; must remain consistent with print-zone geometry. |
| Backend API | `artifacts/api-server/` | **ACTIVE** Express API compiled with esbuild. |
| API entry/build | `artifacts/api-server/src/index.ts`; `node ./build.mjs` | **ACTIVE**. API source changes require a rebuild before runtime verification. |
| API production service | Render service `trynext-lifestyle-main-render` at `https://trynex-lifestyle-main-render.onrender.com` | **ACTIVE PRIMARY**. Sole write authority for checkout, admin, auth, AI, and scheduled work. |
| API proxy | `functions/api/[[path]].ts` | **ACTIVE** Cloudflare Pages Function forwarding `/api/*` to the Render API through `API_URL`. |
| Pages project | `trynext-lifestyle-shop` at `https://trynext.pages.dev` | **ACTIVE** Cloudflare Pages project and canonical customer URL. |
| Pages configuration | `wrangler.toml` | **ACTIVE**. Build is rooted at `artifacts/trynex-storefront`; proxy target remains a Pages environment setting. |
| Database schema | `lib/db/src/schema/index.ts` and `lib/db/migrations/` | **ACTIVE** Drizzle/PostgreSQL schema and migrations. |
| Transactional DB routing | `lib/db/src/index.ts` | **ACTIVE / hardened**. Catalog-only Products shards are excluded from transactional failover candidates. |
| Backup/sync | `artifacts/api-server/src/lib/dbBackupSync.ts` and `routes/backup.ts` | **ACTIVE / guarded**. Schema repair is additive-only and requires an explicit environment flag. |
| Cache | Upstash Redis | **CONFIGURED / runtime evidence required**. |
| Object storage | Cloudflare R2 through the storage service | **CONFIGURED / runtime evidence required**. |
| Authentication | Stateful admin sessions plus customer authentication | **ACTIVE**. Cookie mutations require CSRF protection; bearer access remains supported. |
| Admin AI | `artifacts/api-server/src/routes/ai.ts` and `aiExecute.ts` | **ACTIVE / best effort**. Local operational fallback is available; external provider quality and quotas are not guaranteed without configured keys. |
| Notifications | Telegram integration and settings-backed chat destination | **PARTIAL**. Runtime configuration must be verified before claiming order notification completeness. |
| Mobile | `artifacts/trynext-mobile/` | **MOBILE / separate surface**. Not the production web source of truth. |
| Other artifacts | `trynext-atelier-commerce`, `trynext-brand-system`, `trynext-promo`, `trynext-studio-design-system`, `mockup-sandbox` | **EXPERIMENTAL, SHARED, or ARCHIVED pending usage evidence**. They must not receive production fixes accidentally. |

## Release path

```text
GitHub main
  -> Cloudflare Pages build for trynext-lifestyle-shop
  -> Pages Function /api proxy
  -> Render trynext-api service
  -> Neon/PostgreSQL + Redis + R2 + optional Telegram/AI providers
```

The safe release sequence is targeted checks, production build, preview deployment, browser QA, smoke tests, production deployment, and rollback verification. A successful GitHub push alone is not proof that both Cloudflare Pages and Render have deployed the same commit.

## Runtime health endpoints

The meaningful API endpoints are `/api/healthz`, `/api/health/liveness`, `/api/health/readiness`, and the authenticated admin system-health routes. Render's blueprint currently declares `/health`, which is inconsistent with the active `/api/*` health route family and must be reconciled before treating infrastructure health checks as authoritative.

## Explicit non-claims

The platform does not currently claim autonomous self-modifying production behavior, unsupervised self-deployment, guaranteed free AI inference, or verified Facebook/marketplace order ingestion. Those capabilities require audited workflows, provider credentials, webhooks, permissions, retries, idempotency, and live evidence.

## Required secret names only

Secrets must remain in the deployment provider's secret manager. Documentation may reference names such as `DATABASE_URL`, `ALLOW_DB_SCHEMA_REPAIR`, `RENDER_API_KEY`, `CLOUDFLARE_API_TOKEN`, `TELEGRAM_BOT_TOKEN`, and provider-specific AI keys, but must never contain their values.
