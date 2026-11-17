/**
 * Every slide container goes into its own slot (.rf-sw__slot of the same place, from the widget's template); the
 * front-end handler shows the slide picked in the panel.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	/** This widget's own slots (not those of a showcase inside a slide). */
	ownSlots() {
		const box = this.$el.find( '.rf-sw__slots' ).get( 0 );

		return box ? Array.from( box.children ).filter( ( el ) => el.classList.contains( 'rf-sw__slot' ) ) : [];
	}

	/**
	 * The first render attaches all children at once (a buffer) without saying which is which: each goes into the slot
	 * of its place. Without enough slots, the base behaviour.
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
