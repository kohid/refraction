#!/usr/bin/env node
/**
 * Performance > Animations On The First Screen (0.146.0), SQLite test site, Chromium:
 * - on (the default): the hero heading with an entrance animation is visible as soon as the page is read (before the
 *   scripts), and is never animated; a heading further down is hidden and animates when scrolled to; without JavaScript
 *   nothing stays hidden; Pin Board notes on screen show at once, those below still reveal;
 * - every visitor gets the same page: the HTML for a normal browser and for a speed-test tool (Lighthouse's user agent)
 *   is the same;
 * - off: the old way back (the hero hidden until the scripts animate it);
 * - Google Fonts load with display=swap.
 *
 * Usage: node scripts/check-first-screen.mjs [--site /tmp/rf-fs-site] [--port 9382]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fs-site' );
const PORT = arg( 'port', '9382' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const LIGHTHOUSE_UA = 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse';

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 800 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	const root = '/opt/pw-browsers';
	if ( ! existsSync( root ) ) {
		return undefined;
	}
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, sub ) ) ) {
				return join( root, d, sub );
			}
		}
	}
	return undefined;
}

function wp( args ) {
	return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => {
	try {
		await fetch( `${ BASE }/wp-login.php` );
		return true;
	} catch {
		return false;
	}
};

const heading = ( id, title, extra = {} ) => ( { id, elType: 'widget', widgetType: 'heading', settings: { title, header_size: 'h1', _animation: 'fadeInUp', ...extra }, elements: [] } );
const note = ( n ) => ( { id: `fsn${ n }`, elType: 'container', isInner: true, settings: { content_width: 'full', padding: { unit: 'px', top: '20', right: '20', bottom: '20', left: '20', isLinked: true }, background_background: 'classic', background_color: '#FDEBDF' }, elements: [ { id: `fsnh${ n }`, elType: 'widget', widgetType: 'heading', settings: { title: `Note ${ n }`, header_size: 'h3' }, elements: [] } ] } );

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) {
			await sleep( 200 );
		}
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];

	try {
		const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=First screen', '--porcelain' ] ).trim();
		const data = [
			{ id: 'fsbox001', elType: 'container', settings: { min_height: { unit: 'px', size: 400 }, typography_typography: 'custom' }, elements: [ heading( 'fshero01', 'Welcome to the Highlands', { typography_typography: 'custom', typography_font_family: 'Montserrat' } ) ] },
			{ id: 'fsbox002', elType: 'container', settings: {}, elements: [ {
				id: 'fspb0001', elType: 'widget', widgetType: 'refraction-pin-board',
				settings: { items: [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ].map( ( n ) => ( { _id: `fspi${ n }`, item_title: `Note #${ n }` } ) ), reveal: 'drop', reveal_duration: 300 },
				elements: [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ].map( note ),
			} ] },
			{ id: 'fsbox003', elType: 'container', settings: { min_height: { unit: 'px', size: 1600 } }, elements: [] },
			{ id: 'fsbox004', elType: 'container', settings: {}, elements: [ heading( 'fslow001', 'Further down' ) ] },
		];
		for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
			wp( [ 'post', 'meta', 'update', id, k, v ] );
		}
		wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
		const url = `${ BASE }/?page_id=${ id }`;

		// What a page looks like when it has just been read (before the frontend scripts run), and after.
		const visit = async ( opts = {} ) => {
			const ctx = await browser.newContext( { viewport: { width: 1200, height: 900 }, ...opts } );
			const p = await ctx.newPage();
			p.on( 'pageerror', ( x ) => errors.push( x.message ) );
			await p.addInitScript( () => {
				document.addEventListener( 'DOMContentLoaded', () => {
					const hero = document.querySelector( '[data-id="fshero01"]' );
					window.__atRead = hero ? getComputedStyle( hero ).visibility : 'missing';
				} );
			} );
			await p.goto( url );
			await p.waitForTimeout( 1500 );
			return p;
		};
		const state = ( p ) => p.evaluate( () => {
			const hero = document.querySelector( '[data-id="fshero01"]' );
			const low = document.querySelector( '[data-id="fslow001"]' );
			const notes = [ ...document.querySelectorAll( '[data-id="fspb0001"] .rf-pb__note' ) ];
			return {
				atRead: window.__atRead,
				hero: { vis: getComputedStyle( hero ).visibility, cls: hero.className },
				low: { vis: getComputedStyle( low ).visibility, cls: low.className },
				// A note just below the fold can reveal at once (the drop reveal starts it 48px higher): only clearly lower notes are
				// expected to wait.
				notes: notes.map( ( n ) => {
					const top = n.getBoundingClientRect().top;

					return ( top < window.innerHeight ? 'in:' : ( top > window.innerHeight + 120 ? 'out:' : 'edge:' ) ) + ( n.classList.contains( 'is-pending' ) ? 'pending' : 'shown' );
				} ),
				body: document.body.classList.contains( 'rf-first-screen' ),
				fonts: [ ...document.querySelectorAll( 'link[href*="fonts.googleapis.com"]' ) ].map( ( l ) => l.href ).join( ' ' ),
			};
		} );

		// ------------------------------------------------------------ on (the default)
		let p = await visit();
		let s = await state( p );
		check( 'on', 'the hero heading (with an entrance animation) is visible as soon as the page is read, and is never animated', 'visible' === s.atRead && 'visible' === s.hero.vis && /rf-intro-skip/.test( s.hero.cls ) && ! /animated/.test( s.hero.cls ), JSON.stringify( s ) );
		check( 'on', 'a heading further down is hidden until it comes into view', 'hidden' === s.low.vis && /refraction-invisible/.test( s.low.cls ), JSON.stringify( s.low ) );
		check( 'on', 'Pin Board: notes on screen show at once, those below wait for their reveal', s.notes.length && s.notes.every( ( n ) => ( n.startsWith( 'in:' ) ? 'in:shown' === n : ( ! n.startsWith( 'out:' ) || 'out:pending' === n ) ) ) && s.notes.some( ( n ) => n.startsWith( 'in:' ) ) && s.notes.some( ( n ) => n.startsWith( 'out:' ) ), JSON.stringify( s.notes ) );
		check( 'on', 'Google Fonts load with display=swap', /display=swap/.test( s.fonts ), s.fonts );
		await p.evaluate( () => document.querySelector( '[data-id="fslow001"]' ).scrollIntoView( { block: 'center', behavior: 'instant' } ) );
		await p.waitForTimeout( 1500 );
		s = await state( p );
		check( 'on', 'scrolled to, the heading further down animates in as set', 'visible' === s.low.vis && /animated fadeInUp/.test( s.low.cls ), JSON.stringify( s.low ) );
		await p.context().close();

		const noJs = await ( await browser.newContext( { viewport: { width: 1200, height: 900 }, javaScriptEnabled: false } ) ).newPage();
		await noJs.goto( url );
		const plain = await noJs.evaluate( () => [ '[data-id="fshero01"]', '[data-id="fslow001"]' ].map( ( sel ) => getComputedStyle( document.querySelector( sel ) ).visibility ).join() );
		check( 'on', 'without JavaScript nothing stays hidden', 'visible,visible' === plain, plain );
		await noJs.context().close();

		// The same page for everyone: a normal browser and a speed-test tool get the same HTML.
		const strip = ( html ) => html.replace( /nonce["']?\s*[:=]\s*["'][^"']+["']/gi, 'nonce' ).replace( /ver=[^"'&]+/g, 'ver' );
		const [ a, b ] = await Promise.all( [
			fetch( url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } } ).then( ( r ) => r.text() ),
			fetch( url, { headers: { 'User-Agent': LIGHTHOUSE_UA } } ).then( ( r ) => r.text() ),
		] );
		check( 'same page', 'the HTML for a normal browser and for a speed-test tool (Lighthouse) is the same', strip( a ) === strip( b ) && /rf-intro/.test( a ), `${ a.length } vs ${ b.length }` );

		// ------------------------------------------------------------ off
		wp( [ 'option', 'update', 'refraction_first_screen_animations', '0' ] );
		p = await visit();
		s = await state( p );
		check( 'off', 'Animate as set: the hero is hidden until the scripts animate it (the old way), no rf-first-screen', 'hidden' === s.atRead && /animated fadeInUp/.test( s.hero.cls ) && ! s.body && s.notes.every( ( n ) => n.endsWith( 'shown' ) || n.endsWith( 'pending' ) ), JSON.stringify( s ) );
		await p.context().close();
		wp( [ 'option', 'delete', 'refraction_first_screen_animations' ] );

		const settings = wp( [ 'eval', 'echo get_option( "refraction_first_screen_animations", "1" );' ] ).trim();
		check( 'settings', 'the setting is on unless turned off', '1' === settings, settings );

		check( 'site', 'no JavaScript errors', ! errors.length, errors.slice( 0, 4 ).join( ' | ' ) );
		const php = logTail( logStart );
		check( 'site', 'no PHP errors', ! /PHP (Fatal|Warning|Parse|Deprecated)/.test( php ), php.slice( 0, 600 ) );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } failed` : '\nall passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( err ) => {
	console.error( err );
	process.exit( 1 );
} );
