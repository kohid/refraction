#!/usr/bin/env node
/**
 * Form Builder part 11 check: choice cards built in the page editor (stage 3). A Choice cards widget whose cards are
 * editor containers holding any widgets (heading, badge, price, icon list, a locked field), saved as a choice set with
 * each card's name, price and period, and picked on the site, where the record keeps the picked card.
 *
 * Usage: node scripts/check-form-builder-11.mjs [--site /tmp/rf-fb11-site] [--port 8940] [--shots /tmp/fb11-shots]
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
const SITE = arg( 'site', '/tmp/rf-fb11-site' );
const PORT = arg( 'port', '8940' );
const SHOTS = arg( 'shots', '/tmp/fb11-shots' );
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
		check( 'admin', 'the Builder has no old designer links', ( await page.locator( 'a[href*="view=new"], a[href*="view=design"]' ).count() ) === 0 );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		await page.goto( newHref, { timeout: 120000 } );
		const ready = () => page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await ready();
		await page.waitForTimeout( 2500 );
		const tiles = await page.$$eval( '.refraction-panel-category', ( els ) => [ ...els[ 0 ].querySelectorAll( '.refraction-element' ) ].map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'Choice cards, Badge and Price are in the Form Builder category (shown first)', [ 'Choice cards', 'Badge', 'Price' ].every( ( t ) => tiles.includes( t ) ), tiles.join( '|' ) );

		const built = await page.evaluate( async () => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const tick = () => new Promise( ( r ) => setTimeout( r, 400 ) );
			const box = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_key: 'your_name', field_required: 'yes' } } );
			const set = add( box, { elType: 'widget', widgetType: 'rfb-field-choice_set', settings: { field_label: 'Plan', field_key: 'plan', field_required: 'yes', default_card: 2, card_columns: 2 } } );
			await tick();
			const cards = refraction.getContainer( set.id );
			const items = cards.repeaters.cards.children;
			[ { card_title: 'Basic', card_price: 1200, card_per: 'month' }, { card_title: 'Pro', card_price: 50, card_per: 'year' } ].forEach( ( settings, index ) => $e.run( 'document/elements/settings', { container: items[ index ], settings, options: { external: true } } ) );
			const one = cards.children[ 0 ];
			const two = cards.children[ 1 ];
			add( one, { elType: 'widget', widgetType: 'heading', settings: { title: 'Basic plan' } } );
			add( one, { elType: 'widget', widgetType: 'rfb-badge', settings: { text: 'Monthly' } } );
			add( one, { elType: 'widget', widgetType: 'rfb-price', settings: {} } );
			add( one, { elType: 'widget', widgetType: 'icon-list', settings: {} } );
			add( one, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Note', field_key: 'note' } } );
			add( two, { elType: 'widget', widgetType: 'heading', settings: { title: 'Pro plan' } } );
			add( two, { elType: 'widget', widgetType: 'rfb-price', settings: {} } );
			add( box, { elType: 'widget', widgetType: 'rfb-price', settings: { use_card: '', amount: 9.5, per: 'custom', per_label: 'setup' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Choose' } } );
			// "Add item" adds a card box, removing it removes the box.
			$e.run( 'document/repeater/insert', { container: cards, name: 'cards', model: { card_title: 'Extra' } } );
			await tick();
			const added = refraction.getContainer( set.id ).children.length;
			$e.run( 'document/repeater/remove', { container: cards, name: 'cards', index: 2 } );
			await tick();
			const removed = refraction.getContainer( set.id ).children.length;
			await $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { post_title: 'Plans', rfb_min_seconds: 0, rfb_hourly_limit: 0, rfb_success_message: 'Plan saved.' } } );
			await $e.run( 'document/save/publish' );
			await tick();

			return { added, removed, cards: refraction.getContainer( set.id ).children.length, inOne: refraction.getContainer( set.id ).children[ 0 ].children.length };
		} );
		check( 'editor', 'Choice cards starts with two card boxes and widgets can be dropped into a card', built.cards === 2 && built.inOne === 5, JSON.stringify( built ) );
		check( 'editor', 'adding a card adds a box and removing it removes the box', built.added === 3 && built.removed === 2, JSON.stringify( built ) );
		await page.waitForTimeout( 2500 );
		let preview = page.frameLocator( '#refraction-preview-iframe' );
		const cardBoxes = await preview.locator( '.rfb-choice-card' ).count();
		const inside = await preview.locator( '.rfb-choice-card > .e-con' ).count();
		check( 'editor', 'the preview shows each card with its own container beside the pick mark', cardBoxes === 2 && inside === 2, `${ cardBoxes } ${ inside }` );
		const layout = await preview.locator( '.rfb-choice-card' ).first().evaluate( ( el ) => {
			const c = el.querySelector( ':scope > .e-con' ).getBoundingClientRect();
			const r = el.getBoundingClientRect();
			return { card: r.width, inner: c.width };
		} );
		check( 'editor', 'the card container takes the width of the card beside the mark', layout.inner > layout.card * 0.6, JSON.stringify( layout ) );

		// After a reload the Price widget inside a card shows the card's own price in the editor too.
		await page.reload();
		await ready();
		await page.waitForTimeout( 3000 );
		preview = page.frameLocator( '#refraction-preview-iframe' );
		const editorPrices = await preview.locator( '.rfb-choice-card .rfb-price' ).allTextContents();
		check( 'editor', 'a Price in a card shows the card\'s price and period in the editor', editorPrices.map( ( t ) => t.replace( /\s+/g, ' ' ).trim() ).join( '|' ) === '$1,200.00 / month|$50.00 / year', editorPrices.join( '|' ) );
		await page.screenshot( { path: join( SHOTS, 'editor.png' ) } );

		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const shape = def.fields.map( ( f ) => f.type + ':' + f.key + ( f.children.length ? '[' + f.children.map( ( c ) => c.label + '(' + c.children.map( ( x ) => x.key ).join( ',' ) + ')' ).join( ',' ) + ']' : '' ) ).join( ' ' );
		check( 'save', 'the collection keeps a choice set whose cards are named after the card settings, with the fields in them', shape === 'text:your_name choice_set:plan[Basic(note),Pro()]', shape );
		const plan = def.fields.find( ( f ) => f.key === 'plan' );
		check( 'save', 'each card keeps its price and period, and the second card is picked by default', plan && plan.children[ 0 ].card_price === 1200 && plan.children[ 0 ].per === 'month' && plan.children[ 1 ].card_price === 50 && plan.children[ 1 ].per === 'year' && plan.default === plan.children[ 1 ].key && plan.required, JSON.stringify( plan ).slice( 0, 600 ) );

		// ------------------------------------------------------------ the site
		const formPage = seed( 'page', { title: 'Pick a plan', slug: 'pick-plan', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1400 } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const prices = ( await v.locator( '.rfb-price' ).allTextContents() ).map( ( t ) => t.replace( /\s+/g, ' ' ).trim() );
		check( 'site', 'the cards print their widgets: headings, badge, icon list and the card prices; the free Price its own amount', ( await v.locator( '.rfb-choice-card' ).count() ) === 2 && ( await v.locator( '.rfb-choice-card' ).first().textContent() ).includes( 'Basic plan' ) && ( await v.locator( '.rfb-choice-card .rfb-badge-pill' ).textContent() ) === 'Monthly' && ( await v.locator( '.rfb-choice-card .refraction-icon-list-items' ).count() ) === 1 && prices.join( '|' ) === '$1,200.00 / month|$50.00 / year|$9.50 / setup', prices.join( '|' ) );
		check( 'site', 'the default card (Pro) is picked at first', await v.locator( '.rfb-choice-card' ).nth( 1 ).evaluate( ( el ) => el.classList.contains( 'is-selected' ) && el.querySelector( '.rfb-cc-pick input' ).checked ) );
		check( 'site', 'a field inside a card is shown but locked', await v.locator( '.rfb-choice-card [data-rfb-key="note"] input' ).isDisabled() );
		check( 'site', 'the pick input is named after the set', ( await v.locator( '.rfb-choice-card .rfb-cc-pick input' ).first().getAttribute( 'name' ) ) === 'values[plan]' );
		await v.locator( '.rfb-choice-card' ).first().click( { position: { x: 30, y: 30 } } );
		await sleep( 200 );
		check( 'site', 'clicking a card picks it', await v.locator( '.rfb-choice-card' ).first().evaluate( ( el ) => el.classList.contains( 'is-selected' ) && el.querySelector( '.rfb-cc-pick input' ).checked ) && ! ( await v.locator( '.rfb-choice-card' ).nth( 1 ).evaluate( ( el ) => el.classList.contains( 'is-selected' ) ) ) );
		check( 'site', 'every input on the form has a label', ( await unlabelled( v ) ).length === 0, ( await unlabelled( v ) ).join( ' ' ) );
		await v.fill( '[data-rfb-key="your_name"] input', 'Ann' );
		await v.screenshot( { path: join( SHOTS, 'site.png' ), fullPage: true } );
		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 800 );
		check( 'site', 'the success message shows', ( await v.locator( 'body' ).textContent() ).includes( 'Plan saved.' ) );
		const rec = seed( 'latest', { collection: slug } ).record;
		const val = rec ? rec.values : {};
		check( 'site', 'the record keeps the picked card with its name, price and period, and nothing typed in a card', val.your_name === 'Ann' && Array.isArray( val.plan ) && val.plan.length === 1 && val.plan[ 0 ].title === 'Basic' && val.plan[ 0 ].price === 1200 && val.plan[ 0 ].per === 'month' && ! ( 'note' in val ), JSON.stringify( val ).slice( 0, 500 ) );
		await vctx.close();
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form builder part 11 checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
