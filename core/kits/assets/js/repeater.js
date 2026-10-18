import Repeater from '../../../../assets/dev/js/editor/controls/repeater';
import RepeaterRow from './repeater-row';

export default class extends Repeater {
	constructor( ...args ) {
		super( ...args );

		this.childView = RepeaterRow;
	}

	templateHelpers() {
		const templateHelpers = super.templateHelpers();

		templateHelpers.addButtonText = 'custom_colors' === this.model.get( 'name' ) ? __( 'Add Color', 'refraction' ) : __( 'Add Style', 'refraction' );

		return templateHelpers;
	}

	getDefaults() {
		const defaults = super.getDefaults();

		defaults.title = `${ __( 'New Item', 'refraction' ) } #${ this.children.length + 1 }`;

		return defaults;
	}

	getSortableParams() {
		const sortableParams = super.getSortableParams();

		sortableParams.placeholder = 'e-sortable-placeholder';
		sortableParams.cursor = 'move';

		return sortableParams;
	}
}
