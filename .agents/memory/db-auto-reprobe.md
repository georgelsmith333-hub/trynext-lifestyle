---
name: DB auto-failover re-probe
description: lib/db/src/index.ts now re-probes the entire database chain every 60 seconds and switches to the first healthy candidate, enabling automatic recovery to the Neon primary.
---

# Database auto-failover with periodic re-probe

`lib/db/src/index.ts` implements resilient PostgreSQL failover with a 60-second re-probe loop.

**Behavior**
- Startup probe walks the full candidate chain and picks the first reachable DB that has the `products` table.
- A `setInterval` re-probes the chain every 60 seconds, always preferring the highest-priority candidate.
- If the Neon primary recovers while the server is on a fallback, it switches back automatically.
- If the currently active DB fails, it demotes to the next fallback.
- `probeDatabaseChain()` is exported for admin/health endpoints that want to force a check.

**Candidate order**
1. `DATABASE_URL_MAIN` (Neon primary)
2. `DATABASE_FAILOVER` (Neon failover)
3. `DATABASE_URL_TRYNEXT_DB` (Neon secondary, if configured)
4. `DATABASE_PRODUCTS` (products shard / cold mirror)
5. `DATABASE_ANALYTICS` (analytics shard / cold mirror)
6. `DATABASE_URL` (Replit built-in, last resort)

**Why:** The previous implementation only probed at startup, so a temporarily-over-quota primary never recovered automatically. Adding products/analytics as candidates also avoids serving from the empty Replit helium DB when the Neon shards are healthy mirrors.

**How to apply:** When adding or reordering DB candidates, keep the schema validation (`products` table check) and update `getCandidateUrls()` in the same order you want failover to use. Always call `switchTo()` to drain the old pool before replacing `_activePool`/`db`/`url`.
