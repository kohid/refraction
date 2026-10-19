/* global RefractionConfig */

import ColorControl from './controls/color';
import DateTimeControl from 'refraction-controls/date-time';
import EditorDocuments from './components/documents/component';
import environment from 'refraction-common/utils/environment';
import ElementsManager from './elements/manager';
import IntroductionTooltipsManager from './introduction-tooltips/manager';
import Favorites from 'refraction/modules/favorites/assets/js/editor/module';
import HistoryManager from 'refraction/modules/history/assets/js/module';
import HotkeysScreen from './components/hotkeys/hotkeys';
import IconsManager from './components/icons-manager/icons-manager';
import BrowserImport from './components/browser-import/manager';
import PreviewComponent from './components/preview/component';
import PanelMenu from 'refraction-panel/pages/menu/menu';
import Promotion from './utils/promotion';
import KitManager from '../../../../core/kits/assets/js/manager.js';
import Navigator from './regions/navigator/navigator';
import NoticeBar from './utils/notice-bar';
import Preview from 'refraction-views/preview';
import PopoverToggleControl from 'refraction-controls/popover-toggle';
import Selection from './components/selection/manager';
import LandingPageLibraryModule from 'refraction/modules/landing-pages/assets/js/editor/module';
import ElementsColorPicker from 'refraction/modules/elements-color-picker/assets/js/editor/module';
import Breakpoints from 'refraction-utils/breakpoints';
import Events from 'refraction-utils/events';
import DocumentComponent from './document/component';
import DataGlobalsComponent from './data/globals/component';
import ControlConditions from './utils/control-conditions';

import FloatingButtonsLibraryModule from 'refraction/modules/floating-buttons/assets/js/floating-buttons/editor/module';
import FloatingBarsLibraryModule from 'refraction/modules/floating-buttons/assets/js/floating-bars/editor/module';
import LinkInBioLibraryModule from 'refraction/modules/link-in-bio/assets/js/editor/module';

import * as elementTypes from './elements/types';
import * as hints from './hints';
import ElementBase from './elements/types/base/element-base';
import { FontVariables } from './utils/font-variables';

/**
 * @typedef {import('./container/container')} Container
 */
export default class EditorBase extends Marionette.Application {
	widgetsCache = {};

	config = {};

	loaded = false;

	previewLoadedOnce = false;

	activeBreakpointsUpdated = false;

	helpers = require( 'refraction-editor-utils/helpers' );
	imagesManager = require( 'refraction-editor-utils/images-manager' ); // TODO: Unused.
	presetsFactory = require( 'refraction-editor-utils/presets-factory' );
	templates = require( 'refraction-templates/manager' );

	// TODO = BC Since 2.3.0
	ajax = refractionCommon.ajax;
	conditions = new ControlConditions();
	history = require( 'refraction/modules/history/assets/js/module' );
	hints = new hints.Ally();

	channels = {
		editor: Backbone.Radio.channel( 'REFRACTION:editor' ),
		data: Backbone.Radio.channel( 'REFRACTION:data' ),
		panelElements: Backbone.Radio.channel( 'REFRACTION:panelElements' ),
		dataEditMode: Backbone.Radio.channel( 'REFRACTION:editmode' ),
		deviceMode: Backbone.Radio.channel( 'REFRACTION:deviceMode' ),
		templates: Backbone.Radio.channel( 'REFRACTION:templates' ),
		responsivePreview: Backbone.Radio.channel( 'REFRACTION:responsivePreview' ),
	};

	/**
	 * @deprecated since 3.0.0, use `refractionCommon.debug` instead.
	 */
	get debug() {
		refractionDevTools.deprecation.deprecated(
			'refraction.debug',
			'3.0.0',
			'refractionCommon.debug',
		);

		return refractionCommon.debug;
	}

	backgroundClickListeners = {
		tooltip: {
			element: '.dialog-tooltip-widget',
			ignore: '.dialog-widget, .refraction-controls-popover, .pcr-selection',
		},
		popover: {
			element: '.refraction-controls-popover',
			ignore: '.refraction-control-popover-toggle-toggle, .refraction-control-popover-toggle-toggle-label, .select2-container, .pcr-app, .dialog-tooltip-widget',
		},
		globalControlsSelect: {
			element: '.e-global__popover',
			ignore: '.e-global__popover-toggle',
		},
		tagsList: {
			element: '.refraction-tags-list',
			ignore: '.refraction-control-dynamic-switcher',
		},
		panelResponsiveSwitchers: {
			element: '.refraction-control-responsive-switchers',
			callback: ( $elementsToHide ) => {
				$elementsToHide.removeClass( 'refraction-responsive-switchers-open' );
			},
		},
		panelUnitControlSwitchers: {
			element: '.e-units-choices',
			callback: ( $elementsToHide ) => {
				$elementsToHide.removeClass( 'e-units-choices-open' );
			},
		},
		promotion: {
			ignore: '.refraction-responsive-panel',
			callback: () => {
				const dialog = refraction.promotion.dialog;

				if ( dialog ) {
					dialog.hide();
				}
			},
		},
	};

