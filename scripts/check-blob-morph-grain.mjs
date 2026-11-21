#!/usr/bin/env node
/**
 * Deco Blob and Grain across widgets (0.136.0), SQLite test site, Chromium:
 * - Phone Showcase: a Deco Blob behind the phone or in front of it (per screen size), its look (solid, outline, solid
 *   with an offset outline), its hover morph into another shape (and back, exactly), grain on the widget's fill and
 *   only on the blob's shape.
 * - Containers: grain only on the Deco Blob's shape (no fill grain) takes the Grain section's amount and blend; the
 *   container blob's Morph On Hover.
 * - Showcase Wheel: a slide's blob in front of or behind the picture, outline look, hover morph, grain on each slide's
 *   fill and on the shapes.
 * - Edit Mode draws the same, and a change in the panel shows at once.
 *
 * Usage: node scripts/check-blob-morph-grain.mjs [--site /tmp/rf-bmg-site] [--port 9382] [--shots /tmp/blob-morph-grain-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-bmg-site' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/blob-morph-grain-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 900 ) }` }` );
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

function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( elements ) ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

let uid = 0;
const id = () => 'bm' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const box = ( settings, elements, isInner = false, fixed = '' ) => ( { id: fixed || id(), elType: 'container', isInner, settings: { content_width: 'full', ...settings }, elements } );
const heading = ( title ) => ( { id: id(), elType: 'widget', widgetType: 'heading', settings: { title, header_size: 'h2' }, elements: [] } );
const step = ( n ) => ( { _id: `st${ n }`, title: `Step ${ n }`, text: `What happens at step ${ n }.`, icon: { value: 'fas fa-star', library: 'fa-solid' } } );
const showcase = ( wid, settings ) => ( { id: wid, elType: 'widget', widgetType: 'refraction-phone-showcase', settings: { steps: [ step( 1 ), step( 2 ) ], cards: [], heading: 'Book in two taps', ...settings }, elements: [] } );

// A Phone Showcase on a tinted ground: blob behind (in front on phones), morphing, grain on the fill and the shape.
const PS = {
	ps_blob: 'yes', ps_blob_shape: 'blob-2', ps_blob_color: '#F6C94A', ps_blob_size: { size: 150 }, ps_blob_place: 'back', ps_blob_place_mobile: 'front',
	ps_blob_morph: 'yes', ps_blob_morph_shape: 'flower', ps_blob_morph_ms: 300,
	ps_grain_where: 'both', ps_grain_texture: 'speckle', ps_grain_amount: { size: 0.6 }, ps_grain_blend: 'overlay', ps_grain_scale: { size: 60 },
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
	const at = async ( url, width, height = 900 ) => {
		const p = await ( await browser.newContext( { viewport: { width, height } } ) ).newPage();
		watch( p );
		await p.goto( url );
		await p.waitForTimeout( 600 );
		return p;
	};

	try {
		// ------------------------------------------------------------ pages
		const psPage = page( 'Phone blob', [
			box( { background_background: 'classic', background_color: '#DCEFE8', padding: { unit: 'px', top: '60', right: '40', bottom: '60', left: '40', isLinked: false } }, [ showcase( 'ps01', PS ) ] ),
			box( { padding: { unit: 'px', top: '40', right: '40', bottom: '40', left: '40', isLinked: false } }, [
				showcase( 'ps02', { ps_blob: 'yes', ps_blob_style: 'outline', ps_blob_line: '#E20A17', ps_blob_line_width: { unit: 'px', size: 4 } } ),
				showcase( 'ps03', { ps_blob: 'yes', ps_blob_style: 'both', ps_blob_line_shape: 'blob-5', ps_grain_where: 'fill' } ),
			] ),
		] );
		const conPage = page( 'Container blob', [
			box( { min_height: { unit: 'px', size: 420 }, background_background: 'classic', background_color: '#F4F2EE', rf_blob: 'yes', rf_blob_shape: 'blob-1', rf_blob_size: { unit: '%', size: 60 }, rf_blob_grain: 'yes', rf_grain_amount: { size: 0.7 }, rf_grain_blend: 'screen', rf_grain_texture: 'chalk', rf_blob_morph: 'yes', rf_blob_morph_shape: 'star-soft', rf_blob_morph_ms: 300 }, [ heading( 'Grain on the blob only' ) ], false, 'con001' ),
		] );

		// Showcase Wheel: slide 1 blob in front, outline, morphing; slide 2 blob behind with grain.
		const pics = ( () => {
			const dir = join( SITE, 'bm-pictures' );
			mkdirSync( dir, { recursive: true } );
			execFileSync( 'python3', [ '-I', '-c', [
				'import sys',
				'from PIL import Image, ImageDraw',
				'im = Image.new("RGBA", (600, 600), (0, 0, 0, 0))',
				'd = ImageDraw.Draw(im)',
				'd.ellipse((120, 120, 480, 480), fill=(30, 60, 90, 255))',
				'im.save(sys.argv[1] + "/pic.png")',
			].join( '\n' ), dir ] );
			const mediaId = wp( [ 'media', 'import', join( dir, 'pic.png' ), '--porcelain' ] ).trim();
			return { id: Number( mediaId ), url: wp( [ 'eval', `echo wp_get_attachment_url( ${ mediaId } );` ] ).trim() };
		} )();
		const slideBox = ( n ) => box( { _title: `Slide #${ n }`, min_height: { unit: 'px', size: 460 }, background_background: 'classic', background_color: '#E9EEF5' }, [ box( { width: { unit: '%', size: 46 } }, [ heading( `Slide ${ n }` ) ], true ) ], true );
		const swPage = page( 'Wheel blob', [ box( { padding: { unit: 'px', top: '30', right: '20', bottom: '30', left: '20', isLinked: false } }, [ {
			id: 'sw01', elType: 'widget', widgetType: 'refraction-showcase-wheel',
			settings: {
				slides: [
					{ _id: 'sl1', slide_title: 'One', image: pics, side: 'left', deco: 'blob', deco_color: '#F6C94A', sw_blob_pick: 'blob-3', sw_blob_layer: 'front', sw_blob_style: 'outline', sw_blob_line: '#E20A17', sw_blob_morph: 'yes', sw_blob_morph_shape: 'circle', sw_blob_morph_ms: 300 },
					{ _id: 'sl2', slide_title: 'Two', image: pics, side: 'right', deco: 'blob', deco_color: '#7BC4A8', sw_blob_pick: 'blob-1' },
				],
				autoplay: '', show_thumbs: 'yes',
				sw_grain_where: 'both', sw_grain_texture: 'film', sw_grain_amount: { size: 0.5 },
			},
			elements: [ slideBox( 1 ), slideBox( 2 ) ],
		} ] ) ] );

		// ------------------------------------------------------------ Phone Showcase, front end
		const psState = ( p, wid ) => p.evaluate( ( w ) => {
			const root = document.querySelector( `[data-id="${ w }"]` );
			const blob = root.querySelector( '.rf-showcase__device > .rf-showcase__blob' );
			const g = root.querySelector( '.rf-showcase > .rf-wgrain' );
			const bg = blob && blob.querySelector( '.rf-wblob__grain' );
			const path = blob && blob.querySelector( '.rf-wblob__fill path, .rf-wblob__line path' );
			const cs = blob ? getComputedStyle( blob ) : null;
			const phone = root.querySelector( '.rf-phone__body' ).getBoundingClientRect();
			const r = blob ? blob.getBoundingClientRect() : null;
			const line = blob && blob.querySelector( '.rf-wblob__line path' );
			return {
				blob: !! blob, z: cs && cs.zIndex, d: path && path.getAttribute( 'd' ),
				fill: blob && blob.querySelector( '.rf-wblob__fill path' ) ? getComputedStyle( blob.querySelector( '.rf-wblob__fill path' ) ).fill : '',
				line: line ? [ getComputedStyle( line ).stroke, getComputedStyle( line ).strokeWidth, line.closest( 'svg' ).classList.contains( 'rf-wblob__line--offset' ) ] : null,
				wider: r ? Math.round( r.width / phone.width * 100 ) : 0,
				fillGrain: g ? { bg: getComputedStyle( g ).backgroundImage.slice( 0, 30 ), op: getComputedStyle( g ).opacity, blend: getComputedStyle( g ).mixBlendMode, z: getComputedStyle( g ).zIndex } : null,
				shapeGrain: bg ? { bg: getComputedStyle( bg ).backgroundImage.slice( 0, 30 ), mask: ( getComputedStyle( bg ).maskImage || getComputedStyle( bg ).webkitMaskImage ).slice( 0, 30 ), op: getComputedStyle( bg ).opacity } : null,
			};
		}, wid );

		const d1 = await at( psPage.url, 1300 );
		let s = await psState( d1, 'ps01' );
		check( 'phone showcase', 'the Deco Blob is in the phone\'s box, behind the phone (z-index -1) at 1300px, 150% of the phone\'s width, in its colour', s.blob && '-1' === s.z && s.wider >= 145 && s.wider <= 155 && 'rgb(246, 201, 74)' === s.fill, JSON.stringify( s ) );
		check( 'phone showcase', 'grain on the widget fill: painted, at the amount and blend set, under the content', s.fillGrain && s.fillGrain.bg.startsWith( 'url(' ) && '0.6' === s.fillGrain.op && 'overlay' === s.fillGrain.blend && '-1' === s.fillGrain.z, JSON.stringify( s.fillGrain ) );
		check( 'phone showcase', 'grain only inside the blob: painted and cut by the shape', s.shapeGrain && s.shapeGrain.bg.startsWith( 'url(' ) && s.shapeGrain.mask.startsWith( 'url(' ) && '0.6' === s.shapeGrain.op, JSON.stringify( s.shapeGrain ) );
		const before = s.d;
		await d1.mouse.move( 5, 5 );
		await d1.hover( '[data-id="ps01"] .rf-showcase__heading' );
		await d1.waitForTimeout( 700 );
		const hovered = await psState( d1, 'ps01' );
		const flower = await d1.evaluate( () => document.querySelector( '[data-id="ps01"] .rf-wblob' ).getAttribute( 'data-rf-wblob' ) );
		check( 'phone showcase', 'hovering the widget morphs the blob into the chosen shape (the exact Flower path at the end)', hovered.d !== before && JSON.parse( flower ).morph.d === hovered.d, JSON.stringify( [ before.slice( 0, 40 ), hovered.d.slice( 0, 40 ) ] ) );
		const mask = await d1.evaluate( () => document.querySelector( '[data-id="ps01"] .rf-wblob__grain' ).style.getPropertyValue( '--rf-wblob-mask' ) );
		check( 'phone showcase', 'the shape\'s grain follows the morph (its clip is the new shape)', mask.includes( encodeURIComponent( hovered.d ).slice( 0, 40 ) ), mask.slice( 0, 120 ) );
		await d1.mouse.move( 2, 2 );
		await d1.waitForTimeout( 700 );
		s = await psState( d1, 'ps01' );
		check( 'phone showcase', 'leaving turns it back into the first shape, exactly', s.d === before, s.d.slice( 0, 60 ) );
		const s2 = await psState( d1, 'ps02' );
		const s3 = await psState( d1, 'ps03' );
		check( 'phone showcase', 'Outline: only the line, in its colour and width; Solid with an offset outline: a fill and an offset line of the other shape', null === s2.d ? false : '' === s2.fill && s2.line && 'rgb(226, 10, 23)' === s2.line[ 0 ] && '4px' === s2.line[ 1 ] && ! s2.line[ 2 ] && s3.fill && s3.line && s3.line[ 2 ], JSON.stringify( [ s2, s3 ] ) );
		check( 'phone showcase', 'Grain "On the widget fill" only: no grain inside the blob', s3.fillGrain && ! s3.shapeGrain, JSON.stringify( s3 ) );
		await d1.locator( '[data-id="ps01"]' ).scrollIntoViewIfNeeded();
		await d1.screenshot( { path: join( SHOTS, 'phone-blob-desktop.png' ), clip: await d1.locator( '[data-id="ps01"]' ).boundingBox() } );
		await d1.hover( '[data-id="ps01"] .rf-showcase__heading' );
		await d1.waitForTimeout( 700 );
		await d1.screenshot( { path: join( SHOTS, 'phone-blob-hover.png' ), clip: await d1.locator( '[data-id="ps01"]' ).boundingBox() } );
		await d1.context().close();

		const m1 = await at( psPage.url, 375, 800 );
		s = await psState( m1, 'ps01' );
		check( 'phone showcase', 'at 375px the blob is in front of the phone (Show, per screen size): z-index 4, under the cards (5)', '4' === s.z, JSON.stringify( s ) );
		await m1.locator( '[data-id="ps01"] .rf-showcase__device' ).scrollIntoViewIfNeeded();
		await m1.screenshot( { path: join( SHOTS, 'phone-blob-375.png' ), fullPage: false } );
		await m1.context().close();

		// ------------------------------------------------------------ container
		const c1 = await at( conPage.url, 1200 );
		const con = () => c1.evaluate( () => {
			const el = document.querySelector( '[data-id="con001"]' );
			const g = el.querySelector( '.rf-ofx-blob > .rf-ofx-grain' );
			const path = el.querySelector( '.rf-ofx-blob > svg.rf-ofx-blob__shape path' );
			return { fillGrain: !! el.querySelector( ':scope > .rf-ofx-grain' ), blobGrain: g ? [ getComputedStyle( g ).opacity, getComputedStyle( g ).mixBlendMode ] : null, d: path && path.getAttribute( 'd' ), shape: el.querySelector( '.rf-ofx-blob' ).style.getPropertyValue( '--rf-shape' ).slice( 0, 60 ) };
		} );
		let c = await con();
		check( 'container', 'grain only on the Deco Blob shape (no fill grain): it takes Grain Amount and Blend (0.7, screen)', ! c.fillGrain && c.blobGrain && '0.7' === c.blobGrain[ 0 ] && 'screen' === c.blobGrain[ 1 ], JSON.stringify( c ) );
		const cBefore = c.d;
		await c1.hover( '[data-id="con001"] h2' );
		await c1.waitForTimeout( 700 );
		c = await con();
		check( 'container', 'Morph On Hover: the container blob turns into the chosen shape, its grain clip with it', !! cBefore && c.d !== cBefore && c.shape.includes( 'url(' ), JSON.stringify( [ cBefore && cBefore.slice( 0, 30 ), c ] ) );
		await c1.screenshot( { path: join( SHOTS, 'container-blob-grain-hover.png' ), clip: await c1.locator( '[data-id="con001"]' ).boundingBox() } );
		// Below the container (it fills the top of the page).
		await c1.mouse.move( 600, 890 );
		await c1.waitForTimeout( 700 );
		c = await con();
		check( 'container', 'and back after', c.d === cBefore, String( c.d ).slice( 0, 40 ) );
		await c1.context().close();

		// ------------------------------------------------------------ Showcase Wheel, front end
		const swState = ( p, doc ) => p.evaluate( () => {
			const slots = [ ...document.querySelectorAll( '[data-id="sw01"] .rf-sw__slots > .rf-sw__slot' ) ];
			return slots.map( ( slot ) => {
				const blob = slot.querySelector( '.rf-sw__deco--blob' );
				const g = slot.querySelector( ':scope > .rf-wgrain' );
				const line = blob && blob.querySelector( '.rf-wblob__line path' );
				const main = blob && blob.querySelector( '.rf-wblob__fill path, .rf-wblob__line path' );
				const bg = blob && blob.querySelector( '.rf-wblob__grain' );
				const fill = blob && blob.querySelector( '.rf-wblob__fill path' );
				return {
					wblob: !! ( blob && blob.classList.contains( 'rf-wblob' ) ), z: blob && getComputedStyle( blob ).zIndex, d: main && main.getAttribute( 'd' ),
					fill: fill ? getComputedStyle( fill ).fill : '', line: line ? getComputedStyle( line ).stroke : '',
					slotGrain: g ? [ getComputedStyle( g ).backgroundImage.slice( 0, 12 ), getComputedStyle( g ).opacity, getComputedStyle( g ).zIndex ] : null,
					shapeGrain: bg ? ( getComputedStyle( bg ).backgroundImage.slice( 0, 12 ) + '|' + ( getComputedStyle( bg ).maskImage || getComputedStyle( bg ).webkitMaskImage ).slice( 0, 12 ) ) : '',
				};
			} );
		} );
		const w1 = await at( swPage.url, 1300 );
		let sw = await swState( w1 );
		check( 'showcase wheel', 'slide blobs are Deco Blobs: slide 1 in front of the picture (z 4) as an outline in its colour, slide 2 behind (z 1) filled in its colour', sw[ 0 ].wblob && '4' === sw[ 0 ].z && 'rgb(226, 10, 23)' === sw[ 0 ].line && '' === sw[ 0 ].fill && sw[ 1 ].wblob && '1' === sw[ 1 ].z && 'rgb(123, 196, 168)' === sw[ 1 ].fill, JSON.stringify( sw ) );
		check( 'showcase wheel', 'grain on each slide\'s fill (over its background, z 1, amount 0.5) and inside the filled shape (an outline has none)', sw.every( ( x ) => x.slotGrain && x.slotGrain[ 0 ].startsWith( 'url(' ) && '0.5' === x.slotGrain[ 1 ] && '1' === x.slotGrain[ 2 ] ) && '' === sw[ 0 ].shapeGrain && sw[ 1 ].shapeGrain.startsWith( 'url(' ) && sw[ 1 ].shapeGrain.includes( '|url(' ), JSON.stringify( sw ) );
		const textOver = await w1.evaluate( () => {
			const h = document.querySelector( '[data-id="sw01"] .rf-sw__slot.is-active h2' ).getBoundingClientRect();
			return document.elementFromPoint( h.left + 5, h.top + ( h.height / 2 ) ).closest( 'h2' ) !== null;
		} );
		check( 'showcase wheel', 'the slide\'s text stays above the grain (it is what the pointer reaches)', textOver );
		const swBefore = sw[ 0 ].d;
		await w1.hover( '[data-id="sw01"] .rf-sw__slot.is-active h2' );
		await w1.waitForTimeout( 700 );
		sw = await swState( w1 );
		check( 'showcase wheel', 'hovering the slide morphs its blob (Into: Circle), and back after', sw[ 0 ].d !== swBefore, JSON.stringify( [ swBefore.slice( 0, 30 ), sw[ 0 ].d.slice( 0, 30 ) ] ) );
		await w1.screenshot( { path: join( SHOTS, 'wheel-blob-grain-hover.png' ), clip: await w1.locator( '[data-id="sw01"]' ).boundingBox() } );
		await w1.mouse.move( 2, 2 );
		await w1.waitForTimeout( 700 );
		sw = await swState( w1 );
		check( 'showcase wheel', '... back to its own shape exactly', sw[ 0 ].d === swBefore );
		await w1.context().close();

		// ------------------------------------------------------------ the editor
		const e = await ( await browser.newContext( { viewport: { width: 1500, height: 950 } } ) ).newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), e.click( '#wp-submit' ) ] );
		const open = async ( pid ) => {
			await e.goto( `${ BASE }/wp-admin/post.php?post=${ pid }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
			await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
			await sleep( 3000 );
			return e.frame( { name: 'refraction-preview-iframe' } );
		};

		let frame = await open( psPage.id );
		s = await psState( frame, 'ps01' );
		check( 'editor', 'Phone Showcase in Edit Mode: the blob behind the phone, its grain and the fill grain painted', s.blob && '-1' === s.z && s.fillGrain && s.fillGrain.bg.startsWith( 'url(' ) && s.shapeGrain && s.shapeGrain.bg.startsWith( 'url(' ), JSON.stringify( s ) );
		await e.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ps01' ), settings: { ps_blob_place: 'front', ps_blob_shape: 'leaf', ps_grain_where: 'shape' } } ) );
		await sleep( 2500 );
		s = await psState( frame, 'ps01' );
		const leaf = await e.evaluate( () => refraction.getContainer( 'ps01' ).settings.get( 'ps_blob_shape' ) );
		check( 'editor', 'changing Show, the shape and Grain in the panel shows at once: in front (z 4), a new path, the fill grain gone and the shape\'s still painted', '4' === s.z && s.d !== before && ! s.fillGrain && s.shapeGrain && s.shapeGrain.bg.startsWith( 'url(' ) && 'leaf' === leaf, JSON.stringify( s ) );
		const panel = await e.evaluate( () => {
			const c = window.refraction.widgetsCache[ 'refraction-phone-showcase' ]?.controls || {};
			const k = Object.keys( c );
			return { blob: [ 'ps_blob', 'ps_blob_source', 'ps_blob_shape', 'ps_blob_mine', 'ps_blob_mine_upload', 'ps_blob_style', 'ps_blob_line_shape', 'ps_blob_place', 'ps_blob_place_mobile', 'ps_blob_morph', 'ps_blob_morph_source', 'ps_blob_morph_mine_upload', 'ps_blob_morph_ms', 'ps_grain_where', 'ps_grain_texture_upload' ].filter( ( n ) => ! k.includes( n ) ), where: Object.keys( c.ps_grain_where?.options || {} ), event: c.ps_grain_texture_upload?.event };
		} );
		check( 'editor', 'Phone Showcase has the shared Deco Blob settings (shape tabs, upload, look, Show per view, Morph with its own upload) and Grain (fill / shape / both, its own texture upload)', ! panel.blob.length && '|fill|shape|both' === panel.where.join( '|' ) && 'refraction:organicTextures:ps_grain_texture' === panel.event, JSON.stringify( panel ) );
		await e.screenshot( { path: join( SHOTS, 'editor-phone-blob.png' ) } );

		frame = await open( swPage.id );
		sw = await swState( frame );
		check( 'editor', 'Showcase Wheel in Edit Mode draws the same blobs and grain as the site', sw[ 0 ].wblob && '4' === sw[ 0 ].z && 'rgb(226, 10, 23)' === sw[ 0 ].line && sw[ 1 ].wblob && '1' === sw[ 1 ].z && sw.every( ( x ) => x.slotGrain && x.slotGrain[ 0 ].startsWith( 'url(' ) ) && sw[ 1 ].shapeGrain.startsWith( 'url(' ), JSON.stringify( sw ) );
		const edText = await frame.evaluate( () => {
			const h = document.querySelector( '[data-id="sw01"] .rf-sw__slot.is-active h2' );
			if ( ! h ) {
				return 'no heading';
			}
			const r = h.getBoundingClientRect();
			const hit = document.elementFromPoint( r.left + 5, r.top + ( r.height / 2 ) );
			return { w: Math.round( r.width ), x: Math.round( r.left ), y: Math.round( r.top ), hit: hit && hit.className, ok: !! ( hit && hit.closest( '.refraction-widget-heading' ) ), vis: getComputedStyle( h ).visibility, op: getComputedStyle( h.closest( '.e-con' ) ).opacity };
		} );
		check( 'editor', 'the slide\'s text shows in Edit Mode, above the grain and the blob', edText.ok, JSON.stringify( edText ) );
		await e.evaluate( () => {
			const w = refraction.getContainer( 'sw01' );
			$e.run( 'document/elements/settings', { container: w, settings: { sw_grain_where: 'shape' } } );
			$e.run( 'document/elements/settings', { container: w.repeaters.slides.children[ 0 ], settings: { sw_blob_layer: 'back', sw_blob_style: 'solid' } } );
		} );
		await sleep( 2500 );
		sw = await swState( frame );
		check( 'editor', 'changing Grain to "only on the shapes" and slide 1 to behind / solid shows at once', sw.every( ( x ) => ! x.slotGrain ) && '1' === sw[ 0 ].z && 'rgb(246, 201, 74)' === sw[ 0 ].fill && sw[ 0 ].shapeGrain.startsWith( 'url(' ), JSON.stringify( sw ) );
		const swPanel = await e.evaluate( () => {
			const c = window.refraction.widgetsCache[ 'refraction-showcase-wheel' ]?.controls || {};
			const fields = Object.keys( c.slides?.fields || {} );
			return { missing: [ 'sw_blob_layer', 'sw_blob_style', 'sw_blob_line', 'sw_blob_line_width', 'sw_blob_line_shape', 'sw_blob_morph', 'sw_blob_morph_source', 'sw_blob_morph_shape', 'sw_blob_morph_mine', 'sw_blob_morph_mine_upload', 'sw_blob_morph_ms' ].filter( ( n ) => ! fields.includes( n ) ), grain: !! c.sw_grain_where };
		} );
		check( 'editor', 'Showcase Wheel slides have the shared look and morph settings, and the widget a Grain section', ! swPanel.missing.length && swPanel.grain, JSON.stringify( swPanel ) );
		await e.screenshot( { path: join( SHOTS, 'editor-wheel-blob.png' ) } );

		frame = await open( conPage.id );
		const conPanel = await e.evaluate( () => {
			const c = window.refraction.documents.getCurrent().container.children[ 0 ].controls;
			return { morph: [ 'rf_blob_morph', 'rf_blob_morph_source', 'rf_blob_morph_shape', 'rf_blob_morph_mine', 'rf_blob_morph_mine_upload', 'rf_blob_morph_ms' ].filter( ( n ) => ! c[ n ] ), grainSection: c.rf_blob_grain?.section, fillSection: c.rf_grain?.section, amountShown: !! c.rf_grain_amount?.conditions };
		} );
		check( 'editor', 'containers: Morph On Hover settings in Deco Blob; "Only On The Deco Blob Shape" next to "On The Container Fill" in Grain; the grain settings show for either', ! conPanel.morph.length && 'section_rf_grain' === conPanel.grainSection && 'section_rf_grain' === conPanel.fillSection && conPanel.amountShown, JSON.stringify( conPanel ) );
		const ed = await frame.evaluate( () => {
			const el = document.querySelector( '[data-id="con001"]' );
			const g = el.querySelector( '.rf-ofx-blob > .rf-ofx-grain' );
			return g ? getComputedStyle( g ).opacity : '';
		} );
		check( 'editor', 'the container blob\'s grain shows in Edit Mode with its amount', '0.7' === ed, ed );

		check( 'site', 'no JavaScript errors', ! errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart );
		check( 'site', 'no PHP errors', ! /PHP (Fatal|Warning|Parse|Notice|Deprecated)/.test( php ), php.slice( 0, 600 ) );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } failed` : '\nall passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
