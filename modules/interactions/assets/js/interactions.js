/**
 * Interactions on the site (modules/interactions): the site cursor (window.refractionCursor, from Site Settings >
 * Motion & Cursor) and magnetic elements ([data-rf-magnetic], Advanced > Interactions). Only for a pointer that can
 * hover finely (a mouse or a trackpad); off for reduced motion, where the cursor still shows but does not trail.
 */
( function() {
	if ( ! window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches ) {
		return;
	}

	const reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	const LINKS = 'a[href], button, [role="button"], label[for], summary, input[type="submit"], input[type="button"], select, .refraction-button';

	const pointer = { x: -100, y: -100, seen: false };

	// ------------------------------------------------------------ cursor
	const cfg = window.refractionCursor;
	let cursor = null;

	function buildCursor() {
		if ( ! cfg || cursor ) {
			return;
		}

		cursor = {
			root: document.createElement( 'div' ),
			dot: document.createElement( 'div' ),
			ring: document.createElement( 'div' ),
			label: document.createElement( 'span' ),
			x: -100,
			y: -100,
		};

		cursor.root.className = `rf-cursor rf-cursor--${ cfg.style }`;
		cursor.root.setAttribute( 'aria-hidden', 'true' );
		cursor.dot.className = 'rf-cursor__dot';
		cursor.ring.className = 'rf-cursor__ring';
		cursor.label.className = 'rf-cursor__label';
		cursor.ring.appendChild( cursor.label );
		cursor.root.append( cursor.ring, cursor.dot );

		if ( 'blend' !== cfg.style && cfg.color ) {
			cursor.root.style.setProperty( '--rf-cursor-color', cfg.color );
		}

		cursor.root.style.setProperty( '--rf-cursor-size', `${ cfg.size || 36 }px` );
		document.body.appendChild( cursor.root );

		if ( cfg.hide ) {
			document.documentElement.classList.add( 'rf-cursor-hide-system' );
		}
	}

	function place( el, x, y ) {
		el.style.transform = `translate3d(${ x }px, ${ y }px, 0)`;
	}

	/**
	 * What the cursor is over: a word to show, a link or button, or a place where it steps aside.
	 * @param {Element} target
	 */
	function updateState( target ) {
		if ( ! cursor || ! target || ! target.closest ) {
			return;
		}

		const hidden = target.closest( '[data-rf-cursor-hide], iframe' );
		const labelled = target.closest( '[data-rf-cursor-label]' );
		const word = labelled ? labelled.getAttribute( 'data-rf-cursor-label' ) : '';

		cursor.root.classList.toggle( 'is-hidden-here', !! hidden );
		cursor.root.style.opacity = hidden ? '0' : '';
		cursor.root.classList.toggle( 'has-label', !! word && ! hidden );
		cursor.label.textContent = word || '';
		cursor.root.classList.toggle( 'is-link', ! word && false !== cfg.links && !! target.closest( LINKS ) );
	}

	// ------------------------------------------------------------ magnetic
	let magnets = [];

	function collectMagnets() {
		magnets = Array.prototype.map.call( document.querySelectorAll( '[data-rf-magnetic]' ), ( el ) => {
			let opts = {};

			try {
				opts = JSON.parse( el.getAttribute( 'data-rf-magnetic' ) || '{}' );
			} catch ( e ) {}

			return { el, s: Number( opts.s ) || 0.35, r: Number( opts.r ) || 0, pulled: false };
		} );
	}

	function pull() {
		magnets.forEach( ( m ) => {
			const box = m.el.getBoundingClientRect();
			const inside = pointer.seen && pointer.x > box.left - m.r && pointer.x < box.right + m.r && pointer.y > box.top - m.r && pointer.y < box.bottom + m.r;

			if ( inside && ! reduce.matches ) {
				const dx = ( pointer.x - ( box.left + ( box.width / 2 ) ) ) * m.s;
				const dy = ( pointer.y - ( box.top + ( box.height / 2 ) ) ) * m.s;

				m.el.style.setProperty( '--rf-mag-x', `${ dx.toFixed( 1 ) }px` );
				m.el.style.setProperty( '--rf-mag-y', `${ dy.toFixed( 1 ) }px` );
				m.el.classList.add( 'is-pulled' );
				m.pulled = true;
			} else if ( m.pulled ) {
				m.el.style.removeProperty( '--rf-mag-x' );
				m.el.style.removeProperty( '--rf-mag-y' );
				m.el.classList.remove( 'is-pulled' );
				m.pulled = false;
			}
		} );
	}

	// ------------------------------------------------------------ the loop
	let running = false;

	function frame() {
		running = false;

		if ( cursor ) {
			const ease = reduce.matches ? 1 : Math.min( 1, Math.max( 0.05, Number( cfg.ease ) || 0.2 ) );

			cursor.x += ( pointer.x - cursor.x ) * ease;
			cursor.y += ( pointer.y - cursor.y ) * ease;
			place( cursor.dot, pointer.x, pointer.y );
			place( cursor.ring, cursor.x, cursor.y );

			if ( Math.abs( pointer.x - cursor.x ) > 0.3 || Math.abs( pointer.y - cursor.y ) > 0.3 ) {
				tick();
			}
		}

		pull();
	}

	function tick() {
		if ( ! running ) {
			running = true;
			window.requestAnimationFrame( frame );
		}
	}

	function start() {
		buildCursor();
		collectMagnets();

		if ( ! cursor && ! magnets.length ) {
			return;
		}

		document.addEventListener( 'pointermove', ( event ) => {
			if ( 'mouse' !== event.pointerType && 'pen' !== event.pointerType ) {
				return;
			}

			pointer.x = event.clientX;
			pointer.y = event.clientY;

			if ( cursor && ! pointer.seen ) {
				cursor.x = pointer.x;
				cursor.y = pointer.y;
			}

			pointer.seen = true;
			cursor?.root.classList.add( 'is-on' );
			updateState( event.target );
			tick();
		}, { passive: true } );

		document.addEventListener( 'pointerdown', () => cursor?.root.classList.add( 'is-down' ) );
		document.addEventListener( 'pointerup', () => cursor?.root.classList.remove( 'is-down' ) );
		document.documentElement.addEventListener( 'pointerleave', () => {
			pointer.seen = false;
			cursor?.root.classList.remove( 'is-on' );
			tick();
		} );
		window.addEventListener( 'scroll', () => pointer.seen && tick(), { passive: true } );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
}() );
