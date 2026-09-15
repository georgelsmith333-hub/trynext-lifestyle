# Trynext Six-Family PSD/PSB Smart Mockup System

**Status:** Approved with staging revision; implementation follows the staged build plan below.
**Date:** 2026-09-01
**Scope:** T-shirt, long sleeve, hoodie, mug, cap, and water bottle mockups.

## 1. Decision

Trynext will use a **manifest-first dual-renderer architecture**:

1. A build-time generator creates genuine editable PSD/PSB masters with an
   embedded Photoshop Smart Object for artwork.
2. The customer-facing Design Studio renders the same surface using a local
   browser compositor. Uploads never require Photoshop, a paid AI service, or a
   server render.

The PSD/PSB masters and the browser renderer share one versioned surface
manifest containing print zones, normalized frames, warp parameters, masks,
protected details, source checksums, and provenance. This prevents the editor,
export, cart snapshot, and operator master from drifting apart.

The system must stop rather than call a raster placeholder a Smart Object. A
master is `verified` only after it is reopened by the structural auditor and
the artwork layer is detected as a genuine Smart Object with editable embedded
content.

## 2. Audit baseline

The 2026-08-28 binary audit inspected 108 files under the current source kit:

- 108/108 opened successfully.
- All were 1024x1024, 8-bit RGB documents with composite previews.
- All had the same raster-oriented layer layout.
- 0/108 contained a Smart Object layer.
- The named artwork layer was a fully transparent pixel layer, not editable
  Smart Object content.
- 94 of the current canonical 188 surfaces had no source master.
- Older documentation listed 202 surfaces because it included eight bottle
  colors. The current product contract is authoritative: the sold bottle is a
  single white sublimation blank, so the release target is 188 surfaces.

Existing tooling is useful but not sufficient:

- `scripts/generate_trynext_mockup_psds.py` writes raster `PixelLayer` artwork and
  cannot be treated as a Smart Object generator.
- `tools/build-smartobject-mockups.mjs` contains a placed-layer/linked-file
  writing path, but every output must pass the real structural audit before it
  becomes a release source.
- `smart-mockup-manifest.ts` and `canonical-mockup-spec.ts` already contain
  much of the product geometry contract and will become generated-source
  consumers rather than parallel manual truth.

## 3. Canonical release matrix

The release must cover all six families and every required face:

| Family | Colors | Required faces | Surfaces |
|---|---:|---|---:|
| T-shirt | 8 | front, back, left sleeve, right sleeve, neck label | 40 |
| Long sleeve | 10 | front, back, left sleeve, right sleeve, neck label | 50 |
| Hoodie | 10 | front, back, left sleeve, right sleeve, neck label | 50 |
| Mug | 10 | side 1, side 2, full wrap | 30 |
| Cap | 8 | front, back | 16 |
| Water bottle | 1 white | front, back | 2 |
| **Total** |  |  | **188** |

The current `canonical-mockup-spec.ts` coordinate space is the contract. It
must not be silently replaced by the older 202-surface plan.

The water bottle is explicitly non-tintable. Its pinned white front/back
assets remain immutable unless the product owner intentionally changes the
physical blank contract and updates the hashes.

## 4. Source and manifest model

Each surface record must contain:

```text
family
color
face
source photo/cutout
source checksum
normalized frame
print zone
warp mode and parameters
shadow map
highlight map
protected details
provenance
master format and path
preview path
review status
```

Provenance is explicit:

- `authentic-preserved`: reviewed source photography retained without
  cross-family substitution.
- `generated-master`: a distinct surface built from approved geometry/assets
  where photography did not exist.
- `derived-color-from-generated-master`: a deterministic color derivative
  whose silhouette and material identity are inherited from an approved
  neutral source.

No surface may use an untracked fallback. Missing source photography is a
reviewed generation problem, not permission to return the front view for a
sleeve, neck label, or wrap face.

## 5. PSD/PSB master contract

Every master uses this layer order, bottom to top:

