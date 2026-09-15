# Trynext Live Audit — 2026-08-12

## Sources

- Live storefront: https://trynext.pages.dev/design-studio
- Live products API: https://trynext.pages.dev/api/products?limit=100&sort=oldest&live_audit=20260812
- Live health: https://trynext.pages.dev/api/healthz
- Cloudflare Pages project: `trynext-lifestyle-shop`
- Cloudflare latest deployment query: Pages API `GET /accounts/{account_id}/pages/projects/trynext-lifestyle-shop`

## Findings

1. Before the latest push, the live Design Studio visibly rendered the V1 toolbar (Select/Text/Shape/Draw/Eyedropper) even though `main` had a V2 route. This was verified from the live page's interactive elements and screenshot.
2. The live API health response was `{\"status\":\"ok\",\"db\":\"ok\",\"redis\":\"ok\",\"storage\":\"r2\"}`.
3. The live API originally returned 9 products. Cloudflare Pages production `API_URL`, `API_ORIGIN`, and `TRYNEXT_API_URL` all point to `https://trynex-api.onrender.com`, whose Render config uses a Render-managed database, not the local Neon shard used by the earlier seed attempt.
4. An authorized production admin login succeeded through `/api/admin/login` using the user-provided project secret, without exposing the token.
5. The live catalog was synchronized through `/api/categories` and `/api/products/bulk`: created missing `long-sleeves` and `water-bottles` categories; imported 60 definitions; every bulk chunk reported success and zero failures.
6. A cache-busted live API query now reports 69 product records (`grep -o '\"id\":'` count), includes `Birthday Celebration Tee`, and includes 10 `Water Bottles` occurrences. The response source is the live Cloudflare API URL above.
7. Commit `4ebe71529` was pushed to `origin/main` with buildable V2 mobile state wiring, checkout optional-string fix, duplicate full-frame mockup mask removal, opaque-photo shadow disablement, and `scripts/sync_live_catalog.mjs`.
8. Local authoritative storefront typecheck and production build passed.
9. Cloudflare Pages deployment for commit `4ebe71529e35626b1694f9b71637e96a1d4810e8` is active at `https://6b5dd9c8.trynext.pages.dev`; at 18:01:39 UTC it was still in `clone_repo` active, with build/deploy idle. Previous production deployment `062a1eec` was commit `9abd97eb` and successful.

## Code root causes fixed in current working tree

- `DesignStudioV2.tsx` referenced `mobileToolOpen` and `setMobileToolOpen` without destructuring them from Zustand, causing production typecheck failure.
- `Checkout.tsx` passed optional `selectedUpazila` to a required prop, causing production typecheck failure.
- `mockups.tsx` rendered undefined `getShadowMask` / `getHighlightMask` duplicate full-frame images and set `allowSilhouetteShadow: true` for opaque 1024x1024 photos, causing ghost/double silhouettes. The duplicate passes were removed and rectangle shadows disabled.

## Remaining verification

Poll Cloudflare deployment `6b5dd9c8-55f1-40a5-8465-5a385076f8fe` until terminal success, then browse the live production site again at `/design-studio` and the products page. Verify V2-specific labels/bottom-sheet behavior, mobile viewport interactions, asset HTTP 200s, and absence of ghost overlays. If deployment fails, read Pages deployment history logs at `/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/history/logs`.

## Final visual/product findings after commit c63c643a0

10. Cloudflare Pages deployment `933950b0` for commit `c63c643a0` completed successfully: clone, build, and deploy all succeeded. The live production Design Studio now renders one visible normalized T-shirt inside a valid SVG root; the previous blank canvas was caused by `GarmentSVG` and `FlatZoneSVG` returning `<defs>/<image>/<rect>` fragments directly into an HTML `<div>` rather than a real `<svg>` element.
11. At a real 390×844 viewport, the live page shows an organized toolbar, horizontal color row, visible mockup, and mobile magic-tools FAB with no overlap. Desktop live color click from White to Black changed the selected label and rendered a black T-shirt; Draw tool click activated the Draw pill without navigation or canvas failure.
12. The public products page now displays `All Products 69`, category filters including Long Sleeves and Water Bottles, and visible product cards. The first few new bottle/long-sleeve/cap/mug cards were using `/images/product-placeholder.svg` because their seeded `/assets/products/*.png` filenames did not exist; some hoodie assets were valid. This must be corrected by remapping all 60 new records to the 60 actual files in `public/assets/products` and then re-verifying HTTP 200 images and the public grid.
13. The local asset directory contains exactly 60 files: 10 each for `bottle_`, `cap_`, `hoodie_`, `longsleeve_`, `mug_`, and `tshirt_` prefixes. The goal is one real asset per new product, not placeholders.


