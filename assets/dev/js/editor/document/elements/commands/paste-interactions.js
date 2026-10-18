export class PasteInteractions extends $e.modules.editor.CommandContainerBase {
	validateArgs( args ) {
		this.requireContainer( args );

		const { storageKey = 'clipboard' } = args;
		const storageData = refractionCommon.storage.get( storageKey );

		this.requireArgumentType( 'storageData', 'object', { storageData } );
	}

	apply() {
	}
}

export default PasteInteractions;
