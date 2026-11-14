#!/usr/bin/env node
/**
 * Field icons check (0.94.0, SQLite test site, Chromium): Choice details that follow the order of the choices (a row
 * named "Test 1" for choices 1, 2, 3 still shows its picture), the rows' parts following the Look in the panel, the
 * Country list with a flag beside each country and a search box (editor preview and site), the icon shown before a
 * country is chosen, icons in the First and Last Name boxes, and an Amount with an icon and no currency symbol.
 *
 * Usage: node scripts/check-field-icons.mjs [--site /tmp/rf-fi-site] [--port 8933] [--shots /tmp/field-icons-shots]
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fi-site' );
const PORT = arg( 'port', '8933' );
const SHOTS = arg( 'shots', '/tmp/field-icons-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/form-builder-seed.php' );
const BUILDER = `${ BASE }/wp-admin/admin.php?page=refraction-builder`;

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

function wp( args, env = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const seed = ( action, spec = {} ) => {
	const out = wp( [ 'eval-file', SEED ], { FB_ACTION: action, FB_SPEC: JSON.stringify( spec ) } );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
};
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

async function login( browser ) {
	const ctx = await browser.newContext( { viewport: { width: 1500, height: 1000 } } );
	const page = await ctx.newPage();
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'admin' );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000 } ), page.click( '#wp-submit' ) ] );
	return page;
}


const ph = ( name ) => ( { value: `rf-ph rf-ph-${ name }`, library: 'phosphor-regular' } );

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
	const watch = ( p, label ) => p.on( 'pageerror', ( e ) => errors.push( `[${ label }] ${ e.message }` ) );

	try {
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
		wp( [ 'transient', 'delete', '--all' ] );
		const pic = Number( wp( [ 'media', 'import', join( HERE, '../tests/elements-regression/assets/test-images/image1.jpg' ), '--porcelain' ] ).trim() );
		const page = await login( browser );
		watch( page, 'editor' );

		await page.goto( BUILDER );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		await page.goto( newHref, { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await page.waitForTimeout( 2000 );

		// The case from the report: choices 1, 2, 3 and one Choice details row named "Test 1".
		await page.evaluate( ( a ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const box = add( root, { elType: 'container', settings: { flex_gap: { unit: 'px', size: 24, column: '24', row: '24' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Choice (one)', field_key: 'choice', field_options: '1\n2\n3', choice_look: 'images', option_extras: [ { _id: 'r1', choice: 'Test 1', image: { id: a.pic, url: '' }, icon: a.car, text: 'Project 1', badge: '5%' } ] } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-country', settings: { field_label: 'Country', field_key: 'country', field_icon: a.globe } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-name', settings: { field_label: 'Your name', field_key: 'name', field_icon: a.user, field_icon_last: a.users } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-currency', settings: { field_label: 'Amount', field_key: 'amount', field_icon: a.gbp } } );
			add( root, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send' } } );
		}, { pic, car: ph( 'car' ), globe: ph( 'globe' ), user: ph( 'user' ), users: ph( 'users' ), gbp: ph( 'currency-gbp' ) } );
		await page.waitForTimeout( 2000 );
		const preview = page.frameLocator( '#refraction-preview-iframe' );

		check( 'editor', 'the "Test 1" row belongs to choice 1: its picture shows in the preview', ( await preview.locator( '[data-rfb-key="choice"] .rfb-check' ).first().locator( '.rfb-opt-media img' ).count() ) === 1 );
		check( 'editor', 'the country box shows its icon before a country is chosen, and a list button', ( await preview.locator( '[data-rfb-key="country"] .rfb-field-icon:has(svg)' ).isVisible() ) && ( await preview.locator( '[data-rfb-key="country"] .rfb-cp-button' ).count() ) === 1 );
		await preview.locator( '[data-rfb-key="country"] .rfb-cp-button' ).click();
		await page.waitForTimeout( 300 );
		check( 'editor', 'the country list opens in the preview with a flag beside every country', ( await preview.locator( '[data-rfb-key="country"] .rfb-cp-option img' ).count() ) > 240 );
		await preview.locator( '[data-rfb-key="country"] .rfb-cp-search' ).fill( 'united kingdom' );
		await preview.locator( '[data-rfb-key="country"] .rfb-cp-search' ).press( 'Enter' );
		await page.waitForTimeout( 300 );
		check( 'editor', 'picking a country in the preview shows its flag in the box', ( await preview.locator( '[data-rfb-key="country"] .rfb-flag' ).getAttribute( 'src' ) ).endsWith( '/gb.svg' ) && ( await preview.locator( '[data-rfb-key="country"] .rfb-flag' ).isVisible() ) && ! ( await preview.locator( '[data-rfb-key="country"] .rfb-field-icon' ).isVisible() ) );
		check( 'editor', 'the name boxes and the amount show their icons; the amount has no currency symbol', ( await preview.locator( '[data-rfb-key="name"] .rfb-name-first .rfb-field-icon:has(svg)' ).count() ) === 1 && ( await preview.locator( '[data-rfb-key="name"] .rfb-name-last .rfb-field-icon:has(svg)' ).count() ) === 1 && ( await preview.locator( '[data-rfb-key="amount"] .rfb-field-icon:has(svg)' ).count() ) === 1 && ( await preview.locator( '[data-rfb-key="amount"] .rfb-amount-symbol' ).count() ) === 0 );

		// The panel: the row's parts follow the Look.
		await preview.locator( '.refraction-widget-rfb-field-radio' ).click();
		await page.waitForTimeout( 800 );
		await page.locator( '.refraction-control-option_extras .refraction-repeater-row-item-title' ).first().click();
		await page.waitForTimeout( 500 );
		const parts = async () => ( await Promise.all( [ 'image', 'icon', 'text', 'badge' ].map( async ( n ) => ( await page.locator( `.refraction-control-option_extras .refraction-control-${ n }:not(.refraction-hidden-control)` ).count() ) ? n : '' ) ) ).filter( Boolean ).join( ',' );
		const set = ( look ) => page.evaluate( async ( l ) => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const radio = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === 'rfb-field-radio' );
			await $e.run( 'document/elements/settings', { container: radio, settings: { choice_look: l } } );
		}, look );
		const images = await parts();
		await set( 'segmented' );
		await page.waitForTimeout( 400 );
		const segmented = await parts();
		await set( 'cards' );
		await page.waitForTimeout( 400 );
		const cards = await parts();
		check( 'panel', 'Choice details show what the Look uses: picture only for Image cards, text for cards, not for the bar', images === 'image,icon,text,badge' && segmented === 'icon,badge' && cards === 'icon,text,badge', `${ images } | ${ segmented } | ${ cards }` );
		await set( 'list' );
		await page.waitForTimeout( 400 );
		check( 'panel', 'the plain List look hides Choice details', ( await page.locator( '.refraction-control-option_extras:not(.refraction-hidden-control)' ).count() ) === 0 );
		await set( 'images' );
		// The preview draws the field again on the server: wait for it.
		const back = await preview.locator( '[data-rfb-key="choice"].rfb-look-images .rfb-check' ).first().locator( '.rfb-opt-media img' ).waitFor( { timeout: 15000 } ).then( () => true, () => false );
		check( 'panel', 'the row keeps its picture when the Look changes and comes back', back );
		await page.screenshot( { path: join( SHOTS, 'editor.png' ) } );

		await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await page.waitForTimeout( 800 );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Field icons', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
			await $e.run( 'document/save/publish' );
		} );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the collection gives the row to choice 1 with its picture, icon, text and badge', field( 'choice' ).option_extras && field( 'choice' ).option_extras[ '1' ] && field( 'choice' ).option_extras[ '1' ].image === pic && field( 'choice' ).option_extras[ '1' ].text === 'Project 1', JSON.stringify( field( 'choice' ).option_extras ) );

		// ------------------------------------------------------------ the site
		const formPage = seed( 'page', { title: 'Icons', slug: 'icons', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1400 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const f = ( key ) => v.locator( `[data-rfb-key="${ key }"]` );

		check( 'site', 'choice 1 shows the picture, the line of text and the badge from the "Test 1" row', ( await f( 'choice' ).locator( '.rfb-check' ).first().locator( '.rfb-opt-media img' ).count() ) === 1 && ( await f( 'choice' ).locator( '.rfb-check' ).first().locator( '.rfb-opt-text' ).textContent() ) === 'Project 1' && ( await f( 'choice' ).locator( '.rfb-check' ).first().locator( '.rfb-opt-badge' ).textContent() ) === '5%' );
		await f( 'choice' ).locator( '.rfb-check' ).first().click();

		// country: icon first, then the list with flags
		const button = f( 'country' ).locator( '.rfb-cp-button' );
		check( 'country', 'before a country is chosen: the globe icon, "Select a country...", no flag', ( await f( 'country' ).locator( '.rfb-field-icon' ).isVisible() ) && ( await f( 'country' ).locator( '.rfb-flag' ).isHidden() ) && ( await button.textContent() ).includes( 'Select a country' ) );
		await button.focus();
		await v.keyboard.press( 'Enter' );
		await v.waitForTimeout( 200 );
		const flagsOk = await f( 'country' ).locator( '.rfb-cp-option' ).first().locator( 'img' ).evaluate( async ( img ) => { img.scrollIntoView(); await new Promise( ( r ) => setTimeout( r, 400 ) ); return img.complete && img.naturalWidth > 0; } );
		check( 'country', 'Enter opens the list: a search box with focus and a flag (loaded) beside each country', ( await f( 'country' ).locator( '.rfb-cp-search' ).evaluate( ( el ) => el === document.activeElement ) ) && flagsOk && ( await f( 'country' ).locator( '.rfb-cp-option img' ).count() ) > 240 && ( await button.getAttribute( 'aria-expanded' ) ) === 'true' );
		await v.keyboard.type( 'jap' );
		check( 'country', 'typing narrows the list (jap: Japan)', ( await f( 'country' ).locator( '.rfb-cp-option:not([hidden])' ).allTextContents() ).join( '|' ) === 'Japan' );
		await v.keyboard.press( 'Enter' );
		await v.waitForTimeout( 200 );
		check( 'country', 'Enter picks it: the box shows Japan and its flag, the list closes, the focus returns to the box', ( await f( 'country' ).locator( 'select' ).inputValue() ) === 'JP' && ( await button.textContent() ).includes( 'Japan' ) && ( await f( 'country' ).locator( '.rfb-flag' ).getAttribute( 'src' ) ).endsWith( '/jp.svg' ) && ( await f( 'country' ).locator( '.rfb-cp-pop' ).isHidden() ) && ( await button.evaluate( ( el ) => el === document.activeElement ) ) && ! ( await f( 'country' ).locator( '.rfb-field-icon' ).isVisible() ) );
		await button.click();
		await v.keyboard.press( 'Escape' );
		check( 'country', 'Escape closes the list without changing the country', ( await f( 'country' ).locator( '.rfb-cp-pop' ).isHidden() ) && ( await f( 'country' ).locator( 'select' ).inputValue() ) === 'JP' );
		await button.click();
		await v.mouse.click( 5, 5 );
		check( 'country', 'a click outside closes it', await f( 'country' ).locator( '.rfb-cp-pop' ).isHidden() );

		// name and amount
		const nameIcon = await f( 'name' ).locator( '.rfb-name-last .rfb-field-icon' ).boundingBox();
		const lastBox = await f( 'name' ).locator( '.rfb-name-last input' ).boundingBox();
		check( 'name', 'First and Last Name each show their icon inside their box', ( await f( 'name' ).locator( '.rfb-name-first .rfb-field-icon:has(svg)' ).count() ) === 1 && nameIcon.x > lastBox.x && nameIcon.x < lastBox.x + 30 );
		await f( 'name' ).locator( '.rfb-name-first input' ).fill( 'Ann' );
		await f( 'name' ).locator( '.rfb-name-last input' ).fill( 'Lee' );
		const amount = f( 'amount' ).locator( 'input' );
		await amount.pressSequentially( '1250.5' );
		check( 'amount', 'the amount has its icon, no currency symbol, and still writes 1,250.5 as you type', ( await f( 'amount' ).locator( '.rfb-amount-symbol' ).count() ) === 0 && ( await f( 'amount' ).locator( '.rfb-field-icon:has(svg)' ).count() ) === 1 && ( await amount.inputValue() ) === '1,250.5' );

		await v.screenshot( { path: join( SHOTS, 'desktop.png' ), fullPage: true } );
		await button.click();
		await v.waitForTimeout( 300 );
		await v.screenshot( { path: join( SHOTS, 'country-list.png' ), clip: { x: 0, y: Math.max( 0, ( await button.boundingBox() ).y - 60 ), width: 1200, height: 460 } } );
		await v.keyboard.press( 'Escape' );
		await v.setViewportSize( { width: 390, height: 1400 } );
		await v.waitForTimeout( 300 );
		check( 'phone', 'nothing is wider than a phone screen', await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ) );
		await v.screenshot( { path: join( SHOTS, 'phone.png' ), fullPage: true } );
		await v.setViewportSize( { width: 1200, height: 1400 } );

		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 600 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the answers are stored: choice 1, Japan, the name and the amount', vals && vals.choice === '1' && vals.country === 'JP' && vals.name && vals.name.last === 'Lee' && vals.amount === '1250.50', JSON.stringify( vals ) );
		await vctx.close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', errors.length === 0, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall field icons checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
