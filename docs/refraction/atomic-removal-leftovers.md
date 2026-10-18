# Atomic Editor removal: leftovers for the editor-rewrite phase

The PHP side of the Atomic Editor was removed in the `feat!: remove Atomic Editor` commit.
This file lists everything JS/CSS/package-side (and PHP-localized settings keys) that is
atomic-specific and was deliberately NOT touched in that commit (`packages/` and `assets/dev` are out of scope).
Nothing below is loaded by PHP any more except where noted, so these can be deleted or rewritten freely.

## 1. Packages under `packages/` (all atomic/v4-specific)

Apps:
- `packages/apps/unlock-v4-promo` (was registered in `Editor_Loader::EXTENSIONS`; entry removed from PHP)
- `packages/apps/v4-activation-modal` (atomic opt-in modal; its PHP module `atomic-opt-in` is gone)
- `packages/apps/elementor-capabilities-mcp` (PHP module `elementor-capabilities-mcp` removed)

Core packages:
- `packages/packages/core/editor-canvas` (atomic element rendering/view layer)
- `packages/packages/core/editor-editing-panel` (atomic editing panel, style tab)
- `packages/packages/core/editor-components`
- `packages/packages/core/editor-default-styles`
- `packages/packages/core/editor-design-system`
- `packages/packages/core/editor-global-classes`
- `packages/packages/core/editor-interactions`
- `packages/packages/core/editor-variables`
- `packages/packages/core/editor-widget-creation`
- `packages/packages/core/editor-styles-repository`
- `packages/packages/core/editor-elements-panel` (review: contains v4-elements category and atomic-form handling; likely needs trimming, not full removal)
- `packages/packages/core/editor-elements-panel-notice` (verify; PHP still lists it in `Editor_Loader::LIBS`)
- `packages/packages/core/editor-site-settings`, `editor-templates`, `editor-documents`, `editor-panels` (review for atomic coupling before keeping)
- `packages/packages/core/elementor-kit-mcp`, `packages/packages/core/elementor-v3-mcp` (MCP; PHP module `mcp` removed)

Libs:
- `packages/packages/libs/editor-controls`, `editor-props`, `editor-styles`, `editor-elements`, `schema`, `editor-ui` (prop-type/style/atomic-control stack; review for classic-editor use before removing)
- `packages/packages/libs/editor-mcp`, `packages/packages/libs/elementor-mcp-common` (MCP)
- `packages/packages/libs/twing` (twig runtime for atomic templates)

Registration points that still mention removed packages (outside PHP):
- `scripts/vite/shared/externals.mjs`, `scripts/vite/shared/entries.mjs`, `scripts/vite/plugins/scss-build.mjs`, `scripts/vite/assemble-plugin.mjs`, `scripts/vite/README.md`
- `AGENTS.md`, `CONTRIBUTING.md`
- `package.json` workspaces / turbo pipeline
- `composer.json` requires `elementor/elementor-mcp-composer` (only used by the removed `mcp` module; `composer.lock` must be regenerated when it is dropped)
- `vendor_prefixed/` and `php-scoper/`: Twig (and anything only used by atomic widgets) is probably unused now

## 2. `assets/dev` JS/SCSS with atomic/v4 coupling

