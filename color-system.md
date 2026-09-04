# Dynamic Colour Theme System

Two brand colours drive every colour in the application. Components never name a
colour — they consume semantic tokens, so re-theming is a settings change.

## Where it lives

- Engine (maths, presets, resolver): `lib/theme/colors.ts`
- Public payload builder: `lib/theme/general-settings.ts`
- Cached server theme settings: `lib/theme/general-settings-server.ts`
- DB fields: `lib/models/GeneralSettings.ts` (`primaryColor`, `secondaryColor`, `colorPresetId`)
- Admin save/fetch API: `app/api/admin/settings/general/route.ts`
- Admin UI: `components/admin/settings/ColorThemeEditor.tsx`
- Runtime application: `components/providers/ThemeProvider.tsx`
- SSR bootstrap: `app/layout.tsx` (`:root` + `.dark` injected before first paint)
- Tailwind token bindings: `tailwind.config.ts`
- Fallback tokens: the generated block at the top of `app/globals.css`

## What is stored vs derived

Only `primaryColor`, `secondaryColor` and `colorPresetId` are persisted. The
~131 semantic tokens are **derived on read**, so there is one source of truth and
no migration when the derivation improves.

## Semantic tokens

Surfaces and text: `background`, `foreground`, `card(-foreground)`,
`popover(-foreground)`, `muted(-foreground)`, `subtle-foreground`, `accent(-foreground)`.
Brand: `primary(-foreground)`, `secondary(-foreground)`, `ring`.
Lines and fields: `border`, `input`.
State: `destructive`, `success`, `warning`, `info` (each with `-foreground` and a 50–900 ramp).
Charts: `chart-1` … `chart-5`.
Sidebar: `sidebar`, `sidebar-foreground`, `sidebar-primary(-foreground)`,
`sidebar-accent(-foreground)`, `sidebar-border`, `sidebar-ring`.
Ramps: `primary-*`, `secondary-*`, `beige-*`, `sandy-*` (50–900).

Tokens are emitted as `H S% L%` triplets and bound in Tailwind as
`hsl(var(--token) / <alpha-value>)`, which is what keeps `bg-primary/10` working.
A handful of tokens consumed as whole values (`--color-bg-primary`,
`--color-cta-bg`, …) are emitted as complete colours instead.

## Derivation

Colour maths runs in **OKLCH**, not HSL, so lightness ramps look evenly spaced and
hue rotations hold their apparent brightness. Out-of-gamut results reduce chroma
rather than clipping channels, which would shift hue.

- Neutral surfaces carry a trace of the brand hue — this is what reads as "warm".
- An achromatic brand (`#1A1A1A` reports hue 0°, i.e. red) falls back to a warm
  sand hue instead of tinting the whole UI pink.
- A secondary that is too pale or too grey to work as an accent is replaced for
  accent/chart purposes by a hue rotation of the primary.
- State hues are anchored (red stays danger) but chroma is harmonised to the brand.
- Every foreground/background pair is pushed until it clears WCAG AA — 7:1 for
  body text, 4.5:1 for secondary text and on-colour text, 3:1 for UI surfaces.

## Presets

`luxury-leather` (default), `grocery-organic`, `fashion-atelier`, `beauty-blush`,
`electronics-indigo`, `minimal-stone`, `bold-ember`, `natural-earth`.
Selecting one adopts its pair; editing either colour afterwards detaches
`presetId` and the selection becomes custom.

## Cache and revalidation

Saving general settings bumps `themeVersion` when the palette changed, invalidates
the `public-general-settings` and `theme-settings` tags, revalidates the root
layout, and broadcasts a cross-tab event. Writing to Mongo directly will **not**
invalidate the cache — clear `.next/cache` or save through the admin UI.

## Adding a preset

Add an entry to `COLOR_PRESETS` in `lib/theme/colors.ts`. No component, Tailwind
or CSS change is needed; the admin gallery and resolver pick it up automatically.
`yarn test:theme` asserts every preset is accessible in light and dark.

## Tests

```bash
yarn test:theme   # palette generation, contrast, token contract, no-literals guards
yarn test         # the above plus the typography suites
```
