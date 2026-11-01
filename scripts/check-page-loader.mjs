#!/usr/bin/env node
/**
 * Loading screen check (SQLite test site, Chromium): Page Settings > Loading screen covers the page while it loads
 * (logo, progress line and percentage that move with the loading images), locks scrolling, and reveals the page
 * after it has loaded; the time limit reveals it even when an image never arrives; "first view only" skips it on
 * the next view; the counter and split styles render; without JavaScript, with reduced motion and in the editor
 * nothing is in the way; pages without it have no loader at all.
 *
 * Usage: node scripts/check-page-loader.mjs [--site /tmp/rf-loader-site] [--port 8996] [--shots /tmp/page-loader-shots]
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
const SITE = arg( 'site', '/tmp/rf-loader-site' );
const PORT = arg( 'port', '8996' );
const SHOTS = arg( 'shots', '/tmp/page-loader-shots' );
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

function page( title, elements, settings ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	if ( settings ) {
		wp( [ 'post', 'meta', 'update', id, '_refraction_page_settings', JSON.stringify( settings ), '--format=json' ] );
	}
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id, url: wp( [ 'post', 'list', '--post_type=page', `--post__in=${ id }`, '--field=url' ] ).trim() };
}

async function login( browser ) {
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
	const p = await ctx.newPage();
	await p.goto( `${ BASE }/wp-login.php?redirect_to=${ encodeURIComponent( `${ BASE }/wp-admin/profile.php` ) }` );
	await p.fill( '#user_login', 'admin' );
	await p.fill( '#user_pass', 'admin' );
	await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
	return { ctx, p };
}

const state = ( p ) => p.evaluate( () => {
	const el = document.getElementById( 'rf-loader' );
	return {
		present: !! el,
		shown: !! el && 'none' !== getComputedStyle( el ).display && ! el.classList.contains( 'is-done' ),
		locked: 'hidden' === getComputedStyle( document.body ).overflowY,
		pct: el && el.querySelector( '.rf-loader__pct, .rf-loader__count' ) ? el.querySelector( '.rf-loader__pct, .rf-loader__count' ).textContent : '',
		bar: el && el.querySelector( '.rf-loader__bar i' ) ? el.querySelector( '.rf-loader__bar i' ).style.transform : '',
		text: el ? el.textContent : '',
		bg: el ? getComputedStyle( el.querySelector( '.rf-loader__panel' ) ).backgroundColor : '',
	};
} );

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
		wp( [ 'user', 'update', 'admin', '--user_pass=admin' ] );
		const dir = join( tmpdir(), `rfloader-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		const images = [ 1, 2, 3 ].map( ( n ) => {
			execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `testsrc=size=1200x800:rate=1:duration=1`, '-frames:v', '1', join( dir, `big-${ n }.jpg` ) ] );
			return Number( wp( [ 'media', 'import', join( dir, `big-${ n }.jpg` ), '--porcelain' ] ).trim() );
		} );
		const content = [ { id: 'c1', elType: 'container', settings: { content_width: 'full' }, isInner: false, elements: [
			{ id: 'h1', elType: 'widget', widgetType: 'heading', settings: { title: 'Behind the loader', header_size: 'h1' }, elements: [] },
			...images.map( ( id, i ) => ( { id: 'im' + i, elType: 'widget', widgetType: 'image', settings: { image: { id, url: '' }, image_size: 'full' }, elements: [] } ) ),
		] } ];
		const on = { rf_loader: 'yes', rf_loader_logo: 'text', rf_loader_text: 'Refraction', rf_loader_caption: 'Loading' };
		const withLoader = page( 'With loader', content, on );
		const plain = page( 'Plain', content );
		const counter = page( 'Counter', content, { ...on, rf_loader_style: 'counter', rf_loader_exit: 'split' } );
		const once = page( 'Once', content, { ...on, rf_loader_once: 'yes' } );
		const capped = page( 'Capped', content, { ...on, rf_loader_max: '2000', rf_loader_min: '0' } );

		// The first view of a page builds its stylesheet (slow on this test server): done here, not in the timings below.
		for ( const pg of [ withLoader, plain, counter, once, capped ] ) {
			await fetch( pg.url );
		}

		// Images arrive slowly (as on a real connection), so the loader can be seen working.
		const visitor = async ( opts = {} ) => {
			const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 }, javaScriptEnabled: opts.js !== false, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' } );
			// The page's scripts (and images) arrive slowly, as on a real connection, so the loader can be seen working;
			// images alone are not enough because WordPress lazy-loads them.
			await ctx.route( /(big-\d[^/]*\.jpg|\/plugins\/refraction\/assets\/js\/[^?]*\.js)/, async ( route ) => {
				if ( opts.never ) {
					return; // Never answered: the time limit has to reveal the page.
				}
				await sleep( opts.delay || 1800 );
				await route.continue();
			} );
			const p = await ctx.newPage();
			p.on( 'pageerror', ( e ) => errors.push( e.message ) );
			return { ctx, p };
		};

		// ------------------------------------------------------------ the loader works
		let v = await visitor();
		await v.p.goto( withLoader.url, { waitUntil: 'commit' } );
		await v.p.waitForSelector( '#rf-loader', { state: 'attached' } );
		await sleep( 700 );
		const during = await state( v.p );
		await v.p.screenshot( { path: join( SHOTS, 'loading.png' ) } );
		check( 'loader', 'it covers the page while it loads, with the logo text and caption, and scrolling is locked', during.shown && during.locked && /Refraction/.test( during.text ) && /Loading/.test( during.text ), JSON.stringify( during ) );
		check( 'loader', 'its colors are the defaults (the homepage navy)', 'rgb(10, 14, 43)' === during.bg, during.bg );
		check( 'loader', 'the progress line and percentage show partial progress while images load', /scaleX\(0\.\d+\)/.test( during.bar ) && /^\d+%$/.test( during.pct ) && '100%' !== during.pct, JSON.stringify( during ) );
		await v.p.waitForLoadState( 'load' );
		await v.p.waitForFunction( () => ! document.getElementById( 'rf-loader' ), null, { timeout: 6000 } ).catch( () => null );
		const after = await state( v.p );
		check( 'loader', 'after the page has loaded it is revealed: the loader is gone and scrolling works', ! after.present && ! after.locked && await v.p.isVisible( 'text=Behind the loader' ), JSON.stringify( after ) );
		await v.p.screenshot( { path: join( SHOTS, 'revealed.png' ) } );
		await v.ctx.close();

		// ------------------------------------------------------------ never stuck
		v = await visitor( { never: true } );
		const t0 = Date.now();
		await v.p.goto( capped.url, { waitUntil: 'commit' } );
		await v.p.waitForFunction( () => document.getElementById( 'rf-loader' ) && document.getElementById( 'rf-loader' ).classList.contains( 'is-done' ), null, { timeout: 8000 } ).catch( () => null );
		const waited = Date.now() - t0;
		check( 'limit', 'an image that never arrives does not keep the page hidden: the time limit (2 s here) reveals it', ( await v.p.evaluate( () => ! document.documentElement.classList.contains( 'rf-loading' ) ) ) && waited < 6000, waited );
		await v.ctx.close();

		// ------------------------------------------------------------ styles
		v = await visitor( { delay: 1500 } );
		await v.p.goto( counter.url, { waitUntil: 'commit' } );
		await v.p.waitForSelector( '#rf-loader', { state: 'attached' } );
		await sleep( 500 );
		const counted = await v.p.evaluate( () => ( { count: !! document.querySelector( '.rf-loader__count' ), split: document.getElementById( 'rf-loader' ).classList.contains( 'rf-loader--exit-split' ) } ) );
		await v.p.screenshot( { path: join( SHOTS, 'counter.png' ) } );
		check( 'styles', 'the counter style and the split reveal render', counted.count && counted.split, JSON.stringify( counted ) );
		await v.p.waitForFunction( () => ! document.getElementById( 'rf-loader' ), null, { timeout: 8000 } ).catch( () => null );
		check( 'styles', 'and it is revealed after loading', ! ( await state( v.p ) ).present );
		await v.ctx.close();

		// ------------------------------------------------------------ first view only
		v = await visitor( { delay: 1500 } );
		await v.p.goto( once.url, { waitUntil: 'commit' } );
		await v.p.waitForSelector( '#rf-loader', { state: 'attached' } );
		await sleep( 300 );
		const first = await state( v.p );
		await v.p.waitForLoadState( 'load' );
		await v.p.goto( once.url, { waitUntil: 'commit' } );
		await sleep( 400 );
		const second = await state( v.p );
		check( 'once', '"First page view only": shown on the first view, not on the next', first.shown && ! second.shown && ! second.locked, JSON.stringify( [ first.shown, second ] ) );
		await v.ctx.close();

		// ------------------------------------------------------------ nothing in the way
		v = await visitor( { js: false, delay: 300 } );
		await v.p.goto( withLoader.url, { waitUntil: 'commit' } );
		await sleep( 600 );
		const noJs = await state( v.p );
		check( 'safety', 'without JavaScript the loader never shows and the page scrolls', ! noJs.shown && ! noJs.locked, JSON.stringify( noJs ) );
		await v.ctx.close();
		v = await visitor( { reduced: true, delay: 600 } );
		await v.p.goto( withLoader.url, { waitUntil: 'load' } );
		await v.p.waitForFunction( () => ! document.getElementById( 'rf-loader' ), null, { timeout: 6000 } ).catch( () => null );
		check( 'safety', 'with reduced motion it still reveals the page', ! ( await state( v.p ) ).present );
		await v.ctx.close();
		const plainHtml = await ( await fetch( plain.url ) ).text();
		check( 'safety', 'pages without it have no loader markup at all', ! plainHtml.includes( 'rf-loader' ) );

		// ------------------------------------------------------------ the editor
		const { ctx, p } = await login( browser );
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ withLoader.id }&action=refraction`, { timeout: 120000 } );
		await p.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await sleep( 1500 );
		const editor = await p.evaluate( () => {
			const doc = refraction.documents.getCurrent();
			const frame = document.getElementById( 'refraction-preview-iframe' );
			return { control: !! doc.config.settings.controls.rf_loader, value: doc.container.settings.get( 'rf_loader' ), inPreview: !! ( frame && frame.contentDocument.getElementById( 'rf-loader' ) ) };
		} );
		check( 'editor', 'Page Settings has the Loading screen controls, and the editor preview is never covered', editor.control && 'yes' === editor.value && ! editor.inPreview, JSON.stringify( editor ) );
		await ctx.close();
	} catch ( err ) {
		failures++;
		console.log( 'FAIL  script / ' + ( err.stack || err.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', errors.length === 0, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 1500 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall page loader checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
