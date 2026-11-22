import View from './views/view';

/**
 * Pin Board in the editor: five notes to start, Add Note for more. Each note is a Container with all its settings,
 * placed in its own slot (the white note card with its pin).
 */
export class PinBoard extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-pin-board';
	}

	getView() {
		return View;
	}
}

export default PinBoard;
