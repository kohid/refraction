# Build status (stage 2)

Environment used: Node v22.22.0 (the repo asks for >=24.15.0, so npm prints `EBADENGINE` warnings; nothing failed because of it),
npm 11.6.2 (via `npx npm@11.6.2`; the system npm 10.9.4 rejects the lock file with "Missing: yaml@2.9.1"), PHP 8.3.6, Composer 2.8.12.

## Commands and results

| Command | Result |
| --- | --- |
| `composer update` (lock regenerated; `--ignore-platform-req=ext-bcmath`, the sandbox PHP has no bcmath and only a dev package needs it) | OK. `composer.lock` now has one runtime package (`automattic/jetpack-autoloader`) and 64 dev packages. The stale private packages (`elementor/wp-one-package`, `elementor/elementor-mcp-composer`, ...) are gone. |
| `composer install --no-dev --optimize-autoloader` | OK. `vendor/` holds only jetpack-autoloader. |
| `npx npm@11.6.2 ci --ignore-scripts --no-audit` | OK, 3055 packages. |
| `npm uninstall mixpanel-browser @elementor/elementor-one-assets --package-lock-only` | OK. Both dependencies are removed from `package.json` and `package-lock.json`. |
| `npm run build` (= `turbo build` for 61 workspace packages, then `scripts/vite/build-all.mjs`: styles, base+frontend scripts, packages assets, assemble-plugin) | **Exit 0, 0 errors, no warnings** (only the rolldown "plugin timings" note). 61/61 turbo tasks, 42 base entries x2 (dev+min), frontend 2 entries + 23 chunks, 57 package entries, 1,753 files assembled into `build/`. |

Output locations: `assets/js` (179 files), `assets/css` (167 files), `assets/js/packages` (built workspace packages) and `build/` (assembled plugin tree). All are git-ignored.

## Fixes made to get the build green

* `app/assets/styles/app-imports.scss`, `assets/dev/scss/editor/editor.scss`, `assets/dev/scss/common/common.scss`: removed `@import`s of the removed
  modules (`site-editor`, `kit-library`, `onboarding`, `promotions`).
* `app/assets/js/index.js`, `app-packages.js`: dropped the Kit Library, Onboarding, Onboarding-new and Site Editor modules.
* `app/assets/js/event-track/apps-event-tracking.js`: events manager is gone; all dispatches are now no-ops.
* `core/common/assets/js/common.js`: removed `Connect`, the event-tracker component and the events manager. `refractionCommon.eventsManager` is now
  `core/common/assets/js/utils/null-events-manager.js`, a null object (any property is another null object, `dispatchEvent` does nothing), because dozens
  of editor files (template library, checklist, preferences, context menu) still read `eventsManager.config.*` deep keys while building telemetry payloads.
* `assets/dev/js/editor/editor-base.js`: dropped the Promotions and Cloud Library modules.
* `modules/editor-one`: the admin top bar used `@elementor/elementor-one-assets` (Elementor's cloud header). Replaced with a local header in
  `top-bar/app.js` (+ styles in `top-bar.scss`); removed `Top_Bar_Locale_Assets`, `Refraction_One_Language_Mapper`, the locale-copy build step, the Vite
  locale import plugin, and their verify steps / PHPUnit test.
* Ace editor vendored in `assets/lib/ace` (ace-builds 1.43.2, BSD-3-Clause; only html/css/javascript/json/xml/text modes, the merbivore_soft theme,
  workers and snippets). `core/editor/loader/editor-loader.php` now enqueues it locally instead of cdn.jsdelivr.net.
* Twig / php-scoper: nothing in the PHP code uses Twig any more (atomic widgets were removed), so `twig/twig`, `humbug/php-scoper`, `php-scoper/`, the
  `vendor_prefixed` classmap, the composer scoper hooks, `bin/check-twig-safety.sh` and the `trigger_deprecation` shim in `refraction.php` were removed.
  `vendor_prefixed/` is therefore empty (only a `.gitignore`).
* `scripts/vite/shared/{packages-externals,externals}.mjs`: `@elementor/ui|icons` deep-import regexes restored, site-editor external dropped.

## Known build-related problems / not fixed

* `packages/` still contains the Atomic/v4, MCP, onboarding, promo and cloud code listed in `atomic-removal-leftovers.md` and `remote-removal-leftovers.md`.
  They compile (61/61) but PHP no longer loads most of them; they only add build time.
* Dead JS paths remain that call removed PHP: template library cloud/quota views (`assets/dev/js/editor/components/template-library/...`),
  `refractionCommon.connect` consumers, checklist "mixpanel" helpers (now no-ops through the null events manager), `refraction.promotion`.
  They bundle without errors; whether each is reachable at runtime is only partly verified (see the boot test section of the final report).
* Remote requests that still exist in the UI source: `https://assets.elementor.com/...` images (checklist success message, packages), Google Fonts
  (`app/assets/styles/_base.scss`, `modules/admin-top-bar`, editor font previews).
* Node 24 and npm 11.16 (`.nvmrc`/`packageManager`) were not available; the build ran on Node 22.
* No unit tests (jest, phpunit, qunit, playwright) were run in this stage.
