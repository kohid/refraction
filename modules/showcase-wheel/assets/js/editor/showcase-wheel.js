import View from './views/view';

/**
 * Showcase Wheel in the editor. A new widget starts with three slides, each a container holding its Content container with an example inside.
 * Every element of that example gets its own id.
 */
export class ShowcaseWheel extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-showcase-wheel';
	}

	getView() {
		return View;
	}

	getModel() {
		if ( this.Model ) {
			return this.Model;
		}

		const Base = super.getModel();

		this.Model = class extends Base {
			getDefaultChildren() {
				const withIds = ( element ) => ( {
					...element,
					id: refractionCommon.helpers.getUniqueId(),
					settings: { ...( element.settings || {} ) },
					elements: ( element.elements || [] ).map( withIds ),
				} );

				return super.getDefaultChildren().map( ( child ) => ( { ...withIds( structuredClone( child ) ), isLocked: true } ) );
			}
		};

		return this.Model;
	}
}

export default ShowcaseWheel;