## Full-overhaul audit continuation

The authoritative repository is `/home/ubuntu/trynext-lifestyle-git` on `main`. Cloudflare Pages project `trynext-lifestyle-shop` is connected to GitHub production branch `main`, with build command `corepack enable && pnpm install --no-frozen-lockfile --config.verify-store-integrity=false --config.strict-store-pkg-content-check=false && pnpm --filter @workspace/trynext-storefront run build`, output `artifacts/trynex-storefront/dist`, and no Pages environment variables returned by the project inspection. The latest completed deployment before the current wave was commit `7c0333e4211bf39def93cf76e2205ab4ed8937d1` at `https://2d69fdd5.trynext.pages.dev`.

The production API catalog audit previously verified `total=69`, with the synchronized 60-product set using real `/assets/products/*.png` paths and 59 unique live asset URLs returning HTTP 200; the one fewer unique URL is due to intentional asset reuse, not a broken record. The storefront page settled with All Products 69 and actual image cards.

Confirmed code-level root causes for the new wave: `Admin/Login.tsx` had an inconsistent `apiPost` path helper that could produce malformed `/api/api...` paths; its helper is now normalized to add exactly one leading slash before `getApiUrl`. `AuthContext.tsx` uses `getApiUrl` correctly for guest auth and that call must remain `getApiUrl('/auth/guest')`; a prior patch that passed a route-relative `auth/guest` was reverted. The generated `lib/api-client-react/src/custom-fetch.ts` did not set `credentials: include`, so it is now being corrected for cookie-backed guest/customer checkout flows. `ProductSwitcher.tsx` was only a trigger even though the Zustand store already had product-picker search/category state; it is now being rebuilt as a six-category modal with real mockup previews. `MainToolbar.tsx` had duplicate icons for draw/eyedropper and an Export button with no handler; it is now being rebuilt as a horizontal, non-overlapping tool rail with distinct icons and an export callback.


## Coordinated overhaul wave findings

The live admin login was retested at `https://trynext.pages.dev/admin/login` with the user-authorized password. The current production response still displayed `CORS: origin https://trynext.pages.dev not allowed`, proving the deployed Render API is serving an older CORS build. The source fix now uses a strict built-in production allow-list for the exact Pages host and custom domains when `ALLOWED_ORIGINS` is absent, accepts the exact Pages root plus preview subdomains, and the Pages proxy now adds CORS headers to ordinary responses and JSON error responses, not only OPTIONS.

The generated API client’s `customFetch` previously omitted `credentials: include`; it is now corrected so cookie-backed customer/guest sessions and checkout order requests carry cookies by default. The admin login helper now normalizes leading slashes exactly once, and guest auth remains bound to `getApiUrl('/auth/guest')`. The generated `useCreateOrder` hook was aligned with the server’s actual direct mapped-order response (`Order`, not `{ order: Order }`).

The V2 Design Studio now has a real six-category product picker (T-Shirts, Long Sleeves, Hoodies, Mugs, Caps, Water Bottles) with search, category chips, real mockup previews, active selection state, and mobile-friendly modal behavior. Its main toolbar now uses distinct icons, a horizontal no-overlap rail, bounded zoom, accessible labels, and a working export callback. A persistent mobile quick-action rail exposes Product, Upload, Text, and All tools, and image upload now accepts camera-style files, catches decode/auto-fix failures, and displays visible error toasts.

Source-kit audit: `attached_assets/trynext-mockup-source-kit/psd` contains 108 genuine PSD masters (16 cap, 20 hoodie, 20 long sleeve, 20 mug, 16 T-shirt, 16 water bottle) and the public resolver has all 108 normalized color/face PNG URLs present. Processed mask audit shows some masks are full-frame (notably representative T-shirt masks), so they must not be painted as second full-frame images; the renderer continues using a single normalized source image to prevent ghost rectangles. Every resolved mockup now carries `editableMasterPath` and `sourceKitKey` metadata that points to the exact PSD source document.
