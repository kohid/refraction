var TemplateLibraryInsertTemplateBehavior = require( 'refraction-templates/behaviors/insert-template' );

module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-template-library-header-preview',

	id: 'refraction-template-library-header-preview',

	behaviors: {
		insertTemplate: {
			behaviorClass: TemplateLibraryInsertTemplateBehavior,
		},
	},
} );
