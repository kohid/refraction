import Component from './component';

export default class ElementsColorPicker extends refractionModules.ViewModule {
	/**
	 * Initialize the Eye-Dropper module.
	 *
	 * @return {void}
	 */
	onInit() {
		super.onInit();

		$e.components.register( new Component() );
	}
}
