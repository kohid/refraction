/**
 * Refraction Reveal, front end and editor preview.
 *
 * A whole element, the lines/words/letters of its text, or the elements inside a container come into view one after
 * another. Every piece gets a progress --rf-rv-p (0 hidden, 1 in place) and the CSS draws it from that (see
 * frontend.scss): a timed reveal sets it to 1 and lets it transition, with a delay per piece; a scroll-linked reveal
 * sets it frame by frame from the scroll position, so it plays backwards when scrolling up.
 *
 * Config comes from `data-rf-reveal` (clamped by PHP, Pure_Reveal_Settings). In the editor preview it is built from the
 * element settings with the same limits and rebuilt when a setting changes.
 */
( function() {
	'use strict';

	const EFFECTS = [ 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'fade', 'zoom-in', 'zoom-out', 'blur', 'rise', 'wipe-up', 'wipe-down', 'wipe-left', 'wipe-right', 'dim' ];
	const EASE_CSS = {
		smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
		soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
		snappy: 'cubic-bezier(0.16, 1, 0.3, 1)',
		back: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		linear: 'linear',
	};
	const EASE_JS = {
		smooth: ( t ) => 1 - Math.pow( 1 - t, 3 ),
		soft: ( t ) => ( t < 0.5 ? 2 * t * t : 1 - ( Math.pow( ( -2 * t ) + 2, 2 ) / 2 ) ),
		snappy: ( t ) => 1 - Math.pow( 1 - t, 5 ),
		back: ( t ) => 1 + ( 2.70158 * Math.pow( t - 1, 3 ) ) + ( 1.70158 * Math.pow( t - 1, 2 ) ),
		linear: ( t ) => t,
	};
	const SKIP = { SCRIPT: 1, STYLE: 1, SVG: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, IFRAME: 1, CODE: 1, PRE: 1 };

	const reducedQuery = window.matchMedia ? window.matchMedia( '(prefers-reduced-motion: reduce)' ) : null;
	const live = new Set();
	let frame = 0;

	const clamp = ( v, lo, hi ) => Math.max( lo, Math.min( hi, v ) );
	const num = ( v, def, lo, hi ) => {
		const n = parseFloat( v && 'object' === typeof v ? v.size : v );
		return clamp( isFinite( n ) ? n : def, lo, hi );
	};
	const pick = ( v, allowed ) => ( allowed.indexOf( v ) > -1 ? v : allowed[ 0 ] );
	const effect = ( v ) => ( EFFECTS.indexOf( v ) > -1 ? v : '' );

	// ---------------------------------------------------------------- config

	/**
	 * Same rules as Pure_Reveal_Settings::normalize() in PHP.
	 *
	 * @param {Object}   s     Element settings.
	 * @param {string[]} valid Device keys of the site.
	 * @return {Object|null} The config, or null when nothing is revealed.
	 */
	function fromSettings( s, valid ) {
		const text = [ 'lines', 'words', 'chars' ].indexOf( s.rf_reveal_text ) > -1 ? s.rf_reveal_text : '';
		const cfg = { effect: effect( s.rf_reveal ), text, children: effect( s.rf_reveal_children ) };

		if ( ! cfg.effect && ! cfg.text && ! cfg.children ) {
			return null;
		}

		let start = Math.round( num( s.rf_reveal_start, 0, 0, 100 ) );
		let end = Math.round( num( s.rf_reveal_end, 100, 0, 100 ) );

		if ( start > end ) {
			[ start, end ] = [ end, start ];
		}

		return Object.assign( cfg, {
			textEffect: text ? pick( s.rf_reveal_text_effect, [ 'mask' ].concat( EFFECTS ) ) : '',
			trigger: pick( s.rf_reveal_trigger, [ 'once', 'always', 'scroll' ] ),
			duration: Math.round( num( s.rf_reveal_duration, 700, 100, 4000 ) ),
			delay: Math.round( num( s.rf_reveal_delay, 0, 0, 4000 ) ),
			stagger: Math.round( num( s.rf_reveal_stagger, 80, 0, 1000 ) ),
			distance: Math.round( num( s.rf_reveal_distance, 40, 0, 300 ) ),
			easing: pick( s.rf_reveal_easing, Object.keys( EASE_CSS ) ),
			offset: Math.round( num( s.rf_reveal_offset, 10, 0, 50 ) ),
			start,
			end,
			devices: Array.isArray( s.rf_reveal_devices ) && s.rf_reveal_devices.length ? valid.filter( ( d ) => withNewerDevices( s.rf_reveal_devices ).indexOf( d ) > -1 ) : valid,
		} );
	}

	function frontend() {
		return window.refractionFrontend;
	}

	function validDevices() {
		try {
			return frontend().breakpoints.getActiveBreakpointsList( { withDesktop: true } );
		} catch ( e ) {
			return [ 'desktop', 'tablet', 'mobile' ];
		}
	}

	// A list chosen before the phone views and Mobile Landscape existed keeps its meaning: "mobile" took in the phones
	// and "tablet" the 820px screens (Pure_Motion_Settings::with_newer_devices() in PHP).
	function withNewerDevices( list ) {
		const phones = [ 'phone_lg', 'phone_md', 'phone_sm', 'phone_xs' ];

		if ( list.some( ( d ) => 'mobile_extra' === d || phones.indexOf( d ) > -1 ) ) {
			return list;
		}

		return list.concat( list.indexOf( 'mobile' ) > -1 ? phones : [], list.indexOf( 'tablet' ) > -1 ? [ 'mobile_extra' ] : [] );
	}

	function currentDevice() {
		try {
			const mode = frontend().getCurrentDeviceMode();

			if ( mode ) {
				return mode;
			}
		} catch ( e ) { /* Not ready: use the body attribute or the width. */ }

		const attr = document.body.getAttribute( 'data-refraction-device-mode' );

		if ( attr ) {
			return attr;
		}

		if ( window.innerWidth <= 767 ) {
			return 'mobile';
		}

		return window.innerWidth <= 1024 ? 'tablet' : 'desktop';
	}

	// Editor preview: the element's settings model (by its data-model-cid).
	function model( el ) {
		const fe = frontend();
		const cid = el.getAttribute( 'data-model-cid' );

		return fe && cid && fe.config && fe.config.elements && fe.config.elements.data ? fe.config.elements.data[ cid ] : null;
	}

	function hasEntrance( el ) {
		const m = model( el );
		let s = m ? m.attributes : null;

		if ( ! s ) {
			try {
				s = JSON.parse( el.getAttribute( 'data-settings' ) || '{}' );
			} catch ( e ) {
				s = {};
			}
		}

		return !! ( ( s._animation && 'none' !== s._animation ) || ( s.animation && 'none' !== s.animation ) );
	}

	// ----------------------------------------------------------------- text

	// Splits the text of `root` into word (and letter) spans, keeping a whole copy for screen readers.
	function splitText( root, mode ) {
		const nodes = [];
		const walker = document.createTreeWalker( root, NodeFilter.SHOW_TEXT, {
			acceptNode: ( node ) => {
				for ( let p = node.parentNode; p && p !== root; p = p.parentNode ) {
					if ( SKIP[ p.nodeName.toUpperCase() ] || ( p.classList && p.classList.contains( 'rf-rv-sr' ) ) ) {
						return NodeFilter.FILTER_REJECT;
					}
				}

				return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
			},
		} );

		while ( walker.nextNode() ) {
			nodes.push( walker.currentNode );
		}

		const words = [];

		nodes.forEach( ( node ) => {
			const fragment = document.createDocumentFragment();
			const sr = document.createElement( 'span' );
			sr.className = 'rf-rv-sr';
			sr.textContent = node.nodeValue;
			fragment.appendChild( sr );

			node.nodeValue.split( /(\s+)/ ).forEach( ( part ) => {
				if ( ! part ) {
					return;
				}

				if ( /^\s+$/.test( part ) ) {
					fragment.appendChild( document.createTextNode( part ) );
					return;
				}

				const word = document.createElement( 'span' );
				word.className = 'rf-rv-word';
				word.setAttribute( 'aria-hidden', 'true' );

				if ( 'chars' === mode ) {
					Array.from( part ).forEach( ( ch ) => {
						const c = document.createElement( 'span' );
						c.className = 'rf-rv-char';
						c.textContent = ch;
						word.appendChild( c );
					} );
				} else {
					word.textContent = part;
				}

				fragment.appendChild( word );
				words.push( word );
			} );

			node.parentNode.replaceChild( fragment, node );
		} );

		return words;
	}

	// The pieces of split text, each with its group (line, word or letter number).
	function textPieces( words, mode, fx ) {
		const pieces = [];
		const wrap = ( inner ) => {
			// "Up from behind a line": the piece slides inside a clip of its own.
			if ( 'mask' !== fx ) {
				return inner;
			}

			const clip = document.createElement( 'span' );
			clip.className = 'rf-rv-clip';
			inner.parentNode.insertBefore( clip, inner );
			clip.appendChild( inner );

			return inner;
		};

		if ( 'chars' === mode ) {
			let n = 0;
			words.forEach( ( word ) => Array.from( word.children ).forEach( ( c ) => pieces.push( { el: wrap( c ), group: n++ } ) ) );

			return pieces;
		}

		words.forEach( ( word, i ) => pieces.push( { el: wrap( word ), group: i, word } ) );

		if ( 'lines' === mode ) {
			regroupLines( pieces );
		}

		return pieces;
	}

	// Lines: words on the same line share a group (measured; measured again after a resize).
	function regroupLines( pieces ) {
		let line = -1;
		let top = null;

		pieces.forEach( ( piece ) => {
			const y = Math.round( ( piece.word.parentNode.classList.contains( 'rf-rv-clip' ) ? piece.word.parentNode : piece.word ).getBoundingClientRect().top );

			if ( null === top || Math.abs( y - top ) > 4 ) {
				line++;
				top = y;
			}

			piece.group = line;
		} );
	}

	// ---------------------------------------------------------------- pieces

	function children( el ) {
		return Array.from( el.querySelectorAll( ':scope > .e-con-inner > .refraction-element, :scope > .refraction-element, :scope > .refraction-container > .refraction-row > .refraction-element' ) )
			.filter( ( child ) => ! hasEntrance( child ) );
	}

	function setP( piece, p ) {
		if ( piece.p !== p ) {
			piece.p = p;
			piece.el.style.setProperty( '--rf-rv-p', String( p ) );
		}
	}

	function setup( el, cfg, settingsModel ) {
		teardown( el );

		if ( ! cfg ) {
			el.classList.remove( 'rf-rv-wait' );
			return;
		}

		const reduced = reducedQuery && reducedQuery.matches;
		const offDevice = cfg.devices && cfg.devices.indexOf( currentDevice() ) < 0;

		if ( reduced || offDevice ) {
			el.classList.remove( 'rf-rv-wait' );
			return;
		}

		const item = { el, cfg, pieces: [], groups: 1, shown: false };
		let base = 0;

		if ( cfg.effect && ! hasEntrance( el ) ) {
			item.pieces.push( { el, fx: cfg.effect, group: 0 } );
			base = 1;
		}

		if ( cfg.children ) {
			children( el ).forEach( ( child, i ) => item.pieces.push( { el: child, fx: cfg.children, group: base + i } ) );
		}

		if ( cfg.text ) {
			const target = el.querySelector( '.refraction-widget-container' ) || el;
			item.textRoot = target;
			item.original = target.innerHTML;
			item.words = splitText( target, cfg.text );
			item.text = textPieces( item.words, cfg.text, cfg.textEffect );
			item.text.forEach( ( piece ) => {
				piece.fx = cfg.textEffect;
				piece.group += base;
				item.pieces.push( piece );
			} );
		}

		item.groups = item.pieces.reduce( ( max, piece ) => Math.max( max, piece.group + 1 ), 1 );
		item.pieces.forEach( ( piece ) => {
			piece.el.setAttribute( 'data-rf-rv-piece', '' );
			piece.el.setAttribute( 'data-rf-rv-fx', piece.fx );
			piece.el.style.setProperty( '--rf-rv-dist', cfg.distance + 'px' );
		} );
		timing( item );

		// Hidden pieces first, without a transition, then the element itself becomes visible.
		el.classList.add( 'rf-rv-instant' );
		item.pieces.forEach( ( piece ) => setP( piece, 0 ) );
		void el.offsetWidth; // eslint-disable-line no-void
		el.classList.remove( 'rf-rv-wait', 'rf-rv-instant' );

		if ( 'scroll' === cfg.trigger ) {
			el.classList.add( 'rf-rv-scrub' );
		} else {
			observe( item );
		}

		live.add( item );
		el.rfReveal = item;
		request();

		if ( settingsModel && settingsModel.on && ! settingsModel.__rfReveal ) {
			settingsModel.__rfReveal = true;
			settingsModel.on( 'change', () => {
				const next = el.isConnected ? el : document.querySelector( '[data-model-cid="' + el.getAttribute( 'data-model-cid' ) + '"]' );

				if ( next ) {
					window.setTimeout( () => init( next ), 0 );
				}
			} );
		}
	}

	// Timed reveals: each piece's delay from its group.
	function timing( item ) {
		const { cfg } = item;

		item.pieces.forEach( ( piece ) => {
			piece.el.style.setProperty( '--rf-rv-dur', cfg.duration + 'ms' );
			piece.el.style.setProperty( '--rf-rv-ease', EASE_CSS[ cfg.easing ] );
			piece.el.style.setProperty( '--rf-rv-delay', ( cfg.delay + ( piece.group * cfg.stagger ) ) + 'ms' );
		} );
	}

	function observe( item ) {
		if ( ! window.IntersectionObserver ) {
			item.pieces.forEach( ( piece ) => setP( piece, 1 ) );
			return;
		}

		item.io = new IntersectionObserver( ( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting && ! item.shown ) {
					item.shown = true;
					item.el.setAttribute( 'data-rf-rv-state', 'in' );
					item.pieces.forEach( ( piece ) => setP( piece, 1 ) );

					if ( 'once' === item.cfg.trigger ) {
						item.io.disconnect();
					}
				}
			} );
		}, { rootMargin: '0px 0px -' + item.cfg.offset + '% 0px' } );
		item.io.observe( item.el );

		// "Every time": once it has left the screen completely, it is hidden again, ready to play.
		if ( 'always' === item.cfg.trigger ) {
			item.out = new IntersectionObserver( ( entries ) => {
				entries.forEach( ( entry ) => {
					if ( ! entry.isIntersecting && item.shown ) {
						item.shown = false;
						item.el.setAttribute( 'data-rf-rv-state', 'out' );
						item.el.classList.add( 'rf-rv-instant' );
						item.pieces.forEach( ( piece ) => setP( piece, 0 ) );
						void item.el.offsetWidth; // eslint-disable-line no-void
						item.el.classList.remove( 'rf-rv-instant' );
					}
				} );
			} );
			item.out.observe( item.el );
		}
	}

	// Scroll-linked: 0 when the element's top is `start`% into the screen from the bottom, 1 at `end`%.
	function progress( item ) {
		const rect = item.el.getBoundingClientRect();
		const vh = window.innerHeight || 1;
		const into = ( ( vh - rect.top ) / vh ) * 100;
		const span = Math.max( 1, item.cfg.end - item.cfg.start );

		return clamp( ( into - item.cfg.start ) / span, 0, 1 );
	}

	function scrub( item ) {
		const p = progress( item );
		const k = clamp( item.cfg.stagger / 700, 0, 2 );
		const total = 1 + ( ( item.groups - 1 ) * k );
		const ease = EASE_JS[ item.cfg.easing ];

		item.el.setAttribute( 'data-rf-rv-progress', p.toFixed( 3 ) );
		item.pieces.forEach( ( piece ) => setP( piece, Math.round( ease( clamp( ( p * total ) - ( piece.group * k ), 0, 1 ) ) * 1000 ) / 1000 ) );
	}

	function tick() {
		frame = 0;
		live.forEach( ( item ) => {
			if ( ! item.el.isConnected ) {
				teardown( item.el );
			} else if ( 'scroll' === item.cfg.trigger ) {
				scrub( item );
			}
		} );
	}

	function request() {
		if ( ! frame ) {
			frame = window.requestAnimationFrame( tick );
		}
	}

	let resizeTimer = 0;

	function onResize() {
		window.clearTimeout( resizeTimer );
		resizeTimer = window.setTimeout( () => {
			live.forEach( ( item ) => {
				if ( item.text && 'lines' === item.cfg.text ) {
					const base = item.cfg.effect ? 1 : 0;
					regroupLines( item.text );
					item.text.forEach( ( piece ) => ( piece.group += base ) );
					item.groups = item.pieces.reduce( ( max, piece ) => Math.max( max, piece.group + 1 ), 1 );
					timing( item );
				}
			} );
			request();
		}, 150 );
	}

	function teardown( el ) {
		const item = el.rfReveal;

		if ( ! item ) {
			return;
		}

		[ item.io, item.out ].forEach( ( o ) => o && o.disconnect() );
		item.pieces.forEach( ( piece ) => {
			piece.el.removeAttribute( 'data-rf-rv-piece' );
			piece.el.removeAttribute( 'data-rf-rv-fx' );
			[ '--rf-rv-p', '--rf-rv-dist', '--rf-rv-dur', '--rf-rv-ease', '--rf-rv-delay' ].forEach( ( v ) => piece.el.style.removeProperty( v ) );
		} );

		if ( item.textRoot && item.textRoot.isConnected ) {
			item.textRoot.innerHTML = item.original;
		}

		el.classList.remove( 'rf-rv-scrub', 'rf-rv-instant' );
		el.removeAttribute( 'data-rf-rv-state' );
		live.delete( item );
		el.rfReveal = null;
	}

	function init( el ) {
		const attr = el.getAttribute( 'data-rf-reveal' );
		let cfg = null;
		let settingsModel = null;

		if ( attr ) {
			try {
				cfg = JSON.parse( attr );
			} catch ( e ) {
				cfg = null;
			}
		} else {
			settingsModel = model( el );

			if ( settingsModel ) {
				const s = {};
				Object.keys( settingsModel.attributes ).forEach( ( k ) => {
					if ( 0 === k.indexOf( 'rf_reveal' ) ) {
						const v = settingsModel.attributes[ k ];
						s[ k ] = v && v.toJSON ? v.toJSON() : v;
					}
				} );
				cfg = fromSettings( s, validDevices() );
			}
		}

		setup( el, cfg, settingsModel );
	}

	function hookIntoEditor( tries ) {
		const fe = frontend();

		if ( fe && fe.hooks && fe.config && fe.config.elements && fe.isEditMode && fe.isEditMode() ) {
			fe.hooks.addAction( 'frontend/element_ready/global', ( $scope ) => {
				if ( $scope && $scope[ 0 ] ) {
					init( $scope[ 0 ] );
				}
			} );
			Array.prototype.forEach.call( document.querySelectorAll( '.refraction-element[data-model-cid]' ), init );
			return;
		}

		if ( tries < 300 ) {
			window.setTimeout( () => hookIntoEditor( tries + 1 ), 100 );
		}
	}

	function boot() {
		Array.prototype.forEach.call( document.querySelectorAll( '[data-rf-reveal]' ), init );
		window.addEventListener( 'scroll', request, { passive: true } );
		window.addEventListener( 'resize', onResize );

		if ( reducedQuery && reducedQuery.addEventListener ) {
			reducedQuery.addEventListener( 'change', () => Array.prototype.forEach.call( document.querySelectorAll( '[data-rf-reveal], .refraction-element[data-model-cid]' ), init ) );
		}

		if ( /[?&]refraction-preview=/.test( window.location.search ) ) {
			hookIntoEditor( 0 );
		}
	}

	window.refractionReveal = { fromSettings };

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => window.setTimeout( boot, 0 ) );
	} else {
		window.setTimeout( boot, 0 );
	}
}() );
