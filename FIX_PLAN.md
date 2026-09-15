# Trynext Lifestyle — Fix Plan
**Date:** June 18, 2026  
**Based on:** Design Studio audit + user-reported issues

---

## Root Causes Identified

### R1 — Image layers missing blend mode (FIXED)
**File:** `DesignStudio.tsx` ~line 2880  
**Cause:** `<image>` SVG elements had no `mix-blend-mode` — designs looked "pasted on" fabric  
**Fix:** Compute garment luminance; if > 0.58 (light garment) apply `mixBlendMode: "multiply"` so white halos disappear and ink looks absorbed into fabric

### R2 — No "Fit / Fill / Center" quick actions (FIXED)
**File:** `DesignStudio.tsx` mobile toolbar + desktop panel  
**Cause:** Users had to manually drag-resize to position designs — difficult on mobile  
**Fix:**  
- **Center**: `transform: { x:0, y:0 }` — snaps to print zone center  
- **Fit**: `scale = min(0.90, pz.h * 0.90 * aspect / pz.w)` — fills 90%, no overflow  
- **Fill**: `scale = max(1.0, pz.h * aspect / pz.w)` — covers full print zone  
Added to both mobile quick-action toolbar (Maximize2 icon) and desktop image properties panel

### R3 — Undo/Redo hidden on mobile (FIXED)
**File:** `DesignStudio.tsx` ~line 2356  
**Cause:** `hidden sm:flex` meant users couldn't undo mistakes on phone  
**Fix:** Changed to `flex` (always visible) with `w-3.5 sm:w-4` responsive icon size

### R4 — Quick product tabs cramped on mobile (FIXED)
**File:** `DesignStudio.tsx` `QUICK_PRODUCT_IDS`  
**Cause:** 4 tabs (T-Shirt, Hoodie, Long Sleeve, Mug) + More = 5 columns on ~375px screen  
**Fix:** Reduced to 3 tabs (T-Shirt, Hoodie, Mug) + More; Long Sleeve accessible via picker

### R5 — Design Studio designs look pasted on (FIXED)
**File:** `DesignStudio.tsx` ~line 2880 (image layer rendering)  
**Same as R1** — multiply blend mode fix resolves the "pasted rectangle" visual

---

## Architecture Findings (No Change Needed)

| Component | Finding |
|---|---|
| Product template registry | ✅ Single source of truth — `PRODUCTS` array in `mockups.tsx` |
| Front/back separate assets | ✅ `BASE_BY_CATEGORY` has front/back/dark variants |
| Canvas state on product switch | ✅ Per-product layer isolation via `perProductLayersRef` |
| Colour tinting | ✅ SVG filter on cutout PNG — only garment pixels affected |
| Shadow/highlight/texture | ✅ Three-layer drop shadow + vignette + highlight in `GarmentSVG` |
| Cylinder depth | ✅ `cyl-l` + `cyl-r` gradients for mug/bottle |
| Auto-center on upload | ✅ `x:0, y:0` = print zone center; smart scale at 85% fill |
| Design propagation | ✅ Uploaded design copies to all products at scaled fit |

---

## Pending Improvements (Next Sprint)

### P1 — Dark mockup photos for Long Sleeve (medium effort)
Add `black-longsleeve-front.png` and `black-longsleeve-back.png` assets  
Update `BASE_BY_CATEGORY.longsleeve` to include `darkFront` and `darkBack`  
**Impact:** Better dark-color rendering for Long Sleeve product  
**Effort:** Requires photography asset; 30min dev once assets exist

### P2 — Design Studio empty state (low effort)
Show prompt when no layers: "Upload your artwork or type text to begin"  
Add 3-4 sample quick templates (heart, star, name badge)  
**Impact:** Reduces confusion for first-time users  
**Effort:** ~2 hours

### P3 — Template gallery (medium effort)
Pre-built designs: Birthday, Corporate Logo, Couple, Sports Team  
One-click applies layers with placeholder text  
**Impact:** Major UX improvement for non-designers  
**Effort:** ~4 hours

### P4 — Cap front panel micro-highlight (low effort)
Add subtle linear gradient highlight over cap brim area in `GarmentSVG`  
Preserves stitching appearance  
**Effort:** ~1 hour

### P5 — Deployment health endpoint (low effort)
Add `/api/health` returning `{ status:"ok", db:"ok", version }` on API server  
Wire into CF Pages functions for periodic health check  
**Effort:** ~30 min

---

## Rollback Plan

All changes are in GitHub `main` branch. CF Pages auto-deploys on push.

To rollback:
1. Go to CF Pages dashboard → Deployments → click any previous deployment → "Rollback to this deployment"
2. Or revert the specific commit via GitHub REST API and force CF Pages to redeploy

The Neon database has not been modified in this session — no migration rollback needed.

---

## Testing Checklist

- [x] TypeScript compiles clean (`tsc --noEmit --skipLibCheck` exit 0)
- [x] Light garment + upload design → multiply blend removes white halo
- [x] Dark garment + upload design → normal blend, design fully visible
- [x] Mobile: Fit button in layer toolbar → design fits print zone at 90%
- [x] Desktop: Fit/Fill/Center buttons in image properties panel
- [x] Mobile header: Undo/Redo buttons visible and functional
- [x] Quick product tabs: 3 tabs + More (no cramping on 375px screen)
- [x] Product switch: layers isolated per product, canvas clears
- [x] Front/back: separate mockup images, separate layer sets
- [x] Color change: only garment fabric changes, not canvas background
