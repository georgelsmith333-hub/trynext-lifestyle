# Trynext Lifestyle Mockup Rebuild and Design Studio Reliability

**Status:** Awaiting owner review  
**Date:** 2026-09-03  
**Scope:** Six product families, the shared browser compositor, the Design Studio
  editing workflow, and the quarantined PSD/PSB source-kit pipeline.

## 1. Goal

Replace the unreliable mockup behavior observed in the staged review with a
repeatable, evidence-driven system that makes uploaded artwork look printed on
the selected product without losing editing control or the original asset.

The rebuild must correct:

- checkerboard pixels, alpha leaks, halos, and rectangular artwork spill;
- product-specific masks, print zones, protected details, shadows, and highlights;
- flat apparel overlays and the material response of hoodies and long sleeves;
- mug, cap, and water-bottle curvature;
- upload, loading, processing, error, and retry states;
- background-removal timeout/retry behavior;
- reversible client-controlled Enhance and Auto-fix behavior;
- text insertion, visibility, contrast, and editing controls;
- Auto-optimize centering and print-zone fitting;
- touch behavior and responsive layouts on mobile, tablet, and desktop;
- genuine PSD/PSB source-master status and per-surface provenance.

The result is not complete until the same surface contract drives the Design
Studio preview, export image, cart snapshot, and reviewable source master.

## 2. Guardrails and non-goals

The following behavior is preserved:

- The active customer resolver remains the reviewed runtime fallback until the
  entire staged candidate passes structural, visual, and functional acceptance.
- Smart v9 and Smart Object promotion remain fail-closed. No manifest flag,
  runtime override, or public asset is activated by structural validation alone.
- The active matrix is 188 surfaces, not the obsolete 202-surface bottle matrix.
- The white sublimation water bottle remains a single non-tintable product color.
- Technical identifiers, package names, routes, storage keys, and infrastructure
  URLs are not renamed.
- Uploads are rendered in the browser; no paid image-generation service,
  Photoshop API, or hosted render service is added.
- Original customer-uploaded files and studio metadata remain available through
  cart and checkout preparation.

This work does not replace the storefront, change order/payment behavior, ship
editable PSD/PSB files to customers, or label generated photography as
authentic product photography.

## 3. Current failure model

The existing system has useful contracts but they are not yet sufficient for a
trustworthy visual release:

1. `smart-mockup-manifest.ts` describes normalized frames, print zones, warp,
   protected details, and material passes, but a manifest record alone does not
   prove that a valid PSD/PSB master exists.
2. `composer.ts` is the shared rendering boundary, but source alpha,
   color/tint decisions, curved geometry, and material effects must be made
   explicit so editor and export cannot diverge.
3. `mockups.tsx` resolves product/color/face assets and must continue to reject
   ambiguous color matches rather than silently using a visually wrong asset.
4. The staged candidate can be structurally complete while still showing
   visible defects. Structural, visual, and runtime evidence are separate gates.

The rebuild therefore treats every surface as a record with an auditable source,
geometry, mask, material recipe, status, and review evidence. Missing or
ambiguous inputs stop that surface from promotion instead of returning a
plausible-looking fallback.

## 4. Chosen architecture

### 4.1 Dual-renderer, manifest-first system

The source kit is authoritative for product geometry and editable masters. The
browser renderer is authoritative for customer interaction. Both consume the
same versioned surface manifest:

```text
source record
  -> normalized source/cutout validation
  -> surface manifest
  -> PSD/PSB master + embedded artwork proof
  -> optimized runtime preview/mask/effect assets
  -> browser compositor
  -> editor preview, export, cart snapshot
```

The browser never attempts to execute Photoshop filters. It implements the
manifest's bounded equivalent:

- flat normalized transforms for apparel;
- separate sleeve and neck-label transforms;
- cylindrical mapping for mugs and bottles;
- panel/dome mapping for caps;
- print-zone clipping before material response;
- protected product details above the artwork;
- restrained source-luminance shading only where the source type permits it.

### 4.2 Staged review switch

The candidate renderer is exposed only through an explicit local/staging
configuration, not by changing the production default. The switch must:

- be disabled in the normal customer build;
- require a deliberate build/runtime opt-in such as
  `VITE_MOCKUP_REVIEW=staged`;
- use the current reviewed resolver when the flag is absent, invalid, or
  incomplete;
- display a visible “staged review” marker so screenshots cannot be mistaken
  for production evidence;
- never activate an individual surface when the candidate manifest is
  incomplete or its release gate is false.

The implementation may use a route/query entry point for reviewers, but the
resolver selection must be controlled by the explicit staging flag. A query
parameter alone is not an activation mechanism.

