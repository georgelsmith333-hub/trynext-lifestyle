# Trynext Agent Works

This file records the current implementation and provider handoff without
containing credentials, tokens, passwords, or private connection values.

## Current Render topology

The intended production topology is:

| Role | Render service | Service ID | Public URL | Routing |
| --- | --- | --- | --- | --- |
| Primary | `trynext-lifestyle-main-render` | `srv-da9pl91f2nfc7388d150` | `https://trynex-lifestyle-main-render.onrender.com` | Sole authority for writes, admin, checkout, AI, scheduler, and backup |
| Read standby | `trynext-api-standby-2` | `srv-da3lhbrbc2fs73aa5opg` | `https://trynex-api-standby-2.onrender.com` | Safe public reads and failover |
| Read DR standby | `trynext-api-standby-3` | `srv-da3luurm8hqs73cbt460` | `https://trynext-api-standby-3.onrender.com` | Safe public reads and failover after repair |
| Retired | `trynext-api` | `srv-d7b774mdqaus73carp70` | `https://trynex-api.onrender.com` | Excluded from routing; quota-suspended |

The source gateway configuration already matches this topology. Render 4 is
the only configured primary, Render 2 and Render 3 are the read pool, and
Render 1 is not used as a fallback for writes or reads.

## Completed local work

- Product cache invalidation now uses one replicated cache-generation update
  instead of thousands of individual Redis REST deletes.
- Product cache keys include the `customizable` filter.
- Homepage product loading is bounded to 24 records for its 20 displayed cards.
- Recently viewed legacy Render image URLs are normalized through the current
  storefront asset path.
- Gateway read failover honors its declared total read time budget.
- Root and storefront gateway copies remain identical.
- API and storefront typechecks, tests, production build, workflow restart,
  and local liveness/readiness/product/public-stats checks passed.

## Provider work still paused

### Render 3

Render 3 currently reports as suspended. The next safe operation is to inspect
the exact service ID above through an authorized Render API connection or the
Render dashboard, then:

1. Confirm it is attached to `georgelsmith333-hub / trynext-lifestyle` and tracks
   `main`.
2. Set `TRYNEXT_RUNTIME_ROLE=standby`.
3. Keep `SCHEDULER_ENABLED=false` and `BACKUP_SYNC_ENABLED=false`.
4. Preserve the shared database/cache configuration without copying any secret
   into source control.
5. Deploy and verify readiness, product reads, sitemap, and server-side
   mutation rejection.
6. Keep it in the read pool only after all checks pass.

The Render API inventory could not be run from this session because secure
credential access was declined. No credential was printed, copied, or logged.

### GitHub and production delivery

The local release is verified but still needs to reach the connected GitHub
`main` branch before Cloudflare Pages can deploy the gateway and storefront
changes. Use the authorized GitHub integration or the repository's normal
secure source-control flow. Never use values copied from screenshots or chat.

After delivery, verify:

- primary-only write/admin/AI routes target Render 4;
- safe public reads fail over between Render 2 and repaired Render 3;
- Render 1 is never selected;
- Cloudflare Pages serves the new gateway;
- live liveness, readiness, products, public stats, sitemap, checkout,
  authentication, and one non-destructive admin health check behave correctly.

### Upstash

Upstash is not available as a configured Replit integration in this workspace.
The Redis REST URL is not currently present in secure project configuration,
and the previous Redis credentials were rejected by the API, which correctly
fell back without crashing.

To configure an existing database, add its REST URL and REST token through the
workspace secure secret flow. Creating a brand-new Upstash database requires
Upstash management access, not only a database REST token. Do not put either
kind of credential in this file, source code, logs, or chat.

## Next safe action

Authorize the GitHub integration for the source push. Separately authorize the
Render API access or perform the Render 3 repair in the Render dashboard. Only
after those provider actions are available should the live deployment and
failover checklist be rerun.