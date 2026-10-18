export default class SwiperHandler {
	constructor( container, config ) {
		this.config = config;

		if ( this.config.breakpoints ) {
			// The config is passed as a param to allow adjustConfig to be called outside of this wrapper
			this.config = this.adjustConfig( config );
		}

		if ( container instanceof jQuery ) {
			container = container[ 0 ];
		}

		// The Swiper will overlap the column width when applying custom margin values on the column.
		container.closest( '.refraction-widget-wrap' )?.classList.add( 'e-swiper-container' );

		container.closest( '.refraction-widget' )?.classList.add( 'e-widget-swiper' );

		return new Promise( ( resolve ) => {
			// TODO: Remove in v3.29.0 [ED-16272].
			if ( 'undefined' === typeof Swiper ) {
				refractionFrontend.utils.assetsLoader.load( 'script', 'swiper' )
					.then( () => resolve( this.createSwiperInstance( container, this.config ) ) );

				return;
			}

			if ( 'function' === typeof Swiper && 'undefined' === typeof window.Swiper ) {
				window.Swiper = Swiper;
			}

			resolve( this.createSwiperInstance( container, this.config ) );
		} );
	}

	createSwiperInstance( container, config ) {
		const SwiperSource = window.Swiper;

		SwiperSource.prototype.adjustConfig = this.adjustConfig;

		config = this.applyMotionPreferences( config );

		return new SwiperSource( container, config );
	}

	// Backwards compatibility for Refraction Pro <2.9.0 (old Swiper version - <5.0.0)
	// In Swiper 5.0.0 and up, breakpoints changed from acting as max-width to acting as min-width
	adjustConfig( config ) {
		// Only reverse the breakpoints if the handle param has been defined
		if ( ! config.handleRefractionBreakpoints ) {
			return config;
		}

		const refractionBreakpoints = refractionFrontend.config.responsive.activeBreakpoints,
			refractionBreakpointValues = refractionFrontend.breakpoints.getBreakpointValues();

		Object.keys( config.breakpoints ).forEach( ( configBPKey ) => {
			const configBPKeyInt = parseInt( configBPKey );
			let breakpointToUpdate;

			// The `configBPKeyInt + 1` is a BC Fix for Refraction Pro Carousels from 2.8.0-2.8.3 used with Refraction >= 2.9.0
			if ( configBPKeyInt === refractionBreakpoints.mobile.value || ( configBPKeyInt + 1 ) === refractionBreakpoints.mobile.value ) {
				// This handles the mobile breakpoint. Refraction's default sm breakpoint is never actually used,
				// so the mobile breakpoint (md) needs to be handled separately and set to the 0 breakpoint (xs)
				breakpointToUpdate = 0;
			} else if ( refractionBreakpoints.widescreen && ( configBPKeyInt === refractionBreakpoints.widescreen.value || ( configBPKeyInt + 1 ) === refractionBreakpoints.widescreen.value ) ) {
				// Widescreen is a min-width breakpoint. Since in Swiper >5.0 the breakpoint system is min-width based,
				// the value we pass to the Swiper instance in this case is the breakpoint from the user, unchanged.
				breakpointToUpdate = configBPKeyInt;
			} else {
				// Find the index of the current config breakpoint in the Refraction Breakpoints array
				const currentBPIndexInRefractionBPs = refractionBreakpointValues.findIndex( ( refractionBP ) => {
					// BC Fix for Refraction Pro Carousels from 2.8.0-2.8.3 used with Refraction >= 2.9.0
					return configBPKeyInt === refractionBP || ( configBPKeyInt + 1 ) === refractionBP;
				} );

				// For all other Swiper config breakpoints, move them one breakpoint down on the breakpoint list,
				// according to the array of Refraction's global breakpoints
				breakpointToUpdate = refractionBreakpointValues[ currentBPIndexInRefractionBPs - 1 ];
			}

			config.breakpoints[ breakpointToUpdate ] = config.breakpoints[ configBPKey ];

			// Then reset the settings in the original breakpoint key to the default values
			config.breakpoints[ configBPKey ] = {
				slidesPerView: config.slidesPerView,
				slidesPerGroup: config.slidesPerGroup ? config.slidesPerGroup : 1,
			};
		} );

		return config;
	}

	applyMotionPreferences( config ) {
		const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		if ( ! prefersReducedMotion ) {
			return config;
		}

		return Object.assign( {}, config, { speed: 0, autoplay: false } );
	}
}
