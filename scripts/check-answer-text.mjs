#!/usr/bin/env node
/**
 * Answer text, real address lookup and focus ring check (0.125.0, SQLite test site, Chromium).
 *
 * A Form page built in the editor with a Choice field (Vehicle Option) and a Heading, Text Editor, Button, Icon List
 * and Image whose content changes with its answer (Content > Changes with the answers); an Address field set to Real
 * addresses (OpenStreetMap) near Inverness in GB; a text field with Focus ring None and one with its own ring.
 *
 * Edit Mode: the section shows on Form pages with the form's fields in When field; Show in the editor previews a row;
 * the Address field offers its source, near and countries, and typing in the preview asks the lookup; the focus rings
 * follow the settings. Site: the widgets change as the choice changes and come back when nothing matches; typing
 * "Inver" lists real places from OpenStreetMap (asked by the site); the picked address is stored.
 *
 * Needs the internet for photon.komoot.io. The check adds a must-use plugin to the test site that points WordPress at
 * the container's CA bundle when /root/.ccr/ca-bundle.crt exists (the container's proxy), and removes it afterwards.
 *
 * Usage: node scripts/check-answer-text.mjs [--site /tmp/rf-at-site] [--port 8957] [--shots /tmp/answer-text-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-at-site' );
const PORT = arg( 'port', '8957' );
const SHOTS = arg( 'shots', '/tmp/answer-text-shots' );
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

const row = ( field, value, extra ) => ( { _id: 'w' + Math.random().toString( 16 ).slice( 2, 8 ), field, op: 'equals', value, ...extra } );

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	// The container reaches the internet through a proxy with its own certificate: WordPress must trust it.
	const mu = join( WPDIR, 'wp-content/mu-plugins/rf-check-ca.php' );
	if ( existsSync( '/root/.ccr/ca-bundle.crt' ) ) {
		mkdirSync( dirname( mu ), { recursive: true } );
		writeFileSync( mu, "<?php add_filter( 'http_request_args', static function ( $args ) { $args['sslcertificates'] = '/root/.ccr/ca-bundle.crt'; return $args; } );\n" );
	}

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
		const img = ( name ) => Number( wp( [ 'media', 'import', join( HERE, '../tests/elements-regression/assets/test-images', name ), '--porcelain' ] ).trim() );
		const pics = { car: img( 'image1.jpg' ), bus: img( 'image2.jpg' ) };
		const busUrl = wp( [ 'eval', `echo wp_get_attachment_image_url( ${ pics.bus }, 'full' );` ] ).trim();
		const carUrl = wp( [ 'eval', `echo wp_get_attachment_image_url( ${ pics.car }, 'full' );` ] ).trim();

		// The address labels are written as a person writes them (pure logic).
		const labels = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( \\Refraction\\Modules\\FormBuilder\\Classes\\Address::labels( [ "features" => [ [ "properties" => [ "name" => "Inverness Museum & Art Gallery", "street" => "Castle Wynd", "district" => "Crown and City Centre", "city" => "Inverness", "county" => "Highland", "postcode" => "IV2 3EB", "countrycode" => "GB" ] ], [ "properties" => [ "name" => "Inverness", "city" => "Inverness", "county" => "Highland", "postcode" => "IV1 1AN", "countrycode" => "GB" ] ], [ "properties" => [ "name" => "Inverness", "county" => "Nova Scotia", "countrycode" => "CA" ] ] ] ], [ "GB" ] ) );' ] ) );
		check( 'address', 'OpenStreetMap places become address lines (name, street, district, town, county, postcode), only in GB', JSON.stringify( labels ) === JSON.stringify( [ 'Inverness Museum & Art Gallery, Castle Wynd, Crown and City Centre, Inverness, Highland, IV2 3EB', 'Inverness, Highland, IV1 1AN' ] ), JSON.stringify( labels ) );

		const page = await login( browser );
		watch( page, 'editor' );
		await page.goto( BUILDER );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		await page.goto( newHref, { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await page.waitForTimeout( 2000 );

		const rows = {
			heading: [ row( 'vehicle_option', 'Minibus Tours', { text: 'Max 8 Seats/£65 per hour' } ), row( 'vehicle_option', 'car', { text: 'Max 4 Seats/£55 per hour' } ) ],
			editor: [ row( 'vehicle_option', 'minibus', { text: '<p>Room for <strong>8</strong> and their luggage.</p>' } ) ],
			button: [ row( 'vehicle_option', 'minibus', { text: 'Book the minibus' } ) ],
			list: [ row( 'vehicle_option', 'minibus', { item: 2, text: 'Seats: 8' } ) ],
			image: [ row( 'vehicle_option', 'minibus', { image: { id: pics.bus, url: busUrl } } ) ],
		};
		await page.evaluate( ( a ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const box = add( root, { elType: 'container', settings: { flex_direction: 'column', flex_gap: { unit: 'px', size: 18, column: '18', row: '18' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Vehicle Option', field_key: 'vehicle_option', field_options: 'car|Car Tours\nminibus|Minibus Tours' } } );
			add( box, { elType: 'widget', widgetType: 'heading', settings: { title: 'Choose a vehicle', rfb_swap_rows: a.rows.heading } } );
			add( box, { elType: 'widget', widgetType: 'text-editor', settings: { editor: '<p>Pick the vehicle that suits your group.</p>', rfb_swap_rows: a.rows.editor } } );
			add( box, { elType: 'widget', widgetType: 'button', settings: { text: 'Book now', rfb_swap_rows: a.rows.button } } );
			add( box, { elType: 'widget', widgetType: 'icon-list', settings: { icon_list: [ { _id: 'l1', text: 'Air conditioning', selected_icon: { value: 'fas fa-check', library: 'fa-solid' } }, { _id: 'l2', text: 'Seats: 4', selected_icon: { value: 'fas fa-check', library: 'fa-solid' } } ], rfb_swap_rows: a.rows.list } } );
			add( box, { elType: 'widget', widgetType: 'image', settings: { image: { id: a.pics.car, url: a.carUrl }, rfb_swap_rows: a.rows.image } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-address', settings: { field_label: 'Pickup', field_key: 'pickup', address_list: '', address_source: 'osm', address_near: '57.48, -4.22', address_country: 'GB', address_max: 7 } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Name', field_key: 'name', input_focus_ring: 'none' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Email me at', field_key: 'contact', input_focus_ring: 'custom', input_focus_ring_color: '#e91e63', input_focus_ring_width: { unit: 'px', size: 6 } } } );
			add( root, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send' } } );
		}, { rows, pics, carUrl } );
		await page.waitForTimeout( 3000 );

		const preview = page.frameLocator( '#refraction-preview-iframe' );
		const pf = ( key ) => preview.locator( `[data-rfb-key="${ key }"]` );
		const widget = ( type ) => preview.locator( `.refraction-widget-${ type }` ).first();
		const headingText = () => widget( 'heading' ).locator( '.refraction-heading-title' ).textContent();

		// ------------------------------------------------------------ Edit Mode
		check( 'edit mode', 'the widgets show their own content in the editor (Show in the editor: 0)', ( await headingText() ) === 'Choose a vehicle' );
		await widget( 'heading' ).click();
		await page.waitForTimeout( 800 );
		check( 'panel', 'a Heading on a Form page has Changes with the answers', await page.locator( '.refraction-control-section_rfb_swap' ).isVisible() );
		await page.locator( '.refraction-control-section_rfb_swap' ).click();
		await page.waitForTimeout( 600 );
		const titles = await page.$$eval( '.refraction-control-rfb_swap_rows .refraction-repeater-row-item-title', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'each row reads its field, answer and value', titles[ 0 ] === 'vehicle_option equals Minibus Tours', titles.join( ' | ' ) );
		await page.locator( '.refraction-control-rfb_swap_rows .refraction-repeater-row-item-title' ).first().click();
		await page.waitForTimeout( 500 );
		const fieldOptions = await page.$$eval( '.refraction-control-rfb_swap_rows select[data-setting="field"] option', ( els ) => els.map( ( e ) => e.value ) );
		check( 'panel', 'When field lists this form\'s fields; the row has Answer, Value and Then show: Title', [ 'vehicle_option', 'pickup', 'name', 'contact' ].every( ( k ) => fieldOptions.includes( k ) ) && ( await page.locator( '.refraction-control-rfb_swap_rows .refraction-control-text:visible textarea' ).count() ) === 1, fieldOptions.join( ',' ) + ' / ' + ( await page.locator( '.refraction-control-rfb_swap_rows .refraction-control-text:visible textarea' ).count() ) );
		await page.screenshot( { path: join( SHOTS, 'panel-heading.png' ) } );
		await page.evaluate( () => { const c = refraction.selection.getElements()[ 0 ]; return void $e.run( 'document/elements/settings', { container: c, settings: { rfb_swap_preview: 1 } } ); } );
		await page.waitForTimeout( 1200 );
		check( 'edit mode', 'Show in the editor: 1 previews the first row', ( await headingText() ) === 'Max 8 Seats/£65 per hour', await headingText() );
		await page.evaluate( () => { const c = refraction.selection.getElements()[ 0 ]; return void $e.run( 'document/elements/settings', { container: c, settings: { rfb_swap_preview: 0 } } ); } );
		await page.waitForTimeout( 1200 );
		check( 'edit mode', 'back to 0: the heading as set', ( await headingText() ) === 'Choose a vehicle' );

		// Address: the lookup is tried in the editor
		await pf( 'pickup' ).click();
		await page.waitForTimeout( 800 );
		await page.locator( '.rf-section-groups__tab:has-text("Suggested addresses")' ).click().catch( () => {} );
		await page.waitForTimeout( 400 );
		check( 'panel', 'Address offers Suggestions come from (your list or real addresses), Near and Only in these countries', ( await page.$$eval( '.refraction-control-address_source select option', ( els ) => els.map( ( e ) => e.value ).join() ) ) === ',osm' && ( await page.locator( '.refraction-control-address_near:visible input' ).inputValue() ) === '57.48, -4.22' && ( await page.locator( '.refraction-control-address_country:visible input' ).inputValue() ) === 'GB' );
		check( 'edit mode', 'the Address preview says how to try the lookup', ( await pf( 'pickup' ).locator( '.rfb-address-empty' ).textContent() ).includes( 'Type in the box' ) );
		await pf( 'pickup' ).locator( 'input' ).pressSequentially( 'Inver', { delay: 60 } );
		await page.waitForTimeout( 3500 );
		const editorFound = await pf( 'pickup' ).locator( '.rfb-address-option' ).allTextContents();
		check( 'edit mode', 'typing in the editor preview lists real places', editorFound.some( ( a ) => a.startsWith( 'Inverness' ) ), editorFound.join( ' | ' ) );
		await page.screenshot( { path: join( SHOTS, 'editor-address.png' ) } );

		// focus rings
		const ring = async ( key ) => pf( key ).locator( 'input' ).evaluate( ( el ) => { el.focus(); const cs = getComputedStyle( el ); return { shadow: cs.boxShadow, border: cs.borderTopColor }; } );
		const none = await ring( 'name' );
		const own = await ring( 'contact' );
		check( 'edit mode', 'Focus ring None: no glow while typing', 'none' === none.shadow, JSON.stringify( none ) );
		check( 'edit mode', 'Focus ring My own: a 6px pink ring', own.shadow.includes( '6px' ) && own.shadow.includes( '233, 30, 99' ), JSON.stringify( own ) );
		await pf( 'name' ).click();
		await page.waitForTimeout( 600 );
		await page.click( '.refraction-panel-navigation-tab:has-text("Style")' );
		await page.waitForTimeout( 400 );
		await page.locator( '.refraction-control-section_style_input' ).click();
		await page.waitForTimeout( 400 );
		await page.locator( '.refraction-control-input_focus .refraction-panel-tab-heading, .refraction-control-input_focus' ).first().click().catch( () => {} );
		await page.waitForTimeout( 400 );
		check( 'panel', 'Style > Input > Focus has Focus ring (the form\'s, None, My own)', ( await page.$$eval( '.refraction-control-input_focus_ring select option', ( els ) => els.map( ( e ) => e.value ).join() ) ) === ',none,custom' );
		await page.screenshot( { path: join( SHOTS, 'panel-focus.png' ) } );

		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Tours', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
		} );
		await page.evaluate( () => void $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Book a tour', slug: 'tour', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1100, height: 1600 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const f = ( key ) => v.locator( `form [data-rfb-key="${ key }"]` );
		const sw = ( type ) => v.locator( `form .refraction-widget-${ type }` ).first();
		const state = async () => ( {
			heading: ( await sw( 'heading' ).locator( '.refraction-heading-title' ).textContent() ).trim(),
			editor: ( await sw( 'text-editor' ).innerText() ).trim(),
			button: ( await sw( 'button' ).locator( '.refraction-button-text' ).textContent() ).trim(),
			item: ( await sw( 'icon-list' ).locator( '.refraction-icon-list-text' ).nth( 1 ).textContent() ).trim(),
			image: await sw( 'image' ).locator( 'img' ).getAttribute( 'src' ),
		} );
		const before = await state();
		check( 'site', 'nothing picked: every widget shows its own content', before.heading === 'Choose a vehicle' && before.editor === 'Pick the vehicle that suits your group.' && before.button === 'Book now' && before.item === 'Seats: 4' && ! before.image.includes( 'image2' ), JSON.stringify( before ) );
		await f( 'vehicle_option' ).locator( '.rfb-check' ).nth( 1 ).click();
		await v.waitForTimeout( 200 );
		const minibus = await state();
		check( 'site', 'Minibus Tours (matched by its name for the heading, by its value for the rest): every widget changes', minibus.heading === 'Max 8 Seats/£65 per hour' && minibus.editor === 'Room for 8 and their luggage.' && minibus.button === 'Book the minibus' && minibus.item === 'Seats: 8' && minibus.image.includes( 'image2' ), JSON.stringify( minibus ) );
		await v.screenshot( { path: join( SHOTS, 'site-minibus.png' ), fullPage: true } );
		await f( 'vehicle_option' ).locator( '.rfb-check' ).nth( 0 ).click();
		await v.waitForTimeout( 200 );
		const car = await state();
		check( 'site', 'Car Tours: the heading takes its own row, the others go back to their own content', car.heading === 'Max 4 Seats/£55 per hour' && car.editor === before.editor && car.button === before.button && car.item === before.item && car.image === before.image, JSON.stringify( car ) );

		// real addresses, asked by the site
		await f( 'pickup' ).locator( 'input' ).pressSequentially( 'Inver', { delay: 60 } );
		await v.waitForTimeout( 3500 );
		const found = await f( 'pickup' ).locator( '.rfb-address-option' ).allTextContents();
		check( 'site', 'typing "Inver" lists real places near Inverness from OpenStreetMap', found.length >= 3 && found.length <= 7 && found.some( ( a ) => /^Inverness, .*IV\d/.test( a ) ) && found.every( ( a ) => a.toLowerCase().includes( 'inver' ) ), found.join( ' | ' ) );
		const requests = [];
		v.on( 'request', ( r ) => requests.push( r.url() ) );
		await f( 'pickup' ).locator( 'input' ).pressSequentially( 'ness air', { delay: 60 } );
		await v.waitForTimeout( 3500 );
		check( 'site', 'the visitor\'s browser asks only this site, never the map service', requests.length > 0 && requests.every( ( u ) => u.startsWith( BASE ) ), requests.join( ' ' ) );
		await v.screenshot( { path: join( SHOTS, 'site-address.png' ), clip: await v.locator( 'form' ).boundingBox() } );
		const airport = f( 'pickup' ).locator( '.rfb-address-option', { hasText: 'Airport' } ).first();
		const airportText = await airport.textContent();
		await airport.click();
		check( 'site', 'picking puts the address in the box', ( await f( 'pickup' ).locator( 'input' ).inputValue() ) === airportText, airportText );

		const siteRing = await f( 'name' ).locator( 'input' ).evaluate( ( el ) => { el.focus(); return getComputedStyle( el ).boxShadow; } );
		check( 'site', 'Focus ring None on the site too', 'none' === siteRing, siteRing );
		await f( 'name' ).locator( 'input' ).fill( 'Ada' );
		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 800 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the picked address and the choice are stored', vals && vals.pickup === airportText && vals.vehicle_option === 'car', JSON.stringify( vals ) );
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
		rmSync( mu, { force: true } );
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall answer text and address checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
