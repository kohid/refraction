/**
 * Refraction page scrolling (Page Settings > Scrolling), site only.
 *
 * - sections: each wheel turn, Page Down / Space / arrow key moves to the next or previous section (the page's
 *   top-level containers) with an eased animation. A section taller than the screen (a pinned scroll scene) scrolls
 *   through normally first and moves on at its end. Optional dots to jump to a section.
 * - smooth: the wheel scrolls with easing (no jump per notch).
 * - snap: the browser's own CSS scroll snapping to the sections.
 *
 * Off for reduced motion; on touch screens only when asked for (sections then use CSS snapping, smooth stays native).
 * Elements that scroll by themselves (a map, a code box) keep the wheel. Config: window.refractionPageScroll.
 */
( function() {
	'use strict';

	const cfg = window.refractionPageScroll;
	const reduced = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const touch = window.matchMedia && window.matchMedia( '(pointer: coarse)' ).matches;

	if ( ! cfg || reduced || ( touch && ! cfg.touch ) ) {
		return;
	}

	const EASE = {
		inout: ( t ) => ( t < 0.5 ? 4 * t * t * t : 1 - ( Math.pow( ( -2 * t ) + 2, 3 ) / 2 ) ),
		out: ( t ) => 1 - Math.pow( 1 - t, 3 ),
		linear: ( t ) => t,
	};
	const root = document.documentElement;
	const html = document.querySelector( '.refraction-' + cfg.id + '[data-refraction-type]' ) || document.querySelector( '[data-refraction-id="' + cfg.id + '"]' );
	const sections = html ? Array.from( html.children ).filter( ( el ) => el.classList.contains( 'refraction-element' ) ) : [];

	if ( sections.length < ( 'smooth' === cfg.mode ? 0 : 2 ) ) {
		return;
	}

	const maxScroll = () => root.scrollHeight - window.innerHeight;
	const topOf = ( el ) => Math.round( el.getBoundingClientRect().top + window.scrollY - cfg.offset );

	// An element under the pointer that can still scroll this way keeps the wheel.
	function scrollsItself( target, dy ) {
		for ( let el = target; el && el !== document.body && el !== root; el = el.parentElement ) {
			const style = window.getComputedStyle( el );

			if ( /(auto|scroll)/.test( style.overflowY ) && el.scrollHeight > el.clientHeight + 1 ) {
				if ( ( dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1 ) || ( dy < 0 && el.scrollTop > 0 ) ) {
					return true;
				}
			}
		}

		return false;
	}

	function pixels( e ) {
		if ( 1 === e.deltaMode ) {
			return e.deltaY * 16;
		}

		return 2 === e.deltaMode ? e.deltaY * window.innerHeight : e.deltaY;
	}

	// ------------------------------------------------------------------ snap

	if ( 'snap' === cfg.mode || ( 'sections' === cfg.mode && touch ) ) {
		root.classList.add( 'rf-page-snap', 'rf-page-snap--' + ( 'sections' === cfg.mode ? 'proximity' : cfg.snap ) );
		root.style.setProperty( '--rf-page-offset', cfg.offset + 'px' );
		sections.forEach( ( el ) => el.classList.add( 'rf-page-section' ) );
		return;
	}

	// ---------------------------------------------------------------- smooth

	if ( 'smooth' === cfg.mode ) {
		let target = window.scrollY;
		let current = window.scrollY;
		let frame = 0;
		let last = 0;
		const rate = 24 - ( cfg.smoothness * 2 ); // Smoothness 1 (quick) to 10 (slow).

		const step = ( now ) => {
			const dt = last ? Math.min( 0.05, ( now - last ) / 1000 ) : 1 / 60;
			last = now;
			current += ( target - current ) * ( 1 - Math.exp( -dt * rate ) );

			if ( Math.abs( target - current ) < 0.5 ) {
				current = target;
			}

			window.scrollTo( 0, current );
			frame = current === target ? 0 : window.requestAnimationFrame( step );

			if ( ! frame ) {
				last = 0;
			}
		};

		window.addEventListener( 'wheel', ( e ) => {
			if ( e.ctrlKey || e.defaultPrevented || scrollsItself( e.target, e.deltaY ) ) {
				return;
			}

			e.preventDefault();

			if ( ! frame ) {
				current = target = window.scrollY;
			}

			target = Math.max( 0, Math.min( maxScroll(), target + pixels( e ) ) );

			if ( ! frame ) {
				frame = window.requestAnimationFrame( step );
			}
		}, { passive: false } );

		// The keyboard, the scrollbar, a link or "find" moved the page: follow from there.
		window.addEventListener( 'scroll', () => {
			if ( ! frame ) {
				current = target = window.scrollY;
			}
		}, { passive: true } );

		root.dataset.rfPageScroll = 'smooth';
		return;
	}

	// -------------------------------------------------------------- sections

	let animating = false;
	let quietUntil = 0;
	let lastWheel = 0;

	function animateTo( to ) {
		const from = window.scrollY;
		const end = Math.max( 0, Math.min( maxScroll(), to ) );

		if ( Math.abs( end - from ) < 2 ) {
			return;
		}

		const ease = EASE[ cfg.easing ] || EASE.inout;
		const start = window.performance.now();

		animating = true;
		root.dataset.rfPageScrolling = '1';

		const step = ( now ) => {
			const t = Math.min( 1, ( now - start ) / cfg.speed );
			window.scrollTo( 0, from + ( ( end - from ) * ease( t ) ) );

			if ( t < 1 ) {
				window.requestAnimationFrame( step );
				return;
			}

			animating = false;
			delete root.dataset.rfPageScrolling;
			// A trackpad keeps sending wheel events after the swipe: wait for a quiet moment before the next move.
			quietUntil = window.performance.now() + 120;
		};

		window.requestAnimationFrame( step );
	}

	/**
	 * Where to go for a move in direction `dir`, or null to let the page scroll by itself (inside a tall section, above
	 * the first section, or below the last one).
	 *
	 * @param {number} dir 1 down, -1 up.
	 * @return {number|null} The scroll position to move to.
	 */
	function nextStop( dir ) {
		const y = window.scrollY;
		const tops = sections.map( topOf );

		if ( y + 2 < tops[ 0 ] ) {
			return dir > 0 ? tops[ 0 ] : null; // Above the first section (a header): down goes to it.
		}

		const vh = window.innerHeight - cfg.offset;
		const heights = sections.map( ( el ) => el.offsetHeight );
		let i = tops.length - 1;

		while ( i > 0 && tops[ i ] > y + 2 ) {
			i--;
		}

		const bottom = tops[ i ] + heights[ i ];
		const tall = heights[ i ] > vh + 2;

		if ( dir > 0 ) {
			if ( tall && y + vh < bottom - 2 ) {
				return null; // Still inside a tall section: scroll through it.
			}

			return i + 1 < tops.length ? tops[ i + 1 ] : null; // After the last one: the footer scrolls normally.
		}

		if ( y > tops[ i ] + 2 ) {
			// Inside a section (or below the last one, in the footer).
			if ( y > bottom - 2 && i === tops.length - 1 ) {
				return tall ? bottom - vh : tops[ i ];
			}

			return tall ? null : tops[ i ];
		}

		if ( 0 === i ) {
			return null;
		}

		// To the previous section: a tall one is entered at its end, to scroll back up through it.
		return heights[ i - 1 ] > vh + 2 ? tops[ i ] - vh : tops[ i - 1 ];
	}

	function move( dir, e ) {
		if ( animating ) {
			e.preventDefault();
			return;
		}

		const to = nextStop( dir );

		if ( null === to ) {
			return;
		}

		e.preventDefault();
		animateTo( to );
	}

	window.addEventListener( 'wheel', ( e ) => {
		const now = window.performance.now();
		const gap = now - lastWheel;
		lastWheel = now;

		if ( e.ctrlKey || Math.abs( e.deltaY ) < 2 || scrollsItself( e.target, e.deltaY ) ) {
			return;
		}

		// The tail of the last swipe: swallow it until the wheel goes quiet.
		if ( animating || ( now < quietUntil + 400 && gap < 120 ) ) {
			e.preventDefault();
			return;
		}

		move( e.deltaY > 0 ? 1 : -1, e );
	}, { passive: false } );

	document.addEventListener( 'keydown', ( e ) => {
		const tag = ( e.target && e.target.tagName ) || '';

		if ( e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test( tag ) || ( e.target && e.target.isContentEditable ) ) {
			return;
		}

		const down = [ 'PageDown', 'ArrowDown' ].indexOf( e.key ) > -1 || ( ' ' === e.key && ! e.shiftKey );
		const up = [ 'PageUp', 'ArrowUp' ].indexOf( e.key ) > -1 || ( ' ' === e.key && e.shiftKey );

		if ( down || up ) {
			move( down ? 1 : -1, e );
		}
	} );

	root.dataset.rfPageScroll = 'sections';

	// ------------------------------------------------------------------ dots

	if ( ! cfg.dots ) {
		return;
	}

	const nav = document.createElement( 'nav' );
	nav.className = 'rf-page-dots';
	nav.setAttribute( 'aria-label', 'Sections' );
	sections.forEach( ( el, i ) => {
		const heading = el.querySelector( 'h1, h2, h3' );
		const label = heading && heading.textContent.trim() ? heading.textContent.trim().slice( 0, 60 ) : 'Section ' + ( i + 1 );
		const button = document.createElement( 'button' );
		button.type = 'button';
		button.setAttribute( 'aria-label', label );
		button.title = label;
		button.addEventListener( 'click', () => animateTo( topOf( el ) ) );
		nav.appendChild( button );
	} );
	document.body.appendChild( nav );

	let ticking = false;
	const mark = () => {
		ticking = false;
		const middle = window.innerHeight / 2;
		let active = 0;

		sections.forEach( ( el, i ) => {
			if ( el.getBoundingClientRect().top <= middle ) {
				active = i;
			}
		} );

		Array.from( nav.children ).forEach( ( b, i ) => b.setAttribute( 'aria-current', i === active ? 'true' : 'false' ) );
	};

	window.addEventListener( 'scroll', () => {
		if ( ! ticking ) {
			ticking = true;
			window.requestAnimationFrame( mark );
		}
	}, { passive: true } );
	mark();
}() );
