const TemplateLibraryTemplateLocalView = require( 'refraction-templates/views/template/local' );
const TemplateLibraryTemplateRemoteView = require( 'refraction-templates/views/template/remote' );
const TemplateLibraryTemplateCloudView = require( 'refraction-templates/views/template/cloud' );

import Select2 from 'refraction-editor-utils/select2.js';
import { rovingTabindex } from 'refraction-editor-utils/keyboard-nav';
import { SAVE_CONTEXTS, QUOTA_WARNINGS, QUOTA_BAR_STATES } from './../../constants';

const TemplateLibraryCollectionView = Marionette.CompositeView.extend( {
	tagName: 'main',

	template: '#tmpl-refraction-template-library-templates',

	id: 'refraction-template-library-templates',

	childViewContainer: '#refraction-template-library-templates-container',

	reorderOnSort: true,

	emptyView() {
		var EmptyView = require( 'refraction-templates/views/parts/templates-empty' );

		return new EmptyView();
	},

	ui: {
		textFilter: '#refraction-template-library-filter-text',
		selectFilter: '.refraction-template-library-filter-select',
		myFavoritesFilter: '#refraction-template-library-filter-my-favorites',
		orderInputs: '.refraction-template-library-order-input',
		orderLabels: 'label.refraction-template-library-order-label',
		searchInputIcon: '#refraction-template-library-filter-text-wrapper i',
		loadMoreAnchor: '#refraction-template-library-load-more-anchor',
		sourceFilterRadiogroup: '.refraction-template-library-filter-select-source',
		selectSourceFilter: '.refraction-template-library-filter-select-source .source-option',
		addNewFolder: '#refraction-template-library-add-new-folder',
		addNewFolderDivider: '.refraction-template-library-filter-toolbar-side-actions .divider',
		selectGridView: '#refraction-template-library-view-grid',
		selectListView: '#refraction-template-library-view-list',
		bulkSelectionActionBar: '.bulk-selection-action-bar',
		bulkActionBarDelete: '.bulk-selection-action-bar .bulk-delete',
		bulkSelectedCount: '.bulk-selection-action-bar .selected-count',
		bulkSelectAllCheckbox: '#bulk-select-all',
		clearBulkSelections: '.bulk-selection-action-bar .clear-bulk-selections',
		bulkMove: '.bulk-selection-action-bar .bulk-move',
		bulkCopy: '.bulk-selection-action-bar .bulk-copy',
		quota: '.quota-progress-container .quota-progress-bar',
		quotaFill: '.quota-progress-container  .quota-progress-bar .quota-progress-bar-fill',
		quotaValue: '.quota-progress-container .quota-progress-bar-value',
		quotaWarning: '.quota-progress-container .progress-bar-container .quota-warning',
		quotaUpgrade: '.quota-progress-container .progress-bar-container .quota-warning a',
		quotaStatus: '#refraction-template-library-quota-status',
		navigationContainer: '#refraction-template-library-navigation-container',
		sourceOptionBadges: '.source-option-badge.variant-b-only',
		cloudBadge: '.source-option-badge.cloud-badge',
		siteBadge: '.source-option-badge.site-badge',
		sortStatus: '#refraction-template-library-sort-status',
		loadStatus: '#refraction-template-library-load-status',
	},

	events: {
		'input @ui.textFilter': 'onTextFilterInput',
		'change @ui.selectFilter': 'onSelectFilterChange',
		'change @ui.myFavoritesFilter': 'onMyFavoritesFilterChange',
		'mousedown @ui.orderLabels': 'onOrderLabelsClick',
		'click @ui.selectSourceFilter': 'onSelectSourceFilterChange',
		'keydown @ui.selectSourceFilter': 'onSelectSourceFilterKeyDown',
		'click @ui.addNewFolder': 'onCreateNewFolderClick',
		'click @ui.selectGridView': 'onSelectGridViewClick',
		'click @ui.selectListView': 'onSelectListViewClick',
		'change @ui.bulkSelectAllCheckbox': 'onBulkSelectAllCheckbox',
		'click @ui.clearBulkSelections': 'onClearBulkSelections',
		'mouseenter @ui.bulkMove': 'onHoverBulkAction',
		'mouseenter @ui.bulkCopy': 'onHoverBulkAction',
		'click @ui.bulkMove': 'onClickBulkMove',
		'click @ui.bulkActionBarDelete': 'onBulkDeleteClick',
		'click @ui.bulkCopy': 'onClickBulkCopy',
		'click @ui.quotaUpgrade': 'onQuotaUpgradeClicked',
		'mouseenter @ui.cloudBadge': 'showCloudBadgeTooltip',
		'mouseenter @ui.siteBadge': 'showSiteBadgeTooltip',
		'mouseleave @ui.cloudBadge': 'hideCloudBadgeTooltip',
		'mouseleave @ui.siteBadge': 'hideSiteBadgeTooltip',
	},

	className: 'no-bulk-selections',

	resetQuotaBarStyles() {
		this.ui.quota.removeClass( [
			'quota-progress-bar-normal',
			'quota-progress-bar-warning',
			'quota-progress-bar-alert',
		] );
		this.ui.quotaFill.removeClass( [
			'quota-progress-bar-fill-normal',
			'quota-progress-bar-fill-warning',
			'quota-progress-bar-fill-alert',
		] );
	},

	setQuotaBarStyles( variant ) {
		this.ui.quota.addClass( `quota-progress-bar-${ variant }` );
		this.ui.quotaFill.addClass( `quota-progress-bar-fill-${ variant }` );
	},

	handleQuotaWarning( variant, quotaUsage ) {
		const message = QUOTA_WARNINGS[ variant ];

		if ( ! message ) {
			return;
		}

		this.ui.quotaWarning.html( sprintf( message, quotaUsage ) );
		this.ui.quotaWarning.show();
	},

	handleQuotaBar() {
		const quota = refractionAppConfig?.[ 'cloud-library' ]?.quota;

		const value = quota ? Math.round( ( quota.currentUsage / quota.threshold ) * 100 ) : 0;

		this.ui.quotaFill.css( 'width', `${ value }%` );

		this.ui.quotaValue.text( `${ quota?.currentUsage?.toLocaleString() }/${ quota?.threshold?.toLocaleString() }` );

		this.ui.quotaWarning.hide();

		this.resetQuotaBarStyles();

		const quotaState = this.resolveQuotaState( value );

		this.handleQuotaWarning( quotaState, value );

		this.setQuotaBarStyles( quotaState );

		if ( this.ui.quota.length ) {
			this.ui.quota.attr( {
				'aria-valuenow': value,
			} );
		}

		if ( quota && this.ui.quotaStatus.length ) {
			// Translators: %1$s: current usage number, %2$s: threshold number
			const statusText = sprintf(
				// Translators: %1$s: current usage number, %2$s: threshold number
				__( '%1$s of %2$s templates used', 'refraction' ),
				quota.currentUsage.toLocaleString(),
				quota.threshold.toLocaleString(),
			);
			this.ui.quotaStatus.text( statusText );
		}
	},

	resolveQuotaState( value ) {
		if ( value < 80 ) {
			return QUOTA_BAR_STATES.NORMAL;
		} else if ( value < 100 ) {
			return QUOTA_BAR_STATES.WARNING;
		}

		return QUOTA_BAR_STATES.ALERT;
	},

	onClearBulkSelections() {
		refraction.templates.clearBulkSelectionItems();
		refraction.templates.layout.handleBulkActionBar();
		refraction.templates.layout.selectAllCheckboxNormal();
		this.deselectAllBulkItems();
	},

	deselectAllBulkItems() {
		if ( 'list' === refraction.templates.getViewSelection() || 'local' === refraction.templates.getFilter( 'source' ) ) {
			this.ui.bulkSelectAllCheckbox.prop( 'checked', false ).trigger( 'change' );
		} else {
			document.querySelectorAll( '.bulk-selected-item' ).forEach( function( item ) {
				item.classList.remove( 'bulk-selected-item' );
				item.setAttribute( 'aria-selected', 'false' );
				item.setAttribute( 'tabindex', '-1' );

				const checkbox = item.querySelector( '.bulk-selection-item-checkbox' );
				if ( checkbox ) {
					checkbox.checked = false;
					checkbox.setAttribute( 'aria-checked', 'false' );
				}
			} );
		}
	},

	onBulkSelectAllCheckbox() {
		const isChecked = this.$( '#bulk-select-all:checked' ).length > 0;

		if ( isChecked ) {
			refraction.templates.layout.selectAllCheckboxNormal();
		}

		this.updateBulkSelectedItems( isChecked );

		refraction.templates.layout.handleBulkActionBarUi();
	},

	updateBulkSelectedItems( isChecked ) {
		document.querySelectorAll( '.bulk-selection-item-checkbox' ).forEach( function( checkbox ) {
			checkbox.checked = isChecked;
			checkbox.setAttribute( 'aria-checked', String( isChecked ) );

			const templateId = checkbox.dataset.template_id;
			const type = checkbox.dataset.type;
			const parentDiv = checkbox.closest( '.refraction-template-library-template' );

			if ( isChecked ) {
				refraction.templates.addBulkSelectionItem( templateId, type );
				parentDiv?.classList.add( 'bulk-selected-item' );
			} else {
				refraction.templates.removeBulkSelectionItem( templateId, type );
				parentDiv?.classList.remove( 'bulk-selected-item' );
			}

			if ( parentDiv ) {
				parentDiv.setAttribute( 'aria-selected', String( isChecked ) );
				parentDiv.setAttribute( 'tabindex', isChecked ? '0' : '-1' );
			}
		} );
	},

	onBulkDeleteClick() {
		this.ui.bulkActionBarDelete.toggleClass( 'disabled' );

		refraction.templates.onBulkDeleteClick()
			.finally( () => {
				this.ui.bulkActionBarDelete.toggleClass( 'disabled' );
				refraction.templates.layout.handleBulkActionBar();
			} );
	},

	comparators: {
		title( model ) {
			return model.get( 'title' ).toLowerCase();
		},
		popularityIndex( model ) {
			var popularityIndex = model.get( 'popularityIndex' );

			if ( ! popularityIndex ) {
				popularityIndex = model.get( 'date' );
			}

			return -popularityIndex;
		},
		trendIndex( model ) {
			var trendIndex = model.get( 'trendIndex' );

			if ( ! trendIndex ) {
				trendIndex = model.get( 'date' );
			}

			return -trendIndex;
		},
	},

	getChildView( childModel ) {
		const sourceMappings = {
			local: TemplateLibraryTemplateLocalView,
			remote: TemplateLibraryTemplateRemoteView,
			cloud: TemplateLibraryTemplateCloudView,
		};

		const activeSource = childModel.get( 'source' ) ? childModel.get( 'source' ) : 'local';

		/**
		 * Filter template source.
		 *
		 * @param bool   isRemote     - If `true` the source is a remote source.
		 * @param string activeSource - The current template source.
		 */
		const isRemote = refraction.hooks.applyFilters( 'templates/source/is-remote', 'remote' === activeSource, activeSource );

		return isRemote
			? TemplateLibraryTemplateRemoteView
			: sourceMappings[ activeSource ] || TemplateLibraryTemplateLocalView;
	},

	initialize() {
		this.handleQuotaBar = this.handleQuotaBar.bind( this );
		this.handleQuotaUpdate = this.handleQuotaUpdate.bind( this );
		this.handleSourceFilterChange = this.handleSourceFilterChange.bind( this );
		this.listenTo( refraction.channels.templates, 'filter:change', this._renderChildren );
		this.listenTo( refraction.channels.templates, 'filter:change', this.handleSourceOptionBadges );
		this.listenTo( refraction.channels.templates, 'filter:change', this.handleSourceFilterChange );
		this.listenTo( refraction.channels.templates, 'quota:updated', this.handleQuotaUpdate );
		this.debouncedSearchTemplates = _.debounce( this.searchTemplates, 300 );
	},

	handleQuotaUpdate() {
		const activeSource = refraction.templates.getFilter( 'source' ) ?? 'local';

		if ( 'cloud' === activeSource ) {
			$e.components.get( 'cloud-library' )?.utils.getQuotaConfig()
				.then( () => {
					this.handleQuotaBar();
				} );
		}
	},

	handleSourceFilterChange( filterName ) {
		if ( 'source' === filterName ) {
			const activeSource = refraction.templates.getFilter( 'source' ) ?? 'local';
			this.updateSourceFilterAriaAttributes( activeSource );
		}
	},

	updateSourceFilterAriaAttributes( selectedSource ) {
		if ( ! this.ui.selectSourceFilter.length ) {
			return;
		}

		this.ui.selectSourceFilter.each( function() {
			const $option = jQuery( this ),
				source = $option.data( 'source' ),
				isSelected = source === selectedSource;

			$option.attr( {
				'aria-checked': isSelected ? 'true' : 'false',
				tabindex: isSelected ? '0' : '-1',
			} );
		} );
	},

	filter( childModel ) {
		const activeSource = refraction.templates.getFilter( 'source' );

		if ( 'cloud' === activeSource ) {
			return true; // Filtering happens on the backend.
		}

		var filterTerms = refraction.templates.getFilterTerms(),
			passingFilter = true;

		jQuery.each( filterTerms, function( filterTermName ) {
			var filterValue = refraction.templates.getFilter( filterTermName );

			if ( ! filterValue ) {
				return;
			}

			if ( this.callback ) {
				var callbackResult = this.callback.call( childModel, filterValue );

				if ( ! callbackResult ) {
					passingFilter = false;
				}

				return callbackResult;
			}

			var filterResult = filterValue === childModel.get( filterTermName );

			if ( ! filterResult ) {
				passingFilter = false;
			}

			return filterResult;
		} );

		return passingFilter;
	},

	order( by, reverseOrder ) {
		let comparator = this.comparators[ by ] || by;

		if ( 'cloud' === refraction.templates.getFilter( 'source' ) ) {
			this.handleCloudOrder( by, reverseOrder );

			return;
		}

		if ( reverseOrder ) {
			comparator = this.reverseOrder( comparator );
		}

		this.collection.comparator = comparator;

		this.collection.sort();

		this.announceSortStatus( by, reverseOrder );
	},

	announceSortStatus( by, reverseOrder ) {
		const orderLabels = {
			title: __( 'Name', 'refraction' ),
			type: __( 'Type', 'refraction' ),
			author: __( 'Created By', 'refraction' ),
			date: __( 'Creation Date', 'refraction' ),
		};

		const orderDirection = reverseOrder ? __( 'descending', 'refraction' ) : __( 'ascending', 'refraction' );
		const sortLabel = orderLabels[ by ] || by;
		const message = __( 'Sorted by', 'refraction' ) + ' ' + sortLabel + ', ' + orderDirection;

		if ( this.ui.sortStatus.length ) {
			this.ui.sortStatus.text( message );
		}
	},

	announceLoadStatus( count ) {
		const message = count + ' ' + __( 'more templates loaded', 'refraction' );

		if ( this.ui.loadStatus.length ) {
			this.ui.loadStatus.text( message );
		}
	},

	handleCloudOrder( by, reverseOrder ) {
		refraction.templates.setFilter( 'orderby', by );
		refraction.templates.setFilter( 'order', reverseOrder ? 'desc' : 'asc' );

		this.onClearBulkSelections();

		this.collection.reset();

		refraction.templates.layout.showLoadingView();

		refraction.templates.loadMore( {
			onUpdate: () => {
				refraction.templates.layout.hideLoadingView();
				this.announceSortStatus( by, reverseOrder );
			},
			search: this.ui.textFilter.val(),
			refresh: true,
		} );
	},

	reverseOrder( comparator ) {
		if ( 'function' !== typeof comparator ) {
			var comparatorValue = comparator;

			comparator = function( model ) {
				return model.get( comparatorValue );
			};
		}

		return function( left, right ) {
			const l = comparator( left );

			if ( undefined === l ) {
				return -1;
			}

			const r = comparator( right );
			if ( undefined === r ) {
				return 1;
			}

			if ( l < r ) {
				return 1;
			}
			if ( l > r ) {
				return -1;
			}
			return 0;
		};
	},

	addSourceData() {
		var isEmpty = this.children.isEmpty();

		this.$el.attr( 'data-template-source', isEmpty ? 'empty' : refraction.templates.getFilter( 'source' ) );
	},

	addViewData() {
		const view = refraction.templates.getViewSelection();

		this.$el.attr( 'data-template-view', view );
	},

	setFiltersUI() {
		if ( ! this.select2Instance && this.$( this.ui.selectFilter ).length ) {
			const $filters = this.$( this.ui.selectFilter ),
				select2Options = {
					placeholder: __( 'Category', 'refraction' ),
					allowClear: true,
					width: 150,
					dropdownParent: this.$el,
				};

			this.select2Instance = new Select2( {
				$element: $filters,
				options: select2Options,
			} );
		}
	},

	setMasonrySkin() {
		var masonry = new refractionModules.utils.Masonry( {
			container: this.$childViewContainer,
			items: this.$childViewContainer.children(),
		} );

		this.$childViewContainer.imagesLoaded( masonry.run.bind( masonry ) );
	},

	toggleFilterClass() {
		this.$el.toggleClass( 'refraction-templates-filter-active', ! ! ( refraction.templates.getFilter( 'text' ) || refraction.templates.getFilter( 'favorite' ) ) );
	},

	isPageOrLandingPageTemplates() {
		const templatesType = refraction.templates.getFilter( 'type' );

		return 'page' === templatesType || 'lp' === templatesType;
	},

	onDestroy() {
		if ( this.removeScrollListener ) {
			this.removeScrollListener();
		}
	},

	async shouldShowVariantB() {
		const experimentVariant = await refraction.templates.eventManager.getSaveTemplateExperimentVariant();
		return 'B' === experimentVariant;
	},

	async handleSourceOptionBadges() {
		const shouldShow = await this.shouldShowVariantB();

		if ( ! shouldShow ) {
			this.ui.sourceOptionBadges.hide();
			return;
		}

		const activeSource = refraction.templates.getFilter( 'source' );

		this.$( '.source-option-badge.site-badge' ).toggle( 'local' === activeSource );
		this.$( '.source-option-badge.cloud-badge' ).toggle( 'cloud' === activeSource );
	},

	onRender() {
		refraction.templates.clearBulkSelectionItems();
		const activeSource = refraction.templates.getFilter( 'source' );
		const templateType = refraction.templates.getFilter( 'type' );

		if ( 'remote' === activeSource && 'page' !== templateType && 'lb' !== templateType ) {
			this.setFiltersUI();
		}

		if ( 'cloud' === activeSource ) {
			const isFolderView = refraction.templates.getFilter( 'parentId' );
			const location = isFolderView
				? refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.cloudTabFolder
				: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.cloudTab;

			refraction.templates.eventManager.sendPageViewEvent( { location } );

			this.handleQuotaBar();
		}

		if ( 'local' === activeSource ) {
			refraction.templates.eventManager.sendPageViewEvent( {
				location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.siteTab,
			} );
		}

		this.handleSourceOptionBadges();
	},

	onRenderCollection() {
		this.addSourceData();

		this.toggleFilterClass();

		const activeSource = refraction.templates.getFilter( 'source' );

		if ( 'remote' === activeSource && ! this.isPageOrLandingPageTemplates() ) {
			this.setMasonrySkin();
		}

		if ( 'cloud' === activeSource ) {
			this.handleLoadMore();

			this.addViewData();

			this.handleQuotaUpdate();
		}

		this.handleSourceOptionBadges();
	},

	onBeforeRenderEmpty() {
		this.addSourceData();
	},

	onTextFilterInput() {
		const activeSource = refraction.templates.getFilter( 'source' );

		if ( [ 'cloud', 'local' ].includes( activeSource ) ) {
			refraction.templates.clearBulkSelectionItems();
			refraction.templates.layout.handleBulkActionBar();
		}

		if ( 'cloud' === activeSource ) {
			this.debouncedSearchTemplates( activeSource );
			return;
		}

		refraction.templates.setFilter( 'text', this.ui.textFilter.val() );
	},

	async searchTemplates( source ) {
		this.showLoadingSpinner();

		try {
			await refraction.templates.searchTemplates( {
				source,
				search: this.ui.textFilter.val(),
			} );
		} finally {
			this.showSearchIcon();
		}
	},

	showLoadingSpinner() {
		this.ui.searchInputIcon.removeClass( 'eicon-search' ).addClass( 'eicon-loading eicon-animation-spin' );
	},

	showSearchIcon() {
		this.ui.searchInputIcon.removeClass( 'eicon-loading eicon-animation-spin' ).addClass( 'eicon-search' );
	},

	onSelectFilterChange( event ) {
		var $select = jQuery( event.currentTarget ),
			filterName = $select.data( 'refraction-filter' );

		refraction.templates.setFilter( filterName, $select.val() );
	},

	onSelectSourceFilterChange( event ) {
		refraction.templates.onSelectSourceFilterChange( event );
	},

	onSelectSourceFilterKeyDown( event ) {
		const handled = rovingTabindex( {
			event,
			$items: this.ui.selectSourceFilter,
			orientation: 'both',
			activateOnFocus: true,
			homeEnd: false,
			onActivate: ( e, $item ) => {
				this._restoreFocusToSourceFilter = true;
				$item.trigger( 'click' );
			},
		} );

		if ( handled ) {
			this._restoreFocusToSourceFilter = true;
		}
	},

	onSelectGridViewClick() {
		refraction.templates.onSelectViewChange( 'grid' );
	},

	onSelectListViewClick() {
		refraction.templates.onSelectViewChange( 'list' );
	},

	onMyFavoritesFilterChange() {
		refraction.templates.setFilter( 'favorite', this.ui.myFavoritesFilter[ 0 ].checked );
	},

	onOrderLabelsClick( event ) {
		const $clickedInput = jQuery( event.currentTarget.control );
		let toggle;

		if ( ! $clickedInput[ 0 ].checked ) {
			toggle = 'asc' !== $clickedInput.data( 'default-ordering-direction' );
		} else {
			toggle = ! $clickedInput.hasClass( 'refraction-template-library-order-reverse' );
		}

		$clickedInput.prop( 'checked', true );

		$clickedInput.toggleClass( 'refraction-template-library-order-reverse', toggle );

		this.order( $clickedInput.val(), toggle );
	},

	handleLoadMore() {
		if ( this.removeScrollListener ) {
			this.removeScrollListener();
		}

		const scrollableContainer = refraction?.templates?.layout?.modal.getElements( 'message' );

		const listener = () => {
			const scrollTop = scrollableContainer.scrollTop();
			const scrollHeight = scrollableContainer[ 0 ].scrollHeight;
			const clientHeight = scrollableContainer.outerHeight();

			const scrollPercentage = ( scrollTop / ( scrollHeight - clientHeight ) ) * 100;

			const canLoadMore = refraction.templates.canLoadMore() && ! refraction.templates.isLoading();

			if ( scrollPercentage < 90 || ! canLoadMore ) {
				return;
			}

			this.ui.loadMoreAnchor.toggleClass( 'refraction-visibility-hidden' );
			refraction.templates.layout.selectAllCheckboxMinus();

			const previousCount = this.collection.length;

			refraction.templates.loadMore( {
				onUpdate: () => {
					this.ui.loadMoreAnchor.toggleClass( 'refraction-visibility-hidden' );
					const newCount = this.collection.length;
					const loadedCount = newCount - previousCount;
					if ( loadedCount > 0 ) {
						this.announceLoadStatus( loadedCount );
					}
				},
				search: this.ui.textFilter.val(),
			} );
		};

		scrollableContainer.on( 'scroll', listener );

		// QA #13: Also trigger load-more when keyboard focus reaches the last few items
		const focusListener = ( event ) => {
			const canLoadMore = refraction.templates.canLoadMore() && ! refraction.templates.isLoading();

			if ( ! canLoadMore ) {
				return;
			}

			if ( ! this.$childViewContainer || ! this.$childViewContainer.length ) {
				return;
			}

			const $children = this.$childViewContainer.children();
			const totalChildren = $children.length;

			if ( totalChildren < 2 ) {
				return;
			}

			// Check if focus target is within one of the last 2 template items
			const $target = jQuery( event.target );
			const focusedIndex = $children.index( $target.closest( $children ) );

			if ( focusedIndex >= totalChildren - 2 ) {
				this.ui.loadMoreAnchor.toggleClass( 'refraction-visibility-hidden' );
				refraction.templates.layout.selectAllCheckboxMinus();

				const previousCount = this.collection.length;

				refraction.templates.loadMore( {
					onUpdate: () => {
						this.ui.loadMoreAnchor.toggleClass( 'refraction-visibility-hidden' );
						const newCount = this.collection.length;
						const loadedCount = newCount - previousCount;
						if ( loadedCount > 0 ) {
							this.announceLoadStatus( loadedCount );
						}
					},
					search: this.ui.textFilter.val(),
				} );
			}
		};

		scrollableContainer.on( 'focusin', focusListener );

		this.removeScrollListener = () => {
			scrollableContainer.off( 'scroll', listener );
			scrollableContainer.off( 'focusin', focusListener );
		};
	},

	onCreateNewFolderClick() {
		const activeSource = refraction.templates.getFilter( 'source' );

		if ( 'cloud' !== activeSource ) {
			return;
		}

		refraction.templates.createFolder( {
			source: activeSource,
		},
		{
			onSuccess: () => {
				$e.routes.refreshContainer( 'library' );
			},
		} );
	},

	onHoverBulkAction() {
		if ( this.hasFolderInBulkSelection() || this.hasLockedTemplatesInBulkSelection() ) {
			this.ui.bulkMove.find( 'i' ).css( 'cursor', 'not-allowed' );
			this.ui.bulkCopy.find( 'i' ).css( 'cursor', 'not-allowed' );
		} else {
			this.ui.bulkMove.find( 'i' ).css( 'cursor', 'pointer' );
			this.ui.bulkCopy.find( 'i' ).css( 'cursor', 'pointer' );
		}
	},

	onClickBulkMove() {
		if ( this.hasFolderInBulkSelection() || this.hasLockedTemplatesInBulkSelection() ) {
			return;
		}

		$e.route( 'library/save-template', {
			model: this.model,
			context: SAVE_CONTEXTS.BULK_MOVE,
		} );
	},

	hasFolderInBulkSelection() {
		const bulkSelectedItems = refraction.templates.getBulkSelectionItems();

		return this.collection.some( ( model ) => {
			const templateId = model.get( 'template_id' );
			const type = model.get( 'type' );

			return bulkSelectedItems.has( templateId ) && 'folder' === type;
		} );
	},

	hasLockedTemplatesInBulkSelection() {
		const bulkSelectedItems = refraction.templates.getBulkSelectionItems();

		return this.collection.some( ( model ) => {
			const templateId = model.get( 'template_id' );

			return bulkSelectedItems.has( templateId ) && model.isLocked();
		} );
	},

	onClickBulkCopy() {
		if ( this.hasFolderInBulkSelection() || this.hasLockedTemplatesInBulkSelection() ) {
			return;
		}

		$e.route( 'library/save-template', {
			model: this.model,
			context: SAVE_CONTEXTS.BULK_COPY,
		} );
	},

	onQuotaUpgradeClicked() {
		const quota = refractionAppConfig?.[ 'cloud-library' ]?.quota;

		const value = quota ? Math.round( ( quota.currentUsage / quota.threshold ) * 100 ) : 0;

		refraction.templates.eventManager.sendUpgradeClickedEvent( {
			secondaryLocation: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.quotaBar,
			upgrade_position: `quota bar ${ value ? value + '%' : '' }`,
		} );
	},

	showCloudBadgeTooltip() {
		if ( this.cloudBadgeDialog ) {
			this.cloudBadgeDialog.hide();
		}

		const emailReplacement = refraction.config.library_connect.is_connected ? refraction.config.library_connect.user_email : __( 'connected', 'refraction' );
		/* Translators: %s: User's email. */
		const message = sprintf( __( 'Only %s Refraction account can access Cloud Templates from any connected site.', 'refraction' ), emailReplacement );

		this.cloudBadgeDialog = refraction.dialogsManager.createWidget( 'buttons', {
			id: 'refraction-library--cloud-upgrade__dialog',
			effects: {
				show: 'show',
				hide: 'hide',
			},
			position: {
				of: this.ui.cloudBadge,
				at: 'top-50',
			},
		} )
			.setMessage( message );

		this.cloudBadgeDialog.getElements( 'widget' ).addClass( 'variant-b' );
		this.cloudBadgeDialog.getElements( 'header' ).remove();
		this.cloudBadgeDialog.getElements( 'buttonsWrapper' ).remove();
		this.cloudBadgeDialog.show();
	},

	hideCloudBadgeTooltip() {
		if ( this.cloudBadgeDialog ) {
			this.cloudBadgeDialog.hide();
		}
	},

	showSiteBadgeTooltip() {
		if ( this.siteBadgeDialog ) {
			this.siteBadgeDialog.hide();
		}

		const message = __( 'Authorized users on this site can access Site Templates.', 'refraction' );

		this.siteBadgeDialog = refraction.dialogsManager.createWidget( 'buttons', {
			id: 'refraction-library--site-info__dialog',
			effects: {
				show: 'show',
				hide: 'hide',
			},
			position: {
				of: this.ui.siteBadge,
				at: 'top-35',
			},
		} )
			.setMessage( message );

		this.siteBadgeDialog.getElements( 'widget' ).addClass( 'variant-b' );
		this.siteBadgeDialog.getElements( 'header' ).remove();
		this.siteBadgeDialog.getElements( 'buttonsWrapper' ).remove();
		this.siteBadgeDialog.show();
	},

	hideSiteBadgeTooltip() {
		if ( this.siteBadgeDialog ) {
			this.siteBadgeDialog.hide();
		}
	},
} );

module.exports = TemplateLibraryCollectionView;
