# Trynext Lifestyle — Full Photorealistic Smart Mockup Rebuild Handoff Prompt

Copy and paste everything below to the agent who will work on the project.

---

You are taking over the Trynext Lifestyle production repository and customer-facing Design Studio. Work as a senior full-stack product engineer, product-visualization specialist, and release engineer. Do not make cosmetic guesses or create fake assets. First inspect the actual repository and live site, then implement the work in an isolated branch with reviewable commits.

Repository: https://github.com/georgelsmith333-hub/trynext-lifestyle
Customer site: https://trynext.pages.dev

The project is a Bangladesh custom-apparel e-commerce site using React/Vite/Tailwind, Cloudflare Pages, Render API services, Neon databases, Cloudflare R2, and Upstash Redis. The current production rollback is smart-v4. Smart-v7 was retired because it was placeholder-backed and must never be reactivated. The target is a new accepted version, such as smart-v8, only after every required asset passes visual and technical acceptance.

## Non-negotiable rules

Do not claim photorealism unless the images are genuinely photographic and visually accepted. Do not use checkerboards, “ARTWORK HERE”, guide rectangles, fake branded artwork, cartoon/vector products, silver aluminium for the water bottle, rectangular background blocks, green spill, crop artifacts, duplicated objects, mismatched front/back products, or inconsistent product proportions. Do not silently substitute smart-v4 or smart-v7 into the final version. If generation quota, credentials, or an external service blocks a required step, stop that step honestly, preserve the working production version, and report the exact blocker instead of manufacturing a placeholder.

Never commit API keys, Render tokens, Cloudflare tokens, database URLs, passwords, or personal credentials. Use existing project environment variables and authenticated service integrations only. Do not create duplicate database writers, round-robin writes, duplicate schedulers, or a new production architecture unless the repository evidence proves it is required. Preserve the canonical writer and the current Render failover design.

## Phase 1 — Inspect before editing

Clone the repository and inspect the current main branch, the active Design Studio V1/V2 routes, product definitions, mockup resolvers, print-zone geometry, color maps, face controls, upload compositor, export path, API routes, and current CI workflows. Confirm the live production deployment and preserve the previous deployment for rollback. Locate the real source-kit paths under the repository or attached project workspace rather than assuming inherited paths.

Read the canonical matrix from the source code. The current target is 188 live mockup surfaces, but derive the exact family/color/view list from the repository and make the release validator fail if the generated inventory does not match it. Do not hard-code a guessed color list. Confirm the final product contracts for T-shirt, Long Sleeve, Hoodie, Mug, Cap, and Water Bottle.

The required master-view families are approximately 22 photographic masters: T-shirt, Long Sleeve, and Hoodie each require Front, Back, Left Sleeve, Right Sleeve, and Neck/label views; Mug requires its canonical Front/Back/Wrap or Left-Side/Right-Side/Wrap controls exactly as defined by the existing UI; Cap requires Front and Back; Water Bottle requires Front and Back. Use the source code as the final authority for naming and count.

Use the source-kit product photographs and PSD/PSB files as geometry references. Inspect PHOTO_BASE, PRODUCT_ALPHA, print masks, material maps, linked Smart Object layers, and any guide/background layers. Record which files are genuinely usable and which are contaminated. Do not activate an asset merely because it opens successfully in Photoshop.

## Phase 2 — Generate genuine photographic masters

Create or obtain one consistent photographic master for every required family/view. Use the available image-generation/editing capability with the supplied source-kit product photographs as references. Preserve exact product geometry, camera angle, scale, and family identity between front/back/detail views. Generate the following subject constraints:

