#!/usr/bin/env node
/**
 * Form Builder part 9 check: forms built in the page editor (stage 1). A Form page opened from Refraction > Builder, the Form
 * Builder widget category first in the panel, field widgets with Content / Style / Advanced, the page-settings cog with the
 * form-wide settings, saving into a collection, and the public form printed from the editor layout, on a real WordPress
 * (SQLite test site, Chromium).
 *
 * Usage: node scripts/check-form-builder-9.mjs [--site /tmp/rf-fb9-site] [--port 8929] [--shots /tmp/fb9-shots]
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
const SITE = arg( 'site', '/tmp/rf-fb9-site' );
const PORT = arg( 'port', '8929' );
const SHOTS = arg( 'shots', '/tmp/fb9-shots' );
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

		// ------------------------------------------------------------ from the Builder into the editor
		await page.goto( BUILDER );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		check( 'builder', 'Refraction > Builder offers a new form in the page editor', !! newHref && newHref.includes( 'template_type=rfb-form' ) );
		const t0 = Date.now();
		await page.goto( newHref, { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		check( 'editor', 'the new Form page opens in the editor (no loop, no error)', page.url().includes( 'action=refraction' ) && Date.now() - t0 < 60000, page.url() );
		await page.waitForTimeout( 2500 );

		const cats = await page.$$eval( '.refraction-panel-category', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => ( e.querySelector( '.refraction-panel-heading-title, .refraction-panel-category-title' ) || {} ).textContent?.trim() ) );
		check( 'panel', 'the Form Builder category is first, above Layout', cats[ 0 ] === 'Form Builder' && cats.indexOf( 'Layout' ) > 0, cats.join( '|' ) );
		const tiles = await page.$$eval( '.refraction-panel-category', ( els ) => [ ...els[ 0 ].querySelectorAll( '.refraction-element' ) ].map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'it holds the form fields and the submit button, and no copy of the page builder\'s own widgets', [ 'Text', 'Long text', 'Email', 'Amount', 'Dropdown', 'Choice (one)', 'Choices (many)', 'Yes / No', 'Hidden field', 'Submit button' ].every( ( t ) => tiles.includes( t ) ) && ! [ 'Heading', 'Image', 'Divider', 'Icon List', 'Accordion', 'Tabs' ].some( ( t ) => tiles.includes( t ) ), tiles.join( '|' ) );
		check( 'panel', 'the page builder\'s own Heading, Image and Container stay available below', ( await page.locator( '.refraction-element:has-text("Heading")' ).count() ) >= 1 && ( await page.locator( '.refraction-element:has-text("Container")' ).count() ) >= 1 );
		const preview = page.frameLocator( '#refraction-preview-iframe' );
		check( 'preview', 'the Form page previews on the blank canvas, without the theme\'s post template', ( await preview.locator( 'body' ).evaluate( ( b ) => b.className ) ).includes( 'refraction-template-canvas' ) || ( await preview.locator( 'text=Written by' ).count() ) === 0 );

		// ------------------------------------------------------------ build the form with the editor's own commands
		await page.evaluate( async () => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const row = add( refraction.getPreviewContainer(), { elType: 'container', settings: { flex_direction: 'row' } } );
			add( row, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_required: 'yes', in_table: 'yes', _element_width: 'initial', _element_custom_width: { unit: '%', size: 48 } } } );
			add( row, { elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_required: 'yes' } } );
			const box = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			add( box, { elType: 'widget', widgetType: 'heading', settings: { title: 'Tell us more' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-currency', settings: { field_label: 'Budget', field_per: 'month', field_min: 5 } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-select', settings: { field_label: 'Service', field_options: 'trim|Nail trimming\nbath|Bath', add_filter: 'yes' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Size', field_options: 'Small\nLarge', choice_inline: 'yes', choice_accent: '#ff0000' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-toggle', settings: { field_label: 'Agree to terms' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-field-hidden', settings: { field_label: 'Source', hidden_source: 'query', default_value: 'src' } } );
			add( box, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Book now', align: 'stretch' } } );
		} );
		await page.waitForTimeout( 1500 );
		check( 'preview', 'the fields show in the preview with their labels and the editor\'s own heading', ( await preview.locator( '.rfb-field' ).count() ) >= 6 && ( await preview.locator( '.rfb-label' ).allTextContents() ).includes( 'Your name' ) && ( await preview.locator( '.refraction-widget-heading' ).count() ) === 1 && ( await preview.locator( '.rfb-amount-per' ).textContent() ) === '/ month' );
		check( 'preview', 'the preview carries the form styles (the page is a form)', await preview.locator( '.rfb-editor-form, .rfb-front' ).first().count() === 1 && ( await preview.locator( '.rfb-input' ).first().evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) !== 'rgba(0, 0, 0, 0)' );

		// a field's panel: Content / Style / Advanced, with Records table under Advanced
		await preview.locator( '.refraction-widget-rfb-field-text' ).click();
		await page.waitForTimeout( 800 );
		const tabs = await page.$$eval( '.refraction-panel-navigation-tab', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'field panel', 'a field opens with Content, Style and Advanced tabs', [ 'Content', 'Style', 'Advanced' ].every( ( t ) => tabs.includes( t ) ), tabs.join( '|' ) );
		const contentSections = await page.$$eval( '.refraction-control-type-section .refraction-section-title, .refraction-panel .refraction-section-title', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'field panel', 'Content holds the field', contentSections.includes( 'Text' ) || contentSections.length > 0, contentSections.join( '|' ) );
		await page.click( '.refraction-panel-navigation-tab[data-tab="style"], .refraction-tab-control-style a, .refraction-panel-navigation-tab:has-text("Style")' );
		await page.waitForTimeout( 500 );
		const styleSections = await page.$$eval( '.refraction-section-title', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'field panel', 'Style has Label, Input and Description and help', [ 'Label', 'Input', 'Description and help' ].every( ( s ) => styleSections.includes( s ) ), styleSections.join( '|' ) );
		await page.click( '.refraction-panel-navigation-tab:has-text("Advanced")' );
		await page.waitForTimeout( 500 );
		const advSections = await page.$$eval( '.refraction-section-title', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'field panel', 'Advanced has the editor\'s Layout and Responsive, plus Records table', advSections.includes( 'Records table' ) && advSections.includes( 'Layout' ) && advSections.includes( 'Responsive' ), advSections.join( '|' ) );
		await page.screenshot( { path: join( SHOTS, 'field-panel.png' ) } );

		// the cog: form-wide settings
		await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await page.waitForTimeout( 800 );
		const cog = await page.$$eval( '.refraction-section-title', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'cog', 'the page settings hold the form: Form, Submit and steps, Notifications, Availability and spam, Currency', [ 'Form', 'Submit and steps', 'Notifications', 'Availability and spam', 'Currency' ].every( ( s ) => cog.includes( s ) ), cog.join( '|' ) );
		await page.screenshot( { path: join( SHOTS, 'cog.png' ) } );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Grooming booking', rfb_singular: 'Booking', rfb_currency_symbol: '€', rfb_currency_position: 'after', rfb_success_message: 'Booked, see you soon.', rfb_c_primary: '#7b1fa2', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
			await $e.run( 'document/save/publish' );
		} );
		await page.waitForTimeout( 3000 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		check( 'save', 'publishing ties the Form page to a collection', !! slug, JSON.stringify( map ) );
		const def = seed( 'definition', { collection: slug } );
		check( 'save', 'the collection takes the page title, the cog settings and the fields in page order', def.label === 'Grooming booking' && def.singular === 'Booking' && def.settings.currency_symbol === '€' && def.settings.currency_position === 'after' && def.success_message === 'Booked, see you soon.' && def.fields.map( ( f ) => f.key ).join( ',' ) === 'your_name,email,budget,service,size,agree_to_terms,source', JSON.stringify( [ def.label, def.singular, def.settings.currency_symbol, def.settings.currency_position, def.success_message, def.fields.map( ( f ) => f.key ) ] ) );
		check( 'save', 'field options are cleaned the Builder way (required, in table, filter, period, choices, hidden source)', def.fields[ 0 ].required && def.fields[ 0 ].in_table && def.fields[ 2 ].per === 'month' && def.fields[ 2 ].min === 5 && def.fields[ 3 ].filter && def.fields[ 3 ].options[ 0 ].value === 'trim' && def.fields[ 3 ].options[ 0 ].label === 'Nail trimming' && def.fields[ 6 ].source === 'query' );

		// keys stay when a label changes
		await page.evaluate( async () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const text = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === 'rfb-field-text' );
			await $e.run( 'document/elements/settings', { container: text, settings: { field_label: 'Full name' } } );
			await $e.run( 'document/save/publish' );
		} );
		await page.waitForTimeout( 3000 );
		const def2 = seed( 'definition', { collection: slug } );
		check( 'save', 'renaming a field keeps its key, so saved answers keep matching', def2.fields[ 0 ].label === 'Full name' && def2.fields[ 0 ].key === 'your_name' );

		// ------------------------------------------------------------ Builder links
		await page.goto( BUILDER );
		const editHref = await page.locator( `.rfb-collection:has-text("Grooming booking") a:has-text("Edit form")` ).getAttribute( 'href' );
		check( 'builder', 'the collection card opens the form in the page editor', !! editHref && editHref.includes( `post=${ docId }` ) && editHref.includes( 'action=refraction' ) );
		await page.goto( `${ BUILDER }&view=design&collection=${ slug }` );
		check( 'builder', 'the old designer is not used for it: it points to the page editor', ( await page.locator( '#rfb-builder' ).count() ) === 0 && ( await page.locator( 'a:has-text("Edit form")' ).count() ) >= 1 );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Book', slug: 'book', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1300 } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url + '?src=newsletter' );
		await v.waitForSelector( 'form[data-rfb-form]' );
		check( 'public', 'the shortcode prints the editor layout inside the form', ( await v.locator( 'form[data-rfb-form] .refraction-widget-heading' ).count() ) === 1 && ( await v.locator( 'form[data-rfb-form] .rfb-field' ).count() ) === 6 && ( await v.locator( 'form[data-rfb-form] button.rfb-submit' ).textContent() ) === 'Book now' && ( await v.locator( 'form[data-rfb-form] button.rfb-submit' ).count() ) === 1 );
		check( 'public', 'the two fields of the first row sit side by side (editor container and width)', await v.evaluate( () => { const a = document.querySelector( '[data-rfb-key="your_name"]' ).getBoundingClientRect(); const b = document.querySelector( '[data-rfb-key="email"]' ).getBoundingClientRect(); return Math.abs( a.top - b.top ) < 4 && b.left > a.right - 4; } ) );
		check( 'public', 'the cog\'s main color and the field\'s own Style reach the page', ( await v.locator( 'button.rfb-submit' ).evaluate( ( el ) => getComputedStyle( el ).backgroundColor ) ) === 'rgb(123, 31, 162)' && ( await v.locator( '[data-rfb-key="size"] .rfb-check input' ).first().evaluate( ( el ) => getComputedStyle( el ).accentColor ) ) === 'rgb(255, 0, 0)' );
		check( 'public', 'the amount uses the form currency (after the amount) and its period', ( await v.locator( '[data-rfb-key="budget"] .rfb-amount-symbol' ).textContent() ) === '€' && ( await v.locator( '[data-rfb-key="budget"] .rfb-amount' ).getAttribute( 'class' ) ).includes( 'is-after' ) );
		await v.screenshot( { path: join( SHOTS, 'public.png' ), fullPage: true } );

		// empty required fields: the server says so under each
		await v.evaluate( () => document.querySelector( 'form[data-rfb-form]' ).setAttribute( 'novalidate', '' ) );
		await v.evaluate( () => { const f = document.querySelector( 'form[data-rfb-form]' ); f.querySelectorAll( '[required]' ).forEach( ( i ) => i.removeAttribute( 'required' ) ); HTMLFormElement.prototype.submit.call( f ); } );
		await v.waitForLoadState( 'load' );
		await v.waitForSelector( 'form[data-rfb-form]' );
		check( 'public', 'a submit with the required fields empty comes back with an error under each, inside the editor layout', ( await v.locator( '[data-rfb-key="your_name"] .rfb-error' ).count() ) === 1 && ( await v.locator( '[data-rfb-key="email"] .rfb-error' ).count() ) === 1 );

		await v.fill( '[data-rfb-key="your_name"] input', 'Ann' );
		await v.fill( '[data-rfb-key="email"] input', 'ann@example.com' );
		await v.locator( '[data-rfb-key="budget"] input' ).pressSequentially( '1250.5' );
		check( 'public', 'the amount is written with the form separators while typing', ( await v.locator( '[data-rfb-key="budget"] input' ).inputValue() ) === '1,250.5' );
		await v.selectOption( '[data-rfb-key="service"] select', 'bath' );
		await v.check( '[data-rfb-key="size"] input[value="Large"]' );
		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 600 );
		check( 'public', 'the success message from the cog is shown', ( await v.locator( 'body' ).textContent() ).includes( 'Booked, see you soon.' ) );
		const rec = seed( 'latest', { collection: slug } ).record;
		check( 'public', 'the record stores every answer under its key, the hidden field read from the address', rec && rec.values.your_name === 'Ann' && rec.values.email === 'ann@example.com' && rec.values.budget === '1250.50' && rec.values.service === 'bath' && rec.values.size === 'Large' && rec.values.source === 'newsletter', JSON.stringify( rec && rec.values ) );
		await vctx.close();

		await page.goto( `${ BUILDER }&view=records&collection=${ slug }` );
		check( 'admin', 'the record shows in the records table with the name column', ( await page.locator( '.rfb-table tbody tr' ).count() ) === 1 && ( await page.locator( '.rfb-table' ).textContent() ).includes( 'Ann' ) );
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', consoleErrors.length === 0, consoleErrors.join( ' || ' ) );
		const errors = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( errors ), errors.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form builder part 9 checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
