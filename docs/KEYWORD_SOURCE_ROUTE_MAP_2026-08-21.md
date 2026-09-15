# Trynext Keyword-to-Source-and-Route Map

**Date:** 2026-08-21  
**Companion checklist:** `KEYWORD_REQUIREMENTS_AUDIT_2026-08-21.md`

## Public browser surfaces

| Surface | Live URL | Primary source | Supporting source or API |
|---|---|---|---|
| Homepage | `https://trynext.pages.dev/` | `artifacts/trynex-storefront/src/pages/Home.tsx` | `/api/products`, `/api/settings`, `/api/categories`, `/api/testimonials`, `/api/blog`, `/api/public-stats` |
| Full catalogue | `/products` | `artifacts/trynex-storefront/src/pages/Products.tsx` | `/api/products`, `/api/categories` |
| Product detail | `/product/:slugOrId` | `artifacts/trynex-storefront/src/pages/ProductDetail.tsx` | `/api/products/:id`, cart context |
| Design Studio V2 | `/design-studio` | `artifacts/trynex-storefront/src/pages/studio/DesignStudioV2.tsx` | `pages/design-studio/mockups.tsx`, `canonical-mockup-spec.ts`, `/api/mockups`, `/api/mockup/render` |
| Design Studio V1 | source and compatibility route | `artifacts/trynex-storefront/src/pages/DesignStudio.tsx` | `pages/design-studio/mockups.tsx`, `/api/mockups` |
| Cart | `/cart` and cart drawer | `artifacts/trynex-storefront/src/pages/Cart.tsx`, `components/CartDrawer.tsx` | `context/CartContext.tsx` |
| Checkout | `/checkout` | `artifacts/trynex-storefront/src/pages/Checkout.tsx` | `/api/orders`, payment routes, delivery validation |
| Track order | `/track` | `artifacts/trynex-storefront/src/pages/TrackOrder.tsx` | order lookup API |
| Hampers | `/hampers`, `/hamper/:id` | `pages/Hampers.tsx`, `pages/HamperDetail.tsx` | `/api/hampers` |
| Content and policy pages | `/blog`, `/faq`, `/about`, `/size-guide`, `/shipping-policy`, `/return-policy`, `/privacy-policy`, `/terms-of-service` | matching `pages/*.tsx` modules | `/api/blog` and static content |
| Referral | `/referral` | `pages/Referral.tsx` | `/api/referrals` |
| Admin | `/admin` and subroutes | `pages/admin/*.tsx`, `components/layout/AdminLayout.tsx` | protected `/api/admin/*` and auth routes |

## Backend route ownership

| Contract family | Route source | Key handlers |
|---|---|---|
| Health and readiness | `artifacts/api-server/src/routes/health.ts` | `/healthz`, `/health/liveness`, `/health/readiness`, `/readyz` compatibility alias |
| Products and categories | `routes/products.ts`, `routes/categories.ts` | public reads, admin mutations, product detail |
| Orders and messages | `routes/orders.ts`, `routes/orderMessages.ts` | order creation, idempotency, status, notes/messages |
| Mockup gallery and rendering | `routes/mockups.ts`, `routes/mockupRender.ts` | public canonical matrix, admin overrides, server composite render |
| Storage | `routes/storage.ts`, `lib/objectStorage.ts` | signed upload/download, R2/local backend selection |
| AI and execution | `routes/ai.ts`, `routes/aiExecute.ts`, `pages/admin/AdminAIDeveloper.tsx` | AI status/chat/execution boundaries |
| Social/import | `routes/facebook.ts`, `pages/admin/AdminFacebookImport.tsx` | Facebook import/configuration and safe provider errors |
| Content and marketing | `routes/blog.ts`, `routes/testimonials.ts`, `routes/reviews.ts`, `routes/publicStats.ts`, `routes/newsletter.ts`, `routes/referrals.ts`, `routes/hampers.ts` | public content and admin management |
| Runtime operations | `routes/systemHealth.ts`, `routes/deployment.ts`, `routes/dbCluster.ts`, `routes/backup.ts`, `routes/secrets.ts` | admin-only operational visibility and guarded maintenance |
| Auth and sessions | `routes/auth.ts`, `lib/adminSessions.ts`, `middlewares/adminAuth.ts` | Google/customer/admin authentication and route protection |

## Infrastructure and runtime mapping

| Requirement | Source/configuration | Live evidence target |
|---|---|---|
| Cloudflare gateway | `functions/api/[[path]].ts`, `functions/api/gateway.test.ts` | Public `/api/*`, ordered `X-Trynext-Origin`, CORS, safe-read failover |
| Render runtime roles | `routes/health.ts`, `app.ts`, `lib/runtimePolicy.ts` | Render 2 `standby`, Render 3 `dr`, mutation rejection |
| Scheduler ownership | `lib/scheduler.ts` | Health metadata and scheduler logs; Render 2/3 disabled |
| Backup sync control | `lib/dbBackupSync.ts`, `routes/backup.ts` | `BACKUP_SYNC_ENABLED=false`, no full mirror on standbys |
| Neon topology | `lib/db`, environment contract docs, `routes/dbCluster.ts` | Four existing bindings, one canonical writer, no new DB |
| R2 | `lib/objectStorage.ts`, `routes/storage.ts` | Signed URL operations, storage health, no API binary streaming |
| Static smart-v4 assets | `artifacts/trynex-storefront/public/mockups/smart-v4` and deployed `/mockups/smart-v4/*` | Six-family image status and dimensions |
| CI and release | GitHub Actions workflows, PR checks, Pages deployment history | Typecheck, tests, build, security scan, rollback target |

## Live URL verification set

The next browser/API pass must visit the following public routes and record status, response origin, payload summary, visible errors, and asset failures:

```text
https://trynext.pages.dev/
https://trynext.pages.dev/products
https://trynext.pages.dev/products?category=t-shirts
https://trynext.pages.dev/products?category=long-sleeves
https://trynext.pages.dev/products?category=hoodies
https://trynext.pages.dev/products?category=mugs
https://trynext.pages.dev/products?category=caps
https://trynext.pages.dev/products?category=water-bottles
https://trynext.pages.dev/design-studio
https://trynext.pages.dev/cart
https://trynext.pages.dev/checkout
https://trynext.pages.dev/track
https://trynext.pages.dev/blog
https://trynext.pages.dev/faq
https://trynext.pages.dev/about
https://trynext.pages.dev/referral
https://trynext.pages.dev/hampers
https://trynext.pages.dev/size-guide
https://trynext.pages.dev/shipping-policy
https://trynext.pages.dev/return-policy
https://trynext.pages.dev/privacy-policy
https://trynext.pages.dev/terms-of-service
```

The API verification set is:

```text
/api/healthz
/api/readyz
/api/health/readiness
/api/health/liveness
/api/products?limit=100
/api/categories
/api/mockups
/api/public-stats
/api/blog?sort=views&limit=5&published=true
/api/testimonials
/api/settings
/api/products/80
```

The direct Render verification set is the same health, products, and mockup subset against Render 2 and Render 3. Mutation probes must remain non-creating and must verify that `POST /api/orders` is rejected or pinned safely rather than replayed.
