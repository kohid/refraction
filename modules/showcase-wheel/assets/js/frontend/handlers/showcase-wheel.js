import Base from 'refraction-frontend/handlers/base';
import { easing } from 'refraction-frontend/utils/motion-easings';

/**
 * Showcase Wheel (0.113.0). One slide shows at a time; moving on, the slides cross-fade (CSS on .is-active /
 * .is-leaving) and the pictures move:
 *  - wheel: each picture turns about a point far off to its outer side, so it travels along a large arc, the old one out
 *    one way and the new one in from the other (the reference: out below, in from above), turning as it goes;
 *  - slide: the pictures slide across; fade: no picture motion.
 * Thumbnails, arrows, the arrow keys and a swipe pick a slide; off Edit Mode it can play by itself. In Edit Mode it
 * follows the slide picked in the panel and rebuilds when slides come and go.
 *
 * The new slide's content can come in its own way (0.116.0): the widgets of its Content container rise, drop, slide,
 * grow, come into focus, wipe up or swing in, together or one after another.
 */

// How far the wheel turns a picture out of (or into) sight, in degrees.
const SWING = 62;

export default class ShowcaseWheel extends Base {
	getDefaultSettings() {
		return { selectors: { root: '.rf-sw', slots: '.rf-sw__slots' } };
	}

	getDefaultElements() {
		const s = this.getSettings( 'selectors' );

		return { $root: this.findElement( s.root ), $slots: this.findElement( s.slots ) };
	}

	options() {
		const s = this.getElementSettings();

		return {
			transition: [ 'wheel', 'slide', 'fade' ].includes( s.transition ) ? s.transition : 'wheel',
			fromBelow: 'bottom' === s.swing,
			duration: Math.max( 100, Math.min( 3000, Number( s.duration ) || 800 ) ),
			easing: easing( s.easing ),
			content: [ 'none', 'fade-up', 'fade-down', 'slide', 'zoom', 'blur', 'mask', 'tilt' ].includes( s.content_motion ) ? s.content_motion : 'fade-up',
			stagger: 'yes' === s.content_stagger,
			gap: Math.max( 0, Math.min( 1000, Number( s.content_gap ?? 90 ) || 0 ) ),
			delay: Math.max( 0, Math.min( 3000, Number( s.content_delay ?? 200 ) || 0 ) ),
			contentDuration: Math.max( 100, Math.min( 3000, Number( s.content_duration ) || 700 ) ),
			distance: Math.max( 0, Math.min( 300, Number( s.content_distance ?? 40 ) || 0 ) ),
			contentEasing: easing( s.content_easing || 'glide' ),
			autoplay: 'yes' === s.autoplay,
			interval: Math.max( 1000, Number( s.interval ) || 4000 ),
			pause: 'yes' === s.pause_on_hover,
		};
	}

	/**
	 * This widget's own parts (never those of a widget inside a slide).
	 * @param {string} selector
	 */
	own( selector ) {
		const root = this.elements.$root[ 0 ];

		return root ? Array.from( root.querySelectorAll( selector ) ).filter( ( el ) => el.closest( '.rf-sw' ) === root ) : [];
	}

