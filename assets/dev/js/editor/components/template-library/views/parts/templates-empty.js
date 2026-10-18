const TemplateLibraryTemplatesEmptyView = Marionette.ItemView.extend( {
	tagName: 'main',

	id: 'refraction-template-library-templates-empty',

	template: '#tmpl-refraction-template-library-templates-empty',

	ui: {
		title: '.refraction-template-library-blank-title',
		message: '.refraction-template-library-blank-message',
		icon: '.refraction-template-library-blank-icon',
		button: '.refraction-template-library-cloud-empty__button',
		backToEditor: '.e-back-to-editor',
	},

	events: {
		'click @ui.backToEditor': 'closeLibrary',
	},

	closeLibrary( event ) {
		event.preventDefault();
		$e.run( 'library/close' );
	},

	modesStrings() {
		const defaultIcon = this.getDefaultIcon();

		return {
			empty: {
				title: __( 'Haven’t Saved Templates Yet?', 'refraction' ),
				message: __( 'This is where your templates should be. Design it. Save it. Reuse it.', 'refraction' ),
				icon: defaultIcon,
				button: '',
			},
			noResults: {
				title: __( 'No Results Found', 'refraction' ),
				message: __( 'Please make sure your search is spelled correctly or try a different words.', 'refraction' ),
				icon: defaultIcon,
				button: '',
			},
			noFavorites: {
				title: __( 'No Favorite Templates', 'refraction' ),
				message: __( 'You can mark any pre-designed template as a favorite.', 'refraction' ),
				icon: defaultIcon,
				button: '',
			},
			cloudEmpty: {
				title: __( 'No templates saved just yet', 'refraction' ),
				message: __( 'Once you save a template, it’ll show up here, ready for reuse across all of your Refraction sites—no extra work needed.', 'refraction' ),
				icon: this.getCloudIcon(),
				button: `<a class="e-back-to-editor">${ __( 'Back to editor', 'refraction' ) }</a>`,
			},
			cloudFolderEmpty: {
				title: __( 'No templates to show here, yet', 'refraction' ),
				message: __( 'Once you save some templates to this folder, you can use them on any website you’re working on.', 'refraction' ),
				icon: this.getEmptyFolderIcon(),
				button: `<a class="e-back-to-editor">${ __( 'Back to editor', 'refraction' ) }</a>`,
			},
		};
	},

	getDefaultIcon() {
		return `<img src="${ refractionCommon.config.urls.assets }images/no-search-results.svg" class="refraction-template-library-no-results" loading="lazy" />`;
	},

	getCloudIcon() {
		return `<i class="eicon-library-cloud-empty" aria-hidden="true" title="Empty Cloud Library"></i>`;
	},

	getEmptyFolderIcon() {
		return `<i class="eicon-library-folder-empty" aria-hidden="true" title="Empty folder"></i>`;
	},

	getCurrentMode() {
		if ( refraction.templates.getFilter( 'text' ) ) {
			return 'noResults';
		}

		if ( refraction.templates.getFilter( 'favorite' ) ) {
			return 'noFavorites';
		}

		if ( 'cloud' === refraction.templates.getFilter( 'source' ) ) {
			return null !== refraction.templates.getFilter( 'parent' )
				? 'cloudFolderEmpty'
				: 'cloudEmpty';
		}

		return 'empty';
	},

	onRender() {
		const modeStrings = this.modesStrings()[ this.getCurrentMode() ];

		this.ui.title.html( modeStrings.title );

		this.ui.message.html( modeStrings.message );

		this.ui.button.html( modeStrings.button );

		this.ui.icon.html( modeStrings.icon );
	},
} );

module.exports = TemplateLibraryTemplatesEmptyView;
