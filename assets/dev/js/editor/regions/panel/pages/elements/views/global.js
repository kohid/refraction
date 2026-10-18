module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-panel-global',

	id: 'refraction-panel-global',

	initialize() {
		refraction.getPanelView().getCurrentPageView().search.reset();
	},
} );
