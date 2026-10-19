#!/usr/bin/env node
// WCAG contrast gate for the UI themes: node scripts/check-ui-theme-contrast.mjs [--verbose]
// Reads the token tables from assets/ui-theme/ui-themes.css and fails below AA
// (4.5:1 for text, 3:1 for UI components and focus indicators).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const css = readFileSync( path.join( root, 'assets/ui-theme/ui-themes.css' ), 'utf8' );
const verbose = process.argv.includes( '--verbose' );

export function parseThemes( source ) {
	const themes = {};
	const re = /\[data-refraction-theme="([a-z]+)"\][^{]*\{([^}]*)\}/g;
	let m;
	while ( ( m = re.exec( source ) ) ) {
		const tokens = {};
		for ( const d of m[ 2 ].matchAll( /--rf-([a-z0-9-]+)\s*:\s*([^;]+);/g ) ) {
			tokens[ d[ 1 ] ] = d[ 2 ].trim();
		}
		themes[ m[ 1 ] ] = tokens;
	}
	return themes;
}

export function parseColor( value ) {
	let m = /^#([0-9a-f]{6})$/i.exec( value );
	if ( m ) {
		const n = parseInt( m[ 1 ], 16 );
		return [ n >> 16 & 255, n >> 8 & 255, n & 255, 1 ];
	}
	m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec( value );
	if ( m ) {
		return [ +m[ 1 ], +m[ 2 ], +m[ 3 ], m[ 4 ] === undefined ? 1 : +m[ 4 ] ];
	}
	throw new Error( 'Unparseable colour: ' + value );
}

const over = ( fg, bg ) => [ 0, 1, 2 ].map( ( i ) => fg[ i ] * fg[ 3 ] + bg[ i ] * ( 1 - fg[ 3 ] ) ).concat( 1 );
const lum = ( c ) => {
	const [ r, g, b ] = c.slice( 0, 3 ).map( ( v ) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow( ( v + 0.055 ) / 1.055, 2.4 );
	} );
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = ( a, b ) => {
	const [ hi, lo ] = [ lum( a ), lum( b ) ].sort( ( x, y ) => y - x );
	return ( hi + 0.05 ) / ( lo + 0.05 );
};

const TEXT = 4.5, UI = 3;

export function pairsFor( t ) {
	const c = ( k ) => parseColor( t[ k ] );
	const pairs = [];
	const add = ( label, fg, bg, min ) => pairs.push( { label, ratio: ratio( fg, bg ), min } );
	for ( const bgName of [ 'bg', 'surface', 'surface-2' ] ) {
		add( `text on ${ bgName }`, c( 'text' ), c( bgName ), TEXT );
		add( `text-dim on ${ bgName }`, c( 'text-dim' ), c( bgName ), TEXT );
	}
	for ( const bgName of [ 'bg', 'surface' ] ) {
		add( `accent on ${ bgName }`, c( 'accent' ), c( bgName ), TEXT );
		add( `danger on ${ bgName }`, c( 'danger' ), c( bgName ), TEXT );
		for ( const sev of [ 'pass', 'warn', 'fail' ] ) {
			add( `${ sev } on ${ bgName }`, c( sev ), c( bgName ), TEXT );
			add( `${ sev } on ${ sev }-soft over ${ bgName }`, c( sev ), over( c( sev + '-soft' ), c( bgName ) ), TEXT );
		}
		add( `accent-hover (link hover) on ${ bgName }`, c( 'accent-hover' ), c( bgName ), TEXT );
		add( `accent on accent-soft over ${ bgName }`, c( 'accent' ), over( c( 'accent-soft' ), c( bgName ) ), TEXT );
		add( `field border (field-line) vs ${ bgName }`, c( 'field-line' ), c( bgName ), UI );
		add( `focus ring / accent vs ${ bgName }`, c( 'accent' ), c( bgName ), UI );
	}
	add( 'accent-ink on accent (button)', c( 'accent-ink' ), c( 'accent' ), TEXT );
	add( 'accent-ink on accent-hover (button hover)', c( 'accent-ink' ), c( 'accent-hover' ), TEXT );
	add( 'danger-ink on danger (button)', c( 'danger-ink' ), c( 'danger' ), TEXT );
	add( 'danger-ink on danger-hover (button hover)', c( 'danger-ink' ), c( 'danger-hover' ), TEXT );
	add( 'chrome-ink on chrome (editor top bar)', c( 'chrome-ink' ), c( 'chrome' ), TEXT );
	add( 'chrome-accent on chrome (active top bar item)', c( 'chrome-accent' ), c( 'chrome' ), TEXT );
	return pairs;
}

const themes = parseThemes( css );
const required = [ 'daylight', 'graphite', 'ember', 'blueprint', 'contrast' ];
let failures = 0;

for ( const name of required ) {
	if ( ! themes[ name ] ) {
		console.log( `FAIL ${ name }: theme block missing` );
		failures++;
		continue;
	}
	let results;
	try {
		results = pairsFor( themes[ name ] );
	} catch ( e ) {
		console.log( `FAIL ${ name }: ${ e.message }` );
		failures++;
		continue;
	}
	const bad = results.filter( ( r ) => r.ratio < r.min );
	for ( const r of results ) {
		if ( verbose || r.ratio < r.min ) {
			console.log( `${ r.ratio < r.min ? 'FAIL' : 'ok  ' } ${ name.padEnd( 9 ) } ${ r.ratio.toFixed( 2 ).padStart( 5 ) } (min ${ r.min })  ${ r.label }` );
		}
	}
	failures += bad.length;
	console.log( `${ bad.length ? 'FAIL' : 'ok' } ${ name }: ${ results.length - bad.length }/${ results.length } pairs pass` );
}

console.log( failures ? `\ncontrast: ${ failures } failure(s)` : '\ncontrast: all themes meet WCAG AA' );
process.exit( failures ? 1 : 0 );