	/**
	 * Exporting modules that can be used externally
	 * TODO: All of the following entries should move to `refractionModules.editor`
	 */
	modules = {
		/**
		 * @deprecated since 2.3.0, use `refractionModules.Module` instead.
		 */
		get Module() {
			refractionDevTools.deprecation.deprecated( 'refraction.modules.Module', '2.3.0', 'refractionModules.Module' );

			return refractionModules.Module;
		},
		components: {
			templateLibrary: {
				views: {
					/**
					 * @deprecated since 2.4.0, use `lementorModules.common.views.modal.Layout` instead.
					 */
					get BaseModalLayout() {
						refractionDevTools.deprecation.deprecated( 'refraction.modules.components.templateLibrary.views.BaseModalLayout', '2.4.0', 'refractionModules.common.views.modal.Layout' );

						return refractionModules.common.views.modal.Layout;
					},
				},
			},
			saver: {
				behaviors: {
					FooterSaver: require( './document/save/behaviors/footer-saver' ),
				},
			},
		},
		saver: {
			/**
			 * @deprecated since 2.9.0, use `refraction.modules.components.saver.behaviors.FooterSaver` instead.
			 */
			get footerBehavior() {
				refractionDevTools.deprecation.deprecated( 'refraction.modules.saver.footerBehavior.',
					'2.9.0',
					'refraction.modules.components.saver.behaviors.FooterSaver' );

				return refraction.modules.components.saver.behaviors.FooterSaver;
			},
		},
		controls: {
			Animation: require( 'refraction-controls/select2' ),
			Base: require( 'refraction-controls/base' ),
			BaseData: require( 'refraction-controls/base-data' ),
			BaseMultiple: require( 'refraction-controls/base-multiple' ),
			Box_shadow: require( 'refraction-controls/box-shadow' ),
			Button: require( 'refraction-controls/button' ),
			Choose: require( 'refraction-controls/choose' ),
			Visual_choice: require( 'refraction-controls/visual-choice' ),
			Code: require( 'refraction-controls/code' ),
			Color: ColorControl,
			Date_time: DateTimeControl,
			Dimensions: require( 'refraction-controls/dimensions' ),
			Exit_animation: require( 'refraction-controls/select2' ),
			Font: require( 'refraction-controls/font' ),
			Gaps: require( 'refraction-controls/gaps' ),
			Gallery: require( 'refraction-controls/gallery' ),
			Hidden: require( 'refraction-controls/hidden' ),
			Hover_animation: require( 'refraction-controls/select2' ),
			Icon: require( 'refraction-controls/icon' ),
			Icons: require( 'refraction-controls/icons' ),
			Image_dimensions: require( 'refraction-controls/image-dimensions' ),
			Media: require( 'refraction-controls/media' ),
			Notice: require( 'refraction-controls/notice' ),
			Number: require( 'refraction-controls/number' ),
			Popover_toggle: PopoverToggleControl,
			Repeater: require( 'refraction-controls/repeater' ),
			RepeaterRow: require( 'refraction-controls/repeater-row' ),
			Section: require( 'refraction-controls/section' ),
			Select: require( 'refraction-controls/select' ),
			Select2: require( 'refraction-controls/select2' ),
			Slider: require( 'refraction-controls/slider' ),
			Structure: require( 'refraction-controls/structure' ),
			Switcher: require( 'refraction-controls/switcher' ),
			Tab: require( 'refraction-controls/tab' ),
			Text_shadow: require( 'refraction-controls/box-shadow' ),
			Url: require( 'refraction-controls/url' ),
			Wp_widget: require( 'refraction-controls/wp_widget' ),
			Wysiwyg: require( 'refraction-controls/wysiwyg' ),
		},
		elements: {
			types: {
				Base: ElementBase,
				... elementTypes,
			},
			models: {
				/**
				 * @deprecated since 2.4.0, use `refractionModules.editor.elements.models.BaseSettings` instead.
				 */
				get BaseSettings() {
					refractionDevTools.deprecation.deprecated( 'refraction.modules.elements.models.BaseSettings', '2.4.0', 'refractionModules.editor.elements.models.BaseSettings' );

					return refractionModules.editor.elements.models.BaseSettings;
				},
				Element: require( 'refraction-elements/models/element' ),
			},
			views: {
				BaseElement: require( 'refraction-elements/views/base' ),
				BaseWidget: require( 'refraction-elements/views/base-widget' ),
				Widget: require( 'refraction-elements/views/widget' ),
			},
			components: {
				AddSectionView: require( 'refraction-views/add-section/inline' ).default,
			},
		},
		layouts: {
			panel: {
				pages: {
					elements: {
						views: {
							Global: require( 'refraction-panel/pages/elements/views/global' ),
							Elements: require( 'refraction-panel/pages/elements/views/elements' ),
						},
					},
					menu: {
						Menu: PanelMenu,
					},
				},
			},
		},
		views: {
			/**
			 * @deprecated since 2.4.0, use `refractionModules.editor.views.ControlsStack` instead.
			 */
			get ControlsStack() {
				refractionDevTools.deprecation.deprecated( 'refraction.modules.views.ControlsStack', '2.4.0', 'refractionModules.editor.views.ControlsStack' );

				return refractionModules.editor.views.ControlsStack;
			},
		},
	};

	userCan( capability ) {
		return -1 === this.config.user.restrictions.indexOf( capability );
	}

	addControlView( controlID, ControlView ) {
		this.modules.controls[ refractionCommon.helpers.upperCaseWords( controlID ) ] = ControlView;
	}

	checkEnvCompatibility() {
		return environment.firefox || environment.webkit;
	}

	getElementData( model ) {
		const elType = model.get( 'elType' );

		if ( 'widget' === elType ) {
			const widgetType = model.get( 'widgetType' );

			if ( ! this.widgetsCache[ widgetType ] ) {
				return false;
			}

			if ( ! this.widgetsCache[ widgetType ].commonMerged && ! this.widgetsCache[ widgetType ].atomic_controls ) {
				let commonControls = this.widgetsCache.common.controls;

				/**
				 * Filter widgets common controls.
				 *
				 * @param array  commonControls - An array of the default common controls.
				 * @param string widgetType     - The widget type.
				 */
				commonControls = refraction.hooks.applyFilters( 'elements/widget/controls/common/default', commonControls, widgetType );
				jQuery.extend( this.widgetsCache[ widgetType ].controls, commonControls );

				if ( ! this.widgetsCache[ widgetType ].has_widget_inner_wrapper && refractionCommon.config.experimentalFeatures.e_optimized_markup ) {
					let commonOptimizedControls = this.widgetsCache[ 'common-optimized' ].controls;
					/**
					 * Filter widgets common-optimized controls.
					 *
					 * @param array  commonOptimizedControls - An array of the default common controls.
					 * @param string widgetType     - The widget type.
					 */
					commonOptimizedControls = refraction.hooks.applyFilters( 'elements/widget/controls/common-optimized/default', commonOptimizedControls, widgetType );
					jQuery.extend( this.widgetsCache[ widgetType ].controls, commonOptimizedControls );
				}

				this.widgetsCache[ widgetType ].controls = refraction.hooks.applyFilters( 'elements/widget/controls/common', this.widgetsCache[ widgetType ].controls, widgetType, this.widgetsCache[ widgetType ] );

				// TODO: Move this code to own file.
				if ( this.widgetsCache[ widgetType ].controls?._element_cache ) {
					let elementCacheDescription = __( 'The default cache status for this element:', 'refraction' );

					elementCacheDescription += ' <strong>';
					if ( this.widgetsCache[ widgetType ]?.is_dynamic_content ) {
						elementCacheDescription += __( 'Inactive', 'refraction' );
					} else {
						elementCacheDescription += __( 'Active', 'refraction' );
					}
					elementCacheDescription += '</strong><br />';
					elementCacheDescription += __( 'Activating cache improves loading times by storing a static version of this element.', 'refraction' );
					elementCacheDescription += ' <a href="https://go.elementor.com/element-caching-help/" target="_blank">' + __( 'Learn more', 'refraction' ) + '</a>.';

					this.widgetsCache[ widgetType ].controls._element_cache.description = elementCacheDescription;
				}
				// TODO: End of code to move.

				this.widgetsCache[ widgetType ].commonMerged = true;
			}

			return this.widgetsCache[ widgetType ];
		}

		if ( ! this.config.elements[ elType ] ) {
			return false;
		}

		const elementConfig = structuredClone( this.config.elements[ elType ] );

		if ( 'section' === elType && model.get( 'isInner' ) ) {
			elementConfig.title = __( 'Inner Section', 'refraction' );
		}

		return elementConfig;
	}

