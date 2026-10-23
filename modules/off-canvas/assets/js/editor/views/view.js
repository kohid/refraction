export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	onAddChild( childView ) {
		childView.$el.attr( 'data-refraction-offcanvas-content', '' );
	}
}
