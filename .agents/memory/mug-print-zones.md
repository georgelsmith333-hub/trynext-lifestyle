---
name: Mug print-zone geometry
description: Mug front/back mockups use mirrored side print panels and an explicit full-wrap mode.
---

Mug side printing must use separate front and back zones because the reviewed front and back photos place the handles on opposite sides. The front side zone avoids the right handle; the mirrored back zone avoids the left handle. Full wrap uses the wider body zone. Treat the shape-aware path as the canonical boundary for editor clipping, warnings, compositor/export, and 3D textures; the rectangular bounds are placement/tolerance bounds only.

**Why:** Reusing one side zone for both faces lets artwork spill into the handle on the mirrored back mockup.

**How to apply:** Keep side1/side2 artwork independent. Only the explicit Wrap mode should copy a one-sided design to the opposite face and use the full-wrap zone; do not infer wrap mode merely because both face slots contain layers. Any new consumer must use the shared zone shape instead of recreating a rectangular clip.