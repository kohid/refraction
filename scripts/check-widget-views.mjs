#!/usr/bin/env node
/**
 * Layout choices per screen size on our widgets (0.134.0, SQLite test site, Chromium). Each was one class for every
 * screen; now each view can have its own, and a view without one takes the next larger view's:
 * - Focus Stack > Stack: up and down on desktop, side by side from 430 (the script sets rf-fs-o-* for the view).
 * - Showcase Wheel > Shape behind the current one and Labels: rounded and under the current one on desktop; a circle
 *   and none from 430.
 * - Price List > Image Position: left on desktop, above from 430 (the new choice), right at 375.
 * - Event Details > Layout: in a row on desktop, one under another from 430 (the page CSS).
 * - Testimonial Carousel > Layout: beside on desktop still stacks on phones (as before); beside chosen at 430 stays
 *   beside there.
 * - Video Playlist > Playlist Position: Right on desktop still goes below on tablets (as before); Left chosen at 1024
 *   stays beside there.
 * - Edit Mode: Price List's Image Position chosen at 393 shows at once in the 393 preview only.
 *
 * Usage: node scripts/check-widget-views.mjs [--site /tmp/rf-fresh-9382] [--port 9382] [--shots DIR]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fresh-9382' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/widget-views-shots' );
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

let uid = 0;
const id = () => 'wv' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const box = ( settings, elements = [], inner = true ) => ( { id: id(), elType: 'container', isInner: inner, settings: { content_width: 'full', ...settings }, elements } );
const heading = ( title ) => ( { id: id(), elType: 'widget', widgetType: 'heading', settings: { title }, elements: [] } );
const widget = ( wid, type, settings, elements = [] ) => ( { id: wid, elType: 'widget', widgetType: type, settings, elements } );
const row = ( ...widgets ) => box( {}, widgets, false );

function page( title, elements ) {
	const pid = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', pid, '--page_template=refraction_canvas' ] );
	return { id: pid, url: `${ BASE }/?page_id=${ pid }` };
}

const stackSlide = ( n ) => box( { _title: `Slide #${ n }` }, [ box( { _title: 'Header' }, [ heading( `Head ${ n }` ) ] ), box( { _title: 'Content', min_height: { unit: 'px', size: 120 } }, [ heading( `Body ${ n }` ) ] ), box( { _title: 'Footer' }, [ heading( `Foot ${ n }` ) ] ) ] );
const wheelSlide = ( n ) => box( { _title: `Slide #${ n }` }, [ heading( `Car ${ n }` ) ] );

// Two hosted videos (never played: only the layout is read).
const VIDEOS = [ { _id: 'vv1', title: 'Arrival', link: 'https://example.com/arrival.mp4' }, { _id: 'vv2', title: 'Tour', link: 'https://example.com/tour.mp4' } ];

const PAGE = [
	row( widget( 'fs1', 'refraction-focus-stack', { slides: [ 1, 2, 3 ].map( ( n ) => ( { _id: `fss${ n }`, slide_title: `Slide ${ n }` } ) ), autoplay: '', orientation: 'vertical', orientation_phone_md: 'horizontal' }, [ 1, 2, 3 ].map( stackSlide ) ) ),
	row( widget( 'sw1', 'refraction-showcase-wheel', { slides: [ 'Saloon', 'Estate', 'People carrier' ].map( ( t, i ) => ( { _id: `sws${ i }`, slide_title: t } ) ), autoplay: '', thumb_shape: 'rounded', labels: 'current', thumb_shape_phone_md: 'circle', labels_phone_md: 'none' }, [ 1, 2, 3 ].map( wheelSlide ) ) ),
	row( widget( 'pl1', 'refraction-price-list', { image_position: 'left', image_position_phone_md: 'top', image_position_phone_xs: 'right', items: [ { _id: 'pli1', title: 'Airport transfer', price: '£45', image: { url: `${ BASE }/wp-includes/images/media/default.svg` } } ] } ) ),
	row( widget( 'tc1', 'refraction-testimonial-carousel', { layout: 'aside' } ), widget( 'tc2', 'refraction-testimonial-carousel', { layout: 'below', layout_phone_md: 'aside' } ) ),
	row( widget( 'vp1', 'refraction-video-playlist', { layout: 'right', videos: VIDEOS } ), widget( 'vp2', 'refraction-video-playlist', { layout: 'right', layout_tablet: 'left', videos: VIDEOS } ) ),
	row( widget( 'ed1', 'refraction-event-details', { layout: 'row', layout_phone_md: 'list' } ) ),
];

async function main() {
	mkdirSync( SHOTS, { recursive: true } );
	const views = page( 'Widget views', PAGE );
	const browser = await chromium.launch( existsSync( '/opt/pw-browsers/chromium' ) ? { executablePath: '/opt/pw-browsers/chromium', args: [ '--no-sandbox' ] } : {} );
	const errors = [];

	try {
		const read = {};

		for ( const width of [ 1280, 1024, 480, 430, 375 ] ) {
			const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
			const p = await ctx.newPage();
			p.on( 'pageerror', ( e ) => errors.push( e.message ) );
			await p.goto( views.url );
			await sleep( 1200 );
			read[ width ] = await p.evaluate( () => {
				const q = ( sel ) => document.querySelector( sel );
				const cs = ( sel, prop ) => ( q( sel ) ? getComputedStyle( q( sel ) )[ prop ] : 'missing' );
				const pseudo = ( sel, which ) => ( q( sel ) ? getComputedStyle( q( sel ), which ).display : 'missing' );
				return {
					fs: q( '[data-id="fs1"]' )?.classList.contains( 'rf-fs-o-horizontal' ) ? 'horizontal' : 'vertical',
					swBox: pseudo( '[data-id="sw1"] .rf-sw__thumb.is-active', '::before' ),
					swCircle: pseudo( '[data-id="sw1"] .rf-sw__thumb.is-active .rf-sw__thumb-img', '::before' ),
					swLabel: cs( '[data-id="sw1"] .rf-sw__thumb.is-active .rf-sw__label', 'display' ),
					pl: cs( '[data-id="pl1"] .refraction-price-list__item', 'flexDirection' ),
					tc1: cs( '[data-id="tc1"] .refraction-tc', 'flexDirection' ),
					tc2: cs( '[data-id="tc2"] .refraction-tc', 'flexDirection' ),
					vp1: cs( '[data-id="vp1"] .refraction-vp', 'flexDirection' ),
					vp2: cs( '[data-id="vp2"] .refraction-vp', 'flexDirection' ),
					vp2List: Math.round( q( '[data-id="vp2"] .refraction-vp__list' )?.getBoundingClientRect().width || 0 ),
					vp2Width: Math.round( q( '[data-id="vp2"] .refraction-vp' )?.getBoundingClientRect().width || 0 ),
				};
			} );
			if ( 430 === width ) {
				await p.screenshot( { path: join( SHOTS, 'views-430.png' ), fullPage: true } );
			}
			await ctx.close();
		}

		const r = read;
		check( 'focus stack', 'Stack: up and down on desktop and 480, side by side from 430', 'vertical' === r[ 1280 ].fs && 'vertical' === r[ 480 ].fs && 'horizontal' === r[ 430 ].fs && 'horizontal' === r[ 375 ].fs, JSON.stringify( r ) );
		check( 'showcase wheel', 'Shape: rounded on desktop, a circle from 430', 'block' === r[ 1280 ].swBox && 'none' === r[ 1280 ].swCircle && 'none' === r[ 430 ].swBox && 'block' === r[ 430 ].swCircle, JSON.stringify( r ) );
		check( 'showcase wheel', 'Labels: under the current one on desktop, none from 430', 'block' === r[ 1280 ].swLabel && 'none' === r[ 430 ].swLabel, JSON.stringify( r ) );
		check( 'price list', 'Image Position: left on desktop, above from 430, right at 375', 'row' === r[ 1280 ].pl && 'row' === r[ 480 ].pl && 'column' === r[ 430 ].pl && 'row-reverse' === r[ 375 ].pl, JSON.stringify( r ) );
		check( 'testimonial', 'beside on desktop, stacked on phones as before (photo above)', 'row' === r[ 1280 ].tc1 && 'column' === r[ 480 ].tc1 && 'column' === r[ 375 ].tc1, JSON.stringify( r ) );
		check( 'testimonial', 'beside chosen at 430 stays beside there (below on desktop)', 'column-reverse' === r[ 1280 ].tc2 && 'row' === r[ 430 ].tc2 && 'row' === r[ 375 ].tc2, JSON.stringify( r ) );
		check( 'video playlist', 'Right on desktop goes below on tablets and phones, as before', 'row' === r[ 1280 ].vp1 && 'column' === r[ 1024 ].vp1 && 'column' === r[ 430 ].vp1, JSON.stringify( r ) );
		check( 'video playlist', 'Left chosen at 1024 stays beside there (list on the left, not full width)', 'row' === r[ 1280 ].vp2 && 'row-reverse' === r[ 1024 ].vp2 && r[ 1024 ].vp2List < r[ 1024 ].vp2Width * 0.5, JSON.stringify( r ) );

		const css = readFileSync( join( WPDIR, 'wp-content/uploads/refraction/css', `post-${ views.id }.css` ), 'utf8' ).replace( /\s+/g, '' );
		check( 'event details', 'Layout: in a row on desktop, one under another from 430 (in the page CSS)', /\.refraction-element-ed1\{[^}]*--rf-ed-dir:row/.test( css ) && /@media\(max-width:430px\)\{[^@]*\.refraction-element-ed1\{[^}]*--rf-ed-dir:column/.test( css ), css.match( /[^}]*rf-ed-dir[^}]*/g )?.join( ' | ' ) );

		// ------------------------------------------------------------ editor
		const ectx = await browser.newContext( { viewport: { width: 1440, height: 1000 } } );
		const e = await ectx.newPage();
		e.on( 'pageerror', ( err ) => errors.push( err.message ) );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ views.id }&action=refraction`, { timeout: 120000 } );
		await e.waitForFunction( () => window.refraction && window.$e && refraction.documents?.getCurrent() && document.querySelector( '#refraction-preview-iframe' ), null, { timeout: 120000 } );
		await sleep( 2500 );
		const dir = () => e.evaluate( () => getComputedStyle( document.getElementById( 'refraction-preview-iframe' ).contentDocument.querySelector( '[data-id="pl1"] .refraction-price-list__item' ) ).flexDirection );
		await e.evaluate( () => refraction.changeDeviceMode( 'phone_sm' ) );
		await sleep( 1500 );
		const before = await dir();
		await e.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'pl1' ), settings: { image_position_phone_sm: 'left' } } ) );
		await sleep( 1000 );
		const at393 = await dir();
		await e.evaluate( () => refraction.changeDeviceMode( 'phone_md' ) );
		await sleep( 1500 );
		const at430 = await dir();
		check( 'editor', 'Price List Image Position set to Left at 393 shows at once at 393; 430 keeps Above', 'column' === before && 'row' === at393 && 'column' === at430, JSON.stringify( { before, at393, at430 } ) );
		const fsEditor = await e.evaluate( () => document.getElementById( 'refraction-preview-iframe' ).contentDocument.querySelector( '[data-id="fs1"]' ).classList.contains( 'rf-fs-o-horizontal' ) );
		check( 'editor', 'the Focus Stack in the 430 preview is side by side (its 430 choice)', fsEditor );
		await e.screenshot( { path: join( SHOTS, 'editor-430.png' ) } );
		await ectx.close();

		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall widget view checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( err ) => {
	console.error( err );
	process.exit( 1 );
} );
