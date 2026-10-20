# Site Appearance

Admin-managed theme customization: colors, typography and shape for the whole
public site. Managed at **`/admin/appearance`** (sidebar: *Site Appearance*).

## How it works

```
/admin/appearance  (AdminAppearance.jsx)
        │  save
        ▼
admin_settings.appearance  (JSONB)
        │  read (anon, public-read table)
        ▼
src/lib/useSiteAppearance.js
        │  applies inline CSS custom properties on <html>
        ▼
src/index.css consumes the vars  →  whole site restyled
```

The saved document is a single JSONB column, so new controls can ship without
another migration — the same approach as `video_hero` and `store_hero`.

## Data shape

All keys are optional. Missing or malformed values fall back to the built-in
defaults, so an empty `{}` never breaks the theme.

```json
{
  "enabled": true,
  "defaultTheme": "dark",
  "accent": "#00f0ff",
  "accentDark": "#00f0ff",
  "bgLight": "#faf8f5",
  "bgDark": "#050508",
  "surfaceLight": "#ffffff",
  "surfaceDark": "#0a0a12",
  "fontBody": "Satoshi",
  "fontDisplay": "Cabinet Grotesk",
  "fontMono": "JetBrains Mono",
  "fontScale": 1,
  "radiusScale": 1
}
```

| Key | Notes |
| --- | --- |
| `enabled` | `false` disables all overrides and restores the stylesheet defaults. |
| `defaultTheme` | `"light"` \| `"dark"` \| `"system"`. A visitor's own toggle always wins. |
| `accent`, `accentDark` | Accent color for light/dark mode. Hex only. |
| `bgLight`, `bgDark` | Page background per theme. |
| `surfaceLight`, `surfaceDark` | Card/panel background per theme. |
| `fontBody`, `fontDisplay`, `fontMono` | Must be one of the loaded families (see below). |
| `fontScale` | `0.85` – `1.25`, clamped. Scales the whole site. |
| `radiusScale` | `0` – `2`, clamped. Corner roundness. |

Only fonts already requested by `index.html` are selectable (Satoshi, Cabinet
Grotesk, JetBrains Mono, system UI, Georgia). Choosing an unloaded family would
silently fall back and look broken, so unknown names are rejected by
`mergeSiteAppearance()`.

## Live apply & no flash

Two layers cooperate:

1. **Pre-paint** — a small inline script in `index.html` reads a `localStorage`
   cache (`neural-aurora:appearance:v1`) and applies the cached values plus the
   theme before the first paint, avoiding a flash of the default theme.
2. **Reconcile** — `src/lib/useSiteAppearance.js` then fetches the authoritative
   document from Supabase (at most once per 5 minutes, deduped) and re-applies.

After an admin save, `AdminAppearance.jsx` calls `setAppearance()` plus
`invalidatePortfolioCache('siteAppearance')`, so already-mounted public
components refresh immediately — no reload needed.

## Theme preference precedence

```
visitor's own toggle (localStorage: neural-aurora:theme:v1)
  > admin-configured defaultTheme
  > "dark"
```

Both the public theme switch (`ui/curtain-theme-toggle.jsx`) and the admin
sidebar toggle persist through `writeStoredTheme()` / `setTheme()`, so the
choice survives reload and overrides the admin default.

## Files

| File | Role |
| --- | --- |
| `src/components/admin/AdminAppearance.jsx` | Admin UI + live preview |
| `src/lib/appearanceDefaults.js` | Defaults, validation, CSS var mapping |
| `src/lib/useSiteAppearance.js` | Runtime: cache, apply, subscribe, theme |
| `src/index.css` | Consumes `--app-*` / `--font-*` / `--bg-dark*` vars |
| `index.html` | Pre-paint script (dependency-free, inline) |
| `supabase/migrations/20261020000001_add_appearance_settings.sql` | Adds the column |
| `scripts/test-appearance.mjs` | Validation tests (`node scripts/test-appearance.mjs`) |

## Safety

* Colors are validated as plain hex (`#rgb` / `#rrggbb`); anything else —
  including `url(...)` or `;}` payloads — is discarded before reaching the DOM.
* Font values are checked against an allow-list.
* Scales are clamped to sane ranges.
* The column is public-read, admin-write; RLS already covers it, so a visitor
  can read the theme but never change it.

## Applying the migration

```bash
supabase db push          # or run the SQL in the Supabase dashboard
```

Until the migration is applied the feature degrades safely: `getAdminSettings()`
simply reports no `appearance` key and the site keeps its defaults.
