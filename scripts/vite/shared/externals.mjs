import { resolveFromRoot } from './paths.mjs';

/**
 * Modules that are never bundled; they resolve to a global at runtime instead.
 */
export const BASE_EXTERNALS = {
	'@wordpress/i18n': 'wp.i18n',
	react: 'React',
	'react-dom': 'ReactDOM',
	'@refraction/app-ui': 'refractionAppPackages.appUi',
	'@refraction/components': 'refractionAppPackages.components',
	'@refraction/hooks': 'refractionAppPackages.hooks',
	'@refraction/router': 'refractionAppPackages.router',
	'@elementor/ui': 'refractionV2.ui',
	'@elementor/icons': 'refractionV2.icons',
	'@refraction/editor-app-bar': 'refractionV2.editorAppBar',
	'@refraction/editor-v1-adapters': 'refractionV2.editorV1Adapters',
	'@refraction/frontend-handlers': 'refractionV2.frontendHandlers',
	'@refraction/alpinejs': 'refractionV2.alpinejs',
	'@refraction/query': 'refractionV2.query',
	'@refraction/onboarding': 'refractionV2.onboarding',
	'@refraction/v4-activation-modal': "refractionV2['v4-activation-modal']",
	'@refraction/editor-modal-shell': "refractionV2['editor-modal-shell']",
	'@wordpress/dom-ready': 'wp.domReady',
	'@wordpress/components': 'wp.components',
	'@wordpress/core-data': 'wp.coreData',
	'@wordpress/data': 'wp.data',
	'@wordpress/plugins': 'wp.plugins',
	'@wordpress/api-fetch': 'wp.apiFetch',
	'@woocommerce/admin-layout': 'wc.adminLayout',
	'@reduxjs/toolkit': 'refractionVendors.reduxToolkit',
};

const SUBPATH_EXTERNAL_PATTERN = /^@elementor\/(ui|icons)\/(.+)$/;

/**
 * Requests that a given bundle publishes itself, and so must stay bundled within it.
 *
 * Externals are passed as IIFE arguments and therefore read before the bundle body runs. A bundle
 * that consumes its own global reads it while it is still undefined: `app-packages` was called as
 * `(React, wp.i18n, refractionAppPackages.router)` and threw before reaching the assignment on its
 * own first line, taking the whole App down with it. Webpack tolerated the cycle because its
 * externals were dereferenced lazily on first require.
 *
 * Resolving these to source is equivalent rather than a workaround, because in both cases the source
 * module is the same object as the global: `app/assets/js/router.js` exports the singleton it assigns
 * to `refractionAppPackages.router`, and `vendors-redux` is what publishes the Redux Toolkit global.
 */
const SELF_PUBLISHED_REQUESTS = {
	'app-packages': [ '@refraction/router' ],
	'vendors-redux': [ '@reduxjs/toolkit' ],
};

/**
 * Where a self-published request resolves once it is no longer external. Inert in every other bundle,
 * since a request that stays external is never resolved.
 */
export const SELF_PUBLISHED_ALIASES = {
	'@refraction/router': resolveFromRoot( 'app/assets/js/router.js' ),
};

function resolveSubpathExternal( request ) {
	const matches = request.match( SUBPATH_EXTERNAL_PATTERN );

	return matches ? `refractionV2.${ matches[ 1 ] }['${ matches[ 2 ] }']` : null;
}

export function resolveGlobal( request, bundleName ) {
	if ( SELF_PUBLISHED_REQUESTS[ bundleName ]?.includes( request ) ) {
		return null;
	}

	return BASE_EXTERNALS[ request ] ?? resolveSubpathExternal( request );
}

export function isExternal( request, bundleName ) {
	return null !== resolveGlobal( request, bundleName );
}
