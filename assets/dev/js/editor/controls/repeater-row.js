import ControlsStack from 'refraction-views/controls-stack';

module.exports = Marionette.CompositeView.extend( {
	template: Marionette.TemplateCache.get( '#tmpl-refraction-repeater-row' ),

	className: 'refraction-repeater-fields',

	attributes: {
		role: 'listitem',
	},

	ui() {
		return {
			duplicateButton: '.refraction-repeater-tool-duplicate',
			editButton: '.refraction-repeater-tool-edit',
			removeButton: '.refraction-repeater-tool-remove',
			itemTitle: '.refraction-repeater-row-item-title',
		};
	},

	behaviors: {
		HandleInnerTabs: {
			behaviorClass: require( 'refraction-behaviors/inner-tabs' ),
		},
	},

	triggers: {
		'click @ui.removeButton': 'click:remove',
		'click @ui.duplicateButton': 'click:duplicate',
		'click @ui.itemTitle': 'click:edit',
	},

	modelEvents: {
		change: 'onModelChange',
	},

	templateHelpers() {
		return {
			itemIndex: this.getOption( 'itemIndex' ),
			itemActions: this.getOption( 'itemActions' ),
		};
	},

	childViewContainer: '.refraction-repeater-row-controls',

	getChildView( item ) {
		var controlType = item.get( 'type' );

		return refraction.getControlView( controlType );
	},

	getChildControlView( name ) {
		return this.getControlViewByModel( this.getControlModel( name ) );
	},

	getControlViewByModel( model ) {
		return this.children.findByModelCid( model.cid );
	},

	getControlModel( name ) {
		return this.collection.findWhere( { name } );
	},

	childViewOptions() {
		return {
			container: this.options.container,
		};
	},

	updateIndex( newIndex ) {
		this.itemIndex = newIndex;
	},

	setTitle() {
		const titleField = this.getOption( 'titleField' );

		let title = '';

		if ( titleField ) {
			title = Marionette.TemplateCache.prototype.compileTemplate( titleField )( this.model.parseDynamicSettings() );
		}

		if ( ! title ) {
			/* Translators: %s: Item Index (number). */
			title = sprintf( __( 'Item #%s', 'refraction' ), this.getOption( 'itemIndex' ) );
		}

		this.ui.itemTitle.html( title );
	},

	toggleSort( enable ) {
		this.$el.toggleClass( 'refraction-repeater-row--disable-sort', ! enable );
	},

	initialize( options ) {
		this.itemIndex = 0;

		// Collection for Controls list
		this.collection = new Backbone.Collection( _.values( refraction.mergeControlsSettings( options.controlFields ) ) );
	},

	onRender() {
		this.setTitle();

		ControlsStack.handlePopovers( this );
	},

	onModelChange() {
		if ( this.getOption( 'titleField' ) ) {
			this.setTitle();
		}
	},

	onChildviewResponsiveSwitcherClick( childView, device ) {
		if ( 'desktop' === device ) {
			refraction.getPanelView().getCurrentPageView().$el.toggleClass( 'refraction-responsive-switchers-open' );
		}
	},
} );
