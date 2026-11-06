#!/usr/bin/env node
/**
 * Site Settings scope and the floating panel (SQLite test site, Chromium):
 * - Buttons styles the Button widget only (not other buttons, such as a menu toggle); Images the Image widget only.
 * - Typography > "Use as the default": off, a Heading widget uses the Global Font; on, it follows Typography's H2.
 * - In the editor the panel floats over a full-width preview, with a shadow, and preview mode slides it away.
 *
 * Usage: node scripts/check-site-settings.mjs [--site /tmp/rf-ss-site] [--port 8930] [--shots /tmp/site-settings-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ss-site' );
const PORT = arg( 'port', '8930' );
const SHOTS = arg( 'shots', '/tmp/site-settings-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	const root = '/opt/pw-browsers';
	if ( ! existsSync( root ) ) {
		return undefined;
	}
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, sub ) ) ) {
				return join( root, d, sub );
			}
		}
	}
	return undefined;
}

function wp( args ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const php = ( code ) => wp( [ 'eval', code ] ).trim();
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => {
	try {
		await fetch( `${ BASE }/wp-login.php` );
		return true;
	} catch {
		return false;
	}
};

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );
	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) {
			await sleep( 200 );
		}
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];
	const watch = ( p ) => p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && errors.push( `${ e.message } @ ${ p.url() }` ) );

	try {
		const kit = php( 'echo Refraction\\Plugin::$instance->kits_manager->get_active_id();' );
		const setKit = ( extra ) => {
			const file = join( SITE, 'kit-extra.php' );
			writeFileSync( file, `<?php $s = get_post_meta( ${ kit }, '_refraction_page_settings', true ); $s = is_array( $s ) ? $s : []; ${ extra } update_post_meta( ${ kit }, '_refraction_page_settings', $s ); Refraction\\Plugin::$instance->files_manager->clear_cache();` );
			wp( [ 'eval-file', file ] );
		};
		setKit( `$s['button_background_background'] = 'classic'; $s['button_background_color'] = '#E00000'; $s['button_border_radius'] = [ 'unit' => 'px', 'top' => '17', 'right' => '17', 'bottom' => '17', 'left' => '17', 'isLinked' => true ]; $s['image_border_radius'] = [ 'unit' => 'px', 'top' => '24', 'right' => '24', 'bottom' => '24', 'left' => '24', 'isLinked' => true ]; $s['h2_typography_typography'] = 'custom'; $s['h2_typography_font_family'] = 'Merriweather'; $s['system_typography'] = [ [ '_id' => 'primary', 'title' => 'Primary', 'typography_typography' => 'custom', 'typography_font_family' => 'Oswald' ] ];` );

		const image = Number( php( "$f = wp_tempnam( 'x.png' ); file_put_contents( $f, base64_decode( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' ) ); $id = media_handle_sideload( [ 'name' => 'dot.png', 'tmp_name' => $f ], 0 ); echo (int) $id;" ) );
		const imageUrl = php( `echo wp_get_attachment_url( ${ image } );` );
		const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Scope', '--porcelain' ] ).trim();
		const data = [ { id: 'c001', elType: 'container', isInner: false, settings: {}, elements: [
			{ id: 'b001', elType: 'widget', widgetType: 'button', settings: { text: 'Book now' }, elements: [] },
			{ id: 'x001', elType: 'widget', widgetType: 'html', settings: { html: `<button class="menu-toggle" type="button">Menu</button><input type="submit" value="Go"><img class="plain" src="${ imageUrl }" width="40" height="40" alt="">` }, elements: [] },
			{ id: 'i001', elType: 'widget', widgetType: 'image', settings: { image: { id: image, url: imageUrl }, image_size: 'full' }, elements: [] },
			{ id: 'h001', elType: 'widget', widgetType: 'heading', settings: { title: 'A heading', header_size: 'h2' }, elements: [] },
		] } ];
		for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
			wp( [ 'post', 'meta', 'update', id, k, v ] );
		}
		const url = `${ BASE }/?page_id=${ id }`;
		const look = async () => {
			const p = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
			watch( p );
			await p.goto( url );
			const out = await p.evaluate( () => {
				const cs = ( sel ) => getComputedStyle( document.querySelector( sel ) );
				return {
					widgetButton: cs( '[data-id="b001"] .refraction-button' ).borderTopLeftRadius,
					widgetButtonBg: cs( '[data-id="b001"] .refraction-button' ).backgroundColor,
					menuToggle: cs( '.menu-toggle' ).backgroundColor + ' ' + cs( '.menu-toggle' ).borderTopLeftRadius,
					submit: cs( '[data-id="x001"] input[type="submit"]' ).backgroundColor + ' ' + cs( '[data-id="x001"] input[type="submit"]' ).borderTopLeftRadius,
					widgetImage: cs( '[data-id="i001"] img' ).borderTopLeftRadius,
					plainImage: cs( 'img.plain' ).borderTopLeftRadius,
					heading: cs( '[data-id="h001"] .refraction-heading-title' ).fontFamily.split( ',' )[ 0 ].replace( /"/g, '' ),
				};
			} );
			await p.screenshot( { path: join( SHOTS, 'scope.png' ), fullPage: true } );
			await p.context().close();
			return out;
		};
		const off = await look();
		check( 'buttons', 'Site Settings > Buttons styles the Button widget (its corners)', '17px' === off.widgetButton, off.widgetButton );
		check( 'buttons', 'and not other buttons (a menu toggle, a submit button)', ! /224, 0, 0|17px/.test( off.menuToggle + off.submit ), JSON.stringify( off ) );
		check( 'buttons', 'and its background, as before', 'rgb(224, 0, 0)' === off.widgetButtonBg, off.widgetButtonBg );
		check( 'images', 'Site Settings > Images styles the Image widget only', '24px' === off.widgetImage && '0px' === off.plainImage, JSON.stringify( off ) );
		check( 'typography', 'switch off: a Heading widget uses the Global Font (Primary)', 'Oswald' === off.heading, off.heading );

		setKit( "$s['theme_typography_default'] = 'yes';" );
		const on = await look();
		check( 'typography', 'switch on: the Heading widget follows Typography\'s H2', 'Merriweather' === on.heading, on.heading );
		const given = JSON.parse( JSON.stringify( data ) );
		given[ 0 ].elements[ 3 ].settings = { title: 'A heading', header_size: 'h2', typography_typography: 'custom', typography_font_family: 'Lora' };
		wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( given ) ] );
		php( 'Refraction\\Plugin::$instance->files_manager->clear_cache();' );
		const own = await look();
		check( 'typography', 'a widget given its own font keeps it', 'Lora' === own.heading, own.heading );
		wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( data ) ] );

		// ------------------------------------------------------------ the floating panel
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000 } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
		await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2500 );
		const layout = await p.evaluate( () => {
			const r = ( sel ) => document.querySelector( sel ).getBoundingClientRect();
			const panel = document.querySelector( '#refraction-panel' );
			return { panel: [ Math.round( r( '#refraction-panel' ).left ), Math.round( r( '#refraction-panel' ).width ) ], preview: [ Math.round( r( '#refraction-preview' ).left ), Math.round( r( '#refraction-preview' ).width ) ], position: getComputedStyle( panel ).position, shadow: getComputedStyle( panel ).boxShadow, window: window.innerWidth, navigatorDocked: document.body.classList.contains( 'refraction-navigator-docked' ) };
		} );
		check( 'panel', 'the panel floats over the preview, with a shadow', 'absolute' === layout.position && 0 === layout.panel[ 0 ] && layout.panel[ 1 ] > 250 && 'none' !== layout.shadow, JSON.stringify( layout ) );
		check( 'panel', 'the preview takes the whole width of the window', 0 === layout.preview[ 0 ] && ( layout.navigatorDocked || layout.preview[ 1 ] === layout.window ), JSON.stringify( layout ) );
		await p.screenshot( { path: join( SHOTS, 'editor-floating-panel.png' ) } );
		await p.evaluate( () => refraction.changeEditMode( 'preview' ) );
		await sleep( 900 );
		const hidden = await p.evaluate( () => Math.round( document.querySelector( '#refraction-panel' ).getBoundingClientRect().right ) );
		check( 'panel', 'preview mode slides it away', hidden <= 0, String( hidden ) );
		await p.evaluate( () => refraction.changeEditMode( 'edit' ) );
		await sleep( 900 );
		const back = await p.evaluate( () => Math.round( document.querySelector( '#refraction-panel' ).getBoundingClientRect().left ) );
		check( 'panel', 'and back', 0 === back, String( back ) );

		// Editor Preferences > Panel > Position: beside the page.
		wp( [ 'eval', "$u = get_user_by( 'login', 'admin' ); update_user_meta( $u->ID, 'refraction_preferences', [ 'panel_position' => 'beside' ] );" ] );
		await p.reload();
		await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2500 );
		const beside = await p.evaluate( () => {
			const panel = document.querySelector( '#refraction-panel' ).getBoundingClientRect();
			const preview = document.querySelector( '#refraction-preview' ).getBoundingClientRect();
			return { panelRight: Math.round( panel.right ), previewLeft: Math.round( preview.left ), position: getComputedStyle( document.querySelector( '#refraction-panel' ) ).position };
		} );
		check( 'panel', 'set beside the page in Editor Preferences, the preview starts where the panel ends', 'relative' === beside.position && Math.abs( beside.panelRight - beside.previewLeft ) <= 1, JSON.stringify( beside ) );
		wp( [ 'eval', "$u = get_user_by( 'login', 'admin' ); delete_user_meta( $u->ID, 'refraction_preferences' );" ] );
		await ctx.close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 700 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall site settings checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
