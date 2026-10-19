# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working rule (set by the owner)

Always use the installed skills whenever one applies to the task, and invoke it before starting the work. Do not skip a skill because the task looks small. Examples that apply here:

- Bugs or unexpected behaviour: `superpowers:systematic-debugging` (root cause before any fix).
- Adding or changing behaviour: `superpowers:brainstorming`, then `superpowers:test-driven-development`.
- Before saying work is done, fixed or ready to release: `superpowers:verification-before-completion`.
- Larger multi-step work: `superpowers:writing-plans` / `superpowers:executing-plans`, and `feature-dev:feature-dev`.
- UI work: `frontend-design:frontend-design`; WordPress/PHP/JS full-stack work: `anthropic-skills:fullstack-developer`.
- Reviews: `code-review`, `simplify`, `security-review`.

The owner has also said: do not stop to ask what to do next; decide, build and verify, and report. Features requested so far: the whole Elementor free + Pro feature set, rebranded as Refraction (see `docs/refraction/pro-roadmap.md`).

## What this is

Refraction is a GPL-3.0-or-later WordPress page-builder plugin (PHP 7.4+, WordPress 6.8+), a rebrand of Elementor 4.4.0 (attribution in `NOTICE`, `license.txt` and the plugin header: keep them). It works offline. The only allowed outbound call is the update check against this repo's GitHub releases (`includes/updater.php`); Forms webhooks and user-configured embeds are user-initiated. Never reintroduce Elementor remote services, telemetry, upsell/Pro-gating, or the Atomic Editor. Pro-style features are built in as always-on modules, written from scratch; never copy code from any commercial or tampered Elementor Pro source (do not read `kohid/elementor`'s `elementor-pro` folder).

