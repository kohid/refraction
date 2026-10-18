export function createEditorHandler( importer ) {
	return () => {
		return new Promise( ( resolve ) => {
			if ( refractionFrontend.isEditMode() ) {
				importer().then( resolve );
			}
		} );
	};
}
