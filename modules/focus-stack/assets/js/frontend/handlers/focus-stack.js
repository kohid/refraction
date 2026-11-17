import Base from 'refraction-frontend/handlers/base';

/**
 * Focus Stack (0.110.0). The slides are containers; in each one the first container is its header, the last its
 * footer, the ones between its content. The current slide shows all of them; the slides around it wait as slim cards
 * showing only their header or footer (the next ones one part, the previous ones another), and those two away are
 * smaller and fainter.
 *
 * Moving on: every card that changes is given its old size and grows or shrinks to its new one (the Web Animations
 * API on width and height), so the stack flows like the reference: the waiting card opens into the current one, its
 * content fading in once there is room, while the old one folds into its slim card on the other side. Cards coming
 * into view grow from nothing; cards leaving shrink to nothing. Keyboard (arrows), a swipe, a click on a waiting card
 * and, off Edit Mode, playing by itself. In Edit Mode it follows the slide picked in the panel.
 */
const EASINGS = {
	smooth: 'cubic-bezier(0.65, 0, 0.35, 1)',
	snappy: 'cubic-bezier(0.2, 0.9, 0.1, 1)',
	gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
	spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
	linear: 'linear',
};

const STATES = [ 'is-active', 'is-waiting', 'is-near', 'is-far', 'is-hidden', 'is-before', 'is-after' ];

export default class FocusStack extends Base {
	getDefaultSettings() {
		return { selectors: { root: '.rf-fs', slides: '.rf-fs__slides' } };
	}

	getDefaultElements() {
		const s = this.getSettings( 'selectors' );

		return { $root: this.findElement( s.root ), $slides: this.findElement( s.slides ) };
	}

	/** The options: from the stack's data attribute on the site, from the widget's settings in Edit Mode. */
	options() {
		const root = this.elements.$root[ 0 ];

		if ( ! this.isEdit && root && root.dataset.rfFs ) {
			try {
				return JSON.parse( root.dataset.rfFs );
			} catch ( e ) {}
		}

		const s = this.getElementSettings();
		const horizontal = 'horizontal' === s.orientation;

		return {
			// Reversed: the next slides wait after the current one (below, or on the right).
			reverse: horizontal ? 'right' !== s.direction_h : 'up' === s.direction_v,
			next: 'footer' === s.next_part ? 'footer' : 'header',
			prev: 'header' === s.prev_part ? 'header' : 'footer',
			visible: Math.max( 0, Math.min( 2, parseInt( s.visible ?? 2, 10 ) || 0 ) ),
			loop: 'yes' === s.loop,
			duration: Math.max( 100, Math.min( 3000, Number( s.duration ) || 700 ) ),
			easing: s.easing || 'smooth',
			fade: 'yes' === s.fade_content,
			autoplay: 'yes' === s.autoplay,
			interval: Math.max( 800, Number( s.interval ) || 3000 ),
			pause: 'yes' === s.pause_on_hover,
			click: 'yes' === s.click_waiting,
			parts: ( s.slides || [] ).map( ( slide ) => ( [ 'header', 'footer' ].includes( slide.waiting_part ) ? slide.waiting_part : '' ) ),
		};
	}

	/** This stack's slides (never those of a stack inside a slide). */
	slides() {
		const box = this.elements.$slides[ 0 ];

		return box ? Array.from( box.children ).filter( ( el ) => el.classList.contains( 'e-con' ) ) : [];
	}

	/**
	 * A slide's parts and the element holding them (the slide, or its inner box when the container is boxed).
	 * @param {HTMLElement} slide
	 */
	parts( slide ) {
		const inner = Array.from( slide.children ).find( ( el ) => el.classList.contains( 'e-con-inner' ) );
		const holder = inner || slide;

		return { holder, parts: Array.from( holder.children ).filter( ( el ) => el.classList.contains( 'e-con' ) ) };
	}

