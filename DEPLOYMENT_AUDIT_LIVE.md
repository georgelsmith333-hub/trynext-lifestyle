# Live deployment audit

Date: 2026-08-10 (user timezone context)

## Live URL

- https://trynext.pages.dev/design-studio

## Observed live UI

The live Design Studio loads a complete customer page with the existing product chooser, front/back controls, color controls, upload/text/templates/layers tabs, export buttons, and cart actions. The visible initial mockup is `/mockups/normalized/tshirt-white-front.png`.

The live page did not expose the new repository commit IDs in the extracted HTML. It currently shows the established Design Studio experience and does not prove that the generated PSD source kit is part of the deployed runtime. The browser page source is a Vite app shell, so source-kit files in `attached_assets` are not automatically served to customers.

## Repository state

- Local and origin `main` point to commit `25480ee69403c8972cda3c7c8084ff2235d2a6d0` (`Add editable mockup PSD source kit`).
- The repository has `.github/workflows/ci.yml`, but that workflow only runs checks/builds and uploads temporary GitHub Actions artifacts; it does not deploy to Cloudflare Pages.
- No Cloudflare Pages or Wrangler deployment configuration was found in the repository during the audit.
- Recent GitHub Actions runs for prior commits were recorded as failures; the current live site therefore cannot be assumed to be rebuilt from the latest commit.

## Root cause hypothesis

GitHub being connected to Cloudflare does not guarantee that every pushed commit is serving successfully. The repository CI workflow is not a Cloudflare deploy workflow, and the editable PSDs live under `attached_assets`, which is not a browser runtime path. Even if a Cloudflare build is triggered externally, PSD files are not referenced by the current browser resolver; the live Design Studio intentionally renders normalized PNG/cutout assets.

## Required next steps

1. Inspect the latest CI run failure logs and identify the blocking step.
2. Confirm the Cloudflare Pages project’s configured repository, production branch, root directory, build command, and output directory using the user’s Cloudflare session or project settings.
3. Add an explicit production build/deploy contract or correct the Cloudflare project configuration.
4. Keep PSD masters in the source kit and expose only browser-safe PNG/cutout derivatives to the storefront, while linking each runtime mockup to its source-kit manifest key and PSD master path for export/admin tooling.
