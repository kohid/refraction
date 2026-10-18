var EditModeItemView = require( 'refraction-regions/panel/edit-mode' ),
	PanelLayoutView;

import PanelComponent from './component';
import ElementsComponent from './pages/elements/component';
import EditorComponent from './pages/editor/component';
import { escapeFromPanelField } from 'refraction-editor-utils/keyboard-nav';

PanelLayoutView = Marionette.LayoutView.extend( {
	template: '#tmpl-refraction-panel',

	id: 'refraction-panel-inner',

	regions: {
		content: '#refraction-panel-content-wrapper',
		header: '#refraction-panel-header-wrapper',
		footer: '#refraction-panel-footer',
		modeSwitcher: '#refraction-mode-switcher',
	},

	pages: {},

	events: {
		keydown: 'onKeyDown',
	},

	childEvents: {
		'click:add'() {
			$e.route( 'panel/elements/categories' );
		},
		'editor:destroy'() {
			$e.route( 'panel/elements/categories', {
				autoFocusSearch: false,
			} );
		},
	},

	currentPageName: null,

	currentPageView: null,

	perfectScrollbar: null,

	initialize() {
		$e.components.register( new PanelComponent( { manager: this } ) );

		$e.internal( 'panel/state-loading' );

		$e.components.register( new ElementsComponent( { manager: this } ) );

		$e.components.register( new EditorComponent( { manager: this } ) );

		this.initPages();
	},

	buildPages() {
		var pages = {
			elements: {
				view: require( 'refraction-panel/pages/elements/elements' ),
				title: '<img src="' + refractionCommon.config.urls.assets + 'images/logo-panel.svg">',
			},
			editor: {
				view: require( 'refraction-panel/pages/editor' ),
			},
			menu: {
				view: refraction.modules.layouts.panel.pages.menu.Menu,
				title: '<img src="' + refractionCommon.config.urls.assets + 'images/logo-panel.svg">',
			},
		};

		return pages;
	},

	initPages() {
		var pages;

		this.getPages = function( page ) {
			if ( ! pages ) {
				pages = this.buildPages();
			}

			return page ? pages[ page ] : pages;
		};

		this.addPage = function( pageName, pageData ) {
			if ( ! pages ) {
				pages = this.buildPages();
			}

			pages[ pageName ] = pageData;
		};
	},

	getHeaderView() {
		return this.getChildView( 'header' );
	},

	getCurrentPageName() {
		return this.currentPageName;
	},

	getCurrentPageView() {
		return this.currentPageView;
	},

	setPage( page, title, viewOptions ) {
		const pages = this.getPages();

		if ( 'elements' === page && ! refraction.userCan( 'design' ) ) {
			if ( pages.page_settings ) {
				page = 'page_settings';
			}
		}

		const pageData = pages[ page ];

		if ( ! pageData ) {
			throw new ReferenceError( 'Refraction panel doesn\'t have page named \'' + page + '\'' );
		}

		if ( pageData.options ) {
			viewOptions = _.extend( pageData.options, viewOptions );
		}

		let View = pageData.view;

		if ( pageData.getView ) {
			View = pageData.getView();
		}

		this.currentPageName = page;

		this.currentPageView = new View( viewOptions );

		this.showChildView( 'content', this.currentPageView );

		this.getHeaderView().setTitle( title || pageData.title );

		this
			.trigger( 'set:page', this.currentPageView )
			.trigger( 'set:page:' + page, this.currentPageView );

		if ( refraction.promotion.dialog ) {
			refraction.promotion.dialog.hide();
		}

		return this.currentPageView;
	},

	onKeyDown( event ) {
		escapeFromPanelField( event, this.el );
	},

	onBeforeShow() {
		var PanelHeaderItemView = require( 'refraction-regions/panel/header' ),
			PanelFooterBackCompatView = require( 'refraction-regions/panel/footer-back-compat' );

		// Edit Mode
		this.showChildView( 'modeSwitcher', new EditModeItemView() );

		// Header
		this.showChildView( 'header', new PanelHeaderItemView() );

		// Back-compat for Refraction Pro < 4.3 (ED-25418).
		this.showChildView( 'footer', new PanelFooterBackCompatView() );

		// Added Editor events
		this.updateScrollbar = _.throttle( this.updateScrollbar, 100 );

		this.getRegion( 'content' )
			.on( 'before:show', this.onEditorBeforeShow.bind( this ) )
			.on( 'empty', this.onEditorEmpty.bind( this ) )
			.on( 'show', this.updateScrollbar.bind( this ) );
	},

	onEditorBeforeShow() {
		_.defer( this.updateScrollbar.bind( this ) );
	},

	onEditorEmpty() {
		this.updateScrollbar();
	},

	updateScrollbar() {
		if ( ! this.perfectScrollbar ) {
			this.perfectScrollbar = new PerfectScrollbar( this.content.el, {
				suppressScrollX: true,
			} );

			// The RTL is buggy, so always keep it LTR.
			this.perfectScrollbar.isRtl = false;

			return;
		}

		this.perfectScrollbar.update();
	},
} );

module.exports = PanelLayoutView;
