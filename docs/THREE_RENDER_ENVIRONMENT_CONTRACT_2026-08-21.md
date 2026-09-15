# Trynext Three-Render Environment Contract

**Status:** Prepared for approved implementation; not yet applied to Render dashboards.

## Shared application contract

Render 1, Render 2, and Render 3 must deploy the same tested Git commit and the same start/build commands. They must share the compatible application secrets and service integrations required for reads, but each environment must have an explicit runtime role.

| Variable | Render 1 | Render 2 | Render 3 |
|---|---|---|---|
| `TRYNEXT_RUNTIME_ROLE` | `primary` | `standby` | `dr` |
| `SCHEDULER_ENABLED` | `true` initially, with one-owner controls | `false` | `false` |
| `BACKUP_SYNC_ENABLED` | `false` until the legacy full mirror is redesigned and measured | `false` | `false` |
| `DATABASE_URL_MAIN` | Existing canonical binding | Same canonical read contract; no new database | Same canonical read contract; no new database |
| `DATABASE_FAILOVER` | Existing validated failover binding | Same existing binding only if required for readiness/read failover | Same existing binding only if required for readiness/read failover |
| `DATABASE_ANALYTICS` | Existing analytics binding | Read-oriented only if needed | Read-oriented only if needed |
| `DATABASE_URL_TRYNEXT_DB` | Existing binding; role must be verified | Existing binding only if required | Existing binding only if required |
| `DATABASE_PRODUCTS` | Verify whether configured before use | Do not add automatically | Do not add automatically |
| R2 credentials | Existing bucket contract | Same bucket contract; no duplicate bucket | Same bucket contract; no duplicate bucket |
| Redis credentials | Existing cache/lock contract | Same cache/lock contract if needed | Same cache/lock contract if needed |

`TRYNEXT_RUNTIME_ROLE` is defense in depth. The API rejects all `POST`, `PUT`, `PATCH`, and `DELETE` requests when the role is `standby` or `dr`. Explicit promotion to `promoted` is a controlled operation and must not be performed merely because a health probe fails.

## Cloudflare gateway contract

Cloudflare Pages should hold an ordered `API_ORIGINS` value only after all three origins are verified independently:

```text
https://render-1-origin.example,https://render-2-origin.example,https://render-3-origin.example
```

The gateway tries Render 2 and Render 3 only for the allowlisted safe public GET/HEAD routes after the earlier origin returns a bounded retryable failure. It never blindly replays a mutation body to a later origin. `OPTIONS` is answered at the edge. Safe public responses receive short cache headers and may be stored in the edge Cache API; authenticated, personalized, binary mutation, and state-changing responses remain uncached.

## Required secrets discipline

Secrets must be entered into the Render and Cloudflare dashboards through their protected environment-variable mechanisms. They must not be written into GitHub, source files, `render.yaml`, the Pages bundle, browser-visible configuration, or public documentation. Render 2 and Render 3 must not receive credentials for a new database because no new production database is part of this architecture.

## Promotion rules

A standby is not promoted by a generic health failure alone. Promotion requires confirmation that the primary is unavailable, the canonical data path is healthy, the gateway is routing only approved traffic, and the operator has a rollback path. If a primary write request has an ambiguous result, the system must preserve the unknown state and use the existing idempotency record rather than retrying to a standby.
