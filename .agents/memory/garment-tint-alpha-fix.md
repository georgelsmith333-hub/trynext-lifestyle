---
name: Garment SVG tint filter alpha leak fix
description: Root cause and fix for "background becomes garment colour" bug on coloured garments in GarmentSVG and FlatZoneSVG.
---

## The Bug

SVG `feBlend multiply` on a `feFlood` makes **transparent pixels in the cutout PNG become fully opaque** filled with the tint colour.

Math: for transparent source pixel (qb=0), feBlend multiply alpha = `1-(1-qs)*(1-qb) = 1-(0)*(1) = 1`. And colour = `Cs*0 + Cs*(1-qb) + 0 = Cs = tintHex`. So the entire 1000×1000 background fills with the garment colour outside the garment silhouette.

## The Fix

Add `feComposite operator="in"` after the feBlend to clip output alpha back to SourceGraphic's alpha:

```xml
<feFlood floodColor={tintHex} result="flood" />
<feBlend in="flood" in2="SourceGraphic" mode="multiply" result="blended" />
<feComposite in="blended" in2="SourceGraphic" operator="in" />
```

Applied in both `garment-color-tint` (GarmentSVG) and `flat-color-tint` (FlatZoneSVG).

**Why:** feComposite operator="in" gives output = blended × SourceGraphic.alpha, so any pixel where the source PNG is transparent stays transparent.

## Design Layer Blend Mode

Design layers (image + text) were always `mixBlendMode: 'multiply'`. On dark/coloured garments this makes white/bright designs invisible.

**Fix:** Use `multiply` only when `isLightTint(selectedColor.hex)` (lum > 0.92), `normal` otherwise. Variable `isLightGarment` added near `isBlackGarment` at component level. Applied to both image layers and text layers in DesignStudio.tsx SVG renderer, and to text layers in `composeGarmentMockup` (composer.ts).