	/**
	 * Shows slide i; step: +1 forwards, -1 backwards (which way the pictures move).
	 * @param {number}  i
	 * @param {number}  step
	 * @param {boolean} instant
	 */
	go( i, step = 1, instant = false ) {
		const n = this.slots.length;

		if ( ! n ) {
			return;
		}

		i = ( ( i % n ) + n ) % n;

		if ( i === this.current && ! instant ) {
			return;
		}

		this.finishMotion();

		const from = this.slots[ this.current ];
		const to = this.slots[ i ];
		const reduce = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		this.slots.forEach( ( slot, k ) => {
			slot.classList.toggle( 'is-active', k === i );
			slot.classList.remove( 'is-leaving' );
			slot.setAttribute( 'aria-hidden', k === i ? 'false' : 'true' );
		} );
		this.thumbs.forEach( ( thumb, k ) => {
			thumb.classList.toggle( 'is-active', k === i );
			thumb.setAttribute( 'aria-selected', k === i ? 'true' : 'false' );
		} );

		const previous = this.current;
		this.current = i;
		this.$element[ 0 ].dispatchEvent( new CustomEvent( 'rf-showcase-wheel:change', { detail: { index: i } } ) );

		if ( instant || reduce || ! from || previous === i ) {
			return;
		}

		from.classList.add( 'is-leaving' );
		this.motion = this.pictureMotion( from, to, step ).concat( this.contentMotion( to, step ) );
		this.leaveTimer = window.setTimeout( () => from.classList.remove( 'is-leaving' ), this.opts.duration );
	}

	/**
	 * The pictures' motion for a change from one slide to another.
	 * @param {HTMLElement} from
	 * @param {HTMLElement} to
	 * @param {number}      step
	 */
	pictureMotion( from, to, step ) {
		const o = this.opts;
		const animations = [];

		if ( 'fade' === o.transition ) {
			return animations;
		}

		const out = from.querySelector( ':scope > .rf-sw__visual .rf-sw__picture' );
		const into = to.querySelector( ':scope > .rf-sw__visual .rf-sw__picture' );
		const timing = { duration: o.duration, easing: o.easing };

		// +1: the picture sits on the right of its slide (content on the left), so its wheel turns about a point to its right.
		const sideOf = ( slot ) => ( slot.classList.contains( 'rf-sw__slot--right' ) ? -1 : 1 );
		// Forwards the new picture comes from above (or below, if chosen); backwards the other way round.
		const way = ( o.fromBelow ? -1 : 1 ) * ( step < 0 ? -1 : 1 );

		const move = ( el, slot, entering ) => {
			if ( ! el ) {
				return;
			}

			const side = sideOf( slot );
			let away;

			if ( 'wheel' === o.transition ) {
				el.style.transformOrigin = 1 === side ? '190% 50%' : '-90% 50%';
				// Entering from above means turning in from the angle that puts the picture above its place.
				const angle = SWING * way * side * ( entering ? 1 : -1 );
				away = `rotate(${ angle }deg)`;
			} else {
				away = `translateX(${ ( entering ? 1 : -1 ) * way * 70 }%)`;
			}

			// Coming in, it is fully there a third of the way; the turn runs the whole time.
			const frames = entering
				? [ { transform: away, opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 } ]
				: [ { transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.55 }, { transform: away, opacity: 0 } ];

			animations.push( el.animate( frames, timing ) );
		};

		move( out, from, false );
		move( into, to, true );

		return animations;
	}

	/**
	 * What comes in with a slide: the widgets of its Content container (one after another), or its parts as one.
	 * @param {HTMLElement} slot
	 */
	contentItems( slot ) {
		const slide = slot.querySelector( ':scope > .e-con' );

		if ( ! slide ) {
			return [];
		}

		const kids = ( el ) => Array.from( ( el.querySelector( ':scope > .e-con-inner' ) || el ).children ).filter( ( c ) => c.classList.contains( 'refraction-element' ) );
		const parts = kids( slide );

		if ( ! this.opts.stagger ) {
			return parts;
		}

		// The widgets of the containers in the slide, in order (a part that is not a container comes in as it is).
		return parts.flatMap( ( part ) => ( part.classList.contains( 'e-con' ) && kids( part ).length ? kids( part ) : [ part ] ) );
	}

