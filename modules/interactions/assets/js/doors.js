/**
 * Sections that open like doors (Page Settings > Sections Open Like Doors), site only. The page's top-level
 * containers stick to the screen in turn. A "door" stays on top of the next one and, while the page scrolls one screen,
 * swings open on its left or right hinge to show it; a "push" one stays under the next one and sinks back (smaller,
 * darker) while the next slides over it. The last one stays. Each container's own choice (data-rf-door) wins over the
 * page's pattern (alternate: left, right, left...). Each section gets --rf-door-p, its progress from 0 to 1; the CSS
 * draws it. A section taller than the screen scrolls through first and opens at its end. Reduced motion: off.
 * Config: window.refractionDoors.
 */
( function() {
	const cfg = window.refractionDoors;
	const reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	const phone = window.matchMedia( '(max-width: 767px)' );

	if ( ! cfg || reduce.matches || ( ! cfg.phones && phone.matches ) ) {
		return;
	}

	const root = document.documentElement;
	const stage = document.querySelector( '.refraction-' + cfg.id + '[data-refraction-type]' ) || document.querySelector( '[data-refraction-id="' + cfg.id + '"]' );
	const sections = stage ? Array.from( stage.children ).filter( ( el ) => el.classList.contains( 'refraction-element' ) ) : [];

	if ( sections.length < 2 ) {
		return;
	}

	const EFFECTS = [ 'left', 'right', 'push', 'none' ];
	let starts = [];
	let ticking = false;

	/**
	 * The effect of section i: its own, or the page's pattern; the last one stays.
	 * @param {Element} section
	 * @param {number}  i
	 */
	function effectOf( section, i ) {
		if ( i === sections.length - 1 ) {
			return 'none';
		}

		const own = section.getAttribute( 'data-rf-door' );

		if ( own && EFFECTS.indexOf( own ) > -1 ) {
			return own;
		}

		if ( 'alternate' === cfg.pattern ) {
			return 0 === i % 2 ? 'left' : 'right';
		}

		return cfg.pattern;
	}

	/** Positions in the page's flow (measured without sticking), and where each sticks (a tall one at its end). */
	function measure() {
		root.classList.add( 'rf-doors-measure' );

		const vh = window.innerHeight;
		const scroll = window.scrollY;

		starts = sections.map( ( section ) => {
			const box = section.getBoundingClientRect();
			const tall = Math.max( 0, box.height - vh );

			const start = Math.round( box.top + scroll + tall );

			section.style.setProperty( '--rf-door-top', `${ -Math.round( tall ) }px` );
			section.setAttribute( 'data-rf-door-start', String( start ) );

			return start;
		} );
		root.classList.remove( 'rf-doors-measure' );
		frame();
	}

	function frame() {
		ticking = false;

		const vh = window.innerHeight;
		const y = window.scrollY;

		sections.forEach( ( section, i ) => {
			if ( ! section.classList.contains( 'rf-door--moves' ) ) {
				return;
			}

			const p = Math.max( 0, Math.min( 1, ( y - starts[ i ] ) / vh ) );
			const value = p.toFixed( 4 );
			const next = sections[ i + 1 ];

			// Behind a door the next section waits in place (it would still be rising from the bottom of the screen).
			if ( next && ( section.classList.contains( 'rf-door--left' ) || section.classList.contains( 'rf-door--right' ) ) ) {
				const shift = `0 ${ ( -( 1 - p ) * vh ).toFixed( 1 ) }px`;

				if ( next.style.translate !== shift ) {
					next.style.translate = p >= 1 ? '' : shift;
				}
			}

			if ( section.style.getPropertyValue( '--rf-door-p' ) !== value ) {
				section.style.setProperty( '--rf-door-p', value );
				section.classList.toggle( 'is-opening', p > 0 && p < 1 );
				section.classList.toggle( 'is-open', p >= 1 );
			}
		} );
	}

	function onScroll() {
		if ( ! ticking ) {
			ticking = true;
			window.requestAnimationFrame( frame );
		}
	}

	function init() {
		const n = sections.length;
		// A door is above the next section (it opens to show it); a push is under it (the next slides over).
		let z = 1000;

		root.classList.add( 'rf-doors' );
		root.classList.toggle( 'rf-doors-shade', !! cfg.shade );
		stage.classList.add( 'rf-doors-stage' );
		stage.style.setProperty( '--rf-door-angle', `${ cfg.angle }deg` );

		const bodyBg = window.getComputedStyle( document.body ).backgroundColor;

		if ( bodyBg && ! /rgba\(0, 0, 0, 0\)|transparent/.test( bodyBg ) ) {
			stage.style.setProperty( '--rf-doors-body-bg', bodyBg );
		}

		sections.forEach( ( section, i ) => {
			const effect = effectOf( section, i );

			section.classList.add( 'rf-door', 'rf-door--' + effect );
			section.classList.toggle( 'rf-door--moves', 'none' !== effect );
			section.style.zIndex = String( z );
			z += 'push' === effect ? 1 : -1;

			if ( i === n - 1 ) {
				section.classList.add( 'rf-door--last' );
			}
		} );

		measure();
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		window.addEventListener( 'resize', measure );
		window.addEventListener( 'load', measure );

		if ( 'ResizeObserver' in window ) {
			new ResizeObserver( () => window.requestAnimationFrame( measure ) ).observe( stage );
		}

		// Turning reduced motion on: back to a plain page.
		reduce.addEventListener?.( 'change', () => reduce.matches && root.classList.remove( 'rf-doors' ) );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
