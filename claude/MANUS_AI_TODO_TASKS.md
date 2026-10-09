# Manus / Claude automated queue

Updated 2026-10-10 GMT+6. Source main `3ce13d7fb3b45b40e9d820cfc99515bd7744bc1f`.

1. **First — production fallback 502:** read-only obtain exact Pages deployment/bundle and matching sanitized Render evidence; classify then fix locally with regression coverage. No provider configuration change. When deployment is identified, at most one harmless upload/Add-to-Cart test; assert count 1, remove item, stop before checkout.
2. **Second — T7:** enforce allowed order transitions and transactional exactly-once pre-shipped restock + audit; add transition, cancellation, shipped/delivered, concurrency/replay and variant-stock tests. Current status handler direct-updates supplied status; no such test files were found. Preserve current behavior where it is not part of the requested transition graph.
3. **Third — T9:** map store/history/callers/layers/faces/mug modes/draft persistence; implement product-scoped transform restoration only with full T-shirt/hoodie/mug/cap, scale/scaleX/scaleY/position/rotation, face/color/mug, safe-fit and undo/redo coverage. Otherwise leave pending and require owner acceptance.
4. **Fourth — T8 design only:** recreate dry-run documentation, additive nullable key + partial unique index, read-only collision/blank checks, rollback and gates. Never execute migration SQL in this queue.
5. **Fifth — collect evidence:** authorized real-phone flow, sanitized catalog export, Activity Log, Render logs, exact deployment, saved Photopea validator/hash output.

## Verified now

- PR #37 is merged as `ddc68bf5d89f56f59453fd482d1cd666fc8d00e0`; it is a Water Bottle metadata fix; recorded PR checks succeeded. No open PRs or recent remote Claude work.
- Storefront tests 19 files/69 tests pass; API tests 10 files/36 tests pass; workspace typecheck and API/storefront builds pass. Storefront build reports large chunks >500 kB.
- Mockup structural/runtime validator `pnpm run validate:mockups`: 188 surfaces / 1,128 runtime roles accepted. This is not Photopea visual approval. The separate staging matrix command lacks `dist-mockups/staging/smart-v10/manifest.json`. 69/69 is test count, not mockup validation.
- Canonical health/readiness/storage probes are HTTP 200; storage probe checks signing only. `/sw.js` returns JS and `/service-worker.js` HTML; browser registration/caching unverified. Apex/www HTML same hash. `/api/mockups` returned 186 records, not directly comparable to matrix surfaces.

Fail closed: no provider/account/data/schema/catalog/stock/order/payment/customer-message changes, no checkout, no mockup promotion, no Water Bottle ordering, no advertising activation/spend. Ads status unverified. Full current facts: `claude/reports.md`.


## 2026-10-10 02:14 — current queue (supersedes earlier status shorthand)

1. **Storage/CSRF/Add-to-Cart:** implement local/mocked regression coverage and fix missing `X-Requested-With` on cookie-authenticated Studio mutations; add `WHEN_REQUIRED` S3/R2 checksum options, a bounded expiring grant that binds upload type/size, a genuine API upload fallback, safe timeout/type/magic-byte/size/key checks, sanitized safe 502 errors, and a persistent readable truthful retry state. Do not change provider settings. Request read-only Pages deployment identity + matching sanitized Render log; no live upload until source identity is known. If external evidence access is unavailable, continue local safe work.
2. **T7 order safeguards:** inspect/update both `orders.ts` and `aiExecute.ts` status/undo paths. Enforce exact transition graph, atomic exactly-once reserved variant stock restoration + audit for pre-shipped cancellation, no cancellation/restock after shipping/delivery, and route tests for every transition/replay/concurrency/audit case.
3. **Smart Mockup gate:** preserve the **live** 94 accepted / 94 candidate split, reconcile it with current main's 188-candidate rows and the public 186-row API, and update code so every candidate is fail-closed per surface (not just aggregate `status=accepted`). Restore missing staging matrix input. Gather saved visual/hash proof; do not promote candidates or open Water Bottle ordering without required separate evidence/approval.
4. **T9:** implement transform memory only with T-shirt/hoodie/mug/cap round-trip tests across x/y, scale/scaleX/scaleY/rotation, face, color/mug mode, safe print-zone fitting and undo/redo. Otherwise record pending.
5. **T8:** write/restore `docs/IDEMPOTENCY_KEY_MIGRATION_DRY_RUN.md` with nullable column, partial unique index design, read-only collision/blank queries, rollback, replay/conflict tests and gates. Do not execute SQL or alter production schema/data.
6. **Evidence collection:** only after source parity: one harmless upload/cart test maximum; count 1/remove/stop before checkout. Separately collect real-phone flow, sanitized authorized catalog export, Activity Log, Render/deployment evidence, saved Photopea validator/hash output and ad-account/campaign facts. Ads stay inactive/unspent.

**Baseline truth:** `origin/main=3ce13d7fb3b45b40e9d820cfc99515bd7744bc1f`; zero open PRs or remote Claude branch. #37 is Water Bottle metadata, #40 is performance, not the supplied upload/T7 PR. Live public role manifest is 94 accepted/94 candidate; no deployment commit proof. Full exact evidence in `claude/reports.md`.