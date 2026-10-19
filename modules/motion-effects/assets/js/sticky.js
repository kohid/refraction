/**
 * Refraction Sticky, front end and editor preview. No jQuery.
 *
 * The element switches to `position: fixed` when its natural position reaches the offset, and a hidden
 * placeholder with the same size keeps its place in the flow, so the page does not jump. Clearing happens
 * when the placeholder comes back into range. The WordPress admin bar height is added to a top offset only
 * when the bar is really fixed (it is not on small screens). "Stay in column" keeps the element inside its
 * parent. Past the effects offset the element gets `.rf-sticky--effects` (shrink / solid background styles
 * are CSS on that class).
 *
 * Config comes from `data-rf-sticky` (clamped by PHP); in the editor preview it is built from the element
 * settings with the same limits.
 */
( function () {
	'use strict';

	const entries = new Set();
	let frame = 0;
	let bound = false;

	const clamp = ( v, lo, hi ) => Math.max( lo, Math.min( hi, v ) );
	const num = ( v, def, lo, hi ) => {
		const n = parseFloat( v );
		return clamp( isFinite( n ) ? n : def, lo, hi );
	};

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

		return document.body.getAttribute( 'data-refraction-device-mode' ) || ( window.innerWidth <= 767 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop' );
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

	/** Same rules as Pure_Sticky_Settings::normalize() in PHP. */
	function fromSettings( s ) {
		if ( 'top' !== s.rf_sticky && 'bottom' !== s.rf_sticky ) {
			return null;
		}

		const valid = validDevices();

		return {
			side: s.rf_sticky,
			devices: Array.isArray( s.rf_sticky_on ) ? valid.filter( ( d ) => s.rf_sticky_on.indexOf( d ) > -1 ) : valid,
			offset: Math.round( num( s.rf_sticky_offset, 0, 0, 1000 ) ),
			effectsOffset: Math.round( num( s.rf_sticky_effects_offset, 0, 0, 5000 ) ),
			inParent: 'yes' === s.rf_sticky_parent,
		};
	}

	function adminBarHeight() {
		const bar = document.getElementById( 'wpadminbar' );

		if ( ! bar || 'fixed' !== window.getComputedStyle( bar ).position ) {
			return 0;
		}

		return bar.offsetHeight;
	}

	function unstick( entry ) {
		if ( entry.placeholder && entry.placeholder.parentNode ) {
			entry.placeholder.parentNode.removeChild( entry.placeholder );
		}

		entry.placeholder = null;
		entry.stuck = false;
		entry.el.classList.remove( 'rf-sticky--fixed', 'rf-sticky--effects' );
		[ 'position', 'top', 'bottom', 'left', 'width' ].forEach( ( p ) => {
			entry.el.style[ p ] = '';
		} );
	}

	function stick( entry ) {
		const el = entry.el;
		const rect = el.getBoundingClientRect();
		const cs = window.getComputedStyle( el );
		const ph = document.createElement( 'div' );

		ph.className = 'rf-sticky-placeholder';
		ph.setAttribute( 'aria-hidden', 'true' );
		ph.style.cssText = 'width:' + rect.width + 'px;height:' + rect.height + 'px;margin:' + cs.margin + ';flex:' + cs.flex + ';align-self:' + cs.alignSelf + ';visibility:hidden;pointer-events:none;';
		el.parentNode.insertBefore( ph, el );

		entry.placeholder = ph;
		entry.stuck = true;
		el.classList.add( 'rf-sticky--fixed' );
	}

	function update( entry, device, vh, bar ) {
		const { el, cfg } = entry;

		if ( ! el.isConnected ) {
			entries.delete( entry );
			return;
		}

		if ( cfg.devices.indexOf( device ) < 0 ) {
			if ( entry.stuck ) {
				unstick( entry );
			}

			return;
		}

		const ref = ( entry.stuck ? entry.placeholder : el ).getBoundingClientRect();
		const top = cfg.offset + ( 'top' === cfg.side ? bar : 0 );
		const gap = cfg.offset;
		const shouldStick = 'top' === cfg.side ? ref.top <= top : ref.bottom >= vh - gap;

		if ( shouldStick && ! entry.stuck ) {
			stick( entry );
		} else if ( ! shouldStick && entry.stuck ) {
			unstick( entry );
		}

		if ( ! entry.stuck ) {
			return;
		}

		const ph = entry.placeholder.getBoundingClientRect();
		const height = el.offsetHeight;
		let y = 'top' === cfg.side ? top : vh - gap - height;

		if ( cfg.inParent && el.parentElement ) {
			const parent = ( entry.placeholder.parentElement || el.parentElement ).getBoundingClientRect();
			y = 'top' === cfg.side ? Math.min( y, parent.bottom - height ) : Math.max( y, parent.top );
		}

		el.style.position = 'fixed';
		el.style.left = ph.left + 'px';
		el.style.width = ph.width + 'px';
		el.style.bottom = 'auto';
		el.style.top = y + 'px';

		el.classList.toggle( 'rf-sticky--effects', window.pageYOffset > cfg.effectsOffset );
	}

	function tick() {
		frame = 0;
		const device = currentDevice();
		const vh = window.innerHeight;
		const bar = adminBarHeight();

		entries.forEach( ( entry ) => update( entry, device, vh, bar ) );
	}

	function request() {
		if ( ! frame ) {
			frame = window.requestAnimationFrame( tick );
		}
	}

	function bind() {
		if ( bound ) {
			return;
		}

		bound = true;
		window.addEventListener( 'scroll', request, { passive: true } );
		window.addEventListener( 'resize', request, { passive: true } );
		window.addEventListener( 'load', request );
	}

	function setup( el, cfg, model ) {
		entries.forEach( ( e ) => {
			if ( e.el === el || ! e.el.isConnected ) {
				unstick( e );
				entries.delete( e );
			}
		} );

		el.classList.remove( 'rf-sticky' );

		if ( ! cfg ) {
			return;
		}

		el.classList.add( 'rf-sticky' );
		entries.add( { el, cfg, stuck: false, placeholder: null } );
		bind();
		request();

		if ( model && model.on && ! model.__rfSticky ) {
			model.__rfSticky = true;
			model.on( 'change', () => {
				window.setTimeout( () => {
					const next = document.querySelector( '[data-model-cid="' + el.getAttribute( 'data-model-cid' ) + '"]' );

					if ( next ) {
						init( next );
					}
				}, 0 );
			} );
		}
	}

	function init( el ) {
		let cfg = null;
		let model = null;
		const attr = el.getAttribute( 'data-rf-sticky' );

		if ( attr ) {
			try {
				cfg = JSON.parse( attr );
			} catch ( e ) {
				cfg = null;
			}
		} else if ( el.getAttribute( 'data-model-cid' ) ) {
			const fe = window.refractionFrontend;
			const cid = el.getAttribute( 'data-model-cid' );

			if ( fe && fe.config && fe.config.elements.data[ cid ] ) {
				model = fe.config.elements.data[ cid ];
				const s = {};

				Object.keys( model.attributes ).forEach( ( k ) => {
					if ( 0 === k.indexOf( 'rf_sticky' ) ) {
						const v = model.attributes[ k ];
						s[ k ] = v && v.toJSON ? v.toJSON() : v;
					}
				} );

				cfg = fromSettings( s );
			}
		}

		setup( el, cfg, model );
	}

	function boot() {
		Array.prototype.forEach.call( document.querySelectorAll( '[data-rf-sticky]' ), init );

		const fe = window.refractionFrontend;

		if ( fe && fe.hooks && fe.isEditMode && fe.isEditMode() ) {
			fe.hooks.addAction( 'frontend/element_ready/global', ( $scope ) => {
				const el = $scope && $scope[ 0 ];

				if ( el ) {
					init( el );
				}
			} );

			Array.prototype.forEach.call( document.querySelectorAll( '.refraction-element[data-model-cid]' ), init );
		}
	}

	window.refractionSticky = { fromSettings };

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => window.setTimeout( boot, 0 ) );
	} else {
		window.setTimeout( boot, 0 );
	}
}() );