	getElementControls( modelElement ) {
		const elementData = this.getElementData( modelElement );

		if ( ! elementData ) {
			return false;
		}

		const isInner = modelElement.get( 'isInner' ),
			controls = {};

		_.each( elementData.controls, ( controlData, controlKey ) => {
			if ( ( isInner && controlData.hide_in_inner ) || ( ! isInner && controlData.hide_in_top ) ) {
				return;
			}

			controls[ controlKey ] = controlData;
		} );

		return controls;
	}

	mergeControlsSettings( controls ) {
		_.each( controls, ( controlData, controlKey ) => {
			controls[ controlKey ] = jQuery.extend( true, {}, this.config.controls[ controlData.type ], controlData );
		} );

		return controls;
	}

	getControlView( controlID ) {
		const capitalizedControlName = refractionCommon.helpers.upperCaseWords( controlID );
		let View = this.modules.controls[ capitalizedControlName ];

		if ( ! View ) {
			const controlData = this.config.controls[ controlID ],
				isUIControl = controlData && -1 !== controlData.features.indexOf( 'ui' );

			View = this.modules.controls[ isUIControl ? 'Base' : 'BaseData' ];
		}

		return View;
	}

	getPanelView() {
		return this.panel.currentView;
	}

	getPreviewView() {
		return this.previewView;
	}

	/**
	 * @return {Container} container
	 */
	getPreviewContainer() {
		return this.getPreviewView()?.getContainer();
	}

	getContainer( id ) {
		if ( 'document' === id ) {
			return this.getPreviewContainer();
		}

		return $e.components.get( 'document' ).utils.findContainerById( id );
	}

	getContainerByKeyValue( args ) {
		const { key, value, parent = this.getPreviewView() } = args;

		if ( this.getPreviewContainer().model.get( key ) === value ) {
			return this.getPreviewContainer();
		}

		const view = $e.components.get( 'document' ).utils.findViewRecursive(
			parent.children,
			key,
			value,
			false,
		);

		return view?.[ 0 ]?.getContainer() ?? null;
	}

	initComponents() {
		const EventManager = require( 'refraction-utils/hooks' ),
			DynamicTags = require( 'refraction-dynamic-tags/manager' ),
			Settings = require( 'refraction-editor/components/settings/settings' ),
			Notifications = require( 'refraction-utils/notifications' );

		this.elementsManager = new ElementsManager();

		this.hooks = new EventManager();

		this.selection = new Selection();

		this.settings = new Settings();

		this.dynamicTags = new DynamicTags();

		this.initDialogsManager();

		this.notifications = new Notifications();

		this.kitManager = new KitManager();

		this.hotkeysScreen = new HotkeysScreen();

		this.iconManager = new IconsManager();

		this.noticeBar = new NoticeBar();

		this.favorites = new Favorites();

		this.history = new HistoryManager();

		this.promotion = new Promotion();

		this.browserImport = new BrowserImport();

		this.introductionTooltips = new IntroductionTooltipsManager();

		this.editorEvents = refractionCommon.eventsManager;

		this.documents = $e.components.register( new EditorDocuments() );

		// Adds the Landing Page tab to the Template library modal when editing Landing Pages.
		if ( refractionCommon.config.experimentalFeatures[ 'landing-pages' ] ) {
			this.modules.landingLibraryPageModule = new LandingPageLibraryModule();
		}

		if ( refractionCommon.config.experimentalFeatures.container ) {
			this.modules.floatingButtonsLibraryModule = new FloatingButtonsLibraryModule();
		}

		this.modules.linkInBioLibraryModule = new LinkInBioLibraryModule();

		this.modules.floatingBarsLibraryModule = new FloatingBarsLibraryModule();

		this.modules.elementsColorPicker = new ElementsColorPicker();

		// TODO: Move to refraction:init-data-components
		$e.components.register( new DataGlobalsComponent() );

		$e.components.register( new DocumentComponent() );

		$e.components.register( new PreviewComponent() );

		// TODO: Remove, BC Since 2.9.0.
		refraction.saver = $e.components.get( 'document/save' );

		new FontVariables();

		Events.dispatch( refractionCommon.elements.$window, 'refraction/init-components', null, 'refraction:init-components' );
	}

	/**
	 * Toggle sortable state globally.
	 *
	 * @param {boolean} state
	 */
	toggleSortableState( state = true ) {
		const sections = [
			jQuery( '#refraction-navigator' ),
			refraction.documents.getCurrent()?.$element,
		];

		for ( const $section of sections ) {
			if ( $section ) {
				$section.find( '.ui-sortable' ).each( () => {
					const $element = jQuery( this );

					if ( $element.sortable( 'instance' ) ) {
						$element.sortable( state ? 'enable' : 'disable' );
					}
				} );
			}
		}
	}

	// TODO: BC method since 2.3.0
	initDialogsManager() {
		this.dialogsManager = refractionCommon.dialogsManager;
	}

	initElements() {
		let config = this.config.document.elements;

		// If it's an reload, use the not-saved data
		if ( this.elements && this.elements.length && this.config.document.id === this.config.initial_document.id ) {
			config = this.elements.toJSON();
		}

		this.elements = this.createBackboneElementsCollection( config );

		this.elementsModel = this.createBackboneElementsModel( this.elements );
	}

	createBackboneElementsCollection( json ) {
		const ElementCollection = require( 'refraction-elements/collections/elements' );

		return new ElementCollection( json );
	}

	createBackboneElementsModel( elementsCollection ) {
		return new Backbone.Model( {
			elements: elementsCollection,
		} );
	}

	initPreview() {
		const $ = jQuery,
			previewIframeId = 'refraction-preview-iframe';

		this.$previewWrapper = $( '#refraction-preview' );

		this.$previewResponsiveWrapper = $( '#refraction-preview-responsive-wrapper' );

		// Make sure the iFrame does not exist.
		if ( ! this.$preview ) {
			this.$preview = $( '<iframe>', {
				id: previewIframeId,
				src: this.config.initial_document.urls.preview,
				title: __( 'Preview', 'refraction' ),
				allowfullscreen: 1,
			} );

			this.$previewResponsiveWrapper.append( this.$preview );
		}

		this.$preview.on( 'load', this.onPreviewLoaded.bind( this ) );
	}

	initPreviewView( document ) {
		refraction.trigger( 'document:before:preview', document );

		this.previewView = this.createPreviewView( document.$element[ 0 ], refraction.elementsModel );

		this.renderPreview( this.previewView );
	}

	createPreviewView( targetElement, model, config = {} ) {
		const preview = new Preview( {
			el: targetElement,
			model,
		} );

		preview.setConfig( config );

		preview.$el.empty();

		return preview;
	}

