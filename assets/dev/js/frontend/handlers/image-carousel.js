export default class ImageCarousel extends refractionModules.frontend.handlers.CarouselBase {
	getDefaultSettings() {
		const settings = super.getDefaultSettings();

		settings.selectors.carousel = '.refraction-image-carousel-wrapper';

		return settings;
	}
}
