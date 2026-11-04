#!/usr/bin/env node
/**
 * Event bookings, payment, gallery and the editor's sample event (SQLite test site, Chromium):
 * - Book now (pay in cash): a visitor books places on the event page; the ticket limit and tickets per person hold
 *   (by email), "N left" and "Fully booked" show, the booking is listed in the admin and can be marked as paid.
 * - The Pay button pays the total amount: its text shows it and {amount} in the payment link becomes it.
 * - Event Gallery "Main picture with thumbnails": a thumbnail shows its picture as the main one.
 * - Dates read "November 5, 2026" (Event Detail start date / start time tags).
 * - In the editor, event widgets and tags show an event while a page or an event template is designed.
 *
 * Usage: node scripts/check-event-booking.mjs [--site /tmp/rf-eb-site] [--port 8992] [--shots /tmp/event-booking-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-eb-site' );
const PORT = arg( 'port', '8992' );
const SHOTS = arg( 'shots', '/tmp/event-booking-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 600 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	if ( process.env.CHROMIUM ) {
		return process.env.CHROMIUM;
	}
	const root = '/opt/pw-browsers';
	if ( ! existsSync( root ) ) {
		return undefined;
	}
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, sub ) ) ) {
				return join( root, d, sub );
			}
		}
	}
	return undefined;
}

function wp( args ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const php = ( code ) => wp( [ 'eval', code ] ).trim();
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => {
	try {
		await fetch( `${ BASE }/wp-login.php` );
		return true;
	} catch {
		return false;
	}
};

function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	return { id, url: `${ BASE }/?page_id=${ id }` };
}
const wrap = ( id, widgets ) => [ { id: `c${ id }`, elType: 'container', isInner: false, settings: {}, elements: widgets } ];

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-d', 'upload_max_filesize=20M', '-d', 'post_max_size=25M', '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) {
			await sleep( 200 );
		}
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];
	const watch = ( p ) => {
		// WordPress's own admin view transitions report a skipped transition when a form post redirects (not ours).
		p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && ! /user-profile/.test( String( e.stack ) ) && errors.push( `${ e.message } @ ${ p.url() }` ) );
		p.on( 'console', ( m ) => {
			if ( 'error' === m.type() && ! /favicon/.test( m.location().url ) ) {
				errors.push( `${ m.text() } @ ${ m.location().url }` );
			}
		} );
	};
	const login = async ( user, pass ) => {
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', user );
		await p.fill( '#user_pass', pass );
		await Promise.all( [ p.waitForURL( /wp-admin|\/$|page_id/, { timeout: 120000 } ), p.click( '#wp-submit' ) ] );
		return { ctx, p };
	};
	const openEditor = async ( p ) => {
		await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2500 );
	};

	try {
		wp( [ 'option', 'update', 'time_format', 'H:i' ] );
		wp( [ 'option', 'update', 'date_format', 'Y-m-d' ] ); // dates must still read "November 5, 2026"
		wp( [ 'option', 'update', 'permalink_structure', '/%postname%/' ] );
		const dir = join( tmpdir(), `rfeb-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		const images = [];
		for ( const [ name, color ] of [ [ 'tall1', '#aa5533' ], [ 'tall2', '#3355aa' ] ] ) {
			execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${ color }:size=400x600`, '-frames:v', '1', join( dir, `${ name }.png` ) ] );
			images.push( Number( wp( [ 'media', 'import', join( dir, `${ name }.png` ), '--porcelain' ] ).trim() ) );
		}
		const eventId = Number( wp( [ 'post', 'create', '--post_type=refraction_event', '--post_status=publish', '--post_title=Salsa Night', '--porcelain' ] ).trim() );
		php( `Refraction\\Modules\\Events\\Classes\\Event_Data::save( ${ eventId }, [ 'start' => '2031-11-05 19:00', 'end' => '2031-11-05 22:30', 'venue' => 'Hall 2', 'price' => '£10', 'total_amount' => '£20.00', 'payment_url' => 'https://pay.example.com/salsa/{amount}', 'payment_label' => 'Pay online', 'ticket_limit' => '5', 'tickets_per_person' => '2', 'booking' => 'yes', 'booking_label' => 'Book now', 'gallery' => '${ images.join( ',' ) }' ] );` );
		const eventUrl = php( `echo get_permalink( ${ eventId } );` );

		// ------------------------------------------------------------ the event page: dates, Pay button, Book now
		const ctx = await browser.newContext( { viewport: { width: 1280, height: 1000 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( eventUrl );
		const first = await p.evaluate( () => ( {
			date: document.querySelector( '.rf-ed-date .rf-ed-value' )?.textContent,
			places: document.querySelector( '.rf-ed-places .rf-ed-value' )?.textContent,
			pay: [ document.querySelector( '.rf-ed-pay' )?.textContent.trim(), document.querySelector( '.rf-ed-pay' )?.getAttribute( 'href' ) ],
			book: document.querySelector( '.rfe-book summary' )?.textContent.trim(),
		} ) );
		check( 'dates', 'the date reads "Wednesday, November 5, 2031" whatever the site\'s date format', 'Wednesday, November 5, 2031' === first.date, JSON.stringify( first ) );
		check( 'payment', 'the Pay button shows the total amount and pays it ({amount} in the link)', 'Pay online · £20.00' === first.pay[ 0 ] && 'https://pay.example.com/salsa/20.00' === first.pay[ 1 ], JSON.stringify( first.pay ) );
		check( 'booking', 'Book now and the places left show', 'Book now' === first.book && /5 tickets, up to 2 per person, 5 left/.test( first.places || '' ), JSON.stringify( first ) );

		const book = async ( name, email, tickets ) => {
			await p.goto( eventUrl );
			await p.click( '.rfe-book summary' );
			await p.fill( '.rfe-book [name="name"]', name );
			await p.fill( '.rfe-book [name="email"]', email );
			// The browser stops more than the form's maximum; the server must refuse it too, so the limit is taken off here.
			await p.evaluate( () => document.querySelector( '.rfe-book [name="tickets"]' ).removeAttribute( 'max' ) );
			await p.fill( '.rfe-book [name="tickets"]', String( tickets ) );
			await sleep( 2200 ); // the form's minimum time on the page
			await Promise.all( [ p.waitForNavigation(), p.click( '.rfe-book__submit' ) ] );
			return ( await p.locator( '.rfe-book__notice' ).textContent().catch( () => '' ) ).trim();
		};
		const a = await book( 'Ann', 'ann@example.com', 2 );
		await p.screenshot( { path: join( SHOTS, 'booked.png' ), fullPage: true } );
		check( 'booking', 'booking 2 tickets: confirmed, pay £20.00 in cash', /Booked: 2 tickets\. Please pay £20\.00 in cash at the event\./.test( a ), a );
		const again = await book( 'Ann', 'ANN@example.com', 1 );
		check( 'booking', 'the same person cannot go over 2 tickets', /more tickets than one person may book/.test( again ), again );
		await book( 'Bob', 'bob@example.com', 2 );
		const tooMany = await book( 'Cat', 'cat@example.com', 2 );
		check( 'booking', 'more than the places left is refused', /not enough places left/.test( tooMany ), tooMany );
		await book( 'Cat', 'cat@example.com', 1 );
		await p.goto( eventUrl );
		const full = await p.evaluate( () => ( { places: document.querySelector( '.rf-ed-places .rf-ed-value' )?.textContent, closed: document.querySelector( '.rfe-book .is-disabled' )?.textContent } ) );
		check( 'booking', 'when every place is taken: "fully booked", no form', /fully booked/.test( full.places || '' ) && 'Fully booked' === full.closed, JSON.stringify( full ) );
		await ctx.close();

		const admin = await login( 'admin', 'admin' );
		await admin.p.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_booking` );
		const rows = await admin.p.locator( '#the-list tr' ).count();
		check( 'admin', 'the three bookings are listed', 3 === rows, String( rows ) );
		await admin.p.click( '#the-list tr:first-child a:has-text("Mark: Paid")' );
		await admin.p.waitForLoadState( 'load' );
		check( 'admin', 'a booking can be marked as paid', 1 === await admin.p.locator( '.rfe-booking-paid' ).count() );
		await admin.p.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_event` );
		check( 'admin', 'the events table shows 5 / 5 booked', /5 \/ 5/.test( await admin.p.locator( `tr#post-${ eventId } td.column-rfe_booked` ).textContent() ) );

		// ------------------------------------------------------------ gallery: main picture with thumbnails
		const gal = page( 'Gallery', wrap( 'g', [ { id: 'gal1', elType: 'widget', widgetType: 'refraction-event-gallery', settings: { event: String( eventId ), layout: 'showcase' }, elements: [] } ] ) );
		const g = await browser.newContext( { viewport: { width: 1000, height: 1100 } } );
		const gp = await g.newPage();
		watch( gp );
		await gp.goto( gal.url );
		const before = await gp.evaluate( () => ( { main: document.querySelector( '.rfe-showcase__main img' )?.getAttribute( 'src' ), thumbs: document.querySelectorAll( '.rfe-showcase__thumb' ).length, lightbox: document.querySelector( '.rfe-showcase__main' )?.dataset.refractionOpenLightbox } ) );
		await gp.click( '.rfe-showcase__thumb >> nth=1' );
		const after = await gp.evaluate( () => ( { main: document.querySelector( '.rfe-showcase__main img' ).getAttribute( 'src' ), href: document.querySelector( '.rfe-showcase__main' ).getAttribute( 'href' ), active: document.querySelector( '.rfe-showcase__thumb.is-active' ) === document.querySelectorAll( '.rfe-showcase__thumb' )[ 1 ] } ) );
		check( 'gallery', 'Main picture with thumbnails: one big picture (lightbox) and two thumbnails', /tall1/.test( before.main || '' ) && 2 === before.thumbs && 'yes' === before.lightbox, JSON.stringify( before ) );
		check( 'gallery', 'a thumbnail shows its picture as the main one', /tall2/.test( after.main ) && /tall2/.test( after.href ) && after.active, JSON.stringify( after ) );
		await gp.screenshot( { path: join( SHOTS, 'gallery-showcase.png' ), fullPage: true } );
		await g.close();

		// ------------------------------------------------------------ the editor shows an event
		const designPage = page( 'Event design', wrap( 'd', [
			{ id: 'dgal', elType: 'widget', widgetType: 'refraction-event-gallery', settings: {}, elements: [] },
			{ id: 'dbtn', elType: 'widget', widgetType: 'refraction-event-button', settings: { action: 'payment' }, elements: [] },
			{ id: 'ddet', elType: 'widget', widgetType: 'refraction-event-details', settings: {}, elements: [] },
		] ) );
		await admin.p.goto( `${ BASE }/wp-admin/post.php?post=${ designPage.id }&action=refraction` );
		await admin.p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const frame = admin.p.frame( { name: 'refraction-preview-iframe' } );
		const shown = await frame.evaluate( () => ( { gallery: document.querySelectorAll( '[data-id="dgal"] .rfe-gallery__item' ).length, button: document.querySelector( '[data-id="dbtn"] .rfe-btn' )?.textContent.trim(), total: /£20\.00/.test( document.querySelector( '[data-id="ddet"]' )?.textContent || '' ), hint: !! document.querySelector( '.rf-ed-hint' ) } ) );
		check( 'editor', 'on a page, the event widgets show the newest event while editing (gallery, Pay button, total)', 2 === shown.gallery && /Pay online · £20\.00/.test( shown.button || '' ) && shown.total && ! shown.hint, JSON.stringify( shown ) );
		await admin.p.screenshot( { path: join( SHOTS, 'editor-page.png' ) } );

		// An event Single template that still previews a blog post: its tags and widgets speak about an event.
		const tpl = Number( wp( [ 'post', 'create', '--post_type=refraction_library', '--post_status=publish', '--post_title=Events single', '--porcelain' ] ).trim() );
		const tag = ( name, settings ) => `[refraction-tag id="ab12cd3" name="${ name }" settings="${ encodeURIComponent( JSON.stringify( settings ) ) }"]`;
		const tplData = [ { id: 'tz01', elType: 'container', settings: {}, elements: [
			{ id: 'tz02', elType: 'widget', widgetType: 'heading', settings: { title: 'x', _css_classes: 'sdate', __dynamic__: { title: tag( 'refraction-event-detail', { detail: 'start_date' } ) } }, elements: [] },
			{ id: 'tz03', elType: 'widget', widgetType: 'heading', settings: { title: 'x', _css_classes: 'stime', __dynamic__: { title: tag( 'refraction-event-detail', { detail: 'start_time' } ) } }, elements: [] },
			{ id: 'tz04', elType: 'widget', widgetType: 'refraction-event-gallery', settings: { layout: 'showcase' }, elements: [] },
		] } ];
		for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'single' ], [ '_refraction_data', JSON.stringify( tplData ) ] ] ) {
			wp( [ 'post', 'meta', 'update', String( tpl ), k, v ] );
		}
		php( `wp_set_object_terms( ${ tpl }, 'single', 'refraction_library_type' ); Refraction\\Plugin::$instance->modules_manager->get_modules( 'theme-builder' )->get_store()->save_rules( ${ tpl }, 'single', [ 'include/singular/refraction_event' ] );` );
		await admin.p.goto( `${ BASE }/wp-admin/post.php?post=${ tpl }&action=refraction` );
		await admin.p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const tf = admin.p.frame( { name: 'refraction-preview-iframe' } );
		const tshown = await tf.evaluate( () => ( { date: document.querySelector( '.sdate .refraction-heading-title' )?.textContent, time: document.querySelector( '.stime .refraction-heading-title' )?.textContent, thumbs: document.querySelectorAll( '.rfe-showcase__thumb' ).length } ) );
		check( 'editor', 'an event Single template previewing a blog post still shows an event: start date and time tags, gallery', 'November 5, 2031' === tshown.date && '19:00' === tshown.time && 2 === tshown.thumbs, JSON.stringify( tshown ) );
		await admin.p.screenshot( { path: join( SHOTS, 'editor-template.png' ) } );
		await admin.ctx.close();

		check( 'console', 'no JavaScript errors in the browser', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 600 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall event booking checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