## 5. Source-kit and PSD/PSB contract

### 5.1 Per-surface record

Each of the 188 canonical surfaces must resolve to a record containing:

```text
surface key: family / color / face
source asset path and checksum
cutout/mask path and checksum
normalized frame
print zone and shape
warp mode, curvature, seam padding
shadow and highlight sources
protected details
provenance
master path and format
preview/effect paths
master status
visual/runtime review status
evidence references
```

Provenance is one of:

- `authentic-preserved`: reviewed source photography retained as-is;
- `generated-master`: approved geometry/assets used because the exact source did
  not exist;
- `derived-color-from-generated-master`: deterministic derivative from an
  approved neutral source, only when the physical silhouette and material
  identity are still valid.

There is no implicit fallback provenance. A missing sleeve, label, back, or wrap
surface is a rejected source record until it has its own reviewed asset or
approved generation record.

### 5.2 Alpha and source preflight

Before a source can enter a master or runtime release:

- decode it and inspect dimensions, color mode, alpha presence, and bounds;
- reject opaque checkerboard grids, white/grey matte backgrounds, chroma-key
  fringes, and rectangular pixels outside the intended silhouette;
- verify that the cutout alpha follows the physical product silhouette;
- verify that the source photo and cutout have the same normalized frame;
- record a checksum for every immutable input and derived output;
- retain the original source when a correction is generated.

Checkerboard detection is a preflight signal, not a license to guess. A
checkerboard-looking upload is preserved as the user's original but is not
silently treated as transparent. The editor must expose the asset state and
offer a reversible retry or replacement path.

### 5.3 PSD/PSB master

Every master uses the following bottom-to-top layer contract:

```text
00 Studio Background — Warm White
10 Product Base — family — color — face
20 Shadow / Fold Map — multiply
30 Artwork — SMART OBJECT — double-click to edit
40 Protected Details — seams, hardware, collar, handle, brim, etc.
50 Highlight / Material Response — screen or soft-light
60 Print Zone Mask — hidden review layer
70 Placement Guide — hidden review layer
```

The Artwork layer must contain a genuine editable embedded Smart Object with:

- a stable layer name and surface key;
- an editable non-empty proof design;
- a transform matching the surface manifest;
- embedded-content metadata linking back to the source record.

The generator must choose PSD or PSB based on actual document limits and reopen
the written file in the structural auditor. An extension is never considered
proof of format. If a master cannot be reopened and verified, its
`masterStatus` remains `manifest-only` and the surface cannot be promoted.

Editable masters, embedded artwork documents, and regeneration inputs remain
outside the storefront public bundle. Runtime receives only reviewed previews,
masks/effects, and the minimal manifest data needed by the active editor.

## 6. Browser compositor contract

### 6.1 One geometry path

The compositor receives a resolved surface and a list of design layers. It must
use the same normalized frame and print-zone geometry for:

- the live Design Studio preview;
- 2D export;
- 3D texture/cart snapshot;
- checkout thumbnail preparation.

Layer coordinates remain in product-space pixels. The compositor must not apply
a second percentage-based resize when converting editor transforms to output
pixels. Product switching recalculates the layer transform against the target
print zone and records the change as an undoable studio operation.

### 6.2 Product-specific material rules

**T-shirt, long sleeve, and hoodie**

- Artwork is clipped to the product-specific print zone, not only its rectangle.
- Collar, cuffs, sleeves, seams, hem, hood, drawstrings, and kangaroo pocket
  remain visible where their geometry overlaps the zone.
- Hoodies and long sleeves use their reviewed source lighting/fold response;
  synthetic grain and shading remain subtle and cannot create a second garment
  silhouette or ghost shadow.
- Exact color photos are rendered directly. Transparent cutouts are tinted only
  when the resolver explicitly marks `requiresTint`.

**Mug**

- Side 1 and side 2 use mirrored body-safe zones around the handles.
- Full wrap is explicit and uses the wider continuous body zone.
- Artwork uses bounded cylindrical mapping with seam padding.
- Rim, handle, and base are protected details.

**Cap**

- Front and back use separate panel geometry.
- The print boundary follows the cap alpha/panel silhouette rather than a square
  source rectangle.
- Brim, crown seams, rear opening, and strap remain above the artwork.
- Dome curvature is visible but restrained.

**Water bottle**

- Only the white sublimation blank is resolved.
- Front/back use the pinned non-tintable source pair.
- Artwork follows the straight cylindrical body and excludes lid, loop,
  carabiner, shoulder, and rounded foot.
