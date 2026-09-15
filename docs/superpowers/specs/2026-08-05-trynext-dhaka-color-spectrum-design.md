# Trynext Dhaka Color Spectrum — Full-Surface Premium Experience

**Date:** 2026-08-05  
**Status:** Approved for implementation  
**Owner decision:** Approved visual direction and implementation contract

## 1. Purpose

Turn Trynext Lifestyle into a polished, colorful, trustworthy Bangladesh-focused
custom-printing experience across the storefront, Design Studio, mockup previews,
mobile app, API-backed trust surfaces, promo experience, and brand-system
artifact—without replacing working product behavior.

The target is not a cosmetic reskin. Every visible control must work, every
state must be understandable, and every surface must respond cleanly across
desktop, tablet, small phones, keyboard navigation, touch, reduced motion, slow
network, partial API data, and recovery flows.

## 2. Current constraints and decisions

### 2.1 Canonical web artifact

`artifacts/trynex-storefront` is the existing customer storefront and admin
artifact. It already owns the root preview path (`/`) and a managed web
workflow. A second React/Vite artifact must not be created for the same product.
The artifact registry currently reports no entries even though the storefront
manifest and workflow exist; registration/presentation must be repaired or
reconciled after implementation rather than duplicating the app.

### 2.2 Public Design Studio route

The approved public entry is `/design-studio` and must resolve to the working V1
implementation because V1 contains the reviewed mockup and quality-gate
behavior. `/design-studio-v1` remains an explicit compatibility alias, while
`/design-studio-v2` is the addressable V2 comparison/rollback route. V2 must not
silently replace the public path until its feature matrix, mockup rendering,
quality checks, and draft payload compatibility are verified.

### 2.3 Existing behavior is authoritative

The following are contract-level behavior and must remain intact:

- Storefront routes, cart, wishlist, checkout, referral capture, and settings
  driven customer-facing values.
- COD and online payment behavior, including the 25% advance deposit rule.
- Dynamic WhatsApp/customer contact, shipping, free-shipping, and payment
  settings.
- Existing authentication, admin sessions, CSRF, rate limiting, database
  failover, backup synchronization, object storage, and API contracts.
- Design draft autosave/cloud restoration and original design assets through
  cart, checkout, and admin.
- Product-switch auto-fit to the target print zone.
- Precise 2D editing and realistic 3D/final composition.
- Curved-product 3D defaults, mug side/wrap geometry, and reviewed
  white/black/colored photo-mockup behavior.
- Mobile safe areas, haptics, dynamic settings, inline checkout validation, and
  keyboard-aware checkout behavior.

## 3. Experience principles

1. **Color communicates.** Orange means action, indigo means navigation and
   confidence, teal means delivery/service, Bangladesh green means trust and
   payment, violet/pink means creative Studio moments, and warm neutrals carry
   content.
2. **One action, one obvious result.** Buttons, icon buttons, swatches, tabs,
   filters, carousels, dialogs, and floating actions must expose their state and
   result.
3. **Confidence before commitment.** Show price, deposit, delivery, print-zone
   safety, quality, payment, and support information at the moment a customer
   decides.
4. **Responsive by composition, not shrinkage.** Desktop, tablet, and phone
   layouts use intentional control grouping and touch-safe spacing.
5. **Premium means calm.** Use controlled gradients and motion, stable image
   geometry, whitespace, clear hierarchy, and restrained shadows instead of
   decoration everywhere.
6. **Truthful trust.** Ratings, review totals, statistics, availability, and
   marketing claims must come from real data or be clearly labeled as examples.
7. **Recoverable.** Loading, empty, error, retry, offline/partial data, save,
   restore, and success states are first-class UI.

## 4. Dhaka Color Spectrum design system

### 4.1 Semantic palette

The implementation must introduce semantic tokens rather than scattering raw
hex values across JSX or styles:

| Role | Direction | Use |
| --- | --- | --- |
| `surface.canvas` | warm white | page background and Studio canvas |
| `surface.card` | white | product cards, panels, dialogs |
| `ink.strong` | deep warm ink | headings and primary text |
| `ink.muted` | warm gray | supporting copy and metadata |
| `action.primary` | Trynext orange | primary purchase/create actions |
| `action.secondary` | indigo | navigation, secondary emphasis |
| `trust.success` | Bangladesh green | verified payment, saved, available |
| `service.delivery` | teal | shipping, delivery, support |
| `creative.violet` | violet | Studio tools and creative state |
| `creative.pink` | pink/coral | playful accents and delight moments |
| `feedback.warning` | amber | print quality and attention states |
| `feedback.danger` | red | validation and destructive states |

