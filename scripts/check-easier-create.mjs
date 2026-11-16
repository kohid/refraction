#!/usr/bin/env node
/**
 * Easier creation in Events and the Builder (0.109.0, SQLite test site, Chromium):
 * - one Events area: Events, Bookings, Categories and Event types share tabs; the old links are out of the filter row;
 * - Event types says what a type is (and points to Categories); "New event type" opens a wizard (name and address,
 *   who can use its form and what its events start as, its page designs, a last look) and ends on Event types with
 *   the type marked and "Add an event", never in the editor; the form, its settings and both page designs are made,
 *   and its address answers;
 * - the Builder's New form wizard offers "Events" (made as an event type, no layout question), and the Builder page
 *   groups event forms under "Event forms" after the other forms;
 * - ?wizard=type opens the wizard; an editor gets no Event types tab; no sideways scroll on a phone; no errors.
 *
 * Usage: node scripts/check-easier-create.mjs [--site /tmp/rf-ec-site] [--port 8944] [--shots /tmp/easier-create-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ec-site' );
const PORT = arg( 'port', '8944' );
const SHOTS = arg( 'shots', '/tmp/easier-create-shots' );
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
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 950 } } );
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		const login = async ( p, user ) => {
			await p.goto( `${ BASE }/wp-login.php` );
			await p.fill( '#user_login', user );
			await p.fill( '#user_pass', user );
			await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
		};
		await login( a, 'admin' );
		const shot = async ( name ) => { await a.screenshot( { path: join( SHOTS, name ) } ); };
		const tabs = () => a.evaluate( () => [ ...document.querySelectorAll( '.rf-section-tabs .nav-tab' ) ].map( ( t ) => ( t.classList.contains( 'nav-tab-active' ) ? '*' : '' ) + t.textContent.trim() ) );
		const next = async ( id ) => { await a.locator( `#${ id } [data-rf-wizard-next]` ).click(); await a.waitForTimeout( 300 ); };

		// ------------------------------------------------------------ one Events area
		await a.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_event`, { waitUntil: 'load' } );
		let t = await tabs();
		check( 'events area', 'the Events list has the Events, Bookings, Categories and Event types tabs, Events active', '*Events,Bookings,Categories,Event types' === t.join(), t.join() );
		const views = await a.evaluate( () => document.querySelector( '.subsubsub' )?.textContent || '' );
		check( 'events area', 'the old links and the New event button are gone from the filter row', ! /Event types and their forms|Categories and colors|New event/.test( views ), views );
		await shot( 'events-list.png' );
		for ( const [ url, want ] of [ [ '/wp-admin/edit.php?post_type=refraction_booking', '*Bookings' ], [ '/wp-admin/edit-tags.php?taxonomy=refraction_event_cat&post_type=refraction_event', '*Categories' ], [ '/wp-admin/admin.php?page=refraction-event-types', '*Event types' ] ] ) {
			await a.goto( BASE + url, { waitUntil: 'load' } );
			t = await tabs();
			check( 'events area', `${ want.slice( 1 ) }: the same tabs, this one active`, 4 === t.length && t.includes( want ), t.join() );
		}

		// ------------------------------------------------------------ Event types: empty, then the wizard
		const intro = await a.textContent( '.rfe-types__intro' );
		check( 'event types', 'the page says what a type is and points to Categories for sorting and colours', /own form, address and page design/.test( intro ) && /Categories/.test( intro ), intro );
		check( 'event types', 'with no types: an empty state with "New event type"', await a.locator( '.rfe-types__empty [data-rf-wizard-open="rf-wizard-event-type"]' ).isVisible() );
		await shot( 'types-empty.png' );
		await a.locator( '.page-title-action[data-rf-wizard-open="rf-wizard-event-type"]' ).click();
		await a.waitForTimeout( 500 );
		check( 'type wizard', '"New event type" opens the wizard on the page, not the editor', await a.locator( '#rf-wizard-event-type' ).isVisible() && /page=refraction-event-types/.test( a.url() ) );
		await next( 'rf-wizard-event-type' );
		check( 'type wizard', 'Continue without a name stays on the first step', await a.locator( '#rfw-rfe_name' ).isVisible() );
		await a.fill( '#rfw-rfe_name', 'Workshop' );
		await a.fill( '#rfw-rfe_base', 'workshops' );
		await shot( 'type-wizard-1.png' );
		await next( 'rf-wizard-event-type' );
		await a.locator( '#rf-wizard-event-type label.rf-wizard__choice:has-text("Anyone logged in")' ).click();
		await a.locator( '#rf-wizard-event-type label.rf-wizard__choice:has-text("Waiting for review")' ).click();
		await shot( 'type-wizard-2.png' );
		await next( 'rf-wizard-event-type' );
		await a.locator( 'label[for="rfw-rfe_archive"]' ).click();
		await shot( 'type-wizard-3.png' );
		await next( 'rf-wizard-event-type' );
		const review = await a.evaluate( () => [ ...document.querySelectorAll( '#rf-wizard-event-type [data-rf-wizard-review] dt' ) ].map( ( dt ) => dt.textContent + ': ' + dt.nextElementSibling.textContent ) );
		check( 'type wizard', 'the last look lists the answers', review.includes( 'Name: Workshop' ) && review.includes( 'Address: workshops' ) && review.includes( 'Form for: Anyone logged in' ) && review.includes( 'New events: Waiting for review' ), JSON.stringify( review ) );
		await shot( 'type-wizard-4.png' );
		await Promise.all( [ a.waitForURL( /rfe_type_created=/, { timeout: 60000 } ), a.locator( '#rf-wizard-event-type [data-rf-wizard-submit]' ).click() ] );
		await a.waitForLoadState( 'load' );
		const made = await a.evaluate( () => {
			const row = document.querySelector( 'tr[data-type="workshop"]' );
			return {
				url: location.href,
				notice: document.querySelector( '.rfe-type-created' )?.textContent.replace( /\s+/g, ' ' ).trim(),
				add: !! document.querySelector( '.rfe-type-created a.button-primary' ),
				marked: !! row?.classList.contains( 'is-new' ),
				cells: row ? [ ...row.cells ].slice( 1, 3 ).map( ( c ) => c.textContent.trim() ) : [],
			};
		} );
		check( 'type wizard', 'it ends on Event types (not the editor) with "Workshop is ready" and Add an event', /page=refraction-event-types/.test( made.url ) && /"Workshop" is ready/.test( made.notice || '' ) && made.add, JSON.stringify( made ) );
		check( 'type wizard', 'the new row is marked, with its address and who can use the form', made.marked && '/workshops/' === made.cells[ 0 ] && 'Anyone logged in' === made.cells[ 1 ], JSON.stringify( made ) );
		await shot( 'types-created.png' );

		const docId = wp( [ 'option', 'pluck', 'refraction_fb_editor_forms', 'workshop' ], { allowFail: true } )?.trim();
		const pageSettings = docId ? JSON.parse( wp( [ 'post', 'meta', 'get', docId, '_refraction_page_settings', '--format=json' ] ) ) : {};
		const data = docId ? wp( [ 'post', 'meta', 'get', docId, '_refraction_data' ] ) : '';
		check( 'type wizard', 'its form keeps the answers: logged in, waiting for review, /workshops/', 'logged_in' === pageSettings.rfe_who && 'pending' === pageSettings.rfe_status && 'workshops' === pageSettings.rfe_base, JSON.stringify( pageSettings ) );
		check( 'type wizard', 'its form reads "Workshop: add an event" with every event field', /Workshop: add an event/.test( data ) && /rfb-field-event-start/.test( data ) && /Add the event/.test( data ), data.slice( 0, 200 ) );
		const templates = wp( [ 'post', 'list', '--post_type=refraction_library', '--fields=post_title', '--format=csv' ] );
		check( 'type wizard', 'both page designs were made (event page and archive)', /Workshop: event page/.test( templates ) && /Workshop: archive/.test( templates ), templates );
		const archive = await ( await fetch( `${ BASE }/workshops/` ) ).status;
		check( 'type wizard', '/workshops/ answers at once', 200 === archive, String( archive ) );

		// ------------------------------------------------------------ the Builder
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-builder`, { waitUntil: 'load' } );
		await a.locator( 'a[data-rf-wizard-open="rf-wizard-form"]' ).first().click();
		await a.waitForTimeout( 400 );
		await a.fill( '#rfw-name', 'Concert' );
		await next( 'rf-wizard-form' );
		const eventsKind = a.locator( '#rf-wizard-form label.rf-wizard__choice:has-text("Each entry becomes an event")' );
		check( 'builder', 'the New form wizard offers "Events"', await eventsKind.isVisible() );
		await eventsKind.click();
		await next( 'rf-wizard-form' );
		const layoutHidden = ! ( await a.locator( '#rf-wizard-form label.rf-wizard__choice:has-text("In steps")' ).isVisible() );
		check( 'builder', 'with Events chosen the layout question is not asked', layoutHidden );
		await next( 'rf-wizard-form' );
		await Promise.all( [ a.waitForURL( /rfe_type_created=concert/, { timeout: 60000 } ), a.locator( '#rf-wizard-form [data-rf-wizard-submit]' ).click() ] );
		await a.waitForLoadState( 'load' );
		const concert = await a.evaluate( () => ( { notice: document.querySelector( '.rfe-type-created' )?.textContent || '', row: !! document.querySelector( 'tr[data-type="concert"].is-new' ), who: document.querySelector( 'tr[data-type="concert"]' )?.cells[ 2 ].textContent.trim() } ) );
		check( 'builder', '"Events" makes an event type and shows it under Event types (visitors on: anyone)', /"Concert" is ready/.test( concert.notice ) && concert.row && 'Anyone' === concert.who, JSON.stringify( concert ) );

		// A plain form beside them, then the Builder page shows the event forms in their own group.
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-builder`, { waitUntil: 'load' } );
		await a.locator( 'a[data-rf-wizard-open="rf-wizard-form"]' ).first().click();
		await a.waitForTimeout( 400 );
		await a.fill( '#rfw-name', 'Contact us' );
		await next( 'rf-wizard-form' );
		await next( 'rf-wizard-form' );
		await next( 'rf-wizard-form' );
		await Promise.all( [ a.waitForURL( /created=/, { timeout: 60000 } ), a.locator( '#rf-wizard-form [data-rf-wizard-submit]' ).click() ] );
		await a.waitForLoadState( 'load' );
		const groups = await a.evaluate( () => {
			const head = document.querySelector( '.rfb-group-head[data-group="events"]' );
			const cards = [ ...document.querySelectorAll( '.rfb-collection' ) ].map( ( c ) => [ c.dataset.collection, !! head && !! ( head.compareDocumentPosition( c ) & Node.DOCUMENT_POSITION_FOLLOWING ) ] );
			return { head: head?.textContent.replace( /\s+/g, ' ' ).trim(), link: head?.querySelector( 'a' )?.getAttribute( 'href' ), cards };
		} );
		const after = Object.fromEntries( groups.cards );
		check( 'builder', 'event forms are grouped under "Event forms" with a link to Event types; other forms come first', /Event forms/.test( groups.head || '' ) && /refraction-event-types/.test( groups.link || '' ) && true === after.workshop && true === after.concert && false === after[ 'contact-us' ], JSON.stringify( groups ) );
		await shot( 'builder-groups.png' );

		// ?wizard=type opens the wizard (the button's way in without the script, and back after a missing name).
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-event-types&wizard=type`, { waitUntil: 'load' } );
		await a.waitForTimeout( 400 );
		check( 'type wizard', '?wizard=type opens the wizard', await a.locator( '#rf-wizard-event-type' ).isVisible() );

		// An editor sees the area without Event types (only admins make types), and no "Events" in the Builder wizard.
		const ectx = await browser.newContext( { viewport: { width: 1400, height: 950 } } );
		const e = await ectx.newPage();
		await login( e, 'editor' );
		await e.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_event`, { waitUntil: 'load' } );
		const et = await e.evaluate( () => [ ...document.querySelectorAll( '.rf-section-tabs .nav-tab' ) ].map( ( x ) => x.textContent.trim() ) );
		check( 'roles', 'an editor gets Events, Bookings and Categories, not Event types', 'Events,Bookings,Categories' === et.join(), et.join() );
		await ectx.close();

		// Narrow: the tabs wrap, nothing scrolls sideways.
		await a.setViewportSize( { width: 390, height: 844 } );
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-event-types`, { waitUntil: 'load' } );
		const over = await a.evaluate( () => document.documentElement.scrollWidth - innerWidth );
		check( 'narrow', 'Event types on a phone: no sideways scroll', over <= 0, String( over ) );
		await shot( 'types-phone.png' );

		check( 'errors', 'no script errors', 0 === errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Warning|Fatal|Parse|Deprecated)|PHP Notice/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		server?.kill();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
