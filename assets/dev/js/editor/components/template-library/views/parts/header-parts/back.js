module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-template-library-header-back',

	id: 'refraction-template-library-header-preview-back',

	events: {
		'click .refraction-template-library-header-back-button': 'onClick',
	},

	onClick() {
		$e.routes.restoreState( 'library' );
	},
} );
