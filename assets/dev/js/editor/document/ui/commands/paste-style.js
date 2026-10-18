export class PasteStyle extends $e.modules.CommandBase {
	apply() {
		const selectedElement = refraction.getCurrentElement();

		if ( selectedElement ) {
			return $e.run( 'document/elements/paste-style', {
				container: selectedElement.getContainer(),
			} );
		}

		return false;
	}
}

export default PasteStyle;
