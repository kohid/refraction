/**
 * Organic FX layers (modules/organic-fx): Deco Blob, Grain, Floating Shapes and Floating Text, built from an element's
 * settings. On the site the settings come from data-settings; in the editor's preview from the element's model, and
 * the element is drawn again (render_type template) when one of them changes. Shape Mask needs no script (CSS only).
 */
import { SHAPES } from './shapes-data';

( function() {
	const NS = 'http://www.w3.org/2000/svg';
	const reduced = window.matchMedia ? window.matchMedia( '(prefers-reduced-motion: reduce)' ) : { matches: false };

	/** The small shapes of Floating Shapes, in a 24 x 24 box. `line`: drawn with a stroke even when solid. */
	const SMALL = {
		circle: { d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z' },
		ring: { d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z', line: true },
		triangle: { d: 'M12 3L21.5 20H2.5Z' },
		square: { d: 'M4 4H20V20H4Z' },
		plus: { d: 'M9.5 3H14.5V9.5H21V14.5H14.5V21H9.5V14.5H3V9.5H9.5Z' },
		cross: { d: 'M5.6 3.5L12 9.9L18.4 3.5L20.5 5.6L14.1 12L20.5 18.4L18.4 20.5L12 14.1L5.6 20.5L3.5 18.4L9.9 12L3.5 5.6Z' },
		squiggle: { d: 'M2 12C4.5 7 7 7 9.5 12S14.5 17 17 12S21.5 7 23 10', line: true },
		star: { d: 'M12 2.5L14.8 8.6L21.5 9.3L16.5 13.8L17.9 20.5L12 17.1L6.1 20.5L7.5 13.8L2.5 9.3L9.2 8.6Z' },
		hexagon: { d: 'M12 2.5L20.5 7.25V16.75L12 21.5L3.5 16.75V7.25Z' },
		half: { d: 'M3 15a9 9 0 0 1 18 0Z' },
		blob: { d: 'M19.2 6.4C21.6 9.3 21.2 14.2 18.6 17.4S11.3 22.1 7.9 20.3S2.1 14.1 3.2 10.2S8.1 3 12 2.8S16.8 3.5 19.2 6.4Z' },
		heart: { d: 'M12 20.5C5 15.6 2.5 12.4 2.5 8.6C2.5 5.6 4.8 3.5 7.5 3.5C9.4 3.5 11 4.6 12 6.2C13 4.6 14.6 3.5 16.5 3.5C19.2 3.5 21.5 5.6 21.5 8.6C21.5 12.4 19 15.6 12 20.5Z' },
	};

	const mine = () => window.refractionMyShapes || {};

	/**
	 * A big shape: [ path data, viewBox, fill rule ], from the built-in shapes or My Shapes.
	 * @param {string} id Shape id.
	 */
	function bigShape( id ) {
		if ( SHAPES[ id ] ) {
			return [ SHAPES[ id ], '0 0 100 100', 'nonzero' ];
		}

		const m = mine()[ id ];

		return m ? [ m.d, m.vb, m.rule || 'nonzero' ] : null;
	}

	// ----------------------------------------------------------------- settings

	const frontend = () => window.refractionFrontend;

	function model( el ) {
		const fe = frontend();
		const cid = el.getAttribute( 'data-model-cid' );

		return fe && cid && fe.config && fe.config.elements && fe.config.elements.data ? fe.config.elements.data[ cid ] : null;
	}

	function settings( el ) {
		const m = model( el );

		if ( m && m.attributes ) {
			const s = {};

			Object.keys( m.attributes ).forEach( ( k ) => {
				if ( 0 === k.indexOf( 'rf_' ) ) {
					const v = m.attributes[ k ];
					s[ k ] = v && v.toJSON ? v.toJSON() : v;
				}
			} );

			return s;
		}

		try {
			return JSON.parse( el.getAttribute( 'data-settings' ) || '{}' ) || {};
		} catch ( e ) {
			return {};
		}
	}

	const on = ( v ) => 'yes' === v;
	const size = ( v, d ) => {
		const n = parseFloat( v && 'object' === typeof v ? v.size : v );

		return Number.isFinite( n ) ? n : d;
	};
	const int = ( v, d ) => {
		const n = parseInt( v, 10 );

		return Number.isFinite( n ) ? n : d;
	};

	// ----------------------------------------------------------------- randomness (stable per element)

	/* eslint-disable no-bitwise -- a small seeded hash and random sequence */
	function hash( str ) {
		let h = 2166136261;

		for ( let i = 0; i < str.length; i++ ) {
			h ^= str.charCodeAt( i );
			h = Math.imul( h, 16777619 );
		}

		return h >>> 0;
	}

	function rng( seed ) {
		let a = seed || 1;

		return () => {
			a = ( a + 0x6d2b79f5 ) | 0;
			let t = Math.imul( a ^ ( a >>> 15 ), 1 | a );
			t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t;

			return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
		};
	}
	/* eslint-enable no-bitwise */

	const pick = ( r, list ) => list[ Math.floor( r() * list.length ) % list.length ];

	// ----------------------------------------------------------------- dom helpers

	function svgEl( tag, attrs ) {
		const n = document.createElementNS( NS, tag );

		Object.keys( attrs ).forEach( ( k ) => n.setAttribute( k, attrs[ k ] ) );

		return n;
	}

	function layer( cls, over ) {
		const d = document.createElement( 'div' );

		d.className = cls + ( over ? ' rf-ofx-over' : '' );
		d.setAttribute( 'aria-hidden', 'true' );
		d.setAttribute( 'data-rf-ofx', '' );

		return d;
	}

	function grainUrl( seed, grainSize ) {
		const freq = { fine: 0.9, medium: 0.62, coarse: 0.4 }[ grainSize ] || 0.9;
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${ freq }" numOctaves="3" seed="${ seed % 1000 }" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

		return `url("data:image/svg+xml,${ encodeURIComponent( svg ) }")`;
	}

	function grainLayer( el, s, inBlob ) {
		const g = layer( 'rf-ofx-grain', false );
		const pattern = int( s.rf_grain_pattern, 0 );
		const seed = inBlob || ! pattern ? hash( el.getAttribute( 'data-id' ) || 'rf' ) : pattern;

		g.style.backgroundImage = grainUrl( seed, inBlob ? 'medium' : s.rf_grain_size );

		return g;
	}

	// ----------------------------------------------------------------- deco blob

	function outline( id, offset ) {
		const shape = bigShape( id );

		if ( ! shape ) {
			return null;
		}

		const svg = svgEl( 'svg', { viewBox: shape[ 1 ], preserveAspectRatio: 'none', class: offset ? 'rf-ofx-blob__line rf-ofx-blob__line--offset' : 'rf-ofx-blob__line' } );
		svg.appendChild( svgEl( 'path', { d: shape[ 0 ], 'fill-rule': shape[ 2 ] } ) );

		return svg;
	}

	// The shape a picker pair chose: the Uploaded tab's, else the Built-in one (which may hold an older my- id).
	const chosen = ( s, source, builtin, uploaded ) => ( 'mine' === s[ source ] ? s[ uploaded ] : s[ builtin ] ) || '';

	function blob( el, host, s ) {
		const id = chosen( s, 'rf_blob_source', 'rf_blob_shape', 'rf_blob_mine' ) || 'blob-1';

		if ( ! bigShape( id ) ) {
			return;
		}

		const style = s.rf_blob_style || 'solid';
		const b = layer( 'rf-ofx-blob rf-shape--' + id, false );

		if ( 'outline' !== style ) {
			const fill = document.createElement( 'div' );
			fill.className = 'rf-ofx-blob__fill';
			b.appendChild( fill );

			if ( on( s.rf_blob_grain ) ) {
				b.appendChild( grainLayer( el, s, true ) );
			}
		}

		let line = null;

		if ( 'outline' === style ) {
			line = outline( id, false );
		} else if ( 'both' === style ) {
			line = outline( s.rf_blob_line_shape || 'blob-2', true );
		}

		if ( line ) {
			b.appendChild( line );
		}

		// Flat edge (containers): held in a layer the container's size that cuts it straight at that side.
		if ( s.rf_blob_edge && host === el && ! el.matches( '.refraction-widget-image' ) ) {
			const clip = layer( 'rf-ofx-bclip', false );
			clip.appendChild( b );
			host.insertBefore( clip, host.firstChild );
			return;
		}

		host.insertBefore( b, host.firstChild );
	}

	// ----------------------------------------------------------------- shape mask: placement, flips, motion, fill

	const css = ( el, name, fallback ) => {
		const v = parseFloat( window.getComputedStyle( el ).getPropertyValue( name ) );

		return Number.isFinite( v ) ? v : fallback;
	};

	/**
	 * The mask image of a shape, flipped as asked (an SVG in a data URI; path data from the built-in list or My
	 * Shapes, both only numbers and path letters).
	 *
	 * @param {Array}   shape [ path data, viewBox, fill rule ].
	 * @param {boolean} fh    Flip horizontally.
	 * @param {boolean} fv    Flip vertically.
	 */
	function maskImage( shape, fh, fv ) {
		const [ vx, vy, vw, vh ] = shape[ 1 ].split( ' ' ).map( Number );
		const turn = fh || fv ? ` transform="translate(${ fh ? ( 2 * vx ) + vw : 0 } ${ fv ? ( 2 * vy ) + vh : 0 }) scale(${ fh ? -1 : 1 } ${ fv ? -1 : 1 })"` : '';
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ shape[ 1 ] }" preserveAspectRatio="none"><path fill-rule="${ shape[ 2 ] }" d="${ shape[ 0 ] }"${ turn }/></svg>`;

		return `url("data:image/svg+xml,${ encodeURIComponent( svg ) }")`;
	}

	/**
	 * Where the shape sits inside a box of W x H px: Placement (custom properties on the element), Fit, Flat edge, and
	 * the motion pose { k: scale, dx, dy: shift as fractions of the box }.
	 *
	 * @param {Element} el   The element holding the Placement properties.
	 * @param {number}  W    Box width.
	 * @param {number}  H    Box height.
	 * @param {Object}  o    { keep, aspect, edge }.
	 * @param {Object}  pose Motion pose.
	 */
	function maskBox( el, W, H, o, pose ) {
		let w = W * css( el, '--rf-mask-w', 100 ) / 100;
		let h = H * css( el, '--rf-mask-h', 100 ) / 100;

		if ( o.keep && o.aspect ) {
			if ( w / h > o.aspect ) {
				w = h * o.aspect;
			} else {
				h = w / o.aspect;
			}
		}

		let x = ( ( W - w ) * css( el, '--rf-mask-ax', 0.5 ) ) + ( W * css( el, '--rf-mask-ox', 0 ) / 100 );
		let y = ( ( H - h ) * css( el, '--rf-mask-ay', 0.5 ) ) + ( H * css( el, '--rf-mask-oy', 0 ) / 100 );

		// Flat edge: 30% of the shape runs past that side, so the element's edge cuts it straight.
		if ( 'left' === o.edge ) {
			x = -0.3 * w;
		} else if ( 'right' === o.edge ) {
			x = W - ( 0.7 * w );
		} else if ( 'top' === o.edge ) {
			y = -0.3 * h;
		} else if ( 'bottom' === o.edge ) {
			y = H - ( 0.7 * h );
		}

		const cx = x + ( w / 2 ) + ( pose.dx * W );
		const cy = y + ( h / 2 ) + ( pose.dy * H );
		w *= pose.k;
		h *= pose.k;

		return { w, h, x: cx - ( w / 2 ), y: cy - ( h / 2 ) };
	}

	const BG = [ 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-attachment', 'background-origin', 'background-clip', 'background-blend-mode' ];

	/**
	 * Shape Mask driven by the script: size and position from Placement, flips, flat edge, motion, and for "Clip
	 * background only" a fill layer that takes the container's background. Without the script the mask still shows
	 * from its CSS class, stretched to the element.
	 *
	 * @param {Element} el    The container or Image widget.
	 * @param {Object}  s     Settings.
	 * @param {Object}  state The element's layer state.
	 */
	function shapeMask( el, s, state ) {
		const id = chosen( s, 'rf_mask_source', 'rf_mask', 'rf_mask_mine' );
		const shape = bigShape( id );

		if ( ! shape ) {
			return;
		}

		const isImage = el.matches( '.refraction-widget-image' );
		const bgOnly = ! isImage && 'bg' === s.rf_mask_mode;
		const vb = shape[ 1 ].split( ' ' ).map( Number );
		const o = { keep: 'keep' === s.rf_mask_fit, aspect: vb[ 2 ] / vb[ 3 ], edge: s.rf_mask_edge || '' };
		const url = maskImage( shape, on( s.rf_mask_flip_h ), on( s.rf_mask_flip_v ) );
		const m = { pose: { k: 1, dx: 0, dy: 0 }, target: null, fill: null, styleAttr: null, raf: 0, frame: null };

		state.mask = m;

		function target() {
			return isImage ? el.querySelector( 'img' ) : ( m.fill || el );
		}

		function takeBackground() {
			const cs = window.getComputedStyle( el );

			BG.forEach( ( p ) => m.fill.style.setProperty( p, cs.getPropertyValue( p ) ) );
			m.fill.style.borderRadius = cs.borderRadius;
			el.style.setProperty( 'background', 'none', 'important' );
		}

		if ( bgOnly ) {
			m.styleAttr = el.getAttribute( 'style' );
			m.fill = layer( 'rf-ofx-fill rf-shape--' + id, false );
			takeBackground();
			el.insertBefore( m.fill, el.firstChild );
		}

		m.apply = () => {
			const t = target();

			if ( ! t || ! t.offsetWidth ) {
				return;
			}

			const b = maskBox( el, t.offsetWidth, t.offsetHeight, o, m.pose );

			[ 'mask', '-webkit-mask' ].forEach( ( p ) => {
				t.style.setProperty( p + '-image', url );
				t.style.setProperty( p + '-size', `${ b.w.toFixed( 1 ) }px ${ b.h.toFixed( 1 ) }px` );
				t.style.setProperty( p + '-position', `${ b.x.toFixed( 1 ) }px ${ b.y.toFixed( 1 ) }px` );
				t.style.setProperty( p + '-repeat', 'no-repeat' );
			} );
			m.target = t;
		};

		/** The background again (it changed in the editor, or a lazy-loaded image arrived). */
		m.refill = () => {
			if ( m.fill ) {
				el.style.removeProperty( 'background' );
				takeBackground();
			}

			m.apply();
		};

		m.destroy = () => {
			window.cancelAnimationFrame( m.raf );

			if ( m.target ) {
				[ 'mask', '-webkit-mask' ].forEach( ( p ) => [ '-image', '-size', '-position', '-repeat' ].forEach( ( q ) => m.target.style.removeProperty( p + q ) ) );
			}

			if ( m.fill ) {
				if ( null === m.styleAttr ) {
					el.removeAttribute( 'style' );
				} else {
					el.setAttribute( 'style', m.styleAttr );
				}
			}

			if ( m.lazy ) {
				m.lazy.disconnect();
			}
		};

		// A lazy-loaded background image shows once the container gets e-lazyloaded: copy it again then.
		if ( bgOnly && ! el.classList.contains( 'e-lazyloaded' ) && 'MutationObserver' in window ) {
			m.lazy = new MutationObserver( () => {
				if ( el.classList.contains( 'e-lazyloaded' ) ) {
					m.lazy.disconnect();
					m.refill();
				}
			} );
			m.lazy.observe( el, { attributes: true, attributeFilter: [ 'class' ] } );
		}

		m.apply();

		if ( isImage ) {
			const img = el.querySelector( 'img' );

			if ( img ) {
				img.addEventListener( 'load', m.apply );
			}
		}

		maskMotion( el, s, state, m );
	}

	const easeOut = ( t ) => 1 - Math.pow( 1 - t, 3 );

	/**
	 * Mask motion: Continuous gentle loop (breathes and sways), On hover (grows a little and lifts), Once when
	 * scrolled into view (grows from smaller). Only size and position change, so nothing is redrawn.
	 *
	 * @param {Element} el    The element.
	 * @param {Object}  s     Settings.
	 * @param {Object}  state The element's layer state.
	 * @param {Object}  m     The mask.
	 */
	function maskMotion( el, s, state, m ) {
		const trigger = s.rf_mask_trigger || '';

		if ( ! trigger || reduced.matches ) {
			return;
		}

		const dur = Math.max( 400, size( s.rf_mask_duration, 5000 ) );
		const frame = ( fn ) => {
			m.raf = window.requestAnimationFrame( ( now ) => {
				if ( ! state.stopped ) {
					fn( now );
				}
			} );
		};

		if ( 'loop' === trigger ) {
			const tick = ( now ) => {
				const a = ( now % dur ) / dur * 2 * Math.PI;

				if ( state.visible ) {
					m.pose = { k: 1 + ( 0.035 * Math.sin( a ) ), dx: 0.012 * Math.sin( a + 1 ), dy: 0.012 * Math.sin( 2 * a ) };
					m.apply();
				}

				frame( tick );
			};

			frame( tick );
		} else if ( 'hover' === trigger ) {
			let v = 0;
			let goal = 0;
			let last = 0;
			const tick = ( now ) => {
				const step = last ? ( now - last ) / dur : 0;
				last = now;
				v = goal > v ? Math.min( goal, v + step ) : Math.max( goal, v - step );
				const e = easeOut( v );
				m.pose = { k: 1 + ( 0.06 * e ), dx: 0, dy: -0.015 * e };
				m.apply();

				if ( v !== goal ) {
					frame( tick );
				}
			};
			const go = ( g ) => {
				goal = g;
				last = 0;
				window.cancelAnimationFrame( m.raf );
				frame( tick );
			};

			el.addEventListener( 'mouseenter', () => go( 1 ) );
			el.addEventListener( 'mouseleave', () => go( 0 ) );
		} else if ( 'inview' === trigger && 'IntersectionObserver' in window ) {
			m.pose = { k: 0.8, dx: 0, dy: 0.03 };
			m.apply();

			const seen = new IntersectionObserver( ( entries ) => {
				if ( ! entries.some( ( en ) => en.isIntersecting ) ) {
					return;
				}

				seen.disconnect();
				let start = 0;
				const tick = ( now ) => {
					start = start || now;
					const e = easeOut( Math.min( 1, ( now - start ) / dur ) );
					m.pose = { k: 0.8 + ( 0.2 * e ), dx: 0, dy: 0.03 * ( 1 - e ) };
					m.apply();

					if ( e < 1 ) {
						frame( tick );
					}
				};

				frame( tick );
			}, { threshold: 0.25 } );

			seen.observe( el );
			state.seen = seen;
		}
	}

	// ----------------------------------------------------------------- floating shapes and text: where they may go

	/**
	 * The horizontal ranges (in 0..1) a layer may use.
	 * @param {Object} s Settings.
	 * @param {string} p Setting prefix.
	 */
	function ranges( s, p ) {
		const band = Math.min( 0.5, Math.max( 0.1, size( s[ p + 'band' ], 30 ) / 100 ) );

		switch ( s[ p + 'area' ] ) {
			case 'left':
				return [ [ 0, band ] ];
			case 'right':
				return [ [ 1 - band, 1 ] ];
			case 'edges':
				return [ [ 0, band ], [ 1 - band, 1 ] ];
			default:
				return [ [ 0, 1 ] ];
		}
	}

	const phone = () => window.innerWidth < 768;

	function palette( s, p, fallback ) {
		const list = [ 1, 2, 3, 4 ].map( ( i ) => s[ p + 'color_' + i ] ).filter( ( c ) => c && 'string' === typeof c );

		return list.length ? list : [ fallback ];
	}

	// ----------------------------------------------------------------- floating shapes

	function smallShape( id ) {
		if ( SMALL[ id ] ) {
			return [ SMALL[ id ].d, '0 0 24 24', 'nonzero', !! SMALL[ id ].line ];
		}

		const m = mine()[ id ];

		return m ? [ m.d, m.vb, m.rule || 'nonzero', false ] : null;
	}

	function floatingShapes( el, s ) {
		const p = 'rf_fs_';
		const count = Math.max( 0, Math.min( 60, int( phone() ? s[ p + 'count_mobile' ] : s[ p + 'count' ], phone() ? 8 : 14 ) ) );
		const ids = ( Array.isArray( s[ p + 'shapes' ] ) && s[ p + 'shapes' ].length ? s[ p + 'shapes' ] : [ 'circle', 'ring', 'triangle', 'plus' ] ).filter( smallShape );

		if ( ! count || ! ids.length ) {
			return;
		}

		const box = layer( 'rf-ofx-shapes', 'over' === s[ p + 'layer' ] );
		el.insertBefore( box, el.firstChild );

		const w = el.clientWidth || 1;
		const h = el.clientHeight || 1;
		const r = rng( hash( ( el.getAttribute( 'data-id' ) || '' ) + 'fs' ) );
		const colors = palette( s, p, '#F69216' );
		const big = Math.max( 6, size( s[ p + 'size' ], 34 ) );
		const time = Math.max( 4, size( s[ p + 'speed' ], 22 ) );
		const style = s[ p + 'style' ] || 'mix';
		const dir = s[ p + 'direction' ] || 'up';
		const spin = on( s[ p + 'spin' ] );
		const opacity = size( s[ p + 'opacity' ], 0.7 );
		const lanes = ranges( s, p );

		for ( let i = 0; i < count; i++ ) {
			const shape = smallShape( pick( r, ids ) );
			const px = Math.round( big * ( 0.45 + ( r() * 0.55 ) ) );
			const lane = pick( r, lanes );
			const x = ( ( lane[ 0 ] + ( r() * ( lane[ 1 ] - lane[ 0 ] ) ) ) * w ) - ( px / 2 );
			const y = ( r() * h ) - ( px / 2 );
			const way = 'random' === dir ? pick( r, [ 'up', 'down', 'left', 'right' ] ) : dir;
			const mixed = 'mix' === style ? r() < 0.5 : 'solid' === style;
			const solid = ! shape[ 3 ] && mixed;
			const color = pick( r, colors );
			const item = document.createElement( 'div' );
			const inner = document.createElement( 'span' );
			const svg = svgEl( 'svg', { viewBox: shape[ 1 ], preserveAspectRatio: 'xMidYMid meet' } );
			const path = svgEl( 'path', { d: shape[ 0 ], 'fill-rule': shape[ 2 ] } );

			path.setAttribute( 'fill', solid ? color : 'none' );

			if ( ! solid ) {
				path.setAttribute( 'stroke', color );
				path.setAttribute( 'stroke-width', '2' );
				path.setAttribute( 'stroke-linecap', 'round' );
				path.setAttribute( 'stroke-linejoin', 'round' );
				path.setAttribute( 'vector-effect', 'non-scaling-stroke' );
			}

			svg.appendChild( path );
			inner.appendChild( svg );
			item.appendChild( inner );
			item.className = 'rf-ofx-fs' + ( spin ? ' is-spin' : '' ) + ( 'stay' === way ? ' is-stay' : '' );

			let x0 = x;
			let y0 = y;
			let x1 = x;
			let y1 = y;

			if ( 'up' === way ) {
				y0 = h + px;
				y1 = -px * 2;
			} else if ( 'down' === way ) {
				y0 = -px * 2;
				y1 = h + px;
			} else if ( 'left' === way ) {
				x0 = w + px;
				x1 = -px * 2;
			} else if ( 'right' === way ) {
				x0 = -px * 2;
				x1 = w + px;
			}

			const t = time * ( 0.75 + ( r() * 0.5 ) );
			const vars = {
				'--fs-size': px + 'px',
				'--fs-x0': x0.toFixed( 1 ) + 'px',
				'--fs-y0': y0.toFixed( 1 ) + 'px',
				'--fs-x1': x1.toFixed( 1 ) + 'px',
				'--fs-y1': y1.toFixed( 1 ) + 'px',
				'--fs-time': t.toFixed( 2 ) + 's',
				'--fs-delay': ( -r() * t ).toFixed( 2 ) + 's',
				'--fs-opacity': String( opacity ),
				'--fs-sway': Math.round( 6 + ( r() * 16 ) ) + 'px',
				'--fs-turn': r() < 0.5 ? 'normal' : 'reverse',
			};

			Object.keys( vars ).forEach( ( k ) => item.style.setProperty( k, vars[ k ] ) );

			// Seen at once where motion is reduced (or with no drift): in place, not off the edge.
			if ( reduced.matches || 'stay' === way ) {
				item.style.setProperty( '--fs-x0', x.toFixed( 1 ) + 'px' );
				item.style.setProperty( '--fs-y0', y.toFixed( 1 ) + 'px' );
				item.style.transform = `translate(${ x.toFixed( 1 ) }px, ${ y.toFixed( 1 ) }px)`;
			}

			box.appendChild( item );
		}
	}

	// ----------------------------------------------------------------- floating text

	function floatingText( el, s, state ) {
		const p = 'rf_ft_';
		const words = [ ...new Set( String( s[ p + 'words' ] || '' ).split( /[\r\n]+/ ).map( ( w ) => w.trim() ).filter( Boolean ) ) ].slice( 0, 40 );
		const atOnce = Math.min( words.length, Math.max( 0, Math.min( 10, int( phone() ? s[ p + 'count_mobile' ] : s[ p + 'count' ], phone() ? 2 : 4 ) ) ) );

		if ( ! atOnce ) {
			return;
		}

		const box = layer( 'rf-ofx-text', 'over' === s[ p + 'layer' ] );
		el.insertBefore( box, el.firstChild );

		const r = rng( hash( ( el.getAttribute( 'data-id' ) || '' ) + 'ft' ) );
		const colors = palette( s, p, '#1E1E1E' );
		const effect = s[ p + 'effect' ] || 'rise';
		const hold = Math.max( 0.5, size( s[ p + 'hold' ], 2.5 ) ) * 1000;
		const opacity = size( s[ p + 'opacity' ], 0.35 );
		const tilt = s[ p + 'tilt' ] || 'none';
		const outlined = on( s[ p + 'outline' ] );
		const lanes = ranges( s, p );
		const showing = new Map(); // Word -> rect { x, y, w, h }

		function makeWord( text ) {
			const n = document.createElement( 'p' );
			n.className = 'rf-ofx-word' + ( outlined ? ' is-outline' : '' );
			n.style.setProperty( '--ft-color', pick( r, colors ) );

			if ( 'letters' === effect || 'type' === effect ) {
				Array.from( text ).forEach( ( ch ) => {
					const l = document.createElement( 'span' );
					l.className = 'rf-ofx-letter';
					l.textContent = ch;
					n.appendChild( l );
				} );
			} else if ( 'rise' === effect ) {
				const mask = document.createElement( 'span' );
				const inner = document.createElement( 'span' );
				mask.className = 'rf-ofx-word__mask';
				inner.textContent = text;
				mask.appendChild( inner );
				n.appendChild( mask );
			} else {
				n.textContent = text;
			}

			return n;
		}

		const overlaps = ( a, b ) => a.x < b.x + b.w + 16 && b.x < a.x + a.w + 16 && a.y < b.y + b.h + 12 && b.y < a.y + a.h + 12;

		/** The boxes of the element's own content (its widgets), which words keep clear of. */
		function content() {
			const b = box.getBoundingClientRect();

			return [ ...el.querySelectorAll( '.refraction-widget' ) ].map( ( n ) => n.getBoundingClientRect() ).filter( ( c ) => c.width && c.height ).map( ( c ) => ( { x: c.left - b.left, y: c.top - b.top, w: c.width, h: c.height } ) );
		}

		/**
		 * A free spot for a node of this size, or null after a few tries.
		 * @param {number} nw Width.
		 * @param {number} nh Height.
		 */
		function place( nw, nh ) {
			const w = box.clientWidth;
			const h = box.clientHeight;
			const taken = [ ...showing.values(), ...( 'over' === s[ p + 'layer' ] ? [] : content() ) ];

			for ( let tries = 0; tries < 40; tries++ ) {
				const lane = pick( r, lanes );
				const from = lane[ 0 ] * w;
				const room = ( ( lane[ 1 ] - lane[ 0 ] ) * w ) - nw;
				const rect = { x: from + ( Math.max( 0, room ) * r() ), y: Math.max( 0, h - nh ) * r(), w: nw, h: nh };

				if ( ! taken.some( ( o ) => overlaps( rect, o ) ) ) {
					return rect;
				}
			}

			return null;
		}

		function animateIn( n ) {
			const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

			if ( reduced.matches ) {
				return n.animate( [ { opacity: 0 }, { opacity } ], { duration: 600, fill: 'forwards' } );
			}

			switch ( effect ) {
				case 'rise':
					n.style.opacity = opacity;
					return n.querySelector( '.rf-ofx-word__mask > span' ).animate( [ { transform: 'translateY(105%)' }, { transform: 'translateY(0)' } ], { duration: 900, easing: ease, fill: 'forwards' } );
				case 'blur':
					return n.animate( [ { opacity: 0, filter: 'blur(14px)' }, { opacity, filter: 'blur(0)' } ], { duration: 1100, easing: ease, fill: 'forwards' } );
				case 'letters':
				case 'type': {
					n.style.opacity = opacity;
					const letters = n.querySelectorAll( '.rf-ofx-letter' );
					let last = null;

					letters.forEach( ( l, i ) => {
						last = 'type' === effect
							? l.animate( [ { opacity: 0 }, { opacity: 0, offset: 0.99 }, { opacity: 1 } ], { duration: 70 * ( i + 1 ), fill: 'both' } )
							: l.animate( [ { opacity: 0, transform: 'translateY(40%)' }, { opacity: 1, transform: 'translateY(0)' } ], { duration: 500, delay: 45 * i, easing: ease, fill: 'both' } );
					} );

					return last;
				}
				case 'drift':
					return n.animate( [ { opacity: 0, translate: '0 18px' }, { opacity, translate: '0 0' } ], { duration: 1200, easing: ease, fill: 'forwards' } );
				default:
					return n.animate( [ { opacity: 0 }, { opacity } ], { duration: 900, easing: 'ease-out', fill: 'forwards' } );
			}
		}

		function animateOut( n ) {
			if ( ! reduced.matches && 'drift' === effect ) {
				return n.animate( [ { opacity, translate: '0 0' }, { opacity: 0, translate: '0 -18px' } ], { duration: 1200, easing: 'ease-in', fill: 'forwards' } );
			}

			if ( ! reduced.matches && 'rise' === effect ) {
				return n.querySelector( '.rf-ofx-word__mask > span' ).animate( [ { transform: 'translateY(0)' }, { transform: 'translateY(-105%)' } ], { duration: 700, easing: 'ease-in', fill: 'forwards' } );
			}

			return n.animate( [ { opacity: n.style.opacity || opacity }, { opacity: 0 } ], { duration: 700, easing: 'ease-in', fill: 'forwards' } );
		}

		const done = ( a ) => ( a && a.finished ? a.finished.catch( () => {} ) : Promise.resolve() );
		const wait = ( ms ) => new Promise( ( res ) => state.timers.push( window.setTimeout( res, ms ) ) );

		/**
		 * One slot: a word appears in a free spot, holds, leaves, and the slot starts again.
		 * @param {number} first Delay before the first word (ms).
		 */
		async function slot( first ) {
			await wait( first );

			while ( ! state.stopped ) {
				if ( ! state.visible ) {
					await wait( 500 );
					continue;
				}

				const free = words.filter( ( w ) => ! showing.has( w ) );
				const text = free.length ? pick( r, free ) : null;

				if ( ! text ) {
					await wait( 800 );
					continue;
				}

				const n = makeWord( text );
				let turn = 0;

				if ( 'slight' === tilt ) {
					turn = ( r() * 12 ) - 6;
				} else if ( 'vertical' === tilt && r() < 0.3 ) {
					turn = 90;
				}
				n.style.visibility = 'hidden';
				box.appendChild( n );

				const vertical = 90 === turn;
				const nw = vertical ? n.offsetHeight : n.offsetWidth;
				const nh = vertical ? n.offsetWidth : n.offsetHeight;
				const rect = place( nw, nh );

				if ( ! rect || state.stopped ) {
					n.remove();
					await wait( 900 );
					continue;
				}

				showing.set( text, rect );
				const tx = vertical ? rect.x + ( ( nw - n.offsetWidth ) / 2 ) : rect.x;
				const ty = vertical ? rect.y + ( ( nh - n.offsetHeight ) / 2 ) : rect.y;
				n.style.transform = `translate(${ tx.toFixed( 1 ) }px, ${ ty.toFixed( 1 ) }px)` + ( turn ? ` rotate(${ turn.toFixed( 1 ) }deg)` : '' );
				n.style.visibility = '';

				await done( animateIn( n ) );

				if ( reduced.matches ) {
					return; // Where motion is reduced the words stay.
				}

				await wait( hold );
				await done( animateOut( n ) );
				n.remove();
				showing.delete( text );
				await wait( 300 + ( r() * 1400 ) );
			}
		}

		for ( let i = 0; i < atOnce; i++ ) {
			slot( i * ( 700 + ( r() * 600 ) ) );
		}
	}

	/**
	 * Fits an image's blob to the picture: its box inside the widget, kept up to date as the picture loads or resizes.
	 *
	 * @param {Element} host  The element holding the blob.
	 * @param {Object}  state The element's layer state.
	 */
	function frameToPicture( host, state ) {
		const img = host.querySelector( 'img' );
		const b = host.querySelector( ':scope > .rf-ofx-blob' );

		if ( ! img || ! b ) {
			return;
		}

		const fit = () => {
			const h = host.getBoundingClientRect();
			const i = img.getBoundingClientRect();

			if ( i.width && i.height ) {
				b.style.setProperty( '--rf-frame-l', ( i.left - h.left ).toFixed( 1 ) + 'px' );
				b.style.setProperty( '--rf-frame-t', ( i.top - h.top ).toFixed( 1 ) + 'px' );
				b.style.setProperty( '--rf-frame-w', i.width.toFixed( 1 ) + 'px' );
				b.style.setProperty( '--rf-frame-h', i.height.toFixed( 1 ) + 'px' );
			}
		};

		fit();
		img.addEventListener( 'load', fit );

		if ( 'ResizeObserver' in window ) {
			state.resize = new ResizeObserver( fit );
			state.resize.observe( img );
		}
	}

	// ----------------------------------------------------------------- build

	function clear( el ) {
		if ( el.__rfOfx ) {
			el.__rfOfx.stopped = true;
			el.__rfOfx.timers.forEach( ( t ) => window.clearTimeout( t ) );

			if ( el.__rfOfx.observer ) {
				el.__rfOfx.observer.disconnect();
			}

			if ( el.__rfOfx.resize ) {
				el.__rfOfx.resize.disconnect();
			}

			[ 'seen', 'blobSeen' ].forEach( ( k ) => el.__rfOfx[ k ] && el.__rfOfx[ k ].disconnect() );

			if ( el.__rfOfx.mask ) {
				el.__rfOfx.mask.destroy();
			}

			el.__rfOfx = null;
		}

		el.querySelectorAll( ':scope > [data-rf-ofx], :scope > .refraction-widget-container > [data-rf-ofx]' ).forEach( ( n ) => n.remove() );
		el.classList.remove( 'rf-ofx-host' );
	}

	function build( el ) {
		clear( el );

		const s = settings( el );
		const blobOn = on( s.rf_blob );
		const grainOn = on( s.rf_grain );
		const fsOn = on( s.rf_fs );
		const ftOn = on( s.rf_ft );
		const maskOn = !! chosen( s, 'rf_mask_source', 'rf_mask', 'rf_mask_mine' );

		if ( ! blobOn && ! grainOn && ! fsOn && ! ftOn && ! maskOn ) {
			return;
		}

		const isImage = 'image.default' === el.getAttribute( 'data-widget_type' );
		const host = isImage ? ( el.querySelector( ':scope > .refraction-widget-container' ) || el ) : el;
		const state = { stopped: false, timers: [], visible: true, observer: null, resize: null, width: el.clientWidth };

		el.__rfOfx = state;
		el.classList.add( 'rf-ofx-host' );

		if ( isImage ) {
			if ( blobOn ) {
				blob( el, host, s );
				frameToPicture( host, state );
				blobInView( el, s, state );
			}

			if ( maskOn ) {
				shapeMask( el, s, state );
			}

			return;
		}

		if ( ftOn ) {
			floatingText( el, s, state );
		}

		if ( fsOn ) {
			floatingShapes( el, s );
		}

		if ( grainOn ) {
			el.insertBefore( grainLayer( el, s, false ), el.firstChild );
		}

		if ( blobOn ) {
			blob( el, el, s );
			blobInView( el, s, state );
		}

		if ( maskOn ) {
			shapeMask( el, s, state );

			// Clip background only: grain belongs to the background, so it is cut to the shape with it.
			const grain = el.querySelector( ':scope > .rf-ofx-grain' );

			if ( state.mask && state.mask.fill && grain ) {
				state.mask.fill.appendChild( grain );
			}
		}

		if ( ( fsOn || ftOn || 'loop' === s.rf_mask_trigger ) && 'IntersectionObserver' in window ) {
			state.observer = new IntersectionObserver( ( entries ) => {
				state.visible = entries[ entries.length - 1 ].isIntersecting;
				el.classList.toggle( 'rf-ofx-paused', ! state.visible );
			} );
			state.observer.observe( el );
		}
	}

	/**
	 * Deco Blob "Once, when scrolled into view": the CSS keeps its motion paused until the element has this class.
	 *
	 * @param {Element} el    The element.
	 * @param {Object}  s     Settings.
	 * @param {Object}  state The element's layer state.
	 */
	function blobInView( el, s, state ) {
		if ( 'inview' !== s.rf_blob_trigger || ! ( 'IntersectionObserver' in window ) ) {
			return;
		}

		const seen = new IntersectionObserver( ( entries ) => {
			if ( entries.some( ( en ) => en.isIntersecting ) ) {
				el.classList.add( 'rf-ofx-inview' );
				seen.disconnect();
			}
		}, { threshold: 0.25 } );

		seen.observe( el );
		state.blobSeen = seen;
	}

	const SELECTOR = '.e-con, .refraction-widget-image';

	function wanted( el ) {
		const s = settings( el );

		return on( s.rf_blob ) || on( s.rf_grain ) || on( s.rf_fs ) || on( s.rf_ft ) || !! chosen( s, 'rf_mask_source', 'rf_mask', 'rf_mask_mine' ) || !! el.__rfOfx;
	}

	function buildAll() {
		document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
			if ( wanted( el ) ) {
				build( el );
			}
		} );
	}

	// Floating shapes and words are placed for the element's size: placed again when the width changes.
	let resizeTimer = 0;

	function onResize() {
		window.clearTimeout( resizeTimer );
		resizeTimer = window.setTimeout( () => {
			document.querySelectorAll( '.rf-ofx-host' ).forEach( ( el ) => {
				if ( el.__rfOfx && Math.abs( el.__rfOfx.width - el.clientWidth ) > 40 ) {
					build( el );
				} else if ( el.__rfOfx && el.__rfOfx.mask ) {
					el.__rfOfx.mask.apply(); // A breakpoint may hold other Placement values.
				}
			} );
		}, 250 );
	}

	/**
	 * Editor: Placement, background and overlay settings change only CSS (no redraw), so the mask is placed again,
	 * and the background copied again, a moment after the new CSS is in.
	 *
	 * @param {Element} el The element.
	 */
	function watchModel( el ) {
		const m = model( el );

		if ( ! m || ! m.on || m.__rfOfxWatch ) {
			return;
		}

		m.__rfOfxWatch = true;
		let timer = 0;
		m.on( 'change', () => {
			const keys = Object.keys( m.changed || {} );

			if ( ! keys.some( ( k ) => 0 === k.indexOf( 'rf_mask' ) || 0 === k.indexOf( 'background' ) ) ) {
				return;
			}

			window.clearTimeout( timer );
			timer = window.setTimeout( () => {
				const now = document.querySelector( `[data-model-cid="${ el.getAttribute( 'data-model-cid' ) }"]` );

				if ( now && now.__rfOfx && now.__rfOfx.mask ) {
					now.__rfOfx.mask.refill();
				}
			}, 150 );
		} );
	}

	function hookIntoEditor( tries ) {
		const fe = frontend();

		if ( fe && fe.hooks && fe.config && fe.config.elements && fe.isEditMode && fe.isEditMode() ) {
			const ready = ( $scope ) => {
				if ( $scope && $scope[ 0 ] && wanted( $scope[ 0 ] ) ) {
					build( $scope[ 0 ] );
					watchModel( $scope[ 0 ] );
				}
			};

			fe.hooks.addAction( 'frontend/element_ready/container', ready );
			fe.hooks.addAction( 'frontend/element_ready/image.default', ready );
			buildAll();
			return;
		}

		if ( tries < 300 ) {
			window.setTimeout( () => hookIntoEditor( tries + 1 ), 100 );
		}
	}

	function boot() {
		buildAll();
		window.addEventListener( 'resize', onResize );

		if ( /[?&]refraction-preview=/.test( window.location.search ) ) {
			hookIntoEditor( 0 );
		}
	}

	window.refractionOrganicFx = { build };

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => window.setTimeout( boot, 0 ) );
	} else {
		window.setTimeout( boot, 0 );
	}
}() );
