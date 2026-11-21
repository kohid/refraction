var ControlsStack = refractionModules.editor.views.ControlsStack,
	EditorView;

// The group shown in each long section (per element type and section), for as long as the editor is open.
const shownGroups = new Map();

// A section gets group tabs when it has at least this many top-level settings (and two groups or more).
const GROUP_MIN_CONTROLS = 12;

EditorView = ControlsStack.extend( {
	template: Marionette.TemplateCache.get( '#tmpl-editor-content' ),

	id: 'refraction-panel-page-editor',

	childViewContainer: '#refraction-controls',

	childViewOptions() {
		return {
			element: this.getOption( 'editedElementView' ),
			container: this.getOption( 'editedElementView' ).getContainer(),
			// TODO: elementSettingsModel is deprecated since 2.8.0.
			elementSettingsModel: this.model.get( 'settings' ),

			elementEditSettings: this.model.get( 'editSettings' ),
		};
	},

	getNamespaceArray() {
		var eventNamespace = refractionModules.editor.views.ControlsStack.prototype.getNamespaceArray();

		const model = this.getOption( 'editedElementView' ).getEditModel(),
			currentElementType = model.get( 'elType' );

		// Element Type: section / column / widget.
		eventNamespace.push( currentElementType );

		if ( 'widget' === currentElementType ) {
			// Widget Type: heading / button and etc.
			eventNamespace.push( model.get( 'widgetType' ) );
		}

		return eventNamespace;
	},

	initialize() {
		ControlsStack.prototype.initialize.apply( this, arguments );

		this.listenTo( this.model.get( 'settings' ), 'change', this.onSettingsChangeForConditions );

		const editSettings = this.model.get( 'editSettings' );

		if ( editSettings ) {
			const panelSettings = editSettings.get( 'panel' );

			if ( panelSettings ) {
				this.activeTab = panelSettings.activeTab;

				this.activeSection = panelSettings.activeSection;
			}
		}
	},

	activateSection() {
		ControlsStack.prototype.activateSection.apply( this, arguments );

		this.model.get( 'editSettings' ).set( 'panel', {
			activeTab: this.activeTab,
			activeSection: this.activeSection,
		} );

		return this;
	},

	openActiveSection() {
		ControlsStack.prototype.openActiveSection.apply( this, arguments );

		refraction.channels.editor.trigger( 'section:activated', this.activeSection, this );
	},

	onRenderCollection() {
		ControlsStack.prototype.onRenderCollection.apply( this, arguments );

		this.groupSection();
		this.renderDeviceStrip();
		this.markDeviceControls();
	},

	/**
	 * Which screen size the settings being changed are for (0.131.0): a strip under the tabs names the view chosen in
	 * the top bar (its width and name), says what a change there does, and on a smaller view offers the way back to
	 * Desktop. The strip takes the accent colour on any view but Desktop.
	 */
	renderDeviceStrip() {
		const device = refraction.channels.deviceMode.request( 'currentMode' ) || 'desktop',
			breakpoint = refraction.config.responsive.activeBreakpoints[ device ],
			icon = refraction.config.responsive.icons_map?.[ device ] || 'rficon-device-desktop',
			isDesktop = 'desktop' === device,
			width = isDesktop || ! breakpoint || 'widescreen' === device ? '' : breakpoint.value + 'px',
			name = isDesktop ? __( 'Desktop', 'refraction' ) : breakpoint?.label || device;

		this.$el.children( '.rf-device-strip' ).remove();

		const $strip = jQuery( '<div>', { class: 'rf-device-strip' + ( isDesktop ? '' : ' is-device' ), 'data-device': device, role: 'status' } );
		const $head = jQuery( '<div>', { class: 'rf-device-strip__head' } ).append(
			jQuery( '<i>', { class: icon + ' rf-device-strip__icon', 'aria-hidden': 'true' } ),
			jQuery( '<span>', { class: 'rf-device-strip__view', text: width || name } ),
			width ? jQuery( '<span>', { class: 'rf-device-strip__name', text: name } ) : null,
		);

		if ( ! isDesktop ) {
			jQuery( '<button>', { type: 'button', class: 'rf-device-strip__back', text: __( 'Desktop', 'refraction' ) } )
				.attr( 'aria-label', __( 'Back to Desktop', 'refraction' ) )
				.on( 'click', () => refraction.changeDeviceMode( 'desktop' ) )
				.appendTo( $head );
		}

		// Translators: %s: A screen width, for example 430px.
		const deviceNote = __( 'Settings marked with the device icon change at %s and smaller screens only. Empty ones use the next larger view\'s value, shown in grey.', 'refraction' ),
			note = isDesktop ? __( 'Changes here show on every screen size that has no value of its own.', 'refraction' ) : wp.i18n.sprintf( deviceNote, width || name );

		$strip.append( $head, jQuery( '<p>', { class: 'rf-device-strip__note', text: note } ) );

		const $nav = this.$el.children( '.refraction-panel-navigation' );

		if ( $nav.length ) {
			$nav.after( $strip );
		} else {
			this.$el.prepend( $strip );
		}
	},

	/**
	 * Marks the settings of the view being edited: a per-screen setting that has its own value on this view (not
	 * inherited from a larger one) gets a dot by its device icon, and a popover row (Typography, Rotate, Scale,
	 * Shadow...) whose settings are per screen gets the view's device icon, with the dot when any of them is set here.
	 */
	markDeviceControls() {
		if ( this.isDestroyed || ! this.isRendered ) {
			return;
		}

		const device = refraction.channels.deviceMode.request( 'currentMode' ) || 'desktop',
			isDesktop = 'desktop' === device,
			settings = this.model.get( 'settings' ),
			icon = refraction.config.responsive.icons_map?.[ device ] || 'rficon-device-desktop',
			models = this.collection.models,
			copyOf = ( model ) => {
				const responsive = model.get( 'responsive' );

				return responsive ? responsive.max || responsive.min || 'desktop' : '';
			},
			hasOwn = ( model ) => ! isDesktop && device === copyOf( model ) && this.hasValue( settings.get( model.get( 'name' ) ) );

		this.children.each( ( view ) => {
			const model = view.model;

			if ( copyOf( model ) ) {
				view.$el.toggleClass( 'rf-own-value', hasOwn( model ) );

				return;
			}

			if ( 'popover_toggle' !== model.get( 'type' ) ) {
				return;
			}

			const inside = [];

			for ( let i = models.indexOf( model ) + 1; i < models.length; i++ ) {
				inside.push( models[ i ] );

				if ( models[ i ].get( 'popover' )?.end ) {
					break;
				}
			}

			const perDevice = inside.some( ( m ) => copyOf( m ) ),
				$title = view.$el.find( '.refraction-control-title' ).first();

			$title.find( '.rf-device-mark' ).remove();
			view.$el.toggleClass( 'rf-own-value', perDevice && inside.some( hasOwn ) );

			if ( perDevice ) {
				$title.append( jQuery( '<i>', { class: icon + ' rf-device-mark', 'aria-hidden': 'true', title: __( 'Set per screen size', 'refraction' ) } ) );
			}
		} );
	},

	hasValue( value ) {
		const plain = value && value.toJSON ? value.toJSON() : value;

		if ( plain && 'object' === typeof plain ) {
			return Object.entries( plain ).some( ( [ key, part ] ) => ! [ 'unit', 'isLinked', 'sizes' ].includes( key ) && '' !== part && null !== part && undefined !== part && ! ( Array.isArray( part ) && ! part.length ) );
		}

		return '' !== plain && null !== plain && undefined !== plain;
	},

	/**
	 * A long section is split by its headings ("Step Icon", "Progress Bar"...) into groups: General (the settings
	 * before the first heading) and one per heading. Since 0.104.0 they are an accordion: each group has a header row
	 * in place, one group is open at a time (clicking the open one closes it), so the only tabs left in the panel are
	 * the state tabs (Normal / Hover / Active...). Only sections with GROUP_MIN_CONTROLS or more top-level settings that
	 * make at least two groups; headings inside inner tabs or popovers do not split. The group open is kept per element
	 * type and section.
	 */
	groupSection() {
		const $container = this.$childViewContainer || this.$el;

		$container.find( '.rf-section-groups' ).remove();
		$container.find( '.rf-group-off, .rf-group-heading' ).removeClass( 'rf-group-off rf-group-heading' );

		if ( ! this.activeSection ) {
			return;
		}

		const views = this.collection
			.filter( ( model ) => this.activeSection === model.get( 'section' ) && 'section' !== model.get( 'type' ) )
			.map( ( model ) => this.children.findByModelCid( model.cid ) )
			.filter( ( view ) => view && ! view.$el.closest( '.refraction-controls-popover' ).length );
		const isSplit = ( view ) => 'heading' === view.model.get( 'type' ) && ! view.model.get( 'tabs_wrapper' );
		const groups = [ { label: __( 'General', 'refraction' ), views: [] } ];

		views.forEach( ( view ) => {
			if ( isSplit( view ) ) {
				groups.push( { label: jQuery( '<div>' ).html( view.model.get( 'label' ) || '' ).text().trim() || __( 'More', 'refraction' ), views: [ view ], heading: view } );
			} else {
				groups[ groups.length - 1 ].views.push( view );
			}
		} );

		const used = groups.filter( ( group ) => group.views.some( ( view ) => view !== group.heading ) );

		if ( used.length < 2 || views.length < GROUP_MIN_CONTROLS ) {
			return;
		}

		const key = this.getNamespaceArray().join( ':' ) + '|' + this.activeSection;
		const stored = shownGroups.has( key ) ? shownGroups.get( key ) : 0;
		const active = stored < 0 ? -1 : Math.min( stored, used.length - 1 );

		used.forEach( ( group, index ) => {
			const open = index === active;
			const $head = jQuery( '<div>', { class: 'rf-section-groups rf-acc' + ( open ? ' is-open' : '' ) } );

			jQuery( '<button>', { type: 'button', class: 'rf-section-groups__tab rf-acc__head', 'aria-expanded': open ? 'true' : 'false' } )
				.toggleClass( 'is-active', open )
				.append( jQuery( '<span>', { class: 'rf-acc__label', text: group.label } ), jQuery( '<i>', { class: 'rf-acc__chevron', 'aria-hidden': 'true' } ) )
				.on( 'click', () => {
					shownGroups.set( key, open ? -1 : index );
					this.groupSection();
				} )
				.appendTo( $head );

			group.views[ 0 ].$el.before( $head );

			group.views.forEach( ( view ) => {
				view.$el.toggleClass( 'rf-group-off', ! open );
				// The header names the group: its heading is not repeated under it.
				view.$el.toggleClass( 'rf-group-heading', view === group.heading );
			} );
		} );

		refraction.getPanelView().updateScrollbar();
	},

	/**
	 * Controls hidden by their conditions are not built (a section of typography, shadow and background options built
	 * five times what it showed); syncShownControls() builds them when a change makes them apply. The controls that
	 * open or close a popover are always built, or the popover would not close.
	 *
	 * @param {Backbone.Model} controlModel
	 * @return {boolean} Whether the control is built.
	 */
	filter( controlModel ) {
		if ( ! ControlsStack.prototype.filter.apply( this, arguments ) ) {
			return false;
		}

		const popover = controlModel.get( 'popover' );

		if ( 'section' === controlModel.get( 'type' ) || ( popover && ( popover.start || popover.end ) ) ) {
			return true;
		}

		const settings = this.model.get( 'settings' );

		return refraction.helpers.isActiveControl( controlModel, settings.attributes, settings.controls );
	},

	onSettingsChangeForConditions() {
		if ( ! this.conditionsFrame ) {
			this.conditionsFrame = requestAnimationFrame( () => {
				this.conditionsFrame = 0;
				this.syncShownControls();
				this.markDeviceControls();
			} );
		}
	},

	/**
	 * A change made hidden controls apply: add their views in place. The views already built are left alone (a click
	 * that made the change may still be running code on them, such as a typography toggle with a global font).
	 */
	syncShownControls() {
		if ( this.isDestroyed || ! this.isRendered ) {
			return;
		}

		const ordered = this.collection.filter( ( model ) => this.filter( model ) ),
			added = ordered.filter( ( model ) => ! this.children.findByModelCid( model.cid ) );

		added.forEach( ( model ) => this.insertControl( model, ordered ) );

		if ( added.length ) {
			// New settings take the group (and tab visibility) of where they stand.
			this.groupSection();
			refraction.getPanelView().updateScrollbar();
		}
	},

	/**
	 * Builds one control's view and puts it where it belongs: before the next built control, else after the previous
	 * one, inside or outside a popover as its place says, closed when it is under an inner tab that is not shown.
	 *
	 * @param {Backbone.Model}   model   The control.
	 * @param {Backbone.Model[]} ordered The controls of the section, in order.
	 */
	insertControl( model, ordered ) {
		const at = ordered.indexOf( model ),
			view = this.addChild( model, this.getChildView( model ), at ),
			// A tab's own button ("Normal", "Hover") sits inside its tabs row, not among the controls: never place next to
			// it, or the control lands in that row (0.118.0: Background > Color and Image after choosing Classic).
			viewOf = ( m ) => m && m !== model && 'tab' !== m.get( 'type' ) && this.children.findByModelCid( m.cid ),
			next = ordered.slice( at + 1 ).map( viewOf ).find( Boolean ),
			prev = ordered.slice( 0, at ).reverse().map( viewOf ).find( Boolean ),
			inPopover = this.isInPopoverRange( model );

		if ( next && ( inPopover || ! next.$el.parent().hasClass( this.classes.popover ) ) ) {
			next.$el.before( view.$el );
		} else if ( next ) {
			next.$el.parent().before( view.$el );
		} else if ( prev ) {
			const $prev = ! inPopover && prev.$el.parent().hasClass( this.classes.popover ) ? prev.$el.parent() : prev.$el;
			$prev.after( view.$el );
		}

		const tab = model.get( 'inner_tab' );

		if ( tab ) {
			const tabView = this.getControlViewByName( tab );

			view.$el.toggleClass( 'e-tab-close', ! tabView || ! tabView.$el.hasClass( 'e-tab-active' ) );
		}
	},

	/**
	 * Whether a control sits between a popover's start and its end (in the order of the controls).
	 *
	 * @param {Backbone.Model} model
	 * @return {boolean} Inside a popover.
	 */
	isInPopoverRange( model ) {
		const all = this.collection.models;

		for ( let i = all.indexOf( model ); i >= 0; i-- ) {
			const popover = all[ i ].get( 'popover' );

			if ( popover?.start ) {
				return true;
			}

			if ( popover?.end && all[ i ] !== model ) {
				return false;
			}
		}

		return false;
	},

	isVisibleSectionControl( sectionControlModel ) {
		return ControlsStack.prototype.isVisibleSectionControl.apply( this, arguments ) && refraction.helpers.isActiveControl( sectionControlModel, this.model.get( 'settings' ).attributes, this.model.get( 'settings' ).controls );
	},

	scrollToEditedElement() {
		refraction.helpers.scrollToView( this.getOption( 'editedElementView' ).$el );
	},

	onDestroy() {
		cancelAnimationFrame( this.conditionsFrame );

		this.model.trigger( 'editor:close' );

		this.triggerMethod( 'editor:destroy' );
	},

	onDeviceModeChange() {
		ControlsStack.prototype.onDeviceModeChange.apply( this, arguments );

		this.renderDeviceStrip();
		this.markDeviceControls();

		this.scrollToEditedElement();
	},

	onChildviewSettingsChange( childView ) {
		var editedElementView = this.getOption( 'editedElementView' ),
			editedElementType = editedElementView.model.get( 'elType' );

		if ( 'widget' === editedElementType ) {
			editedElementType = editedElementView.model.get( 'widgetType' );
		}

		refraction.channels.editor
			.trigger( 'change', childView, editedElementView )
			.trigger( 'change:' + editedElementType, childView, editedElementView )
			.trigger( 'change:' + editedElementType + ':' + childView.model.get( 'name' ), childView, editedElementView );
	},
} );

module.exports = EditorView;
