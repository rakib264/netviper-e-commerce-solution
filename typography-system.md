# Dynamic Typography System

This project now uses a semantic, settings-driven typography system integrated into the existing `GeneralSettings` flow.

## Where Typography Lives

- Registry + resolver: `lib/theme/typography.ts`
- Public payload builder: `lib/theme/general-settings.ts`
- Cached server theme settings: `lib/theme/general-settings-server.ts`
- DB model fields: `lib/models/GeneralSettings.ts`
- Admin save/fetch API: `app/api/admin/settings/general/route.ts`
- Public settings API: `app/api/settings/general/route.ts`
- Runtime application: `components/providers/ThemeProvider.tsx`
- SSR bootstrap: `app/layout.tsx`
- Global semantic classes: `app/globals.css`

## Semantic Roles

Supported roles:

- `display`
- `heading`
- `title`
- `subtitle`
- `body`
- `paragraph`
- `navigation`
- `button`
- `label`
- `price`
- `caption`

Components should use semantic classes/variables, not direct font names.

## Defaults

Default preset: **Elegant Warm**

- Display/headings/titles/subtitles: `Cormorant Garamond`
- UI/body/navigation/buttons/labels/prices/captions: `Avenir Next`

## Admin Behavior

In Admin Settings → General → Typography:

- Choose `single` or `multi` mode
- Apply preset mappings
- Assign role font + weight
- Live preview updates immediately
- Reset returns to default preset

## Validation Rules

Backend validation enforces:

- Font ID must exist in registry
- Role keys must be valid
- Weight must be available for selected font
- Invalid payloads are rejected with HTTP `400`

## Cache + Revalidation

When general settings update:

1. Settings are persisted to MongoDB.
2. `themeVersion` increments when theme/typography changes.
3. Tagged caches are invalidated:
   - `public-general-settings`
   - `theme-settings`
4. Root layout path is revalidated (`/`, `layout`).
5. Admin broadcasts a browser event + storage key update for cross-tab refresh.

This prevents stale typography from winning over new settings.

## Font Loading Strategy

- Registry and asset loading are separated.
- Only Google fonts currently in active role usage are included in the generated stylesheet URL.
- Licensed/system fonts remain selectable in the registry but are not auto-downloaded unless available in the environment.

## Adding a New Font

1. Add metadata in `FONT_REGISTRY` (`lib/theme/typography.ts`):
   - IDs, labels, category, supported weights, recommended roles, fallback stack, source.
2. If Google-hosted, add `googleFamily`.
3. No component changes are needed; admin UI and resolver pick it up automatically.

## Test Coverage

Run:

```bash
yarn test:typography
```

Covered areas:

- Single/multi font normalization
- 2-font and 3+ font role mapping
- Invalid font/weight validation
- Default/reset behavior
- Semantic CSS variable generation
- Change detection for cache/version invalidation flow
- Selective font stylesheet generation
