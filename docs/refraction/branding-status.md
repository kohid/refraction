# Branding status

Goal: a user (or a developer reading the DOM, the plugin header, the readme or the REST/CLI help) never sees the upstream
product's name, logo, remote services or upsell. This file lists what was changed in the branding pass and every kind of
remaining occurrence of the old name, with the reason it stays.

How it is enforced:

* `node scripts/check-brand-static.mjs` (static, no site needed): fails on the old icon prefix/font, any upstream service URL,
  an install flow for the upstream "Hello" theme, a font glyph named after the upstream product, or a bulky `changelog.txt`.
* `node scripts/check-branding.mjs --site ... --port ...` (browser): crawls wp-admin, the Plugins row, the dashboard widget, the
  editor (loading screen, panel, menus, template library, settings panels) and a front-end page; scans rendered text, hidden
  templates, `aria-label`, `title`, `alt`, `placeholder`, `href`, `src`, the editor config strings and every network request
  for "elementor" (case-insensitive). The only allowlisted strings are the plugin author attribution lines.
* `node scripts/rename-to-refraction.mjs` is deterministic and re-runnable (a second run changes nothing). It now also carries the
  brand pass (icon prefix, service URLs, remote images). `python3 scripts/build-icon-font.py` rebuilds the icon-font brand glyphs.

## What changed in this pass

| Area | Change |
| --- | --- |
| Icon font | `assets/lib/eicons` is now `assets/lib/rficons`; family `eicons` -> `rficons`, class prefix `eicon-` -> `rficon-` in PHP, JS, SCSS, templates, CSS and the front-end icon manifest. The brand glyphs (`refraction`, `refraction-circle`, `refraction-square`) are an original prism mark; the upstream company glyph is emptied and its class removed; the TTF is written without glyph names; the EOT and SVG fonts (which still carried the old artwork) are gone. Third-party icon fonts (Font Awesome, etc.) are untouched. |
| Loading screen / loaders | The editor and admin loader no longer draw the upstream bars; CSS draws a beam, a prism and three rays. |
| Editor toolbar logo | New prism mark that still animates into the menu icon on hover. |
| Onboarding package | Logo, wordmark, icon and theme-step logo components draw the Refraction mark; the theme step no longer installs anything (the install hook resolves locally). |
| `@elementor/ui` DialogHeader | A build plugin (`scripts/vite/plugins/brand-ui.mjs`) swaps the logo vector shipped inside the third-party UI package. Every dialog already passes `logo={ false }`. |
| Dashboard widget | The logo is the new glyph (same font class). |
| URLs | Every `go.elementor.com`, `my.elementor.com`, `elementor.com`, `developers.`/`library.` sub-domain link in source became `https://github.com/kohid/refraction#readme` (docs and "learn more") or `.../issues` (support, errors, tickets). Remote images on `assets.elementor.com` became a local inline SVG placeholder. Issue-tracker links became plain text. |
| Hello theme | No installation of the upstream "Hello" theme remains: not in the plugin (it never had a PHP endpoint), not in the onboarding package, `.wp-env.json`, the setup scripts, the build excludes or `.gitignore`. |
| Atomic wording | Kit export/import no longer lists "Classes", "Default Styles", "Variables". |
| Images | Removed unreferenced upstream onboarding, "Hello" and library artwork and the PRO export illustration; `assets/images/export-complete.svg` replaces the latter. `logo-panel.svg`, `logo-platform.svg`, `logo-icon.png` and `install-pro-logo.png` were already Refraction marks. |
| Text | Plugin Description, the Plugins "View details" text, readme Description/changelog, composer description, AGENTS.md, developer docs (`docs/`, package READMEs) no longer call the product a fork or name the upstream product, except as listed below. A `== Credits ==` readme section carries the attribution. |
| Changelog | `changelog.txt` was the upstream changelog; it is now `docs/refraction/upstream-changelog.txt` (attribution history) and `changelog.txt` is a short Refraction file pointing at `readme.txt`. |
| Test setup | `scripts/setup-testing.sh` no longer downloads the upstream plugin from wordpress.org over `build/`. |

## Occurrences that stay (and why)

Counts are for tracked files, excluding `docs/refraction/`, as of this commit (case-insensitive "elementor").