Identifiers: namespace `Refraction\`, constants `REFRACTION_*`, hooks `refraction/...`, text domain `refraction`, CSS `refraction-`, icon font `rficon-`, JS global `refraction*`. Saved data keys use `refraction`/`_refraction_*` (old Elementor keys are not migrated).

## Commands

Toolchain: Node per `.nvmrc`, npm **11.12.1** (the lock file is generated with it; `npm ci` fails on other majors), PHP with Composer. No WordPress or MySQL in the container: tests use a SQLite test site.

- `npm ci --ignore-scripts && composer install --no-dev --optimize-autoloader` – dependencies.
- `node scripts/build-release.mjs` – full build (composer, turbo packages, styles, scripts, assemble `build/`) and zip to `dist/refraction.zip` (~5 min). `--skip-build` repackages only (use after readme/PHP-only edits); `--tag vX.Y.Z` verifies the tag matches the version. It refuses mismatched versions: `refraction.php` (header + `REFRACTION_VERSION`), `readme.txt` Stable tag, `package.json` and the two root fields of `package-lock.json` must agree.
- PHP lint: `find . -name '*.php' -not -path './vendor*' -not -path './node_modules*' | xargs -n100 php -l | grep -v 'No syntax errors'` (prints nothing when clean).
- Test site: `PORT=8777 bash scripts/setup-menu-test-site.sh /tmp/some-site` builds WordPress + SQLite drop-in and installs `dist/refraction.zip`; start it with `PHP_CLI_SERVER_WORKERS=4 nohup php -S 127.0.0.1:8777 -t /tmp/some-site/wordpress &` (the setup script's own server dies with the shell call). Use a distinct site dir and port per working copy.
- Browser checks (Playwright + Chromium from `/opt/pw-browsers`; never run `playwright install`), each takes `--site DIR --port N`: `scripts/check-admin-menu.mjs`, `check-admin-ui.mjs` (needs plain permalinks), `check-updater.mjs` (fake GitHub on its own port), `check-branding.mjs` (no visible "Elementor" text/requests), `check-theme-builder.mjs` and the per-module `check-<module>.mjs`. Static: `node scripts/check-brand-static.mjs`. Pure-logic PHP tests: `php scripts/test-<module>.php`.
- Run one check: `node scripts/check-theme-builder.mjs --site /tmp/s --port 8777`. The check scripts install themes from wordpress.org (`wp theme install`); they cache downloads in `/tmp/rsite-dl`.
- `npm run lint` (eslint), `npm run test:jest`/`test:packages`/`test:node`: ~11 older jest suites fail for pre-existing reasons (removed telemetry module); phpunit/playwright suites need Docker and are not runnable here. Do not trust them as the only verification.
- Rename script `scripts/rename-to-refraction.mjs` is idempotent: run it after merging code that may contain upstream names.
- Do not `pkill -f "php -S"` inside a command containing that text (it kills your own shell); free ports by PID.

## Architecture

- **Bootstrap**: `refraction.php` → `includes/plugin.php` singleton builds the manager graph (documents, kits, elements/widgets/controls, files/CSS, editor, frontend, template library). Class → file mapping is by convention in `includes/autoloader.php`: `Refraction\Modules\Foo\Module` lives in `modules/foo/module.php`; underscores become dashes, `Foo_Bar` → `foo-bar.php`. Renaming a class means renaming its file.
- **Modules**: `core/modules-manager.php` lists module names (one per line); each is `modules/<name>/module.php` extending `Core\Base\Module`. Feature modules are always on. Hooks to know: `refraction/widgets/register`, `refraction/controls/register`, `refraction/documents/register`, `refraction/editor/localize_settings`.
- **Documents and templates**: saved templates are the `refraction_library` CPT with a template-type meta; document classes live in `core/document-types/` and module `documents/` folders. Theme Builder (`modules/theme-builder`) adds Header/Footer/Single/Archive/Search/404 types, a **conditions engine** (rules like `include/singular/post/123`, stored in post meta `_refraction_conditions` and mirrored in an option that Floating Elements also reads), a resolver (most specific wins, excludes win, ties by modified date), and theme integration (classic: `get_header`/`get_footer` + `template_include`; block themes: `pre_render_block` for header/footer template parts). Preview Settings render the editor preview against real content.
- **Admin menu**: `core/admin/editor-one-menu/refraction-one-menu-manager.php` registers the top-level `refraction-home` menu; submenu items come from registered menu-item classes (`Menu_Data_Provider`). A wrongly hidden or excluded slug disappears silently; `scripts/check-admin-menu.mjs` is the guard.
- **JS**: editor/frontend source is in `assets/dev/js`, module JS in `modules/<name>/assets/js`, React packages in `packages/` (turbo workspaces `@refraction/*`; third-party `@elementor/ui`/`icons` remain as dependencies). Every new JS/SCSS file must be registered in `scripts/vite/shared/entries.mjs` / `scripts/vite/plugins/scss-build.mjs` or it will not reach the zip. `scripts/vite/plugins/brand-ui.mjs` patches a logo inside `@elementor/ui` by matching its code.
- **Release**: `.github/workflows/release.yml` runs on a pushed `v*` tag (or manually with a tag input), builds the zip and publishes `refraction.zip` + checksum to a GitHub release; the in-plugin updater reads `releases/latest` and needs that asset. Branches never auto-release.
- **Docs**: `docs/refraction/` holds the roadmap, per-module docs, audits and leftover lists (`parity-audit.md`, `branding-status.md`, `*-leftovers.md`). Update them with the code.

## Pitfalls seen in this repo

- A passing `php -l` or direct-URL smoke test is not verification: the menu, tabs and "Edit with Refraction" entry points broke without either failing. Check real admin and editor flows in the browser.
- Settings tabs not switching on one real site was never reproduced locally; suspect asset optimisation/caching plugins (LiteSpeed) before changing code.
- Hard-link or share `node_modules` between working copies (`cp -al`); workspace symlinks must resolve inside each copy.
- Shared files that every module edits and that conflict on merge: `core/modules-manager.php`, `readme.txt` changelog, `scripts/vite/shared/entries.mjs`, `assets/dev/js/frontend/elements-handlers-manager.js`.
