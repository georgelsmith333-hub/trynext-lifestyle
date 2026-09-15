---
name: Trynext production DNS setup (SUPERSEDED)
description: An earlier plan to move trynext.pages.dev off Cloudflare Pages onto Replit Autoscale — NOT the current architecture, kept for historical context only
---

**SUPERSEDED as of 2026-07-28 — do not act on the "correct permanent setup" below.** Current code (`functions/api/[[path]].ts` in the storefront, see `cf-pages-deploy.md`) implements a working Cloudflare Pages Functions proxy for `/api/*`, and `https://trynext.pages.dev/` resolves through Cloudflare and returns 200 today. The Autoscale migration this file recommended was not carried out (or was reverted); CF Pages + Functions proxy is the live production architecture. Don't change DNS/CNAME records based on this file without first re-confirming current state — verify against `cf-pages-deploy.md` and the live site instead.

**Current (broken) setup:**
`trynext.pages.dev` CNAME → `trynext.pages.dev` (Cloudflare Pages, proxied=true)

CF Pages serves the static frontend. All `/api/*` calls hit CF Pages which returns HTML (the SPA index.html), not JSON. This breaks admin login, checkout, and all dynamic features.

**Why it's broken:** CF Pages doesn't have an API. The frontend's `VITE_API_BASE_URL=""` means same-origin API calls — but "same origin" is CF Pages, not the Replit API server.

**Correct permanent setup:**
1. Deploy to Replit Autoscale (both storefront + API server are registered in `artifact.toml`)
2. Update Cloudflare DNS CNAME for `trynext.pages.dev` from `trynext.pages.dev` to the Replit Autoscale URL: `trynext-businesvs-dev-5-june-d-junelajunelaest--braintrackitsol.replit.app`
3. Set `proxied=true` (orange cloud) — Replit Autoscale accepts custom domain proxying
4. Do the same for `trynext.pages.dev` (record id=39a84089ea4f48f36376b354f8e40243)
5. Update `ALLOWED_ORIGINS` env var for production: `https://trynext.pages.dev,https://trynext.pages.dev`

**Why dev domain doesn't work with CF DNS:**
CF sends `Host: trynext.pages.dev` to the backend. Replit dev containers route by subdomain (UUID), not by Host header, so the request isn't routed correctly. Only Autoscale (with registered custom domain) handles this correctly.

**CF Zone info:**
- Zone ID: `0c7e4e40e3bfc5bf0a74dd9f570df635`  
- Root CNAME record ID: `6f56919d55f5ae4a58d88a136a4c29bc`
- www CNAME record ID: `39a84089ea4f48f36376b354f8e40243`
- DNS token has DNS:Edit permission (NOT Pages:Edit)
