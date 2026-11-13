#!/usr/bin/env node
/**
 * Editor panel speed (SQLite test site, Chromium): a tab builds only the current screen size's copy of each
 * responsive control (Advanced > Layout was 8 copies of each); switching the screen size builds that size's copies,
 * which edit their own setting; a responsive control inside a popover (Typography) stays in the popover, which still
 * closes; back on desktop the desktop copies return.
 *
 * Usage: node scripts/check-panel-speed.mjs [--site /tmp/rf-panel-site] [--port 9280]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-panel-site' );
const PORT = arg( 'port', '9280' );
const SHOTS = arg( 'shots', '/tmp/panel-speed-shots' );
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

function page( title, widgets ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	const data = [ { id: `c${ id }`.slice( 0, 7 ), elType: 'container', isInner: false, settings: {}, elements: widgets } ];
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

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
	const w = ( id, type, settings ) => ( { id, elType: 'widget', widgetType: type, settings, elements: [] } );

	try {
		const p = page( 'Panel speed', [ w( 'ps00001', 'heading', { title: 'Hello' } ), w( 'ps00002', 'button', { text: 'Go' } ) ] );
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ctx.newPage();
		e.on( 'pageerror', ( x ) => errors.push( x.message ) );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );

		const names = () => e.evaluate( () => window.refraction.getPanelView().getCurrentPageView().children.toArray().map( ( v ) => v.model.get( 'name' ) ) );
		const timing = await e.evaluate( async () => {
			const c = window.refraction.getContainer( 'ps00001' );
			window.$e.run( 'document/elements/select', { container: c } );
			await new Promise( ( r ) => setTimeout( r, 1200 ) );
			const v = window.refraction.getPanelView().getCurrentPageView();
			const t = [];
			for ( let i = 0; i < 3; i++ ) {
				const t0 = performance.now();
				v.activateTab( 'advanced' );
				t.push( performance.now() - t0 );
				v.activateTab( 'content' );
			}
			v.activateTab( 'advanced' );
			return { ms: Math.round( Math.min( ...t ) ), views: v.children.length };
		} );
		let shown = await names();
		check( 'speed', 'Advanced builds only the desktop copies: under 70 views (was 184) and fast', timing.views < 70 && timing.ms < 150 && shown.includes( '_margin' ) && ! shown.includes( '_margin_tablet' ) && ! shown.includes( '_margin_mobile' ), JSON.stringify( timing ) );

		// A responsive setting changed while its section is open reaches the preview at once.
		await e.evaluate( () => window.$e.run( 'document/elements/settings', { container: window.refraction.getContainer( 'ps00001' ), settings: { _margin: { unit: 'px', top: '23', right: '0', bottom: '0', left: '0', isLinked: false } } } ) );
		await sleep( 1000 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const marginTop = await frame.evaluate( () => getComputedStyle( document.querySelector( '[data-id="ps00001"]' ) ).marginTop );
		check( 'live', 'with Advanced > Layout open, changing Margin shows in the preview at once', '23px' === marginTop, marginTop );

		await e.evaluate( () => window.refraction.changeDeviceMode( 'mobile' ) );
		await sleep( 1500 );
		shown = await names();
		const visible = await e.evaluate( () => !! document.querySelector( '.refraction-control-_margin_mobile' )?.offsetParent );
		check( 'devices', 'on the mobile screen size the mobile copies are built and shown, the desktop ones are not', shown.includes( '_margin_mobile' ) && ! shown.includes( '_margin' ) && visible, JSON.stringify( shown.filter( ( n ) => /^_margin/.test( n ) ) ) );

		const inherited = await e.evaluate( () => document.querySelector( '.refraction-control-_margin_mobile input[data-setting="top"]' )?.getAttribute( 'placeholder' ) );
		check( 'devices', 'the mobile copy shows the desktop margin (23) as its inherited placeholder, though the desktop copy is not built', '23' === inherited, inherited );

		await e.fill( '.refraction-control-_margin_mobile input[data-setting="top"]', '17' );
		await e.press( '.refraction-control-_margin_mobile input[data-setting="top"]', 'Tab' );
		await sleep( 800 );
		const saved = await e.evaluate( () => {
			const s = window.refraction.getContainer( 'ps00001' ).settings;
			return { mobile: s.get( '_margin_mobile' )?.top, desktop: s.get( '_margin' )?.top };
		} );
		check( 'devices', 'editing the mobile copy saves to the mobile setting only', '17' === String( saved.mobile ) && '17' !== String( saved.desktop ), JSON.stringify( saved ) );

		const popover = await e.evaluate( async () => {
			const v = window.refraction.getPanelView().getCurrentPageView();
			v.activateTab( 'style' );
			v.activateSection( 'section_title_style' );
			v._renderChildren();
			await new Promise( ( r ) => setTimeout( r, 400 ) );
			const pop = document.querySelector( '.refraction-control-typography_typography' )?.closest( '.refraction-controls-popover' ) || document.querySelector( '.refraction-controls-popover' );
			const inside = ( name ) => !! pop && !! pop.querySelector( '.refraction-control-' + name );
			return { fontMobile: inside( 'typography_font_size_mobile' ), fontDesktop: !! document.querySelector( '.refraction-control-typography_font_size' ), afterOutside: ! inside( 'text_stroke_text_stroke_type' ) && ! inside( 'text_shadow_text_shadow_type' ) && ! inside( 'blend_mode' ) };
		} );
		check( 'popover', 'Typography on mobile: its mobile font size is inside the popover (desktop copy not built), and the popover closes before the next controls', popover.fontMobile && ! popover.fontDesktop && popover.afterOutside, JSON.stringify( popover ) );

		await e.evaluate( () => window.refraction.changeDeviceMode( 'desktop' ) );
		await sleep( 1500 );
		const back = await e.evaluate( () => {
			const v = window.refraction.getPanelView().getCurrentPageView();
			v.activateTab( 'advanced' );
			return v.children.toArray().map( ( x ) => x.model.get( 'name' ) ).filter( ( n ) => /^_margin/.test( n ) );
		} );
		check( 'devices', 'back on desktop the desktop copies return', 'desktop' === ( await e.evaluate( () => window.refraction.channels.deviceMode.request( 'currentMode' ) ) ) && back.includes( '_margin' ) && ! back.includes( '_margin_mobile' ), JSON.stringify( back ) );
		await ctx.close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 900 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall panel speed checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
