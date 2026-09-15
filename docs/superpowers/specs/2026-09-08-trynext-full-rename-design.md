# Trynext Lifestyle Full Rename and Cloudflare Cutover

## Status

Design revised after the requested full-scope rename decision. Implementation
starts only after this document is reviewed.

## Goal

Move the product identity from the historical `Trynext`/`trynext` naming to
`Trynext Lifestyle`/`trynext` across the active application, repository and
artifact identifiers, deployment configuration, metadata, documentation, and
Cloudflare Pages hosting.

The new Cloudflare Pages project and canonical preview host will be:

```text
trynext.pages.dev
```

The existing production site must remain available until the new project has
passed its build and live verification gates.

## Current verified context

- The active GitHub repository is currently named `trynext-lifestyle`.
- `georgelsmith333-hub/trynext-lifestyle` is available for the repository rename.
- The active Cloudflare Pages project is `trynext-lifestyle`, sourced from the
  old repository, and currently serves `trynext.pages.dev` and
  `trynext.pages.dev`.
- The Cloudflare Pages project name `trynext` is available.
- `trynextshop.com` does not currently resolve, so it must not be presented as a
  working production domain or invented as a replacement for the existing
  custom domain.
- The latest active Pages deployment is healthy and must be preserved as the
  rollback target during the cutover.

## Scope

### Application and runtime identity

- Replace customer-facing `Trynext`/`trynext` branding with `Trynext Lifestyle`
  and `trynext`.
- Update document titles, descriptions, Open Graph metadata, JSON-LD, sitemap
  hostnames, robots directives, canonical URLs, emails, notifications, seeded
  content, settings defaults, and public API examples.
- Update active API CORS/origin configuration and frontend API URL defaults to
  the new canonical Pages host where appropriate.
- Preserve customer data values that are historical records or user content;
  do not mutate order history, uploaded artwork, product records, or admin
  audit data merely because they contain an old brand string.

### Repository and artifact identifiers

- Rename the GitHub repository to `trynext-lifestyle`.
- Update the local git remote after the GitHub rename; do not force-push or
  overwrite history.
- Rename tracked artifact directories and workspace package names from
  `trynext-*` to `trynext-*` where they represent this product.
- Update package filters, workspace references, scripts, workflow commands,
  artifact manifests, preview paths, source maps, and documentation.
- Use the artifact validation workflow for `artifact.toml` changes rather than
  editing registered artifact manifests outside the supported flow.
- Update tracked reports, source metadata, audit references, and docs that are
  project identity references. Do not rewrite binary contents or checksummed
  Smart Object source data solely to change a brand string.

### Cloudflare migration

1. Finish and verify the source rename while the current Pages project remains
   the rollback deployment.
2. Rename the GitHub repository and confirm the renamed repository is accessible.
3. Create or configure the Cloudflare Pages project named `trynext`, sourced
   from `georgelsmith333-hub/trynext-lifestyle`, with the verified build
   command and output directory.
4. Confirm the new `trynext.pages.dev` deployment reaches a successful
   production stage.
5. Add the existing custom domain only after the new project is healthy, if
   Cloudflare accepts the domain transfer without disrupting the old site.
6. Make `trynext.pages.dev` the canonical URL in application metadata and
   sitemap output.
7. Keep the old Pages project and `trynext.pages.dev` available as a
   rollback/redirect path until the user confirms the cutover.

The unavailable `trynextshop.com` domain is explicitly out of scope for DNS
creation in this migration. If it is later registered and pointed to
Cloudflare, it can be added as a separate domain change.

### Legacy Workers check

The old `trynex-liestyle` Workers Build integration is a separate resource from
the active Pages deployment. It must not be deleted blindly. After the new
Pages project is healthy, inspect whether the old build integration can be
disabled or removed through the Workers Builds API. If Cloudflare still rejects
the token for that specific API surface, document the required Workers Builds
configuration permission and leave the live Pages project unchanged.

## Compatibility and rollback

- Keep the old Pages project intact during the migration.
- Preserve the old repository URL through GitHub's rename redirect.
- Add explicit old-to-new URL redirects where they can be handled without
  interfering with `/api/*`, asset paths, sitemap, or SPA routing.
- Do not change database schemas, storage bucket names, auth identifiers, or
  payment provider identifiers solely as part of the brand rename.
- Keep old API origin values as server-side fallback aliases only where removing
  them would break existing mobile builds or deployed clients.
- Roll back by restoring the old Pages project as the production target and
  reverting only the rename commits; never rewrite history.

## Implementation phases

1. Inventory all tracked textual references and path-based imports; classify
   each as public identity, active runtime identifier, compatibility alias,
   historical evidence, or immutable asset provenance.
2. Write and review a mechanical rename map before applying it. The map will
   cover case variants (`Trynext`, `trynext`, `TRYNEXT`) and target variants
   (`Trynext`, `trynext`, `TRYNEXT`), while excluding secrets and customer data.
3. Rename source paths and package/artifact identifiers, update imports and
   filters, then run static checks before any Cloudflare mutation.
4. Update active runtime URLs, metadata, redirects, sitemap, robots, email and
   notification copy, and settings defaults.
5. Run the complete local validation suite, including Smart v10.3 release
   validation and browser flows.
6. Commit the coherent rename, push normally to the existing repository, and
   confirm the old Pages build still succeeds as a rollback build.
7. Rename the GitHub repository, update the remote, create/configure the new
   Cloudflare Pages project, and trigger the first new deployment.
8. Verify the new Pages host and all required public routes, then perform the
   controlled domain/redirect cutover.
9. Re-run the full verification suite against the new canonical hostname and
   record the final state in `AGENT_HANDOFF.md`.

## Verification gates

### Static and build gates

- No unintended old-brand references remain in active source/configuration.
- No broken imports, package filters, artifact manifests, or workflow commands.
- Storefront typecheck, tests, and production build pass.
- API typecheck/build pass.
- Mobile and promo package checks pass where affected.
- Smart v10.3 structural release gate remains `188/188`.
- Runtime role matrix remains `188 surfaces / 1,128 roles`.

### Browser and route gates

- Product, cart, checkout, authentication, admin, and Design Studio flows work.
- Uploaded artwork remains visible on mockups.
- Mobile sticky purchase action remains visible.
- New canonical host returns 200 for the storefront and required static assets.
- `/robots.txt`, `/sitemap.xml`, API gateway routes, and old-to-new redirects
  return expected status codes.
- No route escapes the artifact base path or points at the old canonical host.

### Cloudflare and GitHub gates

- GitHub repository rename completes without a force-push.
- New Pages project is connected to the renamed repository.
- New production deployment reaches `success`.
- `trynext.pages.dev` serves the verified build.
- Existing custom-domain traffic remains available or redirects safely.
- Old project remains available until final user confirmation.

## Risks and mitigations

- **Artifact registry breakage:** use supported artifact-manifest validation and
  verify registration after path changes.
- **Cloudflare source disconnect:** create the new project before retiring the
  old one; verify GitHub source and deployment independently.
- **Mobile clients with old API URLs:** preserve server-side aliases and avoid
  changing persisted customer/order data.
- **False Smart Object regressions:** do not rename or regenerate binary
  mockup sources unless a path reference requires it; rerun the structural and
  visual gates after path updates.
- **SEO duplication:** make the new host canonical only after it serves the
  complete site, and keep old host redirects deterministic.
- **Stale Workers check:** treat the legacy Worker as separate infrastructure;
  do not delete it without a successful, scoped API operation and verification.
