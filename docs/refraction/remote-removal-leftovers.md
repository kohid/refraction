# Remote services and upsell removal: leftovers for the editor-rewrite phase

The PHP side of every Elementor remote service, telemetry channel and commercial upsell was removed in the
`feat!: remove Elementor remote services and upsell` commit. `packages/` and `assets/dev/` were deliberately NOT
touched. This file lists what is still referenced from JS/CSS/build config so the editor-rewrite phase can delete or
rewrite it. Nothing listed here is loaded by PHP any more unless a note says so.

`composer.lock` is stale: `elementor/wp-one-package`, `elementor/elementor-mcp-composer` (both from the private
`composer.elementor.com` repository), the `repositories` block and the `mixpanel/mixpanel-php` dev dependency were
removed from `composer.json`. Regenerate the lock with `composer update --lock` on a networked machine
(`elementor/wp-notifications-package` is still pinned in the lock file only, nothing requires it any more).
`package.json` still depends on `mixpanel-browser` and `@elementor/elementor-one-assets` (JS phase).

## A. PHP localized keys, script handles, endpoints and template ids that no longer exist

Anything in JS that reads or calls these will now get `undefined` or a 404.

Editor config (`elementor.config.*`, from `Editor_Scripts_Settings`):
- Removed: `admin_apps_url`, `elementPromotionURL`, `dynamicPromotionURL`, `elementor_site`, `docs_elementor_site`,
  `help_the_content_url`, `help_flexbox_bc_url`, `icons.goProURL`, `promotion` (`elements`, `integration.ally-accessibility`),
  `promotions.notes`, `promotionWidgets`, `integrationWidgets`, `editor_events`, `user.top_bar` (`connect_url`, `my_elementor_url`),
  `preview.help_preview_error_url`, `help_preview_http_error_url`, `help_preview_http_error_500_url`.
- `admin_settings_url` is now a fixed `admin.php?page=elementor-settings`.
- `document.remoteLibrary` and `document.panel.allow_closing_remote_library` (and the `allow_closing_remote_library` document property) are gone.
- `document.panel.elements_categories`: categories that carried a `promotion` key (`pro-elements`, `theme-elements`,
  `theme-elements-single`, `woocommerce-elements`) are no longer registered. The `helloplus` category is also gone.
- Element/widget config: `upsale_data` removed (`get_upsale_data()` removed from button, heading, image-carousel,
  image-gallery, testimonial, video and the widget base class). `help_url` is now an empty string for every element,
  so the panel "Need Help" link is hidden. Kit tab `helpUrl` and `needHelpUrl` are empty strings.
- Common config (`elementorCommon.config`): `editor_events` removed; the `connect` and `event-tracker` and `events-manager`
  components are no longer in `activeModules`.
- Admin config (`elementorAdminConfig`): `beta_tester` removed. `elementor-ai-admin` script handle no longer registered.
  `media-hints` script and `elementorAdminHints` localization removed (image-optimization hint).
- Admin top bar config: `apps_url`, `promotion`, `is_user_connected`, `connect_url` removed.
- Editor One sidebar config (`editorOneSidebarConfig`): `upgradeUrl` and `upgradeText` removed (`hasPro` is kept).
- App config (`elementorAppConfig`): `menu_url`, `promotion` removed. Components `kit-library`, `onboarding`,
  `site-editor` and the cloud-library / cloud-kit-library configs are gone. The `elementor-v2-onboarding` script
  dependency and the `onboarding` package registration were removed from `App`.
- Import/export: `elementorImportExport.appUrl` now points at the bare app URL (the `#/kit-library` route is gone).
  The upload endpoints no longer accept `file_url`, `source`, `e_kit_library_nonce`, and no longer return `file_url` / `uploaded_kit`.
  `import-export-customization` REST route `process-media` removed; export result no longer has `media_urls`;
  `mediaFormat: 'cloud'` is no longer honoured.

Admin-ajax / editor ajax actions removed:
- Template library: `save_template_screenshot`, `template_screenshot_failed`, `get_templates_quota`. `get_library_data`
  is kept but returns `config: []` (no categories config) and never syncs. The `elementor_reset_library` sync button was removed from Tools.
- Editor ajax: `beta_tester_signup`, `elementor_core_ally_campaign`, `elementor_image_optimization_campaign`.
  The plugin-deactivation feedback dialog (`core/admin/feedback.php`) was removed. `elementor_set_admin_notice_viewed` is kept.
- Whole REST namespaces/modules removed with their modules: connect (`elementor/v1/connect`...), events proxy,
  cloud-library, cloud-kit-library, kit-library data controllers, onboarding(-new), notifications, apps, home, ai, ai site planner,
  pro-install, feedback, promotions.
- WP-CLI: `wp elementor sync-library`, `wp elementor system-info`, `wp elementor library sync|connect|disconnect`, and
  `wp elementor kit import --sourceType=library` removed. `--sourceType=remote` (user-supplied URL) is kept.

Editor underscore templates removed from PHP (JS views that `template:` them will fail to find them):
- `tmpl-elementor-template-library-template-remote`, `-connect`, `-connect-states`, `-upgrade-plan-button`,
  `-save-template-variant-b`, `tmpl-elementor-dynamic-tags-promo`, `tmpl-elementor-panel-element-sticky-promotion`,
  `#elementor-panel-get-pro-elements`, navigator footer promotion, editing-panel sticky promotion, nerd-box upsale block.
- `tmpl-elementor-template-library-templates`, `-template-local` and `-save-template` were rewritten local-only (no
  remote/cloud source tabs, no quota bar, no folders/grid view, no sync button, no cloud save branch, no docs footer).
  JS that still calls `elementor.templates.hasCloudLibraryQuota()`, `cloudLibraryIsDeactivated()`, the `cloud` source,
  `templates/source/is-remote` filter, `canSaveToCloud`, folder/bulk/quota actions is dead code now.
