---
name: Product image performance
description: Storefront catalog image delivery and cache decisions for Trynext.
---

Catalog product artwork should use generated, first-party WebP thumbnails for browsing and
gallery surfaces while retaining the larger PNG files as source/runtime masters. The client
may rewrite only the known `/assets/products/*.png` catalog paths to their optimized variants;
unknown and legacy URLs must keep their existing fallback behavior.

**Why:** The catalog PNGs were multi-megabyte files, so browser lazy-loading alone could not
make a growing product grid feel immediate.

**How to apply:** When adding or replacing a static catalog image, generate its optimized
variant, verify the mapped URL exists, and keep the API response bounded. Do not apply this
rewrite to private uploads, Smart Mockup assets, or arbitrary external URLs.