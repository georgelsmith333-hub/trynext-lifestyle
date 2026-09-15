---
name: Monitoring Endpoints
description: Liveness/readiness endpoints for external monitoring; CPU/memory metrics added to system health; GitHub Actions CI/CD configured.
---

## Monitoring Endpoints

### Liveness & Readiness (`routes/health.ts`)
- `GET /api/health/liveness` — Always returns 200 `{ status: "ok", timestamp, uptime }`. No DB query. Use for external uptime monitors (UptimeRobot, Pingdom, etc.).
- `GET /api/health/readiness` — Pings the DB. Returns 200 `{ status: "ok", db: true, ... }` or 503 `{ status: "error", db: false, ... }`. Use for K8s readiness probes or deployment checks.

### Performance Metrics (`routes/systemHealth.ts`)
The admin system health endpoint now includes a `performance` block:
```json
{
  "performance": {
    "uptime": 3600,
    "memoryMB": 203,
    "memoryHeapMB": 145,
    "cpuLoad": [0.5, 0.3, 0.2],
    "nodeVersion": "v20.11.0"
  }
}
```
Requires `os` module import and `osLoadAvg()` helper function.

### CI/CD (`./github/workflows/ci.yml`)
GitHub Actions workflow with:
- Build and typecheck for all packages
- Lint check (non-blocking)
- Security audit (`pnpm audit`)
- Build artifact upload
- Triggered on push/PR to `main` and manual dispatch

**Why:** External monitoring needs endpoints with stable response shapes that don't require auth tokens. Liveness is ultra-lightweight (no DB) so it won't cause false alerts during DB restarts; readiness actively verifies the critical dependency.

**How to apply:** Point UptimeRobot (or similar) to `https://api.trynext.pages.dev/api/health/liveness` for 5-minute checks, and `https://api.trynext.pages.dev/api/health/readiness` for 30-second deployment health checks.
