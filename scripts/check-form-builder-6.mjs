#!/usr/bin/env node
/**
 * Form Builder part 6 check: Accordion and Tabs (any field can sit in a panel), choice cards (a Group or Repeater the visitor picks,
 * with locked fields inside) and the Amount field with the collection's currency format and live 1,200 / 350,329.45 typing, in the
 * designer, on the public form and in the admin, on a real WordPress (SQLite test site, Chromium).
 *
 * Usage: node scripts/check-form-builder-6.mjs [--site /tmp/rf-fb6-site] [--port 8926] [--shots /tmp/fb6-shots]
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
const SITE = arg( 'site', '/tmp/rf-fb6-site' );
const PORT = arg( 'port', '8926' );
const SHOTS = arg( 'shots', '/tmp/fb6-shots' );
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
	await page.mouse.move( to.x + offset.x, to.y + offset.y, { steps: 12 } );
	await page.waitForTimeout( 200 );
	await page.mouse.move( to.x + offset.x + 1, to.y + offset.y + 1 );
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

		const plan = ( key, label, price, per, extra = {} ) => ( Object.assign( { key, label, type: 'group', card_price: price, per, card_badge: per ? 'Monthly' : '', card_subtitle: 'Come in as often as you like', children: [
			{ key: key + '_visits', label: 'Visits', type: 'text', default: 'Unlimited', required: true },
			{ key: key + '_note', label: 'Note', type: 'paragraph', content: 'Priority walk-in service' },
		] }, extra ) );
		const def = {
			label: 'Orders', singular: 'Order', public_form: true, success_message: 'Thanks.',
			statuses: [ { label: 'New', color: 'primary' } ],
			settings: { hourly_limit: 0, min_seconds: 3, currency_symbol: '$', currency_position: 'before', thousands_sep: ',', decimal_sep: '.', decimals: 2 },
			fields: [
				{ key: 'customer', label: 'Customer', type: 'text', required: true, in_table: true },
				{ key: 'more', label: 'More about you', type: 'accordion', multiple: false, children: [
					{ key: 'p_contact', label: 'Contact', type: 'panel', open: true, children: [
						{ key: 'mail', label: 'Email', type: 'email', required: true },
						{ key: 'addr', label: 'Address', type: 'group', children: [ { key: 'street', label: 'Street', type: 'text' } ] },
					] },
					{ key: 'p_extra', label: 'Extras', type: 'panel', children: [ { key: 'extra_note', label: 'Extra note', type: 'text' } ] },
				] },
				{ key: 'tb', label: 'Pricing', type: 'tabs', tab_look: 'pills', children: [
					{ key: 'tab_one', label: 'Tab One', type: 'panel', children: [ { key: 'fee', label: 'Fee', type: 'currency', per: 'month', min: 5, in_table: true } ] },
					{ key: 'tab_two', label: 'Tab Two', type: 'panel', conditions: { enabled: true, action: 'show', match: 'all', rules: [ { field: 'customer', op: 'equals', value: 'vip' } ] }, children: [ { key: 'vip_note', label: 'VIP note', type: 'text', required: true } ] },
				] },
				{ key: 'service', label: 'Service', type: 'choice_set', required: true, default: 'trim', children: [
					plan( 'trim', 'Nail Trimming', 20, '', { card_subtitle: 'Usually under 15 minutes' } ),
					plan( 'member', 'Nail Membership', 20, 'month' ),
					{ key: 'bath', label: 'Basic Bath', type: 'repeater', card_note: 'Price on request', min_rows: 2, children: [ { key: 'bath_item', label: 'Item', type: 'text', default: 'Shampoo' } ] },
				] },
			],
		};
		const saved = seed( 'collection', { definition: def } );
		check( 'setup', 'the collection with an accordion, tabs, choice cards and an amount is saved', saved.fields === 4, JSON.stringify( saved ) );
		const stored = seed( 'definition', { collection: 'orders' } );
		check( 'schema', 'panels, cards and their options survive the cleaning', stored.fields[ 1 ].children.length === 2 && stored.fields[ 2 ].tab_look === 'pills' && stored.fields[ 3 ].children[ 1 ].per === 'month' && stored.fields[ 3 ].children[ 1 ].card_badge === 'Monthly' && stored.fields[ 3 ].children[ 2 ].card_note === 'Price on request' && stored.fields[ 2 ].children[ 0 ].children[ 0 ].per === 'month', JSON.stringify( stored.fields[ 3 ].children[ 1 ] ).slice( 0, 300 ) );

		// ------------------------------------------------------------ the designer
		await page.setViewportSize( { width: 1500, height: 1000 } );
		await page.goto( `${ BUILDER }&view=design&collection=orders` );
		await page.waitForSelector( '.rfb-cv-item' );
		const types = await page.$$eval( '.rfb-palette-item', ( els ) => els.map( ( e ) => e.dataset.type ) );
		check( 'palette', 'Accordion, Tabs and Choice cards are in the list of fields, a panel is not', [ 'accordion', 'tabs', 'choice_set' ].every( ( t ) => types.includes( t ) ) && ! types.includes( 'panel' ), types.join( ',' ) );
		check( 'canvas', 'both panels of the accordion and both tabs are drawn as drop areas, with their fields inside', ( await page.locator( '.rfb-cv-item[data-rfb-key="more"] .rfb-cv-panel' ).count() ) === 2 && ( await page.locator( '.rfb-cv-item[data-rfb-key="tb"] .rfb-cv-panel' ).count() ) === 2 && ( await page.locator( '.rfb-cv-item[data-rfb-key="mail"]' ).count() ) === 1 );
		check( 'canvas', 'the cards show title, badge, subtitle and the price in the collection currency', ( await page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-title' ).textContent() ).includes( 'Nail Membership' ) && ( await page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-price' ).textContent() ).includes( '$20.00' ) && ( await page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-price' ).textContent() ).includes( '/ month' ) && ( await page.locator( '.rfb-cv-item[data-rfb-key="bath"] .rfb-cc-note' ).textContent() ) === 'Price on request' );
		check( 'canvas', 'the amount field shows the symbol and the period', ( await page.locator( '.rfb-cv-item[data-rfb-key="fee"] .rfb-amount-symbol' ).textContent() ) === '$' && ( await page.locator( '.rfb-cv-item[data-rfb-key="fee"] .rfb-amount-per' ).textContent() ) === '/ month' );
		await page.screenshot( { path: join( SHOTS, 'designer.png' ), fullPage: false } );

		// Drag a Text field from the list into the second panel of the accordion.
		const target = page.locator( '.rfb-cv-item[data-rfb-key="more"] .rfb-cv-panel[data-rfb-key="p_extra"] .rfb-cv-list' );
		const before = await page.locator( '.rfb-cv-item[data-rfb-key="more"] .rfb-cv-panel[data-rfb-key="p_extra"] .rfb-cv-item' ).count();
		await drag( page, page.locator( '.rfb-palette-item[data-type="phone"]' ), target );
		check( 'drag', 'a field dragged from the list lands inside the panel', ( await page.locator( '.rfb-cv-item[data-rfb-key="more"] .rfb-cv-panel[data-rfb-key="p_extra"] .rfb-cv-item' ).count() ) === before + 1 );
		// A Step can not go into a panel, and a panel can not be dragged out of its host.
		const stepsBefore = await page.locator( '.rfb-cv-item.rfb-cv-step' ).count();
		await drag( page, page.locator( '.rfb-palette-item[data-type="step"]' ), page.locator( '.rfb-cv-panel[data-rfb-key="p_extra"] .rfb-cv-list' ) );
		check( 'drag', 'a Step is refused inside a panel', ( await page.locator( '.rfb-cv-item.rfb-cv-step' ).count() ) === stepsBefore && ( await page.locator( '.rfb-cv-panel[data-rfb-key="p_extra"] .rfb-cv-item.rfb-cv-step' ).count() ) === 0 );
		// A Group can go in a panel; a text can go into a card; a text can NOT go straight into the choice set.
		const setItems = await page.locator( '.rfb-cv-item[data-rfb-key="service"] > .rfb-cv-container > .rfb-cc-list > .rfb-cv-list > .rfb-cv-item' ).count();
		await drag( page, page.locator( '.rfb-palette-item[data-type="email"]' ), page.locator( '.rfb-cv-item[data-rfb-key="service"] > .rfb-cv-container > .rfb-cc-list > .rfb-cv-list' ) );
		check( 'drag', 'a plain field can not be dropped straight into a set of cards', ( await page.locator( '.rfb-cv-item[data-rfb-key="service"] > .rfb-cv-container > .rfb-cc-list > .rfb-cv-list > .rfb-cv-item' ).count() ) === setItems );
		const cardFields = await page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-fields .rfb-cv-item' ).count();
		await drag( page, page.locator( '.rfb-palette-item[data-type="number"]' ), page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-fields .rfb-cv-list' ) );
		check( 'drag', 'a field can be dropped into a card', ( await page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-fields .rfb-cv-item' ).count() ) === cardFields + 1 );
		// A group can not go inside a card, a second accordion can not go into a panel.
		await drag( page, page.locator( '.rfb-palette-item[data-type="group"]' ), page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-fields .rfb-cv-list' ) );
		check( 'drag', 'a group can not go inside a card', ( await page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-fields .rfb-cv-item.rfb-cv-group' ).count() ) === 0 );
		await drag( page, page.locator( '.rfb-palette-item[data-type="tabs"]' ), page.locator( '.rfb-cv-panel[data-rfb-key="p_extra"] .rfb-cv-list' ) );
		check( 'drag', 'tabs can not go inside a panel', ( await page.locator( '.rfb-cv-panel[data-rfb-key="p_extra"] .rfb-cv-item.rfb-cv-tabs' ).count() ) === 0 );

		// Inspector of a panel, a card and the amount.
		await page.locator( '.rfb-cv-panel[data-rfb-key="p_extra"] .rfb-acc-head' ).click();
		check( 'inspector', 'a panel can be renamed, opened by default and given a visibility rule', ( await page.locator( '.rfb-inspector .rfb-inspector-head strong' ).textContent() ) === 'Panel' && ( await page.locator( '.rfb-inspector label:has-text("Open when the page loads")' ).count() ) === 1 && ( await page.locator( '.rfb-inspector summary:text-is("Conditional visibility")' ).count() ) === 1 );
		await page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-main' ).first().click( { force: true } );
		const labels = await page.$$eval( '.rfb-inspector .rfb-mini', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'inspector', 'a card has badge, price, period, note and details options', [ 'Badge', 'Price', 'Price period', 'Text when there is no price', 'Name of the details link' ].every( ( l ) => labels.includes( l ) ), labels.join( '|' ) );
		await page.locator( '.rfb-cv-item[data-rfb-key="fee"] .rfb-cv-preview-body' ).click( { force: true } );
		check( 'inspector', 'the amount field has a price period', ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Price period")) select option' ).allTextContents() ).includes( 'per year' ) );

		// Currency card on the General tab.
		await page.click( '.rfb-side-tab[data-tab="general"]' );
		const general = page.locator( '.rfb-general' );
		check( 'general', 'the General tab has the currency card with a live preview', ( await general.locator( 'h2:text-is("Currency")' ).count() ) === 1 && ( await general.locator( '.rfb-money-preview' ).textContent() ).startsWith( '$1,234,567.89' ), await general.locator( '.rfb-money-preview' ).textContent().catch( () => '' ) );
		await general.locator( '.rfb-field:has(.rfb-mini:text-is("Currency symbol")) input' ).fill( '€' );
		await general.locator( '.rfb-field:has(.rfb-mini:text-is("Symbol position")) select' ).selectOption( 'after' );
		await general.locator( '.rfb-field:has(.rfb-mini:text-is("Thousands separator")) select' ).selectOption( '.' );
		check( 'general', 'choosing a point for thousands moves the decimal mark to a comma', ( await general.locator( '.rfb-field:has(.rfb-mini:text-is("Decimal separator")) select' ).inputValue() ) === ',' && ( await general.locator( '.rfb-money-preview' ).textContent() ).startsWith( '1.234.567,89 €' ), await general.locator( '.rfb-money-preview' ).textContent() );
		await page.screenshot( { path: join( SHOTS, 'general.png' ) } );

		// Save, then read back.
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		const after = seed( 'definition', { collection: 'orders' } );
		check( 'save', 'currency format and the dropped fields are saved', after.settings.currency_symbol === '€' && after.settings.currency_position === 'after' && after.settings.thousands_sep === '.' && after.settings.decimal_sep === ',' && after.fields[ 1 ].children[ 1 ].children.length === 2 && after.fields[ 3 ].children[ 1 ].children.some( ( f ) => f.type === 'number' ), JSON.stringify( after.settings ) );
		const reopened = await ( async () => { await page.goto( `${ BUILDER }&view=design&collection=orders` ); await page.waitForSelector( '.rfb-cv-item' ); return page.locator( '.rfb-cv-item[data-rfb-key="member"] .rfb-cc-price' ).textContent(); } )();
		check( 'save', 'reopened, prices use the saved currency', reopened.includes( '20,00 €' ), reopened );

		// Put the default format back for the public checks.
		seed( 'configure', { collection: 'orders', settings: { currency_symbol: '$', currency_position: 'before', thousands_sep: ',', decimal_sep: '.', decimals: 2 } } );
		const unl = await unlabelled( page );
		check( 'a11y', 'every control of the designer is labelled', unl.length === 0, unl.join( ',' ) );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Orders', slug: 'orders-form', content: '[refraction_form collection="orders"]' } );
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 1300 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `public ${ theme }`;
			await v.goto( formPage.url );
			await v.waitForLoadState( 'load' );
			await v.waitForSelector( '.rfb-form' );

			// accordion
			check( area, 'the accordion shows its first panel open and the second closed', ( await v.locator( '.rfb-acc-item[data-rfb-panel="p_contact"]' ).evaluate( ( e ) => e.open ) ) === true && ( await v.locator( '.rfb-acc-item[data-rfb-panel="p_extra"]' ).evaluate( ( e ) => e.open ) ) === false );
			await v.locator( '.rfb-acc-item[data-rfb-panel="p_extra"] > summary' ).click();
			await sleep( 150 );
			check( area, 'opening one panel closes the other (several open is off)', ( await v.locator( '.rfb-acc-item[data-rfb-panel="p_extra"]' ).evaluate( ( e ) => e.open ) ) === true && ( await v.locator( '.rfb-acc-item[data-rfb-panel="p_contact"]' ).evaluate( ( e ) => e.open ) ) === false );
			// tabs
			check( area, 'tabs: the tab row appears, the first tab is selected and the other panel is hidden', ( await v.locator( '.rfb-tablist' ).isVisible() ) && ( await v.locator( '.rfb-tab[aria-selected="true"]' ).count() ) === 1 && ( await v.locator( '.rfb-tabpanel[data-rfb-panel="tab_one"]' ).isVisible() ) );
			check( area, 'a tab hidden by its rule is not shown and its panel is off', ( await v.locator( '.rfb-tab[data-rfb-tab="tab_two"]' ).isHidden() ) && ( await v.locator( '.rfb-tabpanel[data-rfb-panel="tab_two"]' ).isHidden() ) );
			await v.fill( '[data-rfb-key="customer"] .rfb-input', 'vip' );
			await sleep( 200 );
			check( area, 'typing "vip" in Customer shows the second tab', await v.locator( '.rfb-tab[data-rfb-tab="tab_two"]' ).isVisible() );
			await v.locator( '.rfb-tab[data-rfb-tab="tab_two"]' ).click();
			check( area, 'clicking a tab shows its panel and hides the other', ( await v.locator( '.rfb-tabpanel[data-rfb-panel="tab_two"]' ).isVisible() ) && ( await v.locator( '.rfb-tabpanel[data-rfb-panel="tab_one"]' ).isHidden() ) );
			await v.locator( '.rfb-tab[data-rfb-tab="tab_two"]' ).press( 'ArrowLeft' );
			check( area, 'arrow keys move between tabs', ( await v.locator( '.rfb-tab[data-rfb-tab="tab_one"]' ).getAttribute( 'aria-selected' ) ) === 'true' );
			await v.fill( '[data-rfb-key="customer"] .rfb-input', 'Ann' );
			await sleep( 200 );
			check( area, 'clearing the rule hides the tab again and falls back to the first tab', ( await v.locator( '.rfb-tab[data-rfb-tab="tab_two"]' ).isHidden() ) && ( await v.locator( '.rfb-tabpanel[data-rfb-panel="tab_one"]' ).isVisible() ) );

			// amount live formatting
			const fee = v.locator( '[data-rfb-key="fee"] input[data-rfb-amount]' );
			check( area, 'the amount has the symbol and the period', ( await v.locator( '[data-rfb-key="fee"] .rfb-amount-symbol' ).textContent() ) === '$' && ( await v.locator( '[data-rfb-key="fee"] .rfb-amount-per' ).textContent() ) === '/ month' );
			await fee.click();
			await fee.pressSequentially( '1200', { delay: 30 } );
			check( area, 'typing 1200 writes 1,200', ( await fee.inputValue() ) === '1,200', await fee.inputValue() );
			await fee.fill( '' );
			await fee.pressSequentially( '350329.45', { delay: 30 } );
			check( area, 'typing 350329.45 writes 350,329.45', ( await fee.inputValue() ) === '350,329.45', await fee.inputValue() );
			await fee.pressSequentially( '678' );
			check( area, 'a third decimal is not accepted', ( await fee.inputValue() ) === '350,329.45', await fee.inputValue() );
			await fee.fill( '' );
			await fee.pressSequentially( 'ab12x3' );
			check( area, 'letters are ignored', ( await fee.inputValue() ) === '123', await fee.inputValue() );
			await fee.fill( '' );
			await fee.pressSequentially( '1234567' );
			await fee.press( 'Home' );
			await fee.press( 'Delete' );
			check( area, 'deleting a digit in the middle keeps the grouping', ( await fee.inputValue() ) === '234,567', await fee.inputValue() );
			await fee.fill( '' );
			await fee.pressSequentially( '3' );
			check( area, 'below the lowest value the field is invalid', ( await fee.evaluate( ( el ) => el.validity.valid ) ) === false && ( await fee.evaluate( ( el ) => el.validationMessage ) ).includes( '5' ), await fee.evaluate( ( el ) => el.validationMessage ) );
			await fee.fill( '' );
			await fee.pressSequentially( '2500.5' );

			// cards
			check( area, 'the default card is selected and marked', ( await v.locator( '.rfb-choice-card[data-rfb-key="trim"]' ).evaluate( ( e ) => e.classList.contains( 'is-selected' ) ) ) && ( await v.locator( '.rfb-choice-card[data-rfb-key="trim"] input[type=radio]' ).isChecked() ) );
			check( area, 'card price, period and badge are shown', ( await v.locator( '.rfb-choice-card[data-rfb-key="member"] .rfb-cc-price' ).textContent() ).replace( /\s+/g, ' ' ).trim() === '$20.00 / month' && ( await v.locator( '.rfb-choice-card[data-rfb-key="member"] .rfb-cc-badge' ).textContent() ).trim() === 'Monthly' && ( await v.locator( '.rfb-choice-card[data-rfb-key="bath"] .rfb-cc-note' ).textContent() ) === 'Price on request' );
			const lockedBefore = await v.locator( '.rfb-choice-card[data-rfb-key="member"] .rfb-cc-fields input' ).evaluateAll( ( els ) => els.map( ( e ) => e.disabled ) );
			check( area, 'the fields inside a card are shown but disabled', lockedBefore.length >= 1 && lockedBefore.every( Boolean ), JSON.stringify( lockedBefore ) );
			await v.locator( '.rfb-choice-card[data-rfb-key="member"] .rfb-cc-details > summary' ).click();
			check( area, 'the details open and show the locked value', ( await v.locator( '.rfb-choice-card[data-rfb-key="member"] .rfb-cc-fields input[type=text]' ).inputValue() ) === 'Unlimited' && ( await v.locator( '.rfb-choice-card[data-rfb-key="member"] .rfb-cc-fields' ).isVisible() ) );
			check( area, 'a repeater card shows its minimum rows without add or remove', ( await v.locator( '.rfb-choice-card[data-rfb-key="bath"] .rfb-rep-row' ).count() ) === 2 && ( await v.locator( '.rfb-choice-card[data-rfb-key="bath"] [data-rfb-add]' ).count() ) === 0 );
			await v.locator( '.rfb-choice-card[data-rfb-key="member"] .rfb-cc-main' ).click();
			check( area, 'picking another card selects it and unselects the first', ( await v.locator( '.rfb-choice-card[data-rfb-key="member"]' ).evaluate( ( e ) => e.classList.contains( 'is-selected' ) ) ) && ! ( await v.locator( '.rfb-choice-card[data-rfb-key="trim"]' ).evaluate( ( e ) => e.classList.contains( 'is-selected' ) ) ) );
			await v.screenshot( { path: join( SHOTS, `public-${ theme }.png` ), fullPage: true } );

			// required field in a closed panel is revealed on submit
			await v.locator( '[data-rfb-key="customer"] .rfb-input' ).fill( 'Ann' );
			await v.locator( '.rfb-acc-item[data-rfb-panel="p_extra"] > summary' ).click();
			await sleep( 100 );
			check( area, 'the required email sits in a closed panel now', ( await v.locator( '.rfb-acc-item[data-rfb-panel="p_contact"]' ).evaluate( ( e ) => e.open ) ) === false );
			await v.click( '.rfb-submit' );
			await sleep( 250 );
			check( area, 'submitting with it empty opens that panel instead of failing silently', ( await v.locator( '.rfb-acc-item[data-rfb-panel="p_contact"]' ).evaluate( ( e ) => e.open ) ) === true && ( await v.locator( '[data-rfb-key="mail"] .rfb-input' ).evaluate( ( el ) => el === document.activeElement ) ) );

			// a valid submit
			await v.fill( '[data-rfb-key="mail"] .rfb-input', `ann-${ theme }@example.com` );
			await v.fill( '[data-rfb-key="street"] .rfb-input', 'Main street' );
			await sleep( 3200 );
			await Promise.all( [ v.waitForLoadState( 'load' ), v.click( '.rfb-submit' ) ] );
			await sleep( 600 );
			const latest = seed( 'latest', { collection: 'orders' } ).record;
			const vals = latest ? latest.values : {};
			check( area, 'the record stores panel fields at the top level, a plain decimal amount and the picked card with its price', vals.mail === `ann-${ theme }@example.com` && vals.addr && vals.addr.street === 'Main street' && vals.fee === '2500.50' && Array.isArray( vals.service ) && vals.service.length === 1 && vals.service[ 0 ].key === 'member' && vals.service[ 0 ].price === 20 && vals.service[ 0 ].per === 'month' && ! ( 'more' in vals ) && ! ( 'p_contact' in vals ) && ! ( 'member_visits' in vals ), JSON.stringify( vals ).slice( 0, 400 ) );
			check( area, 'the thank-you message is shown', ( await v.locator( 'body' ).textContent() ).includes( 'Thanks.' ) );
			await vctx.close();
		}

		// hostile post: a card that does not exist, a price in the post, locked values
		const hostile = await ctx.request.post( `${ BASE }/wp-admin/admin-post.php`, { form: { action: 'refraction_fb_submit', collection: 'orders', 'values[customer]': 'Eve', 'values[mail]': 'eve@example.com', 'values[service]': 'ghost', 'values[member_visits]': 'free' }, failOnStatusCode: false } );
		check( 'security', 'a posted card that does not exist is refused without a server error', hostile.status() < 500, String( hostile.status() ) );

		// ------------------------------------------------------------ the admin
		await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-builder&view=records&collection=orders` );
		const rows = await page.locator( '.rfb-table tbody tr' ).count();
		check( 'admin', 'records are listed, the amount cell shows the symbol, thousands and period', rows >= 1 && ( await page.locator( '.rfb-table .rfb-money' ).first().textContent() ).replace( /\s+/g, ' ' ).includes( '$2,500.50 / month' ), await page.locator( '.rfb-table .rfb-money' ).first().textContent().catch( () => 'none' ) );
		await page.locator( '.rfb-table tbody tr a.rfb-user-name' ).first().click();
		await page.waitForSelector( '#rfb-record-form' );
		check( 'admin', 'the edit form shows the picked card selected and the amount formatted', ( await page.locator( '#rfb-record-form .rfb-choice-card[data-rfb-key="member"] > .rfb-cc-main input' ).isChecked() ) && ( await page.locator( '#rfb-record-form input[data-rfb-amount]' ).inputValue() ) === '2,500.50' );
		await page.locator( '#rfb-record-form .rfb-choice-card[data-rfb-key="bath"] .rfb-cc-main' ).click();
		await Promise.all( [ page.waitForLoadState( 'load' ), page.click( '#rfb-record-form button[type=submit]' ) ] );
		const edited = seed( 'latest', { collection: 'orders' } ).record;
		check( 'admin', 'changing the card in the admin saves the new pick', edited && edited.values.service.length === 1 && edited.values.service[ 0 ].key === 'bath' && edited.values.service[ 0 ].price === null, JSON.stringify( edited && edited.values.service ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form builder part 6 checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
