import View from './views/view';
import EmptyView from './views/empty';

/**
 * @typedef {import('../../../../../assets/dev/js/editor/elements/types/base/element-base')} ElementBase
 */
export class NestedElementTypesBase extends refraction.modules.elements.types.Base {
	getType() {
		refractionModules.ForceMethodImplementation();
	}

	getView() {
		return View;
	}

	getEmptyView() {
		return EmptyView;
	}

	getModel() {
		return $e.components.get( 'nested-elements/nested-repeater' ).exports.NestedModelBase;
	}
}

export default NestedElementTypesBase;