	/**
	 * The new slide's content coming in.
	 * @param {HTMLElement} to
	 * @param {number}      step
	 */
	contentMotion( to, step ) {
		const o = this.opts;

		if ( 'none' === o.content ) {
			return [];
		}

		const d = o.distance;
		const way = step < 0 ? -1 : 1;
		const from = {
			'fade-up': { transform: `translateY(${ d }px)`, opacity: 0 },
			'fade-down': { transform: `translateY(${ -d }px)`, opacity: 0 },
			slide: { transform: `translateX(${ way * d * 2 }px)`, opacity: 0 },
			zoom: { transform: 'scale(0.9)', opacity: 0 },
			blur: { filter: 'blur(12px)', opacity: 0 },
			mask: { clipPath: 'inset(0 0 100% 0)', transform: `translateY(${ Math.round( d / 2 ) }px)`, opacity: 0 },
			tilt: { transform: `translateY(${ d }px) rotate(${ way * 6 }deg)`, transformOrigin: '0 100%', opacity: 0 },
		}[ o.content ];
		const rest = { transform: 'none', filter: 'none', clipPath: 'inset(0 0 0% 0)', opacity: 1 };
		const done = {};

		Object.keys( from ).forEach( ( k ) => {
			done[ k ] = 'transformOrigin' === k ? from[ k ] : rest[ k ];
		} );

		return this.contentItems( to ).map( ( el, k ) => el.animate( [ from, done ], {
			duration: o.contentDuration,
			easing: o.contentEasing,
			delay: o.delay + ( o.stagger ? k * o.gap : 0 ),
			fill: 'backwards',
		} ) );
	}

	finishMotion() {
		window.clearTimeout( this.leaveTimer );
		( this.motion || [] ).forEach( ( a ) => {
			try {
				a.finish();
			} catch ( e ) {}
		} );
		this.motion = [];
		( this.slots || [] ).forEach( ( slot ) => slot.classList.remove( 'is-leaving' ) );
	}

	next( step = 1 ) {
		this.go( this.current + step, step );
	}

	// ---------------------------------------------------------------- playing by itself

	play() {
		this.stop();

		if ( this.opts.autoplay && ! this.isEdit && this.slots.length > 1 && ! this.paused ) {
			this.timer = window.setTimeout( () => {
				this.next();
				this.play();
			}, this.opts.interval );
		}
	}

	stop() {
		window.clearTimeout( this.timer );
	}

	// ---------------------------------------------------------------- building

	build() {
		this.unbind();
		this.finishMotion();

		const root = this.elements.$root[ 0 ];

		if ( ! root ) {
			return;
		}

		this.opts = this.options();
		this.slots = this.own( '.rf-sw__slot' );
		this.thumbs = this.own( '.rf-sw__thumb' );
		root.style.setProperty( '--rf-sw-duration', this.opts.duration + 'ms' );
		root.style.setProperty( '--rf-sw-easing', this.opts.easing );

		const picked = this.isEdit ? ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1 : 0;
		this.current = -1;
		this.go( Math.min( Math.max( 0, picked ), Math.max( 0, this.slots.length - 1 ) ), 1, true );
		// Drawn in place before the transitions are on, so nothing fades in on load.
		void root.offsetHeight;
		root.classList.add( 'is-ready' );
		this.bind();
		this.play();

		if ( this.isEdit ) {
			this.editDrag( root );
		}
	}

