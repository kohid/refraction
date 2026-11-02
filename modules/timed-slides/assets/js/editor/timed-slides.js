import View from './views/view';

/**
 * Timed Slides in the editor. A new widget starts with three slides whose containers hold example widgets (an
 * eyebrow, a title, text and a button); every element of that example gets its own id.
 */
export class TimedSlides extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-timed-slides';
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

export default TimedSlides;
