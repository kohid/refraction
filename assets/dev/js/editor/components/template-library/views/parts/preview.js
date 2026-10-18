var TemplateLibraryPreviewView;

TemplateLibraryPreviewView = Marionette.ItemView.extend( {
	tagName: 'main',

	template: '#tmpl-refraction-template-library-preview',

	id: 'refraction-template-library-preview',

	ui: {
		iframe: '> iframe',
	},

	onRender() {
		this.ui.iframe.attr( 'src', this.getOption( 'url' ) );
	},
} );

module.exports = TemplateLibraryPreviewView;
