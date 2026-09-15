# Trynext Lifestyle Mockup Rebuild — Implementation Plan

**Approved design:** `docs/superpowers/specs/2026-09-03-mockup-rebuild-design.md`

## Objective

Implement the approved six-family mockup rebuild and Design Studio reliability
pass while keeping the current reviewed runtime customer-facing. The work must
produce auditable source/master metadata, a trustworthy shared compositor, and a
dev/staging-only comparison path. Smart v9 remains inactive until the full
structural, visual, and runtime gates are accepted.

## Scope boundaries

- Work only in source-kit tooling, mockup manifest/resolver/compositor, Design
  Studio interaction components, and their tests/evidence.
- Do not change API order/payment behavior, mobile commerce behavior, technical
  identifiers, or production routes.
- Do not add paid AI, Photoshop API, or hosted rendering dependencies.
- Do not copy staged candidates into the active resolver or public runtime as a
  side effect of generation or testing.
- Preserve original uploaded artwork and all existing cart/checkout metadata.

## Ordered milestones

### Milestone 0 — Baseline and source freeze

1. Record the current active resolver/release state and the 188-surface matrix.
2. Inventory `attached_assets/trynext-mockup-source-kit`, public staged assets,
   masks, previews, and existing PSD/PSB outputs.
3. Run the current source, Smart Object, canonical matrix, storefront test,
   typecheck, and build checks before editing.
4. Reconcile the two known water-bottle hash records as a review finding; do not
   silently choose one or mutate production data.

**Stop condition:** If the active baseline or source manifest is inconsistent,
write the discrepancy to the audit output and keep the runtime unchanged.

### Milestone 1 — Source preflight and surface status

**Primary areas**

- `tools/build-smartobject-mockups.mjs`
- `tools/audit_psd_masters.py`
- `scripts/audit_trynext_mockups.py`
- `artifacts/trynex-storefront/src/pages/design-studio/smart-mockup-manifest.ts`
- source-kit manifests and review reports under `attached_assets`/`dist-mockups`

1. Add reusable preflight checks for dimensions, color mode, alpha bounds,
   opaque checkerboard/matte backgrounds, halo/fringe signals, and source/cutout
   frame agreement.
2. Make checksum, provenance, master format, master status, and review status
   explicit for every surface.
3. Ensure failed or ambiguous surfaces are represented as rejected/unverified,
   not substituted with a front view or an unrelated color.
4. Keep white water-bottle sources immutable and non-tintable.
5. Emit machine-readable per-surface audit output suitable for the 188-surface
   review report.

**Tests/evidence:** unit fixtures for valid alpha, opaque checkerboard,
transparent cutout, halo, missing source, wrong dimensions, and water-bottle
color rejection.

**Stop condition:** Any preflight false positive that would accept a
rectangular/matte source blocks matrix generation until corrected.

### Milestone 2 — Genuine PSD/PSB representative proof

**Primary areas**

- `tools/build-smartobject-mockups.mjs`
- `tools/validate-smartobject-release.mjs`
- `tools/audit_psd_masters.py`
- `scripts/extract_psd_layers.py`
- `dist-mockups/staging/`

1. Align the builder's layer names/order, protected-detail layer, print-zone
   mask, placement guide, shadow map, highlight map, and embedded artwork
   metadata with the approved master contract.
2. Verify that the artwork layer is a genuine editable Smart Object with a
   non-empty proof design and stable surface ID.
3. Select PSD vs PSB from actual document limits and verify the written extension
   by reopening the file.
4. Build exactly one representative front surface per family:
   `tshirt`, `longsleeve`, `hoodie`, `mug`, `cap`, and `waterbottle`.
5. Compare the browser proof composite and PSD composite for placement, scale,
   alpha, and protected details before generating the rest of the matrix.

**Tests/evidence:** six representative masters reopen; each contains one real
Smart Object and the expected layer contract; browser/PSD proof report is
generated; failure leaves `masterStatus: manifest-only`.

**Stop condition:** Do not fan out to 188 surfaces if any representative is only
 a pixel-layer placeholder, cannot reopen, or has an extension/format mismatch.

### Milestone 3 — Shared compositor contract

**Primary areas**

- `artifacts/trynex-storefront/src/pages/design-studio/composer.ts`
- `artifacts/trynex-storefront/src/pages/design-studio/mockups.tsx`
- `artifacts/trynex-storefront/src/pages/design-studio/smart-mockup-manifest.ts`
- `artifacts/trynex-storefront/src/pages/design-studio/ProductViewer3D.tsx`
- cart/preview consumers that call the shared composition functions

