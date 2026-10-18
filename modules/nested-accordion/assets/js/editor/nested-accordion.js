import View from './views/view';

export class NestedAccordion extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'nested-accordion';
	}

	getView() {
		return View;
	}
}

export default NestedAccordion;
