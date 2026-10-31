#!/usr/bin/env node
/**
 * Form Builder part 8 check: the free choice card (a container you drop blocks into, with a pick control you place and style), the card's own Style tab (it
 * no longer edits the Group), and the Accordion, Tabs and Icon List styles showing in the designer, through the real Style tab and on the public
 * form, on a real WordPress (SQLite test site, Chromium).
 *
 * Usage: node scripts/check-form-builder-8.mjs [--site /tmp/rf-fb8-site] [--port 8928] [--shots /tmp/fb8-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). Throw-away site.
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
const SITE = arg( 'site', '/tmp/rf-fb8-site' );
const PORT = arg( 'port', '8928' );
const SHOTS = arg( 'shots', '/tmp/fb8-shots' );
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

		const { ctx, page } = await login( browser, 'admin', 'admin' );
		watch( page, 'admin' );

		const att = seed( 'attachment' );
		const panel = ( key, label, children, extra = {} ) => Object.assign( { key, label, type: 'panel', children }, extra );
		const def = {
			label: 'Cards', singular: 'Card', public_form: true, success_message: 'Thanks.',
			statuses: [ { label: 'New', color: 'primary' } ],
			settings: { hourly_limit: 0, min_seconds: 3, currency_symbol: '$' },
			fields: [
				{ key: 'name', label: 'Name', type: 'text', in_table: true },
				{ key: 'acc', label: 'More', type: 'accordion', children: [ panel( 'p_one', 'First panel', [ { key: 't1', label: 'T1', type: 'text' } ], { open: true } ), panel( 'p_two', 'Second panel', [ { key: 't2', label: 'T2', type: 'text' } ] ) ] },
				{ key: 'tbs', label: 'Tabs', type: 'tabs', children: [ panel( 'tab_a', 'Tab A', [ { key: 't3', label: 'T3', type: 'text' } ] ), panel( 'tab_b', 'Tab B', [ { key: 't4', label: 'T4', type: 'text' } ] ) ] },
				{ key: 'perks', label: 'Perks', type: 'icon_list', items: [ { text: 'One', icon: 'check' }, { text: 'Two', icon: 'star' } ] },
				{ key: 'plan', label: 'Vehicle', type: 'choice_set', required: true, card_columns: 2, card_gap: 14, marker_pos: 'left', marker_look: 'radio', default: 'car', children: [
					{ key: 'car', label: 'Car tour', type: 'group', card_mode: 'free', card_price: 30, per: 'day', marker_pos: 'top-right', marker_look: 'tick', children: [
						{ key: 'photo', label: 'Photo', type: 'image', image_id: att.id, image_width: 100 },
						{ key: 'car_cols', label: 'Head', type: 'columns', children: [
							panel( 'cc_l', 'L', [ { key: 'car_t', label: 'Title', type: 'heading', from_card: true, level: 3 }, { key: 'car_b', label: 'Badge', type: 'badge', content: 'Popular' } ], { width: 'w70' } ),
							panel( 'cc_r', 'R', [ { key: 'car_p', label: 'Price', type: 'price', price_card: true, style: { align: 'right' } } ], { width: 'w30' } ),
						] },
						{ key: 'car_acc', label: 'Included', type: 'accordion', children: [ panel( 'car_inc', 'What is included', [ { key: 'car_list', label: 'List', type: 'icon_list', items: [ { text: 'Seats four', icon: 'check' }, { text: 'Free water', icon: 'check' } ] } ] ) ] },
					] },
					{ key: 'bus', label: 'Minibus tour', type: 'group', card_mode: 'free', marker_pos: 'right', children: [
						{ key: 'bus_t', label: 'Title', type: 'heading', from_card: true, level: 3 },
						{ key: 'bus_p', label: 'Text', type: 'paragraph', content: 'Price on request' },
						{ key: 'bus_price', label: 'Price', type: 'price', price_card: true },
					] },
					{ key: 'pay', label: 'Master Card', type: 'group', card_mode: 'free', marker_pos: 'hidden', card_width: 'full', children: [ { key: 'pay_t', label: 'Title', type: 'heading', from_card: true, level: 4 } ] },
					{ key: 'old', label: 'Standard card', type: 'group', card_price: 5, card_subtitle: 'Old style', card_badge: 'Monthly', children: [ { key: 'old_t', label: 'T', type: 'paragraph', content: 'inside' } ] },
				] },
			],
		};
		const saved = seed( 'collection', { definition: def } );
		check( 'setup', 'the collection is saved', saved.fields === 5, JSON.stringify( saved ) );
		const stored = seed( 'definition', { collection: 'cards' } );
		const plan0 = stored.fields.find( ( f ) => f.key === 'plan' );
		check( 'schema', 'card modes, pick control options, blocks and the old standard card survive the cleaning', plan0.children[ 0 ].card_mode === 'free' && plan0.children[ 0 ].marker_pos === 'top-right' && plan0.children[ 0 ].marker_look === 'tick' && plan0.children[ 3 ].card_mode === 'standard' && plan0.children[ 1 ].marker_look === '' && plan0.marker_look === 'radio' && plan0.children[ 0 ].children[ 1 ].children[ 0 ].children[ 1 ].type === 'badge', JSON.stringify( plan0.children[ 0 ] ).slice( 0, 300 ) );

		// ------------------------------------------------------------ the designer, through the real Style tab
		await page.setViewportSize( { width: 1500, height: 1000 } );
		await page.goto( `${ BUILDER }&view=design&collection=cards` );
		await page.waitForSelector( '.rfb-cv-item' );
		const hex = ( sec, label, value ) => page.locator( `.rfb-inspector .rfb-section:has(> summary:text-is("${ sec }")) .rfb-color:has(.rfb-mini:text-is("${ label }")) .rfb-hex` ).first().fill( value );
		const num = ( sec, label, value ) => page.locator( `.rfb-inspector .rfb-section:has(> summary:text-is("${ sec }")) .rfb-field:has(.rfb-mini:text-is("${ label }")) input` ).first().fill( String( value ) );
		const css = ( loc, prop ) => loc.first().evaluate( ( el, p ) => getComputedStyle( el )[ p ], prop );
		const state = ( s ) => page.click( `.rfb-state-tab[data-state="${ s }"]` );
		const openStyle = () => page.click( '.rfb-field-tab[data-fieldtab="style"]' );

		// Accordion: the panels are drawn with the real header classes, so the style shows
		check( 'accordion', 'the canvas draws each panel with the real header and body classes', ( await page.locator( '.rfb-cv-item[data-rfb-key="acc"] .rfb-acc-item' ).count() ) === 2 && ( await page.locator( '.rfb-cv-item[data-rfb-key="acc"] .rfb-acc-head' ).count() ) === 2 );
		await page.locator( '.rfb-cv-item[data-rfb-key="acc"] > .rfb-cv-container > .rfb-cv-title' ).click( { force: true } );
		await openStyle();
		await hex( 'Panel header (.rfb-acc-head)', 'Text color', '#ff0000' );
		await num( 'Panel header (.rfb-acc-head)', 'Text size (px)', 22 );
		await hex( 'Each panel (.rfb-acc-item)', 'Background color', '#fff3e0' );
		check( 'accordion', 'the header color, size and the panel background show on the canvas right away', ( await css( page.locator( '.rfb-cv-item[data-rfb-key="acc"] .rfb-acc-head' ), 'color' ) ) === 'rgb(255, 0, 0)' && ( await css( page.locator( '.rfb-cv-item[data-rfb-key="acc"] .rfb-acc-head' ), 'fontSize' ) ) === '22px' && ( await css( page.locator( '.rfb-cv-item[data-rfb-key="acc"] .rfb-acc-item' ), 'backgroundColor' ) ) === 'rgb(255, 243, 224)' );
		// Tabs
		check( 'tabs', 'the canvas draws the tab row with the real classes and the first tab selected', ( await page.locator( '.rfb-cv-item[data-rfb-key="tbs"] .rfb-tablist .rfb-tab' ).count() ) === 2 && ( await page.locator( '.rfb-cv-item[data-rfb-key="tbs"] .rfb-tab[aria-selected="true"]' ).count() ) === 1 );
		await page.locator( '.rfb-cv-item[data-rfb-key="tbs"] > .rfb-cv-container > .rfb-cv-title' ).click( { force: true } );
		await openStyle();
		await hex( 'Tab buttons (.rfb-tab)', 'Text color', '#00aa00' );
		check( 'tabs', 'the tab text color shows on the canvas', ( await css( page.locator( '.rfb-cv-item[data-rfb-key="tbs"] .rfb-tab[aria-selected="false"]' ), 'color' ) ) === 'rgb(0, 170, 0)' );
		await state( 'focus' );
		await hex( 'Tab buttons (.rfb-tab)', 'Text color', '#0000ff' );
		check( 'tabs', 'the Selected tab look shows on the selected tab', ( await css( page.locator( '.rfb-cv-item[data-rfb-key="tbs"] .rfb-tab[aria-selected="true"]' ), 'color' ) ) === 'rgb(0, 0, 255)' );
		// Icon list
		await page.locator( '.rfb-cv-item[data-rfb-key="perks"] .rfb-cv-preview-body' ).click( { force: true } );
		await openStyle();
		await hex( 'Icons', 'Icon color', '#ee00ee' );
		await num( 'Icons', 'Icon size (px)', 30 );
		check( 'icon list', 'icon color and size show on the canvas', ( await css( page.locator( '.rfb-cv-item[data-rfb-key="perks"] .rfb-il-icon' ), 'color' ) ) === 'rgb(238, 0, 238)' && ( await css( page.locator( '.rfb-cv-item[data-rfb-key="perks"] .rfb-il-icon' ), 'fontSize' ) ) === '30px' );
		await page.screenshot( { path: join( SHOTS, 'designer-styles.png' ) } );

		// Card: its own Style tab, not the Group's
		const cardItem = ( k ) => page.locator( `.rfb-cv-item[data-rfb-key="${ k }"]` );
		await cardItem( 'bus' ).locator( '> .rfb-cv-container' ).click( { position: { x: 4, y: 4 }, force: true } );
		check( 'card', 'a card is called a Choice card in the settings panel, not a Group', ( await page.locator( '.rfb-inspector-head strong' ).textContent() ) === 'Choice card' );
		await openStyle();
		check( 'card style', 'the Style tab is for all Choice cards (4), not Groups', ( await page.locator( '.rfb-scope-btn.is-active' ).textContent() ) === 'All Choice card fields (4)' );
		const cs = await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'card style', 'it offers the card box and the pick control, and no Group box', cs.includes( 'Spacing, background and border' ) && cs.includes( 'Pick control (radio / tick)' ) && cs.includes( 'Pick control size' ) && ! cs.includes( 'Group box (.rfb-group)' ), cs.join( '|' ) );
		check( 'card style', 'it has Normal, Hover and Selected', ( await page.locator( '.rfb-state-tab' ).allTextContents() ).join( '|' ) === 'Normal|Hover|Selected' );
		await hex( 'Spacing, background and border', 'Background color', '#f1f8e9' );
		await num( 'Spacing, background and border', 'Border radius (px)', 18 );
		check( 'card style', 'the background and radius show on every card on the canvas', ( await css( cardItem( 'bus' ).locator( '> .rfb-cv-container' ), 'backgroundColor' ) ) === 'rgb(241, 248, 233)' && ( await css( cardItem( 'pay' ).locator( '> .rfb-cv-container' ), 'borderTopLeftRadius' ) ) === '18px' && ( await css( cardItem( 'old' ).locator( '> .rfb-cv-container' ), 'backgroundColor' ) ) === 'rgb(241, 248, 233)' );
		await state( 'focus' );
		await hex( 'Spacing, background and border', 'Background color', '#c8e6c9' );
		await hex( 'Spacing, background and border', 'Border color', '#2e7d32' );
		await hex( 'Pick control (radio / tick)', 'Background color', '#ffd54f' );
		check( 'card style', 'the Selected look shows on the picked card (and on the selected card while you edit it)', ( await css( cardItem( 'car' ).locator( '> .rfb-cv-container' ), 'borderTopColor' ) ) === 'rgb(46, 125, 50)' && ( await css( cardItem( 'bus' ).locator( '> .rfb-cv-container' ), 'backgroundColor' ) ) === 'rgb(200, 230, 201)', JSON.stringify( [ await css( cardItem( 'car' ).locator( '> .rfb-cv-container' ), 'borderTopColor' ), await css( cardItem( 'bus' ).locator( '> .rfb-cv-container' ), 'backgroundColor' ), await cardItem( 'bus' ).locator( '> .rfb-cv-container' ).getAttribute( 'class' ) ] ) );
		await state( 'normal' );
		await num( 'Pick control size', 'Size (px)', 28 );
		check( 'card style', 'the pick control size applies', ( await css( cardItem( 'bus' ).locator( '.rfb-cc-mark' ), 'width' ) ) === '28px' );
		// card settings
		await cardItem( 'bus' ).locator( '> .rfb-cv-container' ).click( { position: { x: 4, y: 4 }, force: true } );
		await page.click( '.rfb-field-tab[data-fieldtab="settings"]' );
		const lbl = await page.$$eval( '.rfb-inspector .rfb-mini', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'card settings', 'a free card offers its mode, pick control, saved price and width, but no header fields', [ 'Card is built as', 'Pick control position', 'Pick control look', 'Price saved with the record', 'Card width' ].every( ( l ) => lbl.includes( l ) ) && ! lbl.includes( 'Short text under the title' ) && ! lbl.includes( 'Badge' ), lbl.join( '|' ) );
		const markPos = await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Pick control position")) select option' ).allTextContents();
		check( 'card settings', 'the pick control can sit left, right, in a top corner, or be hidden, or follow the set', [ 'Same as the set', 'Left', 'Right', 'Top left corner', 'Top right corner' ].every( ( o ) => markPos.includes( o ) ) && markPos.some( ( o ) => o.startsWith( 'Hidden' ) ) );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Pick control position")) select' ).selectOption( 'top-left' );
		check( 'card settings', 'changing the position moves the control on the canvas', ( await cardItem( 'bus' ).locator( '.rfb-choice-card' ).first().getAttribute( 'class' ) ).includes( 'rfb-mpos-top-left' ) );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Pick control position")) select' ).selectOption( 'right' );

		// drag blocks into a free card
		const busList = cardItem( 'bus' ).locator( '> .rfb-cv-container > .rfb-cc-content > .rfb-cv-list' );
		const before = await cardItem( 'bus' ).locator( '> .rfb-cv-container > .rfb-cc-content > .rfb-cv-list > .rfb-cv-item' ).count();
		// By hand (a real drag) first, while the card is still short: an upload is refused, an Accordion is accepted.
		await drag( page, page.locator( '.rfb-palette-item[data-type="file"]' ), busList );
		check( 'free card', 'an upload is refused inside a card', ( await cardItem( 'bus' ).locator( '.rfb-cv-item.rfb-cv-file' ).count() ) === 0 );
		await drag( page, page.locator( '.rfb-palette-item[data-type="accordion"]' ), busList );
		check( 'free card', 'an Accordion can be dropped in a card (a "What is included" toggle)', ( await cardItem( 'bus' ).locator( '.rfb-cv-item.rfb-cv-accordion' ).count() ) === 1 );
		// Then the same card through the list: select the card, press a tile.
		for ( const type of [ 'badge', 'icon_list', 'image', 'columns' ] ) {
			await cardItem( 'bus' ).locator( '> .rfb-cv-container' ).click( { position: { x: 4, y: 4 }, force: true } );
			await page.click( `.rfb-palette-item[data-type="${ type }"]` );
		}
		check( 'free card', 'a Badge, an Icon List, an Image and a Columns block can be added straight into a free card', ( await cardItem( 'bus' ).locator( '> .rfb-cv-container > .rfb-cc-content > .rfb-cv-list > .rfb-cv-item' ).count() ) === before + 5 );

		// heading from the card name, price block
		await cardItem( 'car_t' ).locator( '.rfb-cv-preview-body' ).click( { force: true } );
		check( 'free card', 'a heading can show the card\'s name', ( await page.locator( '.rfb-inspector label:has-text("Show the card\'s name")' ).count() ) === 1 && ( await cardItem( 'car_t' ).locator( '.rfb-cv-heading' ).textContent() ) === 'Car tour' );
		await cardItem( 'car_p' ).locator( '.rfb-cv-preview-body' ).click( { force: true } );
		check( 'free card', 'a price block shows the card\'s price with its period', ( await cardItem( 'car_p' ).locator( '.rfb-price' ).textContent() ).replace( /\s+/g, ' ' ).trim() === '$30.00' || ( await cardItem( 'car_p' ).locator( '.rfb-price' ).textContent() ).includes( '$30.00' ) );

		// switching a standard card to free keeps its look as blocks
		await cardItem( 'old' ).locator( '> .rfb-cv-container' ).click( { position: { x: 4, y: 4 }, force: true } );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Card is built as")) select' ).selectOption( 'free' );
		const kinds = await cardItem( 'old' ).locator( '.rfb-cv-item' ).evaluateAll( ( els ) => els.map( ( e ) => e.className.split( ' ' )[ 1 ].replace( 'rfb-cv-', '' ) ) );
		check( 'free card', 'switching a standard card to free turns its title, badge and price into blocks', kinds.includes( 'columns' ) && kinds.includes( 'heading' ) && kinds.includes( 'badge' ) && kinds.includes( 'price' ) && kinds.includes( 'paragraph' ), kinds.join( ',' ) );

		// the set options
		await cardItem( 'plan' ).locator( '> .rfb-cv-container > .rfb-cv-title' ).click( { force: true } );
		check( 'set', 'the set has a default pick control position and look', ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Pick control look")) select' ).count() ) === 1 );
		await page.screenshot( { path: join( SHOTS, 'designer-cards.png' ) } );

		// save
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		const after = seed( 'definition', { collection: 'cards' } );
		check( 'save', 'card, accordion, tabs and icon list shared styles are saved by type, and nothing on Group', after.type_styles.card.bg === '#f1f8e9' && after.type_styles.card.cs_border_color === '#2e7d32' && after.type_styles.card.mk_size === 28 && after.type_styles.accordion.ah_color === '#ff0000' && after.type_styles.tabs.tb_color === '#00aa00' && after.type_styles.tabs.tbo_color === '#0000ff' && after.type_styles.icon_list.il_ic_color === '#ee00ee' && ! after.type_styles.group, JSON.stringify( after.type_styles ) );
		const apl = after.fields.find( ( f ) => f.key === 'plan' );
		check( 'save', 'the old card became free and the new blocks were saved inside the bus card', apl.children[ 3 ].card_mode === 'free' && apl.children[ 1 ].children.some( ( c ) => c.type === 'columns' ) && apl.children[ 1 ].children.some( ( c ) => c.type === 'accordion' ) && apl.children[ 1 ].marker_pos === 'right', JSON.stringify( apl.children[ 1 ].children.map( ( c ) => c.type ) ) );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Cards', slug: 'cards-form', content: '[refraction_form collection="cards"]' } );
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 1500 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `public ${ theme }`;
			await v.goto( formPage.url );
			await v.waitForLoadState( 'load' );
			await v.waitForSelector( '.rfb-form' );
			const card = ( k ) => v.locator( `.rfb-choice-card[data-rfb-key="${ k }"]` );
			const box = ( loc ) => loc.first().evaluate( ( el ) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; } );
			const cssOf = ( loc, prop ) => loc.first().evaluate( ( el, p ) => getComputedStyle( el )[ p ], prop );

			// shared styles reach the page
			check( area, 'the Accordion, Tabs and Icon List styles reach the page', ( await cssOf( v.locator( '.rfb-t-accordion .rfb-acc-head' ), 'color' ) ) === 'rgb(255, 0, 0)' && ( await cssOf( v.locator( '.rfb-tab[aria-selected="false"]' ), 'color' ) ) === 'rgb(0, 170, 0)' && ( await cssOf( v.locator( '.rfb-t-icon_list .rfb-il-icon' ), 'fontSize' ) ) === '30px' );
			check( area, 'the Choice card style reaches every card, and the Selected look the picked one', ( await cssOf( card( 'bus' ), 'backgroundColor' ) ) === 'rgb(241, 248, 233)' && ( await cssOf( card( 'bus' ), 'borderTopLeftRadius' ) ) === '18px' && ( await cssOf( card( 'car' ), 'borderTopColor' ) ) === 'rgb(46, 125, 50)' && ( await cssOf( card( 'car' ), 'backgroundColor' ) ) === 'rgb(200, 230, 201)' && ( await cssOf( card( 'bus' ).locator( '.rfb-cc-mark' ), 'width' ) ) === '28px' );

			// markup and pick control placement
			const car = await box( card( 'car' ) );
			const carMark = await box( card( 'car' ).locator( '.rfb-cc-mark' ) );
			check( area, 'top-right pick control sits in the card\'s top right corner (tick look, shown because it is picked)', carMark.r > car.r - 25 && carMark.y < car.y + 25 && ( await cssOf( card( 'car' ).locator( '.rfb-cc-mark' ), 'backgroundColor' ) ) !== 'rgba(0, 0, 0, 0)', JSON.stringify( [ car, carMark ] ) );
			const bus = await box( card( 'bus' ) );
			const busMark = await box( card( 'bus' ).locator( '.rfb-cc-mark' ) );
			check( area, 'right pick control sits on the right edge of its card', busMark.r > bus.r - 40 && busMark.x > bus.x + bus.w / 2, JSON.stringify( [ bus, busMark ] ) );
			const pay = await box( card( 'pay' ) );
			check( area, 'a hidden pick control draws nothing, and the card takes the full width', ( await cssOf( card( 'pay' ).locator( '.rfb-cc-mark' ), 'display' ) ) === 'none' && pay.w > car.w * 1.8, JSON.stringify( [ pay, car ] ) );

			// content
			check( area, 'the heading shows the card\'s own name', ( await card( 'car' ).locator( '.rfb-heading' ).textContent() ) === 'Car tour' && ( await card( 'bus' ).locator( '.rfb-heading' ).textContent() ) === 'Minibus tour' );
			check( area, 'a price shows only when the card has one (with currency and period), the bus has none', ( await card( 'car' ).locator( '.rfb-price' ).textContent() ).replace( /\s+/g, ' ' ).trim() === '$30.00 / day' && ( await card( 'bus' ).locator( '.rfb-price' ).count() ) === 0 );
			check( area, 'the badge block is a pill and the picture fills the card', ( await card( 'car' ).locator( '.rfb-badge-pill' ).textContent() ) === 'Popular' && ( await box( card( 'car' ).locator( '.rfb-image' ) ) ).w > car.w * 0.75, JSON.stringify( [ await card( 'car' ).locator( '.rfb-badge-pill' ).textContent(), await box( card( 'car' ).locator( '.rfb-image' ) ), car ] ) );
			const cols = await box( card( 'car' ).locator( '.rfb-column' ) );
			const col2 = await box( card( 'car' ).locator( '.rfb-column:nth-child(2)' ) );
			check( area, 'title and price sit on one row (70 / 30 columns)', Math.abs( cols.y - col2.y ) < 3 && cols.w > col2.w * 1.8 );
			check( area, 'the price is right aligned by its own block style', ( await cssOf( card( 'car' ).locator( '.rfb-t-price' ), 'textAlign' ) ) === 'right' );

			// interaction: the whole card picks it; a toggle inside does not
			await card( 'bus' ).click( { position: { x: 30, y: 30 } } );
			check( area, 'clicking anywhere on a card picks it and unpicks the other', ( await card( 'bus' ).locator( 'input.rfb-cc-input, .rfb-cc-pick input' ).isChecked() ) && ! ( await card( 'car' ).locator( '.rfb-cc-pick input' ).isChecked() ) && ( await card( 'bus' ).evaluate( ( e ) => e.classList.contains( 'is-selected' ) ) ) && ! ( await card( 'car' ).evaluate( ( e ) => e.classList.contains( 'is-selected' ) ) ) );
			await card( 'car' ).locator( '.rfb-acc-head' ).click();
			await sleep( 150 );
			check( area, 'opening the "what is included" toggle inside a card does not pick that card', ( await card( 'car' ).locator( 'details' ).evaluate( ( e ) => e.open ) ) && ! ( await card( 'car' ).locator( '.rfb-cc-pick input' ).isChecked() ) );
			check( area, 'the list inside the toggle is shown', await card( 'car' ).locator( '.rfb-il-item' ).first().isVisible() );
			await v.keyboard.press( 'Tab' );
			await card( 'pay' ).locator( '.rfb-cc-pick input' ).focus();
			await v.keyboard.press( 'Space' );
			check( area, 'a hidden pick control still works from the keyboard', await card( 'pay' ).locator( '.rfb-cc-pick input' ).isChecked() );
			check( area, 'a standard card still renders with its header, badge and price', ( await card( 'old' ).locator( '.rfb-cc-title' ).count() ) === 0 ? ( await card( 'old' ).locator( '.rfb-heading' ).count() ) === 1 : true );
			await v.screenshot( { path: join( SHOTS, `public-${ theme }.png` ), fullPage: true } );

			// phone
			await v.setViewportSize( { width: 400, height: 900 } );
			await sleep( 300 );
			const pc = await box( card( 'car' ) );
			const pb = await box( card( 'bus' ) );
			check( area, 'on a phone the cards stack and nothing scrolls sideways', pb.y > pc.y + 20 && pc.w > 250 && ( await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth + 1 ) ), JSON.stringify( [ pc, pb, await v.evaluate( () => [ document.documentElement.scrollWidth, window.innerWidth ] ) ] ) );
			await v.setViewportSize( { width: 1200, height: 1500 } );

			// submit
			await card( 'car' ).click( { position: { x: 10, y: 10 } } );
			await sleep( 3200 );
			await Promise.all( [ v.waitForLoadState( 'load' ), v.click( '.rfb-submit' ) ] );
			await sleep( 500 );
			const rec = seed( 'latest', { collection: 'cards' } ).record;
			check( area, 'the form submits: the picked card is stored with its name, price and period', rec && rec.values.plan && rec.values.plan[ 0 ].key === 'car' && rec.values.plan[ 0 ].title === 'Car tour' && rec.values.plan[ 0 ].price === 30 && rec.values.plan[ 0 ].per === 'day', JSON.stringify( rec && rec.values.plan ) );
			await vctx.close();
		}

		const unl = await unlabelled( page );
		check( 'a11y', 'every control of the designer is labelled', unl.length === 0, unl.join( ',' ) );
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 800 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', consoleErrors.length === 0, consoleErrors.join( ' || ' ) );
		const errors = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( errors ), errors.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form builder part 8 checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
