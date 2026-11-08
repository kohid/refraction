/**
 * Scrolling effects of containers (Container > Layout > Scrolling Effect), site only. A top-level container with an
 * effect stays on the screen while the next one comes, then leaves over one screen of scrolling:
 *   left / right: opens like a door on that hinge (the next waits in place behind it);
 *   book:         turns over like a book page, towards the viewer and over to the left (the next waits behind it);
 *   slide:        slides out to the left as the next comes in from the right (what is on them moves as layers);
 *   push:         sinks back, smaller and darker, as the next slides up over it;
 *   zoom:         the camera moves through it: its titles grow past the viewer, it blurs and fades, and the next one
 *                 (waiting behind) comes into focus;
 *   zoom-out:     the reverse: it falls away into the distance, smaller and blurred, and the next one comes in from
 *                 close up, settling into focus.
 * Each has its own settings in data-rf-door (fx, angle, shade, phones, depth). The page's last container stays. Each
 * gets --rf-door-p, its progress from 0 to 1; the CSS draws it. A container taller than the screen scrolls through
 * first. Off for reduced motion, on a page shown as Pages Side By Side, and on phones for containers that say so.
 */
( function() {
	const reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' );

	if ( reduce.matches ) {
		return;
	}

	const phone = window.matchMedia( '(max-width: 767px)' );

	const root = document.documentElement;
	// Automatic layers trail behind their container (less than 0): they stay longer as it leaves and arrive early.
	const AUTO_DEPTHS = [ -0.5, -1, -0.25, -0.75 ];
	const stages = [];
	let ticking = false;

	function config( el ) {
		try {
			const cfg = JSON.parse( el.getAttribute( 'data-rf-door' ) || '{}' );

			return cfg && cfg.fx && ( cfg.phones || ! phone.matches ) ? cfg : null;
		} catch ( e ) {
			return null;
		}
	}

	/**
	 * Layers of a sliding container: elements with their own depth, or its direct children (or its only child's).
	 * @param {Element} section
	 */
	function layers( section ) {
		const own = section.querySelectorAll( '[data-rf-hp-depth]' );

		if ( own.length ) {
			own.forEach( ( el ) => {
				el.setAttribute( 'data-rf-door-layer', '' );
				el.style.setProperty( '--rf-hp-d', el.getAttribute( 'data-rf-hp-depth' ) );
			} );
			return;
		}

		let box = section.querySelector( ':scope > .e-con-inner' ) || section;

		if ( 1 === box.children.length && box.firstElementChild.classList.contains( 'refraction-element' ) ) {
			box = box.firstElementChild.querySelector( ':scope > .e-con-inner' ) || box.firstElementChild;
		}

		Array.from( box.children ).filter( ( el ) => el.classList.contains( 'refraction-element' ) ).forEach( ( el, k ) => {
			el.setAttribute( 'data-rf-door-layer', '' );
			el.style.setProperty( '--rf-hp-d', String( AUTO_DEPTHS[ k % AUTO_DEPTHS.length ] ) );
		} );
	}

	/**
	 * Where each section sits in the page's flow (not sticking, turned or shifted), and where it sticks.
	 * @param {Object} stage
	 */
	function measure( stage ) {
		root.classList.add( 'rf-doors-measure' );

		const vh = window.innerHeight;
		const scroll = window.scrollY;

		stage.items.forEach( ( item ) => {
			const box = item.el.getBoundingClientRect();
			const tall = Math.max( 0, box.height - vh );

			item.start = Math.round( box.top + scroll + tall );
			item.width = box.width;
			item.el.style.setProperty( '--rf-door-top', `${ -Math.round( tall ) }px` );
			item.el.setAttribute( 'data-rf-door-start', String( item.start ) );
		} );
		root.classList.remove( 'rf-doors-measure' );
	}

	function measureAll() {
		stages.forEach( measure );
		frame();
	}

	function frame() {
		ticking = false;

		const vh = window.innerHeight;
		const y = window.scrollY;

		stages.forEach( ( stage ) => {
			const xs = stage.items.map( () => 0 );
			const ins = stage.items.map( () => 0 );
			const shifts = stage.items.map( () => null );

			stage.items.forEach( ( item, i ) => {
				if ( ! item.cfg ) {
					return;
				}

				const p = Math.max( 0, Math.min( 1, ( y - item.start ) / vh ) );
				const next = stage.items[ i + 1 ];

				item.el.style.setProperty( '--rf-door-p', p.toFixed( 4 ) );
				item.el.classList.toggle( 'is-opening', p > 0 && p < 1 );
				item.el.classList.toggle( 'is-open', p >= 1 );

				if ( 'slide' === item.cfg.fx ) {
					xs[ i ] -= p;
				}

				// The next one waits in place behind a door or a page (it would still be rising from the bottom of the
				// screen); after a slide it comes in from the right at the same height.
				if ( next && p < 1 && 'push' !== item.cfg.fx ) {
					const across = 'slide' === item.cfg.fx ? ( 1 - p ) * item.width : 0;

					shifts[ i + 1 ] = `${ across.toFixed( 1 ) }px ${ ( -( 1 - p ) * vh ).toFixed( 1 ) }px`;

					if ( 'slide' === item.cfg.fx ) {
						xs[ i + 1 ] += 1 - p;
					}

					// After a zoom, the next one comes into focus (from blurred, or from close up).
					if ( isZoom( item.cfg.fx ) ) {
						ins[ i + 1 ] = 1 - p;
					}
				}
			} );

			stage.items.forEach( ( item, i ) => {
				const shift = shifts[ i ] || '';

				if ( item.el.style.translate !== shift ) {
					item.el.style.translate = shift;
				}

				item.el.style.setProperty( '--rf-door-x', xs[ i ].toFixed( 4 ) );
				item.el.style.setProperty( '--rf-door-in', ins[ i ].toFixed( 4 ) );
			} );
		} );
	}

	function isZoom( fx ) {
		return 'zoom' === fx || 'zoom-out' === fx;
	}

	/**
	 * What a zooming container's camera moves through: its titles (headings) most, the rest less.
	 * @param {Element} section
	 */
	function zoomLayers( section ) {
		let box = section.querySelector( ':scope > .e-con-inner' ) || section;

		if ( 1 === box.children.length && box.firstElementChild.classList.contains( 'refraction-element' ) ) {
			box = box.firstElementChild.querySelector( ':scope > .e-con-inner' ) || box.firstElementChild;
		}

		Array.from( box.children ).filter( ( el ) => el.classList.contains( 'refraction-element' ) ).forEach( ( el ) => {
			const title = el.classList.contains( 'refraction-widget-heading' ) || el.classList.contains( 'refraction-widget-animated-headline' );

			el.setAttribute( 'data-rf-zoom-layer', '' );
			el.style.setProperty( '--rf-zd', title ? '3' : '1.2' );
		} );
	}

	function onScroll() {
		if ( ! ticking ) {
			ticking = true;
			window.requestAnimationFrame( frame );
		}
	}

	function setUp( stage ) {
		const els = Array.from( stage.children ).filter( ( el ) => el.classList.contains( 'refraction-element' ) );
		const items = els.map( ( el, i ) => ( { el, cfg: i < els.length - 1 ? config( el ) : null, start: 0, width: 0 } ) );

		if ( ! items.some( ( item ) => item.cfg ) ) {
			return;
		}

		// A door, a page or a slide lies above the next container; a sinking one under it (the next slides over).
		let z = 1000;

		stage.classList.add( 'rf-doors-stage' );
		items.forEach( ( item, i ) => {
			const fx = item.cfg ? item.cfg.fx : 'none';

			item.el.classList.add( 'rf-door', 'rf-door--' + fx );
			item.el.classList.toggle( 'rf-door--moves', !! item.cfg );
			item.el.classList.toggle( 'rf-door--shade', !! ( item.cfg && item.cfg.shade ) );
			item.el.style.zIndex = String( z );
			z += 'push' === fx ? 1 : -1;

			if ( item.cfg ) {
				item.el.style.setProperty( '--rf-door-angle', `${ item.cfg.angle }deg` );
			}

			if ( item.cfg && isZoom( item.cfg.fx ) ) {
				zoomLayers( item.el );

				if ( items[ i + 1 ] ) {
					items[ i + 1 ].el.classList.add( 'rf-door--incoming' );
					items[ i + 1 ].el.setAttribute( 'data-rf-door-in', item.cfg.fx );
				}
			}

			if ( item.cfg && 'slide' === item.cfg.fx && item.cfg.depth ) {
				[ item.el, items[ i + 1 ] && items[ i + 1 ].el ].filter( Boolean ).forEach( ( el ) => {
					el.style.setProperty( '--rf-door-depth', `${ item.cfg.depth }vw` );
					layers( el );
				} );
			}
		} );

		stages.push( { el: stage, items } );
	}

	function init() {
		const pages = window.refractionPages;
		const found = new Set();

		document.querySelectorAll( '[data-rf-door]' ).forEach( ( el ) => {
			const stage = el.parentElement;

			// Top-level containers only, and not on a page shown as Pages Side By Side.
			if ( stage && stage.hasAttribute( 'data-refraction-type' ) && ! ( pages && stage.classList.contains( 'refraction-' + pages.id ) ) ) {
				found.add( stage );
			}
		} );

		found.forEach( setUp );

		if ( ! stages.length ) {
			return;
		}

		root.classList.add( 'rf-doors' );

		const bodyBg = window.getComputedStyle( document.body ).backgroundColor;

		if ( bodyBg && ! /rgba\(0, 0, 0, 0\)|transparent/.test( bodyBg ) ) {
			root.style.setProperty( '--rf-doors-body-bg', bodyBg );
		}

		measureAll();
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		window.addEventListener( 'resize', measureAll );
		window.addEventListener( 'load', measureAll );

		if ( 'ResizeObserver' in window ) {
			const watch = new ResizeObserver( () => window.requestAnimationFrame( measureAll ) );

			stages.forEach( ( stage ) => watch.observe( stage.el ) );
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
