var ControlsStack = refractionModules.editor.views.ControlsStack,
	EditorView;

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
			viewOf = ( m ) => m && m !== model && this.children.findByModelCid( m.cid ),
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
