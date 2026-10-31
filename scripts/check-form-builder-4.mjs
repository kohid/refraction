#!/usr/bin/env node
/**
 * Form Builder part 4 check: conditional fields that must stay editable however often their rule flips, and the per-field Style tab
 * (spacing, background, border, shadow, alignment, typography, hover, focus, button-style choices), on a real WordPress (SQLite test
 * site, Chromium via Playwright).
 *
 * Usage: node scripts/check-form-builder-4.mjs [--site /tmp/rf-fb4-site] [--port 8924] [--shots /tmp/fb4-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip), served by `php -d
 * upload_max_filesize=20M -d post_max_size=25M -S ...` so 6 MB test uploads reach the plugin's own limit. Throw-away site.
 *
 * Covers: a conditional field flipped many times on the public form and on the admin edit screen (enabled, editable, value kept, saved);
 * the Style sub-tab (groups per field type, spacing boxes, colors, enums, reset, hover and focus preview), live on the canvas;
 * the saved styles on the public page (computed styles, real hover and focus, button-style choices that select on click and from
 * the keyboard), several field types at once, rejected values, no stray CSS for unstyled fields, and the admin edit screen.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fb4-site' );
const PORT = arg( 'port', '8924' );
const SHOTS = arg( 'shots', '/tmp/fb4-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/form-builder-seed.php' );
const BUILDER = `${ BASE }/wp-admin/admin.php?page=refraction-builder`;
const FILES = '/tmp/fb4-files';

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
	.filter( ( el ) => el.type !== 'hidden' && ! el.closest( 'template, [hidden], .rfb-hp, [aria-hidden=true]' ) && el.offsetParent !== null && ! el.closest( '.rfb-color-row, .rfb-range-row' ) )
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
	await page.mouse.move( to.x + offset.x, to.y + offset.y, { steps: 12 } );
	await page.waitForTimeout( 200 );
	await page.mouse.move( to.x + offset.x + 1, to.y + offset.y + 1 );
	await page.waitForTimeout( 200 );
	await page.mouse.up();
	await page.waitForTimeout( 400 );
}

const MU = `<?php
// Captures mail and outgoing HTTP for scripts/check-form-builder-2.mjs instead of sending anything.
add_filter( 'pre_wp_mail', function ( $null, $atts ) { file_put_contents( WP_CONTENT_DIR . '/fb-mail.log', wp_json_encode( $atts ) . "\\n", FILE_APPEND ); return true; }, 10, 2 );
add_filter( 'pre_http_request', function ( $pre, $args, $url ) {
	if ( false === strpos( $url, 'hooks.test' ) ) { return $pre; }
	file_put_contents( WP_CONTENT_DIR . '/fb-http.log', wp_json_encode( [ 'url' => $url, 'args' => $args ] ) . "\\n", FILE_APPEND );
	return [ 'response' => [ 'code' => 200, 'message' => 'OK' ], 'body' => 'ok', 'headers' => [], 'cookies' => [], 'filename' => null ];
}, 10, 3 );
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
		page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /favicon\.ico|status of 404/.test( m.location().url + m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ page.url() }` ); } } );
		page.on( 'pageerror', ( e ) => consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
	};

	try {
		const installed = new Set( wp( [ 'theme', 'list', '--field=name' ] ).split( '\n' ) );
		const themes = [];
		for ( const t of THEMES ) {
			if ( ! installed.has( t ) ) {
				try { wp( [ 'theme', 'install', t ] ); installed.add( t ); } catch { console.log( `note: theme ${ t } could not be installed; skipped` ); continue; }
			}
			themes.push( t );
		}
		check( 'setup', 'a classic and a block theme are available', themes.length >= 2, themes.join( ',' ) );
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );

		// Log in first: the PHP test server has a handful of workers and a login queued behind idle visitor connections can stall.
		const { ctx, page } = await login( browser, 'admin', 'admin' );
		watch( page, 'admin' );
		await page.setViewportSize( { width: 1500, height: 900 } );
		const logo = seed( 'attachment' );
		const cond = ( field, value, op = 'equals' ) => ( { enabled: true, action: 'show', match: 'all', rules: [ { field, op, value } ] } );
		const pets = {
			label: 'Pets', singular: 'Pet', public_form: true, success_message: 'Saved.',
			statuses: [ { label: 'New', color: 'primary' } ],
			settings: { hourly_limit: 0, min_seconds: 3 },
			fields: [
				{ key: 'owner', label: 'Owner', type: 'text', required: true },
				{ key: 'pet_type', label: 'Pet Type', type: 'radio', options: 'Dog\nCat\nOther', required: true },
				{ key: 'specify', label: 'Please specify', type: 'text', conditions: cond( 'pet_type', 'Other' ) },
				{ key: 'meds', label: 'Does your pet have any medical conditions?', type: 'radio', options: 'Yes\nNo', style: { choice_look: 'buttons', b_on_bg: '#ff7f50', b_on_border_color: '#ff7f50', b_bg: '#f5f5f7', b_radius: 4 } },
				{ key: 'meds_detail', label: 'Medical details', type: 'textarea', conditions: cond( 'meds', 'Yes' ) },
				{ key: 'vip', label: 'VIP', type: 'toggle' },
				{ key: 'vip_note', label: 'VIP note', type: 'text', conditions: cond( 'vip', '1' ) },
				{ key: 'contact', label: 'Contact', type: 'group', children: [ { key: 'via', label: 'Contact by', type: 'select', options: 'Email\nPhone' }, { key: 'phone_no', label: 'Phone number', type: 'text', conditions: cond( 'via', 'Phone' ) } ] },
				{ key: 'pets', label: 'More pets', type: 'repeater', children: [ { key: 'kind', label: 'Kind', type: 'select', options: 'Fish\nBird' }, { key: 'kind_note', label: 'Kind note', type: 'text', conditions: cond( 'kind', 'Bird' ) } ] },
			],
		};
		check( 'setup', 'the pets collection is saved', seed( 'collection', { definition: pets } ).fields >= 9 );

		const formPage = seed( 'page', { title: 'Pets', slug: 'pets-form', content: '[refraction_form collection="pets"]' } );
		const radio = ( v, name, value ) => v.locator( `input[name="values[${ name }]"][value="${ value }"]` );
		const pick = async ( v, name, value ) => { await v.locator( `label:has(input[name="values[${ name }]"][value="${ value }"])` ).click(); };

		// ------------------------------------------------------------ conditional fields keep working
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 900 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `conditions ${ theme }`;
			await v.goto( formPage.url );
			await v.waitForLoadState( 'load' );
			const specify = v.locator( '#rfb-values-specify' );
			const wrap = v.locator( '.rfb-field[data-rfb-key=specify]' );

			check( area, 'a conditional field starts hidden and disabled', ! ( await wrap.isVisible() ) && await specify.isDisabled() );
			await pick( v, 'pet_type', 'Other' );
			check( area, 'choosing Other shows it and enables it', await wrap.isVisible() && await specify.isEnabled() );
			await specify.fill( 'Parrot' );
			let sequence = [];

			for ( let round = 1; round <= 4; round++ ) {
				await pick( v, 'pet_type', round % 2 ? 'Dog' : 'Cat' );
				const hiddenNow = ! ( await wrap.isVisible() ) && await specify.isDisabled();
				await pick( v, 'pet_type', 'Other' );
				const backNow = await wrap.isVisible() && await specify.isEnabled() && ( await specify.inputValue() ) === ( round === 1 ? 'Parrot' : `Parrot ${ round - 1 }` );
				await specify.fill( `Parrot ${ round }` );
				sequence.push( hiddenNow && backNow && ( await specify.inputValue() ) === `Parrot ${ round }` );
			}

			check( area, 'it hides and comes back enabled and editable after every change of the choice, keeping what was typed', sequence.every( Boolean ), JSON.stringify( sequence ) );
			// typing in other fields must not disturb it (the old bug rewrote the saved state on every keystroke)
			await pick( v, 'pet_type', 'Dog' );
			await v.fill( '#rfb-values-owner', 'Typing a while to trigger many updates' );
			await v.locator( '#rfb-values-owner' ).pressSequentially( ' more text', { delay: 5 } );
			await pick( v, 'pet_type', 'Other' );
			check( area, 'still enabled after many keystrokes elsewhere while hidden', await specify.isEnabled() );
			await specify.fill( 'Final parrot' );

			// other kinds of rule: a Yes/No choice, a switch, a group child, a repeater row
			await pick( v, 'meds', 'Yes' );
			check( area, 'a Yes / No rule shows its field', await v.locator( '#rfb-values-meds_detail' ).isEnabled() );
			await pick( v, 'meds', 'No' );
			await pick( v, 'meds', 'Yes' );
			await v.fill( '#rfb-values-meds_detail', 'Needs pills' );
			check( area, 'and again after No and Yes', await v.locator( '#rfb-values-meds_detail' ).isEnabled() && ( await v.inputValue( '#rfb-values-meds_detail' ) ) === 'Needs pills' );
			for ( let i = 0; i < 3; i++ ) { await v.locator( '.rfb-switch:has(#rfb-values-vip)' ).click(); }
			check( area, 'a switch rule shows its field after being flipped three times', await v.locator( '#rfb-values-vip_note' ).isEnabled() );
			await v.selectOption( '#rfb-values-contact-via', 'Phone' );
			await v.selectOption( '#rfb-values-contact-via', 'Email' );
			await v.selectOption( '#rfb-values-contact-via', 'Phone' );
			check( area, 'a rule inside a group shows its field after Phone, Email, Phone', await v.locator( '#rfb-values-contact-phone_no' ).isEnabled() );
			await v.selectOption( '#rfb-values-pets-0-kind', 'Bird' );
			await v.selectOption( '#rfb-values-pets-0-kind', 'Fish' );
			await v.selectOption( '#rfb-values-pets-0-kind', 'Bird' );
			check( area, 'a rule inside a repeater row shows its field after Bird, Fish, Bird', await v.locator( '#rfb-values-pets-0-kind_note' ).isEnabled() );
			await v.click( '[data-rfb-add]' );
			await v.selectOption( '#rfb-values-pets-1-kind', 'Bird' );
			check( area, 'a new repeater row has its own working rule', await v.locator( '#rfb-values-pets-1-kind_note' ).isEnabled() && await v.locator( '#rfb-values-pets-0-kind_note' ).isEnabled() );

			await v.fill( '#rfb-values-contact-phone_no', '+351 123 456' );
			await v.fill( '#rfb-values-pets-0-kind_note', 'Cockatoo' );
			await v.fill( '#rfb-values-vip_note', 'Window seat' );
			await sleep( 3300 );
			await Promise.all( [ v.waitForNavigation(), v.click( '.rfb-submit' ) ] );
			await v.waitForLoadState( 'load' );
			const saved = seed( 'latest', { collection: 'pets' } ).record;
			check( area, 'everything typed into the re-shown fields is saved', saved && saved.values.specify === 'Final parrot' && saved.values.meds_detail === 'Needs pills' && saved.values.vip_note === 'Window seat' && saved.values.contact.phone_no === '+351 123 456' && saved.values.pets[ 0 ].kind_note === 'Cockatoo', JSON.stringify( saved && saved.values ) );
			await vctx.close();
		}

		// the same on the admin edit screen
		const rec = seed( 'latest', { collection: 'pets' } ).record;
		await page.goto( `${ BUILDER }&view=record&collection=pets&record=${ rec.id }` );
		await page.waitForLoadState( 'load' );
		const adminSpecify = page.locator( '#rfb-values-specify' );
		check( 'admin', 'the saved conditional value is shown and editable', await adminSpecify.isEnabled() && ( await adminSpecify.inputValue() ) === 'Final parrot' );
		await page.locator( 'label:has(input[name="values[pet_type]"][value="Dog"])' ).click();
		await page.locator( 'label:has(input[name="values[pet_type]"][value="Other"])' ).click();
		await page.locator( 'label:has(input[name="values[pet_type]"][value="Cat"])' ).click();
		await page.locator( 'label:has(input[name="values[pet_type]"][value="Other"])' ).click();
		check( 'admin', 'it is still editable after the choice changed four times', await adminSpecify.isEnabled() );
		await adminSpecify.fill( 'Edited in admin' );
		await Promise.all( [ page.waitForURL( /done=record-saved/ ), page.click( '.rfb-card-footer button[type=submit]' ) ] );
		check( 'admin', 'the edit is saved', seed( 'latest', { collection: 'pets' } ).record.values.specify === 'Edited in admin' );

		// ------------------------------------------------------------ Style tab in the designer
		await page.goto( `${ BUILDER }&view=design&collection=pets` );
		await page.waitForSelector( '.rfb-cv-item' );
		await page.locator( '.rfb-cv-item[data-rfb-key="pet_type"] .rfb-cv-preview-body' ).click( { force: true } );
		check( 'style tab', 'a field has Settings and Style tabs under its name', ( await page.locator( '.rfb-field-tab' ).allTextContents() ).join( '|' ) === 'Settings|Style' );
		check( 'style tab', 'Settings is shown first with its sections', ( await page.locator( '.rfb-inspector summary' ).allTextContents() ).includes( 'General' ) );

		// ---- canvas hover and selection: nothing moves, a small toolbar floats over the top edge, only the innermost field reacts
		const itemBox = ( k ) => page.locator( `.rfb-cv-item[data-rfb-key="${ k }"]` );
		await page.locator( '.rfb-cv-item.is-selected' ).first().evaluate( () => null );
		await page.keyboard.press( 'Escape' );
		await page.locator( '.rfb-canvas-inner' ).dispatchEvent( 'click' ); // a click on the empty canvas deselects
		await page.mouse.move( 5, 5 );
		const before = [ await itemBox( 'owner' ).boundingBox(), await itemBox( 'specify' ).boundingBox() ];
		await itemBox( 'specify' ).hover( { position: { x: 80, y: 30 } } );
		await page.waitForTimeout( 250 );
		const after = [ await itemBox( 'owner' ).boundingBox(), await itemBox( 'specify' ).boundingBox() ];
		check( 'canvas', 'hovering a field moves nothing', JSON.stringify( before ) === JSON.stringify( after ) );
		const bar = itemBox( 'specify' ).locator( '> .rfb-cv-bar' );
		const barBox = await bar.boundingBox();
		check( 'canvas', 'a small toolbar floats over the top-right edge', await bar.isVisible() && barBox.height <= 26 && barBox.y < after[ 1 ].y + 6 && barBox.x > after[ 1 ].x + after[ 1 ].width / 2 );
		check( 'canvas', 'it shows the type, duplicate and delete, not the move buttons', ( await bar.locator( '.rfb-cv-type' ).textContent() ) === 'Text' && await bar.locator( 'button[aria-label^="Duplicate"]' ).isVisible() && await bar.locator( 'button[aria-label^="Delete"]' ).isVisible() && ! ( await bar.locator( 'button[aria-label^="Move"]' ).first().isVisible() ) );
		check( 'canvas', 'a conditional field floats a Conditional tag at the top', await itemBox( 'specify' ).locator( '> .rfb-cv-badges' ).isVisible() && ( await itemBox( 'specify' ).locator( '> .rfb-cv-badges' ).textContent() ).includes( 'Conditional' ) );
		check( 'canvas', 'the hovered field gets a thin dashed outline', ( await itemBox( 'specify' ).evaluate( ( el ) => getComputedStyle( el ).outlineStyle + ' ' + getComputedStyle( el ).outlineWidth ) ) === 'dashed 1px' );
		check( 'canvas', 'other fields show no toolbar', ! ( await itemBox( 'owner' ).locator( '> .rfb-cv-bar' ).isVisible() ) && ( await page.locator( '.rfb-cv-bar:visible' ).count() ) === 1 );
		await itemBox( 'specify' ).click( { position: { x: 80, y: 30 } } );
		await page.waitForTimeout( 200 );
		check( 'canvas', 'the selected field has a solid outline and also the move buttons', ( await itemBox( 'specify' ).evaluate( ( el ) => getComputedStyle( el ).outlineStyle + ' ' + getComputedStyle( el ).outlineWidth ) ) === 'solid 2px' && await bar.locator( 'button[aria-label^="Move"]' ).first().isVisible() );
		await page.mouse.move( 5, 5 );
		await page.waitForTimeout( 150 );
		check( 'canvas', 'it keeps its toolbar when the pointer leaves', await bar.isVisible() && ( await page.locator( '.rfb-cv-bar:visible' ).count() ) === 1 );
		await itemBox( 'kind_note' ).hover( { position: { x: 60, y: 30 } } ).catch( () => null );
		await itemBox( 'kind' ).hover( { position: { x: 60, y: 30 } } );
		await page.waitForTimeout( 250 );
		check( 'canvas', 'inside a repeater only the hovered field shows a toolbar, not the repeater around it', await itemBox( 'kind' ).locator( '> .rfb-cv-bar' ).isVisible() && ! ( await itemBox( 'pets' ).locator( '> .rfb-cv-bar' ).isVisible() ) );
		await itemBox( 'pets' ).hover( { position: { x: 20, y: 6 } } );
		await page.waitForTimeout( 250 );
		check( 'canvas', 'hovering the repeater itself shows the repeater toolbar', ( await itemBox( 'pets' ).locator( '> .rfb-cv-bar .rfb-cv-type' ).textContent() ) === 'Repeater' );
		await page.screenshot( { path: join( SHOTS, 'canvas-hover.png' ) } );
		await page.mouse.move( 5, 5 );
		await page.locator( '.rfb-cv-item[data-rfb-key="pet_type"] .rfb-cv-preview-body' ).click( { force: true } );
		await page.click( '.rfb-field-tab[data-fieldtab="style"]' );
		await page.click( '.rfb-scope-btn[data-scope="field"]' );
		const sections = await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'style tab', 'a choice field offers: choice look, spacing/background/border, label, description, choice text', [ 'Choice look', 'Spacing, background and border', 'Label', 'Description and help', 'Choice text', 'Radio / checkbox' ].every( ( s ) => sections.includes( s ) ) && ! sections.includes( 'Input' ), sections.join( '|' ) );
		const unlS = await unlabelled( page );
		check( 'a11y', 'every style control is labelled', unlS.length === 0, unlS.join( ',' ) );

		const field = ( k ) => `.rfb-cv-item[data-rfb-key="${ k }"]`;
		const bodyOf = ( k ) => page.locator( `${ field( k ) } > .rfb-cv-preview-body` );
		const css = ( loc, prop ) => loc.evaluate( ( el, p ) => getComputedStyle( el )[ p ], prop );
		const sides = ( title ) => page.locator( `.rfb-inspector fieldset:has(legend:text-is("${ title } (px)")) input` );
		await sides( 'Margin' ).nth( 0 ).fill( '30' );
		await sides( 'Margin' ).nth( 2 ).fill( '18' );
		await sides( 'Padding' ).nth( 0 ).fill( '14' );
		await sides( 'Padding' ).nth( 3 ).fill( '22' );
		const setColor = ( label, value ) => page.locator( `.rfb-inspector .rfb-color:has(.rfb-mini:text-is("${ label }")) .rfb-hex` ).first().fill( value );
		await setColor( 'Background color', '#fff3e0' );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Border width (px)")) input' ).first().fill( '2' );
		await setColor( 'Border color', '#ff7f50' );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Border radius (px)")) input' ).first().fill( '12' );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Box shadow")) select' ).first().selectOption( 'medium' );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Alignment")) select' ).first().selectOption( 'center' );
		const body = bodyOf( 'pet_type' );
		check( 'style tab', 'spacing applies to the field on the canvas', ( await css( body, 'marginTop' ) ) === '30px' && ( await css( body, 'marginBottom' ) ) === '18px' && ( await css( body, 'paddingTop' ) ) === '14px' && ( await css( body, 'paddingLeft' ) ) === '22px' );
		check( 'style tab', 'background, border, radius, shadow and alignment apply', ( await css( body, 'backgroundColor' ) ) === 'rgb(255, 243, 224)' && ( await css( body, 'borderTopWidth' ) ) === '2px' && ( await css( body, 'borderTopStyle' ) ) === 'solid' && ( await css( body, 'borderTopColor' ) ) === 'rgb(255, 127, 80)' && ( await css( body, 'borderTopLeftRadius' ) ) === '12px' && ( await css( body, 'boxShadow' ) ).includes( '18px' ) && ( await css( body, 'textAlign' ) ) === 'center' );
		check( 'style tab', 'other fields are not touched', ( await css( bodyOf( 'owner' ), 'marginTop' ) ) !== '30px' );
		// label typography
		const labelSection = page.locator( '.rfb-inspector .rfb-section:has(> summary:text-is("Label"))' );
		await labelSection.locator( '.rfb-color:has(.rfb-mini:text-is("Text color")) .rfb-hex' ).fill( '#c2185b' );
		await labelSection.locator( '.rfb-field:has(.rfb-mini:text-is("Size (px)")) input' ).fill( '20' );
		await labelSection.locator( '.rfb-field:has(.rfb-mini:text-is("Weight")) select' ).selectOption( '800' );
		await labelSection.locator( '.rfb-field:has(.rfb-mini:text-is("Capitalization")) select' ).selectOption( 'uppercase' );
		await labelSection.locator( '.rfb-field:has(.rfb-mini:text-is("Letter spacing (px)")) input' ).fill( '2' );
		await labelSection.locator( 'label:has-text("Italic") input' ).check();
		const lab = page.locator( `${ field( 'pet_type' ) } .rfb-label` );
		check( 'style tab', 'label typography applies', ( await css( lab, 'color' ) ) === 'rgb(194, 24, 91)' && ( await css( lab, 'fontSize' ) ) === '20px' && ( await css( lab, 'fontWeight' ) ) === '800' && ( await css( lab, 'textTransform' ) ) === 'uppercase' && ( await css( lab, 'letterSpacing' ) ) === '2px' && ( await css( lab, 'fontStyle' ) ) === 'italic' );
		// choice look
		await page.locator( '.rfb-inspector select[aria-label="Choice look"]' ).selectOption( 'buttons' );
		const sections2 = await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'style tab', 'choosing buttons reveals the button and selected-button groups', sections2.includes( 'Buttons' ) && ! sections2.includes( 'Choice text' ) );
		await page.click( '.rfb-state-tab[data-state="focus"]' );
		await page.locator( '.rfb-inspector .rfb-section:has(> summary:text-is("Buttons")) .rfb-color:has(.rfb-mini:text-is("Background color")) .rfb-hex' ).fill( '#2e7d32' );
		check( 'style tab', 'the canvas previews the buttons and the selected color', ( await page.locator( `${ field( 'pet_type' ) } .rfb-choice-buttons .rfb-check` ).count() ) >= 2 && ( await css( page.locator( `${ field( 'pet_type' ) } .rfb-check:has(input:checked)` ), 'backgroundColor' ) ) === 'rgb(46, 125, 50)' );
		await page.screenshot( { path: join( SHOTS, 'style-tab-choice.png' ) } );

		// input styling with hover and focus preview on a text field
		await page.locator( `${ field( 'owner' ) } .rfb-cv-preview-body` ).click( { force: true } );
		await page.click( '.rfb-field-tab[data-fieldtab="style"]' );
		await page.click( '.rfb-scope-btn[data-scope="field"]' );
		const inputSection = page.locator( '.rfb-inspector .rfb-section:has(> summary:text-is("Input"))' );
		await inputSection.locator( '.rfb-color:has(.rfb-mini:text-is("Background color")) .rfb-hex' ).fill( '#e8f5e9' );
		await inputSection.locator( '.rfb-field:has(.rfb-mini:text-is("Border radius (px)")) input' ).fill( '24' );
		await inputSection.locator( '.rfb-field:has(.rfb-mini:text-is("Padding above and below (px)")) input' ).fill( '16' );
		const ownerInput = page.locator( `${ field( 'owner' ) } .rfb-input` );
		check( 'style tab', 'input styling applies to the input', ( await css( ownerInput, 'backgroundColor' ) ) === 'rgb(232, 245, 233)' && ( await css( ownerInput, 'borderTopLeftRadius' ) ) === '24px' && ( await css( ownerInput, 'paddingTop' ) ) === '16px' );
		await page.click( '.rfb-state-tab[data-state="hover"]' );
		const hover = page.locator( '.rfb-inspector .rfb-section:has(> summary:text-is("Input"))' );
		await hover.locator( '.rfb-color:has(.rfb-mini:text-is("Background color")) .rfb-hex' ).fill( '#c8e6c9' );
		// the Hover tab previews its look on the selected field already
		check( 'style tab', 'the hover look can be previewed on the form', ( await css( ownerInput, 'backgroundColor' ) ) === 'rgb(200, 230, 201)' );
		await page.click( '.rfb-state-tab[data-state="normal"]' );
		check( 'style tab', 'and switched off again', ( await css( ownerInput, 'backgroundColor' ) ) === 'rgb(232, 245, 233)' );
		// reset
		await page.locator( '.rfb-fieldstyle button:has-text("Reset this field")' ).click();
		check( 'style tab', 'reset removes the field\'s styling', ( await css( ownerInput, 'borderTopLeftRadius' ) ) !== '24px' && ( await page.locator( '.rfb-inspector .rfb-hex' ).first().inputValue() ) === '' );
		// save through the designer, then read back, reopen and view on the public page (the styles used to vanish on save)
		await inputSection.locator( '.rfb-color:has(.rfb-mini:text-is("Background color")) .rfb-hex' ).fill( '#e8f5e9' );
		await inputSection.locator( '.rfb-field:has(.rfb-mini:text-is("Border radius (px)")) input' ).fill( '24' );
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		const afterSave = seed( 'definition', { collection: 'pets' } );
		const stOf = ( key ) => afterSave.fields.find( ( f ) => f.key === key ).style;
		check( 'save', 'styles set in the designer are saved with the collection', stOf( 'pet_type' ).margin_top === 30 && stOf( 'pet_type' ).margin_bottom === 18 && stOf( 'pet_type' ).bg === '#fff3e0' && stOf( 'pet_type' ).choice_look === 'buttons' && stOf( 'pet_type' ).b_on_bg === '#2e7d32' && stOf( 'pet_type' ).l_transform === 'uppercase' && stOf( 'owner' ).c_bg === '#e8f5e9' && stOf( 'owner' ).c_radius === 24, JSON.stringify( [ stOf( 'pet_type' ), stOf( 'owner' ) ] ) );
		await page.goto( `${ BUILDER }&view=design&collection=pets` );
		await page.waitForSelector( '.rfb-cv-item' );
		await page.locator( '.rfb-cv-item[data-rfb-key="pet_type"] .rfb-cv-preview-body' ).click( { force: true } );
		await page.click( '.rfb-field-tab[data-fieldtab="style"]' );
		await page.click( '.rfb-scope-btn[data-scope="field"]' );
		check( 'save', 'reopening the designer shows the saved values in the Style tab', ( await page.locator( '.rfb-inspector fieldset:has(legend:text-is("Margin (px)")) input' ).nth( 0 ).inputValue() ) === '30' && ( await page.locator( '.rfb-inspector select[aria-label="Choice look"]' ).inputValue() ) === 'buttons' && ( await page.locator( '.rfb-inspector .rfb-color:has(.rfb-mini:text-is("Background color")) .rfb-hex' ).first().inputValue() ) === '#fff3e0' );
		check( 'save', 'and on the canvas', ( await css( bodyOf( 'pet_type' ), 'marginTop' ) ) === '30px' );
		await page.click( '.rfb-field-tab[data-fieldtab="settings"]' );
		await page.locator( '.rfb-cv-item[data-rfb-key="pet_type"] .rfb-cv-preview-body' ).click( { force: true } );
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		check( 'save', 'saving again without touching the style keeps it', seed( 'definition', { collection: 'pets' } ).fields.find( ( f ) => f.key === 'pet_type' ).style.margin_top === 30 );
		const petsPage = seed( 'page', { title: 'Pets saved', slug: 'pets-saved', content: '[refraction_form collection="pets"]' } );
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const sv = await browser.newContext( { viewport: { width: 1200, height: 900 } } );
			const sp = await sv.newPage();
			await sp.goto( petsPage.url );
			const sq = ( sel, prop ) => sp.locator( sel ).first().evaluate( ( el, p ) => getComputedStyle( el )[ p ], prop );
			check( `save ${ theme }`, 'the saved styles reach the public form', ( await sq( '[data-rfb-key="pet_type"]', 'marginTop' ) ) === '30px' && ( await sq( '[data-rfb-key="pet_type"]', 'backgroundColor' ) ) === 'rgb(255, 243, 224)' && ( await sq( '[data-rfb-key="pet_type"] .rfb-label', 'textTransform' ) ) === 'uppercase' && ( await sq( '[data-rfb-key="owner"] .rfb-input', 'backgroundColor' ) ) === 'rgb(232, 245, 233)' && ( await sq( '[data-rfb-key="owner"] .rfb-input', 'borderTopLeftRadius' ) ) === '24px' && ( await sp.locator( '[data-rfb-key="pet_type"] .rfb-choice-buttons, [data-rfb-key="pet_type"].rfb-choice-buttons' ).count() ) >= 1 );
			await sv.close();
		}

		// other field types offer the groups that make sense for them
		const groupsOf = async ( k ) => { await page.locator( `${ field( k ) } .rfb-cv-preview-body, ${ field( k ) } .rfb-cv-title` ).first().click( { force: true } ); await page.click( '.rfb-field-tab[data-fieldtab="style"]' ); return page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) ); };
		check( 'style tab', 'a group offers box, title, description and its own box, but no input', ( await groupsOf( 'contact' ) ).join( '|' ) === 'Spacing, background and border|Title|Description and help|Group box (.rfb-group)' );
		await page.click( '.rfb-field-tab[data-fieldtab="settings"]' );
		const unlS2 = await unlabelled( page );
		check( 'a11y', 'settings controls are still labelled', unlS2.length === 0, unlS2.join( ',' ) );

		// styled fields set up through the saved definition, one of every kind, for the public page
		const styled = {
			label: 'Styled', singular: 'Styled', public_form: true, success_message: 'Done.',
			statuses: [ { label: 'New', color: 'primary' } ],
			settings: { hourly_limit: 0, min_seconds: 3 },
			style: { custom_css: '' },
			fields: [
				{ key: 'name1', label: 'Your name', type: 'text', description: 'As on your card', style: { margin_top: 24, padding_left: 10, bg: '#fffde7', border_width: 1, border_color: '#fbc02d', radius: 10, shadow: 'soft', align: 'right', l_color: '#e65100', l_size: 18, l_weight: '700', l_transform: 'uppercase', c_bg: '#ffffff', c_color: '#0d47a1', c_border_width: 2, c_border_color: '#90caf9', c_radius: 20, c_size: 18, c_pad_y: 14, ch_bg: '#e3f2fd', ch_border_color: '#1e88e5', cf_border_color: '#d81b60', cf_shadow: 'medium', d_color: '#6a1b9a', d_size: 15, d_italic: true, h_bg: '#f3e5f5' } },
				{ key: 'meds', label: 'Does your pet have any medical conditions?', type: 'radio', options: 'YES\nNO', style: { choice_look: 'buttons', b_bg: '#eceff1', b_radius: 3, b_on_bg: '#ff7f50', b_on_color: '#ffffff', b_on_border_color: '#ff7f50' } },
				{ type: 'heading', key: 'head', label: 'Heading', content: 'Big title', level: 2, style: { l_color: '#00796b', l_size: 40, align: 'center' } },
				{ type: 'divider', key: 'rule', label: 'Divider', style: { c_border_color: '#e53935', c_border_width: 4, margin_top: 30 } },
				{ type: 'image', key: 'logo', label: 'Logo', image_id: logo.id, image_width: 50, style: { c_radius: 30, c_shadow: 'strong' } },
				{ type: 'step', key: 's1', label: 'Step one', style: { l_color: '#283593', l_size: 28 } },
				{ key: 'grp', label: 'Address', type: 'group', style: { bg: '#e0f7fa', padding_top: 20, radius: 16 }, children: [ { key: 'street', label: 'Street', type: 'text' } ] },
				{ key: 'evil', label: 'Evil', type: 'text', style: { bg: 'red;}</style><script>window.pwned=1</script>', radius: '999999', shadow: 'huge', c_color: 'url(javascript:alert(1))', margin_left: '-9999' } },
				{ key: 'plain', label: 'Plain', type: 'text' },
			],
		};
		seed( 'collection', { definition: styled } );
		const saved = seed( 'definition', { collection: 'styled' } );
		const evilStyle = saved.fields.find( ( f ) => f.key === 'evil' ).style;
		check( 'sanitising', 'bad values are dropped, numbers clamped, nothing else survives', ! ( 'bg' in evilStyle ) && ! ( 'shadow' in evilStyle ) && ! ( 'c_color' in evilStyle ) && evilStyle.radius === 200 && evilStyle.margin_left === -100 && saved.fields.find( ( f ) => f.key === 'plain' ).style.length === 0, JSON.stringify( evilStyle ) );
		const stylePage = seed( 'page', { title: 'Styled', slug: 'styled-form', content: '[refraction_form collection="styled"]' } );

		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 1000 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `styled ${ theme }`;
			await v.goto( stylePage.url );
			await v.waitForLoadState( 'load' );
			const q = ( sel, prop ) => v.locator( sel ).first().evaluate( ( el, p ) => getComputedStyle( el )[ p ], prop );
			const box = '[data-rfb-key="name1"]';

			check( area, 'spacing, background, border, shadow and alignment reach the field', ( await q( box, 'marginTop' ) ) === '24px' && ( await q( box, 'paddingLeft' ) ) === '10px' && ( await q( box, 'backgroundColor' ) ) === 'rgb(255, 253, 231)' && ( await q( box, 'borderTopWidth' ) ) === '1px' && ( await q( box, 'borderTopColor' ) ) === 'rgb(251, 192, 45)' && ( await q( box, 'borderTopLeftRadius' ) ) === '10px' && ( await q( box, 'boxShadow' ) ) !== 'none' && ( await q( box, 'textAlign' ) ) === 'right' );
			check( area, 'label typography reaches the label', ( await q( `${ box } .rfb-label`, 'color' ) ) === 'rgb(230, 81, 0)' && ( await q( `${ box } .rfb-label`, 'fontSize' ) ) === '18px' && ( await q( `${ box } .rfb-label`, 'fontWeight' ) ) === '700' && ( await q( `${ box } .rfb-label`, 'textTransform' ) ) === 'uppercase' );
			check( area, 'input styling reaches the input', ( await q( `${ box } .rfb-input`, 'color' ) ) === 'rgb(13, 71, 161)' && ( await q( `${ box } .rfb-input`, 'borderTopLeftRadius' ) ) === '20px' && ( await q( `${ box } .rfb-input`, 'fontSize' ) ) === '18px' && ( await q( `${ box } .rfb-input`, 'paddingTop' ) ) === '14px' && ( await q( `${ box } .rfb-input`, 'borderTopWidth' ) ) === '2px' );
			check( area, 'the description is styled', ( await q( `${ box } .rfb-description`, 'color' ) ) === 'rgb(106, 27, 154)' && ( await q( `${ box } .rfb-description`, 'fontStyle' ) ) === 'italic' && ( await q( `${ box } .rfb-description`, 'fontSize' ) ) === '15px' );
			const idle = await q( `${ box } .rfb-input`, 'backgroundColor' );
			await v.locator( `${ box } .rfb-input` ).hover();
			await sleep( 350 );
			check( area, 'hovering the input changes its background and border', idle === 'rgb(255, 255, 255)' && ( await q( `${ box } .rfb-input`, 'backgroundColor' ) ) === 'rgb(227, 242, 253)' && ( await q( `${ box } .rfb-input`, 'borderTopColor' ) ) === 'rgb(30, 136, 229)' );
			await v.mouse.move( 5, 5 );
			await v.locator( `${ box } .rfb-input` ).focus();
			await sleep( 350 );
			check( area, 'focusing it changes the border color and adds a shadow', ( await q( `${ box } .rfb-input`, 'borderTopColor' ) ) === 'rgb(216, 27, 96)' && ( await q( `${ box } .rfb-input`, 'boxShadow' ) ).includes( '18px' ) );
			await v.locator( `${ box }` ).hover( { position: { x: 3, y: 3 } } );
			await sleep( 350 );
			check( area, 'hovering the field changes its background', ( await q( box, 'backgroundColor' ) ) === 'rgb(243, 229, 245)' );

			// button-style choices
			const btn = '[data-rfb-key="meds"] .rfb-check';
			check( area, 'a choice field shows buttons: two, side by side, uppercase, with the chosen radius', ( await v.locator( btn ).count() ) === 2 && ( await q( btn, 'textTransform' ) ) === 'uppercase' && ( await q( btn, 'borderTopLeftRadius' ) ) === '3px' && ( await q( btn, 'backgroundColor' ) ) === 'rgb(236, 239, 241)' && ( await v.locator( btn ).nth( 0 ).evaluate( ( a ) => a.getBoundingClientRect().top === a.nextElementSibling.getBoundingClientRect().top ) ) );
			await v.locator( btn ).nth( 1 ).click();
			await sleep( 400 ); // the colors fade over 150 ms
			check( area, 'clicking a button selects it and colors it', await v.locator( 'input[name="values[meds]"][value="NO"]' ).isChecked() && ( await v.locator( btn ).nth( 1 ).evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(255, 127, 80)' && ( await v.locator( btn ).nth( 0 ).evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(236, 239, 241)' );
			await v.locator( 'input[name="values[meds]"][value="YES"]' ).focus();
			await v.keyboard.press( 'ArrowRight' );
			check( area, 'the arrow keys move between buttons', await v.locator( 'input[name="values[meds]"][value="NO"]' ).isChecked() );
			await v.screenshot( { path: join( SHOTS, `styled-${ theme }.png` ), fullPage: true } );

			// other kinds of blocks
			check( area, 'a heading takes its color, size and alignment', ( await q( '[data-rfb-key="head"] .rfb-heading', 'color' ) ) === 'rgb(0, 121, 107)' && ( await q( '[data-rfb-key="head"] .rfb-heading', 'fontSize' ) ) === '40px' && ( await q( '[data-rfb-key="head"]', 'textAlign' ) ) === 'center' );
			check( area, 'a divider takes its color and thickness', ( await q( '[data-rfb-key="rule"] .rfb-divider', 'borderTopColor' ) ) === 'rgb(229, 57, 53)' && ( await q( '[data-rfb-key="rule"] .rfb-divider', 'borderTopWidth' ) ) === '4px' && ( await q( '[data-rfb-key="rule"]', 'marginTop' ) ) === '30px' );
			check( area, 'an image takes its radius and shadow', ( await q( '[data-rfb-key="logo"] img', 'borderTopLeftRadius' ) ) === '30px' && ( await q( '[data-rfb-key="logo"] img', 'boxShadow' ) ) !== 'none' );
			check( area, 'a group takes its box', ( await q( '[data-rfb-key="grp"]', 'backgroundColor' ) ) === 'rgb(224, 247, 250)' && ( await q( '[data-rfb-key="grp"]', 'paddingTop' ) ) === '20px' );
			check( area, 'a step title is styled', ( await q( '[data-rfb-key="s1"] .rfb-step-title', 'color' ) ) === 'rgb(40, 53, 147)' || ( await v.locator( '[data-rfb-key="s1"]' ).count() ) === 0 );
			check( area, 'an unstyled field gets nothing extra', ( await q( '[data-rfb-key="plain"]', 'backgroundColor' ) ) === 'rgba(0, 0, 0, 0)' && ( await q( '[data-rfb-key="plain"]', 'marginTop' ) ) === '0px' );
			check( area, 'rejected values never reach the page', ( await v.evaluate( () => window.pwned === undefined ) ) && ! ( await v.content() ).includes( 'pwned' ) && ( await q( '[data-rfb-key="evil"]', 'borderTopLeftRadius' ) ) === '200px' );
			await vctx.close();
		}

		// no style block for a form without field styles
		const plainPage = seed( 'page', { title: 'Plain', slug: 'plain-form', content: '[refraction_form collection="pets"]' } );
		const pv = await browser.newContext();
		const pp = await pv.newPage();
		await pp.goto( plainPage.url );
		check( 'sanitising', 'a form with only the pets styles prints css for its styled field only', ( await pp.content() ).includes( '[data-rfb-key="meds"]' ) && ! ( await pp.content() ).includes( '[data-rfb-key="owner"]{' ) );
		await pv.close();

		// admin edit screen carries the same styles
		await page.goto( `${ BUILDER }&view=record&collection=styled` );
		await page.waitForLoadState( 'load' );
		check( 'admin', 'the admin form applies the same field styles', ( await page.locator( '[data-rfb-key="name1"]' ).first().evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(255, 253, 231)' && ( await page.locator( '[data-rfb-key="meds"] .rfb-check' ).count() ) === 2);

		const phpLog = logTail( logStart );
		check( 'php', 'no PHP errors, warnings or notices in the debug log', ! /PHP (Warning|Notice|Fatal|Deprecated)|Uncaught/.test( phpLog ), phpLog );
		check( 'console', 'no console errors', consoleErrors.length === 0, consoleErrors.join( ' || ' ) );
		await ctx.close();
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) FAILED` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
