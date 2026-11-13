#!/usr/bin/env node
/**
 * Booking form check (SQLite test site, Chromium): the "Taxi and tour booking" starter is made from Refraction > Builder
 * and opens in the editor; on a page, Form Canvas prefills it per page (an Isle of Skye tour page, an airport page);
 * the tour price is worked out as you answer (hours x hourly rate, the fixed Skye prices) and stored by the server;
 * transfers show "price on request"; vehicle cards hide when they can not seat everyone; the date has its notice;
 * stop rows, suggestions, the minus / plus buttons and the summary work; a booking gets a reference that shows after
 * sending and is emailed to the customer with the answers.
 *
 * Usage: node scripts/check-booking-form.mjs [--site /tmp/rf-bf-site] [--port 8997] [--shots /tmp/booking-form-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-bf-site' );
const PORT = arg( 'port', '8997' );
const SHOTS = arg( 'shots', '/tmp/booking-form-shots' );
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

const MAIL_PLUGIN = '<?php add_filter( "pre_wp_mail", function ( $null, $atts ) { file_put_contents( WP_CONTENT_DIR . "/rf-mails.jsonl", wp_json_encode( $atts ) . "\n", FILE_APPEND ); return true; }, 10, 2 );';

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const mu = join( WPDIR, 'wp-content/mu-plugins' );
	const mails = join( WPDIR, 'wp-content/rf-mails.jsonl' );
	mkdirSync( mu, { recursive: true } );
	writeFileSync( join( mu, 'rf-mail-log.php' ), MAIL_PLUGIN );
	if ( existsSync( mails ) ) { rmSync( mails ); }
	// Each run sends bookings: start without the per-address hourly limit left from an earlier run.
	wp( [ 'transient', 'delete', '--all' ], { allowFail: true } );

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];

	try {
		const ctx = await browser.newContext( { viewport: { width: 1300, height: 950 } } );
		const a = await ctx.newPage();
		// "Transition was skipped": Chromium dropping a page-to-page view transition on the redirect into the editor; it
		// happens with the Builder's New form button too and is not an error of the page.
		a.on( 'pageerror', ( e ) => ! /Transition was skipped/.test( e.message ) && errors.push( 'admin: ' + e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );

		// ------------------------------------------------------------ the starter
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-builder`, { timeout: 120000 } );
		const starter = a.locator( '.rfb-starter', { hasText: 'Taxi and tour booking' } );
		check( 'starter', 'Refraction > Builder offers the Taxi and tour booking form', 1 === await starter.count() );
		await a.screenshot( { path: join( SHOTS, 'builder-starter.png' ) } );
		await Promise.all( [ a.waitForURL( /action=refraction/, { timeout: 120000 } ), starter.locator( 'a' ).click() ] );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '#refraction-panel' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 2500 );
		const inEditor = await a.evaluate( () => {
			const doc = refraction.documents.getCurrent();
			const types = [];
			const walk = ( c ) => { types.push( c.model.get( 'widgetType' ) || c.model.get( 'elType' ) ); ( c.children || [] ).forEach( walk ); };
			walk( doc.container );
			return { type: doc.config.type, total: types.includes( 'rfb-field-total' ), summary: types.includes( 'rfb-summary' ), cards: types.includes( 'rfb-field-choice_set' ), steps: types.includes( 'rfb-steps' ) };
		} );
		check( 'starter', 'it opens as a Form page in the editor with its steps, vehicle cards, Total and Summary', 'rfb-form' === inEditor.type && inEditor.total && inEditor.summary && inEditor.cards && inEditor.steps, JSON.stringify( inEditor ) );
		await a.screenshot( { path: join( SHOTS, 'editor.png' ) } );

		const collections = JSON.parse( wp( [ 'option', 'get', 'refraction_form_builder_collections', '--format=json' ] ) );
		const slug = Object.keys( collections ).find( ( k ) => /taxi/.test( k ) );
		const def = collections[ slug ] || {};
		const flat = [];
		const walkFields = ( list ) => ( list || [] ).forEach( ( f ) => { flat.push( f ); walkFields( f.children ); } );
		walkFields( def.fields );
		const keys = flat.map( ( f ) => f.key );
		check( 'starter', 'saving it made the collection with its fields, reference prefix and customer email', !! slug && [ 'service', 'tour', 'pickup', 'via', 'dropoff', 'pickup_at', 'return_at', 'passengers', 'vehicle', 'tour_vehicle', 'name', 'email', 'phone', 'price', 'consent' ].every( ( k ) => keys.includes( k ) ) && 'IT' === def.settings.reference_prefix && def.settings.confirm_enabled, JSON.stringify( { slug, keys, settings: def.settings && { ref: def.settings.reference_prefix, confirm: def.settings.confirm_enabled } } ) );
		const vehicle = flat.find( ( f ) => 'vehicle' === f.key ) || {};
		check( 'starter', 'vehicle cards carry their own keys and seat rules', [ 'saloon', 'executive', 'estate', 'wheelchair', 'six_seater', 'eight_seater', 'sixteen_seater' ].join() === ( vehicle.children || [] ).map( ( c ) => c.key ).join() && 'passengers' === vehicle.children[ 0 ].conditions.rules[ 0 ].field );

		// ------------------------------------------------------------ pages with the form
		const canvas = ( id, fill ) => ( { id, elType: 'widget', widgetType: 'rfb-form-canvas', settings: { form: slug, fill: fill.map( ( [ key, value ], i ) => ( { _id: id + i, key, value } ) ) }, elements: [] } );
		const tourPage = page( 'Isle of Skye tour', [ box( 'tp', {}, [ canvas( 'fcs', [ [ 'service', 'tour' ], [ 'tour', 'isle-of-skye' ] ] ) ] ) ] );
		const airportPage = page( 'Airport transfers', [ box( 'ap', {}, [ canvas( 'fca', [ [ 'service', 'airport' ] ] ) ] ) ] );

		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( 'site: ' + e.message ) );
		const shown = ( key ) => p.evaluate( ( k ) => { const w = document.querySelector( `[data-rfb-key="${ k }"]` ); return !! w && ! w.closest( '[hidden]' ) && null !== w.offsetParent; }, key );
		const visibleButton = ( text ) => p.locator( 'form[data-rfb-form] button:visible', { hasText: new RegExp( `^\\s*${ text }\\s*$` ) } ).first();
		const next = async () => { await visibleButton( 'Next' ).click(); await p.waitForTimeout( 500 ); };
		const back = async () => { await visibleButton( 'Back' ).click(); await p.waitForTimeout( 400 ); };
		const tomorrow = new Date( Date.now() + 36 * 3600 * 1000 ).toISOString().slice( 0, 10 );

		await p.goto( tourPage.url, { waitUntil: 'load', timeout: 120000 } );
		await p.waitForTimeout( 800 );
		const pre = await p.evaluate( () => ( {
			service: document.querySelector( 'input[name="values[service]"]:checked' )?.value,
			tour: document.querySelector( 'select[name="values[tour]"]' )?.value,
		} ) );
		check( 'prefill', 'the tour page opens with "Inverness tour" and the Isle of Skye tour chosen', 'tour' === pre.service && 'isle-of-skye' === pre.tour, JSON.stringify( pre ) );
		check( 'conditions', 'a tour asks for the pickup, not a drop-off, stops or a return', ( await shown( 'pickup' ) ) && ! ( await shown( 'dropoff' ) ) && ! ( await shown( 'via' ) ) && ! ( await shown( 'return_trip' ) ) && ! ( await shown( 'flight' ) ) );
		const min = await p.getAttribute( 'input[name="values[pickup_at]"]', 'min' );
		check( 'dates', 'the pickup date and time can not be earlier than now plus the 2 hours notice', !! min && min > new Date( Date.now() + 90 * 60000 ).toISOString().slice( 0, 16 ) && '900' === await p.getAttribute( 'input[name="values[pickup_at]"]', 'step' ), String( min ) );
		check( 'suggestions', 'the pickup offers the site\'s own place suggestions', ( await p.locator( 'datalist option' ).count() ) >= 5 );
		await p.fill( 'input[name="values[pickup][first]"], input[name="values[pickup]"]', 'Kingsmills Hotel, Inverness' );
		await p.fill( 'input[name="values[pickup_at]"]', `${ tomorrow }T08:00` );
		await p.screenshot( { path: join( SHOTS, 'step1-tour.png' ), fullPage: true } );
		await next();
		check( 'conditions', 'step 2 of a tour: the tour vehicle, no transfer vehicle cards or luggage', ( await shown( 'tour_vehicle' ) ) && ! ( await shown( 'vehicle' ) ) && ! ( await shown( 'suitcases' ) ) && ( await shown( 'passengers' ) ) );
		await p.locator( '[data-rfb-key="passengers"] [data-rfb-step="1"]' ).click();
		await p.locator( '[data-rfb-key="passengers"] [data-rfb-step="1"]' ).click();
		check( 'stepper', 'the plus button counts up (1 -> 3)', '3' === await p.inputValue( 'input[name="values[passengers]"]' ) );
		await p.check( 'input[name="values[tour_vehicle]"][value="bus"]' );
		await next();
		const price = () => p.locator( '[data-rfb-key="price"] .rfb-total-amount' ).textContent();
		check( 'total', 'Isle of Skye by minibus: £700.00', '£700.00' === ( await price() ).trim(), await price() );
		await back();
		await p.check( 'input[name="values[tour_vehicle]"][value="car"]' );
		await next();
		check( 'total', 'Isle of Skye by car: £600.00 (the fixed price, not 12 x £55)', '£600.00' === ( await price() ).trim(), await price() );
		await back();
		await back();
		await p.selectOption( 'select[name="values[tour]"]', 'loch-ness-urquhart-castle' );
		await next();
		await next();
		check( 'total', 'Loch Ness & Urquhart Castle by car: 4 hours x £55 = £220.00', '£220.00' === ( await price() ).trim(), await price() );
		await p.fill( 'input[name="values[name][first]"]', 'Morag' );
		await p.fill( 'input[name="values[name][last]"]', 'Fraser' );
		await p.fill( 'input[name="values[email]"]', 'morag@example.com' );
		await p.fill( 'input[name="values[phone]"]', '07700 900123' );
		await p.check( 'input[name="values[payment]"][value="card"]' );
		await p.check( 'input[name="values[consent][]"]' );
		const summary = await p.locator( '.rfb-summary' ).innerText();
		check( 'summary', 'the summary lists the answers, the tour, the vehicle and the price', /Loch Ness & Urquhart Castle/.test( summary ) && /Car tour/.test( summary ) && /£220\.00/.test( summary ) && /Morag Fraser/.test( summary ) && /Kingsmills Hotel/.test( summary ), summary );
		await p.screenshot( { path: join( SHOTS, 'step3-tour.png' ), fullPage: true } );
		await Promise.all( [ p.waitForURL( /rfb_done=/, { timeout: 60000 } ), p.locator( 'button[type=submit]', { hasText: 'Send my booking' } ).click() ] );
		await p.waitForTimeout( 600 );
		const done = await p.locator( '.rfb-alert-success' ).innerText().catch( () => '' );
		const ref = ( done.match( /IT-\d{6}-\d{4}/ ) || [] )[ 0 ];
		check( 'sent', 'after sending the customer sees their reference', !! ref, done );
		await p.screenshot( { path: join( SHOTS, 'sent.png' ) } );

		const stored = JSON.parse( wp( [ 'eval', `$q = get_posts( [ 'post_type' => 'refraction_fb_record', 'posts_per_page' => 1, 'orderby' => 'ID', 'order' => 'DESC', 'meta_key' => '_rfb_reference', 'meta_value' => '${ ref }' ] ); $id = $q ? $q[0]->ID : 0; $m = get_post_meta( $id ); echo wp_json_encode( [ 'id' => $id, 'meta' => array_map( function ( $v ) { return $v[0]; }, $m ) ] );` ] ) );
		const values = Object.values( stored.meta || {} ).map( String ).join( ' ' );
		check( 'sent', 'the record is stored with its reference and the price worked out by the server (220.00)', stored.id > 0 && /"price":"220\.00"/.test( values ), values.slice( 0, 400 ) );
		const sent = existsSync( mails ) ? readFileSync( mails, 'utf8' ).trim().split( '\n' ).map( ( l ) => JSON.parse( l ) ) : [];
		const toCustomer = sent.find( ( m ) => String( m.to ).includes( 'morag@example.com' ) );
		const toOffice = sent.find( ( m ) => ! String( m.to ).includes( 'morag@example.com' ) );
		check( 'emails', 'the customer is emailed the reference and a summary of the booking', !! toCustomer && toCustomer.subject.includes( ref ) && toCustomer.message.includes( ref ) && /Loch Ness/.test( toCustomer.message ) && /£220\.00/.test( toCustomer.message ) && toCustomer.message.startsWith( 'Hello Morag Fraser' ), JSON.stringify( toCustomer ).slice( 0, 500 ) );
		check( 'emails', 'the office copy has the reference and replies go to the customer', !! toOffice && toOffice.subject.includes( ref ) && JSON.stringify( toOffice.headers ).includes( 'morag@example.com' ), JSON.stringify( toOffice ).slice( 0, 300 ) );

		// ------------------------------------------------------------ an airport transfer
		await p.goto( airportPage.url, { waitUntil: 'load', timeout: 120000 } );
		await p.waitForTimeout( 800 );
		check( 'prefill', 'the airport page opens with "Airport transfer" chosen and asks the direction and flight', 'airport' === await p.evaluate( () => document.querySelector( 'input[name="values[service]"]:checked' )?.value ) && ( await shown( 'airport_direction' ) ) && ( await shown( 'flight' ) ) && ! ( await shown( 'tour' ) ) && ( await shown( 'dropoff' ) ) );
		await p.check( 'input[name="values[airport_direction]"][value="from"]' );
		await p.fill( 'input[name="values[pickup]"]', 'Inverness Airport (INV)' );
		await p.fill( 'input[name="values[dropoff]"]', 'Royal Dornoch Golf Club' );
		await p.locator( '[data-rfb-key="via"] [data-rfb-add]' ).click();
		await p.fill( '[data-rfb-key="via"] .rfb-rows input[type=text]', 'Tain' );
		await p.fill( 'input[name="values[pickup_at]"]', `${ tomorrow }T14:30` );
		await p.locator( '[data-rfb-key="return_trip"] .rfb-switch-track' ).click();
		check( 'conditions', 'a return trip asks for the return date and time', await shown( 'return_at' ) );
		await p.fill( 'input[name="values[return_at]"]', `${ tomorrow }T19:00` );
		await next();
		const cards = async () => p.evaluate( () => [ ...document.querySelectorAll( '[data-rfb-key="vehicle"] .rfb-choice-card' ) ].filter( ( c ) => ! c.hidden ).map( ( c ) => c.dataset.rfbKey ) );
		const fewCards = await cards();
		check( 'vehicles', 'one passenger: every vehicle is offered', 7 === fewCards.length, fewCards.join() );
		await p.fill( 'input[name="values[passengers]"]', '6' );
		await p.locator( 'input[name="values[passengers]"]' ).dispatchEvent( 'input' );
		await p.waitForTimeout( 300 );
		const sixCards = await cards();
		check( 'vehicles', 'six passengers: no saloon or executive car; estate, accessible, 6, 8 and 16 seats stay', 'estate,wheelchair,six_seater,eight_seater,sixteen_seater' === sixCards.join(), sixCards.join() );
		await p.fill( 'input[name="values[passengers]"]', '12' );
		await p.locator( 'input[name="values[passengers]"]' ).dispatchEvent( 'input' );
		await p.waitForTimeout( 300 );
		check( 'vehicles', 'twelve passengers: only the 16-seater minibus', 'sixteen_seater' === ( await cards() ).join(), ( await cards() ).join() );
		await p.locator( '[data-rfb-key="vehicle"] .rfb-choice-card[data-rfb-key="sixteen_seater"]' ).click();
		await p.locator( '[data-rfb-key="suitcases"] [data-rfb-step="1"]' ).click();
		await p.screenshot( { path: join( SHOTS, 'step2-airport.png' ), fullPage: true } );
		await next();
		check( 'total', 'a transfer shows "we confirm the fare" instead of a price', /confirm the fare/.test( await price() ), await price() );
		await p.fill( 'input[name="values[name][first]"]', 'Ewan' );
		await p.fill( 'input[name="values[name][last]"]', 'Ross' );
		await p.fill( 'input[name="values[email]"]', 'ewan@example.com' );
		await p.fill( 'input[name="values[phone]"]', '07700 900456' );
		await p.check( 'input[name="values[payment]"][value="cash"]' );
		await p.check( 'input[name="values[consent][]"]' );
		const sum2 = await p.locator( '.rfb-summary' ).innerText();
		check( 'summary', 'the transfer summary has the route with the stop, the return and the minibus', /Tain/.test( sum2 ) && /Royal Dornoch/.test( sum2 ) && /16-seater minibus/.test( sum2 ) && /Return date and time/.test( sum2 ), sum2 );
		await p.screenshot( { path: join( SHOTS, 'step3-airport.png' ), fullPage: true } );
		await Promise.all( [ p.waitForURL( /rfb_done=/, { timeout: 60000 } ), p.locator( 'button[type=submit]', { hasText: 'Send my booking' } ).click() ] );
		const done2 = await p.locator( '.rfb-alert-success' ).innerText().catch( () => '' );
		check( 'sent', 'the transfer booking is sent with its own reference', /IT-\d{6}-\d{4}/.test( done2 ) && ! done2.includes( ref ), done2 );

		// ------------------------------------------------------------ phones
		const phone = await browser.newContext( { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } );
		const m = await phone.newPage();
		await m.goto( tourPage.url, { waitUntil: 'load', timeout: 120000 } );
		await m.waitForTimeout( 800 );
		const overflow = await m.evaluate( () => document.documentElement.scrollWidth - document.documentElement.clientWidth );
		check( 'phone', 'the form fits a phone screen (no sideways scrolling)', overflow <= 1, String( overflow ) );
		await m.screenshot( { path: join( SHOTS, 'phone.png' ), fullPage: true } );
		await phone.close();

		check( 'errors', 'no script errors', 0 === errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse)/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		rmSync( join( mu, 'rf-mail-log.php' ), { force: true } );
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