- `tmpl-elementor-panel-global` is an empty stub (it used to be a "Meet our Global Widget" upsell); JS still looks it up.
- `tmpl-elementor-beta-tester` (admin template) removed.

Control teasers removed (they were Pro upsell controls): `custom_css_pro`, `page_transitions_teaser`,
`custom_attributes_pro`, `display_conditions_pro`, `scrolling_effects_pro`, `mouse_effects_pro`, `sticky_pro`,
`motion_effects_promotion_divider`. Kit tabs `settings-custom-css` and `settings-page-transitions` are removed.
`Controls_Manager::get_teaser_template()` and the `add_*_controls` teaser helpers are removed. The filter
`elementor/widget/common/register_css_attributes_control` is no longer applied.

Other removed PHP surface that JS may still mention: `Utils::get_pro_link()`, `Utils::ANIMATED_HEADLINE|CTA|VIDEO_PLAYLIST|TESTIMONIAL_WIDGET|IMAGE_CAROUSEL`,
`Hints` class (Ally / Image Optimization / Cookiez plugin-install promos), audits `page-context` keys `ally_*`, `cookiez_*`,
`image_optimization_*`, checklist step `setup_header` and `promotion_data` / image / learn-more URLs (image_src and
learn_more_url are now empty strings), admin dashboard widget news feed + footer links, plugin action link "Get Elementor Pro",
admin footer review text, rate-us/usage-data/role-manager/Ally/Image-Optimization admin notices, `Canary_Deployment`,
version rollback and beta tester options on Tools, `Render_Mode_Preview` (`cloud-template-preview` render mode and the `template_id` query arg).
`Source_Remote` and `Source_Cloud` template sources are not registered; only `local` remains.

Behaviour that changed for non-removed callers:
- `modules/usage` is no longer gated on the telemetry opt-in; it now always keeps local element-usage statistics
  (needed by the Element Manager "usage" column and System Info). Nothing is sent anywhere. The `elementor/tracker/send_tracking_data_params`
  hook is no longer fired, so the filters hung on it were deleted.
- `Settings::display_home_screen()` renders a small local landing page (create page / my templates links) instead of the
  remote-fed `#e-home-screen` React root.
- `Elementor_Adapter::get_tier()` removed from the isolation adapter and interface.

## B. JS, SCSS and asset locations that still reference removed services, keys, hooks or templates

Generated with ripgrep (case-insensitive) over the working tree excluding `node_modules`, `tests`, `docs`, PHP and lock files.
Compiled output (`assets/js`, `assets/css`) is not committed.

Images only used by removed features that are still referenced from JS (so they were NOT deleted):
`assets/images/go-pro.svg` (import-export export-complete), `assets/images/library-connect/*` (template-library connect views),
`assets/images/kit-is-live.svg` (import-export complete pages), `assets/images/app/onboarding/*` (packages/apps/onboarding).

Build config touched: `scripts/vite/shared/entries.mjs` and `scripts/vite/plugins/scss-build.mjs` lost the entries whose
source directories no longer exist (removed modules, plus a few stale entries left behind by the earlier atomic removal),
and `scripts/vite/shared/plugin-files.mjs` no longer lists the removed vendor packages. Entries that still point at
`assets/dev/js/admin/admin-feedback.js` and `assets/dev/js/admin/beta-tester/` remain and are dead.

Non-Elementor remote dependency that blocks fully-offline use (not removed here, needs vendoring in the JS phase):
- `core/editor/loader/editor-loader.php` loads Ace (`ace`, `ace-language-tools`) from `cdn.jsdelivr.net/npm/ace-builds@1.43.2`.
- Google Fonts (`core/files/fonts/google-font.php`, editor font preview) is intentionally kept.

### B1. Hard-coded Elementor hosts (go.elementor.com, assets.elementor.com, my.elementor.com, elementor.red, elementor.com/...)

Pattern: `go\.elementor\.com|assets\.elementor\.com|my\.elementor|elementor\.red|elementor\.com/`  
Files: 79

- `app/assets/js` (1)
  - `app/assets/js/organisms/error-boundary.js`
- `app/modules/import-export-customization` (6)
  - `app/modules/import-export-customization/assets/js/export/components/export-intro.js`
  - `app/modules/import-export-customization/assets/js/import/components/import-error.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-complete.js`
  - `app/modules/import-export-customization/assets/js/shared/components/error/processing-error-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-parts-selection.js`
  - `app/modules/import-export-customization/assets/js/shared/components/re-export-banner.js`
- `app/modules/import-export` (12)
  - `app/modules/import-export/assets/js/pages/export/export-complete/export-complete.js`
  - `app/modules/import-export/assets/js/pages/export/export-kit/export-kit.js`
  - `app/modules/import-export/assets/js/pages/export/export-plugins/export-plugins.js`
  - `app/modules/import-export/assets/js/pages/import/import-complete/components/failed-plugins-notice/failed-plugins-notice.js`
  - `app/modules/import-export/assets/js/pages/import/import-complete/import-complete.js`
  - `app/modules/import-export/assets/js/pages/import/import-kit/import-kit.js`
  - `app/modules/import-export/assets/js/pages/import/import-plugins/components/pro-banner/pro-banner.js`
  - `app/modules/import-export/assets/js/pages/import/import-resolver/import-resolver.js`
  - `app/modules/import-export/assets/js/shared/info-modal/export-info-modal.js`
  - `app/modules/import-export/assets/js/shared/info-modal/import-info-modal.js`
  - `app/modules/import-export/assets/js/shared/kit-content/kit-content.js`
  - `app/modules/import-export/assets/js/shared/process-failed-dialog/process-failed-dialog.js`
