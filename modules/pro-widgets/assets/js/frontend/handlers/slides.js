/**
 * Slides: one Swiper, one slide per view. Everything comes from the widget settings.
 */
export default class Slides extends refractionModules.frontend.handlers.CarouselBase {
	getDefaultSettings() {
		const settings = super.getDefaultSettings();

		settings.selectors.carousel = '.refraction-slides-wrapper';
		settings.selectors.swiperWrapper = '.refraction-slides';
		settings.selectors.slideContent = '.refraction-slide';

		return settings;
	}

	getSwiperSettings() {
		const settings = this.getElementSettings(),
			reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
			showArrows = [ 'arrows', 'both' ].includes( settings.navigation ),
			showDots = [ 'dots', 'both' ].includes( settings.navigation ),
			fade = 'fade' === settings.transition,
			options = {
				slidesPerView: 1,
				loop: 'yes' === settings.infinite,
				speed: reduceMotion ? 0 : Number( settings.transition_speed ) || 500,
				effect: fade ? 'fade' : 'slide',
				handleRefractionBreakpoints: true,
				watchOverflow: true,
			};

		if ( fade ) {
			options.fadeEffect = { crossFade: true };
		}

		// Autoplay never starts for visitors who asked for less motion.
		if ( 'yes' === settings.autoplay && ! reduceMotion ) {
			options.autoplay = {
				delay: Number( settings.autoplay_speed ) || 5000,
				disableOnInteraction: false,
			};
		}

		if ( showArrows ) {
			options.navigation = {
				prevEl: this.$element.find( '.refraction-swiper-button-prev' )[ 0 ],
				nextEl: this.$element.find( '.refraction-swiper-button-next' )[ 0 ],
			};
		}

		if ( showDots ) {
			options.pagination = {
				el: this.$element.find( '.swiper-pagination' )[ 0 ],
				type: 'bullets',
				clickable: true,
				renderBullet: ( index, className ) => `<span class="${ className }" role="button" tabindex="0" data-bullet-index="${ index }" aria-label="${ refractionFrontend.config.i18n.a11yCarouselPaginationBulletMessage } ${ index + 1 }"></span>`,
			};
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
			},
			init: () => {
				this.a11ySetPaginationTabindex();
				this.a11ySetSlideAriaHidden( 'initialisation' );
			},
		};

		return options;
	}

	// The carousel base reads image-carousel specific settings on resize; the slider does not need that.
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