Exact values must preserve readable contrast in light and dark contexts. Existing
runtime branding overrides remain supported; runtime branding may change the
primary action hue but may not remove semantic status colors or break contrast.

### 4.2 Shared primitives

Create or consolidate small, composable primitives where the current app already
has duplication:

- `SpectrumButton` / button variants
- icon button with required accessible label and optional tooltip
- status badge and semantic chip
- segmented tab and swatch selector
- field label, helper, error, and success message
- surface/card with stable focus and hover states
- responsive dialog/drawer with escape and scroll-lock behavior
- skeleton/media frame with reserved aspect ratio
- empty/error/retry state
- floating-action layout slot

The public APIs should be small and compatible with current consumers. Avoid a
large rewrite of the existing UI kit solely to rename components.

### 4.3 Interaction invariants

- Every icon-only interactive control has an accessible name.
- Interactive targets are at least 44px on touch surfaces unless a platform
  control already guarantees a larger native target.
- Focus is visible and not removed by hover styles.
- Dialogs trap focus, close on Escape where appropriate, restore focus, and use
  the shared ref-counted scroll-lock helper.
- Motion is disabled or reduced under `prefers-reduced-motion`.
- Disabled, pending, selected, pressed, expanded, invalid, and unavailable
  states are distinguishable without color alone.
- Tooltips supplement labels; they never replace accessible names.
- Fixed elements reserve safe-area space and use one shared stacking/offset
  contract.

## 5. Storefront purchase journey

### 5.1 Home and discovery

- Establish a calmer hero hierarchy with one primary action and one secondary
  discovery path.
- Keep the existing brand/logo and commerce destinations.
- Use spectrum accents for category meaning, trust, and product discovery.
- Delay or redesign Spin & Win so first-time visitors understand Trynext before a
  promotion can obscure the hero. Add a clear dismiss path and respect stored
  dismissal/cooldown state.
- Preserve loading, API warm-up, public stats, referral capture, and all
  existing product routes.

### 5.2 Navigation and search

- Add accessible names and state announcements to menu, search, account, cart,
  wishlist, close, and mobile navigation controls.
- Keep the current Home / Shop / Customize / Help / Company information
  architecture and existing destinations.
- Keep command-key search behavior, but make the search surface touch-safe,
  keyboard navigable, and resilient when results are loading or empty.
- Ensure dropdowns and mobile drawers do not trap the user or overlap the page
  footer unexpectedly.

### 5.3 Product listing

- Reserve media aspect ratio before images load.
- Make color, price, sale price, review state, availability, and favorite state
  consistent between card and detail page.
- Preserve filters, search, category navigation, pagination/infinite behavior,
  and API query contracts.
- Add clear horizontal-scroll affordances where carousels are used.
- Verify broken-image and slow-image states without shifting the card grid.

### 5.4 Product detail

- Keep the product image and color-specific mockup logic authoritative.
- Present price, savings, availability, selected color/size, delivery, free
  shipping threshold, payment methods, and the 25% advance requirement beside
  the purchase decision.
- Make variant chips and quantity controls fully labeled and keyboard usable.
- Make the mobile sticky purchase action and WhatsApp action share a collision
  free layout slot.
- Preserve review fetching and truthful aggregate-rating JSON-LD rules.

### 5.5 Cart and checkout

- Keep cart calculations and dynamic settings unchanged.
- Show deposit/payment explanation in cart and again beside the final checkout
  action.
- Preserve promo code, address, district/upazila, payment, and order mutation
  contracts.
- Replace timing-sensitive UI state patterns only when tests demonstrate the
  result is equivalent or safer.
- Ensure pending, success, validation, API failure, and retry states are
  visible and do not double-submit.

## 6. Design Studio and mockups

### 6.1 Guided flow

Add progressive guidance without removing expert controls:

`Choose product → Add artwork → Position → Check print quality → Preview → Add to cart`

The guidance can be a first-use coachmark/step rail and should be dismissible.
Experienced users can continue directly to the canvas.

### 6.2 Tool and state model

The public Studio must expose reliable actions for:

