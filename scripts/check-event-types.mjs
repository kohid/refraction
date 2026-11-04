#!/usr/bin/env node
/**
 * Event types check (SQLite test site, Chromium):
 * - Refraction > Event types: "New event type" makes a Form page with every event field and opens it in the editor;
 *   the Event Form fields are offered on Form pages (not on ordinary pages); the page settings have Events.
 * - The form on a page (Form Canvas): staff only (a visitor is asked to log in, a subscriber is refused); a member of
 *   staff fills every field (name, start, end, category, venue, address, price, total amount, ticket limit, tickets per
 *   person, organizer, ticket and payment links, picture, description) and sends it: an event of that type is made with
 *   all of it, its picture as featured image, and a page showing the details, Tickets and Pay buttons; the success
 *   message links to it. A category added later is offered by the form at once.
 * - Event Calendar and Events List show only the types chosen; an event type can copy the page of a designed event.
 *
 * Usage: node scripts/check-event-types.mjs [--site /tmp/rf-et-site] [--port 8994] [--shots /tmp/event-types-shots]
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
const SITE = arg( 'site', '/tmp/rf-et-site' );
const PORT = arg( 'port', '8994' );
const SHOTS = arg( 'shots', '/tmp/event-types-shots' );
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
		// ...and the profile page's password strength script (where a subscriber lands after logging in).
		p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && ! /user-profile/.test( String( e.stack ) ) && errors.push( `${ e.message } @ ${ p.url() } ${ String( e.stack || '' ).split( '\n' ).slice( 1, 4 ).join( ' ' ) }` ) );
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

	try {
		wp( [ 'option', 'update', 'time_format', 'H:i' ] );
		wp( [ 'option', 'update', 'permalink_structure', '/%postname%/' ] );
		wp( [ 'user', 'create', 'staffer', 'staffer@example.com', '--role=editor', '--user_pass=staffer' ] );
		wp( [ 'user', 'create', 'member', 'member@example.com', '--role=subscriber', '--user_pass=member' ] );
		const music = Number( wp( [ 'term', 'create', 'refraction_event_cat', 'Music', '--porcelain' ] ).trim() );
		const dir = join( tmpdir(), `rfet-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=#aa3355:size=800x500', '-frames:v', '1', join( dir, 'poster.png' ) ] );

		// ------------------------------------------------------------ a new event type
		const admin = await login( 'admin', 'admin' );
		await admin.p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-event-types` );
		check( 'admin', 'Refraction > Event types lists none yet', /No event types yet/.test( await admin.p.textContent( '.wrap' ) ) );
		await admin.p.fill( '#rfe-name', 'Workshop' );
		await Promise.all( [ admin.p.waitForURL( /action=refraction/, { timeout: 90000 } ), admin.p.click( '.rfe-new-type button' ) ] );
		await admin.p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
		await sleep( 2500 );
		const editor = await admin.p.evaluate( () => {
			const doc = refraction.documents.getCurrent();
			const types = [];
			const walk = ( c ) => {
				if ( 'widget' === c.model.get( 'elType' ) ) {
					types.push( c.model.get( 'widgetType' ) );
				}
				c.children.forEach( walk );
			};
			walk( doc.container );
			const start = refraction.widgetsCache[ 'rfb-field-event-start' ];
			return { type: refraction.config.document.type, widgets: types, cat: start?.categories, show: start?.show_in_panel };
		} );
		const wanted = [ 'title', 'start', 'end', 'all-day', 'category', 'venue', 'organizer', 'address', 'price', 'total-amount', 'ticket-limit', 'tickets-per-person', 'button', 'image', 'description' ];
		check( 'editor', '"New event type" opens a Form page with every event field and a Submit button', 'rfb-form' === editor.type && wanted.every( ( w ) => editor.widgets.includes( 'rfb-field-event-' + w ) ) && 3 === editor.widgets.filter( ( w ) => 'rfb-field-event-button' === w ).length, JSON.stringify( editor.widgets ) );
		check( 'editor', 'the event fields are in the Event Form category of a Form page', editor.cat && editor.cat.includes( 'refraction-event-fields' ) && false !== editor.show, JSON.stringify( editor ) );
		await admin.p.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await sleep( 800 );
		const cog = await admin.p.$$eval( '.refraction-section-title', ( els ) => els.filter( ( x ) => x.offsetParent ).map( ( x ) => x.textContent.trim() ) );
		check( 'editor', 'its page settings have Events (who may use it, status, page design)', cog.includes( 'Events' ), cog.join( '|' ) );
		await admin.p.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Workshop', rfb_singular: 'Workshop', rfb_min_seconds: 0, rfb_currency_symbol: '£' } } );
			await $e.run( 'document/save/publish' );
		} );
		await sleep( 3500 );
		const docId = await admin.p.evaluate( () => refraction.config.document.id );
		await admin.p.screenshot( { path: join( SHOTS, 'editor-form.png' ) } );
		const slug = php( `echo get_post_meta( ${ docId }, '_rfb_collection', true );` );
		const types = JSON.parse( php( 'echo wp_json_encode( Refraction\\Modules\\Events\\Classes\\Event_Types::types() );' ) );
		check( 'editor', 'saved, the form is the event type "Workshop"', 'workshop' === slug && 'Workshop' === types.workshop, JSON.stringify( [ slug, types ] ) );
		const keys = JSON.parse( php( `$d = ( new Refraction\\Modules\\FormBuilder\\Classes\\Collections() )->get( '${ slug }' ); echo wp_json_encode( array_column( Refraction\\Modules\\FormBuilder\\Classes\\Schema::walk( $d['fields'] ), 'key' ) );` ) );
		check( 'editor', 'its fields are the event details (the Submit button is not a field)', [ 'event_title', 'event_start', 'event_end', 'event_all_day', 'event_category', 'event_ticket_limit', 'event_tickets_per_person', 'event_total_amount', 'event_ticket_url', 'event_payment_url', 'event_image', 'event_description' ].every( ( k ) => keys.includes( k ) ) && 16 === keys.length, keys.join() );
		await admin.p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-event-types` );
		check( 'admin', 'the type is listed with links to design and use its form', 1 === await admin.p.locator( 'tr[data-type="workshop"] a:has-text("Design the form")' ).count() );

		// A category made after the form: offered at once.
		const later = Number( wp( [ 'term', 'create', 'refraction_event_cat', 'Late Category', '--porcelain' ] ).trim() );

		// ------------------------------------------------------------ the form on a page
		const formPage = page( 'Add event', wrap( 'f', [ { id: 'fcan', elType: 'widget', widgetType: 'rfb-form-canvas', settings: { form: slug, title: 'Add an event' }, elements: [] } ] ) );
		const visitor = await browser.newContext();
		const vp = await visitor.newPage();
		await vp.goto( formPage.url );
		check( 'access', 'a visitor is asked to log in (staff only)', /log in/i.test( await vp.locator( '.rfb-canvas' ).textContent() ) && 0 === await vp.locator( 'form[data-rfb-form]' ).count() );
		await visitor.close();
		const member = await login( 'member', 'member' );
		await member.p.goto( formPage.url );
		check( 'access', 'a subscriber is told it is for staff only', /only for the site's staff/.test( await member.p.locator( '.rfb-canvas' ).textContent() ) );
		await member.ctx.close();

		const staff = await login( 'staffer', 'staffer' );
		const sp = staff.p;
		await sp.goto( formPage.url );
		const options = await sp.$$eval( 'select[name="values[event_category]"] option', ( o ) => o.map( ( x ) => x.textContent.trim() ) );
		check( 'form', 'the category field offers every category, the one added later too', options.includes( 'Music' ) && options.includes( 'Late Category' ), options.join( '|' ) );
		await sp.fill( '[name="values[event_title]"]', 'Clay Basics' );
		await sp.fill( '[name="values[event_start]"]', '2031-03-14T10:00' );
		await sp.fill( '[name="values[event_end]"]', '2031-03-14T13:30' );
		await sp.selectOption( 'select[name="values[event_category]"]', String( later ) );
		await sp.fill( '[name="values[event_venue]"]', 'Studio 5' );
		await sp.fill( '[name="values[event_organizer]"]', 'Clay Club' );
		await sp.fill( '[name="values[event_address]"]', '1 High Street' );
		await sp.fill( '[name="values[event_price]"]', '£40' );
		await sp.fill( '[name="values[event_total_amount]"]', '1250.5' );
		await sp.fill( '[name="values[event_ticket_limit]"]', '100' );
		await sp.fill( '[name="values[event_tickets_per_person]"]', '4' );
		await sp.fill( '[name="values[event_ticket_url]"]', 'https://example.com/tickets' );
		await sp.fill( '[name="values[event_payment_url]"]', 'https://example.com/pay' );
		await sp.setInputFiles( '[data-rfb-key="event_image"] input[type=file]', join( dir, 'poster.png' ) );
		await sp.fill( '[name="values[event_description]"]', 'Learn to throw a pot.' );
		await sp.screenshot( { path: join( SHOTS, 'form.png' ), fullPage: true } );
		await Promise.all( [ sp.waitForNavigation( { timeout: 30000 } ), sp.click( 'form[data-rfb-form] button.rfb-submit' ) ] );
		const done = await sp.locator( '.rfb-alert' ).allTextContents();
		const link = await sp.locator( '.rfe-made-link' ).getAttribute( 'href' ).catch( () => '' );
		check( 'form', 'sent: the success message links to the new event', /View the event/.test( done.join() ) && /clay-basics/.test( link || '' ), done.join() + ' ' + link );

		const made = JSON.parse( php( `$p = get_posts( [ 'post_type' => 'refraction_event', 'title' => 'Clay Basics', 'post_status' => 'any', 'numberposts' => 1 ] ); $id = $p[0]->ID ?? 0; echo wp_json_encode( [ 'id' => $id, 'status' => get_post_status( $id ), 'author' => (int) get_post_field( 'post_author', $id ), 'data' => Refraction\\Modules\\Events\\Classes\\Event_Data::get( $id ), 'cats' => wp_get_object_terms( $id, 'refraction_event_cat', [ 'fields' => 'names' ] ), 'thumb' => (int) get_post_thumbnail_id( $id ), 'excerpt' => get_post_field( 'post_excerpt', $id ), 'built' => get_post_meta( $id, '_refraction_edit_mode', true ) ] );` ) );
		const staffId = Number( php( "echo get_user_by( 'login', 'staffer' )->ID;" ) );
		check( 'event', 'an event of the type, published, by the member of staff', made.id && 'publish' === made.status && staffId === made.author && 'workshop' === made.data.type, JSON.stringify( made ) );
		check( 'event', 'with every detail from the form', '2031-03-14 10:00' === made.data.start && '2031-03-14 13:30' === made.data.end && 'Studio 5' === made.data.venue && '1 High Street' === made.data.address && '£40' === made.data.price && '100' === made.data.ticket_limit && '4' === made.data.tickets_per_person && '£1,250.50' === made.data.total_amount && 'Clay Club' === made.data.organizer && 'https://example.com/tickets' === made.data.ticket_url && 'https://example.com/pay' === made.data.payment_url && 'Get tickets' === made.data.ticket_label && 'Pay now' === made.data.payment_label, JSON.stringify( made.data ) );
		check( 'event', 'its category, picture (featured image) and description', 'Late Category' === made.cats.join() && made.thumb > 0 && 'Learn to throw a pot.' === made.excerpt && 'builder' === made.built, JSON.stringify( made ) );
		await sp.goto( link );
		const shown = await sp.evaluate( () => {
			const box = document.querySelector( '.rf-ed' );
			return {
				h1: document.querySelector( '.refraction-widget-heading .refraction-heading-title' )?.textContent,
				img: !! document.querySelector( '.refraction-widget-image img[src*="poster"]' ),
				text: box ? box.textContent.replace( /\s+/g, ' ' ) : '',
				buttons: box ? Array.from( box.querySelectorAll( '.rf-ed-tickets' ) ).map( ( a ) => [ a.textContent.trim(), a.getAttribute( 'href' ) ] ) : [],
				desc: /Learn to throw a pot\./.test( document.body.textContent ),
			};
		} );
		check( 'event page', 'its page: title, picture, description', 'Clay Basics' === shown.h1 && shown.img && shown.desc, JSON.stringify( shown ) );
		check( 'event page', 'details with tickets, per person and the total amount', /100 tickets, up to 4 per person/.test( shown.text ) && /£1,250\.50/.test( shown.text ) && /Studio 5/.test( shown.text ), shown.text.slice( 0, 400 ) );
		check( 'event page', 'Tickets and Pay buttons with the texts set on the form', 'Get tickets,https://example.com/tickets,Pay now,https://example.com/pay' === shown.buttons.flat().join(), JSON.stringify( shown.buttons ) );
		await sp.screenshot( { path: join( SHOTS, 'event.png' ), fullPage: true } );
		await staff.ctx.close();

		// ------------------------------------------------------------ calendars and lists by type
		const manual = Number( wp( [ 'post', 'create', '--post_type=refraction_event', '--post_status=publish', '--post_title=Town Meeting', '--porcelain' ] ).trim() );
		php( `Refraction\\Modules\\Events\\Classes\\Event_Data::save( ${ manual }, [ 'start' => '2031-03-14 18:00', 'end' => '2031-03-14 19:00' ] ); wp_set_object_terms( ${ manual }, [ ${ music } ], 'refraction_event_cat' );` );
		const byType = page( 'By type', wrap( 't', [
			{ id: 'calw', elType: 'widget', widgetType: 'refraction-event-calendar', settings: { event_types: [ 'workshop' ], default_view: 'list' }, elements: [] },
			{ id: 'calm', elType: 'widget', widgetType: 'refraction-event-calendar', settings: { event_types: [ 'manual' ], default_view: 'list' }, elements: [] },
			{ id: 'lstw', elType: 'widget', widgetType: 'refraction-events-list', settings: { event_types: [ 'workshop' ] }, elements: [] },
		] ) );
		const tctx = await browser.newContext( { viewport: { width: 1280, height: 1000 } } );
		const tp = await tctx.newPage();
		watch( tp );
		await tp.goto( byType.url );
		// Move both calendars to March 2031 through their own route (the same call as the arrows).
		const listed = await tp.evaluate( async () => {
			const out = {};
			for ( const id of [ 'calw', 'calm' ] ) {
				const cfg = JSON.parse( document.querySelector( `[data-id="${ id }"] .rf-cal` ).dataset.config );
				const url = new URL( cfg.rest );
				Object.entries( { date: '2031-03-14', types: cfg.types, categories: cfg.categories, week_start: cfg.week_start, per_day: cfg.per_day, times: cfg.times } ).forEach( ( [ k, v ] ) => url.searchParams.set( k, v ) );
				const data = await ( await fetch( url ) ).json();
				const box = document.createElement( 'div' );
				box.innerHTML = data.list;
				out[ id ] = Array.from( box.querySelectorAll( '.rf-cal-agenda-title' ) ).map( ( e ) => e.textContent );
			}
			out.list = Array.from( document.querySelectorAll( '[data-id="lstw"] .rf-el-title' ) ).map( ( e ) => e.textContent.trim() );
			return out;
		} );
		check( 'filters', 'a calendar of Workshops shows only the workshop', 'Clay Basics' === listed.calw.join(), JSON.stringify( listed ) );
		check( 'filters', 'a calendar of events made in the editor shows only those', 'Town Meeting' === listed.calm.join(), JSON.stringify( listed ) );
		check( 'filters', 'an Events List of Workshops', 'Clay Basics' === listed.list.join(), JSON.stringify( listed ) );
		await tctx.close();

		// ------------------------------------------------------------ the type's event page design
		const design = Number( wp( [ 'post', 'create', '--post_type=refraction_event', '--post_status=publish', '--post_title=Design Model', '--porcelain' ] ).trim() );
		const designData = [ { id: 'dz01', elType: 'container', settings: { background_background: 'classic', background_color: '#FFEEDD' }, elements: [
			{ id: 'dz02', elType: 'widget', widgetType: 'heading', settings: { title: 'x', header_size: 'h1', __dynamic__: { title: '[refraction-tag id="abc1234" name="post-title" settings="%7B%7D"]' } }, elements: [] },
			{ id: 'dz03', elType: 'widget', widgetType: 'refraction-event-details', settings: { layout: 'row' }, elements: [] },
			{ id: 'dz04', elType: 'widget', widgetType: 'heading', settings: { title: 'Designed page' }, elements: [] },
		] } ];
		wp( [ 'post', 'meta', 'update', String( design ), '_refraction_edit_mode', 'builder' ] );
		wp( [ 'post', 'meta', 'update', String( design ), '_refraction_template_type', 'refraction-event' ] );
		wp( [ 'post', 'meta', 'update', String( design ), '_refraction_data', JSON.stringify( designData ) ] );
		php( `$s = get_post_meta( ${ docId }, '_refraction_page_settings', true ); $s = is_array( $s ) ? $s : []; $s['rfe_design'] = '${ design }'; $s['rfe_status'] = 'pending'; update_post_meta( ${ docId }, '_refraction_page_settings', $s );` );
		const staff2 = await login( 'staffer', 'staffer' );
		await staff2.p.goto( formPage.url );
		await staff2.p.fill( '[name="values[event_title]"]', 'Glaze Night' );
		await staff2.p.fill( '[name="values[event_start]"]', '2031-04-01T19:00' );
		await Promise.all( [ staff2.p.waitForNavigation(), staff2.p.click( 'form[data-rfb-form] button.rfb-submit' ) ] );
		const second = JSON.parse( php( `$p = get_posts( [ 'post_type' => 'refraction_event', 'title' => 'Glaze Night', 'post_status' => 'any', 'numberposts' => 1 ] ); $id = $p[0]->ID ?? 0; $d = json_decode( get_post_meta( $id, '_refraction_data', true ), true ); echo wp_json_encode( [ 'status' => get_post_status( $id ), 'texts' => array_map( fn( $e ) => $e['settings']['title'] ?? $e['widgetType'], $d[0]['elements'] ?? [] ), 'ids' => array_column( $d[0]['elements'] ?? [], 'id' ), 'bg' => $d[0]['settings']['background_color'] ?? '' ] );` ) );
		check( 'design', 'the type\'s page design is copied (with ids of its own) and the status setting applies', 'pending' === second.status && '#FFEEDD' === second.bg && second.texts.includes( 'Designed page' ) && ! second.ids.includes( 'dz02' ), JSON.stringify( second ) );
		check( 'design', 'a pending event: the success message offers a preview', /Preview the event/.test( ( await staff2.p.locator( '.rfb-alert' ).allTextContents() ).join() ) );
		await staff2.ctx.close();
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall event types checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