- `assets/dev/js` (9)
  - `assets/dev/js/editor/components/template-library/constants.js`
  - `assets/dev/js/editor/components/template-library/views/parts/cloud-states.js`
  - `assets/dev/js/editor/components/template-library/views/parts/save-template.js`
  - `assets/dev/js/editor/controls/icons.js`
  - `assets/dev/js/editor/editor-base.js`
  - `assets/dev/js/editor/elements/views/container.js`
  - `assets/dev/js/editor/elements/views/widget.js`
  - `assets/dev/js/editor/utils/helpers.js`
  - `assets/dev/js/frontend/handlers/container/grid-container.js`
- `modules/admin-top-bar/assets` (1)
  - `modules/admin-top-bar/assets/js/components/connection-button/connection-button.js`
- `modules/checklist/assets` (1)
  - `modules/checklist/assets/js/app/components/success-message.js`
- `modules/element-manager/assets` (1)
  - `modules/element-manager/assets/js/app-editor-one/App.js`
- `packages/apps/onboarding/src` (3)
  - `packages/apps/onboarding/src/__tests__/test-utils.tsx`
  - `packages/apps/onboarding/src/components/__tests__/app.test.tsx`
  - `packages/apps/onboarding/src/steps/step-visuals.ts`
- `packages/apps/unlock-v4-promo/src` (1)
  - `packages/apps/unlock-v4-promo/src/components/atomic-elements-promo.tsx`
- `packages/apps/v4-activation-modal/src` (1)
  - `packages/apps/v4-activation-modal/src/components/app-content.tsx`
- `packages/packages/core/editor-app-bar` (3)
  - `packages/packages/core/editor-app-bar/src/extensions/angie/angie-consts.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/help/hooks/__tests__/use-action-props.test.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/help/hooks/use-action-props.ts`
- `packages/packages/core/editor-audits` (7)
  - `packages/packages/core/editor-audits/src/audits/__tests__/accessibility-statement.test.ts`
  - `packages/packages/core/editor-audits/src/audits/__tests__/accessibility-widget.test.ts`
  - `packages/packages/core/editor-audits/src/audits/accessibility-statement.ts`
  - `packages/packages/core/editor-audits/src/components/__tests__/audit-feedback.test.tsx`
  - `packages/packages/core/editor-audits/src/components/__tests__/violation-row.test.tsx`
  - `packages/packages/core/editor-audits/src/utils/__tests__/scan-accessibility-widgets.test.ts`
  - `packages/packages/core/editor-audits/src/utils/scan-accessibility-widgets.ts`
- `packages/packages/core/editor-canvas` (2)
  - `packages/packages/core/editor-canvas/src/__tests__/settings-props-resolver.test.ts`
  - `packages/packages/core/editor-canvas/src/prevent-link-in-link-commands.ts`
- `packages/packages/core/editor-components` (5)
  - `packages/packages/core/editor-components/src/components/components-tab/components-list.tsx`
  - `packages/packages/core/editor-components/src/components/components-tab/components-pro-notification.tsx`
  - `packages/packages/core/editor-components/src/components/instance-editing-panel/instance-editing-panel.tsx`
  - `packages/packages/core/editor-components/src/create-component-type.ts`
  - `packages/packages/core/editor-components/src/sync/publish-draft-components-in-page-before-save.ts`
- `packages/packages/core/editor-design-system` (2)
  - `packages/packages/core/editor-design-system/src/import/__tests__/import-design-system-dialog.test.tsx`
  - `packages/packages/core/editor-design-system/src/import/import-design-system-dialog.tsx`
- `packages/packages/core/editor-editing-panel` (4)
  - `packages/packages/core/editor-editing-panel/src/components/__tests__/editing-panel-tabs.test.tsx`
  - `packages/packages/core/editor-editing-panel/src/components/content-only-infotip.tsx`
  - `packages/packages/core/editor-editing-panel/src/dynamics/components/__tests__/dynamic-selection.test.tsx`
  - `packages/packages/core/editor-editing-panel/src/dynamics/components/dynamic-selection.tsx`
- `packages/packages/core/editor-global-classes` (2)
  - `packages/packages/core/editor-global-classes/src/components/class-manager/class-manager-introduction.tsx`
  - `packages/packages/core/editor-global-classes/src/components/class-manager/start-sync-to-v3-modal.tsx`
- `packages/packages/core/editor-interactions` (5)
  - `packages/packages/core/editor-interactions/src/components/controls/easing.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/effect.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/repeat.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/replay.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/trigger.tsx`
- `packages/packages/core/editor-site-navigation` (1)
  - `packages/packages/core/editor-site-navigation/src/components/panel/posts-list/error-state.tsx`
- `packages/packages/core/editor-variables` (4)
  - `packages/packages/core/editor-variables/src/components/variables-manager/ui/variable-table-row.tsx`
  - `packages/packages/core/editor-variables/src/components/variables-manager/variables-manager-create-menu.tsx`
  - `packages/packages/core/editor-variables/src/components/variables-selection.tsx`
  - `packages/packages/core/editor-variables/src/register-variable-types.tsx`
- `packages/packages/core/editor-widget-creation` (1)
  - `packages/packages/core/editor-widget-creation/src/components/create-widget.tsx`
- `packages/packages/libs/editor-controls` (7)
  - `packages/packages/libs/editor-controls/src/components/restricted-link-infotip.tsx`
  - `packages/packages/libs/editor-controls/src/controls/__tests__/link-control.test.tsx`
  - `packages/packages/libs/editor-controls/src/controls/__tests__/notice-control.test.tsx`
  - `packages/packages/libs/editor-controls/src/controls/__tests__/url-control.test.tsx`
  - `packages/packages/libs/editor-controls/src/controls/icon-library/__tests__/icon-library-upload-action.test.tsx`
  - `packages/packages/libs/editor-controls/src/controls/icon-library/icon-library-upload-action.tsx`
  - `packages/packages/libs/editor-controls/src/controls/transition-control/transition-selector.tsx`

