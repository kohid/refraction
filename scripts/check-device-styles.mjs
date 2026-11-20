#!/usr/bin/env node
/**
 * A value per device for every Style and Advanced setting (0.130.0, SQLite test site, Chromium).
 *
 * Colours, backgrounds and other CSS-only settings of the Style and Advanced tabs get the device switcher like sizes:
 * Desktop, 1024, 820, 768, 480, 430, 393 and 375. Checked:
 * - on the site: a Heading's text colour, a Button's background and a Container's background set differently for
 *   desktop, 430, 393 and 375; a Form page's field label colour and input background at 430 / 375; a desktop colour
 *   over a site colour stays on the smaller screens (the site colour does not come back);
 * - in Edit Mode, at 393: the Heading's Text Color has the device switcher and the site-colour button, a colour set
 *   there shows in the preview at 393 only; Form fields (label colour), Event Details and Records Table colours and
 *   the Advanced tab's background and border colours are per device; a Form page's field colour set at 430 shows.
 *
 * Usage: node scripts/check-device-styles.mjs [--site /tmp/rf-fresh-9382] [--port 9382] [--shots DIR]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fresh-9382' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/device-style-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
};
const wp = ( args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8' } ).trim();
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

const BLUE = 'rgb(0, 0, 255)';
const RED = 'rgb(255, 0, 0)';
const GREEN = 'rgb(0, 170, 0)';
const PURPLE = 'rgb(170, 0, 170)';

function post( type, title, data, template ) {
	const id = wp( [ 'post', 'create', `--post_type=${ type }`, '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', template ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( data ) ] );
	return id;
}

const PAGE = [ {
	id: 'dc01', elType: 'container',
	settings: { background_background: 'classic', background_color: '#ffffff', background_color_phone_xs: '#ffeeee' },
	elements: [
		{ id: 'dh01', elType: 'widget', widgetType: 'heading', settings: { title: 'Per device', title_color: '#0000ff', title_color_phone_md: '#ff0000', title_color_phone_sm: '#00aa00', title_color_phone_xs: '#aa00aa' }, elements: [] },
		{ id: 'dh02', elType: 'widget', widgetType: 'heading', settings: { title: 'Desktop colour only', title_color: '#123456', text_shadow_text_shadow_type: 'yes', text_shadow_text_shadow: { horizontal: 1, vertical: 1, blur: 0, color: 'rgba(0,0,0,1)' } }, elements: [] },
		{ id: 'db01', elType: 'widget', widgetType: 'button', settings: { text: 'Book now', background_color: '#0000ff', background_color_phone_sm: '#00aa00', _border_border: 'solid', _border_width: { unit: 'px', top: '2', right: '2', bottom: '2', left: '2', isLinked: true }, _border_color: '#0000ff', _border_color_phone_md: '#ff0000' }, elements: [] },
	],
} ];

const field = ( id, type, label, key, settings = {} ) => ( { id, elType: 'widget', widgetType: `rfb-field-${ type }`, settings: { field_label: label, field_key: key, ...settings }, elements: [] } );
const FORM = [ { id: 'df00', elType: 'container', isInner: false, settings: {}, elements: [
	field( 'df01', 'text', 'Your name', 'your_name', { label_color: '#0000ff', label_color_phone_md: '#ff0000', input_bg_normal: '#ffffff', input_bg_normal_phone_xs: '#ffeeee' } ),
	field( 'df02', 'email', 'Email', 'email' ),
	{ id: 'df03', elType: 'widget', widgetType: 'rfb-submit', settings: { text: 'Send it' }, elements: [] },
] } ];

async function login( browser ) {
	const ctx = await browser.newContext( { viewport: { width: 1440, height: 1000 } } );
	const p = await ctx.newPage();
	await p.goto( `${ BASE }/wp-login.php` );
	await p.fill( '#user_login', 'admin' );
	await p.fill( '#user_pass', 'admin' );
	await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
	return { ctx, p };
}

async function openEditor( p, id ) {
	await p.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction`, { timeout: 120000 } );
	await p.waitForFunction( () => window.refraction && window.$e && refraction.documents?.getCurrent() && document.querySelector( '#refraction-preview-iframe' ), null, { timeout: 120000 } );
	await sleep( 2500 );
}

async function main() {
	mkdirSync( SHOTS, { recursive: true } );

	const pageId = post( 'page', 'Per device', PAGE, 'wp-page' );
	const formId = post( 'refraction_library', 'Per device form', FORM, 'rfb-form' );
	wp( [ 'eval', `wp_set_object_terms( ${ formId }, 'rfb-form', 'refraction_library_type' ); $d = Refraction\\Plugin::$instance->documents->get( ${ formId }, false ); ( new Refraction\\Modules\\FormBuilder\\Classes\\Editor_Forms( new Refraction\\Modules\\FormBuilder\\Classes\\Collections() ) )->sync( $d );` ] );
	const formUrl = wp( [ 'eval', `echo get_permalink( ${ formId } );` ] );

	const browser = await chromium.launch( existsSync( '/opt/pw-browsers/chromium' ) ? { executablePath: '/opt/pw-browsers/chromium', args: [ '--no-sandbox' ] } : {} );
	const errors = [];

	try {
		// -------------------------------------------------------------- site
		const site = {};

		for ( const width of [ 1200, 480, 430, 393, 375 ] ) {
			const ctx = await browser.newContext( { viewport: { width, height: 800 } } );
			const p = await ctx.newPage();
			p.on( 'pageerror', ( e ) => errors.push( e.message ) );
			await p.goto( `${ BASE }/?page_id=${ pageId }` );
			site[ width ] = await p.evaluate( () => {
				const css = ( sel, prop ) => {
					const el = document.querySelector( sel );
					return el ? getComputedStyle( el )[ prop ] : 'missing';
				};
				return {
					heading: css( '.refraction-element-dh01 .refraction-heading-title', 'color' ),
					plain: css( '.refraction-element-dh02 .refraction-heading-title', 'color' ),
					shadow: css( '.refraction-element-dh02 .refraction-heading-title', 'textShadow' ),
					button: css( '.refraction-element-db01 .refraction-button', 'backgroundColor' ),
					border: css( document.querySelector( '.refraction-element-db01 > .refraction-widget-container' ) ? '.refraction-element-db01 > .refraction-widget-container' : '.refraction-element-db01', 'borderTopColor' ),
					box: css( '.refraction-element-dc01', 'backgroundColor' ),
				};
			} );
			if ( 430 === width ) {
				await p.screenshot( { path: join( SHOTS, 'site-430.png' ) } );
			}
			await ctx.close();
		}

		check( 'site', 'Heading text colour: desktop, 430, 393 and 375 each their own', BLUE === site[ 1200 ].heading && BLUE === site[ 480 ].heading && RED === site[ 430 ].heading && GREEN === site[ 393 ].heading && PURPLE === site[ 375 ].heading, JSON.stringify( site ) );
		check( 'site', 'Button background: 393 and below their own, above it the desktop one', BLUE === site[ 430 ].button && GREEN === site[ 393 ].button && GREEN === site[ 375 ].button, JSON.stringify( site ) );
		check( 'site', 'Advanced > Border colour per device (430 and below)', BLUE === site[ 480 ].border && RED === site[ 430 ].border && RED === site[ 375 ].border, JSON.stringify( site ) );
		check( 'site', 'Container background per device (375)', 'rgb(255, 255, 255)' === site[ 393 ].box && 'rgb(255, 238, 238)' === site[ 375 ].box, JSON.stringify( site ) );
		check( 'site', 'a text shadow set on desktop stays the same on phones (shadows keep one value)', 'rgb(0, 0, 0) 1px 1px 0px' === site[ 1200 ].shadow && site[ 1200 ].shadow === site[ 375 ].shadow && site[ 1200 ].shadow === site[ 430 ].shadow, JSON.stringify( site ) );
		check( 'site', 'a desktop colour over the site colour stays on phones', 'rgb(18, 52, 86)' === site[ 1200 ].plain && 'rgb(18, 52, 86)' === site[ 375 ].plain, JSON.stringify( site ) );

		const { ctx, p } = await login( browser );
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );

		const form = {};

		for ( const width of [ 1200, 430, 375 ] ) {
			await p.setViewportSize( { width, height: 900 } );
			await p.goto( formUrl );
			await p.waitForSelector( '.refraction-element-df01' );
			form[ width ] = await p.evaluate( () => {
				const el = document.querySelector( '.refraction-element-df01' );
				const label = el.querySelector( 'label' );
				const input = el.querySelector( 'input:not([type=hidden])' );
				return { label: label && getComputedStyle( label ).color, input: input && getComputedStyle( input ).backgroundColor };
			} );
		}

		check( 'form', 'Form field label colour at 430 its own, desktop unchanged', BLUE === form[ 1200 ].label && RED === form[ 430 ].label, JSON.stringify( form ) );
		check( 'form', 'Form field input background at 375 its own', 'rgb(255, 255, 255)' === form[ 430 ].input && 'rgb(255, 238, 238)' === form[ 375 ].input, JSON.stringify( form ) );
		await p.setViewportSize( { width: 1440, height: 1000 } );

		// ------------------------------------------------------------ editor
		await openEditor( p, pageId );
		const frame = () => p.evaluate( () => getComputedStyle( document.getElementById( 'refraction-preview-iframe' ).contentDocument.querySelector( '.refraction-element-dh01 .refraction-heading-title' ) ).color );

		await p.evaluate( () => {
			const c = refraction.getContainer( 'dh01' );
			$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
			refraction.changeDeviceMode( 'phone_sm' );
		} );
		await sleep( 1500 );
		await p.click( '.refraction-tab-control-style' );
		await sleep( 800 );
		const control = await p.evaluate( () => {
			const el = document.querySelector( '.refraction-control-title_color_phone_sm' );
			return el && { shown: !! el.offsetParent, device: !! el.querySelector( '.refraction-responsive-switcher, .refraction-control-responsive-switchers' ), globe: !! el.querySelector( '.e-global__popover-toggle' ), desktopHidden: ! document.querySelector( '.refraction-control-title_color' )?.offsetParent };
		} );
		check( 'editor', 'at 393 the Heading\'s Text Color has its own control with the device switcher and the site-colour button', control && control.shown && control.device && control.globe && control.desktopHidden, JSON.stringify( control ) );
		check( 'editor', 'the preview at 393 shows the 393 colour', GREEN === await frame(), await frame() );

		await p.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'dh01' ), settings: { title_color_phone_sm: '#ff8800' } } ) );
		await sleep( 800 );
		const at393 = await frame();
		await p.evaluate( () => refraction.changeDeviceMode( 'phone_md' ) );
		await sleep( 1200 );
		const at430 = await frame();
		await p.evaluate( () => refraction.changeDeviceMode( 'desktop' ) );
		await sleep( 1200 );
		const atDesktop = await frame();
		check( 'editor', 'a colour set at 393 shows at once at 393 only (430 and desktop keep theirs)', 'rgb(255, 136, 0)' === at393 && RED === at430 && BLUE === atDesktop, JSON.stringify( { at393, at430, atDesktop } ) );
		await p.evaluate( () => refraction.changeDeviceMode( 'phone_sm' ) );
		await sleep( 1200 );
		await p.screenshot( { path: join( SHOTS, 'editor-393.png' ) } );
		await p.evaluate( () => refraction.changeDeviceMode( 'desktop' ) );

		// Controls of our own widgets get the devices too.
		const flags = await p.evaluate( async () => {
			const box = refraction.getContainer( 'dc01' );
			const out = {};
			for ( const [ type, names ] of [
				[ 'refraction-event-details', [ 'label_color', 'value_color' ] ],
				[ 'refraction-records-table', [ 'head_color', 'row_color' ] ],
				[ 'refraction-sidebar-panel', [ 'panel_color' ] ],
				[ 'heading', [ '_background_color', '_border_color' ] ],
			] ) {
				const el = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: type } } );
				$e.run( 'panel/editor/open', { model: el.model, view: el.view } );
				await new Promise( ( r ) => setTimeout( r, 800 ) );
				const controls = el.settings.controls;
				for ( const n of names ) {
					out[ `${ type }.${ n }` ] = !! ( controls[ n ] && controls[ `${ n }_phone_md` ] && controls[ `${ n }_phone_xs` ] && controls[ `${ n }_tablet` ] );
				}
				$e.run( 'document/elements/delete', { container: el } );
			}
			return out;
		} );
		check( 'editor', 'Event Details, Records Table, Sidebar Panel and Advanced-tab colours have every device', Object.values( flags ).every( Boolean ), JSON.stringify( flags ) );

		await openEditor( p, formId );
		await p.evaluate( () => {
			const c = refraction.getContainer( 'df01' );
			$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
			refraction.changeDeviceMode( 'phone_md' );
		} );
		await sleep( 1500 );
		const fieldFlags = await p.evaluate( () => {
			const controls = refraction.getContainer( 'df01' ).settings.controls;
			return [ 'label_color', 'input_bg_normal' ].every( ( n ) => controls[ `${ n }_phone_md` ] && controls[ `${ n }_phone_sm` ] && controls[ `${ n }_phone_xs` ] );
		} );
		check( 'editor', 'a Form field\'s label colour and input background have every device', fieldFlags );
		await p.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'df01' ), settings: { label_color_phone_md: '#00aa00' } } ) );
		await sleep( 900 );
		const formPreview = await p.evaluate( () => getComputedStyle( document.getElementById( 'refraction-preview-iframe' ).contentDocument.querySelector( '.refraction-element-df01 label' ) ).color );
		check( 'editor', 'on a Form page, a label colour set at 430 shows in the 430 preview', GREEN === formPreview, formPreview );
		await p.screenshot( { path: join( SHOTS, 'editor-form-430.png' ) } );

		await ctx.close();
		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall device style checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
