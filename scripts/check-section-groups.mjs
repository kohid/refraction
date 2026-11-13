#!/usr/bin/env node
/**
 * Organised settings check (SQLite test site, Chromium): Phone Showcase > Style has a section per part (Pill, Heading,
 * Description, Steps, Phone, Floating Cards, Buttons); Steps has Normal / Hover / Active with categories inside (Colors,
 * Text, Box, Icon) and its Hover colors apply; a long section (Phone) shows its categories as tabs and remembers the
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
			{ id: 'ps1', elType: 'widget', widgetType: 'refraction-phone-showcase', settings: { steps: [ { _id: 's1', title: 'One' }, { _id: 's2', title: 'Two' } ], cards: [], autoplay: 'yes', heading: 'Book in four taps', description: 'Call us or tap the app.', button_text: 'Get the app', rf_hl_part_heading: 'four taps' }, elements: [] },
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

		await edit( 'ps1', 'Style' );
		const sections = await a.$$eval( '.refraction-control-type-section', ( x ) => x.filter( ( e ) => e.offsetParent ).map( ( e ) => e.querySelector( '.refraction-panel-heading-title, .refraction-section-title' )?.textContent.trim() ) );
		check( 'organised', 'Phone Showcase > Style has one section per part, in order: Highlighted Text, Pill, Heading, Description, Steps, Phone, Floating Cards, Buttons', 'Highlighted Text,Pill,Heading,Description,Steps,Phone,Floating Cards' === sections.slice( 0, 7 ).join() || 'Highlighted Text,Pill,Heading,Description,Steps,Phone,Floating Cards,Buttons' === sections.join(), sections.join() );

		await openSection( 'section_style_steps' );
		await a.waitForTimeout( 800 );
		const steps = () => a.evaluate( () => ( {
			states: [ ...document.querySelectorAll( '.refraction-control-type-tab' ) ].filter( ( t ) => t.offsetParent ).map( ( t ) => t.textContent.trim() + ( t.classList.contains( 'e-tab-active' ) || t.classList.contains( 'refraction-tab-active' ) ? '*' : '' ) ),
			cats: [ ...document.querySelectorAll( '.rf-panel-category' ) ].filter( ( c ) => c.offsetParent ).map( ( c ) => c.textContent.trim() ),
			hoverBg: !! document.querySelector( '.refraction-control-step_bg_hover' )?.offsetParent,
			typo: !! document.querySelector( '.refraction-control-step_title_typography_typography' )?.offsetParent,
		} ) );
		let st = await steps();
		check( 'organised', 'Steps has the state tabs Normal, Hover, Active', 'Normal,Hover,Active' === st.states.map( ( x ) => x.replace( '*', '' ) ).join(), JSON.stringify( st ) );
		check( 'organised', 'inside Normal the settings are grouped: Colors, Text, Box, Icon', 'Colors,Text,Box,Icon' === st.cats.join() && st.typo && ! st.hoverBg, JSON.stringify( st ) );
		await a.screenshot( { path: join( SHOTS, 'steps-normal.png' ) } );
		await a.locator( '.refraction-control-type-tab:has-text("Hover")' ).first().click();
		await a.waitForTimeout( 600 );
		st = await steps();
		check( 'organised', 'the Hover tab has its own colors', 'Colors' === st.cats.join() && st.hoverBg && ! st.typo, JSON.stringify( st ) );
		await a.screenshot( { path: join( SHOTS, 'steps-hover.png' ) } );

		// The Phone section: its categories (Colors, Box, Place) become group tabs, as it is long.
		await openSection( 'section_style_phone' );
		await a.waitForTimeout( 800 );
		const phoneTabs = await a.$$eval( '.rf-section-groups__tab', ( t ) => t.map( ( x ) => x.textContent + ( x.classList.contains( 'is-active' ) ? '*' : '' ) ) );
		check( 'groups', 'a long section (Phone) shows its categories as tabs: Colors, Box, Place, Size And Tilt', 'Colors*,Box,Place, Size And Tilt (per screen size)' === phoneTabs.join(), phoneTabs.join() );
		await a.locator( '.rf-section-groups__tab:has-text("Box")' ).click();
		await a.waitForTimeout( 500 );
		const boxTab = await a.evaluate( () => ( { shadow: !! document.querySelector( '.refraction-control-phone_shadow_box_shadow_type' )?.offsetParent, screen: !! document.querySelector( '.refraction-control-screen_bg' )?.offsetParent } ) );
		check( 'groups', 'the Box tab shows the shadow and padding, not the colors', boxTab.shadow && ! boxTab.screen, JSON.stringify( boxTab ) );
		await a.screenshot( { path: join( SHOTS, 'phone-box.png' ) } );
		await openSection( 'section_style_cards' );
		await a.waitForTimeout( 500 );
		await openSection( 'section_style_phone' );
		await a.waitForTimeout( 700 );
		const kept = await a.$$eval( '.rf-section-groups__tab.is-active', ( t ) => t.map( ( x ) => x.textContent ).join() );
		check( 'groups', 'closing and opening the section again keeps the tab chosen (Box)', 'Box' === kept, kept );

		// On the page: a step's own Hover background.
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ps1' ), settings: { step_bg_hover: '#ffd400' } } ) );
		await a.waitForTimeout( 1200 );
		const pframe = a.frame( { name: 'refraction-preview-iframe' } );
		const step2 = pframe.locator( '[data-id="ps1"] .rf-showcase__step >> nth=1' );
		await step2.hover();
		await a.waitForTimeout( 600 );
		const hovered = await step2.evaluate( ( el ) => getComputedStyle( el ).backgroundColor );
		check( 'organised', 'Steps > Hover > Background applies when pointing at a step', 'rgb(255, 212, 0)' === hovered, hovered );

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
