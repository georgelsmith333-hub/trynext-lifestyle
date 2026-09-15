# Trynext Full-Stack Audit, Mockup Completion, and Operations Overview

## Goal

Produce a verified A-to-Z view of the Trynext commerce system and repair concrete
issues found during the audit. The customer-facing result must keep the existing
commerce, authentication, payment, storage, mobile, admin, and deployment
behavior intact while making the six-product mockup matrix internally
consistent and truthfully documenting the PSD/PSB state.

## Scope

### Mockup release

- Treat the 188-surface six-family matrix as the release contract:
  T-shirt 40, Long Sleeve 50, Hoodie 50, Mug 30, Cap 16, and Water Bottle 2.
- Build a live catalog-color compatibility table. Exact color matches may use
  staged `smart-v9`; ambiguous colors must not silently resolve to another hue.
- Keep reviewed PSD-derived T-shirt bases and the hash-pinned white bottle
  surfaces authoritative where they are more specific than the general release.
- Audit every face, PNG dimensions/format, hash, provenance, public path, and
  missing-face behavior.
- Inspect editable PSD/PSB masters independently from runtime PNGs. Never call a
  raster runtime derivative a Smart Object unless a parser proves an embedded
  Smart Object layer and the round trip is reproducible.

### Full-stack audit

Trace and verify:

- Storefront route loading, lazy chunks, product/category APIs, caching, images,
  cart, checkout, reviews, SEO, and customer account flows.
- API middleware order, CORS/CSRF/rate limits, validation, authentication,
  admin sessions/roles, order creation, notifications, settings, storage, and
  health/readiness.
- Neon/Postgres schema and failover selection, Redis caching/fallback,
  Cloudflare R2/local storage, Cloudflare Pages gateway, Render API, mobile API
  base URL, and background schedulers.
- AI image/chat/fit/reference routes and their provider/fallback behavior.
- Dependency, SAST, and privacy/security findings, with false positives clearly
  separated from actionable defects.

### Report

Generate a PDF containing:

- Executive status and verified date.
- System architecture and request/data flows.
- Product/mockup matrix and PSD/PSB audit results.
- Storefront, API, database, admin, AI, storage, mobile, deployment, and
  security findings.
- Fixes applied and verification evidence.
- Remaining limitations, operator actions, and a prioritized next-step list.

## Non-goals

- No credential extraction or copying.
- No destructive database reset, schema replacement, or production data mutation.
- No payment-provider or deployment migration.
- No claim that unavailable external tooling or unverified production behavior
  has passed.

## Error handling and release gates

- Fail closed on missing mockup faces, unsafe paths, invalid hashes, unsupported
  catalog-color aliases, and unverified Smart Object claims.
- Keep public runtime assets limited to reviewed derivatives; editable masters
  remain outside `public/`.
- Any code or dependency change must pass focused tests, full tests/typechecks,
  build, workflow restart, and endpoint smoke checks.
- The report must distinguish `verified`, `inferred from code`, `not available`,
  and `requires operator action`.

## Verification plan

1. Run local source and matrix audits.
2. Run dependency/SAST/privacy scanners.
3. Run the external website audit if its CLI is available; otherwise record the
   environment limitation.
4. Apply fixes in isolated batches.
5. Re-run all affected tests and builds after each batch.
6. Restart the managed workflow and check logs.
7. Smoke-test public API and static runtime paths through the proxy.
8. Generate and text-extract the PDF to confirm it is readable and complete.