---
name: DB schema location and structure
description: Where the Drizzle schema lives and key design decisions about the database.
---

# Database Schema

## Location
`lib/db/src/schema/index.ts` — single file with all table definitions.
`lib/db/src/index.ts` — connection setup with automatic failover.

## Connection priority
1. `DATABASE_URL_MAIN` (Neon primary — ep-proud-hill) — preferred
2. `DATABASE_URL` (Replit built-in / local dev)
3. `DATABASE_URL_TRYNEXT_DB` (Neon secondary)
4. `DATABASE_FAILOVER`

## Key tables
- `productsTable` — products with `colorVariants` JSONB
- `categoriesTable` — product categories
- `settingsTable` — key/value site settings (announcement bar, pricing, etc.)
- `ordersTable` — customer orders with `items` JSONB
- `adminTable` — admins (passwordHash, totpSecret)
- `adminSessionsTable` — DB-backed admin sessions (NOT JWT); tokenHash field
- `customersTable` — customer accounts (passwordHash or OAuth IDs)
- `promoCodesTable` — discount codes
- `reviewsTable` — product reviews
- `blogPostsTable` — blog content
- `hamperPackagesTable` — gift hamper packages
- `testimonialsTable` — homepage testimonials

## Admin auth design
Admin sessions stored in `adminSessionsTable` with hashed tokens (NOT JWT).
Admin password from `ADMIN_PASSWORD` env var; also checked against DB admin table using argon2/sha256.
`createAdminSession` in `lib/adminSessions.ts` handles session creation.

**Why:** DB-backed sessions allow instant revocation (revokedAt field). JWT cannot be invalidated without a blocklist.
