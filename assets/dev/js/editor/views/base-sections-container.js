var BaseContainer = require( 'refraction-views/base-container' ),
	BaseSectionsContainerView,
	{ getAllElementTypes } = require( 'refraction-editor/utils/element-types' );

BaseSectionsContainerView = BaseContainer.extend( {
	getChildView( model ) {
		const elType = model.get( 'elType' );
		const type = refraction.elementsManager.getElementTypeClass( elType );

		if ( ! type ) {
			throw new Error( `Element type "${ elType }" is not registered.` );
		}

		return type.getView();
	},

	behaviors() {
		const sectionElementType = 'section';
		var behaviors = {
			Sortable: {
				behaviorClass: require( 'refraction-behaviors/sortable' ),
				elChildType: sectionElementType,
			},
		};

		return refraction.hooks.applyFilters( 'elements/base-section-container/behaviors', behaviors, this );
	},

	getSortableOptions() {
		return {
			handle: '> .refraction-element-overlay .refraction-editor-element-edit',
			items: '> .refraction-section, > .e-con',
		};
	},

	getChildType() {
		return getAllElementTypes();
	},

	initialize() {
		BaseContainer.prototype.initialize.apply( this, arguments );

		this.listenTo( refraction.channels.panelElements, 'element:drag:start', this.onPanelElementDragStart )
			.listenTo( refraction.channels.panelElements, 'element:drag:end', this.onPanelElementDragEnd );
	},

	onPanelElementDragStart() {
		// A temporary workaround in order to fix Chrome's 70+ dragging above nested iframe bug
		this.$el.find( '.refraction-background-video-embed' ).hide();

		refraction.helpers.disableElementEvents( this.$el.find( 'iframe' ) );
	},

	onPanelElementDragEnd() {
		this.$el.find( '.refraction-background-video-embed' ).show();

		refraction.helpers.enableElementEvents( this.$el.find( 'iframe' ) );
	},
} );

module.exports = BaseSectionsContainerView;