	renderPreview( preview ) {
		// In order to force rendering of children
		preview.isRendered = true;

		preview._renderChildren();

		preview.triggerMethod( 'render' );
	}

	initFrontend() {
		const frontendWindow = this.$preview[ 0 ].contentWindow;

		window.refractionFrontend = frontendWindow.refractionFrontend;

		frontendWindow.refraction = this;

		frontendWindow.refractionCommon = refractionCommon;

		refractionFrontend.init();

		this.trigger( 'frontend:init' );
	}

	initClearPageDialog() {
		let dialog;

		this.getClearPageDialog = () => {
			if ( dialog ) {
				return dialog;
			}

			dialog = refractionCommon.dialogsManager.createWidget( 'confirm', {
				id: 'refraction-clear-page-dialog',
				headerMessage: __( 'Delete All Content', 'refraction' ),
				message: __( 'Attention: We are going to DELETE ALL CONTENT from this page. Are you sure you want to do that?', 'refraction' ),
				position: {
					my: 'center center',
					at: 'center center',
				},
				strings: {
					confirm: __( 'Delete', 'refraction' ),
					cancel: __( 'Cancel', 'refraction' ),
				},
				onConfirm: () => $e.run( 'document/elements/empty', { force: true } ),
			} );

			return dialog;
		};
	}

	getCurrentElement() {
		// eslint-disable-next-line @wordpress/no-global-active-element
		const isPreview = ( -1 !== [ 'BODY', 'IFRAME' ].indexOf( document.activeElement.tagName ) && 'BODY' === refractionFrontend.elements.window.document.activeElement.tagName );

		if ( ! isPreview ) {
			return false;
		}

		let targetElement = refraction.channels.editor.request( 'contextMenu:targetView' );

		if ( ! targetElement ) {
			const panel = refraction.getPanelView();

			if ( $e.routes.isPartOf( 'panel/editor' ) ) {
				targetElement = panel.getCurrentPageView().getOption( 'editedElementView' );
			}
		}

		if ( ! targetElement ) {
			targetElement = refraction.getPreviewView();
		}

		return targetElement;
	}

	initPanel() {
		this.addRegions( { panel: require( 'refraction-regions/panel/panel' ) } );

		window.dispatchEvent( new CustomEvent( 'refraction/panel/init' ) );

		this.trigger( 'panel:init' );
	}

	initNavigator() {
		if ( ! $e.components.get( 'document/elements' ).utils.showNavigator() ) {
			return;
		}

		this.addRegions( {
			navigator: {
				el: '#refraction-navigator',
				regionClass: Navigator,
			},
		} );

		this.trigger( 'navigator:init' );
	}

	setAjax() {
		refractionCommon.ajax.addRequestConstant( 'editor_post_id', this.config.document.id );
		refractionCommon.ajax.addRequestConstant( 'initial_document_id', this.config.initial_document.id );

		refractionCommon.ajax.on( 'request:unhandledError', ( xmlHttpRequest ) => {
			refraction.notifications.showToast( {
				message: refraction.createAjaxErrorMessage( xmlHttpRequest ),
			} );
		} );
	}

	createAjaxErrorMessage( xmlHttpRequest ) {
		let message;

		if ( 4 === xmlHttpRequest.readyState ) {
			message = __( 'Server Error', 'refraction' );

			if ( 200 !== xmlHttpRequest.status ) {
				message += ' (' + xmlHttpRequest.status + ' ' + xmlHttpRequest.statusText + ')';
			}
		} else if ( 0 === xmlHttpRequest.readyState ) {
			message = __( 'Connection Lost', 'refraction' );
		} else {
			message = __( 'Unknown Error', 'refraction' );
		}

		return message + '.';
	}

	activatePreviewResizable() {
		const $responsiveWrapper = this.$previewResponsiveWrapper;

		if ( $responsiveWrapper.resizable( 'instance' ) ) {
			return;
		}

		$responsiveWrapper.resizable( {
			handles: 'e, s, w',
			stop: () => {
				$responsiveWrapper.css( { width: '', height: '', left: '', right: '', top: '', bottom: '' } );
			},
			resize: ( event, ui ) => {
				$responsiveWrapper.css( {
					right: '0',
					left: '0',
					top: '0',
					bottom: '0',
				} );

				// Old versions of jQuery don't support custom properties
				const style = $responsiveWrapper[ 0 ].style;

				style.setProperty( '--e-editor-preview-width', ui.size.width + 'px' );
				style.setProperty( '--e-editor-preview-height', ui.size.height + 'px' );
			},
		} );
	}

	destroyPreviewResizable() {
		if ( this.$previewResponsiveWrapper.resizable( 'instance' ) ) {
			this.$previewResponsiveWrapper.resizable( 'destroy' );
		}
	}

	broadcastPreviewResize() {
		this.channels.responsivePreview
			.reply( 'size', {
				width: this.$preview.innerWidth(),
				height: this.$preview.innerHeight(),
			} )
			.trigger( 'resize' );
	}

	getCurrentDeviceConstrains() {
		const currentBreakpoint = refraction.channels.deviceMode.request( 'currentMode' ),
			{ activeBreakpoints } = refractionFrontend.config.responsive,
			currentBreakpointData = activeBreakpoints[ currentBreakpoint ],
			currentBreakpointMaxPoint = ( 'widescreen' === currentBreakpoint ) ? 9999 : currentBreakpointData.value;

		let currentBreakpointMinPoint = this.breakpoints.getDeviceMinBreakpoint( currentBreakpoint );

		// If the device under the current device mode's breakpoint has a larger max value - use the current device's
		// value as the min width point.
		if ( currentBreakpointMinPoint > currentBreakpointData.value ) {
			currentBreakpointMinPoint = currentBreakpointData.value;
		}

		return {
			maxWidth: currentBreakpointMaxPoint,
			minWidth: currentBreakpointMinPoint,
		};
	}

	getBreakpointResizeOptions( currentBreakpoint ) {
		const previewHeight = refraction.$previewWrapper.height(),
			specialBreakpointsHeights = {
				mobile: {
					minHeight: 480,
					height: 736,
					width: 360,
					maxHeight: 896,
				},
				mobile_extra: {
					minHeight: 480,
					height: 736,
					maxHeight: 896,
				},
				tablet: {
					minHeight: 320,
					height: previewHeight,
					maxHeight: 1024,
				},
				tablet_extra: {
					minHeight: 320,
					height: previewHeight,
					maxHeight: 1024,
				},
				laptop: {
					minHeight: 320,
					height: previewHeight,
					maxHeight: 1024,
				},
				widescreen: {
					minHeight: 320,
					height: previewHeight,
					maxHeight: 1200,
				},
			};

		let deviceConstrains = this.getCurrentDeviceConstrains();

		if ( specialBreakpointsHeights[ currentBreakpoint ] ) {
			deviceConstrains = { ...deviceConstrains, ...specialBreakpointsHeights[ currentBreakpoint ] };
		}

		return deviceConstrains;
	}

