---
name: Admin dashboard health widget vs system-health endpoint shape
description: Two different admin UI surfaces read DB/service status from two different endpoints with different response shapes — easy to introduce a silent field-path mismatch.
---

## The bug
`artifacts/trynex-storefront` has two places showing backend health:
- Admin **Dashboard** `SystemHealthWidget` reads from `/api/admin/system/health` (`artifacts/api-server/src/routes/systemHealth.ts`).
- Admin **Database Cluster** page reads from a *different* endpoint, `/api/admin/db-cluster` (`artifacts/api-server/src/routes/dbCluster.ts`), which independently probes each configured DB node and reports the active one via `getActiveDbUrl()`.

The Dashboard widget was reading `health.db.status` / `health.redis.status` etc., but `systemHealth.ts`'s actual response nests these one level deeper, under `health.services.database.status` / `health.services.redis.status`. Because the field simply didn't exist, the widget always rendered "offline"/undefined regardless of real backend health — while the DB Cluster page (correct endpoint, correct shape) showed "connected." Two admin surfaces disagreeing about the same fact is the symptom of an endpoint/shape mismatch, not two different truths.

**Why:** These two pages evolved independently and never shared a type for the health payload, so a shape change in one endpoint silently desyncs the other's consumer with no compile-time or runtime error (just wrong-looking UI).

**How to apply:** When two admin surfaces show contradictory status for the same underlying thing (DB, cache, storage, etc.), check whether they're actually hitting different endpoints/response shapes before assuming a real backend problem. Ideally share a TypeScript type between the endpoint handler and its consumer(s) so a shape drift is a compile error, not a silent UI bug.
