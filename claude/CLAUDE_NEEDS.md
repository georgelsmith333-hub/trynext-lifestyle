# Claude needs — release blockers

Updated 2026-10-10 GMT+6. Source main `3ce13d7fb3b45b40e9d820cfc99515bd7744bc1f`.

## Priority work

1. **Production Studio upload/Add-to-Cart blocker:** acquire read-only deployment ID/bundle and matching sanitized Render log, classify the reported 502, and fix code with regression coverage. No provider-setting changes. Only after identity is established, at most one harmless live upload/Add-to-Cart; verify count 1, remove item, stop before checkout.
2. **T7:** current order status handler accepts supplied status without enforcing the transition graph; no transition/restock/variant-stock tests found. Implement a focused, transaction-safe fix and tests before opening this gate.
3. **T9:** product transform persistence remains absent. Finish the state/call-site map and implement only with the full T-shirt/hoodie/mug/cap, transform, safe print-zone fit, product state, undo/redo test matrix; otherwise owner-accepted deferment.
4. **T8:** migration dry-run doc is absent. Restore the documented nullable key + partial unique index, read-only collision/blank checks, rollback and release gates. Do not run SQL under this task.
5. **Evidence collection:** real phone flow, sanitized catalog export, Admin Activity Log, Render logs, deployment identity, Photopea validator/hash evidence. Only use authorized read-only access.

## Verified results

- PR #37 merged as `ddc68bf5d89f56f59453fd482d1cd666fc8d00e0` (Water Bottle stale-metadata fix); Active app verification, CI/build, security, Pages checks passed. It is not the described upload/T7 work. No open PRs or recent Claude branch/commit on remote.
- Full local tests: storefront 19 files/69 tests pass; API 10 files/36 tests pass. `pnpm run typecheck`, API build and storefront build pass; storefront build warns of >500kB chunks.
- `pnpm run validate:mockups` passes **188 surfaces / 1,128 runtime roles** with status accepted (structural/runtime/checksum validation, not visual approval). `pnpm run mockups:validate-matrix` cannot run because staging manifest `dist-mockups/staging/smart-v10/manifest.json` is absent. Keep all candidate visual approval fail-closed. **69/69 refers to storefront tests, not mockup validation.**
- Canonical liveness/readiness/storage endpoints returned 200; storage health is signing only, not actual PUT. `/sw.js` is JS; `/service-worker.js` is HTML; browser caching behavior unverified. Apex and www homepage HTML match. Public mockups API returned 186 records, not directly comparable to the 188-surface manifest.

## Release restrictions

No deployment identity, matching production log, live Add-to-Cart test, admin export/log, real phone, or campaign status has been proven. No orders/payments/messages, checkout, provider/account settings, data/schema/catalog/stock mutation, mockup promotion or ad spend. Keep Water Bottle ordering blocked. Ads remain inactive/unverified. Full evidence and current next steps are in `claude/reports.md`.


## Comprehensive status correction — 2026-10-10 02:14 GMT+6

**Still NOT READY.** `origin/main` remains `3ce13d7fb3b45b40e9d820cfc99515bd7744bc1f`; no open PRs or remote Claude branch. PR #37 is a merged Water Bottle metadata fix; #40 is a merged non-Home bundle performance change. Neither is the supplied upload/T7 work. Local docs-only commit `984f092` is one commit ahead of remote; it is not a code fix.

### New verified blockers (use this section over older shorthand)

1. **Production/source identity mismatch:** public production manifest is `accepted`, 188 surfaces, **94 accepted / 94 candidate**. `origin/main` role manifest is aggregate `accepted` but row-level **188 candidates**. Public production HTML has build stamps `20261009191442`/`...43` and different asset hashes from the current `origin/main` local build. Exact Pages deployment commit/bundle remains unverified. Do not claim parity. Source server renderer checks aggregate status/count, not each row; resolver marks a surface approved when role assets exist. Add fail-closed per-row gating and tests before calling candidates excluded. Production water-bottle rows are labelled accepted, but required saved proof/separate approval is absent; keep ordering blocked.
2. **Studio request headers:** cookie-auth CSRF enforcement requires `X-Requested-With`. Upload preparation, remove-bg, AI reference and server-render POST callers omit it in current source. Add caller regression tests.
3. **Storage/Add-to-Cart:** no checksum `WHEN_REQUIRED` options, expiring signed upload grant binding actual type/size, or R2/S3 API fallback. Local direct upload is not that fallback. Errors do not meet safe 502/redacted-log/timeout requirements. Add-to-Cart error toast is truthful but ephemeral/non-retryable. The prior live 502 is not newly reproduced; do not test until exact deployment is identified.
4. **T7:** order-status route and AI execute/undo writers bypass the allowed graph; status audit is outside the transaction; pre-shipped cancellation does not restore reserved variant stock once. No T7 route tests.
5. **T8/T9:** no idempotency dry-run doc; DB backup-sync has only an additive key-column patch, no partial unique/replay implementation. T9 lacks per-product transform memory/full matrix.
6. **Other gates:** current public APIs return 70 catalog products/seven categories and 186 mockup rows; health/readiness/storage are 200 (DB/catalog true, R2 signing reachable) but backupSyncEnabled is false and signing is not PUT proof. Real-phone/admin export/Activity Log/Render/deployment/Photopea/ad campaign evidence is not available. `pages.dev` does not resolve. `/sw.js` and `/manifest.json` are the configured good endpoints; runtime browser caching remains unverified.

### Required work order (local safe work first; no owner choices needed)

1. Storage/CSRF + truthful persistent retryable cart errors: create mock tests and implement safe fallback/checksum/grant/size/type/timeout/redacted 502 path. Obtain deployment ID + matching sanitized Render log before any live upload. No provider config changes.
2. T7 across all status and undo writers: graph, transactionally atomic exactly-once pre-shipped variant restock + audit; route tests for transitions/replays/concurrency.
3. Enforce Smart Mockup accepted-row allowlist; reconcile prod/main manifests; restore staging matrix inputs; collect saved visual/hash proof. Keep bottle ordering blocked.
4. T9 full product round-trip/history/print-zone matrix or leave pending.
5. T8 documentation and read-only dry-run plan only; no SQL.
6. Then collect real-phone, sanitized admin/export/log/deployment/Photopea/ad status evidence. Keep ads inactive/unspent and stop before checkout.

Detailed proof and source paths are in `claude/reports.md`. Prior reports stating production has 188 candidates referred to the **local main manifest**, not the live 94/94 manifest; treat source and production as mismatched until deployment provenance is reconciled.