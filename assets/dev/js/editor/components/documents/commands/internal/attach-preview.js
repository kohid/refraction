export class AttachPreview extends $e.modules.CommandInternalBase {
	validateArgs( args = {} ) {
		if ( args.selector ) {
			this.requireArgumentType( 'selector', 'string' );

			if ( 0 === refraction.$previewContents.find( args.selector ).length ) {
				throw new Error( 'Invalid argument. The `selector` argument must be existed selector.' );
			}
		}
	}

	apply( { shouldNavigateToDefaultRoute = true, ...args } = {} ) {
		const document = refraction.documents.getCurrent();

		return $e.data.get( 'globals/index' )
			.then( () => {
				refraction.trigger( 'globals:loaded' );

				return this.attachDocumentToPreview( document, args );
			} )
			.then( () => {
				refraction.toggleDocumentCssFiles( document, false );

				refraction.onEditModeSwitched();

				refraction.checkPageStatus();

				refraction.trigger( 'document:loaded', document );

				if ( shouldNavigateToDefaultRoute ) {
					return $e.internal( 'panel/open-default', {
						refresh: true,
					} );
				}
			} );
	}

	attachDocumentToPreview( document, args ) {
		const { selector = '.refraction-' + document.id, shouldScroll = true } = args;

		return new Promise( ( resolve, reject ) => {
			// Not yet loaded.
			if ( ! document ) {
				return reject( `Can't attach preview, there is no open document.` );
			}

			if ( ! document.config.elements ) {
				return resolve();
			}

			document.$element = refraction.$previewContents.find( selector );
			const isInitialDocument = document.id === refraction.config.initial_document.id;

			if ( ! document.$element.length ) {
				if ( isInitialDocument ) {
					refraction.onPreviewElNotFound();
				}

				return reject( `Can't attach preview to document '${ document.id }', element '${ selector }' was not found.` );
			}

			document.$element.addClass( 'refraction-edit-area refraction-edit-mode' );

			if ( ! isInitialDocument ) {
				refraction.documents.getCurrent().$element.addClass( 'refraction-embedded-editor' );
			}

			refraction.initElements();

			refraction.initPreviewView( document );

			document.container.view = refraction.getPreviewView();
			document.container.model.attributes.elements = refraction.elements;

			if ( shouldScroll ) {
				refraction.helpers.scrollToView( document.$element );
			}

			document.$element
				.addClass( 'refraction-edit-area-active' )
				.removeClass( 'refraction-editor-preview' );

			resolve();
		} );
	}
}

export default AttachPreview;
