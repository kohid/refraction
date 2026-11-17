#!/usr/bin/env node
/**
 * The Refraction logo and the editor loading screen (0.117.0, SQLite test site, Chromium):
 * - the logo files (full color, the animated loader, the wordmarks, the 52 px icon) are the owner's logo;
 * - the editor loading screen draws the animated logo (its spectrum bars light up in turn);
 * - the admin menu icon is the one-color logo; the logo glyph of the icon font is drawn from the logo file; the editor
 *   panel's wordmark shows;
 * - the editor finishes loading in a background tab: the page is run with a background tab's rules (hidden, no
 *   animation frames, timers at most once a second); before 0.117.0 the preview finished first, the panel failed on the
 *   missing document settings and the loading screen stayed until the tab was shown again.
 *
 * Usage: node scripts/check-logo-loader.mjs [--site /tmp/rf-logo-site] [--port 8961] [--shots /tmp/logo-shots]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-logo-site' );
const PORT = arg( 'port', '8961' );
const SHOTS = arg( 'shots', '/tmp/logo-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const PLUGIN = join( WPDIR, 'wp-content/plugins/refraction' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 500 ) }` }` );
};
const read = ( f ) => ( existsSync( f ) ? readFileSync( f, 'utf8' ) : '' );
const wp = ( args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8' } );

/** A background tab's rules, in the page and its preview frame, until window.__wake(). */
function background() {
	const top = window.top === window;
	const state = top ? ( window.__bg = { on: true, raf: [] } ) : window.top.__bg;

	if ( state && state.on ) {
		Object.defineProperty( document, 'hidden', { get: () => window.top.__bg.on, configurable: true } );
		Object.defineProperty( document, 'visibilityState', { get: () => ( window.top.__bg.on ? 'hidden' : 'visible' ), configurable: true } );
		const raf = window.requestAnimationFrame.bind( window );
		window.requestAnimationFrame = ( cb ) => {
			if ( window.top.__bg.on ) {
				window.top.__bg.raf.push( () => raf( cb ) );
				return 0;
			}
			return raf( cb );
		};
		const timeout = window.setTimeout.bind( window );
		window.setTimeout = ( fn, ms, ...rest ) => timeout( fn, window.top.__bg.on ? Math.max( 1000, ms || 0 ) : ms, ...rest );
	}

	if ( top ) {
		window.__wake = () => {
			state.on = false;
			state.raf.splice( 0 ).forEach( ( f ) => f() );
		};
	}
}

