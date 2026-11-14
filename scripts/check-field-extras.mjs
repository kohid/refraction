#!/usr/bin/env node
/**
 * Field extras check (0.93.0, SQLite test site, Chromium): an icon in a text box (room for it, color while typing), the
 * phone formats while typing (national, international, Backspace over a bracket or dash), a long text that grows up to
 * its tallest height, the country's flag at the left of the box following the choice, and the space between the name
 * boxes; then the answers are stored as typed.
 *
 * Usage: node scripts/check-field-extras.mjs [--site /tmp/rf-fx-site] [--port 8932] [--shots /tmp/field-extras-shots]
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
const SITE = arg( 'site', '/tmp/rf-fx-site' );
const PORT = arg( 'port', '8932' );
const SHOTS = arg( 'shots', '/tmp/field-extras-shots' );
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
		const page = await login( browser );
		watch( page, 'editor' );

		await page.goto( BUILDER );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		await page.goto( newHref, { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await page.waitForTimeout( 2000 );

		await page.evaluate( () => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const box = add( root, { elType: 'container', settings: { flex_gap: { unit: 'px', size: 24, column: '24', row: '24' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Search', field_key: 'search', placeholder: 'Search', field_icon: { value: 'rf-ph rf-ph-magnifying-glass', library: 'phosphor-regular' }, field_icon_focus_color: '#e91e63' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-name', settings: { field_label: 'Your name', field_key: 'name', name_gap: { unit: 'px', size: 40 } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-phone', settings: { field_label: 'Phone (national)', field_key: 'phone_n', phone_format: 'national' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-phone', settings: { field_label: 'Phone (international)', field_key: 'phone_i', phone_format: 'international', field_icon: { value: 'rf-ph rf-ph-phone', library: 'phosphor-regular' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-phone', settings: { field_label: 'Phone (UK mobile)', field_key: 'phone_uk', phone_format: 'national', phone_pattern: '##### ######' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-textarea', settings: { field_label: 'Message', field_key: 'message', autogrow: 'yes', autogrow_max: { unit: 'px', size: 220 }, field_icon: { value: 'rf-ph rf-ph-chat-text', library: 'phosphor-regular' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-textarea', settings: { field_label: 'Notes', field_key: 'notes' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-country', settings: { field_label: 'Country', field_key: 'country' } } );
			add( root, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send' } } );
		} );
		await page.waitForTimeout( 1500 );

		const preview = page.frameLocator( '#refraction-preview-iframe' );
		check( 'preview', 'the editor preview shows the icons and the formatted phone boxes', ( await preview.locator( '.rfb-icon-box .rfb-field-icon:has(svg)' ).count() ) === 3 && ( await preview.locator( 'input[data-rfb-phone]' ).count() ) === 3 && ( await preview.locator( '.rfb-flag-box' ).count() ) === 1 );

		// the panel
		await preview.locator( '.refraction-widget-rfb-field-phone' ).first().click();
		await page.waitForTimeout( 800 );
		const formats = await page.$$eval( 'select[data-setting="phone_format"] option', ( els ) => els.map( ( e ) => e.value ) );
		check( 'panel', 'a phone field offers As typed, National and International, and a pattern', formats.join( ',' ) === ',national,international' && ( await page.locator( '.refraction-control-phone_pattern:visible' ).count() ) === 1 && ( await page.locator( '.refraction-control-field_icon:visible' ).count() ) === 1, formats.join( ',' ) );
		await preview.locator( '.refraction-widget-rfb-field-name' ).click();
		await page.waitForTimeout( 800 );
		await page.click( '.refraction-panel-navigation-tab:has-text("Style")' );
		await page.waitForTimeout( 500 );
		await page.locator( '.refraction-control-section_style_name_parts' ).click();
		await page.waitForTimeout( 400 );
		check( 'panel', 'a name field has "Space between First Name and Last Name"', ( await page.locator( '.refraction-control-name_gap:visible' ).textContent() ).includes( 'Space between First Name and Last Name' ) );
		await page.click( '.refraction-panel-navigation-tab:has-text("Content")' );
		await preview.locator( '.refraction-widget-rfb-field-textarea' ).first().click();
		await page.waitForTimeout( 800 );
		check( 'panel', 'a long text has "Grow while typing" and its tallest height', ( await page.locator( '.refraction-control-autogrow:visible' ).count() ) === 1 && ( await page.locator( '.refraction-control-autogrow_max:visible' ).count() ) === 1 );
		await preview.locator( '.refraction-widget-rfb-field-country' ).click();
		await page.waitForTimeout( 800 );
		check( 'panel', 'a country field has "Show the flag", on by default', ( await page.locator( '.refraction-control-country_flag:visible input' ).isChecked() ) );

		await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await page.waitForTimeout( 800 );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Field extras', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
			await $e.run( 'document/save/publish' );
		} );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the collection keeps the icon, the formats and patterns, the growing text and the flag', field( 'search' ).icon && field( 'search' ).icon.value === 'rf-ph rf-ph-magnifying-glass' && field( 'phone_n' ).phone_pattern === '(###) ###-####' && field( 'phone_uk' ).phone_pattern === '##### ######' && field( 'message' ).autogrow === true && field( 'notes' ).autogrow === false && field( 'country' ).country_flag === true, JSON.stringify( def.fields.map( ( f ) => [ f.key, f.icon, f.phone_pattern, f.autogrow, f.country_flag ] ) ) );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Extras', slug: 'extras', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1500 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const f = ( key ) => v.locator( `[data-rfb-key="${ key }"]` );

		// icon in the box
		const search = f( 'search' ).locator( 'input' );
		const iconBox = await f( 'search' ).locator( '.rfb-field-icon' ).boundingBox();
		const inputBox = await search.boundingBox();
		const pad = await search.evaluate( ( el ) => parseFloat( getComputedStyle( el ).paddingLeft ) );
		check( 'icon', 'the icon sits inside the box at the left, the text starts after it', iconBox.x > inputBox.x && iconBox.x + iconBox.width < inputBox.x + pad && Math.abs( ( iconBox.y + iconBox.height / 2 ) - ( inputBox.y + inputBox.height / 2 ) ) < 2, JSON.stringify( [ iconBox, inputBox, pad ] ) );
		const before = await f( 'search' ).locator( '.rfb-field-icon' ).evaluate( ( el ) => getComputedStyle( el ).color );
		await search.focus();
		const typing = await f( 'search' ).locator( '.rfb-field-icon' ).evaluate( ( el ) => getComputedStyle( el ).color );
		check( 'icon', 'the icon takes the "color while typing" when the box has focus', before !== typing && typing === 'rgb(233, 30, 99)', `${ before } -> ${ typing }` );
		const msgIcon = await f( 'message' ).locator( '.rfb-field-icon' ).boundingBox();
		const msgBox = await f( 'message' ).locator( 'textarea' ).boundingBox();
		check( 'icon', 'a long text keeps its icon by the first line', msgIcon.y - msgBox.y < 24, JSON.stringify( [ msgIcon, msgBox ] ) );

		// phone formats
		const phoneN = f( 'phone_n' ).locator( 'input' );
		await phoneN.pressSequentially( '5551234567' );
		check( 'phone', 'national: 5551234567 is written (555) 123-4567 while typing', ( await phoneN.inputValue() ) === '(555) 123-4567', await phoneN.inputValue() );
		await phoneN.pressSequentially( '89' );
		check( 'phone', 'national: digits past the pattern are not added', ( await phoneN.inputValue() ) === '(555) 123-4567' );
		await phoneN.evaluate( ( el ) => el.setSelectionRange( 9, 9 ) );
		await v.keyboard.press( 'Backspace' );
		check( 'phone', 'Backspace right after the dash removes the digit before it, and the number re-flows', ( await phoneN.inputValue() ) === '(555) 124-567', await phoneN.inputValue() );
		await phoneN.fill( '' );
		await phoneN.pressSequentially( '5551' );
		await phoneN.evaluate( ( el ) => el.setSelectionRange( 6, 6 ) );
		await v.keyboard.press( 'Backspace' );
		check( 'phone', 'Backspace after ") " removes the 5 before it (it never gets stuck on a bracket)', ( await phoneN.inputValue() ) === '(551', await phoneN.inputValue() );
		await phoneN.fill( '' );
		await phoneN.pressSequentially( '(555) 12' );
		await phoneN.pressSequentially( '3-4567' );
		check( 'phone', 'typing the brackets and dash yourself gives the same result', ( await phoneN.inputValue() ) === '(555) 123-4567', await phoneN.inputValue() );
		const phoneI = f( 'phone_i' ).locator( 'input' );
		await phoneI.pressSequentially( '447891234567' );
		check( 'phone', 'international: 447891234567 is written +44 789 123 4567', ( await phoneI.inputValue() ) === '+44 789 123 4567', await phoneI.inputValue() );
		const phoneUk = f( 'phone_uk' ).locator( 'input' );
		await phoneUk.pressSequentially( '07700900123' );
		check( 'phone', 'a pattern of your own: ##### ###### writes 07700 900123', ( await phoneUk.inputValue() ) === '07700 900123', await phoneUk.inputValue() );

		// long text that grows
		const message = f( 'message' ).locator( 'textarea' );
		const notes = f( 'notes' ).locator( 'textarea' );
		const h0 = ( await message.boundingBox() ).height;
		const n0 = ( await notes.boundingBox() ).height;
		await message.fill( 'Line one\nLine two\nLine three\nLine four\nLine five\nLine six' );
		const h1 = ( await message.boundingBox() ).height;
		await notes.fill( 'Line one\nLine two\nLine three\nLine four\nLine five\nLine six' );
		const n1 = ( await notes.boundingBox() ).height;
		check( 'grow', 'the long text with "Grow while typing" gets taller with its text; the other one does not', h1 > h0 + 30 && n1 === n0 && ( await message.evaluate( ( el ) => el.scrollHeight <= el.clientHeight + 1 ) ), `${ h0 } -> ${ h1 }, notes ${ n0 } -> ${ n1 }` );
		await message.fill( Array.from( { length: 30 }, ( _, i ) => `Line ${ i + 1 }` ).join( '\n' ) );
		const h2 = ( await message.boundingBox() ).height;
		check( 'grow', 'past its tallest height (220px) it stops growing and scrolls', Math.abs( h2 - 220 ) < 2 && ( await message.evaluate( ( el ) => el.classList.contains( 'is-capped' ) && getComputedStyle( el ).overflowY === 'auto' ) ), String( h2 ) );
		await message.fill( 'Short again' );
		check( 'grow', 'it shrinks back when the text gets shorter', ( await message.boundingBox() ).height < h1 );

		// country flag
		const flag = f( 'country' ).locator( '.rfb-flag' );
		check( 'flag', 'no country chosen: no flag, the box keeps its usual padding', ( await flag.isHidden() ) && ( await f( 'country' ).locator( 'select' ).evaluate( ( el ) => parseFloat( getComputedStyle( el ).paddingLeft ) ) ) < 20 );
		await f( 'country' ).locator( 'select' ).selectOption( 'GB' );
		await v.waitForTimeout( 300 );
		const flagOk = await flag.evaluate( ( el ) => el.complete && el.naturalWidth > 0 && el.src.endsWith( '/gb.svg' ) );
		const flagBox = await flag.boundingBox();
		const countryBox = await f( 'country' ).locator( 'select' ).boundingBox();
		check( 'flag', 'choosing the United Kingdom shows its flag at the left of the box, loaded from the plugin', flagOk && flagBox.x > countryBox.x && flagBox.x < countryBox.x + 30 && ( await f( 'country' ).locator( 'select' ).evaluate( ( el ) => parseFloat( getComputedStyle( el ).paddingLeft ) ) ) > 40 );
		await f( 'country' ).locator( 'select' ).selectOption( 'JP' );
		check( 'flag', 'changing the country changes the flag', ( await flag.getAttribute( 'src' ) ).endsWith( '/jp.svg' ) );

		// name boxes
		const first = await f( 'name' ).locator( '.rfb-name-first input' ).boundingBox();
		const last = await f( 'name' ).locator( '.rfb-name-last input' ).boundingBox();
		check( 'name', 'Space between First Name and Last Name: 40px between the boxes', Math.abs( last.x - ( first.x + first.width ) - 40 ) < 1.5, String( last.x - ( first.x + first.width ) ) );
		await f( 'name' ).locator( '.rfb-name-first input' ).fill( 'Ann' );
		await f( 'name' ).locator( '.rfb-name-last input' ).fill( 'Lee' );

		await v.screenshot( { path: join( SHOTS, 'desktop.png' ), fullPage: true } );
		await v.setViewportSize( { width: 390, height: 1500 } );
		await v.waitForTimeout( 300 );
		check( 'phone width', 'nothing is wider than a phone screen', await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ) );
		await v.screenshot( { path: join( SHOTS, 'phone.png' ), fullPage: true } );
		await v.setViewportSize( { width: 1200, height: 1500 } );

		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 600 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the answers are stored as the visitor sees them', vals && vals.phone_n === '(555) 123-4567' && vals.phone_i === '+44 789 123 4567' && vals.phone_uk === '07700 900123' && vals.country === 'JP' && vals.message === 'Short again' && vals.name && vals.name.first === 'Ann', JSON.stringify( vals ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall field extras checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
