import View from './views/view';

/**
 * Dynamic Container in the editor. A new widget starts with three containers (Item #1 to #3); Add Item gives a new one
 * like them. Each item is a Container with all its settings.
 */
export class DynamicContainer extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-dynamic-container';
	}

	getView() {
		return View;
	}
}

export default DynamicContainer;