1. Make source type (`opaque-photo` vs `transparent-cutout`), tint permission,
   silhouette shadow permission, print-zone shape, protected details, and
   material effects explicit inputs.
2. Keep one normalized transform path for live preview, export, cart snapshot,
   and 3D texture.
3. Correct alpha clipping so checkerboard/matte pixels never become product
   color, shadow, or rectangular artwork spill.
4. Apply product-specific zones:
   apparel body/sleeve/neck, mirrored mug side zones and wider wrap, cap panel,
   and bottle body.
5. Bound cylinder/dome warp and protect seams, handles, brim, hardware, hood,
   pocket, collar, cuffs, and hems.
6. Remove duplicate full-frame shading paths; allow reviewed material effects
   only within the print zone and only for the intended source type.
7. Preserve exact color-photo assets and fail closed for ambiguous catalog shades.

**Tests/evidence:** compositor fixtures for all six families, light/dark/color
states, front/back/special faces, alpha edges, text, and curved rendering;
snapshot or pixel assertions for no duplicate silhouette/rectangle; product
switch transform assertions.

**Stop condition:** Any change that alters the fallback resolver or causes
preview/export/cart geometry to diverge is reverted before continuing.

### Milestone 4 — Staged review integration

**Primary areas**

- `artifacts/trynex-storefront/src/pages/studio/DesignStudioV2.tsx`
- `artifacts/trynex-storefront/src/pages/design-studio/mockups.tsx`
- staged release/candidate modules under
  `artifacts/trynex-storefront/src/pages/design-studio/`
- relevant Vite environment/configuration only if required

1. Add an explicit dev/staging review flag such as
   `VITE_MOCKUP_REVIEW=staged`.
2. Require complete candidate readiness before staged resolution; invalid or
   absent flags use the current runtime fallback.
3. Show a visible staged-review marker and source/release status to reviewers.
4. Keep runtime overrides scoped to accepted, ready records and avoid changing
   the production default.
5. Ensure URL/query entry points cannot activate staged assets by themselves in
   a normal customer build.

**Tests/evidence:** flag absent, invalid, incomplete, and complete cases;
fallback resolver remains unchanged in the first three; staged marker appears
only in the explicit review configuration.

### Milestone 5 — Upload and image-processing reliability

**Primary areas**

- `artifacts/trynex-storefront/src/pages/studio/DesignStudioV2.tsx`
- `artifacts/trynex-storefront/src/pages/studio/panels/ImagePanel.tsx`
- `artifacts/trynex-storefront/src/pages/studio/types.ts`
- `artifacts/trynex-storefront/src/pages/studio/autoFit.ts`
- `artifacts/trynex-storefront/src/pages/studio/studio-regressions.test.ts`
- `artifacts/trynex-storefront/src/pages/studio/DesignStudioV2.mobile-workflow.test.ts`

1. Convert upload/decode/render/optional-processing into explicit states with
   visible loading and retryable error branches.
2. Keep the original file immutable and preserve the working layer if decode,
   render, background removal, or upscale fails.
3. Bound decode/export dimensions and avoid replacing a valid preview with a
   silent placeholder.
4. Keep background removal optional, timeout-bounded, cancellable/retryable, and
   validate that a result actually contains transparency.
5. Keep existing permitted server/client processing paths, but do not add a
   paid service or make first preview depend on them.
6. Make Auto-fix/Enhance reversible, non-cumulative, client-controlled, and
   consistent between preview and export.
7. Ensure the selected face's actual print zone is used for initial fitting.

**Tests/evidence:** invalid file, oversized file, decode error, server timeout,
client fallback, no-transparency result, retry success, original preservation,
reset/reversible enhancement, and first-preview behavior.

### Milestone 6 — Text, Auto-optimize, and interaction parity

**Primary areas**

- `artifacts/trynex-storefront/src/pages/studio/CanvasArea.tsx`
- `artifacts/trynex-storefront/src/pages/studio/DesignLayer.tsx`
- `artifacts/trynex-storefront/src/pages/studio/panels/TextPanel.tsx`
- `artifacts/trynex-storefront/src/pages/studio/toolbar/`
- `artifacts/trynex-storefront/src/pages/studio/autoFit.ts`
- `artifacts/trynex-storefront/src/pages/studio/DesignStudioV2.tsx`

