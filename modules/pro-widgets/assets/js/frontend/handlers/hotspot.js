/**
 * Hotspot: opens and closes the tooltips (click, hover/focus or always visible) and keeps them inside the image box.
 */
export default class Hotspot extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				wrapper: '.refraction-hotspot',
				point: '.refraction-hotspot__point',
				marker: '.refraction-hotspot__marker',
				tip: '.refraction-hotspot__tip',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$wrapper: this.$element.find( selectors.wrapper ),
			$points: this.$element.find( selectors.point ),
		};
	}

	getTrigger() {
		return this.elements.$wrapper.attr( 'data-trigger' ) || 'click';
	}

	setOpen( point, open ) {
		const marker = point.querySelector( '.refraction-hotspot__marker' ),
			tip = point.querySelector( '.refraction-hotspot__tip' );

		if ( ! marker || ! tip ) {
			return;
		}

		point.classList.toggle( 'is-open', open );
		marker.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
		tip.hidden = ! open;

		if ( open ) {
			this.keepInside( point, tip );
		}
	}

	// Shift the tooltip sideways when it would stick out of the widget.
	keepInside( point, tip ) {
		tip.style.setProperty( '--refraction-hs-shift', '0px' );

		const box = this.elements.$wrapper[ 0 ].getBoundingClientRect(),
			rect = tip.getBoundingClientRect();
		let shift = 0;

		if ( rect.left < box.left ) {
			shift = box.left - rect.left;
		} else if ( rect.right > box.right ) {
			shift = box.right - rect.right;
		}

		tip.style.setProperty( '--refraction-hs-shift', `${ Math.round( shift ) }px` );
	}

	closeAll( except ) {
		this.elements.$points.each( ( i, point ) => {
			if ( point !== except ) {
				this.setOpen( point, false );
			}
		} );
	}

	bindEvents() {
		const trigger = this.getTrigger();

		if ( 'always' === trigger ) {
			this.elements.$points.each( ( i, point ) => this.keepInside( point, point.querySelector( '.refraction-hotspot__tip' ) ) );
			return;
		}

		this.pointerType = 'mouse';

		this.elements.$points.on( 'pointerdown', ( event ) => {
			this.pointerType = event.originalEvent.pointerType || 'mouse';
		} );

		this.elements.$points.on( 'click', '.refraction-hotspot__marker', ( event ) => {
			const point = event.currentTarget.closest( '.refraction-hotspot__point' );

			// In hover mode a mouse click only confirms what hovering already showed; touch has no hover.
			if ( 'hover' === trigger && 'touch' !== this.pointerType ) {
				return;
			}

			const open = ! point.classList.contains( 'is-open' );

			this.closeAll( point );
			this.setOpen( point, open );
		} );

		if ( 'hover' === trigger ) {
			this.elements.$points.on( 'mouseenter focusin', ( event ) => {
				this.closeAll( event.currentTarget );
				this.setOpen( event.currentTarget, true );
			} );

			this.elements.$points.on( 'mouseleave', ( event ) => this.setOpen( event.currentTarget, false ) );
			this.elements.$points.on( 'focusout', ( event ) => {
				if ( ! event.currentTarget.contains( event.relatedTarget ) ) {
					this.setOpen( event.currentTarget, false );
				}
			} );
		}

		this.onKeydown = ( event ) => {
			if ( 'Escape' === event.key ) {
				this.closeAll( null );
			}
		};
		this.onOutside = ( event ) => {
			if ( ! event.target.closest( '.refraction-hotspot__point' ) || ! this.elements.$wrapper[ 0 ].contains( event.target ) ) {
				this.closeAll( null );
			}
		};

		document.addEventListener( 'keydown', this.onKeydown );
		document.addEventListener( 'pointerdown', this.onOutside );
	}

	unbindEvents() {
		this.elements.$points.off();
		document.removeEventListener( 'keydown', this.onKeydown );
		document.removeEventListener( 'pointerdown', this.onOutside );
	}
}
