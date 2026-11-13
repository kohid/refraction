#!/usr/bin/env node
/**
 * Section groups and shadow global colors check (SQLite test site, Chromium): a long section (Phone Showcase > Style
 * > Steps) shows tabs for its groups (General and one per heading), one group of settings at a time, and remembers the
 * tab; a short section has none; Box / Text Shadow pickers list the global colors and link the shadow to one.
 *
 * Usage: node scripts/check-section-groups.mjs [--site /tmp/rf-sg-site] [--port 8994] [--shots /tmp/section-groups-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-sg-site' );
const PORT = arg( 'port', '8994' );
const SHOTS = arg( 'shots', '/tmp/section-groups-shots' );
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

	try {
		const doc = page( 'Section groups', [ box( 'top', {}, [
			{ id: 'ps1', elType: 'widget', widgetType: 'refraction-phone-showcase', settings: { steps: [ { _id: 's1', title: 'One' }, { _id: 's2', title: 'Two' } ], cards: [], autoplay: 'yes' }, elements: [] },
			heading( 'h1', 'Shadow me' ),
		] ) ] );
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
		const openSection = ( name ) => a.evaluate( ( n ) => {
			const s = document.querySelector( '.refraction-control-' + n );
			if ( s && ! s.classList.contains( 'e-open' ) ) {
				s.querySelector( '.refraction-panel-heading' ).click();
			}
		}, name );
		const state = () => a.evaluate( () => ( {
			tabs: [ ...document.querySelectorAll( '.rf-section-groups__tab' ) ].map( ( t ) => t.textContent + ( t.classList.contains( 'is-active' ) ? '*' : '' ) ),
			bg: !! document.querySelector( '.refraction-control-step_bg_normal' )?.offsetParent,
			iconSize: !! document.querySelector( '.refraction-control-step_icon_box_size' )?.offsetParent,
			progress: !! document.querySelector( '.refraction-control-progress_show' )?.offsetParent,
			headingShown: !! document.querySelector( '.refraction-control-step_icon_box_heading' )?.offsetParent,
		} ) );

		await edit( 'ps1', 'Style' );
		await openSection( 'section_style_steps' );
		await a.waitForTimeout( 800 );
		let s = await state();
		check( 'groups', 'Phone Showcase > Style > Steps shows its groups as tabs: General, Step Icon, Progress Bar (General first)', 'General*,Step Icon,Progress Bar' === s.tabs.join(), JSON.stringify( s ) );
		check( 'groups', 'only the General settings show (colors yes, the step icon size and the progress bar no)', s.bg && ! s.iconSize && ! s.progress, JSON.stringify( s ) );
		await a.screenshot( { path: join( SHOTS, 'steps-general.png' ) } );
		await a.locator( '.rf-section-groups__tab:has-text("Step Icon")' ).click();
		await a.waitForTimeout( 500 );
		s = await state();
		check( 'groups', 'the Step Icon tab shows the step icon settings only, without repeating its heading', s.iconSize && ! s.bg && ! s.progress && ! s.headingShown && 'Step Icon*' === s.tabs[ 1 ], JSON.stringify( s ) );
		await a.screenshot( { path: join( SHOTS, 'steps-icon.png' ) } );
		await openSection( 'section_style_phone' );
		await a.waitForTimeout( 500 );
		await openSection( 'section_style_steps' );
		await a.waitForTimeout( 700 );
		s = await state();
		check( 'groups', 'closing and opening the section again keeps the tab chosen (Step Icon)', 'Step Icon*' === s.tabs[ 1 ] && s.iconSize, JSON.stringify( s ) );

		await edit( 'h1', 'Style' );
		await a.waitForTimeout( 500 );
		const shortTabs = await a.$$eval( '.rf-section-groups', ( x ) => x.length );
		check( 'groups', 'a short section (Heading > Style) has no group tabs', 0 === shortTabs, String( shortTabs ) );

		// ------------------------------------------------------------ shadow color from the global colors
		await a.locator( '.refraction-control-text_shadow_text_shadow_type .refraction-control-popover-toggle-toggle-label' ).click();
		await a.waitForTimeout( 700 );
		await a.locator( '.refraction-control-text_shadow_text_shadow .pcr-button' ).click();
		await a.waitForTimeout( 600 );
		const globe = a.locator( '.pcr-app.visible .rf-shadow-globals__toggle' );
		check( 'shadow', 'the Text Shadow color picker has a Global Colors button', 1 === await globe.count() );
		await globe.click();
		await a.waitForTimeout( 700 );
		const items = await a.$$eval( '.pcr-app.visible .rf-shadow-globals__item', ( x ) => x.map( ( i ) => i.textContent ) );
		check( 'shadow', 'it lists the site\'s global colors', items.includes( 'Primary' ) && items.includes( 'Accent' ), items.join() );
		await a.screenshot( { path: join( SHOTS, 'shadow-globals.png' ) } );
		await a.locator( '.pcr-app.visible .rf-shadow-globals__item:has-text("Accent")' ).click();
		await a.waitForTimeout( 1200 );
		const saved = await a.evaluate( () => refraction.getContainer( 'h1' ).settings.get( 'text_shadow_text_shadow' )?.color );
		const drawn = await a.frame( { name: 'refraction-preview-iframe' } ).evaluate( () => getComputedStyle( document.querySelector( '[data-id="h1"] .refraction-heading-title' ) ).textShadow );
		check( 'shadow', 'picking Accent links the shadow to it (saved as the global color) and the preview draws it in that color', 'var(--e-global-color-accent)' === saved && /rgb\(97, 206, 112\)/.test( drawn ), `${ saved } / ${ drawn }` );
		await ctx.close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall section group checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