	updatePreviewResizeOptions( preserveCurrentSize = false ) {
		const $responsiveWrapper = this.$previewResponsiveWrapper,
			currentBreakpoint = refraction.channels.deviceMode.request( 'currentMode' );

		if ( 'desktop' === currentBreakpoint ) {
			this.destroyPreviewResizable();

			// Old versions of jQuery don't support custom properties
			const style = $responsiveWrapper[ 0 ].style;

			style.setProperty( '--e-editor-preview-width', '' );
			style.setProperty( '--e-editor-preview-height', '' );
		} else {
			this.activatePreviewResizable();

			const breakpointResizeOptions = this.getBreakpointResizeOptions( currentBreakpoint );

			let widthToShow = breakpointResizeOptions.width ?? breakpointResizeOptions.minWidth;

			if ( preserveCurrentSize ) {
				const currentSize = refraction.channels.responsivePreview.request( 'size' );

				if ( currentSize.width > breakpointResizeOptions.maxWidth ) {
					widthToShow = breakpointResizeOptions.maxWidth;
				} else if ( currentSize.width >= breakpointResizeOptions.minWidth ) {
					widthToShow = currentSize.width;
				}
			}

			$responsiveWrapper.resizable( 'option', { ...breakpointResizeOptions } );

			// Old versions of jQuery don't support custom properties
			const style = $responsiveWrapper[ 0 ].style;

			style.setProperty( '--e-editor-preview-width', widthToShow + 'px' );
			style.setProperty( '--e-editor-preview-height', breakpointResizeOptions.height + 'px' );
		}
	}

	preventClicksInsideEditor() {
		this.$previewContents.on( 'submit', ( event ) =>
			event.preventDefault(),
		);

		// Cannot use arrow function here since it use `this.contains`.
		this.$previewContents.on( 'click', function( event ) {
			const $target = jQuery( event.target ),
				isClickInsideRefraction = !! $target.closest( '.refraction-edit-area, .pen-menu' ).length,
				isTargetInsideDocument = this.contains( $target[ 0 ] );

			if ( $target.closest( 'a:not(.refraction-clickable)' ).length ) {
				event.preventDefault();
			}

			if ( ( isClickInsideRefraction && refraction.getPreviewContainer().isEditable() ) || ! isTargetInsideDocument ) {
				return;
			}

			// It's a click on the preview area, not in the edit area,
			// and a document is open and has an edit area.
			if ( ! isClickInsideRefraction && refraction.documents.getCurrent()?.$element ) {
				$e.run( 'document/elements/deselect-all' );
			}
		} );
	}

	addBackgroundClickArea( element ) {
		element.addEventListener( 'click', this.onBackgroundClick.bind( this ), true );
	}

	addBackgroundClickListener( key, listener ) {
		this.backgroundClickListeners[ key ] = listener;
	}

	removeBackgroundClickListener( key ) {
		delete this.backgroundClickListeners[ key ];
	}

	showFatalErrorDialog( options ) {
		const defaultOptions = {
			id: 'refraction-fatal-error-dialog',
			headerMessage: '',
			message: '',
			position: {
				my: 'center center',
				at: 'center center',
			},
			strings: {
				confirm: __( 'Learn More', 'refraction' ),
				cancel: __( 'Go Back', 'refraction' ),
			},
			onConfirm: null,
			onCancel: () => parent.history.go( -1 ),
			hide: {
				onBackgroundClick: false,
				onButtonClick: false,
			},
		};

		options = jQuery.extend( true, defaultOptions, options );

		refractionCommon.dialogsManager.createWidget( 'confirm', options ).show();
	}

	checkPageStatus() {
		if ( refraction.documents.getCurrent().isDraft() ) {
			this.notifications.showToast( {
				message: __( 'This is just a draft. Play around and when you\'re done - click update.', 'refraction' ),
				buttons: [
					{
						name: 'view_revisions',
						text: __( 'View All Revisions', 'refraction' ),
						callback: () => $e.route( 'panel/history/revisions' ),
					},
				],
			} );
		}
	}

	enterDeviceMode() {
		this.channels.responsivePreview.trigger( 'open' );

		refractionCommon.elements.$body.addClass( 'e-is-device-mode' );

		this.activatePreviewResizable();

		this.resizeListenerThrottled = false;

		this.broadcastPreviewResize();

		refractionFrontend.elements.$window.on( 'resize.deviceModeDesktop', () => {
			if ( this.resizeListenerThrottled ) {
				return;
			}

			this.resizeListenerThrottled = true;

			this.broadcastPreviewResize();

			setTimeout( () => {
				this.resizeListenerThrottled = false;

				this.broadcastPreviewResize();
			}, 300 );
		} );
	}

	exitDeviceMode() {
		refractionCommon.elements.$body.removeClass( 'e-is-device-mode' );

		this.destroyPreviewResizable();

		refractionCommon.elements.$window.off( 'resize.deviceModeDesktop' );

		this.channels.deviceMode.trigger( 'close' );
	}

	isDeviceModeActive() {
		return refractionCommon.elements.$body.hasClass( 'e-is-device-mode' );
	}

	updatePreviewSize( size ) {
		// Old versions of jQuery don't support custom properties
		const style = this.$previewResponsiveWrapper[ 0 ].style;

		style.setProperty( '--e-editor-preview-width', size.width + 'px' );
		style.setProperty( '--e-editor-preview-height', size.height + 'px' );
	}

	enterPreviewMode( hidePanel ) {
		let $elements = refractionFrontend.elements.$body;

		if ( hidePanel ) {
			$elements = $elements.add( refractionCommon.elements.$body );
		}

		$elements
			.removeClass( 'refraction-editor-active' )
			.addClass( 'refraction-editor-preview' );

		const $element = this.documents.getCurrent().$element;

		if ( $element ) {
			$element.removeClass( 'refraction-edit-area-active' );
		}
	}

	exitPreviewMode() {
		refractionFrontend.elements.$body.add( refractionCommon.elements.$body )
			.removeClass( 'refraction-editor-preview' )
			.addClass( 'refraction-editor-active' );

		if ( refraction.config.document.panel.has_elements ) {
			this.documents.getCurrent().$element.addClass( 'refraction-edit-area-active' );
		}
	}

	changeEditMode( newMode ) {
		const dataEditMode = refraction.channels.dataEditMode,
			oldEditMode = dataEditMode.request( 'activeMode' );

		dataEditMode.reply( 'activeMode', newMode );

		if ( newMode !== oldEditMode ) {
			dataEditMode.trigger( 'switch', newMode );
		}
	}

	reloadPreview() {
		// TODO: Should be command?
		jQuery( '#refraction-preview-loading' ).show();

		this.$preview[ 0 ].src = this.config.initial_document.urls.preview;
	}

