#!/usr/bin/env node
/**
 * Side panel dock check (SQLite test site, Chromium): docked left as before; the header buttons dock it right (before a
 * docked Structure, the hide arrow on its other side, hiding slides it off to the right) and float it; dragging it by
 * its header moves it, against an edge docks it, never under the top bar or out of the window; the top bar Panel button
 * and Ctrl+P hide and show it; the beside-the-page preference works on the right; the place is remembered (and brought
 * back within reach); the old Floating Elements window is gone.
 *
 * Usage: node scripts/check-panel-dock.mjs [--site /tmp/rf-pd-site] [--port 8991] [--shots /tmp/panel-dock-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-pd-site' );
const PORT = arg( 'port', '8991' );
const SHOTS = arg( 'shots', '/tmp/panel-dock-shots' );
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
const box = ( id, settings, elements, isInner = false ) => ( { id, elType: 'container', settings: { content_width: 'full', ...settings }, elements, isInner } );


const heading = ( id, title ) => ( { id, elType: 'widget', widgetType: 'heading', settings: { title }, elements: [] } );

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
	const W = 1500;
	const H = 900;

	try {
		const doc = page( 'Panel dock', [ box( 'top', { min_height: { unit: 'vh', size: 40 } }, [ heading( 'h1', 'Docking the panel' ) ] ) ] );
		const ctx = await browser.newContext( { viewport: { width: W, height: H } } );
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php?redirect_to=${ encodeURIComponent( `${ BASE }/wp-admin/profile.php` ) }` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );

		const openEditor = async () => {
			await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
			await a.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
			await a.waitForTimeout( 1800 );
		};
		await openEditor();
		await a.evaluate( () => $e.components.get( 'navigator' ).isOpen && $e.run( 'navigator/close' ) );
		await a.waitForTimeout( 400 );

		const geo = () => a.evaluate( () => {
			const r = ( id ) => { const el = document.getElementById( id ); const b = el.getBoundingClientRect(); return { l: Math.round( b.left ), r: Math.round( b.right ), t: Math.round( b.top ), h: Math.round( b.height ), shown: 'none' !== getComputedStyle( el ).display && b.width > 0 }; };
			const sw = document.getElementById( 'refraction-mode-switcher' ).getBoundingClientRect();
			return {
				panel: r( 'refraction-panel' ),
				preview: r( 'refraction-preview' ),
				nav: r( 'refraction-navigator' ),
				arrow: Math.round( sw.left + ( sw.width / 2 ) ),
				pos: getComputedStyle( document.getElementById( 'refraction-panel' ) ).position,
				body: [ ...document.body.classList ].filter( ( c ) => /^rf-panel|refraction-editor-preview|refraction-panel--beside/.test( c ) ).join( ' ' ),
				pressed: [ ...document.querySelectorAll( '#refraction-panel-header .rf-panel-dock[aria-pressed="true"]' ) ].map( ( b ) => b.dataset.dock ).join(),
			};
		} );
		const panelHidden = ( g ) => g.panel.r <= 1 || g.panel.l >= W - 1 || ! g.panel.shown;

		const gone = await a.evaluate( () => ( { el: !! document.getElementById( 'refraction-elements-float' ), cmd: !! $e.components.get( 'elements-float' ), button: !! document.querySelector( 'button[aria-label="Floating Elements"]' ) } ) );
		check( 'removed', 'the separate Floating Elements window, its command and its top bar button are gone', ! gone.el && ! gone.cmd && ! gone.button, JSON.stringify( gone ) );
		let g = await geo();
		check( 'left', 'docked left as before: at the left edge, the left button pressed, the arrow on its right edge', 0 === g.panel.l && 'left' === g.pressed && Math.abs( g.arrow - g.panel.r ) < 12, JSON.stringify( g ) );

		// ------------------------------------------------------------ docked right
		await a.click( '#refraction-panel-header .rf-panel-dock[data-dock="right"]' );
		await a.waitForTimeout( 900 );
		g = await geo();
		check( 'right', 'Dock right: against the right edge, full height, the arrow on its left edge', W === g.panel.r && g.panel.h > 800 && 'right' === g.pressed && Math.abs( g.arrow - g.panel.l ) < 12 && /rf-panel--right/.test( g.body ), JSON.stringify( g ) );
		await a.screenshot( { path: join( SHOTS, 'docked-right.png' ) } );
		await a.evaluate( () => $e.run( 'panel/toggle' ) );
		await a.waitForTimeout( 900 );
		g = await geo();
		check( 'right', 'hiding slides it off to the right; the arrow stays at the edge to bring it back', g.panel.l >= W - 1 && g.arrow > W - 30, JSON.stringify( g ) );
		await a.evaluate( () => $e.run( 'panel/toggle' ) );
		await a.waitForTimeout( 900 );
		await a.evaluate( () => { $e.run( 'navigator/open' ); refraction.navigator.dock(); } );
		await a.waitForTimeout( 900 );
		g = await geo();
		check( 'right', 'with Structure docked, the panel sits just before it', Math.abs( g.panel.r - g.nav.l ) <= 1, JSON.stringify( g ) );
		await a.evaluate( () => $e.run( 'navigator/close' ) );
		await a.waitForTimeout( 600 );
		// ------------------------------------------------------------ beside the page, on the right
		await a.evaluate( () => refraction.settings.editorPreferences.model.set( 'panel_position', 'beside' ) );
		await a.waitForTimeout( 900 );
		g = await geo();
		check( 'beside', 'beside the page on the right: the page first, then the panel, nothing covered', 0 === g.preview.l && Math.abs( g.preview.r - g.panel.l ) <= 1 && W === g.panel.r, JSON.stringify( g ) );
		await a.evaluate( () => refraction.settings.editorPreferences.model.set( 'panel_position', 'float' ) );
		await a.waitForTimeout( 600 );

		// ------------------------------------------------------------ remembered
		await openEditor();
		g = await geo();
		check( 'remember', 'after a reload it is still docked right', W === g.panel.r && 'right' === g.pressed, JSON.stringify( g ) );

		// ------------------------------------------------------------ floating
		await a.click( '#refraction-panel-header .rf-panel-dock[data-dock="right"]' );
		await a.waitForTimeout( 900 );
		g = await geo();
		check( 'float', 'pressing the docked side again floats it: a window over the page, neither button pressed, the page at full width', 'fixed' === g.pos && '' === g.pressed && g.panel.h < 800 && 0 === g.preview.l && W === g.preview.r && /rf-panel--floating/.test( g.body ), JSON.stringify( g ) );
		const header = a.locator( '#refraction-panel-header-title' );
		const drag = async ( toX, toY ) => {
			const b = await header.boundingBox();
			await a.mouse.move( b.x + 20, b.y + ( b.height / 2 ) );
			await a.mouse.down();
			for ( let i = 1; i <= 12; i++ ) {
				await a.mouse.move( b.x + 20 + ( ( toX - b.x - 20 ) * i / 12 ), b.y + ( b.height / 2 ) + ( ( toY - b.y ) * i / 12 ) );
				await a.waitForTimeout( 30 );
			}
			const hint = await a.evaluate( () => [ ...document.body.classList ].filter( ( c ) => c.includes( 'rf-panel--dock-hint' ) ).join() );
			await a.mouse.up();
			await a.waitForTimeout( 900 );
			return hint;
		};
		await drag( 620, 200 );
		g = await geo();
		check( 'float', 'dragged by its header it moves with the pointer', Math.abs( g.panel.l - 600 ) < 40 && Math.abs( g.panel.t - 180 ) < 40, JSON.stringify( g ) );
		const bar = await a.evaluate( () => Math.round( document.getElementById( 'refraction-editor-wrapper-v2' ).getBoundingClientRect().height ) );
		await drag( 620, 5 );
		g = await geo();
		check( 'limits', 'dragged up into the top bar, its header stops just below the bar (still visible and draggable)', g.panel.t === bar, `${ bar } ${ JSON.stringify( g ) }` );
		await drag( 620, H + 300 );
		g = await geo();
		check( 'limits', 'dragged past the bottom of the window, its header stays on screen', g.panel.t <= H - 50 && g.panel.t >= bar, JSON.stringify( g ) );
		await drag( 620, 200 );
		await a.evaluate( () => { refraction.panel.$el.css( { top: '-200px', left: '-2000px' } ); refraction.panel.saveFloat(); } );
		await openEditor();
		g = await geo();
		check( 'limits', 'a place saved out of reach (above the top bar, off the left) is brought back on load', g.panel.t >= bar && g.panel.r >= 100, `${ bar } ${ JSON.stringify( g ) }` );
		await drag( 620, 200 );
		await a.screenshot( { path: join( SHOTS, 'floating.png' ) } );
		await a.click( '#refraction-panel-header .rf-panel-hide' );
		await a.waitForTimeout( 800 );
		g = await geo();
		const topBar = a.locator( 'button[aria-label="Panel"]' ).first();
		const barOff = await topBar.getAttribute( 'aria-pressed' );
		check( 'toggle', 'its Hide button hides it; the top bar Panel button shows it is hidden', panelHidden( g ) && 'false' === barOff, `${ barOff } ${ JSON.stringify( g ) }` );
		await topBar.click();
		await a.waitForTimeout( 800 );
		g = await geo();
		check( 'toggle', 'the top bar Panel button brings it back where it was', ! panelHidden( g ) && Math.abs( g.panel.l - 600 ) < 40 && 'true' === await topBar.getAttribute( 'aria-pressed' ), JSON.stringify( g ) );
		await a.locator( 'body' ).press( 'Control+p' );
		await a.waitForTimeout( 700 );
		const viaKeys = panelHidden( await geo() );
		await a.locator( 'body' ).press( 'Control+p' );
		await a.waitForTimeout( 700 );
		check( 'toggle', 'Ctrl+P hides and shows it too', viaKeys && ! panelHidden( await geo() ) );

		const hintRight = await drag( W - 20, 200 );
		g = await geo();
		check( 'drag', 'dragged against the right edge it shows where it docks, and docks there', 'rf-panel--dock-hint-right' === hintRight && W === g.panel.r && 'right' === g.pressed, `${ hintRight } ${ JSON.stringify( g ) }` );
		await drag( 700, 200 );
		g = await geo();
		check( 'drag', 'pulled away from its edge it floats again', 'fixed' === g.pos && '' === g.pressed, JSON.stringify( g ) );
		const hintLeft = await drag( 5, 200 );
		g = await geo();
		check( 'drag', 'dragged against the left edge it docks left, as before', 'rf-panel--dock-hint-left' === hintLeft && 0 === g.panel.l && 'left' === g.pressed && g.panel.h > 800 && '' === g.body.replace( 'refraction-panel--beside', '' ).trim(), `${ hintLeft } ${ JSON.stringify( g ) }` );
		await a.screenshot( { path: join( SHOTS, 'docked-left.png' ) } );
		await ctx.close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the editor', 0 === errors.length, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall panel dock checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