### B2. Connect / OAuth / cloud library / kit library / pro-install consumers

Pattern: `library_connect|is_user_connected|connect_url|my_elementor_url|elementorCommon\.config\.connect|config\.connect\b|cloud-library|cloud-kit|CloudLibrary|CloudKit|cloudKit|hasCloudLibraryQuota|cloudLibraryIsDeactivated|useConnectState|connect-state|ConnectState|kit-library|KitLibrary|pro-install|elementorProInstall|site-builder|SiteBuilder|elementorOneConnect`  
Files: 74

- `CONTRIBUTING.md` (1)
  - `CONTRIBUTING.md`
- `app/assets/js` (6)
  - `app/assets/js/event-track/apps-event-tracking.js`
  - `app/assets/js/hooks/use-cloud-kits-eligibility.js`
  - `app/assets/js/hooks/use-cloud-kits-quota.js`
  - `app/assets/js/index.js`
  - `app/assets/js/ui/molecules/button.js`
  - `app/assets/js/utils/cloud-kits.js`
- `app/assets/styles` (1)
  - `app/assets/styles/app-imports.scss`
- `app/modules/import-export-customization` (15)
  - `app/modules/import-export-customization/assets/js/export/components/export-kit-footer.js`
  - `app/modules/import-export-customization/assets/js/export/components/export-kit-parts-selection.js`
  - `app/modules/import-export-customization/assets/js/export/hooks/use-export-kit.js`
  - `app/modules/import-export-customization/assets/js/export/pages/export-complete.js`
  - `app/modules/import-export-customization/assets/js/export/pages/export-kit.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-complete.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-customization.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-kit.js`
  - `app/modules/import-export-customization/assets/js/shared/components/error/processing-error-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-content-customization-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-parts-selection.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-plugins-customization-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-settings-customization-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/layout/page-header.js`
  - `app/modules/import-export-customization/assets/js/shared/hooks/use-connect-state.js`
- `app/modules/import-export` (21)
  - `app/modules/import-export/assets/js/context/connect-state-context.js`
  - `app/modules/import-export/assets/js/export.js`
  - `app/modules/import-export/assets/js/hooks/use-connect-state.js`
  - `app/modules/import-export/assets/js/hooks/use-kit.js`
  - `app/modules/import-export/assets/js/pages/export/export-complete/export-complete.js`
  - `app/modules/import-export/assets/js/pages/export/export-plugins/components/export-plugins-footer/export-plugins-footer.js`
  - `app/modules/import-export/assets/js/pages/import/hooks/use-import-actions.js`
  - `app/modules/import-export/assets/js/pages/import/import-complete/components/import-complete-footer/import-complete-footer.js`
  - `app/modules/import-export/assets/js/pages/import/import-complete/import-complete.js`
  - `app/modules/import-export/assets/js/pages/import/import-content/import-content.js`
  - `app/modules/import-export/assets/js/pages/import/import-kit/hooks/use-import-kit-library-apply-all-plugins.js`
  - `app/modules/import-export/assets/js/pages/import/import-kit/import-kit.js`
  - `app/modules/import-export/assets/js/pages/import/import-plugins/import-plugins.js`
  - `app/modules/import-export/assets/js/pages/import/import-process/import-process.js`
  - `app/modules/import-export/assets/js/pages/import/import-resolver/components/conflict/conflict.js`
  - `app/modules/import-export/assets/js/pages/import/import-resolver/import-resolver.js`
  - `app/modules/import-export/assets/js/shared/info-modal/import-info-modal.js`
  - `app/modules/import-export/assets/js/shared/kit-content/kit-content.js`
  - `app/modules/import-export/assets/js/shared/kit-data/components/site-area/site-area.js`
  - `app/modules/import-export/assets/js/shared/process-failed-dialog/process-failed-dialog.js`
  - `app/modules/import-export/assets/js/templates/layout.js`
- `assets/dev/js` (13)
  - `assets/dev/js/editor/components/template-library/behaviors/insert-template.js`
  - `assets/dev/js/editor/components/template-library/component.js`
  - `assets/dev/js/editor/components/template-library/event-manager/index.js`
  - `assets/dev/js/editor/components/template-library/manager.js`
  - `assets/dev/js/editor/components/template-library/views/library-layout.js`
  - `assets/dev/js/editor/components/template-library/views/parts/cloud-states.js`
  - `assets/dev/js/editor/components/template-library/views/parts/connect.js`
  - `assets/dev/js/editor/components/template-library/views/parts/save-template-variant-b.js`
  - `assets/dev/js/editor/components/template-library/views/parts/save-template.js`
  - `assets/dev/js/editor/components/template-library/views/parts/templates.js`
  - `assets/dev/js/editor/components/template-library/views/template/base.js`
  - `assets/dev/js/editor/components/template-library/views/template/remote.js`
  - `assets/dev/js/editor/editor-base.js`
- `assets/dev/scss` (2)
  - `assets/dev/scss/admin/_global.scss`
  - `assets/dev/scss/editor/_templates-modal.scss`
- `modules/admin-top-bar/assets` (1)
  - `modules/admin-top-bar/assets/js/components/connection-button/connection-button.js`
- `packages/apps/onboarding/src` (6)
  - `packages/apps/onboarding/src/analytics/init-tracking.ts`
  - `packages/apps/onboarding/src/components/__tests__/app.test.tsx`
  - `packages/apps/onboarding/src/components/app-content.tsx`
  - `packages/apps/onboarding/src/hooks/use-check-pro-install-screen.ts`
  - `packages/apps/onboarding/src/steps/screens/pro-install.tsx`
  - `packages/apps/onboarding/src/types.ts`
