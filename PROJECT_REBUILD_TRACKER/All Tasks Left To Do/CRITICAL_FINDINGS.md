# Trynext Lifestyle — Critical Findings from Phase 1 Audit

This file collects the most important issues found during the complete rebuild audit. Updated as work progresses.

---

## Severity Legend

- **CRITICAL** — Blocks production or causes data loss/security risk. Fix first.
- **HIGH** — Major functional or UX problem. Fix second.
- **MEDIUM** — Should be fixed before launch/polish pass.
- **LOW** — Nice to have, can be deferred.

---

## 1. Frontend Storefront

### CRITICAL
- **3D preview is disconnected from the Design Studio.** `ProductViewer3D.tsx` exists but is not imported or rendered in `DesignStudio.tsx`. The product-switch effect says it defaults to 3D for curved products, but the actual 3D preview is not available in the editor. This breaks the "live 3D preview" promise for mugs, caps, and water bottles.

### HIGH
- **Payment fallbacks are hardcoded.** `Checkout.tsx` has hardcoded bKash/Nagad numbers (`01712-345678`, `01811-234567`) if admin settings are missing. Customers could send money to the wrong place.
- **uPay fallback is empty.** `Checkout.tsx` lists uPay as a payment method but fallback number is `""`, breaking the flow if settings are missing.
- **Mockups use hardcoded local paths.** `CartViewer3D.tsx` and `TypewriterHero.tsx` reference `/mockups/...` PNGs that may not exist in production.
- **Custom design upload may not reach the backend properly.** The mobile design studio passes the image URI to `addItem` but the checkout payload only sends a `customNote` JSON string, potentially losing the actual design file reference.

### MEDIUM
- **Admin AI auto-audit is disabled.** `AdminAIDeveloper.tsx` has `autoAudit` off by default, leaving this feature experimental.
- **Admin sidebar has duplicate concepts.** "Page Designer" and "Page Builder" are separate items that may confuse admins.
- **Checkout auth banner uses sessionStorage.** Dismissal state is lost when the session ends.
- **SEO placeholders in admin.** `AdminSEO.tsx` has hardcoded OG image path and Twitter handle.
- **WhatsApp support number is hardcoded.** `cart.tsx` and `account.tsx` use `8801903426915` directly.

### LOW
- **Placeholder HTML elements.** `ProductDetail.tsx` uses raw placeholders for reviews and design notes; styling may be inconsistent.

---

## 2. Backend API Server

### CRITICAL
- **Runtime secrets update route can modify `process.env` at runtime.** `src/routes/secrets.ts` allows admin secrets to be read/updated via TOTP. `POST /admin/secrets/update` can change arbitrary environment variables. This is dangerous and should be removed or heavily restricted. **FIXED — update routes now return 403 disabled.**
- **Development JWT secret fallback.** `src/lib/customerAuth.ts` and `src/routes/auth.ts` use `dev_only_secret_not_for_production` if `JWT_SECRET` is missing. This must fail closed in production. **FIXED — no fallback; server throws on startup if missing.**
- **Hardcoded salts.** `src/routes/auth.ts:97` uses `trynext_customer_2024` and `src/routes/admin.ts:23` uses `trynext_salt_2024` as fallbacks. These are security risks. **FIXED — no fallback; legacy salt must be set via env var if needed.**
- **Hardcoded admin password fallback.** `src/routes/admin.ts` had a hardcoded admin password for non-production. **FIXED — no fallback; server throws on startup if missing.**
- **Backup sync uses `TRUNCATE ... CASCADE`.** `lib/dbBackupSync.ts` wipes target databases before inserting. If the source is corrupted or empty, backups are destroyed. **FIXED — replaced with DELETE in child-before-parent order plus source-empty verification.**
- **Backup sync auto-heals schema by altering targets.** `healMissingColumns` bypasses migration versioning and can create ghost schemas. **FIXED — removed auto-heal; sync now fails if schemas differ.**

### HIGH
- **Hardcoded public URLs.** `src/routes/seo.ts` and `src/routes/orders.ts` hardcode `https://trynext.pages.dev` as a fallback. This breaks when the site is copied/staged.
- **Hardcoded deployment path.** `src/routes/deployment.ts:27` hardcodes `/home/runner/workspace`.
- **AI rate limiter applies to admin and public equally.** `src/app.ts:284` uses one limiter for both `/api/ai` and `/api/admin/ai`, which can block admin work.
- **Many routes are thin placeholders.** `referrals.ts`, `testimonials.ts`, and similar are minimal wrappers that may not be fully implemented.
- **API server build is fragile.** `build.mjs` has a large `external` list and a CJS shim for ESM output, making builds error-prone.

