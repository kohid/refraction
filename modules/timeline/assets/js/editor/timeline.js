import View from './views/view';

/**
 * Timeline in the editor: three entries to start, Add Entry for more. Each entry is a Container with all its settings,
 * placed in its own slot beside its marker.
 */
export class Timeline extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-timeline';
	}

	getView() {
		return View;
	}
}

export default Timeline;
