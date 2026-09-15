---
name: Mobile checkout inline validation
description: Mobile checkout replaced blocking Alert.alert popups with inline per-field error state
---

Validation errors in the mobile checkout show as a red border + error text under the specific field (name/phone/address) via `fieldErrors` state, instead of a blocking `Alert.alert` dialog.

**Why:** inline errors let the customer see and fix multiple problems at once without dismissing a sequence of popups, which is friendlier on mobile and matches modern form UX.

**How to apply:** `MAJOR_DISTRICTS` provides a 12-chip quick-select for the most common districts; the full `BD_DISTRICTS` list remains available for everything else.