### MEDIUM
- **Telegram webhook has many fallbacks.** `src/routes/telegramWebhook.ts` has fragile fallback logic for `API_PUBLIC_URL` and `TELEGRAM_BOT_USERNAME`.
- **Scheduler self-ping uses hardcoded `localhost`.** `scheduler.ts` line 10 prevents cold starts but assumes a fixed port.
- **Health checks are fragmented.** Multiple endpoints check health in different ways; no single external monitor is configured to use them.

---

## 3. Database Schema

### CRITICAL
- **No foreign key constraints.** The schema uses `integer("column_id")` but almost no `.references(() => table.id)`. This allows orphaned records across the entire database. **FIXED — FKs added to all relation columns.**
- **Status and role columns are plain text.** `orders.status`, `admin_sessions.role`, `blog_posts.published`, etc. use `text()` with no enum or check constraint, allowing invalid values. **FIXED — CHECK constraints added for status, role, and discount type.**
- **Price and rating columns lack range checks.** `products.price`, `orders.total`, `reviews.rating`, `testimonials.stars` have no `CHECK` constraints. **FIXED — CHECK constraints added for prices, totals, ratings, stars, stock, counts.**

### HIGH
- **Missing indexes on foreign keys.** `admin_sessions.adminId`, `products.categoryId`, `orders.customerId`, `reviews.productId`, `reviews.customerId`, `order_messages.orderId`, `notifications.customerId`, and many others are not indexed. Joins and cascading deletes will be slow. **FIXED — indexes added.**
- **Missing indexes on filter columns.** `orders.status`, `orders.createdAt`, `products.featured`, `products.createdAt`, `blog_posts.published`, `blog_posts.featured` lack indexes. **FIXED — indexes added.**
- **JSON blobs for core data.** `orders.items` stores full snapshots in JSONB, making cross-order analytics harder. *(Still a design trade-off; not changed.)*
- **Redundant customer data in orders.** `orders` stores `customerName`, `customerEmail`, `customerPhone` even when `customerId` exists. *(Still a design trade-off; not changed.)*

### MEDIUM
- **Flat address field.** `orders.shippingAddress` is a single text field instead of structured fields. *(Still open.)*
- **`mockupsTable` looks unfinished.** It has both `productId` and `productName`, suggesting loose coupling. *(FK added; productName still exists.)*
- **`referralsTable` lacks customer link.** It tracks `ownerName/Email` but does not reference the `customers` table. *(Still open.)*
- **`customers.guestSequence` appears underutilized.** *(Still open.)*

---

## 4. Design Studio / Mockup Engine

### HIGH
- **3D preview is not integrated.** `ProductViewer3D.tsx` exists but is not used inside `DesignStudio.tsx`. The "3D preview" feature is effectively hidden or removed.
- **Full-wrap mug concept is faked.** The 2D editor only has a localized print zone, and full 360° UV generation is not exposed to the user.
- **Custom canvas curvature is approximate.** `composer.ts` uses vertical strip warping to simulate cylindrical wrapping, not true 3D distortion.

### MEDIUM
- **AI image generation exists but may not be fully wired.** Models are listed but verify that credits/usage are tracked and results are stored correctly.
- **Browser-side background removal fallback exists.** Should verify quality and performance on mobile.
- **HD upscaling is browser-based.** May be slower and lower quality than server-side upscaling.
- **Mug uses horizontal flip for right side.** No dedicated right-side photo exists.
- **Long Sleeve has no dark photo variants.** Dark colors use SVG tint on cutout only.
- **Cap has no dark cutout PNG.** Dark colors use tint on white cutout.

### LOW
- **Water tumbler product was removed.** Note in `mockups.tsx` says it was duplicate; verify this is intentional.
- **Cap front panel micro-highlight is missing.** Minor visual polish item.

---

## 5. Admin Dashboard

### HIGH
- **Dashboard uses hardcoded fallback data.** `Dashboard.tsx` lines 16-31 and 239 have hardcoded weekly revenue/payment distribution when the API is unavailable or incomplete.
- **No admin user/permission management page.** Only `AdminCustomers.tsx` exists for buyers; no role/permission UI for staff.
- **Order management flags missing studio assets.** `AdminOrders.tsx` line 456 shows a "Studio Assets Missing" warning, indicating design file sync issues.
- **AI developer system prompt is hardcoded.** `AdminAIDeveloper.tsx` contains a huge hardcoded prompt describing the entire stack.
- **Page Designer vs. Page Builder overlap.** Two separate admin routes may be redundant.