- `packages/packages/core/editor-app-bar` (3)
  - `packages/packages/core/editor-app-bar/src/components/locations/send-feedback-popup-location.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/connect/hooks/use-connect-link-config.tsx`
  - `packages/packages/core/editor-app-bar/src/types.ts`
- `packages/packages/core/editor-audits` (2)
  - `packages/packages/core/editor-audits/src/components/__tests__/audit-feedback.test.tsx`
  - `packages/packages/core/editor-audits/src/components/audit-feedback.tsx`
- `packages/types/global.d.ts` (1)
  - `packages/types/global.d.ts`
- `scripts` (2)
  - `scripts/vite/plugins/dynamic-externals.mjs`
  - `scripts/vite/shared/verify-bundles.mjs`

### B3. Event tracking / Mixpanel / events manager

Pattern: `editor_events|eventsManager|EventsManager|editorEvents|events-manager|event-track|mixpanel|MIXPANEL|elementor/tracker|elementor_tracker|allow_tracking`  
Files: 113

- `app/assets/js` (2)
  - `app/assets/js/event-track/apps-event-tracking.js`
  - `app/assets/js/event-track/wp-dashboard-tracking.js`
- `app/modules/import-export-customization` (13)
  - `app/modules/import-export-customization/assets/js/admin.js`
  - `app/modules/import-export-customization/assets/js/export/components/export-kit-footer.js`
  - `app/modules/import-export-customization/assets/js/export/pages/export-complete.js`
  - `app/modules/import-export-customization/assets/js/export/pages/export-kit.js`
  - `app/modules/import-export-customization/assets/js/import/hooks/use-upload-kit.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-complete.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-customization.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-kit.js`
  - `app/modules/import-export-customization/assets/js/import/pages/import-process.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-content-customization-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-parts-selection.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-plugins-customization-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-settings-customization-dialog.js`
- `app/modules/import-export` (12)
  - `app/modules/import-export/assets/js/pages/import/import-complete/components/import-complete-footer/import-complete-footer.js`
  - `app/modules/import-export/assets/js/pages/import/import-complete/import-complete.js`
  - `app/modules/import-export/assets/js/pages/import/import-content/import-content.js`
  - `app/modules/import-export/assets/js/pages/import/import-kit/import-kit.js`
  - `app/modules/import-export/assets/js/pages/import/import-plugins/import-plugins.js`
  - `app/modules/import-export/assets/js/pages/import/import-process/import-process.js`
  - `app/modules/import-export/assets/js/pages/import/import-resolver/components/conflict/conflict.js`
  - `app/modules/import-export/assets/js/pages/import/import-resolver/import-resolver.js`
  - `app/modules/import-export/assets/js/shared/info-modal/import-info-modal.js`
  - `app/modules/import-export/assets/js/shared/kit-content/kit-content.js`
  - `app/modules/import-export/assets/js/shared/kit-data/components/site-area/site-area.js`
  - `app/modules/import-export/assets/js/templates/layout.js`
- `assets/dev/js` (20)
  - `assets/dev/js/admin/admin.js`
  - `assets/dev/js/editor/components/settings/editor-preferences/manager.js`
  - `assets/dev/js/editor/components/template-library/event-manager/index.js`
  - `assets/dev/js/editor/components/template-library/manager.js`
  - `assets/dev/js/editor/components/template-library/views/parts/cloud-states.js`
  - `assets/dev/js/editor/components/template-library/views/parts/connect.js`
  - `assets/dev/js/editor/components/template-library/views/parts/import.js`
  - `assets/dev/js/editor/components/template-library/views/parts/save-template.js`
  - `assets/dev/js/editor/components/template-library/views/parts/templates.js`
  - `assets/dev/js/editor/components/template-library/views/template/local.js`
  - `assets/dev/js/editor/document/elements/commands/delete.js`
  - `assets/dev/js/editor/editor-base.js`
  - `assets/dev/js/editor/elements/views/behaviors/context-menu.js`
  - `assets/dev/js/editor/regions/navigator/element.js`
  - `assets/dev/js/editor/regions/panel/pages/elements/component.js`
  - `assets/dev/js/editor/regions/panel/pages/elements/views/category.js`
  - `assets/dev/js/editor/regions/panel/pages/elements/views/element.js`
  - `assets/dev/js/editor/utils/context-menu.js`
  - `assets/dev/js/editor/utils/editor-one-events.js`
  - `assets/dev/js/editor/views/base-container.js`
- `core/common/assets` (1)
  - `core/common/assets/js/common.js`
- `modules/checklist/assets` (7)
  - `modules/checklist/assets/js/app/components/checklist-card-content.js`
  - `modules/checklist/assets/js/app/components/checklist-item.js`
  - `modules/checklist/assets/js/app/components/header.js`
  - `modules/checklist/assets/js/app/components/success-message.js`
  - `modules/checklist/assets/js/editor-app-bar-link.js`
  - `modules/checklist/assets/js/utils/consts.js`
  - `modules/checklist/assets/js/utils/functions.js`
- `packages/apps/onboarding/src` (2)
  - `packages/apps/onboarding/src/analytics/onboarding-tracking.ts`
  - `packages/apps/onboarding/src/components/app-content.tsx`
- `packages/packages/core/editor-app-bar` (26)
  - `packages/packages/core/editor-app-bar/CHANGELOG.md`
  - `packages/packages/core/editor-app-bar/src/components/locations/main-menu-location.tsx`
  - `packages/packages/core/editor-app-bar/src/components/locations/send-feedback-popup-location.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/angie/components/__tests__/angie-guide-location.test.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/angie/components/angie-guide-location.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/connect/hooks/use-connect-link-config.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/documents-preview/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/documents-save/components/primary-action.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/documents-save/hooks/use-document-copy-and-share-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/documents-save/hooks/use-document-save-draft-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/documents-save/hooks/use-document-save-template-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/documents-save/hooks/use-document-view-page-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/documents-settings/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/elements/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/finder/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/help/hooks/__tests__/use-action-props.test.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/help/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/history/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/keyboard-shortcuts/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/responsive/components/breakpoints-switcher.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/site-settings/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/structure/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/theme-builder/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/user-preferences/hooks/use-action-props.ts`
  - `packages/packages/core/editor-app-bar/src/extensions/wordpress/index.ts`
  - `packages/packages/core/editor-app-bar/src/types.ts`