JS:
- `assets/dev/js/editor/utils/v4-preset-utils.js` (atomic only)
- `assets/dev/js/editor/regions/panel/pages/elements/views/widget-creation.js` (Angie widget creation; templates were removed from PHP)
- `assets/dev/js/editor/components/template-library/component.js`, `manager.js` (global classes / variables snapshot and import_mode flow; the `process_global_styles` ajax action was removed in PHP)
- `assets/dev/js/editor/utils/heartbeat.js` (consumes `elementor_mcp_mutation`, no longer sent)
- `assets/dev/js/editor/regions/panel/pages/elements/elements.js`, `views/category.js`, `views/element.js`, `views/elements.js` (`v4-elements` / `atomic-form` categories, `eicon-atomic`, `isNew` badge)
- `assets/dev/js/editor/editor-base.js`, `controls/color.js`, `controls/popover-toggle.js`
- `assets/dev/js/editor/document/elements/commands/create.js`, `paste.js`; `document/repeater/commands/insert.js`, `remove.js`
- `assets/dev/js/editor/elements/models/element.js`, `elements/views/base.js`, `views/base-container.js`, `views/preview.js`
- `assets/dev/js/editor/regions/navigator/element.js`
- `assets/dev/js/editor/utils/element-types.js`, `helpers.js`, `jquery-html5-dnd.js`
- `assets/dev/js/utils/notifications.js`
- `core/common/modules/events-manager/assets/js/events-config.js`
- `modules/nested-accordion/assets/js/frontend/handlers/nested-accordion.js`, `modules/nested-tabs/assets/js/frontend/handlers/nested-tabs.js`
- `modules/nested-elements/assets/js/editor/utils.js` and `nested-repeater/hooks/data/document/repeater/{duplicate,insert,move,remove}/*` (atomic repeater branches)
- `modules/promotions/assets/js/react/{app-manager.js,app.js,atomic-promotion-media.js,components/atomic-promotion-card.js,assets/atomic-form-animation.json}` (atomic promotion UI; PHP promo controls/widgets removed)
- `modules/promotions/assets/js/editor/*` check for atomic promotion behaviour
- `app/modules/import-export-customization/assets/js/shared/components/kit-settings-customization-dialog.js`, `shared/hooks/use-classes-variables-limits.js` (classes/variables/design-system sections; `limits` payload key, `classes`/`variables`/`defaultStyles` site-settings keys and the `manager-url` REST route were removed in PHP)

SCSS:
- `assets/dev/scss/editor/panel/_elements.scss`, `assets/dev/scss/editor/preview/_container.scss`, `assets/dev/scss/editor/preview/preview.scss`
- Any `e-atomic*`, `.e-con-atomic*`, `eicon-atomic`, `.e-widget-new-badge` rules; icon font glyph `eicon-atomic`
- `modules/promotions/assets/scss`: review for atomic promotion styles
- `core/editor/loader/scss/editor-v2-app-bar-overrides.scss`: review

## 3. Non-PHP files that lived inside the deleted PHP modules (removed with the module directories)

Recorded here for reference when porting anything. They are available in git history at the baseline commit `54a930e`.