| Kind | Where | Why it stays |
| --- | --- | --- |
| Third-party npm package names `@elementor/ui`, `@elementor/icons`, `@elementor/design-tokens`, `@elementor/angie-*`, `@elementor/oidc-auth`, `@elementor/wp-lite-env`, `@elementor/elementor-one-assets`, `@elementor-external/angie-sdk` (about 4,200 lines in about 710 files, mostly `import ... from '@elementor/ui'`) | `packages/**`, `app/**`, `modules/**`, `scripts/vite/shared/*`, `package.json` files | Published npm packages owned by Elementor Ltd. They cannot be renamed. They are build-time dependencies; the only runtime artefact of the name is the bundled variable `_elementor_ui` in built JS, which is not user visible. The logo shipped inside `@elementor/ui` is replaced at build time (see above). |
| `package-lock.json`, `composer.lock`, per-package `CHANGELOG.md` (about 800 lines) | root and `packages/**` | Lock files record the real published package names. The package CHANGELOG files are upstream release history, kept for attribution. |
| `license.txt`, `NOTICE` | root | Licence text and upstream attribution. Must stay. |
| Attribution lines (`Author: ... (based on Elementor by Elementor.com)`, `Copyright Elementor Ltd.`) | `refraction.php`, `modules/safe-mode/mu-plugin/refraction-safe-mode.php`, `includes/updater.php` (Plugins/"View details" author line), copyright headers in source files | Required attribution of the GPL upstream. The plugin header line is the one occurrence allowed to be seen in wp-admin; `check-branding.mjs` allowlists exactly this phrase. |
| `readme.txt` Credits and `README.md` | root | Attribution ("based on Elementor by Elementor.com", not affiliated). |
| `CLAUDE.md` | root | Owner's working rules, not part of the plugin package. |
| `cdn.elementor.com/a11y/widget.js` in `packages/packages/core/editor-audits/src/utils/scan-accessibility-widgets.ts` and its tests | editor-audits package | A detection string: the audit scans a page's scripts for another vendor's accessibility widget. It is never requested. |
| `elementOrSelector` and similar in `assets/lib/motion/motion.js` (17) | third-party library | An identifier of the bundled Motion library that merely contains the letters. |
| `fa-elementor` brand icon in Font Awesome CSS/JSON | `assets/lib/font-awesome*`, ignored build output | Font Awesome's own brand-icon list; third-party data. |
| `elementor/elementor-editor-testing` | `composer.json` | External dev-only composer package used by PHP tests. |
| `hello-elementor` slug in Playwright blueprints and wp-env config under `tests/` | `tests/**` | Test infrastructure that downloads that theme for the end-to-end suites. Nothing in the plugin or the release zip uses it. |
| Test fixtures and mock exports (recorded HTML, WXR, templates, lighthouse snapshots) and test strings using upstream URLs/names as input data | `tests/**` | Recorded data; changing it would change what the tests prove. |
| Rename and brand tooling | `scripts/rename-to-refraction.mjs`, `scripts/check-brand-static.mjs`, `scripts/build-icon-font.py`, `scripts/vite/plugins/brand-ui.mjs` | These files have to name the old product to find it. |
| Upstream release history | `docs/refraction/upstream-changelog.txt`, `docs/refraction/*.md` (rename records) | Attribution history and the records of this rename. |

## Known gaps (not changed)

* Dead upstream code that is not loaded by PHP is untouched except for URLs and logos: the Atomic packages under `packages/`, the
  onboarding app, the kit "classes/variables" sections behind the removed `e_atomic_elements` experiment, the Angie/AI helper
  packages and the `pro-icon` / `upgrade-crown` glyphs used by dormant promotion components. They are listed in
  `atomic-removal-leftovers.md` and `remote-removal-leftovers.md`.
* The "Easy Navigation is Here!" mascot (`assets/images/information.svg`) and `kit-is-live.svg` are generic upstream illustrations
  without a name or logo. They are kept; replace them if you want fully original artwork.
* `Angie` is the name of the upstream AI assistant; a few slugs and package names (`angie-widgets` category slug, MCP packages)
  keep it for compatibility with third-party extensions.
* The admin menu icon, `logo-icon.png` (26 px) and the other raster marks are simple placeholders; a designer should replace them.
