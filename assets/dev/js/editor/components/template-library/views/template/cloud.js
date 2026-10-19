var TemplateLibraryTemplateLocalView = require( 'refraction-templates/views/template/local' ),
	TemplateLibraryTemplateCloudView;

TemplateLibraryTemplateCloudView = TemplateLibraryTemplateLocalView.extend( {
	className() {
		const view = refraction.templates.getViewSelection(),
			subType = 'FOLDER' === this.model.get( 'subType' ) ? 'folder' : 'template';

		let classes = TemplateLibraryTemplateLocalView.prototype.className.apply( this, arguments );

		classes += ' refraction-template-library-template-view-' + view;
		classes += ' refraction-template-library-template-type-' + subType;

		return classes;
	},

	attributes() {
		if ( 'grid' === refraction.templates.getViewSelection() ) {
			const data = this.model.toJSON();

			return {
				'data-template_id': data.template_id,
				'data-type': data.type,
				'data-status': data.status,
				tabindex: '0',
				'aria-label': data.title || '',
			};
		}
	},

	ui() {
		return _.extend( TemplateLibraryTemplateLocalView.prototype.ui.apply( this, arguments ), {
			previewImg: '.refraction-template-library-template-thumbnail img',
			insertButton: '.refraction-template-library-template-insert',
		} );
	},

	events() {
		return _.extend( TemplateLibraryTemplateLocalView.prototype.events.apply( this, arguments ), {
			keydown: 'onGridCardKeyDown',
		} );
	},

	modelEvents: _.extend( {}, TemplateLibraryTemplateLocalView.prototype.modelEvents, {
		'change:preview_url': 'onPreviewUrlChange',
	} ),

	onGridCardKeyDown( event ) {
		if ( 'grid' !== refraction.templates.getViewSelection() ) {
			return;
		}

		// Only handle keydown events directly on the card element itself, not on children
		if ( event.target !== this.el ) {
			return;
		}

		if ( 'Enter' === event.key || ' ' === event.key ) {
			event.preventDefault();

			if ( 'FOLDER' === this.model.get( 'subType' ) ) {
				$e.route( 'library/view-folder', {
					model: this.model,
					onAfter: () => {
						refraction.templates.resetBulkActionBar();
					},
				} );
			} else {
				this.handleGridViewItemSingleClick();
			}
		}
	},

	onRender() {
		const previewUrl = this.model.get( 'preview_url' );

		if ( this.shouldGeneratePreview() ) {
			this.iframe = refraction.templates.layout.createScreenshotIframe( this.model.get( 'generate_preview_url' ) );
			this.isGeneratingPreview = true;
		}

		if ( previewUrl ) {
			this.updatePreviewImgStyle();
		}
	},

	onPreviewUrlChange() {
		const previewUrl = this.model.get( 'preview_url' );
		this.isGeneratingPreview = false;

		if ( previewUrl ) {
			this.ui.previewImg.attr( 'src', previewUrl );
			this.updatePreviewImgStyle();
			this.model.set( 'generate_preview_url', null );
			this.iframe.remove();
		}
	},

	updatePreviewImgStyle() {
		const img = this.ui.previewImg[ 0 ];

		if ( ! img ) {
			return;
		}

		const applyObjectFit = () => {
			const objectFit = img.naturalHeight > 2000 ? 'cover' : 'contain';

			if ( 'cover' === objectFit ) {
				this.ui.previewImg.css( 'object-fit', 'cover' );
				this.ui.previewImg.css( 'object-position', 'top' );
			}
		};

		if ( img.complete && img.naturalHeight > 0 ) {
			applyObjectFit();
		} else {
			img.onload = applyObjectFit;
		}
	},

	shouldGeneratePreview() {
		const view = refraction.templates.getViewSelection();

		return 'FOLDER' !== this.model.get( 'subType' ) &&
			this.model.get( 'generate_preview_url' ) &&
			! this.model.get( 'preview_url' ) &&
			'grid' === view &&
			! this.isGeneratingPreview;
	},

	onPreviewButtonClick( event ) {
		event.stopPropagation();

		if ( 'FOLDER' === this.model.get( 'subType' ) ) {
			$e.route( 'library/view-folder', {
				model: this.model,
				onAfter: () => {
					refraction.templates.resetBulkActionBar();
				},
			} );
		}

		if ( 'TEMPLATE' === this.model.get( 'subType' ) ) {
			this.handleGridViewItemSingleClick();
		}
	},

	onDeleteButtonClick( event ) {
		event.stopPropagation();

		if ( 'FOLDER' === this.model.get( 'subType' ) ) {
			this.handleDeleteFolderClick();
			return;
		}

		TemplateLibraryTemplateLocalView.prototype.onDeleteButtonClick.apply( this, arguments );
	},

	handleDeleteFolderClick() {
		const toggleMoreIcon = this.ui.toggleMoreIcon;

		refraction.templates.deleteFolder( this.model, {
			onConfirm() {
				toggleMoreIcon.removeClass( 'rficon-ellipsis-h' ).addClass( 'rficon-loading rficon-animation-spin' );
			},
			onSuccess() {
				$e.routes.refreshContainer( 'library' );
			},
		} );
	},

	handleItemSingleClick() {
		if ( 'grid' === refraction.templates.getViewSelection() ) {
			this.handleGridViewItemSingleClick();
		} else {
			this.handleListViewItemSingleClick();
		}
	},

	handleItemDoubleClick() {
		if ( 'FOLDER' === this.model.get( 'subType' ) ) {
			$e.route( 'library/view-folder', {
				model: this.model,
				onAfter: () => {
					refraction.templates.resetBulkActionBar();
				},
			} );
		}
	},

	handleGridViewItemSingleClick() {
		const itemIsSelected = this.$el.hasClass( 'bulk-selected-item' );

		if ( itemIsSelected ) {
			refraction.templates.removeBulkSelectionItem( this.model.get( 'template_id' ), this.model.get( 'type' ) );
		} else {
			refraction.templates.addBulkSelectionItem( this.model.get( 'template_id' ), this.model.get( 'type' ) );
		}

		this.$el.toggleClass( 'bulk-selected-item' );
		refraction.templates.layout.handleBulkActionBar();
	},
} );

module.exports = TemplateLibraryTemplateCloudView;