- `modules/atomic-opt-in/assets/js/opt-in-page/app.js`
- `modules/atomic-opt-in/assets/js/opt-in-page/opt-in-api.js`
- `modules/atomic-opt-in/assets/js/opt-in-page/opt-in-content.js`
- `modules/atomic-opt-in/assets/js/opt-in-page/opt-in-img-placeholders.js`
- `modules/atomic-opt-in/assets/js/opt-in-page/opt-in-message.js`
- `modules/atomic-opt-in/assets/js/opt-in-page/opt-in-terms.js`
- `modules/atomic-opt-in/assets/js/opt-in-page/opt-in.js`
- `modules/atomic-opt-in/assets/js/panel-chip/app-manager.js`
- `modules/atomic-opt-in/assets/js/panel-chip/app.js`
- `modules/atomic-opt-in/assets/js/panel-chip/components/popover-card.js`
- `modules/atomic-opt-in/assets/js/panel-chip/panel-chip.js`
- `modules/atomic-opt-in/assets/scss/opt-in.scss`
- `modules/atomic-widgets/assets/js/editor/atomic-element-base-model.js`
- `modules/atomic-widgets/assets/js/editor/atomic-element-base-type.js`
- `modules/atomic-widgets/assets/js/editor/atomic-element-types/create-div-block-type.js`
- `modules/atomic-widgets/assets/js/editor/atomic-element-types/create-flexbox-type.js`
- `modules/atomic-widgets/assets/js/editor/atomic-element-types/create-grid-type.js`
- `modules/atomic-widgets/assets/js/editor/component.js`
- `modules/atomic-widgets/assets/js/editor/container/atomic-element-empty-view.js`
- `modules/atomic-widgets/assets/js/editor/create-atomic-element-base-view.js`
- `modules/atomic-widgets/assets/js/editor/hooks/data/clear-duplicated-settings/duplicate-element.js`
- `modules/atomic-widgets/assets/js/editor/hooks/data/regenerate-local-style-ids/duplicate-element.js`
- `modules/atomic-widgets/assets/js/editor/hooks/data/regenerate-local-style-ids/import-element.js`
- `modules/atomic-widgets/assets/js/editor/hooks/data/regenerate-local-style-ids/paste-element.js`
- `modules/atomic-widgets/assets/js/editor/hooks/index.js`
- `modules/atomic-widgets/assets/js/editor/module.js`
- `modules/atomic-widgets/assets/js/editor/utils/clear-duplicated-settings.js`
- `modules/atomic-widgets/assets/js/editor/utils/get-element-children.js`
- `modules/atomic-widgets/assets/js/editor/utils/get-random-style-id.js`
- `modules/atomic-widgets/assets/js/editor/utils/regenerate-local-style-ids.js`
- `modules/atomic-widgets/assets/js/frontend/action-link-handlers.js`
- `modules/atomic-widgets/assets/js/frontend/form-handlers.js`
- `modules/atomic-widgets/assets/js/frontend/utils.js`
- `modules/atomic-widgets/assets/scss/editor.scss`
- `modules/atomic-widgets/elements/atomic-accordion/atomic-accordion-item-content/atomic-accordion-item-content.html.twig`
- `modules/atomic-widgets/elements/atomic-accordion/atomic-accordion-item-header/atomic-accordion-item-header.html.twig`
- `modules/atomic-widgets/elements/atomic-accordion/atomic-accordion-item-icon/atomic-accordion-item-icon.html.twig`
- `modules/atomic-widgets/elements/atomic-accordion/atomic-accordion-item-title/atomic-accordion-item-title.html.twig`
- `modules/atomic-widgets/elements/atomic-accordion/atomic-accordion-item/atomic-accordion-item.html.twig`
- `modules/atomic-widgets/elements/atomic-accordion/atomic-accordion.html.twig`
- `modules/atomic-widgets/elements/atomic-accordion/handlers/accordion-header-selected.js`
- `modules/atomic-widgets/elements/atomic-accordion/handlers/accordion-selected-state.js`
- `modules/atomic-widgets/elements/atomic-accordion/handlers/editor-accordion-state.js`
- `modules/atomic-widgets/elements/atomic-background-video/assets/pause-icon.svg`
- `modules/atomic-widgets/elements/atomic-background-video/assets/play-icon.svg`
- `modules/atomic-widgets/elements/atomic-background-video/atomic-background-video-content/atomic-background-video-content.html.twig`
- `modules/atomic-widgets/elements/atomic-background-video/atomic-background-video-controls/atomic-background-video-controls.html.twig`
- `modules/atomic-widgets/elements/atomic-background-video/atomic-background-video-pause/atomic-background-video-pause.html.twig`
- `modules/atomic-widgets/elements/atomic-background-video/atomic-background-video-play/atomic-background-video-play.html.twig`
- `modules/atomic-widgets/elements/atomic-background-video/atomic-background-video.html.twig`
- `modules/atomic-widgets/elements/atomic-background-video/handlers/background-video-handler.js`
- `modules/atomic-widgets/elements/atomic-background-video/handlers/background-video-preview-handler.js`
- `modules/atomic-widgets/elements/atomic-background-video/handlers/editor-background-video-state.js`
- `modules/atomic-widgets/elements/atomic-button/atomic-button.html.twig`
- `modules/atomic-widgets/elements/atomic-carousel/carousel-promotion.html.twig`
- `modules/atomic-widgets/elements/atomic-collection-loop/collection-loop-promotion.html.twig`
- `modules/atomic-widgets/elements/atomic-divider/atomic-divider.html.twig`
- `modules/atomic-widgets/elements/atomic-form/atomic-form-promotion.html.twig`
- `modules/atomic-widgets/elements/atomic-form/atomic-form.html.twig`
- `modules/atomic-widgets/elements/atomic-form/form-message/form-message.html.twig`
- `modules/atomic-widgets/elements/atomic-heading/atomic-heading.html.twig`
- `modules/atomic-widgets/elements/atomic-image/atomic-image.html.twig`
- `modules/atomic-widgets/elements/atomic-list/atomic-list-item-content/atomic-list-item-content.html.twig`
- `modules/atomic-widgets/elements/atomic-list/atomic-list-item-marker/atomic-list-item-marker.html.twig`
- `modules/atomic-widgets/elements/atomic-list/atomic-list-item/atomic-list-item.html.twig`
- `modules/atomic-widgets/elements/atomic-list/atomic-list/atomic-list.html.twig`
- `modules/atomic-widgets/elements/atomic-map/atomic-map.html.twig`
- `modules/atomic-widgets/elements/atomic-map/providers/google/google-maps.html.twig`
- `modules/atomic-widgets/elements/atomic-paragraph/atomic-paragraph.html.twig`
- `modules/atomic-widgets/elements/atomic-self-hosted-video/atomic-self-hosted-video.html.twig`
- `modules/atomic-widgets/elements/atomic-svg/atomic-svg.html.twig`
- `modules/atomic-widgets/elements/atomic-tabs/atomic-tab-content/atomic-tab-content.html.twig`
- `modules/atomic-widgets/elements/atomic-tabs/atomic-tab/atomic-tab.html.twig`
- `modules/atomic-widgets/elements/atomic-tabs/atomic-tabs-content-area/atomic-tabs-content-area.html.twig`
- `modules/atomic-widgets/elements/atomic-tabs/atomic-tabs-menu/atomic-tabs-menu.html.twig`
- `modules/atomic-widgets/elements/atomic-tabs/atomic-tabs/atomic-tabs.html.twig`
- `modules/atomic-widgets/elements/atomic-tabs/handlers/atomic-tabs-handler.js`
- `modules/atomic-widgets/elements/atomic-tabs/handlers/atomic-tabs-preview-handler.js`
- `modules/atomic-widgets/elements/atomic-tabs/handlers/editor-tabs-state.js`
- `modules/atomic-widgets/elements/atomic-tabs/handlers/utils.js`
- `modules/atomic-widgets/elements/atomic-youtube/atomic-youtube.html.twig`
- `modules/atomic-widgets/elements/atomic-youtube/youtube-handler.js`
- `modules/atomic-widgets/elements/base/_macros.html.twig`
- `modules/atomic-widgets/elements/div-block/div-block.html.twig`
- `modules/atomic-widgets/elements/flexbox/flexbox.html.twig`
- `modules/atomic-widgets/elements/grid/grid.html.twig`
- `modules/components/widgets/component.html.twig`
- `modules/design-system-sync/assets/js/design-system-sync-handler.js`
- `modules/design-system-sync/assets/scss/design-system-sync.scss`
- `modules/interactions/assets/js/editor-interactions.js`
- `modules/interactions/assets/js/interactions-breakpoints.js`
- `modules/interactions/assets/js/interactions-shared-utils.js`
- `modules/interactions/assets/js/interactions-utils.js`
- `modules/interactions/assets/js/interactions.js`
- `modules/mcp/assets/dev/js/mcp-analytics-registrar.js`
- `modules/mcp/assets/dev/js/mcp-promotion-registrar.js`
- `modules/mcp/assets/dev/js/mcp-upgrade-promotion.jsx`
- `modules/mcp/static-resources/abilities/build-composition.md`
- `modules/mcp/static-resources/abilities/clear-cache.md`
- `modules/mcp/static-resources/abilities/create-preview-link.md`
- `modules/mcp/static-resources/abilities/find-icons.md`
- `modules/mcp/static-resources/abilities/get-system-info.md`
- `modules/mcp/static-resources/abilities/get-widget-schema.md`
- `modules/mcp/static-resources/abilities/list-assets.md`
- `modules/mcp/static-resources/abilities/list-components.md`
- `modules/mcp/static-resources/abilities/list-posts.md`
- `modules/mcp/static-resources/abilities/list-resources.md`
- `modules/mcp/static-resources/abilities/list-widget-schemas.md`
- `modules/mcp/static-resources/abilities/manage-component.md`
- `modules/mcp/static-resources/abilities/read-resource.md`
- `modules/mcp/static-resources/style/best-practices.md`
- `modules/mcp/static-resources/wordpress/best-practices.md`

