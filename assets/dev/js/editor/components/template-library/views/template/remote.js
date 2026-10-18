import { EditorOneEventManager } from 'refraction-editor-utils/editor-one-events';

var TemplateLibraryTemplateView = require( 'refraction-templates/views/template/base' ),
	TemplateLibraryTemplateRemoteView;

TemplateLibraryTemplateRemoteView = TemplateLibraryTemplateView.extend( {
	template: '#tmpl-refraction-template-library-template-remote',

	attributes() {
		return jQuery.extend( TemplateLibraryTemplateView.prototype.attributes.apply( this, arguments ), {
			tabindex: '0',
			'aria-label': this.model.get( 'title' ) || '',
		} );
	},

	ui() {
		return jQuery.extend( TemplateLibraryTemplateView.prototype.ui.apply( this, arguments ), {
			favoriteCheckbox: '.refraction-template-library-template-favorite-input',
		} );
	},

	events() {
		return jQuery.extend( TemplateLibraryTemplateView.prototype.events.apply( this, arguments ), {
			'change @ui.favoriteCheckbox': 'onFavoriteCheckboxChange',
		} );
	},

	onPreviewButtonClick( event ) {
		event.stopPropagation();

		$e.route( 'library/preview', { model: this.model } );
	},

	onFavoriteCheckboxChange() {
		var isFavorite = this.ui.favoriteCheckbox[ 0 ].checked;

		this.model.set( 'favorite', isFavorite );

		refraction.templates.markAsFavorite( this.model, isFavorite );

		const baseTier = refraction.config.library_connect?.base_access_tier;
		const templateTier = this.model.get( 'accessTier' );

		EditorOneEventManager.sendELibraryFavorite( {
			assetId: this.model.get( 'template_id' ),
			assetName: this.model.get( 'title' ),
			libraryType: this.model.get( 'type' ) || this.model.get( 'source' ),
			isFavorite,
			proRequired: baseTier !== templateTier,
		} );

		if ( ! isFavorite && refraction.templates.getFilter( 'favorite' ) ) {
			refraction.channels.templates.trigger( 'filter:change' );
		}
	},
} );

module.exports = TemplateLibraryTemplateRemoteView;
