import View from './views/view';

export class OffCanvas extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-off-canvas';
	}

	getView() {
		return View;
	}
}

export default OffCanvas;
