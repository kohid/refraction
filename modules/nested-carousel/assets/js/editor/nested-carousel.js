import View from './views/view';

export class NestedCarousel extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-nested-carousel';
	}

	getView() {
		return View;
	}
}

export default NestedCarousel;
