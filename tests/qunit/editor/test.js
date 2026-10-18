import EditorBase from 'refraction-editor/editor-base';
import config from './config';
import frontend from './frontend';
import ContainerHelper from 'refraction/tests/qunit/tests/assets/dev/js/editor/container/helper';

export default class EditorTest extends EditorBase {
	constructor( options ) {
		super( options );

		QUnit.testStart( ( { module, name } ) => {
			const $element = refraction.documents.getCurrent().$element;

			if ( $element ) {
				$element.empty();
			}

			if ( QUnit.config.showUI ) {
				// eslint-disable-next-line no-console
				console.log( `Test: ${ module } -> ${ name }` );
			}
		} );

		QUnit.testDone( ( { module, name } ) => {
			if ( QUnit.config.showUI ) {
				// eslint-disable-next-line no-console
				console.log( `Done: ${ module } -> ${ name }` );
			}

			if ( QUnit.config.validateContainersAlive ) {
				if ( ! ContainerHelper.isAllAliveRecursive( refraction.getPreviewContainer() ) ) {
					// eslint-disable-next-line no-console
					console.error( `Not all the containers alive: ${ module } -> ${ name }` );
				}
			}
		} );
	}

	getConfig() {
		return config;
	}

	onPreviewLoaded() {
		this.$preview[ 0 ].contentWindow.refractionFrontend = frontend;

		this.$previewContents = this.$preview.contents();
		this.$previewContents.find( 'body' ).append( '<div class="refraction refraction-1"></div>' );

		super.onPreviewLoaded();
	}

	onFirstPreviewLoaded() {
		this.initPanel();

		this.previewLoadedOnce = true;
	}

	enqueueTypographyFonts() {
		// Do nothing, bypass parent function.
	}
}