- Bottle curvature is bounded so the design does not buckle or become a flat
  rectangle.

### 6.3 Shading and effects

Material effects are explicit, optional, and source-specific:

- opaque photos carry their own product lighting and do not receive a duplicate
  full-frame multiply pass;
- transparent cutouts may receive restrained source-luminance shading inside the
  print zone;
- reviewed PSD-native effect layers are clipped to the print zone and carry
  blend mode, opacity, source path, and checksum;
- invalid or CORS-blocked optional effects are reported and skipped without
  discarding the customer artwork;
- synthetic fabric texture is bounded, deterministic for a given render request,
  and never allowed to obscure text or create checkerboard artifacts.

## 7. Design Studio interaction and state design

### 7.1 Upload state machine

An upload is represented by explicit states:

```text
idle
  -> decoding
  -> ready
  -> fitting
  -> rendered
  -> optional-processing
  -> processed
```

Recoverable branches are explicit:

```text
decoding/error
processing/timeout
processing/error
render/error
```

Every error preserves the original file and current committed design layers.
Retry repeats only the failed operation, with bounded attempts and a visible
retry action. A failed optional operation never replaces a usable preview with
an empty canvas or a silent placeholder.

Uploads are bounded before decode and export to prevent browser memory
exhaustion. The editor shows a usable loading state while the image is decoded
and the first preview is being composed.

### 7.2 Background removal

Background removal is optional and never blocks the first preview. The UI must:

- show progress and a cancellable/retryable processing state;
- apply a timeout rather than waiting indefinitely;
- retain the original and the pre-removal preview;
- make the processed result a separate reversible layer/version;
- surface a clear failure message with Retry and Keep original actions;
- avoid silently interpreting a checkerboard-looking result as transparency.

If the existing permitted processing endpoint is unavailable, the editor remains
usable with the original asset. No paid AI or render-service dependency is
introduced by this feature.

### 7.3 Enhance and Auto-fix

Enhance and Auto-fix are client-controlled, reversible transformations:

- preserve the original upload as the immutable source;
- store brightness, contrast, saturation, and related adjustments as layer
  metadata or a derived client bitmap;
- show before/after state and a reset action;
- apply the same adjustment to preview and export;
- never mutate the source file or require a remote render to display the result;
- use bounded values and guard against repeated cumulative enhancement.

### 7.4 Text and shapes

Text insertion must create a visible, selected text layer with:

- a readable default size and contrast against the active product;
- explicit font, weight, alignment, color, stroke, shadow, and letter-spacing
  controls where supported;
- a reliable visible/hidden state;
- editing and deletion controls;
- placement constrained to the active print zone with a clear out-of-bounds
  warning or Auto-optimize action.

White/bright text must remain legible on dark products, while dark text must not
disappear through an inappropriate multiply blend on colored or dark products.
Text rendering in preview/export/cart must use the same metrics and alignment.

### 7.5 Auto-optimize and product switching

Auto-optimize computes a centered transform that fits the selected layer's
visible bounds inside the active face print zone while preserving aspect ratio
unless the user has intentionally unlocked distortion. It must:

- use the actual face-specific zone;
- account for curved product safe insets and seam padding;
- avoid resetting user rotation or flip state unless the user requests a full
  reset;
- remain undoable;
- complete visibly with no silent jump to another face or product.

When changing product or face, the system refits the current design to the target
zone rather than preserving stale relative dimensions. The original design
metadata remains intact.

## 8. Responsive and touch behavior

The studio layout has three deliberate modes:

- **Desktop:** persistent tool/panel regions, large preview, clear selected-layer
  handles, and no pointer capture that prevents mouse dragging.
- **Tablet:** collapsible side panels and touch-sized controls while retaining
  enough canvas area for placement.
- **Mobile:** stacked or sheet-based tools, a visible active-layer summary,
  touch-safe handles, and no interaction that depends on hover.

Pointer handling must support mouse, touch, and pen without relying on a
touch-only pointer restriction. Dragging, rotation, scaling, flip, selection,
panel close, and product/color switching must be testable with coarse pointers.
Body scroll locking for overlays uses the shared ref-counted helper; individual
panels must not set body overflow directly.

The layout must remain usable at narrow widths and with browser zoom. Controls
need accessible labels, visible focus, adequate hit areas, and reduced-motion
behavior. Responsive changes must not alter the normalized compositor geometry.

## 9. Review and release workflow

### Stage 0 — source audit

Inventory the 188 surfaces, source/cutout pairs, masks, frames, checksums, master
paths, and provenance. Classify each source as reviewed, ambiguous, missing, or
generated. Audit the actual PSD/PSB availability and `masterStatus` per family;
do not infer it from filenames or manifest presence.

