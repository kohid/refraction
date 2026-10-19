# Upstream vs Refraction parity audit (admin and editor entry points)

Upstream = Elementor 4.4.0 as imported in commit `54a930e` (read with `git show 54a930e:<path>`). Refraction = this branch.
Every row was exercised in a real browser (Playwright + Chromium) against WordPress sites built by
`scripts/setup-menu-test-site.sh` from `dist/refraction.zip`: WordPress 7.1.3 (SQLite) and 6.9.4 (SQLite).
The checks are in `scripts/check-admin-ui.mjs` (75 checks, as administrator and as editor) and
`scripts/check-admin-menu.mjs`. "Before" results come from the first run of the check on the 0.1.1 build.

Result summary: the first run of the check against the 0.1.1 build failed in the areas of rows 5, 6, 12, 15, 23, 28, 30, 32-35, 38
(the run logs are not committed; each failure is described in the table). After the fixes: 75/75 checks pass on WordPress 7.1.3
and 75/75 on 6.9.4 (administrator and editor role), `check-admin-menu.mjs` passes, and the PHP debug log stays empty.

## Table

| # | Entry point | Upstream behaviour (file) | Refraction result before | Root cause | Fixed |
|---|---|---|---|---|---|
| 1 | Plugins screen: Settings action link | `core/admin/admin.php` plugin action links | pass (`Settings` -> `page=refraction-settings`) | - | n/a |
| 2 | Refraction menu pages (Home, Settings, Tools, Saved Templates, Floating Elements, Role Manager, System Info) | Editor One menu (`modules/editor-one`) | pass for admin and editor role (`check-admin-menu.mjs`) | - | n/a |
| 3 | Settings tabs (General, Integrations, Advanced, Performance, Features): click shows only that panel, hash updates, no scroll | `includes/settings/settings-page.php:316-333`, `assets/dev/js/admin/admin.js` `activateSettingsTab` | pass on a clean site (5/5 tabs, WP 7.1.3 and 6.9.4, min and non-min scripts). The reported failure could not be reproduced, see "Reported bugs" below | not reproduced | n/a |
| 4 | Settings: deep link `#tab-advanced` opens that tab | same | pass | - | n/a |
| 5 | Settings: save, value persisted, stays on tab | `settings-page.php` form -> `options.php#tab` | pass, but a JS error `r.startsWith is not a function` was thrown on every submit | `app/assets/js/event-track/wp-dashboard-tracking.js` (a Mixpanel session tracker kept alive by the null events manager) read `form.action`, which is the form's `action` input | yes (module no longer imported by `admin.js`) |
| 6 | Settings: "Settings saved." notice | upstream shows none | fail (no notice) | upstream has no `settings_errors()` call | yes, local addition (`settings_errors()` in `settings-page.php`) |
| 7 | Tools tabs: General, Replace URL, Maintenance Mode, Website Templates (kit) | `includes/settings/tools.php`, `includes/maintenance-mode.php` | pass | - | n/a |
| 8 | Tools: Clear Files & Data, Replace URL (ajax) | `tools.php`, `assets/dev/js/admin/admin.js` | pass | - | n/a |
| 9 | Tools: Maintenance Mode saves and applies to visitors | `includes/maintenance-mode.php` | pass (needs a template; visitor gets the coming-soon response) | - | n/a |
| 10 | Tools: Version Control (rollback, beta tester) | `tools.php:363` | removed on purpose | needs wordpress.org download of old versions | no (cannot work offline; smallest replacement: install an older release zip from the GitHub releases page) |
| 11 | Tools: Sync Library | `tools.php:321` | removed on purpose | remote template library | no |
| 12 | Tools > Website Templates: export / import app (`page=refraction-app`) | `app/app.php` + kit-library/import-export modules | fail: 403; after registering the page, index route crashed (`menu_url.split`), export screen crashed (`library_connect.is_connected`), Templates section locked behind an Upgrade button | page was only registered by the removed Theme Builder menu item; app read removed config and cloud endpoints | yes (hidden page registered, cloud footer removed, Templates unlocked, cloud eligibility/Atomic counts stubbed). Export downloads a .zip, importing it reaches the selection step |
| 13 | Tools > Website Templates: "Save to library" (cloud) | `export-kit-footer.js` | removed | cloud library | no (by design) |
| 14 | Saved Templates list | `includes/template-library/sources/local.php` | pass | - | n/a |
| 15 | Templates: Add New Template dialog ("Choose Template Type") then editor | `assets/dev/js/admin/new-template/new-template.js` (intercepts the list button and `#add_new`) | pass from the list button; `post-new.php?post_type=refraction_library` (admin bar + New > Template) opened the raw WordPress edit screen (custom fields, no type) | upstream quirk | yes (redirect to `edit.php?post_type=refraction_library#add_new`) |
| 16 | Templates: import area, export one template | `local.php` `admin_import_template_form`, export action | pass (export of the empty Default Kit answers "The template is empty", same as upstream) | - | n/a |
| 17 | Templates: Categories | `edit-tags.php?taxonomy=refraction_library_category` | page reachable (redirects to Saved Templates, same as upstream `redirect_categories_page_to_saved_templates_page`) | - | n/a |
| 18 | Pages/Posts list: "Edit with Refraction" row action | `core/base/document.php:651` (only for posts already built with the editor) | pass on built pages; absent on plain pages (same as upstream) | upstream design | yes, extended: also listed for every editable post (`is_start_editable_with_refraction`) so a new page has an entry on the Pages screen |
| 19 | Pages/Posts list: post state "Refraction" | `core/admin/admin.php` `add_refraction_post_state` | pass on built pages | - | n/a |
| 20 | Classic editor: "Edit with Refraction" button under the title, opens the editor | `core/admin/admin.php` `print_switch_mode_button`, `admin.js` (waits for the autosave heartbeat tick) | pass | - | n/a (needs the WordPress Heartbeat API; hosts that disable it would stall the button, same as upstream) |
| 21 | Block editor: "Edit with Refraction" in the header toolbar, opens the editor | `modules/gutenberg/module.php`, `assets/dev/js/admin/gutenberg.js` | pass (administrator and editor role, WP 7.1.3 and 6.9.4). On a new page WordPress first shows its "Choose a pattern" modal over the toolbar; close it to reach the button | - | n/a |
| 22 | Frontend admin bar "Edit with Refraction" (+ Site Settings, Clear Files & Data) | `modules/admin-bar/module.php` (only on pages rendered by the builder) | pass | - | n/a |
| 23 | "Create new page" (Home screen) opens the Refraction editor | upstream Home -> `documents->get_create_new_post_url('page')` | fail: went to the WordPress block editor | `includes/settings/settings.php` linked `post-new.php?post_type=page` | yes |
| 24 | Floating Elements: list, Add New dialog, create, editor | `modules/floating-buttons` | pass | - | n/a |
| 25 | Role Manager: page, expand roles, save persists | `includes/settings`/role manager | pass | - | n/a |
| 26 | System Info: reports render | `modules/system-info` | pass | - | n/a |
| 27 | Landing Pages | `modules/landing-pages` (experiment; upstream only exposes it when landing pages already exist) | `edit.php?post_type=e-landing-page` answers an error page on a fresh site | same condition as upstream (`should_activate_landing_pages`) | n/a |
| 28 | Element Manager | `modules/element-manager` | fail: hidden from the menu and `page=refraction-element-manager` answered 403; the React app crashed on removed promotion data | `menu-config.php` excluded it; the app read `promotion_data` and showed Pro upsells | yes (page listed again, role-permission column and Pro elements table removed) |
| 29 | Editor opens from every entry point above (panel, 59 widgets) | `core/editor` | pass | - | n/a |
| 30 | Editor: "Refraction 2.5 flexbox changes" dialog | `assets/dev/js/editor/components/documents/commands/internal/load.js` (pages saved before 2.5.0) | fail: shown on every editor open and it covered the top bar | Refraction's version (0.x) is below 2.5.0 | yes (dialog removed) |
| 31 | Editor: save/publish, preview, frontend render | `core/documents-manager.php` | pass (publish through the UI, preview popup, heading rendered) | - | n/a |
| 32 | Editor: Library button / Ctrl+Shift+L opens the local library | `assets/dev/js/editor/components/template-library/component.js` | fail: error `Routes library/library/templates/my-templates not found` | fallback default route repeated the namespace after `remoteLibrary` config was removed | yes |
| 33 | Editor: library lists local templates | `includes/template-library/data/endpoints/templates.php` | fail: PHP fatal `array_search(): Argument #2 must be of type array` | removed remote block category list | yes |
| 34 | Editor: insert a saved template | `component.js` `downloadTemplate` | fail: `remoteLibrary.autoImportSettings` and `library_connect` undefined | removed config | yes (optional chaining, local `library_connect` config) |
| 35 | Editor: Save as Template (app bar) stores a local template | `use-document-save-template-props.ts`, `save-template.js` | fail: app bar click threw (`toLowerCase`), then the dialog threw on the removed `cloud-library` component | null events manager returned `undefined` from calls; save dialog used cloud quota/connect/promo code | yes (chainable null manager, `canSaveToCloud: false`, local wording) |
| 36 | Library tabs "Blocks" / "Pages" (remote library) | `component.js` default tabs | tabs exist and show "no templates" | remote library removed | no (cosmetic, left in place because landing-page/floating hooks re-add them) |
| 37 | Tools page script (Website Templates events) | `app/modules/import-export-customization/assets/js/admin.js` | fail on WordPress 6.9.4: `refractionAdmin is not defined` | telemetry code on `window load` reading a global the admin script had not created yet | yes (telemetry removed) |
| 38 | Saved templates by authorless posts | `local.php` | PHP warning `display_name on false` | no author on posts created by wp-cli/import | yes |

