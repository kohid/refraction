var TemplateLibraryHeaderActionsView = require( 'refraction-templates/views/parts/header-parts/actions' ),
	TemplateLibraryHeaderMenuView = require( 'refraction-templates/views/parts/header-parts/menu' ),
	TemplateLibraryHeaderPreviewView = require( 'refraction-templates/views/parts/header-parts/preview' ),
	TemplateLibraryHeaderBackView = require( 'refraction-templates/views/parts/header-parts/back' ),
	TemplateLibraryCollectionView = require( 'refraction-templates/views/parts/templates' ),
	TemplateLibrarySaveTemplateView = require( 'refraction-templates/views/parts/save-template' ),
	TemplateLibrarySaveTemplateVariantBView = require( 'refraction-templates/views/parts/save-template-variant-b' ),
	TemplateLibraryImportView = require( 'refraction-templates/views/parts/import' ),
	TemplateLibraryConnectView = require( 'refraction-templates/views/parts/connect' ),
	TemplateLibraryCloudStateView = require( 'refraction-templates/views/parts/cloud-states' ),
	TemplateLibraryPreviewView = require( 'refraction-templates/views/parts/preview' ),
	TemplateLibraryNavigationContainerView = require( 'refraction-templates/views/parts/navigation-container' );

import { SAVE_CONTEXTS } from './../constants';

function resolveSaveTemplateByVariant( variant ) {
	switch ( variant ) {
		case 'B':
			return TemplateLibrarySaveTemplateVariantBView;
		case 'control':
		case 'A':
		default:
			return TemplateLibrarySaveTemplateView;
	}
}

