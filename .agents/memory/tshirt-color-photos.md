---
name: T-shirt-family color photo mockups
description: Which garment colors use real photos vs. SVG tint filter in the Design Studio mockup composer
---

`BASE_BY_CATEGORY` in `mockups.tsx` gives t-shirt, longsleeve, and hoodie a `colorPhotos` map keyed by hex color (navy `#1e3a5f`, red `#dc2626`, grey, maroon, olive, sky-blue, forest, burgundy — the set differs slightly per product) pointing at real AI-generated photos for that color, bypassing the SVG tint filter entirely. Waterbottle has its own similar `colorPhotos` map with more colors (black, navy, forest, sky-blue, red, pink, teal).

**Why:** the SVG tint filter approximates a color by multiplying a hue over the white base photo, which looks synthetic for colors far from white/black; a real photo shot in that color looks authentic.

**How to apply:** `GarmentSVG` sets a `useColorPhoto` flag when the selected color has a `colorPhotos` entry for the current product; the mockup composer skips the multiply-tint step whenever `isColorPhoto: true`. Any color without a `colorPhotos` entry falls back to the tint-filter path automatically.