	/**
	 * Editor preview only (0.119.0): the current slide's floating images and its picture can be dragged into place.
	 * While dragging they follow the pointer (inline custom properties); let go, the slide's own settings are written for
	 * the screen size shown (Across / Down of the floating image, or Move the picture), in % of the picture's space,
	 * through $e so it can be undone like any other change.
	 *
	 * @param {HTMLElement} root
	 */
	editDrag( root ) {
		const editor = window.parent;

		if ( root.rfSwDrag || ! editor || editor === window || ! editor.$e || ! editor.refraction ) {
			return;
		}

		root.rfSwDrag = true;
		root.classList.add( 'rf-sw--edit' );

		const widgetId = this.$element.attr( 'data-id' );
		const itemOf = ( slot ) => {
			const container = editor.refraction.getContainer( widgetId );
			const index = this.own( '.rf-sw__slot' ).indexOf( slot );

			return container?.repeaters?.slides?.children?.[ index ];
		};
		const round = ( n ) => Math.round( n * 10 ) / 10;

		root.addEventListener( 'pointerdown', ( event ) => {
			const target = event.target.closest( '.rf-sw__float, .rf-sw__img' );
			const slot = target && target.closest( '.rf-sw__slot' );
			const picture = target && target.closest( '.rf-sw__picture' );

			if ( ! target || ! slot || ! picture || ! slot.classList.contains( 'is-active' ) || 0 !== event.button || target.closest( '.rf-sw' ) !== root ) {
				return;
			}

			const item = itemOf( slot );

			if ( ! item ) {
				return;
			}

			const isFloat = target.classList.contains( 'rf-sw__float' );
			const box = picture.getBoundingClientRect();
			const x0 = event.clientX;
			const y0 = event.clientY;
			const mode = editor.refraction.channels.deviceMode.request( 'currentMode' ) || 'desktop';
			const suffix = 'desktop' === mode ? '' : '_' + mode;
			let moved = false;
			let result = null;

			// A floating image: its middle, in % of the picture's space.
			const own = target.getBoundingClientRect();
			const fx0 = ( ( own.left + ( own.width / 2 ) ) - box.left ) / box.width * 100;
			const fy0 = ( ( own.top + ( own.height / 2 ) ) - box.top ) / box.height * 100;

			// The picture: its move, in the unit it already has (% of the picture's space by default).
			const current = ( key ) => {
				const v = item.settings.get( key + suffix ) || item.settings.get( key ) || {};
				return { unit: 'px' === v.unit ? 'px' : '%', size: Number( v.size ) || 0 };
			};
			const px0 = current( 'pic_x' );
			const py0 = current( 'pic_y' );

			const move = ( e ) => {
				if ( ! moved && Math.hypot( e.clientX - x0, e.clientY - y0 ) < 4 ) {
					return;
				}

				moved = true;
				target.classList.add( 'is-dragging' );
				const dx = e.clientX - x0;
				const dy = e.clientY - y0;

				if ( isFloat ) {
					result = { x: round( fx0 + ( dx / box.width * 100 ) ), y: round( fy0 + ( dy / box.height * 100 ) ) };
					target.style.setProperty( '--rf-sw-fx', result.x + '%' );
					target.style.setProperty( '--rf-sw-fy', result.y + '%' );
				} else {
					const step = ( start, d, size ) => round( start.size + ( 'px' === start.unit ? d : d / size * 100 ) );
					result = { x: step( px0, dx, box.width ), y: step( py0, dy, box.height ) };
					picture.style.setProperty( '--rf-sw-pic-x', result.x + px0.unit );
					picture.style.setProperty( '--rf-sw-pic-y', result.y + py0.unit );
				}
			};

			const up = () => {
				window.removeEventListener( 'pointermove', move );
				window.removeEventListener( 'pointerup', up );
				window.removeEventListener( 'pointercancel', up );

				if ( ! moved || ! result ) {
					return;
				}

				const settings = {};

				if ( isFloat ) {
					const n = target.dataset.float;
					settings[ `fl${ n }_x${ suffix }` ] = { unit: '%', size: result.x, sizes: [] };
					settings[ `fl${ n }_y${ suffix }` ] = { unit: '%', size: result.y, sizes: [] };
				} else {
					settings[ `pic_x${ suffix }` ] = { unit: px0.unit, size: result.x, sizes: [] };
					settings[ `pic_y${ suffix }` ] = { unit: py0.unit, size: result.y, sizes: [] };
				}

				editor.$e.run( 'document/elements/settings', { container: item, settings, options: { external: true } } );

				// The printed CSS takes over from the inline place.
				window.setTimeout( () => {
					[ '--rf-sw-fx', '--rf-sw-fy' ].forEach( ( v ) => target.style.removeProperty( v ) );
					[ '--rf-sw-pic-x', '--rf-sw-pic-y' ].forEach( ( v ) => picture.style.removeProperty( v ) );
					target.classList.remove( 'is-dragging' );
				}, 120 );
			};

			event.preventDefault();
			event.stopPropagation();
			window.addEventListener( 'pointermove', move );
			window.addEventListener( 'pointerup', up );
			window.addEventListener( 'pointercancel', up );
		} );
	}

