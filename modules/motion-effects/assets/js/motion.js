/**
 * Refraction Motion Effects, front end and editor preview.
 *
 * Scrolling effects (vertical/horizontal move, transparency, blur, rotate, scale) and mouse effects
 * (mouse track, 3D tilt). Vanilla JS: an IntersectionObserver keeps work to the elements on screen and one
 * requestAnimationFrame loop writes only compositor-friendly properties (`translate`, `rotate`, `scale`,
 * `filter`, and `transform` for the tilt). Individual transform properties are used so that an entrance
 * animation on the same element (which animates `transform` and `opacity`) keeps working untouched.
 *
 * Config comes from `data-rf-fx` (clamped by PHP). In the editor preview, where there is no such attribute,
 * it is built from the element settings with the same limits and updated live when a setting changes.
 */
( function () {
	'use strict';

	const SCROLL = {
		ty: { dirs: [ 'up', 'down' ], amount: 'speed', def: 4, max: 10 },
		tx: { dirs: [ 'left', 'right' ], amount: 'speed', def: 4, max: 10 },
		fade: { dirs: [ 'in', 'out', 'in-out', 'out-in' ], amount: 'level', def: 5, max: 10 },
		blur: { dirs: [ 'in', 'out', 'in-out', 'out-in' ], amount: 'level', def: 5, max: 20 },
		rotate: { dirs: [ 'left', 'right' ], amount: 'speed', def: 4, max: 10 },
		scale: { dirs: [ 'up', 'down' ], amount: 'speed', def: 4, max: 10 },
	};

	const reducedQuery = window.matchMedia ? window.matchMedia( '(prefers-reduced-motion: reduce)' ) : null;
	const entries = new Set();
	const pointer = { x: 0, y: 0, seen: false };
	let frame = 0;
	let io = null;
	let globalsBound = false;

	const reduced = () => !! ( reducedQuery && reducedQuery.matches );
	const clamp = ( v, lo, hi ) => Math.max( lo, Math.min( hi, v ) );
	const num = ( v, def, lo, hi ) => {
		const n = parseFloat( v && 'object' === typeof v ? v.size : v );
		return clamp( isFinite( n ) ? n : def, lo, hi );
	};
	const pick = ( v, allowed ) => ( allowed.indexOf( v ) > -1 ? v : allowed[ 0 ] );

	// ---------------------------------------------------------------- config

	function currentDevice() {
		const fe = window.refractionFrontend;

		if ( fe && fe.getCurrentDeviceMode ) {
			try {
				const mode = fe.getCurrentDeviceMode();

				if ( mode ) {
					return mode;
				}
			} catch ( e ) { /* fall through */ }
		}

		const attr = document.body.getAttribute( 'data-refraction-device-mode' );

		if ( attr ) {
			return attr;
		}

		return window.innerWidth <= 767 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop';
	}

	function validDevices() {
		const fe = window.refractionFrontend;

		try {
			if ( fe && fe.breakpoints && fe.breakpoints.getActiveBreakpointsList ) {
				return fe.breakpoints.getActiveBreakpointsList( { withDesktop: true } );
			}
		} catch ( e ) { /* fall through */ }

		return [ 'desktop', 'tablet', 'mobile' ];
	}

	function devices( s, key, valid, fallback ) {
		return Array.isArray( s[ key ] ) ? valid.filter( ( d ) => s[ key ].indexOf( d ) > -1 ) : fallback;
	}

	/** Same rules as Pure_Motion_Settings::normalize() in PHP. */
	function fromSettings( s ) {
		const valid = validDevices();
		const out = {};
		const effects = {};

		Object.keys( SCROLL ).forEach( ( key ) => {
			if ( 'yes' !== s[ 'rf_scroll_' + key ] ) {
				return;
			}

			const def = SCROLL[ key ];
			let start = Math.round( num( s[ 'rf_scroll_' + key + '_start' ], 0, 0, 100 ) );
			let end = Math.round( num( s[ 'rf_scroll_' + key + '_end' ], 100, 0, 100 ) );

			if ( start > end ) {
				[ start, end ] = [ end, start ];
			}

			effects[ key ] = { dir: pick( s[ 'rf_scroll_' + key + '_dir' ], def.dirs ), start, end };
			effects[ key ][ def.amount ] = num( s[ 'rf_scroll_' + key + '_' + def.amount ], def.def, 0, def.max );
		} );

		if ( Object.keys( effects ).length ) {
			out.scroll = { devices: devices( s, 'rf_scroll_devices', valid, valid ), relative: pick( s.rf_scroll_relative, [ 'viewport', 'page' ] ), effects };
		}

		const mouse = {};

		if ( 'yes' === s.rf_mouse_track ) {
			mouse.track = { dir: pick( s.rf_mouse_track_dir, [ 'opposite', 'direct' ] ), speed: num( s.rf_mouse_track_speed, 1, 0, 10 ) };
		}

		if ( 'yes' === s.rf_mouse_tilt ) {
			mouse.tilt = { intensity: num( s.rf_mouse_tilt_intensity, 4, 0, 10 ), keep: 'yes' === s.rf_mouse_tilt_keep };
		}

		if ( Object.keys( mouse ).length ) {
			mouse.devices = devices( s, 'rf_mouse_devices', valid, valid.indexOf( 'desktop' ) > -1 ? [ 'desktop' ] : [] );
			out.mouse = mouse;
		}

		return out;
	}

	function readSettings( el ) {
		const fe = window.refractionFrontend;
		const cid = el.getAttribute( 'data-model-cid' );

		if ( fe && cid && fe.config && fe.config.elements && fe.config.elements.data && fe.config.elements.data[ cid ] ) {
			const model = fe.config.elements.data[ cid ];
			const out = {};

			Object.keys( model.attributes ).forEach( ( k ) => {
				if ( 0 === k.indexOf( 'rf_' ) ) {
					const v = model.attributes[ k ];
					out[ k ] = v && v.toJSON ? v.toJSON() : v;
				}
			} );

			return { settings: out, model };
		}

		try {
			return { settings: JSON.parse( el.getAttribute( 'data-settings' ) || '{}' ), model: null };
		} catch ( e ) {
			return { settings: {}, model: null };
		}
	}

	function hasEntranceAnimation( el ) {
		const fe = window.refractionFrontend;
		const cid = el.getAttribute( 'data-model-cid' );
		let s = {};

		if ( fe && cid && fe.config && fe.config.elements.data[ cid ] ) {
			s = fe.config.elements.data[ cid ].attributes;
		} else {
			try {
				s = JSON.parse( el.getAttribute( 'data-settings' ) || '{}' );
			} catch ( e ) { /* ignore */ }
		}

		return !! ( ( s._animation && 'none' !== s._animation ) || ( s.animation && 'none' !== s.animation ) || el.classList.contains( 'animated' ) );
	}

	// ----------------------------------------------------------------- maths

	/** Value 1 = "clear" state, 0 = most faded, for the fade/blur direction. */
	function shape( dir, t ) {
		switch ( dir ) {
			case 'out':
				return 1 - t;
			case 'in-out':
				return 1 - Math.abs( 2 * t - 1 );
			case 'out-in':
				return Math.abs( 2 * t - 1 );
			default:
				return t;
		}
	}

	function quat( axis, deg ) {
		const h = ( deg * Math.PI ) / 360;
		const s = Math.sin( h );
		return [ Math.cos( h ), axis[ 0 ] * s, axis[ 1 ] * s, axis[ 2 ] * s ];
	}

	function qmul( a, b ) {
		return [
			a[ 0 ] * b[ 0 ] - a[ 1 ] * b[ 1 ] - a[ 2 ] * b[ 2 ] - a[ 3 ] * b[ 3 ],
			a[ 0 ] * b[ 1 ] + a[ 1 ] * b[ 0 ] + a[ 2 ] * b[ 3 ] - a[ 3 ] * b[ 2 ],
			a[ 0 ] * b[ 2 ] - a[ 1 ] * b[ 3 ] + a[ 2 ] * b[ 0 ] + a[ 3 ] * b[ 1 ],
			a[ 0 ] * b[ 3 ] + a[ 1 ] * b[ 2 ] - a[ 2 ] * b[ 1 ] + a[ 3 ] * b[ 0 ],
		];
	}

	/** Rotation of `z` degrees about Z and `ax`/`ay` degrees about X/Y as a CSS `rotate` value. */
	function rotateValue( z, ax, ay ) {
		let q = quat( [ 0, 0, 1 ], z );
		q = qmul( q, qmul( quat( [ 0, 1, 0 ], ay ), quat( [ 1, 0, 0 ], ax ) ) );
		const w = clamp( q[ 0 ], -1, 1 );
		const s = Math.sqrt( 1 - w * w );

		if ( s < 1e-6 ) {
			return 'none';
		}

		return ( q[ 1 ] / s ).toFixed( 4 ) + ' ' + ( q[ 2 ] / s ).toFixed( 4 ) + ' ' + ( q[ 3 ] / s ).toFixed( 4 ) + ' ' + ( ( 2 * Math.acos( w ) * 180 ) / Math.PI ).toFixed(
			3
		) + 'deg';
	}

	// --------------------------------------------------------------- entries

	function scrollProgress( entry, effect ) {
		let pos;

		if ( 'page' === entry.fx.scroll.relative ) {
			const max = Math.max( 1, document.documentElement.scrollHeight - window.innerHeight );
			pos = ( 100 * window.pageYOffset ) / max;
		} else {
			const vh = window.innerHeight || 1;
			pos = ( 100 * ( vh - entry.centerY ) ) / vh;
		}

		if ( effect.end <= effect.start ) {
			return pos >= effect.start ? 1 : 0;
		}

		return clamp( ( pos - effect.start ) / ( effect.end - effect.start ), 0, 1 );
	}

	function measure( entry ) {
		const r = entry.el.getBoundingClientRect();
		// The element's own translation moves its box; remove it so the effect does not feed back into itself.
		entry.centerY = r.top + r.height / 2 - entry.applied.ty;
		entry.centerX = r.left + r.width / 2 - entry.applied.tx;
	}

	function compute( entry, device ) {
		const fx = entry.fx;
		const t = { tx: 0, ty: 0, rz: 0, scale: 1, opacity: 1, blur: 0 };
		const scrollOn = fx.scroll && fx.scroll.devices.indexOf( device ) > -1;
		const mouseOn = fx.mouse && fx.mouse.devices.indexOf( device ) > -1;

		if ( scrollOn ) {
			const e = fx.scroll.effects;

			if ( e.ty ) {
				t.ty += ( 0.5 - scrollProgress( entry, e.ty ) ) * e.ty.speed * 40 * ( 'down' === e.ty.dir ? -1 : 1 );
			}

			if ( e.tx ) {
				t.tx += ( 0.5 - scrollProgress( entry, e.tx ) ) * e.tx.speed * 40 * ( 'right' === e.tx.dir ? -1 : 1 );
			}

			if ( e.rotate ) {
				t.rz += ( scrollProgress( entry, e.rotate ) - 0.5 ) * e.rotate.speed * 18 * ( 'right' === e.rotate.dir ? 1 : -1 );
			}

			if ( e.scale ) {
				t.scale = Math.max( 0.05, 1 + ( scrollProgress( entry, e.scale ) - 0.5 ) * e.scale.speed * 0.1 * ( 'down' === e.scale.dir ? -1 : 1 ) );
			}

			if ( e.fade ) {
				t.opacity = 1 - ( 1 - shape( e.fade.dir, scrollProgress( entry, e.fade ) ) ) * ( e.fade.level / 10 );
			}

			if ( e.blur ) {
				t.blur = ( 1 - shape( e.blur.dir, scrollProgress( entry, e.blur ) ) ) * e.blur.level;
			}
		}

		entry.mouseOn = !! mouseOn;
		entry.target.tx = 0;
		entry.target.ty = 0;

		if ( mouseOn && fx.mouse.track && pointer.seen ) {
			const k = ( 'direct' === fx.mouse.track.dir ? 1 : -1 ) * fx.mouse.track.speed * 15;
			entry.target.tx = pointer.x * k;
			entry.target.ty = pointer.y * k;
		}

		if ( ! mouseOn || ! fx.mouse.tilt ) {
			entry.target.ax = 0;
			entry.target.ay = 0;
		}

		return t;
	}

	function ease( entry ) {
		let moving = false;

		[ 'tx', 'ty', 'ax', 'ay' ].forEach( ( k ) => {
			const d = entry.target[ k ] - entry.eased[ k ];

			if ( Math.abs( d ) < 0.01 ) {
				entry.eased[ k ] = entry.target[ k ];
			} else {
				entry.eased[ k ] += d * 0.14;
				moving = true;
			}
		} );

		return moving;
	}

	function apply( entry, t ) {
		const s = entry.el.style;
		const tx = t.tx + entry.eased.tx;
		const ty = t.ty + entry.eased.ty;
		const out = {};

		out.translate = tx || ty ? tx.toFixed( 2 ) + 'px ' + ty.toFixed( 2 ) + 'px' : '';
		out.scale = 1 !== t.scale ? t.scale.toFixed( 4 ) : '';

		const filters = [];

		if ( t.blur > 0.05 ) {
			filters.push( 'blur(' + t.blur.toFixed( 2 ) + 'px)' );
		}

		if ( t.opacity < 0.999 ) {
			filters.push( 'opacity(' + t.opacity.toFixed( 3 ) + ')' );
		}

		out.filter = filters.join( ' ' );

		const tilting = entry.fx.mouse && entry.fx.mouse.tilt && ( entry.eased.ax || entry.eased.ay );

		if ( entry.animated ) {
			// An entrance animation owns `transform`: express the tilt as part of `rotate` instead.
			out.rotate = t.rz || tilting ? rotateValue( t.rz, tilting ? entry.eased.ax : 0, tilting ? entry.eased.ay : 0 ) : '';
		} else {
			out.rotate = t.rz ? t.rz.toFixed( 3 ) + 'deg' : '';
			out.transform = tilting ? 'perspective(900px) rotateX(' + entry.eased.ax.toFixed( 3 ) + 'deg) rotateY(' + entry.eased.ay.toFixed( 3 ) + 'deg)' : '';
		}

		Object.keys( out ).forEach( ( prop ) => {
			if ( entry.written[ prop ] !== out[ prop ] ) {
				entry.written[ prop ] = out[ prop ];
				s[ prop ] = out[ prop ];
			}
		} );

		entry.applied.tx = tx;
		entry.applied.ty = ty;
	}

	function clear( entry ) {
		[ 'translate', 'rotate', 'scale', 'filter', 'transform', 'willChange' ].forEach( ( p ) => {
			entry.el.style[ p ] = '';
		} );
		entry.written = {};
		entry.applied = { tx: 0, ty: 0 };
		entry.eased = { tx: 0, ty: 0, ax: 0, ay: 0 };
	}

	function tick() {
		frame = 0;
		const device = currentDevice();
		let again = false;

		if ( reduced() ) {
			entries.forEach( clear );
			return;
		}

		entries.forEach( ( entry ) => {
			if ( ! entry.el.isConnected ) {
				teardown( entry );
				return;
			}

			if ( ! entry.visible ) {
				return;
			}

			measure( entry );
			const t = compute( entry, device );

			if ( ease( entry ) ) {
				again = true;
			}

			apply( entry, t );
		} );

		if ( again ) {
			request();
		}
	}

	function request() {
		if ( ! frame ) {
			frame = window.requestAnimationFrame( tick );
		}
	}

	function bindGlobals() {
		if ( globalsBound ) {
			return;
		}

		globalsBound = true;
		window.addEventListener( 'scroll', request, { passive: true } );
		window.addEventListener( 'resize', request, { passive: true } );
		window.addEventListener(
			'pointermove',
			( e ) => {
				if ( 'touch' === e.pointerType ) {
					return;
				}

				pointer.x = ( e.clientX / ( window.innerWidth || 1 ) ) * 2 - 1;
				pointer.y = ( e.clientY / ( window.innerHeight || 1 ) ) * 2 - 1;
				pointer.seen = true;
				request();
			},
			{ passive: true }
		);

		if ( reducedQuery && reducedQuery.addEventListener ) {
			reducedQuery.addEventListener( 'change', request );
		}

		io = 'IntersectionObserver' in window
			? new window.IntersectionObserver(
				( list ) => {
					list.forEach( ( item ) => {
						entries.forEach( ( entry ) => {
							if ( entry.el === item.target ) {
								entry.visible = item.isIntersecting;
							}
						} );
					} );
					request();
				},
				{ rootMargin: '150px 0px' }
			)
			: null;
	}

	function bindTilt( entry ) {
		const el = entry.el;

		el.addEventListener( 'pointermove', ( e ) => {
			const tilt = entry.fx.mouse && entry.fx.mouse.tilt;

			if ( ! tilt || ! entry.mouseOn || 'touch' === e.pointerType ) {
				return;
			}

			const r = el.getBoundingClientRect();
			const nx = clamp( ( ( e.clientX - r.left ) / ( r.width || 1 ) ) * 2 - 1, -1, 1 );
			const ny = clamp( ( ( e.clientY - r.top ) / ( r.height || 1 ) ) * 2 - 1, -1, 1 );
			const max = tilt.intensity * 2.5;

			entry.target.ax = -ny * max;
			entry.target.ay = nx * max;
			request();
		} );

		el.addEventListener( 'pointerleave', () => {
			const tilt = entry.fx.mouse && entry.fx.mouse.tilt;

			if ( tilt && ! tilt.keep ) {
				entry.target.ax = 0;
				entry.target.ay = 0;
				request();
			}
		} );
	}

	function teardown( entry ) {
		if ( io ) {
			io.unobserve( entry.el );
		}

		entries.delete( entry );
	}

	function setup( el, fx, model ) {
		entries.forEach( ( e ) => {
			if ( e.el === el || ! e.el.isConnected ) {
				teardown( e );
			}
		} );

		if ( ! fx || ! ( fx.scroll || fx.mouse ) ) {
			el.style.willChange = '';
			return;
		}

		const entry = {
			el,
			fx,
			visible: ! window.IntersectionObserver,
			animated: hasEntranceAnimation( el ),
			applied: { tx: 0, ty: 0 },
			eased: { tx: 0, ty: 0, ax: 0, ay: 0 },
			target: { tx: 0, ty: 0, ax: 0, ay: 0 },
			written: {},
			centerX: 0,
			centerY: 0,
			mouseOn: false,
		};

		entries.add( entry );
		bindGlobals();
		el.style.willChange = 'translate, rotate, scale, filter' + ( fx.mouse && fx.mouse.tilt ? ', transform' : '' );

		if ( fx.mouse && fx.mouse.tilt ) {
			bindTilt( entry );
		}

		if ( io ) {
			io.observe( el );
		}

		request();

		if ( model && model.on && ! model.__rfMotion ) {
			model.__rfMotion = true;
			model.on( 'change', () => {
				const next = el.isConnected ? el : document.querySelector( '[data-model-cid="' + el.getAttribute( 'data-model-cid' ) + '"]' );

				if ( next ) {
					window.setTimeout( () => init( next ), 0 );
				}
			} );
		}
	}

	function init( el ) {
		let fx = null;
		let model = null;
		const attr = el.getAttribute( 'data-rf-fx' );

		if ( attr ) {
			try {
				fx = JSON.parse( attr );
			} catch ( e ) {
				fx = null;
			}
		} else if ( el.getAttribute( 'data-model-cid' ) || el.getAttribute( 'data-settings' ) ) {
			const read = readSettings( el );
			fx = fromSettings( read.settings );
			model = read.model;
		}

		setup( el, fx, model );
	}

	function scan( root ) {
		Array.prototype.forEach.call( ( root || document ).querySelectorAll( '[data-rf-fx]' ), init );
	}

	function boot() {
		const fe = window.refractionFrontend;

		scan();

		if ( fe && fe.hooks && fe.isEditMode && fe.isEditMode() ) {
			fe.hooks.addAction( 'frontend/element_ready/global', ( $scope ) => {
				const el = $scope && $scope[ 0 ];

				if ( el ) {
					init( el );
				}
			} );

			// Elements already rendered before this script ran.
			Array.prototype.forEach.call( document.querySelectorAll( '.refraction-element[data-model-cid]' ), init );
		}
	}

	window.refractionMotionEffects = { fromSettings, rotateValue };

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => window.setTimeout( boot, 0 ) );
	} else {
		window.setTimeout( boot, 0 );
	}
}() );
