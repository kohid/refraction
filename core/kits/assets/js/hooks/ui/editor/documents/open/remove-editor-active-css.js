export class KitRemoveEditorActiveCSSDocumentsOpen extends $e.modules.hookUI.After {
	getCommand() {
		return 'editor/documents/open';
	}

	getId() {
		return 'kit-remove-editor-active-css--editor/documents/open';
	}

	getConditions() {
		return 'kit' === refraction.documents.getCurrent().config.type;
	}

	apply() {
		// TODO: Remove - Temporary fix to avoid conflict with `refraction.exitPreviewMode()`.
		setTimeout( () => {
			refractionFrontend.elements.$body.removeClass( 'refraction-editor-active' );
		} );
	}
}

export default KitRemoveEditorActiveCSSDocumentsOpen;
