export default class LightboxManager extends refractionModules.ViewModule {
	static getLightbox() {
		const lightboxPromise = new Promise( ( resolveLightbox ) => {
				import(
					'refraction-frontend/utils/lightbox/lightbox'
				).then( ( { default: LightboxModule } ) => resolveLightbox( new LightboxModule() ) );
			} ),
			dialogScriptPromise = refractionFrontend.utils.assetsLoader.load( 'script', 'dialog' ),
			dialogStylePromise = refractionFrontend.utils.assetsLoader.load( 'style', 'dialog' ),
			shareLinkPromise = refractionFrontend.utils.assetsLoader.load( 'script', 'share-link' ),
			swiperStylePromise = refractionFrontend.utils.assetsLoader.load( 'style', 'swiper' ),
			lightboxStylePromise = refractionFrontend.utils.assetsLoader.load( 'style', 'e-lightbox' );

		return Promise.all( [
			lightboxPromise,
			dialogScriptPromise,
			dialogStylePromise,
			shareLinkPromise,
			swiperStylePromise,
			lightboxStylePromise,
		] ).then( () => lightboxPromise );
	}

	getDefaultSettings() {
		return {
			selectors: {
				links: 'a, [data-refraction-lightbox]',
				slideshow: '[data-refraction-lightbox-slideshow]',
			},
		};
	}

	getDefaultElements() {
		return {
			$links: jQuery( this.getSettings( 'selectors.links' ) ),
			$slideshow: jQuery( this.getSettings( 'selectors.slideshow' ) ),
		};
	}

	isLightboxLink( element ) {
		// Check for lowercase `a` to make sure it works also for links inside SVGs.
		if ( ( 'a' === element.tagName.toLowerCase() && ( element.hasAttribute( 'download' ) || ! /^[^?]+\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i.test( element.href ) ) ) && ! element.dataset.refractionLightboxVideo ) {
			return false;
		}

		const generalOpenInLightbox = refractionFrontend.getKitSettings( 'global_image_lightbox' ),
			currentLinkOpenInLightbox = element.dataset.refractionOpenLightbox;

		return 'yes' === currentLinkOpenInLightbox || ( generalOpenInLightbox && 'no' !== currentLinkOpenInLightbox );
	}

	isLightboxSlideshow() {
		return 0 !== this.elements.$slideshow.length;
	}

	async onLinkClick( event ) {
		const element = event.currentTarget,
			$target = jQuery( event.target ),
			editMode = refractionFrontend.isEditMode(),
			isColorPickingMode = editMode && refraction.$previewContents.find( 'body' ).hasClass( 'refraction-editor__ui-state__color-picker' ),
			isClickInsideRefraction = ! ! $target.closest( '.refraction-edit-area' ).length;

		if ( ! this.isLightboxLink( element ) ) {
			if ( editMode && isClickInsideRefraction ) {
				event.preventDefault();
			}

			return;
		}

		event.preventDefault();

		if ( editMode && ! refraction.getPreferences( 'lightbox_in_editor' ) ) {
			return;
		}

		// Disable lightbox on color picking mode.
		if ( isColorPickingMode ) {
			return;
		}

		const lightbox = await LightboxManager.getLightbox();

		lightbox.createLightbox( element );
	}

	bindEvents() {
		refractionFrontend.elements.$document.on(
			'click',
			this.getSettings( 'selectors.links' ),
			( event ) => this.onLinkClick( event ),
		);
	}

	onInit( ...args ) {
		super.onInit( ...args );

		if ( refractionFrontend.isEditMode() ) {
			return;
		}

		this.maybeActivateLightboxOnLink();
	}

	maybeActivateLightboxOnLink() {
		// Detecting lightbox links on init will reduce the time of waiting to the lightbox to be display on slow connections.
		this.elements.$links.each( ( index, element ) => {
			if ( this.isLightboxLink( element ) ) {
				LightboxManager.getLightbox();

				// Breaking the iteration when the library loading has already been triggered.
				return false;
			}
		} );
	}
}
