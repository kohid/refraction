/**
 * Every row's container goes into its own slot (.rf-pb__slot of the same place: the heading, a note, the footer, from the widget's template): the
 * white card with its pin. Later changes (a note added, moved, removed) are placed by the nested view base.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	/** This widget's own slots (not those of a Pin Board inside a note). */
	ownSlots() {
		const box = this.$el.find( '.rf-pb__notes' ).get( 0 );

		return box ? Array.from( box.children ).filter( ( el ) => el.classList.contains( 'rf-pb__slot' ) ) : [];
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
