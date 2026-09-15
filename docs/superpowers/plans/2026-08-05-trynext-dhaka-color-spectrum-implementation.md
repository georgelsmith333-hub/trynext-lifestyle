# Trynext Dhaka Color Spectrum — Implementation Plan

**Approved design:** `docs/superpowers/specs/2026-08-05-trynext-dhaka-color-spectrum-design.md`

## Objective

Implement the approved full-surface enhancement while restoring the working V1
Design Studio as the public experience and preserving all existing commerce,
mockup, API, mobile, deployment, and settings-driven behavior.

## Ordered milestones

### Milestone 0 — Routing safety

- `/design-studio` → V1
- `/design-studio-v1` → V1 compatibility alias
- `/design-studio-v2` → explicit V2 comparison/rollback route
- Verify route imports and typecheck before broader changes.

### Milestone 1 — Storefront reliability and conversion

- Stable image/media geometry and loading states.
- Accessible names and interaction states for small controls.
- Shared mobile fixed-action offsets so sticky cart and WhatsApp never overlap.
- Clear 25% advance-payment and delivery/payment messaging at purchase decisions.
- Safer/dismissible promotion behavior.
- Preserve all product, cart, checkout, referral, and settings contracts.

### Milestone 2 — V1 Studio and mockup confidence

- Keep V1 as public.
- Restore/verify V1 mockups for apparel and curved products.
- Preserve reviewed white/black/color photo behavior, print zones, mug geometry,
  auto-fit, draft restoration, and final/cart/admin payloads.
- Add guided workflow and quality feedback without removing expert controls.

### Milestone 3 — Mobile parity

- Verify/fix mobile checkout keyboard behavior and CTA visibility.
- Align semantic colors, states, touch targets, and design-flow affordances.
- Preserve native safe areas, haptics, dynamic settings, and order asset metadata.

### Milestone 4 — SEO, performance, security, promo, and brand alignment

- Truthful structured data and sitemap freshness.
- Public stats caching and production safety gates.
- Image/font/route performance improvements.
- Consume semantic spectrum tokens in promo and brand-system surfaces.

## Parallel ownership

| Lane | Owns | Must not edit concurrently |
| --- | --- | --- |
| Storefront visual | Home, Products, ProductDetail, Navbar, storefront CSS | Studio/render/mobile/API contracts |
| Storefront actions | WhatsAppButton, StickyAddToCart, SpinWheel | Storefront visual files |
| V1 Studio | DesignStudio.tsx and Studio-only UI | composer/mockups/3D |
| Render fidelity | mockups.tsx, composer.ts, ProductViewer3D.tsx, garment3d.tsx, CartViewer3D.tsx | DesignStudio.tsx |
| Mobile | mobile package/theme, checkout, tabs | shared API spec and web files |
| API/SEO | SEOHead, index metadata, sitemap, publicStats, app security | database schema/OpenAPI |
| Promo/brand | promo and brand-system source | storefront/mobile token consumers |

## Reconciliation order

1. Collect all lane summaries and inspect diffs.
2. Resolve shared semantic token names and route comments.
3. Run storefront, mobile, API, promo, and brand-system typechecks.
4. Build/restart the API if server source changed.
5. Restart all affected workflows.
6. Capture responsive screenshots and inspect browser/workflow logs.
7. Exercise browse → detail → cart → checkout and upload → Studio → preview → cart.
8. Update `AGENT_HANDOFF.md`.
9. Commit and push verified changes using the secure GitHub flow.

## Acceptance gates

- Public `/design-studio` visibly renders V1 and shows reviewed mockups.
- V2 is only reachable through `/design-studio-v2`.
- No existing route, payment, deposit, dynamic settings, draft, or order asset
  behavior is silently removed.
- No icon-only control lacks an accessible name.
- No fixed controls overlap at 360px, 402px, tablet, or desktop widths.
- No image-heavy view visibly shifts when media loads.
- Typechecks/builds/workflows are clean for all changed surfaces.
- No secret values appear in the diff, logs, screenshots, spec, or handoff.