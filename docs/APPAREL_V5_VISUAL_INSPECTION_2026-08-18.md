# Apparel v5 Visual and Inventory Inspection

## Scope and method

This inspection covered all 140 newly generated apparel-v5 surfaces across the T-Shirt, Long Sleeve, and Hoodie families. Every configured color was checked across front, back, left sleeve, right sleeve, and neck-label views. The corresponding smart-v4 promotion was compared byte-for-byte, and both inventory JSON files were parsed and compared against the filesystem.

The visual review used the existing apparel-v5 contact sheet and a new full inspection grid covering every color/view combination. Programmatic checks measured dimensions, PNG mode, alpha-channel presence, silhouette bounding boxes, duplicate hashes, luminance variation, and local texture variation.

## Structural results

| Check | Result |
|---|---:|
| T-Shirt v5 surfaces | 40/40 present |
| Long Sleeve v5 surfaces | 50/50 present |
| Hoodie v5 surfaces | 50/50 present |
| Apparel v5 total | 140/140 present |
| Smart-v4 promoted surfaces | 140/140 present |
| Surfaces with wrong dimensions | 0 |
| Surfaces without usable alpha | 0 |
| Duplicate file hashes within T-Shirt | 0 |
| Duplicate file hashes within Long Sleeve | 0 |
| Duplicate file hashes within Hoodie | 0 |
| v5-to-smart-v4 byte mismatches | 0 |
| Summary mismatch between the two inventory JSON files | 0 |

All inspected files are 1024×1024 RGBA PNGs with a non-empty alpha silhouette. The front/back silhouettes are internally consistent by family: each color has the same front/back alpha bounding boxes and the same area ratios as the corresponding master geometry. That confirms technical consistency, not photographic realism.

## Inventory-contract defect

The inventory summaries agree with each other, but the row-level contract is stale. All **140 apparel rows** in `FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json` still declare `activeExpected` paths under `/mockups/source-kit-v3/...`. The active runtime and promoted files are under `/mockups/smart-v4/...`, while the new source tree is `/mockups/apparel-v5/...`.

This is a documentation and audit-contract defect. It does not mean the PNGs are missing, because the filesystem and deployment manifest contain the files, but it means the inventory JSON cannot currently be used as an accurate source-of-truth for the active runtime. The inventory should be regenerated so `activeExpected` points to `/mockups/smart-v4/...` and a separate `sourcePath` or `generatedFrom` field records `/mockups/apparel-v5/...`.

## Visual findings

The full inspection grid shows that the white master surfaces retain the strongest garment photography: folds, seams, cuffs, collars, hood construction, and tonal shading are visible. The colored front and back surfaces preserve the correct family silhouettes and color mapping, but most colored surfaces are effectively flat color fills with only weak garment texture. This is especially visible on the T-Shirt and on the Long Sleeve/Hoodie secondary views.

The sleeve and neck-label surfaces are not realistic product-photography views. They are correctly derived geometric crops and are technically consistent, but the full grid shows that most are simple triangular or rectangular panels with limited curvature, fold detail, or perspective cues. The neck-label surfaces resemble abstract collar crops rather than finished sewn-label photography. The Hoodie neck-label view is the most plausible because it retains the hood opening and interior construction; the T-Shirt and Long Sleeve neck-labels are much flatter.

The visual texture analysis flagged **40/40 T-Shirt surfaces**, **45/50 Long Sleeve surfaces**, and **42/50 Hoodie surfaces** for very low local texture and/or low luminance variation. The flags are strongest on non-white colors and all secondary views. These are not alpha or path failures; they are realism-quality findings. The colorization pipeline appears to preserve silhouette and nominal shading but not enough natural fabric microtexture to meet an “ultra-premium” photorealistic mockup standard.

The files are not duplicated byte-for-byte, and their front/back geometry is consistent. However, the repeated texture and luminance statistics across colors indicate that color variants are derived from a shared white master rather than being independently photographed or independently rendered with color-specific fabric response. That is acceptable for a technical placeholder matrix, but it is not equivalent to a complete premium PSD/PSB smart-object mockup system.

## Release recommendation

The apparel-v5 set is **technically complete but visually not yet ultra-premium**. It is safe as a consistent runtime fallback because all files exist, have correct dimensions and alpha, and map one-to-one into smart-v4. It should not be described as final photorealistic apparel photography.

Before calling the apparel rebuild final, the next corrective pass should replace the flat secondary crops and weakly textured colorizations with true family-specific smart-object renders or independently rendered color/view masters. The inventory JSON should also be regenerated immediately to eliminate the stale `source-kit-v3` active paths.

## Evidence files

- `docs/full-apparel-v5-inspection.png` — all 140 apparel surfaces arranged by family, color, and view.
- `docs/apparel-v5-contact-sheet.png` — compact representative visual sheet.
- `/tmp/apparel_inventory_inspection.json` — structural filesystem and promotion inspection output.
- `/tmp/apparel_visual_analysis.json` — visual metrics and stale inventory-row analysis.
- `docs/APPAREL_REBUILD_INVENTORY_2026-08-17.json` — rebuild inventory summary.
- `docs/FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json` — full matrix inventory with stale row paths identified above.