- product and color selection
- upload and background removal
- templates
- text
- AI generation
- layer selection, reorder, visibility, duplication, and deletion
- drag, rotate, resize, zoom, undo, redo, reset, and fit
- print-face/side selection and mug wrap behavior
- save, draft restore, export/preview, and add to cart

The implementation must preserve the canonical layer payload used by 2D
composition, 3D preview, cart snapshots, checkout, admin preview, and mobile
order metadata. Any payload versioning or migration must be explicit and
backward compatible with existing drafts.

### 6.3 Quality gate

Before add-to-cart, show the design status for:

- resolution and effective DPI/quality
- supported format and image decode status
- transparency/background behavior
- print-zone overflow and bleed tolerance
- rotation-aware bounds
- contrast/readability against the selected product color
- loading or incomplete render state

Warnings must be actionable, not merely decorative. Customers can proceed only
when a warning is non-blocking; blocking failures must identify the exact layer
or action needed.

### 6.4 Render fidelity invariants

- Normalized output files are never used as mask inputs.
- White apparel uses the reviewed two-layer multiply approach with transparent
  cutout shadow behavior.
- Black apparel uses the full dark photo behavior.
- Colored apparel uses reviewed color-photo assets when available and does not
  receive an accidental generic tint over those photos.
- Near-white garments remain white in 3D; photo planes do not use generic
  garment tint adjustment.
- Cap silhouette shadows use the transparent cutout path.
- Curved products use the existing 3D curvature/composition pipeline.
- Mug front/back side panels mirror around handles; explicit Wrap is the wider
  body zone.
- Cart, checkout, and admin previews remain visually consistent with Studio
  output.

### 6.5 Performance

- Keep heavy 3D and background-removal work out of the critical first render
  where possible.
- Load large mockup/photo assets progressively and preserve stable dimensions.
- Keep 2D editing available as the lower-cost fallback on constrained devices.
- Avoid re-composing all layers for unrelated UI state changes.
- Measure Studio initial render, asset decode, image-removal completion, and
  3D readiness rather than optimizing by guesswork.

## 7. Mobile app

- Use the same semantic spectrum roles, typography hierarchy, status meanings,
  and action language as web, adapted to native layout.
- Keep the mobile home, shop, design, cart, checkout, and account routes.
- Resolve Expo SDK/package compatibility warnings only within the installed SDK
  support range.
- Keep the primary checkout action visible above the keyboard on small Android
  layouts using the existing keyboard-aware component.
- Preserve inline field validation and major-district quick selection.
- Give loading, empty, error, retry, partial-data, saved, and pending states
  consistent visual treatment.
- Preserve safe areas, native haptics, pull-to-refresh, dynamic settings, API
  base URL fallback, and studioDesign/originalAssets metadata through checkout.
- Do not force the full desktop editor into a narrow phone; use a focused
  creation sequence with reachable controls and a clear preview handoff.

## 8. API, SEO, security, and performance foundations

### 8.1 SEO and truthfulness

- Keep unique title, description, canonical, hreflang, Open Graph, Twitter, and
  page JSON-LD behavior.
- Add BreadcrumbList where page hierarchy supports it.
- Emit aggregate ratings only when real review data exists.
- Reconcile static claims in `index.html` and homepage with verified values or
  remove/qualify them.
- Keep sitemap URLs, image sitemap data, and `lastmod` accurate.
- Preserve the current SPA fallback while documenting that non-JavaScript bots
  receive generic HTML metadata; improve only with a safe, route-aware strategy.

### 8.2 API and production safety

- Verify production cannot expose development reset, bypass, or recovery
  behavior.
- Preserve admin session hashing, CSRF, rate limits, security headers, origin
  checks, database failover, backup sync, and API response shapes.
- Keep public stats cached and resilient, with no unnecessary aggregate query
  storm.
- API source changes require the documented build and workflow restart.

### 8.3 Web performance

- Keep route-level lazy loading and chunk retry behavior.
- Reserve image dimensions and use responsive image loading where assets allow.
- Review font loading/preload strategy and avoid loading decorative fonts before
  the critical UI.
- Measure LCP, CLS, INP, storefront route transition, and Studio readiness.

## 9. Promo and brand-system surfaces

- Keep the promo artifact's animation behavior and the brand-system artifact's
  living documentation functional.
- Reconcile spectrum semantic tokens into the brand system first, then consume
  them in storefront, Studio, mobile, and promo where integration is safe.
- Do not introduce CSS collisions between design-system and storefront-local
  styles.
