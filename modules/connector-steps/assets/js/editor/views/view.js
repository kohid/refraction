/**
 * Every step's container goes into its own slot (.rf-cs__step of the same place, from the widget's template), next to
 * its arrow. Later changes (a step added, moved, removed) are placed by the nested view base.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	/** This widget's own slots (not those of a Connector inside a step). */
	ownSlots() {
		const box = this.$el.find( '.rf-cs' ).get( 0 );

		return box ? Array.from( box.children ).filter( ( el ) => el.classList.contains( 'rf-cs__step' ) ) : [];
	}

	/**
	 * The first render attaches all children at once (a buffer): each goes into the slot of its place.
	 *
	 * @param {Object}           compositeView
	 * @param {DocumentFragment} buffer
	 */
	attachBuffer( compositeView, buffer ) {
		const slots = this.ownSlots();
		const nodes = Array.from( buffer.childNodes ).filter( ( node ) => 1 === node.nodeType );

		if ( ! slots.length || nodes.length > slots.length ) {
			super.attachBuffer( compositeView, buffer );
			return;
		}

		nodes.forEach( ( node, index ) => slots[ index ].appendChild( node ) );
	}
}
