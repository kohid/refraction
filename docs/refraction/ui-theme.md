# UI theme (Settings > Theme)

A per-user theme for Refraction's own interface: its wp-admin screens and the editor UI. Design adapted from Framify (kohid/Framify): the five themes and their `--rf-*` token model.

## What the user gets

- Settings > Theme: a radiogroup of six cards, each with a live miniature of the editor drawn in that theme: Automatic, Daylight, Graphite, Ember, Blueprint, Contrast. Mouse, arrow keys (move and select), Home/End, Space/Enter. Choosing applies at once and saves to the user's account ("applies to your account").
- Automatic (default) prints nothing: no attribute, so no theme CSS rule matches and the UI is exactly today's.
- Admins also get "Default for new users" (option `refraction_ui_theme_default`), used for people who have not chosen. An explicit Automatic choice beats the site default.
- The editor's User Preferences panel has a "Refraction theme" select (same user meta), so people who cannot open Settings can still choose; it applies live.

## How it works

| Piece | File |
|---|---|
| Registry, whitelist sanitising, default resolution | `core/ui-theme/registry.php` |
| Hooks, attribute on `<html>`, assets, ajax, Theme tab, picker markup | `core/ui-theme/manager.php` |
| Colour tokens (five themes, dual-scoped `[data-refraction-theme]` / `[data-preview-theme]`) | `assets/ui-theme/ui-themes.css` |
| Palette bridge: `--e-one-palette-*` (admin layer) and `--e-a-*` (editor and shared widgets) point at the tokens | `assets/ui-theme/ui-theme-bridge.css` |
| Admin skin and picker/miniature CSS | `assets/ui-theme/ui-theme-admin.css` |
| Editor skin (React top bar, focus rings) | `assets/ui-theme/ui-theme-editor.css` |
| Picker behaviour | `assets/ui-theme/ui-theme.js` |
| Editor preference control and live apply | `core/settings/editor-preferences/*`, `assets/dev/js/editor/components/settings/editor-preferences/manager.js` |

- Storage: user meta `refraction_ui_theme` (`auto` or a theme id), site option `refraction_ui_theme_default`. Everything read from storage goes through `Registry::sanitize()`, so a tampered value prints nothing.
- Where the attribute is printed (server-side, through the `language_attributes` filter, so there is no flash): Refraction admin screens (screen id or post type containing/starting with `refraction`, plus `e-floating-buttons` and `e-landing-page`; filters `refraction/ui_theme/admin_post_types` and `refraction/ui_theme/is_admin_screen`) and the editor window. Never on other admin pages, the site, or the preview iframe (a separate document that gets neither the attribute nor the files).
- Load order on admin screens: token CSS, then bridge, then Refraction's `admin.css`, then the skin. In the editor the bridge and editor skin load after `theme-light.css` / `theme-dark.css`.
- Editor: the editor's own light/dark preference still works. A chosen Refraction theme wins because the bridge overrides the same custom properties; Automatic leaves them alone.
- Ajax `refraction_save_ui_theme`: nonce `refraction_ui_theme`, capability `edit_posts`; `scope=site` needs `manage_options`; unknown values give 400; config reaches the script through a localized object (no inline script).
- The WordPress admin menu, toolbar and other plugins' pages are not touched. The content area background of Refraction pages is painted.

## Accessibility

- `scripts/check-ui-theme-contrast.mjs` reads the token file and fails below AA: body and dim text on bg/surface/surface-2, accent, accent-hover, danger and pass/warn/fail (also on their soft fills) on bg/surface, accent button ink, danger button ink, top bar ink and accent, and 3:1 for form-control borders and the focus ring.
- Changes against Framify to pass: new tokens `--rf-field-line` (control borders), `--rf-chrome-accent`, `--rf-danger-ink`; Daylight danger/pass/warn/fail slightly darker; Ember fail slightly lighter. The code-syntax tokens were dropped (no code view here).
- Visible focus rings (accent outline), `prefers-reduced-motion` removes transitions and hover motion, `forced-colors` gives the picker system-colour borders and a Highlight selection.

## Tests

- `php scripts/test-ui-theme.php` (registry, sanitising, default resolution, attribute).
- `node scripts/check-ui-theme-contrast.mjs [--verbose]`.
- `node scripts/check-ui-theme.mjs --site DIR --port N` on a fresh site (tab, picker by mouse and keyboard, persistence and per-user, site default, admin skin on nine screens, unrelated pages, Automatic equals the build without the feature, editor panel/top bar/navigator/library/finder, preview iframe never themed, ajax hardening, PHP log). Screenshots go to `--shots` (default `/tmp/ui-shots`).

## Limits

- Automatic in the editor still follows the editor's own light/dark display mode (and the OS), as before.
- Screens added by other plugins keep their own look. Refraction screens that hard-code colours inline outside the palette variables may need a rule in `ui-theme-admin.css`.
- The Material Symbols used (`palette`/`contrast`/`light-mode`/`dark-mode`/`check`) are bundled; nothing loads from the web.