- Keep artifact-specific responsive behavior and preview paths intact.

## 10. Safe parallel implementation plan

Parallel work is allowed only with these file boundaries:

### Lane A — storefront interaction and conversion

Owns Home, Products, ProductDetail, Cart, Checkout, Navbar, SpinWheel, sticky
actions, WhatsApp action, and storefront-local interaction styles.

### Lane B — shared spectrum primitives

Owns the selected design-system token source and new small primitives. This lane
must land before broad consumers change. It may not modify OpenAPI, database
schema, mockup source contracts, or mobile screens concurrently.

### Lane C — Studio workflow and quality gate

Owns DesignStudioV2, Studio-specific components, store selectors, guidance,
quality status, and Studio interactions. It must not rewrite composer or mockup
asset contracts without a separate review.

### Lane D — mockup/render consistency

Owns mockups, composer, ProductViewer3D, garment3d, CartViewer3D, and focused
render tests. It must preserve reviewed source assets and coordinate payload
changes with Lane C before merge.

### Lane E — mobile

Owns Expo package compatibility, checkout keyboard flow, mobile state parity,
mobile design flow, and mobile-local theme consumption. It must not edit shared
OpenAPI, database, or web token source simultaneously.

### Lane F — API/SEO/performance/security

Owns SEOHead, index metadata, sitemap, public stats, API security gates, and
performance instrumentation. API changes require compile/restart verification.

### Lane G — promo/brand integration

Owns promo and brand-system consumers after semantic tokens are settled.

### Reconciliation order

1. Read-only contract review and written spec.
2. Shared tokens/primitives.
3. Storefront consumer pass.
4. Studio/render reconciliation.
5. Mobile consumer pass.
6. API/SEO/security reconciliation.
7. Promo/brand-system alignment.
8. Main-agent full typecheck/build and workflow verification.
9. Live preview screenshots at desktop, tablet, and phone widths.
10. Final handoff update and secure GitHub push.

No agent may edit `lib/api-spec/openapi.yaml`, `lib/db/src/schema/index.ts`,
reviewed mockup source assets, or shared token source concurrently with another
agent.

## 11. Verification matrix

### Automated

- `pnpm run typecheck`
- storefront typecheck
- mobile typecheck
- API build/typecheck after server edits
- promo and brand-system checks
- focused render/contract tests where present
- route and JSON-LD assertions for SEO changes

### Runtime

- Restart every affected managed workflow.
- Refresh workflow and browser logs.
- Confirm no startup errors, chunk failures, API contract errors, or unhandled
  promise failures.
- Exercise product browse → detail → cart → checkout.
- Exercise upload → layer edit → quality check → 2D/3D preview → cart.
- Exercise mobile checkout with keyboard visible and invalid/valid fields.
- Exercise settings-driven shipping, payment, WhatsApp, and deposit messaging.

### Visual and accessibility

- Capture web screenshots at desktop, tablet, 402px phone, and 360px phone
  widths.
- Inspect initial home, product grid, product detail, cart, checkout, Studio,
  modal/drawer, and error/loading states.
- Verify no fixed controls overlap, no content is clipped, and no image causes
  visible layout shift.
- Keyboard through navigation, search, product selection, dialogs, checkout,
  and Studio controls.
- Verify accessible names and selected/expanded/invalid/pending states.
- Verify reduced-motion behavior.

### Release safety

- Check production-only admin reset/bypass gates.
- Confirm no secrets appear in source, logs, screenshots, specs, handoff, or git
  diff.
- Inspect `git diff`, commit changes locally, then push using the approved
  secure GitHub integration/remote flow without printing credentials.

## 12. Out of scope for this implementation contract

- Replacing the database provider.
- Replacing the reviewed photo-mockup pipeline with unreviewed generated assets.
- Rewriting authentication or payment providers.
- Creating a second storefront artifact or changing the root preview path.
- Removing V1/V2 Studio routes before a compatibility review.
- Adding unverified marketing claims.
- Force-pushing or rewriting shared Git history.

## 13. Definition of done

The work is done only when the approved experience is implemented across all
affected surfaces, all existing behavior listed in Section 2.3 still works,
shared contracts are reconciled, relevant workflows restart cleanly, visual and
interaction checks pass at the required responsive sizes, the canonical web
artifact is presentable, the handoff records the exact checkpoint, and the
verified changes are committed and pushed securely.