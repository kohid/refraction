#!/usr/bin/env node
/**
 * Builds the installable plugin package: dist/refraction.zip
 *
 * The zip has a single top-level `refraction/` folder that contains only what the plugin needs at
 * runtime (refraction.php, readme.txt, license.txt, NOTICE, includes, core, data, modules, app,
 * migrations, compiled assets, and the production Composer autoloader). Sources, tests, docs,
 * `packages/`, `assets/dev`, `scripts/`, CI and dev configuration are left out by the same file
 * rules the build uses (scripts/vite/shared/plugin-files.mjs).
 *
 * Usage:
 *   node scripts/build-release.mjs                 install --no-dev composer deps, run `npm run build`, package
 *   node scripts/build-release.mjs --skip-build    package what is already built (assets/js, assets/css, vendor)
 *   node scripts/build-release.mjs --tag v0.1.0    also fail unless the tag matches the plugin version
 *
 * Requires: node, the `zip` command line tool, and (unless --skip-build) composer and npm.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { assemblePlugin } from './vite/assemble-plugin.mjs';
import { BUILD_DIR, ROOT } from './vite/shared/paths.mjs';

const args = process.argv.slice( 2 );
const SKIP_BUILD = args.includes( '--skip-build' );
const tagIndex = args.indexOf( '--tag' );
const TAG = tagIndex >= 0 ? args[ tagIndex + 1 ] : process.env.RELEASE_TAG || '';

const SLUG = 'refraction';
const DIST_DIR = join( ROOT, 'dist' );
const STAGE_DIR = join( DIST_DIR, '.stage' );
const ZIP_PATH = join( DIST_DIR, `${ SLUG }.zip` );

function fail( message ) {
	console.error( `\n[release] ERROR: ${ message }` );
	process.exit( 1 );
}

function run( command, commandArgs, options = {} ) {
	console.log( `[release] $ ${ command } ${ commandArgs.join( ' ' ) }` );
	const result = spawnSync( command, commandArgs, { cwd: ROOT, stdio: 'inherit', ...options } );

	if ( result.status !== 0 ) {
		fail( `${ command } ${ commandArgs.join( ' ' ) } exited with ${ result.status ?? result.error }` );
	}
}

/** Reads and cross-checks the version declared in refraction.php, readme.txt and package.json. */
function readVersion() {
	const main = readFileSync( join( ROOT, 'refraction.php' ), 'utf8' );
	const header = main.match( /^\s*\*\s*Version:\s*(\S+)\s*$/m )?.[ 1 ];
	const constant = main.match( /define\(\s*'REFRACTION_VERSION',\s*'([^']+)'\s*\)/ )?.[ 1 ];
	const stable = readFileSync( join( ROOT, 'readme.txt' ), 'utf8' ).match( /^Stable tag:\s*(\S+)\s*$/m )?.[ 1 ];
	const pkg = JSON.parse( readFileSync( join( ROOT, 'package.json' ), 'utf8' ) ).version;

	if ( ! header || header !== constant || header !== stable || header !== pkg ) {
		fail(
			`version mismatch: refraction.php header=${ header }, REFRACTION_VERSION=${ constant }, readme.txt Stable tag=${ stable }, package.json=${ pkg }`,
		);
	}

	if ( TAG && TAG.replace( /^v/, '' ) !== header ) {
		fail( `tag ${ TAG } does not match the plugin version ${ header }` );
	}

	return header;
}

function listFiles( directory ) {
	const files = [];

	for ( const entry of readdirSync( directory, { withFileTypes: true, recursive: true } ) ) {
		if ( entry.isFile() ) {
			files.push( relative( directory, join( entry.parentPath ?? entry.path, entry.name ) ).split( '\\' ).join( '/' ) );
		}
	}

	return files.sort();
}

const version = readVersion();
console.log( `[release] Refraction ${ version }` );

if ( ! SKIP_BUILD ) {
	run( 'composer', [ 'install', '--no-dev', '--optimize-autoloader', '--no-interaction', '--no-progress' ], {
		env: { ...process.env, COMPOSER_ALLOW_SUPERUSER: '1' },
	} );
	run( 'npm', [ 'run', 'build' ] );
}

// Prerequisites: compiled assets and the production autoloader must exist.
for ( const required of [ 'assets/js/editor.min.js', 'assets/js/frontend.min.js', 'assets/css/frontend.min.css', 'vendor/autoload_packages.php' ] ) {
	if ( ! existsSync( join( ROOT, required ) ) ) {
		fail( `${ required } is missing. Run without --skip-build (or run composer install --no-dev and npm run build first).` );
	}
}

// Dev dependencies must not be in the package.
const installed = existsSync( join( ROOT, 'vendor/composer/installed.json' ) )
	? JSON.parse( readFileSync( join( ROOT, 'vendor/composer/installed.json' ), 'utf8' ) )
	: { packages: [] };

if ( installed.packages.some( ( p ) => /phpunit|php_codesniffer|php-scoper/.test( p.name ) ) ) {
	fail( 'vendor/ contains dev dependencies. Run `composer install --no-dev --optimize-autoloader`.' );
}

// Assemble build/ with the shared file rules, then copy it into dist/.stage/refraction.
assemblePlugin();

rmSync( DIST_DIR, { recursive: true, force: true } );
mkdirSync( join( STAGE_DIR, SLUG ), { recursive: true } );
cpSync( BUILD_DIR, join( STAGE_DIR, SLUG ), { recursive: true } );

const files = listFiles( join( STAGE_DIR, SLUG ) );
const forbidden = files.filter( ( f ) => /^(tests?|docs|packages|scripts|bin|dist|php-scoper|assets\/dev|\.github)\//.test( f ) || /(^|\/)(node_modules|\.git)\//.test( f ) || /\.(map|log)$/.test( f ) || /^(package(-lock)?\.json|composer\.(json|lock)|phpunit\.xml|AGENTS\.md|CONTRIBUTING\.md|README\.md)$/.test( f ) );

if ( forbidden.length ) {
	fail( `development files ended up in the package:\n  ${ forbidden.slice( 0, 20 ).join( '\n  ' ) }` );
}

for ( const required of [ 'refraction.php', 'readme.txt', 'license.txt', 'NOTICE', 'includes/plugin.php', 'vendor/autoload_packages.php' ] ) {
	if ( ! files.includes( required ) ) {
		fail( `${ required } is not in the package.` );
	}
}

try {
	execFileSync( 'zip', [ '-v' ], { stdio: 'ignore' } );
} catch {
	fail( 'the `zip` command is required (apt install zip).' );
}

// -X drops extra file attributes; the sorted list keeps the archive order stable.
const entries = files.map( ( f ) => `${ SLUG }/${ f }` ).join( '\n' ) + '\n';
const zipResult = spawnSync( 'zip', [ '-X', '-q', '-9', ZIP_PATH, '-@' ], {
	cwd: STAGE_DIR,
	input: entries,
	stdio: [ 'pipe', 'inherit', 'inherit' ],
} );

if ( zipResult.status !== 0 ) {
	fail( `zip exited with ${ zipResult.status }` );
}

rmSync( STAGE_DIR, { recursive: true, force: true } );

const size = statSync( ZIP_PATH ).size;
const sha256 = createHash( 'sha256' ).update( readFileSync( ZIP_PATH ) ).digest( 'hex' );

console.log( `[release] ${ files.length } files -> ${ relative( ROOT, ZIP_PATH ) } (${ ( size / 1048576 ).toFixed( 2 ) } MiB)` );
console.log( `[release] sha256 ${ sha256 }` );
