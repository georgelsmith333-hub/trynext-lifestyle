---
name: Hoodie/longsleeve mockup asset naming
description: Which cutout PNG variant is actually clean vs broken for hoodie/longsleeve mockups
---

For white/black hoodie and longsleeve, multiple filename variants exist per face
(`-cutout.png`, `-cutout-new.png`, `-cutout-real.png`). The `-cutout-new.png`
files (and the plain `-cutout.png` duplicates) render a ghosted/misaligned
double-image artifact (looks like an old low-res crop overlapping the garment).
Only the `-cutout-real.png` variants are clean, correctly proportioned product
photos with proper RGBA alpha transparency.

**Why:** A previous agent referenced the `-new` files without visually
confirming them; they were stale/broken stubs, not deliberate placeholders.

**How to apply:** Always reference `*-cutout-real.png` for hoodie/longsleeve
cutouts (both white and black/dark variants) in both
`design-studio/mockups.tsx` and `CartViewer3D.tsx` — both files must stay in
sync since they each independently hardcode mockup image paths. Before trusting
any mockup asset, screenshot it directly (`/mockups/<file>.png` via the
appPreview screenshot tool) rather than assuming from filename/size alone.
