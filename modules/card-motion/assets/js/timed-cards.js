/**
 * The "Timed cards" slider engine, shared by the Slides widget's Timed cards layout (slides-cards.js) and the Timed
 * Slides widget (modules/timed-slides): the current slide fills the slider, the slides after it wait as cards in a
 * row, and going to a slide grows its card from where it sits to the whole slider while the others slide along. A
 * line at the top times each slide (its animationend moves on); a second line and a counter show the progress.
 * YouTube slides play their video, the timer line follows it and its end moves on.
 */
import { slideVideo } from '../../../pro-widgets/assets/js/frontend/handlers/slides-video';

export const reducedMotion = () => !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );

const pad = ( n ) => ( n < 10 ? '0' : '' ) + n;

/**
 * Transitions other than "grow" (the card grows into the slider): keyframes for the new slide's picture (a copy laid
 * over the slider) and, for some, for the slide going away. dir is 1 going forward, -1 going back (directions
 * mirror). at is the clicked card's centre in % of the slider, for the circle.
 *
 * @param {string} effect
 * @param {number} dir
 * @param {Object} at     { x, y }
 * @return {{ in: Array, out: Array|null }|null} null for an unknown effect.
 */
export function transitionFrames( effect, dir, at ) {
	const d = dir < 0 ? -1 : 1;
	const at2 = `${ at.x }% ${ at.y }%`;

	switch ( effect ) {
		case 'fade':
			return { in: [ { opacity: 0 }, { opacity: 1 } ], out: null };
		case 'slide':
			return { in: [ { transform: `translateX(${ 100 * d }%)` }, { transform: 'translateX(0)' } ], out: [ { transform: 'translateX(0)' }, { transform: `translateX(${ -30 * d }%)` } ] };
		case 'slide-up':
			return { in: [ { transform: `translateY(${ 100 * d }%)` }, { transform: 'translateY(0)' } ], out: [ { transform: 'translateY(0)' }, { transform: `translateY(${ -30 * d }%)` } ] };
		case 'zoom-in':
			return { in: [ { opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(1)' } ], out: [ { transform: 'scale(1)' }, { transform: 'scale(0.92)' } ] };
		case 'zoom-out':
			return { in: [ { opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'scale(1)' } ], out: [ { opacity: 1, transform: 'scale(1)' }, { opacity: 0.4, transform: 'scale(1.12)' } ] };
		case 'blur':
			return { in: [ { opacity: 0, filter: 'blur(24px)', transform: 'scale(1.05)' }, { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' } ], out: null };
		case 'circle':
			return { in: [ { clipPath: `circle(0% at ${ at2 })` }, { clipPath: `circle(150% at ${ at2 })` } ], out: null };
		case 'wipe':
			return { in: [ { clipPath: d > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' } ], out: null };
		case 'wipe-up':
			return { in: [ { clipPath: d > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' } ], out: null };
		case 'curtain':
			return { in: [ { clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' } ], out: null };
		case 'diagonal':
			return { in: [ { clipPath: d > 0 ? 'polygon(100% 100%, 100% 100%, 100% 100%)' : 'polygon(0 0, 0 0, 0 0)' }, { clipPath: d > 0 ? 'polygon(100% 100%, -100% 100%, 100% -100%)' : 'polygon(0 0, 200% 0, 0 200%)' } ], out: null };
		case 'flip':
			return { in: [ { opacity: 0, transform: `perspective(1400px) rotateY(${ 70 * d }deg)`, transformOrigin: d > 0 ? 'right center' : 'left center' }, { opacity: 1, transform: 'perspective(1400px) rotateY(0deg)', transformOrigin: d > 0 ? 'right center' : 'left center' } ], out: [ { opacity: 1, transform: 'perspective(1400px) rotateY(0deg)', transformOrigin: d > 0 ? 'left center' : 'right center' }, { opacity: 0.3, transform: `perspective(1400px) rotateY(${ -40 * d }deg)`, transformOrigin: d > 0 ? 'left center' : 'right center' } ] };
	}

	return null;
}

/**
 * Parts: slides (.rf-tco__slide layers), texts (each slide's content, shown with .is-active), cards (.rf-tco__card
 * buttons, may be empty), sounds (each slide's sound button or null), timer (.rf-tco__timer i), line (the progress
 * line's i), count (the counter), next and prev (buttons), onChange (called with the new index).
 *
 * @param {Element} root  The .rf-tco element (keyboard, CSS variables, is-playing).
 * @param {Object}  cfg   { autoplay, interval, speed }.
 * @param {Object}  parts See above.
 * @return {Object|null} go( index, instant ), next(), prev(), active(), destroy().
 */
export function timedCards( root, cfg, parts ) {
	const { slides, texts = [], cards = [], sounds = [], timer: timerBar, line, count, onChange = () => {} } = parts;
	const n = slides.length;

	if ( ! n ) {
		return null;
	}

	const speed = reducedMotion() ? 0 : ( Number( cfg.speed ) || 900 );
	const listeners = [];
	const listen = ( el, type, fn ) => {
		if ( el ) {
			el.addEventListener( type, fn );
			listeners.push( () => el.removeEventListener( type, fn ) );
		}
	};
	let active = 0;
	let busy = false;
	let grow = null;

	root.style.setProperty( '--rf-tco-speed', speed + 'ms' );
	root.style.setProperty( '--rf-tco-interval', ( Number( cfg.interval ) || 5000 ) + 'ms' );

	/**
	 * Cards after the active slide, in order; the active slide's own card waits (hidden) at the end.
	 * @param {boolean} instant
	 */
	function layoutCards( instant ) {
		const step = cards[ 0 ] ? cards[ 0 ].getBoundingClientRect().width + ( parseFloat( getComputedStyle( root ).getPropertyValue( '--rf-tco-gap' ) ) || 18 ) : 0;

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
			if ( t ) {
				t.classList.toggle( 'is-active', i === index );
				t.setAttribute( 'aria-hidden', i === index ? 'false' : 'true' );
			}
		} );
	}

	function progress() {
		if ( line ) {
			line.style.width = ( ( active + 1 ) / n * 100 ) + '%';
		}

		if ( count ) {
			count.textContent = pad( active + 1 );
		}

		sounds.forEach( ( sound, i ) => sound && sound.classList.toggle( 'is-current', i === active ) );
	}

	const videos = slides.map( ( slide, i ) => {
		const box = slide.querySelector( '.refraction-slide__video' );

		return box ? {
			next: '1' === box.getAttribute( 'data-rf-yt-next' ),
			player: slideVideo( box, {
				sound: sounds[ i ] || null,
				onProgress: ( share ) => {
					if ( timerBar && i === active ) {
						timerBar.style.width = ( share * 100 ) + '%';
					}
				},
				onEnd: () => {
					if ( i === active && '1' === box.getAttribute( 'data-rf-yt-next' ) && n > 1 ) {
						go( active + 1 );
					}
				},
			} ),
		} : null;
	} );
	const waitsForVideo = () => !! ( videos[ active ] && videos[ active ].player.has && videos[ active ].next );

	function syncVideos() {
		videos.forEach( ( video, i ) => {
			if ( video ) {
				if ( i === active ) {
					video.player.play();
				} else {
					video.player.pause();
				}
			}
		} );
	}

	/** Restarts the timer line; when it fills, the next slide comes. A video slide waits for its video instead. */
	function restartTimer() {
		root.classList.remove( 'is-playing' );

		if ( timerBar ) {
			timerBar.style.width = '';
		}

		if ( waitsForVideo() ) {
			return;
		}

		if ( cfg.autoplay && n > 1 && ! reducedMotion() ) {
			// Reflow, so the animation starts again from zero.
			if ( timerBar ) {
				timerBar.getBoundingClientRect();
			}

			root.classList.add( 'is-playing' );
		}
	}

	function finish( target ) {
		slides.forEach( ( s, i ) => s.classList.toggle( 'is-active', i === target ) );
		active = target;
		showText( active );
		layoutCards();
		progress();
		restartTimer();
		syncVideos();
		busy = false;
		onChange( active );
	}

	/**
	 * @param {number}  target
	 * @param {boolean} instant No animation (the editor's selected slide).
	 * @param {number}  dir     1 forward (the default), -1 back.
	 */
	function go( target, instant, dir = 1 ) {
		target = ( ( target % n ) + n ) % n;

		if ( busy || target === active ) {
			return;
		}

		const card = cards[ target ];
		const from = card && ! card.classList.contains( 'is-gone' ) ? card.getBoundingClientRect() : null;
		const bg = slides[ target ].querySelector( '.rf-tco__bg' );

		showText( -1 );
		busy = true;

		const effect = cfg.effect && 'grow' !== cfg.effect ? cfg.effect : 'grow';

		if ( 'grow' !== effect && ! instant && speed && bg ) {
			transition( target, effect, dir, from, bg );
			return;
		}

		if ( instant || ! from || ! from.width || ! speed || ! bg ) {
			finish( target );
			return;
		}

		// The card grows into the slide: a copy of its picture, from the card's box to the whole slider.
		const box = root.getBoundingClientRect();
		const radius = getComputedStyle( card ).borderTopLeftRadius || '14px';
		grow = document.createElement( 'div' );
		grow.className = 'rf-tco__grow';
		grow.style.backgroundImage = getComputedStyle( bg ).backgroundImage;
		grow.style.backgroundColor = getComputedStyle( bg ).backgroundColor;
		slides[ active ].parentNode.appendChild( grow );
		card.classList.add( 'is-gone' );

		const frames = [
			{ left: ( from.left - box.left ) + 'px', top: ( from.top - box.top ) + 'px', width: from.width + 'px', height: from.height + 'px', borderRadius: radius },
			{ left: '0px', top: '0px', width: box.width + 'px', height: box.height + 'px', borderRadius: '0px' },
		];

		// The other cards move along at the same time.
		const keep = active;
		active = target;
		layoutCards();
		active = keep;

		const layer = grow;
		const anim = layer.animate ? layer.animate( frames, { duration: speed, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' } ) : null;
		const done = () => {
			finish( target );
			layer.remove();
			grow = null;
		};

		if ( anim ) {
			anim.onfinish = done;
		} else {
			window.setTimeout( done, speed );
		}
	}

	/**
	 * Any transition but "grow": the new slide's picture, laid over the whole slider, comes in with the effect's
	 * keyframes (and the slide going away moves too, for some); then the slides switch at once underneath.
	 *
	 * @param {number}       target
	 * @param {string}       effect
	 * @param {number}       dir
	 * @param {DOMRect|null} from   The clicked card's box (the circle opens from its centre).
	 * @param {Element}      bg     The new slide's background.
	 */
	function transition( target, effect, dir, from, bg ) {
		const box = root.getBoundingClientRect();
		const at = from && from.width ? { x: Math.round( ( ( from.left + ( from.width / 2 ) - box.left ) / box.width ) * 100 ), y: Math.round( ( ( from.top + ( from.height / 2 ) - box.top ) / box.height ) * 100 ) } : { x: 50, y: 50 };
		const frames = transitionFrames( effect, dir, at );

		if ( ! frames || ! document.body.animate ) {
			finish( target );
			return;
		}

		grow = document.createElement( 'div' );
		grow.className = 'rf-tco__grow rf-tco__grow--full';
		grow.style.backgroundImage = getComputedStyle( bg ).backgroundImage;
		grow.style.backgroundColor = getComputedStyle( bg ).backgroundColor;

		// The slide's shade too, so the picture does not darken when the real slide takes over.
		const shade = slides[ target ].querySelector( '.refraction-slide__overlay' );

		if ( shade ) {
			const copy = document.createElement( 'div' );
			const cs = getComputedStyle( shade );

			copy.style.cssText = `position:absolute;inset:0;background:${ cs.background };opacity:${ cs.opacity };mix-blend-mode:${ cs.mixBlendMode };`;
			grow.appendChild( copy );
		}
		slides[ active ].parentNode.appendChild( grow );

		if ( cards[ target ] ) {
			cards[ target ].classList.add( 'is-gone' );
		}

		const keep = active;
		active = target;
		layoutCards();
		active = keep;

		const timing = { duration: speed, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' };
		const layer = grow;
		const leaving = slides[ keep ];
		const out = frames.out ? leaving.animate( frames.out, timing ) : null;

		layer.animate( frames.in, timing ).onfinish = () => {
			// Switch the slides at once under the copy, then take the copy and the old slide's motion away.
			[ leaving, slides[ target ] ].forEach( ( s ) => {
				s.style.transition = 'none';
			} );
			finish( target );
			leaving.getBoundingClientRect();

			if ( out ) {
				out.cancel();
			}

			layer.remove();
			grow = null;
			[ leaving, slides[ target ] ].forEach( ( s ) => {
				s.style.transition = '';
			} );
		};
	}

	const next = () => go( active + 1, false, 1 );
	const prev = () => go( active - 1, false, -1 );

	cards.forEach( ( card, i ) => listen( card, 'click', () => go( i, false, 1 ) ) );
	listen( parts.next, 'click', next );
	listen( parts.prev, 'click', prev );
	listen( timerBar, 'animationend', ( e ) => {
		if ( 'rf-tco-timer' === e.animationName ) {
			next();
		}
	} );
	listen( root, 'keydown', ( e ) => {
		// Not while typing in a field inside a slide.
		if ( e.target.closest && e.target.closest( 'input, textarea, select, [contenteditable="true"]' ) ) {
			return;
		}

		if ( 'ArrowRight' === e.key ) {
			next();
		} else if ( 'ArrowLeft' === e.key ) {
			prev();
		}
	} );

	// Card size can change without a window resize (responsive settings, the editor, fonts): lay the row out again.
	const relayout = () => layoutCards( true );
	listen( window, 'resize', relayout );
	const resizeObserver = window.ResizeObserver && cards[ 0 ] ? new ResizeObserver( relayout ) : null;

	if ( resizeObserver ) {
		resizeObserver.observe( cards[ 0 ] );
	}

	slides.forEach( ( s, i ) => s.classList.toggle( 'is-active', 0 === i ) );
	showText( 0 );
	layoutCards( true );
	progress();
	restartTimer();
	syncVideos();

	return {
		go,
		next,
		prev,
		active: () => active,
		destroy() {
			listeners.forEach( ( off ) => off() );

			if ( resizeObserver ) {
				resizeObserver.disconnect();
			}

			if ( grow ) {
				grow.remove();
			}

			root.classList.remove( 'is-playing' );
			videos.forEach( ( video ) => video && video.player.destroy() );
		},
	};
}
