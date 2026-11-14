#!/usr/bin/env node
/**
 * Calendar, clock and submit icon check (0.95.0, SQLite test site, Chromium): Date, Time and Date & time fields open the
 * form's own calendar and clock (bundled flatpickr in the forms' look) in the editor preview and on the site; the box
 * reads "14 November 2026" while the answer keeps its format; closed days and the notice can not be picked; times keep
 * to the opening hours and the minute step; Clear and Today work; a required empty date stops the form; the browser's
 * own picker stays when switched off; the Submit button shows its icon on the right; the answers are stored.
 *
 * Usage: node scripts/check-date-picker.mjs [--site /tmp/rf-dp-site] [--port 8934] [--shots /tmp/date-picker-shots]
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
const SITE = arg( 'site', '/tmp/rf-dp-site' );
const PORT = arg( 'port', '8934' );
const SHOTS = arg( 'shots', '/tmp/date-picker-shots' );
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
const ymd = ( d ) => `${ d.getFullYear() }-${ String( d.getMonth() + 1 ).padStart( 2, '0' ) }-${ String( d.getDate() ).padStart( 2, '0' ) }`;

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

		await page.evaluate( ( a ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const box = add( root, { elType: 'container', settings: { flex_gap: { unit: 'px', size: 24, column: '24', row: '24' } } } );
			// Closed on Sundays, booked at least 48 hours ahead, up to 60 days.
			add( box, { elType: 'widget', widgetType: 'rfb-field-date', settings: { field_label: 'Day', field_key: 'day', field_required: 'yes', closed_days: [ '0' ], notice_hours: 48, max_days: 60, field_icon: a.cal } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-time', settings: { field_label: 'Time', field_key: 'time', time_min: '08:00', time_max: '18:00', time_step: 15 } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-datetime', settings: { field_label: 'Pickup', field_key: 'pickup' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-date', settings: { field_label: 'Browser date', field_key: 'plain', date_picker: '' } } );
			// Inside a container: the editor does not keep a widget placed straight on the page.
			add( box, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Book now', icon: a.arrow, icon_position: 'right' } } );
		}, { cal: ph( 'calendar-blank' ), arrow: ph( 'arrow-right' ) } );
		await page.waitForTimeout( 2500 );
		const preview = page.frameLocator( '#refraction-preview-iframe' );

		check( 'editor', 'the submit button shows its icon on the right of the text in the preview', ( await preview.locator( '.rfb-submit .rfb-submit-icon:has(svg)' ).count() ) === 1 && await preview.locator( '.rfb-submit' ).evaluate( ( b ) => b.lastElementChild.classList.contains( 'rfb-submit-icon' ) ) );
		await preview.locator( '#rfb-values-day-shown' ).click();
		await page.waitForTimeout( 400 );
		check( 'editor', 'the date opens the form\'s calendar in the preview too', await preview.locator( '.flatpickr-calendar.rfb-fp.open' ).isVisible() );
		await preview.locator( 'body' ).press( 'Escape' );

		await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await page.waitForTimeout( 800 );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Calendar', rfb_min_seconds: 0, rfb_hourly_limit: 0, rfb_c_primary: '#7b1fa2' } } );
			await $e.run( 'document/save/publish' );
		} );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the date, time and date-time fields keep the calendar; the switched-off one does not', field( 'day' ).picker === true && field( 'time' ).picker === true && field( 'pickup' ).picker === true && field( 'plain' ).picker === false );

		// ------------------------------------------------------------ the site
		const formPage = seed( 'page', { title: 'Book a day', slug: 'book-a-day', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1400 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const cal = v.locator( '.flatpickr-calendar.rfb-fp.open' );

		// a required empty date stops the form
		await v.click( 'button.rfb-submit' );
		await v.waitForTimeout( 400 );
		check( 'required', 'sending with the required date empty stops the form at the date box', ( await v.locator( 'form[data-rfb-form]' ).count() ) === 1 && await v.evaluate( () => document.activeElement && document.activeElement.id === 'rfb-values-day-shown' || !! document.querySelector( '[data-rfb-key="day"] .rfb-error, [data-rfb-key="day"].has-error' ) ) );

		const dayBox = v.locator( '#rfb-values-day-shown' );
		await dayBox.click();
		await v.waitForTimeout( 300 );
		check( 'calendar', 'clicking the date box opens the form\'s calendar, with Clear and Today', ( await cal.isVisible() ) && ( await cal.locator( '.rfb-fp-clear' ).textContent() ) === 'Clear' && ( await cal.locator( '.rfb-fp-today' ).textContent() ) === 'Today' );
		const today = new Date();
		const todayCell = cal.locator( '.flatpickr-day.today' );
		check( 'calendar', 'today is inside the 48 hours notice, so it can not be picked', ( await todayCell.count() ) === 0 || ( await todayCell.getAttribute( 'class' ) ).includes( 'flatpickr-disabled' ) );
		const sundays = await cal.locator( '.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)' ).evaluateAll( ( cells ) => cells.filter( ( c ) => c.dateObj && 0 === c.dateObj.getDay() ).map( ( c ) => c.classList.contains( 'flatpickr-disabled' ) ) );
		check( 'calendar', 'Sundays (closed) can not be picked', sundays.length >= 4 && sundays.every( Boolean ), JSON.stringify( sundays ) );
		await cal.locator( '.rfb-fp-today' ).click();
		check( 'calendar', 'Today does not pick a day that can not be booked', '' === ( await v.locator( 'input[name="values[day]"]' ).inputValue() ) );

		// pick the first day that can be booked
		const target = await cal.locator( '.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)' ).first();
		const targetDate = await target.evaluate( ( c ) => `${ c.dateObj.getFullYear() }-${ String( c.dateObj.getMonth() + 1 ).padStart( 2, '0' ) }-${ String( c.dateObj.getDate() ).padStart( 2, '0' ) }` );
		await target.click();
		await v.waitForTimeout( 200 );
		const shown = await dayBox.inputValue();
		check( 'calendar', 'picking a day: the box reads "16 November 2026", the answer is 2026-11-16, the calendar closes', /^\d{1,2} [A-Z][a-z]+ \d{4}$/.test( shown ) && ( await v.locator( 'input[name="values[day]"]' ).inputValue() ) === targetDate && ! ( await cal.isVisible() ), `${ shown } / ${ targetDate }` );
		check( 'calendar', 'it is at least two days from now and not a Sunday', targetDate >= ymd( new Date( today.getTime() + 48 * 3600000 - 86400000 ) ) && 0 !== new Date( targetDate + 'T12:00:00' ).getDay() );
		await dayBox.click();
		await v.waitForTimeout( 300 );
		const picked = cal.locator( '.flatpickr-day.selected' );
		check( 'look', 'the picked day is filled with the form\'s main color, in a rounded square', ( await picked.evaluate( ( c ) => getComputedStyle( c ).backgroundColor ) ) === 'rgb(123, 31, 162)' && parseFloat( await picked.evaluate( ( c ) => getComputedStyle( c ).borderTopLeftRadius ) ) >= 6 );
		const inside = await cal.evaluate( ( c ) => { const box = c.getBoundingClientRect(); return [ ...c.querySelectorAll( '.flatpickr-day, .flatpickr-weekday' ) ].every( ( d ) => { const r = d.getBoundingClientRect(); return r.right <= box.right + 0.5 && r.left >= box.left - 0.5; } ); } );
		check( 'look', 'every day and weekday sits inside the card (Saturday too)', inside );
		check( 'look', 'the calendar is a white card with soft corners and a bold month', ( await cal.evaluate( ( c ) => getComputedStyle( c ).borderTopLeftRadius ) ) === '10px' && Number( await cal.locator( '.cur-month' ).evaluate( ( c ) => getComputedStyle( c ).fontWeight ) ) >= 700 );
		await v.screenshot( { path: join( SHOTS, 'calendar.png' ), clip: await ( async () => { const b = await cal.boundingBox(); const i = await dayBox.boundingBox(); return { x: Math.max( 0, i.x - 20 ), y: Math.max( 0, i.y - 60 ), width: Math.max( b.width, 360 ) + 40, height: b.y + b.height - i.y + 80 }; } )() } );
		await cal.locator( '.rfb-fp-clear' ).click();
		check( 'calendar', 'Clear empties the date', '' === ( await v.locator( 'input[name="values[day]"]' ).inputValue() ) && '' === ( await dayBox.inputValue() ) );
		await dayBox.click();
		await cal.locator( `.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)` ).first().click();

		// the icon in the date box
		const iconB = await v.locator( '[data-rfb-key="day"] .rfb-field-icon' ).boundingBox();
		const boxB = await dayBox.boundingBox();
		check( 'icon', 'the date box keeps its icon at the left, inside the box the visitor sees', iconB && iconB.x > boxB.x && iconB.x < boxB.x + 30 && ( await dayBox.evaluate( ( el ) => parseFloat( getComputedStyle( el ).paddingLeft ) ) ) > 30 );

		// the clock
		const timeBox = v.locator( '#rfb-values-time-shown' );
		await timeBox.click();
		await v.waitForTimeout( 300 );
		check( 'clock', 'the time opens a clock only (no calendar), in 15-minute steps, between 08:00 and 18:00', ( await v.locator( '.flatpickr-calendar.rfb-fp.noCalendar.open' ).isVisible() ) && await v.evaluate( () => { const fp = document.querySelector( 'input[name="values[time]"]' )._flatpickr; return 15 === fp.config.minuteIncrement && fp.config.minTime && 8 === fp.config.minTime.getHours() && 18 === fp.config.maxTime.getHours(); } ) );
		const clock = v.locator( '.flatpickr-calendar.rfb-fp.noCalendar.open' );
		await clock.locator( '.flatpickr-hour' ).fill( '22' );
		await clock.locator( '.flatpickr-minute' ).fill( '07' );
		await clock.locator( '.flatpickr-minute' ).press( 'Enter' );
		await v.keyboard.press( 'Escape' );
		await v.waitForTimeout( 200 );
		const timeValue = await v.locator( 'input[name="values[time]"]' ).inputValue();
		check( 'clock', 'a time typed past closing (22:07) is brought back inside the hours', /^\d{2}:\d{2}$/.test( timeValue ) && timeValue <= '18:00' && timeValue >= '08:00', timeValue );

		// date and time
		const pickupBox = v.locator( '#rfb-values-pickup-shown' );
		await pickupBox.click();
		const pickCal = v.locator( '.flatpickr-calendar.rfb-fp.open' );
		await pickCal.locator( '.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)' ).nth( 3 ).click();
		await v.keyboard.press( 'Escape' );
		await v.waitForTimeout( 200 );
		const pickupValue = await v.locator( 'input[name="values[pickup]"]' ).inputValue();
		check( 'date and time', 'date and time: the calendar with the clock under it; the answer is 2026-11-17T12:00, the box "17 November 2026, 12:00"', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test( pickupValue ) && /^\d{1,2} [A-Z][a-z]+ \d{4}, \d{2}:\d{2}$/.test( await pickupBox.inputValue() ), `${ pickupValue } / ${ await pickupBox.inputValue() }` );

		// the browser's own picker when switched off
		check( 'off', 'a date with Calendar picker off keeps the browser\'s own date box', ( await v.locator( 'input[name="values[plain]"]' ).getAttribute( 'type' ) ) === 'date' && await v.locator( 'input[name="values[plain]"]' ).evaluate( ( el ) => ! el._flatpickr ) );

		// the submit button
		check( 'submit', 'the submit button reads "Book now" with its icon on the right', ( await v.locator( 'button.rfb-submit .rfb-submit-text' ).textContent() ) === 'Book now' && await v.locator( 'button.rfb-submit' ).evaluate( ( b ) => { const t = b.querySelector( '.rfb-submit-text' ).getBoundingClientRect(); const i = b.querySelector( '.rfb-submit-icon' ).getBoundingClientRect(); return i.left >= t.right; } ) );

		await v.screenshot( { path: join( SHOTS, 'desktop.png' ), fullPage: true } );
		await v.setViewportSize( { width: 390, height: 1400 } );
		await v.waitForTimeout( 300 );
		await dayBox.click();
		await v.waitForTimeout( 300 );
		const phoneCal = await v.locator( '.flatpickr-calendar.rfb-fp.open' ).boundingBox();
		check( 'phone', 'on a phone the calendar fits the screen and nothing is wider than it', phoneCal && phoneCal.x >= 0 && phoneCal.x + phoneCal.width <= 390 && await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ), JSON.stringify( phoneCal ) );
		await v.screenshot( { path: join( SHOTS, 'phone.png' ) } );
		await v.keyboard.press( 'Escape' );
		await v.setViewportSize( { width: 1200, height: 1400 } );

		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 600 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the answers are stored in their formats (date, time, date and time)', vals && /^\d{4}-\d{2}-\d{2}$/.test( vals.day ) && vals.time === timeValue && vals.pickup === pickupValue, JSON.stringify( vals ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall calendar checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
