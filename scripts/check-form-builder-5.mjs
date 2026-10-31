#!/usr/bin/env node
/**
 * Form Builder part 5 check: styles shared by field type (change one Repeater and every Repeater follows, unless a field overrides it),
 * the Normal / Hover / Focus-Selected-On states of every styled part, and the repeater's own parts (box, rows, gap, add and remove
 * buttons), in the designer and on the public form (real hover and focus), on a real WordPress (SQLite test site, Chromium).
 *
 * Usage: node scripts/check-form-builder-5.mjs [--site /tmp/rf-fb5-site] [--port 8925] [--shots /tmp/fb5-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip), served by `php -d
 * upload_max_filesize=20M -d post_max_size=25M -S ...` so 6 MB test uploads reach the plugin's own limit. Throw-away site.
 *
 * Covers: the shared-by-type scope and the own-style scope, state tabs per type, repeater / row / gap / add / remove / group styling, text,
 * choice, switch states, saving and reopening, the public page (computed styles, real hover and focus, checked states), overrides,
 * rejected values, the admin edit screen, and labels on every control.
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
const SITE = arg( 'site', '/tmp/rf-fb5-site' );
const PORT = arg( 'port', '8925' );
const SHOTS = arg( 'shots', '/tmp/fb5-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/form-builder-seed.php' );
const BUILDER = `${ BASE }/wp-admin/admin.php?page=refraction-builder`;
const FILES = '/tmp/fb5-files';

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

		// Log in first (see check 4).
		const { ctx, page } = await login( browser, 'admin', 'admin' );
		watch( page, 'admin' );
		await page.setViewportSize( { width: 1500, height: 1000 } );

		const rep = ( key, label ) => ( { key, label, type: 'repeater', children: [ { key: key + '_name', label: 'Name', type: 'text' } ] } );
		const def = {
			label: 'Shared', singular: 'Shared', public_form: true, success_message: 'Done.',
			statuses: [ { label: 'New', color: 'primary' } ],
			settings: { hourly_limit: 0, min_seconds: 3 },
			fields: [
				{ key: 'name1', label: 'First text', type: 'text' },
				{ key: 'name2', label: 'Second text', type: 'text' },
				{ key: 'pet', label: 'Pet', type: 'radio', options: 'Dog\nCat' },
				{ key: 'size', label: 'Size', type: 'radio', options: 'Small\nLarge' },
				{ key: 'agree', label: 'Agree', type: 'toggle' },
				{ key: 'num', label: 'Count', type: 'number' },
				rep( 'r1', 'Pets one' ), rep( 'r2', 'Pets two' ), rep( 'r3', 'Pets three' ),
				{ key: 'g1', label: 'Address', type: 'group', children: [ { key: 'street', label: 'Street', type: 'text' } ] },
			],
		};
		check( 'setup', 'the collection with three repeaters, two choices and two text fields is saved', seed( 'collection', { definition: def } ).fields >= 10 );
		const hostile = seed( 'collection', { definition: Object.assign( {}, def, { label: 'Hostile', type_styles: { nonsense: { bg: '#000000' }, text: { c_bg: 'red;}</style>', c_radius: '9999', evil: '1' } }, repeater: 'junk' } ) } );
		const hostileDef = seed( 'definition', { collection: 'hostile' } );
		check( 'sanitising', 'shared styles for unknown types, unknown keys and bad values are dropped, numbers clamped', JSON.stringify( hostileDef.type_styles ) === '{"text":{"c_radius":200}}', JSON.stringify( hostileDef.type_styles ) );

		await page.goto( `${ BUILDER }&view=design&collection=shared` );
		await page.waitForSelector( '.rfb-cv-item' );
		const item = ( k ) => `.rfb-cv-item[data-rfb-key="${ k }"]`;
		const pick = async ( k ) => { await page.locator( `${ item( k ) } .rfb-cv-title, ${ item( k ) } .rfb-cv-preview-body` ).first().click( { force: true } ); };
		const openStyle = async () => { await page.click( '.rfb-field-tab[data-fieldtab="style"]' ); };
		const css = ( loc, prop ) => loc.evaluate( ( el, p ) => getComputedStyle( el )[ p ], prop );
		const section = ( title ) => page.locator( `.rfb-inspector .rfb-section:has(> summary:text-is("${ title }"))` );
		const color = ( sec, label, value ) => sec.locator( `.rfb-color:has(.rfb-mini:text-is("${ label }")) .rfb-hex` ).first().fill( value );
		const num = ( sec, label, value ) => sec.locator( `.rfb-field:has(.rfb-mini:text-is("${ label }")) input` ).first().fill( String( value ) );
		const choose = ( sec, label, value ) => sec.locator( `.rfb-field:has(.rfb-mini:text-is("${ label }")) select` ).first().selectOption( value );
		const stateTab = ( s ) => page.click( `.rfb-state-tab[data-state="${ s }"]` );
		const repBox = ( k ) => page.locator( `${ item( k ) } .rfb-repeater` );
		const repRow = ( k ) => page.locator( `${ item( k ) } .rfb-rep-row` );

		// ------------------------------------------------------------ one repeater changes all repeaters
		await pick( 'r1' );
		await openStyle();
		check( 'scope', 'the style is for every field of the type by default, with the count', ( await page.locator( '.rfb-scope-btn.is-active' ).textContent() ) === 'All Repeater fields (3)' && ( await page.locator( '.rfb-scope-btn' ).count() ) === 2 );
		const sections = await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'repeater', 'a repeater offers its box, its rows, the gap and the add and remove buttons', [ 'Spacing, background and border', 'Title', 'Description and help', 'Repeater box (.rfb-repeater)', 'Rows list', 'Each row (.rfb-rep-row)', 'Add-row button', 'Remove-row button' ].every( ( s ) => sections.includes( s ) ), sections.join( '|' ) );
		check( 'states', 'a repeater has Normal, Hover and Active', ( await page.locator( '.rfb-state-tab' ).allTextContents() ).join( '|' ) === 'Normal|Hover|Active' );

		const box = section( 'Repeater box (.rfb-repeater)' );
		await num( box, 'Border width (px)', 3 );
		await color( box, 'Border color', '#ff0000' );
		await choose( box, 'Border style', 'dashed' );
		await num( box, 'Border radius (px)', 14 );
		await color( box, 'Background color', '#fff8e1' );
		await box.locator( 'fieldset:has(legend:text-is("Padding (px)")) input' ).nth( 0 ).fill( '20' );
		await box.locator( 'fieldset:has(legend:text-is("Margin (px)")) input' ).nth( 2 ).fill( '16' );
		const rows = section( 'Each row (.rfb-rep-row)' );
		await color( rows, 'Background color', '#f1f8e9' );
		await num( rows, 'Border radius (px)', 8 );
		await num( rows, 'Border width (px)', 1 );
		await color( rows, 'Border color', '#8bc34a' );
		await rows.locator( 'fieldset:has(legend:text-is("Padding (px)")) input' ).nth( 1 ).fill( '48' );
		await num( section( 'Rows list' ), 'Space between rows (px)', 24 );
		const add = section( 'Add-row button' );
		await color( add, 'Background color', '#00897b' );
		await color( add, 'Text color', '#ffffff' );
		await num( add, 'Border radius (px)', 20 );
		await color( section( 'Remove-row button' ), 'Symbol color', '#c62828' );

		const sameLook = async ( k ) => ( await css( repBox( k ), 'borderTopWidth' ) ) === '3px' && ( await css( repBox( k ), 'borderTopStyle' ) ) === 'dashed' && ( await css( repBox( k ), 'borderTopColor' ) ) === 'rgb(255, 0, 0)' && ( await css( repBox( k ), 'borderTopLeftRadius' ) ) === '14px' && ( await css( repBox( k ), 'backgroundColor' ) ) === 'rgb(255, 248, 225)' && ( await css( repBox( k ), 'paddingTop' ) ) === '20px' && ( await css( repBox( k ), 'marginBottom' ) ) === '16px';
		check( 'shared', 'the repeater box style shows on the first repeater', await sameLook( 'r1' ) );
		check( 'shared', 'and on the second and third repeater too', await sameLook( 'r2' ) && await sameLook( 'r3' ) );
		check( 'shared', 'rows, their frame, the gap and the add button follow on all of them', ( await css( repRow( 'r3' ), 'backgroundColor' ) ) === 'rgb(241, 248, 233)' && ( await css( repRow( 'r2' ), 'borderTopColor' ) ) === 'rgb(139, 195, 74)' && ( await css( repRow( 'r2' ), 'paddingRight' ) ) === '48px' && ( await css( page.locator( `${ item( 'r2' ) } .rfb-rows` ), 'rowGap' ) ) === '24px' && ( await css( page.locator( `${ item( 'r3' ) } [data-rfb-add]` ), 'backgroundColor' ) ) === 'rgb(0, 137, 123)' && ( await css( page.locator( `${ item( 'r3' ) } [data-rfb-add]` ), 'borderTopLeftRadius' ) ) === '20px' && ( await css( page.locator( `${ item( 'r2' ) } .rfb-rep-remove` ), 'color' ) ) === 'rgb(198, 40, 40)' );
		check( 'shared', 'other field types are not touched', ( await css( page.locator( `${ item( 'name1' ) } .rfb-input` ), 'borderTopWidth' ) ) !== '3px' && ( await css( page.locator( `${ item( 'g1' ) } .rfb-group` ), 'backgroundColor' ) ) !== 'rgb(255, 248, 225)' );
		await page.screenshot( { path: join( SHOTS, 'shared-repeaters.png' ) } );

		// Hover and Active looks of the repeater parts, previewed on the selected repeater
		await stateTab( 'hover' );
		check( 'states', 'the Hover tab shows hover groups only', ( await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) ) ).includes( 'Add-row button' ) && ! ( await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) ) ).includes( 'Rows list' ) );
		await color( section( 'Repeater box (.rfb-repeater)' ), 'Background color', '#ffecb3' );
		await color( section( 'Each row (.rfb-rep-row)' ), 'Background color', '#dcedc8' );
		await color( section( 'Add-row button' ), 'Background color', '#00695c' );
		await color( section( 'Remove-row button' ), 'Background color', '#ffcdd2' );
		check( 'states', 'the selected repeater previews its hover look right away', ( await css( repBox( 'r1' ), 'backgroundColor' ) ) === 'rgb(255, 236, 179)' && ( await css( repRow( 'r1' ), 'backgroundColor' ) ) === 'rgb(220, 237, 200)' && ( await css( page.locator( `${ item( 'r1' ) } [data-rfb-add]` ), 'backgroundColor' ) ) === 'rgb(0, 105, 92)' );
		check( 'states', 'the other repeaters keep their normal look in the designer', ( await css( repBox( 'r2' ), 'backgroundColor' ) ) === 'rgb(255, 248, 225)' );
		await stateTab( 'focus' );
		await color( section( 'Repeater box (.rfb-repeater)' ), 'Border color', '#1565c0' );
		await color( section( 'Add-row button' ), 'Background color', '#004d40' );
		check( 'states', 'the Active tab sets what the repeater looks like while something inside has focus', ( await css( repBox( 'r1' ), 'borderTopColor' ) ) === 'rgb(21, 101, 192)' );
		await stateTab( 'normal' );
		check( 'states', 'back on Normal the preview ends', ( await css( repBox( 'r1' ), 'borderTopColor' ) ) === 'rgb(255, 0, 0)' );

		// ------------------------------------------------------------ one repeater differs
		await pick( 'r2' );
		await openStyle();
		check( 'scope', 'another repeater starts on "all" again (it has no style of its own)', ( await page.locator( '.rfb-scope-btn.is-active' ).getAttribute( 'data-scope' ) ) === 'type' );
		await page.click( '.rfb-scope-btn[data-scope="field"]' );
		check( 'scope', 'Only this field shows an empty style to fill', ( await page.locator( '.rfb-scope-btn.is-active' ).getAttribute( 'data-scope' ) ) === 'field' && ( await section( 'Repeater box (.rfb-repeater)' ).locator( '.rfb-color:has(.rfb-mini:text-is("Border color")) .rfb-hex' ).first().inputValue() ) === '' );
		await color( section( 'Repeater box (.rfb-repeater)' ), 'Border color', '#1e88e5' );
		check( 'scope', 'only that repeater changes; the others keep the shared look', ( await css( repBox( 'r2' ), 'borderTopColor' ) ) === 'rgb(30, 136, 229)' && ( await css( repBox( 'r1' ), 'borderTopColor' ) ) === 'rgb(255, 0, 0)' && ( await css( repBox( 'r3' ), 'borderTopColor' ) ) === 'rgb(255, 0, 0)' && ( await css( repBox( 'r2' ), 'borderTopWidth' ) ) === '3px' );
		await pick( 'r3' );
		await openStyle();
		await page.click( '.rfb-scope-btn[data-scope="type"]' );
		check( 'scope', 'switching back to all shows the shared value', ( await section( 'Repeater box (.rfb-repeater)' ).locator( '.rfb-color:has(.rfb-mini:text-is("Border color")) .rfb-hex' ).first().inputValue() ) === '#ff0000' );

		// ------------------------------------------------------------ text fields: Normal / Hover / Focus, shared
		await pick( 'name1' );
		await openStyle();
		check( 'states', 'a text field has Normal, Hover and Focus', ( await page.locator( '.rfb-state-tab' ).allTextContents() ).join( '|' ) === 'Normal|Hover|Focus' && ( await page.locator( '.rfb-scope-btn.is-active' ).textContent() ) === 'All Text fields (6)' );
		const inputN = section( 'Input' );
		await color( inputN, 'Background color', '#f3f6ff' );
		await num( inputN, 'Border radius (px)', 22 );
		await stateTab( 'hover' );
		await color( section( 'Hover: the input' ), 'Background color', '#e3f2fd' ).catch( async () => color( section( 'Input' ), 'Background color', '#e3f2fd' ) );
		await color( section( 'Label' ), 'Text color', '#6a1b9a' );
		await color( section( 'Spacing, background and border' ), 'Background color', '#fffde7' );
		await stateTab( 'focus' );
		await color( section( 'Input' ), 'Border color', '#d81b60' );
		await choose( section( 'Input' ), 'Box shadow', 'medium' );
		await color( section( 'Label' ), 'Text color', '#ad1457' );
		const n2 = page.locator( `${ item( 'name2' ) } .rfb-input` );
		check( 'text', 'the Normal look of the text type reaches the other text fields', ( await css( n2, 'backgroundColor' ) ) === 'rgb(243, 246, 255)' && ( await css( n2, 'borderTopLeftRadius' ) ) === '22px' );
		check( 'text', 'a number field is not a text field and is not touched', ( await css( page.locator( `${ item( 'num' ) } .rfb-input` ), 'backgroundColor' ) ) !== 'rgb(243, 246, 255)' );
		await page.screenshot( { path: join( SHOTS, 'text-states.png' ) } );

		// ------------------------------------------------------------ choices and the switch
		await pick( 'pet' );
		await openStyle();
		check( 'states', 'a choice field has Normal, Hover and Selected', ( await page.locator( '.rfb-state-tab' ).allTextContents() ).join( '|' ) === 'Normal|Hover|Selected' );
		await page.locator( '.rfb-inspector select[aria-label="Choice look"]' ).selectOption( 'buttons' );
		check( 'choices', 'choosing buttons for the type turns every choice field into buttons on the canvas', ( await page.locator( '.rfb-cv-choices.rfb-choice-buttons' ).count() ) === 2 );
		await color( section( 'Buttons' ), 'Background color', '#eceff1' );
		await num( section( 'Buttons' ), 'Border radius (px)', 4 );
		await stateTab( 'hover' );
		await color( section( 'Buttons' ), 'Background color', '#cfd8dc' );
		await stateTab( 'focus' );
		await color( section( 'Buttons' ), 'Background color', '#ff7f50' );
		await color( section( 'Buttons' ), 'Text color', '#ffffff' );
		check( 'choices', 'the selected look shows on the canvas', ( await css( page.locator( `${ item( 'size' ) } .rfb-check:has(input:checked)` ), 'backgroundColor' ) ) === 'rgb(255, 127, 80)' );
		await pick( 'size' );
		await openStyle();
		await page.click( '.rfb-scope-btn[data-scope="field"]' );
		await page.locator( '.rfb-inspector select[aria-label="Choice look"]' ).selectOption( 'default' );
		check( 'choices', 'one choice field can go back to a plain list while the type uses buttons', ( await page.locator( `${ item( 'size' ) } .rfb-cv-choices.rfb-choice-buttons` ).count() ) === 0 && ( await page.locator( `${ item( 'pet' ) } .rfb-cv-choices.rfb-choice-buttons` ).count() ) === 1 );
		await stateTab( 'focus' ).catch( () => null );
		await pick( 'agree' );
		await openStyle();
		await page.click( '.rfb-scope-btn[data-scope="type"]' );
		check( 'states', 'a switch has Normal, Hover and On', ( await page.locator( '.rfb-state-tab' ).allTextContents() ).join( '|' ) === 'Normal|Hover|On' );
		await color( section( 'Switch track' ), 'Track color (off)', '#b0bec5' );
		await color( section( 'Switch knob' ), 'Knob color', '#37474f' );
		await stateTab( 'focus' );
		await color( section( 'Switch track' ), 'Track color (on)', '#2e7d32' );

		// ------------------------------------------------------------ group box
		await pick( 'g1' );
		await openStyle();
		await color( section( 'Group box (.rfb-group)' ), 'Background color', '#e0f7fa' ).catch( () => null );
		check( 'group', 'a group offers its own box', ( await section( 'Group box (.rfb-group)' ).count() ) === 1 );
		await page.click( '.rfb-state-tab[data-state="normal"]' ).catch( () => null );
		await color( section( 'Group box (.rfb-group)' ), 'Background color', '#e0f7fa' );
		await num( section( 'Group box (.rfb-group)' ), 'Border radius (px)', 18 );
		const unlS = await unlabelled( page );
		check( 'a11y', 'every control of the style panels is labelled', unlS.length === 0, unlS.join( ',' ) );

		// ------------------------------------------------------------ save, reopen, public
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		const saved = seed( 'definition', { collection: 'shared' } );
		const ts = saved.type_styles;
		check( 'save', 'the shared styles are saved by type', ts.repeater.rep_border_width === 3 && ts.repeater.rep_border_color === '#ff0000' && ts.repeater.row_bg === '#f1f8e9' && ts.repeater.rows_gap === 24 && ts.repeater.rb_bg === '#00897b' && ts.repeater.rep_h_bg === '#ffecb3' && ts.repeater.rep_f_border_color === '#1565c0' && ts.repeater.rbf_bg === '#004d40' && ts.text.c_bg === '#f3f6ff' && ts.text.ch_bg === '#e3f2fd' && ts.text.cf_border_color === '#d81b60' && ts.radio.choice_look === 'buttons' && ts.radio.b_on_bg === '#ff7f50' && ts.toggle.tg_on === '#2e7d32' && ts.toggle.tg_off === '#b0bec5' && ts.group.grp_bg === '#e0f7fa', JSON.stringify( ts ) );
		check( 'save', 'a field\'s own style is saved apart from the shared one', saved.fields.find( ( f ) => f.key === 'r2' ).style.rep_border_color === '#1e88e5' && saved.fields.find( ( f ) => f.key === 'size' ).style.choice_look === 'default' && Object.keys( saved.fields.find( ( f ) => f.key === 'r1' ).style ).length === 0 );
		await page.goto( `${ BUILDER }&view=design&collection=shared` );
		await page.waitForSelector( '.rfb-cv-item' );
		check( 'save', 'reopened, the canvas shows the shared styles', ( await css( repBox( 'r3' ), 'borderTopColor' ) ) === 'rgb(255, 0, 0)' && ( await css( repBox( 'r2' ), 'borderTopColor' ) ) === 'rgb(30, 136, 229)' );
		await pick( 'r1' );
		await openStyle();
		check( 'save', 'and the style panel shows them for the type, and the own style for the one that has it', ( await page.locator( '.rfb-scope-btn.is-active' ).getAttribute( 'data-scope' ) ) === 'type' && ( await section( 'Repeater box (.rfb-repeater)' ).locator( '.rfb-color:has(.rfb-mini:text-is("Border color")) .rfb-hex' ).first().inputValue() ) === '#ff0000' );
		await pick( 'r2' );
		await openStyle();
		check( 'save', 'a field with its own style opens on "Only this field"', ( await page.locator( '.rfb-scope-btn.is-active' ).getAttribute( 'data-scope' ) ) === 'field' );
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] ).catch( () => null );

		const formPage = seed( 'page', { title: 'Shared', slug: 'shared-form', content: '[refraction_form collection="shared"]' } );
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 1100 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `public ${ theme }`;
			await v.goto( formPage.url );
			await v.waitForLoadState( 'load' );
			const q = ( sel, prop ) => v.locator( sel ).first().evaluate( ( el, p ) => getComputedStyle( el )[ p ], prop );
			const r = ( k ) => `[data-rfb-key="${ k }"] .rfb-repeater`;

			check( area, 'all three repeaters share the box style', await Promise.all( [ 'r1', 'r3' ].map( async ( k ) => ( await q( r( k ), 'borderTopColor' ) ) === 'rgb(255, 0, 0)' && ( await q( r( k ), 'borderTopWidth' ) ) === '3px' && ( await q( r( k ), 'borderTopStyle' ) ) === 'dashed' && ( await q( r( k ), 'borderTopLeftRadius' ) ) === '14px' && ( await q( r( k ), 'backgroundColor' ) ) === 'rgb(255, 248, 225)' && ( await q( r( k ), 'paddingTop' ) ) === '20px' ) ).then( ( a ) => a.every( Boolean ) ) );
			check( area, 'the one with its own style differs only where it says so', ( await q( r( 'r2' ), 'borderTopColor' ) ) === 'rgb(30, 136, 229)' && ( await q( r( 'r2' ), 'borderTopWidth' ) ) === '3px' && ( await q( r( 'r2' ), 'backgroundColor' ) ) === 'rgb(255, 248, 225)' );
			check( area, 'rows, gap, add and remove buttons are styled on every repeater', ( await q( '[data-rfb-key="r3"] .rfb-rep-row', 'backgroundColor' ) ) === 'rgb(241, 248, 233)' && ( await q( '[data-rfb-key="r3"] .rfb-rep-row', 'borderTopLeftRadius' ) ) === '8px' && ( await q( '[data-rfb-key="r3"] .rfb-rows', 'rowGap' ) ) === '24px' && ( await q( '[data-rfb-key="r1"] [data-rfb-add]', 'backgroundColor' ) ) === 'rgb(0, 137, 123)' && ( await q( '[data-rfb-key="r2"] .rfb-rep-remove', 'color' ) ) === 'rgb(198, 40, 40)' );
			// real hover and focus on a repeater
			await v.locator( '[data-rfb-key="r1"] [data-rfb-add]' ).hover();
			await sleep( 350 );
			check( area, 'hovering the add button changes it', ( await q( '[data-rfb-key="r1"] [data-rfb-add]', 'backgroundColor' ) ) === 'rgb(0, 105, 92)' );
			await v.locator( '[data-rfb-key="r1"] .rfb-rep-row' ).hover( { position: { x: 6, y: 6 } } );
			await sleep( 350 );
			check( area, 'hovering a row and the repeater changes their background', ( await q( '[data-rfb-key="r1"] .rfb-rep-row', 'backgroundColor' ) ) === 'rgb(220, 237, 200)' && ( await q( r( 'r1' ), 'backgroundColor' ) ) === 'rgb(255, 236, 179)' && ( await q( r( 'r3' ), 'backgroundColor' ) ) === 'rgb(255, 248, 225)' );
			await v.mouse.move( 3, 3 );
			await v.locator( '[data-rfb-key="r1"] .rfb-input' ).focus();
			await sleep( 350 );
			check( area, 'focus inside a repeater gives its Active look', ( await q( r( 'r1' ), 'borderTopColor' ) ) === 'rgb(21, 101, 192)' && ( await q( r( 'r3' ), 'borderTopColor' ) ) === 'rgb(255, 0, 0)' );
			// text fields
			check( area, 'every text field has the shared normal look', ( await q( '[data-rfb-key="name1"] .rfb-input', 'backgroundColor' ) ) === 'rgb(243, 246, 255)' && ( await q( '[data-rfb-key="name2"] .rfb-input', 'borderTopLeftRadius' ) ) === '22px' && ( await q( '[data-rfb-key="street"] .rfb-input', 'borderTopLeftRadius' ) ) === '22px' );
			await v.mouse.move( 3, 3 );
			await v.locator( '[data-rfb-key="name2"] .rfb-input' ).hover();
			await sleep( 350 );
			check( area, 'hovering a text field changes its background, its label and its box', ( await q( '[data-rfb-key="name2"] .rfb-input', 'backgroundColor' ) ) === 'rgb(227, 242, 253)' && ( await q( '[data-rfb-key="name2"] .rfb-label', 'color' ) ) === 'rgb(106, 27, 154)' && ( await q( '[data-rfb-key="name2"]', 'backgroundColor' ) ) === 'rgb(255, 253, 231)' && ( await q( '[data-rfb-key="name1"] .rfb-input', 'backgroundColor' ) ) === 'rgb(243, 246, 255)' );
			await v.mouse.move( 3, 3 );
			await v.locator( '[data-rfb-key="name1"] .rfb-input' ).focus();
			await sleep( 350 );
			check( area, 'focusing a text field changes its border, shadow and label color', ( await q( '[data-rfb-key="name1"] .rfb-input', 'borderTopColor' ) ) === 'rgb(216, 27, 96)' && ( await q( '[data-rfb-key="name1"] .rfb-input', 'boxShadow' ) ).includes( '18px' ) && ( await q( '[data-rfb-key="name1"] .rfb-label', 'color' ) ) === 'rgb(173, 20, 87)' && ( await q( '[data-rfb-key="name2"] .rfb-label', 'color' ) ) !== 'rgb(173, 20, 87)' );
			check( area, 'a number field is untouched', ( await q( '[data-rfb-key="num"] .rfb-input', 'backgroundColor' ) ) !== 'rgb(243, 246, 255)' );
			// choices
			check( area, 'the Pet choice is shown as buttons because its type says so', ( await v.locator( '[data-rfb-key="pet"].rfb-choice-buttons' ).count() ) === 1 && ( await q( '[data-rfb-key="pet"] .rfb-check', 'backgroundColor' ) ) === 'rgb(236, 239, 241)' && ( await q( '[data-rfb-key="pet"] .rfb-check', 'borderTopLeftRadius' ) ) === '4px' );
			check( area, 'the Size choice has its own look: a plain list', ( await v.locator( '[data-rfb-key="size"].rfb-choice-buttons' ).count() ) === 0 );
			await v.locator( '[data-rfb-key="pet"] .rfb-check' ).nth( 0 ).click();
			await v.mouse.move( 3, 3 );
			await sleep( 400 );
			check( area, 'a selected button gets the Selected look', ( await v.locator( '[data-rfb-key="pet"] .rfb-check' ).nth( 0 ).evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(255, 127, 80)' && ( await v.locator( '[data-rfb-key="pet"] .rfb-check' ).nth( 0 ).evaluate( ( el ) => getComputedStyle( el ).color ) ) === 'rgb(255, 255, 255)' );
			await v.locator( '[data-rfb-key="pet"] .rfb-check' ).nth( 1 ).hover();
			await sleep( 400 );
			check( area, 'hovering another button gives the Hover look', ( await v.locator( '[data-rfb-key="pet"] .rfb-check' ).nth( 1 ).evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(207, 216, 220)' );
			// switch
			check( area, 'the switch track and knob are styled, and the on state differs', ( await q( '[data-rfb-key="agree"] .rfb-switch-track', 'backgroundColor' ) ) === 'rgb(176, 190, 197)' );
			await v.locator( '[data-rfb-key="agree"] .rfb-switch' ).click();
			await v.mouse.move( 3, 3 );
			await sleep( 400 );
			check( area, 'turning the switch on gives the On look', ( await q( '[data-rfb-key="agree"] .rfb-switch-track', 'backgroundColor' ) ) === 'rgb(46, 125, 50)' );
			check( area, 'the group box is styled', ( await q( '[data-rfb-key="g1"] .rfb-group', 'backgroundColor' ) ) === 'rgb(224, 247, 250)' && ( await q( '[data-rfb-key="g1"] .rfb-group', 'borderTopLeftRadius' ) ) === '18px' );
			await v.screenshot( { path: join( SHOTS, `shared-${ theme }.png` ), fullPage: true } );
			await vctx.close();
		}

		// the admin edit screen carries the shared styles too
		await page.goto( `${ BUILDER }&view=record&collection=shared` );
		await page.waitForLoadState( 'load' );
		check( 'admin', 'the admin form applies the shared styles', ( await page.locator( '[data-rfb-key="r3"] .rfb-repeater' ).evaluate( ( el ) => getComputedStyle( el ).borderTopColor ) ) === 'rgb(255, 0, 0)' && ( await page.locator( '[data-rfb-key="name1"] .rfb-input' ).evaluate( ( el ) => getComputedStyle( el ).borderTopLeftRadius ) ) === '22px' && ( await page.locator( '[data-rfb-key="pet"].rfb-choice-buttons' ).count() ) === 1 );

		// reset the shared style of a type
		await page.goto( `${ BUILDER }&view=design&collection=shared` );
		await page.waitForSelector( '.rfb-cv-item' );
		await pick( 'r1' );
		await openStyle();
		await page.locator( '.rfb-fieldstyle button:has-text("Reset the style of all Repeater fields")' ).click();
		check( 'reset', 'resetting the type style clears every repeater that did not override it', ( await css( repBox( 'r3' ), 'borderTopWidth' ) ) !== '3px' && ( await css( repBox( 'r2' ), 'borderTopColor' ) ) === 'rgb(30, 136, 229)' && ( await css( page.locator( `${ item( 'name1' ) } .rfb-input` ), 'borderTopLeftRadius' ) ) === '22px' );

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
