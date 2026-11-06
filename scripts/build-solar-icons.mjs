#!/usr/bin/env node
/**
 * Builds the Solar icon library (480 Design, CC BY 4.0) into assets/lib/solar/ from the @iconify-json/solar package:
 * for each of its six styles (bold, bold-duotone, broken, line-duotone, linear, outline)
 *   - <style>.json        {"icons": [names]}: the picker's list (fetchJson),
 *   - <style>-svg.json    {"bodies": {name: svg inner markup}}: drawn in the picker and the editor preview,
 *   - <style>.php         return [ name => svg inner markup ]: drawn on the site (opcache keeps it in memory).
 * Duotone styles: the second layer (opacity .5 in Solar) gets the class rf-duo-f (painted with fill) or rf-duo-s
 * (painted with stroke), so the second color and its opacity can be set (assets/lib/solar/solar.css).
 *
 * Usage: node scripts/build-solar-icons.mjs [path/to/@iconify-json/solar/icons.json]
 *        (without a path the package is fetched with `npm pack` into a temporary folder)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const OUT = join( ROOT, 'assets/lib/solar' );
const STYLES = [ 'bold-duotone', 'line-duotone', 'bold', 'broken', 'linear', 'outline' ];

function source() {
	if ( process.argv[ 2 ] ) {
		return process.argv[ 2 ];
	}
	const dir = mkdtempSync( join( tmpdir(), 'solar-' ) );
	const tgz = execFileSync( 'npm', [ 'pack', '@iconify-json/solar', '--silent' ], { cwd: dir, encoding: 'utf8' } ).trim().split( '\n' ).pop();
	execFileSync( 'tar', [ 'xzf', tgz ], { cwd: dir } );
	return join( dir, 'package/icons.json' );
}

/** Tags the second layer of a duotone icon: elements with opacity .5 get rf-duo-f or rf-duo-s. */
export function markDuotone( body ) {
	const stack = []; // paint of the open <g> elements: 'f', 's' or ''
	return body.replace( /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g, ( all, closing, tag, attrs, selfClosing ) => {
		if ( closing ) {
			if ( 'g' === tag ) {
				stack.pop();
			}
			return all;
		}
		const fill = ( attrs.match( /\sfill="([^"]*)"/ ) || [] )[ 1 ];
		const stroke = ( attrs.match( /\sstroke="([^"]*)"/ ) || [] )[ 1 ];
		const own = fill && 'none' !== fill ? 'f' : ( stroke && 'none' !== stroke ? 's' : '' );
		const inherited = [ ...stack ].reverse().find( ( p ) => p ) || '';
		const paint = own || ( fill === 'none' && ! stroke ? '' : inherited );
		let out = attrs;
		if ( /\sopacity="\.5"/.test( attrs ) && paint ) {
			out = /\sclass="/.test( out ) ? out.replace( /\sclass="/, ` class="rf-duo-${ paint } ` ) : `${ out } class="rf-duo-${ paint }"`;
		}
		if ( 'g' === tag && ! selfClosing ) {
			stack.push( own || ( fill === 'none' && stroke ? 's' : '' ) );
		}
		return `<${ tag }${ out }${ selfClosing }>`;
	} );
}

const phpString = ( s ) => `'${ s.replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" ) }'`;

function main() {
	const data = JSON.parse( readFileSync( source(), 'utf8' ) );
	mkdirSync( OUT, { recursive: true } );
	const counts = {};
	const width = data.width || 24;
	const height = data.height || 24;

	for ( const style of STYLES ) {
		const suffix = `-${ style }`;
		const bodies = {};
		for ( const [ key, icon ] of Object.entries( data.icons ) ) {
			if ( ! key.endsWith( suffix ) ) {
				continue;
			}
			// Another style ending the same way (bold vs bold-duotone).
			const name = key.slice( 0, -suffix.length );
			if ( STYLES.some( ( other ) => other !== style && other.endsWith( style ) && key.endsWith( `-${ other }` ) ) ) {
				continue;
			}
			if ( ( icon.width && icon.width !== width ) || ( icon.height && icon.height !== height ) ) {
				continue;
			}
			bodies[ name ] = style.endsWith( 'duotone' ) ? markDuotone( icon.body ) : icon.body;
		}
		const names = Object.keys( bodies ).sort();
		counts[ style ] = names.length;
		writeFileSync( join( OUT, `${ style }.json` ), JSON.stringify( { icons: names } ) );
		writeFileSync( join( OUT, `${ style }-svg.json` ), JSON.stringify( { bodies } ) );
		writeFileSync( join( OUT, `${ style }.php` ), `<?php\n// Solar icons (${ style }), 480 Design, CC BY 4.0. Built by scripts/build-solar-icons.mjs.\nreturn [\n${ names.map( ( n ) => `\t${ phpString( n ) } => ${ phpString( bodies[ n ] ) },` ).join( '\n' ) }\n];\n` );
	}

	writeFileSync( join( OUT, 'LICENSE.txt' ), `Solar icon set by 480 Design (https://www.figma.com/community/file/1166831539721848736)\nLicensed under Creative Commons Attribution 4.0 International (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/\nPackaged from @iconify-json/solar ${ ( () => { try { return JSON.parse( readFileSync( join( dirname( source() ), 'package.json' ), 'utf8' ) ).version; } catch { return ''; } } )() }. Changes: split by style; the duotone styles' second layer is marked with a class so its color can be set.\n` );
	console.log( `[solar] ${ JSON.stringify( counts ) } -> assets/lib/solar/` );
}

if ( process.argv[ 1 ] && fileURLToPath( import.meta.url ) === process.argv[ 1 ] ) {
	main();
}
