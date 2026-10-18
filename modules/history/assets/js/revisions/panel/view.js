module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-panel-revisions-revision-item',

	className: 'refraction-revision-item',

	ui: {
		detailsArea: '.refraction-revision-item__details',
	},

	triggers: {
		'click @ui.detailsArea': 'detailsArea:click',
	},
} );
