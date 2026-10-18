import PanelContent from './panel-content';

export default Marionette.LayoutView.extend( {
	id: 'refraction-kit-panel',

	template: '#tmpl-refraction-kit-panel',

	regions: {
		content: '#refraction-kit__panel-content__wrapper',
	},

	onBeforeShow() {
		const container = refraction.documents.getCurrent().container,
			options = {
				container,
				model: container.model,
				controls: container.settings.controls,
				name: 'kit',
			};

		this.showChildView( 'content', new PanelContent( options ) );
	},
} );
