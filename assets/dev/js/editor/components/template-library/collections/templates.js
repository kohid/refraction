var TemplateLibraryTemplateModel = require( 'refraction-templates/models/template' ),
	TemplateLibraryCollection;

TemplateLibraryCollection = Backbone.Collection.extend( {
	model: TemplateLibraryTemplateModel,
} );

module.exports = TemplateLibraryCollection;
