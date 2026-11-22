/**
 * Records Table and Record Details (0.147.0): once a collection is chosen, every field setting (Sort by, a column's
 * Field, Second line, From / Stops / To, the details title) lists only that collection's fields, by their own label.
 * The panel's lists are built once for every collection, so the choices are narrowed here, as the panel draws them.
 */
const WIDGETS = [ 'refraction-records-table', 'refraction-record-details' ];
const fieldsOf = () => window.refractionRecordsFields || {};

let current = null;

/** Every field key of every collection: the options this script narrows (the record's own parts start with _). */
const allKeys = () => {
	const keys = new Set();

	Object.values( fieldsOf() ).forEach( ( fields ) => Object.keys( fields ).forEach( ( key ) => keys.add( key ) ) );

	return keys;
};

/** Whether the panel still shows the widget's settings (not the page's, or another widget's). */
const editing = () => {
	try {
		return window.refraction.getPanelView().getCurrentPageView().model === current;
	} catch ( e ) {
		return false;
	}
};

const narrow = ( root ) => {
	if ( ! current || ! root || ! editing() ) {
		return;
	}

	const slug = current.get( 'settings' ).get( 'collection' ) || '';
	const own = fieldsOf()[ slug ];
	const every = allKeys();

	root.querySelectorAll( 'select[data-setting]' ).forEach( ( select ) => {
		if ( 'collection' === select.dataset.setting ) {
			return;
		}

		Array.from( select.options ).forEach( ( option ) => {
			if ( ! every.has( option.value ) ) {
				return;
			}

			if ( undefined === option.dataset.rfAll ) {
				option.dataset.rfAll = option.textContent;
			}

			// No collection chosen yet: everything, as listed by the server ("Collection: Field").
			const keep = ! own || Object.prototype.hasOwnProperty.call( own, option.value );

			option.hidden = ! keep;
			option.disabled = ! keep && ! option.selected;
			option.textContent = own && keep ? own[ option.value ] : option.dataset.rfAll;
		} );
	} );
};

const panelRoot = () => document.getElementById( 'refraction-panel' );

window.addEventListener( 'refraction/init', () => {
	window.refraction.hooks.addAction( 'panel/open_editor/widget', ( panel, model ) => {
		current = WIDGETS.includes( model.get( 'widgetType' ) ) ? model : null;

		if ( ! current ) {
			return;
		}

		const settings = model.get( 'settings' );

		// Backbone has no event namespaces: one handler per model, kept on it.
		if ( ! settings.rfFieldsOn ) {
			settings.rfFieldsOn = true;
			settings.on( 'change:collection', () => model === current && narrow( panelRoot() ) );
		}

		narrow( panelRoot() );
	} );

	// Sections, tabs and repeater rows are drawn later, as they open.
	let queued = false;

	new MutationObserver( () => {
		if ( ! current || queued ) {
			return;
		}

		queued = true;
		window.requestAnimationFrame( () => {
			queued = false;
			narrow( panelRoot() );
		} );
	} ).observe( document.body, { childList: true, subtree: true } );
} );
