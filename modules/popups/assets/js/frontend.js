/**
 * Refraction Popups, front end runtime. Vanilla JS, no dependencies.
 *
 * The server prints each matching popup hidden, with its widgets inside a <template>. This script
 * - decides which popups may open automatically (device, referrer, URL parameter, schedule, frequency),
 * - wires the triggers (page load, scroll, scroll up, click, exit intent, inactivity, page views),
 * - opens popups through a queue ordered by priority, and stacks popups opened by the visitor,
 * - handles focus (trap, return), Escape, overlay click, auto close, scroll lock and animations,
 * - exposes window.refractionPopup and the refraction:popup:* events.
 *
 * The rule logic mirrors modules/popups/classes/popup-rules.php; keep both in step.
 */
( function () {
	'use strict';

	const config = window.refractionPopups || {};
	const KEY = 'refraction_popup_';
	const PAGE_VIEWS_KEY = 'refraction_popup_pv';
	const BASE_Z = 99990;
	const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"], summary';

	const popups = new Map();
	const stack = [];
	let queue = [];
	let locks = 0;
	let lockPadding = '';
	let started = false;
	let queueTimer = 0;

	const reducedMotion = () => !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	const nowSeconds = () => Math.floor( Date.now() / 1000 );

	// ---- Storage: localStorage / sessionStorage, with a cookie fallback when they are blocked -----------------------

	const storageOk = {};

	function storage( session ) {
		const name = session ? 'sessionStorage' : 'localStorage';

		if ( undefined === storageOk[ name ] ) {
			try {
				const s = window[ name ];
				s.setItem( KEY + 'probe', '1' );
				s.removeItem( KEY + 'probe' );
				storageOk[ name ] = true;
			} catch ( e ) {
				storageOk[ name ] = false;
			}
		}

		return storageOk[ name ] ? window[ name ] : null;
	}

	function cookieGet( name ) {
		const parts = ( '; ' + document.cookie ).split( '; ' + name + '=' );

		return 2 === parts.length ? decodeURIComponent( parts.pop().split( ';' ).shift() ) : null;
	}

	function cookieSet( name, value, days ) {
		let cookie = name + '=' + encodeURIComponent( value ) + '; path=/; SameSite=Lax';

		if ( days ) {
			cookie += '; max-age=' + Math.round( days * 86400 );
		}

		if ( 'https:' === window.location.protocol ) {
			cookie += '; Secure';
		}

		document.cookie = cookie;
	}

	function read( name, session ) {
		let raw = null;
		const s = storage( session );

		try {
			raw = s ? s.getItem( name ) : cookieGet( name );
		} catch ( e ) {
			raw = null;
		}

		if ( null === raw ) {
			return null;
		}

		try {
			return JSON.parse( raw );
		} catch ( e ) {
			return null;
		}
	}

	function write( name, value, session ) {
		const raw = JSON.stringify( value );
		const s = storage( session );

		try {
			if ( s ) {
				s.setItem( name, raw );
			} else {
				cookieSet( name, raw, session ? 0 : 400 );
			}
		} catch ( e ) {
			// Storage full or blocked: the popup simply behaves as "always".
		}
	}

	const readState = ( id ) => read( KEY + id, false ) || {};
	const writeState = ( id, state ) => write( KEY + id, state, false );
	const readSession = ( id ) => parseInt( read( KEY + 's_' + id, true ), 10 ) || 0;
	const writeSession = ( id, count ) => write( KEY + 's_' + id, count, true );

	// ---- Rules (mirrors popup-rules.php) --------------------------------------------------------------------------

	const SEARCH_ENGINE = /^(?:[a-z0-9-]+\.)*(?:google|bing|duckduckgo|yahoo|baidu|yandex|ecosia|startpage|qwant|ask|naver|seznam|brave)\.(?:[a-z]{2,3}|(?:co|com)\.[a-z]{2})$/;

	function frequencyAllows( frequency, state, now, sessionShown ) {
		if ( state.dismissed && state.dismissed > now ) {
			return false;
		}

		const shown = state.shown || 0;
		const last = state.last || 0;

		switch ( frequency.mode ) {
			case 'once':
				return shown < 1 || ( frequency.expire_days > 0 && now - last >= frequency.expire_days * 86400 );
			case 'session':
				return sessionShown < 1;
			case 'day':
				return shown < 1 || now - last >= 86400;
			case 'every_n':
				return 0 === ( state.hits || 0 ) % Math.max( 2, frequency.n || 2 );
			default:
				return true;
		}
	}

	function deviceNow() {
		const width = window.innerWidth;

		if ( width <= ( config.mobile || 767 ) ) {
			return 'mobile';
		}

		return width <= ( config.tablet || 1024 ) ? 'tablet' : 'desktop';
	}

	function hostOf( url ) {
		try {
			return new URL( url ).hostname.toLowerCase().replace( /^www\./, '' );
		} catch ( e ) {
			return '';
		}
	}

	function referrerAllows( rule ) {
		const mode = rule.mode || 'any';

		if ( 'any' === mode ) {
			return true;
		}

		const referrer = document.referrer || '';
		const host = hostOf( referrer );
		const site = window.location.hostname.toLowerCase().replace( /^www\./, '' );

		switch ( mode ) {
			case 'search':
				return '' !== host && SEARCH_ENGINE.test( host );
			case 'internal':
				return '' !== host && host === site;
			case 'external':
				return '' !== host && host !== site;
			case 'url':
				return ! rule.url || referrer.toLowerCase().indexOf( rule.url ) > -1;
			default:
				return true;
		}
	}

	function paramAllows( rule ) {
		if ( ! rule || ! rule.name ) {
			return true;
		}

		const params = new URLSearchParams( window.location.search );

		if ( ! params.has( rule.name ) ) {
			return false;
		}

		return ! rule.value || params.get( rule.name ) === rule.value;
	}

	function scheduleAllows( schedule ) {
		if ( ! schedule || ! schedule.enabled ) {
			return true;
		}

		const now = nowSeconds();

		if ( ( schedule.start && now < schedule.start ) || ( schedule.end && now >= schedule.end ) ) {
			return false;
		}

		if ( schedule.from < 0 || schedule.to < 0 || schedule.from === schedule.to ) {
			return true;
		}

		const minute = Math.floor( ( ( ( now + schedule.offset ) % 86400 ) + 86400 ) % 86400 / 60 );

		return schedule.from < schedule.to ? minute >= schedule.from && minute < schedule.to : minute >= schedule.from || minute < schedule.to;
	}

	// ---- Helpers ---------------------------------------------------------------------------------------------------

	function isVisible( el ) {
		return !! ( el.offsetWidth || el.offsetHeight || el.getClientRects().length );
	}

	function focusables( box ) {
		return Array.prototype.slice.call( box.querySelectorAll( FOCUSABLE ) ).filter( ( el ) => ! el.hasAttribute( 'disabled' ) && 'hidden' !== el.type && isVisible( el ) && el.getAttribute( 'tabindex' ) !== '-1' );
	}

	function emit( name, detail ) {
		const event = new window.CustomEvent( 'refraction:popup:' + name, { detail, bubbles: true } );

		( detail.root || document ).dispatchEvent( event );
	}

	function safeQuery( selector ) {
		try {
			return selector ? document.querySelector( selector ) : null;
		} catch ( e ) {
			return null;
		}
	}

	function safeClosest( el, selector ) {
		try {
			return el.closest( selector );
		} catch ( e ) {
			return null;
		}
	}

	// ---- Scroll lock (no jump: overflow hidden plus the scrollbar width as padding) -------------------------------

	function lockScroll() {
		if ( 0 === locks ) {
			const root = document.documentElement;
			const bar = window.innerWidth - root.clientWidth;
			lockPadding = root.style.paddingRight;

			if ( bar > 0 ) {
				root.style.paddingRight = ( parseFloat( window.getComputedStyle( root ).paddingRight ) || 0 ) + bar + 'px';
			}

			root.classList.add( 'refraction-popup-lock' );
		}

		locks += 1;
	}

	function unlockScroll() {
		locks = Math.max( 0, locks - 1 );

		if ( 0 === locks ) {
			const root = document.documentElement;
			root.classList.remove( 'refraction-popup-lock' );
			root.style.paddingRight = lockPadding;
		}
	}

	// ---- Content: widgets are in a <template> and initialise the first time the popup opens ------------------------

	function initContent( popup ) {
		const run = () => {
			const frontend = window.refractionFrontend;

			if ( ! frontend || ! frontend.elementsHandler || ! frontend.elementsHandler.runReadyTrigger ) {
				return false;
			}

			Array.prototype.slice.call( popup.content.querySelectorAll( '.refraction-element' ) ).forEach( ( el ) => frontend.elementsHandler.runReadyTrigger( el ) );

			return true;
		};

		if ( ! run() ) {
			window.addEventListener( 'refraction/frontend/init', run, { once: true } );
			window.addEventListener( 'load', () => {
				if ( ! popup.handlersReady ) {
					popup.handlersReady = run();
				}
			}, { once: true } );
		}
	}

	function ensureContent( popup ) {
		if ( popup.rendered ) {
			return;
		}

		popup.rendered = true;
		popup.content.appendChild( popup.template.content.cloneNode( true ) );
		initContent( popup );
	}

	function labelDialog( popup ) {
		const heading = popup.content.querySelector( 'h1, h2, h3, h4, h5, h6, [role="heading"]' );

		if ( heading && heading.textContent.trim() ) {
			if ( ! heading.id ) {
				heading.id = 'refraction-popup-' + popup.id + '-title';
			}

			popup.box.setAttribute( 'aria-labelledby', heading.id );
			popup.box.removeAttribute( 'aria-label' );
		}
	}

	// ---- Open / close -----------------------------------------------------------------------------------------------

	function topPopup() {
		return stack.length ? stack[ stack.length - 1 ] : null;
	}

	function durations( popup, kind ) {
		if ( reducedMotion() ) {
			return 0;
		}

		const display = popup.cfg.display;

		return 'none' === display[ 'anim_' + kind ] ? 0 : display[ 'dur_' + kind ] || 0;
	}

	function playAnimation( popup, kind, done ) {
		const root = popup.root;
		const name = popup.cfg.display[ 'anim_' + kind ];
		const duration = durations( popup, kind );

		window.clearTimeout( popup.animTimer );
		root.classList.remove( 'rp-in-' + popup.cfg.display.anim_in, 'rp-out-' + popup.cfg.display.anim_out );

		if ( ! duration ) {
			done();

			return;
		}

		root.style.setProperty( '--rp-dur', duration + 'ms' );
		// Force a style flush so the animation restarts cleanly.
		void root.offsetWidth; // eslint-disable-line no-void
		root.classList.add( 'rp-' + ( 'in' === kind ? 'in' : 'out' ) + '-' + name );
		popup.animTimer = window.setTimeout( () => {
			root.classList.remove( 'rp-' + ( 'in' === kind ? 'in' : 'out' ) + '-' + name );
			done();
		}, duration + 30 );
	}

	function open( popup, options ) {
		options = options || {};

		if ( ! popup ) {
			return false;
		}

		if ( popup.open ) {
			if ( ! popup.closing ) {
				return true;
			}

			// Reopened while it was closing.
			window.clearTimeout( popup.animTimer );
			popup.closing = false;
			popup.root.classList.remove( 'is-closing' );
		}

		queue = queue.filter( ( item ) => item.popup !== popup );
		ensureContent( popup );
		labelDialog( popup );

		const active = document.activeElement;
		popup.returnFocus = options.trigger || ( active && active !== document.body ? active : null );
		popup.open = true;
		popup.root.hidden = false;
		popup.root.style.zIndex = String( BASE_Z + stack.length * 10 );
		popup.root.classList.add( 'is-open' );
		popup.root.setAttribute( 'data-rp-state', 'open' );
		stack.push( popup );

		if ( popup.cfg.display.prevent_scroll ) {
			popup.locked = true;
			lockScroll();
		}

		const state = readState( popup.id );
		state.shown = ( state.shown || 0 ) + 1;
		state.last = nowSeconds();
		writeState( popup.id, state );
		writeSession( popup.id, readSession( popup.id ) + 1 );

		playAnimation( popup, 'in', () => {} );

		window.requestAnimationFrame( () => {
			const wanted = popup.content.querySelector( '[autofocus]' );

			( wanted || popup.box ).focus( { preventScroll: true } );
		} );

		if ( popup.cfg.display.autoclose > 0 ) {
			window.clearTimeout( popup.autoTimer );
			popup.autoTimer = window.setTimeout( () => close( popup, 'auto' ), popup.cfg.display.autoclose * 1000 );
		}

		emit( 'shown', { id: popup.id, root: popup.root, reason: options.reason || 'api' } );

		return true;
	}

	function close( popup, reason ) {
		if ( ! popup || ! popup.open || popup.closing ) {
			return false;
		}

		popup.closing = true;
		window.clearTimeout( popup.autoTimer );
		popup.root.classList.remove( 'is-open' );
		popup.root.classList.add( 'is-closing' );

		playAnimation( popup, 'out', () => {
			popup.root.hidden = true;
			popup.root.classList.remove( 'is-closing' );
			popup.root.removeAttribute( 'data-rp-state' );
			popup.open = false;
			popup.closing = false;

			const index = stack.indexOf( popup );

			if ( index > -1 ) {
				stack.splice( index, 1 );
			}

			if ( popup.locked ) {
				popup.locked = false;
				unlockScroll();
			}

			const target = popup.returnFocus;
			popup.returnFocus = null;

			if ( ! stack.length || stack[ stack.length - 1 ] !== popup ) {
				const next = topPopup();

				if ( target && document.contains( target ) && ( ! next || next.root.contains( target ) ) ) {
					target.focus( { preventScroll: true } );
				} else if ( next ) {
					next.box.focus( { preventScroll: true } );
				}
			}

			emit( 'hidden', { id: popup.id, root: popup.root, reason: reason || 'api' } );
			scheduleQueue();
		} );

		return true;
	}

	// ---- Automatic opening: eligibility, queue, priority ------------------------------------------------------------

	function staticRulesPass( popup ) {
		const cfg = popup.cfg;

		return cfg.devices.indexOf( deviceNow() ) > -1 && referrerAllows( cfg.referrer ) && paramAllows( cfg.param ) && scheduleAllows( cfg.schedule );
	}

	function canAutoOpen( popup ) {
		const state = readState( popup.id );
		state.hits = popup.hitsAtLoad;

		return popup.eligible && frequencyAllows( popup.cfg.frequency, state, nowSeconds(), readSession( popup.id ) );
	}

	function requestAuto( popup, reason ) {
		if ( popup.open || popup.fired.has( reason ) || ! canAutoOpen( popup ) ) {
			return;
		}

		popup.fired.add( reason );

		if ( queue.some( ( item ) => item.popup === popup ) ) {
			return;
		}

		queue.push( { popup, reason } );
		scheduleQueue();
	}

	function scheduleQueue() {
		window.clearTimeout( queueTimer );
		queueTimer = window.setTimeout( drainQueue, stack.length ? 0 : 60 );
	}

	function drainQueue() {
		if ( stack.length || ! queue.length ) {
			return;
		}

		queue.sort( ( a, b ) => ( b.popup.cfg.priority - a.popup.cfg.priority ) || ( a.popup.id - b.popup.id ) );

		while ( queue.length ) {
			const item = queue.shift();

			if ( canAutoOpen( item.popup ) ) {
				open( item.popup, { reason: item.reason } );

				return;
			}
		}
	}

	// ---- Triggers ---------------------------------------------------------------------------------------------------

	function pageViews() {
		return parseInt( read( PAGE_VIEWS_KEY, true ), 10 ) || 0;
	}

	function scrollPercent() {
		const root = document.documentElement;
		const max = Math.max( root.scrollHeight, document.body.scrollHeight ) - window.innerHeight;

		return max > 0 ? ( window.pageYOffset / max ) * 100 : 0;
	}

	function wireTriggers( popup ) {
		const t = popup.cfg.triggers || {};
		const fire = ( reason ) => requestAuto( popup, reason );

		if ( t.load ) {
			window.setTimeout( () => fire( 'load' ), ( t.load.delay || 0 ) * 1000 );
		}

		if ( t.views && pageViews() >= t.views.count ) {
			window.setTimeout( () => fire( 'views' ), 0 );
		}

		if ( t.scroll ) {
			if ( 'element' === t.scroll.mode ) {
				const target = safeQuery( t.scroll.selector );

				if ( target && 'IntersectionObserver' in window ) {
					const observer = new window.IntersectionObserver( ( entries ) => {
						if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
							observer.disconnect();
							fire( 'scroll' );
						}
					} );
					observer.observe( target );
				}
			} else {
				const check = () => {
					if ( scrollPercent() >= t.scroll.percent && ( t.scroll.percent > 0 || window.pageYOffset > 0 ) ) {
						window.removeEventListener( 'scroll', check );
						fire( 'scroll' );
					}
				};

				window.addEventListener( 'scroll', check, { passive: true } );
				check();
			}
		}

		if ( t.scroll_up ) {
			let peak = 0;
			const check = () => {
				const y = window.pageYOffset;
				peak = Math.max( peak, y );

				if ( peak >= t.scroll_up.distance && peak - y >= t.scroll_up.distance ) {
					window.removeEventListener( 'scroll', check );
					fire( 'scroll_up' );
				}
			};

			window.addEventListener( 'scroll', check, { passive: true } );
		}

		if ( t.exit ) {
			wireExit( () => fire( 'exit' ) );
		}

		if ( t.idle ) {
			let timer = 0;
			const reset = () => {
				window.clearTimeout( timer );
				timer = window.setTimeout( () => fire( 'idle' ), t.idle.seconds * 1000 );
			};

			[ 'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel' ].forEach( ( name ) => window.addEventListener( name, reset, { passive: true } ) );
			reset();
		}
	}

	function wireExit( fire ) {
		let done = false;
		const once = () => {
			if ( ! done ) {
				done = true;
				fire();
			}
		};

		// Desktop: the pointer leaves through the top edge of the window.
		document.addEventListener( 'mouseout', ( event ) => {
			if ( ! event.relatedTarget && event.clientY <= 0 ) {
				once();
			}
		} );

		// Touch screens have no pointer to leave with: the back button and a fast scroll up are the signs of leaving.
		const touch = ( window.matchMedia && window.matchMedia( '(pointer: coarse)' ).matches ) || ( navigator.maxTouchPoints || 0 ) > 0;

		if ( ! touch ) {
			return;
		}

		let trapped = false;
		const trap = () => {
			if ( trapped ) {
				return;
			}

			trapped = true;

			try {
				window.history.pushState( { refractionPopupExit: true }, '', window.location.href );
			} catch ( e ) {
				trapped = false;
			}
		};

		[ 'touchstart', 'scroll' ].forEach( ( name ) => window.addEventListener( name, trap, { once: true, passive: true } ) );
		window.addEventListener( 'popstate', () => {
			if ( trapped ) {
				once();
			}
		} );

		let lastY = window.pageYOffset;
		let lastT = Date.now();
		window.addEventListener( 'scroll', () => {
			const y = window.pageYOffset;
			const t = Date.now();
			const speed = ( lastY - y ) / Math.max( 1, t - lastT );

			if ( y < lastY && speed > 1.2 && lastY - y > 80 && lastY > 200 ) {
				once();
			}

			lastY = y;
			lastT = t;
		}, { passive: true } );
	}

	// ---- Manual opening: API, events, links, click triggers ---------------------------------------------------------

	function byId( id ) {
		return popups.get( parseInt( id, 10 ) ) || null;
	}

	function popupOf( element ) {
		const root = element && element.closest ? element.closest( '.refraction-popup[data-rp]' ) : null;

		return root ? byId( root.getAttribute( 'data-rp' ) ) : null;
	}

	function act( action, id, source ) {
		const popup = id ? byId( id ) : ( popupOf( source ) || topPopup() );

		if ( ! popup ) {
			return false;
		}

		if ( 'toggle' === action ) {
			action = popup.open && ! popup.closing ? 'close' : 'open';
		}

		return 'close' === action ? close( popup, 'api' ) : open( popup, { reason: 'api', trigger: source && source.focus ? source : null } );
	}

	const api = {
		version: 1,
		open: ( id, options ) => open( byId( id ), options ),
		close: ( id ) => ( id ? close( byId( id ), 'api' ) : close( topPopup(), 'api' ) ),
		toggle: ( id ) => act( 'toggle', id, null ),
		isOpen: ( id ) => { const p = byId( id ); return !! ( p && p.open && ! p.closing ); },
		closeAll: () => stack.slice().reverse().forEach( ( p ) => close( p, 'api' ) ),
		// Used by Forms: [ { action: 'open' | 'close', id } ], `id` 0 closes the popup that holds the source element.
		apply: ( actions, source ) => ( actions || [] ).forEach( ( item ) => act( 'close' === item.action ? 'close' : 'open', parseInt( item.id, 10 ) || 0, source ) ),
	};

	window.refractionPopup = api;

	[ 'open', 'close', 'toggle' ].forEach( ( action ) => {
		document.addEventListener( 'refraction:popup:' + action, ( event ) => {
			const id = event.detail && event.detail.id;

			if ( id || 'close' === action ) {
				act( action, id, null );
			}
		} );
	} );

	document.addEventListener( 'click', ( event ) => {
		const target = event.target;

		if ( ! ( target instanceof Element ) ) {
			return;
		}

		// Links made with the Popup dynamic tag: #refraction-popup:open:12 / :close / :toggle:12 (also :close:12).
		const link = target.closest( 'a[href*="#refraction-popup:"]' );

		if ( link ) {
			const match = /#refraction-popup:(open|close|toggle)(?::(\d+))?$/.exec( link.getAttribute( 'href' ) || '' );

			if ( match ) {
				event.preventDefault();
				act( match[ 1 ], match[ 2 ] ? parseInt( match[ 2 ], 10 ) : 0, link );

				return;
			}
		}

		// A marked button: close and never show this popup again.
		const dismiss = target.closest( '[data-refraction-popup-dismiss]' );
		const holder = dismiss ? popupOf( dismiss ) : null;

		if ( holder ) {
			dismissPopup( holder );
			close( holder, 'dismiss' );

			return;
		}

		if ( target.closest( '[data-rp-close]' ) ) {
			const own = popupOf( target );

			if ( own ) {
				close( own, 'button' );
			}

			return;
		}

		// Overlay click: the layer around the box counts as the overlay.
		const layer = target.closest( '[data-rp-layer], [data-rp-overlay]' );
		const owner = layer ? popupOf( layer ) : null;

		if ( owner && ( target === layer || target.hasAttribute( 'data-rp-overlay' ) ) && owner.cfg.display.overlay_close && owner === topPopup() ) {
			close( owner, 'overlay' );

			return;
		}

		// Click triggers: any element matching the selector of a popup.
		popups.forEach( ( popup ) => {
			const selector = popup.cfg.triggers && popup.cfg.triggers.click && popup.cfg.triggers.click.selector;
			const hit = selector ? safeClosest( target, selector ) : null;

			if ( hit && ! popup.root.contains( hit ) ) {
				if ( 'A' === hit.tagName && /^#|^javascript:/i.test( hit.getAttribute( 'href' ) || '' ) ) {
					event.preventDefault();
				}

				open( popup, { reason: 'click', trigger: hit } );
			}
		} );
	} );

	document.addEventListener( 'keydown', ( event ) => {
		const popup = topPopup();

		if ( ! popup || popup.closing ) {
			return;
		}

		if ( 'Escape' === event.key && popup.cfg.display.esc_close ) {
			event.preventDefault();
			close( popup, 'esc' );

			return;
		}

		if ( 'Tab' === event.key ) {
			const items = focusables( popup.box );

			if ( ! items.length ) {
				event.preventDefault();
				popup.box.focus();

				return;
			}

			const first = items[ 0 ];
			const last = items[ items.length - 1 ];
			const active = document.activeElement;

			if ( event.shiftKey && ( active === first || active === popup.box || ! popup.box.contains( active ) ) ) {
				event.preventDefault();
				last.focus();
			} else if ( ! event.shiftKey && ( active === last || ! popup.box.contains( active ) ) ) {
				event.preventDefault();
				first.focus();
			}
		}
	} );

	// Focus that escapes the topmost dialog comes back into it.
	document.addEventListener( 'focusin', ( event ) => {
		const popup = topPopup();

		if ( popup && ! popup.closing && event.target instanceof Node && ! popup.box.contains( event.target ) && ! popup.root.contains( event.target ) ) {
			popup.box.focus( { preventScroll: true } );
		}
	} );

	// A form inside the popup was sent: do not show it again (when the popup is set that way).
	function dismissPopup( popup ) {
		const state = readState( popup.id );
		state.dismissed = nowSeconds() + ( popup.cfg.dismiss.days || 365 ) * 86400;
		writeState( popup.id, state );
	}

	document.addEventListener( 'refraction/forms/success', ( event ) => {
		const popup = event.target instanceof Element ? popupOf( event.target ) : null;

		if ( popup && popup.cfg.dismiss.on_form ) {
			dismissPopup( popup );
		}
	} );

	// ---- Start --------------------------------------------------------------------------------------------------------

	function start() {
		if ( started ) {
			return;
		}

		started = true;

		write( PAGE_VIEWS_KEY, pageViews() + 1, true );

		Array.prototype.slice.call( document.querySelectorAll( '.refraction-popup[data-rp-config]' ) ).forEach( ( root ) => {
			let cfg;

			try {
				cfg = JSON.parse( root.getAttribute( 'data-rp-config' ) );
			} catch ( e ) {
				return;
			}

			const box = root.querySelector( '.refraction-popup__box' );
			const content = root.querySelector( '[data-rp-content]' );
			const template = root.querySelector( 'template[data-rp-template]' );

			if ( ! cfg || ! cfg.id || ! box || ! content || ! template ) {
				return;
			}

			const popup = { id: cfg.id, root, box, content, template, cfg, open: false, closing: false, rendered: false, fired: new Set(), eligible: false, hitsAtLoad: 0 };
			popups.set( cfg.id, popup );

			// Every page visit counts for the "every N visits" rule, whether or not the popup opened.
			const state = readState( popup.id );
			popup.hitsAtLoad = state.hits || 0;

			if ( 'every_n' === cfg.frequency.mode ) {
				state.hits = popup.hitsAtLoad + 1;
				writeState( popup.id, state );
			}

			popup.eligible = staticRulesPass( popup );

			if ( popup.eligible ) {
				wireTriggers( popup );
			}
		} );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
}() );
