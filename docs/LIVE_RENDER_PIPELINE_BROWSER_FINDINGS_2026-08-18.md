# Live rendering pipeline browser findings — 2026-08-18

The authenticated browser successfully loaded `https://trynext.pages.dev/` and rendered the production homepage. The live page exposes the six product family cards and the homepage hero/typewriter.

The source trace independently shows that the homepage hero (`TypewriterHero.tsx`), homepage category cards (`Home.tsx`), Studio prefetch (`src/lib/prefetch.ts`), and ProductCard fallback paths still reference `source-kit-v3` or `normalized` paths. The active Studio resolver (`resolveMockup` in `pages/design-studio/mockups.tsx`) does return `/mockups/smart-v4/...` through `completeMockupEntry`, but stale paths remain in other reachable frontend branches.

In the captured homepage viewport, Hoodie, Water Bottle, and T-Shirt family images were visible. Cap, Long Sleeve, and Mug card areas appeared blank in the screenshot while their labels rendered. This requires targeted image-request verification; it may be a loading/fallback timing issue, a missing product image URL, or a legacy fallback path that is unavailable.

A promotion/spin modal and unfinished-design recovery overlay were also present during capture, so subsequent visual checks should dismiss those overlays before judging product-card rendering.


After the promotional overlay cleared, the unobstructed homepage screenshot showed all six category cards with visible images: Hoodie, Water Bottle, T-Shirt, Cap, Long Sleeve, and Mug. This confirms the homepage cards can render images in the authenticated browser, but it does not eliminate the source-level legacy fallback issue: the hero, Home category-card map, Studio prefetch, ProductCard fallback, and mockups.tsx product/base declarations still contain source-kit-v3 or normalized URLs.


The authenticated live Design Studio opened at `/design-studio` and rendered the T-Shirt front with the Front/Back/L.Sleeve/R.Sleeve/Neck controls. Navigating to `?product=hoodie` rendered a Navy Hoodie. The live Back view at `?product=hoodie&view=back` rendered a matched Navy Hoodie rear silhouette and retained all face controls. A cloud draft overlay added a small prior design layer in the center; this is draft state, not evidence of a garment asset defect.


Parallel release verification browser pass: production `/design-studio?product=hoodie` loaded successfully in My Browser and exposed Front, Back, L.Sleeve, R.Sleeve, and Neck controls. The current live canvas rendered a Navy Hoodie front surface. The associated HTML snapshot was saved as `/home/ubuntu/upload/trynext.pages.dev_design-studio_product_hoodie_1786999458745.html` for path inspection.
