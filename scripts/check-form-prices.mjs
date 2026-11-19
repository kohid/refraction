#!/usr/bin/env node
/**
 * Form prices and currency check (0.122.0, SQLite test site, Chromium). A Form page built in the editor with:
 * Choice fields whose Choice details carry a price (List and Cards looks), a Total amount that adds up the prices of
 * the picked choices, a Total with its own currency, Amount fields that follow Form settings > Currency or pick their
 * own symbol, a text Required mark, and a label from a Dynamic Tag.
 *
 * Edit Mode: the panel offers Dynamic Tags on the fields' settings, Price in Choice details (also for the List look),
 * Works out on the Total and Currency on Amount / Total; changing Form settings > Currency shows at once in the
 * preview (before saving); the prices, the totals (worked out as choices are picked) and the required text show there.
 * Site: the same, the Dynamic Tag label is the host page's title, and the stored total is the server's sum.
 *
 * Usage: node scripts/check-form-prices.mjs [--site /tmp/rf-fp-site] [--port 8951] [--shots /tmp/form-prices-shots]
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
const SITE = arg( 'site', '/tmp/rf-fp-site' );
const PORT = arg( 'port', '8951' );
const SHOTS = arg( 'shots', '/tmp/form-prices-shots' );
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

const tag = ( name ) => `[refraction-tag id="t${ Math.random().toString( 16 ).slice( 2, 9 ) }" name="${ name }" settings="%7B%7D"]`;
const after = ( loc ) => loc.evaluate( ( el ) => getComputedStyle( el, '::after' ).content );

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

		await page.evaluate( ( t ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const box = add( root, { elType: 'container', settings: { flex_direction: 'column', flex_gap: { unit: 'px', size: 24, column: '24', row: '24' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Trip', field_key: 'trip', __dynamic__: { field_label: t.title } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Vehicle Option', field_key: 'vehicle', field_options: 'car|Car Tours\nmpv|MPV Tours', field_required: 'yes', required_mark: '(Required)', required_color: '#d35400', option_extras: [ { _id: 'v1', choice: 'car', price: 55 }, { _id: 'v2', choice: 'MPV Tours', price: 75 } ] } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-checkbox', settings: { field_label: 'Extras', field_key: 'extras', field_options: 'seat|Child seat\nbags|Extra luggage', choice_look: 'cards', choice_columns: 2, option_extras: [ { _id: 'e1', choice: 'seat', text: 'For under-fours', price: 10 }, { _id: 'e2', choice: 'bags', price: 5.5 } ] } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-total', settings: { field_label: 'Total amount', field_key: 'total', total_source: 'prices', total_none: 'Pick a vehicle' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-total', settings: { field_label: 'Vehicle only', field_key: 'vehicle_only', total_source: 'prices', total_fields: 'vehicle', currency_choice: 'custom', currency_custom: 'CHF' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-currency', settings: { field_label: 'Tip', field_key: 'tip', currency_symbol: 'yes' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-currency', settings: { field_label: 'Deposit in euro', field_key: 'deposit', currency_symbol: 'yes', currency_choice: '€' } } );
			add( root, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Book' } } );
		}, { title: tag( 'post-title' ) } );
		await page.waitForTimeout( 2500 );

		const preview = page.frameLocator( '#refraction-preview-iframe' );
		const pf = ( key ) => preview.locator( `[data-rfb-key="${ key }"]` );

		// ------------------------------------------------------------ the panel
		await pf( 'vehicle' ).click();
		await page.waitForTimeout( 800 );
		check( 'panel', 'Label and Placeholder-type settings offer Dynamic Tags', ( await page.locator( '.refraction-control-field_label .refraction-control-dynamic-switcher' ).count() ) === 1 && ( await page.locator( '.refraction-control-field_description .refraction-control-dynamic-switcher' ).count() ) === 1 && ( await page.locator( '.refraction-control-field_options .refraction-control-dynamic-switcher' ).count() ) === 1 );
		const markBox = await page.locator( '.refraction-control-required_mark:visible input[data-setting="required_mark"]' ).count();
		check( 'panel', 'Required mark is a text box under Required', markBox === 1, `${ markBox } ${ await page.locator( '.refraction-control-required_mark' ).count() }` );
		check( 'panel', 'Choice details show with the List look', ( await page.locator( '.refraction-control-option_extras:visible' ).count() ) === 1 );
		const titles = await page.$$eval( '.refraction-control-option_extras .refraction-repeater-row-item-title', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'each Choice details row names its choice and price', titles.join( '|' ) === 'car (55)|MPV Tours (75)', titles.join( '|' ) );
		await page.locator( '.refraction-control-option_extras .refraction-repeater-row-item-title' ).first().click();
		await page.waitForTimeout( 400 );
		check( 'panel', 'a row has Price (with Dynamic Tags); the List look hides Badge, Icon and Line of text', ( await page.locator( '.refraction-control-option_extras .refraction-control-price:visible input' ).count() ) === 1 && ( await page.locator( '.refraction-control-option_extras .refraction-control-price .refraction-control-dynamic-switcher' ).count() ) === 1 && ( await page.locator( '.refraction-control-option_extras .refraction-control-badge:visible' ).count() ) === 0 && ( await page.locator( '.refraction-control-option_extras .refraction-control-icon:visible' ).count() ) === 0 );
		check( 'panel', 'Show the prices and Currency are on the Choice field', ( await page.locator( '.refraction-control-choice_prices:visible' ).count() ) === 1 && ( await page.locator( '.refraction-control-currency_choice:visible select' ).count() ) === 1 );
		await page.screenshot( { path: join( SHOTS, 'panel-choice.png' ) } );

		await pf( 'total' ).click();
		await page.waitForTimeout( 800 );
		check( 'panel', 'Total amount: Works out offers the prices of the picked choices; the formula hides then', ( await page.$$eval( '.refraction-control-total_source select option', ( els ) => els.map( ( e ) => e.value ).join( ',' ) ) ) === ',prices' && ( await page.locator( '.refraction-control-total_fields:visible' ).count() ) === 1 && ( await page.locator( '.refraction-control-total_formula:visible' ).count() ) === 0 );
		const curOptions = await page.$$eval( '.refraction-control-currency_choice select option', ( els ) => els.map( ( e ) => e.value ) );
		check( 'panel', 'Total amount: Currency lists the form\'s, common symbols and Other', curOptions[ 0 ] === '' && [ '£', '$', '€', '¥', '₱' ].every( ( c ) => curOptions.includes( c ) ) && curOptions.at( -1 ) === 'custom', curOptions.join( ' ' ) );
		check( 'panel', 'the Total\'s text settings take Dynamic Tags, its formula does not', ( await page.locator( '.refraction-control-total_none .refraction-control-dynamic-switcher' ).count() ) === 1 && ( await page.locator( '.refraction-control-total_formula .refraction-control-dynamic-switcher' ).count() ) === 0 );
		await page.screenshot( { path: join( SHOTS, 'panel-total.png' ) } );

		// ------------------------------------------------------------ Edit Mode: currency from Form settings, before saving
		await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await page.waitForTimeout( 800 );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Tours form', rfb_min_seconds: 0, rfb_hourly_limit: 0, rfb_currency_symbol: '£' } } );
		} );
		await page.waitForTimeout( 800 );
		const symbolOf = ( key ) => pf( key ).locator( '.rfb-amount-symbol' ).textContent();
		check( 'edit mode', 'Form settings > Currency £ shows on the Amount at once (not saved yet)', ( await symbolOf( 'tip' ) ) === '£', await symbolOf( 'tip' ) );
		check( 'edit mode', 'an Amount with its own currency keeps it', ( await symbolOf( 'deposit' ) ) === '€', await symbolOf( 'deposit' ) );
		const prices = await pf( 'vehicle' ).locator( '.rfb-opt-price' ).allTextContents();
		check( 'edit mode', 'each choice shows its price in £', prices.join( '|' ) === '£55.00|£75.00', prices.join( '|' ) );
		check( 'edit mode', 'the cards show their prices beside the names', ( await pf( 'extras' ).locator( '.rfb-opt-label .rfb-opt-price' ).allTextContents() ).join( '|' ) === '£10.00|£5.50' );
		check( 'edit mode', 'the Required mark reads (Required) in its color', ( await after( pf( 'vehicle' ).locator( 'legend.rfb-label' ) ) ) === '"(Required)"' && ( await pf( 'vehicle' ).locator( 'legend.rfb-label' ).evaluate( ( el ) => getComputedStyle( el, '::after' ).color ) ) === 'rgb(211, 84, 0)' );
		check( 'edit mode', 'a Total with nothing picked shows its text', ( await pf( 'total' ).locator( '.rfb-total-amount' ).textContent() ) === 'Pick a vehicle' );
		await pf( 'vehicle' ).locator( '.rfb-check' ).nth( 1 ).click();
		await pf( 'extras' ).locator( '.rfb-check' ).nth( 0 ).click();
		await page.waitForTimeout( 400 );
		check( 'edit mode', 'picking choices in the preview works the totals out: £75 + £10, and CHF for the vehicle only', ( await pf( 'total' ).locator( '.rfb-total-amount' ).textContent() ) === '£85.00' && ( await pf( 'vehicle_only' ).locator( '.rfb-total-amount' ).textContent() ) === 'CHF75.00', ( await pf( 'total' ).locator( '.rfb-total-amount' ).textContent() ) + ' ' + ( await pf( 'vehicle_only' ).locator( '.rfb-total-amount' ).textContent() ) );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { rfb_currency_symbol: '€', rfb_currency_position: 'after', rfb_thousands_sep: '.', rfb_decimal_sep: ',' } } );
		} );
		await page.waitForTimeout( 600 );
		check( 'edit mode', 'changing the symbol, its side and the separators shows at once', ( await pf( 'total' ).locator( '.rfb-total-amount' ).textContent() ) === '85,00 €' && ( await pf( 'vehicle' ).locator( '.rfb-opt-price' ).nth( 0 ).textContent() ) === '55,00 €' && ( await symbolOf( 'tip' ) ) === '€' && ( await pf( 'tip' ).locator( '.rfb-amount' ).evaluate( ( el ) => el.classList.contains( 'is-after' ) && el.lastElementChild.classList.contains( 'rfb-amount-symbol' ) ) ), await pf( 'total' ).locator( '.rfb-total-amount' ).textContent() );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { rfb_currency_symbol: '£', rfb_currency_position: 'before', rfb_thousands_sep: ',', rfb_decimal_sep: '.' } } );
		} );
		await page.waitForTimeout( 600 );
		// a field drawn again (a setting changed) still shows the currency set now
		await pf( 'tip' ).click();
		await page.waitForTimeout( 500 );
		await page.evaluate( () => { const c = refraction.selection.getElements()[ 0 ]; return $e.run( 'document/elements/settings', { container: c, settings: { field_label: 'Tip for the driver' } } ); } );
		await page.waitForTimeout( 1500 );
		check( 'edit mode', 'a field drawn again after a change keeps the currency set now', ( await symbolOf( 'tip' ) ) === '£' && ( await pf( 'tip' ).locator( 'label.rfb-label' ).textContent() ) === 'Tip for the driver', await symbolOf( 'tip' ) );
		const dynLabel = await pf( 'trip' ).locator( 'label.rfb-label' ).textContent();
		check( 'edit mode', 'a label from a Dynamic Tag (Post Title) shows the tag\'s value', dynLabel !== 'Trip' && dynLabel.length > 0, dynLabel );
		await page.screenshot( { path: join( SHOTS, 'editor.png' ) } );
		await preview.locator( '[data-rfb-key="vehicle"]' ).screenshot( { path: join( SHOTS, 'editor-vehicle.png' ) } );

		await page.evaluate( () => $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );

		// the server's own drawing after saving (no script): the saved currency
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the collection keeps the prices as the choices\' numbers, the currency choices and the mark', field( 'vehicle' ).options.map( ( o ) => o.number ).join( ',' ) === '55,75' && field( 'vehicle' ).priced === true && field( 'vehicle' ).required_mark === '(Required)' && field( 'deposit' ).currency === '€' && field( 'vehicle_only' ).currency === 'CHF' && field( 'total' ).sum_prices === true && field( 'vehicle_only' ).sum_keys.join() === 'vehicle' && def.settings.currency_symbol === '£', JSON.stringify( [ field( 'vehicle' ).options, field( 'total' ).sum_keys, def.settings.currency_symbol ] ) );
		// The server's own drawing of one field, as when a setting changes in the editor (the bug: it fell back to $).
		const redraw = await page.evaluate( () => new Promise( ( resolve ) => {
			const container = refraction.getContainer( refraction.$preview[ 0 ].contentDocument.querySelector( '[data-rfb-key="tip"]' ).closest( '.refraction-element' ).dataset.id );
			refractionCommon.ajax.addRequest( 'render_widget', { unique_id: 'check-tip', data: { data: container.model.toJSON() }, success: ( r ) => resolve( r.render || JSON.stringify( r ) ), error: ( e ) => resolve( 'error ' + JSON.stringify( e ) ) }, true );
		} ) );
		check( 'save', 'the server redraws a field in the editor in the saved currency (£), not $', /rfb-amount-symbol" data-rfb-cur aria-hidden="true">£</.test( redraw ), ( redraw.match( /rfb-amount-symbol[^<]*/ ) || [ redraw.slice( 0, 200 ) ] )[ 0 ] );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Loch Ness tours', slug: 'tours', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1100, height: 1400 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const f = ( key ) => v.locator( `form [data-rfb-key="${ key }"]` );
		check( 'site', 'the Dynamic Tag label is the page\'s title', ( await f( 'trip' ).locator( 'label.rfb-label' ).textContent() ) === 'Loch Ness tours', await f( 'trip' ).locator( 'label.rfb-label' ).textContent() );
		check( 'site', 'prices, currencies and the required text show', ( await f( 'vehicle' ).locator( '.rfb-opt-price' ).allTextContents() ).join( '|' ) === '£55.00|£75.00' && ( await f( 'tip' ).locator( '.rfb-amount-symbol' ).textContent() ) === '£' && ( await f( 'deposit' ).locator( '.rfb-amount-symbol' ).textContent() ) === '€' && ( await after( f( 'vehicle' ).locator( 'legend.rfb-label' ) ) ) === '"(Required)"' );
		await f( 'vehicle' ).locator( '.rfb-check' ).nth( 0 ).click();
		await f( 'extras' ).locator( '.rfb-check' ).nth( 0 ).click();
		await f( 'extras' ).locator( '.rfb-check' ).nth( 1 ).click();
		await v.waitForTimeout( 300 );
		check( 'site', 'the Total adds up the picked prices (55 + 10 + 5.50), the other counts the vehicle in CHF', ( await f( 'total' ).locator( '.rfb-total-amount' ).textContent() ) === '£70.50' && ( await f( 'vehicle_only' ).locator( '.rfb-total-amount' ).textContent() ) === 'CHF55.00', await f( 'total' ).locator( '.rfb-total-amount' ).textContent() );
		check( 'site', 'the Summary-readable name keeps the price', ( await f( 'vehicle' ).locator( 'input:checked + .rfb-opt-label' ).textContent() ).trim() === 'Car Tours £55.00' );
		await v.screenshot( { path: join( SHOTS, 'site.png' ), fullPage: true } );
		await v.setViewportSize( { width: 390, height: 1400 } );
		await v.waitForTimeout( 300 );
		check( 'phone', 'nothing is wider than a phone screen', await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ) );
		await v.screenshot( { path: join( SHOTS, 'site-phone.png' ), fullPage: true } );
		await v.setViewportSize( { width: 1100, height: 1400 } );
		await f( 'trip' ).locator( 'input' ).fill( 'Morning' );
		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 800 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the server stores its own sums: 70.50 and 55.00', vals && vals.total === '70.50' && vals.vehicle_only === '55.00' && vals.vehicle === 'car', JSON.stringify( vals ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form price checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
