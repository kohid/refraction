#!/usr/bin/env node
/**
 * Form Builder part 10 check: forms built in the page editor (stage 2). Steps, Group and Repeater widgets that hold the
 * fields you drop into them, conditional visibility from a field's Advanced tab, file upload and signature widgets, saved
 * into the collection with their nesting, and a real multi-step submission on the site (SQLite test site, Chromium).
 *
 * Usage: node scripts/check-form-builder-10.mjs [--site /tmp/rf-fb10-site] [--port 8930] [--shots /tmp/fb10-shots]
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
const SITE = arg( 'site', '/tmp/rf-fb10-site' );
const PORT = arg( 'port', '8930' );
const SHOTS = arg( 'shots', '/tmp/fb10-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
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

async function login( browser, user, pass ) {
	const ctx = await browser.newContext( { viewport: { width: 1500, height: 1000 }, acceptDownloads: true } );
	const page = await ctx.newPage();
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000 } ), page.click( '#wp-submit' ) ] );
	return { ctx, page };
}

const unlabelled = ( page ) => page.evaluate( () => Array.from( document.querySelectorAll( '.rfb-wrap input, .rfb-wrap select, .rfb-wrap textarea, .rfb-front input, .rfb-front select, .rfb-front textarea' ) )
	.filter( ( el ) => el.type !== 'hidden' && ! el.closest( 'template, [hidden], .rfb-hp, [aria-hidden=true], .rfb-cc-fields' ) && el.offsetParent !== null && ! el.closest( '.rfb-color-row, .rfb-range-row' ) )
	.filter( ( el ) => ! ( el.labels && el.labels.length ) && ! el.getAttribute( 'aria-label' ) && ! el.getAttribute( 'aria-labelledby' ) )
	.map( ( el ) => `${ el.tagName }[name=${ el.name }]` ) );

/** Native drag with real mouse events (see check-form-builder.mjs). */
async function drag( page, source, target, offset = { x: 40, y: 4 } ) {
	await target.evaluate( ( el ) => el.scrollIntoView( { block: 'center' } ) );
	await source.evaluate( ( el ) => el.scrollIntoView( { block: 'center' } ) );
	const from = await source.boundingBox();
	await page.mouse.move( from.x + from.width / 2, from.y + from.height / 2 );
	await page.mouse.down();
	await page.mouse.move( from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 } );
	const to = await target.boundingBox();
	// A tall drop area can have its top under the admin bar; aim at the part that is on screen.
	const aim = { x: to.x + offset.x, y: Math.max( to.y + offset.y, 320 ) };
	await page.mouse.move( aim.x, aim.y, { steps: 12 } );
	await page.waitForTimeout( 200 );
	await page.mouse.move( aim.x + 1, aim.y + 1 );
	if ( process.env.DRAGDEBUG ) { console.log( 'drag aim', JSON.stringify( aim ), JSON.stringify( to ), await page.evaluate( ( [ x, y ] ) => { const e = document.elementFromPoint( x, y ); const l = e && e.closest( '.rfb-cv-list' ); return ( e && e.className ) + ' | owner ' + ( l && l.dataset.owner ) + ' | denied ' + document.querySelectorAll( '.is-denied' ).length; }, [ aim.x + 1, aim.y + 1 ] ) ); }
	await page.waitForTimeout( 200 );
	await page.mouse.up();
	await page.waitForTimeout( 400 );
}