Also removed wholesale with their modules: all PHP in `modules/{atomic-opt-in,atomic-widgets,global-classes,variables,components,interactions,design-system-sync,default-styles,mcp,widget-creation,elementor-capabilities-mcp}`.

## 4. PHP-localized / printed settings keys, hook names and options that no longer exist (JS may still read them)

Removed in PHP edits:
- Editor settings (`elementor/editor/localize_settings`): `v4Promotions`; per-tag `atomic_group` (from `Base_Tag::get_config()`)
- Frontend settings: `nonces.atomicFormsSendForm`
- Editor env (`elementorEditorEnv`, `scripts/env` filter): `@elementor/editor-controls.background_placeholder_image`
- Heartbeat response key: `elementor_mcp_mutation` (filter `elementor/heartbeat/mutation_marker`)
- Script handles: `editor-v4-opt-in-alphachip`, `elementor-mcp-analytics-registrar`, `elementor-mcp-promotion-registrar` (global `elementorMcpPromotionConfig`)
- Editor v2 packages (`Editor_Loader::LIBS` / `EXTENSIONS`): `elementor-mcp-common`, `unlock-v4-promo`, `editor-mcp`, `elementor-v3-mcp`, `elementor-kit-mcp`; packages previously added through the `elementor/editor/v2/packages` filter by removed modules: `editor-widget-creation`, `elementor-capabilities-mcp`, and the atomic-opt-in / atomic-widgets / global-classes / variables / components / interactions / default-styles / design-system-sync packages
- Elements panel categories: `v4-elements` ("Atomic Elements"), `atomic-form` ("Atomic Form"); JS classes/templates `eicon-atomic`, `v4Categories`; Underscore templates `tmpl-elementor-panel-elements-widget-creation-empty-state`, `...-search-footer`; DOM node `#elementor-panel-elements-widget-creation-area`
- Widgets manager promoted-widget group `atomic_widgets` (Atomic_Heading, Atomic_Image, Atomic_Paragraph, Atomic_Button, Atomic_Svg, Atomic_Divider)
- Hotkeys template: "Create Component" (Ctrl+Shift+K) entry
- Hints key: `ally_atomic_notice`
- Template library: ajax action `process_global_styles`; filters `elementor/template_library/import/process_content`, `.../export/build_snapshots`, `.../get_data/extract_snapshots`; `import_mode` argument of `import_template()` / `prepare_import_template_data()`; `global_classes` / `global_variables` keys in exported template JSON
- Import/export: kit `site-settings` keys `classes`, `defaultStyles`, `variables` (and `*Count` manifest keys); localized `limits`; `design-system` include type; REST route `manager-url`; `atomic_prop_remap` import metadata
- Editor-one menu slug `elementor-mcp`
- Experiments: `e_atomic_elements` (registered by atomic-widgets; the other atomic modules were gated on it), `e_opt_in_v4`, `e_angie_in_panels`, `e_mcp_v3_standardized_maps`, `e_mcp_revision_snapshots`, `e_component_variants`, and `e_pro_atomic_form` (Pro-side flag that core referenced). Classes, variables, components, interactions and design-system-sync had no experiment of their own; they were active whenever `e_atomic_elements` was. See the removed `module.php` files at baseline `54a930e` for details.
- Options / meta introduced by removed modules (not deleted from existing databases): `angie_external_scripts_consent`, introduction meta `atomic_elements_promo`, user meta used by atomic opt-in, global classes / variables / default styles kit meta and the default-style / component custom post types. A migration for existing sites is out of scope here.