	horizontal() {
		return this.$element[ 0 ].classList.contains( 'rf-fs-o-horizontal' );
	}

	/**
	 * Where slide i stands from the current one: 0 current, 1 next, -1 previous, null out of reach.
	 * @param {number} i
	 */
	offset( i ) {
		const n = this.list.length;
		let d = i - this.current;

		if ( this.opts.loop && n > 2 ) {
			d = ( ( d % n ) + n ) % n;
			d = d > n / 2 ? d - n : d;
		}

		return Math.abs( d ) <= this.opts.visible ? d : null;
	}

	/** The classes, order and shown part of every slide for the current slide. */
	place() {
		const o = this.opts;

		this.list.forEach( ( slide, i ) => {
			const d = this.offset( i );
			const waiting = null !== d && 0 !== d;
			// The next slides wait before the current one (above, or on the left) unless the stack moves the other way.
			const side = waiting && ( d > 0 ) === ! o.reverse ? -1 : 1;
			// The slide's own choice, else the side's.
			const keep = ( o.parts && o.parts[ i ] ) || ( d > 0 ? o.next : o.prev );

			slide.classList.remove( ...STATES );
			slide.classList.add( 'rf-fs__slide' );
			let place = 'is-waiting';

			if ( null === d ) {
				place = 'is-hidden';
			} else if ( 0 === d ) {
				place = 'is-active';
			}

			slide.classList.add( place );

			if ( waiting ) {
				slide.classList.add( 1 === Math.abs( d ) ? 'is-near' : 'is-far', side < 0 ? 'is-before' : 'is-after' );
			}

			// Visual place: what waits before the current slide comes first.
			slide.style.order = null === d ? '' : String( 10 + ( waiting ? side * Math.abs( d ) : 0 ) );
			slide.dataset.keep = waiting ? keep : '';
			slide.setAttribute( 'aria-hidden', 0 === d ? 'false' : 'true' );
			slide.tabIndex = waiting && o.click && ! this.isEdit ? 0 : -1;

			const { parts } = this.parts( slide );
			const shown = 'footer' === keep ? parts[ parts.length - 1 ] : parts[ 0 ];

			parts.forEach( ( part, k ) => {
				part.classList.add( 'rf-fs__part' );
				part.classList.toggle( 'rf-fs__part--header', 0 === k && parts.length > 1 );
				part.classList.toggle( 'rf-fs__part--footer', k === parts.length - 1 && parts.length > 1 );
				part.classList.toggle( 'is-shown', waiting && part === shown );
			} );
		} );
	}

	/**
	 * Moves to slide i.
	 * @param {number}  i
	 * @param {boolean} instant No motion (the first view, reduced motion).
	 */
	go( i, instant = false ) {
		const n = this.list.length;

		if ( ! n ) {
			return;
		}

		i = this.opts.loop ? ( ( i % n ) + n ) % n : Math.max( 0, Math.min( n - 1, i ) );

		if ( i === this.current && ! instant ) {
			return;
		}

		this.finishMotion();

		const reduce = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		if ( instant || reduce || ! this.ready ) {
			this.ready = true;
			this.current = i;
			this.place();
			this.$element[ 0 ].dispatchEvent( new CustomEvent( 'rf-focus-stack:change', { detail: { index: i } } ) );
			return;
		}

		const before = this.list.map( ( slide ) => ( slide.classList.contains( 'is-hidden' ) ? null : slide.getBoundingClientRect() ) );
		const wasActive = this.list.map( ( slide ) => slide.classList.contains( 'is-active' ) );
		const oldOrder = this.list.map( ( slide ) => slide.style.order );

		this.current = i;
		this.place();
		this.$element[ 0 ].dispatchEvent( new CustomEvent( 'rf-focus-stack:change', { detail: { index: i } } ) );
		this.animate( before, wasActive, oldOrder );
	}

