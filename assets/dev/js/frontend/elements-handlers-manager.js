import globalHandler from './handlers/global';
import containerHandlers from './handlers/container/container';
import sectionHandlers from './handlers/section/section';
import columnHandlers from './handlers/column';

/* global refractionFrontendConfig */

module.exports = function( $ ) {
	const handlersInstances = {};

	this.elementsHandlers = {
		'accordion.default': () => import( /* webpackChunkName: 'accordion' */ './handlers/accordion' ),
		'alert.default': () => import( /* webpackChunkName: 'alert' */ './handlers/alert' ),
		'counter.default': () => import( /* webpackChunkName: 'counter' */ './handlers/counter' ),
		'progress.default': () => import( /* webpackChunkName: 'progress' */ './handlers/progress' ),
		'tabs.default': () => import( /* webpackChunkName: 'tabs' */ './handlers/tabs' ),
		'toggle.default': () => import( /* webpackChunkName: 'toggle' */ './handlers/toggle' ),
		'video.default': () => import( /* webpackChunkName: 'video' */ './handlers/video' ),
		'image-carousel.default': () => import( /* webpackChunkName: 'image-carousel' */ './handlers/image-carousel' ),
		'text-editor.default': () => import( /* webpackChunkName: 'text-editor' */ './handlers/text-editor' ),
		'wp-widget-media_audio.default': () => import( /* webpackChunkName: 'wp-audio' */ './handlers/wp-audio' ),
		container: containerHandlers,
		section: sectionHandlers,
		column: columnHandlers,
	};

	if ( refractionFrontendConfig.experimentalFeatures.container ) {
		this.elementsHandlers[ 'nested-tabs.default' ] = () => import( /* webpackChunkName: 'nested-tabs' */ 'refraction/modules/nested-tabs/assets/js/frontend/handlers/nested-tabs' );
		this.elementsHandlers[ 'nested-accordion.default' ] = () => import( /* webpackChunkName: 'nested-accordion' */ 'refraction/modules/nested-accordion/assets/js/frontend/handlers/nested-accordion' );
	}

	if ( refractionFrontendConfig.experimentalFeatures.container ) {
		this.elementsHandlers[ 'contact-buttons.default' ] = () => import( /* webpackChunkName: 'contact-buttons' */ 'refraction/modules/floating-buttons/assets/js/floating-buttons/frontend/handlers/contact-buttons' );
		this.elementsHandlers[ 'floating-bars-var-1.default' ] = () => import( /* webpackChunkName: 'floating-bars' */ 'refraction/modules/floating-buttons/assets/js/floating-bars/frontend/handlers/floating-bars' );
	}

	// Pro widgets (Advanced category).
	this.elementsHandlers[ 'refraction-nav-menu.default' ] = () => import( /* webpackChunkName: 'pro-nav-menu' */ 'refraction/modules/pro-widgets/assets/js/frontend/handlers/nav-menu' );
	this.elementsHandlers[ 'refraction-slides.default' ] = () => import( /* webpackChunkName: 'pro-slides' */ 'refraction/modules/pro-widgets/assets/js/frontend/handlers/slides' );
	this.elementsHandlers[ 'refraction-flip-box.default' ] = () => import( /* webpackChunkName: 'pro-flip-box' */ 'refraction/modules/pro-widgets/assets/js/frontend/handlers/flip-box' );
	this.elementsHandlers[ 'refraction-animated-headline.default' ] = () => import( /* webpackChunkName: 'pro-animated-headline' */ 'refraction/modules/pro-widgets/assets/js/frontend/handlers/animated-headline' );
	this.elementsHandlers[ 'refraction-countdown.default' ] = () => import( /* webpackChunkName: 'pro-countdown' */ 'refraction/modules/pro-widgets/assets/js/frontend/handlers/countdown' );
	this.elementsHandlers[ 'refraction-share-buttons.default' ] = () => import( /* webpackChunkName: 'pro-share-buttons' */ 'refraction/modules/pro-widgets/assets/js/frontend/handlers/share-buttons' );
	this.elementsHandlers[ 'refraction-progress-tracker.default' ] = () => import( /* webpackChunkName: 'pro-progress-tracker' */ 'refraction/modules/pro-widgets/assets/js/frontend/handlers/progress-tracker' );

	const addGlobalHandlers = () => refractionFrontend.hooks.addAction( 'frontend/element_ready/global', globalHandler );

	const addElementsHandlers = () => {
		$.each( this.elementsHandlers, ( elementName, Handlers ) => {
			const elementData = elementName.split( '.' );

			elementName = elementData[ 0 ];

			const skin = elementData[ 1 ] || null;

			this.attachHandler( elementName, Handlers, skin );
		} );
	};

	const isClassHandler = ( Handler ) => Handler.prototype?.getUniqueHandlerID;

	const addHandlerWithHook = ( elementBaseName, Handler, skin = 'default' ) => {
		skin = skin ? '.' + skin : '';

		const elementName = elementBaseName + skin;

		refractionFrontend.hooks.addAction( `frontend/element_ready/${ elementName }`, ( $element ) => {
			if ( isClassHandler( Handler ) ) {
				this.addHandler( Handler, { $element, elementName }, true );
			} else {
				const handlerValue = Handler();

				if ( ! handlerValue ) {
					return;
				}

				if ( handlerValue instanceof Promise ) {
					handlerValue.then( ( { default: dynamicHandler } ) => {
						this.addHandler( dynamicHandler, { $element, elementName }, true );
					} );
				} else {
					this.addHandler( handlerValue, { $element, elementName }, true );
				}
			}
		} );
	};

	this.addHandler = function( HandlerClass, options ) {
		const elementID = options.$element.data( 'model-cid' );

		let handlerID;

		// If element is in edit mode
		if ( elementID ) {
			handlerID = HandlerClass.prototype.getConstructorID();

			if ( ! handlersInstances[ elementID ] ) {
				handlersInstances[ elementID ] = {};
			}

			const oldHandler = handlersInstances[ elementID ][ handlerID ];

			if ( oldHandler ) {
				oldHandler.onDestroy();
			}
		}

		const newHandler = new HandlerClass( options );

		refractionFrontend.hooks.doAction( `frontend/element_handler_ready/${ options.elementName }`, options.$element, $ );

		if ( elementID ) {
			handlersInstances[ elementID ][ handlerID ] = newHandler;
		}
	};

	this.attachHandler = ( elementName, Handlers, skin ) => {
		if ( ! Array.isArray( Handlers ) ) {
			Handlers = [ Handlers ];
		}

		Handlers.forEach( ( Handler ) => addHandlerWithHook( elementName, Handler, skin ) );
	};

	this.getHandler = function( handlerName ) {
		const elementHandler = this.elementsHandlers[ handlerName ];

		if ( isClassHandler( elementHandler ) ) {
			return elementHandler;
		}

		return new Promise( ( res ) => {
			elementHandler().then( ( { default: dynamicHandler } ) => {
				res( dynamicHandler );
			} );
		} );
	};

	/**
	 * @param {string} handlerName
	 * @deprecated since 3.1.0, use `refractionFrontend.elementsHandler.getHandler` instead.
	 */
	this.getHandlers = function( handlerName ) {
		refractionDevTools.deprecation.deprecated( 'getHandlers', '3.1.0', 'refractionFrontend.elementsHandler.getHandler' );

		if ( handlerName ) {
			return this.getHandler( handlerName );
		}

		return this.elementsHandlers;
	};

	this.runReadyTrigger = function( scope ) {
		const isDelayChildHandlers = !! scope.closest( '[data-delay-child-handlers="true"]' ) && 0 !== scope.closest( '[data-delay-child-handlers="true"]' ).length;

		if ( refractionFrontend.config.is_static || isDelayChildHandlers ) {
			return;
		}

		// Initializing the `$scope` as frontend jQuery instance
		const $scope = jQuery( scope ),
			elementType = $scope.attr( 'data-element_type' );

		if ( ! elementType ) {
			return;
		}

		refractionFrontend.hooks.doAction( 'frontend/element_ready/global', $scope, $ );

		refractionFrontend.hooks.doAction( `frontend/element_ready/${ elementType }`, $scope, $ );

		if ( 'widget' === elementType ) {
			const widgetType = $scope.attr( 'data-widget_type' );
			refractionFrontend.hooks.doAction( `frontend/element_ready/${ widgetType }`, $scope, $ );
		}
	};

	this.init = () => {
		addGlobalHandlers();

		addElementsHandlers();
	};
};
