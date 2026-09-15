# Live Deployed Storefront Audit — 2026-08-17

## Initial homepage findings

The supplied Cloudflare Pages URL `https://trynext.pages.dev/` loads successfully with the Trynext storefront, navigation, search, wishlist, guest account state, cart, hero CTAs, six family cards, special offers, collection cards, testimonials, blog content, and footer contact channels. Product imagery hydrates for the featured hoodie, water bottle, T-shirt, cap, long sleeve, and mug cards.

The rotating hero copy is visibly clipped at the right edge in the captured viewport. It rendered variants such as `We Craft T-Shirts.` and `We Craft Hood...` rather than a complete phrase, suggesting an overflow/width or animation measurement defect rather than a missing data problem. A returning guest session also displayed an unfinished-design recovery overlay (`You have an unfinished design!`) over the lower-left homepage. The overlay is not inherently broken, but it is intrusive and should be checked for mobile overlap and accessible dismissal.

The page advertises six product families and the live hydrated special-offers section includes products from all six families. The homepage did not expose a fatal loading or blank-image failure during this pass.


## Catalogue findings

The deployed `/products` route initially showed a loading skeleton, then hydrated successfully. It reports **70 total products** and exposes filters for Caps, Custom Orders, Hoodies, Long Sleeves, Mugs, T-Shirts, and Water Bottles. The current page reports **Showing 50 products** with pagination controls for pages 1 and 2; this is a per-page display limit, not loss of catalog data. In the captured visual state, the product-card image/content regions remained extremely pale/skeleton-like even after the product count hydrated, so image and card contrast need a focused visual check rather than being treated as a confirmed data failure.


## Hoodie product-detail findings

The representative route `/product/premium-pullover-hoodie` initially showed a skeleton but hydrated successfully. The black hoodie hero image rendered correctly, the second thumbnail loaded, the title and price matched the live catalog, the 25% advance calculation was visible, all required sizes S–XXL were available, four hoodie colors were selectable, the Design Studio entrypoint was present, and the upload control accepted PNG/JPG/SVG with a 10MB limit.

The unfinished-design recovery overlay persisted over the lower-left product-detail area. It did not block the hero or primary purchase controls in the captured desktop viewport, but its placement is a likely mobile usability risk and should be validated at narrow viewport widths.


## Design Studio findings

The deployed `/design-studio` route initializes the active V2 editor successfully. A hoodie query loaded the Unisex Hoodie 320GSM Fleece editor with Saved state, garment colors, front/back/left-sleeve/right-sleeve/neck controls, upload/text/AI Art/layers/templates/QR tools, size controls, PNG export, Add to Cart, and 3D Preview controls. The navy hoodie front rendered with the existing saved artwork, and switching to Back preserved the artwork and rendered a coherent rear hoodie silhouette at the same canvas scale. No blank editor or fatal runtime state appeared in this pass.


## Cart and checkout findings

The deployed `/cart` route renders an intentional empty-cart state with Browse Collection and recently viewed products. Navigating directly to `/checkout` with an empty cart redirected back to `/cart`, which is correct guard behavior rather than a checkout failure. A populated-cart checkout path still requires a controlled non-payment test if deeper checkout validation is needed.


## Post-push verification

After commit `1602f8b0e` was pushed, the deployed homepage rendered a complete `We Craft T-Shirt` phrase within the hero column, confirming the wrapping hardening is active. A later capture showed `We Craft Hood...` during the typewriter’s intentional mid-animation state; the phrase was not a stable overflow failure. The unfinished-design reminder remained visible but was contained within the lower-left viewport footprint rather than extending beyond the page edge. The lower row of white hero products can appear visually faint against the light background because the source assets are white garments, but their labels and links remain present.
