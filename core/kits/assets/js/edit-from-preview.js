/**
 * While Site Settings is open, the page stays in the preview but is not the document being edited. Clicking one of its
 * elements goes back to editing the page with that element chosen (asking first, when Site Settings has unsaved
 * changes, whether to save them).
 */
export default class EditFromPreview {
	constructor() {
		this.onClick = this.onClick.bind( this );

		refraction.on( 'preview:loaded', () => {
			refraction.$previewContents[ 0 ].addEventListener( 'click', this.onClick, true );
		} );
	}

	isSiteSettingsOpen() {
		const current = refraction.documents.getCurrent();

		return !! current && current.id === parseInt( refraction.config.kit_id ) && refraction.config.initial_document.id !== current.id;
	}

	onClick( event ) {
		if ( ! this.isSiteSettingsOpen() ) {
			return;
		}

		const element = event.target.closest( '.refraction-element[data-id]' ),
			page = element?.closest( '[data-refraction-id]' );

		// Only the page's own elements (a header or footer template is another document).
		if ( ! element || ! page || parseInt( page.dataset.refractionId ) !== refraction.config.initial_document.id ) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		this.leaveSiteSettings().then( () => {
			const container = refraction.getContainer( element.dataset.id );

			if ( container ) {
				$e.run( 'document/elements/select', { container } );
				$e.run( 'panel/editor/open', { model: container.model, view: container.view } );
			}
		} );
	}

	leaveSiteSettings() {
		const kit = refraction.documents.get( refraction.config.kit_id );

		if ( ! kit?.editor?.isChanged ) {
			return Promise.resolve( $e.run( 'panel/global/close' ) );
		}

		return new Promise( ( resolve ) => {
			refractionCommon.dialogsManager.createWidget( 'confirm', {
				id: 'refraction-kit-save-before-editing',
				headerMessage: __( 'Save Changes', 'refraction' ),
				message: __( 'Save your Site Settings changes before going back to the page?', 'refraction' ),
				position: { my: 'center center', at: 'center center' },
				strings: { confirm: __( 'Save', 'refraction' ), cancel: __( 'Discard', 'refraction' ) },
				onConfirm: () => $e.run( 'document/save/update' ).then( () => resolve( $e.run( 'panel/global/close' ) ) ),
				onCancel: () => $e.run( 'document/save/discard', { document: kit } ).then( () => resolve( $e.run( 'panel/global/close' ) ) ),
			} ).show();
		} );
	}
}
