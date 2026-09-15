---
name: Smart-v9 color compatibility
description: Runtime rule for reconciling staged smart-v9 color slugs with the live catalog.
---

Only use a staged smart-v9 asset for a catalog color when the rendered garment color is an exact match. If the staged release uses a generic or colliding slug for a catalog shade, keep the reviewed color-specific source asset rather than silently substituting a nearby hue. Promote the complete candidate only after both the 188-surface structural/hash gates and representative browser/runtime visual checks pass.

**Why:** The staged 188-surface matrix and the live Hoodie/Long Sleeve catalog use different color vocabularies. Mapping Charcoal, Royal Blue, or Sand to a visually different Grey, Sky Blue, or Olive photo creates a customer-visible product error even when the URL and release gates look valid; structural completeness alone also cannot catch every customer-visible mapping problem.

**How to apply:** Keep the source-kit key for geometry and provenance, translate only explicit exact aliases at the runtime asset boundary, inspect representative front/back/side surfaces across every family before activation, and regenerate product-aligned staged surfaces before broadening the v9 mapping.