- `packages/packages/core/editor-audits` (2)
  - `packages/packages/core/editor-audits/src/components/__tests__/audit-feedback.test.tsx`
  - `packages/packages/core/editor-audits/src/components/audit-feedback.tsx`
- `packages/packages/core/editor-components` (6)
  - `packages/packages/core/editor-components/src/__tests__/create-component-type.test.ts`
  - `packages/packages/core/editor-components/src/components/instance-editing-panel/__tests__/instance-editing-panel.test.tsx`
  - `packages/packages/core/editor-components/src/components/instance-editing-panel/detach-action.tsx`
  - `packages/packages/core/editor-components/src/create-component-type.ts`
  - `packages/packages/core/editor-components/src/types.ts`
  - `packages/packages/core/editor-components/src/utils/tracking.ts`
- `packages/packages/core/editor-default-styles` (2)
  - `packages/packages/core/editor-default-styles/src/utils/__tests__/tracking.test.ts`
  - `packages/packages/core/editor-default-styles/src/utils/tracking.ts`
- `packages/packages/core/editor-design-system` (1)
  - `packages/packages/core/editor-design-system/src/import/tracking.ts`
- `packages/packages/core/editor-global-classes` (1)
  - `packages/packages/core/editor-global-classes/src/utils/tracking.ts`
- `packages/packages/core/editor-interactions` (1)
  - `packages/packages/core/editor-interactions/src/utils/tracking.ts`
- `packages/packages/core/editor-site-navigation` (6)
  - `packages/packages/core/editor-site-navigation/CHANGELOG.md`
  - `packages/packages/core/editor-site-navigation/src/components/top-bar/create-post-list-item.tsx`
  - `packages/packages/core/editor-site-navigation/src/components/top-bar/post-list-item.tsx`
  - `packages/packages/core/editor-site-navigation/src/components/top-bar/recently-edited.tsx`
  - `packages/packages/core/editor-site-navigation/src/hooks/use-toggle-button-props.ts`
  - `packages/packages/core/editor-site-navigation/src/types.ts`
- `packages/packages/core/editor-variables` (2)
  - `packages/packages/core/editor-variables/src/utils/__tests__/tracking.test.ts`
  - `packages/packages/core/editor-variables/src/utils/tracking.ts`
- `packages/packages/libs/editor-controls` (3)
  - `packages/packages/libs/editor-controls/src/controls/transition-control/__tests__/transition-events.test.ts`
  - `packages/packages/libs/editor-controls/src/controls/transition-control/trainsition-events.ts`
  - `packages/packages/libs/editor-controls/src/utils/tracking.ts`
- `packages/packages/libs/editor-responsive` (1)
  - `packages/packages/libs/editor-responsive/CHANGELOG.md`
- `packages/packages/libs/elementor-mcp-common` (1)
  - `packages/packages/libs/elementor-mcp-common/src/types.ts`
- `packages/packages/libs/events` (2)
  - `packages/packages/libs/events/src/index.ts`
  - `packages/packages/libs/events/src/use-mixpanel.ts`
- `packages/types/global.d.ts` (1)
  - `packages/types/global.d.ts`
- `scripts` (1)
  - `scripts/vite/README.md`

### B4. Upsell / promotion keys, nerd-boxes, help URLs previously localized from PHP

Pattern: `upsale_data|elementPromotionURL|dynamicPromotionURL|goProURL|promotionWidgets|integrationWidgets|\bpromotions?\.|upgradeUrl|upgradeText|upgrade_url|promotionLink|promotionText|elementor-nerd-box--upsale|\bgo-pro\b|goPro|dynamic-tags-promo|needHelpUrl|help_the_content_url|help_flexbox_bc_url|help_preview|docs_elementor_site|elementor_site\b|panel-get-pro|get-pro-sticky|sticky-promotion|library-sync|upgrade-plan-button`  
Files: 89

- `app/assets/js` (4)
  - `app/assets/js/event-track/dashboard/action-controls.js`
  - `app/assets/js/event-track/dashboard/promotion.js`
  - `app/assets/js/molecules/go-pro-button.js`
  - `app/assets/js/package.js`
- `app/assets/styles` (1)
  - `app/assets/styles/app-imports.scss`
- `app/modules/import-export-customization` (2)
  - `app/modules/import-export-customization/assets/js/shared/components/error/processing-error-dialog.js`
  - `app/modules/import-export-customization/assets/js/shared/components/kit-parts-selection.js`
- `app/modules/import-export` (3)
  - `app/modules/import-export/assets/js/pages/export/export-complete/export-complete.js`
  - `app/modules/import-export/assets/js/pages/import/import-plugins/components/pro-banner/pro-banner.js`
  - `app/modules/import-export/assets/js/shared/kit-content/kit-content.js`
