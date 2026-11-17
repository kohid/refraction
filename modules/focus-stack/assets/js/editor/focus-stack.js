import View from './views/view';

/**
 * Focus Stack in the editor. A new widget starts with three slides, each a container holding its Header, Content and
 * Footer containers with an example inside; every element of that example gets its own id.
 */
export class FocusStack extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-focus-stack';
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

export default FocusStack;
