#!/usr/bin/env node
/**
 * New form and new event wizards (0.106.0, SQLite test site, Chromium): the dialog in steps (required name checked
 * before moving on, Back, the steps list, the options that show and hide, the last look), the form made with fields,
 * steps, statuses and icon of its type and added to the collections with Edit form and Open records; a ready-made form;
 * the event made with its details, type, categories (and a new one), marked in the Events list with Edit in the editor;
 * the narrow layout.
 *
 * Usage: node scripts/check-new-wizard.mjs [--site /tmp/rf-nw-site] [--port 8943] [--shots /tmp/new-wizard-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-nw-site' );
const PORT = arg( 'port', '8943' );
const SHOTS = arg( 'shots', '/tmp/new-wizard-shots' );
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
		wp( [ 'term', 'create', 'refraction_event_cat', 'Workshops' ] );
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 950 } } );
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );

		const dialog = ( id ) => a.locator( `#${ id }` );
		const current = ( id ) => a.evaluate( ( i ) => {
			const d = document.getElementById( i );
			const item = d.querySelector( '.rf-wizard__nav-item.is-current' );
			return { open: ! d.hidden, step: item ? Number( item.getAttribute( 'data-rf-step' ) ) : -1, done: d.querySelectorAll( '.rf-wizard__nav-item.is-done' ).length };
		}, id );
		const next = async ( id ) => { await dialog( id ).locator( '[data-rf-wizard-next]' ).click(); await a.waitForTimeout( 300 ); };
		const shot = async ( name ) => { await a.screenshot( { path: join( SHOTS, name ) } ); };

		// ------------------------------------------------------------ a new form
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-builder`, { waitUntil: 'load' } );
		await a.locator( 'a[data-rf-wizard-open="rf-wizard-form"]' ).first().click();
		await a.waitForTimeout( 500 );
		let st = await current( 'rf-wizard-form' );
		check( 'form wizard', '"New form" opens the wizard on its first step instead of the editor', st.open && 0 === st.step && /page=refraction-builder/.test( a.url() ), JSON.stringify( st ) );
		await shot( 'form-1-name.png' );
		await next( 'rf-wizard-form' );
		st = await current( 'rf-wizard-form' );
		check( 'form wizard', 'Continue without a name stays on the first step', 0 === st.step, JSON.stringify( st ) );
		await a.fill( '#rfw-name', 'Airport bookings' );
		await a.fill( '#rfw-description', 'Bookings from the airport page' );
		await next( 'rf-wizard-form' );
		await dialog( 'rf-wizard-form' ).locator( 'label.rf-wizard__choice:has-text("Bookings and appointments")' ).click();
		await shot( 'form-2-type.png' );
		await next( 'rf-wizard-form' );
		await dialog( 'rf-wizard-form' ).locator( 'label.rf-wizard__choice:has-text("In steps")' ).click();
		const notifyShown = await a.locator( '#rfw-notify_to' ).isVisible();
		await a.locator( 'label[for="rfw-notify"]' ).click();
		await a.waitForTimeout( 200 );
		const notifyHidden = ! ( await a.locator( '#rfw-notify_to' ).isVisible() );
		check( 'form wizard', 'Options: "Send them to" shows while "Email me each new entry" is on, and hides when it is off', notifyShown && notifyHidden );
		await shot( 'form-3-options.png' );
		await dialog( 'rf-wizard-form' ).locator( '[data-rf-wizard-back]' ).click();
		await a.waitForTimeout( 300 );
		st = await current( 'rf-wizard-form' );
		check( 'form wizard', 'Back goes to the step before, the ones done stay ticked', 1 === st.step && 1 === st.done, JSON.stringify( st ) );
		await a.locator( '#rf-wizard-form .rf-wizard__nav-item[data-rf-step="2"] button' ).click();
		await a.waitForTimeout( 300 );
		await next( 'rf-wizard-form' );
		const review = await a.evaluate( () => [ ...document.querySelectorAll( '#rf-wizard-form [data-rf-wizard-review] dt' ) ].map( ( dt ) => dt.textContent + ': ' + dt.nextElementSibling.textContent ) );
		check( 'form wizard', 'the last look lists the answers as chosen', review.includes( 'Form name: Airport bookings' ) && review.includes( 'Type: Bookings and appointments' ) && review.includes( 'Layout: In steps' ) && review.includes( 'Email me each new entry: No' ) && ! review.some( ( r ) => r.startsWith( 'Emails go to' ) ), JSON.stringify( review ) );
		await shot( 'form-4-review.png' );
		await Promise.all( [ a.waitForURL( /created=/, { timeout: 60000 } ), dialog( 'rf-wizard-form' ).locator( '[data-rf-wizard-submit]' ).click() ] );
		await a.waitForLoadState( 'load' );
		const made = await a.evaluate( () => {
			const card = document.querySelector( '.rfb-collection.is-new' );
			return { banner: document.querySelector( '.rf-created h2' )?.textContent, card: card?.querySelector( 'h2' )?.textContent.trim(), edit: document.querySelector( '.rf-created a[href*="action=refraction"]' )?.getAttribute( 'href' ), records: !! document.querySelector( '.rf-created a[href*="view=records"]' ) };
		} );
		check( 'form wizard', 'the form is in the collections, marked, with Edit form and Open records', /Airport bookings/.test( made.banner || '' ) && 'Airport bookings' === made.card && !! made.edit && made.records, JSON.stringify( made ) );
		await a.locator( '.rf-created' ).scrollIntoViewIfNeeded();
		await shot( 'form-5-created.png' );
		const coll = JSON.parse( wp( [ 'eval', `$c = ( new \\Refraction\\Modules\\FormBuilder\\Classes\\Collections() )->all(); foreach ( $c as $d ) { if ( 'Airport bookings' === $d['label'] ) { echo wp_json_encode( [ 'icon' => $d['icon'], 'singular' => $d['singular'], 'statuses' => array_column( $d['statuses'], 'label' ), 'fields' => array_column( \\Refraction\\Modules\\FormBuilder\\Classes\\Schema::value_fields( $d ), 'key' ), 'notify' => $d['settings']['notify_enabled'], 'public' => $d['public_form'] ] ); } }` ] ) || '{}' );
		check( 'form wizard', 'its collection has the booking type\'s icon, record name, statuses and fields, notify off, visitors on', 'calendar-month' === coll.icon && 'Booking' === coll.singular && 'Requested,Confirmed,Done,Cancelled' === ( coll.statuses || [] ).join() && [ 'name', 'email', 'phone', 'day', 'time', 'notes' ].every( ( k ) => ( coll.fields || [] ).includes( k ) ) && ! coll.notify && coll.public, JSON.stringify( coll ) );

		// Edit form: the editor opens with its fields in a Steps widget.
		await a.goto( made.edit, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 2000 );
		const tree = await a.evaluate( () => {
			const types = [];
			const walk = ( c ) => c.children.forEach( ( x ) => { if ( x.model.get( 'widgetType' ) ) { types.push( x.model.get( 'widgetType' ) ); } walk( x ); } );
			walk( refraction.getPreviewContainer() );
			return types;
		} );
		check( 'form wizard', 'Edit form opens the editor with its fields inside a Steps widget', tree.includes( 'rfb-steps' ) && tree.includes( 'rfb-field-date' ) && tree.includes( 'rfb-field-email' ), tree.join( ',' ) );

		// A ready-made form: no layout question, its own fields.
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-builder`, { waitUntil: 'load' } );
		await a.locator( '.rfb-page-head a[data-rf-wizard-open="rf-wizard-form"]' ).click();
		await a.waitForTimeout( 400 );
		await a.fill( '#rfw-name', 'Tours' );
		await next( 'rf-wizard-form' );
		await dialog( 'rf-wizard-form' ).locator( 'label.rf-wizard__choice:has-text("Taxi and tour booking")' ).click();
		await next( 'rf-wizard-form' );
		const layoutHidden = ! ( await dialog( 'rf-wizard-form' ).locator( 'label.rf-wizard__choice:has-text("In steps")' ).isVisible() );
		await next( 'rf-wizard-form' );
		await Promise.all( [ a.waitForURL( /created=/, { timeout: 60000 } ), dialog( 'rf-wizard-form' ).locator( '[data-rf-wizard-submit]' ).click() ] );
		const tours = await a.evaluate( () => document.querySelector( '.rfb-collection.is-new h2' )?.textContent.trim() );
		check( 'form wizard', 'a ready-made form: no layout question, made under its new name', layoutHidden && 'Tours' === tours, JSON.stringify( { layoutHidden, tours } ) );

		// ------------------------------------------------------------ a new event
		await a.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_event`, { waitUntil: 'load' } );
		await a.locator( '.page-title-action' ).first().click();
		await a.waitForTimeout( 500 );
		st = await current( 'rf-wizard-event' );
		check( 'event wizard', '"Add New Event" opens the event wizard', st.open && 0 === st.step && /edit\.php/.test( a.url() ), JSON.stringify( st ) );
		await a.keyboard.press( 'Escape' );
		await a.waitForTimeout( 300 );
		check( 'event wizard', 'Escape closes it', ! ( await current( 'rf-wizard-event' ) ).open );
		await a.locator( 'a[data-rf-wizard-open="rf-wizard-event"]:has-text("New event")' ).first().click();
		await a.waitForTimeout( 400 );
		await a.fill( '#rfw-title', 'Summer open day' );
		await a.fill( '#rfw-excerpt', 'Tours of the depot and rides for the kids.' );
		await next( 'rf-wizard-event' );
		await dialog( 'rf-wizard-event' ).locator( 'label.rf-wizard__choice:has-text("Workshops")' ).click();
		await a.fill( '#rfw-new_category', 'Family' );
		await shot( 'event-2-type.png' );
		await next( 'rf-wizard-event' );
		await next( 'rf-wizard-event' );
		check( 'event wizard', 'When and where: the start is required before moving on', 2 === ( await current( 'rf-wizard-event' ) ).step );
		await a.fill( '#rfw-start', '2031-06-01T10:00' );
		await a.fill( '#rfw-end', '2031-06-01T16:00' );
		await a.fill( '#rfw-venue', 'Depot, Inverness' );
		await shot( 'event-3-when.png' );
		await next( 'rf-wizard-event' );
		await dialog( 'rf-wizard-event' ).locator( 'label.rf-wizard__choice:has-text("Published")' ).click();
		await shot( 'event-4-review.png' );
		await Promise.all( [ a.waitForURL( /rfe_created=/, { timeout: 60000 } ), dialog( 'rf-wizard-event' ).locator( '[data-rf-wizard-submit]' ).click() ] );
		await a.waitForLoadState( 'load' );
		const eventId = Number( new URL( a.url() ).searchParams.get( 'rfe_created' ) );
		const notice = await a.evaluate( ( id ) => ( {
			text: document.querySelector( '.rf-event-created' )?.textContent || '',
			editor: document.querySelector( '.rf-event-created a[href*="action=refraction"]' )?.getAttribute( 'href' ),
			row: !! document.getElementById( 'post-' + id ),
			marked: getComputedStyle( document.querySelector( `#post-${ id } td` ) || document.body ).backgroundColor,
		} ), eventId );
		check( 'event wizard', 'the event is in the list, marked, with Edit in the editor', /Summer open day/.test( notice.text ) && /published/i.test( notice.text ) && !! notice.editor && notice.row && 'rgb(232, 255, 243)' === notice.marked, JSON.stringify( notice ) );
		await shot( 'event-5-created.png' );
		const ev = JSON.parse( wp( [ 'eval', `$id = ${ eventId }; echo wp_json_encode( [ 'status' => get_post_status( $id ), 'excerpt' => get_post_field( 'post_excerpt', $id ), 'start' => get_post_meta( $id, '_rfe_start', true ), 'end' => get_post_meta( $id, '_rfe_end', true ), 'venue' => get_post_meta( $id, '_rfe_venue', true ), 'cats' => wp_get_object_terms( $id, 'refraction_event_cat', [ 'fields' => 'names' ] ) ] );` ] ) || '{}' );
		check( 'event wizard', 'its details are saved: published, description, start, end, venue, Workshops and the new Family category', 'publish' === ev.status && /depot/.test( ev.excerpt ) && '2031-06-01 10:00' === ev.start && '2031-06-01 16:00' === ev.end && 'Depot, Inverness' === ev.venue && ( ev.cats || [] ).sort().join() === 'Family,Workshops', JSON.stringify( ev ) );
		await a.goto( notice.editor, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 2000 );
		const evTree = await a.evaluate( () => { const t = []; const w = ( c ) => c.children.forEach( ( x ) => { if ( x.model.get( 'widgetType' ) ) { t.push( x.model.get( 'widgetType' ) ); } w( x ); } ); w( refraction.getPreviewContainer() ); return t; } );
		check( 'event wizard', 'Edit in the editor opens its page with the Event Details box', evTree.includes( 'refraction-event-details' ), evTree.join( ',' ) );

		// ------------------------------------------------------------ narrow screens
		const phone = await ( await browser.newContext( { viewport: { width: 390, height: 800 }, storageState: await ctx.storageState() } ) ).newPage();
		await phone.goto( `${ BASE }/wp-admin/admin.php?page=refraction-builder`, { waitUntil: 'load' } );
		await phone.locator( '.rfb-page-head a[data-rf-wizard-open="rf-wizard-form"]' ).click();
		await phone.waitForTimeout( 500 );
		const fits = await phone.evaluate( () => { const d = document.querySelector( '#rf-wizard-form .rf-wizard__dialog' ).getBoundingClientRect(); return d.width <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth; } );
		check( 'narrow', 'on a phone the wizard fills the screen without side scrolling', fits );
		await phone.screenshot( { path: join( SHOTS, 'phone.png' ) } );

		check( 'errors', 'no script errors', 0 === errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse)/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
