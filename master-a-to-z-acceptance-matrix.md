# Trynext Lifestyle — Master A-to-Z Acceptance Matrix

**Audit date:** 15 August 2026 (user timezone)  
**Repository:** `georgelsmith333-hub/trynext-lifestyle`
**Storefront:** `https://trynext.pages.dev/`
**API:** `https://trynex-api.onrender.com/`

## Status definitions

| Status | Meaning |
|---|---|
| **Live verified** | Directly observed on the deployed storefront/API or confirmed by completed CI and live checks. |
| **Locally implemented** | Present in source and passes local gates, but not yet proven in the deployed user flow. |
| **Partially verified** | Some subrequirements work, but the full acceptance behavior is not proven or contains a known mismatch. |
| **Open / failed** | Still missing, demonstrably incorrect, or blocked by missing live credentials/confirmation. |
| **User action required** | Requires a credential rotation, business decision, or sensitive transactional confirmation that must come from the user. |

## Historical requirements reconciled

| Requirement family | Acceptance requirement | Current evidence | Status |
|---|---|---|---|
| Bottle product fidelity | Every bottle sample must use the supplied white aluminum bottle with compact black loop/key-ring cap and silver connector/carabiner; no alternate generic screw-cap bottle may remain in the bottle family. | One corrected canonical bottle asset was generated earlier, but a complete six-category asset mapping audit has not yet proven that every bottle angle/color/fallback uses it. | **Partially verified** |
| Six product families | T-shirt, hoodie, mug, cap, water bottle, and long sleeve must each have product-accurate mockups, real print zones, and product-specific samples. | Live Design Studio picker exposes all six families. Full uploaded-design and export validation is not complete. | **Partially verified** |
| Mockup realism | Uploaded artwork must blend like printed product artwork, with curvature, texture, restrained shadows/highlights, correct perspective, and no white bloom/ghost silhouettes. | Shared compositor fixes are in source; mug canvas boundary was visually observed. Six-product upload-to-export realism has not been exhaustively verified. | **Partially verified** |
| PSD/PSB expectation | Do not claim a flattened PNG is a real Photoshop smart object; use explicit mockup manifests, zones, masks, and curvature rules. | Shared compositor architecture exists, but a complete auditable source-manifest/PSD-master mapping is not yet documented for every product. | **Locally implemented / open documentation** |
| Print zones | Artwork must remain inside the correct printable surface and exclude handles, caps, seams, necks, sleeves, pockets, and other non-print areas. | Natural-pixel transform and shared clipping fixes are implemented. Live mug left/right/wrap controls are visible. All faces/colors/products still need visual regression. | **Partially verified** |
| Uploaded images | Upload validates file type/size, uses natural dimensions, auto-fits to active zone, selects the layer, and opens the helpful layer section. | Shared auto-fit contract is present; visible delete/replace and full interaction path remain unverified. | **Partially verified** |
| Layer management | User can delete, replace, hide/show, reorder, and edit uploaded/generated layers without losing history. | Layer panel was identified as an outstanding audit point; full live interaction not proven. | **Open / failed** |
| Text and design tools | Text, shapes, drawing, QR, templates, and AI art create editable layers, select them, and update preview/export/cart/3D in real time. | Shared renderer changes exist; end-to-end live tests for every layer type are not complete. | **Open / failed** |
| Product colors | White, black, navy, maroon, olive, sky blue, grey, red, and other supported color variants must render without cutoffs or over-highlighting. | Live T-shirt color controls observed; full mockup/color matrix not verified. | **Partially verified** |
| Premium samples | High-conversion sample designs should be product-specific, premium, realistic, and consistent across all six families. | Six sample assets were generated and canonical paths updated earlier. CTR has not been measured; complete mapping is not verified. | **Partially verified** |
| Mug styles | General Mug, Love Shape Handle, Blue Rim, Yellow Rim; general mug ৳449; styled mugs ৳550; general customization +৳99; styled design/customization +৳70; one-size only. | Live API and live ProductDetail show all four variants, prices, fees, stock, and no apparel sizes. The latest ProductDetail hero-price correction remains pending CI/live verification. | **Partially verified** |
| Short-sleeve fits | Regular Fit and Drop-Shoulder 220 GSM; base ৳450; customization +৳99; drop-shoulder stock colors Black, White, Off White; apparel sizes correctly shown. | Live API shows both variants, prices, fees, sizes, colors, and stock. Product-page and cart/order duplication checks remain. | **Partially verified** |
| Other product sizing | Mug, cap, and bottle must not show apparel sizes; apparel must show relevant sizes only. | Live API one-size response verified; live Design Studio mug has no apparel sizes. Other product pages/colors still need a matrix check. | **Partially verified** |
| Catalog completeness | Product page must show 50 products per page, page 2 remaining products without repetition, complete images, placeholders only when truly missing, and six-category homepage showcase with at least 20 products. | Live catalog was observed as 70 products with page-1/page-2 continuity in earlier audit; current image coverage and homepage composition require a fresh evidence pass. | **Partially verified** |
| Image performance | Product images must load quickly, normalize URLs, lazy-load where appropriate, avoid broken assets, and use responsive dimensions/preload strategically. | Shared URL normalization and placeholders were implemented; no measured Web Vitals/image waterfall report has been completed. | **Open / failed** |
| Checkout policy | Wallet-only bKash/Nagad/uPay upfront payment; 25% advance; remaining amount COD; no COD as an upfront gateway. | Source checkout enforces advance/full mode and wallet methods; real deployed order smoke test not completed. | **Partially verified** |
| Payment details | Correct number display, sender last four digits, transaction ID where required, screenshot proof upload, admin evidence link. | Source implementation exists; live upload/admin review not verified. | **Locally implemented** |
| Order creation | Place Order must create a real order, show animated success, order number/status, tracking button, and avoid bad-url/non-success errors. | Source includes retry handling and success state; real transaction was not performed. | **Open / failed** |
| Order/payment sync | Admin payment confirmation must update customer-visible payment status; delivery status and tracking must remain synchronized. | Earlier work addressed this, but live admin/customer round trip remains unverified. | **Open / failed** |
| Historical orders | Restore 73 historical orders from prior Neon shards and display them in admin. | Restoration was reported earlier; current live admin access/history has not been verified in this audit. | **Partially verified** |
| Admin | Login, dashboard, order details, payment proof, mockup gallery CRUD/override, product management, settings, responsive layout. | Payment-proof viewer commit exists; full admin login and CRUD smoke test remains outstanding. | **Open / failed** |
| Promotions | 99% of rewards should be 5–10% discounts; rare 0.01% expensive reward; premium dynamic spinner visuals; server-side reward validation. | Contact cooldown and one-spin prior-order guard exist. Reward weights/visual quality/cross-device tests remain. | **Partially verified** |
| Promo popup | Returning visitors should not see the 15-minute contact/email popup repeatedly after dismissal across reloads/tabs. | Abandoned-cart dismissal persistence was implemented. Live behavior was observed but full cross-device validation is incomplete. | **Partially verified** |
| Guest abuse | Multi-guest accounts and repeated spins/codes must be rate-limited durably, not only by browser storage or process memory. | Contact/IP cooldowns and order-history guard exist; durable distributed identity/rate limit and bypass testing remain. | **Partially verified** |
| Bundle offer | Buy five, get one free or configured equivalent must be clearly represented and server-validated. | Requirement was recorded, but current implementation/evidence is not complete. | **Open / failed** |
| Mobile responsiveness | Checkout, Design Studio, product pages, header, cards, panels, and admin must have no cutoffs/overlaps at mobile widths. | Several live desktop-width checks exist; complete mobile matrix not run. | **Open / failed** |
| Backend/database | Neon connectivity, failover probe, migration safety, order integrity, storage URLs, timeouts, and historical data. | Schema/migrations and API tests pass locally; live failover/order/storage verification incomplete. | **Partially verified** |
| Deployment | Cloudflare Pages current commit, Render current commit, CI, security scan, API proxy/CORS, and asset publication. | `8954683` CI build/security passed; `981feac` ProductDetail price fix was still in progress at report cutoff. | **Partially verified** |
| Security | Rotate exposed Render API key, audit admin/session/upload/storage boundaries, dependency advisories, and secrets. | Security scan passed for `8954683`; the previously exposed key still requires rotation by the user. | **User action required** |
| Mobile app | Expo typecheck/build and smoke-test home, product, cart, checkout, and deep links. | Not completed in the current audit evidence. | **Open / failed** |
| Documentation | Provide a single clean report for another AI/developer with exact files, commits, live evidence, root causes, and next actions. | This audit and PDF are being created now. | **In progress** |

## Known evidence boundaries

A read-only browser audit can verify rendering, navigation, API responses, and non-transactional controls. It must not submit a real order, payment, admin mutation, or credential change without explicit user confirmation. Therefore, checkout order creation, payment-proof upload, admin payment confirmation, and credential rotation remain explicitly unverified or user-action items unless the user authorizes those sensitive operations.
