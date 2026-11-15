#!/usr/bin/env node
/**
 * The Steps widget's own Submit button (0.105.0, SQLite test site, Chromium): on the last step beside Back, with its
 * text, type and Style settings, in Edit Mode and on the site; it sends the form; a Submit button widget in the form
 * takes its place, so a form never has two.
 *
 * Usage: node scripts/check-steps-submit.mjs [--site /tmp/rf-ss-site] [--port 8942] [--shots /tmp/steps-submit-shots]
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
const SITE = arg( 'site', '/tmp/rf-ss-site' );
const PORT = arg( 'port', '8942' );
const SHOTS = arg( 'shots', '/tmp/steps-submit-shots' );
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

		// One form per case, built in the editor, published, and shown on a page.
		const makeForm = async ( title, withWidget ) => {
			await page.goto( BUILDER );
			const href = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
			await page.goto( href, { timeout: 120000 } );
			await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
			await page.waitForTimeout( 2500 );
			await page.evaluate( async ( [ t, w ] ) => {
				const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
				const root = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
				const steps = add( root, { elType: 'widget', widgetType: 'rfb-steps', settings: {
					step_progress: 'connected', submit_text: 'Book now', submit_button_type: 'success', submit_color_normal: '#ffffff',
					steps: [ { _id: 'sa1', step_title: 'Your details' }, { _id: 'sb2', step_title: 'Your booking' } ],
				} } );
				add( steps.children[ 0 ], { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_key: 'name' } } );
				add( steps.children[ 1 ], { elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_key: 'email' } } );
				if ( w ) {
					add( steps.children[ 1 ], { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send it' } } );
				}
				await new Promise( ( r ) => setTimeout( r, 400 ) );
				await $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { post_title: t, rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
			}, [ title, withWidget ] );
			await page.waitForTimeout( 2500 );
			return page.frame( { name: 'refraction-preview-iframe' } ) || page.frames().find( ( f ) => f !== page.mainFrame() && f.url().includes( 'refraction-preview' ) );
		};
		const publish = async ( title, slugName ) => {
			await page.evaluate( () => $e.run( 'document/save/publish' ) );
			await page.waitForTimeout( 3500 );
			const docId = await page.evaluate( () => refraction.config.document.id );
			const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
			const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
			return seed( 'page', { title, slug: slugName, content: `[refraction_form collection="${ slug }"]` } );
		};

		// ------------------------------------------------------------ 1. the Steps widget's own Submit
		const frame = await makeForm( 'Steps submit', false );
		await frame.waitForSelector( '.rfb-steps-editor.rfb-ed-ready', { timeout: 15000 } );
		const ed = () => frame.evaluate( () => {
			const b = document.querySelector( '.rfb-steps-editor .rfb-step-nav .rfb-steps-submit' );
			return b ? { shown: !! b.offsetParent, text: b.textContent.trim(), cls: b.className } : null;
		} );
		const first = await ed();
		check( 'edit mode', 'step 1: the Steps widget\'s Submit is there but hidden, Next shows', first && ! first.shown, JSON.stringify( first ) );
		await frame.locator( '.rfb-steps-editor .rfb-next' ).dispatchEvent( 'click' );
		await page.waitForTimeout( 500 );
		const last = await ed();
		check( 'edit mode', 'last step: "Book now" (Success) shows beside Back in Edit Mode', last && last.shown && 'Book now' === last.text && last.cls.includes( 'rfb-type-success' ), JSON.stringify( last ) );
		const el = await frame.$( '.rfb-steps-editor' );
		if ( el ) { await el.screenshot( { path: join( SHOTS, 'edit-mode-last-step.png' ) } ); }

		// The panel: the Submit group in Back, Next and Submit buttons.
		await page.evaluate( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const s = find( refraction.getPreviewContainer() ).find( ( c ) => 'rfb-steps' === c.model.get( 'widgetType' ) );
			$e.run( 'panel/editor/open', { model: s.model, view: s.view } );
		} );
		await page.waitForTimeout( 900 );
		await page.evaluate( () => { const s = document.querySelector( '.refraction-control-section_step_buttons' ); if ( s && ! s.classList.contains( 'e-open' ) ) { s.querySelector( '.refraction-panel-heading' ).click(); } } );
		await page.waitForTimeout( 700 );
		await page.locator( '.rf-acc__head:has-text("Submit")' ).first().click();
		await page.waitForTimeout( 500 );
		const panel = await page.evaluate( () => [ 'submit_show', 'submit_text', 'submit_button_type', 'submit_size', 'submit_icon', 'submit_css_id' ].filter( ( n ) => document.querySelector( '.refraction-control-' + n )?.offsetParent ) );
		check( 'panel', 'Back, Next and Submit buttons > Submit: on/off, text, type, size, icon and Button ID', 6 === panel.length, panel.join( '|' ) );
		await page.locator( '.refraction-control-submit_show' ).scrollIntoViewIfNeeded();
		await page.screenshot( { path: join( SHOTS, 'panel-submit.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );

		const formPage = await publish( 'Steps submit', 'steps-submit' );
		const vctx = await browser.newContext( { viewport: { width: 1000, height: 1000 } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form] .rfb-progress-connected' );
		const site = () => v.evaluate( () => {
			const all = [ ...document.querySelectorAll( 'form[data-rfb-form] button[type="submit"]' ) ];
			const s = all.find( ( b ) => b.offsetParent );
			const back = document.querySelector( 'form[data-rfb-form] .rfb-back' );
			return { total: all.length, shown: s ? { text: s.textContent.trim(), cls: s.className, color: getComputedStyle( s ).color, besideBack: !! back && back.parentElement === s.parentElement && !! back.offsetParent } : null };
		} );
		const s1 = await site();
		check( 'site', 'one submit button in the form (no plain button added at the end), hidden on step 1', 1 === s1.total && null === s1.shown, JSON.stringify( s1 ) );
		await v.fill( '[data-rfb-key="name"] input', 'Ann' );
		await v.click( 'button.rfb-next' );
		await v.waitForTimeout( 500 );
		const s2 = await site();
		check( 'site', 'last step: "Book now" (Success, white text) beside Back', s2.shown && 'Book now' === s2.shown.text && s2.shown.cls.includes( 'rfb-type-success' ) && 'rgb(255, 255, 255)' === s2.shown.color && s2.shown.besideBack, JSON.stringify( s2 ) );
		await v.screenshot( { path: join( SHOTS, 'site-last-step.png' ), clip: await v.locator( 'form[data-rfb-form]' ).boundingBox() } );
		await v.fill( '[data-rfb-key="email"] input', 'ann@example.com' );
		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await v.waitForTimeout( 1500 );
		const sent = await v.locator( '.rfb-alert-success' ).innerText().catch( () => '' );
		check( 'site', 'pressing it sends the form', sent.length > 0, sent );
		await vctx.close();

		// ------------------------------------------------------------ 2. a Submit button widget takes its place
		const frame2 = await makeForm( 'Steps with widget', true );
		await frame2.waitForSelector( '.rfb-steps-editor.rfb-ed-ready', { timeout: 15000 } );
		check( 'edit mode', 'with a Submit button widget in the form, the Steps widget adds no Submit of its own', 0 === await frame2.evaluate( () => document.querySelectorAll( '.rfb-step-nav .rfb-steps-submit' ).length ) );
		const page2 = await publish( 'Steps with widget', 'steps-with-widget' );
		const w = await ( await browser.newContext( { viewport: { width: 1000, height: 1000 } } ) ).newPage();
		watch( w, 'visitor2' );
		await w.goto( page2.url );
		await w.waitForSelector( 'form[data-rfb-form]' );
		const only = await w.evaluate( () => [ ...document.querySelectorAll( 'form[data-rfb-form] button[type="submit"]' ) ].map( ( b ) => b.textContent.trim() ) );
		check( 'site', 'the form keeps the widget\'s "Send it" as its only submit button', 1 === only.length && 'Send it' === only[ 0 ], JSON.stringify( only ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall steps submit checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
