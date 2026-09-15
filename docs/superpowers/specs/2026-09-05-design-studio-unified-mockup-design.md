# Trynext Design Studio Unified Mockup Repair

## Status

Design approved by the project owner on 2026-09-05. Implementation is not included
in this document and must not begin until the owner reviews this written spec.

## Goal

Replace the current approximate uploaded-artwork rendering path with a fail-closed,
source-kit-driven compositor that produces one deterministic result for the Design
Studio, 3D preview, live preview, cart thumbnail, exported PNG, checkout/order
thumbnail, and order/admin metadata.

The browser must remain realtime and local for upload preview. PSD/PSB masters remain
the provenance authority; browser-safe masks, geometry, material maps, and metadata
are the runtime contract derived from approved source-kit entries.

## Existing defect

The current runtime has several independent rendering paths and does not enforce one
source contract:

- `composer.ts` paints layers directly onto a canvas using generic print-zone paths.
- Curvature is a family-level strip approximation rather than calibrated per-surface
  geometry.
- Optional source-luminance shading can act as a synthetic substitute for reviewed
  material maps.
- Missing garment sources can fall back to a rounded color shape or other
  approximation.
- The manifest does not explicitly model alpha mode, mask provenance, runtime
  hashes, or approval requirements.
- Studio, 3D, export, and cart call sites use related but separate composition
  functions and output sizes.

These behaviors can create rectangular artwork boundaries, ghost or duplicate
garments, washed whites, incorrect tinting of opaque photos, unprotected physical
details, stale source selection, and inconsistent snapshots.

## Scope

This is the full fail-closed source-kit and unified compositor architecture for all
enabled product families and surfaces:

- T-shirt
- Long sleeve
- Hoodie
- Mug
- Cap
- White sublimation water bottle

The 188-surface release matrix remains the completeness target. A surface that lacks
an approved, valid runtime contract is disabled rather than approximated or silently
resolved through a stale generation.

The scope includes:

1. A typed runtime manifest contract and resolver.
2. One shared deterministic compositor and serialized render request.
3. Integration of all current preview/export/cart consumers with that compositor.
4. Focused automated tests for contract, selection, compositing, and parity.
5. Reproducible real uploaded-artwork visual evidence.
6. Release gating and handoff documentation.

The scope does not change commerce, checkout, pricing, navigation, authentication,
storage, payment, or account behavior except for adding the approved render metadata
already required by the mockup contract to cart/order payloads.

## Architecture

### Typed resolved surface

Introduce an explicit resolved runtime type, separate from raw generated manifest
data. It must include:

- `category`, `colorSlug`, `face`, and `sourceKitKey`;
- manifest schema and revision;
- `alphaMode`: `opaque-photo` or `transparent-cutout`;
- approved base source and normalized frame;
- printable clip mask and exclusion mask;
- protected-detail/occlusion mask;
- shadow/fold, highlight, and optional texture map references;
- calibrated warp mode and parameters;
- print-zone geometry, safe margins, seam padding, and aspect-ratio rules;
- allowed blend modes and opacities;
- master path, provenance, master hash, derived-asset hashes, and approval status;
- browser-safe runtime paths.

The resolver must validate the complete contract before returning a surface. It must
reject:

- missing or invalid runtime assets;
- missing provenance or hashes;
- unsupported alpha modes;
- mismatched category, color, face, or source-kit key;
- stale or unapproved revisions;
- invalid geometry or incomplete masks;
- non-canonical bottle colors;
- stale `smart-v4` or generic-family fallback paths.

The resolver may use an explicit disabled-surface result containing an actionable
reason. It must never return a guessed rectangle, a placeholder garment, or a
different asset generation as an implicit fallback.

### Serialized render request

Create one render request shape shared by all consumers. It includes:

- product family and product ID;
- color and face/surface;
- source-kit key and manifest revision;
- renderer version;
- artwork layer IDs and source references;
- alpha, position, scale, rotation, flips, and any layer-specific transforms;
- text, shape, and QR layer data;
- target dimensions and render purpose;
- approved render metadata and resolved asset hashes.

Interactive preview and export may request different dimensions, but they must use
the same source-kit key, geometry, masks, layer transforms, compositing order, and
renderer version.

### Unified compositor

The compositor will operate in explicit offscreen passes:

1. Resolve and validate exactly one approved surface manifest.
2. Load the normalized base product once and preserve its alpha contract.
3. Tint only a transparent cutout inside its own product alpha. Never tint an opaque
   photo.
4. Rasterize all visible customer layers to a transparent artwork canvas in product
   space.
5. Preserve upload alpha, aspect ratio, transforms, and sufficient intermediate
   resolution.
6. Apply calibrated per-surface warp, displacement, mesh, or geometry.
7. Clip artwork with the printable mask and subtract the exclusion mask.
8. Apply reviewed shadow/fold information only inside artwork alpha.
9. Apply reviewed highlights only inside artwork alpha.
10. Apply approved texture only where the manifest allows it.
11. Composite the base exactly once.
12. Apply protected-detail occlusion above the artwork.
13. Preserve final product alpha and reject halos, rectangular boundaries, duplicate
    shadows, pale wedges, background tint, and ghost silhouettes.

