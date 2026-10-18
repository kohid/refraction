import Document from '../../document';

export class Unload extends $e.modules.CommandInternalBase {
	validateArgs( args = {} ) {
		this.requireArgumentConstructor( 'document', Document, args );
	}

	apply( args ) {
		return new Promise( ( resolve, reject ) => {
			const { document } = args;

			if ( document.id !== refraction.config.document.id ) {
				reject();
			}

			refraction.elements = [];

			refraction.saver.stopAutoSave( document );

			refraction.channels.dataEditMode.trigger( 'switch', 'preview' );

			if ( document.$element ) {
				document.$element
					.removeClass( 'refraction-edit-area-active refraction-edit-mode' )
					.addClass( 'refraction-editor-preview' );
			}

			refractionCommon.elements.$body.removeClass( `refraction-editor-${ document.config.type }` );

			refraction.settings.page.destroy();

			refraction.heartbeat.destroy();

			document.editor.status = 'closed';

			refraction.config.document = {};

			refraction.documents.unsetCurrent();

			refraction.trigger( 'document:unloaded', document );

			resolve();
		} );
	}
}

export default Unload;
