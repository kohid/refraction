import Base from 'refraction-frontend/handlers/base';

const HASH_PREFIX = '#refraction-offcanvas:';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

// Every Off-Canvas on the page, by panel id; one document listener serves all `#refraction-offcanvas:ID` links.
const instances = new Map();
let openCount = 0;
let globalsBound = false;

const parseHash = ( hash ) => {
	if ( ! hash || 0 !== hash.indexOf( HASH_PREFIX ) ) {
		return '';
	}

	const id = hash.slice( HASH_PREFIX.length );

	return /^[A-Za-z0-9_-]+$/.test( id ) ? id : '';
};

const bindGlobals = () => {
	if ( globalsBound ) {
		return;
	}

	globalsBound = true;

	document.addEventListener( 'click', ( event ) => {
		const link = event.target.closest && event.target.closest( 'a[href*="#refraction-offcanvas:"]' );

		if ( ! link ) {
			return;
		}

		const id = parseHash( new URL( link.href, window.location.href ).hash ),
			instance = instances.get( id );

		if ( instance ) {
			event.preventDefault();
			instance.open( link );
		}
	} );

	window.addEventListener( 'hashchange', () => {
		const instance = instances.get( parseHash( window.location.hash ) );

		if ( instance ) {
			instance.open();
		}
	} );

	window.refractionOffCanvas = {
		open: ( id ) => instances.get( id )?.open(),
		close: ( id ) => instances.get( id )?.close(),
		isOpen: ( id ) => !! instances.get( id )?.isOpen,
	};
};

