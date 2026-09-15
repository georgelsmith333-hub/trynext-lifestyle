# Live Authenticated Findings — 2026-08-16

The authenticated live admin panel is reachable at `https://trynext.pages.dev/admin`.

## Dashboard

The live dashboard reports 89 total orders, 27 pending orders, 70 products, and total revenue of ৳190,514. It also reports Database `ok`, Redis `ok`, R2 Storage `ok`, Telegram `not_configured`, and an AI indicator showing 6.

## Backup page

The live Backup page reports:

- Circuit breaker: OPEN.
- Consecutive failures: 4.
- Last run: approximately 15 minutes ago.
- Automatic backup sync paused for 2 hours.
- Neon Failover: schema mismatch for `mockups`; source has 31 columns and target has 12.
- Neon Secondary: schema mismatch for `mockups`; source has 31 columns and target has 12.
- Products shard: skipped.
- Analytics shard: schema mismatch for `mockups`; source has 31 columns and target has 20.

## DB Cluster page

The live DB Cluster page reports 6/6 healthy nodes and lists the following failover order:

1. Neon Main — online, about 444 ms.
2. Neon Failover — online, about 1230 ms.
3. Analytics DB — online, about 465 ms.
4. Neon Secondary — online, about 352 ms.
5. Products DB — online, about 414 ms, shown as active.
6. Replit Primary — online, about 353 ms.

The page claims this is a shared-schema failover chain, but the Backup page proves the databases currently have incompatible `mockups` schemas. The active database display also appears inconsistent with the documented intended priority because Products DB is shown as active despite being a catalog/product shard.

## Initial code diagnosis

`lib/db/src/index.ts` probes candidates and selects by `orders * 1,000,000 + products * 1,000 + mockups`, so a product-heavy shard can win if order counts are low or missing. `artifacts/api-server/src/lib/dbBackupSync.ts` uses `getActiveDbUrl()` as the backup source and requires exact schema equality before syncing. This creates a production risk: a catalog shard can become the source of truth, and schema drift then blocks every backup target. The safe fix must separate the canonical transactional source from catalog/analytics satellites and must not automatically truncate or migrate live databases without explicit safeguards.

## AI Developer page

The live AI Developer page loads and exposes Trynext Agent v2.0 with OpenAI as the provider, but visibly states `Server key required`. It exposes chat, context, tools, settings, quick actions for bug fixes/API routes/React components/DB queries/store audits/product descriptions/SEO/code review, and says tool calling and store context are active. This indicates the UI is present, but production AI execution depends on an OpenAI server key and the page does not prove that autonomous deployment or self-improvement is enabled. The current repository parser also falls back to Pollinations only when a Pollinations key exists; it does not provide a guaranteed free built-in provider.

## Post-deployment repair attempt

After the production deployment completed, the live Backup page showed the new `Repair Schema` button and the circuit breaker had reset to Closed with 0 failures. The user confirmed the repair operation. The first click reset the browser session to login; after re-authentication, the confirmation dialog was pre-authorized and the repair request was clicked successfully. The UI showed the Sync Now control in a loading state immediately afterward; final target results require a follow-up poll.

## Final live repair result

The authenticated Repair Schema request completed and the UI returned `Schema repair required`: 0/4 targets synced, with Neon Failover, Neon Secondary, and Products shard still blocked by schema mismatches. The circuit remained Closed with 0 failures, confirming the new circuit-breaker behavior correctly distinguishes schema blocks from transport failures. The live DB Cluster route was then opened and was still probing at capture time.

## Corrected live DB Cluster result

The live DB Cluster page now reports 6/6 healthy nodes, 5/5 failover-chain nodes, 1/1 satellite database, and Analytics DB as the active transactional database. Products DB is correctly displayed under Satellite Databases and is no longer part of the failover chain. All failover-chain nodes report `Transactional schema`. This confirms the routing and operator-visibility changes reached production successfully.

## Corrected live AI Developer result

The live AI Developer page now shows `Pollinations AI — Free, no key (best effort)` as the selected provider, with the OpenAI-compatible model available, store context active, live product/order/revenue context loaded, and the developer tools panel present. This verifies that the prior `Server key required` UI state was corrected. Actual upstream inference quality and quota remain best-effort because no paid provider key is configured.

## API deployment gap

The Cloudflare Pages deployment for commit `d8f24b314` completed successfully, but the live AI Developer page still reports the previous Pollinations no-key provider and reproduces `Error: internal_error`. This proves the storefront deployment and API deployment are separate; the backend changes in `artifacts/api-server` have not yet reached the Render API service. The next required action is to deploy the API service, then re-run the AI test.

## Render API deployment and provider correction

The Render API health endpoint reports `status: ok`, `db: ok`, `redis: ok`, and a recent process uptime after the GitHub push, confirming the API auto-deployed from `main`. The live AI Developer page now shows `Trynext Local Agent — Free operational fallback` and `Local Operations Agent — instant`, with store context active. The old Pollinations error remains only as historical chat content; a fresh prompt is required to verify the new local response path.

## AI request diagnosis and final storefront fix

A direct live request initially returned `csrf_blocked` because the shared `getAuthHeaders()` helper did not include `X-Requested-With`. The API CORS/CSRF policy requires that header for cookie-authenticated mutations. The helper was corrected, typechecked, committed as `aee861479`, and pushed. Cloudflare began deployment `4dac839f`; the final live AI smoke test must be rerun after that deployment completes. The backend local agent itself is already deployed and provider discovery is correct.
