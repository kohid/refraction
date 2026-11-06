#!/usr/bin/env node
/**
 * Solar icons and duotone (SQLite test site, Chromium):
 * - On the site a Solar icon is inline SVG; a duotone icon's second layer takes the widget's second color and opacity
 *   (bold duotone: fill; line duotone: stroke); a Font Awesome icon already on a page still shows.
 * - In the editor the preview draws Solar icons; the icon library offers the six Solar styles (drawn as SVG) and no
 *   Font Awesome tab; picking an icon sets it; Settings > Advanced can show Font Awesome again.
 *
 * Usage: node scripts/check-solar-icons.mjs [--site /tmp/rf-solar-site] [--port 8980] [--shots /tmp/solar-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-solar-site' );
const PORT = arg( 'port', '8980' );
const SHOTS = arg( 'shots', '/tmp/solar-shots' );
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
		const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Solar', '--porcelain' ] ).trim();
		const data = [ { id: 'c001', elType: 'container', isInner: false, settings: {}, elements: [
			{ id: 'i001', elType: 'widget', widgetType: 'icon', settings: { selected_icon: { value: 'rf-solar rf-solar-home-smile', library: 'solar-bold-duotone' }, primary_color: '#1A73E8', rf_icon_duo_color: '#FF7A00', rf_icon_duo_opacity: { size: 0.8, unit: 'px' }, size: { size: 64, unit: 'px' } }, elements: [] },
			{ id: 'b001', elType: 'widget', widgetType: 'button', settings: { text: 'Home', selected_icon: { value: 'rf-solar rf-solar-home', library: 'solar-line-duotone' }, rf_icon_duo_color: '#00A86B' }, elements: [] },
			{ id: 'f001', elType: 'widget', widgetType: 'icon', settings: { selected_icon: { value: 'fas fa-star', library: 'fa-solid' } }, elements: [] },
		] } ];
		for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
			wp( [ 'post', 'meta', 'update', id, k, v ] );
		}

		// ------------------------------------------------------------ on the site
		const v = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
		watch( v );
		await v.goto( `${ BASE }/?page_id=${ id }` );
		const site = await v.evaluate( () => {
			const cs = ( el, prop ) => ( el ? getComputedStyle( el )[ prop ] : null );
			const icon = document.querySelector( '[data-id="i001"] .rf-solar svg' );
			const duo = icon?.querySelector( '.rf-duo-f' );
			const main = icon && [ ...icon.querySelectorAll( 'path' ) ].find( ( p ) => ! p.closest( '.rf-duo-f' ) && ! p.classList.contains( 'rf-duo-f' ) );
			const line = document.querySelector( '[data-id="b001"] .rf-solar svg .rf-duo-s' );
			const fa = document.querySelector( '[data-id="f001"] .refraction-icon i, [data-id="f001"] .refraction-icon svg' );
			return { svg: !! icon, size: icon ? Math.round( icon.getBoundingClientRect().width ) : 0, duoFill: cs( duo, 'fill' ), duoOpacity: cs( duo, 'opacity' ), mainFill: cs( main, 'fill' ), lineStroke: cs( line, 'stroke' ), lineFill: cs( line, 'fill' ), fa: !! fa && fa.getBoundingClientRect().width > 0 };
		} );
		check( 'site', 'a Solar icon is inline SVG at the widget\'s size', site.svg && 64 === site.size, JSON.stringify( site ) );
		check( 'duotone', 'bold duotone: the second layer takes the second color and opacity, the first the icon color', 'rgb(255, 122, 0)' === site.duoFill && '0.8' === site.duoOpacity && 'rgb(26, 115, 232)' === site.mainFill, JSON.stringify( site ) );
		check( 'duotone', 'line duotone: the second layer\'s line takes the second color (and stays unfilled)', 'rgb(0, 168, 107)' === site.lineStroke && 'none' === site.lineFill, JSON.stringify( site ) );
		check( 'site', 'a Font Awesome icon already on the page still shows', site.fa, JSON.stringify( site ) );
		await v.screenshot( { path: join( SHOTS, 'site.png' ), clip: { x: 0, y: 0, width: 1200, height: 600 } } );
		await v.context().close();

		// ------------------------------------------------------------ in the editor
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000 } ), p.click( '#wp-submit' ) ] );
		const openEditor = async () => {
			await p.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
			await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
			await sleep( 3000 );
		};
		await openEditor();
		const frame = p.frame( { name: 'refraction-preview-iframe' } );
		const preview = await frame.evaluate( () => ( { solar: !! document.querySelector( '[data-id="i001"] .rf-solar svg .rf-duo-f' ), fa: !! document.querySelector( '[data-id="f001"] .refraction-icon i, [data-id="f001"] .refraction-icon svg' ) } ) );
		check( 'editor', 'the preview draws the Solar icon (and the Font Awesome one)', preview.solar && preview.fa, JSON.stringify( preview ) );

		await frame.click( '[data-id="i001"]' );
		await sleep( 1200 );
		await p.locator( '.refraction-control-selected_icon .refraction-control-media__preview, .refraction-control-selected_icon .refraction-control-icons--inline__library-button' ).first().click();
		await p.waitForSelector( '#refraction-icons-manager-modal #refraction-icons-manager__tab-links', { timeout: 30000 } );
		await sleep( 2500 );
		const tabs = await p.evaluate( () => [ ...document.querySelectorAll( '#refraction-icons-manager__tab-links .refraction-icons-manager__tab-link' ) ].map( ( t ) => t.textContent.trim() ) );
		check( 'library', 'the icon library offers the six Solar styles and no Font Awesome', 6 === tabs.filter( ( t ) => /^Solar - /.test( t ) ).length && ! tabs.some( ( t ) => /Font Awesome/.test( t ) ), tabs.join( ' | ' ) );
		await p.locator( '.refraction-icons-manager__tab-link', { hasText: 'Solar - Linear' } ).click();
		await sleep( 2500 );
		const drawn = await p.evaluate( () => [ ...document.querySelectorAll( '.refraction-icons-manager__tab__item__icon.rf-solar svg' ) ].length );
		check( 'library', 'its icons are drawn as SVG', drawn > 20, String( drawn ) );
		await p.fill( '#refraction-icons-manager__search input', 'rocket' );
		await sleep( 1200 );
		await p.screenshot( { path: join( SHOTS, 'library.png' ) } );
		await p.locator( '.refraction-icons-manager__tab__item', { hasText: /^Rocket$/ } ).first().click();
		await p.locator( '#refraction-icons-manager-modal .dialog-button', { hasText: 'Insert' } ).click();
		await sleep( 1500 );
		const picked = await p.evaluate( () => refraction.getContainer( 'i001' ).settings.get( 'selected_icon' ) );
		const pickedDrawn = await frame.evaluate( () => !! document.querySelector( '[data-id="i001"] .rf-solar svg' ) );
		check( 'library', 'picking an icon sets it (Solar Linear "rocket") and the preview draws it', 'solar-linear' === picked.library && /rf-solar-rocket$/.test( picked.value ) && pickedDrawn, JSON.stringify( picked ) );

		// Font Awesome shown again from Settings.
		wp( [ 'option', 'update', 'refraction_icons_font_awesome', 'yes' ] );
		await openEditor();
		const withFa = await p.evaluate( () => refraction.config.icons.libraries.filter( ( l ) => /^fa-/.test( l.name ) && ! l.hidden ).length );
		check( 'settings', 'Settings > Advanced shows Font Awesome in the icon library again', 3 === withFa, String( withFa ) );
		wp( [ 'option', 'delete', 'refraction_icons_font_awesome' ] );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall solar icon checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
