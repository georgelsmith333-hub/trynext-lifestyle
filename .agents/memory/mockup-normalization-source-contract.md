---
name: Mockup normalization source contract
description: The durable input boundary and masking rule for regenerating Trynext product mockups.
---

Normalization must read product pixels only from the immutable source-kit photos and geometry only from reviewed alpha templates kept outside the runtime output folders. Never derive a mask from `normalized/` or `normalized-cutouts/`, and never flood-fill near-white garments against the warm-white studio background.

**Why:** normalized output is a derived artifact, so using it as the next run's reference recursively changes scale and detail. White fabric is close to the studio background, so color-difference flood fill removes fabric and leaves only dark folds.

**How to apply:** keep the source-kit and alpha-template directories as the only generator inputs; validate every expected photo/template before writing; regenerate the full batch and confirm a second run produces identical hashes.