	changeDeviceMode( newDeviceMode, hideBarOnDesktop = true ) {
		const oldDeviceMode = this.channels.deviceMode.request( 'currentMode' );

		if ( oldDeviceMode === newDeviceMode ) {
			return;
		}

		refractionCommon.elements.$body
			.removeClass( 'refraction-device-' + oldDeviceMode )
			.addClass( 'refraction-device-' + newDeviceMode );

		this.channels.deviceMode
			.reply( 'previousMode', oldDeviceMode )
			.reply( 'currentMode', newDeviceMode )
			.trigger( 'change' );

		if ( this.isDeviceModeActive() && hideBarOnDesktop ) {
			if ( 'desktop' === newDeviceMode ) {
				this.exitDeviceMode();
			}
		} else if ( 'desktop' !== newDeviceMode ) {
			this.enterDeviceMode();
		}

		dispatchEvent( new CustomEvent( 'refraction/device-mode/change', {
			detail: {
				activeMode: newDeviceMode,

			},
		} ) );
	}

	translate( stringKey, templateArgs, i18nStack ) {
		// TODO: BC since 2.3.0, it always should be `this.config.i18n`
		if ( ! i18nStack ) {
			i18nStack = this.config.i18n;
		}

		return refractionCommon.translate( stringKey, null, templateArgs, i18nStack );
	}

	requestWidgetsConfig() {
		const excludeWidgets = {};

		jQuery.each( this.widgetsCache, ( widgetName, widgetConfig ) => {
			if ( widgetConfig.controls ) {
				excludeWidgets[ widgetName ] = true;
			}
		} );

		refractionCommon.ajax.addRequest( 'get_widgets_config', {
			data: {
				exclude: excludeWidgets,
			},
			success: ( data ) => {
				this.addWidgetsCache( data );

				if ( refraction.config.locale !== refraction.config.user.locale ) {
					this.translateControlsDefaults( refraction.config.locale );
				}

				if ( this.loaded ) {
					this.kitManager.renderGlobalsDefaultCSS();

					$e.internal( 'panel/state-ready' );
				} else {
					this.once( 'panel:init', () => {
						$e.internal( 'panel/state-ready' );
					} );
				}
			},
		} );
	}

	async refreshWidgets() {
		const data = await refractionCommon.ajax.addRequest( 'refresh_widgets_config' );

		this.widgetsCache = {};
		this.addWidgetsCache( data.widgets );

		refraction.config.document.panel.elements_categories = data.categories;

		if ( refraction.config.locale !== refraction.config.user.locale ) {
			this.translateControlsDefaults( refraction.config.locale );
		}

		this.kitManager.renderGlobalsDefaultCSS();

		refraction.hooks.doAction( 'refraction/widgets/refreshed' );

		$e.routes.refreshContainer( 'panel' );

		$e.run( 'preview/reload' );

		return data;
	}

	translateControlsDefaults( locale ) {
		refractionCommon.ajax.addRequest( 'get_widgets_default_value_translations', {
			data: { locale },
			success: ( data ) => {
				this.addWidgetsCache( data );
			},
		}, true );
	}

	getPreferences( key ) {
		const settings = refraction.settings.editorPreferences.model.attributes;

		if ( key ) {
			return settings[ key ];
		}

		return settings;
	}

	getConfig() {
		return RefractionConfig;
	}

	onStart() {
		this.config = this.getConfig();

		Backbone.Radio.DEBUG = false;
		Backbone.Radio.tuneIn( 'REFRACTION' );

		this.populateActiveBreakpointsConfig();

		this.breakpoints = new Breakpoints( this.config.responsive );

		if ( refractionCommon.config.experimentalFeatures.additional_custom_breakpoints ) {
			// Duplicate responsive controls for section and column default configs.
			this.generateResponsiveControlsForElements();
		}

		this.elementsManager = new ElementsManager();

		this.initComponents();

		if ( ! this.checkEnvCompatibility() ) {
			this.onEnvNotCompatible();
		}

		this.initPreview();

		this.requestWidgetsConfig();

		this.channels.dataEditMode.reply( 'activeMode', 'edit' );

		this.listenTo( this.channels.dataEditMode, 'switch', this.onEditModeSwitched );

		this.listenTo( refraction.channels.deviceMode, 'change', this.updatePreviewResizeOptions );

		this.initClearPageDialog();

		this.addBackgroundClickArea( document );

		this.addDeprecatedConfigProperties();

		Events.dispatch( refractionCommon.elements.$window, 'refraction/loaded', null, 'refraction:loaded' );

		$e.run( 'editor/documents/open', { id: this.config.initial_document.id } )
			.then( () => {
				Events.dispatch( refractionCommon.elements.$window, 'refraction/init', null, 'refraction:init' );
				this.initNavigator();
			} );
	}

	onPreviewLoaded() {
		const previewWindow = this.$preview[ 0 ].contentWindow;

		if ( ! previewWindow.refractionFrontend ) {
			this.onPreviewLoadingError();

			return;
		}

		// Cannot load editor without kit.
		if ( ! refraction.config.kit_id ) {
			this.kitNotExistsError();

			return;
		}

		this.$previewContents = this.$preview.contents();

		this.initFrontend();

		this.preventClicksInsideEditor();

		this.addBackgroundClickArea( refractionFrontend.elements.window.document );

		if ( ! this.previewLoadedOnce ) {
			this.onFirstPreviewLoaded();
		}

		this.$previewContents.children().addClass( 'refraction-html' );

		const $frontendBody = refractionFrontend.elements.$body;

		$frontendBody.addClass( 'refraction-editor-active' );

		if ( ! refraction.userCan( 'design' ) ) {
			$frontendBody.addClass( 'refraction-editor-content-only' );
		}

		this.changeDeviceMode( 'desktop' );

		_.defer( function() {
			refractionFrontend.elements.window.jQuery.holdReady( false );
		} );

		$e.shortcuts.bindListener( refractionFrontend.elements.$window );

		this.trigger( 'preview:loaded', ! this.loaded /* IsFirst */ );

		$e.internal( 'editor/documents/attach-preview' ).then( () => jQuery( '#refraction-loading, #refraction-preview-loading' ).fadeOut( 600 ) );

		this.loaded = true;
	}

	onFirstPreviewLoaded() {
		this.initPanel();

		this.previewLoadedOnce = true;

		const eventsManager = refractionCommon.eventsManager;

		if ( eventsManager ) {
			eventsManager.dispatchEvent( eventsManager.config?.names?.refractionEditor?.editorLoaded, {} );
		}
	}

	onEditModeSwitched() {
		const activeMode = this.channels.dataEditMode.request( 'activeMode' );

		dispatchEvent( new CustomEvent( 'refraction/edit-mode/change', {
			detail: {
				activeMode,
			},
		} ) );

		if ( 'edit' === activeMode ) {
			this.exitPreviewMode();
		} else {
			this.enterPreviewMode( 'preview' === activeMode );
		}
	}

