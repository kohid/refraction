export function extractNestedItemTitle( container, index ) {
	const title = container.view.model.config.defaults.elements_title;

	// Translations comes from server side.
	return sprintf( title, index );
}

export function isWidgetSupportNesting( widgetType ) {
	const widgetConfig = refraction.widgetsCache[ widgetType ];

	if ( ! widgetConfig ) {
		return false;
	}

	return widgetConfig.support_nesting;
}

export function isWidgetSupportAtomicRepeaters( widgetType ) {
	const widgetConfig = refraction.widgetsCache[ widgetType ];

	if ( ! widgetConfig ) {
		return false;
	}

	return widgetConfig.support_improved_repeaters;
}

export function widgetNodes( widgetType ) {
	const widgetConfig = refraction.widgetsCache[ widgetType ];

	if ( ! widgetConfig ) {
		return false;
	}

	return {
		targetContainer: widgetConfig.target_container,
		node: widgetConfig.node,
	};
}

export function findChildContainerOrFail( container, index ) {
	// By the elements' order (the list's), not the views' (0.138.0): the views are kept in the order they were made,
	// so after a slide was moved or added, moving, duplicating or removing another took the wrong slide's container,
	// and slides swapped their content against their settings (picture, background, title).
	const model = container.model.get( 'elements' ).at( index );
	const childView = model ? container.view.children.findByModel( model ) : null;

	if ( ! childView ) {
		throw new Error( 'Child container was not found for the current repeater item.' );
	}

	return childView.getContainer();
}

export function shouldUseAtomicRepeaters( widgetType ) {
	return isWidgetSupportNesting( widgetType ) && isWidgetSupportAtomicRepeaters( widgetType );
}

export function sortViewsByModels( container ) {
	const models = container.model.get( 'elements' ).models,
		children = container.view.children,
		updatedViews = {};

	models.forEach( ( model, index ) => {
		const view = children.findByModel( model );
		view._index = index;
		updatedViews[ view.cid ] = view;
	} );

	return updatedViews;
}

/**
 * The item slots of a widget's repeater in its target container (0.147.0): those matching the widget's
 * child_container_placeholder_selector when some do, else every child of the target. The widget can draw other things
 * beside its slots (the Steps widget's progress bar): an item's place counts only the slots.
 *
 * @param {Container}   container The widget's container.
 * @param {HTMLElement} target    The target container element.
 * @return {{list: HTMLElement[], own: boolean}} The slots, and whether they were told apart from other children.
 */
export function repeaterSlots( container, target ) {
	const children = target ? Array.from( target.children ) : [];
	const selector = container?.view?.model?.config?.defaults?.child_container_placeholder_selector;
	const slots = selector ? children.filter( ( child ) => child.matches( selector ) ) : [];

	return slots.length ? { list: slots, own: true } : { list: children, own: false };
}
