---
name: DesignStudio dynamic shipping
description: Design Studio must read shipping cost/free-shipping threshold from site settings, not a hardcoded value
---

The Design Studio price/shipping summary reads the free-shipping threshold and shipping cost from `SiteSettingsContext`, matching what checkout actually charges.

**Why:** a hardcoded value (previously 1500) drifts from whatever the admin configures in site settings, showing customers a different shipping estimate in the studio than what checkout charges — a trust-breaking mismatch.

**How to apply:** any customer-facing price/shipping figure shown outside the checkout page itself must be sourced from the same settings the checkout page uses, never a local constant.