	onEnvNotCompatible() {
		this.showFatalErrorDialog( {
			headerMessage: __( 'Your browser isn\'t compatible', 'refraction' ),
			message: __( 'Your browser isn\'t compatible with all of Refraction\'s editing features. We recommend you switch to another browser like Chrome or Firefox.', 'refraction' ),
			strings: {
				confirm: __( 'Proceed Anyway', 'refraction' ),
			},
			hide: {
				onButtonClick: true,
			},
			onConfirm: () => this.hide(),
		} );
	}

	kitNotExistsError() {
		this.showFatalErrorDialog( {
			className: 'refraction-preview-loading-error',
			headerMessage: __( 'Your site doesn\'t have a default kit', 'refraction' ),
			message: __( 'Seems like your kit was deleted, please create new one or try restore it from trash.', 'refraction' ),
			strings: {
				confirm: __( 'Recreate Kit', 'refraction' ),
				cancel: __( 'Go Back', 'refraction' ),
			},
			onConfirm: () => open( refraction.config.admin_tools_url, '_blank' ),
		} );
	}

	onPreviewLoadingError() {
		const debugUrl = this.config.document.urls.preview + '&preview-debug',
			previewDebugLinkText = __( 'Click here for preview debug', 'refraction' ),
			previewDebugLink = '<div id="refraction-preview-debug-link-text"><a href="' + debugUrl + '" target="_blank">' + previewDebugLinkText + '</a></div>',
			debugData = refraction.config.preview.debug_data,
			dialogOptions = {
				className: 'refraction-preview-loading-error',
				headerMessage: debugData.header,
				message: debugData.message + previewDebugLink,
				onConfirm: () => open( debugData.doc_url, '_blank' ),
			};

		if ( debugData.error ) {
			this.showFatalErrorDialog( dialogOptions );
			return;
		}

		jQuery.get( debugUrl, () => {
			this.showFatalErrorDialog( dialogOptions );
		} ).fail( ( response ) => { // Iframe can't be loaded
			this.showFatalErrorDialog( {
				className: 'refraction-preview-loading-error',
				headerMessage: debugData.header,
				message: response.statusText + ' ' + response.status + ' ' + previewDebugLink,
				onConfirm: () => {
					const url = 500 <= response.status ? refraction.config.preview.help_preview_http_error_500_url : refraction.config.preview.help_preview_http_error_url;
					open( url, '_blank' );
				},
			} );
		} );
	}

	onPreviewElNotFound() {
		let args = this.$preview[ 0 ].contentWindow.refractionPreviewErrorArgs;

		if ( ! args ) {
			args = {
				headerMessage: __( 'Sorry, the content area was not found in your page.', 'refraction' ),
				message: __( 'You must call \'the_content\' function in the current template, in order for Refraction to work on this page.', 'refraction' ),
				confirmURL: refraction.config.help_the_content_url,
			};
		}

		args.onConfirm = () => open( args.confirmURL, '_blank' );

		this.showFatalErrorDialog( args );
	}

	onBackgroundClick( event ) {
		jQuery.each( this.backgroundClickListeners, ( index, config ) => {
			let $clickedTarget = jQuery( event.target );
			// If it's a label that associated with an input
			if ( $clickedTarget[ 0 ].control ) {
				$clickedTarget = $clickedTarget.add( $clickedTarget[ 0 ].control );
			}

			if ( config.ignore && $clickedTarget.closest( config.ignore ).length ) {
				return;
			}

			const $clickedTargetClosestElement = $clickedTarget.closest( config.element ),
				$elementsToHide = jQuery( config.element ).not( $clickedTargetClosestElement );

			if ( config.callback ) {
				config.callback( $elementsToHide );
				return;
			}

			$elementsToHide.each( ( elementIndex, element ) => {
				const $element = jQuery( element );
				const isVisible = $element.is( ':visible' );

				$element.hide();

				if ( isVisible ) {
					$element.trigger( 'hide' );
				}
			} );
		} );
	}

	compileTemplate( template, data ) {
		return Marionette.TemplateCache.prototype.compileTemplate( template )( data );
	}

	addWidgetsCache( widgets ) {
		jQuery.each( widgets, ( widgetName, widgetConfig ) => {
			if ( refractionCommon.config.experimentalFeatures.additional_custom_breakpoints ) {
				// When the Responsive Optimization experiment is active, the responsive controls are generated on the
				// JS side instead of the PHP.
				widgetConfig.controls = this.generateResponsiveControls( widgetConfig.controls );
			}

			this.widgetsCache[ widgetName ] = jQuery.extend( true, {}, this.widgetsCache[ widgetName ], widgetConfig );
		} );
	}

