#!/usr/bin/env node
/**
 * Step layouts check (0.98.0, SQLite test site, Chromium): a three-step form (Steps widget) shown with each progress
 * look (circles and line, bar with percentage, slider, segments, ring, ring of dots, arrows, bar with label), in a
 * sidebar and as an accordion; each follows Next and Back, the sidebar and accordion steps can be clicked (back at
 * once, forward through the checks), and nothing is wider than a phone.
 *
 * Usage: node scripts/check-step-layouts.mjs [--site /tmp/rf-sl-site] [--port 8937] [--shots /tmp/step-layouts-shots]
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
const SITE = arg( 'site', '/tmp/rf-sl-site' );
const PORT = arg( 'port', '8937' );
const SHOTS = arg( 'shots', '/tmp/step-layouts-shots' );
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
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), page.click( '#wp-submit' ) ] );
	return page;
}


const ph = ( name ) => ( { value: `rf-ph rf-ph-${ name }`, library: 'phosphor-regular' } );

/** Changes the Steps widget's settings in the saved form page (as the editor would) and empties the element cache. */
function setSteps( docId, settings ) {
	wp( [ 'eval', `
		$id = ${ Number( docId ) };
		$data = json_decode( get_post_meta( $id, '_refraction_data', true ), true );
		$walk = function ( &$els ) use ( &$walk ) { foreach ( $els as &$el ) { if ( ( $el['widgetType'] ?? '' ) === 'rfb-steps' ) { $el['settings'] = array_merge( $el['settings'], json_decode( getenv( 'RF_STEPS' ), true ) ); } if ( ! empty( $el['elements'] ) ) { $walk( $el['elements'] ); } } };
		$walk( $data );
		update_post_meta( $id, '_refraction_data', wp_slash( wp_json_encode( $data ) ) );
		delete_post_meta( $id, '_refraction_element_cache' );
		delete_post_meta( $id, '_refraction_css' );
	` ], { RF_STEPS: JSON.stringify( settings ) } );
}

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

		// Steps: Your details (name, required) > Your car (model) > Confirm (email, submit)
		await page.evaluate( async ( a ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const tick = () => new Promise( ( r ) => setTimeout( r, 400 ) );
			const box = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			const steps = add( box, { elType: 'widget', widgetType: 'rfb-steps', settings: { step_layout: 'top', step_progress: 'connected', step_counter: 'yes' } } );
			$e.run( 'document/repeater/insert', { container: steps, name: 'steps', model: { step_title: 'Confirm' } } );
			await tick();
			const titles = [ [ 'Your details', 'Who is booking', a.user ], [ 'Your car', 'The car you drive', a.car ], [ 'Confirm', 'Check and send', a.check ] ];
			titles.forEach( ( [ title, description, icon ], index ) => $e.run( 'document/elements/settings', { container: steps.repeaters.steps.children[ index ], settings: { step_title: title, step_description: description, step_icon: icon }, options: { external: true } } ) );
			await tick();
			const kids = refraction.getContainer( steps.id ).children;
			add( kids[ 0 ], { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_key: 'name', field_required: 'yes' } } );
			add( kids[ 1 ], { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Car model', field_key: 'car' } } );
			add( kids[ 2 ], { elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_key: 'email' } } );
			add( kids[ 2 ], { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send' } } );
			await tick();
			await $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { post_title: 'Steps', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
			await $e.run( 'document/save/publish' );
		}, { user: ph( 'user' ), car: ph( 'car' ), check: ph( 'check-circle' ) } );
		await page.waitForTimeout( 3500 );

		// the panel
		await page.evaluate( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const steps = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === 'rfb-steps' );
			$e.run( 'panel/editor/open', { model: steps.model, view: steps.view } );
		} );
		await page.waitForTimeout( 1000 );
		await page.locator( '.refraction-control-section_step_layout' ).click();
		await page.waitForTimeout( 400 );
		const looks = await page.$$eval( 'select[data-setting="step_progress"] option', ( els ) => els.map( ( e ) => e.value ) );
		const layouts = await page.$$eval( 'select[data-setting="step_layout"] option', ( els ) => els.map( ( e ) => e.value ) );
		check( 'panel', 'Layout and progress offers 3 layouts and the 8 new progress looks (plus the earlier ones)', layouts.join( ',' ) === 'top,sidebar,accordion' && [ 'connected', 'bar_percent', 'slider', 'segments', 'ring', 'dots', 'chevrons', 'bar_label' ].every( ( l ) => looks.includes( l ) ), looks.join( ',' ) );

		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const formPage = seed( 'page', { title: 'Steps', slug: 'steps', content: `[refraction_form collection="${ slug }"]` } );

		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1000 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		const load = async () => { await v.goto( formPage.url ); await v.waitForSelector( 'form[data-rfb-form].rfb-multistep' ); };
		const toStep2 = async () => { await v.fill( '[data-rfb-key="name"] input', 'Ann' ); await v.click( 'button.rfb-next' ); await v.waitForTimeout( 250 ); };
		const shot = async ( name ) => v.screenshot( { path: join( SHOTS, name + '.png' ), clip: await v.locator( 'form[data-rfb-form]' ).boundingBox() } );

		// 1. circles joined by a line
		await load();
		check( 'connected', 'three circles, the first current; "Step 1/3" above the step', ( await v.locator( '.rfb-pg-connected li' ).count() ) === 3 && ( await v.locator( '.rfb-pg-connected li.is-current' ).textContent() ).includes( 'Your details' ) && ( await v.locator( '.rfb-step:not([hidden]) .rfb-step-count' ).textContent() ) === 'Step 1/3' );
		await toStep2();
		check( 'connected', 'after Next the first is done with a tick and the line to step 2 takes the color', ( await v.locator( '.rfb-pg-connected li' ).nth( 0 ).getAttribute( 'class' ) ).includes( 'is-done' ) && await v.locator( '.rfb-pg-connected li' ).nth( 0 ).locator( '.rfb-pg-check' ).isVisible() && ( await v.locator( '.rfb-pg-connected li' ).nth( 1 ).evaluate( ( li ) => getComputedStyle( li, '::before' ).backgroundColor ) ) === ( await v.locator( '.rfb-pg-connected li.is-current .rfb-pg-dot' ).evaluate( ( d ) => getComputedStyle( d ).backgroundColor ) ) );
		await shot( 'connected' );

		const variants = [
			[ 'bar_percent', async () => ( await v.locator( '.rfb-progress-bar_percent .rfb-pg-pct' ).textContent() ) === '67 %' && ( await v.locator( '.rfb-bar span' ).evaluate( ( s ) => s.style.width ) ) === '67%', 'bar under 67 %' ],
			[ 'slider', async () => ( await v.locator( '.rfb-pg-bubble' ).textContent() ) === '67 %' && await v.locator( '.rfb-pg-knob' ).isVisible(), 'knob and bubble at 67 %' ],
			[ 'segments', async () => ( await v.locator( '.rfb-pg-segments li.is-done, .rfb-pg-segments li.is-current' ).count() ) === 2 && ( await v.locator( '.rfb-pg-segments li' ).count() ) === 3, 'two of three segments filled' ],
			[ 'ring', async () => ( await v.locator( '.rfb-pg-center' ).textContent() ) === '2 of 3' && ( await v.locator( '.rfb-pg-text .rfb-pg-name' ).textContent() ) === 'Your car' && ( await v.locator( '.rfb-pg-next' ).textContent() ) === 'Next: Confirm', '"2 of 3", "Your car", "Next: Confirm"' ],
			[ 'dots', async () => ( await v.locator( '.rfb-pg-center' ).textContent() ) === '67 %' && ( await v.locator( '.rfb-pg-dots i.is-on' ).count() ) === 8, '67 % with 8 of 12 dots' ],
			[ 'chevrons', async () => ( await v.locator( '.rfb-pg-chevrons li.is-done .rfb-pg-check' ).isVisible() ) && ( await v.locator( '.rfb-pg-chevrons li.is-current' ).textContent() ).includes( 'Your car' ), 'a done arrow with a tick, the current one' ],
			[ 'bar_label', async () => ( await v.locator( '.rfb-progress-bar_label .rfb-pg-pct' ).textContent() ) === '67 %' && ( await v.locator( '.rfb-progress-bar_label .rfb-pg-name' ).textContent() ) === 'Your car' && ( await v.locator( '.rfb-pg-of' ).textContent() ) === 'Step 2 of 3', '67 %, "Your car", "Step 2 of 3"' ],
		];

		for ( const [ look, test, what ] of variants ) {
			setSteps( docId, { step_progress: look, step_layout: 'top' } );
			await load();
			await toStep2();
			check( look, `on step 2: ${ what }`, await test() );
			await shot( look );
		}

		// sidebar
		setSteps( docId, { step_progress: 'none', step_layout: 'sidebar', side_heading: 'Book your service' } );
		await load();
		const side = v.locator( '.rfb-steps-side' );
		const sideBox = await side.boundingBox();
		const stepBox = await v.locator( '.rfb-step:not([hidden])' ).boundingBox();
		check( 'sidebar', 'the steps sit in a sidebar on the left with the heading, titles and descriptions; the step on the right', ( await side.locator( '.rfb-side-heading' ).textContent() ) === 'Book your service' && ( await side.locator( 'li' ).count() ) === 3 && ( await side.locator( 'li' ).nth( 1 ).textContent() ).includes( 'The car you drive' ) && sideBox.x + sideBox.width <= stepBox.x && Math.abs( sideBox.y - stepBox.y ) < 120 );
		await side.locator( 'li' ).nth( 1 ).locator( 'button' ).click();
		check( 'sidebar', 'clicking the next step with the required name empty stays on step 1', await v.locator( '.rfb-step' ).nth( 0 ).isVisible() );
		await v.fill( '[data-rfb-key="name"] input', 'Ann' );
		await side.locator( 'li' ).nth( 1 ).locator( 'button' ).click();
		await v.waitForTimeout( 200 );
		check( 'sidebar', 'with the name filled it moves to step 2; step 1 shows a tick, step 3 (the next one) can be clicked', await v.locator( '.rfb-step' ).nth( 1 ).isVisible() && await side.locator( 'li' ).nth( 0 ).locator( '.rfb-pg-check' ).isVisible() && ! ( await side.locator( 'li' ).nth( 2 ).locator( 'button' ).isDisabled() ) );
		await side.locator( 'li' ).nth( 0 ).locator( 'button' ).click();
		check( 'sidebar', 'clicking step 1 goes back at once; step 2 (visited, not done) has no tick', await v.locator( '.rfb-step' ).nth( 0 ).isVisible() && ! ( await side.locator( 'li' ).nth( 1 ).locator( '.rfb-pg-check' ).isVisible() ) && ( await side.locator( 'li' ).nth( 1 ).getAttribute( 'class' ) ).includes( 'is-visited' ) );
		await shot( 'sidebar' );
		await v.setViewportSize( { width: 390, height: 1000 } );
		await v.waitForTimeout( 200 );
		check( 'sidebar', 'on a phone the sidebar is a row above the step and nothing is wider than the screen', ( await side.boundingBox() ).y < ( await v.locator( '.rfb-step:not([hidden])' ).boundingBox() ).y && await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ) );
		await v.setViewportSize( { width: 1200, height: 1000 } );

		// accordion
		setSteps( docId, { step_layout: 'accordion' } );
		await load();
		const heads = v.locator( '.rfb-acc-step' );
		check( 'accordion', 'three sections: the first in progress and open, its icon, "Step 1 of 3"; the others not started (said once)', ( await heads.count() ) === 3 && ( await heads.nth( 2 ).locator( '.rfb-acc-step-side strong' ).textContent() ) === '' && ( await heads.nth( 0 ).getAttribute( 'aria-expanded' ) ) === 'true' && ( await heads.nth( 0 ).locator( '.rfb-acc-status' ).textContent() ) === 'In progress' && ( await heads.nth( 0 ).locator( '.rfb-acc-step-icon svg' ).count() ) === 1 && ( await heads.nth( 0 ).locator( '.rfb-acc-step-side strong' ).textContent() ) === 'Step 1 of 3' && ( await heads.nth( 2 ).locator( '.rfb-acc-status' ).textContent() ) === 'Not started' );
		check( 'accordion', 'Next sits inside the open section', await v.locator( '.rfb-step' ).nth( 0 ).locator( 'button.rfb-next' ).isVisible() );
		await toStep2();
		check( 'accordion', 'after Next: step 1 Completed / All set!, step 2 open and in progress, Back and Next inside it', ( await heads.nth( 0 ).locator( '.rfb-acc-status' ).textContent() ) === 'Completed' && ( await heads.nth( 0 ).locator( '.rfb-acc-step-side strong' ).textContent() ) === 'All set!' && ( await heads.nth( 1 ).getAttribute( 'aria-expanded' ) ) === 'true' && await v.locator( '.rfb-step' ).nth( 1 ).locator( 'button.rfb-back' ).isVisible() && await v.locator( '.rfb-step' ).nth( 1 ).locator( 'button.rfb-next' ).isVisible() );
		await shot( 'accordion' );
		await heads.nth( 0 ).click();
		check( 'accordion', 'clicking the completed section opens it again', ( await heads.nth( 0 ).getAttribute( 'aria-expanded' ) ) === 'true' && await v.locator( '.rfb-step' ).nth( 0 ).isVisible() );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall step layout checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
