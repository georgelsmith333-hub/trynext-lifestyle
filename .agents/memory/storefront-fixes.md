---
name: Storefront fixes
description: Key fixes applied to the Trynext storefront — navigation, design studio, redirects, admin.
---

## AnimatePresence white screen
`mode="wait"` on AnimatePresence in App.tsx caused a white screen on every page navigation because exit animations never completed. Fix: remove `mode="wait"` entirely. Always bust the service worker cache (CURRENT_BUILD in cache-recovery.ts) after this change.

**Why:** `mode="wait"` blocks the incoming route from mounting until the outgoing route's exit animation finishes. If any exit animation stalls (3D canvas teardown, etc.) the new page never mounts.

## Design Studio product tab icons
`PRODUCT_TAB_ICONS` in DesignStudio.tsx must be `{}` (empty object) to show real product photos in the tab bar. Any non-empty value renders SVG icons instead of photos. Also remove `filter: brightness(0) invert(1)` from the active tab icon style — it makes the photo black and white.

## CF Pages _redirects
The `/sitemap.xml` line must appear BEFORE the `/*` SPA catch-all in `_redirects`, or the sitemap is served as `index.html`. Order matters — CF Pages processes rules top-to-bottom:
```
/sitemap.xml  https://trynex-api.onrender.com/api/sitemap.xml  200
/api/*        https://trynex-api.onrender.com/api/:splat        200
/*            /index.html                                        200
```

## Admin login
Admin password: `Administration@Trynexshop` (default in api-server/src/routes/admin.ts, overridden by ADMIN_PASSWORD env var on Render). Confirmed working via `POST /api/admin/login`. Render env var ADMIN_PASSWORD must be set to this value explicitly.

## Render deploy failures after env-var-only update
When env vars are updated via Render API PUT, Render attempts a service restart. If the restart takes too long (cold start + DB connection ~10s), the health check times out → `update_failed`. The OLD deploy keeps serving. Fix: trigger a full code deploy (`POST /v1/services/{id}/deploys`) after the env var update — this re-builds and re-deploys properly.

## White garment mockups look invisible on beige studio background
For apparel (tshirt/hoodie/longsleeve), white/near-white garments used the full photo (with white BG rectangle) as `imageSrc`. The drop-shadow filter boxed the entire rectangle → garment invisible on the beige `#c9c4bc` background. Fix: add `isApparelForCutout` flag so white apparel uses the cutout PNG (transparent BG) just like coloured garments do. Same fix needed in ProductViewer3D.tsx for 3D (use `base?.frontCutout` instead of `product.frontSrc`). Both files use the same logic now.

**Why:** The drop-shadow SVG filter follows the image's alpha-channel when the PNG has a transparent background. For the full photo (white BG), it shadows a rectangle. For the cutout (transparent BG), it shadows the garment silhouette — making white shirts visually pop.

**How to apply:** In `mockups.tsx` `GarmentSVG` — add `isApparelForCutout` check alongside `isCylUnderImageSrc` in the `imageSrc` IIFE. In `ProductViewer3D.tsx` — use `base?.frontCutout ?? product.frontSrc` for `resolvedFrontPhoto`.

## Homepage category images
Category card images need `object-contain p-4` (not `object-cover`) so product photos aren't cropped. Product photos have white/light backgrounds and are designed to be shown full-frame.