1. T-shirt: neutral-white 230GSM cotton, complete isolated product, short sleeves, correct collar, visible natural fabric folds, front, back, left sleeve, right sleeve, and neck-label/detail views.
2. Long Sleeve: neutral-white 240GSM cotton, complete shoulder-to-cuff garment, both cuffs present, correct collar, front, back, left sleeve, right sleeve, and neck-label/detail views.
3. Hoodie: neutral-white 320GSM fleece, complete hood, drawstrings, shoulders, full sleeves, cuffs, kangaroo pocket, hem, front, back, left sleeve, right sleeve, and neck/detail views. Never crop the hood, cuff, shoulder, or pocket.
4. Mug: one coherent white 11oz ceramic mug with correct handle and rim, consistent lighting and scale, with the exact front/back/wrap or side views required by the source contract. Never duplicate the handle or show a floating rectangular print panel.
5. Cap: one structured white cotton-twill cap with crown panels, seam, eyelets, visor, and closure/back construction; front and back must be the same physical cap and scale.
6. Water Bottle: one white sublimation-coated aluminium bottle, not silver, not bare reflective aluminium, not a colored variant. Preserve cap, loop/carabiner if part of the source product, shoulder, cylindrical body, and base. Generate front and back consistently.

For every generated master, require: complete product; clean transparent or cleanly removable background; neutral studio lighting; preserved folds and material texture; no artwork, logo, guide, checkerboard, or placeholder wording; no cut-off geometry; no extra objects; no perspective mismatch; no green/gray fringe; no harsh blown highlights; no fake reflections that change material identity. The three white apparel masters specifically need controlled highlights so fabric detail remains visible without turning white garments into featureless glowing shapes.

Do not use AI to invent product geometry when the source photograph provides it. If an output changes the product, regenerate it. Keep a manifest containing source references, generation prompt, model, date, dimensions, SHA-256 hash, and acceptance status for each master.

## Phase 3 — Build the layered Smart Mockup runtime

Use the existing proven compositor and material semantics. Do not create a second unrelated compositor. Build a new versioned asset root, for example:

`/mockups/smart-v8/{family}/{color}/{view}.png`

Use the accepted photographic master as PHOTO_BASE, the clean product alpha as PRODUCT_ALPHA, and the existing validated print masks/material maps only when their alignment is proven against that master. Rebuild apparel sleeve and neck/detail derivatives from the accepted apparel masters, not by cropping unrelated front images. Maintain consistent front/back proportions, print-zone coordinates, and family-specific material behavior.

For the PSD/PSB masters, replace only the embedded print-art Smart Object payload with a valid transparent blank PNG when a blank payload is required. Preserve product photography, masks, layer structure, and metadata. Reopen and verify every serialized PSD/PSB. There must be zero remaining `artwork-placeholder.png`, checkerboard, or `ARTWORK HERE` payloads. Do not put fake customer artwork into the Smart Object merely to make a screenshot look complete.

For generated derivatives, run image-quality gates that check dimensions, alpha bounds, transparent corners where required, nonempty product area, color-aware spill, green-pixel contamination, detached components, crop completeness, and front/back family consistency. Reject any asset with a rectangular background, cropped shoulder/cuff/handle/hood, duplicate product, or material mismatch.

Update one canonical resolver and one release manifest. Remove stale or conflicting version references from active runtime code. Keep gallery-only preview imagery separate from editor-canvas geometry unless print-zone alignment has been explicitly verified. The white Water Bottle must remain one canonical white blank with only the supported Front/Back controls; never tint it silver or create fake color variants.

## Phase 4 — Rebuild the chooser and Design Studio

The product chooser must use the accepted gallery previews, not degraded flat placeholders. It must present all six families with consistent card framing, realistic product scale, material labels, accessible selected state, search, category filters, lazy loading, image-error fallback, and a mobile-safe two-column layout. Preserve artwork when switching products, but reset incompatible face/mug state safely.

The Design Studio must expose exactly the supported controls for each family. Apparel must expose Front, Back, Left Sleeve, Right Sleeve, and Neck/label. Mug must expose the canonical three controls from the existing contract. Cap and Water Bottle must expose Front/Back. Every color must resolve to the correct family and view asset; no color should silently use another family or another view.

