export default class NavMenu extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				nav: '.refraction-nav-menu',
				toggle: '.refraction-nav-menu__toggle',
				subToggle: '.refraction-nav-menu__subtoggle',
				item: '.refraction-nav-menu__item',
				panel: '.refraction-nav-menu__panel',
				close: '.refraction-nav-menu__close, .refraction-nav-menu__backdrop',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$nav: this.$element.find( selectors.nav ),
			$toggle: this.$element.find( selectors.toggle ),
			$panel: this.$element.find( selectors.panel ),
		};
	}

	// Handlers are bound here (not as class fields): the base class calls bindEvents() from its constructor,
	// before class fields exist.
	bindEvents() {
		const selectors = this.getSettings( 'selectors' );

		this.boundDocumentClick = this.onDocumentClick.bind( this );
		this.boundResize = this.stretch.bind( this );
		this.elements.$toggle.on( 'click', this.onToggleClick.bind( this ) );
		this.elements.$nav.on( 'click', selectors.close, () => this.close() );
		jQuery( window ).on( 'resize', this.boundResize );
		this.elements.$nav.on( 'click', selectors.subToggle, this.onSubToggleClick.bind( this ) );
		this.elements.$nav.on( 'keydown', this.onKeyDown.bind( this ) );
		jQuery( document ).on( 'click', this.boundDocumentClick );

		this.boundBrandScroll = () => {
			if ( ! this.brandFrame ) {
				this.brandFrame = requestAnimationFrame( () => {
					this.brandFrame = 0;
					this.updateBrand();
				} );
			}
		};
		window.addEventListener( 'scroll', this.boundBrandScroll, { passive: true } );
		this.updateBrand( true );
	}

	/**
	 * Logo or Site Title: shown only once the page is scrolled down past the scroll point ('after'), or until then
	 * ('before'), with is-brand-hidden; past it the nav has is-scrolled for the After Scrolling look. The animations
	 * are CSS (nav-menu.scss); the first state is set without animating.
	 *
	 * @param {boolean} instant Set the state without its animation.
	 */
	updateBrand( instant = false ) {
		const $nav = this.elements.$nav;
		const show = this.getElementSettings( 'bar_brand_show' ) || 'always';

		if ( ! this.getElementSettings( 'bar_brand' ) ) {
			$nav.removeClass( 'is-brand-hidden is-scrolled' );
			return;
		}

		const offset = Math.max( 0, Number( this.getElementSettings( 'bar_brand_offset' ) ) || 0 );
		const scrolled = ( window.scrollY || document.documentElement.scrollTop ) >= offset;
		const hidden = 'always' !== show && ( 'after' === show ? ! scrolled : scrolled );

		if ( hidden === $nav.hasClass( 'is-brand-hidden' ) && scrolled === $nav.hasClass( 'is-scrolled' ) && ! instant ) {
			return;
		}

		if ( instant ) {
			$nav.addClass( 'is-brand-instant' );
		}

		// Is-scrolled: Style > Logo or Site Title > After Scrolling.
		$nav.toggleClass( 'is-brand-hidden', hidden ).toggleClass( 'is-scrolled', scrolled );

		if ( instant ) {
			void $nav[ 0 ]?.offsetWidth; // eslint-disable-line no-void
			requestAnimationFrame( () => $nav.removeClass( 'is-brand-instant' ) );
		}
	}

	onElementChange( setting ) {
		if ( 0 === setting.indexOf( 'bar_brand' ) ) {
			this.updateBrand( true );
		}
	}

	onDestroy() {
		super.onDestroy();
		jQuery( document ).off( 'click', this.boundDocumentClick );
		jQuery( window ).off( 'resize', this.boundResize );
		window.removeEventListener( 'scroll', this.boundBrandScroll );
		cancelAnimationFrame( this.brandFrame );
		this.lockPage( false );
	}

	setMenuOpen( open ) {
		const $nav = this.elements.$nav;

		clearTimeout( this.closingTimer );
		this.elements.$toggle.attr( 'aria-expanded', open ? 'true' : 'false' );

		if ( open ) {
			$nav.removeClass( 'is-closing' ).addClass( 'is-open' );
			this.stretch();
			this.lockPage( true );

			return;
		}

		if ( ! $nav.hasClass( 'is-open' ) ) {
			return;
		}

		// Closing plays the panel's animation backwards, then hides it.
		const duration = this.panelDuration();

		this.lockPage( false );

		if ( ! duration ) {
			$nav.removeClass( 'is-open is-closing' );

			return;
		}

		$nav.addClass( 'is-closing' );
		this.closingTimer = setTimeout( () => $nav.removeClass( 'is-open is-closing' ), duration );
	}

	close() {
		this.closeAllSubs();
		this.setMenuOpen( false );
	}

	/** The panel's animation length in ms (0 when it has none or is not shown). */
	panelDuration() {
		const panel = this.elements.$panel[ 0 ];

		if ( ! panel || 'none' === getComputedStyle( panel ).display || 'none' === getComputedStyle( panel ).animationName ) {
			return 0;
		}

		return parseFloat( getComputedStyle( panel ).animationDuration ) * 1000 || 0;
	}

	/** A dropdown stretched to the screen: offset it to the screen's left edge. */
	stretch() {
		const nav = this.elements.$nav[ 0 ];

		if ( nav ) {
			nav.style.setProperty( '--refraction-nav-stretch-left', ( -nav.getBoundingClientRect().left ) + 'px' );
			// The page's width without the scrollbar (100vw includes it and would scroll sideways).
			nav.style.setProperty( '--refraction-nav-stretch-width', document.documentElement.clientWidth + 'px' );
		}
	}

	/**
	 * A panel over the whole page (side or full screen) keeps the page from scrolling under it.
	 *
	 * @param {boolean} lock Lock (true) or release (false) the page's scrolling.
	 */
	lockPage( lock ) {
		const panel = this.elements.$panel[ 0 ],
			covers = lock && panel && 'fixed' === getComputedStyle( panel ).position;

		document.documentElement.classList.toggle( 'refraction-nav-menu-locked', !! covers );
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
		this.playClickAnimation();

		// While it is closing, a click opens it again.
		const open = ! this.elements.$nav.hasClass( 'is-open' ) || this.elements.$nav.hasClass( 'is-closing' );

		this.setMenuOpen( open );

		if ( ! open ) {
			this.closeAllSubs();
		}
	}

	// The button's click animation (Hamburger Button > Click Animation) is a CSS animation on is-clicked: taken off and
	// put back so every click plays it again.
	playClickAnimation() {
		const button = this.elements.$toggle[ 0 ];

		if ( ! button ) {
			return;
		}

		button.classList.remove( 'is-clicked' );
		void button.offsetWidth; // eslint-disable-line no-void -- restarts the animation.
		button.classList.add( 'is-clicked' );
		clearTimeout( this.clickTimer );
		this.clickTimer = setTimeout( () => button.classList.remove( 'is-clicked' ), 700 );
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
			this.elements.$nav.find( ':focus' ).trigger( 'blur' );
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
