# Trynext Lifestyle

Trynext Lifestyle (trynext.shop) is a print-on-demand e-commerce storefront for Bangladesh — custom T-shirts, hoodies, mugs, and caps — with a browser-based Design Studio, an admin back office, and a companion mobile app.

## Mandatory Agent handoff

### Mandatory startup command for every new or Remixed Agent

> **START HERE — do not edit anything yet.** Read `AGENTS.md`,
> `AGENT_HANDOFF.md`, and `replit.md` first. Then inspect the current project
> state and respond with these headings: **Completed**, **Last stopping point**,
> **Remaining work**, **Blockers**, **Plan**, **Existing behavior to preserve**,
> **Verification**, and **Safe parallel work**. Submit the plan before editing.
> Preserve all working features, update related before/after paths together,
> keep the handoff current while working, reconcile and verify parallel work,
> and finish with the exact **Status**, **Last completed**, **Stopped at**,
> **Files/areas changed**, **Remaining work**, **Blocker**, **Next safe action**,
> and **Verification** in `AGENT_HANDOFF.md`. If work stops early, provide the
> same handoff instead of leaving the next Agent to infer anything from chat.

Before any Agent plans or edits work in this project, it must read:

1. `AGENTS.md`
2. `AGENT_HANDOFF.md`
3. `replit.md`

These files are the durable project context intended to survive a project copy or
Remix. The current user's request and newer explicit project-owner decisions remain
the highest-priority instructions. Agents must preserve existing work, submit a
plan before implementation, update related before/after paths together, reconcile
parallel work, verify changes, update `AGENT_HANDOFF.md`, and provide a completion
note before closing. In every new chat, the first response must clearly state what
is complete, where work stopped, what remains, blockers, the proposed plan,
preserved behavior, verification, and safe parallel work. If work pauses or is
blocked, the handoff must state the exact stopping point and next safe action.
Do not place secrets or private session values in these files.

## Run & Operate

- `pnpm --filter @workspace/trynext-storefront run dev` — customer storefront + admin panel (Vite/React)
- `pnpm --filter @workspace/api-server run dev` — Express API (serves compiled `dist/index.mjs`; run `node ./build.mjs` inside `artifacts/api-server` after editing server TypeScript, then restart the workflow — the dev script does **not** hot-reload source)
- `pnpm --filter @workspace/trynext-mobile run dev` — Expo mobile app
- `pnpm --filter @workspace/trynext-promo run dev` — promo animation (video-js style artifact)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `DATABASE_URL` / `DATABASE_URL_MAIN` (Neon Postgres), `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (cache), `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET` (Cloudflare R2 object storage), `JWT_SECRET`/`ADMIN_JWT_SECRET`/`ADMIN_PASSWORD` (auth), `TELEGRAM_BOT_TOKEN` (order notifications; chat ID is stored in the `settings` table via Admin → Telegram, not an env var), `CLOUDFLARE_API_TOKEN` (deploy hooks)

## Stack

- pnpm workspaces monorepo, Node.js, TypeScript
- Frontend: Vite + React (storefront + admin), Expo/React Native (mobile), Wouter for routing
- API: Express 5, built with esbuild to a single `dist/index.mjs` bundle
- DB: PostgreSQL (Neon) + Drizzle ORM — full schema in `lib/db/src/schema/index.ts`
- Cache: Upstash Redis (REST API)
- Object storage: Cloudflare R2 (S3-compatible), with local/S3 fallback backends in `ObjectStorageService`
- Background removal: remove.bg (API key stored per-tenant in the `settings` table, not an env var); falls back to in-browser WASM removal when unconfigured
- AI art generation: Pollinations (`image.pollinations.ai`) — free, keyless
- Admin AI assistant: Pollinations text API (`text.pollinations.ai`) — free, keyless
- Notifications: Telegram bot
- Hosting: Cloudflare Pages (static frontend) + Cloudflare Pages Functions proxy (`functions/api/[[path]].ts`) forwarding to the API server; set `API_URL` in CF Pages env
- SEO: react-helmet-async (`SEOHead.tsx`) for per-page meta/OG/Twitter/canonical/hreflang tags, JSON-LD structured data on every major page, dynamic `sitemap.xml` at `/api/sitemap.xml`, `robots.txt` (Cloudflare auto-injects its AI-bot content-signal block above our own rules — harmless, still allows Googlebot/Bingbot)

## Where things live

- `artifacts/trynex-storefront` — customer storefront + `/admin` back office (single Vite app)
- `artifacts/trynex-storefront/src/pages/design-studio/` — Design Studio mockup rendering (`mockups.tsx`), curvature/compositing (`composer.ts`), 3D preview (`ProductViewer3D.tsx`)
- `artifacts/trynex-storefront/src/pages/DesignStudio.tsx` — Design Studio main page/state (large file — read in ranges, not all at once)
- `artifacts/api-server` — Express API; routes under `src/routes/`, health checks in `health.ts` + `systemHealth.ts`
- `lib/db/src/schema/index.ts` — source of truth for the DB schema
- `artifacts/trynext-mobile` — Expo mobile app
- `artifacts/trynext-promo` — promo animation artifact

## Architecture decisions

- The API server is a compiled esbuild bundle in dev, not a source-watching process — always rebuild (`node ./build.mjs`) and restart the workflow after editing `artifacts/api-server/src/**`.
- `routes/systemHealth.ts` is the single source of truth for `GET /api/admin/system/health` and `GET /api/admin/system/env-status` (nested `services.*` shape, and an array under `vars`). A duplicate, differently-shaped pair of handlers previously lived in `routes/health.ts` and — because that router mounts first — silently won every request while admin UI widgets were split between expecting each shape, so status displays were wrong or blank regardless of real service health. Do not reintroduce either route in `health.ts`.
- Design Studio's flat 2D canvas renders uploaded designs as flat rectangles by design (precise placement); true curvature/blending for mug/waterbottle/cap only exists in the 3D preview and final composed render (`composer.ts`). The product-switch effect defaults `viewMode` to `"3d"` for curved categories (mug/waterbottle/cap) and `"2d"` for flat apparel so users see accurate blending without manually toggling.
- Print-zone "outside print area" warnings use a bleed tolerance relative to zone size (not a fixed absolute value) and account for layer rotation — a fixed tolerance under-served small zones like the mug/bottle print area.
- Cross-product design propagation (uploading once, auto-placing on every other product) recomputes a contain-fit scale per target zone's own aspect ratio, rather than naively scaling by zone-width ratio, so designs don't overflow zones with a different aspect ratio than the source.

## Product

- Customers: browse products, use the Design Studio to upload/position artwork (2D precise editor + 3D realistic preview) on T-shirts, hoodies, mugs, caps, and water bottles, then order with COD or bKash/Nagad (25% advance deposit on COD).
- Admin: order management, product/catalog management, Telegram order notifications, system health dashboard, GitHub-based deploy pipeline, DB backup/failover sync, AI admin assistant (natural-language commands).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Editing `artifacts/api-server/src/**` requires a manual rebuild (`node ./build.mjs`) + workflow restart — there is no dev-mode source watcher.
- Secure GitHub delivery works with the `x-access-token:$GITHUB_TOKEN` HTTPS form; fetch/merge the published main first and keep credential-bearing attachments out of the outgoing history so GitHub push protection does not reject the release.
- The live `trynext.shop` site is a client-rendered SPA (no SSR/prerendering) — Googlebot renders JS and indexes it, but non-JS crawlers (some social-share bots) only ever see the generic homepage meta tags baked into `index.html`, not per-page `SEOHead` content.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
