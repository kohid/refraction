#!/usr/bin/env node
/**
 * Nav Menu options and editing from Site Settings (SQLite test site, Chromium):
 * - The submenu icon from the icon library, with its size and color, turning when its submenu opens.
 * - The collapsed menu panel: a dropdown stretched to the screen width; sliding in from the right with a backdrop, a
 *   close button and the page kept from scrolling, closing with its animation; full screen.
 * - Hamburger animations (arrow, none) and the toggle's own open / close icons.
 * - In the editor, with Site Settings open, clicking an element of the page goes back to editing it.
 *
 * Usage: node scripts/check-nav-menu.mjs [--site /tmp/rf-nav-site] [--port 8960] [--shots /tmp/nav-menu-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-nav-site' );
const PORT = arg( 'port', '8960' );
const SHOTS = arg( 'shots', '/tmp/nav-menu-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
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
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
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

function page( title, widgets ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	const data = [ { id: `c${ id }`.slice( 0, 7 ), elType: 'container', isInner: false, settings: {}, elements: widgets } ];
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );
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
	const watch = ( p ) => p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && errors.push( `${ e.message } @ ${ p.url() }` ) );
	const at = async ( url, width ) => {
		const p = await ( await browser.newContext( { viewport: { width, height: 800 } } ) ).newPage();
		watch( p );
		await p.goto( url );
		return p;
	};

	try {
		// A menu with a submenu.
		const menu = wp( [ 'menu', 'create', 'Main', '--porcelain' ] ).trim();
		wp( [ 'menu', 'item', 'add-custom', menu, 'About', `${ BASE }/#about` ] );
		const services = wp( [ 'menu', 'item', 'add-custom', menu, 'Services', `${ BASE }/#services`, '--porcelain' ] ).trim();
		wp( [ 'menu', 'item', 'add-custom', menu, 'Airport', `${ BASE }/#airport`, `--parent-id=${ services }` ] );
		wp( [ 'menu', 'item', 'add-custom', menu, 'Contact', `${ BASE }/#contact` ] );
		const nav = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'refraction-nav-menu', settings: { menu, ...settings }, elements: [] } );

		// ------------------------------------------------------------ the submenu icon
		const iconPage = page( 'Icon', [ nav( 'n001', { indicator: 'icon', indicator_icon: { value: 'fas fa-angle-down', library: 'fa-solid' }, indicator_size: { size: 18, unit: 'px' }, indicator_color: '#C00000' } ) ] );
		const d = await at( iconPage.url, 1280 );
		const icon = await d.evaluate( () => {
			const t = document.querySelector( '.refraction-nav-menu__subtoggle' );
			const i = t.querySelector( '.refraction-nav-menu__indicator--icon' );
			return { has: !! i && !! i.firstElementChild, size: getComputedStyle( i ).fontSize, color: getComputedStyle( t ).color };
		} );
		check( 'submenu icon', 'the chosen icon is shown, with its size and color', icon.has && '18px' === icon.size && 'rgb(192, 0, 0)' === icon.color, JSON.stringify( icon ) );
		await d.click( '.refraction-nav-menu__subtoggle' );
		await sleep( 400 );
		const turned = await d.evaluate( () => getComputedStyle( document.querySelector( '.refraction-nav-menu__indicator--icon' ) ).transform );
		check( 'submenu icon', 'it turns when its submenu opens', 'none' !== turned, turned );
		await d.screenshot( { path: join( SHOTS, 'icon.png' ) } );
		await d.context().close();

		// ------------------------------------------------------------ the collapsed panel
		const dropdown = page( 'Dropdown', [ nav( 'n002', { panel_style: 'dropdown', panel_stretch: 'full' } ) ] );
		const m1 = await at( dropdown.url, 375 );
		await m1.click( '.refraction-nav-menu__toggle' );
		await sleep( 500 );
		const drop = await m1.evaluate( () => { const r = document.querySelector( '.refraction-nav-menu__panel' ).getBoundingClientRect(); return [ Math.round( r.left ), Math.round( r.width ) ]; } );
		check( 'panel', 'the dropdown stretches to the screen width', 0 === drop[ 0 ] && 375 === drop[ 1 ], JSON.stringify( drop ) );
		await m1.screenshot( { path: join( SHOTS, 'dropdown.png' ) } );
		await m1.context().close();

		const side = page( 'Side', [ nav( 'n003', { panel_style: 'offcanvas-right', panel_duration: { size: 300, unit: 'px' }, toggle_animation: 'arrow-left' } ) ] );
		const m2 = await at( side.url, 375 );
		await m2.click( '.refraction-nav-menu__toggle' );
		await sleep( 500 );
		const open = await m2.evaluate( () => {
			const r = document.querySelector( '.refraction-nav-menu__panel' ).getBoundingClientRect();
			const s1 = getComputedStyle( document.querySelector( '.refraction-nav-menu__burger span' ) ).transform;
			return { right: Math.round( r.right ), width: Math.round( r.width ), height: Math.round( r.height ), backdrop: getComputedStyle( document.querySelector( '.refraction-nav-menu__backdrop' ) ).display, close: getComputedStyle( document.querySelector( '.refraction-nav-menu__close' ) ).display, locked: document.documentElement.classList.contains( 'refraction-nav-menu-locked' ), arrow: s1 };
		} );
		check( 'panel', 'sliding in from the right: full height at the right edge, with a backdrop and a close button', 375 === open.right && open.width >= 300 && open.width <= 330 && 800 === open.height && 'block' === open.backdrop && 'none' !== open.close, JSON.stringify( open ) );
		check( 'panel', 'the page does not scroll under it', open.locked, JSON.stringify( open ) );
		check( 'hamburger', 'the "arrow" animation turns the lines into an arrow', /matrix/.test( open.arrow ) && 'none' !== open.arrow, open.arrow );
		await m2.screenshot( { path: join( SHOTS, 'offcanvas.png' ) } );
		await m2.click( '.refraction-nav-menu__close' );
		await sleep( 80 );
		const closing = await m2.evaluate( () => document.querySelector( '.refraction-nav-menu' ).classList.contains( 'is-closing' ) );
		await sleep( 500 );
		const closed = await m2.evaluate( () => ( { display: getComputedStyle( document.querySelector( '.refraction-nav-menu__panel' ) ).display, locked: document.documentElement.classList.contains( 'refraction-nav-menu-locked' ) } ) );
		check( 'panel', 'the close button closes it with its animation, and the page scrolls again', closing && 'none' === closed.display && ! closed.locked, JSON.stringify( { closing, ...closed } ) );
		await m2.context().close();

		const full = page( 'Full', [ nav( 'n004', { panel_style: 'fullscreen', panel_animation: 'zoom', toggle_icon: { value: 'fas fa-bars', library: 'fa-solid' } } ) ] );
		const m3 = await at( full.url, 375 );
		const before = await m3.evaluate( () => [ getComputedStyle( document.querySelector( '.refraction-nav-menu__toggle-icon--open' ) ).display, getComputedStyle( document.querySelector( '.refraction-nav-menu__toggle-icon--close' ) ).display ] );
		await m3.click( '.refraction-nav-menu__toggle' );
		await sleep( 500 );
		const fs = await m3.evaluate( () => {
			const r = document.querySelector( '.refraction-nav-menu__panel' ).getBoundingClientRect();
			return { box: [ Math.round( r.left ), Math.round( r.top ), Math.round( r.width ), Math.round( r.height ) ], icons: [ getComputedStyle( document.querySelector( '.refraction-nav-menu__toggle-icon--open' ) ).display, getComputedStyle( document.querySelector( '.refraction-nav-menu__toggle-icon--close' ) ).display ] };
		} );
		check( 'panel', 'full screen covers the screen', '0,0,375,800' === fs.box.join( ',' ), JSON.stringify( fs ) );
		check( 'hamburger', 'the button\'s own icon, changing to a close icon when open', 'none' !== before[ 0 ] && 'none' === before[ 1 ] && 'none' === fs.icons[ 0 ] && 'none' !== fs.icons[ 1 ], JSON.stringify( [ before, fs.icons ] ) );
		await m3.screenshot( { path: join( SHOTS, 'fullscreen.png' ) } );
		await m3.context().close();

		// ------------------------------------------------------------ editing from Site Settings
		const editPage = page( 'Edit me', [ { id: 'hd01', elType: 'widget', widgetType: 'heading', settings: { title: 'Click me' }, elements: [] } ] );
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000 } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ editPage.id }&action=refraction` );
		await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2000 );
		await p.evaluate( () => $e.run( 'panel/global/open' ) );
		await p.waitForFunction( () => refraction.documents.getCurrent().id === parseInt( refraction.config.kit_id ), null, { timeout: 30000 } );
		await sleep( 1500 );
		const hint = await p.locator( '.refraction-kit-edit-hint' ).count();
		check( 'site settings', 'Site Settings says the page can still be clicked to edit', 1 === hint );
		await p.screenshot( { path: join( SHOTS, 'site-settings.png' ) } );
		await p.frame( { name: 'refraction-preview-iframe' } ).click( '[data-id="hd01"]' );
		await p.waitForFunction( ( id ) => refraction.documents.getCurrent().id === id, editPage.id, { timeout: 30000 } ).catch( () => {} );
		await sleep( 1500 );
		const back = await p.evaluate( () => ( { doc: refraction.documents.getCurrent().id, selected: refraction.selection?.getElements?.().map( ( c ) => c.id ) || [], panel: document.querySelector( '#refraction-panel-header-title' )?.textContent.trim() } ) );
		check( 'site settings', 'clicking an element of the page goes back to editing it, with the element chosen', editPage.id === back.doc && back.selected.includes( 'hd01' ) && /Heading/i.test( back.panel || '' ), JSON.stringify( back ) );
		await p.screenshot( { path: join( SHOTS, 'back-to-editing.png' ) } );
		await ctx.close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 700 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall nav menu checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
