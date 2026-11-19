/**
 * Display Conditions > Form field's answer (0.123.0): the Field list offers the fields of the Form page being edited,
 * as they are now (added, renamed or keyed since the last save), each by its key, as the form saves it.
 */
const DC_ITEMS = 'refraction_dc_items';
const FIELD_PREFIX = 'rfb-field-';

/** A key as the form makes one from a label (mirrors Schema::key). */
export function fieldKey( text ) {
	let key = String( text || '' ).trim().toLowerCase().replace( /[^a-z0-9_]+/g, '_' ).replace( /^_+|_+$/g, '' );

	if ( key && ! /^[a-z]/.test( key ) ) {
		key = 'f_' + key;
	}

	return key.slice( 0, 40 );
}

/** The value fields of the document, in page order: [ key, label ]. */
export function formFields( document ) {
	const saved = ( document && document.config && document.config.rfbFieldKeys ) || {};
	const found = [];
	const seen = new Set();
	const walk = ( container ) => {
		( container.children || [] ).forEach( ( child ) => {
			const type = child.model && child.model.get( 'widgetType' );

			if ( type && type.startsWith( FIELD_PREFIX ) && ! [ 'rfb-field-group', 'rfb-field-repeater' ].includes( type ) ) {
				const settings = child.settings;
				const label = settings.get( 'field_label' ) || type.slice( FIELD_PREFIX.length );
				const key = fieldKey( settings.get( 'field_key' ) ) || saved[ child.id ] || fieldKey( label );

				if ( key && ! seen.has( key ) ) {
					seen.add( key );
					found.push( [ key, label ] );
				}
			}

			walk( child );
		} );
	};

	if ( document && document.container ) {
		walk( document.container );
	}

	return found;
}

/** Puts the current fields into the Field list of the element's Display Conditions, before its panel draws them. */
function fillFieldList( model ) {
	// The panel draws from the element type's control list (the element's own model holds only part of it).
	const type = model && ( model.get( 'widgetType' ) || model.get( 'elType' ) );
	const cache = ( type && refraction.widgetsCache && refraction.widgetsCache[ type ] ) || ( type && refraction.config.elements && refraction.config.elements[ type ] );
	const controls = cache && cache.controls;
	const fields = controls && controls[ DC_ITEMS ] && controls[ DC_ITEMS ].fields;
	// The repeater's fields come as a list (or keyed by name).
	const field = fields && ( Array.isArray( fields ) ? fields.find( ( f ) => 'dc_field' === f.name ) : Object.values( fields ).find( ( f ) => 'dc_field' === f.name ) );

	if ( ! field ) {
		return;
	}

	const options = { '': field.options[ '' ] || '' };

	formFields( refraction.documents.getCurrent() ).forEach( ( [ key, label ] ) => {
		options[ key ] = label + ' (' + key + ')';
	} );

	field.options = options;
}

export function watchDisplayFields() {
	[ 'widget', 'container', 'section', 'column' ].forEach( ( type ) => {
		refraction.hooks.addAction( 'panel/open_editor/' + type, ( panel, model ) => fillFieldList( model ) );
	} );
}
