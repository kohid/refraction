/**
 * Each item's dropdown container sits inside its `<li>`. A container of a link item is never printed on the
 * front end, so it stays out of sight here too; the dropdown of the item being edited is shown open.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	initialize( ...args ) {
		super.initialize( ...args );

		this.listenTo( this.getEditModel().get( 'editSettings' ), 'change:activeItemIndex', () => this.syncPanels() );
	}

	onAddChild( childView ) {
		this.decoratePanel( childView );
	}

	onRender() {
		super.onRender();

		// On the first render the containers are attached after the menu, once all children exist (onAddChild
		// runs before they are in the DOM), so each one is moved into its own item here.
		this.children.each( ( childView ) => this.decoratePanel( childView ) );
		this.syncPanels();
	}

	itemOf( index ) {
		const items = this.getEditModel().get( 'settings' ).get( 'items' );

		return items?.models?.[ index - 1 ];
	}

	decoratePanel( childView ) {
		const index = childView.model.attributes.dataIndex,
			// On the first render the containers are attached after the menu; each belongs inside its own item.
			listItem = this.$el.find( '.refraction-mm__list > .refraction-mm__item' )[ index - 1 ],
			item = this.itemOf( index ),
			widgetId = this.model.get( 'id' ),
			trigger = this.$el.find( `.refraction-mm__item:nth-child(${ index }) .refraction-mm__trigger` );

		if ( listItem && childView.el.parentNode !== listItem ) {
			listItem.appendChild( childView.el );
		}

		childView.$el.addClass( 'refraction-mm__panel' ).attr( {
			id: `refraction-mm-${ widgetId }-p${ index }`,
			role: 'region',
			'aria-labelledby': trigger.attr( 'id' ) || null,
			'data-panel-index': index,
		} );

		childView.$el.toggleClass( 'refraction-mm__panel--unused', 'dropdown' !== ( item?.get( 'item_type' ) || 'link' ) );
		this.syncPanels();
	}

	syncPanels() {
		const active = this.getEditModel().get( 'editSettings' ).get( 'activeItemIndex' ) || 0;

		this.$el.find( '.refraction-mm__panel' ).each( ( _, el ) => {
			const isActive = +el.dataset.panelIndex === +active;

			el.classList.toggle( 'is-open', isActive );
		} );

		this.$el.find( '.refraction-mm__trigger' ).each( ( _, el ) => {
			el.setAttribute( 'aria-expanded', +el.dataset.index === +active ? 'true' : 'false' );
		} );
	}
}
