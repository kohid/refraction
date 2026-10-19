import Document from '../../document';
import Heartbeat from 'refraction-editor-utils/heartbeat';

export class Load extends $e.modules.CommandInternalBase {
	validateArgs( args = {} ) {
		this.requireArgument( 'config', args );
	}

	apply( args ) {
		const { config, setAsInitial = false, shouldScroll = true, shouldNavigateToDefaultRoute = true } = args;

		if ( refractionCommon.config.experimentalFeatures.additional_custom_breakpoints ) {
			// When the Responsive Optimization experiment is active, the responsive controls are generated on the
			// JS side instead of the PHP.
			config.settings.controls = refraction.generateResponsiveControls( config.settings.controls );
		}

		refraction.config.document = config;

		refraction.setAjax();

		refraction.addWidgetsCache( config.widgets );

		refraction.templates.init();

		const document = new Document( config );

		refraction.documents.add( document );

		// Must set current before create a container.
		refraction.documents.setCurrent( document );

		if ( setAsInitial ) {
			refraction.documents.setInitialById( document.id );
		}

		refraction.settings.page = new refraction.settings.modules.page( config.settings );

		document.container = refraction.settings.page.getEditedView().getContainer();

		// Reference container back to document.
		document.container.document = document;

		refraction.heartbeat = new Heartbeat( document );

		// The upstream "Flexbox changes" notice targeted pages saved before 2.5.0. Refraction's own version starts at 0.x, so the
		// comparison would flag every page; Refraction has no such legacy pages, so the notice is gone.

		if ( refraction.loaded ) {
			// TODO: Find better solution - Fix issue when globals does not render after saving from kit.
			// The issue is that the css-parser is depends upon cache and cache is not available during this time.
			return $e.data.get( 'globals/index' ).then( () => {
				if ( setAsInitial ) {
					// There is no need to attach preview when the iframe is reloaded. It will be triggered
					// automatically after the iframe finishes loading (see `EditorBase.onPreviewLoaded()`).
					refraction.reloadPreview();

					return Promise.resolve();
				}

				return $e.internal( 'editor/documents/attach-preview', {
					shouldScroll,
					shouldNavigateToDefaultRoute,
					selector: args.selector,
				} );
			} );
		}

		return Promise.resolve( document );
	}
}

export default Load;
