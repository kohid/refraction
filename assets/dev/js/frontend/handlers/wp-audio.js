export default class WpAudio extends refractionModules.frontend.handlers.Base {
	onInit() {
		super.onInit();

		window.wp.mediaelement.initialize();
	}
}
