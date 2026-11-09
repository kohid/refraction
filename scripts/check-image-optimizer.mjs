#!/usr/bin/env node
/**
 * Image uploads (image-optimizer module; SQLite test site, Chromium): files uploaded in the browser (Media > Add New,
 * the same upload the editor's Insert Media window uses) and added from the command line (a sideload) are turned
 * upright, brought down to the maximum dimension by their orientation, saved as WebP and given their file name as alt
 * text; smaller images keep their size; animated GIFs stay GIFs; the settings tab saves its values; switched off,
 * uploads stay as they are.
 *
 * Usage: node scripts/check-image-optimizer.mjs [--site /tmp/rf-img-site] [--port 9270] [--shots /tmp/image-optimizer-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-img-site' );
const PORT = arg( 'port', '9270' );
const SHOTS = arg( 'shots', '/tmp/image-optimizer-shots' );
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

// Test images, made with Python (Pillow): a big landscape photo, a tall transparent PNG, a small photo, a photo
// stored on its side with an EXIF orientation tag, an animated GIF.
const MAKE = `
import sys
from PIL import Image, ImageDraw
d = sys.argv[1]
def pic(w, h, mode='RGB', bg=(30, 80, 140)):
    im = Image.new(mode, (w, h), bg)
    ImageDraw.Draw(im).rectangle((w // 10, h // 10, w // 2, h // 2), fill=(240, 200, 40, 255) if mode == 'RGBA' else (240, 200, 40))
    return im
pic(4000, 3000).save(d + '/inverness-airport-van.jpg', quality=92)
pic(1500, 3000, 'RGBA', (0, 0, 0, 0)).save(d + '/tall_castle_view.png')
pic(800, 600).save(d + '/small-badge.jpg', quality=90)
side = pic(3000, 2000)
exif = Image.Exif(); exif[0x0112] = 6
side.save(d + '/phone-photo.jpg', quality=90, exif=exif.tobytes())
frames = [Image.new('RGB', (200, 200), c).convert('P') for c in ((220, 40, 40), (40, 40, 220))]
frames[0].save(d + '/spinner.gif', save_all=True, append_images=frames[1:], duration=100, loop=0)
pic(3000, 1000).save(d + '/off-switch.jpg', quality=90)
pic(600, 400, 'RGBA', (0, 0, 0, 0)).convert('P').save(d + '/logo-8bit.png', transparency=0)
Image.new('RGB', (64, 64), (40, 160, 90)).convert('P').save(d + '/still-icon.gif')
`;

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
	const files = join( SHOTS, 'in' );
	mkdirSync( files, { recursive: true } );
	execFileSync( 'python3', [ '-c', MAKE, files ] );

	// Every image attachment, by its title: type, file, size and alt text.
	const library = () => JSON.parse( wp( [ 'eval', `
		$out = [];
		foreach ( get_posts( [ 'post_type' => 'attachment', 'numberposts' => -1, 'post_status' => 'inherit' ] ) as $a ) {
			$m = wp_get_attachment_metadata( $a->ID );
			$f = get_attached_file( $a->ID );
			$out[ $a->post_title ] = [ 'mime' => $a->post_mime_type, 'file' => basename( $f ), 'w' => (int) ( $m['width'] ?? 0 ), 'h' => (int) ( $m['height'] ?? 0 ), 'alt' => get_post_meta( $a->ID, '_wp_attachment_image_alt', true ), 'exists' => file_exists( $f ), 'dir' => array_values( array_map( 'basename', glob( dirname( $f ) . '/' . pathinfo( $f, PATHINFO_FILENAME ) . '.*' ) ) ) ];
		}
		echo wp_json_encode( $out );
	` ] ) );

	try {
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 950 } } );
		const a = await ctx.newPage();
		watch( a );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000 } ), a.click( '#wp-submit' ) ] );

		// The settings tab: its fields, with their defaults.
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings#tab-images` );
		await sleep( 800 );
		const tab = await a.evaluate( () => ( {
			tab: document.querySelector( '#refraction-settings-tab-images' )?.textContent.trim(),
			webp: document.querySelector( '#refraction_image_webp' )?.checked,
			max: document.querySelector( '#refraction_image_max_size' )?.value,
			quality: document.querySelector( '#refraction_image_quality' )?.value,
			alt: document.querySelector( '#refraction_image_auto_alt' )?.checked,
		} ) );
		check( 'settings', 'Refraction > Settings has an Images tab: WebP on, 1600px, 80%, alt text on', 'Images' === tab.tab && tab.webp && '1600' === tab.max && '80' === tab.quality && tab.alt, JSON.stringify( tab ) );
		await a.screenshot( { path: join( SHOTS, 'settings.png' ) } );

		// Uploads in the browser (Media > Add New sends them like the editor's Insert Media window).
		await a.goto( `${ BASE }/wp-admin/media-new.php` );
		await a.waitForSelector( 'input[type=file]', { state: 'attached', timeout: 30000 } );
		await a.setInputFiles( 'input[type=file]', [ 'inverness-airport-van.jpg', 'tall_castle_view.png', 'small-badge.jpg', 'phone-photo.jpg', 'spinner.gif', 'logo-8bit.png', 'still-icon.gif' ].map( ( f ) => join( files, f ) ) );
		let lib = {};
		for ( let i = 0; i < 90 && Object.keys( lib ).length < 7; i++ ) {
			await sleep( 1000 );
			lib = library();
		}
		await sleep( 1500 );
		lib = library();
		const van = lib[ 'inverness-airport-van' ] || {},
			castle = lib.tall_castle_view || {},
			small = lib[ 'small-badge' ] || {},
			phone = lib[ 'phone-photo' ] || {},
			gif = lib.spinner || {};
		check( 'upload', 'landscape 4000x3000 JPG: WebP, 1600 wide (resized by width), the JPG gone', 'image/webp' === van.mime && 'inverness-airport-van.webp' === van.file && 1600 === van.w && 1200 === van.h && van.exists && ! van.dir?.includes( 'inverness-airport-van.jpg' ), JSON.stringify( van ) );
		check( 'upload', 'portrait 1500x3000 PNG: WebP, 1600 high (resized by height)', 'image/webp' === castle.mime && 800 === castle.w && 1600 === castle.h, JSON.stringify( castle ) );
		check( 'upload', 'small 800x600 JPG: WebP, its size unchanged', 'image/webp' === small.mime && 800 === small.w && 600 === small.h, JSON.stringify( small ) );
		check( 'upload', 'a photo stored on its side (EXIF) is turned upright: portrait, 1067x1600', 'image/webp' === phone.mime && 1067 === phone.w && 1600 === phone.h, JSON.stringify( phone ) );
		check( 'upload', 'an animated GIF stays a GIF', 'image/gif' === gif.mime && 'spinner.gif' === gif.file, JSON.stringify( gif ) );
		const logo = lib[ 'logo-8bit' ] || {},
			still = lib[ 'still-icon' ] || {};
		check( 'upload', 'palette images (8-bit PNG, still GIF) become readable WebP too', 'image/webp' === logo.mime && 600 === logo.w && 400 === logo.h && 'image/webp' === still.mime && 64 === still.w, JSON.stringify( [ logo, still ] ) );
		check( 'alt text', 'alt text from the file names', 'Inverness airport van' === van.alt && 'Tall castle view' === castle.alt && 'Small badge' === small.alt && 'Phone photo' === phone.alt && 'Spinner' === gif.alt, JSON.stringify( [ van.alt, castle.alt, small.alt, phone.alt, gif.alt ] ) );

		const alpha = wp( [ 'eval', `
			$a = get_posts( [ 'post_type' => 'attachment', 'title' => 'tall_castle_view', 'numberposts' => 1, 'post_status' => 'inherit' ] )[0];
			$im = imagecreatefromwebp( get_attached_file( $a->ID ) );
			echo ( imagecolorat( $im, 790, 1590 ) >> 24 ) & 0x7F;
		` ] ).trim();
		check( 'upload', 'the PNG\'s transparency survives in the WebP', Number( alpha ) > 100, alpha );

		// The Media Library shows the WebP with its alt text.
		await a.goto( `${ BASE }/wp-admin/upload.php?mode=list` );
		await a.screenshot( { path: join( SHOTS, 'library.png' ) } );

		// A sideload (an image added from a URL or the command line) goes through the same steps.
		wp( [ 'media', 'import', join( files, 'off-switch.jpg' ), '--title=sideloaded-wide-photo' ] );
		const side = library()[ 'sideloaded-wide-photo' ] || {};
		check( 'sideload', 'an image added from the command line is converted and resized too (3000x1000 -> 1600x533)', 'image/webp' === side.mime && 1600 === side.w && 533 === side.h && 'Sideloaded wide photo' === side.alt, JSON.stringify( side ) );

		// The settings form saves; switched off, uploads stay as they are.
		await a.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings#tab-images` );
		await sleep( 600 );
		await a.uncheck( '#refraction_image_webp' );
		await a.uncheck( '#refraction_image_auto_alt' );
		await a.fill( '#refraction_image_max_size', '0' );
		await Promise.all( [ a.waitForNavigation(), a.click( '#tab-images input[type=submit], #submit' ) ] );
		const saved = wp( [ 'eval', 'echo wp_json_encode( [ get_option( "refraction_image_webp", "yes" ), get_option( "refraction_image_max_size" ), get_option( "refraction_image_auto_alt", "yes" ) ] );' ] ).trim();
		check( 'settings', 'the form saves: WebP off, 0 (no resizing), alt text off', '["","0",""]' === saved, saved );
		wp( [ 'media', 'import', join( files, 'off-switch.jpg' ), '--title=kept-as-is' ] );
		const kept = library()[ 'kept-as-is' ] || {};
		check( 'settings', 'switched off: the JPG keeps its format and full size (no WordPress -scaled copy either) and has no alt text', 'image/jpeg' === kept.mime && /^off-switch(-\d+)?\.jpg$/.test( kept.file ) && 3000 === kept.w && 1000 === kept.h && '' === kept.alt, JSON.stringify( kept ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall image upload checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
