/**
 * Flip Box: CSS handles hover/focus. This handler adds the click / Enter / Space / tap toggle.
 */
export default class FlipBox extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return { selectors: { box: '.refraction-flip-box' } };
	}

	getDefaultElements() {
		return { $box: this.$element.find( this.getSettings( 'selectors' ).box ) };
	}

	// Bound here, not as class fields: the base constructor calls bindEvents() before fields exist.
	bindEvents() {
		this.boundOutside = this.onOutside.bind( this );
		this.elements.$box.on( 'click', this.onClick.bind( this ) );
		this.elements.$box.on( 'keydown', this.onKeyDown.bind( this ) );
		jQuery( document ).on( 'click', this.boundOutside );
	}

	onDestroy() {
		super.onDestroy();
		jQuery( document ).off( 'click', this.boundOutside );
	}

	isClickMode() {
		return 'click' === this.getElementSettings( 'trigger' );
	}

	isTouch() {
		return window.matchMedia && window.matchMedia( '(hover: none)' ).matches;
	}

	setFlipped( flipped ) {
		this.elements.$box.toggleClass( 'is-flipped', flipped );

		if ( this.isClickMode() ) {
			this.elements.$box.attr( 'aria-expanded', flipped ? 'true' : 'false' );
		}
	}

	onClick( event ) {
		// Links and buttons on the back keep their own behaviour.
		if ( jQuery( event.target ).closest( 'a, button' ).length ) {
			return;
		}

		if ( this.isClickMode() || this.isTouch() ) {
			this.setFlipped( ! this.elements.$box.hasClass( 'is-flipped' ) );
		}
	}

	onKeyDown( event ) {
		if ( event.target !== this.elements.$box[ 0 ] ) {
			return;
		}

		if ( ( 'Enter' === event.key || ' ' === event.key ) && this.isClickMode() ) {
			event.preventDefault();
			this.setFlipped( ! this.elements.$box.hasClass( 'is-flipped' ) );
		} else if ( 'Escape' === event.key ) {
			this.setFlipped( false );
		}
	}

	onOutside( event ) {
		if ( this.elements.$box.hasClass( 'is-flipped' ) && ! jQuery( event.target ).closest( this.elements.$box ).length ) {
			this.setFlipped( false );
		}
	}
}
