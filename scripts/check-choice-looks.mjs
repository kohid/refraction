#!/usr/bin/env node
/**
 * Choice looks check (0.92.0, SQLite test site, Chromium): Choice fields built in the page editor with each Look
 * (segmented bar with a badge, full-width segmented, image cards, icon tiles, pill switch, cards with text, checkbox
 * cards); the panel shows Look, Choice details, the Style tab's Normal / Hover / Selected options and the Selection mark
 * (hide, orientation and offsets, checked on the page); on the public form each look is
 * drawn, picking works by click and by keyboard with a visible focus ring, the Style tab's colors apply, nothing is wider
 * than a phone, and the answers are stored.
 *
 * Usage: node scripts/check-choice-looks.mjs [--site /tmp/rf-cl-site] [--port 8931] [--shots /tmp/choice-looks-shots]
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
const SITE = arg( 'site', '/tmp/rf-cl-site' );
const PORT = arg( 'port', '8931' );
const SHOTS = arg( 'shots', '/tmp/choice-looks-shots' );
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

const ph = ( name ) => ( { value: `rf-ph rf-ph-${ name }`, library: 'phosphor-duotone' } );

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
		const img = ( name ) => wp( [ 'media', 'import', join( HERE, '../tests/elements-regression/assets/test-images', name ), '--porcelain' ] ).trim();
		const pics = { car: Number( img( 'image1.jpg' ) ), bus: Number( img( 'image2.jpg' ) ) };
		const page = await login( browser );
		watch( page, 'editor' );

		await page.goto( BUILDER );
		const newHref = await page.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' );
		await page.goto( newHref, { timeout: 120000 } );
		await page.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await page.waitForTimeout( 2000 );

		await page.evaluate( ( icons ) => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = refraction.getPreviewContainer();
			const light = add( root, { elType: 'container', settings: { flex_gap: { unit: 'px', size: 28, column: '28', row: '28' } } } );
			add( light, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Billing', field_key: 'billing', field_options: 'weekly|Weekly\nmonthly|Monthly', default_value: 'weekly', choice_look: 'segmented', option_extras: [ { _id: 'b1', choice: 'Monthly', badge: 'SAVE 28%' } ] } } );
			add( light, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Framework', field_key: 'framework', field_options: 'HTML\nReact\nVue', default_value: 'HTML', choice_look: 'segmented', choice_full: 'yes' } } );
			add( light, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Tour', field_key: 'tour', field_options: 'Car Tour\nBus Tour\nCity Tour', default_value: 'Car Tour', choice_look: 'images', option_extras: [ { _id: 't1', choice: 'Car Tour', image: { id: icons.pics.car, url: '' } }, { _id: 't2', choice: 'Bus Tour', image: { id: icons.pics.bus, url: '' } }, { _id: 't3', choice: 'City Tour', icon: icons.city } ] } } );
			add( light, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Vehicle', field_key: 'vehicle', field_options: 'Bicycle\nMotorbike\nCar', field_required: 'yes', choice_look: 'tiles', choice_columns: 3, ch_mark_h: 'start', ch_mark_v: 'end', ch_mark_y: { unit: 'px', size: 6 }, option_extras: [ { _id: 'v1', choice: 'Bicycle', icon: icons.bicycle }, { _id: 'v2', choice: 'Motorbike', icon: icons.motorcycle }, { _id: 'v3', choice: 'Car', icon: icons.car } ] } } );
			add( light, { elType: 'widget', widgetType: 'rfb-field-checkbox', settings: { field_label: 'Extras', field_key: 'extras', field_options: 'seat|Child seat\nbags|Extra luggage', choice_look: 'cards', choice_columns: 2, ch_mark_hide: 'yes', option_extras: [ { _id: 'e1', choice: 'seat', text: 'Free on every journey' }, { _id: 'e2', choice: 'Extra luggage', text: 'Skis, golf clubs, big cases' } ] } } );
			const dark = add( root, { elType: 'container', settings: { background_background: 'classic', background_color: '#141414', padding: { unit: 'px', top: '28', right: '28', bottom: '28', left: '28', isLinked: true }, flex_gap: { unit: 'px', size: 28, column: '28', row: '28' } } } );
			add( dark, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Option', field_key: 'option', field_options: 'Option 1\nOption 2', default_value: 'Option 1', choice_look: 'pill', label_color: '#f2f2f2', ch_track_border: '#f5b301', ch_bg_on: '#f5b301', ch_color_on: '#1a1a1a', ch_color_normal: '#9a9a9a', ch_color_hover: '#ffffff' } } );
			add( dark, { elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Plan', field_key: 'plan', field_options: 'free|Free\npro|Pro\nteam|Team', default_value: 'pro', choice_look: 'cards', ch_mark_h: 'end', label_color: '#f2f2f2', ch_bg_normal: '#1e211f', ch_border_normal: '#2c312d', ch_color_normal: '#ededed', ch_bg_hover: '#252a26', ch_bg_on: '#2a3420', ch_border_on: '#9ccc4f', ch_color_on: '#f4ffe6', ch_mark_on: '#c5f26a', ch_text_color: '#9ba39a', option_extras: [ { _id: 'p1', choice: 'Free', text: 'Up to 3 projects' }, { _id: 'p2', choice: 'Pro', text: 'Unlimited projects' }, { _id: 'p3', choice: 'Team', text: 'Collaborative workspace' } ] } } );
			add( root, { elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send' } } );
		}, { bicycle: ph( 'bicycle' ), motorcycle: ph( 'motorcycle' ), car: ph( 'car-profile' ), city: ph( 'buildings' ), pics } );
		await page.waitForTimeout( 1500 );

		const preview = page.frameLocator( '#refraction-preview-iframe' );
		check( 'preview', 'the editor preview draws every look', ( await preview.locator( '.rfb-look-segmented' ).count() ) === 2 && ( await preview.locator( '.rfb-look-tiles' ).count() ) === 1 && ( await preview.locator( '.rfb-look-pill' ).count() ) === 1 && ( await preview.locator( '.rfb-look-cards' ).count() ) === 2 && ( await preview.locator( '.rfb-look-images img' ).count() ) === 2 );
		check( 'preview', 'tile icons show in the preview', ( await preview.locator( '.rfb-look-tiles .rfb-opt-icon:has(svg)' ).count() ) === 3 );

		// the panel: Look and Choice details on Content, the look's states on Style
		await preview.locator( '.refraction-widget-rfb-field-radio' ).nth( 5 ).click();
		await page.waitForTimeout( 800 );
		const lookOptions = await page.$$eval( 'select[data-setting="choice_look"] option', ( els ) => els.map( ( e ) => e.value ) );
		check( 'panel', 'Content has the Look list with the six looks', lookOptions.join( ',' ) === 'list,segmented,pill,tiles,cards,images', lookOptions.join( ',' ) );
		check( 'panel', 'Content has Choice details', ( await page.locator( '.refraction-control-option_extras:visible' ).count() ) === 1 );
		await page.click( '.refraction-panel-navigation-tab:has-text("Style")' );
		await page.waitForTimeout( 500 );
		await page.locator( '.refraction-control-section_style_choices' ).click();
		await page.waitForTimeout( 500 );
		const tabs = await page.$$eval( '.refraction-control-ch_states .refraction-control-type-tab', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'Style > Choices has Normal, Hover and Selected for the look', tabs.join( '|' ) === 'Normal|Hover|Selected', tabs.join( '|' ) );
		const groups = await page.$$eval( '.rf-section-groups__tab', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'panel', 'Style > Choices is grouped into General, Options, Selection mark and Badge', groups.join( '|' ) === 'General|Options|Selection mark|Badge', groups.join( '|' ) );
		await page.locator( '.rf-section-groups__tab:has-text("Options")' ).click();
		await page.waitForTimeout( 300 );
		check( 'panel', 'the plain list\'s own controls are hidden for a look', ( await page.locator( '.refraction-control-choice_inline:visible' ).count() ) === 0 && ( await page.locator( '.refraction-control-ch_radius:visible' ).count() ) === 1 );
		await page.locator( '.rf-section-groups__tab:has-text("Selection mark")' ).click();
		await page.waitForTimeout( 300 );
		check( 'panel', 'Selection mark has hide, Horizontal and Vertical Orientation with offsets, and size', ( await Promise.all( [ 'ch_mark_hide', 'ch_mark_h', 'ch_mark_x', 'ch_mark_v', 'ch_mark_y', 'ch_mark_size' ].map( ( n ) => page.locator( `.refraction-control-${ n }:visible` ).count() ) ) ).every( ( c ) => c === 1 ) && ( await page.locator( '.refraction-control-ch_mark_h:visible .refraction-choices label' ).count() ) === 2 );
		await page.screenshot( { path: join( SHOTS, 'panel-style.png' ) } );

		// No minimum time before sending: the check submits at once.
		await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await page.waitForTimeout( 800 );
		await page.evaluate( async () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			await $e.run( 'document/elements/settings', { container, settings: { post_title: 'Choice looks', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
		} );
		await page.evaluate( () => $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const field = ( key ) => def.fields.find( ( f ) => f.key === key ) || {};
		check( 'save', 'the collection keeps each look and the choice details keyed by value', field( 'billing' ).choice_look === 'segmented' && field( 'billing' ).option_extras.monthly.badge === 'SAVE 28%' && field( 'vehicle' ).choice_columns === 3 && field( 'vehicle' ).option_extras.Car.icon.value === 'rf-ph rf-ph-car-profile' && field( 'extras' ).option_extras.bags.text === 'Skis, golf clubs, big cases' && field( 'framework' ).choice_full === true, JSON.stringify( def.fields.map( ( f ) => [ f.key, f.choice_look, f.option_extras ] ) ) );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Choices', slug: 'choices', content: `[refraction_form collection="${ slug }"]` } );
		// Reduced motion: the looks turn their transitions off, so colors read at once.
		const vctx = await browser.newContext( { viewport: { width: 1200, height: 1400 }, reducedMotion: 'reduce' } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const f = ( key ) => v.locator( `[data-rfb-key="${ key }"]` );
		const bg = ( loc ) => loc.evaluate( ( el ) => getComputedStyle( el ).backgroundColor );

		check( 'public', 'every field carries its look', ( await f( 'billing' ).getAttribute( 'class' ) ).includes( 'rfb-look-segmented' ) && ( await f( 'framework' ).getAttribute( 'class' ) ).includes( 'rfb-choice-full' ) && ( await f( 'vehicle' ).getAttribute( 'class' ) ).includes( 'rfb-look-tiles' ) && ( await f( 'option' ).getAttribute( 'class' ) ).includes( 'rfb-look-pill' ) && ( await f( 'plan' ).getAttribute( 'class' ) ).includes( 'rfb-look-cards' ) );

		// segmented: the picked option is raised on the bar; the badge sits on its top edge
		const weekly = f( 'billing' ).locator( '.rfb-check' ).nth( 0 );
		const monthly = f( 'billing' ).locator( '.rfb-check' ).nth( 1 );
		check( 'segmented', 'the picked option is white on the grey bar, the other is clear', ( await bg( weekly ) ) === 'rgb(255, 255, 255)' && ( await bg( monthly ) ) === 'rgba(0, 0, 0, 0)' && ( await bg( f( 'billing' ).locator( '.rfb-choice-options' ) ) ) !== 'rgba(0, 0, 0, 0)' );
		const badge = await f( 'billing' ).locator( '.rfb-opt-badge' ).boundingBox();
		const monthlyBox = await monthly.boundingBox();
		check( 'segmented', 'the badge sits on the top edge of its option', !! badge && badge.y < monthlyBox.y && badge.y + badge.height > monthlyBox.y && badge.x + badge.width <= monthlyBox.x + monthlyBox.width + 2, JSON.stringify( [ badge, monthlyBox ] ) );
		await monthly.click();
		check( 'segmented', 'clicking an option picks it', ( await f( 'billing' ).locator( 'input[value="monthly"]' ).isChecked() ) && ( await bg( monthly ) ) === 'rgb(255, 255, 255)' && ( await bg( weekly ) ) === 'rgba(0, 0, 0, 0)' );
		const fw = await f( 'framework' ).locator( '.rfb-choice-options' ).boundingBox();
		const fwField = await f( 'framework' ).boundingBox();
		check( 'segmented', 'Full width fills the field, the options share it equally', Math.abs( fw.width - fwField.width ) < 3 && await f( 'framework' ).evaluate( ( el ) => { const w = [ ...el.querySelectorAll( '.rfb-check' ) ].map( ( c ) => c.getBoundingClientRect().width ); return Math.max( ...w ) - Math.min( ...w ) < 2; } ) );

		// image cards: the picture on top, the name with its radio below, a check badge on the picked picture
		const tour = ( i ) => f( 'tour' ).locator( '.rfb-check' ).nth( i );
		check( 'images', 'two cards show their picture, the third falls back on its icon', ( await f( 'tour' ).locator( '.rfb-opt-media img' ).count() ) === 2 && ( await tour( 2 ).locator( '.rfb-opt-icon:has(svg)' ).count() ) === 1 && await tour( 0 ).evaluate( ( el ) => el.querySelector( '.rfb-opt-media' ).getBoundingClientRect().bottom <= el.querySelector( '.rfb-opt-label' ).getBoundingClientRect().top + 1 ) );
		const badgeOn = await tour( 0 ).evaluate( ( el ) => { const b = getComputedStyle( el, '::before' ); const r = el.getBoundingClientRect(); return { o: b.opacity, top: parseFloat( b.top ), right: parseFloat( b.right ), w: r.width }; } );
		check( 'images', 'the picked card shows the check badge at the top right of its picture; the others do not', badgeOn.o === '1' && badgeOn.top === 18 && badgeOn.right === 18 && ( await tour( 1 ).evaluate( ( el ) => getComputedStyle( el, '::before' ).opacity ) ) === '0', JSON.stringify( badgeOn ) );
		check( 'images', 'a small radio sits beside each name and fills on the picked card', ( await tour( 0 ).evaluate( ( el ) => getComputedStyle( el.querySelector( '.rfb-opt-label' ), '::before' ).borderTopStyle ) ) === 'solid' && ( await tour( 0 ).evaluate( ( el ) => getComputedStyle( el.querySelector( '.rfb-opt-label' ), '::before' ).backgroundColor ) ) !== ( await tour( 1 ).evaluate( ( el ) => getComputedStyle( el.querySelector( '.rfb-opt-label' ), '::before' ).backgroundColor ) ) );
		await tour( 1 ).click();
		check( 'images', 'clicking a picture picks its choice', ( await f( 'tour' ).locator( 'input[value="Bus Tour"]' ).isChecked() ) && ( await tour( 1 ).evaluate( ( el ) => getComputedStyle( el, '::before' ).opacity ) ) === '1' );

		// tiles: icon above the name, dot and accent on the picked one; keyboard picks and shows a focus ring
		const tile = ( i ) => f( 'vehicle' ).locator( '.rfb-check' ).nth( i );
		const iconAbove = await tile( 0 ).evaluate( ( el ) => el.querySelector( '.rfb-opt-icon' ).getBoundingClientRect().bottom <= el.querySelector( '.rfb-opt-label' ).getBoundingClientRect().top + 1 );
		check( 'tiles', 'each tile shows its icon above its name, three to a row', iconAbove && ( await f( 'vehicle' ).locator( '.rfb-opt-icon:has(svg)' ).count() ) === 3 && await f( 'vehicle' ).evaluate( ( el ) => { const t = [ ...el.querySelectorAll( '.rfb-check' ) ].map( ( c ) => Math.round( c.getBoundingClientRect().top ) ); return new Set( t ).size === 1; } ) );
		await tile( 0 ).click();
		await v.keyboard.press( 'ArrowRight' );
		const dot = await tile( 1 ).evaluate( ( el ) => getComputedStyle( el, '::before' ).opacity );
		const ring = await tile( 1 ).evaluate( ( el ) => getComputedStyle( el ).outlineStyle );
		check( 'tiles', 'the arrow key moves the pick; the picked tile has its dot and a focus ring', ( await f( 'vehicle' ).locator( 'input[value="Motorbike"]' ).isChecked() ) && dot === '1' && ring === 'solid', `${ dot } ${ ring }` );
		check( 'tiles', 'the picked tile takes the accent color, the others do not show a dot', ( await tile( 1 ).evaluate( ( el ) => getComputedStyle( el ).color ) ) !== ( await tile( 2 ).evaluate( ( el ) => getComputedStyle( el ).color ) ) && ( await tile( 2 ).evaluate( ( el ) => getComputedStyle( el, '::before' ).opacity ) ) === '0' );
		const dotAt = await tile( 1 ).evaluate( ( el ) => { const b = getComputedStyle( el, '::before' ); return [ b.left, b.bottom, b.top ].join( ' ' ); } );
		check( 'mark', 'Horizontal Left and Vertical Bottom with a 6px offset put the tile dot in the bottom left corner', dotAt.startsWith( '10px 6px' ), dotAt );
		check( 'mark', 'Hide the mark: the checkbox cards drop their box and their row closes up', ( await f( 'extras' ).locator( '.rfb-check' ).first().evaluate( ( el ) => getComputedStyle( el, '::before' ).display ) ) === 'none' && ( await f( 'extras' ).locator( '.rfb-check' ).first().evaluate( ( el ) => getComputedStyle( el ).gridTemplateAreas ) ).includes( '"label icon"' ) );
		check( 'mark', 'Horizontal Right moves the card radio to the right end of the row', ( await f( 'plan' ).locator( '.rfb-check' ).first().evaluate( ( el ) => getComputedStyle( el ).gridTemplateAreas ) ).startsWith( '"icon label mark"' ) && await f( 'plan' ).locator( '.rfb-check' ).first().evaluate( ( el ) => el.querySelector( '.rfb-opt-label' ).getBoundingClientRect().left - el.getBoundingClientRect().left < 40 ) );
		await v.screenshot( { path: join( SHOTS, 'tiles-focus.png' ), clip: await f( 'vehicle' ).boundingBox() } );

		// pill: the Style tab's colors
		check( 'pill', 'the picked option is filled with the Style tab\'s color, the bar has its border', ( await bg( f( 'option' ).locator( '.rfb-check' ).nth( 0 ) ) ) === 'rgb(245, 179, 1)' && ( await f( 'option' ).locator( '.rfb-choice-options' ).evaluate( ( el ) => getComputedStyle( el ).borderTopColor ) ) === 'rgb(245, 179, 1)' && ( await f( 'option' ).locator( '.rfb-check' ).nth( 1 ).evaluate( ( el ) => getComputedStyle( el ).color ) ) === 'rgb(154, 154, 154)' );

		// cards: radio mark, name and line of text; the line describes the input
		const pro = f( 'plan' ).locator( '.rfb-check' ).nth( 1 );
		check( 'cards', 'each card shows its name and line of text, read out with the choice', ( await f( 'plan' ).locator( '.rfb-opt-text' ).allTextContents() ).join( '|' ) === 'Up to 3 projects|Unlimited projects|Collaborative workspace' && ( await f( 'plan' ).locator( 'input[value="pro"]' ).getAttribute( 'aria-describedby' ) ) === ( await f( 'plan' ).locator( '.rfb-opt-text' ).nth( 1 ).getAttribute( 'id' ) ) );
		check( 'cards', 'the picked card has the Style tab\'s border and background, its radio is filled', ( await pro.evaluate( ( el ) => getComputedStyle( el ).borderTopColor ) ) === 'rgb(156, 204, 79)' && ( await bg( pro ) ) === 'rgb(42, 52, 32)' && ( await pro.evaluate( ( el ) => getComputedStyle( el, '::before' ).backgroundColor ) ) === 'rgb(197, 242, 106)' );
		check( 'cards', 'checkbox cards have square marks and allow several picks', ( await f( 'extras' ).locator( '.rfb-check' ).first().evaluate( ( el ) => getComputedStyle( el, '::before' ).borderTopLeftRadius ) ) === '6px' );
		await f( 'extras' ).locator( '.rfb-check' ).nth( 0 ).click();
		await f( 'extras' ).locator( '.rfb-check' ).nth( 1 ).click();
		check( 'cards', 'both checkbox cards are picked', ( await f( 'extras' ).locator( 'input:checked' ).count() ) === 2 );
		await f( 'plan' ).locator( '.rfb-check' ).nth( 2 ).click();

		await v.screenshot( { path: join( SHOTS, 'desktop.png' ), fullPage: true } );
		await v.setViewportSize( { width: 390, height: 1400 } );
		await v.waitForTimeout( 400 );
		check( 'phone', 'nothing is wider than a phone screen', await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth ) );
		const slack = await v.evaluate( () => [ ...document.querySelectorAll( '.rfb-field' ) ].map( ( el ) => [ el.dataset.rfbKey, Math.round( el.closest( '.refraction-widget' ).getBoundingClientRect().height - el.getBoundingClientRect().height ) ] ).filter( ( [ , gap ] ) => gap > 4 ) );
		check( 'phone', 'no field leaves empty space below it (the editor container wraps on phones)', slack.length === 0, JSON.stringify( slack ) );
		check( 'phone', 'two-column cards go one under another on a phone, tiles keep three to a row', await f( 'extras' ).evaluate( ( el ) => { const c = [ ...el.querySelectorAll( '.rfb-check' ) ].map( ( x ) => x.getBoundingClientRect() ); return c[ 1 ].top > c[ 0 ].bottom - 1; } ) && await f( 'vehicle' ).evaluate( ( el ) => new Set( [ ...el.querySelectorAll( '.rfb-check' ) ].map( ( x ) => Math.round( x.getBoundingClientRect().top ) ) ).size === 1 ) );
		await v.screenshot( { path: join( SHOTS, 'phone.png' ), fullPage: true } );
		await v.setViewportSize( { width: 1200, height: 1400 } );

		await Promise.all( [ v.waitForLoadState( 'load' ), v.click( 'button.rfb-submit' ) ] );
		await sleep( 600 );
		const rec = seed( 'latest', { collection: slug } ).record;
		const vals = rec && rec.values;
		check( 'submit', 'the picks are stored under their values', vals && vals.billing === 'monthly' && vals.framework === 'HTML' && vals.vehicle === 'Motorbike' && vals.tour === 'Bus Tour' && vals.option === 'Option 1' && vals.plan === 'team' && JSON.stringify( vals.extras ) === '["seat","bags"]', JSON.stringify( vals ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall choice look checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
