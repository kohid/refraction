import Base from 'refraction-frontend/handlers/base';

/**
 * Showcase Wheel (0.113.0). One slide shows at a time; moving on, the slides cross-fade (CSS on .is-active /
 * .is-leaving) and the pictures move:
 *  - wheel: each picture turns about a point far off to its outer side, so it travels along a large arc, the old one out
 *    one way and the new one in from the other (the reference: out below, in from above), turning as it goes;
 *  - slide: the pictures slide across; fade: no picture motion.
 * Thumbnails, arrows, the arrow keys and a swipe pick a slide; off Edit Mode it can play by itself. In Edit Mode it
 * follows the slide picked in the panel and rebuilds when slides come and go.
 */
const EASINGS = {
	smooth: 'cubic-bezier(0.65, 0, 0.35, 1)',
	snappy: 'cubic-bezier(0.2, 0.9, 0.1, 1)',
	gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
	spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
	linear: 'linear',
};

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
			easing: EASINGS[ s.easing ] || EASINGS.smooth,
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
		this.motion = this.pictureMotion( from, to, step );
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
		if ( [ 'transition', 'swing', 'duration', 'easing', 'autoplay', 'interval', 'pause_on_hover' ].includes( propertyName ) ) {
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
