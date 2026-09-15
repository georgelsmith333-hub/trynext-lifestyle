# Live Rendering Pipeline Audit — 2026-08-18

## Executive conclusion

The **core live Design Studio renderer is consuming smart-v4 correctly**. The authenticated production HTML rendered a live Hoodie surface with `href="/mockups/smart-v4/hoodie/navy/front.png?v=smart-v4"`, and the live asset probes returned HTTP 200 PNG files for front, back, left-sleeve, and neck-label samples. The downloaded samples were valid 1024×1024 RGBA PNGs with non-empty alpha bounds.

The pipeline is **not fully clean**, however. The deployed frontend bundle still contains stale source-kit-v3 and normalized paths in secondary or fallback branches. This means the core path is correct but the application has not achieved the requested “smart-v4 only” runtime discipline.

## Evidence matrix

| Pipeline surface | Result | Evidence |
|---|---|---|
| Active matrix | Pass | `complete-mockup-matrix.ts` constructs `/mockups/smart-v4/{family}/{color}/{view}.png`. |
| Studio resolver | Pass | `getCuratedMockup()` and `resolveMockup()` return the complete matrix `assetPath` with `?v=smart-v4`. |
| Live Studio front render | Pass | Authenticated live HTML contains `/mockups/smart-v4/hoodie/navy/front.png?v=smart-v4`. |
| Live Studio back render | Pass | Browser navigation to `?product=hoodie&view=back` rendered the matched Navy Hoodie rear surface; back smart-v4 asset also probes successfully. |
| Live sleeve/neck assets | Pass structurally | Live `left-sleeve.png` and `neck-label.png` return 200 and valid RGBA PNG metadata. |
| Local typecheck/build | Pass | Storefront typecheck and production build completed successfully. |
| Live PNG dimensions/alpha | Pass | Sampled live files are 1024×1024 RGBA with valid non-empty alpha bounds. |
| Live bundle path hygiene | Fail | Bundle contains 37 `source-kit-v3`, 6 `/mockups/normalized/`, and 1 `normalized-cutouts` references. |
| Studio prefetch hygiene | Fail | `src/lib/prefetch.ts` preloads twelve source-kit-v3 URLs. |
| Homepage hero/category cards | Fail | `TypewriterHero.tsx` and `Home.tsx` hardcode source-kit-v3 assets. |
| Product-card error fallback | Fail | `ProductCard.tsx` falls back to normalized assets, bypassing smart-v4. |
| Studio image-error fallback | Fail | `PRODUCTS.frontSrc/backSrc` and `BASE_BY_CATEGORY` still point at source-kit-v3; DesignStudio error handlers use `prod.frontSrc`. |
| Apparel-v5 runtime usage | Correctly absent | apparel-v5 is provenance/source data; the browser should consume smart-v4, not the source tree directly. |

## Source-level findings

The resolver path is internally coherent. `completeMockupEntry()` emits smart-v4 URLs, and `resolveMockup()` uses that entry for the active face. `useCartItemPreview()` and `CartViewer3D.tsx` consume `resolveMockup()` rather than introducing their own mockup roots.

The remaining stale paths are reachable outside the main resolver. The Studio prefetch helper still warms source-kit-v3 URLs. The homepage hero and category-card image map still use source-kit-v3. ProductCard’s fallback and error handler use normalized assets. The Studio product definitions and `BASE_BY_CATEGORY` retain source-kit-v3 defaults, so a smart-v4 image error can visibly fall back to legacy art.

These stale references explain why a source scan and the built bundle still report legacy paths even though the normal Studio render is smart-v4. They also create inconsistent cache behavior: navigation may warm one asset family while the renderer requests another.

## Live verification details

The current authenticated browser session loaded the production storefront and Design Studio successfully. The homepage displayed all six category family images after promotional overlays were cleared. The Studio exposed Front, Back, L.Sleeve, R.Sleeve, and Neck controls. The Navy Hoodie front and back rendered in the live canvas.

Representative live PNG requests returned the following results:

| Asset | HTTP | MIME | Dimensions | Mode | Alpha bounds |
|---|---:|---|---|---|---|
| `hoodie/navy/front.png` | 200 | `image/png` | 1024×1024 | RGBA | `(72, 62, 952, 962)` |
| `longsleeve/navy/back.png` | 200 | `image/png` | 1024×1024 | RGBA | `(62, 101, 962, 922)` |
| `hoodie/navy/left-sleeve.png` | 200 | `image/png` | 1024×1024 | RGBA | `(169, 112, 854, 911)` |
| `hoodie/navy/neck-label.png` | 200 | `image/png` | 1024×1024 | RGBA | `(112, 229, 911, 794)` |
| `tshirt/white/front.png` | 200 | `image/png` | 1024×1024 | RGBA | `(62, 84, 962, 940)` |

## Release recommendation

The release is **core-rendering verified but not path-hygiene clean**. The next corrective patch should replace all user-facing source-kit-v3 and normalized fallbacks with smart-v4 paths, update prefetch to use the matrix, update homepage hero/category card references, and make Studio error fallbacks call `resolveMockup()` rather than `frontSrc`/`backSrc` constants. After that patch, rebuild and rescan the bundle; the target is zero `source-kit-v3`, zero normalized mockup paths, and retained smart-v4 references.

The current evidence is reproducible through the source trace, local build, authenticated browser HTML snapshot, live bundle scan, and live PNG probe. The machine-readable browser notes are preserved in `LIVE_RENDER_PIPELINE_BROWSER_FINDINGS_2026-08-18.md`.
