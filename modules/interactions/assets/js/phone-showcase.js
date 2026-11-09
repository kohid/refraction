/**
 * Phone Showcase widget (modules/interactions/widgets/phone-showcase.php). The steps are tabs: clicking one (or Enter /
 * Space on it), the arrow keys, Home and End, or a tap inside the phone (the next step, then back to the first) show
 * that step's screen. The screens before the current one get is-past (they slide out to the left). Floating cards
 * tied to a step pop in with it. "Play by itself" moves on every few seconds (the current step shows a timing line),
 * paused while hovered or focused, off screen or in a hidden tab, and never for reduced motion.
 */
( function() {
	const reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' );

	function init( root ) {
		if ( ! root || root.rfShowcase ) {
			return;
		}

		let cfg = {};

		try {
			cfg = JSON.parse( root.getAttribute( 'data-rf-showcase' ) || '{}' );
		} catch ( e ) {}

		const steps = Array.from( root.querySelectorAll( '.rf-showcase__step' ) );
		const n = steps.length;

		if ( ! n ) {
			return;
		}

		const shots = Array.from( root.querySelectorAll( '.rf-phone__shot' ) );
		const cards = Array.from( root.querySelectorAll( '.rf-showcase__card[data-step]' ) );
		const screen = root.querySelector( '.rf-phone__screen' );
		let at = 0;
		let timer = null;
		let hovered = false;
		let focused = false;
		let visible = true;

		root.rfShowcase = { show: ( i ) => show( i, false ) };

		function show( index, focus ) {
			at = ( ( index % n ) + n ) % n;

			steps.forEach( ( step, i ) => {
				const on = i === at;

				step.classList.toggle( 'is-active', on );
				step.setAttribute( 'aria-selected', on ? 'true' : 'false' );
				step.tabIndex = on ? 0 : -1;
			} );

			shots.forEach( ( shot, i ) => {
				shot.classList.toggle( 'is-active', i === at );
				shot.classList.toggle( 'is-past', i < at );
				shot.toggleAttribute( 'aria-hidden', i !== at );
			} );

			cards.forEach( ( card ) => card.classList.toggle( 'is-hidden', Number( card.getAttribute( 'data-step' ) ) !== at ) );

			if ( screen ) {
				screen.setAttribute( 'aria-labelledby', steps[ at ].id );
			}

			if ( focus ) {
				steps[ at ].focus();
			}

			restart();
		}

		// ---------------------------------------------------------------- playing by itself
		function canPlay() {
			return cfg.autoplay && ! reduce.matches && visible && ! document.hidden && ! hovered && ! focused && n > 1;
		}

		function restart() {
			window.clearTimeout( timer );
			root.classList.remove( 'is-playing', 'is-paused' );

			if ( ! cfg.autoplay || reduce.matches || n < 2 ) {
				return;
			}

			// Restart the timing line's animation.
			void root.offsetWidth;
			root.classList.add( 'is-playing' );
			schedule( ( Number( cfg.interval ) || 5 ) * 1000 );
		}

		let remaining = 0;
		let startedAt = 0;

		function schedule( ms ) {
			window.clearTimeout( timer );
			remaining = ms;
			startedAt = Date.now();

			if ( canPlay() ) {
				root.classList.remove( 'is-paused' );
				timer = window.setTimeout( () => show( at + 1, false ), ms );
			} else {
				root.classList.add( 'is-paused' );
			}
		}

		function pauseOrResume() {
			if ( ! root.classList.contains( 'is-playing' ) ) {
				return;
			}

			if ( canPlay() ) {
				if ( root.classList.contains( 'is-paused' ) ) {
					schedule( remaining );
				}
			} else if ( ! root.classList.contains( 'is-paused' ) ) {
				window.clearTimeout( timer );
				remaining = Math.max( 0, remaining - ( Date.now() - startedAt ) );
				root.classList.add( 'is-paused' );
			}
		}

		// ---------------------------------------------------------------- input
		steps.forEach( ( step, i ) => step.addEventListener( 'click', () => show( i, false ) ) );

		root.querySelector( '.rf-showcase__steps' ).addEventListener( 'keydown', ( event ) => {
			const keys = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: n - 1 };

			if ( event.key in keys ) {
				event.preventDefault();
				show( keys[ event.key ], true );
			}
		} );

		if ( cfg.tap && screen ) {
			root.classList.add( 'is-tappable' );
			screen.addEventListener( 'click', ( event ) => {
				// A link inside a screen (there are none by default) keeps its click.
				if ( ! event.target.closest( 'a' ) ) {
					show( at + 1, false );
				}
			} );
		}

		root.addEventListener( 'pointerenter', () => {
			hovered = true;
			pauseOrResume();
		} );
		root.addEventListener( 'pointerleave', () => {
			hovered = false;
			pauseOrResume();
		} );
		root.addEventListener( 'focusin', () => {
			focused = true;
			pauseOrResume();
		} );
		root.addEventListener( 'focusout', ( event ) => {
			focused = root.contains( event.relatedTarget );
			pauseOrResume();
		} );
		document.addEventListener( 'visibilitychange', pauseOrResume );

		if ( 'IntersectionObserver' in window ) {
			new IntersectionObserver( ( entries ) => {
				visible = entries.some( ( entry ) => entry.isIntersecting );
				pauseOrResume();
			}, { threshold: 0.25 } ).observe( root );
		}

		show( 0, false );
	}

	function scan( scope ) {
		( scope || document ).querySelectorAll( '[data-rf-showcase]' ).forEach( init );
	}

	// The editor's preview renders the widget again on every change.
	function hookIntoEditor( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks ) {
			fe.hooks.addAction( 'frontend/element_ready/refraction-phone-showcase.default', ( $scope ) => $scope && $scope[ 0 ] && scan( $scope[ 0 ] ) );
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
}() );
