#!/usr/bin/env node
/**
 * Panel categories check (SQLite test site, Chromium): no widget has a long section without categories or state tabs
 * (scripts/audit-widget-panels.mjs); Nav Menu > Submenu and Hamburger Button are grouped with Normal / Hover (/ Current
 * Page) tabs, and their saved colors still reach the page; Nested Carousel > Arrows has Normal / Hover; the shared
 * Highlighted Text section shows Text / Mark Behind / Drawing; a category hides with its settings (Timed Slides >
 * Numbers).
 *
 * Usage: node scripts/check-panel-categories.mjs [--site /tmp/rf-pc-site] [--port 8995] [--shots /tmp/panel-categories-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-pc-site' );
const PORT = arg( 'port', '8995' );
const SHOTS = arg( 'shots', '/tmp/panel-categories-shots' );
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

const nav = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'refraction-nav-menu', settings: { menu: MENU, layout: 'horizontal', ...settings }, elements: [] } );
let MENU = '';

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	// Every widget: no long section left without categories or state tabs.
	const audit = execFileSync( 'node', [ join( process.cwd(), 'scripts/audit-widget-panels.mjs' ), '--port', PORT, '--all', '--min', '12' ], { encoding: 'utf8', timeout: 300000 } );
	const line = audit.split( '\n' )[ 0 ];
	check( 'audit', 'every widget: no section of 12 or more settings without categories or state tabs', / 0$/.test( line ), audit.split( '\n\n' )[ 0 ] );

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];

	try {
		MENU = wp( [ 'menu', 'create', `Categories ${ Date.now() }`, '--porcelain' ] ).trim();
		const parent = wp( [ 'menu', 'item', 'add-custom', MENU, 'Tours', `${ BASE }/#tours`, '--porcelain' ] ).trim();
		wp( [ 'menu', 'item', 'add-custom', MENU, 'Highlands', `${ BASE }/#highlands`, `--parent-id=${ parent }` ] );
		wp( [ 'menu', 'item', 'add-custom', MENU, 'Contact', `${ BASE }/#contact` ] );

		const doc = page( 'Panel categories', [ box( 'top', {}, [
			nav( 'nm', { sub_color_hover: '#c0ffee', sub_color_active: '#123456', toggle_bg_hover: '#abcdef', toggle_color: '#fedcba' } ),
			{ id: 'bt', elType: 'widget', widgetType: 'button', settings: { text: 'Book a ride', rf_hl_words: 'ride' }, elements: [] },
			{ id: 'nc', elType: 'widget', widgetType: 'refraction-nested-carousel', settings: { arrows: 'yes', arrow_bg_hover: '#ff00aa' }, elements: [] },
			{ id: 'ts', elType: 'widget', widgetType: 'refraction-timed-slides', settings: { show_progress: '', show_count: '' }, elements: [] },
		] ) ] );

		// The page keeps every saved setting (the ids did not change).
		const html = await ( await fetch( doc.url ) ).text();
		const css = await Promise.all( [ ...html.matchAll( /href='([^']*post-\d+\.css[^']*)'/g ) ].map( ( m ) => fetch( m[ 1 ] ).then( ( r ) => r.text() ) ) );
		const all = html + css.join( '' );
		check( 'saved', 'Nav Menu colors saved before the reorder still reach the page (hover, current page, hamburger)', [ '#c0ffee', '#123456', '#abcdef', '#fedcba' ].every( ( c ) => all.toLowerCase().includes( c ) ), [ '#c0ffee', '#123456', '#abcdef', '#fedcba' ].filter( ( c ) => ! all.toLowerCase().includes( c ) ).join() );

		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 1500 );

		const edit = async ( id, tab ) => {
			await a.evaluate( ( i ) => $e.run( 'panel/editor/open', { model: refraction.getContainer( i ).model, view: refraction.getContainer( i ).view } ), id );
			await a.waitForTimeout( 700 );
			await a.locator( `.refraction-panel-navigation-tab:has-text("${ tab }")` ).first().click();
			await a.waitForTimeout( 500 );
		};
		const openSection = async ( name ) => {
			await a.evaluate( ( n ) => {
				const s = document.querySelector( '.refraction-control-' + n );
				if ( s && ! s.classList.contains( 'e-open' ) ) {
					s.querySelector( '.refraction-panel-heading' ).click();
				}
			}, name );
			await a.waitForTimeout( 700 );
		};
		const state = () => a.evaluate( () => ( {
			groups: [ ...document.querySelectorAll( '.rf-section-groups__tab' ) ].map( ( t ) => t.textContent.trim() ),
			cats: [ ...document.querySelectorAll( '.rf-panel-category' ) ].filter( ( c ) => c.offsetParent ).map( ( c ) => c.textContent.trim() ),
			states: [ ...document.querySelectorAll( '.refraction-control-type-tab' ) ].filter( ( t ) => t.offsetParent ).map( ( t ) => t.textContent.trim() ),
		} ) );
		const shown = ( name ) => a.evaluate( ( n ) => !! document.querySelector( '.refraction-control-' + n )?.offsetParent, name );

		// Nav Menu > Submenu: Effect, Panel, Items, Colors (as tabs: the section is long); Colors has the states.
		await edit( 'nm', 'Style' );
		await openSection( 'style_submenu' );
		let st = await state();
		const subGroups = st.groups.length ? st.groups.join() : st.cats.join();
		check( 'nav menu', 'Submenu is grouped: Effect, Panel, Items, Colors', 'Effect,Panel,Items,Colors' === subGroups, JSON.stringify( st ) );
		if ( st.groups.length ) {
			await a.locator( '.rf-section-groups__tab:has-text("Colors")' ).click();
			await a.waitForTimeout( 500 );
		}
		st = await state();
		check( 'nav menu', 'Submenu colors have the tabs Normal, Hover, Current Page', 'Normal,Hover,Current Page' === st.states.join(), JSON.stringify( st ) );
		await a.screenshot( { path: join( SHOTS, 'submenu-colors.png' ) } );
		await a.locator( '.refraction-control-type-tab:has-text("Hover")' ).first().click();
		await a.waitForTimeout( 500 );
		check( 'nav menu', 'the Hover tab holds the hover text and background colors, with the saved value', ( await shown( 'sub_color_hover' ) ) && ( await shown( 'sub_bg_hover' ) ) && ! ( await shown( 'sub_color' ) ) && '#c0ffee' === ( await a.evaluate( () => refraction.getContainer( 'nm' ).settings.get( 'sub_color_hover' ) ) ) );

		await openSection( 'style_toggle' );
		st = await state();
		const burger = st.groups.length ? st.groups.join() : st.cats.join();
		check( 'nav menu', 'Hamburger Button is grouped: Icon, Box, Colors, Animation', 'Icon,Box,Colors,Animation' === burger, JSON.stringify( st ) );

		await a.locator( '.refraction-panel-navigation-tab:has-text("Content")' ).first().click();
		await a.waitForTimeout( 400 );
		await openSection( 'section_toggle' );
		st = await state();
		const mobile = st.groups.length ? st.groups.join() : st.cats.join();
		check( 'nav menu', 'Mobile Menu is grouped: Button, Opened Menu, In The Panel', 'Button,Opened Menu,In The Panel' === mobile, JSON.stringify( st ) );
		await a.screenshot( { path: join( SHOTS, 'mobile-menu.png' ) } );

		// The shared Highlighted Text section (about 50 widgets).
		await edit( 'bt', 'Style' );
		await openSection( 'section_rf_dual_style' );
		st = await state();
		check( 'shared', 'Highlighted Text is grouped: Text, Mark Behind', [ 'Text,Mark Behind', 'Text,Mark Behind,Drawing' ].includes( ( st.groups.length ? st.groups : st.cats ).join() ), JSON.stringify( st ) );
		await a.screenshot( { path: join( SHOTS, 'highlighted-text.png' ) } );

		// Nested Carousel > Arrows: Normal / Hover.
		await edit( 'nc', 'Style' );
		await openSection( 'section_style_arrows' );
		st = await state();
		const arrowGroups = ( st.groups.length ? st.groups : st.cats ).join();
		if ( st.groups.length ) {
			await a.locator( '.rf-section-groups__tab:has-text("Colors")' ).click();
			await a.waitForTimeout( 500 );
		}
		const arrowStates = ( await state() ).states.join();
		check( 'carousel', 'Arrows: Size And Place, Box, Colors with Normal / Hover', 'Size And Place,Box,Colors' === arrowGroups && 'Normal,Hover' === arrowStates, JSON.stringify( { arrowGroups, arrowStates } ) );
		await a.screenshot( { path: join( SHOTS, 'carousel-arrows.png' ) } );

		// Timed Slides: a category hides with its settings.
		await edit( 'ts', 'Style' );
		await openSection( 'section_style_nav' );
		st = await state();
		const numbersOff = ( st.groups.length ? st.groups : st.cats ).includes( 'Numbers' );
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ts' ), settings: { show_progress: 'yes' } } ) );
		await a.waitForTimeout( 900 );
		st = await state();
		const numbersOn = ( st.groups.length ? st.groups : st.cats ).includes( 'Numbers' );
		check( 'conditions', 'Timed Slides > Numbers shows only when the progress number or slide number is on', ! numbersOff && numbersOn, JSON.stringify( { numbersOff, numbersOn, st } ) );

		check( 'errors', 'no script errors in the editor', 0 === errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse)/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
