# Done — Phase 14 Deployment Fixes (Proxy + Backup Sync)

**Status:** Done (partial — CI/CD and health monitoring still open)  
**Completed:** 2026-07-22  
**Owner:** Main agent

---

## Summary

Fixed the most dangerous deployment and backup issues. CI/CD and external health monitoring are still pending and will be addressed in a later phase.

---

## Tasks completed

- [x] Removed hardcoded Render backend URL from Cloudflare Pages proxy (`functions/api/[[path]].ts`).
- [x] Made `API_URL` required in CF Pages proxy — returns 503 if missing, no fallback.
- [x] Fixed backup sync safety (`artifacts/api-server/src/lib/dbBackupSync.ts`):
  - Removed `TRUNCATE ... CASCADE`; replaced with DELETE in child-before-parent order.
  - Added source-empty verification so a corrupted/empty source cannot wipe backups.
  - Added source/target URL match guard.
  - Removed `healMissingColumns` auto-schema mutation.
  - Added schema-mismatch check that fails the sync instead of silently altering targets.
- [x] Rebuilt API server after changes.
- [x] Restarted API server workflow — running cleanly.
- [x] `pnpm --filter @workspace/api-server run typecheck` passed.
- [x] Updated `CRITICAL_FINDINGS.md` to mark these issues as fixed.

---

## Tasks still open in Phase 14

- [ ] Add CI/CD pipeline configuration (GitHub Actions / equivalent).
- [ ] Unify health checks and configure external monitor to use them.
- [ ] Add CPU/RAM/performance monitoring to admin health widgets.
- [ ] Verify `_redirects` has `/sitemap.xml` proxy line before `/*`.
- [ ] Document rollback plan and staging environment.

---

## Files changed

- `functions/api/[[path]].ts`
- `artifacts/api-server/src/lib/dbBackupSync.ts`

---

**Last Updated:** 2026-07-22
