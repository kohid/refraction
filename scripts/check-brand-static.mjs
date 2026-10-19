#!/usr/bin/env node
/**
 * Static branding gate: fails when tracked source still carries the upstream product's icon font prefix, service URLs
 * or remote images, or when the icon font still ships the upstream brand glyphs.
 *
 * Usage: node scripts/check-brand-static.mjs
 *
 * Plain mentions of the old product name are listed in docs/refraction/branding-status.md with the reason each one
 * stays (attribution, third-party package names, ...). This script enforces the rules that can be checked mechanically:
 *   1. no upstream icon prefix / font family anywhere (files, paths, content),
 *   2. no upstream service URL (docs, marketing, account, remote images). The one allowed host string is the detection
 *      pattern for a third-party accessibility widget, which only reads another vendor's script URL,
 *   3. no installation flow for the upstream "Hello" theme in plugin or onboarding source,
 *   4. the icon font has no glyph named after the upstream product or its parent company,
 *   5. changelog.txt is the short Refraction file, the upstream one lives in docs/refraction/.
 *
 * The old names are assembled from parts below so that scripts/rename-to-refraction.mjs can never rewrite this file.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join( fileURLToPath( import.meta.url ), '..', '..' );
const UP = [ 'element', 'or' ].join( '' );
const ICON = [ 'e', 'icon' ].join( '' );
const COMPANY_GLYPH = [ 'poj', 'ome' ].join( '' );

const files = execFileSync( 'git', [ 'ls-files', '-z', '-c', '-o', '--exclude-standard' ], { cwd: ROOT, maxBuffer: 1 << 28 } )
	.toString( 'utf8' ).split( '\0' ).filter( Boolean ).filter( ( f ) => existsSync( join( ROOT, f ) ) );

const SKIP = /^(docs\/|license\.txt$|NOTICE$|package-lock\.json$|composer\.lock$|scripts\/(rename-to-refraction|check-brand-static)\.mjs$)/;
const failures = [];
const fail = ( rule, where, text = '' ) => failures.push( `${ rule }: ${ where } ${ text }`.trim() );

const ICON_RE = new RegExp( `(?<![A-Za-z])${ ICON }s?(?![A-Za-z])` );
const A11Y = `cdn.${ UP }.com/a11y/widget.js`;
const URL_RE = new RegExp( `(?:[a-z0-9-]+\\.)*${ UP }\\.(?:com|io|cloud)\\b`, 'i' );
const ATTRIBUTION_RE = new RegExp( `based on ${ UP } by`, 'i' );
const FIXTURE_RE = /^tests\/.*\.(json|xml)$/;
const HELLO_RE = new RegExp( `hello-${ UP }` );

for ( const rel of files ) {
	if ( new RegExp( `(^|/)${ ICON }s?(\\.|/|$)` ).test( rel ) ) { fail( 'icon-path', rel ); }
	if ( SKIP.test( rel ) ) { continue; }
	const abs = join( ROOT, rel );
	const st = statSync( abs );
	if ( ! st.isFile() || st.size > 8 << 20 ) { continue; }
	const buf = readFileSync( abs );
	if ( buf.subarray( 0, 8192 ).includes( 0 ) ) { continue; }
	const text = buf.toString( 'utf8' );
	let m = text.match( ICON_RE );
	if ( m ) { fail( 'icon-prefix', rel, m[ 0 ] ); }
	// the licence-required attribution line ("based on <Product> by <Product>.com") and recorded third-party fixtures stay
	const urlText = text.split( A11Y ).join( '' ).split( '\n' ).filter( ( l ) => ! ATTRIBUTION_RE.test( l ) ).join( '\n' );
	m = FIXTURE_RE.test( rel ) ? null : urlText.match( URL_RE );
	if ( m ) { fail( 'service-url', rel, m[ 0 ] ); }
	// test fixtures and CI blueprints may still name the theme the tests were written against
	if ( HELLO_RE.test( text ) && ! /^tests\//.test( rel ) && /\.(php|ts|tsx|js|json|sh|mjs)$/.test( rel ) ) { fail( 'hello-theme', rel ); }
}

const font = 'assets/lib/rficons/fonts';
for ( const ext of [ 'ttf', 'woff', 'woff2' ] ) {
	const p = join( ROOT, font, `rficons.${ ext }` );
	if ( ! existsSync( p ) ) { fail( 'icon-font', `${ font }/rficons.${ ext } is missing` ); continue; }
	const bytes = readFileSync( p );
	if ( ext === 'ttf' ) {
		for ( const needle of [ UP, COMPANY_GLYPH ] ) {
			if ( bytes.includes( Buffer.from( needle ) ) ) { fail( 'icon-font', `"${ needle }" is still a glyph name in the TTF` ); }
		}
	}
}
for ( const old of [ 'eot', 'svg' ] ) {
	if ( existsSync( join( ROOT, font, `rficons.${ old }` ) ) ) { fail( 'icon-font', `stale rficons.${ old } would still ship the old glyphs` ); }
}

const changelog = join( ROOT, 'changelog.txt' );
if ( existsSync( changelog ) && statSync( changelog ).size > 2000 ) { fail( 'changelog', 'changelog.txt is not the short Refraction file' ); }
if ( ! existsSync( join( ROOT, 'docs/refraction/upstream-changelog.txt' ) ) ) { fail( 'changelog', 'docs/refraction/upstream-changelog.txt is missing' ); }

if ( failures.length ) {
	console.error( `${ failures.length } branding problem(s):` );
	for ( const f of failures.slice( 0, 80 ) ) { console.error( `  ${ f }` ); }
	if ( failures.length > 80 ) { console.error( `  ... ${ failures.length - 80 } more` ); }
	process.exit( 1 );
}
console.log( 'brand static check: ok' );
