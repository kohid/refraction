#!/usr/bin/env node
/**
 * Steps in Edit Mode check (0.100.0, SQLite test site, Chromium): the layout chosen on the Steps widget shows in the
 * page builder's preview as on the site: the progress display (each of them, or the form's own when the widget's is
 * empty), "Step 1/2", the sidebar, the accordion with statuses, Back and Next with their texts and types; one step at a
 * time, moved by Back / Next, the progress, the sidebar and the accordion headers; kept when the widget is drawn again
 * and when a step is added; the step transition plays in Edit Mode and on the site, not for reduced motion.
 *
 * Usage: node scripts/check-steps-editor-preview.mjs [--site /tmp/rf-sep-site] [--port 8938] [--shots /tmp/steps-editor-shots]
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
const SITE = arg( 'site', '/tmp/rf-sep-site' );
const PORT = arg( 'port', '8938' );
const SHOTS = arg( 'shots', '/tmp/steps-editor-shots' );
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

		await page.evaluate( async () => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			const steps = add( root, { elType: 'widget', widgetType: 'rfb-steps', settings: {
				step_layout: 'top', step_progress: 'connected', step_counter: 'yes',
				back_text: 'Previous', next_text: 'Continue', next_button_type: 'success',
				steps: [ { _id: 'aaa1111', step_title: 'Your details', step_description: 'Who is travelling', step_icon: { value: 'rf-ph rf-ph-car', library: 'phosphor-regular' } }, { _id: 'bbb2222', step_title: 'Your booking', step_description: 'When and where' } ],
			} } );
			add( steps.children[ 0 ], { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_key: 'name' } } );
			add( steps.children[ 1 ], { elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_key: 'email' } } );
		} );
		await page.waitForTimeout( 2500 );
		const frame = page.frame( { name: 'refraction-preview-iframe' } ) || page.frames().find( ( f ) => f.url().includes( 'refraction-preview' ) ) || page.frames()[ 1 ];
		const set = async ( settings ) => {
			await page.evaluate( ( s ) => {
				const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
				const steps = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === 'rfb-steps' );
				$e.run( 'document/elements/settings', { container: steps, settings: s } );
			}, settings );
			await page.waitForTimeout( 1200 );
		};
		const state = () => frame.evaluate( () => {
			const box = document.querySelector( '.rfb-steps-editor' );
			const shown = ( el ) => !! el && !! el.offsetParent;
			const slots = [ ...box.querySelectorAll( ':scope > .rfb-step-slot' ) ];
			const back = box.querySelector( '.rfb-back' );
			const next = box.querySelector( '.rfb-next' );
			return {
				ready: box.classList.contains( 'rfb-ed-ready' ),
				progress: [ ...box.querySelectorAll( '.rfb-progress' ) ].filter( shown ).map( ( p ) => p.className.replace( 'rfb-progress ', '' ).replace( ' rfb-ed-built', '' ) ),
				current: [ ...box.querySelectorAll( '.rfb-progress li' ) ].findIndex( ( li ) => li.classList.contains( 'is-current' ) ),
				slots: slots.length,
				shownSlot: slots.findIndex( shown ),
				shownCount: slots.filter( shown ).length,
				count: [ ...box.querySelectorAll( '.rfb-step-count' ) ].filter( shown ).map( ( c ) => c.textContent ),
				side: shown( box.querySelector( '.rfb-steps-side' ) ) ? [ ...box.querySelectorAll( '.rfb-steps-side li' ) ].map( ( li ) => li.textContent.trim() ) : null,
				sideCurrent: [ ...box.querySelectorAll( '.rfb-steps-side li' ) ].findIndex( ( li ) => li.classList.contains( 'is-current' ) ),
				grid: getComputedStyle( box ).display,
				acc: [ ...box.querySelectorAll( '.rfb-acc-step' ) ].filter( shown ).map( ( h ) => h.querySelector( '.rfb-acc-status' ).textContent ),
				back: shown( back ) ? back.textContent.trim() : null,
				next: shown( next ) ? next.textContent.trim() : null,
				nextClass: next ? next.className : '',
				navInSlot: !! ( next && next.closest( '.rfb-step-slot' ) ),
			};
		} );
		// Screenshots of the preview alone: the editor's panel and structure are closed first.
		const shot = async ( name ) => {
			const el = await frame.$( '.rfb-steps-editor' );
			if ( ! el ) { return; }
			await page.evaluate( () => { try { $e.run( 'panel/close' ); } catch ( e ) {} try { $e.run( 'navigator/close' ); } catch ( e ) {} } );
			await frame.evaluate( () => { const s = document.createElement( 'style' ); s.id = 'rf-shot'; s.textContent = '.refraction-element-overlay, .refraction-editor-element-settings { display: none !important; }'; document.head.appendChild( s ); } );
			await page.waitForTimeout( 500 );
			await el.screenshot( { path: join( SHOTS, name ) } );
			await frame.evaluate( () => document.getElementById( 'rf-shot' ).remove() );
		};
		await frame.waitForSelector( '.rfb-steps-editor.rfb-ed-ready', { timeout: 15000 } );

		let st = await state();
		check( 'top', 'Edit Mode shows the connected progress, "Step 1/2", step 1 only, and Continue (Success) without Previous', st.progress.join() === 'rfb-progress-connected' && st.current === 0 && st.shownSlot === 0 && st.shownCount === 1 && st.count.join() === 'Step 1/2' && st.next === 'Continue' && st.nextClass.includes( 'rfb-type-success' ) && null === st.back, JSON.stringify( st ) );
		await page.waitForTimeout( 1500 );
		const icons = () => frame.evaluate( () => [ ...document.querySelectorAll( '.rfb-steps-editor .rfb-progress li, .rfb-steps-editor .rfb-steps-side li' ) ].map( ( li ) => ( li.querySelector( '.rfb-pg-icon svg' ) && getComputedStyle( li.querySelector( '.rfb-pg-icon' ) ).display !== 'none' ? 'icon' : '' ) || ( li.querySelector( '.rfb-pg-num, .rfb-stepper-num' ) || {} ).textContent || '' ) );
		check( 'icons', 'the step with an icon shows the icon in place of its number in the connected progress; the others keep their numbers', ( await icons() ).join() === 'icon,2', ( await icons() ).join() );
		await shot( 'top-connected-1.png' );
		await frame.locator( '.rfb-steps-editor .rfb-next' ).dispatchEvent( 'click' );
		await page.waitForTimeout( 400 );
		st = await state();
		check( 'top', 'Continue moves the preview to step 2: the progress follows, Previous appears, Continue goes', st.shownSlot === 1 && st.current === 1 && st.back === 'Previous' && null === st.next, JSON.stringify( st ) );
		await shot( 'top-connected-2.png' );
		await frame.click( '.rfb-steps-editor .rfb-progress li >> nth=0' );
		await page.waitForTimeout( 400 );
		check( 'top', 'clicking step 1 in the progress shows step 1 again', ( await state() ).shownSlot === 0 );

		for ( const style of [ 'steps', 'bar_percent', 'slider', 'segments', 'ring', 'dots', 'chevrons', 'bar_label', 'bar' ] ) {
			await set( { step_progress: style } );
			st = await state();
			check( 'progress', `"${ style }" shows in Edit Mode as soon as it is chosen`, st.progress.join() === 'rfb-progress-' + style && st.shownCount === 1, JSON.stringify( st.progress ) );
			if ( [ 'slider', 'ring', 'chevrons' ].includes( style ) ) { await shot( `progress-${ style }.png` ); }
			if ( 'steps' === style ) {
				check( 'icons', 'numbered steps: the icon in place of 1, then 2', ( await icons() ).join() === 'icon,2', ( await icons() ).join() );
				await shot( 'progress-steps-icon.png' );
			}
			if ( 'chevrons' === style ) {
				check( 'icons', 'arrows: the icon beside the first step\'s title', ( await icons() )[ 0 ] === 'icon' );
			}
		}
		await set( { step_progress: 'none' } );
		check( 'progress', '"None" shows no progress', ( await state() ).progress.length === 0 );
		await page.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { rfb_progress: 'bar_percent' } } ) );
		await set( { step_progress: '' } );
		check( 'progress', '"As in the form settings" shows the form\'s own progress display', ( await state() ).progress.join() === 'rfb-progress-bar_percent' );

		await frame.locator( '.rfb-steps-editor .rfb-next' ).dispatchEvent( 'click' );
		await page.waitForTimeout( 300 );
		await set( { step_layout: 'sidebar', side_heading: 'Set up your booking' } );
		st = await state();
		check( 'sidebar', 'the sidebar shows beside the step with its heading, titles and descriptions; the step shown (2) is kept', st.grid === 'grid' && st.side && st.side.length === 2 && st.side[ 0 ].includes( 'Your details' ) && st.side[ 0 ].includes( 'Who is travelling' ) && st.sideCurrent === 1 && st.shownSlot === 1 && await frame.evaluate( () => document.querySelector( '.rfb-steps-side' ).textContent.includes( 'Set up your booking' ) ), JSON.stringify( st ) );
		const tall = await frame.evaluate( () => [ document.querySelector( '.rfb-steps-editor' ).getBoundingClientRect().height, document.querySelector( '.rfb-steps-side ol' ).getBoundingClientRect().height ] );
		check( 'sidebar', 'the sidebar is as tall as the step, not stretched by the editor\'s gaps', tall[ 0 ] < 600, JSON.stringify( tall ) );
		await shot( 'sidebar.png' );
		check( 'icons', 'sidebar: the icon in place of 1 (still shown once the step is done), 2 for the next', ( await icons() ).join() === 'icon,2', ( await icons() ).join() );
		await frame.click( '.rfb-steps-side li >> nth=0' );
		await page.waitForTimeout( 400 );
		check( 'sidebar', 'clicking a step in the sidebar shows it', ( await state() ).shownSlot === 0 );

		await set( { step_layout: 'accordion' } );
		st = await state();
		check( 'accordion', 'the accordion shows a header per step with its status; Back / Next sit inside the open step; no progress, no "Step 1/2"', st.acc.join( '|' ) === 'In progress|Not started' && st.navInSlot && st.progress.length === 0 && st.count.length === 0 && st.shownSlot === 0, JSON.stringify( st ) );
		await frame.click( '.rfb-steps-editor .rfb-acc-step >> nth=1' );
		await page.waitForTimeout( 400 );
		st = await state();
		check( 'accordion', 'clicking the second header opens step 2, the first reads Completed', st.acc.join( '|' ) === 'Completed|In progress' && st.shownSlot === 1, JSON.stringify( st ) );
		await shot( 'accordion.png' );

		await set( { step_layout: 'top', step_progress: 'connected' } );
		await page.evaluate( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const steps = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === 'rfb-steps' );
			$e.run( 'document/repeater/insert', { container: steps, name: 'steps', model: { _id: 'ccc3333', step_title: 'Payment' } } );
		} );
		await page.waitForTimeout( 1500 );
		st = await state();
		check( 'add step', 'a step added in the panel shows at once: three slots, three progress steps, one shown', st.slots === 3 && await frame.evaluate( () => document.querySelectorAll( '.rfb-steps-editor .rfb-progress li' ).length ) === 3 && st.shownCount === 1, JSON.stringify( st ) );

		// the step transition: chosen in the panel, played in Edit Mode at once
		await set( { step_animation: 'slide', step_animation_ms: { unit: 'px', size: 900 } } );
		await frame.click( '.rfb-steps-editor .rfb-progress li >> nth=0' );
		await page.waitForTimeout( 1200 );
		await frame.locator( '.rfb-steps-editor .rfb-next' ).dispatchEvent( 'click' );
		const edAnim = await frame.evaluate( () => { const slot = [ ...document.querySelectorAll( '.rfb-steps-editor > .rfb-step-slot' ) ].find( ( s ) => s.offsetParent ); return slot.getAnimations().map( ( a ) => Math.round( a.effect.getTiming().duration ) ); } );
		check( 'animation', 'Edit Mode plays the chosen Slide transition (900 ms) when Next is used', edAnim.includes( 900 ), JSON.stringify( edAnim ) );
		await shot( 'transition-mid.png' );

		// every transition kind plays in Edit Mode as soon as it is chosen
		for ( const kind of [ 'fade', 'slide', 'slide_up', 'slide_down', 'slide_flow', 'zoom', 'zoom_out', 'flip', 'flip_x', 'blur', 'rotate', 'skew', 'bounce', 'drop' ] ) {
			await set( { step_animation: kind, step_animation_ms: { unit: 'px', size: 700 } } );
			await frame.click( '.rfb-steps-editor .rfb-progress li >> nth=0' );
			await page.waitForTimeout( 800 );
			await frame.locator( '.rfb-steps-editor .rfb-next' ).dispatchEvent( 'click' );
			const played = await frame.evaluate( () => [ ...document.querySelectorAll( '.rfb-steps-editor > .rfb-step-slot' ) ].find( ( s ) => s.offsetParent ).getAnimations().length );
			check( 'transitions', `"${ kind }" plays in Edit Mode`, played > 0 );
		}
		await set( { step_animation: 'drop', step_animation_ms: { unit: 'px', size: 700 }, step_animation_delay: { unit: 'px', size: 100 }, step_animation_ease: 'back', step_animation_stagger: { unit: 'px', size: 80 }, step_animation_distance: { unit: 'px', size: 120 } } );
		await frame.click( '.rfb-steps-editor .rfb-progress li >> nth=0' );
		await page.waitForTimeout( 1000 );
		await frame.locator( '.rfb-steps-editor .rfb-next' ).dispatchEvent( 'click' );
		const staggered = await frame.evaluate( () => {
			const slot = [ ...document.querySelectorAll( '.rfb-steps-editor > .rfb-step-slot' ) ].find( ( s ) => s.offsetParent );
			return [ ...slot.querySelectorAll( '*' ) ].flatMap( ( el ) => el.getAnimations( { subtree: false } ).map( ( a ) => ( { cls: el.className.split( ' ' )[ 0 ], delay: a.effect.getTiming().delay, easing: a.effect.getTiming().easing, from: a.effect.getKeyframes()[ 0 ].transform } ) ) );
		} );
		check( 'transitions', 'Field by field: the head, then each field, 80 ms apart after a 100 ms delay, with Overshoot easing and the 120 px distance', staggered.length >= 2 && staggered[ 0 ].delay === 100 && staggered[ 1 ].delay === 180 && staggered.every( ( a ) => a.easing.includes( '1.56' ) ) && staggered[ 0 ].from === 'translateY(-120px)', JSON.stringify( staggered ) );
		await set( { step_animation: 'slide', step_animation_ms: { unit: 'px', size: 900 }, step_animation_delay: { unit: 'px', size: 0 }, step_animation_stagger: { unit: 'px', size: 0 }, step_animation_ease: 'smooth', step_animation_distance: { unit: 'px', size: 48 } } );

		// the site still works as before
		await page.evaluate( () => $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const formPage = seed( 'page', { title: 'Steps preview', slug: 'steps-preview', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1000, height: 1000 } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form] .rfb-progress-connected' );
		check( 'site', 'the site shows the same layout: connected progress, three steps, Continue, and the car icon in place of 1', ( await v.locator( '.rfb-progress-connected li' ).count() ) === 3 && ( await v.locator( 'button.rfb-next .rfb-btn-text' ).textContent() ) === 'Continue' && ( await v.locator( '.rfb-progress-connected li >> nth=0' ).locator( '.rfb-pg-icon svg' ).count() ) === 1 && ( await v.locator( '.rfb-progress-connected li >> nth=1' ).locator( '.rfb-pg-num' ).textContent() ) === '2' );
		await v.screenshot( { path: join( SHOTS, 'site.png' ), clip: await v.locator( 'form[data-rfb-form]' ).boundingBox() } );
		await v.fill( '[data-rfb-key="name"] input', 'Ann' );
		await v.click( 'button.rfb-next' );
		const siteAnim = await v.evaluate( () => { const step = [ ...document.querySelectorAll( '[data-rfb-step]' ) ].find( ( s ) => ! s.hidden ); return step.getAnimations().map( ( a ) => Math.round( a.effect.getTiming().duration ) ); } );
		check( 'animation', 'the site plays the same transition on Next', siteAnim.includes( 900 ), JSON.stringify( siteAnim ) );
		await vctx.close();
		const calm = await browser.newContext( { viewport: { width: 1000, height: 1000 }, reducedMotion: 'reduce' } );
		const c = await calm.newPage();
		await c.goto( formPage.url );
		await c.fill( '[data-rfb-key="name"] input', 'Ann' );
		await c.click( 'button.rfb-next' );
		const calmAnim = await c.evaluate( () => { const step = [ ...document.querySelectorAll( '[data-rfb-step]' ) ].find( ( s ) => ! s.hidden ); return step.getAnimations().length; } );
		check( 'animation', 'visitors who ask for less motion get the next step without the transition', 0 === calmAnim && await c.locator( '[data-rfb-key="email"]' ).isVisible() );
		await calm.close();
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall steps editor preview checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
