---
name: Generated mockup source kits
description: Packaging and rollout boundary for editable product mockup source bundles.
---

# Generated Mockup Source Kits

Keep large editable mockup bundles outside the storefront's public runtime path. Deliver them as downloadable source archives, while the customer-facing studio continues using its reviewed photo-based fallback until the generated assets pass visual QA.

**Why:** Editable PSD/source bundles are large and are not runtime assets; early rollout can expose masking, silhouette, or hardware artifacts to customers.

**How to apply:** Generate and validate the source kit separately, inspect representative product/color/view previews, and only wire approved assets into the studio in a later, deliberate migration. Treat an openable layered PSD/PSB as `manifest-only` until a parser proves an embedded Smart Object and the round trip is reproducible.

**Status (2026-07-28):** the 108-asset PSD kit under `attached_assets/trynext-mockup-source-kit/` was spot-checked again (mug front/back pair) and looks correct — a plausible mirrored pair for a symmetric blank mug, no visible artifacts. Still deliberately NOT wired into the live Design Studio; wiring in remains a distinct, explicit follow-up decision, not something to do opportunistically during an unrelated audit/fix pass.