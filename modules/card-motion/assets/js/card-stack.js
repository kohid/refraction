/**
 * Card stack of the Image and Image Box widgets. The widget's own <img> becomes the front card and up to four
 * more images join it, laid out as:
 *   fan      - fanned out around the front card; hovering or clicking a card brings it forward
 *   deck     - a tilted deck; the top card is thrown off to the side and slides in at the back
 *   carousel - the front card with the next and previous ones waiting smaller at its sides
 *   shuffle  - a tilted pile; the front card lifts and drops to the back
 * Config: data-rf-stack on the site (Pure_Stack_Settings), the live settings in the editor. Every card's place
 * comes from its position in `order` (order[0] is the front card); CSS transitions do the moving.
 */
( function() {
	const STYLES = [ 'fan', 'deck', 'carousel', 'shuffle' ];
	const RATIOS = [ '3/4', '4/5', '1/1', '2/3', '4/3', '16/9' ];
	const reduce = () => window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const clamp = ( v, d, lo, hi ) => {
		const n = Number( v && 'object' === typeof v ? v.size : v );
		return Number.isFinite( n ) && '' !== v ? Math.max( lo, Math.min( hi, n ) ) : d;
	};

	/**
	 * The same rules as Pure_Stack_Settings, for the editor's live settings.
	 * @param {Object} s Live settings.
	 */
	function fromSettings( s ) {
		if ( ! STYLES.includes( s.rf_stack ) ) {
			return null;
		}

		const moving = 'fan' !== s.rf_stack;

		return {
			style: s.rf_stack,
			images: ( Array.isArray( s.rf_stack_images ) ? s.rf_stack_images : [] ).filter( ( i ) => i && i.url ).slice( 0, 4 ).map( ( i ) => ( { url: i.url, alt: '' } ) ),
			ratio: RATIOS.includes( s.rf_stack_ratio ) ? s.rf_stack_ratio : '3/4',
			spread: clamp( s.rf_stack_spread, 8, 0, 30 ),
			offset: clamp( s.rf_stack_offset, 30, 0, 80 ),
			autoplay: moving && 'yes' === ( undefined === s.rf_stack_autoplay ? 'yes' : s.rf_stack_autoplay ),
			interval: clamp( s.rf_stack_interval, 2800, 1200, 10000 ),
			hover: [ 'front', 'lift', 'none' ].includes( s.rf_stack_hover ) ? s.rf_stack_hover : 'front',
			click: 'yes' === ( undefined === s.rf_stack_click ? 'yes' : s.rf_stack_click ),
			dots: 'carousel' === s.rf_stack && 'yes' === ( undefined === s.rf_stack_dots ? 'yes' : s.rf_stack_dots ),
			glow: 'yes' === s.rf_stack_glow,
			reflection: 'yes' === s.rf_stack_reflection,
		};
	}

	function readConfig( el ) {
		const fe = window.refractionFrontend;
		const cid = el.getAttribute( 'data-model-cid' );

		if ( fe && cid && fe.config && fe.config.elements && fe.config.elements.data && fe.config.elements.data[ cid ] ) {
			const attrs = fe.config.elements.data[ cid ].attributes;
			const s = {};

			Object.keys( attrs ).forEach( ( k ) => {
				if ( 0 === k.indexOf( 'rf_stack' ) ) {
					s[ k ] = attrs[ k ] && attrs[ k ].toJSON ? attrs[ k ].toJSON() : attrs[ k ];
				}
			} );

			return fromSettings( s );
		}

		try {
			return JSON.parse( el.getAttribute( 'data-rf-stack' ) || 'null' );
		} catch ( e ) {
			return null;
		}
	}

	/**
	 * Where the card at position p (0 = front) of n goes, for each style.
	 * @param {string} style
	 * @param {number} p
	 * @param {number} n
	 * @param {Object} c
	 */
	function place( style, p, n, c ) {
		const sp = c.spread;
		const off = c.offset;

		if ( 'fan' === style ) {
			const k = Math.ceil( p / 2 );
			let side = 0;
			if ( p ) {
				side = p % 2 ? -1 : 1;
			}
			return { x: side * k * off, y: k * 4, r: side * k * sp, s: 1 - ( k * 0.05 ), z: n - p, o: 1 };
		}

		if ( 'deck' === style ) {
			return { x: p * off * 0.32, y: -p * 1.5, r: -sp + ( p * sp * 0.55 ), s: 1 - ( p * 0.02 ), z: n - p, o: 1 };
		}

		if ( 'carousel' === style ) {
			if ( 0 === p ) {
				return { x: 0, y: 0, r: 0, s: 1, z: n, o: 1 };
			}

			if ( 1 === p ) {
				return { x: off * 1.6, y: 0, r: sp * 0.3, s: 0.84, z: n - 1, o: 1 };
			}

			if ( n - 1 === p && n > 2 ) {
				return { x: -off * 1.6, y: 0, r: -sp * 0.3, s: 0.84, z: n - 1, o: 1 };
			}

			return { x: 0, y: 0, r: 0, s: 0.7, z: 0, o: 0 };
		}

		// Shuffle: a pile leaning back, each card a little more.
		return { x: -p * off * 0.18, y: -p * 2.2, r: -p * sp * 0.55, s: 1 - ( p * 0.03 ), z: n - p, o: Math.max( 0.35, 1 - ( p * 0.16 ) ) };
	}

	/** How the front card leaves for the back. */
	const LEAVE = {
		deck: ( c ) => ( { x: -135, y: 30, r: -28 - c.spread, s: 0.96 } ),
		shuffle: ( c ) => ( { x: 8, y: -24, r: c.spread * 0.7, s: 1.05 } ),
	};

	const transform = ( t ) => `translate(${ t.x }%, ${ t.y }%) rotate(${ t.r }deg) scale(${ t.s })`;

	/**
	 * The average color of an image (same-origin images only), for the glow.
	 * @param {HTMLImageElement} img
	 */
	function average( img ) {
		try {
			const cv = document.createElement( 'canvas' );
			cv.width = 16;
			cv.height = 16;
			const cx = cv.getContext( '2d' );
			cx.drawImage( img, 0, 0, 16, 16 );
			const d = cx.getImageData( 0, 0, 16, 16 ).data;
			let r = 0;
			let g = 0;
			let b = 0;

			for ( let i = 0; i < d.length; i += 4 ) {
				r += d[ i ];
				g += d[ i + 1 ];
				b += d[ i + 2 ];
			}

			const n = d.length / 4;
			return `rgb(${ Math.round( r / n ) }, ${ Math.round( g / n ) }, ${ Math.round( b / n ) })`;
		} catch ( e ) {
			return '';
		}
	}

	function build( el, c ) {
		if ( el.rfStack ) {
			el.rfStack.destroy();
		}

		const img = el.querySelector( '.refraction-image-box-img img, .refraction-widget-container img, img' );

		if ( ! img || ! c ) {
			return;
		}

		const linked = !! img.closest( 'a' );
		const stack = document.createElement( 'div' );
		stack.className = `rf-stack rf-stack--${ c.style }${ c.reflection ? ' rf-stack--reflect' : '' }${ c.glow ? ' rf-stack--glow' : '' }`;
		stack.style.setProperty( '--rf-stack-ratio', c.ratio );
		stack.setAttribute( 'role', 'group' );
		stack.setAttribute( 'aria-roledescription', 'card stack' );
		img.parentNode.insertBefore( stack, img );

		const sources = [ img ].concat( c.images.map( ( i ) => {
			const extra = new window.Image();
			extra.src = i.url;
			extra.alt = i.alt || '';
			extra.loading = 'lazy';
			extra.decoding = 'async';
			return extra;
		} ) );

		const cards = sources.map( ( source, i ) => {
			const card = document.createElement( 'div' );
			card.className = 'rf-stack__card';
			card.dataset.index = String( i );
			card.appendChild( source );
			stack.appendChild( card );
			return card;
		} );

		const n = cards.length;
		let order = cards.map( ( _, i ) => i );
		let timer = null;
		let busy = false;
		let hovering = false;
		let visible = false;
		const colors = [];
		let dots = null;

		// Room to the sides: the spacing shrinks when the spread-out cards would not fit (a phone).
		let fit = 1;

		function measure() {
			const card = stack.offsetWidth || 1;
			const room = ( stack.parentNode.getBoundingClientRect().width || card ) / 2 / card;
			const [ rw, rh ] = c.ratio.split( '/' ).map( Number );
			const tall = rh / rw;
			// Deck and shuffle tilt around the bottom edge, so their top corners swing further out.
			const lever = [ 'deck', 'shuffle' ].includes( c.style ) ? tall : tall / 2;

			fit = 1;

			for ( let p = 0; p < n; p++ ) {
				const t = place( c.style, p, n, c );
				const a = Math.abs( t.r ) * Math.PI / 180;
				// How far the card reaches from its own centre line, as a share of the card width.
				const reach = ( t.s * ( ( 0.5 * Math.cos( a ) ) + ( lever * Math.sin( a ) ) ) ) + 0.02;

				if ( t.o > 0 && t.x ) {
					fit = Math.min( fit, Math.max( 0, ( room - reach ) / ( Math.abs( t.x ) / 100 ) ) );
				}
			}
		}

		function apply( leaving ) {
			order.forEach( ( index, p ) => {
				const card = cards[ index ];
				const t = leaving && 0 === p ? Object.assign( place( c.style, 0, n, c ), LEAVE[ c.style ]( c ) ) : place( c.style, p, n, c );

				if ( ! leaving || p ) {
					t.x *= fit;
				}
				card.style.transform = transform( t );
				card.style.zIndex = String( leaving && 0 === p ? n + 1 : t.z );
				card.style.opacity = String( t.o );
				card.classList.toggle( 'is-front', 0 === p );
				card.setAttribute( 'aria-hidden', 0 === p ? 'false' : 'true' );
			} );

			if ( dots ) {
				Array.prototype.forEach.call( dots.children, ( dot, i ) => dot.setAttribute( 'aria-current', i === order[ 0 ] ? 'true' : 'false' ) );
			}

			if ( c.glow && colors[ order[ 0 ] ] ) {
				stack.style.setProperty( '--rf-stack-glow', colors[ order[ 0 ] ] );
			}
		}

		let calm = 0;

		/**
		 * Brings card `index` to the front; the others keep their order behind it.
		 * @param {number} index
		 */
		function bring( index ) {
			if ( busy || index === order[ 0 ] ) {
				return;
			}

			// Cards move under the pointer: wait for them to settle before a hover counts again.
			calm = Date.now() + 500;
			order = [ index ].concat( order.filter( ( i ) => i !== index ) );
			apply();
		}

		function next() {
			if ( busy || n < 2 ) {
				return;
			}

			if ( LEAVE[ c.style ] && ! reduce() ) {
				busy = true;
				apply( true );
				window.setTimeout( () => {
					order = order.slice( 1 ).concat( order[ 0 ] );
					// Behind the others before it travels back, so it slides in under them.
					cards[ order[ n - 1 ] ].style.zIndex = '0';
					apply();
					busy = false;
				}, 420 );
				return;
			}

			order = order.slice( 1 ).concat( order[ 0 ] );
			apply();
		}

		function play() {
			window.clearInterval( timer );
			timer = null;

			if ( c.autoplay && visible && ! hovering && n > 1 && ! reduce() && ! document.hidden ) {
				timer = window.setInterval( next, c.interval );
			}
		}

		if ( c.dots && n > 1 ) {
			dots = document.createElement( 'div' );
			dots.className = 'rf-stack__dots';
			cards.forEach( ( _, i ) => {
				const dot = document.createElement( 'button' );
				dot.type = 'button';
				dot.setAttribute( 'aria-label', `Card ${ i + 1 }` );
				dot.addEventListener( 'click', () => {
					bring( i );
					play();
				} );
				dots.appendChild( dot );
			} );
			stack.after( dots );
		}

		const onEnter = ( e ) => {
			const card = e.target.closest( '.rf-stack__card' );

			if ( ! card ) {
				return;
			}

			if ( 'front' === c.hover ) {
				if ( Date.now() > calm ) {
					bring( Number( card.dataset.index ) );
				}
			} else if ( 'lift' === c.hover ) {
				cards.forEach( ( k ) => k.classList.toggle( 'is-lift', k === card ) );
			}
		};
		const onLeaveCard = ( e ) => {
			const card = e.target.closest( '.rf-stack__card' );

			if ( card ) {
				card.classList.remove( 'is-lift' );
			}
		};
		const onClick = ( e ) => {
			if ( ! c.click || linked ) {
				return;
			}

			const card = e.target.closest( '.rf-stack__card' );

			if ( card && Number( card.dataset.index ) !== order[ 0 ] && 'fan' === c.style ) {
				bring( Number( card.dataset.index ) );
			} else {
				next();
			}

			play();
		};
		const pause = () => {
			hovering = true;
			play();
		};
		const resume = () => {
			hovering = false;
			play();
		};

		const onResize = () => {
			measure();
			apply();
		};

		window.addEventListener( 'resize', onResize );
		stack.addEventListener( 'mouseover', onEnter );
		stack.addEventListener( 'mouseout', onLeaveCard );
		stack.addEventListener( 'click', onClick );
		stack.addEventListener( 'mouseenter', pause );
		stack.addEventListener( 'mouseleave', resume );
		document.addEventListener( 'visibilitychange', play );

		if ( c.glow ) {
			cards.forEach( ( card, i ) => {
				const pic = card.querySelector( 'img' );
				const read = () => {
					colors[ i ] = average( pic );
					apply();
				};

				if ( pic.complete && pic.naturalWidth ) {
					read();
				} else {
					pic.addEventListener( 'load', read, { once: true } );
				}
			} );
		}

		measure();

		// Entrance: the cards start gathered behind the front card and spread out when the stack comes into view.
		cards.forEach( ( card ) => {
			card.style.transform = transform( { x: 0, y: 0, r: 0, s: 0.96 } );
		} );

		const observer = 'IntersectionObserver' in window ? new window.IntersectionObserver( ( entries ) => {
			visible = entries.some( ( e ) => e.isIntersecting );

			if ( visible && ! stack.classList.contains( 'is-ready' ) ) {
				stack.classList.add( 'is-ready' );
				apply();
			}

			play();
		}, { threshold: 0.2 } ) : null;

		if ( observer ) {
			observer.observe( stack );
		} else {
			visible = true;
			stack.classList.add( 'is-ready' );
			apply();
			play();
		}

		el.rfStack = {
			next,
			bring,
			order: () => order.slice(),
			destroy() {
				window.clearInterval( timer );
				document.removeEventListener( 'visibilitychange', play );
				window.removeEventListener( 'resize', onResize );

				if ( observer ) {
					observer.disconnect();
				}
			},
		};
	}

	function init( el ) {
		build( el, readConfig( el ) );
	}

	function scan( root ) {
		Array.prototype.forEach.call( ( root || document ).querySelectorAll( '[data-rf-stack]' ), init );
	}

	/**
	 * The editor preview re-renders widgets: rebuild them from the live settings.
	 * @param {number} tries
	 */
	function hookIntoEditor( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks && fe.config && fe.config.elements && fe.isEditMode && fe.isEditMode() ) {
			[ 'image', 'image-box' ].forEach( ( name ) => {
				fe.hooks.addAction( `frontend/element_ready/${ name }.default`, ( $scope ) => $scope && $scope[ 0 ] && init( $scope[ 0 ] ) );
			} );
			Array.prototype.forEach.call( document.querySelectorAll( '.refraction-widget-image[data-model-cid], .refraction-widget-image-box[data-model-cid]' ), init );
			return;
		}

		if ( tries < 300 ) {
			window.setTimeout( () => hookIntoEditor( tries + 1 ), 100 );
		}
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => scan() );
	} else {
		scan();
	}

	hookIntoEditor( 0 );
}() );
