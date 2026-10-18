/**
 * The source alias map, retained at this path after the Grunt and Webpack removal because two
 * consumers still resolve it by literal path: `tests/jest/jest.config.js` and Refraction Pro's Vite
 * build (`scripts/vite/shared/paths.mjs`). It moves under `scripts/vite/shared/` once Pro is updated.
 *
 * The `resolve.alias` shape is part of that contract and is why it survives rather than the flat map
 * it would otherwise be.
 */
const path = require( 'path' );

module.exports = {
	resolve: {
		alias: {
			'refraction': path.resolve( __dirname, '../' ),
			'refraction-app': path.resolve( __dirname, '../app/assets/js' ),
			'refraction-admin': path.resolve( __dirname, '../assets/dev/js/admin' ),
			'refraction-api': path.resolve( __dirname, '../modules/web-cli/assets/js/' ),
			'refraction-assets-js': path.resolve( __dirname, '../assets/dev/js' ),
			'refraction-behaviors': path.resolve( __dirname, '../assets/dev/js/editor/elements/views/behaviors' ),
			'refraction-common': path.resolve( __dirname, '../core/common/assets/js' ),
			'refraction-common-modules': path.resolve( __dirname, '../core/common/modules' ),
			'refraction-controls': path.resolve( __dirname, '../assets/dev/js/editor/controls' ),
			'refraction-document': path.resolve( __dirname, '../assets/dev/js/editor/document' ),
			'refraction-dynamic-tags': path.resolve( __dirname, '../assets/dev/js/editor/components/dynamic-tags' ),
			'refraction-editor': path.resolve( __dirname, '../assets/dev/js/editor' ),
			'refraction-editor-utils': path.resolve( __dirname, '../assets/dev/js/editor/utils' ),
			'refraction-elements': path.resolve( __dirname, '../assets/dev/js/editor/elements' ),
			'refraction-frontend': path.resolve( __dirname, '../assets/dev/js/frontend' ),
			'refraction-panel': path.resolve( __dirname, '../assets/dev/js/editor/regions/panel' ),
			'refraction-regions': path.resolve( __dirname, '../assets/dev/js/editor/regions' ),
			'refraction-revisions': path.resolve( __dirname, '../assets/dev/js/editor/components/revisions' ),
			'refraction-scss': path.resolve( __dirname, '../assets/dev/scss' ),
			'refraction-templates': path.resolve( __dirname, '../assets/dev/js/editor/components/template-library' ),
			'refraction-utils': path.resolve( __dirname, '../assets/dev/js/utils' ),
			'refraction-validator': path.resolve( __dirname, '../assets/dev/js/editor/components/validator' ),
			'refraction-views': path.resolve( __dirname, '../assets/dev/js/editor/views' ),
			'@refraction/e-icons': path.resolve( __dirname, '../assets/dev/js/frontend/utils/icons/e-icons' ),
			'e-styles': path.resolve( __dirname, '../packages/refraction-ui/styles' ),
			'e-components': path.resolve( __dirname, '../packages/refraction-ui/components' ),
			'e-utils': path.resolve( __dirname, '../packages/refraction-ui/components/utils' ),
			'refraction-frontend-utils': path.resolve( __dirname, '../assets/dev/js/frontend/utils' ),
			'refraction-modules': path.resolve( __dirname, '../modules' ),
		},
	},
};
