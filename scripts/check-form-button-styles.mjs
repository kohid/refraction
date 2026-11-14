#!/usr/bin/env node
/**
 * Form button styles check (0.99.0, SQLite test site, Chromium): Submit, the Repeater's Add and Remove buttons and the
 * Steps' Back and Next buttons have the Button widget's Content, Style and Advanced settings: type, size, ID, position,
 * Back / Next texts; typography, Normal / Hover colors, gradient background, border, radius, padding, transition; in the
 * panel, the editor preview and on the site, where they win over the form's own look. Earlier Repeater colors still apply.
 *
 * Usage: node scripts/check-form-button-styles.mjs [--site /tmp/rf-fbs-site] [--port 8937] [--shots /tmp/form-button-styles-shots]
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
const SITE = arg( 'site', '/tmp/rf-fbs-site' );
const PORT = arg( 'port', '8937' );
const SHOTS = arg( 'shots', '/tmp/form-button-styles-shots' );
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
			const a = { box: ( n ) => ( { unit: 'px', top: String( n ), right: String( n ), bottom: String( n ), left: String( n ), isLinked: true } ) };
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const tick = () => new Promise( ( r ) => setTimeout( r, 400 ) );
			const inner = async ( widget ) => { await tick(); return refraction.getContainer( widget.id ).children[ 0 ]; };
			const root = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			const steps = add( root, { elType: 'widget', widgetType: 'rfb-steps', settings: {
				nav_align: 'space-between',
				back_text: 'Previous', back_button_type: 'warning', back_size: 'xs',
				next_text: 'Continue', next_css_id: 'go-next', next_size: 'lg',
				next_background_background: 'classic', next_background_color: '#123456', next_color_normal: '#fafafa',
				next_radius: a.box( 0 ), next_typography_typography: 'custom', next_typography_font_weight: '800',
				next_color_hover: '#ffd400', next_transition: { unit: 'ms', size: 600 },
			} } );
			const one = steps.children[ 0 ];
			const two = steps.children[ 1 ];
			add( one, { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Your name', field_key: 'name' } } );
			const rep = add( one, { elType: 'widget', widgetType: 'rfb-field-repeater', settings: {
				field_label: 'Guests', field_key: 'guests', min_rows: 1, max_rows: 3, add_label: 'Add guest',
				add_button_type: 'success', add_size: 'xs', add_css_id: 'add-guest', add_align: 'justify', add_color: '#7c3aed',
				remove_background_background: 'classic', remove_background_color: '#ffe4e6', remove_color_normal: '#be123c', remove_radius: a.box( 4 ),
			} } );
			add( await inner( rep ), { elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Guest name', field_key: 'guest' } } );
			add( two, { elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_key: 'email' } } );
			add( two, { elType: 'widget', widgetType: 'rfb-submit', settings: {
				text: 'Send booking', css_id: 'send-booking', size: 'lg',
				color_normal: '#ffffff', background_background: 'gradient', background_color: '#ff0000', background_color_b: '#0000ff',
				border_normal_border: 'solid', border_normal_width: a.box( 3 ), border_normal_color: '#00ff00',
				radius: a.box( 20 ), padding: a.box( 18 ),
				text_shadow_text_shadow_type: 'yes', text_shadow_text_shadow: { horizontal: 1, vertical: 1, blur: 0, color: 'rgba(0,0,0,1)' },
			} } );
			await tick();
			await $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { post_title: 'Button styles', rfb_min_seconds: 0, rfb_hourly_limit: 0 } } );
		} );
		await page.waitForTimeout( 2500 );
		const preview = page.frameLocator( '#refraction-preview-iframe' );

		// ------------------------------------------------------------ editor preview
		const pSubmit = preview.locator( '.rfb-submit' );
		check( 'editor', 'the preview shows the Submit button with its gradient, border, radius, size and ID', ( await pSubmit.count() ) === 1 && ( await pSubmit.evaluate( ( b ) => { const s = getComputedStyle( b ); return s.backgroundImage.includes( 'linear-gradient' ) && s.borderTopColor === 'rgb(0, 255, 0)' && s.borderTopWidth === '3px' && s.borderTopLeftRadius === '20px' && b.id === 'send-booking' && b.classList.contains( 'rfb-size-lg' ); } ) ) );
		const pAdd = preview.locator( '[data-rfb-add]' );
		const pa = await pAdd.evaluate( ( b ) => { const s = getComputedStyle( b ); return { cls: b.className, color: s.color, w: Math.round( b.getBoundingClientRect().width ), pw: ( ( p ) => Math.round( p.clientWidth - parseFloat( getComputedStyle( p ).paddingLeft ) - parseFloat( getComputedStyle( p ).paddingRight ) ) )( b.parentElement ), id: b.id }; } );
		check( 'editor', 'the preview shows the Add button as Success, Extra Small, stretched, with the earlier text color and its ID', pa.cls.includes( 'rfb-type-success' ) && pa.cls.includes( 'rfb-size-xs' ) && pa.color === 'rgb(124, 58, 237)' && Math.abs( pa.w - pa.pw ) < 2 && pa.id === 'add-guest', JSON.stringify( pa ) );

		// ------------------------------------------------------------ panel: Content, Style and Advanced
		const open = ( type ) => page.evaluate( ( t ) => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const el = find( refraction.getPreviewContainer() ).find( ( c ) => c.model.get( 'widgetType' ) === t );
			$e.run( 'panel/editor/open', { model: el.model, view: el.view } );
		}, type );
		const visible = ( names ) => page.evaluate( ( list ) => list.filter( ( n ) => { const e = document.querySelector( '.refraction-control-' + n ); return e && e.offsetParent; } ), names );
		const tab = async ( name ) => { await page.locator( `.refraction-tab-control-${ name } a, .refraction-tab-control-${ name }` ).first().click(); await page.waitForTimeout( 500 ); };
		const sectionOpen = async ( name ) => { const s = page.locator( `.refraction-control-${ name }` ); if ( await s.count() && ! ( await s.evaluate( ( e ) => e.classList.contains( 'e-open' ) ) ) ) { await s.click(); await page.waitForTimeout( 400 ); } };

		await open( 'rfb-submit' );
		await page.waitForTimeout( 1000 );
		const content = await visible( [ 'text', 'align', 'button_type', 'size', 'icon', 'css_id' ] );
		check( 'panel', 'Submit > Content: text, alignment, type, size, icon and Button ID', content.length === 6, content.join( '|' ) );
		await tab( 'style' );
		await sectionOpen( 'section_button_style' );
		const style = await visible( [ 'typography_typography', 'text_shadow_text_shadow_type', 'color_normal', 'background_background', 'shadow_normal_box_shadow_type', 'border_normal_border', 'radius', 'padding' ] );
		const legacy = await visible( [ 'bg_normal', 'bg_hover' ] );
		check( 'panel', 'Submit > Style: typography, text shadow, text color, background, shadow, border, radius, padding; earlier colors hidden while empty', style.length === 8 && legacy.length === 0, style.join( '|' ) + ' / ' + legacy.join( '|' ) );
		await page.locator( '.refraction-control-button_hover' ).first().click();
		await page.waitForTimeout( 400 );
		const hover = await visible( [ 'color_hover', 'background_hover_background', 'hover_border_color', 'shadow_hover_box_shadow_type', 'transition', 'hover_animation' ] );
		check( 'panel', 'Submit > Style > Hover: text color, background, border color, shadow, transition duration, hover animation', hover.length === 6, hover.join( '|' ) );
		await page.screenshot( { path: join( SHOTS, 'panel-submit-style.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );
		await tab( 'advanced' );
		check( 'panel', 'Submit > Advanced: margin, padding and the CSS ID / classes', ( await visible( [ '_margin', '_padding' ] ) ).length >= 1 || ( await page.locator( '.refraction-control-_section_style' ).count() ) > 0 );

		for ( const [ type, sections ] of [ [ 'rfb-field-repeater', [ 'section_style_add', 'section_style_remove' ] ], [ 'rfb-steps', [ 'section_style_back', 'section_style_next' ] ] ] ) {
			await open( type );
			await page.waitForTimeout( 1000 );
			await tab( 'style' );
			const names = await page.evaluate( ( list ) => list.filter( ( n ) => document.querySelector( '.refraction-control-' + n ) ), sections );
			const prefix = sections[ 1 ].replace( 'section_style_', '' );
			await sectionOpen( sections[ 1 ] );
			const fields = await visible( [ `${ prefix }_color_normal`, `${ prefix }_background_background`, `${ prefix }_border_normal_border`, `${ prefix }_radius`, `${ prefix }_padding` ] );
			await tab( 'advanced' );
			const advanced = await page.locator( '.refraction-control-_section_style, .refraction-control-section_advanced' ).count();
			check( 'panel', `${ type } > Style has ${ sections.join( ' and ' ) } with the Button widget's settings, and an Advanced tab`, names.length === 2 && fields.length === 5 && advanced > 0, names.join( '|' ) + ' / ' + fields.join( '|' ) + ' / ' + advanced );
		}
		await open( 'rfb-steps' );
		await page.waitForTimeout( 800 );
		await tab( 'content' );
		await sectionOpen( 'section_step_buttons' );
		const cat = async ( label ) => { await page.locator( '.rf-section-groups__tab:visible', { hasText: label } ).first().click(); await page.waitForTimeout( 400 ); };
		const nav = await visible( [ 'nav_align' ] );
		await cat( 'Next' );
		nav.push( ...await visible( [ 'next_text' ] ) );
		await cat( 'Back' );
		nav.push( ...await visible( [ 'back_text', 'back_button_type', 'back_size', 'back_icon', 'back_css_id' ] ) );
		check( 'panel', 'Steps > Back and Next buttons: General (position), Back and Next tabs with text, type, size, icon, Button ID', nav.length === 7, nav.join( '|' ) );
		await page.screenshot( { path: join( SHOTS, 'panel-steps-content.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );

		await page.evaluate( () => $e.run( 'document/save/publish' ) );
		await page.waitForTimeout( 3500 );
		const docId = await page.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );

		// ------------------------------------------------------------ the site
		const formPage = seed( 'page', { title: 'Button styles', slug: 'button-styles', content: `[refraction_form collection="${ slug }"]` } );
		const vctx = await browser.newContext( { viewport: { width: 1000, height: 1200 } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( formPage.url );
		await v.waitForSelector( 'form[data-rfb-form]' );
		const css = ( loc, props ) => loc.evaluate( ( b, p ) => Object.fromEntries( p.map( ( k ) => [ k, getComputedStyle( b )[ k ] ] ) ), props );

		const next = v.locator( 'button.rfb-next' );
		const n = await css( next, [ 'backgroundColor', 'color', 'fontWeight', 'borderTopLeftRadius', 'transitionDuration', 'paddingTop', 'fontSize' ] );
		check( 'next', 'Next reads "Continue", has its ID, the dark background, light text, weight 800, square corners, 0.6s transition and the Large size', ( await next.locator( '.rfb-btn-text' ).textContent() ) === 'Continue' && ( await next.getAttribute( 'id' ) ) === 'go-next' && n.backgroundColor === 'rgb(18, 52, 86)' && n.color === 'rgb(250, 250, 250)' && n.fontWeight === '800' && n.borderTopLeftRadius === '0px' && n.transitionDuration.startsWith( '0.6s' ) && n.paddingTop === '20px' && n.fontSize === '18px', JSON.stringify( n ) );
		await next.hover();
		await v.waitForTimeout( 900 );
		check( 'next', 'hovering Next turns its text yellow', ( await css( next, [ 'color' ] ) ).color === 'rgb(255, 212, 0)' );
		await v.mouse.move( 0, 0 );

		const add = v.locator( '[data-rfb-add]' );
		const ad = await css( add, [ 'backgroundColor', 'color', 'paddingTop' ] );
		check( 'repeater', 'Add guest: Success green, Extra Small, its ID, stretched, and the earlier purple text color still applies', ( await add.getAttribute( 'id' ) ) === 'add-guest' && ad.backgroundColor === 'rgb(22, 131, 74)' && ad.color === 'rgb(124, 58, 237)' && ad.paddingTop === '10px' && await add.evaluate( ( b ) => { const p = b.parentElement; const cs = getComputedStyle( p ); return Math.abs( b.getBoundingClientRect().width - ( p.clientWidth - parseFloat( cs.paddingLeft ) - parseFloat( cs.paddingRight ) ) ) < 2; } ), JSON.stringify( ad ) );
		const remove = v.locator( '.rfb-rep-remove' ).first();
		const rm = await css( remove, [ 'backgroundColor', 'color', 'borderTopLeftRadius' ] );
		check( 'repeater', 'Remove: pink background, red cross, 4px corners', rm.backgroundColor === 'rgb(255, 228, 230)' && rm.color === 'rgb(190, 18, 60)' && rm.borderTopLeftRadius === '4px', JSON.stringify( rm ) );

		await v.fill( '[data-rfb-key="name"] input', 'Ann' );
		await next.click();
		await v.waitForTimeout( 300 );
		const back = v.locator( 'button.rfb-back' );
		const bk = await css( back, [ 'backgroundColor', 'color', 'paddingTop' ] );
		check( 'back', 'Back reads "Previous", Warning amber, Extra Small', ( await back.locator( '.rfb-btn-text' ).textContent() ) === 'Previous' && bk.backgroundColor === 'rgb(184, 106, 0)' && bk.color === 'rgb(255, 255, 255)' && bk.paddingTop === '10px', JSON.stringify( bk ) );
		const submit = v.locator( 'button.rfb-submit' );
		const sb = await css( submit, [ 'backgroundImage', 'color', 'borderTopColor', 'borderTopWidth', 'borderTopLeftRadius', 'paddingTop', 'textShadow' ] );
		check( 'submit', 'Submit: its ID, red-to-blue gradient, white text with a shadow, green 3px border, 20px corners, 18px padding over the Large size', ( await submit.getAttribute( 'id' ) ) === 'send-booking' && sb.backgroundImage.includes( 'linear-gradient' ) && sb.color === 'rgb(255, 255, 255)' && sb.borderTopColor === 'rgb(0, 255, 0)' && sb.borderTopWidth === '3px' && sb.borderTopLeftRadius === '20px' && sb.paddingTop === '18px' && sb.textShadow.includes( 'rgb(0, 0, 0)' ), JSON.stringify( sb ) );
		await v.screenshot( { path: join( SHOTS, 'step-2.png' ), clip: await v.locator( 'form[data-rfb-form]' ).boundingBox() } );
		await back.click();
		await v.waitForTimeout( 300 );
		await v.screenshot( { path: join( SHOTS, 'step-1.png' ), clip: await v.locator( 'form[data-rfb-form]' ).boundingBox() } );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form button style checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