- `assets/dev/js` (18)
  - `assets/dev/js/admin/admin.js`
  - `assets/dev/js/editor/components/dynamic-tags/control-behavior.js`
  - `assets/dev/js/editor/components/icons-manager/components/icon-manager.js`
  - `assets/dev/js/editor/components/icons-manager/components/icons-go-pro.js`
  - `assets/dev/js/editor/components/icons-manager/icons-manager.js`
  - `assets/dev/js/editor/components/template-library/constants.js`
  - `assets/dev/js/editor/components/template-library/views/library-layout.js`
  - `assets/dev/js/editor/components/template-library/views/parts/cloud-states.js`
  - `assets/dev/js/editor/components/template-library/views/parts/save-template.js`
  - `assets/dev/js/editor/controls/gallery.js`
  - `assets/dev/js/editor/controls/media.js`
  - `assets/dev/js/editor/editor-base.js`
  - `assets/dev/js/editor/elements/views/widget.js`
  - `assets/dev/js/editor/regions/panel/layout.js`
  - `assets/dev/js/editor/regions/panel/pages/elements/elements.js`
  - `assets/dev/js/editor/regions/panel/pages/elements/views/category.js`
  - `assets/dev/js/editor/utils/context-menu.js`
  - `assets/dev/js/editor/utils/promotion.js`
- `assets/dev/scss` (5)
  - `assets/dev/scss/admin/_global.scss`
  - `assets/dev/scss/admin/_promotion.scss`
  - `assets/dev/scss/admin/_role-manager.scss`
  - `assets/dev/scss/editor/panel/panel.scss`
  - `assets/dev/scss/helpers/mixins.scss`
- `modules/admin-top-bar/assets` (1)
  - `modules/admin-top-bar/assets/js/admin-top-bar.js`
- `modules/editor-one/assets` (3)
  - `modules/editor-one/assets/js/sidebar-navigation/components/cta/sidebar-upgrade-cta.js`
  - `modules/editor-one/assets/js/sidebar-navigation/components/cta/styled-components.js`
  - `modules/editor-one/assets/js/sidebar-navigation/components/sidebar-navigation.js`
- `modules/element-manager/assets` (5)
  - `modules/element-manager/assets/js/app-editor-one/App.js`
  - `modules/element-manager/assets/js/app-editor-one/components/PromotionWidgetsTable.js`
  - `modules/element-manager/assets/js/app-editor-one/components/WidgetsTable.js`
  - `modules/element-manager/assets/js/app-editor-one/components/index.js`
  - `modules/element-manager/assets/js/app-editor-one/hooks/useElementManager.js`
- `packages/apps/onboarding/src` (10)
  - `packages/apps/onboarding/src/__tests__/test-utils.tsx`
  - `packages/apps/onboarding/src/components/__tests__/app.test.tsx`
  - `packages/apps/onboarding/src/components/app-content.tsx`
  - `packages/apps/onboarding/src/components/ui/elementor-logo.tsx`
  - `packages/apps/onboarding/src/components/ui/footer-actions.tsx`
  - `packages/apps/onboarding/src/components/ui/selection-badge.tsx`
  - `packages/apps/onboarding/src/components/ui/top-bar-content.tsx`
  - `packages/apps/onboarding/src/steps/components/site-features/pro-plan-notice.tsx`
  - `packages/apps/onboarding/src/store/slice.ts`
  - `packages/apps/onboarding/src/types.ts`
- `packages/packages/core/editor-app-bar` (3)
  - `packages/packages/core/editor-app-bar/src/components/locations/main-menu-location.tsx`
  - `packages/packages/core/editor-app-bar/src/components/ui/toolbar-logo.tsx`
  - `packages/packages/core/editor-app-bar/src/extensions/angie/angie-consts.ts`
- `packages/packages/core/editor-audits` (1)
  - `packages/packages/core/editor-audits/src/components/promotions.tsx`
- `packages/packages/core/editor-components` (8)
  - `packages/packages/core/editor-components/src/__tests__/create-component-type.test.ts`
  - `packages/packages/core/editor-components/src/components/components-tab/__tests__/components-pro-notification.test.tsx`
  - `packages/packages/core/editor-components/src/components/components-tab/components-list.tsx`
  - `packages/packages/core/editor-components/src/components/components-tab/components-pro-notification.tsx`
  - `packages/packages/core/editor-components/src/components/components-upgrade-alert.tsx`
  - `packages/packages/core/editor-components/src/components/instance-editing-panel/instance-editing-panel.tsx`
  - `packages/packages/core/editor-components/src/create-component-type.ts`
  - `packages/packages/core/editor-components/src/sync/publish-draft-components-in-page-before-save.ts`
- `packages/packages/core/editor-editing-panel` (4)
  - `packages/packages/core/editor-editing-panel/src/components/editing-panel-sticky-promotion.tsx`
  - `packages/packages/core/editor-editing-panel/src/components/editing-panel.tsx`
  - `packages/packages/core/editor-editing-panel/src/dynamics/components/__tests__/dynamic-selection.test.tsx`
  - `packages/packages/core/editor-editing-panel/src/dynamics/components/dynamic-selection.tsx`
- `packages/packages/core/editor-interactions` (8)
  - `packages/packages/core/editor-interactions/src/components/controls/easing.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/effect.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/repeat.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/replay.tsx`
  - `packages/packages/core/editor-interactions/src/components/controls/trigger.tsx`
  - `packages/packages/core/editor-interactions/src/ui/__tests__/interactions-promotion-chip.test.tsx`
  - `packages/packages/core/editor-interactions/src/ui/interactions-promotion-chip.tsx`
  - `packages/packages/core/editor-interactions/src/ui/promotion-select.tsx`
- `packages/packages/core/editor-variables` (6)
  - `packages/packages/core/editor-variables/src/components/ui/__tests__/variable-promotion-chip.test.tsx`
  - `packages/packages/core/editor-variables/src/components/ui/variable-promotion-chip.tsx`
  - `packages/packages/core/editor-variables/src/components/variables-manager/ui/variable-table-row.tsx`
  - `packages/packages/core/editor-variables/src/components/variables-manager/variables-manager-create-menu.tsx`
  - `packages/packages/core/editor-variables/src/components/variables-selection.tsx`
  - `packages/packages/core/editor-variables/src/register-variable-types.tsx`
