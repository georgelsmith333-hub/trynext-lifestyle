---
name: Local preview CORS and viewer heartbeat
description: Development preview origins can be blocked when ALLOWED_ORIGINS overrides the default local list.
---

The API must keep its explicit production allowlist while also allowing the known local preview origins whenever it runs in development. The public viewer heartbeat is non-sensitive and may be exempt from cookie CSRF enforcement; the client should still send `X-Requested-With`.

**Why:** Browser preview requests include a local Origin and customer cookies; an `ALLOWED_ORIGINS` override otherwise caused a misleading 403 even though the public viewer route itself was healthy.

**How to apply:** When debugging a viewer-count 403 locally, check CORS origin handling before changing the route or weakening protected admin mutations. Keep the artifact-owned workflows as the source of preview traffic.