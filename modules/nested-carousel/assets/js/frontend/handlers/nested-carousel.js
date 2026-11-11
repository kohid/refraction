import Base from 'refraction-frontend/handlers/base';

const reducedMotion = () => !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );

/**
 * The Stack effect: each slide's signed distance from the open one (the shorter way round with a loop; a tie counts
 * as next) and its place: 0 open, 1..peek the next ones, -1..-peek the previous ones, null out of sight. Mirrors
 * Carousel_Logic::stack_roles().
 *
 * @param {number}  count
 * @param {number}  active
 * @param {number}  peek
 * @param {boolean} loop
 * @return {Array<{d: number, role: number|null}>} One entry per slide.
 */
export function stackRoles( count, active, peek, loop ) {
	const places = [];

	if ( count < 1 ) {
		return places;
	}

	active = ( ( active % count ) + count ) % count;

	for ( let i = 0; i < count; i++ ) {
		let d = i - active;

		if ( loop ) {
			d = ( ( d % count ) + count ) % count;
			d = d > count / 2 ? d - count : d;
		}

		places.push( { d, role: Math.abs( d ) <= peek ? d : null } );
	}

	return places;
}

/**
 * Nested Carousel: a Swiper whose slides are containers. Looping rewinds instead of cloning (clones would duplicate
 * the widgets inside). The Swiper is rebuilt when the slides change (editor), and re-measured whenever its box
 * changes size, which covers popups, tabs and mega menu dropdowns that start hidden.
 */
