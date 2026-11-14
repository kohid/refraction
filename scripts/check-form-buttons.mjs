#!/usr/bin/env node
/**
 * Form buttons check (0.97.0, SQLite test site, Chromium): Submit, the Repeater's Add and Remove buttons and the Steps'
 * Back and Next buttons take an icon (left or right), its space and size, and a hover animation, like the Button widget;
 * in the editor preview and on the site, where the hover animation's stylesheet loads and moves the button.
 *
 * Usage: node scripts/check-form-buttons.mjs [--site /tmp/rf-fbt-site] [--port 8936] [--shots /tmp/form-buttons-shots]
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
const SITE = arg( 'site', '/tmp/rf-fbt-site' );
const PORT = arg( 'port', '8936' );
const SHOTS = arg( 'shots', '/tmp/form-buttons-shots' );
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
		await page.waitForTimeout( 2500 );

		// Steps > [ step 1: a name and a Guests repeater; step 2: an email and the submit button ]
		await page.evaluate( async ( a ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const tick = () => new Promise( ( r ) => setTimeout( r, 400 ) );
			const inner = async ( widget ) => { await tick(); return refraction.getContainer( widget.id ).children[ 0 ]; };
			const box = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			const steps = add( box, { elType: 'widget', widgetType: 'rfb-steps', settings: {
				back_icon: a.left, back_hover_animation: 'shrink', next_icon: a.right, next_icon_position: 'right', next_icon_gap: { unit: 'px', size: 14 }, next_icon_size: { unit: 'px', size: 20 }, next_hover_animation: 'grow',
			} } );
			const one = steps.children[ 0 ];
			const two = steps.children[ 1 ];
			add( one, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_key: 'name' } } );
			const rep = add( one, { elType: 'widget', widgetType: 'rfb-field-repeater', settings: { field_label: 'Guests', field_key: 'guests', min_rows: 1, max_rows: 3, add_label: 'Add guest', add_icon: a.plus, add_hover_animation: 'grow', remove_icon: a.trash, remove_hover_animation: 'buzz' } } );
			add( await inner( rep ), { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Guest name', field_key: 'guest' } } );
			add( two, { elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_key: 'email' } } );
			add( two, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send booking', icon: a.send, icon_position: 'right', hover_animation: 'grow' } } );
			await tick();
			await $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { post_title: 'Buttons', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
		}, { left: ph( 'arrow-left' ), right: ph( 'arrow-right' ), plus: ph( 'plus-circle' ), trash: ph( 'trash' ), send: ph( 'paper-plane-tilt' ) } );
		await page.waitForTimeout( 2500 );
		const preview = page.frameLocator( '#refraction-preview-iframe' );

		check( 'editor', 'the preview shows the Add guest button with its icon and the Submit button with its icon', ( await preview.locator( '[data-rfb-add] .rfb-btn-icon:has(svg)' ).count() ) >= 1 && ( await preview.locator( '.rfb-submit .rfb-btn-icon:has(svg)' ).count() ) === 1 );

		// the panel: the Steps widget has a Back and Next section
		await page.evaluate( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const steps = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === 'rfb-steps' );
			$e.run( 'panel/editor/open', { model: steps.model, view: steps.view } );
		} );
		await page.waitForTimeout( 1000 );
		const sections = await page.$$eval( '.refraction-section-title', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'the Steps widget has "Back and Next buttons"', sections.includes( 'Back and Next buttons' ), sections.join( '|' ) );
		await page.locator( '.refraction-control-section_step_buttons' ).click();
		await page.waitForTimeout( 400 );
		const groups = await page.$$eval( '.rf-section-groups__tab', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'it holds General, Back and Next, each button with a type and an icon like the Button widget (hover animation: Style tab)', groups.join( '|' ) === 'General|Back|Next' && await ( async () => { await page.locator( '.rf-section-groups__tab:visible', { hasText: 'Back' } ).first().click(); await page.waitForTimeout( 400 ); return ( await page.locator( '.refraction-control-back_button_type:visible, .refraction-control-back_icon:visible' ).count() ) === 2; } )(), groups.join( '|' ) );

		await page.evaluate( () => $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );

		// ------------------------------------------------------------ the site
		const formPage = seed( 'page', { title: 'Buttons', slug: 'buttons', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1200 } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );

		const next = v.locator( 'button.rfb-next' );
		const order = ( loc ) => loc.evaluate( ( b ) => [ ...b.children ].map( ( c ) => c.className.split( ' ' )[ 0 ] ).join( ',' ) );
		check( 'next', 'Next reads "Next" with its arrow on the right, the space and the size from the Steps widget', ( await order( next ) ) === 'rfb-btn-text,rfb-btn-icon' && ( await next.locator( '.rfb-btn-text' ).textContent() ).trim().length > 0 && ( await next.evaluate( ( b ) => getComputedStyle( b ).columnGap ) ) === '14px' && ( await next.locator( '.rfb-btn-icon' ).evaluate( ( i ) => getComputedStyle( i ).fontSize ) ) === '20px' );
		check( 'next', 'Next has the Grow hover animation, and its stylesheet is on the page', ( await next.getAttribute( 'class' ) ).includes( 'refraction-animation-grow' ) && await v.evaluate( () => [ ...document.styleSheets ].some( ( sheet ) => { try { return [ ...sheet.cssRules ].some( ( r ) => ( r.selectorText || '' ).includes( 'animation-grow' ) ); } catch ( e ) { return false; } } ) ) );
		await next.hover();
		await v.waitForTimeout( 500 );
		check( 'next', 'hovering Next makes it grow', ( await next.evaluate( ( b ) => getComputedStyle( b ).transform ) ).startsWith( 'matrix(1.1' ) );

		const add = v.locator( '[data-rfb-add]' );
		check( 'repeater', 'Add guest shows its icon on the left and the Grow animation', ( await order( add ) ) === 'rfb-btn-icon,rfb-btn-text' && ( await add.getAttribute( 'class' ) ).includes( 'refraction-animation-grow' ) );
		const remove = v.locator( '.rfb-rep-remove' ).first();
		check( 'repeater', 'the remove button shows the bin icon instead of the cross, with Buzz, and is still named for screen readers', ( await remove.locator( '.rfb-btn-icon:has(svg)' ).count() ) === 1 && ! ( await remove.textContent() ).includes( '×' ) && ( await remove.getAttribute( 'aria-label' ) ) === 'Remove this row' && ( await remove.getAttribute( 'class' ) ).includes( 'refraction-animation-buzz' ) );
		await add.click();
		check( 'repeater', 'a row added by the button has the same remove button', ( await v.locator( '.rfb-rep-remove .rfb-btn-icon:has(svg)' ).count() ) === 2 );

		await v.fill( '[data-rfb-key="name"] input', 'Ann' );
		await next.click();
		await v.waitForTimeout( 300 );
		const back = v.locator( 'button.rfb-back' );
		check( 'back', 'on step 2 Back shows its arrow on the left and Shrink', ( await back.isVisible() ) && ( await order( back ) ) === 'rfb-btn-icon,rfb-btn-text' && ( await back.getAttribute( 'class' ) ).includes( 'refraction-animation-shrink' ) );
		const submit = v.locator( 'button.rfb-submit' );
		check( 'submit', 'Submit reads "Send booking" with its icon on the right and Grow', ( await order( submit ) ) === 'rfb-btn-text,rfb-btn-icon' && ( await submit.locator( '.rfb-btn-text' ).textContent() ) === 'Send booking' && ( await submit.getAttribute( 'class' ) ).includes( 'refraction-animation-grow' ) );
		await v.screenshot( { path: join( SHOTS, 'step-2.png' ), clip: await v.locator( 'form[data-rfb-form]' ).boundingBox() } );
		await back.click();
		await v.waitForTimeout( 300 );
		await v.screenshot( { path: join( SHOTS, 'step-1.png' ), clip: await v.locator( 'form[data-rfb-form]' ).boundingBox() } );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form button checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
