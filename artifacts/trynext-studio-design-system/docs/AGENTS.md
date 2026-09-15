# Trynext Studio Design System design system

This package defines the visual language for the project. Use it whenever you
build or restyle UI so every surface looks like the same product. It is a real
workspace package (`@workspace/trynext-studio-design-system`): other artifacts depend
on it and import its theme and components directly.

## What's here

- `tokens.json` — the single source of truth (DTCG format): colors (full light
  and dark sets), typography, spacing, and radius.
- `scripts/build-tokens.mjs` — generates the outputs below from `tokens.json`.
- `src/index.css` — GENERATED shadcn theme (web), exported as `./styles.css`.
- `src/generated/tokens.tsx` — GENERATED hex token object, the package's `.` and
  `./tokens` entry. Mobile (Expo) and other platforms import this.
- `public/favicon.svg` — generated app icon from `tokens.json` + the title.
- `src/components/ui/` — the shadcn component library, themed by the tokens,
  exported as `./components/*`.
- `src/lib/` (`cn`) and `src/hooks/` — exported as `./lib/*` and `./hooks/*`.
- `src/App.tsx` — the entry point for the living style guide.
- `src/preview/DesignSystemBrowser.tsx` — the persistent grouped navigation,
  branded header, search, deep links, and active page shell.
- `src/preview/registry.tsx` — preview metadata (`DESIGN_SYSTEM` title,
  description) and ordered navigation. Overview comes first;
  Brand/Colors/Fonts/Layout precede Components; Content/Charts/Motion/Applied
  examples follow when applicable. Each group is a nav section whose entries
  are its nested pages. Empty optional groups stay hidden.
- `src/preview/foundations.tsx` — token-driven Overview, Colors, Fonts, and Layout
  pages.
- `src/preview/parts.tsx` — shared page helpers, including `Guidelines` for design
  and composition do's/don'ts (colour/component usage, hierarchy, voice and tone,
  not technical implementation notes). Populate it only with guidance derived
  from the source; omit it when the source documents no usage rules.
- `docs/references/mockup-sources.md` — the authoritative product-photo contract
  for the Trynext studio. The existing reviewed mug, cap, and water-bottle photos
  remain the source of truth; regenerated or procedural replacements must not
  become runtime assets without visual review.
- `src/preview/demos/<component>.tsx` — component stories. Keep these stories and
  the registry aligned with the final web component inventory.
- `docs/consuming-web.md` and `docs/consuming-expo.md` — platform-specific usage.
- `docs/migrating-web.md` and `docs/migrating-expo.md` — replacing scaffolded or
  existing local design-system implementations.

Every source file in this package is a `.tsx` file, including token, utility,
and hook modules with no JSX, so every export below is a single `*.tsx` glob. Do
not add `.ts` files here.

## What this package exports

```jsonc
".":              "./src/generated/tokens.tsx",
"./tokens":       "./src/generated/tokens.tsx",
"./styles.css":   "./src/index.css",
"./components/*": "./src/components/*.tsx",
"./lib/*":        "./src/lib/*.tsx",
"./hooks/*":      "./src/hooks/*.tsx"
```

Components import each other with relative paths internally, so they resolve
correctly when another package imports them through
`@workspace/trynext-studio-design-system/components/...`. Never use a `@/` alias inside
this package. Components added through shadcn may use this package's
`#components/*`, `#lib/*`, and `#hooks/*` imports from `package.json`; those are
consumer-safe because they resolve against this package.

## Editing and maintaining the design system

Edit `tokens.json` only, then run `pnpm tokens`; the dev server also regenerates
on change. Never hand-edit `src/index.css` or `src/generated/tokens.tsx`.

Every user-facing web component under `src/components/ui/` must have a family
story in `src/preview/demos/` covering its variants, sizes, and important states.
Register each family once in `src/preview/registry.tsx`. If a component changes,
update its story and registry entry in the same change and note meaningful
additions or customizations in "What's here" above.

Native components live under `src/components/native/`. Match an existing web
component family's public API wherever React Native supports it, and document
platform-required differences in "What's here". Native components are not
imported into the web-only Vite preview.

Keep `DESIGN_SYSTEM.title` and `DESIGN_SYSTEM.description` accurate. Update
`NAV_GROUPS` whenever the system gains or loses a foundation, content guideline,
chart, motion rule, or applied example.

## Keep it template-ready

This design system is a prime candidate to be saved to the workspace as a
reusable template, and a template is packaged as this one directory alone. Keep
it self-contained as you maintain it so that save works: use concrete dependency
versions (never `catalog:`), keep `tsconfig.json` standalone (never `extends` a
workspace-relative base), and never import from a sibling artifact or a shared
`@workspace/*` lib. A saved template is consumed as a read-only style donor
(re-authored from, not rebuilt), so keep the generated `src/index.css` and
`src/generated/tokens.tsx` committed so the template carries a readable theme
snapshot. If maintenance ever introduces a cross-artifact or workspace-lib
dependency, load the `prepare-artifact-template` skill and follow it to pull the
dependency back in before the user saves the template.

## Prototyping on the canvas

Use the mockup-sandbox skill's "Design systems" flow. It creates a sandbox entry
for `@workspace/trynext-studio-design-system` and renders mockups using this package's
theme and components.

## Consuming this package

Never copy token values, component source, hooks, or these docs into a consuming
artifact. Add `@workspace/trynext-studio-design-system` as a `workspace:*` dependency,
run `pnpm install`, and import directly from this package.

Read only the guides required by the current task:

- Building or styling web UI: `artifacts/trynext-studio-design-system/docs/consuming-web.md`
- Building or styling Expo UI: `artifacts/trynext-studio-design-system/docs/consuming-expo.md`
- Replacing an existing or scaffolded web theme/component library:
  `artifacts/trynext-studio-design-system/docs/migrating-web.md`
- Replacing existing or scaffolded Expo theme/hooks/components:
  `artifacts/trynext-studio-design-system/docs/migrating-expo.md`

A freshly scaffolded app counts as a migration when it still contains local
theme, hook, or component copies that this package supersedes. Read the platform
consumption guide first, then its migration guide before authoring UI.

For web/static consumers, follow the workspace dependency placement rules from
the pnpm-workspace skill. Expo is a runtime consumer, so the package belongs in
`dependencies`.

Before migrating an entire app, render one platform-appropriate primitive from
the package and run the consumer's typecheck and dev server. Proceed only after
the import resolves and the primitive uses this design system's theme.

## Universal rules

- Match exact token values. Do not invent colors, fonts, spacing, or radii in a
  consuming app.
- Keep product data, navigation, application state, and product-specific
  compositions in the app. Product-agnostic visual primitives belong here.
- Read these docs in place. Do not copy them into another artifact.

## Trynext studio composition rules

- Use the warm orange primary for the single next action, not for every control.
- Use the green accent for trust, verified state, and “ready” feedback; reserve
  destructive red for blocking validation.
- Keep the canvas white or warm-white so the actual product edge and soft shadow
  remain visible. Do not replace the product with a generic gradient, silhouette,
  or procedural cylinder.
- Print boundaries must be calibrated from the visible body of the authoritative
  photo. A mug handle is not printable area; a cap brim and bottle lid are not
  printable area. The editor may expose an edge-to-edge body zone, but it must
  never silently include those non-printable parts.
