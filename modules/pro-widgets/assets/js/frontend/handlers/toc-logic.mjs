/**
 * Pure helpers for the Table of Contents (no DOM): heading ids and hierarchical numbering.
 */

/**
 * URL-safe id from heading text. Keeps letters and digits of any script; accents are folded.
 *
 * @param {string} text Heading text.
 * @return {string} The slug, or "section" when nothing usable is left.
 */
export function slugify( text ) {
	const slug = String( text )
		.normalize( 'NFD' )
		.replace( /[̀-ͯ]/g, '' )
		.toLowerCase()
		.replace( /[^\p{L}\p{N}]+/gu, '-' )
		.replace( /^-+|-+$/g, '' );

	return slug || 'section';
}

/**
 * `base`, or `base-2`, `base-3`... when the id is already taken.
 *
 * @param {string}      base The wanted id.
 * @param {Set<string>} used Ids already on the page.
 * @return {string} A free id.
 */
export function uniqueId( base, used ) {
	if ( ! used.has( base ) ) {
		return base;
	}

	let n = 2;

	while ( used.has( `${ base }-${ n }` ) ) {
		n++;
	}

	return `${ base }-${ n }`;
}

/**
 * @param {{level:number,text:string}[]} headings In document order; `level` is 1 for h1 ... 6 for h6.
 * @return {{level:number,text:string,depth:number,number:string}[]} Blank headings are dropped. `depth` is the
 * nesting depth (a skipped level counts as a single step) and `number` is "1.", "1.1", "1.1.1"...
 */
export function buildOutline( headings ) {
	const items = [];
	const stack = [];
	const counters = [];

	headings.forEach( ( heading ) => {
		const text = String( heading.text || '' ).trim();

		if ( ! text ) {
			return;
		}

		while ( stack.length && stack[ stack.length - 1 ] >= heading.level ) {
			stack.pop();
		}

		const depth = stack.length;

		stack.push( heading.level );
		counters.length = depth + 1;
		counters[ depth ] = ( counters[ depth ] || 0 ) + 1;

		const number = counters.map( ( c ) => c || 1 ).join( '.' );

		items.push( { ...heading, text, depth, number: 0 === depth ? `${ number }.` : number } );
	} );

	return items;
}