	animate( before, wasActive, oldOrder ) {
		const o = this.opts;
		const duration = o.duration;
		const easing = EASINGS[ o.easing ] || EASINGS.smooth;
		const after = this.list.map( ( slide ) => ( slide.classList.contains( 'is-hidden' ) ? null : slide.getBoundingClientRect() ) );
		const size = ( r ) => ( { width: r.width + 'px', height: r.height + 'px' } );
		const flat = this.horizontal() ? { width: '0px' } : { height: '0px' };

		this.list.forEach( ( slide, i ) => {
			const from = before[ i ];
			const to = after[ i ];

			if ( ! from && ! to ) {
				return;
			}

			const isActive = slide.classList.contains( 'is-active' );
			const changed = ! from || ! to || wasActive[ i ] !== isActive || Math.abs( from.width - to.width ) > 0.5 || Math.abs( from.height - to.height ) > 0.5;

			if ( ! changed ) {
				return;
			}

			const { holder, parts } = this.parts( slide );
			// The part that stays in sight while the card grows or folds: its kept part (or, opening, the part it showed).
			const keep = slide.dataset.keep || ( wasActive[ i ] ? '' : this.keptBefore.get( slide ) ) || 'header';

			slide.classList.add( 'is-moving' );
			holder.style.justifyContent = 'footer' === keep ? 'flex-end' : 'flex-start';

			if ( ! to ) {
				// Leaving: back in sight at its old place, then shrinking to nothing.
				slide.classList.add( 'is-leaving' );
				slide.style.order = oldOrder[ i ];
			}

			const frames = [
				from ? { ...size( from ), opacity: getComputedStyle( slide ).opacity } : { ...flat, opacity: 0 },
				to ? { ...size( to ) } : { ...flat, opacity: 0 },
			];

			if ( ! from ) {
				frames[ 1 ].opacity = getComputedStyle( slide ).opacity;
			}

			this.motion.push( slide.animate( frames, { duration, easing } ) );

			// The content of the card that opens fades in once it has room; that of the card that folds fades out.
			if ( o.fade && wasActive[ i ] !== isActive ) {
				parts.forEach( ( part ) => {
					// Opening: all but the part it showed while waiting. Folding: all but the part it now shows.
					const stays = isActive ? part.classList.contains( `rf-fs__part--${ keep }` ) : part.classList.contains( 'is-shown' );

					if ( ! stays ) {
						this.motion.push( part.animate( isActive
							? [ { opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 } ]
							: [ { opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 } ], { duration, easing: 'linear' } ) );
					}
				} );
			}
		} );

		this.list.forEach( ( slide ) => this.keptBefore.set( slide, slide.dataset.keep ) );

		const done = this.motion.map( ( a ) => a.finished.catch( () => {} ) );
		Promise.all( done ).then( () => this.settle() );
	}

	/** After the motion: no animation left, the cards in their resting state. */
	settle() {
		this.motion = [];
		this.list.forEach( ( slide ) => {
			slide.classList.remove( 'is-moving', 'is-leaving' );

			if ( slide.classList.contains( 'is-hidden' ) ) {
				slide.style.order = '';
			}

			this.parts( slide ).holder.style.justifyContent = '';
		} );
	}

	finishMotion() {
		if ( this.motion && this.motion.length ) {
			this.motion.forEach( ( a ) => {
				try {
					a.finish();
				} catch ( e ) {}
			} );
			this.settle();
		}
	}

	next( step = 1 ) {
		this.go( this.current + step );
	}

	// ---------------------------------------------------------------- playing by itself

