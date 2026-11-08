/**
 * Marquee widget (modules/interactions/widgets/marquee.php). Repeats each row's group of items until the row is full
 * twice over, then runs it with a CSS animation over exactly one group's width, so the loop has no seam. The time of
 * a loop follows the speed (px/s). With the scroll the band speeds up (and, with "follow", turns with the scroll
 * direction) through the animation's playbackRate, then eases back. Paused off screen and in hidden tabs. Reduced
 * motion: no copies and no animation; the items wrap in rows (marquee.scss).
 */
( function() {
	const reduce = window.matchMedia ? window.matchMedia( '(prefers-reduced-motion: reduce)' ) : { matches: false };
	const bands = new Set();
	let lastY = window.scrollY;
	let velocity = 0;
	let ticking = false;

	function config( el ) {
		try {
			return JSON.parse( el.getAttribute( 'data-rf-marquee' ) || '{}' );
		} catch ( e ) {
			return {};
		}
	}

	/**
	 * Copies of the group until the track is at least twice the row's width (one group is what scrolls by).
	 * @param {HTMLElement} row
	 */
	function fill( row ) {
		const track = row.querySelector( '.rf-marquee__track' );
		const group = track && track.querySelector( '.rf-marquee__group' );

		if ( ! group ) {
			return 0;
		}

		track.querySelectorAll( '.rf-marquee__group[data-copy]' ).forEach( ( copy ) => copy.remove() );

		const width = group.getBoundingClientRect().width;

		if ( width < 1 ) {
			return 0;
		}

		const copies = Math.min( 40, Math.ceil( ( row.getBoundingClientRect().width * 2 ) / width ) );

		for ( let i = 0; i < copies; i++ ) {
			const copy = group.cloneNode( true );

			copy.setAttribute( 'data-copy', '' );
			copy.setAttribute( 'aria-hidden', 'true' );
			copy.setAttribute( 'inert', '' );
			copy.querySelectorAll( '[id]' ).forEach( ( node ) => node.removeAttribute( 'id' ) );
			track.appendChild( copy );
		}

		return width;
	}

	function layout( band ) {
		const { el, cfg } = band;
		const speed = Math.max( 5, Number( cfg.speed ) || 60 );

		band.rows = [];

		el.querySelectorAll( '.rf-marquee__row' ).forEach( ( row ) => {
			const width = fill( row );
			const track = row.querySelector( '.rf-marquee__track' );

			if ( ! width || ! track ) {
				return;
			}

			track.style.setProperty( '--rf-mq-shift', `${ -width }px` );
			track.style.setProperty( '--rf-mq-time', `${ ( width / speed ).toFixed( 2 ) }s` );
			band.rows.push( { track, sign: 'right' === row.getAttribute( 'data-dir' ) ? -1 : 1 } );
		} );

		el.classList.add( 'is-running' );
	}

	/**
	 * The animation of a track (created by the CSS once .is-running is on).
	 * @param {HTMLElement} track
	 */
	function animationOf( track ) {
		const list = track.getAnimations ? track.getAnimations() : [];

		return list.length ? list[ 0 ] : null;
	}

	function frame() {
		ticking = false;

		const y = window.scrollY;
		const delta = y - lastY;

		lastY = y;
		velocity = ( velocity * 0.8 ) + ( delta * 0.2 );

		const moving = Math.abs( velocity ) > 0.05;

		bands.forEach( ( band ) => {
			if ( ! band.cfg.scroll || ! band.visible || ! band.rows ) {
				return;
			}

			const boost = 1 + Math.min( 6, Math.abs( velocity ) / 3 );
			const turn = 'follow' === band.cfg.scroll && velocity < -0.5 ? -1 : 1;

			band.rows.forEach( ( { track } ) => {
				const anim = animationOf( track );

				if ( anim ) {
					anim.playbackRate = boost * turn;
				}
			} );
		} );

		if ( moving ) {
			ticking = true;
			window.requestAnimationFrame( frame );
		} else {
			velocity = 0;
		}
	}

	function onScroll() {
		if ( ! ticking ) {
			ticking = true;
			window.requestAnimationFrame( frame );
		}
	}

	const seen = 'IntersectionObserver' in window ? new IntersectionObserver( ( entries ) => {
		entries.forEach( ( entry ) => {
			bands.forEach( ( band ) => {
				if ( band.el === entry.target ) {
					band.visible = entry.isIntersecting;
					band.el.classList.toggle( 'is-offscreen', ! entry.isIntersecting );
				}
			} );
		} );
	} ) : null;

	function init( el ) {
		if ( ! el || ! el.matches || ! el.matches( '[data-rf-marquee]' ) ) {
			return;
		}

		bands.forEach( ( band ) => {
			if ( band.el === el || ! band.el.isConnected ) {
				band.resize?.disconnect();
				seen?.unobserve( band.el );
				bands.delete( band );
			}
		} );

		if ( reduce.matches ) {
			el.classList.remove( 'is-running' );
			return;
		}

		const band = { el, cfg: config( el ), visible: true, rows: [] };
		let width = 0;

		bands.add( band );
		layout( band );
		seen?.observe( el );

		if ( 'ResizeObserver' in window ) {
			band.resize = new ResizeObserver( () => {
				const now = Math.round( el.getBoundingClientRect().width );

				if ( now !== width ) {
					width = now;
					layout( band );
				}
			} );
			band.resize.observe( el );
		}

		// Web fonts change the widths once they arrive.
		document.fonts?.ready.then( () => el.isConnected && layout( band ) );
	}

	function scan( root ) {
		( root || document ).querySelectorAll( '[data-rf-marquee]' ).forEach( init );
	}

	window.addEventListener( 'scroll', onScroll, { passive: true } );
	reduce.addEventListener?.( 'change', () => scan() );
	document.addEventListener( 'visibilitychange', () => {
		bands.forEach( ( band ) => band.el.classList.toggle( 'is-offscreen', document.hidden || ! band.visible ) );
	} );

	// The editor's preview renders the widget again on every change.
	function hookIntoEditor( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks && fe.isEditMode ) {
			fe.hooks.addAction( 'frontend/element_ready/refraction-marquee.default', ( $scope ) => $scope && $scope[ 0 ] && scan( $scope[ 0 ] ) );
			return;
		}

		if ( tries < 100 ) {
			window.setTimeout( () => hookIntoEditor( tries + 1 ), 100 );
		}
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => scan() );
	} else {
		scan();
	}

	hookIntoEditor( 0 );
	window.refractionMarquee = { init, scan };
}() );
