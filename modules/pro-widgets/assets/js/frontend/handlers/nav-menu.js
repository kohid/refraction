export default class NavMenu extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				nav: '.refraction-nav-menu',
				toggle: '.refraction-nav-menu__toggle',
				subToggle: '.refraction-nav-menu__subtoggle',
				item: '.refraction-nav-menu__item',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$nav: this.$element.find( selectors.nav ),
			$toggle: this.$element.find( selectors.toggle ),
		};
	}

	// Handlers are bound here (not as class fields): the base class calls bindEvents() from its constructor,
	// before class fields exist.
	bindEvents() {
		const selectors = this.getSettings( 'selectors' );

		this.boundDocumentClick = this.onDocumentClick.bind( this );
		this.elements.$toggle.on( 'click', this.onToggleClick.bind( this ) );
		this.elements.$nav.on( 'click', selectors.subToggle, this.onSubToggleClick.bind( this ) );
		this.elements.$nav.on( 'keydown', this.onKeyDown.bind( this ) );
		jQuery( document ).on( 'click', this.boundDocumentClick );
	}

	onDestroy() {
		super.onDestroy();
		jQuery( document ).off( 'click', this.boundDocumentClick );
	}

	setMenuOpen( open ) {
		this.elements.$nav.toggleClass( 'is-open', open );
		this.elements.$toggle.attr( 'aria-expanded', open ? 'true' : 'false' );
	}

	setSubOpen( $item, open ) {
		$item.toggleClass( 'is-open', open );
		$item.children( this.getSettings( 'selectors' ).subToggle ).attr( 'aria-expanded', open ? 'true' : 'false' );

		if ( ! open ) {
			// Closing a parent closes everything below it.
			$item.find( this.getSettings( 'selectors' ).item + '.is-open' ).each( ( i, el ) => this.setSubOpen( jQuery( el ), false ) );
		}
	}

	onToggleClick() {
		const open = ! this.elements.$nav.hasClass( 'is-open' );

		this.setMenuOpen( open );

		if ( ! open ) {
			this.closeAllSubs();
		}
	}

	onSubToggleClick( event ) {
		const $item = jQuery( event.currentTarget ).closest( this.getSettings( 'selectors' ).item );

		// Close siblings so only one branch is open per level.
		$item.siblings( '.is-open' ).each( ( i, el ) => this.setSubOpen( jQuery( el ), false ) );
		this.setSubOpen( $item, ! $item.hasClass( 'is-open' ) );
	}

	closeAllSubs() {
		this.elements.$nav.find( this.getSettings( 'selectors' ).item + '.is-open' ).each( ( i, el ) => this.setSubOpen( jQuery( el ), false ) );
	}

	onKeyDown( event ) {
		if ( 'Escape' !== event.key ) {
			return;
		}

		const hadSub = this.elements.$nav.find( this.getSettings( 'selectors' ).item + '.is-open' ).length > 0;

		this.closeAllSubs();

		if ( this.elements.$nav.hasClass( 'is-open' ) ) {
			this.setMenuOpen( false );
			this.elements.$toggle.trigger( 'focus' );
		} else if ( hadSub ) {
			this.elements.$nav.find( ':focus' ).blur();
		}
	}

	onDocumentClick( event ) {
		if ( ! this.elements.$nav.hasClass( 'is-open' ) && ! this.elements.$nav.find( '.is-open' ).length ) {
			return;
		}

		if ( ! jQuery( event.target ).closest( this.elements.$nav ).length ) {
			this.closeAllSubs();
			this.setMenuOpen( false );
		}
	}
}
