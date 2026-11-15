#!/usr/bin/env node
/**
 * Box hover animation and the Image Box in Edit Mode (0.103.0, SQLite test site, Chromium).
 * - Image Box and Icon Box: Style > Box > Hover > Hover Animation moves the whole card, on the page and in Edit Mode.
 * - An Image Box with a Reveal text effect (lines) changes in Edit Mode: title, description and image follow the panel,
 *   and the text is not doubled; Image Width 100% fills the box with the image.
 *
 * Usage: node scripts/check-box-hover.mjs [--site /tmp/rf-bh-site] [--port 8940] [--shots /tmp/box-hover-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-bh-site' );
const PORT = arg( 'port', '8940' );
const SHOTS = arg( 'shots', '/tmp/box-hover-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

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

function wp( args, { allowFail = false } = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		if ( allowFail ) { return null; }
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

/** A published page whose editor data is the given elements; returns its id and address. */
function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id, url: wp( [ 'post', 'list', '--post_type=page', `--post__in=${ id }`, '--field=url' ] ).trim() };
}
const box = ( id, settings, elements, isInner = false ) => ( { id, elType: 'container', settings: { content_width: 'full', ...settings }, elements, isInner } );


// A wide photo-sized picture in the media library (a photo wider than the box, like the user's).
function bigImage() {
	const file = join( SITE, 'wide-test.png' );
	execFileSync( 'php', [ '-r', `$i = imagecreatetruecolor( 1200, 800 ); imagefill( $i, 0, 0, imagecolorallocate( $i, 30, 90, 160 ) ); imagepng( $i, '${ file }' );` ] );
	const id = wp( [ 'media', 'import', file, '--porcelain' ] ).trim();
	return { id: Number( id ), url: wp( [ 'eval', `echo wp_get_attachment_url( ${ id } );` ] ).trim() };
}

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

	try {
		const img = bigImage();
		const reveal = { rf_reveal: 'fade-up', rf_reveal_text: 'lines', rf_reveal_text_effect: 'fade-up', rf_reveal_trigger: 'always', rf_reveal_easing: 'smooth', rf_magnetic: 'yes' };
		const doc = page( 'Box hover', [ box( 'top', { flex_direction: 'row' }, [
			{ id: 'ib', elType: 'widget', widgetType: 'image-box', settings: { ...reveal, title_text: 'Airport Transfers', description_text: 'Reliable transfers to your destination.', image: { url: img.url, id: img.id }, thumbnail_size: 'full', image_size: { unit: '%', size: 100 }, ib_box_hover_animation: 'grow', _element_width: 'initial', _element_custom_width: { unit: 'px', size: 380 } }, elements: [] },
			{ id: 'icb', elType: 'widget', widgetType: 'icon-box', settings: { title_text: 'Local drivers', description_text: 'Who know the Highlands.', icb_box_hover_animation: 'float', icb_box_border_border: 'solid', icb_box_border_width: { unit: 'px', top: '2', right: '2', bottom: '2', left: '2', isLinked: true }, icb_box_border_color: '#ff0000', _element_width: 'initial', _element_custom_width: { unit: 'px', size: 380 } }, elements: [] },
		] ) ] );

		const moved = ( target, id, cls ) => target.evaluate( ( [ i, c ] ) => {
			const w = document.querySelector( `[data-id="${ i }"] .${ c }` );
			return { cls: w.className, transform: getComputedStyle( w ).transform };
		}, [ id, cls ] );

		// ------------------------------------------------------------ on the page
		const ctx = await browser.newContext( { viewport: { width: 1300, height: 900 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( doc.url, { waitUntil: 'load', timeout: 120000 } );
		await p.waitForTimeout( 2000 );
		await p.locator( '[data-id="ib"] .refraction-image-box-wrapper' ).hover();
		await p.waitForTimeout( 700 );
		const ibHover = await moved( p, 'ib', 'refraction-image-box-wrapper' );
		check( 'page', 'Image Box > Box > Hover Animation "Grow": the whole card grows when pointed at', ibHover.cls.includes( 'refraction-animation-grow' ) && ibHover.transform.startsWith( 'matrix(1.1' ), JSON.stringify( ibHover ) );
		await p.locator( '[data-id="icb"] .refraction-icon-box-wrapper' ).hover();
		await p.waitForTimeout( 700 );
		const icbHover = await moved( p, 'icb', 'refraction-icon-box-wrapper' );
		const icbBorder = await p.evaluate( () => getComputedStyle( document.querySelector( '[data-id="icb"] .refraction-icon-box-wrapper' ) ).borderTopColor );
		check( 'page', 'Icon Box > Box: its own border, and Hover Animation "Float" lifts the whole card', icbHover.cls.includes( 'refraction-animation-float' ) && /matrix\(1, 0, 0, 1, 0, -/.test( icbHover.transform ) && 'rgb(255, 0, 0)' === icbBorder, JSON.stringify( { icbHover, icbBorder } ) );
		const fill = ( target ) => target.evaluate( () => {
			const w = document.querySelector( '[data-id="ib"] .refraction-image-box-wrapper' );
			const i = w.querySelector( 'img' );
			return { box: Math.round( w.getBoundingClientRect().width ), img: Math.round( i.getBoundingClientRect().width ) };
		} );
		const pageFill = await fill( p );
		check( 'page', 'Image Width 100%: the photo fills the box', Math.abs( pageFill.box - pageFill.img ) <= 2, JSON.stringify( pageFill ) );
		await p.mouse.move( 5, 5 );
		await p.waitForTimeout( 800 );
		await p.locator( '[data-id="top"]' ).screenshot( { path: join( SHOTS, 'page.png' ) } );

		// ------------------------------------------------------------ in the editor
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 3000 );
		const frame = a.frames().find( ( f ) => f !== a.mainFrame() && f.url().includes( 'refraction-preview' ) ) || a.frames()[ 1 ];
		const read = () => frame.evaluate( () => {
			const w = document.querySelector( '[data-id="ib"]' );
			const visible = ( el ) => el ? [ ...el.querySelectorAll( '.rf-rv-word' ) ].map( ( x ) => x.textContent ).join( ' ' ) || el.textContent : null;
			return { title: visible( w.querySelector( '.refraction-image-box-title' ) ), desc: visible( w.querySelector( '.refraction-image-box-description' ) ), img: w.querySelector( 'img' )?.getAttribute( 'src' ), titles: w.querySelectorAll( '.refraction-image-box-title' ).length };
		} );
		const before = await read();
		check( 'edit mode', 'the Image Box with Reveal lines shows its title once', 'Airport Transfers' === before.title && 1 === before.titles, JSON.stringify( before ) );

		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ib' ), settings: { title_text: 'Station Runs', description_text: 'To and from Inverness station.', image: { url: location.origin + '/wp-includes/images/media/default.svg', id: '' } } } ) );
		await a.waitForTimeout( 2000 );
		const after = await read();
		check( 'edit mode', 'changing the title, description and image in the panel shows them at once', 'Station Runs' === after.title && 'To and from Inverness station.' === after.desc && /default\.svg$/.test( after.img || '' ) && 1 === after.titles, JSON.stringify( after ) );
		await a.evaluate( ( im ) => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ib' ), settings: { image: { url: im.url, id: im.id } } } ), img );
		await a.waitForTimeout( 2000 );
		const edFill = await fill( frame );
		check( 'edit mode', 'Image Width 100%: the photo fills the box in Edit Mode too', Math.abs( edFill.box - edFill.img ) <= 2, JSON.stringify( edFill ) );

		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ib' ), settings: { ib_box_hover_animation: 'shrink' } } ) );
		await a.waitForTimeout( 1500 );
		const edClass = ( await moved( frame, 'ib', 'refraction-image-box-wrapper' ) ).cls;
		check( 'edit mode', 'choosing "Shrink" in the panel puts it on the card at once', edClass.includes( 'refraction-animation-shrink' ) && ! edClass.includes( 'refraction-animation-grow' ), edClass );
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'icb' ), settings: { icb_box_hover_animation: 'pulse' } } ) );
		await a.waitForTimeout( 1500 );
		check( 'edit mode', 'Icon Box: choosing "Pulse" puts it on the card at once', ( await moved( frame, 'icb', 'refraction-icon-box-wrapper' ) ).cls.includes( 'refraction-animation-pulse' ) );

		// The panel: Style > Box > Hover has Hover Animation on both widgets.
		for ( const [ id, name ] of [ [ 'ib', 'ib_box' ], [ 'icb', 'icb_box' ] ] ) {
			await a.evaluate( ( i ) => $e.run( 'panel/editor/open', { model: refraction.getContainer( i ).model, view: refraction.getContainer( i ).view } ), id );
			await a.waitForTimeout( 800 );
			await a.locator( '.refraction-panel-navigation-tab:has-text("Style")' ).first().click();
			await a.waitForTimeout( 600 );
			await a.evaluate( () => {
				const s = document.querySelector( '.refraction-control-section_style_box' );
				if ( s && ! s.classList.contains( 'e-open' ) ) { s.querySelector( '.refraction-panel-heading' ).click(); }
			} );
			await a.waitForTimeout( 600 );
			await a.evaluate( () => [ ...document.querySelectorAll( '.rf-section-groups__tab' ) ].find( ( t ) => 'Box' === t.textContent.trim() )?.click() );
			await a.waitForTimeout( 400 );
			await a.locator( `.refraction-control-${ name }_tab_hover` ).first().click();
			await a.waitForTimeout( 500 );
			const shown = await a.evaluate( ( n ) => !! document.querySelector( `.refraction-control-${ n }_hover_animation` )?.offsetParent, name );
			check( 'panel', `${ 'ib' === id ? 'Image Box' : 'Icon Box' } > Style > Box > Hover has Hover Animation`, shown );
			if ( 'icb' === id ) {
				await a.locator( `.refraction-control-${ name }_hover_animation` ).scrollIntoViewIfNeeded();
				await a.screenshot( { path: join( SHOTS, 'panel-box-hover.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );
			}
		}
		const el = await frame.$( '[data-id="top"]' );
		if ( el ) { await el.screenshot( { path: join( SHOTS, 'edit-mode.png' ) } ); }

		check( 'errors', 'no script errors', 0 === errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse)/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
