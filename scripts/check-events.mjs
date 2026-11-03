#!/usr/bin/env node
/**
 * Events check (SQLite test site, Chromium):
 * - Event Calendar: month grid of whole weeks (Monday first), events colored by category, an event over several days
 *   on each of them, "+ more" on a busy day, the preview card with "View event" and "Add to calendar" (Google,
 *   iCalendar, Outlook), previous / next / today, the List and Day views, search, the month picker; and a calendar
 *   limited to one category, opening on the list, weeks from Sunday.
 * - Events List: the next events in date order with a date badge; the past ones.
 * - An event's page: details box (date, time, venue, map, price, tickets, add to calendar) and schema.org Event data;
 *   /events/ works.
 * - Admin: Refraction > Events, the When and Venue columns, "New event in the editor"; the details box in the admin
 *   writes the page settings too.
 * - Editor: a new event opens with its title, Event Details and a text; its page settings (Event details) are saved
 *   as the event's details and show in the preview.
 *
 * Usage: node scripts/check-events.mjs [--site /tmp/rf-ev-site] [--port 8995] [--shots /tmp/events-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ev-site' );
const PORT = arg( 'port', '8995' );
const SHOTS = arg( 'shots', '/tmp/events-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 500 ) }` }` );
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

/** Day n days from the site's today, as Y-m-d. */
const day = ( n ) => php( `echo gmdate( 'Y-m-d', strtotime( current_time( 'Y-m-d' ) . ' UTC' ) + ${ n } * DAY_IN_SECONDS );` );

