#!/usr/bin/env node
/**
 * Form conditions check (0.124.0, SQLite test site, Chromium). A Form page built in the editor with: Number fields with
 * the Grey buttons stepper, Image-card choices with prices and "Not available when" rules (Too small), an Amount, a
 * Total amount with no formula, a container shown by Conditional visibility (holding a required field), a field
 * Disabled when, and Image cards with their picture and card size.
 *
 * Edit Mode: the panel offers Conditional visibility on a heading and a container (not twice on a field), Disabled when,
 * Not available when in Choice details, Buttons look, Style > Minus and plus buttons and the Picture and card size group;
 * the preview shows the grey buttons and the sizes. Site: the total adds the picked price and the amount, choices turn
 * unavailable as passengers grow (note in place of the price, let go when picked), a field is greyed and off, the
 * container shows and hides; the server refuses an unavailable choice, skips the required field of a hidden container,
 * and stores its own total.
 *
 * Usage: node scripts/check-form-conditions.mjs [--site /tmp/rf-fc-site] [--port 8955] [--shots /tmp/form-conditions-shots]
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
const SITE = arg( 'site', '/tmp/rf-fc-site' );
const PORT = arg( 'port', '8955' );
const SHOTS = arg( 'shots', '/tmp/form-conditions-shots' );
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


const cond = ( prefix, action, rules ) => ( { [ prefix + 'enabled' ]: 'yes', [ prefix + 'action' ]: action, [ prefix + 'match' ]: 'all', [ prefix + 'rules' ]: rules.map( ( r, i ) => ( { _id: 'r' + i + Math.random().toString( 16 ).slice( 2, 6 ), ...r } ) ) } );

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
		const img = ( name ) => Number( wp( [ 'media', 'import', join( HERE, '../tests/elements-regression/assets/test-images', name ), '--porcelain' ] ).trim() );
		const pics = [ img( 'image1.jpg' ), img( 'image2.jpg' ), img( 'image1.jpg' ) ];
		const page = await login( browser );
		watch( page, 'editor' );
		await page.goto( BUILDER );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		await page.goto( newHref, { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await page.waitForTimeout( 2000 );

		const conds = {
			promo: cond( 'cond_', 'disable', [ { field: 'passengers', op: 'greater', value: '6' } ] ),
			extras: cond( 'rfb_el_cond_', 'show', [ { field: 'car', op: 'equals', value: 'minibus' } ] ),
			group: cond( 'rfb_el_cond_', 'show', [ { field: 'passengers', op: 'greater', value: '6' } ] ),
		};
		await page.evaluate( ( a ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const row = add( root, { elType: 'container', settings: { flex_direction: 'row', flex_gap: { unit: 'px', size: 16, column: '16', row: '16' } } } );
			add( row, { elType: 'widget', widgetType: 'rfb-field-number', settings: { field_label: 'Passengers', field_key: 'passengers', stepper: 'yes', stepper_look: 'boxed', default_value: '1', field_min: 1 } } );
			add( row, { elType: 'widget', widgetType: 'rfb-field-number', settings: { field_label: 'Suitcases', field_key: 'suitcases', stepper: 'yes', stepper_look: 'boxed', step_bg: '#dfe7f5', default_value: '0' } } );
			const box = add( root, { elType: 'container', settings: { flex_direction: 'column', flex_gap: { unit: 'px', size: 20, column: '20', row: '20' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Available cars', field_key: 'car', field_options: 'saloon|Saloon\nmpv|MPV\nminibus|Minibus (8 seats)', choice_look: 'images', ch_card_width: { unit: 'px', size: 210 }, ch_pic_height: { unit: 'px', size: 90 }, ch_pic_fit: 'contain', option_extras: [
				{ _id: 'c1', choice: 'saloon', image: { id: a.pics[ 0 ], url: '' }, text: 'Up to 4 passengers', price: 60, off_field: 'passengers', off_op: 'greater', off_value: '4', off_text: 'Too small' },
				{ _id: 'c2', choice: 'mpv', image: { id: a.pics[ 1 ], url: '' }, text: 'Up to 6 passengers', price: 70.76, off_field: 'passengers', off_op: 'greater', off_value: '6', off_text: 'Too small' },
				{ _id: 'c3', choice: 'minibus', image: { id: a.pics[ 2 ], url: '' }, text: 'Up to 8 passengers', price: 83.3 },
			] } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-currency', settings: { field_label: 'Tip', field_key: 'tip', currency_symbol: 'yes' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Promo code', field_key: 'promo', ...a.conds.promo } } );
			const extras = add( box, { elType: 'container', settings: { flex_direction: 'column', ...a.conds.extras } } );
			add( extras, { elType: 'widget', widgetType: 'heading', settings: { title: 'Minibus details' } } );
			add( extras, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Flight number', field_key: 'flight', field_required: 'yes' } } );
			add( box, { elType: 'widget', widgetType: 'heading', settings: { title: 'Large group? Call us.', ...a.conds.group } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-total', settings: { field_label: 'Total amount', field_key: 'total', total_none: 'Pick a car' } } );
			add( root, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Book' } } );
		}, { pics, conds } );
		await page.waitForTimeout( 2500 );

		const preview = page.frameLocator( '#refraction-preview-iframe' );
		const pf = ( key ) => preview.locator( `[data-rfb-key="${ key }"]` );

		// ------------------------------------------------------------ Edit Mode
		const step = await pf( 'passengers' ).evaluate( ( el ) => { const box = el.querySelector( '.rfb-count' ); const btn = box.querySelector( '.rfb-count-btn' ); return { boxed: box.classList.contains( 'rfb-count--boxed' ), full: Math.abs( box.getBoundingClientRect().width - el.getBoundingClientRect().width ) < 3, bg: getComputedStyle( btn ).backgroundColor, h: Math.round( box.getBoundingClientRect().height ) }; } );
		check( 'edit mode', 'Grey buttons: − and + in grey squares at the ends of a full-width box, 48px high', step.boxed && step.full && step.bg === 'rgb(238, 240, 244)' && step.h === 48, JSON.stringify( step ) );
		check( 'edit mode', 'Style > Minus and plus buttons color shows (Suitcases)', ( await pf( 'suitcases' ).locator( '.rfb-count-btn' ).first().evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(223, 231, 245)' );
		const card = await pf( 'car' ).locator( '.rfb-check' ).first().evaluate( ( el ) => ( { w: Math.round( el.getBoundingClientRect().width ), h: Math.round( el.querySelector( '.rfb-opt-media img' ).getBoundingClientRect().height ), priceInside: el.querySelector( '.rfb-opt-price' ).getBoundingClientRect().right <= el.getBoundingClientRect().right } ) );
		check( 'edit mode', 'the cards are 210px wide with 90px pictures, the price stays inside the card', card.w === 210 && card.h === 90 && card.priceInside, JSON.stringify( card ) );
		check( 'edit mode', 'in the editor every conditioned element stays in view', ( await preview.locator( '.refraction-widget-heading', { hasText: 'Minibus details' } ).isVisible() ) && ( await preview.locator( '.refraction-widget-heading', { hasText: 'Large group' } ).isVisible() ) );
		await preview.locator( '[data-rfb-key="car"]' ).screenshot( { path: join( SHOTS, 'editor-cars.png' ) } );
		await preview.locator( '[data-rfb-key="passengers"]' ).screenshot( { path: join( SHOTS, 'editor-stepper.png' ) } );

		// the panel
		const advanced = async () => {
			await page.click( '.refraction-panel-navigation-tab:has-text("Advanced")' );
			await page.waitForTimeout( 500 );
		};
		await preview.locator( '.refraction-widget-heading', { hasText: 'Large group' } ).click();
		await page.waitForTimeout( 800 );
		await advanced();
		check( 'panel', 'a heading has Advanced > Conditional visibility', await page.locator( '.refraction-control-section_rfb_conditions' ).isVisible() );
		await page.locator( '.refraction-control-section_rfb_conditions' ).click();
		await page.waitForTimeout( 500 );
		check( 'panel', 'with This element is (Shown, Hidden, Disabled when), Rules to match and the rules', ( await page.$$eval( '.refraction-control-rfb_el_cond_action select option', ( els ) => els.map( ( e ) => e.value ).join() ) ) === 'show,hide,disable' && ( await page.locator( '.refraction-control-rfb_el_cond_rules .refraction-repeater-row-item-title' ).first().textContent() ).trim() === 'passengers greater 6' );
		await page.screenshot( { path: join( SHOTS, 'panel-heading-conditions.png' ) } );
		await pf( 'promo' ).click();
		await page.waitForTimeout( 800 );
		await advanced();
		check( 'panel', 'a field shows its own Conditional visibility only (not twice)', ( await page.locator( '.refraction-control-section_conditions:visible' ).count() ) === 1 && ( await page.locator( '.refraction-control-section_rfb_conditions:visible' ).count() ) === 0 );
		await pf( 'car' ).click();
		await page.waitForTimeout( 800 );
		await page.click( '.refraction-panel-navigation-tab:has-text("Content")' );
		await page.waitForTimeout( 400 );
		const groupTabs = await page.$$eval( '.rf-section-groups__tab', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		for ( const tab of groupTabs ) {
			if ( /choice details|look/i.test( tab ) ) {
				await page.locator( `.rf-section-groups__tab:has-text("${ tab }")` ).first().click();
			}
		}
		await page.waitForTimeout( 300 );
		await page.locator( '.refraction-control-option_extras .refraction-repeater-row-item-title' ).first().click( { timeout: 5000 } ).catch( () => {} );
		await page.waitForTimeout( 500 );
		check( 'panel', 'a Choice details row has Not available when, its condition, value and text', ( await page.locator( '.refraction-control-option_extras .refraction-control-off_field input' ).first().inputValue() ) === 'passengers' && ( await page.locator( '.refraction-control-option_extras .refraction-control-off_text input' ).first().inputValue() ) === 'Too small' );
		await page.click( '.refraction-panel-navigation-tab:has-text("Style")' );
		await page.waitForTimeout( 400 );
		await page.locator( '.refraction-control-section_style_choices' ).click();
		await page.waitForTimeout( 400 );
		const styleGroups = await page.$$eval( '.rf-section-groups__tab', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'Style > Choices has its own Picture and card size group', styleGroups.includes( 'Picture and card size' ), styleGroups.join( '|' ) );
		await page.locator( '.rf-section-groups__tab:has-text("Picture and card size")' ).click();
		await page.waitForTimeout( 300 );
		check( 'panel', 'the group holds card width, picture width, height, fit, space and corners', ( await Promise.all( [ 'ch_card_width', 'ch_pic_width', 'ch_pic_height', 'ch_pic_fit', 'ch_pic_pad', 'ch_pic_radius' ].map( ( n ) => page.locator( `.refraction-control-${ n }:visible` ).count() ) ) ).every( ( c ) => c === 1 ) );
		await page.screenshot( { path: join( SHOTS, 'panel-picture-size.png' ) } );
		await pf( 'passengers' ).click();
		await page.waitForTimeout( 800 );
		await page.click( '.refraction-panel-navigation-tab:has-text("Style")' );
		await page.waitForTimeout( 400 );
		check( 'panel', 'Number has Style > Minus and plus buttons', await page.locator( '.refraction-control-section_style_stepper' ).isVisible() );

		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Choose your car', rfb_min_seconds: 0, rfb_hourly_limit: 0, rfb_currency_symbol: '£' } } );
		} );
		await page.evaluate( () => void $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the flight field inside the container carries its rules; the total adds up; the choices keep their rules', field( 'flight' ).guards.length === 1 && field( 'flight' ).guards[ 0 ].rules[ 0 ].value === 'minibus' && field( 'total' ).sum_prices === true && field( 'car' ).option_extras.saloon.off.rules[ 0 ].field === 'passengers' && field( 'promo' ).conditions.action === 'disable' && field( 'passengers' ).stepper_look === 'boxed', JSON.stringify( [ field( 'flight' ).guards, field( 'car' ).option_extras.saloon ] ) );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Choose your car', slug: 'cars', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1100, height: 1500 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		const open = async () => {
			await v.goto( formPage.url );
			await v.waitForSelector( 'form[data-rfb-form]' );
		};
		await open();
		const f = ( key ) => v.locator( `form [data-rfb-key="${ key }"]` );
		const carCard = ( i ) => f( 'car' ).locator( '.rfb-check' ).nth( i );
		const total = () => f( 'total' ).locator( '.rfb-total-amount' ).textContent();
		const plus = () => f( 'passengers' ).locator( '[data-rfb-step="1"]' ).click();

		check( 'site', 'Total amount is shown, not typed: no box, its text until something is picked', ( await f( 'total' ).locator( 'input' ).count() ) === 0 && ( await total() ) === 'Pick a car' );
		check( 'site', 'the minibus details and the large-group heading start hidden', ! ( await f( 'flight' ).isVisible() ) && ! ( await v.locator( 'form .refraction-widget-heading', { hasText: 'Large group' } ).isVisible() ) );
		await carCard( 0 ).click();
		await f( 'tip' ).locator( 'input' ).fill( '5' );
		await v.waitForTimeout( 200 );
		check( 'site', 'the total adds the picked car and the amount: £60 + £5', ( await total() ) === '£65.00', await total() );
		for ( let i = 0; i < 4; i++ ) { await plus(); }
		await v.waitForTimeout( 200 );
		const saloon = await carCard( 0 ).evaluate( ( el ) => ( { off: el.classList.contains( 'is-off' ), disabled: el.querySelector( 'input' ).disabled, checked: el.querySelector( 'input' ).checked, note: el.querySelector( '.rfb-opt-off' ).hidden ? '' : el.querySelector( '.rfb-opt-off' ).textContent, border: getComputedStyle( el ).borderTopStyle + ' ' + getComputedStyle( el ).borderTopColor, price: getComputedStyle( el.querySelector( '.rfb-opt-price' ) ).display, opacity: getComputedStyle( el ).opacity } ) );
		check( 'site', '5 passengers: the saloon is greyed with a dashed outline, shows Too small in place of its price, and is let go', saloon.off && saloon.disabled && ! saloon.checked && saloon.note === 'Too small' && saloon.price === 'none' && Number( saloon.opacity ) < 0.7 && saloon.border.startsWith( 'dashed' ) && ! saloon.border.endsWith( 'rgba(0, 0, 0, 0)' ), JSON.stringify( saloon ) );
		check( 'site', 'the total drops the car: £5', ( await total() ) === '£5.00', await total() );
		await carCard( 0 ).click( { force: true } );
		check( 'site', 'an unavailable card can not be picked', ! ( await carCard( 0 ).locator( 'input' ).isChecked() ) );
		await v.screenshot( { path: join( SHOTS, 'site-too-small.png' ), clip: await f( 'car' ).boundingBox() } );
		for ( let i = 0; i < 2; i++ ) { await plus(); }
		await v.waitForTimeout( 200 );
		const promo = await f( 'promo' ).evaluate( ( el ) => ( { cls: el.classList.contains( 'rfb-is-disabled' ), disabled: el.querySelector( 'input' ).disabled, visible: ! el.hidden } ) );
		check( 'site', '7 passengers: the promo code is disabled (in view, greyed), the MPV is too small, the group heading shows', promo.cls && promo.disabled && promo.visible && await carCard( 1 ).evaluate( ( el ) => el.classList.contains( 'is-off' ) ) && await v.locator( 'form .refraction-widget-heading', { hasText: 'Large group' } ).isVisible(), JSON.stringify( promo ) );
		await carCard( 2 ).click();
		await v.waitForTimeout( 200 );
		check( 'site', 'the minibus shows its details container; the total is £83.30 + £5', ( await f( 'flight' ).isVisible() ) && ( await v.locator( 'form .refraction-widget-heading', { hasText: 'Minibus details' } ).isVisible() ) && ( await total() ) === '£88.30', await total() );
		await v.screenshot( { path: join( SHOTS, 'site.png' ), fullPage: true } );

		// the server refuses an unavailable choice sent anyway
		await open();
		await v.evaluate( () => {
			const form = document.querySelector( 'form[data-rfb-form]' );
			form.querySelector( '[data-rfb-key="passengers"] input' ).value = '5';
			const car = form.querySelector( 'input[value="saloon"]' );
			car.disabled = false;
			car.checked = true;
			HTMLFormElement.prototype.submit.call( form );
		} );
		await v.waitForLoadState( 'load' );
		await v.waitForSelector( 'form[data-rfb-form]' );
		check( 'submit', 'the server refuses the saloon for 5 passengers', ( await v.locator( '.rfb-error' ).allTextContents() ).some( ( t ) => t.includes( 'not available' ) ), ( await v.locator( '.rfb-error' ).allTextContents() ).join( ' | ' ) );

		// a proper booking: the MPV for 5, no minibus, so the flight number is not asked for
		await open();
		for ( let i = 0; i < 4; i++ ) { await plus(); }
		await carCard( 1 ).click();
		await f( 'tip' ).locator( 'input' ).fill( '5' );
		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 800 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'stored without the hidden container\'s required flight number; the server\'s total is 75.76', vals && vals.car === 'mpv' && vals.passengers === '5' && vals.total === '75.76' && ! vals.flight, JSON.stringify( vals ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form condition checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