module.exports = refractionModules.common.views.modal.Layout.extend( {
	getModalOptions() {
		const allowClosingModal = window?.refraction?.config?.document?.panel?.allow_closing_remote_library ?? true;

		return {
			id: 'refraction-template-library-modal',
			hide: {
				onOutsideClick: allowClosingModal,
				onBackgroundClick: allowClosingModal,
				onEscKeyPress: allowClosingModal,
				ignore: '.dialog-widget-content, .dialog-buttons-undo_bulk_delete, .dialog-buttons-template_after_save, #refraction-library--infotip__dialog, #refraction-template-library-rename-dialog, #refraction-template-library-delete-dialog',
			},
		};
	},

	initModal() {
		refractionModules.common.views.modal.Layout.prototype.initModal.call( this );

		const $widget = this.modal.getElements( 'widget' );
		if ( $widget.length && 'true' === $widget.attr( 'aria-modal' ) ) {
			$widget.attr( 'role', 'dialog' );
		}

		// Move focus inside the modal when it opens (WAI-ARIA dialog pattern)
		this.modal.on( 'show', () => {
			const $modalWidget = this.modal.getElements( 'widget' );
			if ( $modalWidget.length ) {
				$modalWidget.trigger( 'focus' );
			}
		} );

		// Focus trap: keep Tab/Shift+Tab cycling within the modal (WAI-ARIA dialog pattern)
		if ( $widget.length ) {
			$widget.on( 'keydown', ( event ) => {
				if ( 'Tab' !== event.key ) {
					return;
				}

				const $focusable = $widget
					.find( 'a[href], button, input, select, textarea, [tabindex]' )
					.filter( ':visible' )
					.not( '[tabindex="-1"], [disabled]' );

				if ( ! $focusable.length ) {
					return;
				}

				const $first = $focusable.first();
				const $last = $focusable.last();

				if ( event.shiftKey ) {
					if ( $first[ 0 ] === event.target || $widget[ 0 ] === event.target ) {
						event.preventDefault();
						$last.trigger( 'focus' );
					}
				} else if ( $last[ 0 ] === event.target ) {
					event.preventDefault();
					$first.trigger( 'focus' );
				}
			} );
		}
	},

	getLogoOptions() {
		return {
			title: __( 'Library', 'refraction' ),
			click() {
				$e.run( 'library/open', { toDefault: true } );
			},
		};
	},

	getTemplateActionButton( templateData ) {
		const subscriptionPlans = refraction.config.library_connect.subscription_plans,
			baseAccessTier = refraction.config.library_connect.base_access_tier,
			templateAccessTier = templateData.accessTier,
			shouldUpgrade = baseAccessTier !== templateAccessTier;

		let viewId = '#tmpl-refraction-template-library-' + ( shouldUpgrade ? 'upgrade-plan-button' : 'insert-button' );

		viewId = refraction.hooks.applyFilters( 'refraction/editor/template-library/template/action-button', viewId, templateData );

		const template = Marionette.TemplateCache.get( viewId );
		const subscriptionPlan = subscriptionPlans[ templateAccessTier ];
		const promotionText = refractionAppConfig.hasPro ? 'Upgrade' : `Go ${ subscriptionPlan.label }`;

		try {
			const promotionUrlPieces = new URL( subscriptionPlan.promotion_url );
			const queryString = promotionUrlPieces.searchParams.toString();

			const promotionLinkQueryString = refraction.hooks.applyFilters(
				'refraction/editor/template-library/template/promotion-link-search-params',
				queryString,
				templateData,
			);

			return Marionette.Renderer.render( template, {
				promotionText,
				promotionLink: `${ promotionUrlPieces.origin }${ promotionUrlPieces.pathname }?${ promotionLinkQueryString }`,
			} );
		} catch ( e ) {
			return Marionette.Renderer.render( template, {
				promotionText,
				promotionLink: subscriptionPlan.promotion_url,
			} );
		}
	},

	setHeaderDefaultParts() {
		var headerView = this.getHeaderView();

		headerView.tools.show( new TemplateLibraryHeaderActionsView() );
		headerView.menuArea.show( new TemplateLibraryHeaderMenuView() );

		this.showLogo();
	},

	showTemplatesView( templatesCollection ) {
		const prevView = this.modalContent.currentView;
		const shouldRestoreFocus = prevView && prevView._restoreFocusToSourceFilter;
		const isInitialOpen = ! prevView;

		this.modalContent.show( new TemplateLibraryCollectionView( {
			collection: templatesCollection,
		} ) );

		this.syncTabpanelAriaLabelledby();

		if ( shouldRestoreFocus ) {
			const newView = this.modalContent.currentView;
			if ( newView && newView.ui.selectSourceFilter ) {
				const $selected = newView.ui.selectSourceFilter.filter( '[aria-checked="true"]' );
				if ( $selected.length ) {
					$selected.trigger( 'focus' );
				}
			}
		} else if ( isInitialOpen ) {
			this.focusFirstElement();
		}
	},

	syncTabpanelAriaLabelledby() {
		const activeTab = $e.components.get( 'library' )?.currentTab;
		const $container = this.modalContent.currentView?.$childViewContainer;

		if ( activeTab && $container?.length ) {
			$container.attr( 'aria-labelledby', `tab-${ activeTab }` );
		}
	},

	focusFirstElement() {
		const $widget = this.modal.getElements( 'widget' );

		if ( ! $widget.length ) {
			return;
		}

		const $firstFocusable = $widget
			.find( 'button, a, input, select, [tabindex="0"]' )
			.filter( ':visible' )
			.first();

		if ( $firstFocusable.length ) {
			$firstFocusable.trigger( 'focus' );
		} else {
			$widget.attr( 'tabindex', '-1' ).trigger( 'focus' );
		}
	},

	updateViewCollection( models ) {
		this.modalContent.currentView.collection.reset( models );
		this.modalContent.currentView.ui.navigationContainer.html( ( new TemplateLibraryNavigationContainerView() ).render()?.el );

		// Restore focus within the modal after re-render to prevent focus escaping to BODY
		const $widget = this.modal.getElements( 'widget' );
		if ( $widget.length && ! $widget[ 0 ].contains( $widget[ 0 ].ownerDocument.activeElement ) ) {
			this.focusFirstElement();
		}
	},

	addTemplates( models ) {
		this.modalContent.currentView.collection.add( models, { merge: true } );
	},

	showImportView() {
		const headerView = this.getHeaderView();

		headerView.menuArea.reset();

		this.modalContent.show( new TemplateLibraryImportView() );

		headerView.logoArea.show( new TemplateLibraryHeaderBackView() );
	},

	showConnectView( args ) {
		this.getHeaderView().menuArea.reset();

		this.modalContent.show( new TemplateLibraryConnectView( args ) );
	},

	showCloudStateView() {
		refraction.templates.layout.hideLoadingView();
		this.modalContent.show( new TemplateLibraryCloudStateView() );
	},

	async showSaveTemplateView( elementModel, context = SAVE_CONTEXTS.SAVE ) {
		const headerView = this.getHeaderView();

		headerView.menuArea.reset();

		if ( SAVE_CONTEXTS.SAVE !== context ) {
			headerView.logoArea.show( new TemplateLibraryHeaderBackView() );
		}

		const experimentVariant = await refraction.templates.eventManager.getSaveTemplateExperimentVariant();
		const SaveTemplateView = resolveSaveTemplateByVariant( experimentVariant );
		refraction.templates.eventManager.startSaveTemplateExperiment( experimentVariant );

		this.modalContent.show( new SaveTemplateView( { model: elementModel, context } ) );
	},

	showPreviewView( templateModel ) {
		this.modalContent.show( new TemplateLibraryPreviewView( {
			url: templateModel.get( 'url' ),
		} ) );

		var headerView = this.getHeaderView();

		headerView.menuArea.reset();

		headerView.tools.show( new TemplateLibraryHeaderPreviewView( {
			model: templateModel,
		} ) );

		headerView.logoArea.show( new TemplateLibraryHeaderBackView() );
	},

	async showFolderView( elementModel ) {
		try {
			refraction.templates.layout.showLoadingView();

			await refraction.templates.getFolderTemplates( elementModel );
		} finally {
			refraction.templates.layout.hideLoadingView();
		}
	},

	createScreenshotIframe( previewUrl ) {
		const iframe = document.createElement( 'iframe' );

		iframe.src = previewUrl;
		iframe.width = '1200';
		iframe.height = '500';
		iframe.style = 'visibility: hidden;';

		document.body.appendChild( iframe );

		return iframe;
	},

	handleBulkActionBarUi() {
		if ( 0 === this.modalContent.currentView.$( '.bulk-selection-item-checkbox:checked' ).length ) {
			this.modalContent.currentView.$el.addClass( 'no-bulk-selections' );
			this.modalContent.currentView.$el.removeClass( 'has-bulk-selections' );
		} else {
			this.modalContent.currentView.$el.addClass( 'has-bulk-selections' );
			this.modalContent.currentView.$el.removeClass( 'no-bulk-selections' );
		}

		this.handleBulkActionBar();
	},

	handleBulkActionBar() {
		const selectedCount = refraction.templates.getBulkSelectionItems().size ?? 0;
		const display = 0 === selectedCount ? 'none' : 'flex';

		const countText = `${ selectedCount } Selected`;
		const announcementText = 0 === selectedCount ? '' : `${ selectedCount } ${ 1 === selectedCount ? __( 'template', 'refraction' ) : __( 'templates', 'refraction' ) } ${ __( 'selected. Bulk actions available.', 'refraction' ) }`;

		this.modalContent.currentView.ui.bulkSelectedCount.html( countText );
		if ( announcementText && this.modalContent.currentView.ui.bulkSelectedCount.length ) {
			this.modalContent.currentView.ui.bulkSelectedCount.attr( 'aria-label', announcementText );
		}
		this.modalContent.currentView.ui.bulkSelectionActionBar.css( 'display', display );

		// TODO: Temporary fix until the bulk action bar will be as separate view.
		const displayNavigationContainer = 0 === selectedCount ? 'flex' : 'none';
		this.modalContent.currentView.ui.navigationContainer.css( 'display', displayNavigationContainer );
	},

	selectAllCheckboxMinus() {
		if ( this.isListView() ) {
			this.modalContent.currentView.ui.bulkSelectAllCheckbox.addClass( 'checkbox-minus' );
		}
	},

	selectAllCheckboxNormal() {
		if ( this.isListView() ) {
			this.modalContent.currentView.ui.bulkSelectAllCheckbox.removeClass( 'checkbox-minus' );
		}
	},

	isListView() {
		return 'list' === refraction.templates.getViewSelection();
	},

	resetSortingUI() {
		Array.from( this.modalContent.currentView.ui?.orderInputs || [] ).forEach( function( input ) {
			input.checked = false;
		} );
	},
} );