## 5. Tests removed (PHPUnit / Playwright / Jest / elements-regression)

- `tests/phpunit/elementor/modules/{atomic-widgets,components,default-styles,design-system-sync,global-classes,interactions,mcp,variables,widget-creation}`
- `tests/phpunit/elementor/modules/promotions/test-atomic-promotions.php`
- `tests/phpunit/elementor/app/import-export-customization/{processes/test-export-site-settings-feature-gates.php,runners/test-site-settings-classes-feature.php}`
- `tests/phpunit/elementor/includes/template-library/{test-global-classes-template-bundle,test-variables-template-bundle,test-import-modes-transformation}.php`
- `tests/phpunit/elementor/includes/test-heartbeat.php` (MCP mutation marker only)
- `tests/phpunit/elementor/core/role-manager/test-content-only-save-guard.php` (class removed: it only restored atomic `styles` / `interactions` / `classes` fields)
- `tests/phpunit/elementor/modules/wp-rest/{test-post-query,test-term-query,test-user-query}.php` and `providers/*` (built on the atomic Query_Builder_Factory; the `wp-rest` module itself was kept, these need rewriting against its own API)
- `tests/playwright/sanity/modules/{atomic-opt-in,atomic-widgets,v4-tests,widget-creation,div-block}`, nested-accordion/nested-tabs atomic repeaters, promotions carousel/loop/atomic-form tests, `history/revision-unknown-widgets.test.ts`, `elements-panel-atomic-search.test.ts`, panel `keyboard-navigation.test.ts`, `tests/playwright/pages/atomic-elements-panel`, `tests/playwright/blueprints/example-plugin.json`
- `tests/elements-regression/tests/atomic-elements-regression.test.ts`
- `tests/jest/unit/modules/{atomic-widgets,interactions,mcp}`
- Edited (not removed): `test-elements.php` (v4 category-order cases dropped), `usage/test-module.php` (atomic usage cases dropped), `test-manager-cloud.php`, `test-frontend.php`, `core/admin/test-admin.php`, `editor-one/test-elementor-one-menu-manager-protected-slugs.php`, playwright `editor-page.ts`, `elements-utils.ts`, blueprints (`e_atomic_elements`, `e_opt_in_v4` activation dropped)
- Still to clean: `tests/phpunit/schemas/usage.json` (`global_classes` usage schema), `tests/qunit/mock`, playwright `captureNextElementCreation` helper (now unused), other specs that call `setExperiments({ e_atomic_elements ... })`.

## 6. Other

- `examples/example-plugin` (atomic widget/prop-type/variable extension example) was deleted; `ruleset.xml`, `scripts/vite/shared/plugin-files.mjs`, `scripts/vite/assemble-plugin.mjs` still exclude `examples/`.
- `docs/atomic-builder/` (developer docs for the atomic system) was deleted. Check `docs/modules`, `docs/data` and `readme.txt` / `changelog.txt` for remaining prose mentions.
- `modules/agents` was kept; it contains dormant MCP discovery endpoints (WebMCP manifest, oauth-protected-resource) gated by the filter `elementor/agents/link_headers/emit_mcp_card` (default false). Review during the remote-services / agents phase.
