/**
 * Slides widget, "Timed cards" layout: the current slide fills the widget, the slides after it wait as cards in a
 * row, and going to a slide grows its card from where it sits to the whole widget while the others slide along.
 * A line at the top times each slide (its animationend moves on), a second line and a counter show the progress.
 * Markup from Slides::render_cards(); config in data-rf-tco.
 */
( function() {
	const reduce = () => window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const pad = ( n ) => ( n < 10 ? '0' : '' ) + n;

	function setup( root ) {
		if ( root.rfTco ) {
			root.rfTco.destroy();
		}

		let cfg = {};

		try {
			cfg = JSON.parse( root.getAttribute( 'data-rf-tco' ) || '{}' );
		} catch ( e ) {}

		const slides = Array.from( root.querySelectorAll( '.rf-tco__slide' ) );
		const n = slides.length;

		if ( ! n ) {
			return;
		}

		const texts = Array.from( root.querySelectorAll( '.rf-tco__text' ) );
		const cards = Array.from( root.querySelectorAll( '.rf-tco__card' ) );
		const timerBar = root.querySelector( '.rf-tco__timer i' );
		const line = root.querySelector( '.rf-tco__line i' );
		const count = root.querySelector( '.rf-tco__count' );
		const speed = reduce() ? 0 : ( Number( cfg.speed ) || 900 );
		let active = 0;
		let busy = false;

		root.style.setProperty( '--rf-tco-speed', speed + 'ms' );
		root.style.setProperty( '--rf-tco-interval', ( Number( cfg.interval ) || 5000 ) + 'ms' );

		/**
		 * Cards after the active slide, in order; the active slide's own card waits (hidden) at the end.
		 * @param {boolean} instant
		 */
		function layoutCards( instant ) {
			const step = cards[ 0 ] ? cards[ 0 ].getBoundingClientRect().width + parseFloat( getComputedStyle( root ).getPropertyValue( '--rf-tco-gap' ) || 18 ) : 0;

			cards.forEach( ( card, i ) => {
				const rank = ( i - active - 1 + n ) % n;
				const hidden = i === active;

				if ( instant ) {
					card.style.transition = 'none';
				}

				card.style.transform = `translateX(${ rank * step }px)`;
				card.classList.toggle( 'is-gone', hidden );
				card.tabIndex = hidden ? -1 : 0;
				card.setAttribute( 'aria-hidden', hidden ? 'true' : 'false' );

				if ( instant ) {
					card.getBoundingClientRect();
					card.style.transition = '';
				}
			} );
		}

		function showText( index ) {
			texts.forEach( ( t, i ) => {
				t.classList.toggle( 'is-active', i === index );
				t.setAttribute( 'aria-hidden', i === index ? 'false' : 'true' );
			} );
		}

		function progress() {
			if ( line ) {
				line.style.width = ( ( active + 1 ) / n * 100 ) + '%';
			}

			if ( count ) {
				count.textContent = pad( active + 1 );
			}
		}

		/** Restarts the timer line; when it fills, the next slide comes. */
		function restartTimer() {
			root.classList.remove( 'is-playing' );

			if ( cfg.autoplay && n > 1 && ! reduce() ) {
				// Reflow, so the animation starts again from zero.
				if ( timerBar ) {
					timerBar.getBoundingClientRect();
				}

				root.classList.add( 'is-playing' );
			}
		}

		function go( target ) {
			target = ( ( target % n ) + n ) % n;

			if ( busy || target === active ) {
				return;
			}

			const card = cards[ target ];
			const from = card && ! card.classList.contains( 'is-gone' ) ? card.getBoundingClientRect() : null;
			const bg = slides[ target ].querySelector( '.rf-tco__bg' );

			showText( -1 );
			busy = true;

			const finish = () => {
				slides.forEach( ( s, i ) => s.classList.toggle( 'is-active', i === target ) );
				active = target;
				showText( active );
				layoutCards();
				progress();
				restartTimer();
				busy = false;
			};

			if ( ! from || ! speed || ! bg ) {
				finish();
				return;
			}

			// The card grows into the slide: a copy of its picture, from the card's box to the whole widget.
			const box = root.getBoundingClientRect();
			const grow = document.createElement( 'div' );
			grow.className = 'rf-tco__grow';
			grow.style.backgroundImage = getComputedStyle( bg ).backgroundImage;
			grow.style.backgroundColor = getComputedStyle( bg ).backgroundColor;
			slides[ active ].parentNode.appendChild( grow );
			card.classList.add( 'is-gone' );

			const frames = [
				{ left: ( from.left - box.left ) + 'px', top: ( from.top - box.top ) + 'px', width: from.width + 'px', height: from.height + 'px', borderRadius: '14px' },
				{ left: '0px', top: '0px', width: box.width + 'px', height: box.height + 'px', borderRadius: '0px' },
			];

			// The other cards move along at the same time.
			const keep = active;
			active = target;
			layoutCards();
			active = keep;

			const anim = grow.animate ? grow.animate( frames, { duration: speed, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' } ) : null;
			const done = () => {
				finish();
				grow.remove();
			};

			if ( anim ) {
				anim.onfinish = done;
			} else {
				window.setTimeout( done, speed );
			}
		}

		const next = () => go( active + 1 );
		const prev = () => go( active - 1 );
		const onTimer = ( e ) => {
			if ( 'rf-tco-timer' === e.animationName ) {
				next();
			}
		};
		const onResize = () => layoutCards( true );
		const onKey = ( e ) => {
			if ( 'ArrowRight' === e.key ) {
				next();
			} else if ( 'ArrowLeft' === e.key ) {
				prev();
			}
		};

		cards.forEach( ( card, i ) => card.addEventListener( 'click', () => go( i ) ) );
		const nextBtn = root.querySelector( '.rf-tco__next' );
		const prevBtn = root.querySelector( '.rf-tco__prev' );

		if ( nextBtn ) {
			nextBtn.addEventListener( 'click', next );
		}

		if ( prevBtn ) {
			prevBtn.addEventListener( 'click', prev );
		}

		if ( timerBar ) {
			timerBar.addEventListener( 'animationend', onTimer );
		}

		root.addEventListener( 'keydown', onKey );
		window.addEventListener( 'resize', onResize );

		slides[ 0 ].classList.add( 'is-active' );
		showText( 0 );
		layoutCards( true );
		progress();
		restartTimer();

		root.rfTco = {
			go,
			next,
			active: () => active,
			destroy() {
				window.removeEventListener( 'resize', onResize );
			},
		};
	}

	function scan( scope ) {
		Array.prototype.forEach.call( ( scope || document ).querySelectorAll( '.rf-tco' ), setup );
	}

	function hookIntoEditor( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks && fe.isEditMode && fe.isEditMode() ) {
			fe.hooks.addAction( 'frontend/element_ready/refraction-slides.default', ( $scope ) => $scope && $scope[ 0 ] && scan( $scope[ 0 ] ) );
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
