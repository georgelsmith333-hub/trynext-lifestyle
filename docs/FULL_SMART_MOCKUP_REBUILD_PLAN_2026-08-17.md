# Full Smart Mockup Rebuild Plan

## Scope

The active editor currently has 202 declared family/color/view surfaces across six families. Only 108 source-kit-v3 front/back/side surfaces exist; 94 declared surfaces are missing, consisting of apparel sleeve and neck-label views plus mug wrap views. The current resolver therefore cannot honestly claim a complete smart-mockup matrix.

| Family | Colors | Required views | Required surfaces | Existing v3 surfaces | Missing surfaces |
|---|---:|---|---:|---:|---:|
| T-Shirt | 8 | Front, Back, Left Sleeve, Right Sleeve, Neck Label | 40 | 16 | 24 |
| Long Sleeve | 10 | Front, Back, Left Sleeve, Right Sleeve, Neck Label | 50 | 20 | 30 |
| Hoodie | 10 | Front, Back, Left Sleeve, Right Sleeve, Neck Label | 50 | 20 | 30 |
| Mug | 10 | Side 1, Side 2, Full Wrap | 30 | 20 | 10 |
| Cap | 8 | Front, Back | 16 | 16 | 0 |
| Water Bottle | 8 | Front, Back | 16 | 16 | 0 |
| **Total** |  |  | **202** | **108** | **94** |

## Replacement contract

Every required surface must have a color-scoped asset key, a clean alpha or intentional opaque background contract, a 1000×1000 normalized canvas, a measured visible bounding box, a family-specific silhouette identifier, a front/back or side-pair identifier, and one canonical print-zone coordinate space. A missing view may not silently reuse a different family or a different garment silhouette.

Generated assets are accepted only after a lightweight visual check confirms the correct product construction, matched placement, no checkerboard, no chroma-key fringe, no cropped details, and no front/back size drift. The first generated batch was quarantined because the transparent-background result visibly contained magenta chroma-key artifacts; those files must never enter the runtime path.

## Runtime replacement order

The safe migration order is: complete and validate the base master pair for each family; derive color variants while preserving the same silhouette and normalized frame; create family-specific secondary views; generate a manifest for every surface; replace resolver branches with a single manifest lookup; remove legacy tint/source-kit fallback branches; then run the 202-surface visual and functional matrix.

## Release gate

This historical v4 plan used a 202-surface count because it included eight
non-canonical water-bottle colors. The current release contract is the
intentional 188-surface Smart v9 matrix defined in
`docs/superpowers/specs/2026-09-01-six-family-psd-smart-mockup-design.md`.
The release must fail if any required surface is missing, if two unrelated
families share an asset key, if front/back frames differ beyond the accepted
tolerance, if a required file contains a baked checkerboard or chroma-key
artifact, or if a resolver returns a legacy fallback. The active release gate
is `scripts/validate-mockup-matrix.mjs`.
