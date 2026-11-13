import ControlsPopover from './controls-popover';

var ControlsStack;

ControlsStack = Marionette.CompositeView.extend( {
	classes: {
		popover: 'refraction-controls-popover',
	},

	activeTab: null,

	activeSection: null,

	className() {
		return 'refraction-controls-stack';
	},

	templateHelpers() {
		return {
			elementData: refraction.getElementData( this.model ),
		};
	},

	childViewOptions() {
		return {
			// TODO: elementSettingsModel is deprecated since 2.8.0.
			elementSettingsModel: this.model,
		};
	},

	ui() {
		return {
			tabs: '.refraction-panel-navigation-tab',
			reloadButton: '.refraction-update-preview-button',
		};
	},

	events() {
		return {
			'click @ui.reloadButton': 'onReloadButtonClick',
		};
	},

	modelEvents: {
		destroy: 'onModelDestroy',
	},

	behaviors: {
		HandleInnerTabs: {
			behaviorClass: require( 'refraction-behaviors/inner-tabs' ),
		},
	},

	initialize( options ) {
		this.initCollection();

		if ( options.tab ) {
			this.activeTab = options.tab;
			this.activateFirstSection();
		}

		this.listenTo( refraction.channels.deviceMode, 'change', this.onDeviceModeChange );
	},

	onDestroy() {
		this.stopListening( refraction.channels.deviceMode, 'change', this.onDeviceModeChange );
	},

	initCollection() {
		this.collection = new Backbone.Collection( _.values( refraction.mergeControlsSettings( this.getOption( 'controls' ) ) ) );
	},

	filter( controlModel ) {
		if ( controlModel.get( 'tab' ) !== this.activeTab ) {
			return false;
		}

		if ( 'section' === controlModel.get( 'type' ) ) {
			return true;
		}

		var section = controlModel.get( 'section' );

		if ( section && section !== this.activeSection ) {
			return false;
		}

		return ! this.isOtherDeviceCopy( controlModel );
	},

	/**
	 * A responsive control is copied once per screen size (desktop, tablet, mobile, the phone sizes...), and only the
	 * current size's copy is shown. Building the others made a tab with many responsive controls slow to open
	 * (Advanced > Layout: 8 copies of each), so they are built when that screen size is chosen. A copy that opens or
	 * closes a popover (a typography group) is always built, or the popover would not close.
	 *
	 * @param {Backbone.Model} controlModel
	 * @return {boolean} Whether this is another screen size's copy.
	 */
	isOtherDeviceCopy( controlModel ) {
		const responsive = controlModel.get( 'responsive' ),
			popover = controlModel.get( 'popover' );

		if ( ! responsive || ( popover && ( popover.start || popover.end ) ) ) {
			return false;
		}

		const device = responsive.max || responsive.min;

		return !! device && device !== refraction.channels.deviceMode.request( 'currentMode' );
	},

	getControlViewByModel( model ) {
		return this.children.findByModelCid( model.cid );
	},

	getControlViewByName( name ) {
		return this.getControlViewByModel( this.getControlModel( name ) );
	},

	getControlModel( name ) {
		return this.collection.findWhere( { name } );
	},

	isVisibleSectionControl( sectionControlModel ) {
		return this.activeTab === sectionControlModel.get( 'tab' );
	},

	activateTab( tab ) {
		this.activeTab = tab;

		this.activateFirstSection();

		this._renderChildren();

		return this;
	},

	activateSection( sectionName ) {
		this.activeSection = sectionName;

		return this;
	},

	activateFirstSection() {
		var self = this;

		var sectionControls = self.collection.filter( function( controlModel ) {
			return 'section' === controlModel.get( 'type' ) && self.isVisibleSectionControl( controlModel );
		} );

		let sectionToActivate;

		if ( ! sectionControls[ 0 ] ) {
			self.activeSection = null;

			sectionToActivate = null;
		} else {
			sectionToActivate = sectionControls[ 0 ].get( 'name' );
		}

		var preActivatedSection = sectionControls.filter( function( controlModel ) {
			return self.activeSection === controlModel.get( 'name' );
		} );

		if ( preActivatedSection[ 0 ] ) {
			return;
		}

		self.activateSection( sectionToActivate );

		return this;
	},

	getChildView( item ) {
		var controlType = item.get( 'type' );

		return refraction.getControlView( controlType );
	},

	getNamespaceArray() {
		return [ refraction.getPanelView().getCurrentPageName() ];
	},

	openActiveSection() {
		var activeSection = this.activeSection,
			activeSectionView = this.children.filter( function( view ) {
				return activeSection === view.model.get( 'name' );
			} );

		if ( activeSectionView[ 0 ] ) {
			activeSectionView[ 0 ].$el.addClass( 'e-open' );

			const eventNamespace = this.getNamespaceArray();

			eventNamespace.push( activeSection, 'activated' );

			refraction.channels.editor.trigger( eventNamespace.join( ':' ), this );
		}
	},

	onRenderCollection() {
		this.openActiveSection();

		ControlsStack.handlePopovers( this );
	},

	onModelDestroy() {
		this.destroy();
	},

	onReloadButtonClick() {
		refraction.reloadPreview();
	},

	onDeviceModeChange() {
		if ( 'desktop' === refraction.channels.deviceMode.request( 'currentMode' ) ) {
			this.$el.removeClass( 'refraction-responsive-switchers-open' );
		}

		// The new screen size's copies of the responsive controls (see isOtherDeviceCopy()).
		if ( this.isRendered && ! this.isDestroyed && this.activeTab ) {
			this._renderChildren();
		}
	},

	onChildviewControlSectionClicked( childView ) {
		var isSectionOpen = childView.$el.hasClass( 'e-open' );

		this.activateSection( isSectionOpen ? null : childView.model.get( 'name' ) );

		this._renderChildren();
	},

	onChildviewResponsiveSwitcherClick( childView, device ) {
		if ( 'desktop' === device ) {
			this.$el.toggleClass( 'refraction-responsive-switchers-open' );
		}
	},
}, {
	handlePopovers( view ) {
		let popover;

		this.removePopovers( view );

		view.popovers = [];

		view.children.each( ( control ) => {
			if ( popover ) {
				popover.addChild( control );
			}

			const popoverData = control.model.get( 'popover' );

			if ( ! popoverData ) {
				return;
			}

			if ( popoverData.start ) {
				popover = new ControlsPopover( control );

				view.popovers.push( popover );
			}

			if ( popoverData.end ) {
				popover = null;
			}
		} );
	},
	removePopovers( view ) {
		view.popovers?.forEach( ( popover ) => popover.destroy() );
	},
} );

export default ControlsStack;
