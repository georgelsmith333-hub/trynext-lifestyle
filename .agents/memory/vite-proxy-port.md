---
name: Storefront vite dev-server API proxy port
description: The storefront's local dev proxy for /api/* must default to the same port the API server actually listens on
---

`vite.config.ts` in the storefront proxies `/api/*` to `API_PORT` (env var), defaulting to 8082 if unset.

**Why:** an earlier default of 5001 didn't match the API server's actual dev port (8082), so in any environment without `API_PORT` explicitly set, the storefront dev server silently proxied to a port nothing was listening on — symptom was "no products" / empty storefront with no obvious error.

**How to apply:** if the API server's dev port ever changes, update this default in lockstep, or better, always set `API_PORT` explicitly rather than relying on the default matching.
