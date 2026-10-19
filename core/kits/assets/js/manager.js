import Component from './component';
import PanelView from './panel';
import PanelMenuView from './panel-menu';
import PanelHeaderBehavior from './panel-header-behavior';
import GlobalControlSelect from './globals/global-select-behavior';
import ControlsCSSParser from 'refraction-assets-js/editor/utils/controls-css-parser';

const V4_GROUP = 'v4';

export default class Manager extends refractionModules.editor.utils.Module {
	loadingTriggers = {
		preview: false,
		globals: false,
	};

	/**
	 * @type {ControlsCSSParser}
	 */
	variablesCSS = null;

	initialize() {
		refraction.on( 'preview:loaded', () => {
			this.loadingTriggers.preview = true;

			this.renderGlobalsDefaultCSS();
		} );

		refraction.on( 'document:loaded', () => {
			this.renderGlobalVariables();
		} );

		refraction.once( 'globals:loaded', () => {
			this.loadingTriggers.globals = true;

			this.renderGlobalsDefaultCSS();
		} );

		refraction.hooks.addFilter( 'controls/base/behaviors', this.addGlobalsBehavior );

		if ( ! refraction.config.user.can_edit_kit ) {
			return;
		}

		$e.components.register( new Component( { manager: this } ) );
	}

	addPanelPages() {
		refraction.getPanelView().addPage( 'kit_settings', {
			view: PanelView,
			title: __( 'Site Settings', 'refraction' ),
		} );

		refraction.getPanelView().addPage( 'kit_menu', {
			view: PanelMenuView,
			title: __( 'Site Settings', 'refraction' ),
		} );
	}

	addPanelMenuItem() {
		const menu = refraction.modules.layouts.panel.pages.menu.Menu;

		menu.addItem( {
			name: 'global-settings',
			icon: 'rficon-global-settings',
			title: __( 'Site Settings', 'refraction' ),
			type: 'page',
			callback: () => {
				$e.run( 'panel/global/open', {
					route: $e.routes.getHistory( 'panel' ).reverse()[ 0 ].route,
				} );
			},
		}, 'style', 'editor-preferences' );

		menu.addItem( {
			name: 'site-editor',
			icon: 'rficon-theme-builder',
			title: __( 'Theme Builder', 'refraction' ),
			type: 'page',
			callback: () => $e.run( 'app/open' ),
		}, 'style', 'editor-preferences' );
	}

	addHeaderBehavior( behaviors ) {
		behaviors.kit = {
			behaviorClass: PanelHeaderBehavior,
		};

		return behaviors;
	}

	addGlobalsBehavior( behaviors, view ) {
		// The view can be a UI control which does not have this method.
		if ( ! view.isGlobalActive ) {
			return;
		}

		const isGlobalActive = view.isGlobalActive();

		if ( 'color' === view.options.model.get( 'type' ) && isGlobalActive ) {
			behaviors.globals = {
				behaviorClass: GlobalControlSelect,
				popoverTitle: __( 'Global Colors', 'refraction' ),
				manageButtonText: __( 'Manage Global Colors', 'refraction' ),
				tooltipText: __( 'Global Colors help you work smarter. Save a color, and use it anywhere throughout your site. Access and edit your global colors by clicking the Manage button.', 'refraction' ),
				newGlobalConfirmTitle: __( 'Create New Global Color', 'refraction' ),
			};
		}

		if ( 'popover_toggle' === view.options.model.get( 'type' ) && 'typography' === view.options.model.get( 'groupType' ) && isGlobalActive ) {
			behaviors.globals = {
				behaviorClass: GlobalControlSelect,
				popoverTitle: __( 'Global Fonts', 'refraction' ),
				manageButtonText: __( 'Manage Global Fonts', 'refraction' ),
				tooltipText: __( 'Global Fonts help you work smarter. Save a Typography, and use it anywhere throughout your site. Access and edit your Global Fonts by clicking the Manage button.', 'refraction' ),
				newGlobalConfirmTitle: __( 'Create New Global Font', 'refraction' ),
			};
		}

		return behaviors;
	}

