# Trynext Lifestyle Commerce and Mockup Reliability

## Goal

Finish the visible Trynext Lifestyle branding pass and make the customer purchase
journey reliable across the web storefront, mobile app, API order creation, payment
evidence submission, and confirmation messaging. In the same pass, correct the
shared Design Studio renderer so product switching, color changes, placement, and
curved-product previews remain visually coherent without weakening the staged
Smart Object release gate.

## Scope

- Treat bKash, Nagad, and uPay as one canonical wallet contract. The selected
  wallet owns the displayed merchant number, payable amount, validation, and
  payment-info payload.
- Align supported payment methods between web, mobile, and the API while retaining
  the 25% advance policy and server-authoritative stock, prices, shipping, and
  promotions.
- Keep order creation idempotent from the customer’s point of view, prevent
  duplicate submits, preserve retryable failures, and keep studio originals and
  order tracking metadata.
- Make web, mobile, email, and automatic order greetings reflect the actual order
  number, payment method, total, amount due, and remaining balance.
- Complete visible Trynext Lifestyle branding in UI, metadata, favicon, manifest,
  and transactional templates without renaming technical identifiers or
  infrastructure references.
- Audit the shared mockup resolver, SVG/Canvas compositor, product-switch auto-fit,
  curved product zones, and color/tint classification using representative
  artwork on every product family and multiple supported colors.
- Keep reviewed runtime assets and the Smart Object candidate manifest
  fail-closed; no partial or unreviewed surface promotion.

## Architecture

The API remains the authority for order validity, catalog prices, shipping,
discounts, stock, and persisted payment state. The web and mobile clients use a
shared semantic payment mapping and settings keys, but never trust client totals.
Payment evidence is submitted only after an order reference exists.

The Design Studio continues to use the existing canonical mockup resolver for
photo/cutout selection, the shared print-zone contract for placement and clipping,
and the existing browser compositor for 2D, 3D, export, cart snapshots, and
checkout thumbnails. Exact source-kit photos are never tinted; curated transparent
fallbacks may be tinted only when explicitly marked by the resolver. Color changes
must preserve alpha, and product switching must re-fit layers to the new product’s
zone.

## Experience and safety

Payment screens will show one unambiguous merchant destination for the selected
method and will never silently substitute a different wallet’s number. Missing
configuration is an actionable error with a safe alternate path. Confirmation
states are animated but usable under reduced motion and do not depend on animation
for order persistence or tracking.

Mockup fixes will be made in shared code where possible. Representative runtime
checks will cover T-shirt, long sleeve, hoodie, mug, cap, and bottle, including
light, dark, and colored states, front/back where supported, custom artwork, and
product switching. Structural Smart Object validators remain unchanged and
production promotion remains blocked until visual/runtime evidence passes.

## Verification

- Search for stale branding, hardcoded payment values, and mismatched payment
  fields across web, mobile, API, templates, and metadata.
- Run focused storefront/API tests and typechecks, then the full workspace
  typecheck and storefront production build.
- Run the canonical mockup matrix and Smart Object validators.
- Restart the managed workflow once after the coordinated code changes and inspect
  logs and proxied health/products/settings/order validation responses.
- Exercise representative checkout payloads and payment-info payloads without
  creating test orders in production data.
- Inspect the regenerated overview PDF and update the durable handoff.