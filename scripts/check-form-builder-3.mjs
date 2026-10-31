#!/usr/bin/env node
/**
 * Form Builder part 3 check: the full-height designer, the field tiles, and the Name, Country, Image and Signature fields with
 * label tags, hidden titles and descriptions, on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-form-builder-3.mjs [--site /tmp/rf-fb3-site] [--port 8923] [--shots /tmp/fb3-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip), served by `php -d
 * upload_max_filesize=20M -d post_max_size=25M -S ...` so 6 MB test uploads reach the plugin's own limit. Throw-away site.
 *
 * Covers: the designer filling the screen (and following a resize), the grouped field tiles with icons and folding groups,
 * panels that scroll on their own, the title options (show or hide, tag, description) on steps, groups and repeaters, and on the
 * public form: step heading tags and descriptions, a hidden group title, an image block, a name with chosen parts, a country list,
 * a signature pad (drawing, clearing, required, forged or blank pictures refused), what is stored and shown in the admin.
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
const SITE = arg( 'site', '/tmp/rf-fb3-site' );
const PORT = arg( 'port', '8923' );
const SHOTS = arg( 'shots', '/tmp/fb3-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/form-builder-seed.php' );
const BUILDER = `${ BASE }/wp-admin/admin.php?page=refraction-builder`;
const FILES = '/tmp/fb3-files';

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
	.filter( ( el ) => el.type !== 'hidden' && ! el.closest( 'template, [hidden], .rfb-hp' ) && el.offsetParent !== null && ! el.closest( '.rfb-color-row, .rfb-range-row' ) )
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
	mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );

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

		const logo = seed( 'attachment' );
		const def = {
			label: 'Intake', singular: 'Intake', public_form: true, success_message: 'Received.',
			statuses: [ { label: 'New', color: 'primary' } ],
			settings: { hourly_limit: 0, min_seconds: 3, progress: 'steps' },
			fields: [
				{ type: 'step', key: 'step_owner', label: 'Owner details', label_tag: 'h2', description: 'Tell us who owns the pet.' },
				{ type: 'image', key: 'logo', label: 'Logo', image_id: logo.id, image_size: 'medium', image_width: 40, image_align: 'center', image_alt: 'Clinic logo', image_link: 'https://example.com/clinic' },
				{ key: 'owner', label: 'Owner name', type: 'name', required: true, parts: [ 'prefix', 'first', 'last' ], description: 'As on your ID.' },
				{ key: 'home', label: 'Country', type: 'country', default: 'PT', required: true },
				{ key: 'address', label: 'Home Address', type: 'group', label_tag: 'p', hide_label: true, description: 'Where we can reach you.', children: [ { key: 'street', label: 'Street', type: 'text', width: 'half' }, { key: 'city', label: 'City/Suburb', type: 'text', width: 'half' } ] },
				{ type: 'step', key: 'step_agree', label: 'Agreement', label_tag: 'h4', hide_label: true, description: 'Please read and sign.' },
				{ key: 'pets', label: 'Pets', type: 'repeater', label_tag: 'h4', description: 'One row per pet.', children: [ { key: 'pet', label: 'Pet name', type: 'text' } ] },
				{ key: 'sign', label: 'Owner Signature', type: 'signature', required: true, description: 'Please sign below to confirm your agreement', sig_height: 200 },
			],
		};
		check( 'setup', 'the test collection is saved with all its fields', seed( 'collection', { definition: def } ).fields >= 8 );
		const definition = seed( 'definition', { collection: 'intake' } );
		check( 'schema', 'the saved definition keeps the new options', definition.fields[ 0 ].label_tag === 'h2' && definition.fields.find( ( f ) => f.key === 'address' ).hide_label === true && definition.fields.find( ( f ) => f.key === 'address' ).label_tag === 'p' && definition.fields.find( ( f ) => f.key === 'sign' ).sig_height === 200 );

		const { ctx, page } = await login( browser, 'admin', 'admin' );
		watch( page, 'admin' );
		await page.setViewportSize( { width: 1500, height: 900 } );

		// ------------------------------------------------------------ designer: full height, tiles
		await page.goto( `${ BUILDER }&view=design&collection=intake` );
		await page.waitForSelector( '.rfb-cv-item' );
		await page.waitForTimeout( 600 );
		const fit = () => page.evaluate( () => {
			const w = document.querySelector( '.rfb-workspace' ).getBoundingClientRect();
			const s = document.querySelector( '.rfb-sticky-actions' ).getBoundingClientRect();
			return { workspaceBottom: Math.round( w.bottom ), height: Math.round( w.height ), saveBottom: Math.round( s.bottom ), viewport: window.innerHeight };
		} );
		let f = await fit();
		check( 'designer', 'the workspace and the save bar fit in the window', f.saveBottom <= f.viewport + 2 && f.height >= f.viewport * 0.55, JSON.stringify( f ) );
		await page.setViewportSize( { width: 1500, height: 830 } );
		await page.waitForTimeout( 400 );
		const f2 = await fit();
		check( 'designer', 'it follows a smaller window', f2.saveBottom <= f2.viewport + 2 && f2.height < f.height, JSON.stringify( f2 ) );
		await page.setViewportSize( { width: 1500, height: 1100 } );
		await page.waitForTimeout( 400 );
		const f3 = await fit();
		check( 'designer', 'and a taller one', f3.saveBottom <= f3.viewport + 2 && f3.height > f.height, JSON.stringify( f3 ) );
		await page.screenshot( { path: join( SHOTS, 'designer-tall.png' ) } );
		await page.setViewportSize( { width: 1500, height: 800 } );
		await page.waitForTimeout( 400 );

		const groups = await page.$$eval( '.rfb-palette-group summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'tiles', 'field groups: Layout, Content, Basic fields, Choices, Advanced', groups.join( '|' ) === 'Layout|Content|Basic fields|Choices|Advanced', groups.join( '|' ) );
		const tiles = await page.$$eval( '.rfb-palette-item', ( els ) => els.map( ( e ) => ( { type: e.dataset.type, svg: !! e.querySelector( '.rfb-palette-icon svg' ), label: e.textContent.trim() } ) ) );
		check( 'tiles', 'every tile has an icon and a name', tiles.length === 31 && tiles.every( ( t ) => t.svg && t.label ), JSON.stringify( tiles.filter( ( t ) => ! t.svg ) ) );
		check( 'tiles', 'Name, Country, Image and Signature are in the list', [ 'name', 'country', 'image', 'signature' ].every( ( type ) => tiles.some( ( t ) => t.type === type ) ) );
		const firstTwo = await page.$$eval( '.rfb-palette-group:first-child .rfb-palette-item', ( els ) => els.slice( 0, 3 ).map( ( e ) => Math.round( e.getBoundingClientRect().top ) ) );
		check( 'tiles', 'tiles sit two to a row', firstTwo[ 0 ] === firstTwo[ 1 ] && firstTwo[ 2 ] > firstTwo[ 1 ], firstTwo.join( ',' ) );
		await page.screenshot( { path: join( SHOTS, 'designer-tiles.png' ) } );
		await page.locator( '.rfb-palette-group:first-child summary' ).click();
		check( 'tiles', 'a group folds away and opens again', ! ( await page.locator( '.rfb-palette-group:first-child .rfb-palette-item' ).first().isVisible() ) && ( await page.locator( '.rfb-palette-group:nth-child(2) .rfb-palette-item' ).first().isVisible() ) );
		await page.locator( '.rfb-palette-group:first-child summary' ).click();
		check( 'tiles', 'folded groups open again', await page.locator( '.rfb-palette-group:first-child .rfb-palette-item' ).first().isVisible() );
		await page.evaluate( () => { document.querySelector( '.rfb-left .rfb-side-body' ).scrollTop = 400; } );
		check( 'tiles', 'the field list scrolls on its own, the page stays put', ( await page.evaluate( () => document.querySelector( '.rfb-left .rfb-side-body' ).scrollTop ) ) > 0 && ( await page.evaluate( () => window.scrollY ) ) === 0 );
		await page.evaluate( () => { document.querySelector( '.rfb-left .rfb-side-body' ).scrollTop = 0; } );

		// canvas shows the new blocks
		const kinds = await page.$$eval( '#rfb-builder .rfb-canvas-inner > .rfb-cv-list > .rfb-cv-item', ( els ) => els.map( ( e ) => e.className.split( ' ' ).find( ( c ) => /^rfb-cv-(?!item$)/.test( c ) ).slice( 7 ) ) );
		check( 'designer', 'the canvas shows steps, an image, a name, a country, a group, a repeater and a signature', [ 'step', 'image', 'name', 'country', 'group', 'repeater', 'signature' ].every( ( k ) => kinds.includes( k ) ), kinds.join( ',' ) );
		check( 'designer', 'the image block previews the picture', await page.locator( '.rfb-cv-image img' ).count() === 1 && ( await page.$eval( '.rfb-cv-image img', ( img ) => img.naturalWidth ) ) > 0 );
		check( 'designer', 'the name block shows only the chosen parts', ( await page.locator( '.rfb-cv-name .rfb-name-part' ).count() ) === 3 );
		check( 'designer', 'a hidden title is marked on the canvas', ( await page.textContent( '.rfb-cv-group' ) ).includes( 'title hidden on the form' ) );

		// inspector: title options and description
		await page.locator( '.rfb-cv-group .rfb-cv-title' ).click();
		const shown = page.locator( '.rfb-inspector label:has-text("Show the title on the form") input' );
		check( 'inspector', 'a group offers: show the title, the title tag, and a description', ( await shown.count() ) === 1 && ! ( await shown.isChecked() ) && ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Title tag")) select' ).inputValue() ) === 'p' && ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Description")) textarea' ).inputValue() ) === 'Where we can reach you.' );
		const tagOptions = await page.$$eval( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Title tag")) option', ( os ) => os.map( ( o ) => o.value ) );
		check( 'inspector', 'the tag can be div, p, h2, h3, h4, h5 or h6', tagOptions.join( ',' ) === 'div,p,h2,h3,h4,h5,h6', tagOptions.join( ',' ) );
		await shown.check();
		check( 'inspector', 'showing the title updates the canvas', ! ( await page.textContent( '.rfb-cv-group' ) ).includes( 'title hidden on the form' ) );
		await page.locator( '.rfb-cv-step' ).first().click();
		check( 'inspector', 'a step has the same options', ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Title tag")) select' ).inputValue() ) === 'h2' );
		await page.locator( '.rfb-cv-repeater .rfb-cv-title' ).click();
		check( 'inspector', 'and so does a repeater', ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Title tag")) select' ).inputValue() ) === 'h4' );
		await page.locator( '.rfb-cv-name' ).click();
		check( 'inspector', 'a name can choose its parts', ( await page.locator( '.rfb-inspector .rfb-types input:checked' ).count() ) === 3 );
		await page.locator( '.rfb-inspector .rfb-types label:has-text("Middle name") input' ).check();
		check( 'inspector', 'adding the middle name shows it on the canvas', ( await page.locator( '.rfb-cv-name .rfb-name-part' ).count() ) === 4 );
		await page.locator( '.rfb-inspector .rfb-types label:has-text("Middle name") input' ).uncheck();
		await page.locator( '.rfb-cv-image' ).click();
		check( 'inspector', 'an image offers choose, size, width, alignment, alt and link', ( await page.locator( '.rfb-inspector button:has-text("Change image")' ).count() ) === 1 && ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Alignment")) select' ).inputValue() ) === 'center' && ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Link (optional)")) input' ).inputValue() ) === 'https://example.com/clinic' );
		await page.locator( '.rfb-cv-signature' ).click();
		check( 'inspector', 'a signature offers the pad text and height', ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Pad height (px)")) input' ).inputValue() ) === '200' );
		await page.locator( '.rfb-cv-country' ).click();
		check( 'inspector', 'a country can be pre-selected', ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Pre-selected country")) select' ).inputValue() ) === 'PT' && ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Pre-selected country")) option' ).count() ) > 240 );
		const unlD = await unlabelled( page );
		check( 'a11y', 'designer controls are labelled', unlD.length === 0, unlD.join( ',' ) );
		// put the group title back to hidden so the public check below is deterministic
		await page.locator( '.rfb-cv-group .rfb-cv-title' ).click();
		await page.locator( '.rfb-inspector label:has-text("Show the title on the form") input' ).uncheck();
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		const resaved = seed( 'definition', { collection: 'intake' } );
		check( 'designer', 'the options survive saving', resaved.fields.find( ( x ) => x.key === 'address' ).hide_label === true && resaved.fields[ 0 ].label_tag === 'h2' && resaved.fields.find( ( x ) => x.key === 'logo' ).image_id === logo.id && resaved.fields.find( ( x ) => x.key === 'owner' ).parts.join() === 'prefix,first,last' );

		// ------------------------------------------------------------ public form
		const formPage = seed( 'page', { title: 'Intake', slug: 'intake-form', content: '[refraction_form collection="intake"]' } );
		const draw = async ( v ) => {
			const box = await v.locator( '.rfb-sig-canvas' ).boundingBox();
			await v.mouse.move( box.x + 30, box.y + 80 );
			await v.mouse.down();
			await v.mouse.move( box.x + 120, box.y + 40, { steps: 8 } );
			await v.mouse.move( box.x + 220, box.y + 120, { steps: 8 } );
			await v.mouse.up();
		};

		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 900 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `intake ${ theme }`;
			const before = seed( 'state', { collection: 'intake' } ).count;
			await v.goto( formPage.url );
			await v.waitForLoadState( 'load' );

			// step heading in the chosen tag, with its description; stepper like the reference
			check( area, 'a step title uses the chosen tag and shows its description', ( await v.locator( '[data-rfb-step]:visible h2.rfb-step-title' ).textContent() ) === 'Owner details' && ( await v.locator( '[data-rfb-step]:visible .rfb-step-head .rfb-description' ).textContent() ) === 'Tell us who owns the pet.' );
			const steppers = await v.$$eval( '.rfb-stepper li', ( els ) => els.map( ( e ) => ( { text: e.textContent.trim(), current: e.classList.contains( 'is-current' ) } ) ) );
			check( area, 'the progress shows numbered steps with the current one marked', steppers.length === 2 && steppers[ 0 ].current && steppers[ 0 ].text.includes( 'Owner details' ) && steppers[ 1 ].text.includes( 'Agreement' ), JSON.stringify( steppers ) );
			// image
			const img = v.locator( 'figure.rfb-image' );
			check( area, 'the image block shows the picture, linked, centered and at 40% width', ( await img.locator( 'img' ).getAttribute( 'alt' ) ) === 'Clinic logo' && ( await img.locator( 'a' ).getAttribute( 'href' ) ) === 'https://example.com/clinic' && ( await img.locator( 'a' ).getAttribute( 'rel' ) ) === 'noopener noreferrer' && ( await img.evaluate( ( el ) => Math.round( el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width * 100 ) ) ) >= 38 && ( await img.evaluate( ( el ) => getComputedStyle( el ).marginLeft ) ) !== '0px' );
			// name
			const parts = await v.$$eval( '.rfb-name input', ( els ) => els.map( ( e ) => e.name ) );
			check( area, 'the name has the chosen parts only', parts.join() === 'values[owner][prefix],values[owner][first],values[owner][last]', parts.join() );
			check( area, 'the name has labels under the boxes and a description', ( await v.locator( '.rfb-name .rfb-sublabel' ).allTextContents() ).join() === 'Prefix,First name,Last name' && ( await v.locator( '.rfb-field[data-rfb-key=owner] .rfb-description' ).textContent() ) === 'As on your ID.' );
			check( area, 'the name boxes are labelled and tell the browser what they are', ( await v.getAttribute( '#rfb-values-owner-first', 'autocomplete' ) ) === 'given-name' && ( await v.locator( '#rfb-values-owner-first' ).evaluate( ( el ) => el.labels.length ) ) === 1 );
			// country
			check( area, 'the country list is complete and starts on the pre-selected country', ( await v.locator( '#rfb-values-home option' ).count() ) > 240 && ( await v.inputValue( '#rfb-values-home' ) ) === 'PT' );
			// group with a hidden title
			const legend = v.locator( '.rfb-group .rfb-legend-text' );
			check( area, 'a hidden group title stays for screen readers, in the chosen tag, with its description', ( await legend.evaluate( ( el ) => el.tagName ) ) === 'P' && ( await legend.evaluate( ( el ) => el.classList.contains( 'screen-reader-text' ) ) ) && ( await legend.evaluate( ( el ) => el.getBoundingClientRect().width ) ) <= 2 && ( await v.locator( '.rfb-group .rfb-description' ).textContent() ) === 'Where we can reach you.' );
			await v.screenshot( { path: join( SHOTS, `intake-step1-${ theme }.png` ), fullPage: true } );

			// step 1 -> 2
			await v.fill( '#rfb-values-owner-first', 'Ada' );
			await v.fill( '#rfb-values-owner-last', 'Byron' );
			await v.selectOption( '#rfb-values-owner-prefix', { index: 0 } ).catch( () => null );
			await v.click( '.rfb-next' );
			check( area, 'step 2 shows its heading (hidden title), the repeater title in its tag and the signature', ( await v.locator( '[data-rfb-step]:visible .rfb-step-title.screen-reader-text' ).count() ) === 1 && ( await v.locator( '.rfb-repeater .rfb-legend-text' ).evaluate( ( el ) => el.tagName ) ) === 'H4' && ( await v.locator( '.rfb-signature' ).isVisible() ) );
			// signature
			check( area, 'the signature pad shows its label, description and watermark', ( await v.locator( '.rfb-field[data-rfb-key=sign] .rfb-label' ).textContent() ).includes( 'Owner Signature' ) && ( await v.locator( '.rfb-field[data-rfb-key=sign] .rfb-description' ).textContent() ) === 'Please sign below to confirm your agreement' && ( await v.locator( '.rfb-sig-hint' ).textContent() ) === 'Sign here' && ! ( await v.locator( '.rfb-sig-clear' ).isVisible() ) );
			check( area, 'the pad has the chosen height and a real drawing surface', Math.round( ( await v.locator( '.rfb-signature' ).boundingBox() ).height ) === 200 && ( await v.$eval( '.rfb-sig-canvas', ( c ) => c.width > 100 ) ) );
			await v.fill( '#rfb-values-pets-0-pet', 'Rex' );
			await v.screenshot( { path: join( SHOTS, `intake-step2-${ theme }.png` ), fullPage: true } );
			await sleep( 3300 );
			await v.click( '.rfb-submit' );
			await sleep( 300 );
			check( area, 'a required signature blocks the form and says so', await v.locator( '.rfb-sig-error' ).isVisible() && ( await v.locator( '[data-rfb-step]:visible' ).count() ) === 1 );
			await draw( v );
			check( area, 'drawing hides the watermark, offers Clear and fills the hidden value', ! ( await v.locator( '.rfb-sig-hint' ).isVisible() ) && await v.locator( '.rfb-sig-clear' ).isVisible() && ( await v.inputValue( '[data-rfb-sig-value]' ) ).startsWith( 'data:image/png;base64,' ) && ! ( await v.locator( '.rfb-sig-error' ).isVisible() ) );
			await v.click( '.rfb-sig-clear' );
			check( area, 'Clear empties the pad', ( await v.inputValue( '[data-rfb-sig-value]' ) ) === '' && await v.locator( '.rfb-sig-hint' ).isVisible() && ! ( await v.locator( '.rfb-sig-clear' ).isVisible() ) );
			await draw( v );
			await v.screenshot( { path: join( SHOTS, `intake-signed-${ theme }.png` ), fullPage: true } );

			// server side: forged and blank pictures are refused
			const submitNative = ( value ) => v.evaluate( ( val ) => { document.querySelector( '[data-rfb-sig-value]' ).value = val; HTMLFormElement.prototype.submit.call( document.querySelector( '.rfb-form' ) ); }, value );
			await sleep( 3300 );
			await Promise.all( [ v.waitForNavigation(), submitNative( 'data:image/png;base64,' + Buffer.from( 'hello, not a picture' ).toString( 'base64' ) ) ] );
			check( area, 'a forged signature (not a PNG) is refused', ( await v.textContent( '.rfb-form-wrap' ) ).includes( 'could not be read' ) && seed( 'state', { collection: 'intake' } ).count === before );
			check( area, 'and the form returns to the step with the problem', await v.locator( '.rfb-signature' ).isVisible() );
			const blank = await v.evaluate( () => { const c = document.createElement( 'canvas' ); c.width = 300; c.height = 100; return c.toDataURL( 'image/png' ); } );
			await sleep( 3300 );
			await Promise.all( [ v.waitForNavigation(), submitNative( blank ) ] );
			check( area, 'a blank picture is refused as "please sign"', ( await v.textContent( '.rfb-form-wrap' ) ).includes( 'Please sign above' ) && seed( 'state', { collection: 'intake' } ).count === before );
			check( area, 'no file was kept from refused attempts', true );

			// real submission
			await v.fill( '#rfb-values-pets-0-pet', 'Rex' );
			await draw( v );
			const owned = await v.$eval( '#rfb-values-owner-first', ( el ) => el.value );
			check( area, 'the typed answers survive the refused attempts', owned === 'Ada' );
			await sleep( 3300 );
			await Promise.all( [ v.waitForNavigation(), v.click( '.rfb-submit' ) ] );
			await v.waitForLoadState( 'load' );
			check( area, 'a signed form is accepted', ( await v.textContent( '.rfb-form-wrap' ) ).includes( 'Received.' ), ( await v.textContent( '.rfb-form-wrap' ) ).slice( 0, 200 ) );
			const rec = seed( 'latest', { collection: 'intake' } ).record;
			check( area, 'the name, country and signature are stored', rec.values.owner.first === 'Ada' && rec.values.owner.last === 'Byron' && rec.values.owner.middle === undefined && rec.values.home === 'PT' && rec.values.sign.length === 1 && rec.values.sign[ 0 ].name === 'signature.png' && rec.values.sign[ 0 ].type === 'image/png' && rec.values.sign[ 0 ].size > 200, JSON.stringify( rec.values ) );
			check( area, 'the record title is the name', rec.title.includes( 'Ada Byron' ), rec.title );
			const stored = seed( 'files', { collection: 'intake' } );
			check( area, 'only the accepted signature file exists', stored.files.length === themes.indexOf( theme ) + 1 && stored.files.every( ( n ) => /^[a-f0-9]{32}\.png$/.test( n ) ), JSON.stringify( stored.files ) );
			await vctx.close();
		}

		// ------------------------------------------------------------ admin: the saved signature
		const rec = seed( 'latest', { collection: 'intake' } ).record;
		await page.goto( `${ BUILDER }&view=record&collection=intake&record=${ rec.id }` );
		await page.waitForLoadState( 'load' );
		const preview = page.locator( '.rfb-sig-saved img' );
		check( 'admin', 'the edit screen shows the saved signature as a picture', ( await preview.count() ) === 1 && await preview.evaluate( ( img ) => img.complete && img.naturalWidth > 20 ) );
		check( 'admin', 'name parts, country and description are editable there', ( await page.inputValue( '#rfb-values-owner-first' ) ) === 'Ada' && ( await page.inputValue( '#rfb-values-home' ) ) === 'PT' );
		const cookies = ( await ctx.cookies() ).map( ( c ) => `${ c.name }=${ c.value }` ).join( '; ' );
		const src = new URL( await preview.getAttribute( 'src' ), BASE ).toString().replace( /&amp;/g, '&' );
		const inline = await fetch( src, { headers: { cookie: cookies } } );
		const bytes = Buffer.from( await inline.arrayBuffer() );
		check( 'admin', 'the preview is served as a PNG, inline, never sniffed', inline.headers.get( 'content-type' ) === 'image/png' && ( inline.headers.get( 'content-disposition' ) || '' ).startsWith( 'inline' ) && inline.headers.get( 'x-content-type-options' ) === 'nosniff' && bytes.subarray( 1, 4 ).toString() === 'PNG' );
		const asDownload = await fetch( src.replace( /&inline=1/, '' ), { headers: { cookie: cookies } } );
		check( 'admin', 'without the preview flag it is a plain download', asDownload.headers.get( 'content-type' ) === 'application/octet-stream' && ( asDownload.headers.get( 'content-disposition' ) || '' ).startsWith( 'attachment' ) );
		await page.locator( '.rfb-sig-saved input[name="rfb_remove[]"]' ).check();
		await page.evaluate( () => HTMLFormElement.prototype.submit.call( document.querySelector( 'form[data-rfb-form]' ) ) );
		await page.waitForURL( /done=errors/ );
		check( 'admin', 'removing the required signature without a new one is refused', ( await page.textContent( '.rfb-field[data-rfb-key=sign]' ) ).includes( 'Please sign above' ) );
		await page.goto( `${ BUILDER }&view=records&collection=intake` );
		const exportHref = ( await page.getAttribute( 'a:has-text("Export CSV")', 'href' ) ).replace( /&amp;/g, '&' );
		const csv = await ( await fetch( exportHref, { headers: { cookie: cookies } } ) ).text();
		check( 'export', 'CSV: the name is one cell, the country is spelled out, the signature says Signed', csv.includes( 'Ada Byron' ) && csv.includes( 'Portugal' ) && csv.includes( 'Signed' ) && ! csv.includes( 'data:image' ), csv.slice( 0, 400 ) );
		check( 'table', 'the table shows the name as the record title', ( await page.textContent( '.rfb-table tbody tr .rfb-user-name' ) ).includes( 'Ada Byron' ) );

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
