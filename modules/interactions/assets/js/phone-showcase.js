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

	/**
	 * Editor preview only: a floating card can be dragged into place on the phone. While dragging it follows the
	 * pointer (inline --rf-card-* variables); let go, its Offset settings are written for the card's Horizontal and
	 * Vertical Orientation and the screen size shown (the responsive setting of that device), in the unit the setting
	 * already has (% of the phone by default). Through $e, so it can be undone like any other change.
	 *
	 * @param {HTMLElement} root The widget's .rf-showcase.
	 */
	function editDrag( root ) {
		const editor = window.parent;

		if ( root.rfDrag || ! editor || editor === window || ! editor.$e || ! editor.refraction ) {
			return;
		}

		root.rfDrag = true;
		root.classList.add( 'rf-showcase--edit' );

		const widgetId = root.closest( '[data-id]' )?.getAttribute( 'data-id' );
		const VARS = [ '--rf-card-left', '--rf-card-right', '--rf-card-top', '--rf-card-bottom', '--rf-card-tx', '--rf-card-ty' ];

		const itemOf = ( card ) => {
			const id = ( card.className.match( /refraction-repeater-item-([\w-]+)/ ) || [] )[ 1 ];
			const container = editor.refraction.getContainer( widgetId );

			return id && container?.repeaters?.cards?.children?.find( ( child ) => child.id === id );
		};

		const unitOf = ( item, key ) => {
			const value = item.settings.get( key );

			return value && value.unit && '' !== value.size ? value.unit : '%';
		};

		root.addEventListener( 'pointerdown', ( event ) => {
			const card = event.target.closest( '.rf-showcase__card' );
			const device = card && card.offsetParent;

			if ( ! card || ! device || 0 !== event.button ) {
				return;
			}

			const item = itemOf( card );

			if ( ! item ) {
				return;
			}

			// The phone may be scaled (Style > Phone): pointer distances are divided by that.
			const ratio = device.getBoundingClientRect().width / device.offsetWidth || 1;
			const devRect = device.getBoundingClientRect();
			const cardRect = card.getBoundingClientRect();
			// The card's layout box (its own size, before its Size scale), from its middle.
			const startLeft = ( ( ( cardRect.left + ( cardRect.width / 2 ) ) - devRect.left ) / ratio ) - ( card.offsetWidth / 2 );
			const startTop = ( ( ( cardRect.top + ( cardRect.height / 2 ) ) - devRect.top ) / ratio ) - ( card.offsetHeight / 2 );
			const x0 = event.clientX;
			const y0 = event.clientY;
			let left = startLeft;
			let top = startTop;
			let moved = false;

			const move = ( e ) => {
				left = startLeft + ( ( e.clientX - x0 ) / ratio );
				top = startTop + ( ( e.clientY - y0 ) / ratio );

				if ( ! moved && Math.hypot( e.clientX - x0, e.clientY - y0 ) < 4 ) {
					return;
				}

				moved = true;
				card.classList.add( 'is-dragging' );
				card.style.setProperty( '--rf-card-left', left + 'px' );
				card.style.setProperty( '--rf-card-right', 'auto' );
				card.style.setProperty( '--rf-card-top', top + 'px' );
				card.style.setProperty( '--rf-card-bottom', 'auto' );
				card.style.setProperty( '--rf-card-tx', '0%' );
				card.style.setProperty( '--rf-card-ty', '0%' );
			};

			const up = () => {
				window.removeEventListener( 'pointermove', move );
				window.removeEventListener( 'pointerup', up );
				window.removeEventListener( 'pointercancel', up );

				if ( ! moved ) {
					return;
				}

				const w = device.offsetWidth || 1;
				const h = device.offsetHeight || 1;
				const fromRight = 'end' === item.settings.get( 'card_h' );
				const fromBottom = 'end' === item.settings.get( 'card_v' );
				const mode = editor.refraction.channels.deviceMode.request( 'currentMode' ) || 'desktop';
				const suffix = 'desktop' === mode ? '' : '_' + mode;
				const keyX = ( fromRight ? 'card_offset_x_end' : 'card_offset_x' ) + suffix;
				const keyY = ( fromBottom ? 'card_offset_y_end' : 'card_offset_y' ) + suffix;
				const px = {
					x: fromRight ? w - ( left + card.offsetWidth ) : left,
					y: fromBottom ? h - ( top + card.offsetHeight ) : top,
				};
				const inUnit = ( value, unit, size ) => {
					const n = '%' === unit ? value / size * 100 : value;

					return Math.round( n * 10 ) / 10;
				};
				const unitX = unitOf( item, keyX );
				const unitY = unitOf( item, keyY );
				const settings = {};

				// Only px and % follow the pointer exactly; other units are written as %.
				settings[ keyX ] = { unit: 'px' === unitX ? 'px' : '%', size: inUnit( px.x, 'px' === unitX ? 'px' : '%', w ) };
				settings[ keyY ] = { unit: 'px' === unitY ? 'px' : '%', size: inUnit( px.y, 'px' === unitY ? 'px' : '%', h ) };

				editor.$e.run( 'document/elements/settings', { container: item, settings, options: { external: true } } );

				// The printed CSS takes over from the inline place.
				window.requestAnimationFrame( () => window.requestAnimationFrame( () => {
					VARS.forEach( ( v ) => card.style.removeProperty( v ) );
					card.classList.remove( 'is-dragging' );
				} ) );
			};

			event.preventDefault();
			event.stopPropagation();
			window.addEventListener( 'pointermove', move );
			window.addEventListener( 'pointerup', up );
			window.addEventListener( 'pointercancel', up );
		} );
	}

	// The editor's preview renders the widget again on every change.
	function hookIntoEditor( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks ) {
			const ready = ( scope ) => {
				scan( scope );

				if ( fe.isEditMode && fe.isEditMode() ) {
					scope.querySelectorAll( '[data-rf-showcase]' ).forEach( editDrag );
				}
			};

			fe.hooks.addAction( 'frontend/element_ready/refraction-phone-showcase.default', ( $scope ) => $scope && $scope[ 0 ] && ready( $scope[ 0 ] ) );
			ready( document );
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
