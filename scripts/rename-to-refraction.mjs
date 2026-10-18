#!/usr/bin/env node
/**
 * Deterministic, re-runnable rename of the Elementor-derived code base to Refraction.
 *
 * Usage:  node scripts/rename-to-refraction.mjs [--dry-run] [--verbose]
 *
 * What it does
 *  1. Lists every tracked/untracked-but-not-ignored file (git ls-files -co --exclude-standard).
 *  2. Skips files that must keep their upstream wording (license.txt, NOTICE, changelog.txt,
 *     composer.lock, Markdown docs, docs/, vendor, node_modules, .git, binary files, ...).
 *  3. In every other text file it protects spans that must not change (third-party URLs and
 *     domains, attribution lines, the "Hello Elementor" theme, external npm/composer packages),
 *     then replaces the three case variants:  ELEMENTOR -> REFRACTION,  Elementor -> Refraction,
 *     elementor -> refraction  (so namespaces, constants, hooks, options, CSS classes, JS globals,
 *     text domains, package scopes and script handles all follow).
 *  4. Renames files and directories whose path contains "elementor" the same way (the PHP
 *     autoloader derives file names from class names, so classes and files must stay in sync).
 *
 * Running it a second time is a no-op (the replaced text no longer contains the old word).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const DRY = process.argv.includes( '--dry-run' );
const VERBOSE = process.argv.includes( '--verbose' );

// ---------------------------------------------------------------- exclusions
const SKIP_DIR_PREFIXES = [ '.git/', 'vendor/', 'vendor_prefixed/', 'build/', 'dist/', 'docs/', 'coverage/', 'coverage-report/' ];
const SKIP_FILES = new Set( [
	'license.txt',
	'NOTICE',
	'changelog.txt',
	'readme.txt',
	'composer.lock',
	'scripts/rename-to-refraction.mjs',
] );
const SKIP_EXT = new Set( [ '.md', '.mdx' ] );
const MAX_BYTES = 8 * 1024 * 1024;

function isSkipped( rel ) {
	if ( SKIP_FILES.has( rel ) ) {
		return true;
	}
	if ( SKIP_DIR_PREFIXES.some( ( p ) => rel.startsWith( p ) ) ) {
		return true;
	}
	if ( rel.split( '/' ).includes( 'node_modules' ) ) {
		return true;
	}
	return SKIP_EXT.has( path.extname( rel ).toLowerCase() );
}

// Published externals that live under the same scope as the workspace packages. Every other
// @elementor/* name is an npm workspace package of this repository and is renamed to @refraction/*.
const EXTERNAL_ELEMENTOR_PKGS = new Set( [
	'ui',
	'angie-sdk',
	'icons',
	'wp-lite-env',
	'angie-logger',
	'design-tokens',
	'oidc-auth',
	'elementor-one-assets',
	'editor-testing',
] );

// ---------------------------------------------------------------- protection
const URL_TAIL = '[^\\s"\'`)<>\\]\\\\]*';
const PROTECT = [
	// attribution lines (whole line)
	{ name: 'attribution', re: /^.*(?:copyright[^\n]*elementor|based on elementor|written by the elementor|elementor ltd).*$/gim },
	// URLs whose host contains "elementor" (elementor.com, go.elementor.com, elementor.atlassian.net, ...)
	{ name: 'url-host', re: new RegExp( `(?:https?:)?\\/\\/(?:[\\w-]+\\.)*elementor[\\w-]*\\.[a-z][a-z.]*${ URL_TAIL }`, 'gi' ) },
	// URLs on github / wordpress.org / npm that point at an elementor repo or package
	{ name: 'url-path', re: new RegExp( `(?:https?:)?\\/\\/(?:[\\w-]+\\.)?(?:github\\.com|githubusercontent\\.com|wordpress\\.org|w\\.org|npmjs\\.com|npmjs\\.org|hub\\.docker\\.com)\\/${ URL_TAIL }elementor${ URL_TAIL }`, 'gi' ) },
	// bare third-party domains without scheme
	{ name: 'bare-domain', re: /\b(?:[\w-]+\.)*elementor\.(?:com|io|cloud|org|net)\b/gi },
	// external theme / plugin names
	{ name: 'hello-theme', re: /hello[-_ ]?elementor/gi },
	// external composer dev packages
	{ name: 'composer-external', re: /elementor\/(?:elementor-editor-testing|elementor-mcp-composer)/g },
	// external npm scopes
	{
		name: 'npm-external',
		re: /@elementor(?:-external)?\/[\w.-]+/g,
		keep: ( m ) => m.startsWith( '@elementor-external/' ) || EXTERNAL_ELEMENTOR_PKGS.has( ( m.match( /^@elementor\/([a-z0-9-]+)/ ) || [] )[ 1 ] ),
	},
];

const stats = {
	filesScanned: 0,
	filesChanged: 0,
	filesSkippedExcluded: 0,
	filesSkippedBinary: 0,
	replacements: { ELEMENTOR: 0, Elementor: 0, elementor: 0 },
	grammarFixes: 0,
	protectedSpans: {},
	renamedFiles: 0,
	errors: [],
};

function transform( text ) {
	const saved = [];
	let out = text;

	for ( const p of PROTECT ) {
		out = out.replace( p.re, ( m ) => {
			if ( p.keep && ! p.keep( m ) ) {
				return m;
			}
			if ( ! /elementor/i.test( m ) ) {
				return m;
			}
			stats.protectedSpans[ p.name ] = ( stats.protectedSpans[ p.name ] || 0 ) + 1;
			saved.push( m );
			return `\u0000${ saved.length - 1 }\u0000`;
		} );
	}

	// "an Elementor ..." -> "a Refraction ..."
	out = out.replace( /\b([Aa])n (?=[Ee]lementor)/g, ( _, a ) => {
		stats.grammarFixes++;
		return `${ a } `;
	} );

	out = out
		.replace( /ELEMENTOR/g, () => {
			stats.replacements.ELEMENTOR++;
			return 'REFRACTION';
		} )
		.replace( /Elementor/g, () => {
			stats.replacements.Elementor++;
			return 'Refraction';
		} )
		.replace( /elementor/g, () => {
			stats.replacements.elementor++;
			return 'refraction';
		} );

	return out.replace( /\u0000(\d+)\u0000/g, ( _, i ) => saved[ Number( i ) ] );
}

function renamePath( rel ) {
	// Apply protections to the path too (e.g. nothing today, but keeps behaviour consistent).
	const parts = rel.split( '/' ).map( ( seg ) => ( /hello[-_ ]?elementor/i.test( seg ) ? seg : seg.replace( /ELEMENTOR/g, 'REFRACTION' ).replace( /Elementor/g, 'Refraction' ).replace( /elementor/g, 'refraction' ) ) );
	return parts.join( '/' );
}

function isBinary( buf ) {
	const n = Math.min( buf.length, 8192 );
	for ( let i = 0; i < n; i++ ) {
		if ( buf[ i ] === 0 ) {
			return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------- run
const listing = execFileSync( 'git', [ 'ls-files', '-z', '-c', '-o', '--exclude-standard' ], { cwd: ROOT, maxBuffer: 1 << 28 } )
	.toString( 'utf8' )
	.split( '\0' )
	.filter( Boolean )
	.filter( ( f ) => fs.existsSync( path.join( ROOT, f ) ) );

// Pass 1: content.
for ( const rel of listing ) {
	if ( isSkipped( rel ) ) {
		stats.filesSkippedExcluded++;
		continue;
	}
	const abs = path.join( ROOT, rel );
	const st = fs.lstatSync( abs );
	if ( ! st.isFile() || st.size > MAX_BYTES ) {
		continue;
	}
	const buf = fs.readFileSync( abs );
	if ( isBinary( buf ) ) {
		stats.filesSkippedBinary++;
		continue;
	}
	stats.filesScanned++;
	const text = buf.toString( 'utf8' );
	if ( ! /elementor/i.test( text ) ) {
		continue;
	}
	const next = transform( text );
	if ( next !== text ) {
		stats.filesChanged++;
		if ( VERBOSE ) {
			console.log( 'content', rel );
		}
		if ( ! DRY ) {
			fs.writeFileSync( abs, next );
		}
	}
}

// Pass 2: paths.
for ( const rel of listing ) {
	if ( isSkipped( rel ) || ! /elementor/i.test( rel ) ) {
		continue;
	}
	const to = renamePath( rel );
	if ( to === rel ) {
		continue;
	}
	const absFrom = path.join( ROOT, rel );
	const absTo = path.join( ROOT, to );
	if ( fs.existsSync( absTo ) ) {
		stats.errors.push( `target exists: ${ to }` );
		continue;
	}
	stats.renamedFiles++;
	if ( VERBOSE ) {
		console.log( 'rename', rel, '->', to );
	}
	if ( ! DRY ) {
		fs.mkdirSync( path.dirname( absTo ), { recursive: true } );
		fs.renameSync( absFrom, absTo );
	}
}

// Remove directories emptied by the renames.
if ( ! DRY ) {
	const dirs = new Set();
	for ( const rel of listing ) {
		let d = path.dirname( rel );
		while ( d && d !== '.' ) {
			dirs.add( d );
			d = path.dirname( d );
		}
	}
	[ ...dirs ]
		.sort( ( a, b ) => b.length - a.length )
		.forEach( ( d ) => {
			const abs = path.join( ROOT, d );
			try {
				if ( fs.existsSync( abs ) && fs.readdirSync( abs ).length === 0 ) {
					fs.rmdirSync( abs );
				}
			} catch {}
		} );
}

console.log( JSON.stringify( { dryRun: DRY, ...stats }, null, 2 ) );
if ( stats.errors.length ) {
	process.exitCode = 1;
}