1. Make new text layers immediately visible, selected, legible, and editable.
2. Align text metrics, color/blend behavior, stroke/shadow, and visibility
   between Konva editing and Canvas export.
3. Add or correct Auto-optimize so it uses the active face zone, curvature inset,
   aspect-ratio rules, and undo history without erasing intentional rotation or
   flip state.
4. Preserve product/face switching refit behavior and studio metadata.
5. Verify mouse, touch, and pen drag/scale/rotate/select interactions without
   touch-only pointer restrictions.
6. Ensure overlays use the shared scroll-lock helper and responsive panels have
   accessible labels, focus, and coarse-pointer hit areas.

**Tests/evidence:** text creation/visibility/contrast, Auto-optimize/undo,
front-to-back and product-switch refit, drag/rotate/flip on pointer types,
keyboard focus, and scroll-lock composition.

### Milestone 7 — Responsive review and full candidate matrix

1. Validate desktop, tablet, and narrow mobile layouts without changing the
   normalized 1000×1000 compositor coordinate space.
2. Generate the quarantined 188-surface candidate only after Milestones 1–3
   pass.
3. Run source, PSD, asset checksum, and active matrix validators.
4. Produce family contact sheets and browser/PSD comparison reports.
5. Review representative and failure-prone evidence from the ten supplied
   screenshots plus new controlled captures for T-shirt and long sleeve.
6. Record per-surface accept/reject status; rejected surfaces stay quarantined.

### Milestone 8 — Final verification and handoff

1. Run focused storefront tests and all mockup/studio regression suites.
2. Run storefront, API, mobile, script, and full-workspace typechecks as
   applicable to changed files.
3. Run the storefront production build.
4. Run `pnpm run validate:mockups`, the Smart Object release validator, and PSD
   audit tools.
5. Restart the managed workflow once after the final code/toolchain changes.
6. Inspect workflow/browser logs and proxied health/catalog/settings routes.
7. Confirm no order/payment/production records were created or mutated.
8. Update `AGENT_HANDOFF.md` with the actual checkpoint, evidence, and remaining
   release blockers.
9. Promote nothing unless all structural, visual, and functional gates are
   explicitly accepted.

## File ownership and reconciliation

This work is intentionally serialized because the compositor, resolver, source
manifest, and Design Studio all share geometry contracts. Do not make parallel
edits to these areas.

| Lane | Primary responsibility | Reconcile before |
| --- | --- | --- |
| Source-kit | preflight, manifests, PSD/PSB builder/auditor | compositor integration |
| Runtime rendering | resolver, manifest consumer, compositor, 3D/cart callers | studio interaction work |
| Studio reliability | upload states, image tools, text, auto-fit, pointer/responsive behavior | full matrix review |
| Verification | validators, contact sheets, comparison/evidence reports | release decision |

After each lane, inspect the diff and run the cheapest relevant tests. Before
moving to the next lane, confirm that the fallback resolver and existing
customer-facing behavior remain unchanged.

## Required verification commands

Use the repository's existing commands where possible:

```text
pnpm run mockups:audit-sources
pnpm run mockups:build -- --only <family>
pnpm run mockups:audit-psd
pnpm run mockups:validate-matrix
pnpm run validate:mockups
pnpm --filter @workspace/trynext-storefront test
pnpm --filter @workspace/trynext-storefront run typecheck
pnpm --filter @workspace/trynext-storefront run build
pnpm run typecheck
```

If a command is unavailable or a tool cannot prove a gate, record that
limitation; do not replace it with a weaker claim.

## Acceptance gates

- The active customer resolver is unchanged until controlled acceptance.
- Six representative PSD/PSB masters pass true Smart Object reopen and compare
  correctly with the browser compositor before matrix generation.
- All 188 candidate surfaces have explicit status, provenance, checksums, and
  no invalid alpha/matte/rectangular spill.
- Preview/export/cart/3D use the same print-zone and transform contract.
- Upload, background removal, Enhance, Auto-fix, text, Auto-optimize, switching,
  and retry states preserve user work.
- Curved products show restrained, product-specific curvature and protected
  details.
- Desktop/tablet/mobile interactions pass without hover or mouse-only behavior.
- Typechecks, tests, build, validators, workflow restart, and safe proxied smoke
  checks pass.
- No Smart v9 production promotion occurs without explicit visual/runtime
  acceptance evidence.