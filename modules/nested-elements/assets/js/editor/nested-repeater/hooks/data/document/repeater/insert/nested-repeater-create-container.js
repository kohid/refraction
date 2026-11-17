import Base from '../../../base';

/**
 * A new item of a widget that asks for it (new_items_like_defaults, 0.111.0): the settings and inner elements of one of
 * its default children (in turn), each element with a new id. Otherwise nothing: an empty container.
 *
 * @param {Object} container The widget.
 * @param {number} index     The new item's index.
 * @return {Object} Extra model properties.
 */
function newItemContent( container, index ) {
	const config = container.view.model.config;
	const defaults = config?.defaults?.elements || [];

	if ( ! config?.new_items_like_defaults || ! defaults.length ) {
		return {};
	}

	const source = defaults[ index % defaults.length ];
	const fresh = ( element ) => ( {
		...element,
		id: refractionCommon.helpers.getUniqueId(),
		settings: { ...( element.settings || {} ) },
		elements: ( element.elements || [] ).map( fresh ),
	} );
	// Its own title ("Slide #4"), not the default child's.
	const settings = { ...( source.settings || {} ), _title: extractNestedItemTitle( container, index ) };

	return {
		settings,
		elements: structuredClone( source.elements || [] ).map( fresh ),
	};
}
import {
	extractNestedItemTitle,
	shouldUseAtomicRepeaters,
} from 'refraction/modules/nested-elements/assets/js/editor/utils';

/**
 * Hook responsible for:
 * a. Create container element for each created repeater item.
 * b. Set setting `_title` for the new container.
 * c. Since the core mechanism does not support nested by default,
 *    the hook take care of duplicating the children for the new container.
 */
export class NestedRepeaterCreateContainer extends Base {
	getId() {
		return 'document/repeater/insert--nested-repeater-create-container';
	}

	getCommand() {
		return 'document/repeater/insert';
	}

	getConditions( args ) {
		// Will only handle when command called directly and not through another command like `duplicate` or `move`.
		const isCommandCalledDirectly = $e.commands.isCurrentFirstTrace( this.getCommand() );

		return super.getConditions( args ) && isCommandCalledDirectly;
	}

	apply( { container, name } ) {
		const index = container.repeaters[ name ].children.length;

		$e.run( 'document/elements/create', {
			container,
			model: {
				elType: 'container',
				isLocked: true,
				_title: extractNestedItemTitle( container, index ),
				...newItemContent( container, index ),
			},
			options: {
				edit: false, // Not losing focus.
			},
		} );

		const widgetType = container.settings.get( 'widgetType' );

		if ( shouldUseAtomicRepeaters( widgetType ) ) {
			refraction.$preview[ 0 ].contentWindow.dispatchEvent(
				new CustomEvent( 'refraction/nested-container/atomic-repeater', {
					detail: {
						container,
						action: {
							type: 'create',
						},
					} },
				) );
		}
	}
}

export default NestedRepeaterCreateContainer;