	/**
	 * In case there is a new global color/typography convert current globals to CSS variables.
	 */
	renderGlobalVariables() {
		if ( ! this.variablesCSS ) {
			this.variablesCSS = new ControlsCSSParser( {
				id: 'e-kit-variables',
				settingsModel: new refractionModules.editor.elements.models.BaseSettings( {}, {} ),
			} );
		}

		// The kit document has its own CSS.
		if ( 'kit' === refraction.documents.getCurrent().config.type ) {
			this.variablesCSS.removeStyleFromDocument();
			return;
		}

		$e.data.get( 'globals/index' ).then( ( { data } ) => {
			if ( data.colors ) {
				Object.values( data.colors ).forEach( ( item ) => {
					if ( 'v4' === item.group ) {
						return;
					}

					const controls = refraction.config.kit_config.design_system_controls.colors,
						values = {
							_id: item.id,
							color: item.value,
						};

					this.variablesCSS.addStyleRules( controls, values, controls, [ '{{WRAPPER}}' ], [ 'body' ] );
				} );
			}

			if ( data.typography ) {
				Object.values( data.typography ).forEach( ( item ) => {
					if ( V4_GROUP === item.group ) {
						return;
					}

					const controls = refraction.config.kit_config.design_system_controls.typography,
						values = {
							_id: item.id,
							...item.value,
						};

					// Enqueue fonts.
					if ( item.value.typography_font_family ) {
						refraction.helpers.enqueueFont( item.value.typography_font_family );
					}

					this.variablesCSS.addStyleRules( controls, values, controls, [ '{{WRAPPER}}' ], [ 'body' ] );
				} );
			}

			this.variablesCSS.addStyleToDocument();
		} );
	}

	// Use the Controls CSS Parser to add the global defaults CSS to the page.
	renderGlobalsDefaultCSS() {
		if ( ! this.loadingTriggers.preview || ! this.loadingTriggers.globals ) {
			return;
		}

		const cssParser = new ControlsCSSParser( {
				id: 'e-global-style',
			} ),
			defaultColorsEnabled = refraction.config.globals.defaults_enabled.colors,
			defaultTypographyEnabled = refraction.config.globals.defaults_enabled.typography;

		// If both default colors and typography are disabled, there is no need to render schemes and default global css.
		if ( ! defaultColorsEnabled && ! defaultTypographyEnabled ) {
			return;
		}

		Object.values( refraction.widgetsCache ).forEach( ( widget ) => {
			if ( ! widget.controls ) {
				return;
			}

			const globalControls = [],
				globalValues = {};

			Object.values( widget.controls ).forEach( ( control ) => {
				const isColorControl = 'color' === control.type,
					isTypographyControl = 'typography' === control.groupType;

				if ( ( isColorControl && ! defaultColorsEnabled ) || ( isTypographyControl && ! defaultTypographyEnabled ) ) {
					return;
				}

				let globalControl = control;

				if ( control.groupType ) {
					globalControl = widget.controls[ control.groupPrefix + control.groupType ];
				}

				if ( control.global?.default ) {
					globalValues[ control.name ] = globalControl.global.default;
				}

				if ( globalControl.global?.default ) {
					globalControls.push( control );
				}
			} );

			globalControls.forEach( ( control ) => {
				cssParser.addControlStyleRules(
					control,
					widget.controls, // Values
					widget.controls, // Controls
					[ '{{WRAPPER}}' ],
					[ '.refraction-widget-' + widget.widget_type ],
					globalValues,
				);
			} );
		} );

		cssParser.addStyleToDocument();
	}

	onInit() {
		super.onInit();

		refractionCommon.elements.$window.on( 'refraction:loaded', () => {
			if ( refraction.config.initial_document.panel.support_kit ) {
				this.initialize();
			}
		} );
	}
}
