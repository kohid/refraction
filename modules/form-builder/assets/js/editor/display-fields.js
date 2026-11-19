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
	const lists = formFields( refraction.documents.getCurrent() );

	// Display Conditions > Field, and Changes with the answers > When field (0.125.0).
	[ [ DC_ITEMS, 'dc_field' ], [ 'rfb_swap_rows', 'field' ], [ 'rfb_swap_rows', 'field2' ], [ 'rfb_choice_swaps', 'field' ], [ 'rfb_choice_swaps', 'field2' ] ].forEach( ( [ repeater, name ] ) => {
		const fields = controls && controls[ repeater ] && controls[ repeater ].fields;
		// The repeater's fields come as a list (or keyed by name).
		const field = fields && ( Array.isArray( fields ) ? fields : Object.values( fields ) ).find( ( f ) => name === f.name );

		if ( ! field ) {
			return;
		}

		const options = { '': field.options[ '' ] || '' };

		lists.forEach( ( [ key, label ] ) => {
			options[ key ] = label + ' (' + key + ')';
		} );

		field.options = options;
	} );
}

/**
 * Advanced > Conditional visibility of any element (0.124.0) is for Form pages, and fields keep their own: the
 * element's section is hidden on other pages and on a widget that has the field one.
 */
function toggleElementConditions( model ) {
	const type = model && ( model.get( 'widgetType' ) || model.get( 'elType' ) );
	const cache = type && refraction.widgetsCache && refraction.widgetsCache[ type ];
	const document = refraction.documents.getCurrent();
	const formPage = !! ( document && document.config && 'rfb-form' === document.config.type );
	const ownSection = !! ( cache && cache.controls && cache.controls.section_conditions );

	window.document.body.classList.toggle( 'rfb-hide-el-cond', ! formPage || ownSection );
	window.document.body.classList.toggle( 'rfb-not-form', ! formPage );
}

export function watchDisplayFields() {
	const style = window.document.createElement( 'style' );

	style.textContent = '.rfb-hide-el-cond .refraction-control-section_rfb_conditions,.rfb-not-form .refraction-control-section_rfb_swap{display:none!important}';
	window.document.head.appendChild( style );

	// Before the panel draws the element: its Content tab (Changes with the answers) is drawn at once.
	class FillFormFields extends $e.modules.hookUI.Before {
		getCommand() {
			return 'panel/editor/open';
		}

		getId() {
			return 'rfb-fill-form-fields';
		}

		apply( args ) {
			const model = args.model || ( args.view && args.view.model );

			fillFieldList( model );
			toggleElementConditions( model );
		}
	}

	$e.hooks.registerUIBefore( new FillFormFields() );

	[ 'widget', 'container', 'section', 'column' ].forEach( ( type ) => {
		refraction.hooks.addAction( 'panel/open_editor/' + type, ( panel, model ) => {
			fillFieldList( model );
			toggleElementConditions( model );
		} );
	} );
}
