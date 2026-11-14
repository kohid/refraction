#!/usr/bin/env node
/**
 * Booking calendar check (0.96.0, SQLite test site, Chromium): a stay (check-in to check-out) with fewest and most
 * nights and a date that can not be booked, a flight (one way or return), several days with a most (on the page), and
 * one day with no past days; the calendar greys out what can not be picked while the visitor picks, shows two months
 * for a stay, says "3 nights" / "One way" / "2 of 3 days", counts nights and days in a Total, and the server stores
 * the days in order.
 *
 * Usage: node scripts/check-booking-calendar.mjs [--site /tmp/rf-bc-site] [--port 8935] [--shots /tmp/booking-calendar-shots]
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
const SITE = arg( 'site', '/tmp/rf-bc-site' );
const PORT = arg( 'port', '8935' );
const SHOTS = arg( 'shots', '/tmp/booking-calendar-shots' );
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


const ymd = ( d ) => `${ d.getFullYear() }-${ String( d.getMonth() + 1 ).padStart( 2, '0' ) }-${ String( d.getDate() ).padStart( 2, '0' ) }`;
const plus = ( days ) => { const d = new Date(); d.setHours( 12, 0, 0, 0 ); d.setDate( d.getDate() + days ); return d; };
const label = ( d ) => d.toLocaleDateString( 'en-US', { month: 'long', day: 'numeric', year: 'numeric' } );

// The open calendar of a field, moved to a day, and one of its day cells.
const open = async ( v, key ) => { await v.locator( `#rfb-values-${ key }-shown` ).click(); await v.waitForTimeout( 250 ); return v.locator( '.flatpickr-calendar.rfb-fp.open' ); };
const jump = ( v, key, d ) => v.evaluate( ( [ k, t ] ) => document.querySelector( `input[name="values[${ k }]"]` )._flatpickr.jumpToDate( new Date( t ) ), [ key, d.getTime() ] );
const cell = ( cal, d ) => cal.locator( `.flatpickr-day[aria-label="${ label( d ) }"]:not(.prevMonthDay):not(.nextMonthDay)` ).first();
const off = async ( cal, d ) => ( await cell( cal, d ).getAttribute( 'class' ) ).includes( 'flatpickr-disabled' );

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
	// A stay from base: the night of base + 2 can not be booked.
	const base = plus( 10 );
	const blockedNight = plus( 12 );

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

		await page.evaluate( ( blocked ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const box = add( refraction.getPreviewContainer(), { elType: 'container', settings: { flex_gap: { unit: 'px', size: 24, column: '24', row: '24' } } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-date', settings: { field_label: 'Your stay', field_key: 'stay', calendar: 'range', min_nights: 2, max_nights: 7, no_past: 'yes', unavailable: blocked } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-date', settings: { field_label: 'Flight', field_key: 'flight', calendar: 'flight', no_past: 'yes' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-date', settings: { field_label: 'Tour days', field_key: 'days', calendar: 'multiple', max_picks: 3, no_past: 'yes', inline: 'yes' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-date', settings: { field_label: 'Pickup day', field_key: 'day', no_past: 'yes' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-total', settings: { field_label: 'Price', field_key: 'price', total_formula: '{stay} * 80 + {days} * 10' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Book' } } );
		}, ymd( blockedNight ) );
		await page.waitForTimeout( 2000 );

		await page.evaluate( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const stay = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === 'rfb-field-date' );
			$e.run( 'panel/editor/open', { model: stay.model, view: stay.view } );
		} );
		await page.waitForTimeout( 1000 );
		const types = await page.$$eval( 'select[data-setting="calendar"] option', ( els ) => els.map( ( e ) => e.value ) );
		check( 'panel', 'a date offers One day, A stay, A flight and Several days, with No past days and Dates that can not be booked', types.join( ',' ) === 'single,range,flight,multiple' && ( await page.locator( '.refraction-control-no_past' ).count() ) === 1 && ( await page.locator( '.refraction-control-unavailable' ).count() ) === 1, types.join( ',' ) );

		await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await page.waitForTimeout( 800 );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Booking calendar', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
			await $e.run( 'document/save/publish' );
		} );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the collection keeps each calendar type, its nights, its most days and its unavailable date', field( 'stay' ).calendar === 'range' && field( 'stay' ).min_nights === 2 && field( 'stay' ).max_nights === 7 && JSON.stringify( field( 'stay' ).unavailable ) === JSON.stringify( [ [ ymd( blockedNight ), ymd( blockedNight ) ] ] ) && field( 'flight' ).calendar === 'flight' && field( 'days' ).max_picks === 3 && field( 'days' ).inline === true && field( 'day' ).no_past === true, JSON.stringify( [ 'stay', 'flight', 'days', 'day' ].map( ( k ) => [ k, field( k ).calendar, field( k ).min_nights, field( k ).max_nights, field( k ).max_picks, field( k ).inline, field( k ).no_past, field( k ).unavailable ] ) ) );

		// ------------------------------------------------------------ the site
		const formPage = seed( 'page', { title: 'Book a stay', slug: 'book-a-stay', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1500 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );

		// a stay
		let cal = await open( v, 'stay' );
		await jump( v, 'stay', base );
		check( 'stay', 'a stay opens two months side by side on a wide screen', await cal.evaluate( ( c ) => c.classList.contains( 'multiMonth' ) && 2 === c.querySelectorAll( '.dayContainer' ).length ) );
		check( 'stay', 'past days can not be picked', ( await cal.locator( '.flatpickr-day.flatpickr-disabled' ).count() ) > 0 && ( await off( cal, plus( -1 ) ).catch( () => true ) ) );
		await cell( cal, base ).click();
		await v.waitForTimeout( 150 );
		check( 'stay', 'after the check-in, a 1-night stay (fewer than 2) and a 9-night one (more than 7) are greyed out', ( await off( cal, plus( 11 ) ) ) && ( await off( cal, plus( 19 ) ) ) );
		check( 'stay', 'a stay over the unavailable night can not end after it; checking out that morning can', ( await off( cal, plus( 13 ) ) ) && ! ( await off( cal, blockedNight ) ) );
		check( 'stay', 'the footer asks for the check-out day', ( await cal.locator( '.rfb-fp-summary' ).textContent() ) === 'Now choose the check-out day' );
		await cell( cal, blockedNight ).click();
		await v.waitForTimeout( 200 );
		const stayValue = await v.locator( 'input[name="values[stay]"]' ).inputValue();
		check( 'stay', 'a 2-night stay: the answer is "check-in to check-out", the box reads the two days', stayValue === `${ ymd( base ) } to ${ ymd( blockedNight ) }` && / to /.test( await v.locator( '#rfb-values-stay-shown' ).inputValue() ), stayValue );
		check( 'stay', 'the Total counts the 2 nights (2 x 80)', ( await v.locator( '[data-rfb-key="price"]' ).textContent() ).includes( '160' ) );
		await v.keyboard.press( 'Escape' );

		// a flight: one way
		cal = await open( v, 'flight' );
		await jump( v, 'flight', base );
		await cell( cal, base ).click();
		await v.waitForTimeout( 150 );
		check( 'flight', 'after the departure the footer says one way, and a return can still be chosen', ( await cal.locator( '.rfb-fp-summary' ).textContent() ).startsWith( 'One way' ) );
		await v.keyboard.press( 'Escape' );
		await v.waitForTimeout( 150 );
		await v.mouse.click( 5, 5 );
		await v.waitForTimeout( 150 );
		check( 'flight', 'closing with one day (Escape or a click away) keeps a one-way flight', ( await v.locator( 'input[name="values[flight]"]' ).inputValue() ) === ymd( base ) );

		// several days, on the page (any pop-up closed first)
		await v.mouse.click( 5, 5 );
		await v.waitForTimeout( 150 );
		const inline = v.locator( '[data-rfb-key="days"] .flatpickr-calendar.rfb-fp.inline' );
		check( 'several days', 'the calendar is on the page, open, without a click', await inline.isVisible() );
		await v.evaluate( ( t ) => document.querySelector( 'input[name="values[days]"]' )._flatpickr.jumpToDate( new Date( t ) ), base.getTime() );
		for ( const n of [ 10, 11, 14 ] ) {
			await cell( inline, plus( n ) ).click();
			await v.waitForTimeout( 100 );
		}
		check( 'several days', 'after 3 days (the most) the others are greyed out; the footer says "3 of 3 days"', ( await off( inline, plus( 15 ) ) ) && ( await inline.locator( '.rfb-fp-summary' ).textContent() ) === '3 of 3 days' );
		check( 'several days', 'the Total adds the 3 days (2 x 80 + 3 x 10 = 190)', ( await v.locator( '[data-rfb-key="price"]' ).textContent() ).includes( '190' ) );
		await v.screenshot( { path: join( SHOTS, 'several-days.png' ), clip: await v.locator( '[data-rfb-key="days"]' ).boundingBox() } );

		// one day, no past days
		cal = await open( v, 'day' );
		check( 'one day', 'yesterday can not be picked, today can', ( await off( cal, plus( -1 ) ).catch( () => true ) ) && ! ( await off( cal, plus( 0 ) ) ) );
		await cell( cal, plus( 0 ) ).click();

		// the stay calendar for the picture
		cal = await open( v, 'stay' );
		await v.waitForTimeout( 200 );
		await v.screenshot( { path: join( SHOTS, 'stay.png' ), clip: await ( async () => { const b = await cal.boundingBox(); return { x: Math.max( 0, b.x - 10 ), y: Math.max( 0, b.y - 70 ), width: b.width + 20, height: b.height + 80 }; } )() } );
		await v.keyboard.press( 'Escape' );

		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 600 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the server stores the stay, the one-way flight, the 3 days in order and the price', vals && vals.stay === stayValue && vals.flight === ymd( base ) && vals.days === [ 10, 11, 14 ].map( ( n ) => ymd( plus( n ) ) ).join( ', ' ) && vals.day === ymd( plus( 0 ) ) && vals.price === '190.00', JSON.stringify( vals ) );

		// a phone: one month
		await v.goto( formPage.url );
		await v.setViewportSize( { width: 390, height: 1400 } );
		await v.reload();
		await v.waitForSelector( 'form[data-rfb-form]' );
		cal = await open( v, 'stay' );
		const phoneBox = await cal.boundingBox();
		check( 'phone', 'on a phone a stay shows one month, inside the screen', ! ( await cal.evaluate( ( c ) => c.classList.contains( 'multiMonth' ) ) ) && phoneBox.x >= 0 && phoneBox.x + phoneBox.width <= 390 && await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall booking calendar checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
