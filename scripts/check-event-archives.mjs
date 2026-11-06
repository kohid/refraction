#!/usr/bin/env node
/**
 * Event type addresses, templates and tags (SQLite test site, Chromium):
 * - An event type's events live at /<its address>/<event>/ and /<its address>/ is its archive (the address set in the
 *   form's page settings), next to /events/<event>/.
 * - Refraction > Event types: "Design the event page" and "Design the archive" make Theme Builder templates for the
 *   type (conditions set) and open them in the editor; on the site the event page and the archive use them.
 * - Event tags: Event Detail, Event Link (on a Button), Event Form Field (a field added to the form), Event Gallery;
 *   the Event Button (payment) and Event Gallery widgets; the gallery pictures come from the form's Image gallery field.
 *
 * Usage: node scripts/check-event-archives.mjs [--site /tmp/rf-ea-site] [--port 8993] [--shots /tmp/event-archives-shots]
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
const SITE = arg( 'site', '/tmp/rf-ea-site' );
const PORT = arg( 'port', '8993' );
const SHOTS = arg( 'shots', '/tmp/event-archives-shots' );
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
		wp( [ 'option', 'update', 'permalink_structure', '/%postname%/' ] );
		wp( [ 'user', 'create', 'staffer', 'staffer@example.com', '--role=editor', '--user_pass=staffer' ] );
		const dir = join( tmpdir(), `rfea-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		for ( const [ name, color ] of [ [ 'cover', '#336699' ], [ 'one', '#993366' ], [ 'two', '#669933' ] ] ) {
			execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${ color }:size=640x400`, '-frames:v', '1', join( dir, `${ name }.png` ) ] );
		}

		// ------------------------------------------------------------ the type, its address, a field of our own
		const admin = await login( 'admin', 'admin' );
		await admin.p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-event-types` );
		await admin.p.fill( '#rfe-name', 'Workshop' );
		await Promise.all( [ admin.p.waitForURL( /action=refraction/, { timeout: 120000 } ), admin.p.click( '.rfe-new-type button' ) ] );
		await openEditor( admin.p );
		const formId = await admin.p.evaluate( () => refraction.config.document.id );
		const panel = await admin.p.evaluate( () => [ 'rfb-field-event-gallery', 'rfb-field-event-button' ].map( ( w ) => refraction.widgetsCache[ w ] && refraction.widgetsCache[ w ].title + ':' + ( refraction.widgetsCache[ w ].keywords || [] ).join( ' ' ) ) );
		check( 'form', 'the event form offers an Image gallery field and the Event button for payment', /Image gallery/.test( panel[ 0 ] ) && /payment/.test( panel[ 1 ] ), JSON.stringify( panel ) );
		// A field of our own (Dress code) next to the event fields, and the address "workshops".
		await admin.p.evaluate( async () => {
			const form = refraction.documents.getCurrent().container.children[ 0 ];
			$e.run( 'document/elements/create', { container: form, model: { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Dress code', field_key: 'dress_code' } }, options: { at: 2 } } );
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { rfe_base: 'workshops', rfb_min_seconds: 0 } } );
			await $e.run( 'document/save/publish' );
		} );
		await sleep( 3500 );
		const slug = php( `echo get_post_meta( ${ formId }, '_rfb_collection', true );` );
		check( 'form', 'saved as the type "workshop"', 'workshop' === slug, slug );

		// ------------------------------------------------------------ an event from the form
		const formPage = page( 'Add event', wrap( 'f', [ { id: 'fcan', elType: 'widget', widgetType: 'rfb-form-canvas', settings: { form: slug }, elements: [] } ] ) );
		const staff = await login( 'staffer', 'staffer' );
		const sp = staff.p;
		await sp.goto( formPage.url );
		await sp.fill( '[name="values[event_title]"]', 'Soul Dance' );
		await sp.fill( '[name="values[event_start]"]', '2031-05-02T19:00' );
		await sp.fill( '[name="values[event_end]"]', '2031-05-02T22:00' );
		await sp.fill( '[name="values[event_venue]"]', 'Studio 5' );
		await sp.fill( '[name="values[dress_code]"]', 'Smart casual' );
		await sp.fill( '[name="values[event_payment_url]"]', 'https://example.com/pay' );
		await sp.fill( '[name="values[event_ticket_url]"]', 'https://example.com/tickets' );
		await sp.setInputFiles( '[data-rfb-key="event_image"] input[type=file]', join( dir, 'cover.png' ) );
		await sp.setInputFiles( '[data-rfb-key="event_gallery"] input[type=file]', [ join( dir, 'one.png' ), join( dir, 'two.png' ) ] );
		await sp.fill( '[name="values[event_description]"]', 'Dance all night.' );
		await Promise.all( [ sp.waitForNavigation( { timeout: 60000 } ), sp.click( 'form[data-rfb-form] button.rfb-submit' ) ] );
		const link = await sp.locator( '.rfe-made-link' ).getAttribute( 'href' ).catch( () => '' );
		const eventId = Number( php( "$p = get_posts( [ 'post_type' => 'refraction_event', 'title' => 'Soul Dance', 'numberposts' => 1 ] ); echo $p[0]->ID ?? 0;" ) );
		const gallery = php( `echo implode( ',', Refraction\\Modules\\Events\\Classes\\Event_Data::gallery( ${ eventId } ) );` );
		check( 'event', 'the event lives under the type\'s address: /workshops/soul-dance/', `${ BASE }/workshops/soul-dance/` === link, link );
		check( 'event', 'the form\'s gallery pictures are its gallery (media library images)', 2 === gallery.split( ',' ).filter( Boolean ).length, gallery );
		check( 'event', 'it is in the Event Types term "Workshop"', 'Workshop' === php( `echo implode( ',', wp_get_object_terms( ${ eventId }, 'refraction_event_type', [ 'fields' => 'names' ] ) );` ) );
		await sp.goto( link );
		check( 'event', 'its page opens at that address with the Pay button in its details', /Soul Dance/.test( await sp.title() ) && 1 === await sp.locator( '.rf-ed-pay[href="https://example.com/pay"]' ).count() );
		const old = await sp.goto( `${ BASE }/events/soul-dance/` );
		check( 'event', '/events/soul-dance/ still answers', 200 === old.status(), String( old.status() ) );
		const arch = await sp.goto( `${ BASE }/workshops/` );
		check( 'archive', '/workshops/ is the type\'s archive and lists it', 200 === arch.status() && /Soul Dance/.test( await sp.content() ), String( arch.status() ) );
		await staff.ctx.close();

		// ------------------------------------------------------------ Design the event page (Single template)
		await admin.p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-event-types` );
		const designSingle = await admin.p.getAttribute( 'tr[data-type="workshop"] a:has-text("Design the event page")', 'href' );
		await admin.p.goto( designSingle );
		await openEditor( admin.p );
		const single = await admin.p.evaluate( () => {
			const types = [];
			const walk = ( c ) => {
				if ( 'widget' === c.model.get( 'elType' ) ) {
					types.push( c.model.get( 'widgetType' ) );
				}
				c.children.forEach( walk );
			};
			walk( refraction.documents.getCurrent().container );
			const tags = Object.keys( refraction.dynamicTags?.getConfig?.( 'tags' ) || refraction.config.dynamicTags?.tags || {} ).filter( ( t ) => t.startsWith( 'refraction-event' ) );
			return { type: refraction.config.document.type, id: refraction.config.document.id, types, tags };
		} );
		const rules = php( `echo implode( ',', (array) get_post_meta( ${ single.id }, '_refraction_conditions', true ) );` );
		check( 'single', '"Design the event page" opens a Single template for the type\'s events', 'single' === single.type && /include\/singular\/in_refraction_event_type\/\d+/.test( rules ) && [ 'refraction-event-details', 'refraction-event-button', 'refraction-event-gallery' ].every( ( w ) => single.types.includes( w ) ), JSON.stringify( [ single, rules ] ) );
		check( 'tags', 'the Event tags are offered: detail, link, form field, gallery, start', [ 'refraction-event-detail', 'refraction-event-link', 'refraction-event-form-field', 'refraction-event-gallery', 'refraction-event-start' ].every( ( t ) => single.tags.includes( t ) ), single.tags.join() );
		// Add a Button with the Event Link (payment) tag and a heading with the Dress code answer.
		await admin.p.evaluate( async () => {
			const box = refraction.documents.getCurrent().container.children[ 0 ];
			const tag = ( name, settings ) => '[refraction-tag id="' + Math.random().toString( 16 ).slice( 2, 9 ) + '" name="' + name + '" settings="' + encodeURIComponent( JSON.stringify( settings ) ) + '"]';
			$e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'button', settings: { text: 'Pay with the tag', __dynamic__: { link: tag( 'refraction-event-link', { link: 'payment' } ) } } } } );
			$e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'heading', settings: { title: 'x', header_size: 'h4', _css_classes: 'dress', __dynamic__: { title: tag( 'refraction-event-form-field', { key: 'dress_code' } ) } } } } );
			await $e.run( 'document/save/publish' );
		} );
		await sleep( 3500 );
		await admin.p.screenshot( { path: join( SHOTS, 'single-template-editor.png' ) } );

		const visitor = await browser.newContext( { viewport: { width: 1280, height: 1000 } } );
		const vp = await visitor.newPage();
		watch( vp );
		await vp.goto( link );
		const page1 = await vp.evaluate( () => ( {
			h1: document.querySelector( 'h1.refraction-heading-title' )?.textContent,
			when: Array.from( document.querySelectorAll( '.refraction-heading-title' ) ).map( ( e ) => e.textContent ).find( ( t ) => /2031/.test( t ) ),
			pay: document.querySelector( '.rfe-btn--payment' )?.getAttribute( 'href' ),
			payText: document.querySelector( '.rfe-btn--payment' )?.textContent.trim(),
			tagButton: Array.from( document.querySelectorAll( 'a.refraction-button' ) ).find( ( a ) => /Pay with the tag/.test( a.textContent ) )?.getAttribute( 'href' ),
			dress: document.querySelector( '.dress .refraction-heading-title' )?.textContent,
			gallery: Array.from( document.querySelectorAll( '.rfe-gallery a' ) ).map( ( a ) => a.getAttribute( 'data-refraction-open-lightbox' ) ),
			desc: /Dance all night\./.test( document.body.textContent ),
			template: !! document.querySelector( '[data-refraction-type="single"]' ),
		} ) );
		check( 'single', 'on the site the event page uses the template', page1.template && 'Soul Dance' === page1.h1 && page1.desc, JSON.stringify( page1 ) );
		check( 'tags', 'Event Detail shows the date and time', /May 2, 2031/.test( page1.when || '' ) && /19:00/.test( page1.when || '' ), JSON.stringify( page1 ) );
		check( 'tags', 'Event Link gives a Button the payment address', 'https://example.com/pay' === page1.tagButton, JSON.stringify( page1 ) );
		check( 'tags', 'Event Form Field shows the form\'s own field (Dress code)', 'Smart casual' === page1.dress, JSON.stringify( page1 ) );
		check( 'widgets', 'Event Button (payment) opens the payment link', 'https://example.com/pay' === page1.pay && 'Pay now' === page1.payText, JSON.stringify( page1 ) );
		check( 'widgets', 'Event Gallery shows the two pictures, opening in the lightbox', 2 === page1.gallery.length && page1.gallery.every( ( v ) => 'yes' === v ), JSON.stringify( page1.gallery ) );
		await vp.screenshot( { path: join( SHOTS, 'single.png' ), fullPage: true } );

		// ------------------------------------------------------------ Design the archive
		await admin.p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-event-types` );
		const designArchive = await admin.p.getAttribute( 'tr[data-type="workshop"] a:has-text("Design the archive")', 'href' );
		await admin.p.goto( designArchive );
		await openEditor( admin.p );
		const archiveId = await admin.p.evaluate( () => refraction.config.document.id );
		const archRules = php( `echo implode( ',', (array) get_post_meta( ${ archiveId }, '_refraction_conditions', true ) );` );
		check( 'archive', '"Design the archive" opens an Archive template for the type', /include\/archive\/tax\/refraction_event_type\/\d+/.test( archRules ), archRules );
		await admin.p.evaluate( () => $e.run( 'document/save/publish' ) );
		await sleep( 3000 );
		await vp.goto( `${ BASE }/workshops/` );
		const archive = await vp.evaluate( () => ( { template: !! document.querySelector( '[data-refraction-type="archive"]' ), title: document.querySelector( 'h1.refraction-heading-title' )?.textContent, items: Array.from( document.querySelectorAll( '.rf-el-title' ) ).map( ( e ) => e.textContent.trim() ) } ) );
		check( 'archive', 'on the site /workshops/ uses the template: the type\'s name and its events', archive.template && /Workshop/.test( archive.title || '' ) && 'Soul Dance' === archive.items.join(), JSON.stringify( archive ) );
		await vp.screenshot( { path: join( SHOTS, 'archive.png' ), fullPage: true } );
		await visitor.close();

		// Opening "Design the event page" again goes back to the same template.
		await admin.p.goto( designSingle );
		await openEditor( admin.p );
		check( 'single', 'the same template opens the next time', single.id === await admin.p.evaluate( () => refraction.config.document.id ) );

		// The event itself still opens in the editor although its type's Single template (no Post Content widget) shows it
		// on the site: the editor shows the event's own page, with the site's header and footer.
		await admin.p.goto( `${ BASE }/wp-admin/post.php?post=${ eventId }&action=refraction` );
		const opened = await admin.p.waitForFunction( () => ( window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0 ? 'editor' : ( /content area was not found/.test( document.body.innerText ) ? 'no content area' : false ) ), null, { timeout: 120000 } ).then( ( h ) => h.jsonValue() ).catch( ( e ) => e.message );
		const own = 'editor' === opened ? await admin.p.frame( { name: 'refraction-preview-iframe' } ).evaluate( ( id ) => ( { own: !! document.querySelector( `[data-refraction-id="${ id }"]` ), template: !! document.querySelector( '[data-refraction-type="single"]' ) } ), String( eventId ) ) : {};
		check( 'single', 'an event of a type with a Single template still opens in the editor, showing its own page', 'editor' === opened && own.own && ! own.template, JSON.stringify( [ opened, own ] ) );
		await admin.p.screenshot( { path: join( SHOTS, 'event-editor.png' ) } );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall event archive checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