```text
00 Studio Background — Warm White
10 Product Base — <family> — <color> — <face>
20 Shadow / Fold Map — multiply
30 Artwork — SMART OBJECT — double-click to edit
40 Protected Details — seams, hardware, collar, handle, brim, etc.
50 Highlight / Material Response — screen or soft-light
60 Print Zone Mask — hidden review layer
70 Placement Guide — hidden review layer
```

The artwork layer must include:

- a real placed-layer descriptor;
- an embedded linked artwork document;
- a stable layer name and surface ID;
- a transform matching the manifest print zone;
- editable transparent artwork content that visibly proves the layer works;
- enough metadata to trace the layer back to the generated surface record.

The generator will first produce PSD masters for normal 1024px/2048px source
sizes. It may emit PSB when source dimensions or embedded content exceed PSD
limits. It must never change the extension without writing and reopening the
corresponding format.

The editable masters stay outside the storefront public bundle. Runtime
delivery contains only reviewed preview derivatives, masks, and the manifest
subset needed by the active editor.

## 6. Realtime browser renderer

The browser flow for a user upload is fully local:

1. Decode the file to a bitmap.
2. Run deterministic local brightness/contrast correction.
3. Preserve the original uploaded asset and its metadata.
4. Fit the artwork to the active face print zone.
5. Apply the face geometry:
   - flat normalized transform for apparel;
   - cylindrical mapping for mugs and bottles;
   - panel/dome mapping for caps;
   - distinct sleeve and neck-label mapping.
6. Clip to the print mask.
7. Apply restrained multiply shadow/fold response and highlight/material
   response.
8. Paint protected details above the artwork.
9. Update the Design Studio, export canvas, and cart snapshot from the same
   compositor.

No upload is sent to a render service. No paid AI call is allowed in this
path. The renderer uses immutable source URLs, SHA-based caches, bounded output
sizes, and lazy loading of the active face.

The browser renderer does not pretend to execute Photoshop filters. It
implements the manifest's equivalent geometry and material response locally.
The PSD composite is used as the operator-editable source and as a build-time
visual comparison target.

## 7. Product rules

### T-shirt

Use the 230 GSM unisex crewneck silhouette. Protect collar, sleeve edges,
seams, and hem. All eight colors must share the same normalized silhouette
contract; actual color photos take precedence over tinting when available.

### Long sleeve

Use the cuffed long-sleeve silhouette. Protect collar, cuffs, sleeve edges,
seams, and hem. Left/right sleeves are separate surfaces and cannot silently
reuse front or back.

### Hoodie

Use the pullover kangaroo silhouette. Protect hood, drawstrings, pocket, cuffs,
seams, and hem. The hood and pocket must remain visible above artwork where
their geometry intersects the print region.

### Mug

Support side 1, side 2, and full wrap. Use cylindrical mapping and explicit
seam padding. Protect rim, handle, and base. The full-wrap print zone is wider
than either side zone.

### Cap

Use a cap-panel/dome mapping. Protect brim, crown seams, rear opening, and
strap. Alpha-driven silhouettes are required so shadows do not wrap around a
square source rectangle.

### Water bottle

Use only the white sublimation aluminium blank. Do not tint it or ship the
non-canonical colored bottle sources. Preserve lid, key-ring loop, carabiner,
shoulder, and rounded base details. Use cylindrical body geometry for the
printable area.

## 8. Staged implementation and promotion

All implementation happens in an isolated staging area first. The existing
customer runtime remains unchanged until the final release gates pass.

### Stage 0 — baseline and source freeze

- Verify the GitHub baseline and current storefront behavior.
- Inventory every source, cutout, mask, and checksum.
- Freeze the canonical 188-surface matrix.
- Quarantine legacy raster kits, obsolete 202-surface bottle entries, and any
  unreviewed generated output.

### Stage 1 — six-family Smart Object proof

Build one representative surface per family in staging:

```text
tshirt/white/front
longsleeve/white/front
hoodie/white/front
mug/white/front
cap/white/front
waterbottle/white/front
```

Before generating the rest of the matrix, each representative must reopen with
a real Smart Object artwork layer, render a non-empty proof design, and pass
the browser/PSD placement comparison. A failure stops the stage.

