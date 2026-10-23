import Base from 'refraction-frontend/handlers/base';

const reducedMotion = () => !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );

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
			init: () => this.syncSlideVisibility(),
			slideChange: () => this.syncSlideVisibility(),
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

	async buildSwiper() {
		const viewport = this.elements.$viewport[ 0 ];

		this.destroySwiper();

		if ( ! viewport || this.slides().length < 2 ) {
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
		this.syncAutoplayToggle();

		if ( this.isEdit ) {
			const active = this.getEditSettings( 'activeItemIndex' );

			if ( active ) {
				swiper.slideTo( active - 1, 0 );
			}
		}
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
					} else if ( ! this.swiper && viewport.offsetWidth && this.slides().length > 1 ) {
						this.buildSwiper();
					}
				} );
			} );
			this.resizeObserver.observe( viewport );
		}
	}

	bindEvents() {
		this.elements.$autoplayToggle.on( 'click', () => {
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
		this.onFocusIn = () => {
			if ( this.swiper?.autoplay?.running ) {
				this.swiper.autoplay.stop();
				this.syncAutoplayToggle();
			}
		};
		this.elements.$root.on( 'focusin', this.onFocusIn );
	}

	syncAutoplayToggle() {
		const toggle = this.elements.$autoplayToggle[ 0 ],
			running = !! this.swiper?.autoplay?.running,
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
		if ( /^(slides_to_show|spacing|effect|direction|speed|loop|autoplay|autoplay_speed|pause_on_hover|arrows|pagination)/.test( propertyName ) ) {
			clearTimeout( this.rebuildTimer );
			this.rebuildTimer = setTimeout( () => this.buildSwiper(), 60 );
		}
	}

	onEditSettingsChange( propertyName ) {
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
		this.destroySwiper();
		super.onDestroy();
	}
}