export default class OffCanvas extends Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.refraction-offcanvas',
				layer: '.refraction-offcanvas__layer',
				panel: '.refraction-offcanvas__panel',
				trigger: '.refraction-offcanvas__trigger',
				close: '.refraction-offcanvas__close',
				overlay: '.refraction-offcanvas__overlay',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$root: this.$element.find( selectors.root ),
			$layer: this.$element.find( selectors.layer ),
			$panel: this.$element.find( selectors.panel ),
			$trigger: this.$element.find( selectors.trigger ),
			$close: this.$element.find( selectors.close ),
			$overlay: this.$element.find( selectors.overlay ),
		};
	}

	onInit() {
		super.onInit();

		this.isOpen = false;
		this.returnTo = null;
		this.root = this.elements.$root[ 0 ];

		if ( ! this.root ) {
			return;
		}

		this.data = this.root.dataset;
		this.panelId = this.data.panelId;

		bindGlobals();

		// The editor shows the panel open and in the flow; nothing to manage there.
		if ( this.isEdit ) {
			return;
		}

		instances.set( this.panelId, this );

		if ( parseHash( window.location.hash ) === this.panelId ) {
			this.open();
		}
	}

	bindEvents() {
		if ( this.isEdit || ! this.root ) {
			return;
		}

		this.onTriggerClick = () => ( this.isOpen ? this.close() : this.open( this.elements.$trigger[ 0 ] ) );
		this.onKeydown = ( event ) => this.handleKeydown( event );
		this.onFocusIn = ( event ) => {
			if ( this.isOpen && ! this.elements.$panel[ 0 ].contains( event.target ) ) {
				this.focusFirst();
			}
		};
		this.onDocumentClick = ( event ) => {
			const selector = this.data.triggerSelector;

			if ( ! selector ) {
				return;
			}

			let target = null;

			try {
				target = event.target.closest( selector );
			} catch ( error ) {
				return; // An invalid selector in the settings.
			}

			if ( target && ! this.root.contains( target ) ) {
				event.preventDefault();
				this.open( target );
			}
		};

		this.elements.$trigger.on( 'click', this.onTriggerClick );
		this.elements.$close.on( 'click', () => this.close() );
		this.elements.$overlay.on( 'click', () => {
			if ( 'yes' === this.data.closeOverlay ) {
				this.close();
			}
		} );
		document.addEventListener( 'keydown', this.onKeydown );
		document.addEventListener( 'focusin', this.onFocusIn );
		document.addEventListener( 'click', this.onDocumentClick );
	}

	onDestroy() {
		if ( this.isOpen ) {
			this.close( false );
		}

		instances.delete( this.panelId );
		document.removeEventListener( 'keydown', this.onKeydown );
		document.removeEventListener( 'focusin', this.onFocusIn );
		document.removeEventListener( 'click', this.onDocumentClick );

		super.onDestroy();
	}

	focusables() {
		return Array.from( this.elements.$panel[ 0 ].querySelectorAll( FOCUSABLE ) )
			.filter( ( el ) => ! el.hasAttribute( 'disabled' ) && ( el.offsetWidth || el.offsetHeight || el.getClientRects().length ) );
	}

	focusFirst() {
		const panel = this.elements.$panel[ 0 ];

		panel.focus( { preventScroll: true } );
	}

	handleKeydown( event ) {
		if ( ! this.isOpen ) {
			return;
		}

		// Only the top-most open panel reacts.
		if ( 'Escape' === event.key && 'yes' === this.data.closeEsc && ! event.defaultPrevented ) {
			event.stopPropagation();
			this.close();
			return;
		}

		if ( 'Tab' !== event.key ) {
			return;
		}

		const items = this.focusables(),
			panel = this.elements.$panel[ 0 ];

		if ( ! items.length ) {
			event.preventDefault();
			panel.focus();
			return;
		}

		const first = items[ 0 ],
			last = items[ items.length - 1 ],
			active = document.activeElement;

		if ( event.shiftKey && ( active === first || active === panel ) ) {
			event.preventDefault();
			last.focus();
		} else if ( ! event.shiftKey && active === last ) {
			event.preventDefault();
			first.focus();
		}
	}

	open( opener ) {
		if ( this.isOpen || ! this.root ) {
			return;
		}

		this.isOpen = true;
		this.returnTo = opener || document.activeElement;

		const layer = this.elements.$layer[ 0 ],
			panel = this.elements.$panel[ 0 ];

		layer.inert = false;
		layer.removeAttribute( 'inert' );
		panel.setAttribute( 'aria-hidden', 'false' );
		layer.classList.add( 'is-open' );
		this.elements.$trigger.attr( 'aria-expanded', 'true' );

		if ( 'push' === this.data.mode ) {
			this.push( true );
		} else if ( 'yes' === this.data.lockScroll ) {
			this.lockScroll( true );
		}

		openCount++;
		this.focusFirst();
		this.root.dispatchEvent( new CustomEvent( 'refraction-offcanvas:open', { bubbles: true, detail: { id: this.panelId } } ) );
	}

	close( restoreFocus = true ) {
		if ( ! this.isOpen ) {
			return;
		}

		this.isOpen = false;
		openCount = Math.max( 0, openCount - 1 );

		const layer = this.elements.$layer[ 0 ],
			panel = this.elements.$panel[ 0 ];

		layer.classList.remove( 'is-open' );
		layer.setAttribute( 'inert', '' );
		panel.setAttribute( 'aria-hidden', 'true' );
		this.elements.$trigger.attr( 'aria-expanded', 'false' );

		if ( 'push' === this.data.mode ) {
			this.push( false );
		} else if ( 'yes' === this.data.lockScroll ) {
			this.lockScroll( false );
		}

		const target = this.returnTo;

		this.returnTo = null;

		if ( restoreFocus && target && document.contains( target ) && 'function' === typeof target.focus ) {
			target.focus( { preventScroll: true } );
		}

		this.root.dispatchEvent( new CustomEvent( 'refraction-offcanvas:close', { bubbles: true, detail: { id: this.panelId } } ) );
	}

	lockScroll( lock ) {
		const html = document.documentElement;

		html.__refractionOcLocks = Math.max( 0, ( html.__refractionOcLocks || 0 ) + ( lock ? 1 : -1 ) );

		if ( lock && 1 === html.__refractionOcLocks ) {
			const gap = window.innerWidth - html.clientWidth;

			html.style.setProperty( '--refraction-oc-scrollbar-gap', gap + 'px' );
			html.style.paddingInlineEnd = gap ? gap + 'px' : '';
			html.classList.add( 'refraction-oc-scroll-lock' );
		} else if ( ! lock && 0 === html.__refractionOcLocks ) {
			html.classList.remove( 'refraction-oc-scroll-lock' );
			html.style.paddingInlineEnd = '';
		}
	}

	push( on ) {
		const body = document.body,
			position = this.data.position,
			cls = `refraction-oc-push-${ position }`,
			panel = this.elements.$panel[ 0 ];

		if ( on ) {
			const size = 'top' === position ? panel.offsetHeight : panel.offsetWidth;

			body.style.setProperty( '--refraction-oc-push-size', size + 'px' );
			body.classList.add( 'refraction-oc-push-ready' );
			// Make sure the transition starts from the closed state.
			void body.offsetWidth;
			body.classList.add( cls );
		} else {
			body.classList.remove( cls );
			clearTimeout( this.pushTimer );
			this.pushTimer = setTimeout( () => {
				if ( ! /refraction-oc-push-(left|right|top)/.test( body.className ) ) {
					body.classList.remove( 'refraction-oc-push-ready' );
				}
			}, 700 );
		}
	}
}