### MEDIUM
- **No billing/cost module.** R2/Redis/AI usage costs are not tracked or billed internally.
- **Limited monitoring.** `SystemHealthWidget` only monitors DB/Redis/R2/Telegram connectivity, not CPU/RAM/performance.
- **No bulk product edit or CSV import/export.** `AdminProducts.tsx` is manual-only.
- **Production notice dismissal is localStorage-based.** `Dashboard.tsx` line 58 stores dismissal per device, not per account.

### LOW
- **Chart colors are hardcoded.** `Dashboard.tsx` line 249 uses hardcoded opacity values instead of theme tokens.

---

## 6. Mobile App (Expo)

### HIGH
- **Payment numbers are hardcoded.** `app/checkout.tsx:42-43` uses `01XXXXXXXXX` placeholders for bKash/Nagad if site settings fail.
- **Design Studio uses fallback products.** `app/(tabs)/design.tsx:117-122` has hardcoded `FALLBACK_PRODUCTS` when the API fails.
- **Custom design file may not be sent to checkout.** `app/(tabs)/design.tsx:196` passes image URI to `addItem`, but `app/checkout.tsx:140-165` only sends `customNote` JSON, potentially losing the design reference.
- **Base URL depends on `EXPO_PUBLIC_DOMAIN`.** `lib/api.ts:4` defaults to empty string if missing, breaking all API calls.
- **Error handling uses generic messages.** `app/checkout.tsx:172` and other catch blocks rely on haptics without clear visual prompts for all failure modes.

### MEDIUM
- **Mockup config is hardcoded.** `app/(tabs)/design.tsx:47-108` uses a fixed `MOCKUP_CONFIG` mapping.
- **WhatsApp number hardcoded.** `cart.tsx` and `account.tsx` use `8801903426915` directly.
- **Web-specific footer height.** `app/(tabs)/design.tsx:444` uses a fixed height that may not fit all mobile screens.
- **Cart/web sync may be incomplete.** Verify guest cart and authenticated cart share state with the web storefront.

### LOW
- **Design Studio mobile UI may need UX polish compared to the web studio.**

---

## 7. Deployment / DevOps

### CRITICAL
- **Cloudflare proxy had a hardcoded Render backend URL.** `functions/api/[[path]].ts` used `https://trynex-api.onrender.com` as fallback. If `API_URL` env var was missing, traffic could hit the wrong backend. **FIXED — proxy now returns 503 if API_URL is missing; no hardcoded fallback.**
- **Backup sync truncated target databases.** `lib/dbBackupSync.ts` used `TRUNCATE ... CASCADE`, risking total backup loss if source was corrupted. **FIXED — replaced with DELETE in child-before-parent order and source-empty verification.**
- **Backup sync auto-healed target schemas.** `healMissingColumns` altered target columns without migration versioning. **FIXED — removed auto-heal; sync now fails if schemas differ.**
- **No CI/CD pipeline.** No GitHub Actions, GitLab CI, or explicit pipeline files. Deployment is manual or platform-magic only. *(Still open.)*

### HIGH
- **Build process is fragile.** `artifacts/api-server/build.mjs` has a massive `external` list and a CJS shim for ESM output.
- **Runtime env injection causes split-brain.** `src/routes/secrets.ts` previously updated `process.env` in-memory, so the running container differed from the cloud provider's configured secrets. **FIXED — update routes disabled.**
- **Health checks are fragmented.** Multiple endpoints check health differently; no external monitor uses them. *(Still open.)*
- **No external uptime monitoring configured.** UptimeRobot endpoint exists but evidence of integration is not confirmed. *(Still open.)*

### MEDIUM
- **`_redirects` needs `/sitemap.xml` proxy line before `/*`.** Per project memory, this has caused silent SEO issues before. *(Still open.)*
- **Git push blocked in Replit.** Must use GitHub REST API for pushes (per project memory). *(Still open.)*
- **API server build requires manual rebuild.** No hot-reload; edits require `node ./build.mjs` and workflow restart. *(Still open.)*

---

## Next Steps

1. Continue Phase 14: fix remaining deployment issues (CI/CD, health checks, monitoring).
2. Address remaining HIGH frontend issues (3D preview, hardcoded payment numbers, mockup paths).
3. Address admin dashboard gaps (real data, role management, billing).
4. Address mobile app issues (design file upload, hardcoded values).
5. Continue through remaining phases until all 14 are complete.

---

**Last Updated:** 2026-07-22
