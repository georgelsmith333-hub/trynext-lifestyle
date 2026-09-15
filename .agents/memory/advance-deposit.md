---
name: Advance deposit percentage
description: The advance/COD deposit was changed from 15% to 25%. All payment math, labels, notifications, and content pages updated.
---

## Current Rate: 25%

Changed from 15% → 25% across the entire codebase.

**Why:** Business decision by owner to require higher advance deposit.

**Files that contain advance % logic or copy (all updated to 25%):**
- `artifacts/trynex-storefront/src/pages/Checkout.tsx` — advanceAmount calc, all UI labels
- `artifacts/api-server/src/routes/orders.ts` — order creation/confirmation
- `artifacts/api-server/src/lib/email.ts` — customer confirmation email
- `artifacts/api-server/src/routes/telegramWebhook.ts` — Telegram invoice format
- `artifacts/api-server/src/routes/ai.ts` — AI assistant store context
- `artifacts/trynex-storefront/src/pages/FAQ.tsx` — payment FAQ answers
- `artifacts/trynex-storefront/src/pages/TermsOfService.tsx` — terms copy
- `artifacts/trynex-storefront/src/pages/admin/AdminOrders.tsx` — advance badge label

**How to apply:** If the rate ever changes again, search for `0.25` near advance/deposit contexts + all "25%" string literals in these files.
