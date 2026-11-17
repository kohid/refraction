/**
 * Every slide container is one card of the stack; the front-end handler places them (current, waiting, hidden) and
 * follows the slide picked in the panel.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	onAddChild( childView ) {
		childView.$el.addClass( 'rf-fs__slide' ).attr( {
			role: 'group',
			'aria-roledescription': 'slide',
			'data-slide-index': childView.model.attributes.dataIndex,
		} );
	}
}
