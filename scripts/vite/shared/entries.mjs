import { resolveFromRoot } from './paths.mjs';

export const PRODUCTION_SUFFIX = '.min';

/**
 * Entries of the `base` bundle: editor, admin, app and module specific scripts.
 *
 * `editor` intentionally lists three sources; they are concatenated into a single bundle in
 * declaration order, which the jQuery plugins it opens with depend on.
 */
export const BASE_ENTRIES = {
	editor: [
		'assets/dev/js/editor/utils/jquery-serialize-object.js',
		'assets/dev/js/editor/utils/jquery-html5-dnd.js',
		'assets/dev/js/editor/editor.js',
	],
	admin: 'assets/dev/js/admin/admin.js',
	'admin-feedback': 'assets/dev/js/admin/admin-feedback.js',
	common: 'core/common/assets/js/common.js',
	'vendors-redux': 'core/common/assets/js/vendors-redux.js',
	'dev-tools': 'modules/dev-tools/assets/js/index.js',
	'refraction-admin-bar': 'modules/admin-bar/assets/js/frontend/module.js',
	gutenberg: 'assets/dev/js/admin/gutenberg.js',
	'new-template': 'assets/dev/js/admin/new-template/new-template.js',
	app: 'app/assets/js/index.js',
	'app-loader': 'app/assets/js/app-loader',
	'app-packages': 'app/assets/js/app-packages',
	'beta-tester': 'assets/dev/js/admin/beta-tester/beta-tester.js',
	'common-modules': 'core/common/assets/js/modules',
	'editor-modules': 'assets/dev/js/editor/modules.js',
	'admin-modules': 'assets/dev/js/admin/modules.js',
	'editor-document': 'assets/dev/js/editor/editor-document.js',
	'admin-top-bar': 'modules/admin-top-bar/assets/js/admin.js',
	checklist: 'modules/checklist/assets/js/editor.js',
	'nested-elements': 'modules/nested-elements/assets/js/editor/index.js',
	'nested-tabs': 'modules/nested-tabs/assets/js/editor/index.js',
	'nested-accordion': 'modules/nested-accordion/assets/js/editor/index.js',
	'container-converter': 'modules/container-converter/assets/js/editor/module.js',
	'web-cli': 'modules/web-cli/assets/js/index.js',
	'import-export-admin': 'app/modules/import-export/assets/js/admin.js',
	'import-export-customization-admin': 'app/modules/import-export-customization/assets/js/admin.js',
	'editor-one-admin': 'modules/editor-one/assets/js/admin.js',
	'kit-elements-defaults-editor': 'modules/kit-elements-defaults/assets/js/editor/index.js',
	'editor-loader': 'core/editor/loader/js/editor-loader.js',
	'editor-environment': 'core/editor/loader/js/editor-environment.js',
	'responsive-bar': 'assets/dev/js/editor/regions/responsive-bar/index.js',
	'element-manager-admin': 'modules/element-manager/assets/js/admin.js',
	'media-hints': 'assets/dev/js/admin/hints/media.js',
	styleguide: 'modules/styleguide/assets/js/styleguide.js',
	'styleguide-app-initiator': 'modules/styleguide/assets/js/styleguide-app-initiator.js',
	'editor-one-sidebar-navigation': 'modules/editor-one/assets/js/sidebar-navigation/app.js',
	'editor-one-top-bar': 'modules/editor-one/assets/js/top-bar/app.js',
	'editor-one-menu': 'modules/editor-one/assets/js/admin-menu/app.js',
	'e-wc-product-editor': 'modules/wc-product-editor/assets/js/e-wc-product-editor.js',
	'floating-elements-modal': 'assets/dev/js/admin/floating-elements/new-floating-elements.js',
	'assets-manager': 'modules/assets-manager/assets/js/assets-manager.js',
	'theme-builder-editor': 'modules/theme-builder/assets/js/index.js',
	'loop-builder-editor': 'modules/loop-builder/assets/js/editor.js',
	'loop-builder-frontend': 'modules/loop-builder/assets/js/frontend.js',
	'forms-frontend': 'modules/forms/assets/js/frontend.js',
	'motion-effects-frontend': 'modules/motion-effects/assets/js/motion.js',
	'sticky-frontend': 'modules/motion-effects/assets/js/sticky.js',
	'agents-ready': 'modules/agents/assets/js/admin/agents-ready.js',
};

/**
 * Entries of the `frontend` bundle. Built separately from `base` so that the two groups
 * cannot collide, matching the distinct Webpack `uniqueName` values they used to carry.
 */
export const FRONTEND_ENTRIES = {
	'frontend-modules': 'assets/dev/js/frontend/modules.js',
	frontend: 'assets/dev/js/frontend/frontend.js',
};

export const QUNIT_ENTRIES = {
	'vendors-redux': BASE_ENTRIES[ 'vendors-redux' ],
	'dev-tools': BASE_ENTRIES[ 'dev-tools' ],
	'common-modules': BASE_ENTRIES[ 'common-modules' ],
	'web-cli': BASE_ENTRIES[ 'web-cli' ],
	common: BASE_ENTRIES.common,
	'editor-modules': BASE_ENTRIES[ 'editor-modules' ],
	'editor-document': BASE_ENTRIES[ 'editor-document' ],
	'qunit-tests': 'tests/qunit/main.js',
};

export function toEntrySources( entry ) {
	return ( Array.isArray( entry ) ? entry : [ entry ] ).map( ( source ) => resolveFromRoot( source ) );
}

export function withProductionSuffix( entryName ) {
	return `${ entryName }${ PRODUCTION_SUFFIX }`;
}
