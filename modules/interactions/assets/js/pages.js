/**
 * Pages side by side (Page Settings > Pages Side By Side), site only. The page's top-level containers become pages
 * that fill the screen; the page does not scroll down. "slide": the pages slide to the left, and what is on them moves
 * as layers (parallax). "book": each page turns over its left edge like a book's.
 *
 * Turned by the wheel (one page per gesture; a part of a page that scrolls by itself keeps the wheel until its end),
 * the arrow, Page Up / Down, Space, Home and End keys, a swipe, the arrows, and links to a part of the page.
 * Phones held upright: the pages are shown turned to landscape (the swipe follows), a message asks to turn the phone,
 * or the page stays one long page. Reduced motion: pages change without movement. Config: window.refractionPages.
 */
( function() {
	const cfg = window.refractionPages;

	if ( ! cfg ) {
		return;
	}

	const root = document.documentElement;
	const stage = document.querySelector( '.refraction-' + cfg.id + '[data-refraction-type]' ) || document.querySelector( '[data-refraction-id="' + cfg.id + '"]' );
	const pages = stage ? Array.from( stage.children ).filter( ( el ) => el.classList.contains( 'refraction-element' ) ) : [];

	if ( pages.length < 2 ) {
		return;
	}

	const labels = cfg.labels || {};
	const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	const phoneUpright = window.matchMedia( '(max-width: 767px) and (orientation: portrait)' );
	const n = pages.length;
	let at = 0;
	let busyUntil = 0;
	let on = false;

	// ------------------------------------------------------------ markup
	const nav = document.createElement( 'div' );
	const live = document.createElement( 'div' );
	const turn = document.createElement( 'div' );

	nav.className = 'rf-hp-nav';
	nav.innerHTML = ( cfg.arrows ? `<button type="button" class="rf-hp-prev" aria-label="${ escape( labels.prev ) }"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="rf-hp-next" aria-label="${ escape( labels.next ) }"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>` : '' ) +
		( cfg.counter ? `<span class="rf-hp-count rf-hp-count--${ cfg.counter }" aria-hidden="true"></span>` : '' );
	live.className = 'rf-hp-live';
	live.setAttribute( 'aria-live', 'polite' );
	turn.className = 'rf-hp-turn';
	turn.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="15" y="6" width="18" height="32" rx="3"/><path d="M8 30a16 16 0 0 0 14 12m-4 2 4-2-2-4"/></svg><p>${ escape( labels.turn ) }</p>`;

	const progress = document.createElement( 'div' );

	progress.className = 'rf-hp-progress';
	progress.innerHTML = '<span></span>';

	function escape( text ) {
		return String( text || '' ).replace( /[&<>"]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ c ] ) );
	}

	function pad( number ) {
		return number < 10 ? '0' + number : String( number );
	}

	// Layers: elements given their own depth, or else each page's direct children (or its only child's).
	function layers( page, index ) {
		const own = page.querySelectorAll( '[data-rf-hp-depth]' );
		const AUTO = [ 0.5, 1, 0.25, 0.75 ];

		if ( own.length ) {
			own.forEach( ( el ) => el.style.setProperty( '--rf-hp-d', el.getAttribute( 'data-rf-hp-depth' ) ) );
			return;
		}

		let box = page.querySelector( ':scope > .e-con-inner' ) || page;

		if ( 1 === box.children.length && box.firstElementChild.classList.contains( 'refraction-element' ) ) {
			box = box.firstElementChild.querySelector( ':scope > .e-con-inner' ) || box.firstElementChild;
		}

		Array.from( box.children ).filter( ( el ) => el.classList.contains( 'refraction-element' ) ).forEach( ( el, k ) => {
			el.setAttribute( 'data-rf-hp-layer', '' );
			el.style.setProperty( '--rf-hp-d', String( AUTO[ ( k + index ) % AUTO.length ] ) );
		} );
	}

	// ------------------------------------------------------------ state
	function show( index, animate ) {
		const target = cfg.loop ? ( ( index % n ) + n ) % n : Math.max( 0, Math.min( n - 1, index ) );

		if ( target === at && animate ) {
			return;
		}

		at = target;
		stage.style.setProperty( '--rf-hp-at', String( at ) );
		pages.forEach( ( page, i ) => {
			const current = i === at;

			page.classList.toggle( 'is-current', current );
			page.classList.toggle( 'is-turned', i < at );
			page.toggleAttribute( 'inert', ! current );
			page.setAttribute( 'aria-hidden', current ? 'false' : 'true' );
			page.style.zIndex = 'book' === cfg.mode ? String( i < at ? 100 + i : n - i ) : '';
		} );

		const count = nav.querySelector( '.rf-hp-count' );

		if ( count ) {
			count.textContent = 'of' === cfg.counter ? `${ at + 1 } / ${ n }` : `${ cfg.prefix || '' }${ pad( at + 1 ) }`;
		}

		const prev = nav.querySelector( '.rf-hp-prev' );
		const next = nav.querySelector( '.rf-hp-next' );

		if ( prev && next ) {
			prev.disabled = ! cfg.loop && 0 === at;
			next.disabled = ! cfg.loop && n - 1 === at;
			next.setAttribute( 'aria-label', cfg.loop && n - 1 === at ? labels.first : labels.next );
		}

		progress.firstElementChild.style.transform = `scaleX(${ ( at + 1 ) / n })`;
		live.textContent = String( labels.of || '%1$s / %2$s' ).replace( '%1$s', at + 1 ).replace( '%2$s', n );
		busyUntil = Date.now() + ( reduced.matches || ! animate ? 0 : cfg.speed );

		if ( window.location.hash && animate ) {
			window.history.replaceState( null, '', window.location.pathname + window.location.search );
		}
	}

	function go( step ) {
		if ( on && Date.now() >= busyUntil ) {
			show( at + step, true );
		}
	}

	/**
	 * The page holding an element (for links to a part of the page).
	 * @param {Element} el
	 */
	function pageOf( el ) {
		return pages.findIndex( ( page ) => page === el || page.contains( el ) );
	}

	// ------------------------------------------------------------ input
	// A part of the page that can still scroll this way (a long page, a map, a code box) keeps the wheel.
	function scrollsItself( target, delta ) {
		for ( let el = target; el && el !== stage; el = el.parentElement ) {
			const style = window.getComputedStyle( el );

			if ( /(auto|scroll)/.test( style.overflowY ) && el.scrollHeight > el.clientHeight + 1 ) {
				if ( ( delta > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1 ) || ( delta < 0 && el.scrollTop > 0 ) ) {
					return true;
				}
			}
		}

		return false;
	}

	let wheelQuietAt = 0;

	function onWheel( event ) {
		if ( ! on || event.ctrlKey ) {
			return;
		}

		const delta = Math.abs( event.deltaX ) > Math.abs( event.deltaY ) ? event.deltaX : event.deltaY;

		if ( scrollsItself( event.target, delta ) ) {
			return;
		}

		event.preventDefault();

		// One page per gesture: the tail of a trackpad swipe (wheel events within 200 ms) is swallowed.
		const now = Date.now();
		const quiet = now - wheelQuietAt > 200;

		wheelQuietAt = now;

		if ( Math.abs( delta ) < 4 || ( ! quiet && now < busyUntil + 400 ) ) {
			return;
		}

		go( delta > 0 ? 1 : -1 );
	}

	function onKey( event ) {
		if ( ! on || event.altKey || event.ctrlKey || event.metaKey ) {
			return;
		}

		const field = event.target.closest && event.target.closest( 'input, textarea, select, [contenteditable="true"], [role="slider"]' );

		if ( field ) {
			return;
		}

		const keys = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': event.shiftKey ? -1 : 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 };

		if ( 'Home' === event.key || 'End' === event.key ) {
			event.preventDefault();
			show( 'Home' === event.key ? 0 : n - 1, true );
		} else if ( keys[ event.key ] ) {
			// A part of the page that scrolls by itself keeps the up and down arrows.
			if ( ( 'ArrowDown' === event.key || 'ArrowUp' === event.key ) && scrollsItself( event.target, keys[ event.key ] ) ) {
				return;
			}

			event.preventDefault();
			go( keys[ event.key ] );
		}
	}

	// Touch events, not pointer events: the browser cancels the pointer once it treats the gesture as a pan.
	let start = null;

	function onTouchStart( event ) {
		start = on && 1 === event.touches.length ? { x: event.touches[ 0 ].clientX, y: event.touches[ 0 ].clientY } : null;
	}

	function onTouchEnd( event ) {
		const touch = event.changedTouches && event.changedTouches[ 0 ];

		if ( ! start || ! touch ) {
			return;
		}

		const rotated = root.classList.contains( 'rf-hp-rotated' );
		// Turned to landscape, the page's left is the screen's top: a swipe along the page is a swipe up or down.
		const along = rotated ? touch.clientY - start.y : start.x - touch.clientX;
		const across = rotated ? touch.clientX - start.x : touch.clientY - start.y;

		start = null;

		if ( Math.abs( along ) > 50 && Math.abs( along ) > Math.abs( across ) * 1.2 ) {
			go( ( rotated ? -along : along ) > 0 ? 1 : -1 );
		}
	}

	function onClick( event ) {
		const link = event.target.closest && event.target.closest( 'a[href*="#"]' );

		if ( ! on || ! link || link.origin + link.pathname !== window.location.origin + window.location.pathname ) {
			return;
		}

		const id = decodeURIComponent( link.hash.slice( 1 ) );
		const target = id && document.getElementById( id );
		const index = target ? pageOf( target ) : -1;

		if ( index > -1 ) {
			event.preventDefault();
			show( index, true );
		}
	}

	// ------------------------------------------------------------ on and off (phones held upright may stay vertical)
	function measureTop() {
		// Full screen, or below the site's header (they start where the content started).
		if ( ! cfg.header ) {
			stage.style.setProperty( '--rf-hp-top', '0px' );
			return;
		}

		root.classList.remove( 'rf-hp-on' );
		stage.style.removeProperty( '--rf-hp-top' );
		const top = Math.max( 0, Math.round( stage.getBoundingClientRect().top + window.scrollY ) );
		stage.style.setProperty( '--rf-hp-top', `${ top }px` );
	}

	function apply() {
		const upright = phoneUpright.matches;
		const stay = upright && 'stack' === cfg.phone;

		root.classList.toggle( 'rf-hp-rotated', upright && 'rotate' === cfg.phone );
		root.classList.toggle( 'rf-hp-ask', upright && 'ask' === cfg.phone );

		if ( stay ) {
			on = false;
			root.classList.remove( 'rf-hp-on' );
			pages.forEach( ( page ) => {
				page.removeAttribute( 'inert' );
				page.removeAttribute( 'aria-hidden' );
				page.style.zIndex = '';
			} );
			return;
		}

		measureTop();
		window.scrollTo( 0, 0 );
		root.classList.add( 'rf-hp-on' );
		on = true;
		show( at, false );
	}

	function init() {
		root.classList.add( 'rf-hp', 'rf-hp--' + cfg.mode, cfg.header ? 'rf-hp-below-header' : 'rf-hp-full' );
		stage.classList.add( 'rf-hp-stage' );
		stage.style.setProperty( '--rf-hp-speed', `${ cfg.speed }ms` );
		stage.style.setProperty( '--rf-hp-depth', `${ cfg.depth }vw` );
		stage.style.setProperty( '--rf-hp-n', String( n ) );
		// The stage covers what follows it on the page (a footer): it takes the page's own background.
		const bodyBg = window.getComputedStyle( document.body ).backgroundColor;

		if ( bodyBg && ! /rgba\(0, 0, 0, 0\)|transparent/.test( bodyBg ) ) {
			stage.style.setProperty( '--rf-hp-body-bg', bodyBg );
		}
		pages.forEach( ( page, i ) => {
			page.classList.add( 'rf-hp-page' );
			page.style.setProperty( '--rf-hp-i', String( i ) );
			page.setAttribute( 'role', 'group' );
			page.setAttribute( 'aria-roledescription', 'page' );
			page.setAttribute( 'aria-label', String( labels.of || '%1$s / %2$s' ).replace( '%1$s', i + 1 ).replace( '%2$s', n ) );

			if ( 'slide' === cfg.mode && cfg.depth ) {
				layers( page, i );
			}
		} );

		stage.append( nav, live, turn );

		if ( cfg.progress ) {
			stage.append( progress );
		}

		nav.addEventListener( 'click', ( event ) => {
			const button = event.target.closest( 'button' );

			if ( button ) {
				go( button.classList.contains( 'rf-hp-prev' ) ? -1 : 1 );
			}
		} );

		// A link to a part of this page opened the page: start on its page.
		const hashTarget = window.location.hash && document.getElementById( decodeURIComponent( window.location.hash.slice( 1 ) ) );

		at = hashTarget && pageOf( hashTarget ) > -1 ? pageOf( hashTarget ) : 0;

		window.addEventListener( 'wheel', onWheel, { passive: false } );
		window.addEventListener( 'keydown', onKey );
		stage.addEventListener( 'touchstart', onTouchStart, { passive: true } );
		window.addEventListener( 'touchend', onTouchEnd, { passive: true } );
		document.addEventListener( 'click', onClick );
		phoneUpright.addEventListener?.( 'change', apply );
		window.addEventListener( 'resize', () => {
			if ( on ) {
				measureTop();
				root.classList.add( 'rf-hp-on' );
			}
		} );

		apply();
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
