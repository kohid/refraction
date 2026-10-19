# UI theme: plan

Goal: a per-user "Theme" tab in Refraction > Settings that re-skins the plugin's own admin screens and the editor UI (never the editor preview iframe), with Automatic (today's look) as the default.

Design adapted from Framify (kohid/Framify): five themes (Daylight, Graphite, Ember, Blueprint, Contrast) as `--rf-*` tokens.

## Tasks (each: failing test first, then code, then commit)

1. Registry (`core/ui-theme/registry.php`, `Refraction\Core\Ui_Theme\Registry`): theme list, `sanitize()`, `resolve( $user, $site )`. Test: `scripts/test-ui-theme.php`.
2. Tokens (`assets/ui-theme/ui-themes.css`) and the contrast gate (`scripts/check-ui-theme-contrast.mjs`) reading the token file; fix failing palettes.
3. Manager (`core/ui-theme/manager.php`): user meta, ajax save (nonce + capability), `data-refraction-theme` on `<html>` for Refraction admin screens and the editor, assets, Theme tab (picker radiogroup), optional site default (manage_options).
4. Admin skin (`assets/ui-theme/ui-theme-admin.css`): wrap, tabs, cards, buttons, fields, tables, chips, notices, focus rings; scoped under the attribute, which only exists on Refraction pages.
5. Editor skin (`assets/ui-theme/ui-theme-editor.css`): map `--rf-*` onto the editor's `--e-a-*` variables plus top bar/navigator/library/finder fixes; preview iframe is a separate document and stays untouched.
6. Picker script (`assets/ui-theme/ui-theme.js`): roving-tabindex radiogroup, instant preview, ajax persist, no inline script.
7. Browser check (`scripts/check-ui-theme.mjs`), docs, changelog, full verification.

Decisions: Automatic = no attribute, no extra CSS effect, so the look is byte-identical to today. User meta `auto` explicit overrides the site default; empty meta falls back to the site default. Static CSS/JS live in `assets/ui-theme/` (tracked, copied by the packager).