function event( title, details, category = 0, excerpt = '' ) {
	const id = wp( [ 'post', 'create', '--post_type=refraction_event', '--post_status=publish', `--post_title=${ title }`, `--post_excerpt=${ excerpt }`, '--porcelain' ] ).trim();
	php( `Refraction\\Modules\\Events\\Classes\\Event_Data::save( ${ id }, json_decode( '${ JSON.stringify( details ).replace( /'/g, "\\'" ) }', true ) );${ category ? ` wp_set_object_terms( ${ id }, [ ${ category } ], 'refraction_event_cat' );` : '' }` );
	return id;
}

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) {
			await sleep( 200 );
		}
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];
	const watch = ( p ) => {
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		p.on( 'console', ( m ) => {
			if ( 'error' === m.type() && ! /favicon/.test( m.location().url ) ) {
				errors.push( `${ m.text() } @ ${ m.location().url }` );
			}
		} );
	};
	const visit = async ( url, width = 1280, height = 1000 ) => {
		const ctx = await browser.newContext( { viewport: { width, height } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( url );
		return { ctx, p };
	};

	try {
		wp( [ 'option', 'update', 'start_of_week', '1' ] );
		wp( [ 'option', 'update', 'time_format', 'H:i' ] );
		wp( [ 'option', 'update', 'permalink_structure', '/%postname%/' ] );
		const music = Number( wp( [ 'term', 'create', 'refraction_event_cat', 'Music', '--porcelain' ] ).trim() );
		const workshops = Number( wp( [ 'term', 'create', 'refraction_event_cat', 'Workshops', '--porcelain' ] ).trim() );
		php( `update_term_meta( ${ music }, '_rfe_color', '#c0392b' );` );

		const today = day( 0 );
		const busy = day( 3 );
		const nextMonth = php( `echo gmdate( 'Y-m-01', strtotime( gmdate( 'Y-m-01', strtotime( current_time( 'Y-m-d' ) . ' UTC' ) ) . ' +1 month UTC' ) );` );
		const jazz = event( 'Jazz Night', { start: `${ today } 19:00`, end: `${ today } 23:59`, venue: 'Eden Court', address: 'Bishops Road\nInverness', price: '£12', ticket_url: 'https://example.com/tickets', ticket_label: 'Book seats', organizer: 'City Jazz Club' }, music, 'A night of live jazz.' );
		event( 'Pottery Workshop', { start: `${ today } 10:00`, end: `${ today } 12:00`, venue: 'Studio 5' }, workshops );
		event( 'Food Festival', { start: `${ day( -1 ) } 00:00`, end: `${ day( 1 ) } 23:59`, all_day: 'yes' } );
		[ 'Talk A', 'Talk B', 'Talk C', 'Talk D' ].forEach( ( t, i ) => event( t, { start: `${ busy } 0${ 1 + i }:00`, end: `${ busy } 0${ 2 + i }:00` }, workshops ) );
		event( 'Winter Market', { start: `${ nextMonth } 09:00`, end: `${ nextMonth } 17:00` }, music );
		event( 'Old Show', { start: `${ day( -40 ) } 20:00`, end: `${ day( -40 ) } 22:00` }, music );
		event( 'No Date Yet', {} );

		const calPage = page( 'Calendar', wrap( 'a', [ { id: 'cal1', elType: 'widget', widgetType: 'refraction-event-calendar', settings: {}, elements: [] } ] ) );
		const listPage = page( 'Upcoming', wrap( 'b', [
			{ id: 'lst1', elType: 'widget', widgetType: 'refraction-events-list', settings: { count: 4 }, elements: [] },
			{ id: 'lst2', elType: 'widget', widgetType: 'refraction-events-list', settings: { which: 'past', layout: 'rows' }, elements: [] },
			{ id: 'cal2', elType: 'widget', widgetType: 'refraction-event-calendar', settings: { categories: [ String( music ) ], default_view: 'list', week_start: '0' }, elements: [] },
		] ) );

		// ------------------------------------------------------------ calendar: month
		const { ctx, p } = await visit( calPage.url );
		await p.waitForSelector( '.rf-cal-grid' );
		const cell = ( date ) => `[data-id="cal1"] .rf-cal-cell[data-date="${ date }"]`;
		const month = await p.evaluate( ( [ t, sel ] ) => {
			const titles = ( d ) => Array.from( document.querySelectorAll( `[data-id="cal1"] .rf-cal-cell[data-date="${ d }"] .rf-cal-ev-title` ) ).map( ( e ) => e.textContent );
			const jazz = Array.from( document.querySelectorAll( '[data-id="cal1"] .rf-cal-ev' ) ).find( ( e ) => /Jazz/.test( e.textContent ) );
			return {
				title: document.querySelector( '[data-id="cal1"] .rf-cal-title-text' ).textContent,
				dows: Array.from( document.querySelectorAll( '[data-id="cal1"] .rf-cal-dow' ) ).map( ( e ) => e.textContent.trim() ),
				weeks: document.querySelectorAll( '[data-id="cal1"] .rf-cal-week:not(.rf-cal-dows)' ).length,
				cells: document.querySelectorAll( '[data-id="cal1"] .rf-cal-cell' ).length,
				today: titles( t ),
				todayClass: document.querySelector( sel ).className,
				jazzColor: jazz && jazz.style.getPropertyValue( '--ev' ),
				jazzTime: jazz && jazz.querySelector( '.rf-cal-ev-time' )?.textContent,
			};
		}, [ today, cell( today ) ] );
		check( 'calendar', 'opens on this month, weeks from Monday, whole weeks', /\d{4}$/.test( month.title ) && 'Mon' === month.dows[ 0 ] && 7 * month.weeks === month.cells && month.cells >= 28, JSON.stringify( month ) );
		check( 'calendar', 'today is marked and holds its events, the all-day festival first', /is-today/.test( month.todayClass ) && 'Food Festival' === month.today[ 0 ] && month.today.includes( 'Jazz Night' ) && month.today.includes( 'Pottery Workshop' ), JSON.stringify( month.today ) );
		check( 'calendar', 'an event takes its category\'s color and shows its start time', '#c0392b' === month.jazzColor && '19:00' === month.jazzTime, JSON.stringify( month ) );
		const festival = await p.evaluate( ( days ) => days.map( ( d ) => document.querySelector( `[data-id="cal1"] .rf-cal-cell[data-date="${ d }"] .rf-cal-ev.is-multi` )?.className || '' ), [ day( -1 ), today, day( 1 ) ] );
		check( 'calendar', 'the festival over three days shows on each, joined from start to end', /is-mstart/.test( festival[ 0 ] ) && ! /is-m(start|end)/.test( festival[ 1 ] ) && /is-mend/.test( festival[ 2 ] ), JSON.stringify( festival ) );

		if ( await p.locator( cell( busy ) ).count() ) {
			const more = async () => p.evaluate( ( sel ) => ( { shown: Array.from( document.querySelectorAll( sel + ' .rf-cal-ev' ) ).filter( ( e ) => ! e.hidden ).length, label: document.querySelector( sel + ' .rf-cal-more-show' )?.textContent } ), cell( busy ) );
			const before = await more();
			await p.click( cell( busy ) + ' .rf-cal-more' );
			const after = await more();
			check( 'calendar', 'a busy day shows three and "+ 1 more", which opens the fourth', 3 === before.shown && '+ 1 more' === before.label && 4 === after.shown, JSON.stringify( [ before, after ] ) );
		}

		// the preview card
		await p.hover( `${ cell( today ) } .rf-cal-ev >> text=Jazz Night` );
		await p.waitForSelector( '.rf-cal-pop.is-shown' );
		const card = await p.evaluate( () => {
			const pop = document.querySelector( '.rf-cal-pop' );
			return { title: pop.querySelector( '.rf-cal-pop-title' ).textContent, time: pop.querySelector( '.rf-cal-pop-time' ).textContent, venue: pop.querySelector( '.rf-cal-pop-venue' )?.textContent, view: pop.querySelector( '.rf-cal-pop-view' ).getAttribute( 'href' ), ex: pop.querySelector( '.rf-cal-pop-ex' )?.textContent, accent: getComputedStyle( pop ).getPropertyValue( '--rf-cal-warm' ).trim() };
		} );
		check( 'card', 'hovering an event shows its card: time, title, venue, text, link to its page', 'Jazz Night' === card.title && /19:00 – 23:59/.test( card.time ) && 'Eden Court' === card.venue && 'A night of live jazz.' === card.ex && /jazz-night/.test( card.view ), JSON.stringify( card ) );
		await p.hover( '.rf-cal-pop .rf-cal-addcal-toggle' );
		await p.click( '.rf-cal-pop .rf-cal-addcal-toggle' );
		const links = await p.evaluate( () => Array.from( document.querySelectorAll( '.rf-cal-pop .rf-cal-addcal-menu.is-open a' ) ).map( ( a ) => [ a.textContent, a.getAttribute( 'href' ).slice( 0, 160 ), a.getAttribute( 'download' ) ] ) );
		const google = links.find( ( l ) => /Google/.test( l[ 0 ] ) );
		const ics = links.find( ( l ) => /ics/.test( l[ 0 ] ) );
		check( 'card', '"Add to calendar" opens Google, iCalendar and two Outlook links', 4 === links.length && google && /calendar\.google\.com.*text=Jazz\+Night/.test( google[ 1 ] ) && ics && /^data:text\/calendar/.test( ics[ 1 ] ) && 'event.ics' === ics[ 2 ], JSON.stringify( links ) );
		await p.screenshot( { path: join( SHOTS, 'calendar-month.png' ), fullPage: true } );
		await p.mouse.move( 5, 5 );
		await sleep( 500 );

		// moving around
		const title = () => p.locator( '[data-id="cal1"] .rf-cal-title-text' ).textContent();
		const first = await title();
		await p.click( '[data-id="cal1"] .rf-cal-next' );
		await p.waitForFunction( ( t ) => document.querySelector( '[data-id="cal1"] .rf-cal-title-text' ).textContent !== t, first );
		await p.waitForFunction( () => ! document.querySelector( '[data-id="cal1"] .rf-cal' ).classList.contains( 'is-loading' ) );
		check( 'calendar', 'Next shows the next month and its events, without reloading the page', await p.locator( `[data-id="cal1"] .rf-cal-cell[data-date="${ nextMonth }"] .rf-cal-ev-title`, { hasText: 'Winter Market' } ).count() === 1, await title() );
		await p.click( '[data-id="cal1"] .rf-cal-today-btn' );
		await p.waitForFunction( ( t ) => document.querySelector( '[data-id="cal1"] .rf-cal-title-text' ).textContent === t, first );
		check( 'calendar', 'Today comes back', first === await title() );

		await p.click( '[data-id="cal1"] .rf-cal-view[data-view="list"]' );
		const list = await p.evaluate( () => ( { shown: ! document.querySelector( '[data-id="cal1"] .rf-cal-agenda' ).hidden, grid: document.querySelector( '[data-id="cal1"] .rf-cal-month' ).hidden, titles: Array.from( document.querySelectorAll( '[data-id="cal1"] .rf-cal-agenda-title' ) ).map( ( e ) => e.textContent ) } ) );
		check( 'calendar', 'List shows the month by day', list.shown && list.grid && list.titles.includes( 'Jazz Night' ) && list.titles.includes( 'Talk D' ), JSON.stringify( list ) );
		await p.click( '[data-id="cal1"] .rf-cal-view[data-view="day"]' );
		const dayView = await p.evaluate( () => ( { title: document.querySelector( '[data-id="cal1"] .rf-cal-title-text' ).textContent, items: Array.from( document.querySelectorAll( '[data-id="cal1"] .rf-cal-day:not([hidden]) .rf-cal-day-title' ) ).map( ( e ) => e.textContent ) } ) );
		check( 'calendar', 'Day shows today\'s timeline under the date', 3 === dayView.items.length && dayView.items.includes( 'Pottery Workshop' ) && ! /^\w+ \d{4}$/.test( dayView.title ), JSON.stringify( dayView ) );
		await p.click( '[data-id="cal1"] .rf-cal-next' );
		await p.waitForFunction( ( t ) => document.querySelector( '[data-id="cal1"] .rf-cal-title-text' ).textContent !== t, dayView.title );
		check( 'calendar', 'Next in the Day view moves one day', ( await p.locator( '[data-id="cal1"] .rf-cal-day .rf-cal-day-title' ).allTextContents() ).join() === 'Food Festival', ( await p.locator( '[data-id="cal1"] .rf-cal-day .rf-cal-day-title' ).allTextContents() ).join() );
		await p.click( '[data-id="cal1"] .rf-cal-view[data-view="month"]' );
		await p.click( '[data-id="cal1"] .rf-cal-today-btn' );
		await sleep( 800 );

		await p.fill( '[data-id="cal1"] .rf-cal-q', 'jazz' );
		await p.click( '[data-id="cal1"] .rf-cal-find' );
		await p.waitForFunction( () => document.querySelectorAll( '[data-id="cal1"] .rf-cal-month .rf-cal-ev' ).length === 1, null, { timeout: 8000 } ).catch( () => {} );
		check( 'calendar', 'searching "jazz" leaves only Jazz Night', ( await p.locator( '[data-id="cal1"] .rf-cal-month .rf-cal-ev-title' ).allTextContents() ).join() === 'Jazz Night', ( await p.locator( '[data-id="cal1"] .rf-cal-month .rf-cal-ev-title' ).allTextContents() ).join() );
		await p.fill( '[data-id="cal1"] .rf-cal-q', '' );
		await p.click( '[data-id="cal1"] .rf-cal-find' );
		await sleep( 1200 );

		await p.click( '[data-id="cal1"] .rf-cal-title' );
		const picker = await p.evaluate( () => ( { open: document.querySelector( '[data-id="cal1"] .rf-cal-picker' ).classList.contains( 'is-open' ), days: document.querySelectorAll( '[data-id="cal1"] .rf-cal-pk-day' ).length } ) );
		check( 'calendar', 'the title opens a month picker', picker.open && 42 === picker.days, JSON.stringify( picker ) );
		await p.click( '[data-id="cal1"] .rf-cal-pk-next' );
		await p.click( `[data-id="cal1"] .rf-cal-pk-day[data-date="${ nextMonth }"]` );
		await p.waitForFunction( ( d ) => document.querySelector( '[data-id="cal1"] .rf-cal' ).dataset.date === d, nextMonth );
		check( 'calendar', 'picking a day there goes to its month', ! await p.locator( '[data-id="cal1"] .rf-cal-picker' ).evaluate( ( e ) => e.classList.contains( 'is-open' ) ) && 1 === await p.locator( '[data-id="cal1"] .rf-cal-ev-title', { hasText: 'Winter Market' } ).count() );
		await ctx.close();

		const phone = await visit( calPage.url, 390, 844 );
		await phone.p.waitForSelector( '.rf-cal-grid' );
		const fits = await phone.p.evaluate( () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 );
		check( 'calendar', 'on a phone the month fits the screen', fits );
		await phone.p.screenshot( { path: join( SHOTS, 'calendar-phone.png' ), fullPage: true } );
		await phone.ctx.close();

		// ------------------------------------------------------------ list page
		const l = await visit( listPage.url );
		const lists = await l.p.evaluate( () => ( {
			next: Array.from( document.querySelectorAll( '[data-id="lst1"] .rf-el-title' ) ).map( ( e ) => e.textContent.trim() ),
			badge: document.querySelector( '[data-id="lst1"] .rf-el-item:nth-child(2) .rf-el-badge' ) && getComputedStyle( document.querySelector( '[data-id="lst1"] .rf-el-item:nth-child(2) .rf-el-badge' ) ).backgroundColor,
			past: Array.from( document.querySelectorAll( '[data-id="lst2"] .rf-el-title' ) ).map( ( e ) => e.textContent.trim() ),
			cal: Array.from( document.querySelectorAll( '[data-id="cal2"] .rf-cal-agenda:not([hidden]) .rf-cal-agenda-title' ) ).map( ( e ) => e.textContent ),
			dow: document.querySelector( '[data-id="cal2"] .rf-cal-dow' ).textContent.trim(),
		} ) );
		// Events that ended earlier today are not "upcoming" any more.
		const potteryOver = php( "echo current_time( 'H:i' );" ) > '12:00';
		const expected = potteryOver ? 'Food Festival,Jazz Night,Talk A,Talk B' : 'Food Festival,Pottery Workshop,Jazz Night,Talk A';
		check( 'list', 'Events List: the next four not ended yet, the one happening now first, in date order', expected === lists.next.join(), lists.next.join() );
		check( 'list', 'the date badge takes the category color', 'rgb(43, 99, 68)' !== lists.badge && !! lists.badge, lists.badge );
		check( 'list', 'past events: the old show', lists.past.includes( 'Old Show' ) && ! lists.past.includes( 'Winter Market' ) && ! lists.past.includes( 'Food Festival' ), lists.past.join() );
		check( 'list', 'a calendar of Music only opens on its list, weeks from Sunday', 'Jazz Night' === lists.cal.join() && 'Sun' === lists.dow, JSON.stringify( lists ) );
		await l.p.screenshot( { path: join( SHOTS, 'list.png' ), fullPage: true } );
		await l.ctx.close();

		// ------------------------------------------------------------ an event's page
		const jazzUrl = php( `echo get_permalink( ${ jazz } );` );
		const e = await visit( jazzUrl );
		const ev = await e.p.evaluate( () => {
			const schema = Array.from( document.querySelectorAll( 'script[type="application/ld+json"]' ) ).map( ( s ) => JSON.parse( s.textContent ) ).find( ( s ) => 'Event' === s[ '@type' ] );
			const box = document.querySelector( '.rf-ed' );
			return {
				rows: box ? Array.from( box.querySelectorAll( '.rf-ed-label' ) ).map( ( x ) => x.textContent ) : [],
				text: box ? box.textContent.replace( /\s+/g, ' ' ) : '',
				tickets: box?.querySelector( '.rf-ed-tickets' )?.getAttribute( 'href' ),
				map: box?.querySelector( '.rf-ed-map' )?.getAttribute( 'href' ),
				cal: box ? box.querySelectorAll( '.rf-ed-addcal-menu a' ).length : 0,
				schema,
			};
		} );
		check( 'event page', 'an event shows its details: date, time, place, price, organizer', 'Date,Time,Where,Price,Organizer' === ev.rows.join() && /Eden Court/.test( ev.text ) && /£12/.test( ev.text ) && /Book seats/.test( ev.text ), JSON.stringify( ev.rows ) + ev.text.slice( 0, 200 ) );
		check( 'event page', 'tickets, map and four "add to calendar" links', 'https://example.com/tickets' === ev.tickets && /google\.com\/maps.*Eden%20Court/.test( ev.map ) && 4 === ev.cal, JSON.stringify( [ ev.tickets, ev.map, ev.cal ] ) );
		check( 'event page', 'schema.org Event data with the start, place and tickets', ev.schema && 'Jazz Night' === ev.schema.name && new RegExp( today + 'T19:00:00[+-]\\d\\d:\\d\\d' ).test( ev.schema.startDate ) && 'Eden Court' === ev.schema.location.name && 'https://example.com/tickets' === ev.schema.offers.url, JSON.stringify( ev.schema ) );
		await e.p.screenshot( { path: join( SHOTS, 'event-page.png' ), fullPage: true } );
		const archive = await e.p.goto( `${ BASE }/events/` );
		check( 'event page', '/events/ lists the events', 200 === archive.status() && ( await e.p.content() ).includes( 'Jazz Night' ), String( archive.status() ) );
		await e.ctx.close();

		// ------------------------------------------------------------ admin
		const actx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
		const admin = await actx.newPage();
		watch( admin );
		await admin.goto( `${ BASE }/wp-login.php` );
		await admin.fill( '#user_login', 'admin' );
		await admin.fill( '#user_pass', 'admin' );
		await Promise.all( [ admin.waitForURL( /wp-admin/, { timeout: 60000 } ), admin.click( '#wp-submit' ) ] );
		await admin.goto( `${ BASE }/wp-admin/admin.php?page=refraction-home` ).catch( () => {} );
		const menu = await admin.evaluate( () => Array.from( document.querySelectorAll( '#adminmenu a' ) ).filter( ( a ) => /post_type=refraction_event/.test( a.getAttribute( 'href' ) || '' ) ).map( ( a ) => a.textContent.trim() ) );
		check( 'admin', 'Refraction > Events is in the admin menu', menu.includes( 'Events' ), JSON.stringify( menu ) );
		await admin.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_event` );
		const table = await admin.evaluate( () => ( { heads: Array.from( document.querySelectorAll( 'thead th' ) ).map( ( t ) => t.textContent.trim() ), when: document.querySelector( 'td.column-rfe_when' )?.textContent, newLink: document.querySelector( '.subsubsub a.button-primary' )?.getAttribute( 'href' ) } ) );
		check( 'admin', 'the events table has When and Venue, and "New event in the editor"', table.heads.some( ( h ) => h.startsWith( 'When' ) ) && table.heads.includes( 'Venue' ) && /action=refraction_new_post.*post_type=refraction_event/.test( table.newLink || '' ), JSON.stringify( table ) );
		const synced = JSON.parse( php( `wp_set_current_user( 1 ); $_POST = [ '_rfe_nonce' => wp_create_nonce( 'refraction_event_details' ), 'rfe' => [ 'start' => '2030-05-01T18:30', 'end' => '', 'venue' => 'Town Hall', 'price' => 'Free' ] ]; Refraction\\Plugin::$instance->modules_manager->get_modules( 'events' )->save_meta_box( ${ jazz } ); $s = get_post_meta( ${ jazz }, '_refraction_page_settings', true ); echo wp_json_encode( [ Refraction\\Modules\\Events\\Classes\\Event_Data::get( ${ jazz } ), $s['rfe_start'] ?? null, $s['rfe_venue'] ?? null ] );` ) );
		check( 'admin', 'the admin details box saves the details and the editor\'s page settings', '2030-05-01 18:30' === synced[ 0 ].start && '2030-05-01 18:30' === synced[ 0 ].end && 'Town Hall' === synced[ 0 ].venue && '2030-05-01 18:30' === synced[ 1 ] && 'Town Hall' === synced[ 2 ], JSON.stringify( synced ) );

		// ------------------------------------------------------------ editor: a new event
		await admin.goto( table.newLink );
		await admin.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
		await sleep( 2500 );
		const starter = await admin.evaluate( () => {
			const doc = refraction.documents.getCurrent();
			const kids = doc.container.children[ 0 ].children;
			return { type: refraction.config.document.type, widgets: kids.map( ( c ) => c.model.get( 'widgetType' ) ), dynamic: String( kids[ 0 ].settings.get( '__dynamic__' )?.title || '' ) };
		} );
		check( 'editor', 'a new event opens in the editor with its title, Event Details and a text', 'refraction-event' === starter.type && 'heading,refraction-event-details,text-editor' === starter.widgets.join() && /name="post-title"/.test( starter.dynamic ), JSON.stringify( starter ) );
		await admin.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await sleep( 800 );
		const sections = await admin.$$eval( '.refraction-section-title', ( els ) => els.filter( ( x ) => x.offsetParent ).map( ( x ) => x.textContent.trim() ) );
		check( 'editor', 'its page settings have Event details', sections.includes( 'Event details' ), sections.join( '|' ) );
		await admin.evaluate( async ( cat ) => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Harbour Concert', rfe_start: '2031-07-04 20:00', rfe_end: '2031-07-04 23:00', rfe_venue: 'The Harbour', rfe_price: '£5', rfe_categories: [ String( cat ) ] } } );
			await $e.run( 'document/save/publish' );
		}, music );
		await sleep( 3500 );
		const newId = await admin.evaluate( () => refraction.config.document.id );
		const saved = JSON.parse( php( `echo wp_json_encode( [ Refraction\\Modules\\Events\\Classes\\Event_Data::get( ${ newId } ), wp_get_object_terms( ${ newId }, 'refraction_event_cat', [ 'fields' => 'names' ] ), get_post_status( ${ newId } ) ] );` ) );
		check( 'editor', 'saving writes the event\'s details and category', '2031-07-04 20:00' === saved[ 0 ].start && 'The Harbour' === saved[ 0 ].venue && 'Music' === saved[ 1 ].join() && 'publish' === saved[ 2 ], JSON.stringify( saved ) );
		const newUrl = php( `echo get_permalink( ${ newId } );` );
		const n = await visit( newUrl );
		const built = await n.p.evaluate( () => ( { h1: document.querySelector( '.refraction-widget-heading .refraction-heading-title' )?.textContent, rows: document.querySelectorAll( '.refraction-widget-refraction-event-details .rf-ed-row' ).length, written: /Written by/.test( document.body.textContent ), template: document.body.className, text: document.querySelector( '.refraction-widget-refraction-event-details' )?.textContent.replace( /\s+/g, ' ' ) } ) );
		check( 'editor', 'on the site: the event\'s own title (full-width template, no theme title) and its details box', 'Harbour Concert' === built.h1 && ! built.written && /refraction-template-full-width|page-template-refraction_header_footer/.test( built.template ) && built.rows >= 3 && /The Harbour/.test( built.text ) && /£5/.test( built.text ), JSON.stringify( built ) );
		await n.p.screenshot( { path: join( SHOTS, 'built-event.png' ), fullPage: true } );
		await n.ctx.close();

		// the calendar in the editor preview
		await admin.goto( `${ BASE }/wp-admin/post.php?post=${ calPage.id }&action=refraction` );
		await admin.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
		await sleep( 3000 );
		const frame = admin.frame( { name: 'refraction-preview-iframe' } );
		const before = await frame.locator( '.rf-cal-title-text' ).textContent();
		await frame.click( '.rf-cal-next' );
		await frame.waitForFunction( ( t ) => document.querySelector( '.rf-cal-title-text' ).textContent !== t, before, { timeout: 8000 } ).catch( () => {} );
		check( 'editor', 'the calendar works in the editor preview', before !== await frame.locator( '.rf-cal-title-text' ).textContent() );
		const cats = await admin.evaluate( () => refraction.widgetsCache[ 'refraction-event-calendar' ]?.categories );
		check( 'editor', 'the event widgets are in their own Events category', Array.isArray( cats ) && cats.includes( 'refraction-events' ), JSON.stringify( cats ) );
		await admin.screenshot( { path: join( SHOTS, 'editor-calendar.png' ) } );
		await actx.close();

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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall events checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