Counts: 38 rows. Matched upstream already (pass, including row 3 which could not be reproduced): 20. Failed before and fixed: 14 (rows 5, 6, 12, 15, 18 extended, 23, 28, 30, 32, 33, 34, 35, 37, 38).
Removed on purpose or impossible offline and still not available: 4 (rows 10, 11, 13, 36). Not reproduced: 1 (row 3 as reported).

## Reported bugs

1. Settings tabs do not switch ("the page just scrolls down"). Not reproducible with the shipped zip on a clean site:
   all five tabs switch, the hash changes, only one panel is visible, no scroll jump, no console error (WordPress 7.1.3 and 6.9.4,
   minified and `SCRIPT_DEBUG` scripts, Chromium). The markup and `admin.js` are identical to upstream after the rename and all
   assets answer 200. A page that "scrolls" instead of switching means the stylesheet rule that hides the inactive panels
   and the click handler were both missing on that site, i.e. `admin.css` and `admin.js` did not load or did not run there.
   Things that were found and fixed in this area: a telemetry module that threw on every settings submit (row 5) and a
   second one that raced the admin script on the Tools page (row 37). Open question for the owner: browser console and
   Network tab on the failing site (a blocked/optimised/deferred `admin.min.js`, a caching plugin, or a PHP notice printed into the page would explain it).
2. No "Edit with Refraction" button. Not reproducible: the block editor header button, the classic editor button, the row
   action on built pages, the admin bar link and the post state all work on the shipped zip. What was true: (a) the Pages list
   showed the row action only for pages already built, same as upstream, so a new page had no entry from the list;
   (b) the Home "Create new page" button opened the block editor; (c) on a new page the block editor opens WordPress's
   "Choose a pattern" modal above the toolbar button. (a) and (b) are fixed.

## Not tested

Firefox/Safari, a MySQL database, other plugins/hosts (the "Finish Setup" host button), PHP other than 8.3, multisite, non-English locales,
RTL, Pro-only features (none exist), the browser update-check against GitHub (separate agent), mobile layouts of the editor.
