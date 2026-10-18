export class Open extends $e.modules.CommandBase {
	validateArgs( args ) {
		this.requireArgument( 'id', args );
	}

	apply( args ) {
		const { id, selector, shouldScroll = true, shouldNavigateToDefaultRoute = true, setAsInitial = false } = args,
			currentDocument = refraction.documents.getCurrent();

		// Already opened.
		if ( currentDocument && id === currentDocument.id ) {
			return jQuery.Deferred().resolve();
		}

		// TODO: move to $e.hooks.ui.
		if ( refraction.loaded ) {
			refraction.$previewContents.find( `.refraction-${ id }` ).addClass( 'loading' );
		}

		if ( setAsInitial ) {
			// Set the new initial document id to be sent with all requests.
			// The next request needs to have the new initial document id in order to have the correct preview URL.
			refractionCommon.ajax.addRequestConstant( 'initial_document_id', id );

			// Because the initial document has changed, we need to clear cached values (e.g. header wp_preview URL),
			refraction.documents.invalidateCache();
		}

		return refraction.documents.request( id )
			.then( ( config ) => {
				refractionCommon.elements.$body.addClass( `refraction-editor-${ config.type }` );

				// Tell the editor to load the document.
				return $e.internal( 'editor/documents/load', { config, selector, setAsInitial, shouldScroll, shouldNavigateToDefaultRoute } );
			} )
			.always( () => {
				// TODO: move to $e.hooks.ui.
				if ( refraction.loaded ) {
					refraction.$previewContents.find( `.refraction-${ id }` ).removeClass( 'loading' );
				}
			} );
	}
}

export default Open;
