export class SelectAll extends $e.modules.CommandBase {
	apply() {
		refraction.selection.add(
			this.flattenContainersList(
				// The selection mechanism keeps selected elements in a single-dimension object. Therefore, In order to
				// select all document elements, we should convert them into a flatten, single-dimension array.
				refraction.elementsModel.get( 'elements' ).map( ( element ) => {
					return refraction.getContainer( element.id );
				} ),
			),
		);
	}

	/**
	 * Recursively iterate over all container children and make a flatten array of their instances.
	 *
	 * @param {*} containers
	 * @return {*[]} flattened array of container children
	 */
	flattenContainersList( containers = [] ) {
		let flatten = [];

		for ( const container of containers ) {
			flatten.push( container );

			if ( container.children.length ) {
				flatten = flatten.concat( this.flattenContainersList( container.children ) );
			}
		}

		return flatten;
	}
}

export default SelectAll;
