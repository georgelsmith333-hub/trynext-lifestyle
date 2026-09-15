---
name: Mockup runtime retirement
description: Rules for preventing persisted carts, static files, and stale links from reviving superseded mockup releases.
---

The customer-facing mockup namespace must be treated as a release boundary, not
only as a resolver convention. Runtime code must fail closed for unknown colors,
cart fallback composition must re-resolve persisted items through the accepted
release, and edge/static routing must reject every `/mockups/*` path outside the
canonical reviewed runtime prefix.

**Why:** Persisted cart notes and old public PNGs can outlive a resolver change.
Without both data-path and URL-path guards, a stale item or direct asset link can
silently reintroduce a retired silhouette even when the current UI uses the new
release.

**How to apply:** When promoting a mockup release, update the resolver, cart
fallback, local preview server, and provider edge guard together. Verify the
canonical asset stays 200 and a representative retired asset is rejected after
the provider rollout.