# Trynext Lifestyle — Dependency Map

This map shows how the major systems depend on each other, so rebuild work can be ordered correctly.

---

## Layer 1: Infrastructure & Environment

These must be fixed before anything else because everything sits on top of them.

| Component | Depends On | Why It Blocks |
|-----------|------------|---------------|
| API server startup | `DATABASE_URL_MAIN`, `JWT_SECRET`, `ADMIN_JWT_SECRET`, `ADMIN_PASSWORD`, `CUSTOMER_SALT`, `R2_*`, `UPSTASH_REDIS_*` | If secrets or DB are missing, the app will not start or auth will be unsafe. |
| Cloudflare Pages proxy | `API_URL` env var | All frontend API calls route through this. A wrong URL breaks the entire site. |
| Database schema | Migrations, indexes, FK constraints | All features rely on consistent, queryable data. |
| Backup sync | Source DB, target DBs | If backups are unsafe or broken, data is at risk. |

---

## Layer 2: Security & Auth

| Component | Depends On | Downstream Consumers |
|-----------|------------|---------------------|
| Customer JWT (`customerAuth.ts`, `auth.ts`) | `JWT_SECRET`, `CUSTOMER_SALT` | Every customer route, cart, checkout, orders. |
| Admin session (`admin.ts`, `adminSessions.ts`) | `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `ADMIN_SALT` | Admin dashboard, management APIs. |
| Secrets management (`secrets.ts`) | Hosting platform env vars | None — should be read-only. |
| Rate limiting / CSRF / CORS | `app.ts`, proxy headers | All public and admin routes. |

---

## Layer 3: Data & API

| Component | Depends On | Downstream Consumers |
|-----------|------------|---------------------|
| Database schema | Drizzle ORM, Postgres | All routes, admin, analytics, orders. |
| API routes (`src/routes/*`) | Auth, DB schema, external services | Frontend, mobile app, admin. |
| Object storage (`objectStorage.ts`) | R2/S3 credentials | Uploads, exports, mockups, design assets. |
| AI services (`ai.ts`, `aiExecute.ts`) | Pollinations, remove.bg, DB settings | Design Studio, admin AI assistant. |
| Background removal | remove.bg API or WASM fallback | Design Studio uploads. |
| Telegram notifications | `TELEGRAM_BOT_TOKEN`, settings chat ID | Order notifications. |

---

## Layer 4: Frontend Storefront

| Component | Depends On | Downstream Consumers |
|-----------|------------|---------------------|
| Storefront app (`trynext-storefront`) | API client, API server, design studio | Customers. |
| Design Studio (`DesignStudio.tsx`, `mockups.tsx`, `composer.ts`) | Product templates, storage, AI, API | Product page, cart, checkout, mobile app. |
| Product pages | DB products, mockups, reviews | Shop, SEO, cart. |
| Cart / Checkout | Auth, DB orders, payment settings | Order fulfillment. |
| Admin dashboard | Admin auth, API routes, analytics | Store operators. |

---

## Layer 5: Mobile App

| Component | Depends On | Notes |
|-----------|------------|-------|
| `trynext-mobile` | Same API server as storefront | Must share auth, cart, product, and design data. |
| Mobile Design Studio | Storefront design logic | Currently uses hardcoded fallback products. |
| Mobile Checkout | Site settings, orders | Needs to send real custom design references. |

---

## Layer 6: Deployment & DevOps

| Component | Depends On | Notes |
|-----------|------------|-------|
| CF Pages build | `pnpm build` of storefront | Must produce optimized static assets. |
| API server deployment | Render/Railway/Worker + env vars | Must rebuild via `build.mjs` after every source change. |
| CI/CD | GitHub repository, build scripts | Currently missing. |
| Health checks | API routes, DB, Redis, storage | Need a single endpoint used by external monitors. |
| Backups | `dbBackupSync.ts`, scheduled job | Must be safe (no truncate) and verified. |

---

## Recommended Rebuild Order

1. **Layer 1** — Fix environment validation, hardcoded URLs, proxy config.
2. **Layer 2** — Remove hardcoded auth fallbacks, restrict secrets route, harden rate limiting.
3. **Layer 3** — Add DB constraints/indexes, fix backup sync, standardize API routes.
4. **Layer 4** — Reconnect 3D preview, remove hardcoded mockups/payment numbers, fix admin dashboard.
5. **Layer 5** — Fix mobile checkout design reference, remove hardcoded fallback products.
6. **Layer 6** — Add CI/CD, health checks, monitoring, safe backup verification.

---

**Last Updated:** 2026-07-22
