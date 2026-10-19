const TemplateLibraryTemplateModel = require( 'refraction-templates/models/template' );
const TemplateLibraryCollection = require( 'refraction-templates/collections/templates' );
const FolderCollectionView = require( './folders/folders-list' );

const LOAD_MORE_ID = 0;

import { SAVE_CONTEXTS } from './../../constants';
import { rovingTabindex, suppressEscapeKeyUp } from 'refraction-editor-utils/keyboard-nav';

const TemplateLibrarySaveTemplateView = Marionette.ItemView.extend( {
	tagName: 'main',

	id: 'refraction-template-library-save-template',

	template: '#tmpl-refraction-template-library-save-template',

	ui() {
		return {
			form: '#refraction-template-library-save-template-form',
			submitButton: '#refraction-template-library-save-template-submit',
			ellipsisIcon: '.cloud-library-form-inputs .ellipsis-container',
			foldersList: '.cloud-folder-selection-dropdown ul',
			foldersDropdown: '.cloud-folder-selection-dropdown',
			foldersListContainer: '.cloud-folder-selection-dropdown-list',
			removeFolderSelection: '.source-selections .selected-folder i',
			selectedFolder: '.selected-folder',
			selectedFolderText: '.selected-folder-text',
			hiddenInputSelectedFolder: '#parentId',
			templateNameInput: '#refraction-template-library-save-template-name',
			localInput: '.source-selections-input.local',
			cloudInput: '.source-selections-input.cloud',
			sourceSelectionCheckboxes: '.source-selections-input input[type="checkbox"]',
			infoIcon: '.source-selections-input.cloud .eicon-info',
			connect: '#refraction-template-library-connect__badge',
			connectBadge: '.source-selections-input.cloud .connect-badge',
			cloudFormInputs: '.cloud-library-form-inputs',
			upgradeBadge: '.source-selections-input.cloud .upgrade-badge',
		};
	},

	events() {
		return {
			'submit @ui.form': 'onFormSubmit',
			'click @ui.ellipsisIcon': 'onEllipsisIconClick',
			'keydown @ui.ellipsisIcon': 'onEllipsisIconKeyDown',
			'click @ui.foldersList': 'onFoldersListClick',
			'keydown @ui.foldersListContainer': 'onFoldersListKeyDown',
			'click @ui.removeFolderSelection': 'onRemoveFolderSelectionClick',
			'click @ui.selectedFolderText': 'onSelectedFolderTextClick',
			'click @ui.upgradeBadge': 'onUpgradeBadgeClicked',
			'change @ui.sourceSelectionCheckboxes': 'handleSourceSelectionChange',
			'mouseenter @ui.infoIcon': 'showInfoTip',
			'mouseleave @ui.infoIcon': 'hideInfoTip',
			'mouseenter @ui.connectBadge': 'showConnectInfoTip',
			'mouseleave @ui.connectBadge': 'hideConnectInfoTip',
			'input @ui.templateNameInput': 'onTemplateNameInputChange',
		};
	},

	onRender() {
		if ( 'undefined' === typeof refractionAppConfig[ 'cloud-library' ]?.quota && this.templateHelpers()?.canSaveToCloud ) {
			refraction.templates.layout.showLoadingView();

			$e.components.get( 'cloud-library' ).utils.setQuotaConfig()
				.then( ( data ) => {
					refractionAppConfig[ 'cloud-library' ].quota = data;
				} )
				.catch( () => {
					delete refractionAppConfig[ 'cloud-library' ].quota;
				} )
				.finally( () => {
					this.handleOnRender();
					refraction.templates.layout.hideLoadingView();
				} );
		} else {
			this.handleOnRender();
		}
	},

	onDestroy() {
		this.unbindDocumentClickHandler();
	},

	handleOnRender() {
		setTimeout( () => this.ui.templateNameInput.trigger( 'focus' ) );
		const context = this.getOption( 'context' );

		refraction.templates.eventManager.sendPageViewEvent( {
			location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary[ `${ context }Modal` ],
		} );

		if ( SAVE_CONTEXTS.SAVE === context ) {
			this.handleSaveAction();
		}

		if ( SAVE_CONTEXTS.MOVE === context || SAVE_CONTEXTS.COPY === context ) {
			this.handleSingleActionContextUiState();
		}

		if ( SAVE_CONTEXTS.BULK_MOVE === context || SAVE_CONTEXTS.BULK_COPY === context ) {
			this.handleBulkActionContextUiState();
		}

		// Cloud saving was removed: the cloud promo/connect states only apply when a dialog can save to the cloud.
		if ( this.templateHelpers()?.canSaveToCloud ) {
			if ( ! refraction.templates.hasCloudLibraryQuota() ) {
				this.handleCloudLibraryPromo();
			}

			if ( this.cloudMaxCapacityReached() ) {
				this.handleCloudLibraryPromo( 'max-capacity' );
			}

			if ( ! refraction.config.library_connect.is_connected ) {
				this.handleRefractionConnect();
			}
		}

		this.bindDocumentClickHandler();
	},

	cloudMaxCapacityReached() {
		return 'undefined' !== typeof refractionAppConfig[ 'cloud-library' ]?.quota &&
			0 < refractionAppConfig[ 'cloud-library' ].quota?.threshold &&
			refractionAppConfig[ 'cloud-library' ].quota?.currentUsage >= refractionAppConfig[ 'cloud-library' ].quota?.threshold;
	},

	handleSaveAction() {
		this.maybeEnableSaveButton();
	},

	handleSingleActionContextUiState() {
		const title = this.model.get( 'title' );

		this.ui.templateNameInput.val( title );

		this.handleContextUiStateCheckboxes();

		this.maybeEnableSaveButton();
	},

	maybeEnableSaveButton() {
		if ( ! this.templateHelpers()?.canSaveToCloud ) {
			return;
		}

		const isAnyChecked = this.ui.sourceSelectionCheckboxes.is( ':checked' );

		const title = this.ui.templateNameInput.val().trim();

		const isTitleFilled = this.ui.templateNameInput.is( ':visible' )
			? refraction.templates.isTemplateTitleValid( title )
			: true;

		this.updateSubmitButtonState( ! isAnyChecked || ! isTitleFilled );
	},

	handleBulkActionContextUiState() {
		this.ui.templateNameInput.remove();
		this.handleContextUiStateCheckboxes();
		this.maybeEnableSaveButton();
	},

	handleContextUiStateCheckboxes() {
		const fromSource = refraction.templates.getFilter( 'source' );

		if ( 'local' === fromSource ) {
			this.$( '.source-selections-input #cloud' ).prop( 'checked', true );
			this.ui.localInput.addClass( 'disabled' );
		}
	},

	handleCloudLibraryPromo( stateClass = 'promotion' ) {
		if ( SAVE_CONTEXTS.SAVE === this.getOption( 'context' ) ) {
			this.$( '.source-selections-input #local' ).prop( 'checked', true );
		} else {
			this.$( '.source-selections-input #local, .source-selections-input.local label' ).css( 'pointer-events', 'none' );
		}

		this.$( '.source-selections-input #cloud' ).prop( 'checked', false );
		this.$( '.source-selections-input #cloud' ).prop( 'disabled', true );

		this.ui.cloudFormInputs.addClass( stateClass );

		refraction.templates.eventManager.sendPageViewEvent( {
			location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.saveModalSelectUpgrade,
		} );
	},

	getSaveType() {
		let type;

		if ( SAVE_CONTEXTS.MOVE === this.getOption( 'context' ) || SAVE_CONTEXTS.COPY === this.getOption( 'context' ) ) {
			type = this.model.get( 'type' );
		} else if ( this.model ) {
			type = this.model.get( 'elType' );
		} else if ( refraction.config.document.library && refraction.config.document.library.save_as_same_type ) {
			type = refraction.config.document.type;
		} else {
			type = 'page';
		}

		return type;
	},

	templateHelpers() {
		const saveType = this.getSaveType(),
			templateType = refraction.templates.getTemplateTypes( saveType ),
			saveContext = this.getOption( 'context' );

		return templateType[ `${ saveContext }Dialog` ];
	},

	onEllipsisIconKeyDown( event ) {
		if ( 'Escape' === event.key ) {
			event.preventDefault();
			if ( this.ui.foldersDropdown.is( ':visible' ) ) {
				this.hideFoldersDropdown();
				suppressEscapeKeyUp( event );
			}
			return;
		}

		if ( ( 'Tab' === event.key && ! event.shiftKey ) || 'ArrowDown' === event.key ) {
			if ( this.ui.foldersDropdown.is( ':visible' ) ) {
				event.preventDefault();
				event.stopPropagation();
				this.focusFirstFolderItem();
			}
		}
	},

	onFoldersListKeyDown( event ) {
		if ( 'Escape' === event.key ) {
			event.preventDefault();
			this.hideFoldersDropdown();
			this.ui.ellipsisIcon.trigger( 'focus' );
			suppressEscapeKeyUp( event );
			return;
		}

		if ( 'Tab' === event.key ) {
			this.handleFolderTab( event );
			return;
		}

		const $items = this.getFolderItems();

		rovingTabindex( {
			event,
			$items,
			orientation: 'vertical',
			homeEnd: false,
			onActivate: ( e, $item ) => {
				e.stopPropagation();
				$item.trigger( 'click' );
			},
		} );

		event.stopPropagation();
	},

	handleFolderTab( event ) {
		const $items = this.getFolderItems();
		const currentIndex = $items.index( event.target );

		if ( event.shiftKey ) {
			if ( currentIndex <= 0 ) {
				// Close dropdown and let the browser naturally move focus backwards.
				this.hideFoldersDropdown();
				this.ui.ellipsisIcon.trigger( 'focus' );
			} else {
				event.preventDefault();
				event.stopPropagation();
				$items.eq( currentIndex - 1 ).trigger( 'focus' );
			}
			return;
		}

		if ( currentIndex < $items.length - 1 ) {
			event.preventDefault();
			event.stopPropagation();
			$items.eq( currentIndex + 1 ).trigger( 'focus' );
		} else {
			// Close dropdown and let the browser naturally advance focus forward.
			this.hideFoldersDropdown();
			this.ui.ellipsisIcon.trigger( 'focus' );
		}
	},

	updateEllipsisAriaExpanded( expanded ) {
		this.ui.ellipsisIcon.attr( 'aria-expanded', expanded ? 'true' : 'false' );
	},

	async onFormSubmit( event ) {
		event.preventDefault();

		var formData = this.ui.form.refractionSerializeObject(),
			JSONParams = { remove: [ 'default' ] };

		formData.parentTitle = formData.parentId ? this.ui.selectedFolderText.html() : '';

		formData.content = this.model ? [ this.model.toJSON( JSONParams ) ] : refraction.elements.toJSON( JSONParams );

		this.updateSourceSelections( formData );

		if ( ! formData?.source && this.templateHelpers()?.canSaveToCloud ) {
			this.showEmptySourceErrorDialog();

			return;
		}

		this.ui.submitButton.addClass( 'refraction-button-state' );

		this.updateSaveContext( formData );

		this.updateToastConfig( formData );

		this.updateSourceState( formData );

		try {
			await $e.run( 'document/save/auto', { force: true } );
		} catch ( e ) {
			// Proceed even if auto-save fails or is rejected.
		}

		await refraction.templates.syncGlobalStylesBeforeSave();

		refraction.templates.saveTemplate( this.getSaveType(), formData );
	},

	updateSourceSelections( formData ) {
		const selectedSources = [ 'cloud', 'local' ].filter( ( type ) => formData[ type ] );

		if ( ! selectedSources.length ) {
			return;
		}

		formData.source = selectedSources;

		[ 'cloud', 'local' ].forEach( ( type ) => delete formData[ type ] );
	},

	showEmptySourceErrorDialog() {
		refractionCommon.dialogsManager.createWidget( 'alert', {
			id: 'refraction-template-library-error-dialog',
			headerMessage: __( 'An error occurred.', 'refraction' ),
			message: __( 'Please select at least one location.', 'refraction' ),
		} ).show();
	},

	updateSaveContext( formData ) {
		const saveContext = this.getOption( 'context' ) ?? SAVE_CONTEXTS.SAVE;

		formData.save_context = saveContext;

		if ( [ SAVE_CONTEXTS.MOVE, SAVE_CONTEXTS.BULK_MOVE, SAVE_CONTEXTS.COPY, SAVE_CONTEXTS.BULK_COPY ].includes( saveContext ) ) {
			formData.from_source = refraction.templates.getFilter( 'source' );
			formData.from_template_id = [ SAVE_CONTEXTS.MOVE, SAVE_CONTEXTS.COPY ].includes( saveContext )
				? this.model.get( 'template_id' )
				: Array.from( refraction.templates.getBulkSelectionItems() );
		}
	},

	updateToastConfig( formData ) {
		if ( ! formData.source?.length ) {
			return;
		}

		const lastSource = formData.source.at( -1 ),
			saveContext = this.getOption( 'context' ) ?? SAVE_CONTEXTS.SAVE,
			toastMessage = this.getToastMessage( lastSource, saveContext, formData );

		if ( ! toastMessage ) {
			return;
		}

		const toastButtons = formData.source?.length > 1
			? null
			: this.getToastButtons( lastSource, formData?.parentId?.trim(), formData?.parentTitle?.trim() );

		refraction.templates.setToastConfig( {
			show: true,
			options: {
				message: toastMessage,
				buttons: toastButtons,
				position: {
					my: 'right bottom',
					at: 'right-10 bottom-10',
					of: '#refraction-template-library-modal .dialog-lightbox-widget-content',
				},
			},
		} );
	},

	updateSourceState( formData ) {
		if ( ! formData.source?.length ) {
			return;
		}

		const saveContext = this.getOption( 'context' ) ?? SAVE_CONTEXTS.SAVE;

		if ( SAVE_CONTEXTS.SAVE !== saveContext ) {
			return;
		}

		const lastSource = formData.source.at( -1 );
		refraction.templates.setSourceSelection( lastSource );
		refraction.templates.setFilter( 'source', lastSource, true );
	},

	getToastMessage( lastSource, saveContext, formData ) {
		const key = `${ lastSource }_${ saveContext }`;

		if ( formData.source?.length > 1 ) {
			return __( 'Template saved to your Site and Cloud Templates.', 'refraction' );
		}

		const actions = {
			[ `local_${ SAVE_CONTEXTS.MOVE }` ]: this.getFormattedToastMessage( 'moved to your Site Templates', formData.title ),
			[ `cloud_${ SAVE_CONTEXTS.MOVE }` ]: this.getFormattedToastMessage( 'moved to your Cloud Templates', formData.title ),
			[ `local_${ SAVE_CONTEXTS.COPY }` ]: this.getFormattedToastMessage( 'copied to your Site Templates', formData.title ),
			[ `cloud_${ SAVE_CONTEXTS.COPY }` ]: this.getFormattedToastMessage( 'copied to your Cloud Templates', formData.title ),
			[ `local_${ SAVE_CONTEXTS.BULK_MOVE }` ]: this.getFormattedToastMessage( 'moved to your Site Templates', null, formData.from_template_id?.length ),
			[ `cloud_${ SAVE_CONTEXTS.BULK_MOVE }` ]: this.getFormattedToastMessage( 'moved to your Cloud Templates', null, formData.from_template_id?.length ),
			[ `local_${ SAVE_CONTEXTS.BULK_COPY }` ]: this.getFormattedToastMessage( 'copied to your Site Templates', null, formData.from_template_id?.length ),
			[ `cloud_${ SAVE_CONTEXTS.BULK_COPY }` ]: this.getFormattedToastMessage( 'copied to your Cloud Templates', null, formData.from_template_id?.length ),
		};

		return actions[ key ] ?? false;
	},

	getFormattedToastMessage( action, title, count ) {
		if ( count !== undefined ) {
			/* Translators: 1: Number of templates, 2: Action performed (e.g., "moved", "copied"). */
			return sprintf( __( '%1$d Template(s) %2$s.', 'refraction' ), count, action );
		}

		/* Translators: 1: Template title or "Template" fallback, 2: Action performed. */
		return sprintf( __( '%1$s %2$s.', 'refraction' ), title ? `"${ title }"` : __( 'Template', 'refraction' ), action );
	},

	getToastButtons( lastSource, parentId, parentTitle ) {
		const parsedParentId = parseInt( parentId, 10 ) || null;

		return [
			{
				name: 'template_after_save',
				text: __( 'View', 'refraction' ),
				callback: () => this.navigateToSavedSource( lastSource, parsedParentId, parentTitle ),
			},
		];
	},

	navigateToSavedSource( lastSource, parentId, parentTitle ) {
		refraction.templates.setSourceSelection( lastSource );
		refraction.templates.setFilter( 'source', lastSource, true );

		if ( parentId ) {
			const model = new TemplateLibraryTemplateModel( { template_id: parentId, title: parentTitle } );

			$e.route( 'library/view-folder', { model } );

			refraction.templates.layout.showTemplatesView( new TemplateLibraryCollection( refraction.templates.filterTemplates() ) );

			return;
		}

		$e.routes.refreshContainer( 'library' );
	},

	onSelectedFolderTextClick() {
		if ( ! this.folderCollectionView ) {
			this.onEllipsisIconClick();

			return;
		}

		if ( ! this.ui.foldersDropdown.is( ':visible' ) ) {
			this.ui.foldersDropdown.show();
		} else {
			this.hideFoldersDropdown();
		}
	},

	async onEllipsisIconClick() {
		if ( this.ui.foldersDropdown.is( ':visible' ) ) {
			this.hideFoldersDropdown();
			this.updateEllipsisAriaExpanded( false );

			return;
		}

		this.ui.foldersDropdown.show();
		this.updateEllipsisAriaExpanded( true );

		if ( ! this.folderCollectionView ) {
			this.folderCollectionView = new FolderCollectionView( {
				collection: new TemplateLibraryCollection(),
			} );

			this.addSpinner();
			this.renderFolderDropdown();

			try {
				await this.fetchFolders();
			} finally {
				this.removeSpinner();
				this.disableSelectedFolder();
				this.focusFirstFolderItem();
			}
		} else {
			this.focusFirstFolderItem();
		}

		refraction.templates.eventManager.sendPageViewEvent( {
			location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.saveModalSelectFolder,
		} );
	},

	getFolderItems() {
		// Must query the DOM fresh because the folder list is rendered dynamically
		// after the view's initial render, so this.ui.foldersList may be stale.
		return this.$( '.cloud-folder-selection-dropdown ul li:visible' );
	},

	focusFirstFolderItem() {
		const $firstItem = this.getFolderItems().first();
		if ( $firstItem.length ) {
			$firstItem.trigger( 'focus' );
		}
	},

	renderFolderDropdown() {
		this.ui.foldersListContainer.html( this.folderCollectionView.render()?.el );
	},

	addSpinner() {
		const spinner = new TemplateLibraryTemplateModel( {
			template_id: LOAD_MORE_ID,
			title: '<i class="eicon-loading eicon-animation-spin" aria-hidden="true"></i>',
		} );

		this.folderCollectionView.collection.add( spinner );
	},

	removeSpinner() {
		const spinner = this.folderCollectionView.collection.findWhere( { template_id: LOAD_MORE_ID } );

		if ( spinner ) {
			this.folderCollectionView.collection.remove( spinner );
		}
	},

	fetchFolders() {
		return new Promise( ( resolve ) => {
			const offset = this.folderCollectionView.collection.length - 1;

			const ajaxOptions = {
				data: {
					source: 'cloud',
					offset,
				},
				success: ( response ) => {
					this.folderCollectionView.collection.add( response?.templates );

					if ( this.shouldAddLoadMoreItem( response ) ) {
						this.addLoadMoreItem();
					}

					resolve( response );
				},
				error: ( error ) => {
					refraction.templates.showErrorDialog( error );

					resolve();
				},
			};

			refractionCommon.ajax.addRequest( 'get_folders', ajaxOptions );
		} );
	},

	disableSelectedFolder() {
		if ( ! SAVE_CONTEXTS.MOVE === this.getOption( 'context' ) ) {
			return;
		}

		if ( ! this.model || ! Number.isInteger( this.model.get( 'parentId' ) ) ) {
			return;
		}

		this.$( `.folder-list li[data-id="${ this.model.get( 'parentId' ) }"]` ).addClass( 'disabled' );
	},

	onFoldersListClick( event ) {
		const { id, value } = event.target.dataset;

		if ( ! id || ! value ) {
			return;
		}

		if ( this.clickedOnLoadMore( id ) ) {
			this.loadMoreFolders();

			return;
		}

		this.handleFolderSelected( id, value );
	},

	clickedOnLoadMore( templateId ) {
		return LOAD_MORE_ID === +templateId;
	},

	handleFolderSelected( id, value ) {
		this.highlightSelectedFolder( id );
		this.hideFoldersDropdown();
		this.ui.ellipsisIcon.hide();
		this.ui.selectedFolderText.html( value );
		this.ui.selectedFolder.show();
		this.ui.hiddenInputSelectedFolder.val( id );
		this.$( '.source-selections-input #cloud' ).prop( 'checked', true );
		this.maybeEnableSaveButton();
	},

	highlightSelectedFolder( id ) {
		this.clearSelectedFolder();
		this.$( `.folder-list li[data-id="${ id }"]` ).addClass( 'selected' );
	},

	clearSelectedFolder() {
		this.$( '.folder-list li.selected' ).removeClass( 'selected' );
	},

	onRemoveFolderSelectionClick() {
		this.clearSelectedFolder();
		this.ui.selectedFolderText.html( '' );
		this.ui.selectedFolder.hide();
		this.ui.ellipsisIcon.show();
		this.ui.hiddenInputSelectedFolder.val( '' );
		this.hideFoldersDropdown();
	},

	async loadMoreFolders() {
		this.removeLoadMoreItem();
		this.addSpinner();

		try {
			await this.fetchFolders();
		} finally {
			this.removeSpinner();
			this.disableSelectedFolder();
		}
	},

	shouldAddLoadMoreItem( response ) {
		return this.folderCollectionView.collection.length < response?.total;
	},

	addLoadMoreItem() {
		this.folderCollectionView.collection.add( {
			template_id: LOAD_MORE_ID,
			title: __( 'Load More', 'refraction' ),
		} );
	},

	removeLoadMoreItem() {
		const loadMore = this.folderCollectionView.collection.findWhere( { template_id: LOAD_MORE_ID } );

		if ( loadMore ) {
			this.folderCollectionView.collection.remove( loadMore );
		}
	},

	handleSourceSelectionChange( event ) {
		this.maybeAllowOnlyOneCheckboxToBeChecked( event );

		this.maybeEnableSaveButton();
	},

	maybeAllowOnlyOneCheckboxToBeChecked( event ) {
		if ( this.moreThanOneCheckboxCanBeChecked() ) {
			return;
		}

		const selectedCheckbox = event.currentTarget;

		this.ui.sourceSelectionCheckboxes.each( ( _, checkbox ) => {
			const wrapper = this.$( checkbox ).closest( '.source-selections-input' );

			if ( checkbox !== selectedCheckbox ) {
				if ( selectedCheckbox.checked ) {
					wrapper.addClass( 'disabled' );
					checkbox.checked = false;
				} else {
					wrapper.removeClass( 'disabled' );
				}
			}
		} );
	},

	moreThanOneCheckboxCanBeChecked() {
		return SAVE_CONTEXTS.SAVE === this.getOption( 'context' ) ||
			'cloud' !== refraction.templates.getFilter( 'source' );
	},

	showInfoTip() {
		if ( this.infoTipDialog ) {
			this.infoTipDialog.hide();
		}

		const message = refraction.templates.hasCloudLibraryQuota()
			? __( 'Upgrade your subscription to get more space and reuse saved assets across all your sites.', 'refraction' )
			: __( 'Upgrade your subscription to access Cloud Templates and reuse saved assets across all your sites.', 'refraction' );

		const goLink = refraction.templates.hasCloudLibraryQuota()
			? 'https://go.elementor.com/go-pro-cloud-templates-save-to-100-usage-notice'
			: 'https://go.elementor.com/go-pro-cloud-templates-save-to-free-tooltip/';

		this.infoTipDialog = refraction.dialogsManager.createWidget( 'buttons', {
			id: 'refraction-library--infotip__dialog',
			effects: {
				show: 'show',
				hide: 'hide',
			},
			position: {
				of: this.ui.infoIcon,
				at: 'top-75',
			},
		} )
			.setMessage( message )
			.addButton( {
				name: 'learn_more',
				text: __(
					'Upgrade Now',
					'refraction',
				),
				classes: '',
				callback: () => {
					open( goLink, '_blank' );
					this.onUpgradeBadgeClicked();
				},
			} );

		this.infoTipDialog.getElements( 'header' ).remove();
		this.infoTipDialog.show();
	},

	hideInfoTip() {
		if ( this.infoTipDialog ) {
			this.infoTipDialog.hide();
		}
	},

	getConnectInfoTipPosition() {
		return 'top+80';
	},

	showConnectInfoTip() {
		if ( this.connectInfoTipDialog ) {
			this.connectInfoTipDialog.hide();
		}

		this.connectInfoTipDialog = refraction.dialogsManager.createWidget( 'buttons', {
			id: 'refraction-library--connect_infotip__dialog',
			effects: {
				show: 'show',
				hide: 'hide',
			},
			position: {
				of: this.ui.connectBadge,
				at: this.getConnectInfoTipPosition(),
			},
		} )
			.setMessage(
				__(
					'To access the Cloud Templates Library you must have an active Refraction Pro subscription',
					'refraction',
				) +
				' <i>' +
				__(
					'and',
					'refraction',
				) +
				'</i> ' +
				__(
					'connect your site.',
					'refraction',
				),
			);

		this.connectInfoTipDialog.getElements( 'header' ).remove();
		this.connectInfoTipDialog.getElements( 'buttonsWrapper' ).remove();

		this.addVariantClass( this.connectInfoTipDialog.getElements( 'widget' ) );
		this.connectInfoTipDialog.show();
	},

	addVariantClass() {
		return '';
	},

	hideConnectInfoTip() {
		if ( this.connectInfoTipDialog ) {
			this.connectInfoTipDialog.hide();
		}
	},

	handleRefractionConnect() {
		refraction.templates.eventManager.sendPageViewEvent( {
			location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.saveModalSelectConnect,
		} );

		this.ui.connect.refractionConnect( {
			success: () => {
				refraction.config.library_connect.is_connected = true;

				$e.run( 'library/close' );
				refraction.notifications.showToast( {
					message: __( 'Connected successfully.', 'refraction' ),
				} );
			},
			error: () => {
				refraction.config.library_connect.is_connected = false;
			},
		} );
	},

	onTemplateNameInputChange() {
		this.maybeEnableSaveButton();
	},

	updateSubmitButtonState( shouldDisableSubmitButton ) {
		this.ui.submitButton.toggleClass( 'e-primary', ! shouldDisableSubmitButton );
		this.ui.submitButton.prop( 'disabled', shouldDisableSubmitButton );
	},

	hideFoldersDropdown() {
		this.ui.foldersDropdown.hide();
		this.updateEllipsisAriaExpanded( false );
	},

	bindDocumentClickHandler() {
		this.documentClickHandler = this.hideDropdownIfClickOutside.bind( this );
		refraction.templates.layout.modalContent.$el.on( 'click', this.documentClickHandler );
	},

	unbindDocumentClickHandler() {
		if ( ! this.documentClickHandler ) {
			return;
		}

		refraction.templates.layout.modalContent.$el.off( 'click', this.documentClickHandler );
		this.documentClickHandler = null;
	},

	hideDropdownIfClickOutside( event ) {
		if ( ! this.ui.foldersDropdown.is( ':visible' ) ) {
			return;
		}

		const target = jQuery( event.target );
		const isClickInsideDropdown = target.closest( this.ui.foldersDropdown ).length > 0;
		const isClickOnEllipsisIcon = target.closest( this.ui.ellipsisIcon ).length > 0;
		const isClickOnSelectedFolderText = target.closest( this.ui.selectedFolderText ).length > 0;

		if ( ! isClickInsideDropdown && ! isClickOnEllipsisIcon && ! isClickOnSelectedFolderText ) {
			this.hideFoldersDropdown();
		}
	},

	onUpgradeBadgeClicked() {
		const upgradePosition = refraction.templates.hasCloudLibraryQuota() ? 'save to-max' : 'save to-free';

		refraction.templates.eventManager.sendUpgradeClickedEvent( {
			secondaryLocation: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.saveModal,
			upgrade_position: upgradePosition,
		} );
	},
} );

module.exports = TemplateLibrarySaveTemplateView;
