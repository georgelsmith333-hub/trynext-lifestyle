---
name: Cap shadow silhouette
description: Why the cap mockup needed to be treated as a cutout-based product instead of a tinted rectangle
---

A white/light cap must go through the same code path as other cutout-based products (the `isCylUnderImageSrc` set) so it renders from a transparent cutout PNG.

**Why:** if a light-colored cap is instead handled like a flat tint-filter product, the CSS drop-shadow used for depth wraps the image's full rectangular bounding box instead of the actual cap silhouette, producing a visible rectangular shadow behind a round object.

**How to apply:** when adding a new product or color path, check whether it needs cutout-based shadow handling (cylindrical/curved real-world objects) vs. flat tint (T-shirt-like flat garments).
