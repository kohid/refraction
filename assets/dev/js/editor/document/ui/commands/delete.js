export class Delete extends $e.modules.CommandBase {
	apply() {
		const selectedElements = refraction.selection.getElements();

		if ( selectedElements.length ) {
			return $e.run( 'document/elements/delete', {
				containers: selectedElements,
				callerName: 'keyboard',
			} );
		}

		return false;
	}
}

export default Delete;
