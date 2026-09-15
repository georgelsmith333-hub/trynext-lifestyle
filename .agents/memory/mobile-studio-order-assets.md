---
name: Mobile studio order assets
description: Mobile custom-design cart metadata must match the server archive contract.
---

Mobile Design Studio items must set `studioDesign: true` and include uploaded object-storage paths in `originalAssets`; otherwise the order pipeline treats them as ordinary catalog items and cannot archive or flag the original artwork reliably.

**Why:** The order server only moves and tracks original uploads for studio items identified by this metadata.

**How to apply:** Preserve this metadata through cart serialization and checkout, and keep distinct custom designs as separate cart lines even when product, size, and color match.