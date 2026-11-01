/**
 * Puts what Claude built into the open document through the editor's own commands, as one step that Undo reverts.
 */

const preview = () => window.refraction.getPreviewContainer();

/**
 * The top-level container that holds a container (or itself), for "add a section after the selected element".
 *
 * @param {Object} container An editor container.
 * @return {Object} Its top-level container.
 */
function topLevel( container ) {
	let current = container;

	while ( current && current.parent && current.parent.id !== preview().id && 'document' !== current.parent.type ) {
		current = current.parent;
	}

	return current;
}

function indexIn( container ) {
	return container && container.parent ? container.parent.children.indexOf( container ) : -1;
}

export function selected() {
	const list = window.refraction.selection ? window.refraction.selection.getElements() : [];

	return list && list.length ? list[ 0 ] : null;
}

export function pageIsEmpty() {
	return ! preview().children.length;
}

function create( parent, elements, at ) {
	elements.forEach( ( model, i ) => {
		window.$e.run( 'document/elements/create', { container: parent, model, options: { at: at + i, edit: false } } );
	} );
}

/**
 * @param {string} mode     page, section or selected.
 * @param {Array}  elements The checked elements from the server.
 */
export function insert( mode, elements ) {
	const log = window.$e.internal( 'document/history/start-log', { type: 'add', title: 'Ask Claude' } );

	try {
		if ( 'page' === mode ) {
			[ ...preview().children ].forEach( ( child ) => window.$e.run( 'document/elements/delete', { container: child } ) );
			create( preview(), elements, 0 );
		} else if ( 'section' === mode ) {
			const after = selected() ? topLevel( selected() ) : null;
			const at = after ? indexIn( after ) + 1 : preview().children.length;
			create( preview(), elements, at );
		} else {
			const target = selected();
			const parent = target.parent;
			const at = indexIn( target );
			// A container that replaces a top-level one is top-level too.
			const top = parent.id === preview().id;
			create( parent, elements.map( ( el ) => ( 'container' === el.elType ? { ...el, isInner: ! top } : el ) ), at );
			window.$e.run( 'document/elements/delete', { container: target } );
		}
	} finally {
		window.$e.internal( 'document/history/end-log', { id: log } );
	}
}

/**
 * The current page (or the selected element) as JSON, without editor-only defaults, for Claude to match.
 *
 * @param {string} mode page, section or selected.
 * @return {string} JSON, or '' for a whole new page.
 */
export function context( mode ) {
	if ( 'selected' === mode ) {
		const target = selected();

		return target ? JSON.stringify( target.model.toJSON( { remove: [ 'default', 'editSettings', 'defaultEditSettings' ] } ) ) : '';
	}

	if ( 'section' === mode ) {
		return JSON.stringify( preview().children.map( ( child ) => child.model.toJSON( { remove: [ 'default', 'editSettings', 'defaultEditSettings' ] } ) ) );
	}

	return '';
}
