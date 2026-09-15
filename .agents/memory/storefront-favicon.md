---
name: Storefront missing PWA assets
description: favicon and manifest.json files referenced in index.html were absent from public/, causing a silent 404 on every page load.
---

# Missing favicon/manifest assets

`index.html` referenced `/favicon.svg`, `/favicon-32.png`, `/favicon-16.png`, `/favicon.ico`, `/apple-touch-icon.png`, and `/manifest.json`, but none of these files existed in `artifacts/trynex-storefront/public/`. This produced a 404 on every single page load (not specific to Design Studio), easy to miss since it doesn't break functionality.

**Why:** Likely dropped during a branding/asset migration; `BrandingUpdater.tsx` only overrides the favicon href at runtime if an admin-configured `siteIcon` is set — it does not create the static fallback files.

**How to apply:** If a similar silent 404 shows up for `/favicon*` or `/manifest.json`, regenerate from a brand-colored SVG using ImageMagick (`convert -background none favicon.svg -resize NxN out.png`) rather than assuming it's a proxy/dev-server artifact. Also check `index.html`'s `<link rel="prefetch">` hints for mockup images — they can point to stale/wrong filenames (e.g. a non-transparent variant) even when the actual React code uses the correct asset.
