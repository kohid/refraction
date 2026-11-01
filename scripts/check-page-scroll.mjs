#!/usr/bin/env node
/**
 * Page Settings > Scrolling check (SQLite test site, Chromium): "one section per scroll" (wheel, a tall section that
 * scrolls through first, scrolling back into it at its end, Page Down, the dots), "smooth" (eased wheel), "snap"
 * (CSS snapping), reduced motion and pages without the setting.
 *
 * Usage: node scripts/check-page-scroll.mjs [--site /tmp/rf-pagescroll-site] [--port 8995]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-pagescroll-site' );
const PORT = arg( 'port', '8995' );
const SHOTS = arg( 'shots', '/tmp/page-scroll-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 500 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	if ( process.env.CHROMIUM ) { return process.env.CHROMIUM; }
	const root = '/opt/pw-browsers';
	if ( ! existsSync( root ) ) { return undefined; }
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, sub ) ) ) { return join( root, d, sub ); }
		}
	}
	return undefined;
}

function wp( args, { allowFail = false } = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		if ( allowFail ) { return null; }
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

/** A published page whose editor data is the given elements; returns its id and address. */
function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id, url: wp( [ 'post', 'list', '--post_type=page', `--post__in=${ id }`, '--field=url' ] ).trim() };
}
const section = ( id, vh, color ) => ( { id, elType: 'container', settings: { content_width: 'full', min_height: { unit: 'vh', size: vh }, background_background: 'classic', background_color: color }, elements: [ { id: id + 'h', elType: 'widget', widgetType: 'heading', settings: { title: 'Section ' + id, header_size: 'h2' }, elements: [] } ], isInner: false } );


const tops = ( p ) => p.evaluate( () => Array.from( document.querySelectorAll( '[data-refraction-type="wp-page"] > .refraction-element' ) ).map( ( el ) => Math.round( el.getBoundingClientRect().top + window.scrollY ) ) );
const y = ( p ) => p.evaluate( () => Math.round( window.scrollY ) );
const settle = ( p ) => p.waitForFunction( () => ! document.documentElement.dataset.rfPageScrolling, null, { timeout: 5000 } ).then( () => sleep( 250 ) );
const near = ( a, b ) => Math.abs( a - b ) <= 3;

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];

	try {
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
		const demo = page( 'Scrolling', [ section( 's1', 100, '#1d2433' ), section( 's2', 100, '#26344a' ), section( 's3', 300, '#30435f' ), section( 's4', 100, '#3a5375' ), section( 's5', 100, '#44628a' ) ] );
		const setMode = ( settings ) => wp( [ 'post', 'meta', 'update', demo.id, '_refraction_page_settings', JSON.stringify( settings ), '--format=json' ] );

		// ------------------------------------------------------------ one section per scroll
		setMode( { rf_page_scroll: 'sections', rf_page_scroll_speed: 500, rf_page_scroll_dots: 'yes' } );
		const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( demo.url );
		await p.mouse.move( 640, 400 );
		const t = await tops( p );
		check( 'sections', 'the page script runs in "one section per scroll" with five dots', 'sections' === await p.evaluate( () => document.documentElement.dataset.rfPageScroll ) && 5 === await p.locator( '.rf-page-dots button' ).count() && t.length === 5, JSON.stringify( t ) );
		await p.mouse.wheel( 0, 120 );
		await settle( p );
		check( 'sections', 'one wheel turn moves to the next section', near( await y( p ), t[ 1 ] ), `${ await y( p ) } vs ${ t[ 1 ] }` );
		await p.mouse.wheel( 0, 120 );
		await settle( p );
		check( 'sections', 'and again, to the top of the tall section', near( await y( p ), t[ 2 ] ), `${ await y( p ) } vs ${ t[ 2 ] }` );
		await p.mouse.wheel( 0, 150 );
		await sleep( 500 );
		const inside = await y( p );
		check( 'sections', 'inside a tall section the wheel scrolls through it normally', inside > t[ 2 ] + 50 && inside < t[ 3 ] - 400, `${ inside } (tall from ${ t[ 2 ] } to ${ t[ 3 ] })` );
		await p.evaluate( ( to ) => window.scrollTo( 0, to ), t[ 3 ] - 800 );
		await sleep( 300 );
		await p.mouse.wheel( 0, 120 );
		await settle( p );
		check( 'sections', 'at the end of the tall section the next turn moves to the next section', near( await y( p ), t[ 3 ] ), `${ await y( p ) } vs ${ t[ 3 ] }` );
		await p.mouse.wheel( 0, -120 );
		await settle( p );
		check( 'sections', 'scrolling up enters the tall section at its end', near( await y( p ), t[ 3 ] - 800 ), `${ await y( p ) } vs ${ t[ 3 ] - 800 }` );
		await p.keyboard.press( 'PageDown' );
		await settle( p );
		check( 'sections', 'Page Down moves to the next section too', near( await y( p ), t[ 3 ] ), `${ await y( p ) } vs ${ t[ 3 ] }` );
		const current = await p.evaluate( () => Array.from( document.querySelectorAll( '.rf-page-dots button' ) ).findIndex( ( b ) => 'true' === b.getAttribute( 'aria-current' ) ) );
		check( 'sections', 'the dot of the current section is marked', 3 === current, current );
		await p.screenshot( { path: join( SHOTS, 'sections.png' ) } );
		await p.click( '.rf-page-dots button >> nth=0' );
		await settle( p );
		check( 'sections', 'a dot jumps to its section', near( await y( p ), t[ 0 ] ) );
		await ctx.close();

		// ------------------------------------------------------------ smooth
		setMode( { rf_page_scroll: 'smooth', rf_page_scroll_smoothness: { size: 5 } } );
		const s = await ( await browser.newContext( { viewport: { width: 1280, height: 800 } } ) ).newPage();
		s.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await s.goto( demo.url );
		await s.mouse.move( 640, 400 );
		await s.mouse.wheel( 0, 400 );
		await sleep( 60 );
		const early = await y( s );
		await sleep( 1200 );
		const late = await y( s );
		check( 'smooth', 'smooth: the wheel eases to where it was sent instead of jumping', 'smooth' === await s.evaluate( () => document.documentElement.dataset.rfPageScroll ) && early > 0 && early < 380 && near( late, 400 ), `${ early } -> ${ late }` );

		// ------------------------------------------------------------ snap, reduced motion, other pages
		setMode( { rf_page_scroll: 'snap', rf_page_scroll_snap: 'mandatory' } );
		await s.goto( demo.url );
		check( 'snap', 'snap: the browser snaps to the sections', await s.evaluate( () => document.documentElement.classList.contains( 'rf-page-snap--mandatory' ) && 5 === document.querySelectorAll( '.rf-page-section' ).length && 'mandatory' === getComputedStyle( document.documentElement ).scrollSnapType.split( ' ' ).pop() ) );
		const r = await ( await browser.newContext( { reducedMotion: 'reduce' } ) ).newPage();
		await r.goto( demo.url );
		check( 'reduced', 'reduced motion keeps normal scrolling', ! await r.evaluate( () => document.documentElement.dataset.rfPageScroll || document.documentElement.classList.contains( 'rf-page-snap' ) ) );
		setMode( {} );
		await s.goto( demo.url );
		check( 'normal', 'without the setting nothing is loaded', ! /page-scroll-frontend/.test( await s.content() ) );
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', errors.length === 0, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall page scroll checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