async function login( page ) {
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'admin' );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), page.click( '#wp-submit' ) ] );
}

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );

	// ------------------------------------------------------------ the files
	const logo = read( join( PLUGIN, 'assets/images/refraction-logo.svg' ) );
	const loader = read( join( PLUGIN, 'assets/images/refraction-loader.svg' ) );
	const spectrum = [ '#7fff00', '#00ffff', '#ffff00', '#007fff', '#ff7f00', '#0000ff', '#ff0000', '#7f00ff', '#00ff00', '#00ff7f' ];
	check( 'files', 'the logo is the owner\'s: the navy corner, the ten spectrum bars and the black circle', /fill="#092351"/.test( logo ) && spectrum.every( ( c ) => logo.includes( `fill="${ c }"` ) ) && /r="77\.5" fill="#000000"/.test( logo ) && /<title>Refraction<\/title>/.test( logo ) );
	check( 'files', 'the loader is the same logo with its bars lighting up in turn and still with reduced motion', 10 === ( loader.match( /class="b b\d"/g ) || [] ).length && /@keyframes rf-l/.test( loader ) && /prefers-reduced-motion/.test( loader ) );
	const wordmarks = [ 'logo-panel.svg', 'logo-platform.svg' ].map( ( f ) => read( join( PLUGIN, 'assets/images', f ) ) );
	check( 'files', 'the wordmarks carry the new logo', wordmarks.every( ( w ) => w.includes( '#092351' ) && w.includes( '>Refraction</text>' ) ) );

	const pid = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Logo check', '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', pid, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_data', JSON.stringify( [ { id: 'lc00001', elType: 'container', settings: {}, elements: [ { id: 'lc00002', elType: 'widget', widgetType: 'heading', settings: { title: 'Hello' }, elements: [] } ] } ] ) ] );

	const browser = await chromium.launch();

	try {
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
		const p = await ctx.newPage();
		await login( p );

		// ------------------------------------------------------------ admin menu icon
		await p.goto( `${ BASE }/wp-admin/` );
		const icon = await p.evaluate( () => {
			const el = document.querySelector( '#toplevel_page_refraction-home .wp-menu-image' );
			const bg = el ? getComputedStyle( el ).backgroundImage : '';
			const m = bg.match( /base64,([^")]+)/ );
			return m ? atob( m[ 1 ] ) : bg;
		} );
		check( 'admin', 'the Refraction menu icon is the one-color logo (the corner with its bars cut out, and the circle)', /viewBox="0 0 500 500"/.test( icon ) && /fill-rule="evenodd"/.test( icon ) && /cx="412\.5"/.test( icon ), icon.slice( 0, 160 ) );
		await p.locator( '#toplevel_page_refraction-home' ).screenshot( { path: join( SHOTS, 'menu-icon.png' ) } );

		// ------------------------------------------------------------ the loading screen, held while the preview is slow
		let release;
		const held = new Promise( ( r ) => ( release = r ) );
		await p.route( /refraction-preview=/, async ( route ) => {
			await held;
			await route.continue().catch( () => {} );
		} );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ pid }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await p.waitForSelector( '#refraction-loading .refraction-loader-boxes' );
		await p.waitForTimeout( 700 );
		const shown = await p.evaluate( () => {
			const boxes = document.querySelector( '#refraction-loading .refraction-loader-boxes' );
			const tile = document.querySelector( '#refraction-loading .refraction-loader' );
			return {
				image: getComputedStyle( boxes ).backgroundImage,
				tile: getComputedStyle( tile ).backgroundColor + ' ' + getComputedStyle( tile ).borderTopLeftRadius,
				oldBars: [ ...document.querySelectorAll( '#refraction-loading .refraction-loader-box' ) ].filter( ( b ) => 'none' !== getComputedStyle( b ).display ).length,
			};
		} );
		const loaded = await p.evaluate( ( url ) => new Promise( ( done ) => {
			const img = new Image();
			img.onload = () => done( img.naturalWidth );
			img.onerror = () => done( 0 );
			img.src = url;
		} ), shown.image.replace( /^url\("?|"?\)$/g, '' ) );
		check( 'loader', 'the editor loading screen draws the animated logo on a white rounded tile (the old prism bars are gone)', /refraction-loader\.svg/.test( shown.image ) && loaded > 0 && /rgb\(255, 255, 255\) 30px/.test( shown.tile ) && 0 === shown.oldBars, JSON.stringify( { shown, loaded } ) );
		await p.locator( '#refraction-loading' ).screenshot( { path: join( SHOTS, 'editor-loading.png' ) } );
		release();
		await p.waitForFunction( () => 'none' === getComputedStyle( document.getElementById( 'refraction-loading' ) ).display, null, { timeout: 60000 } );

		// ------------------------------------------------------------ in the editor: the wordmark and the icon-font logo
		const marks = await p.evaluate( () => {
			const i = document.createElement( 'i' );
			i.className = 'rficon-refraction-circle';
			document.body.appendChild( i );
			const glyph = getComputedStyle( i, '::before' ).backgroundImage;
			i.remove();
			const img = document.querySelector( '#refraction-panel-header-title img, .refraction-header-title img, img[src*="logo-panel.svg"]' );
			return { glyph, wordmark: img ? img.getAttribute( 'src' ) + ' ' + img.naturalWidth : '' };
		} );
		check( 'editor', 'the icon font\'s logo glyph (rficon-refraction-*) is drawn from the logo file', /refraction-logo\.svg/.test( marks.glyph ), marks.glyph );

		// ------------------------------------------------------------ a background tab
		const bgCtx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
		const b = await bgCtx.newPage();
		const errors = [];
		b.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await login( b );
		await b.addInitScript( background );
		const start = Date.now();
		await b.goto( `${ BASE }/wp-admin/post.php?post=${ pid }&action=refraction`, { waitUntil: 'commit', timeout: 120000 } );
		const done = await b.waitForFunction( () => {
			const l = document.getElementById( 'refraction-loading' );
			return l && 'none' === getComputedStyle( l ).display && 'hidden' === document.visibilityState;
			// Polled on a timer: Playwright's default polling uses animation frames, which a background tab does not run.
		}, null, { timeout: 60000, polling: 300 } ).then( () => true ).catch( () => false );
		const took = Date.now() - start;
		const state = await b.evaluate( () => ( { hidden: document.visibilityState, panel: !! document.querySelector( '#refraction-panel .refraction-panel-category, #refraction-panel-elements-categories' ), preview: !! ( window.refraction && window.refraction.loaded ) } ) );
		check( 'background tab', 'with a background tab\'s rules (hidden, no animation frames, slow timers) the editor finishes loading without coming back to the tab', done && state.preview && 0 === errors.length, JSON.stringify( { done, took, state, errors: errors.slice( 0, 3 ) } ) );
		await b.evaluate( () => window.__wake() );
		await b.waitForTimeout( 800 );
		check( 'background tab', 'and once shown the panel and the preview are there', await b.evaluate( () => !! document.querySelector( '.refraction-panel-category' ) && !! document.getElementById( 'refraction-preview-iframe' ).contentDocument.querySelector( '.refraction-widget-heading' ) ) );
		await b.screenshot( { path: join( SHOTS, 'editor-after-background.png' ) } );
		await bgCtx.close();
	} finally {
		await browser.close();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall logo and loader checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
