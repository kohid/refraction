import Component from '../component';

export class Copy extends $e.modules.CommandBase {
	apply() {
		// A nested widget's slide or item copies its widget.
		const selectedElements = [ ...new Set( refraction.selection.getElements().map( ( container ) => Component.copyTarget( container ) ) ) ];

		if ( selectedElements.length ) {
			return $e.run( 'document/elements/copy', {
				containers: selectedElements,
			} );
		}

		return false;
	}
}

export default Copy;
