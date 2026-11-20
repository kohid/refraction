/**
 * Records Table and Record Details ask the site for records through one admin-ajax action, sending back the signed
 * settings their widget was drawn with (classes/ajax.php checks them, the nonce and who is asking).
 *
 * @param {HTMLElement} root The widget's root, carrying data-ajax, data-nonce, data-config and data-sig.
 * @param {string}      op   Rows, csv, record or status.
 * @param {Object}      data More fields for the request.
 */
export const ask = async ( root, op, data = {} ) => {
	const body = new FormData();

	body.append( 'action', 'refraction_records' );
	body.append( 'nonce', root.dataset.nonce || '' );
	body.append( 'config', root.dataset.config || '' );
	body.append( 'sig', root.dataset.sig || '' );
	body.append( 'op', op );

	Object.entries( data ).forEach( ( [ key, value ] ) => {
		if ( undefined !== value && null !== value ) {
			body.append( key, String( value ) );
		}
	} );

	const response = await fetch( root.dataset.ajax, { method: 'POST', body, credentials: 'same-origin' } );
	let json = null;

	try {
		json = await response.json();
	} catch ( error ) {
		throw new Error( 'The records could not be loaded.' );
	}

	if ( ! json || ! json.success ) {
		throw new Error( json?.data?.message || 'The records could not be loaded.' );
	}

	return json.data;
};

export const collectionOf = ( root ) => {
	try {
		return JSON.parse( root.dataset.config || '{}' ).c || '';
	} catch ( error ) {
		return '';
	}
};