export default class NestedCarousel extends Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.refraction-nc',
				viewport: '.refraction-nc__viewport',
				track: '.refraction-nc__track',
				slides: '.refraction-nc__track > .swiper-slide',
				prev: '.refraction-nc__prev',
				next: '.refraction-nc__next',
				pagination: '.refraction-nc__pagination',
				autoplayToggle: '.refraction-nc__autoplay',
				titles: '.refraction-nc__titles',
			},
		};
	}

	getDefaultElements() {
		const s = this.getSettings( 'selectors' );

		return {
			$root: this.findElement( s.root ),
			$viewport: this.findElement( s.viewport ),
			$track: this.findElement( s.track ),
			$prev: this.findElement( s.prev ),
			$next: this.findElement( s.next ),
			$pagination: this.findElement( s.pagination ),
			$autoplayToggle: this.findElement( s.autoplayToggle ),
			$titles: this.findElement( s.titles ),
		};
	}

	slides() {
		return Array.from( this.elements.$track[ 0 ]?.children || [] ).filter( ( el ) => el.classList.contains( 'swiper-slide' ) );
	}

	sliderValue( settings, name, device, fallback ) {
		const value = settings[ device ? `${ name }_${ device }` : name ];

		return value && '' !== value.size && undefined !== value.size ? Number( value.size ) : fallback;
	}

	getSwiperOptions() {
		const settings = this.getElementSettings(),
			breakpoints = refractionFrontend.config.responsive.activeBreakpoints,
			fade = 'fade' === settings.effect,
			vertical = 'vertical' === settings.direction && ! fade,
			perView = fade ? 1 : Math.max( 1, Math.min( 8, Number( settings.slides_to_show ) || 1 ) ),
			spaceBetween = fade ? 0 : this.sliderValue( settings, 'spacing', '', 20 ),
			count = this.slides().length,
			options = {
				direction: vertical ? 'vertical' : 'horizontal',
				slidesPerView: perView,
				spaceBetween,
				speed: Math.max( 100, Number( settings.speed ) || 500 ),
				effect: fade ? 'fade' : 'slide',
				watchSlidesProgress: true,
				watchOverflow: true,
				handleRefractionBreakpoints: true,
				keyboard: { enabled: true, onlyInViewport: true },
				rewind: 'yes' === settings.loop && count > perView,
				a11y: {
					enabled: true,
					containerMessage: null,
					containerRoleDescriptionMessage: 'carousel',
					itemRoleDescriptionMessage: 'slide',
					slideLabelMessage: '{{index}} / {{slidesLength}}',
					prevSlideMessage: refractionFrontend.config.i18n.a11yCarouselPrevSlideMessage,
					nextSlideMessage: refractionFrontend.config.i18n.a11yCarouselNextSlideMessage,
					firstSlideMessage: refractionFrontend.config.i18n.a11yCarouselFirstSlideMessage,
					lastSlideMessage: refractionFrontend.config.i18n.a11yCarouselLastSlideMessage,
					paginationBulletMessage: ( refractionFrontend.config.i18n.a11yCarouselPaginationBulletMessage || 'Go to slide' ) + ' {{index}}',
				},
			};

		if ( fade ) {
			options.fadeEffect = { crossFade: true };
		} else if ( ! vertical ) {
			options.breakpoints = {};

			let lastView = perView,
				lastSpace = spaceBetween;

			Object.keys( breakpoints ).reverse().forEach( ( name ) => {
				const view = Math.max( 1, Number( settings[ `slides_to_show_${ name }` ] ) || lastView ),
					space = this.sliderValue( settings, 'spacing', name, lastSpace );

				options.breakpoints[ breakpoints[ name ].value ] = { slidesPerView: view, spaceBetween: space };
				lastView = view;
				lastSpace = space;
			} );
		}

		if ( 'yes' === settings.autoplay && ! reducedMotion() ) {
			options.autoplay = {
				delay: Math.max( 500, Number( settings.autoplay_speed ) || 5000 ),
				disableOnInteraction: false,
				pauseOnMouseEnter: 'yes' === settings.pause_on_hover,
			};
		}

		if ( this.elements.$prev.length ) {
			options.navigation = { prevEl: this.elements.$prev[ 0 ], nextEl: this.elements.$next[ 0 ] };
		}

		if ( this.elements.$pagination.length && 'none' !== settings.pagination ) {
			options.pagination = {
				el: this.elements.$pagination[ 0 ],
				type: 'progress' === settings.pagination ? 'progressbar' : settings.pagination,
				clickable: 'bullets' === settings.pagination,
			};
		}

		options.on = {
			init: () => {
				this.syncSlideVisibility();
				this.syncTitles( this.swiper?.activeIndex ?? 0 );
			},
			slideChange: ( sw ) => {
				this.syncSlideVisibility();
				this.syncTitles( sw.activeIndex );
			},
			progress: () => this.syncSlideVisibility(),
			resize: () => this.syncSlideVisibility(),
		};

		return options;
	}

	// Slides outside the view are hidden from assistive technology and cannot take focus.
	syncSlideVisibility() {
		if ( ! this.swiper || this.swiper.destroyed ) {
			return;
		}

		this.swiper.slides.forEach( ( slide ) => {
			const visible = slide.classList.contains( 'swiper-slide-visible' ) || slide.classList.contains( 'swiper-slide-active' );

			if ( visible ) {
				slide.removeAttribute( 'aria-hidden' );
				slide.removeAttribute( 'inert' );
			} else {
				slide.setAttribute( 'aria-hidden', 'true' );
				slide.setAttribute( 'inert', '' );
			}
		} );
	}

	isStack() {
		return 'stack' === this.getElementSettings( 'effect' );
	}

	async buildSwiper() {
		const viewport = this.elements.$viewport[ 0 ];

		this.destroySwiper();
		this.destroyStack();

		if ( this.isStack() ) {
			this.buildStack();
			return;
		}

		if ( ! viewport || this.slides().length < 2 ) {
			return;
		}

		// A carousel in a closed popup, tab or dropdown has no size yet: it is built when it first gets one
		// (see observe()), because a Swiper built at zero width binds its arrows twice once it unlocks.
		if ( ! viewport.offsetWidth ) {
			return;
		}

		const Swiper = refractionFrontend.utils.swiper,
			token = ( this.buildToken = ( this.buildToken || 0 ) + 1),
			swiper = await new Swiper( this.elements.$viewport, this.getSwiperOptions() );

		// A newer build started while this one was loading.
		if ( token !== this.buildToken ) {
			swiper.destroy( true, true );
			return;
		}

		this.swiper = swiper;
		this.elements.$viewport.data( 'swiper', swiper );
		this.syncTitles( swiper.activeIndex );
		this.syncAutoplayToggle();

		if ( this.isEdit ) {
			const active = this.getEditSettings( 'activeItemIndex' );

			if ( active ) {
				swiper.slideTo( active - 1, 0 );
			}
		}
	}

	// ---------------------------------------------------------------- Stack effect
	// One slide open, the ones around it shown as bars (their top strip). The slides stay in the page's flow in one
	// column; their order and height change, so the others move with the height animation.
	buildStack() {
		const slides = this.slides(),
			root = this.elements.$root[ 0 ];

		if ( ! root || ! slides.length ) {
			return;
		}

		const settings = this.getElementSettings(),
			editIndex = this.isEdit ? ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1 : 0;

		this.stack = {
			index: Math.max( 0, Math.min( slides.length - 1, editIndex ) ),
			places: [],
			flowTop: 'bottom' !== settings.stack_flow,
			peek: Math.max( 0, Math.min( 3, Number( settings.stack_peek ?? 1 ) ) ),
			loop: 'yes' === settings.loop,
			speed: Math.max( 100, Number( settings.speed ) || 500 ),
		};

		root.classList.add( 'is-stack-ready' );
		root.classList.toggle( 'is-flow-top', this.stack.flowTop );
		root.classList.toggle( 'is-flow-bottom', ! this.stack.flowTop );
		root.style.setProperty( '--rf-stack-speed', this.stack.speed + 'ms' );

		this.buildStackPagination();
		this.layoutStack( true );

		const ns = '.rfStack';

		this.elements.$prev.on( 'click' + ns, () => this.stackStep( -1 ) );
		this.elements.$next.on( 'click' + ns, () => this.stackStep( 1 ) );

		// Bars are inert (out of the keyboard order and hidden from screen readers), so a click on one reaches the
		// track: the bar under the pointer opens.
		this.elements.$track.on( 'click' + ns, ( event ) => {
			const hit = this.slides().findIndex( ( slide, i ) => {
				const r = slide.getBoundingClientRect();
				return i !== this.stack.index && slide.classList.contains( 'is-stack-bar' ) && event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
			} );

			if ( hit > -1 ) {
				this.stackGo( hit );
			}
		} );

		this.elements.$root.on( 'keydown' + ns, ( event ) => {
			if ( event.target.closest( 'input, textarea, select, [contenteditable="true"]' ) ) {
				return;
			}

			const toNext = this.stack.flowTop ? [ 'ArrowUp', 'ArrowLeft' ] : [ 'ArrowDown', 'ArrowRight' ],
				toPrev = this.stack.flowTop ? [ 'ArrowDown', 'ArrowRight' ] : [ 'ArrowUp', 'ArrowLeft' ];

			if ( toNext.includes( event.key ) || toPrev.includes( event.key ) ) {
				event.preventDefault();
				this.stackStep( toNext.includes( event.key ) ? 1 : -1 );
			}
		} );

		if ( 'yes' === settings.autoplay && ! reducedMotion() && slides.length > 1 ) {
			this.stack.autoplay = { delay: Math.max( 500, Number( settings.autoplay_speed ) || 5000 ), running: ! this.userPaused, hover: false };

			if ( 'yes' === settings.pause_on_hover ) {
				this.elements.$root.on( 'mouseenter' + ns, () => {
					this.stack.autoplay.hover = true;
					this.stackSchedule();
				} ).on( 'mouseleave' + ns, () => {
					this.stack.autoplay.hover = false;
					this.stackSchedule();
				} );
			}

			this.stackSchedule();
		}

		this.syncAutoplayToggle();
	}

	stackStep( delta ) {
		if ( ! this.stack ) {
			return;
		}

		const count = this.slides().length;
		let index = this.stack.index + delta;

		if ( this.stack.loop ) {
			index = ( ( index % count ) + count ) % count;
		} else if ( index < 0 || index >= count ) {
			return;
		}

		this.stackGo( index );
	}

	stackGo( index ) {
		if ( ! this.stack || index === this.stack.index ) {
			return;
		}

		this.stack.index = index;
		this.layoutStack( false );
		this.stackSchedule();
	}

	// Places every slide around the open one. The open slide's height goes from its bar height to its own height
	// (measured, so it animates in every browser), and back to a bar when it closes.
	layoutStack( initial ) {
		const slides = this.slides(),
			{ index, peek, loop, flowTop } = this.stack,
			places = stackRoles( slides.length, index, peek, loop ),
			before = slides.map( ( slide ) => slide.getBoundingClientRect().height );

		slides.forEach( ( slide, i ) => {
			const { d, role } = places[ i ],
				was = this.stack.places[ i ],
				open = 0 === role;

			// A slide that comes round from the far end grows in place instead of crossing the stack.
			const jumps = ! initial && was && null !== role && Math.sign( was.d ) !== Math.sign( d ) && Math.abs( was.d - d ) > 1;

			slide.style.order = String( flowTop ? -d : d );
			slide.style.setProperty( '--rf-stack-level', String( Math.abs( d ) ) );
			slide.classList.toggle( 'is-stack-open', open );
			slide.classList.toggle( 'is-stack-bar', null !== role && ! open );
			slide.classList.toggle( 'is-stack-far', null !== role && Math.abs( role ) > 1 );
			slide.classList.toggle( 'is-stack-hidden', null === role );

			if ( open ) {
				slide.removeAttribute( 'aria-hidden' );
				slide.removeAttribute( 'inert' );
			} else {
				slide.setAttribute( 'aria-hidden', 'true' );
				slide.setAttribute( 'inert', '' );
			}

			if ( initial ) {
				slide.style.height = '';
				return;
			}

			clearTimeout( slide.rfStackTimer );

			if ( open ) {
				slide.style.transition = 'none';
				slide.style.height = '';
				const to = slide.offsetHeight;
				slide.style.height = before[ i ] + 'px';
				void slide.offsetHeight; // eslint-disable-line no-void -- applies the start height before animating.
				slide.style.transition = '';
				slide.style.height = to + 'px';
				slide.rfStackTimer = setTimeout( () => {
					slide.style.height = '';
				}, this.stack.speed + 60 );
			} else if ( was && 0 === was.role ) {
				slide.style.transition = 'none';
				slide.style.height = before[ i ] + 'px';
				void slide.offsetHeight; // eslint-disable-line no-void -- applies the start height before animating.
				slide.style.transition = '';
				slide.style.height = '';
			} else if ( jumps ) {
				slide.classList.add( 'is-stack-entering' );
				void slide.offsetHeight; // eslint-disable-line no-void -- shows it collapsed first.
				slide.classList.remove( 'is-stack-entering' );
			}
		} );

		this.stack.places = places;
		this.syncStackControls();
		this.syncTitles( index );
	}

	buildStackPagination() {
		const el = this.elements.$pagination[ 0 ];

		if ( ! el ) {
			return;
		}

		const type = this.getElementSettings( 'pagination' ),
			count = this.slides().length;

		el.innerHTML = '';
		el.className = 'refraction-nc__pagination swiper-pagination';

		if ( 'bullets' === type ) {
			el.classList.add( 'swiper-pagination-bullets' );

			for ( let i = 0; i < count; i++ ) {
				const dot = document.createElement( 'button' );

				dot.type = 'button';
				dot.className = 'swiper-pagination-bullet';
				dot.setAttribute( 'aria-label', ( refractionFrontend.config.i18n?.a11yCarouselPaginationBulletMessage || 'Go to slide' ) + ' ' + ( i + 1 ) );
				dot.addEventListener( 'click', () => this.stackGo( i ) );
				el.appendChild( dot );
			}
		} else if ( 'fraction' === type ) {
			el.classList.add( 'swiper-pagination-fraction' );
			el.innerHTML = '<span class="swiper-pagination-current"></span> / <span class="swiper-pagination-total">' + count + '</span>';
		} else if ( 'progress' === type ) {
			el.classList.add( 'swiper-pagination-progressbar' );
			el.innerHTML = '<span class="swiper-pagination-progressbar-fill"></span>';
		}
	}

	syncStackControls() {
		const { index, loop } = this.stack,
			count = this.slides().length,
			el = this.elements.$pagination[ 0 ];

		if ( el ) {
			el.querySelectorAll( '.swiper-pagination-bullet' ).forEach( ( dot, i ) => {
				dot.classList.toggle( 'swiper-pagination-bullet-active', i === index );
				dot.setAttribute( 'aria-current', i === index ? 'true' : 'false' );
			} );

			const current = el.querySelector( '.swiper-pagination-current' ),
				fill = el.querySelector( '.swiper-pagination-progressbar-fill' );

			if ( current ) {
				current.textContent = String( index + 1 );
			}

			if ( fill ) {
				fill.style.transform = `scaleX(${ ( index + 1 ) / count })`;
			}
		}

		this.elements.$prev.toggleClass( 'swiper-button-disabled', ! loop && 0 === index );
		this.elements.$next.toggleClass( 'swiper-button-disabled', ! loop && count - 1 === index );
	}

	// Autoplay: the next slide after the delay, unless paused (button, hover, focus inside).
	stackSchedule() {
		const autoplay = this.stack?.autoplay;

		clearTimeout( this.stackTimer );

		if ( ! autoplay || ! autoplay.running || autoplay.hover ) {
			return;
		}

		this.stackTimer = setTimeout( () => {
			const last = this.slides().length - 1;

			if ( ! this.stack.loop && this.stack.index >= last ) {
				this.stackGo( 0 );
			} else {
				this.stackStep( 1 );
			}
		}, autoplay.delay );
	}

	destroyStack() {
		clearTimeout( this.stackTimer );

		if ( ! this.stack ) {
			return;
		}

		const ns = '.rfStack';

		this.elements.$prev.off( ns );
		this.elements.$next.off( ns );
		this.elements.$track.off( ns );
		this.elements.$root.off( ns );
		this.elements.$root.removeClass( 'is-stack-ready is-flow-top is-flow-bottom' );
		this.slides().forEach( ( slide ) => {
			clearTimeout( slide.rfStackTimer );
			slide.classList.remove( 'is-stack-open', 'is-stack-bar', 'is-stack-far', 'is-stack-hidden', 'is-stack-entering' );
			slide.style.removeProperty( 'order' );
			slide.style.removeProperty( 'height' );
			slide.style.removeProperty( '--rf-stack-level' );
			slide.removeAttribute( 'aria-hidden' );
			slide.removeAttribute( 'inert' );
		} );
		this.stack = null;
	}

	destroySwiper() {
		if ( this.swiper && ! this.swiper.destroyed ) {
			this.swiper.destroy( true, true );
		}

		this.swiper = null;
	}

	onInit() {
		super.onInit();

		if ( ! this.elements.$viewport.length ) {
			return;
		}

		this.buildSwiper();
		this.observe();
	}

	// Rebuilds when slides come and go (editor) and re-measures when the box size changes (hidden -> visible).
	observe() {
		const track = this.elements.$track[ 0 ],
			viewport = this.elements.$viewport[ 0 ];

		if ( this.isEdit && window.MutationObserver ) {
			this.mutations = new MutationObserver( ( records ) => {
				const slideChange = records.some( ( r ) => Array.from( [ ...r.addedNodes, ...r.removedNodes ] ).some( ( n ) => 1 === n.nodeType && n.classList.contains( 'swiper-slide' ) ) );

				if ( slideChange ) {
					clearTimeout( this.rebuildTimer );
					this.rebuildTimer = setTimeout( () => this.buildSwiper(), 60 );
				}
			} );
			this.mutations.observe( track, { childList: true } );
		}

		if ( window.ResizeObserver ) {
			this.resizeObserver = new ResizeObserver( () => {
				cancelAnimationFrame( this.updateFrame );
				this.updateFrame = requestAnimationFrame( () => {
					if ( this.swiper && ! this.swiper.destroyed && viewport.offsetWidth ) {
						this.swiper.update();
					} else if ( ! this.swiper && ! this.stack && ! this.isStack() && viewport.offsetWidth && this.slides().length > 1 ) {
						this.buildSwiper();
					}
				} );
			} );
			this.resizeObserver.observe( viewport );
		}
	}

	bindEvents() {
		this.elements.$autoplayToggle.on( 'click', () => {
			if ( this.stack?.autoplay ) {
				this.stack.autoplay.running = ! this.stack.autoplay.running;
				this.userPaused = ! this.stack.autoplay.running;
				this.stackSchedule();
				this.syncAutoplayToggle();
				return;
			}

			if ( ! this.swiper?.autoplay ) {
				return;
			}

			if ( this.swiper.autoplay.running ) {
				this.swiper.autoplay.stop();
				this.userPaused = true;
			} else {
				this.userPaused = false;
				this.swiper.autoplay.start();
			}

			this.syncAutoplayToggle();
		} );

		// Keyboard and screen reader users should not be moved on while they read a slide.
		this.onFocusIn = ( event ) => {
			// Focusing the pause button itself must not pre-empt its own click.
			if ( event.target.closest( '.refraction-nc__autoplay' ) ) {
				return;
			}

			if ( this.swiper?.autoplay?.running ) {
				this.swiper.autoplay.stop();
				this.syncAutoplayToggle();
			}

			if ( this.stack?.autoplay?.running ) {
				this.stack.autoplay.running = false;
				this.stackSchedule();
				this.syncAutoplayToggle();
			}
		};
		this.elements.$root.on( 'focusin', this.onFocusIn );

		this.elements.$titles.on( 'click', '.refraction-nc__title', ( event ) => {
			event.preventDefault();
			this.goToSlide( Number( event.currentTarget.dataset.index ) || 0 );
		} );
	}

	// ---------------------------------------------------------------- Slide Titles
	titleButtons() {
		return Array.from( this.elements.$titles[ 0 ]?.querySelectorAll( '.refraction-nc__title' ) || [] );
	}

	/**
	 * Shows the slide of a clicked title (Swiper or the Stack effect).
	 *
	 * @param {number} index Slide index.
	 */
	goToSlide( index ) {
		if ( this.stack ) {
			this.stackGo( index );
		} else if ( this.swiper && ! this.swiper.destroyed ) {
			this.swiper.slideTo( index );
		} else {
			this.syncTitles( index );
		}
	}

	/**
	 * Marks the current slide's title and keeps it in view inside the titles list (never scrolling the page).
	 *
	 * @param {number} index Slide index.
	 */
	syncTitles( index ) {
		const list = this.elements.$titles[ 0 ],
			buttons = this.titleButtons();

		if ( ! list || ! buttons.length ) {
			return;
		}

		const current = Math.max( 0, Math.min( buttons.length - 1, Number( index ) || 0 ) );

		buttons.forEach( ( button, i ) => {
			button.classList.toggle( 'is-active', i === current );
			button.setAttribute( 'aria-current', i === current ? 'true' : 'false' );
		} );

		const button = buttons[ current ];

		if ( list.scrollHeight > list.clientHeight + 1 ) {
			const top = button.offsetTop - list.offsetTop;

			if ( top < list.scrollTop || top + button.offsetHeight > list.scrollTop + list.clientHeight ) {
				list.scrollTo( { top: top - ( ( list.clientHeight - button.offsetHeight ) / 2 ), behavior: reducedMotion() ? 'auto' : 'smooth' } );
			}
		} else if ( list.scrollWidth > list.clientWidth + 1 ) {
			const left = button.offsetLeft - list.offsetLeft;

			if ( left < list.scrollLeft || left + button.offsetWidth > list.scrollLeft + list.clientWidth ) {
				list.scrollTo( { left: left - ( ( list.clientWidth - button.offsetWidth ) / 2 ), behavior: reducedMotion() ? 'auto' : 'smooth' } );
			}
		}
	}

	syncAutoplayToggle() {
		const toggle = this.elements.$autoplayToggle[ 0 ],
			running = !! ( this.swiper?.autoplay?.running || this.stack?.autoplay?.running ),
			track = this.elements.$track[ 0 ];

		if ( track ) {
			track.setAttribute( 'aria-live', running ? 'off' : 'polite' );
		}

		if ( ! toggle ) {
			return;
		}

		toggle.setAttribute( 'aria-pressed', running ? 'false' : 'true' );
		toggle.setAttribute( 'aria-label', running ? toggle.dataset.labelPause : toggle.dataset.labelPlay );
	}

	onElementChange( propertyName ) {
		if ( /^(slides_to_show|spacing|effect|direction|speed|loop|autoplay|autoplay_speed|pause_on_hover|arrows|pagination|stack_flow|stack_peek|title_nav)/.test( propertyName ) ) {
			clearTimeout( this.rebuildTimer );
			this.rebuildTimer = setTimeout( () => this.buildSwiper(), 60 );
		}
	}

	onEditSettingsChange( propertyName ) {
		if ( 'activeItemIndex' === propertyName && this.stack ) {
			this.stackGo( Math.max( 0, ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1 ) );
			return;
		}

		if ( 'activeItemIndex' === propertyName && this.swiper && ! this.swiper.destroyed ) {
			this.swiper.slideTo( this.getEditSettings( 'activeItemIndex' ) - 1 );
		}
	}

	onDestroy() {
		clearTimeout( this.rebuildTimer );
		cancelAnimationFrame( this.updateFrame );
		this.mutations?.disconnect();
		this.resizeObserver?.disconnect();
		this.elements.$root.off( 'focusin', this.onFocusIn );
		this.elements.$titles.off( 'click' );
		this.destroySwiper();
		this.destroyStack();
		super.onDestroy();
	}
}
