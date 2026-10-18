import tests from '../tests';

export default class EditorBootstrap {
	constructor() {
		jQuery( this.initialize.bind( this ) );
	}

	initialize() {
		this.initializeTestUtils();

		const EditorTest = require( './test' ).default,
			ajax = require( '../mock/ajax' ),
			eData = require( '../mock/e-data' ),
			$body = jQuery( 'body' ).append( '<div id="refraction-test"></div>' ),
			$refractionTest = $body.find( '#refraction-test' );

		// Load the template to `#refraction-test`.
		$refractionTest.append( window.__html__[ 'tests/qunit/index.html' ] );

		window.refraction = new EditorTest();

		// Mock document for `initDocument`;
		const request = {
				unique_id: `document-1`,
				data: { id: 1 },
			},
			cacheKey = refractionCommon.ajax.getCacheKey( request );
		refractionCommon.ajax.cache[ cacheKey ] = refraction.getConfig().document;

		ajax.silence();
		eData.emptyFetch();

		refraction.on( 'preview:loaded', () => {
			// Disable UI Hooks.
			$e.hooks.ui.deactivate();

			this.runTests();
		} );

		refraction.start();

		this.bypassRemoteBehaviour();

		refraction.$preview.trigger( 'load' );
	}

	/**
	 * Function initializeTestUtils().
	 * Since JS API catch errors that occurs while running commands, the tests should expect it.
	 * Using this function, it can catch the errors and report them to QUnit.
	 */
	initializeTestUtils() {
		const exceptCatchApply = [];
		const catchApplyOrig = $e.commands.catchApply;

		if ( ! $e.tests ) {
			$e.tests = {};
		}

		// Use `$e.tests.commands.exceptCatchApply()` to except the catch errors.
		$e.tests.commands = {
			exceptCatchApply: ( callback, count = 1 ) => {
				for ( let i = 0; i < count; ++i ) {
					exceptCatchApply.push( ( e, instance ) => callback( e, instance ) );
				}
			},
		};

		// Override `$e.commands.catchApply()` to catch the errors that are excepted.
		$e.commands.catchApply = ( e, instance ) => {
			catchApplyOrig( e, instance );

			if ( exceptCatchApply.length ) {
				exceptCatchApply.pop()( e, instance );
			} else {
				throw new Error( e );
			}
		};
	}

	bypassRemoteBehaviour() {
		refraction.modules.elements.models.Element.prototype.renderRemoteServer = () => {};
		refraction.helpers.fetchFa4ToFa5Mapping.prototype = () => {};
	}

	runTests() {
		return tests();
	}
}
