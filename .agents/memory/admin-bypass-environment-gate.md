---
name: Admin bypass environment gate
description: Development-only emergency admin credentials must require an explicit development environment.
---

The emergency admin password path must be enabled only when `NODE_ENV` is explicitly `development`; an unset or unknown environment must not activate it.

**Why:** Deployment platforms and staging processes do not always set `NODE_ENV`, so treating “not production” as development can accidentally leave a bypass available outside local development.

**How to apply:** When changing admin login or recovery logic, preserve the explicit environment check and keep production recovery on the authenticated reset-key flow instead.