	bind() {
		const root = this.elements.$root[ 0 ];
		const on = ( el, type, fn, opts ) => {
			el.addEventListener( type, fn, opts );
			this.listeners.push( () => el.removeEventListener( type, fn, opts ) );
		};

		this.listeners = [];

		on( root, 'click', ( event ) => {
			const thumb = event.target.closest( '.rf-sw__thumb' );
			const arrow = event.target.closest( '.rf-sw__arrow' );

			if ( thumb && thumb.closest( '.rf-sw' ) === root ) {
				const i = Number( thumb.dataset.index );
				this.go( i, i < this.current ? -1 : 1 );
				this.play();
			} else if ( arrow && arrow.closest( '.rf-sw' ) === root ) {
				this.next( arrow.classList.contains( 'rf-sw__prev' ) ? -1 : 1 );
				this.play();
			}
		} );

		on( root, 'keydown', ( event ) => {
			if ( ! [ 'ArrowLeft', 'ArrowRight' ].includes( event.key ) || ( event.target !== root && ! event.target.closest( '.rf-sw__nav' ) ) ) {
				return;
			}

			event.preventDefault();
			this.next( 'ArrowRight' === event.key ? 1 : -1 );
			this.play();
		} );

		let start = null;

		on( root, 'pointerdown', ( event ) => {
			start = 'mouse' === event.pointerType ? null : event.clientX;
		} );
		on( root, 'pointerup', ( event ) => {
			if ( null === start ) {
				return;
			}

			const delta = event.clientX - start;
			start = null;

			if ( Math.abs( delta ) > 40 ) {
				this.next( delta < 0 ? 1 : -1 );
				this.play();
			}
		} );

		if ( this.opts.pause ) {
			const pause = () => {
				this.paused = true;
				this.stop();
			};
			const resume = () => {
				this.paused = false;
				this.play();
			};

			on( root, 'mouseenter', pause );
			on( root, 'mouseleave', resume );
			on( root, 'focusin', pause );
			on( root, 'focusout', resume );
		}
	}

	unbind() {
		this.stop();
		( this.listeners || [] ).forEach( ( off ) => off() );
		this.listeners = [];
	}

	onInit( ...args ) {
		super.onInit( ...args );
		this.build();

		// The editor adds, removes and moves slide containers without rendering the widget again.
		if ( this.isEdit && window.MutationObserver && this.elements.$slots[ 0 ] ) {
			this.mutations = new MutationObserver( () => {
				window.clearTimeout( this.rebuildTimer );
				this.rebuildTimer = window.setTimeout( () => this.build(), 60 );
			} );
			this.mutations.observe( this.elements.$slots[ 0 ], { childList: true } );
		}
	}

	onDestroy() {
		window.clearTimeout( this.rebuildTimer );

		if ( this.mutations ) {
			this.mutations.disconnect();
		}

		this.unbind();
		this.finishMotion();
		super.onDestroy();
	}

	onElementChange( propertyName ) {
		if ( [ 'transition', 'swing', 'duration', 'easing', 'autoplay', 'interval', 'pause_on_hover', 'content_motion', 'content_stagger', 'content_gap', 'content_delay', 'content_duration', 'content_distance', 'content_easing' ].includes( propertyName ) ) {
			this.build();
		}
	}

	onEditSettingsChange( propertyName ) {
		if ( 'activeItemIndex' === propertyName && this.slots ) {
			const i = ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1;
			this.go( i, i < this.current ? -1 : 1 );
		}
	}
}
