# Trynex Lifestyle Active Production Baseline

**Last reviewed:** 2026-08-16

This document is the current source of truth for the production application. Historical audits remain useful for context, but new implementation work should begin from the active paths below.

## Active application

| Concern | Active path or value |
|---|---|
| Customer storefront | `artifacts/trynex-storefront` |
| Storefront entry | `artifacts/trynex-storefront/src/main.tsx` |
| Storefront routing | `artifacts/trynex-storefront/src/App.tsx` |
| Active design studio | `/design-studio` → `src/pages/studio/DesignStudioV2.tsx` |
| Legacy design studio | `/design-studio-v1` → `src/pages/DesignStudio.tsx` |
| Explicit V2 route | `/design-studio-v2` → `src/pages/studio/DesignStudioV2.tsx` |
| API server | `artifacts/api-server` |
| API entry | `artifacts/api-server/src/index.ts` |
| API health | `/api/healthz`, `/api/health/liveness`, `/api/health/readiness` |
| Shared API/database code | `lib/api-*`, `lib/db` |
| Product/mockup domain model | `artifacts/trynex-storefront/src/pages/design-studio/mockups.tsx` |
| Canvas composition | `artifacts/trynex-storefront/src/pages/design-studio/composer.ts` |

## Deployment model

The storefront is configured as a Vite application and calls the API through the shared API base-url helpers. The API is a separate Node application. Deployment configuration is tracked in `render.yaml` and `wrangler.toml`; before a production release, confirm which provider is currently receiving the deployment and do not assume that every artifact under `artifacts/` is deployed.

The authenticated live admin inspection on 2026-08-16 showed that the deployed application currently reaches the admin panel, but the backup circuit is open because Neon Failover, Neon Secondary, and Analytics have `mockups` schema drift. The live DB Cluster page also incorrectly treated Products DB as a failover candidate and selected it as active. The source now excludes `DATABASE_PRODUCTS` from the transactional failover chain, requires both `products` and `orders` during candidate probing, marks catalog satellites separately, and exposes schema health in the cluster UI.

Backup schema repair is now explicit and additive-only. The authenticated admin Backup page exposes `Repair Schema`, which requires browser confirmation and calls `/api/admin/backup/repair-schemas`. The API will only apply the allowlisted additive patches when `ALLOW_DB_SCHEMA_REPAIR=true`; it never truncates or deletes data. After the repair window, use `Sync Now` to run exact schema verification and a full mirror. Schema mismatches are reported as `blocked` and no longer increment the connectivity/quota circuit breaker.

The live AI Developer page previously showed `Server key required`. The source now enables the Pollinations provider as a free, no-key best-effort route, while retaining configured-key routing for OpenAI, Groq, OpenRouter, Together, and Hugging Face. External provider quotas and availability still require live verification; no provider is described as guaranteed or autonomous.

## Verification commands

Run targeted checks first:

```bash
pnpm --filter @workspace/trynext-storefront typecheck
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/trynext-storefront build
```

Run the full workspace check only after the targeted commands pass:

```bash
pnpm run typecheck
pnpm run build
```

The commands require dependencies to be installed with the committed pnpm lockfile. Local API end-to-end checks also require a safe development database and the required non-production environment variables.

## Current implementation priorities

1. Keep the active `/design-studio` route on V2 while preserving V1 only as a comparison and rollback path.
2. Keep `mockups.tsx` as the shared source of product and print-zone geometry.
3. Consolidate design-studio state and rendering modules gradually; do not duplicate product or print-zone definitions.
4. Keep secrets out of source, reports, generated documents, and commit history. Rotate any credential that has appeared in tracked content.
5. Verify catalog, mockups, cart, checkout, admin, and order retrieval against the actual deployment environment.
6. Treat other storefront artifacts as experimental or archived until explicitly promoted.

## Not yet considered complete

The following require environment or product-owner confirmation rather than blind code changes: final deployment provider, enabling a controlled `ALLOW_DB_SCHEMA_REPAIR=true` window on the API, confirming target Neon credentials and quotas, production payment and order-notification credentials, dark long-sleeve photography, and cleanup or archival of large historical assets. Autonomous self-deployment and self-modifying production behavior are intentionally not enabled; deployment must remain an audited, admin-authorized action with rollback capability.
