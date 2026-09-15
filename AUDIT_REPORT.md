# Trynext Lifestyle — Design Studio Audit Report
**Date:** June 18, 2026  
**Engineer:** Senior Full-Stack Audit  
**Branch:** `main` · Commit: `d89f852`

---

## 1. Infrastructure Status

| Area | Status | Notes |
|---|---|---|
| Git branch | ✅ `main` | Direct push via GitHub REST API |
| CF Pages | ✅ Connected | `trynext.pages.dev` → `trynext.pages.dev` |
| CF Pages build cmd | ✅ `pnpm --filter @workspace/trynext-storefront run build` | Output: `dist/` |
| Render API | ✅ Running | Express server |
| Neon DB | ✅ Connected | `DATABASE_URL_MAIN` in env |
| Upstash Redis | ❓ Not confirmed in code | May be unused |

---

## 2. Product Template System

**Finding: ALREADY UNIFIED** — single source of truth exists.

- All product definitions live in `artifacts/trynex-storefront/src/pages/design-studio/mockups.tsx`
- `PRODUCTS` array is the only definition, imported everywhere
- `BASE_BY_CATEGORY` maps each product to its front/back/dark/cutout PNG assets
- Print zones calibrated per-product in the same file

**Assets present:**
- ✅ T-Shirt: white-front, white-back, white-front-cutout, white-back-cutout, black-front, black-back, black-front-cutout, black-back-cutout
- ✅ Hoodie: white-front, white-back, white-front-cutout, white-back-cutout, black-front, black-back, black-front-cutout, black-back-cutout
- ✅ Long Sleeve: white-front, white-back, white-front-cutout, white-back-cutout (NO dark variants)
- ✅ Mug: white-front, white-front-cutout, black-front (uses flip trick for right side)
- ✅ Cap: white-front, white-front-cutout, black-front (no back needed)
- ✅ Water Bottle: white-front, white-front-cutout

**Asset gaps:**
- ⚠️ Long Sleeve: no black/dark photo → dark colors use SVG tint on cutout (acceptable quality)
- ⚠️ Mug: no separate left/right photo → right side flipped horizontally (acceptable)
- ⚠️ Cap: no dark cutouts → dark colors use tint on white cutout (acceptable)

---

## 3. Mockup Engine Analysis

**Finding: SOPHISTICATED AND CORRECT** — layer order is already professional:

```
1. Studio background (#c9c4bc warm grey)
2. Product base photo (white or black variant)
3. SVG colour-tint filter (via cutout PNG, garment pixels only)
4. Design layers (uploaded images + text) clipped to print zone
5. mix-blend-mode:multiply on image layers for light garments  ← FIXED June 18
6. Cylinder edge shadows for mug/bottle (cyl-l, cyl-r gradients)
7. Vignette + shoulder highlight + bottom shadow overlays
8. Print zone corner brackets (only when editing)
9. Selection handles
```

**Issues fixed in this session:**
- ✅ Image layers missing `mix-blend-mode:multiply` for light garments — FIXED
- ✅ "Fit to Print Area" / "Center" / "Fill" actions missing — ADDED
- ✅ Undo/Redo hidden on mobile — MADE VISIBLE
- ✅ Quick product tabs 4+More = cramped on mobile — REDUCED to 3+More

---

## 4. Canvas State Management

**Finding: CORRECTLY IMPLEMENTED**

- Per-product layer isolation: `perProductLayersRef.current[productId]` stores layers/history per product
- Product switch resets: `setLayers(newLayers)`, `setActiveFace("front")`, `setSelectedLayerId(null)`
- Design propagation on upload: scales design to each product's print zone ratio
- Front/back independence: separate layer arrays filtered by `face` attribute
- Undo/redo per session: `historyRef.current` with stack/index pattern

---

## 5. Front/Back View Logic

**Finding: CORRECTLY IMPLEMENTED**

- Apparel (tshirt/hoodie/longsleeve): separate `front` and `back` PNG assets
- Back view uses distinct `backSrc` / `base.back` / `base.backCutout` assets
- Mug: right side uses horizontal flip of same PNG (handle direction preserved)
- Design layers filtered by `(l.face ?? "front") === activeFace`
- "Apply front design to back" not auto-applied — user must explicitly act

---

## 6. Colour System

**Finding: CORRECTLY IMPLEMENTED**

- White/light garments: `mix-blend-mode:multiply` on full photo (fabric texture preserved)
- Non-white non-black garments: SVG tint filter on transparent-BG cutout PNG only
- Near-black garments: dedicated black photo used directly
- Colour change does NOT affect canvas background (always `#c9c4bc`)

---

## 7. Mobile UI Audit

| Issue | Status |
|---|---|
| WhatsApp button overlaps studio | ✅ FIXED (hidden on /design-studio) |
| Mobile FAB overlaps canvas | ✅ FIXED (raised to safe-area + 88px) |
| Undo/Redo hidden on mobile | ✅ FIXED (always visible now) |
| 4 quick-tabs cramped on small screens | ✅ FIXED (reduced to 3 tabs + More) |
| "Fit to Print Area" not available on mobile | ✅ FIXED (added to mobile toolbar) |
| Print area warning too aggressive | ✅ FIXED (BLEED_TOL=8, tolerances improved) |
| Full tools panel: bottom sheet UX | ✅ Working — slide-up bottom sheet |

---

## 8. SEO Audit

| Page | Status |
|---|---|
| Homepage keyword section | ✅ Added June 18 |
| Footer Popular Searches | ✅ Added June 18 |
| 6 keyword landing pages | ✅ All routed and populated |
| LocalBusiness JSON-LD on keyword pages | ✅ Added June 18 |
| FAQPage + BreadcrumbList + CollectionPage | ✅ Already present |

---

## 9. Remaining Recommendations (not yet implemented)

1. **Long sleeve dark mockup photos** — Add `black-longsleeve-front.png` and `black-longsleeve-back.png` for higher-quality dark colorway rendering
2. **Mug separate left/right photos** — Add dedicated right-side mug photo instead of horizontal flip
3. **Cap dark cutout PNG** — Add `black-cap-front-cutout.png` for better dark color rendering
4. **Cap front panel shadow** — Slight SVG highlight/shadow gradient over the front panel brim area
5. **Design Studio empty state** — Show "Upload your design to get started" prompt with sample designs when canvas is empty
6. **Pre-filled design templates gallery** — Birthday, corporate, couple, sports templates to one-click start
7. **Watermark/DRM** — Prevent right-click save on design studio canvas

---

## 10. Conclusion

The codebase is production-quality. The mockup engine, colour system, state management, and product template architecture are all well-implemented. The main gaps were UX polish (fit/fill actions, mobile undo visibility) and SEO internal linking — all addressed in this session.
