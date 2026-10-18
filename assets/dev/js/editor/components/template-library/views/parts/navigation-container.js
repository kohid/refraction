module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-template-library-navigation-container',

	className: 'refraction-template-library-navigation-container',

	ui: {
		title: '.refraction-template-library-current-folder-title',
		backButton: '.refraction-template-library-navigation-back-button',
	},

	events: {
		'click @ui.backButton': 'onBackButtonClick',
	},

	render() {
		if ( null === refraction.templates.getFilter( 'parent' ) ) {
			return this;
		}

		return Marionette.ItemView.prototype.render.call( this );
	},

	onRender() {
		this.ui.title.text( refraction.templates.getFilter( 'parent' )?.title );
	},

	onBackButtonClick() {
		refraction.templates.setFilter( 'parent', null );

		$e.route( 'library/templates/my-templates' );
	},
} );
