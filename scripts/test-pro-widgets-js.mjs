/**
 * Standalone tests for the pure JavaScript logic of the Pro widgets (no browser, no WordPress).
 * Run: node scripts/test-pro-widgets-js.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join( dirname( fileURLToPath( import.meta.url ) ), '../modules/pro-widgets/assets/js/frontend/handlers' );

let toc;
try {
	toc = await import( join( root, 'toc-logic.mjs' ) );
} catch ( e ) {
	console.log( `MISSING toc-logic.mjs: ${ e.message.split( '\n' )[ 0 ] }` );
	process.exit( 1 );
}

const { slugify, uniqueId, buildOutline } = toc;
let failures = 0;
let total = 0;
const t = ( name, actual, expected ) => {
	total++;
	const ok = JSON.stringify( actual ) === JSON.stringify( expected );
	if ( ! ok ) { failures++; }
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ name }${ ok ? '' : `\n     expected: ${ JSON.stringify( expected ) }\n     actual:   ${ JSON.stringify( actual ) }` }` );
};

t( 'slugify: lowercases and dashes', slugify( 'Hello, World!' ), 'hello-world' );
t( 'slugify: strips accents', slugify( 'Café Crème' ), 'cafe-creme' );
t( 'slugify: keeps non-latin letters', slugify( '日本語 2' ), '日本語-2' );
t( 'slugify: empty falls back', slugify( '  !!  ' ), 'section' );
t( 'slugify: collapses runs', slugify( 'a  --  b' ), 'a-b' );

t( 'uniqueId: free id is kept', uniqueId( 'intro', new Set() ), 'intro' );
t( 'uniqueId: taken id gets -2', uniqueId( 'intro', new Set( [ 'intro' ] ) ), 'intro-2' );
t( 'uniqueId: keeps counting', uniqueId( 'intro', new Set( [ 'intro', 'intro-2' ] ) ), 'intro-3' );

const outline = ( levels ) => buildOutline( levels.map( ( level, i ) => ( { level, text: `H${ i }` } ) ) ).map( ( x ) => x.number );
t( 'numbering: h2 h3 h3 h2 h4 h3', outline( [ 2, 3, 3, 2, 4, 3 ] ), [ '1.', '1.1', '1.2', '2.', '2.1', '2.2' ] );
t( 'numbering: skipped level counts as one step', outline( [ 2, 4 ] ), [ '1.', '1.1' ] );
t( 'numbering: first heading deeper than later ones', outline( [ 3, 2, 3 ] ), [ '1.', '2.', '2.1' ] );
t( 'numbering: three levels', outline( [ 2, 3, 4, 4, 3, 2 ] ), [ '1.', '1.1', '1.1.1', '1.1.2', '1.2', '2.' ] );
t( 'depth values follow the numbering', buildOutline( [ { level: 2, text: 'a' }, { level: 4, text: 'b' }, { level: 3, text: 'c' } ] ).map( ( x ) => x.depth ), [ 0, 1, 1 ] );
t( 'empty list gives empty outline', buildOutline( [] ), [] );
t( 'headings with blank text are skipped', buildOutline( [ { level: 2, text: '  ' }, { level: 2, text: 'x' } ] ).map( ( x ) => [ x.text, x.number ] ), [ [ 'x', '1.' ] ] );

console.log( `\n${ total } tests, ${ failures } failed` );
process.exit( failures ? 1 : 0 );
