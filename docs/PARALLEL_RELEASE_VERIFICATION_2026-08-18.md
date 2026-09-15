# Parallel Release Verification — 2026-08-18

## Executive verdict

The verification work was executed concurrently across repository state, live production HTML/bundle probes, local service-worker output, and the automated storefront flow. The core application flow is healthy, but the release is **not yet a zero-legacy production release** because the current Cloudflare-served JavaScript bundle still contains stale strings and the generated `dist` tree still includes legacy public mockup files that can enter the service-worker precache.

## Results

| Check | Result | Finding |
|---|---|---|
| GitHub CI for `a7bf2ff74` | Pass | CI completed successfully. |
| Active app verification for `a7bf2ff74` | Pass | Completed successfully. |
| Local source legacy scan | Pass | Zero `source-kit-v3`, `smart-v3`, normalized, or normalized-cutouts references in `src`. |
| Local generated JS bundle scan | Pass | Zero legacy matches in `dist/assets`; 46 smart-v4 matches. |
| Full local `dist` scan | Fail | 486 legacy matches remain in copied public/static files; 46 smart-v4 matches. |
| Local smart-v4 asset URL count | Pass | 45 smart-v4 URL occurrences in `dist`. |
| Live authenticated HTML | Pass | Current Studio HTML contains `/mockups/smart-v4/hoodie/navy/front.png?v=smart-v4`. |
| Live deployed JS bundle | Fail | `index-Bco9Ntqt.js` contains 44 legacy matches and only 2 smart-v4 matches. This indicates the latest purge commit is not yet the bundle being served, or the old bundle is still cached/deployed. |
| Automated storefront flow | Pass | Product options, cart addition, checkout guard, and Design Studio V2 all passed. |
| Playwright runner | Corrected | The repository file is a standalone Node Playwright script, not a Playwright Test spec. It passed when run with an isolated temporary Playwright runtime. |

## Automated flow evidence

The direct standalone flow completed all four assertions against production:

1. Hoodie size S and Navy selection passed.
2. Add to Bag transition passed.
3. Empty checkout redirected to `/cart` passed.
4. Design Studio Back, Navy, and 3D Preview interaction passed.

## Service-worker and static-asset finding

The local JavaScript bundle is clean, but the full `dist` directory is not. The legacy files are still being copied from public/static source folders into the build output. Because the service worker precaches the generated output, a zero-legacy source scan alone is insufficient. The next patch must remove or quarantine the legacy public mockup directories from the production copy set and rebuild the service worker. The target is zero legacy matches across all of `dist`, not only `dist/assets`.

## Live deployment finding

The current authenticated HTML renders a smart-v4 asset, which confirms that the main resolver is active. However, the same live deployment’s JavaScript bundle still contains 44 legacy path strings. The latest commit `a7bf2ff74` passed GitHub workflows but has not been confirmed as the exact bundle currently served by Cloudflare Pages. The deployment must be refreshed or its cache invalidated, then the live bundle must be rescanned until its legacy count reaches zero.

## Release recommendation

Do not call the production release fully clean yet. The application journey itself is passing, and the active Studio image path is smart-v4, but two release gates remain: remove legacy public assets from the production output/service-worker precache, and confirm a Cloudflare deployment serving the new zero-legacy bundle. The reproducible parallel orchestrator is `scripts/parallel_release_verification.sh`.
