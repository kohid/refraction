var PanelElementsCategoryView = require( './category' ),
	PanelElementsCategoriesView;

PanelElementsCategoriesView = Marionette.CompositeView.extend( {
	template: '#tmpl-refraction-panel-categories',

	childView: PanelElementsCategoryView,

	childViewContainer: '#refraction-panel-categories',

	id: 'refraction-panel-elements-categories',

	initialize() {
		this.listenTo( refraction.channels.panelElements, 'filter:change', this.onPanelElementsFilterChange );
	},

	onPanelElementsFilterChange() {
		if ( refraction.channels.panelElements.request( 'filter:value' ) ) {
			refraction.getPanelView().getCurrentPageView().showView( 'elements' );
		}
	},
} );

module.exports = PanelElementsCategoriesView;
