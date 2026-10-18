const PanelMenuItemView = require( 'refraction-panel/pages/menu/views/item' );

module.exports = Marionette.CompositeView.extend( {
	template: '#tmpl-refraction-panel-menu-group',

	className: 'refraction-panel-menu-group',

	childView: PanelMenuItemView,

	childViewContainer: '.refraction-panel-menu-items',

	initialize() {
		this.collection = new Backbone.Collection( this.model.get( 'items' ) );
	},

	onChildviewClick( childView ) {
		const callback = childView.model.get( 'callback' );

		if ( _.isFunction( callback ) ) {
			callback.call( childView );
		}
	},
} );
