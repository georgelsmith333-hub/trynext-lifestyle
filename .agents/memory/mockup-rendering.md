---
name: Mockup rendering approach
description: How Design Studio GarmentSVG renders product photos and applies color
---

## Current approach

The canonical resolver distinguishes exact opaque source-kit photos from transparent
cutouts. Exact-color source-kit photos are used directly for 2D previews, exports,
thumbnails, carts, and fallback compositions; they are never tinted, alpha-masked, or
given silhouette shadows. Transparent derivatives are reserved for billboard/3D and
silhouette rendering, and curated fallback cutouts are tinted only when the resolver
explicitly says `requiresTint`.

**Photo selection:**
- Exact source-kit color/face pair → normalized opaque photo for 2D/export/cart
- Transparent source-kit derivative → 3D billboard/shadow source, no tint
- Curated near-black asset → dedicated dark photo/cutout, no tint
- Curated non-light fallback → transparent cutout + explicit resolver tint
- Light/white fallback → transparent or exact white source, no tint

**Colored garment rendering (the correct approach):**

Apply `filter` and `mask` DIRECTLY on the `<image>` element (NOT a separate `<rect>`).
SVG guarantees: filter runs first, mask second. No isolation context issues.

```tsx
// In <defs>:
<filter id="garment-color-tint" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
  <feFlood floodColor={tintHex} result="flood" />
  <feBlend in="flood" in2="SourceGraphic" mode="multiply" />
</filter>
<mask id="garment-silhouette">
  <image href={cutoutMaskSrc} x={0} y={0} width={1000} height={1000} preserveAspectRatio="xMidYMid meet"/>
</mask>

// Garment image:
<image
  href={basePhotoSrc}        // full white garment photo (has natural depth/shadows)
  mask="url(#garment-silhouette)"     // clips to garment silhouette
  filter="url(#garment-color-tint)"  // multiplies tint color with photo
/>
```

Result: only a transparent fallback's garment pixels are multiplied by the requested
color; exact source-kit pixels retain their reviewed photographic color and lighting.

**CRITICAL — Do NOT use CSS `mix-blend-mode: multiply` on a `<rect>` in SVG.**
The `<g filter="url(#...)">` wrapper around the base image creates an isolated compositing
context. Any `mix-blend-mode` on a sibling `<rect>` blends against that isolated context,
NOT the raw photo pixels — making colored garments appear completely flat/opaque.

**Mug right side:**
Wrap inside `<g transform="translate(1000,0) scale(-1,1)">`. SVG evaluates the mask
in the TRANSFORMED coordinate space, so the same `#garment-silhouette` mask works
correctly for both left and right side views — no separate flipped mask needed.

**Background:** `#EFEFED` (clean off-white)
**Drop shadow:** `feDropShadow dx=0 dy=5 stdDeviation=12 floodColor=rgba(0,0,0,0.18)`
**Hoodie cutouts:** Use `-new` versions (`white-hoodie-front-cutout-new.png`, `white-hoodie-back-cutout-new.png`)
**Longsleeve dark variants:** `black-longsleeve-front/back-cutout.png`

**Why:** CSS mix-blend-mode in SVG is broken whenever a parent has a `filter` attribute — the
filter creates an isolated compositing layer. SVG-native feBlend on the element itself bypasses
this completely and is guaranteed cross-browser.

**How to apply:** Keep `resolveMockup()` as the source of photo kind, tint permission,
shadow permission, normalized frame, and front/back fallback metadata. Do not reintroduce
filename- or luminance-only heuristics in downstream consumers.
