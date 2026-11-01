/**
 * The Form Builder widgets that hold containers. They use the nested elements view as it is: the container(s) are put
 * where the widget's template has its placeholder (see the PHP widgets for the selectors).
 */
export function formNestedTypes() {
	const Base = refraction.modules.elements.types.NestedElementBase;
	const View = $e.components.get( 'nested-elements' ).exports.NestedView;
	const make = ( name ) => new ( class extends Base {
		getType() {
			return name;
		}

		getView() {
			return View;
		}
	} )();

	return [ 'rfb-field-group', 'rfb-field-repeater', 'rfb-steps' ].map( make );
}
