---
name: ProductDetail JSON-LD aggregateRating
description: Only emit aggregateRating structured data when real review data exists
---

`aggregateRating` in a product's JSON-LD is only included when `stats.total > 0` (real reviews returned by the API) or `product.rating > 0`.

**Why:** an earlier version used `|| 10` as a fallback rating count, which fabricated a review count for products with zero real reviews — misleading structured data shown to Google/search results, and a risk against search engine rich-result policies.

**How to apply:** never backfill a review/rating count with a non-zero fallback for SEO structured data; omit the field entirely when there is no real data.
