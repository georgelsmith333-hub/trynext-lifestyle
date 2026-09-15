---
name: Design layer blend-mode threshold bug ("same shade" bug)
description: designBlend multiply threshold must match the light/dark garment threshold or designs blend into the garment color
---

The design layer's CSS `mix-blend-mode: multiply` was gated on a luminance threshold of 0.58, but the garment tint/light classification (`isLightTint`) uses luminance > 0.92.

**Why:** with mismatched thresholds, mid-tone garments (sky-blue, grey, red) were classified as "dark enough for multiply" by the design-blend check but "light" by the tint check, so the design layer multiplied against the garment's own color and appeared tinted the same shade as the garment ("invisible design" bug).

**How to apply:** any blend-mode / color-classification threshold for garments must reuse the same luminance cutoff (`lum > 0.92`) as `isLightTint`, not an independent value.