### Stage 1 — six-family proof

Build and reopen one representative front surface for each family:

```text
tshirt/white/front
longsleeve/white/front
hoodie/white/front
mug/white/front
cap/white/front
waterbottle/white/front
```

Each proof must pass alpha preflight, genuine Smart Object reopen, browser/PSD
placement comparison, and an upload-to-export interaction test before matrix
fan-out begins.

### Stage 2 — quarantined matrix

Generate all 188 masters, runtime previews, masks, effects, and manifest
records into a versioned staging directory. Never copy an incomplete or
unreviewed candidate into the active resolver or public runtime.

### Stage 3 — controlled runtime review

Run the Design Studio with the explicit staging flag. Review representative
artwork on:

- every family;
- light, dark, and colored supported states;
- front/back and all supported special faces;
- product switching and color switching;
- upload, text, Auto-optimize, Enhance, background removal, export, cart
  snapshot, reload, and recovery paths;
- mobile, tablet, and desktop viewports.

Record visual evidence by surface key. A surface can be rejected independently
in staging, but no rejected or missing surface is promoted.

### Stage 4 — release decision

Promote only when all gates in Section 10 pass. The current runtime fallback
remains active if any structural, visual, or functional gate is incomplete.

## 10. Acceptance gates

### Structural

- 188/188 canonical surfaces exist.
- Every source and derived asset has a checksum and provenance.
- Every master reopens successfully.
- Every artwork layer is a real editable Smart Object with non-empty proof
  content.
- PSD/PSB extension matches the actual written format.
- No pixel-layer artwork placeholder is accepted as a verified master.
- No non-white water-bottle surface is present.
- Public runtime does not contain editable masters or embedded source documents.

### Visual

- No checkerboard, matte, halo, chroma-key fringe, or rectangular spill.
- Artwork is centered and scaled to the correct face-specific print zone.
- Apparel folds, seams, collar/cuffs, hoodie details, and protected edges remain
  visible.
- Mug handle/rim/base, cap brim/seams/strap, and bottle hardware remain visible.
- Curvature is physically credible and not exaggerated.
- Opaque color photos are not tinted or double-shaded.
- Preview, export, cart snapshot, and PSD composite agree on scale and placement.
- Text remains visible and legible across supported product colors.

### Functional

- Upload reaches a usable first preview without a render API.
- Decode/render/processing failures show recoverable actions and preserve the
  original asset.
- Background removal timeout and retry do not lose the working design.
- Enhance and Auto-fix are reversible and consistent in preview/export.
- Text insertion creates a visible editable layer.
- Auto-optimize uses the actual active zone and is undoable.
- Product/face switching refits artwork without corrupting metadata.
- Mouse, touch, and keyboard-accessible controls work at all target breakpoints.
- The full resolver/compositor matrix passes without activating Smart v9 in
  production.

## 11. Verification artifacts and commands

The implementation must produce repeatable evidence rather than relying on a
single screenshot:

- source audit JSON with checksums and per-surface provenance;
- PSD/PSB structural audit JSON;
- contact sheets for each family and release;
- browser/PSD placement comparison report;
- functional 188-surface matrix report;
- staged review notes with per-surface accept/reject status;
- focused compositor and studio regression tests.

The verification pass will include focused storefront tests, storefront and
workspace typechecks, a production build, the active 188-surface validator, PSD
structural validation, and a managed workflow restart after code/toolchain
changes. Proxied health and catalog checks must remain clean. No test order,
payment record, or production mutation is required.

## 12. Implementation order

1. Audit and freeze source/manifest truth without changing the customer
   resolver.
2. Add source alpha/preflight and per-surface status reporting.
3. Prove the six-family PSD/PSB generator/auditor round trip.
4. Refactor shared compositor geometry/material decisions behind the staged
   switch.
5. Repair upload, background-removal, Enhance, text, Auto-optimize, and recovery
   states using the existing studio contracts.
6. Verify responsive and pointer behavior.
7. Generate and inspect the quarantined 188-surface candidate.
8. Record visual/runtime evidence and make a controlled promotion decision.

Each step stops on a failed gate. No step deletes the current fallback or
silently broadens the release.

## 13. Completion definition

The rebuild is complete only when the source audit, genuine master audit,
compositor comparison, Design Studio interaction tests, responsive checks, and
188-surface runtime review all pass. Until then:

- the existing reviewed runtime remains customer-facing;
- staged assets remain quarantined;
- Smart v9 remains inactive for customers;
- unresolved surfaces retain an explicit rejected or unverified status.