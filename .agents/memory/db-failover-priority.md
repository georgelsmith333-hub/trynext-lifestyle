---
name: DB failover priority fix
description: DATABASE_ANALYTICS promoted above DATABASE_PRODUCTS in the failover chain; analytics is a full mirror with real order data.
---

## Rule
Always keep DATABASE_ANALYTICS before DATABASE_PRODUCTS in the failover chain in `lib/db/src/index.ts`.

## Why
When MAIN + FAILOVER go over quota, the fallback order determines which DB is used. DATABASE_ANALYTICS was discovered to contain 73 real orders, 10 products, 3 reviews (613 rows total) — a full mirror from the last healthy sync of the main DB. DATABASE_PRODUCTS had 10 products but 0 orders. With products first, admin showed all zeros.

## How to apply
The candidate array in `getCandidateUrls()` (lib/db/src/index.ts) must read:
1. DATABASE_URL_MAIN
2. DATABASE_FAILOVER
3. DATABASE_URL_TRYNEXT_DB
4. DATABASE_ANALYTICS  ← promoted (has real order data)
5. DATABASE_PRODUCTS   ← standby (catalog only)
6. DATABASE_URL

After any change to this file, rebuild the api-server (`cd artifacts/api-server && node ./build.mjs`) and restart the workflow.

## Backup sync direction
The backup sync runs FROM the currently active DB TO the other targets. When analytics is active, it will sync to products. When main recovers (quota reset), it will sync main → analytics + products, restoring full data everywhere.
