#!/usr/bin/env node
/**
 * Packages the Just Refraction theme (themes/just-refraction) as dist/just-refraction.zip, with a just-refraction/
 * folder inside, ready for Appearance > Themes > Add New > Upload Theme. Run by build-release.mjs; the release
 * workflow attaches the zip to every GitHub release next to refraction.zip.
 *
 * Usage: node scripts/build-theme.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const THEMES = join( ROOT, 'themes' );
const OUT = join( ROOT, 'dist/just-refraction.zip' );

for ( const required of [ 'style.css', 'functions.php', 'index.php', 'header.php', 'footer.php', 'screenshot.png' ] ) {
	if ( ! existsSync( join( THEMES, 'just-refraction', required ) ) ) {
		console.error( `[theme] themes/just-refraction/${ required } is missing` );
		process.exit( 1 );
	}
}

const version = ( readFileSync( join( THEMES, 'just-refraction/style.css' ), 'utf8' ).match( /^Version:\s*(\S+)/m ) || [] )[ 1 ];
const stable = ( readFileSync( join( THEMES, 'just-refraction/readme.txt' ), 'utf8' ).match( /^Stable tag:\s*(\S+)/m ) || [] )[ 1 ];

if ( ! version || version !== stable ) {
	console.error( `[theme] style.css Version (${ version }) and readme.txt Stable tag (${ stable }) must agree` );
	process.exit( 1 );
}

mkdirSync( dirname( OUT ), { recursive: true } );
rmSync( OUT, { force: true } );
execFileSync( 'zip', [ '-qr', '-X', OUT, 'just-refraction', '-x', '*.DS_Store', '*~' ], { cwd: THEMES, stdio: 'inherit' } );
console.log( `[theme] Just Refraction ${ version } -> dist/just-refraction.zip` );
