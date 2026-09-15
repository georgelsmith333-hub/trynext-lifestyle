---
name: PhotoMockupMesh color rendering fix
description: Why adjustGarmentColor must NOT be used in PhotoMockupMesh for photo billboard planes
---

# PhotoMockupMesh colour rendering

## The rule
In `garment3d.tsx → PhotoMockupMesh`, the `renderColor` must NOT call `adjustGarmentColor()`.

For near-white colours (luminance > 0.88), return `"#ffffff"` (no tinting). For all other colours, return the raw `garmentColor` hex.

## Why
`adjustGarmentColor` was designed for procedural 3D meshes (RealisticShirt / GarmentGLB) where pure-white geometry looks flat. It maps near-white → `#D2CFC9` (warm grey).

Photo billboard planes are different: the product photo already has correct tonal rendering. Applying `#D2CFC9` to a white-photo material makes the garment look grey/faded. White tshirt looked grey in 3D, which was visually wrong.

## How to apply
The correct `renderColor` logic in `PhotoMockupMesh`:
```js
const renderColor = useMemo(() => {
  if (!garmentColor) return "#ffffff";
  const h = garmentColor.replace("#", "");
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.88) return "#ffffff";
  }
  return garmentColor;
}, [garmentColor]);
```

Black garments handled separately: `hasDarkPhoto=true` → `photoTint=undefined` → `garmentColor=undefined` → `renderColor="#ffffff"` → dark photo shown as-is (correct).
