---
name: Mobile checkout dynamic settings
description: Mobile checkout.tsx sources shipping/payment numbers from live site settings, with safe fallbacks only if the API hasn't responded yet
---

`checkout.tsx` uses `useQuery(["siteSettings"], api.getSettings)` for shipping cost, the free-shipping threshold, and bKash/Nagad numbers, rather than hardcoding them.

**Why:** keeps mobile checkout consistent with whatever the admin configures, matching the web storefront's behavior.

**How to apply:** falls back to 1500 (shipping)/60 (threshold)/a placeholder payment number only while the settings query hasn't resolved yet — not as a permanent substitute. If real settings never load, that fallback window should be brief, not silent forever.
