/**
 * Every slide container is one slide's content: only the selected slide's container shows (the front-end handler
 * switches them, following the slide picked in the panel).
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	onAddChild( childView ) {
		childView.$el.addClass( 'rf-tco__text' ).attr( {
			role: 'group',
			'aria-roledescription': 'slide',
			'data-slide-index': childView.model.attributes.dataIndex,
		} );
	}
}
