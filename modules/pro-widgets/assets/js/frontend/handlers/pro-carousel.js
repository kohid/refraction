/**
 * Shared Swiper handler of Media Carousel, Testimonial Carousel and Reviews (carousel layout).
 * Everything comes from the widget settings; a second Swiper (`.refraction-pc-thumbs`) turns it into a slideshow.
 */
export default class ProCarousel extends refractionModules.frontend.handlers.CarouselBase {
	getDefaultSettings() {
		const settings = super.getDefaultSettings();

		settings.selectors.carousel = '.refraction-pc';
		settings.selectors.swiperWrapper = '.refraction-pc__track';
		settings.selectors.slideContent = '.refraction-pc__slide';

		return settings;
	}

	// Value of a (responsive) slider control for one device: `space_between` or `space_between_tablet`.
	sliderValue( settings, name, device, fallback ) {
		const value = settings[ device ? `${ name }_${ device }` : name ];

		return value && '' !== value.size && undefined !== value.size ? Number( value.size ) : fallback;
	}

	getSwiperSettings() {
		const settings = this.getElementSettings(),
			reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
			breakpoints = refractionFrontend.config.responsive.activeBreakpoints,
			hasThumbs = !! this.thumbsElement,
			effect = settings.effect || 'slide',
			fade = 'fade' === effect,
			coverflow = 'coverflow' === effect,
			perView = fade || hasThumbs ? 1 : Number( settings.slides_to_show ) || 1,
			spaceBetween = this.sliderValue( settings, 'space_between', '', 16 ),
			options = {
				slidesPerView: perView,
				spaceBetween,
				speed: Number( settings.speed ) || 500,
				effect: fade || coverflow ? effect : 'slide',
				handleRefractionBreakpoints: true,
				watchOverflow: true,
				centeredSlides: coverflow,
			};

		let maxPerView = perView,
			lastPerView = perView,
			lastSpace = spaceBetween;

		if ( ! fade && ! hasThumbs ) {
			options.breakpoints = {};

			Object.keys( breakpoints ).reverse().forEach( ( name ) => {
				const value = Number( settings[ `slides_to_show_${ name }` ] ) || lastPerView,
					space = this.sliderValue( settings, 'space_between', name, lastSpace );

				options.breakpoints[ breakpoints[ name ].value ] = { slidesPerView: value, spaceBetween: space };
				maxPerView = Math.max( maxPerView, value );
				lastPerView = value;
				lastSpace = space;
			} );
		}

		if ( fade ) {
			options.fadeEffect = { crossFade: true };
		}

		if ( coverflow ) {
			options.coverflowEffect = { rotate: 28, stretch: 0, depth: 120, modifier: 1, slideShadows: false };
		}

		// Looping needs spare slides; with thumbnails the main swiper must keep a 1:1 index.
		options.loop = 'yes' === settings.infinite && ! hasThumbs && this.getSlidesCount() > maxPerView;

		if ( 'yes' === settings.autoplay && ! reduceMotion ) {
			options.autoplay = {
				delay: Number( settings.autoplay_speed ) || 5000,
				disableOnInteraction: false,
			};
		}

		if ( [ 'arrows', 'both' ].includes( settings.navigation ) ) {
			options.navigation = {
				prevEl: this.$element.find( '.refraction-swiper-button-prev' )[ 0 ],
				nextEl: this.$element.find( '.refraction-swiper-button-next' )[ 0 ],
			};
		}

		if ( [ 'dots', 'both' ].includes( settings.navigation ) ) {
			options.pagination = {
				el: this.$element.find( '.swiper-pagination' )[ 0 ],
				type: 'bullets',
				clickable: true,
				renderBullet: ( index, className ) => `<span class="${ className }" role="button" tabindex="0" data-bullet-index="${ index }" aria-label="${ refractionFrontend.config.i18n.a11yCarouselPaginationBulletMessage } ${ index + 1 }"></span>`,
			};
		}

		if ( hasThumbs ) {
			options.thumbs = { swiper: this.thumbsSwiper };
		}

		options.a11y = {
			enabled: true,
			prevSlideMessage: refractionFrontend.config.i18n.a11yCarouselPrevSlideMessage,
			nextSlideMessage: refractionFrontend.config.i18n.a11yCarouselNextSlideMessage,
			firstSlideMessage: refractionFrontend.config.i18n.a11yCarouselFirstSlideMessage,
			lastSlideMessage: refractionFrontend.config.i18n.a11yCarouselLastSlideMessage,
		};

		options.on = {
			slideChange: () => {
				this.a11ySetPaginationTabindex();
				this.a11ySetSlideAriaHidden();
				this.syncThumbs();
			},
			init: () => {
				this.a11ySetPaginationTabindex();
				this.a11ySetSlideAriaHidden( 'initialisation' );
			},
		};

		return options;
	}

	async onInit( ...args ) {
		// The thumbnail strip is created first so the main Swiper can follow it.
		this.thumbsElement = this.$element.find( '.refraction-pc-thumbs' )[ 0 ];

		if ( this.thumbsElement && this.$element.find( '.refraction-pc__slide' ).length > 1 ) {
			const Swiper = refractionFrontend.utils.swiper;

			this.thumbsSwiper = await new Swiper( this.thumbsElement, {
				slidesPerView: 'auto',
				spaceBetween: 8,
				freeMode: true,
				watchSlidesProgress: true,
				watchOverflow: true,
				// The thumbnails are plain buttons labelled by the widget; Swiper's "1 / 4" group labels would replace those.
				a11y: { enabled: false },
			} );
		} else {
			this.thumbsElement = null;
		}

		await super.onInit( ...args );

		// Swiper's thumbs module follows touch/mouse "tap" events only; real clicks also come from the keyboard.
		if ( this.thumbsElement && this.swiper ) {
			this.thumbsElement.querySelectorAll( '.refraction-pc-thumb' ).forEach( ( thumb, index ) => {
				thumb.addEventListener( 'click', () => this.swiper.slideTo( index ) );
			} );
			this.syncThumbs();
		}
	}

	syncThumbs() {
		if ( ! this.thumbsElement || ! this.swiper ) {
			return;
		}

		this.thumbsElement.querySelectorAll( '.refraction-pc-thumb' ).forEach( ( thumb, index ) => {
			thumb.setAttribute( 'aria-current', index === this.swiper.activeIndex ? 'true' : 'false' );
		} );
	}

	// The carousel base reads image-carousel specific settings on resize; this one does not need that.
	bindEvents() {
		this.elements.$swiperArrows.on( 'keydown', this.onDirectionArrowKeydown.bind( this ) );
		this.elements.$paginationWrapper.on( 'keydown', '.swiper-pagination-bullet', this.onDirectionArrowKeydown.bind( this ) );
		this.elements.$swiperContainer.on( 'keydown', '.swiper-slide', this.onDirectionArrowKeydown.bind( this ) );
	}

	unbindEvents() {
		this.elements.$swiperArrows.off();
		this.elements.$paginationWrapper.off();
		this.elements.$swiperContainer.off();
	}

	onElementChange( propertyName ) {
		if ( 'pause_on_hover' === propertyName && this.swiper ) {
			this.togglePauseOnHover( 'yes' === this.getElementSettings( 'pause_on_hover' ) );
		}
	}
}
