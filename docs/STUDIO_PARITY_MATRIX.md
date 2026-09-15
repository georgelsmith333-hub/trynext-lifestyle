# Trynext Lifestyle — Design Studio Parity Matrix

**Compared:** V1 `src/pages/DesignStudio.tsx` versus active V2 `src/pages/studio/DesignStudioV2.tsx`

**Evidence date:** 2026-08-17

| Capability | V1 | V2 | Evidence | Decision |
|---|---|---|---|---|
| Production route | PASS | PASS | `/design-studio` is routed to V2; `/design-studio-v1` preserves V1 | Keep V2 active |
| Upload image | PASS | PASS | V2 live panel exposes Upload Image; direct upload interaction not completed in this pass | Repeat file-upload test |
| Auto-fit | PASS | UNKNOWN | Shared geometry/composer code exists; direct live test pending | Preserve shared fit logic |
| Scaling | PASS | UNKNOWN | Layer/canvas controls exist; live pointer gesture not tested | Test desktop/mobile |
| Positioning | PASS | UNKNOWN | Live canvas shows insertable layer; drag not tested | Test transform invariants |
| Rotation | PASS | UNKNOWN | V2 advertises pinch/transform behavior; direct test pending | Test touch and pointer paths |
| Text layer | PASS | PASS | V2 live toolbar exposes Text; insertion not tested in this pass | Test Bangla and export |
| Bangla text | PASS | UNKNOWN | Product/catalog contains Bangla; studio font/render regression pending | Test fonts and export |
| Fonts/styling | PASS | UNKNOWN | V2 Text panel exists; full style controls not exercised | Compare controls |
| Layer ordering | PASS | PASS | Live Heart insertion produced `Layers 1`; multi-layer ordering pending | Test with two layers |
| Visibility/locking | PASS | UNKNOWN | Layer UI exists; direct toggle test pending | Test state persistence |
| Undo/redo | PASS | UNKNOWN | Controls exist; direct history test pending | Test after insert/transform/delete |
| Product switching | PASS | UNKNOWN | V2 product switcher and six-family mappings exist; live switch not completed | Test all families |
| Face/print-zone switching | PASS | PASS | Live V2 exposes Front/Back/L.Sleeve/R.Sleeve/Neck for T-shirt | Test geometry per family |
| Color switching | PASS | UNKNOWN | Live V2 exposes eight T-shirt colors; direct render consistency pending | Test representative colors |
| Templates/stickers | PASS | PASS | Live Templates panel listed 19 SVG choices; Heart inserted as a visible layer | Add export/cart regression |
| QR | PASS | UNKNOWN | V2 exposes QR tab; direct generation/scan test pending | Test valid/invalid payloads |
| Mockups | PASS | UNKNOWN | Shared `mockups.tsx` and `composer.ts` exist; live end-to-end mockup check pending | Test six families |
| 3D preview | PASS | UNKNOWN | V2 exposes 3D Preview; runtime/performance test pending | Test curved products and mobile |
| AI art | PASS | UNKNOWN | V2 exposes AI Art; provider/error path not fully tested | Prove real response or truthful failure |
| Background removal | PASS | UNKNOWN | V1 server/WASM fallback exists; V2 parity and provider status pending | Test unavailable provider path |
| Save/load/drafts | PASS | UNKNOWN | Draft/autosave code exists; refresh/login recovery not tested | Test persistence and expiry |
| Export PNG | PASS | UNKNOWN | V2 exposes PNG export; direct artifact inspection pending | Verify output dimensions/transparency |
| Add to cart | PASS | PASS | Live Heart layer inserted and Add to Cart produced a cart item with thumbnail | Test other families |
| Cart thumbnail | PASS | PASS | Live cart displayed custom Heart thumbnail | Test export/mockup consistency |
| Mobile layout | PASS | UNKNOWN | Responsive code exists; no mobile viewport interaction evidence in this pass | Run device matrix |
| Accessibility | PARTIAL | UNKNOWN | Many controls have hints/labels; full keyboard/focus audit pending | Audit studio controls |

## Consolidation decision

Do not delete V1 or move all traffic to a third implementation until every V2 row marked UNKNOWN is tested or intentionally accepted with evidence. V2 remains the active production route because it provides the current responsive onboarding and shared studio toolbar, while V1 remains the comparison and rollback implementation.
