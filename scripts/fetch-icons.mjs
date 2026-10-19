#!/usr/bin/env node
/**
 * Download Material Symbols (Light set) icons into the plugin so they ship inside the zip.
 *
 * Usage: node scripts/fetch-icons.mjs [--style outline-rounded] name [name ...]
 *
 * Source: https://github.com/kohid/icons (browse it at https://kohid.github.io/icons/),
 * `material-symbols-light`, Google Material Symbols, Apache License 2.0.
 *
 * Icons are fetched at DEVELOPMENT time only. The plugin never loads icons from the web:
 * the files land in assets/icons/material/<name>.svg and are printed inline by
 * \Refraction\Core\Utils\Icons::svg() (or used as a CSS mask through Icons::url()).
 *
 * `--style` picks the preferred style; when an icon does not have it the script falls back
 * through outline-rounded, outline, rounded, regular, sharp. The chosen style is recorded in
 * assets/icons/material/index.json. Names are the Material names with dashes ("dark-mode").
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );
const OUT = join( ROOT, 'assets/icons/material' );
const SET = 'material-symbols-light';
const CDN = `https://cdn.jsdelivr.net/gh/kohid/icons@main/${ SET }`;
// jsDelivr refuses files from this repo when its package grows past 50 MB; GitHub raw always works.
const RAW = `https://raw.githubusercontent.com/kohid/icons/main/${ SET }`;
const FALLBACK_STYLES = [ 'outline-rounded', 'outline', 'rounded', 'regular', 'sharp', 'outline-sharp' ];
const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** @param {string} url @return {Promise<Response>} */
async function get( url ) {
	const response = await fetch( url, { redirect: 'follow' } );

	return response;
}

/** Keep only what an inline icon needs: the path data, painted with currentColor. */
export function normalizeSvg( raw ) {
	const viewBox = ( raw.match( /viewBox="([^"]+)"/ ) || [] )[ 1 ] || '0 -960 960 960';
	const paths = [ ...raw.matchAll( /<path\b[^>]*\sd="([^"]+)"[^>]*\/?>/g ) ].map( ( m ) => m[ 1 ] );

	if ( ! paths.length || /<script|onload=|onclick=|href=/i.test( raw ) ) {
		throw new Error( 'unexpected SVG content' );
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ viewBox }" fill="currentColor" focusable="false" aria-hidden="true">${ paths.map( ( d ) => `<path d="${ d }"/>` ).join( '' ) }</svg>\n`;
}

async function main() {
	const args = process.argv.slice( 2 );
	let style = 'outline-rounded';
	const names = [];

	for ( let i = 0; i < args.length; i++ ) {
		if ( args[ i ] === '--style' ) {
			style = args[ ++i ];
		} else if ( args[ i ].startsWith( '--style=' ) ) {
			style = args[ i ].slice( 8 );
		} else {
			names.push( args[ i ] );
		}
	}

	if ( ! names.length ) {
		console.error( 'usage: node scripts/fetch-icons.mjs [--style outline-rounded] name [name ...]' );
		process.exit( 2 );
	}

	const manifestResponse = await get( `${ CDN }/manifest.json` );

	if ( ! manifestResponse.ok ) {
		throw new Error( `cannot read the icon manifest (HTTP ${ manifestResponse.status })` );
	}

	const manifest = await manifestResponse.json();
	await mkdir( OUT, { recursive: true } );
	const indexFile = join( OUT, 'index.json' );
	const index = existsSync( indexFile ) ? JSON.parse( await readFile( indexFile, 'utf8' ) ) : {};
	let failed = 0;

	for ( const name of names ) {
		const styles = manifest.icons[ name ];

		if ( ! NAME.test( name ) || ! styles ) {
			console.error( `unknown icon: ${ name }` );
			failed++;
			continue;
		}

		const chosen = [ style, ...FALLBACK_STYLES ].find( ( s ) => styles.includes( s ) );
		const file = `${ name }${ manifest.styleSuffix[ chosen ] }.svg`;
		let response = await get( `${ CDN }/svg/${ file }` );

		if ( ! response.ok ) {
			response = await get( `${ RAW }/svg/${ file }` );
		}

		if ( ! response.ok ) {
			console.error( `cannot download ${ file } (HTTP ${ response.status })` );
			failed++;
			continue;
		}

		await writeFile( join( OUT, `${ name }.svg` ), normalizeSvg( await response.text() ) );
		index[ name ] = chosen;
		console.log( `ok  ${ name} (${ chosen })` );
	}

	await writeFile( indexFile, JSON.stringify( Object.fromEntries( Object.entries( index ).sort() ), null, '\t' ) + '\n' );
	process.exit( failed ? 1 : 0 );
}

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {
	main().catch( ( error ) => {
		console.error( error.message );
		process.exit( 1 );
	} );
}
