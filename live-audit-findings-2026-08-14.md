# Live Trynext audit findings — 2026-08-14

Sources inspected:

- Production API health: https://trynex-api.onrender.com/api/healthz
- Production storefront: https://trynext.pages.dev/
- Production catalog page 1: https://trynext.pages.dev/products
- Production catalog page 2: https://trynext.pages.dev/products?page=2

## Verified live behavior

The production API health endpoint returned `{"status":"ok","db":"ok","redis":"ok","storage":"r2"}`.

The production storefront loaded with the 25% advance banner, bKash/Nagad/uPay display, product imagery, and a populated homepage.

The live catalog returned 70 total products. Page 1 displayed 50 products and page 2 displayed 20 distinct products, with working `Previous 1 2 Next` controls. Live product images were generally present, but page-two `Premium Pullover Hoodie` still used `/images/product-placeholder.svg`, so image completeness is not yet perfect.

The live catalog contains multiple category labels: Caps, Custom Orders, Hoodies, Long Sleeves, Mugs, T-Shirts, and Water Bottles.

## Observed live gaps

The local development storefront initially showed 0 products because its Vite proxy targets `localhost:8082` but no local `DATABASE_URL` is present, so the local API could not start. This is an environment limitation but prevents local end-to-end testing unless a safe development database is provided.

The active local Design Studio opened as the older Unisex T-Shirt editor with generic XS through XXXL sizing. The browser audit did not yet verify all six product-specific mockups, variant selection, upload/delete/replace, export, cart handoff, and mobile behavior.

The live production catalog showed many established product prices such as mugs at ৳349/৳399/৳449 and T-shirts from ৳499/৳599, which are not the new custom Design Studio variant prices. Product-detail and Design Studio variant contract propagation still requires live verification after migration/deployment.

The live abandoned-cart reminder appeared over the catalog when a cart item was present. The current browser storage showed a cart item and `spin_modal_shown_v2`, but no explicit abandoned-cart dismissal key before dismissal testing. This needs a production reload test after the current persistence code is deployed.

GitHub CI for commit `2fc677c` was still `in_progress` at the time of the audit. Older commits through `da8e2fe` were successful.

## Newly fixed in current audit wave

Production mug ProductDetail was observed in a fatal error state: `Cannot access 'ft' before initialization`. Root cause was `selectedVariantId` state declared after derived variant calculations. It was moved before the calculations; storefront typecheck/build passed and the fix was pushed in `182a0b0`.

The live API for `minimalist-mountain-peak-mug` confirmed only `general-mug` was present in `variants` and the response still exposed `sizes: ["S","M","L","XL","XXL"]`. A follow-up migration `003_backfill_catalog_variants.sql` now populates all mug products with General Mug, Love Shape Handle, Blue Rim, and Yellow Rim, and all short-sleeve products with Regular Fit and Drop-Shoulder 220 GSM. The API mapping now returns empty sizes for mugs, caps, and bottles. This wave was pushed in `8954683`; CI is currently in progress.

Local validation for `8954683`: database/API TypeScript checks, storefront typecheck, storefront production build, and `git diff --check` passed.

## Bottle visual audit

The user-supplied reference (`/home/ubuntu/upload/255769.jpg`) is a white rounded aluminum bottle with a compact black oval loop cap, a silver connector, and a silver carabiner clipped at the upper right. The contact sheet shows that `bottle_2.png`, `bottle_5.png`, and `bottle_6.png` are the closest existing loop-cap family, but they use silver bodies or different proportions. `bottle_1.png` is a plain screw-cap bottle; `bottle_4.png` has a wide integrated handle; `bottle_7.png` is a close-up cap; `bottle_9.png` is a hand-held alternate; and `bottle_10.png` has a large silver loop cap. Therefore, the complete bottle family must use one canonical white loop-cap/carabiner silhouette derived from the user reference, with color variants applied to the body while preserving the black cap and silver hardware. Existing generic screw-cap and incompatible handle fallbacks must not remain mapped to water-bottle products.

The current Design Studio source-kit white bottle (`mockups/source-kit/waterbottle-white-front.png`) already uses the correct black loop cap and silver carabiner family. Its body is taller and narrower than the supplied product card, so the remaining mismatch is primarily the product-card/catalog asset family and any alternate 3D/legacy fallbacks, not the current source-kit cap geometry itself. The generated reference-matched premium card now has the supplied body/cap silhouette and should replace the old bottle sample asset after mapping is confirmed.

The current home showcase asset `public/mockups/white-waterbottle-front.png` does have the correct black loop cap and silver carabiner, but it uses a gray studio background and a taller/narrower body than the user-supplied white reference card. The generated reference-matched premium card has the desired white body and product-card composition, but it is a full card image rather than the transparent/source-kit asset required by Design Studio. This distinction must be preserved: use the reference-matched card for catalog/sample presentation, while keeping a transparent loop-cap source for Design Studio composition.

## Live product-detail verification after `981feac`

The deployed mug page now renders without the initialization crash. The hero correctly shows General Mug ৳449, the 25% advance is ৳112, the remaining balance is ৳337, and the four variant choices show the requested prices and fees. However, the Recently Viewed card on the same page still displays the legacy ৳349 price and direct Render image URL (`https://trynex-api.onrender.com/assets/products/mug_mountain.png`). This is a concrete remaining consistency/performance issue: derived/recently-viewed product cards are not using the selected/catalog variant pricing contract or the Pages proxy/image normalization path.
