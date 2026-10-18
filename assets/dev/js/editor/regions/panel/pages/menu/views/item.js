module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-panel-menu-item',

	tagName: 'button',

	className() {
		return 'refraction-panel-menu-item refraction-panel-menu-item-' + this.model.get( 'name' );
	},

	triggers: {
		click: {
			event: 'click',
			preventDefault: false,
		},
	},
} );
