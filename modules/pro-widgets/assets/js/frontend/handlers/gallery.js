/**
 * Gallery: filter buttons between the galleries. The lightbox only walks through the images that are shown,
 * so each filter gets its own lightbox group.
 */
export default class Gallery extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.refraction-gallery',
				filter: '.refraction-gallery__filter',
				item: '.refraction-gallery__item',
				status: '.refraction-gallery__status',
			},
		};
	}

	getDefaultElements() {
		const s = this.getSettings( 'selectors' );

		return {
			$root: this.$element.find( s.root ),
			$filters: this.$element.find( s.filter ),
			$items: this.$element.find( s.item ),
			$status: this.$element.find( s.status ),
		};
	}

	apply( filter, announce ) {
		const groupId = this.elements.$root.attr( 'data-lightbox-group' );
		let shown = 0;

		this.elements.$items.each( ( i, item ) => {
			const visible = '*' === filter || item.dataset.group === filter,
				link = item.querySelector( '.refraction-gallery__link' );

			item.hidden = ! visible;
			shown += visible ? 1 : 0;

			if ( link && link.hasAttribute( 'data-refraction-lightbox-slideshow' ) ) {
				link.setAttribute( 'data-refraction-lightbox-slideshow', visible ? `${ groupId }-${ filter }` : `${ groupId }-hidden` );
			}
		} );

		this.elements.$filters.each( ( i, button ) => button.setAttribute( 'aria-pressed', button.dataset.filter === filter ? 'true' : 'false' ) );

		if ( announce ) {
			this.elements.$status.text( `${ shown }` );
		}
	}

	onInit() {
		super.onInit();

		const pressed = this.elements.$filters.filter( '[aria-pressed="true"]' )[ 0 ];

		if ( pressed ) {
			this.apply( pressed.dataset.filter, false );
		}
	}

	bindEvents() {
		this.elements.$filters.on( 'click', ( event ) => this.apply( event.currentTarget.dataset.filter, true ) );
	}

	unbindEvents() {
		this.elements.$filters.off();
	}
}
