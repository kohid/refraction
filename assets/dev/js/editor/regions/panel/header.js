var PanelHeaderItemView;

PanelHeaderItemView = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-panel-header',

	id: 'refraction-panel-header',

	ui: {
		menuButton: '#refraction-panel-header-menu-button',
		menuIcon: '#refraction-panel-header-menu-button i',
		title: '#refraction-panel-header-title',
		addButton: '#refraction-panel-header-add-button',
	},

	events: {
		'click @ui.addButton': 'onClickAdd',
		'click @ui.menuButton': 'onClickMenu',
	},

	behaviors() {
		return refraction.hooks.applyFilters( 'panel/header/behaviors', {}, this );
	},

	setTitle( title ) {
		this.ui.title.html( title );
	},

	onClickAdd() {
		$e.route( 'panel/elements/categories' );
	},

	onClickMenu() {
		if ( $e.routes.is( 'panel/menu' ) ) {
			$e.route( 'panel/elements/categories' );
		} else {
			$e.route( 'panel/menu' );
		}
	},
} );

module.exports = PanelHeaderItemView;
