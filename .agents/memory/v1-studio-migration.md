---
name: V1 studio migration
description: Durable decisions for the public Design Studio route and configuration-driven customer-facing behavior.
---

The V1 Design Studio is the supported public experience. V2 remains addressable as an explicit comparison and rollback route until the product owner decides it can be retired.

**Why:** V1 was verified across desktop and mobile, while keeping V2 available avoids a destructive migration and preserves a safe fallback during rollout.

**How to apply:** Keep public studio links and prefetch behavior on V1. Do not remove V2 or its mockup/PSD assets without an explicit product decision. Customer contact, social, WhatsApp, and payment choices must come from site settings; empty settings should hide or disable the related action rather than inventing data. Backup target definitions are preserved while improving per-target status reporting.