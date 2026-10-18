var CREATE_WIDGET_PROMPT = require( './widget-creation' ).CREATE_WIDGET_PROMPT,
	PanelElementsElementsCollection = require( '../collections/elements' ),
	PanelElementsCategoryView;

PanelElementsCategoryView = Marionette.CompositeView.extend( {
	template: '#tmpl-refraction-panel-elements-category',

	className: 'refraction-panel-category',

	ui: {
		title: '.refraction-panel-category-title',
		items: '.refraction-panel-category-items',
		chip: '.refraction-panel-heading-category-chip',
	},

	events: {
		'click @ui.title': 'onTitleClick',
		'click @ui.chip': 'onChipClick',
		'click .refraction-panel-custom-widgets__cta': 'onCustomWidgetsCtaClick',
		'click .refraction-panel-heading-promotion a': 'onPromotionLinkClick',
	},

	id() {
		return 'refraction-panel-category-' + this.model.get( 'name' );
	},

	childView: require( 'refraction-panel/pages/elements/views/element' ),

	childViewContainer: '.refraction-panel-category-items',

	initialize() {
		let items = this.model.get( 'items' ) || [];

		switch ( this.model.get( 'sort' ) ) {
			case 'a-z':
				items = items.sort( ( a, b ) => ( a.get( 'title' ) > b.get( 'title' ) ? 1 : -1 ) );
				break;
		}

		this.collection = new PanelElementsElementsCollection( items );
	},

	behaviors() {
		return refraction.hooks.applyFilters( 'panel/category/behaviors', {}, this );
	},

	onRender() {
		let isActive = refraction.channels.panelElements.request(
			'category:' + this.model.get( 'name' ) + ':active',
		);

		if ( undefined === isActive ) {
			isActive = this.model.get( 'defaultActive' );
		}

		if ( ! this.collection.length && this.model.get( 'hideIfEmpty' ) ) {
			this.$el.css( 'display', 'none' );
		}

		if ( isActive ) {
			this.$el.addClass( 'refraction-active' );
		} else {
			this.ui.items.css( 'display', 'none' );
		}
	},

	onTitleClick() {
		this.toggle();

		refractionCommon.eventsManager.dispatchEvent(
			refractionCommon.eventsManager.config.names[ this.model.get( 'name' ) ]?.v1,
			{
				location: refractionCommon.eventsManager.config.locations.widgetPanel,
				secondaryLocation:
          refractionCommon.eventsManager.config.secondaryLocations[ this.model.get( 'name' ) ],
				trigger: refractionCommon.eventsManager.config.triggers.accordionClick,
				element: refractionCommon.eventsManager.config.elements.accordionSection,
			},
		);
	},

	toggle( state, animate = true ) {
		var $items = this.ui.items,
			activeClass = 'refraction-active',
			isActive = undefined !== state ? ! state : this.$el.hasClass( activeClass ),
			visibilityFn = isActive ? 'hide' : 'show',
			slideFn = isActive ? 'slideUp' : 'slideDown',
			updateScrollbar = () => refraction.getPanelView().updateScrollbar();

		refraction.channels.panelElements.reply(
			'category:' + this.model.get( 'name' ) + ':active',
			! isActive,
		);

		this.$el.toggleClass( activeClass, ! isActive );

		if ( animate ) {
			$items[ slideFn ]( 300, updateScrollbar );
		} else {
			$items[ visibilityFn ]( 0, updateScrollbar );
		}
	},

	onChipClick( event ) {
		event.stopPropagation();

		document.dispatchEvent(
			new CustomEvent( 'alphachip:open', {
				detail: { target: this.$el },
			} ),
		);
	},

	onCustomWidgetsCtaClick( event ) {
		event.stopPropagation();

		window.dispatchEvent(
			new CustomEvent( 'refraction/editor/create-widget', {
				detail: {
					prompt: CREATE_WIDGET_PROMPT,
					entry_point: 'widgets_panel',
				},
			} ),
		);
	},

	onPromotionLinkClick( event ) {
		event.stopPropagation();
	},
} );

module.exports = PanelElementsCategoryView;