Fix the canvas presentation so a blank-state prompt never covers the product. Keep the prompt as a small bottom message or otherwise non-obstructive state. At 320px, 375px, 390px, 768px, 1024px, desktop widths, browser zoom in, and browser zoom out, the canvas, toolbar, face controls, color controls, upload panel, layer list, export, and add-to-cart controls must remain reachable without horizontal clipping or overlapping.

One-touch upload flow: after an image is uploaded, select it, reopen the mobile tools automatically, and allow the user to edit immediately. Preserve undo/redo and draft persistence when an image is processed. Keep the selected artwork layer visible in the customer preview and export.

Provide honest one-touch artwork tools: server-first Background Removal with progress, error, and fallback states; HD Upscale that preserves the image; and reference-based AI editing where the selected artwork can be used as the reference without requiring a second upload. Reuse the existing supported backend contracts. Do not expose a button that silently fails or claims an operation succeeded when it did not. Place AI output into the active print zone only after validation.

## Phase 5 — Full-stack regression and production checks

Run the repository’s exact gates, including mockup matrix validation, typecheck, tests, storefront build, API build, security scan, and active-app verification. Add or update tests for all six families, all canonical colors, every face/view, product switching, artwork preservation, print-zone positioning, background removal, upscale, reference-AI flow, export, cart addition, checkout guard, and order payload integrity.

Probe every expected production URL on the actual customer domain, not just a preview alias. Require HTTP 200, PNG content type, valid PNG signature, nonempty payload, and the expected manifest hash. Run browser verification for each family and representative colors/views, then run a complete matrix probe for all 188 surfaces. Save raw JSON evidence and screenshots or contact sheets for failed cases.

Check that uploaded customize artwork is present in the order payload and can be opened in the admin order-detail page. Check that customer notes are stored and displayed. Audit product catalog counts and duplicate product images. Verify API origin failover, Render standby health, scheduler ownership, Neon routing, R2 references, cache behavior, and that no new duplicate writer or scheduler was introduced. Do not change infrastructure based on assumptions; measure and document it.

Run responsive and accessibility checks at mobile and desktop sizes. Check keyboard focus, dialog escape, labels, alt behavior, touch targets, loading states, offline/error states, and slow-image fallback. Check bundle sizes and lazy loading. Do not allow a visual asset failure to blank the entire Studio.

## Phase 6 — Release discipline

Create reviewable commits with clear messages. Keep the current production smart-v4 deployment and previous known-good deployment available for rollback. Open a pull request. Merge only after all required CI and active-app checks pass. Trigger the Cloudflare Pages deployment from the exact merged commit. Poll all deployment stages. Verify the actual customer domain after deployment.

Never activate smart-v8 until every required master, derivative, color, and view has passed. If the image-generation quota is exhausted, finish all non-generation work, leave production on the known-good runtime, and publish a report marked VERIFIED, PARTIALLY VERIFIED, BLOCKED, or UNVERIFIED for each area. Do not substitute a placeholder-backed asset to make the release appear complete.

Deliver the following evidence files in the pull request or release report: the accepted-master manifest, complete 188-surface inventory, per-asset hashes, quality metrics, PSD/PSB Smart Object verification, live HTTP probe JSON, browser verification notes, responsive test notes, CI links, Pages deployment ID, merged commit SHA, rollback deployment ID, and a concise list of anything still blocked. State clearly whether the final editor runtime is genuinely photorealistic or remains on smart-v4.

Start now by inspecting the repository and live customer domain. Do not begin by replacing the live runtime. Do not ask me to approve obvious engineering steps. Make the work, test it, and report exact evidence. Ask only if an essential credential or source file is truly missing; otherwise continue autonomously.

---

## Optional shell setup for the agent

```bash
gh repo clone georgelsmith333-hub/trynext-lifestyle
cd trynext-lifestyle
git checkout main
git pull --ff-only origin main
git switch -c feat/genuine-photoreal-smart-mockups
```

Use the repository’s existing environment configuration. Never paste secrets into commits, prompts, logs, screenshots, or public URLs.