### Stage 2 — full quarantined generation

Generate all 188 masters, previews, masks, and manifest records into a
versioned staging directory. No staged master is copied to `public/`, the
production source kit, or the active resolver during this stage.

### Stage 3 — staging runtime integration

Run the Design Studio against the staged manifest behind an explicit local or
staging-only switch. Test upload, color switching, all faces, curvature,
export, cart snapshot, reload, and recovery behavior. The current production
manifest remains the fallback while this comparison runs.

### Stage 4 — review and release candidate

Produce contact sheets, structural audit JSON, browser/PSD difference reports,
and the 188-surface functional matrix. Reject and regenerate individual
surfaces without invalidating the known-good runtime fallback.

### Stage 5 — controlled promotion

Only after all structural, visual, and functional gates pass:

1. mark the manifest and masters as a reviewed release;
2. promote only runtime-safe previews, masks, and manifest data;
3. switch the resolver to the reviewed manifest;
4. run the production smoke checks;
5. push the verified release to GitHub and confirm the external rollout.

If any stage fails, stop at that stage and keep production on the previous
working runtime. There is no partial production promotion.

## 9. Build commands

The implementation should expose these repeatable stages:

```text
mockups:audit-sources
mockups:prepare
mockups:build --family <family>
mockups:render-previews
mockups:audit-psd
mockups:validate-matrix
mockups:release
```

Suggested output layout:

```text
source-kit/
  sources/
  masks/
  displacement/
  masters/
  embedded-smart-objects/
  previews/
  manifest.json
  audit.json
  README.md
```

The first implementation should build one representative surface from each
family, prove the real Smart Object round trip, and only then fan out to all
188 surfaces. This prevents generating a large invalid kit.

## 10. Free-tier constraints

- Render user uploads in the browser, not on Render or a serverless function.
- Do not add a paid image-generation or Photoshop API dependency.
- Keep source masters and embedded Smart Objects out of `public/`.
- Cache all derived assets by source and manifest checksum.
- Ship optimized 1024px runtime previews and load only the active surface.
- Preserve lossless PNG/PSD/PSB assets in the source kit for regeneration.
- Run expensive matrix validation only on source/manifest changes.
- Bound upload decode and export dimensions to prevent browser memory exhaustion.
- Use immutable release asset names and long cache headers.
- Keep generated missing surfaces quarantined until visual review accepts them.

## 11. Release gates

### Structural gates

- 188/188 canonical surfaces exist.
- 188/188 masters reopen successfully.
- 188/188 artwork layers are real Smart Objects.
- No `PixelLayer` artwork placeholder is accepted.
- PSD/PSB extension matches the actual written document.
- Every source and preview checksum matches the manifest.
- No non-white water-bottle color is present.

### Visual gates

- Artwork appears immediately after upload.
- Browser preview, export, cart snapshot, and PSD composite agree on
  placement and scale.
- No halo, checkerboard, chroma-key fringe, or rectangular spill exists.
- Print-zone clipping is correct.
- Product folds, seams, collars, cuffs, hood, pocket, handle, brim, and bottle
  hardware remain visible.
- Curvature is visible but not exaggerated.
- Front/back and same-color surfaces preserve silhouette and scale.

### Functional gates

- Upload works without a render API after the app has loaded.
- Save, export, processing, and cart failures are recoverable.
- Original uploaded assets survive cart and checkout preparation.
- Product switching refits artwork and remains undoable.
- The full 188-surface resolver/compositor matrix passes.

## 12. Non-goals

- Replacing the existing storefront architecture.
- Shipping editable PSD/PSB files to customers.
- Calling generated geometry “authentic photography.”
- Recoloring the white sublimation bottle.
- Reintroducing the obsolete 202-surface bottle contract.
- Adding a paid AI or hosted rendering dependency.
- Deleting the current runtime fallback before the new masters pass review.

## 13. Completion definition

The system is complete only when the structural, visual, and runtime gates pass
for all six product families. Until then, the current runtime compositor remains
the customer-facing fallback, and generated masters remain quarantined.