	play() {
		this.stop();

		if ( this.opts.autoplay && ! this.isEdit && this.list.length > 1 && ! this.paused ) {
			this.timer = window.setTimeout( () => {
				this.next();
				this.play();
			}, this.opts.interval + ( this.ready ? this.opts.duration : 0 ) );
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
		this.list = this.slides();
		this.keptBefore = new WeakMap();
		this.motion = [];
		this.ready = false;
		root.style.setProperty( '--rf-fs-duration', this.opts.duration + 'ms' );
		root.style.setProperty( '--rf-fs-easing', EASINGS[ this.opts.easing ] || EASINGS.smooth );

		const picked = this.isEdit ? ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1 : 0;
		this.current = Math.min( Math.max( 0, picked ), Math.max( 0, this.list.length - 1 ) );
		this.go( this.current, true );
		this.list.forEach( ( slide ) => this.keptBefore.set( slide, slide.dataset.keep ) );
		// The resting places are drawn before transitions are on, so nothing fades in on load.
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

		// A waiting card opens on click (not in Edit Mode, where a click selects what is in it).
		on( root, 'click', ( event ) => {
			const slide = event.target.closest( '.rf-fs__slide' );

			if ( ! slide || ! this.opts.click || this.isEdit || ! slide.classList.contains( 'is-waiting' ) || slide.closest( '.rf-fs' ) !== root ) {
				return;
			}

			event.preventDefault();
			this.go( this.list.indexOf( slide ) );
			this.play();
		}, true );

		on( root, 'keydown', ( event ) => {
			const slide = event.target.closest && event.target.closest( '.rf-fs__slide' );

			if ( ( 'Enter' === event.key || ' ' === event.key ) && slide && slide === event.target && slide.classList.contains( 'is-waiting' ) ) {
				event.preventDefault();
				this.go( this.list.indexOf( slide ) );
				return;
			}

			const keys = this.horizontal() ? [ 'ArrowLeft', 'ArrowRight' ] : [ 'ArrowUp', 'ArrowDown' ];
			const k = keys.indexOf( event.key );

			if ( -1 === k || ( event.target !== root && ! slide ) ) {
				return;
			}

			event.preventDefault();
			// The arrow towards the next card shows it: up or left while it waits there.
			const towardsBefore = 0 === k;
			this.next( towardsBefore === ! this.opts.reverse ? 1 : -1 );
			this.play();
		} );

		// A swipe towards where the current card goes shows the next one.
		let start = null;

		on( root, 'pointerdown', ( event ) => {
			start = 'mouse' === event.pointerType ? null : { x: event.clientX, y: event.clientY };
		} );
		on( root, 'pointerup', ( event ) => {
			if ( ! start ) {
				return;
			}

			const delta = this.horizontal() ? event.clientX - start.x : event.clientY - start.y;
			start = null;

			if ( Math.abs( delta ) > 40 ) {
				// Moving down (or right): the next card comes from above; a swipe down brings it.
				this.next( ( delta > 0 ) === ! this.opts.reverse ? 1 : -1 );
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

		// The editor adds, removes and re-renders slide containers and their parts without rendering the widget again.
		if ( this.isEdit && window.MutationObserver && this.elements.$slides[ 0 ] ) {
			const box = this.elements.$slides[ 0 ];

			this.mutations = new MutationObserver( ( records ) => {
				const ours = records.some( ( r ) => r.target === box || ( r.target.parentElement === box ) || ( r.target.classList && r.target.classList.contains( 'e-con-inner' ) && r.target.parentElement && r.target.parentElement.parentElement === box ) );

				if ( ours ) {
					window.clearTimeout( this.rebuildTimer );
					this.rebuildTimer = window.setTimeout( () => this.build(), 60 );
				}
			} );
			this.mutations.observe( box, { childList: true, subtree: true } );
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
		if ( [ 'slides', 'orientation', 'direction_v', 'direction_h', 'next_part', 'prev_part', 'visible', 'loop', 'duration', 'easing', 'fade_content', 'click_waiting' ].includes( propertyName ) ) {
			// After the wrapper got its new classes (orientation).
			window.setTimeout( () => this.build(), 0 );
		}
	}

	onEditSettingsChange( propertyName ) {
		if ( 'activeItemIndex' === propertyName && this.list ) {
			// Picking a slide in the panel shows it the way the stack moves on the site.
			this.ready = true;
			this.go( ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1 );
		}
	}
}
