/**
 * Icon libraries drawn as inline SVG (Solar: a library config with `svgJson`, the { bodies: { name: inner markup } } of
 * one style). Each style's file is fetched once, when an icon of it is first drawn in the picker, the preview or a
 * control.
 */
const bodies = {},
	pending = {};

export function svgLibrary( libraryName ) {
	const library = ( refraction.config.icons?.libraries || [] ).find( ( item ) => item.name === libraryName );

	return library?.svgJson ? library : null;
}

/** The icon's name in a value such as "rf-solar rf-solar-home-smile". */
export function svgIconName( library, value ) {
	const last = String( value || '' ).trim().split( /\s+/ ).pop();

	return last.startsWith( library.prefix ) ? last.slice( library.prefix.length ) : '';
}

/** The inline SVG of an icon, or null while its library is being fetched (then `onLoad` is called). */
export function svgMarkup( library, name, onLoad ) {
	const loaded = bodies[ library.name ];

	if ( ! loaded ) {
		loadBodies( library ).then( () => onLoad && onLoad() );

		return null;
	}

	const body = loaded[ name ];

	return body ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em">${ body }</svg>` : '';
}

export function loadBodies( library ) {
	if ( bodies[ library.name ] ) {
		return Promise.resolve( bodies[ library.name ] );
	}

	if ( ! pending[ library.name ] ) {
		pending[ library.name ] = fetch( library.svgJson )
			.then( ( response ) => response.json() )
			.then( ( json ) => {
				bodies[ library.name ] = json.bodies || {};

				return bodies[ library.name ];
			} )
			.catch( () => {
				delete pending[ library.name ];

				return {};
			} );
	}

	return pending[ library.name ];
}
