import Base from 'refraction-frontend/handlers/base';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const prefersReducedMotion = () => !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );

/**
 * Mega Menu: dropdown panels are the item containers. A closed panel is `hidden`, so it costs no layout.
 * The menu is "mobile" while its menu button is displayed (the stylesheet decides, per breakpoint), or when
 * it sits inside an Off-Canvas panel.
 */
export default class MegaMenu extends Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.refraction-mm',
				items: '.refraction-mm__item',
				toggle: '.refraction-mm__toggle',
				close: '.refraction-mm__close',
				scrim: '.refraction-mm__scrim',
				drawer: '.refraction-mm__drawer',
			},
		};
	}

	getDefaultElements() {
		const s = this.getSettings( 'selectors' );

		return {
			$root: this.$element.find( s.root ),
			$toggle: this.$element.find( s.toggle ),
			$close: this.$element.find( s.close ),
			$scrim: this.$element.find( s.scrim ),
			$drawer: this.$element.find( s.drawer ),
		};
	}

	onInit() {
		super.onInit();

		this.root = this.elements.$root[ 0 ];

		if ( ! this.root ) {
			return;
		}

		this.openItem = null;
		this.timers = new Map();

		if ( this.root.closest( '.refraction-offcanvas__panel' ) ) {
			this.root.classList.add( 'is-embedded' );
		}

		// Each trigger starts as the only Tab stop of its item; panels already carry `hidden` from the server.
		this.markCurrentTopLevel();
	}

	get isMobile() {
		const toggle = this.elements.$toggle[ 0 ];

		return this.root.classList.contains( 'is-embedded' ) || !! ( toggle && 'none' !== getComputedStyle( toggle ).display );
	}

	get isOffcanvas() {
		return 'offcanvas' === this.root.dataset.mobileLayout && this.isMobile && ! this.root.classList.contains( 'is-embedded' );
	}

	items() {
		return Array.from( this.root.querySelectorAll( ':scope .refraction-mm__list > .refraction-mm__item' ) );
	}

	topLevelControls() {
		return this.items().map( ( li ) => li.querySelector( ':scope > .refraction-mm__link' ) ).filter( Boolean );
	}

	markCurrentTopLevel() {
		// Nothing to compute: the server marks the current page with aria-current. Kept for subclass hooks.
	}

	panelOf( li ) {
		return li ? li.querySelector( ':scope > .refraction-mm__panel' ) : null;
	}

	bindEvents() {
		if ( ! this.root || this.isEdit ) {
			return;
		}

		const root = this.root;

		this.onClick = ( event ) => {
			const trigger = event.target.closest( '.refraction-mm__trigger' );

			if ( trigger && root.contains( trigger ) ) {
				this.onTriggerClick( trigger, event );
			}
		};

		this.onPointerOver = ( event ) => {
			if ( 'mouse' !== event.pointerType || this.isMobile || 'hover' !== root.dataset.trigger ) {
				return;
			}

			const li = event.target.closest( '.refraction-mm__item' );

			if ( li && li.classList.contains( 'has-dropdown' ) && ! li.contains( event.relatedTarget ) ) {
				this.scheduleOpen( li );
			} else if ( li && ! li.classList.contains( 'has-dropdown' ) && ! li.contains( event.relatedTarget ) ) {
				// Moving onto a plain link closes an open dropdown after the usual delay.
				this.scheduleClose( this.openItem );
			}
		};

		this.onPointerOut = ( event ) => {
			if ( 'mouse' !== event.pointerType || this.isMobile || 'hover' !== root.dataset.trigger ) {
				return;
			}

			const li = event.target.closest( '.refraction-mm__item' );

			if ( li && li.classList.contains( 'has-dropdown' ) && ! li.contains( event.relatedTarget ) ) {
				this.cancelTimer( li );
				this.scheduleClose( li );
			}
		};

		this.onKeydown = ( event ) => this.handleKeydown( event );

		this.onFocusOut = ( event ) => {
			const li = event.target.closest( '.refraction-mm__item' );

			if ( li && this.openItem === li && ! li.contains( event.relatedTarget ) && ! this.isMobile ) {
				this.closeItem( li );
			}
		};

		this.onDocumentPointerDown = ( event ) => {
			if ( ! root.contains( event.target ) ) {
				this.closeAll();

				if ( this.menuOpen ) {
					this.setMenuOpen( false, false );
				}
			}
		};

		this.onPointerDownRoot = ( event ) => {
			this.lastPointerType = event.pointerType;
		};

		root.addEventListener( 'pointerdown', this.onPointerDownRoot );
		root.addEventListener( 'click', this.onClick );
		root.addEventListener( 'pointerover', this.onPointerOver );
		root.addEventListener( 'pointerout', this.onPointerOut );
		root.addEventListener( 'keydown', this.onKeydown );
		root.addEventListener( 'focusout', this.onFocusOut );
		document.addEventListener( 'pointerdown', this.onDocumentPointerDown );

		this.elements.$toggle.on( 'click', () => this.setMenuOpen( ! this.menuOpen ) );
		this.elements.$close.on( 'click', () => this.setMenuOpen( false ) );
		this.elements.$scrim.on( 'click', () => this.setMenuOpen( false ) );

		// Leaving the mobile layout (resize/rotate) resets the menu so nothing stays open off-screen.
		this.onResize = () => {
			if ( ! this.isMobile && this.menuOpen ) {
				this.setMenuOpen( false, false );
			}

			if ( this.openItem && ! this.isMobile ) {
				this.positionPanel( this.openItem );
			}
		};
		window.addEventListener( 'resize', this.onResize );
	}

	onDestroy() {
		if ( this.root ) {
			document.removeEventListener( 'pointerdown', this.onDocumentPointerDown );
			window.removeEventListener( 'resize', this.onResize );
			this.timers?.forEach( ( id ) => clearTimeout( id ) );

			if ( this.menuOpen ) {
				this.setMenuOpen( false, false );
			}
		}

		super.onDestroy();
	}

	// ---- Timers -----------------------------------------------------------------------------

	cancelTimer( li ) {
		clearTimeout( this.timers.get( li ) );
		this.timers.delete( li );
	}

	scheduleOpen( li ) {
		this.cancelTimer( li );

		if ( this.openItem === li ) {
			return;
		}

		this.timers.set( li, setTimeout( () => this.openItemNow( li ), Number( this.root.dataset.hoverDelay ) || 0 ) );
	}

	scheduleClose( li ) {
		if ( ! li ) {
			return;
		}

		this.cancelTimer( li );
		this.timers.set( li, setTimeout( () => this.closeItem( li ), Number( this.root.dataset.closeDelay ) || 0 ) );
	}

	// ---- Open / close -----------------------------------------------------------------------

	openItemNow( li, focusPanel = false ) {
		const panel = this.panelOf( li );

		if ( ! panel ) {
			return;
		}

		this.cancelTimer( li );

		if ( this.openItem && this.openItem !== li ) {
			this.closeItem( this.openItem, true );
		}

		this.openItem = li;
		li.classList.add( 'is-open' );
		li.querySelector( ':scope > .refraction-mm__trigger' )?.setAttribute( 'aria-expanded', 'true' );
		panel.hidden = false;
		this.positionPanel( li );
		// A reflow makes the opening transition start from the closed state.
		void panel.offsetWidth;
		panel.classList.add( 'is-open' );

		// Swipers, maps and other measuring widgets inside the dropdown need a size to lay out.
		panel.dispatchEvent( new CustomEvent( 'refraction-mm:open', { bubbles: true } ) );
		window.dispatchEvent( new Event( 'resize' ) );

		if ( focusPanel ) {
			const first = panel.querySelector( FOCUSABLE );

			( first || panel ).focus?.( { preventScroll: true } );
		}
	}

	closeItem( li, immediate = false ) {
		if ( ! li ) {
			return;
		}

		const panel = this.panelOf( li );

		this.cancelTimer( li );
		li.classList.remove( 'is-open' );
		li.querySelector( ':scope > .refraction-mm__trigger' )?.setAttribute( 'aria-expanded', 'false' );

		if ( this.openItem === li ) {
			this.openItem = null;
		}

		if ( ! panel ) {
			return;
		}

		panel.classList.remove( 'is-open' );

		const hide = () => {
			if ( ! li.classList.contains( 'is-open' ) ) {
				panel.hidden = true;
			}
		};

		if ( immediate || prefersReducedMotion() || this.isMobile ) {
			hide();
		} else {
			setTimeout( hide, 170 );
		}
	}

	closeAll() {
		this.items().forEach( ( li ) => {
			if ( li.classList.contains( 'is-open' ) ) {
				this.closeItem( li );
			}
		} );
	}

	positionPanel( li ) {
		const panel = this.panelOf( li );

		if ( ! panel ) {
			return;
		}

		// Full width panels start at the left edge of the viewport whatever the menu's position.
		if ( 'full' === this.root.dataset.width && 'horizontal' === this.root.dataset.layout && ! this.isMobile ) {
			const rect = this.root.getBoundingClientRect(),
				rtl = 'rtl' === getComputedStyle( this.root ).direction,
				shift = rtl ? rect.right - document.documentElement.clientWidth : -rect.left;

			panel.style.setProperty( '--refraction-mm-shift', ( rtl ? shift : shift ) + 'px' );
		} else {
			panel.style.removeProperty( '--refraction-mm-shift' );
		}
	}

	onTriggerClick( trigger, event ) {
		const li = trigger.closest( '.refraction-mm__item' ),
			isOpen = li.classList.contains( 'is-open' ),
			mouseClick = 'mouse' === ( this.lastPointerType || '' ) && event.detail > 0;

		// With hover opening, a mouse click on an item the pointer just opened keeps it open.
		if ( ! this.isMobile && 'hover' === this.root.dataset.trigger && mouseClick && isOpen ) {
			return;
		}

		if ( isOpen ) {
			this.closeItem( li );
		} else {
			this.openItemNow( li );
		}
	}

	setMenuOpen( open, restoreFocus = true ) {
		if ( this.menuOpen === open ) {
			return;
		}

		this.menuOpen = open;
		this.root.classList.toggle( 'is-menu-open', open );
		this.elements.$toggle.attr( 'aria-expanded', open ? 'true' : 'false' );

		const offcanvas = this.isOffcanvas;

		if ( offcanvas ) {
			this.elements.$scrim[ 0 ] && ( this.elements.$scrim[ 0 ].hidden = ! open );
			document.documentElement.classList.toggle( 'refraction-oc-scroll-lock', open );

			if ( open ) {
				this.returnTo = document.activeElement;
				( this.elements.$close[ 0 ] || this.elements.$drawer[ 0 ] ).focus?.( { preventScroll: true } );
			} else if ( restoreFocus ) {
				( this.returnTo || this.elements.$toggle[ 0 ] )?.focus?.( { preventScroll: true } );
			}
		}

		if ( ! open ) {
			this.closeAll();
			this.elements.$scrim[ 0 ] && ( this.elements.$scrim[ 0 ].hidden = true );
			document.documentElement.classList.remove( 'refraction-oc-scroll-lock' );

			if ( ! offcanvas && restoreFocus && this.root.contains( document.activeElement ) ) {
				this.elements.$toggle[ 0 ]?.focus?.( { preventScroll: true } );
			}
		}
	}

	// ---- Keyboard ---------------------------------------------------------------------------

	handleKeydown( event ) {
		const { key } = event,
			vertical = 'vertical' === this.root.dataset.layout && ! this.isMobile,
			rtl = 'rtl' === getComputedStyle( this.root ).direction,
			next = vertical ? 'ArrowDown' : ( rtl ? 'ArrowLeft' : 'ArrowRight' ),
			prev = vertical ? 'ArrowUp' : ( rtl ? 'ArrowRight' : 'ArrowLeft' ),
			openKey = vertical ? ( rtl ? 'ArrowLeft' : 'ArrowRight' ) : 'ArrowDown',
			li = event.target.closest( '.refraction-mm__item' ),
			inPanel = !! event.target.closest( '.refraction-mm__panel' );

		this.lastPointerType = 'keyboard';

		if ( 'Escape' === key ) {
			if ( this.openItem ) {
				const item = this.openItem,
					trigger = item.querySelector( ':scope > .refraction-mm__trigger' ),
					hadFocus = item.contains( document.activeElement );

				event.stopPropagation();
				this.closeItem( item );

				if ( hadFocus ) {
					trigger?.focus( { preventScroll: true } );
				}
			} else if ( this.menuOpen ) {
				event.stopPropagation();
				this.setMenuOpen( false );
			}

			return;
		}

		if ( this.isOffcanvas && this.menuOpen && 'Tab' === key ) {
			this.trapDrawerTab( event );
			return;
		}

		// Arrow keys inside a dropdown belong to its content.
		if ( inPanel || ! li ) {
			return;
		}

		const controls = this.topLevelControls(),
			current = li.querySelector( ':scope > .refraction-mm__link' ),
			index = controls.indexOf( current );

		if ( index < 0 || event.target !== current ) {
			return;
		}

		let target = null;

		if ( key === next ) {
			target = controls[ ( index + 1 ) % controls.length ];
		} else if ( key === prev ) {
			target = controls[ ( index - 1 + controls.length ) % controls.length ];
		} else if ( 'Home' === key ) {
			target = controls[ 0 ];
		} else if ( 'End' === key ) {
			target = controls[ controls.length - 1 ];
		} else if ( key === openKey && li.classList.contains( 'has-dropdown' ) && ! this.isMobile ) {
			event.preventDefault();
			this.openItemNow( li, true );
			return;
		}

		if ( target ) {
			event.preventDefault();

			if ( this.openItem && this.openItem !== target.closest( '.refraction-mm__item' ) ) {
				this.closeItem( this.openItem, true );
			}

			target.focus();
		}
	}

	trapDrawerTab( event ) {
		const items = Array.from( this.elements.$drawer[ 0 ].querySelectorAll( FOCUSABLE ) ).filter( ( el ) => el.offsetWidth || el.offsetHeight || el.getClientRects().length );

		if ( ! items.length ) {
			return;
		}

		const first = items[ 0 ],
			last = items[ items.length - 1 ];

		if ( event.shiftKey && document.activeElement === first ) {
			event.preventDefault();
			last.focus();
		} else if ( ! event.shiftKey && document.activeElement === last ) {
			event.preventDefault();
			first.focus();
		}
	}
}
