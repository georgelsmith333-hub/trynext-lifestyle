---
name: Waterbottle cutout file
description: Two similarly-named waterbottle PNG files exist; only one has correct transparency.
---

# Waterbottle Cutout File

Two files exist in `public/mockups/`:
- `white-waterbottle-cutout.png` — **206KB** — same size as `white-waterbottle-front.png` — NO transparency (solid white background)
- `white-waterbottle-front-cutout.png` — **228KB** — proper transparent background cutout ✅

## Rule
Always use `white-waterbottle-front-cutout.png` (the 228KB one) as `waterBottleCutout` / `frontCutout` / `waterBottleSrc`.

**Why:** The cylinder shadow filter in mockups.tsx operates on the alpha channel. Without transparency, the shadow follows a white rectangle instead of the bottle outline — looks wrong.

**Files to check if the wrong file creeps back in:**
- `artifacts/trynex-storefront/src/pages/design-studio/mockups.tsx` (waterBottleCutout constant)
- `artifacts/trynex-storefront/src/components/CartViewer3D.tsx` (waterBottleSrc constant)
