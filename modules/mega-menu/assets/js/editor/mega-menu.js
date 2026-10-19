import View from './views/view';

export class MegaMenu extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-mega-menu';
	}

	getView() {
		return View;
	}
}

export default MegaMenu;
