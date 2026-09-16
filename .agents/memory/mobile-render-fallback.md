---
name: Mobile Render domain fallback
description: Mobile app auto-detects and replaces a stale hardcoded API domain
---

`.env.production` had a stale `trynex-api.onrender.com` API domain baked in from an earlier hosting setup.

**Why:** once the backend moved off Render, any mobile build compiled against the old `.env.production` would keep calling a dead host, breaking the app for anyone who hadn't updated.

**How to apply:** `lib/api.ts`'s `getBaseUrl()` and `_layout.tsx`'s `setBaseUrl()` detect that stale domain at runtime and transparently replace it with the correct current domain (`trynext.shop`), so old builds self-heal without needing a resubmission.