- `packages/packages/libs/editor-controls` (5)
  - `packages/packages/libs/editor-controls/src/components/promotions/promotion-trigger.tsx`
  - `packages/packages/libs/editor-controls/src/controls/icon-library/__tests__/icon-library-upload-action.test.tsx`
  - `packages/packages/libs/editor-controls/src/controls/icon-library/icon-library-upload-action.tsx`
  - `packages/packages/libs/editor-controls/src/controls/image-optimize-trigger.tsx`
  - `packages/packages/libs/editor-controls/src/controls/transition-control/transition-selector.tsx`
- `packages/packages/libs/editor-ui` (1)
  - `packages/packages/libs/editor-ui/src/components/promotions/promotion-alert.tsx`
- `packages/types/global.d.ts` (1)
  - `packages/types/global.d.ts`

### B5. Remote template library / cloud source / sync / screenshots / quota

Pattern: `isRemote|templates/source/is-remote|remoteLibrary|allow_closing_remote_library|get_library_data|save_template_screenshot|template_screenshot_failed|get_templates_quota|elementor_reset_library|header-sync|template-library-template-remote|template-library-connect|save-template-variant-b|canSaveToCloud|QuotaProgress|quota-progress|cloud-empty`  
Files: 19

- `assets/dev/js` (16)
  - `assets/dev/js/admin/admin.js`
  - `assets/dev/js/editor/components/template-library/behaviors/insert-template.js`
  - `assets/dev/js/editor/components/template-library/component.js`
  - `assets/dev/js/editor/components/template-library/manager.js`
  - `assets/dev/js/editor/components/template-library/views/library-layout.js`
  - `assets/dev/js/editor/components/template-library/views/parts/cloud-states.js`
  - `assets/dev/js/editor/components/template-library/views/parts/connect.js`
  - `assets/dev/js/editor/components/template-library/views/parts/header-parts/actions.js`
  - `assets/dev/js/editor/components/template-library/views/parts/save-template-variant-b.js`
  - `assets/dev/js/editor/components/template-library/views/parts/save-template.js`
  - `assets/dev/js/editor/components/template-library/views/parts/templates-empty.js`
  - `assets/dev/js/editor/components/template-library/views/parts/templates.js`
  - `assets/dev/js/editor/components/template-library/views/template/remote.js`
  - `assets/dev/js/editor/elements/models/element.js`
  - `assets/dev/js/editor/elements/views/behaviors/inline-editing.js`
  - `assets/dev/js/editor/elements/views/widget.js`
- `assets/dev/scss` (1)
  - `assets/dev/scss/editor/_templates-modal.scss`
- `assets/lib/eicons` (1)
  - `assets/lib/eicons/css/elementor-icons.css`
- `modules/floating-buttons/assets` (1)
  - `modules/floating-buttons/assets/scss/floating-buttons/template/floating-buttons-template.scss`

### B6. Removed admin / script handles / localized admin keys (beta tester, AI admin, onboarding, announcements, home screen, apps, hints campaigns)

Pattern: `beta_tester|beta-tester|BetaTester|elementor-ai-admin|ai-admin|elementor-v2-onboarding|e-home-screen|home-screen|homescreen|elementorAdminHints|image_optimization_campaign|ally_campaign|ea11y_campaign|media-hints|admin_apps_url|apps_url|elementor-apps|announcements-app|e-announcements|whats-new|WhatsNew|elementor_core_ally_campaign`  
Files: 12

- `assets/dev/js` (8)
  - `assets/dev/js/admin/admin.js`
  - `assets/dev/js/admin/beta-tester/beta-tester.js`
  - `assets/dev/js/admin/beta-tester/layout.js`
  - `assets/dev/js/admin/beta-tester/view.js`
  - `assets/dev/js/admin/hints/media.js`
  - `assets/dev/js/editor/controls/gallery.js`
  - `assets/dev/js/editor/controls/media.js`
  - `assets/dev/js/editor/regions/panel/pages/menu/menu.js`
- `assets/dev/scss` (2)
  - `assets/dev/scss/admin/_beta-tester.scss`
  - `assets/dev/scss/admin/admin.scss`
- `modules/admin-top-bar/assets` (1)
  - `modules/admin-top-bar/assets/js/admin-top-bar.js`
- `scripts` (1)
  - `scripts/vite/shared/entries.mjs`

### B7. Removed theme-builder / site-editor / onboarding app routes and kit tabs

Pattern: `site-editor|#/kit-library|theme_builder_url|settings-page-transitions|settings-custom-css|custom_css_pro|page_transitions_teaser|custom_attributes_pro|display_conditions_pro|scrolling_effects_pro|mouse_effects_pro|sticky_pro|motion_effects_promotion_divider|e-control-display-conditions-promotion|e-control-motion-effects-promotion`  
Files: 13

- `CONTRIBUTING.md` (1)
  - `CONTRIBUTING.md`
- `app/assets/js` (2)
  - `app/assets/js/app-packages.js`
  - `app/assets/js/index.js`
- `app/assets/styles` (1)
  - `app/assets/styles/app-imports.scss`
- `app/modules/import-export-customization` (1)
  - `app/modules/import-export-customization/assets/js/export/pages/export-complete.js`
- `app/modules/import-export` (3)
  - `app/modules/import-export/assets/js/pages/export/export-plugins/components/export-plugins-footer/export-plugins-footer.js`
  - `app/modules/import-export/assets/js/shared/kit-data/kit-data.js`
  - `app/modules/import-export/assets/js/templates/layout.js`
- `assets/dev/scss` (2)
  - `assets/dev/scss/common/common.scss`
  - `assets/dev/scss/editor/panel/_controls.scss`
- `core/kits/assets` (1)
  - `core/kits/assets/js/manager.js`
- `modules/editor-one/assets` (1)
  - `modules/editor-one/assets/scss/_common.scss`
- `scripts` (1)
  - `scripts/vite/shared/externals.mjs`