	generateResponsiveControls( controls ) {
		const { activeBreakpoints } = this.config.responsive,
			devices = this.breakpoints.getActiveBreakpointsList( { largeToSmall: true, withDesktop: true } ),
			newControlsStack = {},
			secondDesktopChild = devices[ devices.indexOf( 'desktop' ) + 1 ];

		// Set the desktop to be the first device, so desktop will the the parent of all devices.
		devices.unshift(
			devices.splice( devices.indexOf( 'desktop' ), 1 )[ 0 ],
		);

		jQuery.each( controls, ( controlName, controlConfig ) => {
			let responsiveControlName,
				controlDevices;

			// Handle repeater controls.
			if ( 'object' === typeof controlConfig.fields ) {
				controlConfig.fields = this.generateResponsiveControls( controlConfig.fields );
			}

			// Only handle responsive controls in this loop.
			if ( ! controlConfig.is_responsive ) {
				newControlsStack[ controlName ] = controlConfig;

				return;
			}

			if ( controlConfig.responsive?.devices ) {
				// Because of an `array_intersect` that happens on the PHP side, the devices array can become an object.
				if ( 'object' === typeof controlConfig.responsive.devices ) {
					controlConfig.responsive.devices = Object.values( controlConfig.responsive.devices );
				}

				// Filter the devices list according to the control's passed devices list.
				controlDevices = devices.filter( ( device ) => controlConfig.responsive.devices.includes( device ) );

				delete controlConfig.responsive.devices;
			}

			const popoverEndProperty = controlConfig.popover?.end;

			// Since the `popoverEndProperty` variable now holds the value, we want to prevent this property from
			// being duplicated to all responsive control instances. It should only be applied in the LAST responsive
			// control.
			if ( popoverEndProperty ) {
				delete controlConfig.popover?.end;
			}

			// Move the control's default to the desktop control
			if ( controlConfig.default ) {
				controlConfig.desktop_default = controlConfig.default;
			}

			const multipleDefaultValue = this.config.controls[ controlConfig.type ].default_value;

			let deleteControlDefault = true;

			// For multiple controls that implement get_default_value() in the control class, make sure the duplicated
			// controls receive that default value.
			if ( multipleDefaultValue ) {
				controlConfig.default = multipleDefaultValue;

				deleteControlDefault = false;
			}

			// If the control passed its own 'devices' array, run through that. Otherwise, use the default devices list.
			const devicesArrayToDuplicate = controlDevices || devices;

			devicesArrayToDuplicate.forEach( ( device, index ) => {
				let controlArgs = structuredClone( controlConfig );

				if ( controlArgs.device_args ) {
					if ( controlArgs.device_args[ device ] ) {
						controlArgs = { ...controlArgs, ...controlArgs.device_args[ device ] };
					}

					delete controlArgs.device_args;
				}

				// If there is a prefix class with a device modifier in it, add in the device modifier.
				if ( controlArgs.prefix_class && -1 !== controlArgs.prefix_class.indexOf( '%s' ) ) {
					const deviceModifier = 'desktop' === device ? '' : '-' + device;

					controlArgs.prefix_class = controlArgs.prefix_class.replace( '%s', deviceModifier );
				}

				// If the 'responsive' property is empty, it is transferred from the PHP to JS as an array and not an
				// object.
				if ( Array.isArray( controlArgs.responsive ) ) {
					controlArgs.responsive = {};
				}

				let direction = 'max';

				controlArgs.parent = null;

				if ( 'desktop' !== device ) {
					direction = activeBreakpoints[ device ].direction;

					// Set the parent to be the previous device
					controlArgs.parent = device === secondDesktopChild ? controlName : responsiveControlName;
				}

				controlArgs.responsive[ direction ] = device;

				if ( controlArgs.min_affected_device ) {
					if ( controlArgs.min_affected_device[ device ] ) {
						controlArgs.responsive.min = controlArgs.min_affected_device[ device ];
					}

					delete controlArgs.min_affected_device;
				}

				if ( controlArgs[ device + '_default' ] ) {
					if ( 'object' === typeof controlArgs[ device + '_default' ] ) {
						controlArgs.default = { ...controlArgs.default, ...controlArgs[ device + '_default' ] };
					} else {
						controlArgs.default = controlArgs[ device + '_default' ];
					}
				} else if ( deleteControlDefault ) {
					// In the Editor, controls without default values should have an empty string as the default value.
					controlArgs.default = '';
				}

				// If the control is the first inside a popover, only the first device starts the popover,
				// so the 'start' property has to be deleted from all other devices.
				if ( 0 !== index && controlArgs.popover?.start ) {
					delete controlArgs.popover.start;
				}

				// If the control is inside a popover, AND this control is the last one in the popover, AND this is the
				// last device in the devices array - add the 'popover.end = true' value to it to make sure it closes
				// the popover.
				if ( index === ( devicesArrayToDuplicate.length - 1 ) && popoverEndProperty ) {
					controlArgs.popover = {
						end: true,
					};
				}

				// For each new responsive control, delete the responsive defaults
				devicesArrayToDuplicate.forEach( ( breakpoint ) => {
					delete controlArgs[ breakpoint + '_default' ];
				} );

				delete controlArgs.is_responsive;

				responsiveControlName = 'desktop' === device ? controlName : controlName + '_' + device;

				if ( controlArgs.parent ) {
					const parentControlArgs = newControlsStack[ controlArgs.parent ];

					if ( ! parentControlArgs.inheritors ) {
						parentControlArgs.inheritors = [];
					}

					parentControlArgs.inheritors.push( responsiveControlName );
				}

				controlArgs.name = responsiveControlName;

				newControlsStack[ responsiveControlName ] = controlArgs;
			} );
		} );

		return newControlsStack;
	}

	generateResponsiveControlsForElements() {
		// Handle the default config for section and column.
		const elementNames = Object.keys( this.config.elements );

		elementNames.forEach( ( elementName ) => {
			this.config.elements[ elementName ].controls = this.generateResponsiveControls( this.config.elements[ elementName ].controls );
		} );
	}

	populateActiveBreakpointsConfig() {
		this.config.responsive.activeBreakpoints = {};

		Object.entries( this.config.responsive.breakpoints ).forEach( ( [ breakpointKey, breakpointData ] ) => {
			if ( breakpointData.is_enabled ) {
				this.config.responsive.activeBreakpoints[ breakpointKey ] = breakpointData;
			}
		} );
	}

	addDeprecatedConfigProperties() {
		const map = {
			data: {
				replacement: 'elements',
				value: () => refraction.config.document.elements,
			},
			current_user_can_publish: {
				replacement: 'user.can_publish',
				value: () => refraction.config.document.user.can_publish,
			},
			locked_user: {
				replacement: '',
				value: () => refraction.config.document.user.locked,
			},
			revisions_enabled: {
				replacement: 'revisions.enabled',
				value: () => refraction.config.document.revisions.enabled,
			},
			current_revision_id: {
				replacement: 'revisions.current_id',
				value: () => refraction.config.document.revisions.current_id,
			},
		};

		jQuery.each( map, ( key, data ) => {
			// Use `defineProperty` because `get property()` fails during the `Marionette...extend`.
			Object.defineProperty( this.config, key, {
				get() {
					const replacement = data.replacement ? 'refraction.config.document.' + data.replacement : '';
					refractionDevTools.deprecation.deprecated( 'refraction.config.' + key, '2.9.0', replacement );
					// Return from current document.
					return data.value();
				},
				set() {
					refractionDevTools.deprecation.deprecated( 'refraction.config.' + key, '2.9.0', 'refraction.config.document.' + data.replacement );
					throw Error( 'Deprecated' );
				},
			} );
		} );

		Object.defineProperty( this.config.settings, 'page', {
			get() {
				refractionDevTools.deprecation.deprecated( 'refraction.config.settings.page', '2.9.0', 'refraction.config.document.settings' );
				return refraction.config.document.settings;
			},
		} );

		Object.defineProperty( this.config, 'widgets', {
			get() {
				refractionDevTools.deprecation.deprecated( 'refraction.config.widgets', '2.9.0', 'refraction.widgetsCache' );
				return refraction.widgetsCache;
			},
		} );

		Object.defineProperty( this, '$previewRefractionEl', {
			get() {
				refractionDevTools.deprecation.deprecated( 'refraction.$previewRefractionEl', '2.9.4', 'refraction.documents.getCurrent().$element' );

				return refraction.documents.getCurrent().$element;
			},
		} );
	}

	toggleDocumentCssFiles( document, state ) {
		const selectors = [
				`#refraction-post-${ document.config.id }-css`,
				`#refraction-preview-${ document.config.revisions.current_id }`,
			],
			$files = this.$previewContents.find( selectors.join( ',' ) ),
			type = state ? 'text/css' : 'refraction/disabled-css';

		$files.attr( { type } );
	}
}
