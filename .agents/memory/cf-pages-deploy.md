---
name: CF Pages deployment architecture
description: How Trynext Lifestyle is deployed — CF Pages static frontend + API proxy function + API server host.
---

# CF Pages Deployment

## Architecture
- Static storefront: Cloudflare Pages (`trynext.shop`, with the Pages hostname retained only as a compatibility origin)
- API: CF Pages Function at `functions/api/[[path]].ts` proxies all `/api/*` to `API_URL`
- GitHub repo: `georgelsmith333-hub/trynext-lifestyle` → CF Pages auto-builds on push

## CF Pages Function
File: `functions/api/[[path]].ts` (at repo root — NOT inside artifacts/)
- No npm packages needed (uses native fetch only)
- `API_URL` env var: set in CF Pages → Settings → Environment Variables
- Handles CORS, forwards headers, rewrites Set-Cookie domain/SameSite

## Key CF Pages settings
- Project: `trynext-lifestyle-shop`
- CF Zone ID: `0c7e4e40e3bfc5bf0a74dd9f570df635`
- Build command: `pnpm --filter @workspace/trynext-storefront run build`
- Output dir: `artifacts/trynex-storefront/dist`
- Node compatibility flag required for Pages Functions

## API server options
1. Replit dev domain (unstable, changes on restart) — set as API_URL temporarily
2. A free host (Render/Railway) running `@workspace/api-server`
3. Future: full Cloudflare Worker implementation of all routes

## Current operational note
- GitHub main publishing works with the configured repository token, and a push to
  `main` triggers the repository checks and the Cloudflare Pages build path.
- The configured Cloudflare token can verify as active but currently returns
  `403` for this Pages account/project API read; do not treat that as evidence
  that the live site failed when the public-domain checks are healthy.
- The live custom domain is the authority for rollout verification: check the
  homepage, API health, optimized static assets, sitemap, and accepted runtime
  manifest after each publish.

## Verification caveat
- The confirmed active public domain is `trynext.shop`. The Pages hostname is an implementation/compatibility origin; verify production behavior through the custom domain.
- After workspace reconciliation removed managed artifact registration, a minimal `Start application` workflow can run the API and storefront together locally, but it does not restore artifact registry metadata.

**Why:** User wants zero-cost, Replit-independent hosting. CF Pages = free tier with global CDN.