Generic source-luminance multiply/screen shading is not a production substitute for
reviewed material maps. If a surface's material maps are not approved, that surface
is disabled or uses only the explicitly approved documented treatment.

### Surface geometry

Geometry is selected from the resolved surface, not only from the product family:

- Apparel uses calibrated face/sleeve/neck-label masks and displacement where folds
  affect the artwork.
- Mugs use calibrated body mapping and exclude rim, handle, and base.
- Water bottles use calibrated cylindrical mapping and exclude lid, shoulder,
  carabiner/key-ring details, and rounded base.
- Caps use calibrated crown/panel mapping and exclude brim, seams, rear opening, and
  strap.

The existing product-switch refit remains the source of layer transform changes;
the compositor must consume those transforms without reinterpreting scale.

## Integration points

The implementation will inspect and update the following related paths together:

- `artifacts/trynex-storefront/src/pages/design-studio/smart-mockup-manifest.ts`
- the active mockup resolver in
  `artifacts/trynex-storefront/src/pages/design-studio/mockups.tsx`
- `artifacts/trynex-storefront/src/pages/design-studio/composer.ts`
- `artifacts/trynex-storefront/src/pages/studio/DesignStudioV2.tsx`
- the 3D preview texture consumer
- cart/export/order render metadata consumers
- source-kit and compositor test files
- any generated manifest or validation documentation whose paths are stale

Existing uploads, draft restoration, product switching, undo/redo, original asset
metadata, and cart/order persistence remain intact. The new render metadata is
additive and must identify the exact source-kit key, manifest revision, and renderer
used for the snapshot.

## Failure states

### Manifest failure

The UI shows a surface-specific warning explaining that custom artwork is temporarily
unavailable because its approved mockup assets are incomplete or invalid. Export and
add-to-cart are disabled for that surface.

### Asset load failure

Missing, corrupt, CORS-blocked, or dimension-invalid base/mask/material assets produce
the same visible disabled-surface state. No rounded placeholder, red debug box, or
guessed family asset is eligible for a final render.

### Render pending

While a render request is waiting for required assets or high-resolution composition,
the UI shows a pending state and prevents export/add-to-cart from capturing a stale
canvas. Interactive low-resolution preview may remain available only if it was
produced from the same valid request and contract.

### Runtime mismatch

If a selected surface changes during an asynchronous render, the result is discarded
unless its serialized request still matches the current product, color, face,
source-kit revision, and layer state.

## Testing and visual acceptance

### Automated tests

Add focused tests covering:

1. Complete enabled-family/color/face resolution.
2. No stale-generation override of an approved source-kit entry.
3. Matrix completeness and canonical water-bottle restriction.
4. Rejection of missing masks, unsupported alpha, invalid geometry, wrong keys,
   invalid hashes, and unapproved status.
5. Opaque sources never entering tint or transparent-cutout shading.
6. Transparent sources preserving outside-product transparency.
7. Exactly one full base pass.
8. Material effects clipped to artwork alpha and approved regions.
9. Protected details remaining above artwork.
10. Excluded hoodie, cap, mug, bottle, seam, and apparel regions remaining clean.
11. Stable transforms and aspect ratio across product/color/face switching.
12. Preview, 3D, cart, export, and order using the same serialized request data.
13. Visible failure states for missing or invalid assets.
14. Safe handling of oversized, corrupt, remote, transparent, and highly opaque
    uploads.
15. Surface switching, rapid changes, undo/redo, and pending renders avoiding stale
    snapshots.

### Required visual evidence

Generate reproducible saved artifacts using both:

1. A diagnostic upload containing a checkerboard/grid, thin lines, RGB bars,
   black/white text, semi-transparent shapes, and a white border.
2. A photographic PNG with transparency.

At minimum, render and inspect:

- white and dark T-shirt;
- hoodie;
- long sleeve;
- mug;
- cap;
- white water bottle;
- all enabled faces and colors, with the complete active matrix as the release
  target.

Evidence must compare Studio, 3D, cart, and export output and inspect:

- realistic fold/highlight response;
- no rectangular artwork boundary;
- no duplicate garment or missing shadow;
- no green cast or washed white source;
- no halo or alpha fringe;
- correct placement and safe margins;
- protected physical details above artwork;
- sensible curvature without buckling or edge collapse;
- stable asynchronous export/cart behavior.

Manifest validation, asset presence, compilation, and typechecking are necessary but
not sufficient for completion.

## Release gate

Production promotion remains fail-closed until:

- every enabled surface resolves to an approved matching manifest;
- alpha semantics and runtime hashes are validated;
- incompatible fallback paths are removed;
- all consumers use the unified serialized request and compositor;
- focused tests pass;
- real uploaded-artwork visual evidence is saved and reviewed;
- every remaining unfit surface is explicitly disabled with a business-facing reason.

The final report must separate asset, alpha/mask, resolver, compositor,
cross-consumer, and remaining-surface findings, and must list exact changed files,
manifest/revision details, reproducible commands, test results, visual artifacts,
and the production-readiness recommendation.

## Approved behavior to preserve

- Immediate local upload preview without paid or per-upload server rendering.
- Original uploads in cart and checkout metadata.
- Product-switch refit and undoability.
- Accurate curved-product 3D/final behavior.
- Canonical white water-bottle front/back only.
- Existing storefront, admin, auth, payment, storage, and deployment paths.