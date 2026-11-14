var ControlBaseView;

ControlBaseView = Marionette.CompositeView.extend( {
	ui() {
		return {
			controlTitle: '.refraction-control-title',
		};
	},

	behaviors() {
		var behaviors = {};

		return refraction.hooks.applyFilters( 'controls/base/behaviors', behaviors, this );
	},

	getBehavior( name ) {
		return this._behaviors[ Object.keys( this.behaviors() ).indexOf( name ) ];
	},

	className() {
		// TODO: Any better classes for that?
		var classes = 'refraction-control refraction-control-' + this.model.get( 'name' ) + ' refraction-control-type-' + this.model.get( 'type' ),
			modelClasses = this.model.get( 'classes' ),
			responsive = this.model.get( 'responsive' );

		if ( ! _.isEmpty( modelClasses ) ) {
			classes += ' ' + modelClasses;
		}

		if ( ! _.isEmpty( responsive ) ) {
			const responsiveControlName = responsive.max || responsive.min;

			classes += ' refraction-control-responsive-' + responsiveControlName;
		}

		return classes;
	},

	templateHelpers() {
		var controlData = {
			_cid: this.model.cid,
		};

		return {
			view: this,
			data: _.extend( {}, this.model.toJSON(), controlData ),
		};
	},

	getTemplate() {
		return Marionette.TemplateCache.get( '#tmpl-refraction-control-' + this.model.get( 'type' ) + '-content' );
	},

	initialize( options ) {
		const label = this.model.get( 'label' );

		// TODO: Temp backwards compatibility. since 2.8.0.
		Object.defineProperty( this, 'container', {
			get() {
				if ( ! options.container ) {
					const settingsModel = options.elementSettingsModel,
						view = $e.components.get( 'document' ).utils.findViewById( settingsModel.id );

					// Element control.
					if ( view && view.getContainer ) {
						options.container = view.getContainer();
					} else {
						if ( ! settingsModel.id ) {
							settingsModel.id = 'bc-' + refractionCommon.helpers.getUniqueId();
						}

						// Document/General/Other control.
						options.container = new refractionModules.editor.Container( {
							type: 'bc-container',
							id: settingsModel.id,
							model: settingsModel,
							settings: settingsModel,
							label,
							view: false,
							parent: false,
							renderer: false,
							controls: settingsModel.options.controls,
						} );
					}
				}

				return options.container;
			},
		} );

		// Use `defineProperty` because `get elementSettingsModel()` fails during the `Marionette.CompositeView.extend`.
		Object.defineProperty( this, 'elementSettingsModel', {
			get() {
				refractionDevTools.deprecation.deprecated( 'elementSettingsModel', '2.8.0', 'container.settings' );

				return options.container ? options.container.settings : options.elementSettingsModel;
			},
		} );

		var controlType = this.model.get( 'type' ),
			controlSettings = jQuery.extend( true, {}, refraction.config.controls[ controlType ], this.model.attributes );

		this.model.set( controlSettings );

		// TODO: this.elementSettingsModel is deprecated since 2.8.0.
		const settings = this.container ? this.container.settings : this.elementSettingsModel;

		this.listenTo( settings, 'change', this.onAfterChange );

		// A repeater field can depend on a setting of its widget: a condition on "@name" reads the widget's "name" (see
		// rowValues()), so it is checked again when the widget's settings change.
		const owner = this.getOwnerSettings();

		if ( owner && this.hasOwnerCondition() ) {
			this.listenTo( owner, 'change', this.onAfterChange );
		}

		if ( this.model.attributes.responsive ) {
			this.onDeviceModeChange = this.onDeviceModeChange.bind( this );

			refraction.listenTo( refraction.channels.deviceMode, 'change', this.onDeviceModeChange );
		}
	},

	onDestroy() {
		refraction.stopListening( refraction.channels.deviceMode, 'change', this.onDeviceModeChange );
	},

	onDeviceModeChange() {
		this.toggleControlVisibility();
	},

	onAfterChange() {
		this.toggleControlVisibility();
	},

	/**
	 * The settings of the widget a repeater row belongs to, or null outside a repeater row.
	 *
	 * @return {Backbone.Model|null} The widget's settings.
	 */
	getOwnerSettings() {
		let container = this.container;

		if ( ! container || 'repeater' !== container.type ) {
			return null;
		}

		while ( container && 'repeater' === container.type ) {
			container = container.parent;
		}

		// The repeater's own holder sits between the row and the widget.
		while ( container && ! container.settings?.controls ) {
			container = container.parent;
		}

		return container ? container.settings : null;
	},

	hasOwnerCondition() {
		const condition = this.model.get( 'condition' ) || {};

		return Object.keys( condition ).some( ( name ) => name.startsWith( '@' ) );
	},

	/**
	 * A repeater row's values, plus its widget's settings under "@name" when a condition asks for them.
	 *
	 * @param {Backbone.Model} settings - The row's settings.
	 * @return {Object} The values to check the conditions against.
	 */
	rowValues( settings ) {
		const owner = this.hasOwnerCondition() ? this.getOwnerSettings() : null;

		if ( ! owner ) {
			return settings.attributes;
		}

		const values = { ...settings.attributes };

		Object.entries( owner.attributes ).forEach( ( [ name, value ] ) => {
			values[ '@' + name ] = value;
		} );

		return values;
	},

	toggleControlVisibility() {
		// TODO: this.elementSettingsModel is deprecated since 2.8.0.
		const settings = this.container ? this.container.settings : this.elementSettingsModel;

		var isVisible = refraction.helpers.isActiveControl( this.model, this.rowValues( settings ), settings.controls );

		this.$el.toggleClass( 'refraction-hidden-control', ! isVisible );

		refraction.getPanelView().updateScrollbar();
	},

	onRender() {
		var layoutType = this.model.get( 'label_block' ) ? 'block' : 'inline',
			showLabel = this.model.get( 'show_label' ),
			elClasses = 'refraction-label-' + layoutType;

		elClasses += ' refraction-control-separator-' + this.model.get( 'separator' );

		if ( ! showLabel ) {
			elClasses += ' refraction-control-hidden-label';
		}

		this.$el.addClass( elClasses );

		this.toggleControlVisibility();
	},

	reRoute( controlActive ) {
		$e.route(
			$e.routes.getCurrent( 'panel' ),
			this.getControlInRouteArgs( controlActive ? this.getControlPath() : '' ),
			{ history: false },
		);
	},

	getControlInRouteArgs( path ) {
		return {
			...$e.routes.getCurrentArgs( 'panel' ),
			activeControl: path,
		};
	},

	getControlPath() {
		let controlPath = this.model.get( 'name' ),
			parent = this._parent;

		while ( ! parent.$el.hasClass( 'refraction-controls-stack' ) ) {
			const parentName = parent.model.get( 'name' ) || parent.model.get( '_id' );
			controlPath = parentName + '/' + controlPath;

			parent = parent._parent;
		}

		return controlPath;
	},
} );

module.exports = ControlBaseView;
