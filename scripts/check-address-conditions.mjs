#!/usr/bin/env node
/**
 * Address field, form-field Display Conditions and Choice picture size check (0.123.0, SQLite test site, Chromium).
 *
 * A Form page built in the editor with: an Address field with its own list (searched in the browser) and one with a
 * 400-line .csv file from the Media Library (searched by the site, admin-ajax refraction_fb_address), "Only addresses
 * from the list" on the second; a Choice field whose Image cards have Card width, Picture height, fit, space and
 * corners; a heading and a text field shown by Display Conditions > Form field's answer.
 *
 * Edit Mode: the Address panel and Style > Suggestions, the list kept open under the box; the Display Conditions Field
 * list offers the form's fields (also one added after the editor opened); the picture sizes show in the preview.
 * Site: typing shows the matching addresses (keyboard and click pick), the long list is asked of the site, the strict
 * field refuses an address that is not listed, the elements show and hide as the answers change, the answers are stored.
 *
 * Usage: node scripts/check-address-conditions.mjs [--site /tmp/rf-ac-site] [--port 8953] [--shots /tmp/address-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ac-site' );
const PORT = arg( 'port', '8953' );
const SHOTS = arg( 'shots', '/tmp/address-shots' );
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


const dc = ( field, op, value, mode = 'show' ) => ( { refraction_dc_mode: mode, refraction_dc_logic: 'and', refraction_dc_items: [ { _id: 'dc' + Math.random().toString( 16 ).slice( 2, 8 ), dc_type: 'form_field', dc_field: field, dc_field_op: op, dc_value: value } ] } );

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
		// A long list as a file: 400 streets, searched by the site.
		const listFile = join( SHOTS, 'streets.csv' );
		writeFileSync( listFile, Array.from( { length: 400 }, ( _, i ) => `${ i + 1 } Station Road, Town${ i % 7 }, AB${ i + 1 } 1CD` ).join( '\n' ) + '\n"Loch Ness Centre","Drumnadrochit","IV63 6TU"\n' );
		const fileId = Number( wp( [ 'media', 'import', listFile, '--porcelain', '--user=admin' ] ).trim() );
		const img = ( name ) => Number( wp( [ 'media', 'import', join( HERE, '../tests/elements-regression/assets/test-images', name ), '--porcelain' ] ).trim() );
		const pics = { car: img( 'image1.jpg' ), bus: img( 'image2.jpg' ) };
		check( 'setup', 'the list file is in the Media Library as text', fileId > 0 && /text\/(plain|csv)/.test( wp( [ 'post', 'get', String( fileId ), '--field=post_mime_type' ] ) ) );

		const page = await login( browser );
		watch( page, 'editor' );
		await page.goto( BUILDER );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		await page.goto( newHref, { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await page.waitForTimeout( 2000 );

		await page.evaluate( ( a ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const box = add( root, { elType: 'container', settings: { flex_direction: 'column', flex_gap: { unit: 'px', size: 22, column: '22', row: '22' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-address', settings: { field_label: 'Pickup', field_key: 'pickup', placeholder: 'Start typing an address', field_required: 'yes', address_hover_bg: '#fdecec', address_max_h: { unit: 'px', size: 200 } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-address', settings: { field_label: 'Drop-off', field_key: 'dropoff', address_list: '', address_file: { id: a.fileId, url: '' }, address_strict: 'yes', address_max: 6 } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Trip', field_key: 'trip', field_options: 'oneway|One way\nreturn|Return', choice_look: 'images', ch_card_width: { unit: 'px', size: 220 }, ch_pic_height: { unit: 'px', size: 120 }, ch_pic_fit: 'contain', ch_pic_pad: { unit: 'px', size: 10 }, ch_pic_radius: { unit: 'px', size: 16 }, option_extras: [ { _id: 't1', choice: 'oneway', image: { id: a.pics.car, url: '' } }, { _id: 't2', choice: 'return', image: { id: a.pics.bus, url: '' } } ] } } );
			add( box, { elType: 'widget', widgetType: 'heading', settings: { title: 'Your return journey', ...a.dcReturn } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Return pickup time', field_key: 'return_time', ...a.dcReturn } } );
			add( box, { elType: 'widget', widgetType: 'heading', settings: { title: 'Airport pickups are met at arrivals', ...a.dcAirport } } );
			add( root, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Book' } } );
		}, { fileId, pics, dcReturn: dc( 'trip', 'equals', 'return' ), dcAirport: dc( 'pickup', 'contains', 'airport' ) } );
		await page.waitForTimeout( 2500 );

		const preview = page.frameLocator( '#refraction-preview-iframe' );
		const pf = ( key ) => preview.locator( `[data-rfb-key="${ key }"]` );

		// ------------------------------------------------------------ Edit Mode
		check( 'edit mode', 'the Address list stays open under the box in the editor, in the flow', ( await pf( 'pickup' ).locator( '.rfb-address-option' ).count() ) === 5 && await pf( 'pickup' ).locator( '.rfb-address-list' ).evaluate( ( el ) => ! el.hidden && 'static' === getComputedStyle( el ).position ) );
		check( 'edit mode', 'Style > Suggestions shows in the preview (highlight color, tallest)', ( await pf( 'pickup' ).locator( '.rfb-address-option.is-active' ).evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(253, 236, 236)' && ( await pf( 'pickup' ).locator( '.rfb-address-list' ).evaluate( ( el ) => getComputedStyle( el ).maxHeight ) ) === '200px' );
		const pic = await pf( 'trip' ).locator( '.rfb-opt-media' ).first().evaluate( ( el ) => { const img = el.querySelector( 'img' ); const card = el.closest( '.rfb-check' ); return { h: Math.round( img.getBoundingClientRect().height ), fit: getComputedStyle( img ).objectFit, pad: getComputedStyle( el ).paddingTop, radius: getComputedStyle( el ).borderTopLeftRadius, w: Math.round( card.getBoundingClientRect().width ) }; } );
		check( 'edit mode', 'the picture is 120px high, whole (contain), with 10px around it and 16px corners; the card 220px wide', pic.h === 120 && pic.fit === 'contain' && pic.pad === '10px' && pic.radius === '16px' && pic.w === 220, JSON.stringify( pic ) );
		await preview.locator( '[data-rfb-key="trip"]' ).screenshot( { path: join( SHOTS, 'editor-pictures.png' ) } );
		await preview.locator( '[data-rfb-key="pickup"]' ).screenshot( { path: join( SHOTS, 'editor-address.png' ) } );

		// the panel: Address settings
		await pf( 'pickup' ).click();
		await page.waitForTimeout( 800 );
		// Its settings are a group of their own in the panel ("Suggested addresses").
		await page.locator( '.rf-section-groups__tab:has-text("Suggested addresses")' ).click();
		await page.waitForTimeout( 500 );
		check( 'panel', 'Address has Addresses, a list file, Only addresses from the list, letters and how many', ( await Promise.all( [ 'address_list', 'address_file', 'address_strict', 'address_min', 'address_max' ].map( ( n ) => page.locator( `.refraction-control-${ n }:visible` ).count() ) ) ).every( ( c ) => c === 1 ) );
		await page.click( '.refraction-panel-navigation-tab:has-text("Style")' );
		await page.waitForTimeout( 400 );
		await page.locator( '.refraction-control-section_style_address' ).click();
		await page.waitForTimeout( 400 );
		check( 'panel', 'Style > Suggestions has the list\'s colors, tallest and spacing', ( await Promise.all( [ 'address_color', 'address_bg', 'address_hover_bg', 'address_max_h', 'address_pad_y', 'address_radius' ].map( ( n ) => page.locator( `.refraction-control-${ n }` ).count() ) ) ).every( ( c ) => c === 1 ) );
		await page.screenshot( { path: join( SHOTS, 'panel-suggestions.png' ) } );

		// a field added after the editor opened is offered in the Display Conditions Field list
		await page.evaluate( () => void $e.run( 'document/elements/create', { container: refraction.getPreviewContainer().children[ 0 ], model: { elType: 'widget', widgetType: 'rfb-field-number', settings: { field_label: 'Passengers' } }, options: { edit: false } } ) );
		await page.waitForTimeout( 1200 );
		await preview.locator( '.refraction-widget-heading' ).first().click();
		await page.waitForTimeout( 800 );
		await page.click( '.refraction-panel-navigation-tab:has-text("Advanced")' );
		await page.waitForTimeout( 500 );
		await page.locator( '.refraction-control-section_display_conditions' ).click();
		await page.waitForTimeout( 600 );
		const rowTitle = ( await page.locator( '.refraction-control-refraction_dc_items .refraction-repeater-row-item-title' ).first().textContent() ).trim();
		check( 'panel', 'the condition row reads its field, comparison and value', rowTitle === 'trip equals return', rowTitle );
		await page.locator( '.refraction-control-refraction_dc_items .refraction-repeater-row-item-title' ).first().click();
		await page.waitForTimeout( 600 );
		const typeOptions = await page.$$eval( '.refraction-control-refraction_dc_items .refraction-control-dc_type select option', ( els ) => els.map( ( e ) => e.value ) );
		const fieldOptions = await page.$$eval( '.refraction-control-refraction_dc_items .refraction-control-dc_field select option', ( els ) => els.map( ( e ) => e.value + '=' + e.textContent ) );
		check( 'panel', 'Condition offers Form field\'s answer', typeOptions.includes( 'form_field' ) );
		check( 'panel', 'Field lists this form\'s fields by name and key, also one added after opening (Passengers)', [ 'pickup=Pickup (pickup)', 'dropoff=Drop-off (dropoff)', 'trip=Trip (trip)', 'return_time=Return pickup time (return_time)', 'passengers=Passengers (passengers)' ].every( ( o ) => fieldOptions.includes( o ) ), fieldOptions.join( ' | ' ) );
		check( 'panel', 'the row shows Field, Answer (is, contains, is empty...) and Value, not True / Not true', ( await page.locator( '.refraction-control-refraction_dc_items .refraction-control-dc_field_op:visible select' ).count() ) === 1 && ( await page.$$eval( '.refraction-control-refraction_dc_items .refraction-control-dc_field_op select option', ( els ) => els.map( ( e ) => e.value ).join() ) ).includes( 'contains,not_contains,empty' ) && ( await page.locator( '.refraction-control-refraction_dc_items .refraction-control-dc_op:visible' ).count() ) === 0 && ( await page.locator( '.refraction-control-refraction_dc_items .refraction-control-dc_value:visible input' ).inputValue() ) === 'return' );
		check( 'edit mode', 'in the editor every element stays visible, marked as conditioned', ( await preview.locator( '.refraction-has-conditions' ).count() ) === 3 && await preview.locator( '.refraction-widget-heading' ).first().isVisible() );
		await page.screenshot( { path: join( SHOTS, 'panel-condition.png' ) } );

		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Transfers', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
		} );
		await page.evaluate( () => $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the Address fields keep their list, file, strictness and counts', field( 'pickup' ).type === 'address' && field( 'pickup' ).address_list.length === 5 && field( 'dropoff' ).address_file === fileId && field( 'dropoff' ).address_strict === true && field( 'dropoff' ).address_max === 6, JSON.stringify( [ field( 'pickup' ).address_list, field( 'dropoff' ).address_file ] ) );

		// ------------------------------------------------------------ the site's own search
		const ask = async ( params ) => ( await fetch( `${ BASE }/wp-admin/admin-ajax.php?${ new URLSearchParams( { action: 'refraction_fb_address', collection: slug, ...params } ) }` ) );
		const found = await ( await ask( { field: 'dropoff', q: 'station town3' } ) ).json();
		check( 'search', 'the site answers a long list: at most 6, every word matched, shorter first', found.success && found.data.items.length === 6 && found.data.items.every( ( a ) => /Station Road, Town3,/.test( a ) ) && found.data.items[ 0 ].length <= found.data.items[ 5 ].length, JSON.stringify( found ) );
		const csv = await ( await ask( { field: 'dropoff', q: 'loch' } ) ).json();
		check( 'search', 'a CSV line comes back as one address', csv.data.items[ 0 ] === 'Loch Ness Centre, Drumnadrochit, IV63 6TU', JSON.stringify( csv ) );
		check( 'search', 'it answers only for an Address field of the form', ( await ask( { field: 'trip', q: 'one' } ) ).status === 404 && ( await ask( { field: 'nope', q: 'ab' } ) ).status === 404 );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Book a transfer', slug: 'transfer', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1100, height: 1400 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const f = ( key ) => v.locator( `form [data-rfb-key="${ key }"]` );
		const returnHeading = v.locator( 'form .refraction-widget-heading', { hasText: 'Your return journey' } );
		const airportHeading = v.locator( 'form .refraction-widget-heading', { hasText: 'Airport pickups' } );

		check( 'site', 'nothing is open before typing, and the conditioned elements start hidden', await f( 'pickup' ).locator( '.rfb-address-list' ).evaluate( ( el ) => el.hidden ) && ! ( await returnHeading.isVisible() ) && ! ( await f( 'return_time' ).isVisible() ) && ! ( await airportHeading.isVisible() ) );
		await f( 'pickup' ).locator( 'input' ).pressSequentially( 'Inver', { delay: 40 } );
		await v.waitForTimeout( 200 );
		const shown = await f( 'pickup' ).locator( '.rfb-address-option' ).allTextContents();
		check( 'site', 'typing "Inver" lists the four Inver... places, not Nairn', shown.length === 4 && shown.every( ( a ) => a.startsWith( 'Inver' ) ) && ( await f( 'pickup' ).locator( 'input' ).getAttribute( 'aria-expanded' ) ) === 'true', shown.join( ' | ' ) );
		await v.screenshot( { path: join( SHOTS, 'site-suggestions.png' ), clip: await v.locator( 'form' ).boundingBox() } );
		await f( 'pickup' ).locator( 'input' ).press( 'ArrowDown' );
		await f( 'pickup' ).locator( 'input' ).press( 'ArrowDown' );
		const activeId = await f( 'pickup' ).locator( 'input' ).getAttribute( 'aria-activedescendant' );
		await f( 'pickup' ).locator( 'input' ).press( 'Enter' );
		check( 'site', 'arrow keys move through the list and Enter picks', ( await f( 'pickup' ).locator( 'input' ).inputValue() ) === shown[ 1 ] && !! activeId && await f( 'pickup' ).locator( '.rfb-address-list' ).evaluate( ( el ) => el.hidden ), await f( 'pickup' ).locator( 'input' ).inputValue() );
		await f( 'pickup' ).locator( 'input' ).fill( '' );
		await f( 'pickup' ).locator( 'input' ).pressSequentially( 'airport', { delay: 30 } );
		await v.waitForTimeout( 200 );
		await f( 'pickup' ).locator( '.rfb-address-option' ).first().click();
		check( 'site', 'a click picks; a pickup that contains "airport" shows its heading', ( await f( 'pickup' ).locator( 'input' ).inputValue() ) === 'Inverness Airport, Old Military Road, Ardersier, Highland' && await airportHeading.isVisible() );

		await f( 'dropoff' ).locator( 'input' ).pressSequentially( 'station town5', { delay: 30 } );
		await v.waitForTimeout( 900 );
		const far = await f( 'dropoff' ).locator( '.rfb-address-option' ).allTextContents();
		check( 'site', 'the long list is asked of the site as the visitor types (6 Town5 streets)', far.length === 6 && far.every( ( a ) => a.includes( 'Town5' ) ), far.join( ' | ' ) );
		await f( 'dropoff' ).locator( 'input' ).fill( 'Somewhere else' );
		await f( 'trip' ).locator( '.rfb-check' ).first().click();
		check( 'site', 'Only addresses from the list: an address that is not listed is refused before sending', ( await f( 'dropoff' ).locator( 'input' ).evaluate( ( el ) => el.validationMessage ) ) === 'Choose an address from the list.' );
		await f( 'dropoff' ).locator( 'input' ).fill( '' );
		await f( 'dropoff' ).locator( 'input' ).pressSequentially( '12 station', { delay: 30 } );
		await v.waitForTimeout( 900 );
		await f( 'dropoff' ).locator( '.rfb-address-option' ).first().click();

		check( 'site', 'One way: the return heading and time stay hidden', ! ( await returnHeading.isVisible() ) && ! ( await f( 'return_time' ).isVisible() ) );
		await f( 'trip' ).locator( '.rfb-check' ).nth( 1 ).click();
		await v.waitForTimeout( 200 );
		check( 'site', 'Return: the return heading and time show', ( await returnHeading.isVisible() ) && ( await f( 'return_time' ).isVisible() ) );
		const sitePic = await f( 'trip' ).locator( '.rfb-opt-media img' ).first().evaluate( ( el ) => [ Math.round( el.getBoundingClientRect().height ), getComputedStyle( el ).objectFit ].join() );
		check( 'site', 'the picture sizes are the same on the site', sitePic === '120,contain', sitePic );
		await f( 'return_time' ).locator( 'input' ).fill( '18:30' );
		await v.screenshot( { path: join( SHOTS, 'site.png' ), fullPage: true } );
		await v.setViewportSize( { width: 390, height: 1400 } );
		await v.waitForTimeout( 300 );
		check( 'phone', 'nothing is wider than a phone screen', await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ) );
		await f( 'pickup' ).locator( 'input' ).fill( '' );
		await f( 'pickup' ).locator( 'input' ).pressSequentially( 'inver', { delay: 30 } );
		await v.waitForTimeout( 200 );
		check( 'phone', 'the list fits the phone screen', await f( 'pickup' ).locator( '.rfb-address-list' ).evaluate( ( el ) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; } ) );
		await v.screenshot( { path: join( SHOTS, 'site-phone.png' ) } );
		await f( 'pickup' ).locator( '.rfb-address-option' ).first().click();
		await v.setViewportSize( { width: 1100, height: 1400 } );

		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 800 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the addresses and the return time are stored', vals && vals.pickup.startsWith( 'Inver' ) && vals.dropoff.startsWith( '12 Station Road' ) && vals.trip === 'return' && vals.return_time === '18:30', JSON.stringify( vals ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall address and condition checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