const MU = `<?php
add_filter( 'pre_wp_mail', function ( $null, $atts ) { return true; }, 10, 2 );
`;

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-d', 'upload_max_filesize=20M', '-d', 'post_max_size=25M', '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const consoleErrors = [];
	const watch = ( page, label ) => {
		page.on( 'pageerror', ( e ) => consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
	};

	try {
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
		const { page } = await login( browser, 'admin', 'admin' );
		watch( page, 'admin' );
		await page.setViewportSize( { width: 1500, height: 950 } );

		await page.goto( BUILDER );
		await page.goto( await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' ), { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await page.waitForTimeout( 2500 );
		const tiles = await page.$$eval( '.refraction-panel-category', ( els ) => [ ...els[ 0 ].querySelectorAll( '.refraction-element' ) ].map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'Steps, Group, Repeater, File upload and Signature are in the Form Builder category', [ 'Steps', 'Group', 'Repeater', 'File upload', 'Signature' ].every( ( t ) => tiles.includes( t ) ), tiles.join( '|' ) );

		// Build: Steps > [ step 1: name, Address group (street, city); step 2: Guests repeater (guest), service, wants mail + conditional email, photo, signature, submit ]
		const built = await page.evaluate( async () => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const tick = () => new Promise( ( r ) => setTimeout( r, 400 ) );
			// A nested widget's box exists once the editor has drawn it.
			const inner = async ( widget ) => {
				await tick();

				return refraction.getContainer( widget.id ).children[ 0 ];
			};
			const page = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			const steps = add( page, { elType: 'widget', widgetType: 'rfb-steps', settings: {} } );
			const one = steps.children[ 0 ];
			const two = steps.children[ 1 ];
			add( one, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_required: 'yes' } } );
			const group = add( one, { elType: 'widget', widgetType: 'rfb-field-group', settings: { field_label: 'Address' } } );
			const groupBox = await inner( group );
			add( groupBox, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Street', field_required: 'yes' } } );
			add( groupBox, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'City' } } );
			const rep = add( two, { elType: 'widget', widgetType: 'rfb-field-repeater', settings: { field_label: 'Guests', min_rows: 1, max_rows: 3, add_label: 'Add guest' } } );
			add( await inner( rep ), { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Guest name' } } );
			add( two, { elType: 'widget', widgetType: 'rfb-field-toggle', settings: { field_label: 'Email me', field_key: 'wants_mail' } } );
			add( two, { elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_required: 'yes', cond_enabled: 'yes', cond_action: 'show', cond_match: 'all', cond_rules: [ { field: 'wants_mail', op: 'equals', value: '1' } ] } } );
			add( two, { elType: 'widget', widgetType: 'rfb-field-file', settings: { field_label: 'Photo', file_accept: [ 'png', 'jpg' ], file_max_size: 2, file_max_files: 2 } } );
			add( two, { elType: 'widget', widgetType: 'rfb-field-signature', settings: { field_label: 'Signature', sig_height: 150 } } );
			add( two, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send booking' } } );
			[ 'About you', 'Your booking' ].forEach( ( title, index ) => $e.run( 'document/elements/settings', { container: steps.repeaters.steps.children[ index ], settings: { step_title: title }, options: { external: true } } ) );
			// "Add step" in the panel adds a step box, removing a step removes its box.
			$e.run( 'document/repeater/insert', { container: steps, name: 'steps', model: { step_title: 'Extra' } } );
			await tick();
			const added = refraction.getContainer( steps.id ).children.length;
			$e.run( 'document/repeater/remove', { container: steps, name: 'steps', index: 2 } );
			await tick();
			window.rfbStepCounts = [ added, refraction.getContainer( steps.id ).children.length ];
			await $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { post_title: 'Hotel booking', rfb_min_seconds: 0, rfb_hourly_limit: 0, rfb_success_message: 'Booking received.' } } );
			await $e.run( 'document/save/publish' );

			await tick();

			return { counts: window.rfbStepCounts, stepChildren: steps.children.length, groupChildren: refraction.getContainer( group.id ).children.length, repChildren: refraction.getContainer( rep.id ).children.length };
		} );
		check( 'editor', 'Steps starts with two step boxes, Group and Repeater with one box each, fields can be dropped into them', built.stepChildren === 2 && built.groupChildren === 1 && built.repChildren === 1, JSON.stringify( built ) );
		check( 'editor', 'adding a step adds a step box and removing it removes the box', built.counts && built.counts[ 0 ] === 3 && built.counts[ 1 ] === 2, JSON.stringify( built.counts ) );
		await page.waitForTimeout( 3500 );
		const preview = page.frameLocator( '#refraction-preview-iframe' );
		check( 'editor', 'the preview shows both steps with their titles and the group and repeater boxes with their fields', ( await preview.locator( '.rfb-step-slot' ).count() ) === 2 && ( await preview.locator( '.rfb-step-title' ).allTextContents() ).join( '|' ) === 'About you|Your booking' && ( await preview.locator( '.rfb-group .rfb-label' ).allTextContents() ).join( '|' ).includes( 'Street' ) && ( await preview.locator( '.rfb-repeater .rfb-label' ).allTextContents() ).includes( 'Guest name' ) );
		await page.screenshot( { path: join( SHOTS, 'editor.png' ) } );

		// Advanced tab: conditional visibility section
		await preview.locator( '.refraction-widget-rfb-field-email' ).click();
		await page.waitForTimeout( 600 );
		await page.click( '.refraction-panel-navigation-tab:has-text("Advanced")' );
		await page.waitForTimeout( 400 );
		const adv = await page.$$eval( '.refraction-section-title', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'editor', 'a field\'s Advanced tab has Conditional visibility and Records table', adv.includes( 'Conditional visibility' ) && adv.includes( 'Records table' ), adv.join( '|' ) );

		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const shape = def.fields.map( ( f ) => f.type + ':' + f.key + ( f.children.length ? '[' + f.children.map( ( c ) => c.key ).join( ',' ) + ']' : '' ) ).join( ' ' );
		check( 'save', 'the collection keeps the steps, the group and the repeater with the fields inside them, in order', shape === 'step:about_you text:your_name group:address[street,city] step:your_booking repeater:guests[guest_name] toggle:wants_mail email:email file:photo signature:signature', shape );
		const email = def.fields.find( ( f ) => f.key === 'email' );
		const rep = def.fields.find( ( f ) => f.key === 'guests' );
		const photo = def.fields.find( ( f ) => f.key === 'photo' );
		check( 'save', 'conditions, repeater limits, upload and signature options are saved', email.conditions.enabled && email.conditions.rules[ 0 ].field === 'wants_mail' && email.conditions.rules[ 0 ].value === '1' && rep.min_rows === 1 && rep.max_rows === 3 && rep.add_label === 'Add guest' && [ ...photo.accept ].sort().join( ',' ) === 'jpg,png' && photo.max_files === 2 && def.fields.find( ( f ) => f.key === 'signature' ).sig_height === 150 );

		// ------------------------------------------------------------ the site
		const formPage = seed( 'page', { title: 'Hotel', slug: 'hotel', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1400 } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const visible = async ( sel ) => v.locator( sel ).first().isVisible();
		check( 'site', 'one step at a time: step 1 shows, step 2 waits, with the progress and Next', ( await visible( '[data-rfb-key="your_name"]' ) ) && ! ( await visible( '[data-rfb-key="guests"]' ) ) && ( await v.locator( '.rfb-stepper li' ).count() ) === 2 && ( await visible( '.rfb-next' ) ) && ! ( await visible( 'button.rfb-submit' ) ) );
		await v.click( '.rfb-next' );
		check( 'site', 'Next is refused while a required field of the step is empty', await visible( '[data-rfb-key="your_name"]' ) );
		await v.fill( '[data-rfb-key="your_name"] input', 'Ann' );
		check( 'site', 'fields inside the group are named under the group', ( await v.locator( '[data-rfb-key="street"] input' ).getAttribute( 'name' ) ) === 'values[address][street]' );
		await v.fill( '[data-rfb-key="street"] input', 'Main street 1' );
		await v.fill( '[data-rfb-key="city"] input', 'Town' );
		await v.click( '.rfb-next' );
		await sleep( 300 );
		check( 'site', 'Next opens step 2, Back shows, the Submit button shows on the last step', ( await visible( '[data-rfb-key="guests"]' ) ) && ! ( await visible( '[data-rfb-key="your_name"]' ) ) && ( await visible( '.rfb-back' ) ) && ( await visible( 'button.rfb-submit' ) ) );
		check( 'site', 'repeater rows are named by row', ( await v.locator( '[data-rfb-key="guests"] .rfb-rows [data-rfb-key="guest_name"] input' ).first().getAttribute( 'name' ) ) === 'values[guests][0][guest_name]' );
		await v.fill( '[data-rfb-key="guests"] .rfb-rows [data-rfb-key="guest_name"] input', 'Bob' );
		await v.click( '[data-rfb-key="guests"] [data-rfb-add]' );
		await v.locator( '[data-rfb-key="guests"] .rfb-rows .rfb-rep-row' ).nth( 1 ).locator( 'input' ).fill( 'Cleo' );
		check( 'site', 'adding a row copies the row with the next index', ( await v.locator( '[data-rfb-key="guests"] .rfb-rows .rfb-rep-row' ).count() ) === 2 && ( await v.locator( '[data-rfb-key="guests"] .rfb-rows .rfb-rep-row' ).nth( 1 ).locator( 'input' ).getAttribute( 'name' ) ) === 'values[guests][1][guest_name]' );
		check( 'site', 'the email is hidden until "Email me" is on', ! ( await visible( '[data-rfb-key="email"]' ) ) );
		await v.locator( '[data-rfb-key="wants_mail"] .rfb-switch' ).click();
		await sleep( 200 );
		check( 'site', 'turning "Email me" on shows the email field', await visible( '[data-rfb-key="email"]' ) );
		await v.fill( '[data-rfb-key="email"] input', 'ann@example.com' );
		const png = Buffer.from( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64' );
		await v.setInputFiles( '[data-rfb-key="photo"] input[type=file]', [ { name: 'room.png', mimeType: 'image/png', buffer: png } ] );
		const pad = await v.locator( '[data-rfb-key="signature"] canvas' ).boundingBox();
		await v.mouse.move( pad.x + 20, pad.y + 30 );
		await v.mouse.down();
		for ( let i = 1; i <= 12; i++ ) { await v.mouse.move( pad.x + 20 + i * 15, pad.y + 30 + ( i % 2 ) * 40, { steps: 3 } ); }
		await v.mouse.up();
		await v.screenshot( { path: join( SHOTS, 'site-step2.png' ), fullPage: true } );
		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 800 );
		check( 'site', 'the success message shows', ( await v.locator( 'body' ).textContent() ).includes( 'Booking received.' ) );
		const rec = seed( 'latest', { collection: slug } ).record;
		const val = rec ? rec.values : {};
		check( 'site', 'the record keeps the nesting: address, two guests, the email, the photo and the signature', val.your_name === 'Ann' && val.address && val.address.street === 'Main street 1' && val.address.city === 'Town' && Array.isArray( val.guests ) && val.guests.length === 2 && val.guests[ 1 ].guest_name === 'Cleo' && val.wants_mail === '1' && val.email === 'ann@example.com' && Array.isArray( val.photo ) && val.photo.length === 1 && val.photo[ 0 ].name === 'room.png' && Array.isArray( val.signature ) && val.signature.length === 1, JSON.stringify( val ).slice( 0, 500 ) );
		await vctx.close();

		// the email rule on the server: without "Email me" the email is not required and not stored
		const v2c = await browser.newContext();
		const v2 = await v2c.newPage();
		await v2.goto( formPage.url );
		await v2.fill( '[data-rfb-key="your_name"] input', 'Dan' );
		await v2.fill( '[data-rfb-key="street"] input', 'Side road' );
		await v2.click( '.rfb-next' );
		await v2.fill( '[data-rfb-key="guests"] .rfb-rows [data-rfb-key="guest_name"] input', 'Eve' );
		await Promise.all( [ v2.waitForLoadState( 'load' ), v2.click( 'button.rfb-submit' ) ] );
		await sleep( 600 );
		const rec2 = seed( 'latest', { collection: slug } ).record;
		check( 'site', 'without "Email me" the hidden required email is neither required nor stored', rec2 && rec2.values.your_name === 'Dan' && ! ( 'email' in rec2.values ) && Array.isArray( rec2.values.guests ) && rec2.values.guests.length === 1, JSON.stringify( rec2 && rec2.values ).slice( 0, 300 ) );
		await v2c.close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', consoleErrors.length === 0, consoleErrors.join( ' || ' ) );
		const errors = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( errors.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), errors.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form builder part 10 checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
