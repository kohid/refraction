#!/usr/bin/env node
/**
 * Form Canvas, the Shortcode widget's "Form Builder form", and sending forms (SQLite test site, Chromium):
 * - A form built in the page editor (a Form page) is sent from its own address ("View"), from the Shortcode widget
 *   (form picked under the shortcode) and from the Form Canvas widget: errors come back under the fields, the
 *   success message shows and every answer is saved as a record.
 * - Form Canvas: title and text, width, alignment, padding, background and the form colors on this page.
 * - A page served from a page cache (old security token): the form fetches a fresh token and still sends.
 * - The form script also starts when an optimisation plugin loads it after the page is ready.
 * - Editor: Form Canvas is in the Form Builder category on ordinary pages (not on Form pages) and shows the form in
 *   the preview; the Shortcode widget lists the forms.
 *
 * Usage: node scripts/check-form-canvas.mjs [--site /tmp/rf-fc-site] [--port 8996] [--shots /tmp/form-canvas-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fc-site' );
const PORT = arg( 'port', '8996' );
const SHOTS = arg( 'shots', '/tmp/form-canvas-shots' );
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
const wrap = ( id, widget ) => [ { id: `c${ id }`, elType: 'container', isInner: false, settings: {}, elements: [ widget ] } ];

/** A form built in the page editor: a Form page with three fields and a submit button, saved into its collection. */
function makeForm() {
	const field = ( id, type, label, key, required ) => ( { id, elType: 'widget', widgetType: `rfb-field-${ type }`, settings: { field_label: label, field_key: key, field_required: required ? 'yes' : '' }, elements: [] } );
	const data = [ { id: 'fc00', elType: 'container', isInner: false, settings: {}, elements: [
		field( 'ff01', 'text', 'Your name', 'your_name', true ),
		field( 'ff02', 'email', 'Email', 'email', true ),
		field( 'ff03', 'textarea', 'Message', 'message', false ),
		{ id: 'ff04', elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send it' }, elements: [] },
	] } ];
	const id = wp( [ 'post', 'create', '--post_type=refraction_library', '--post_status=publish', '--post_title=Contact', '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'rfb-form' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( data ) ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_page_settings', JSON.stringify( { rfb_success_message: 'Thanks, got it.' } ), '--format=json' ] );
	php( `wp_set_object_terms( ${ id }, 'rfb-form', 'refraction_library_type' ); $d = Refraction\\Plugin::$instance->documents->get( ${ id }, false ); ( new Refraction\\Modules\\FormBuilder\\Classes\\Editor_Forms( new Refraction\\Modules\\FormBuilder\\Classes\\Collections() ) )->sync( $d );` );
	return { id, slug: php( `echo get_post_meta( ${ id }, '_rfb_collection', true );` ), url: php( `echo get_permalink( ${ id } );` ) };
}
const records = ( slug ) => Number( php( `echo ( new Refraction\\Modules\\FormBuilder\\Classes\\Records() )->count( '${ slug }' );` ) );

async function fillAndSend( p, name ) {
	await p.fill( '[name="values[your_name]"]', name );
	await p.fill( '[name="values[email]"]', `${ name.toLowerCase() }@example.com` );
	await p.fill( '[name="values[message]"]', `Hello from ${ name }` );
	await sleep( 3300 ); // the form's minimum fill time
	await Promise.all( [ p.waitForNavigation( { timeout: 30000 } ), p.click( 'form[data-rfb-form] button[type=submit]' ) ] );
	await p.waitForLoadState( 'load' );
	return ( await p.locator( '.rfb-alert' ).allTextContents() ).join( ' | ' );
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
	const login = async () => {
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 60000 } ), p.click( '#wp-submit' ) ] );
		return { ctx, p };
	};
	const visitor = async ( url, setup ) => {
		const ctx = await browser.newContext( { viewport: { width: 1280, height: 900 } } );
		if ( setup ) {
			await setup( ctx );
		}
		const p = await ctx.newPage();
		watch( p );
		await p.goto( url );
		return { ctx, p };
	};

	try {
		const form = makeForm();
		check( 'setup', 'a Form page built from field widgets is saved as a collection', '' !== form.slug, JSON.stringify( form ) );

		// ------------------------------------------------------------ the Form page's own address
		const admin = await login();
		await admin.p.goto( form.url );
		check( 'form page', 'viewed on its own address it is a real form (fields and button inside it)', 1 === await admin.p.locator( 'form[data-rfb-form] .rfb-field' ).first().count() && 1 === await admin.p.locator( 'form[data-rfb-form] button[type=submit]' ).count(), admin.p.url() );
		const viewMsg = await fillAndSend( admin.p, 'Ann' );
		check( 'form page', 'sending it there saves the answers and shows the success message', /Thanks, got it\./.test( viewMsg ) && 1 === records( form.slug ), `${ viewMsg } / ${ records( form.slug ) }` );

		// ------------------------------------------------------------ Shortcode widget: "Form Builder form"
		const sc = page( 'Shortcode form', wrap( 's', { id: 'sw01', elType: 'widget', widgetType: 'shortcode', settings: { shortcode: '', rfb_form: form.slug }, elements: [] } ) );
		const v = await visitor( sc.url );
		check( 'shortcode', 'with no shortcode and a form picked, the widget shows the form', 1 === await v.p.locator( '.refraction-shortcode form[data-rfb-form]' ).count() && 3 === await v.p.locator( 'form[data-rfb-form] .rfb-field' ).count() );
		// The browser stops an empty send at the required fields; send it to the server anyway to see its own check.
		await v.p.evaluate( () => document.querySelectorAll( 'form[data-rfb-form] [required]' ).forEach( ( el ) => el.removeAttribute( 'required' ) ) );
		await sleep( 3300 );
		await Promise.all( [ v.p.waitForNavigation(), v.p.evaluate( () => document.querySelector( 'form[data-rfb-form]' ).submit() ) ] );
		check( 'shortcode', 'the server sends it back with an error under each required field', 2 === await v.p.locator( '.rfb-field .rfb-error' ).count(), String( await v.p.locator( '.rfb-field .rfb-error' ).count() ) );
		const scMsg = await fillAndSend( v.p, 'Bob' );
		check( 'shortcode', 'filled in, it is saved and the success message shows', /Thanks, got it\./.test( scMsg ) && 2 === records( form.slug ), `${ scMsg } / ${ records( form.slug ) }` );
		await v.ctx.close();

		// ------------------------------------------------------------ Form Canvas
		const canvas = page( 'Canvas form', wrap( 'f', { id: 'fw01', elType: 'widget', widgetType: 'rfb-form-canvas', settings: {
			form: form.slug,
			title: 'Contact us',
			description: 'We answer within a day.',
			width: { unit: 'px', size: 600 },
			align: 'center',
			padding: { unit: 'px', top: '30', right: '30', bottom: '30', left: '30', isLinked: true },
			background_background: 'classic',
			background_color: '#F4F1EA',
			form_primary: '#FF0055',
			form_radius: { unit: 'px', size: 2 },
		}, elements: [] } ) );
		const c = await visitor( canvas.url );
		const look = await c.p.evaluate( () => {
			const box = document.querySelector( '.rfb-canvas' );
			const r = box.getBoundingClientRect();
			const host = box.parentElement.getBoundingClientRect();
			const btn = box.querySelector( 'button[type=submit]' );
			return {
				w: Math.round( r.width ),
				centered: Math.abs( ( r.left - host.left ) - ( host.right - r.right ) ) < 3,
				pad: getComputedStyle( box ).paddingTop,
				bg: getComputedStyle( box ).backgroundColor,
				title: box.querySelector( '.rfb-canvas__title' )?.textContent,
				text: box.querySelector( '.rfb-canvas__text' )?.textContent,
				button: getComputedStyle( btn ).backgroundColor,
				radius: getComputedStyle( box.querySelector( '.rfb-input' ) ).borderTopLeftRadius,
			};
		} );
		check( 'canvas', 'title and text above the form', 'Contact us' === look.title && 'We answer within a day.' === look.text, JSON.stringify( look ) );
		check( 'canvas', 'width 600 px, centered, padding 30 px, background', 600 === look.w && look.centered && '30px' === look.pad && 'rgb(244, 241, 234)' === look.bg, JSON.stringify( look ) );
		check( 'canvas', 'the form colors on this page win over the form\'s own', 'rgb(255, 0, 85)' === look.button && '2px' === look.radius, JSON.stringify( look ) );
		await c.p.screenshot( { path: join( SHOTS, 'canvas.png' ), fullPage: true } );
		const cMsg = await fillAndSend( c.p, 'Cat' );
		check( 'canvas', 'sent from the canvas, it is saved and the success message shows', /Thanks, got it\./.test( cMsg ) && 3 === records( form.slug ), `${ cMsg } / ${ records( form.slug ) }` );
		await c.ctx.close();

		// ------------------------------------------------------------ a page from a page cache: old token
		let fetched = 0;
		const stale = await visitor( canvas.url, async ( ctx ) => {
			await ctx.route( ( u ) => u.href.startsWith( canvas.url ), async ( route ) => {
				const response = await route.fetch();
				const html = ( await response.text() ).replace( /data-rfb-issued="\d+"/, 'data-rfb-issued="1600000000"' ).replace( /(name="_rfb_nonce" value=")[^"]+"/, '$1stale00000"' );
				await route.fulfill( { response, body: html } );
			} );
			ctx.on( 'request', ( r ) => {
				if ( /admin-ajax\.php\?action=refraction_fb_token/.test( r.url() ) ) {
					fetched++;
				}
			} );
		} );
		await sleep( 800 );
		const nonce = await stale.p.inputValue( 'input[name="_rfb_nonce"]' );
		check( 'cache', 'an old page fetches a fresh security token', 1 === fetched && 'stale00000' !== nonce, `${ fetched } ${ nonce }` );
		const sMsg = await fillAndSend( stale.p, 'Dan' );
		check( 'cache', '...and the form still sends', /Thanks, got it\./.test( sMsg ) && 4 === records( form.slug ), `${ sMsg } / ${ records( form.slug ) }` );
		await stale.ctx.close();

		// ------------------------------------------------------------ the script loaded after the page is ready
		const late = await visitor( canvas.url, async ( ctx ) => {
			await ctx.route( /form-builder-frontend(\.min)?\.js/, async ( route ) => {
				if ( ! route.request().url().includes( 'late=1' ) ) {
					return route.fulfill( { contentType: 'text/javascript', body: '' } );
				}
				return route.continue( { url: route.request().url().replace( /[?&]late=1/, '' ) } );
			} );
		} );
		await late.p.waitForLoadState( 'load' );
		await late.p.evaluate( () => {
			const src = Array.from( document.scripts ).find( ( s ) => /form-builder-frontend/.test( s.src ) ).src;
			const tag = document.createElement( 'script' );
			tag.src = src + ( src.includes( '?' ) ? '&' : '?' ) + 'late=1';
			document.body.appendChild( tag );
		} );
		await sleep( 1000 );
		check( 'script', 'loaded after the page is ready, the form script still starts', true === await late.p.evaluate( () => document.querySelector( 'form[data-rfb-form]' ).rfbReady ) );
		await late.ctx.close();

		// ------------------------------------------------------------ editor
		const blank = page( 'Canvas editor', [ { id: 'ce01', elType: 'container', isInner: false, settings: {}, elements: [] } ] );
		await admin.p.goto( `${ BASE }/wp-admin/post.php?post=${ blank.id }&action=refraction` );
		await admin.p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
		await sleep( 2500 );
		const panel = await admin.p.evaluate( () => {
			const cfg = window.refraction.widgetsCache[ 'rfb-form-canvas' ];
			return cfg && { title: cfg.title, cats: cfg.categories, show: cfg.show_in_panel };
		} );
		check( 'editor', 'Form Canvas is in the Form Builder category on an ordinary page', panel && 'Form Canvas' === panel.title && panel.cats.includes( 'refraction-form-fields' ) && false !== panel.show, JSON.stringify( panel ) );
		await admin.p.evaluate( () => $e.route( 'panel/elements/categories' ) );
		await admin.p.fill( '#refraction-panel-elements-search-input', 'Form Canvas' );
		await sleep( 600 );
		check( 'editor', 'it is found in the panel', 1 === await admin.p.locator( '#refraction-panel-elements .refraction-element[data-library-element-type="rfb-form-canvas"]' ).count() );
		await admin.p.evaluate( () => {
			$e.run( 'document/elements/create', { container: refraction.getContainer( 'ce01' ), model: { elType: 'widget', widgetType: 'rfb-form-canvas' } } );
		} );
		await sleep( 3000 );
		const frame = admin.p.frame( { name: 'refraction-preview-iframe' } );
		check( 'editor', 'dropped in, it shows the first form in the preview', 3 === await frame.locator( '.rfb-canvas form[data-rfb-form] .rfb-field' ).count(), String( await frame.locator( '.rfb-canvas .rfb-field' ).count() ) );
		await admin.p.screenshot( { path: join( SHOTS, 'editor-canvas.png' ) } );
		const options = await admin.p.evaluate( ( slug ) => {
			const control = window.refraction.widgetsCache.shortcode?.controls?.rfb_form;
			return control ? Object.keys( control.options ).includes( slug ) : null;
		}, form.slug );
		check( 'editor', 'the Shortcode widget offers the forms under "Form Builder form"', true === options, String( options ) );
		await admin.p.goto( `${ BASE }/wp-admin/post.php?post=${ form.id }&action=refraction` );
		await admin.p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
		await sleep( 1500 );
		const onForm = await admin.p.evaluate( () => window.refraction.widgetsCache[ 'rfb-form-canvas' ]?.show_in_panel );
		check( 'editor', 'not offered on a Form page itself (a form does not hold a form)', false === onForm, String( onForm ) );
		await admin.ctx.close();

		const rec = JSON.parse( php( `$r = get_posts( [ 'post_type' => 'refraction_fb_record', 'numberposts' => 1, 'orderby' => 'ID', 'order' => 'DESC' ] ); echo get_post_meta( $r[0]->ID, '_rfb_data', true ) ?: '{}';` ) || '{}' );
		check( 'records', 'the record holds every answer', 'Dan' === rec.your_name && 'dan@example.com' === rec.email && 'Hello from Dan' === rec.message, JSON.stringify( rec ) );

		check( 'console', 'no JavaScript errors in the browser', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 400 ) );
	} catch ( e ) {
		check( 'script', e.message.split( '\n' )[ 0 ], false );
		console.error( e );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form canvas checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
