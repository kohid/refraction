#!/usr/bin/env node
/**
 * Image Box and Icon Box fixes (SQLite test site, Chromium): a linked title keeps the title's font size and color
 * against a site link style (Site Settings > Typography > Link, 14px blue); Content Padding; and in the editor the image
 * keeps its width (100%) after the title and description change, as on the page.
 *
 * Usage: node scripts/check-box-fixes.mjs [--site /tmp/rf-box-site] [--port 9250] [--shots /tmp/box-fixes-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-box-site' );
const PORT = arg( 'port', '9250' );
const SHOTS = arg( 'shots', '/tmp/box-fixes-shots' );
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
	const watch = ( p ) => p.on( 'pageerror', ( e ) => errors.push( `${ e.message } @ ${ p.url() }` ) );
	const px = ( size ) => ( { unit: 'px', size } );
	const pad = ( n ) => ( { unit: 'px', top: String( n ), right: String( n ), bottom: String( n ), left: String( n ), isLinked: true } );

	try {
		// A site link style: 14px, blue, underlined.
		const kit = wp( [ 'option', 'get', 'refraction_active_kit' ] ).trim();
		wp( [ 'post', 'meta', 'update', kit, '_refraction_page_settings', JSON.stringify( { link_normal_color: '#0000FF', link_normal_typography_typography: 'custom', link_normal_typography_font_size: px( 14 ), link_normal_typography_text_decoration: 'underline' } ), '--format=json' ] );
		wp( [ 'eval', '\\Refraction\\Plugin::$instance->files_manager->clear_cache();' ] );

		// A large image, and its small copy saved as the widget's address (as an older or imported setting can have).
		const file = join( SHOTS, 'wide.png' );
		const png = await ( async () => {
			const p = await ( await browser.newContext( { viewport: { width: 1600, height: 900 } } ) ).newPage();
			await p.setContent( '<body style="margin:0;background:#1e508c"><div style="margin:100px;height:700px;border:20px solid #fff"></div></body>' );
			await p.screenshot( { path: file } );
			await p.context().close();
			return file;
		} )();
		const img = Number( wp( [ 'media', 'import', png, '--porcelain' ] ).trim() );
		const small = wp( [ 'eval', `echo wp_get_attachment_image_url( ${ img }, 'medium' );` ] ).trim();

		const title = { title_typography_typography: 'custom', title_typography_font_size: px( 32 ), title_color: '#C00000', link: { url: '#airport' } };
		const p1 = page( 'Boxes', [
			{ id: 'ib01', elType: 'widget', widgetType: 'image-box', settings: { ...title, image: { id: img, url: small }, thumbnail_size: 'full', image_size: { unit: '%', size: 100 }, title_text: 'Airport Transfers', description_text: 'Reliable transfers to Inverness Airport.', title_size: 'h4', content_padding: pad( 20 ) }, elements: [] },
			{ id: 'ic01', elType: 'widget', widgetType: 'icon-box', settings: { ...title, title_text: 'Corporate travel', description_text: 'Accounts for businesses.', title_size: 'h4', content_padding: pad( 24 ) }, elements: [] },
		] );

		const fp = await ( await browser.newContext( { viewport: { width: 1280, height: 900 } } ) ).newPage();
		watch( fp );
		await fp.goto( p1.url );
		await sleep( 600 );
		const front = await fp.evaluate( () => {
			const box = ( id, w ) => {
				const t = document.querySelector( `[data-id="${ id }"] .refraction-${ w }-box-title` ); const a = t.querySelector( 'a' ); const c = document.querySelector( `[data-id="${ id }"] .refraction-${ w }-box-content` );
				return { h: getComputedStyle( t ).fontSize, a: getComputedStyle( a ).fontSize, color: getComputedStyle( a ).color, deco: getComputedStyle( a ).textDecorationLine, pad: getComputedStyle( c ).padding };
			};
			const fig = document.querySelector( '[data-id="ib01"] .refraction-image-box-img' );
			return { ib: box( 'ib01', 'image' ), ic: box( 'ic01', 'icon' ), siteLink: getComputedStyle( document.querySelector( 'a' ) ).fontSize, fig: Math.round( fig.getBoundingClientRect().width ), img: Math.round( fig.querySelector( 'img' ).getBoundingClientRect().width ) };
		} );
		check( 'title link', 'the site link style is 14px (the test is real)', '14px' === front.siteLink, front.siteLink );
		check( 'title link', 'Image Box: the linked title keeps 32px and the title color, no link underline', '32px' === front.ib.a && '32px' === front.ib.h && 'rgb(192, 0, 0)' === front.ib.color && 'none' === front.ib.deco, JSON.stringify( front.ib ) );
		check( 'title link', 'Icon Box: the same', '32px' === front.ic.a && 'rgb(192, 0, 0)' === front.ic.color && 'none' === front.ic.deco, JSON.stringify( front.ic ) );
		check( 'padding', 'Content Padding on both boxes', '20px' === front.ib.pad && '24px' === front.ic.pad, JSON.stringify( [ front.ib.pad, front.ic.pad ] ) );
		check( 'image', 'on the page the image fills its 100% width', front.img === front.fig && front.fig > 300, JSON.stringify( front ) );
		await fp.screenshot( { path: join( SHOTS, 'page.png' ), fullPage: true } );
		await fp.context().close();

		// The editor: edit the title and the description; the image keeps its width.
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ctx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p1.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2500 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		await frame.click( '[data-id="ib01"] .refraction-image-box-description' );
		await sleep( 1500 );
		const measure = () => frame.evaluate( () => {
			const fig = document.querySelector( '[data-id="ib01"] .refraction-image-box-img' ); const im = fig.querySelector( 'img' ); return { fig: Math.round( fig.getBoundingClientRect().width ), img: Math.round( im.getBoundingClientRect().width ), src: im.getAttribute( 'src' ).split( '/' ).pop(), a: getComputedStyle( document.querySelector( '[data-id="ib01"] .refraction-image-box-title a' ) ).fontSize };
		} );
		const widths = [];
		for ( const [ k, v ] of [ [ 'title_text', 'Airport Transfers 24/7' ], [ 'description_text', 'Reliable transfers, day and night.' ] ] ) {
			await e.evaluate( ( [ key, value ] ) => window.$e.run( 'document/elements/settings', { container: window.refraction.getContainer( 'ib01' ), settings: { [ key ]: value } } ), [ k, v ] );
			await sleep( 1500 );
			widths.push( await measure() );
		}
		check( 'editor', 'after changing the title and the description the image still fills its width, from the full size', widths.every( ( w ) => w.img === w.fig && ! /-\d+x\d+\./.test( w.src ) ), JSON.stringify( widths ) );
		check( 'editor', 'the linked title keeps 32px in the editor too', widths.every( ( w ) => '32px' === w.a ), JSON.stringify( widths.map( ( w ) => w.a ) ) );
		const controls = await e.evaluate( () => [ 'image-box', 'icon-box' ].filter( ( w ) => ! window.refraction.widgetsCache[ w ]?.controls?.content_padding ) );
		check( 'editor', 'both boxes have Content Padding', 0 === controls.length, JSON.stringify( controls ) );
		await e.screenshot( { path: join( SHOTS, 'editor.png' ) } );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall box fix checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
