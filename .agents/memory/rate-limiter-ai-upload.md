---
name: Rate limiters — AI and upload endpoints
description: Dedicated rate limits added for AI generation and file upload endpoints
---

`/api/ai` and `/api/admin/ai` are limited to 10 requests/5 minutes; `/api/storage` and `/api/upload` are limited to 30 requests/10 minutes. Added in `app.ts` after the existing general rate limiters.

**Why:** AI generation and uploads are far more expensive (compute/storage/egress) than typical CRUD requests and are the most likely target for abuse or runaway client bugs.

**How to apply:** if admin AI usage ever feels throttled by customer-facing AI traffic, split the shared `/api/ai` + `/api/admin/ai` limiter into two independently-tracked limiters rather than raising the shared limit.
