#!/usr/bin/env node
/**
 * Showcase Wheel (0.113.0, SQLite test site, Chromium). On the site: each slide in its own container's background,
 * content and picture on the sides chosen per slide, the arc in a corner, ring or Deco Blob shape (built-in or uploaded) behind the picture; the thumbnails (shape behind the
 * current one, raised, label and badge; circle, labels under all, position, arrows); the wheel motion half way (both
 * pictures turning) and the slide transition; thumbnails, arrows, keys, playing by itself, reduced motion and a phone.
 * In Edit Mode: the same showcase, the slide picked in the panel, a per-slide side changed at once, Add Slide.
 *
 * Usage: node scripts/check-showcase-wheel.mjs [--site /tmp/rf-sw-site] [--port 8946] [--shots /tmp/showcase-wheel-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-sw-site' );
const PORT = arg( 'port', '8946' );
const SHOTS = arg( 'shots', '/tmp/showcase-wheel-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 500 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	if ( process.env.CHROMIUM ) {
		return process.env.CHROMIUM;
	}
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

function wp( args, { allowFail = false } = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		if ( allowFail ) {
			return null;
		}
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => {
	try {
		await fetch( `${ BASE }/wp-login.php` ); return true;
	} catch {
		return false;
	}
};

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

let uid = 0;
const id = () => 'sw' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const heading = ( title ) => ( { id: id(), elType: 'widget', widgetType: 'heading', settings: { title, header_size: 'h2' }, elements: [] } );
const tints = [ '#F2F4F7', '#F4F2EE', '#EEF3F1' ];
const slide = ( n ) => box( id(), {
	_title: `Slide #${ n }`, flex_direction: 'row', flex_align_items: 'center', min_height: { unit: 'px', size: 460 },
	padding: { unit: 'px', top: '40', right: '40', bottom: '110', left: '40', isLinked: false },
	background_background: 'classic', background_color: tints[ ( n - 1 ) % 3 ],
}, [ box( id(), { _title: 'Content', width: { unit: '%', size: 46 } }, [ heading( `Slide ${ n } title` ) ], true ) ], true );

/** Three test pictures (a coloured plate on a transparent ground) in the media library: [ { id, url } ]. */
function pictures() {
	const dir = join( SITE, 'sw-pictures' );
	mkdirSync( dir, { recursive: true } );
	execFileSync( 'python3', [ '-I', '-c', [
		'import sys',
		'from PIL import Image, ImageDraw',
		'for i, c in enumerate([(120,90,70),(230,200,150),(120,190,110)]):',
		'    im = Image.new("RGBA", (600, 600), (0, 0, 0, 0))',
		'    d = ImageDraw.Draw(im)',
		'    d.ellipse((40, 40, 560, 560), fill=(30, 30, 30, 255))',
		'    d.ellipse((90, 90, 510, 510), fill=c + (255,))',
		'    d.rectangle((280, 60, 320, 200), fill=(250, 250, 250, 255))',
		'    im.save(sys.argv[1] + "/pic%d.png" % (i + 1))',
	].join( '\n' ), dir ] );

	return [ 1, 2, 3 ].map( ( n ) => {
		const mediaId = wp( [ 'media', 'import', join( dir, `pic${ n }.png` ), '--porcelain' ] ).trim();
		return { id: Number( mediaId ), url: wp( [ 'eval', `echo wp_get_attachment_url( ${ mediaId } );` ] ).trim() };
	} );
}

const wheel = ( pics, settings = {}, n = 3 ) => [ box( id(), { content_width: 'boxed', boxed_width: { unit: 'px', size: 1100 }, padding: { unit: 'px', top: '30', right: '20', bottom: '30', left: '20', isLinked: false } }, [ {
	id: id(), elType: 'widget', widgetType: 'refraction-showcase-wheel',
	settings: {
		slides: Array.from( { length: n }, ( _, i ) => ( {
			_id: id(), slide_title: [ 'Saloon', 'Estate', 'People carrier' ][ i % 3 ], badge: [ '£45', '£55', '£70' ][ i % 3 ],
			image: { id: pics[ i % 3 ].id, url: pics[ i % 3 ].url }, side: 1 === i ? 'right' : 'left',
			deco: [ 'arc', 'blob', '' ][ i % 3 ], deco_color: '#FFFFFF',
		} ) ),
		autoplay: '', duration: 700, ...settings,
	},
	elements: Array.from( { length: n }, ( _, i ) => slide( i + 1 ) ),
} ] ) ];

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

	try {
		const pics = pictures();
		const main1 = page( 'Showcase wheel', wheel( pics ) );
		const variant = page( 'Showcase wheel circle right', wheel( pics, { thumb_shape: 'circle', nav_position: 'right', labels: 'all', arrows: 'both', transition: 'slide' } ) );
		// 0.115.0: an arc in a corner (a quarter circle), the Deco Blob shapes (built-in and uploaded), thumbnail spacing and shape box.
		wp( [ 'option', 'update', 'refraction_my_shapes', JSON.stringify( { 'my-kite': { name: 'Kite', d: 'M5 0L10 5L5 10L0 5Z', vb: '0 0 10 10', rule: 'nonzero' } } ), '--format=json' ] );
		const blob3 = wp( [ 'eval', 'echo \\Refraction\\Modules\\OrganicFx\\Classes\\Pure_Organic::path( "blob-3" );' ] ).trim();
		const decorated = wheel( pics, { label_gap: { unit: 'px', size: 20 }, shape_width: { unit: 'px', size: 120 }, shape_height: { unit: 'px', size: 90 }, shape_x: { unit: 'px', size: 10 }, shape_y: { unit: 'px', size: -6 } } );
		decorated[ 0 ].elements[ 0 ].settings.corner_size = { unit: 'px', size: 200 };
		decorated[ 0 ].elements[ 0 ].settings.corner_width = { unit: 'px', size: 40 };
		Object.assign( decorated[ 0 ].elements[ 0 ].settings.slides[ 0 ], { deco: 'corner', arc_corner: 'auto', deco_color: '#FF0000' } );
		Object.assign( decorated[ 0 ].elements[ 0 ].settings.slides[ 1 ], { deco: 'blob', sw_blob_source: 'builtin', sw_blob_pick: 'blob-3' } );
		Object.assign( decorated[ 0 ].elements[ 0 ].settings.slides[ 2 ], { deco: 'blob', sw_blob_source: 'mine', sw_blob_mine: 'my-kite' } );
		const decoPage = page( 'Showcase wheel corner arc and shapes', decorated );
		// 0.116.0: the content coming in, one widget after another.
		const withTwo = wheel( pics, { content_motion: 'fade-up', content_stagger: 'yes', content_gap: 150, content_delay: 100, content_duration: 600, content_distance: 50 } );
		withTwo[ 0 ].elements[ 0 ].elements.forEach( ( sl, k ) => sl.elements[ 0 ].elements.push( { id: id(), elType: 'widget', widgetType: 'text-editor', settings: { editor: `<p>Text ${ k + 1 }</p>` }, elements: [] } ) );
		const contentPage = page( 'Showcase wheel content motion', withTwo );
		// 0.119.0: floating images, the picture moved, the shape's own style and motion, thumbnail width and height.
		const extras = wheel( pics, { thumb_size: { unit: 'px', size: 90 }, thumb_height: { unit: 'px', size: 40 } } );
		Object.assign( extras[ 0 ].elements[ 0 ].settings.slides[ 0 ], {
			pic_x: { unit: '%', size: 10 },
			deco: 'blob', sw_blob_source: 'builtin', sw_blob_pick: 'blob-2', deco_motion: 'spin', deco_color: '#FF0000', deco_x: { unit: 'px', size: 20 },
			float_count: '2',
			fl1_type: 'icon', fl1_icon: { value: 'fas fa-star', library: 'fa-solid' }, fl1_x: { unit: '%', size: 20 }, fl1_y: { unit: '%', size: 30 }, fl1_size: { unit: 'px', size: 40 }, fl1_motion: 'bob', fl1_color: '#00AA00',
			fl2_type: 'image', fl2_image: { id: pics[ 1 ].id, url: pics[ 1 ].url }, fl2_x: { unit: '%', size: 80 }, fl2_y: { unit: '%', size: 70 }, fl2_size: { unit: 'px', size: 80 }, fl2_layer: 'back', fl2_motion: '',
		} );
		const extrasPage = page( 'Showcase wheel floating images', extras );
		const stillPage = page( 'Showcase wheel content still', wheel( pics, { content_motion: 'none' } ) );
		const auto = page( 'Showcase wheel auto', wheel( pics, { autoplay: 'yes', interval: 1200, duration: 300, pause_on_hover: '' } ) );

		const ctx = await browser.newContext( { viewport: { width: 1280, height: 900 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		p.on( 'console', ( m ) => {
			if ( 'error' === m.type() && ! /favicon|Failed to load resource/.test( m.text() ) ) {
				errors.push( m.text() );
			}
		} );
		const shot = async ( name ) => {
			const el = await p.$( '.rf-sw' );
			if ( el ) {
				await el.screenshot( { path: join( SHOTS, name ) } );
			}
		};
		const state = () => p.evaluate( () => {
			const root = document.querySelector( '.rf-sw' );
			const slots = [ ...root.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' ) ];
			const active = slots.findIndex( ( s ) => s.classList.contains( 'is-active' ) );
			const slot = slots[ active ];
			const rect = ( el ) => el && el.getBoundingClientRect();
			const con = slot.querySelector( ':scope > .e-con' );
			const content = con.querySelector( '.e-con' );
			const pic = slot.querySelector( '.rf-sw__picture' );
			const thumbs = [ ...root.querySelectorAll( '.rf-sw__thumb' ) ];
			const shown = ( el ) => !! el && 'none' !== getComputedStyle( el ).display;
			return {
				active,
				visible: slots.map( ( s ) => 'visible' === getComputedStyle( s ).visibility ),
				background: getComputedStyle( con ).backgroundColor,
				pictureSide: rect( pic ).left + ( rect( pic ).width / 2 ) > rect( con ).left + ( rect( con ).width / 2 ) ? 'right' : 'left',
				contentSide: rect( content ).left + ( rect( content ).width / 2 ) > rect( con ).left + ( rect( con ).width / 2 ) ? 'right' : 'left',
				deco: [ 'arc', 'blob' ].find( ( kind ) => slot.querySelector( `.rf-sw__deco--${ kind }` ) ) || '',
				arcWidth: slot.querySelector( '.rf-sw__deco--arc' ) ? getComputedStyle( slot.querySelector( '.rf-sw__deco--arc' ) ).borderTopWidth : '',
				thumbActive: thumbs.findIndex( ( t ) => t.classList.contains( 'is-active' ) ),
				shape: thumbs[ active ] ? getComputedStyle( thumbs[ active ], '::before' ).backgroundColor : '',
				shapeRadius: thumbs[ active ] ? getComputedStyle( thumbs[ active ], '::before' ).borderTopLeftRadius : '',
				labels: thumbs.map( ( t ) => shown( t.querySelector( '.rf-sw__label' ) ) ),
				badges: thumbs.map( ( t ) => ( shown( t.querySelector( '.rf-sw__badge' ) ) ? t.querySelector( '.rf-sw__badge' ).textContent : '' ) ),
				lift: thumbs[ active ] ? Math.round( rect( thumbs[ active ] ).bottom - rect( thumbs[ ( active + 1 ) % thumbs.length ] ).bottom ) : 0,
			};
		} );

		// ------------------------------------------------------------ on the site
		await p.goto( main1.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );
		await p.waitForTimeout( 400 );
		let st = await state();
		check( 'site', 'slide 1 shows (the others hidden), in its own container\'s background', 0 === st.active && 'true,false,false' === st.visible.join() && 'rgb(242, 244, 247)' === st.background, JSON.stringify( st ) );
		check( 'site', 'its content is on the left and its picture on the right, an arc behind it (70px thick)', 'left' === st.contentSide && 'right' === st.pictureSide && 'arc' === st.deco && '70px' === st.arcWidth, JSON.stringify( st ) );
		check( 'thumbs', 'the current thumbnail stands on a rounded shape, raised, with its label and badge; the others without', 0 === st.thumbActive && 'rgba(0, 0, 0, 0)' !== st.shape && '16px' === st.shapeRadius && st.lift < -5 && 'true,false,false' === st.labels.join() && '£45,,' === st.badges.join(), JSON.stringify( st ) );
		await shot( 'slide-1.png' );

		// The next arrow: the wheel turns the old picture out and the new one in.
		await p.click( '.rf-sw__next' );
		await p.waitForTimeout( 250 );
		const mid = await p.evaluate( () => {
			const slots = [ ...document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' ) ];
			const turn = ( slot ) => getComputedStyle( slot.querySelector( '.rf-sw__picture' ) ).transform;
			return { leaving: slots[ 0 ].classList.contains( 'is-leaving' ) && 'visible' === getComputedStyle( slots[ 0 ] ).visibility, outTurn: turn( slots[ 0 ] ), inTurn: turn( slots[ 1 ] ), running: document.getAnimations().filter( ( a ) => 'running' === a.playState ).length };
		} );
		await shot( 'wheel-mid.png' );
		check( 'motion', 'half way both pictures are turning on the wheel (rotated) while slide 1 fades out', mid.leaving && /matrix/.test( mid.outTurn ) && /matrix/.test( mid.inTurn ) && mid.running >= 2, JSON.stringify( mid ) );
		await p.waitForTimeout( 800 );
		st = await state();
		check( 'motion', 'then slide 2 shows, its content on the right and its picture on the left, with its blob', 1 === st.active && 'right' === st.contentSide && 'left' === st.pictureSide && 'blob' === st.deco && 1 === st.thumbActive, JSON.stringify( st ) );
		check( 'motion', 'nothing left moving', 0 === ( await p.evaluate( () => document.querySelectorAll( '.rf-sw__slot.is-leaving' ).length ) ) );
		await shot( 'slide-2.png' );

		await p.click( '.rf-sw__thumb[data-index="2"]' );
		await p.waitForTimeout( 900 );
		check( 'thumbs', 'clicking the third thumbnail shows slide 3', 2 === ( await state() ).active );
		await p.focus( '.rf-sw' );
		await p.keyboard.press( 'ArrowRight' );
		await p.waitForTimeout( 900 );
		check( 'site', 'the right arrow key goes round to slide 1', 0 === ( await state() ).active );

		// ------------------------------------------------------------ circle, labels under all, both arrows, on the right
		await p.goto( variant.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );
		const v = await p.evaluate( () => {
			const nav = document.querySelector( '.rf-sw__nav' );
			const img = document.querySelector( '.rf-sw__thumb.is-active .rf-sw__thumb-img' );
			const thumbs = document.querySelector( '.rf-sw__thumbs' ).getBoundingClientRect();
			const root = document.querySelector( '.rf-sw' ).getBoundingClientRect();
			return {
				justify: getComputedStyle( nav ).justifyContent,
				nearRight: root.right - thumbs.right < 200,
				circle: getComputedStyle( img, '::before' ).borderTopLeftRadius,
				labels: [ ...document.querySelectorAll( '.rf-sw__label' ) ].every( ( l ) => 'none' !== getComputedStyle( l ).display ),
				arrows: document.querySelectorAll( '.rf-sw__arrow' ).length,
			};
		} );
		check( 'options', 'thumbnails on the right, a circle behind the current one, labels under every thumbnail, both arrows', 'flex-end' === v.justify && v.nearRight && '50%' === v.circle && v.labels && 2 === v.arrows, JSON.stringify( v ) );
		// ------------------------------------------------------------ floating images, picture position, shape style
		await p.goto( extrasPage.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );
		await p.waitForTimeout( 500 );
		const fx = await p.evaluate( () => {
			const slot = document.querySelector( '.rf-sw__slots > .rf-sw__slot' );
			const picture = slot.querySelector( '.rf-sw__picture' );
			const box = picture.getBoundingClientRect();
			const at = ( el ) => {
				const r = el.getBoundingClientRect();
				return [ Math.round( ( ( r.left + ( r.width / 2 ) ) - box.left ) / box.width * 100 ), Math.round( ( ( r.top + ( r.height / 2 ) ) - box.top ) / box.height * 100 ) ];
			};
			const f1 = slot.querySelector( '.rf-sw__float--1' );
			const f2 = slot.querySelector( '.rf-sw__float--2' );
			const img = slot.querySelector( '.rf-sw__img' );
			const thumb = document.querySelector( '.rf-sw__thumb-img' ).getBoundingClientRect();
			const deco = slot.querySelector( '.rf-sw__deco' );
			return {
				floats: slot.querySelectorAll( '.rf-sw__float' ).length,
				f1: at( f1 ), f1Icon: !! f1.querySelector( 'i, svg' ), f1Color: getComputedStyle( f1 ).color, f1Anim: getComputedStyle( f1.querySelector( '.rf-sw__float-in' ) ).animationName,
				f2: at( f2 ), f2Behind: !! f2.compareDocumentPosition( img ) && ( f2.compareDocumentPosition( img ) & Node.DOCUMENT_POSITION_FOLLOWING ) && Number( getComputedStyle( f2 ).zIndex ) < Number( getComputedStyle( img ).zIndex ),
				picMove: getComputedStyle( picture ).translate,
				thumb: Math.round( thumb.width ) + 'x' + Math.round( thumb.height ),
				decoColor: getComputedStyle( deco ).color, decoAnim: getComputedStyle( deco ).animationName, decoMove: getComputedStyle( deco ).translate,
			};
		} );
		check( 'floating', 'a slide\'s floating images: an icon at 20% / 30% of the picture\'s space (its own color, floating up and down) and a picture at 80% / 70% behind the slide\'s picture', 2 === fx.floats && Math.abs( fx.f1[ 0 ] - 20 ) <= 2 && Math.abs( fx.f1[ 1 ] - 30 ) <= 2 && fx.f1Icon && 'rgb(0, 170, 0)' === fx.f1Color && 'rf-sw-bob' === fx.f1Anim && Math.abs( fx.f2[ 0 ] - 80 ) <= 2 && Math.abs( fx.f2[ 1 ] - 70 ) <= 2 && fx.f2Behind, JSON.stringify( fx ) );
		check( 'picture', 'the slide\'s picture is moved 10% across (its own setting)', /^10%/.test( fx.picMove ), fx.picMove );
		check( 'shape', 'the shape\'s Style tab (red, moved 20px) and its Content tab animation (turning) apply', 'rgb(255, 0, 0)' === fx.decoColor && 'rf-sw-deco-spin' === fx.decoAnim && /^20px/.test( fx.decoMove ), JSON.stringify( fx ) );
		check( 'thumbs', 'thumbnail width and height: 90 x 40', '90x40' === fx.thumb, fx.thumb );
		await shot( 'floating.png' );

		// ------------------------------------------------------------ the content coming in
		const contentAnims = () => p.evaluate( () => {
			const slot = document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' )[ 1 ];
			return document.getAnimations().filter( ( a ) => a.effect && a.effect.target && a.effect.target !== slot && slot.contains( a.effect.target ) && ! a.effect.target.closest( '.rf-sw__visual' ) ).map( ( a ) => {
				const t = a.effect.getTiming();
				const first = a.effect.getKeyframes()[ 0 ];
				return { what: a.effect.target.dataset.widget_type || a.effect.target.className.split( ' ' )[ 0 ], delay: t.delay, duration: t.duration, from: first.transform || '' };
			} );
		} );
		await p.goto( contentPage.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );
		await p.click( '.rf-sw__next' );
		await p.waitForTimeout( 60 );
		const rising = await contentAnims();
		const midContent = await p.evaluate( () => {
			const w = document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' )[ 1 ].querySelector( '.refraction-widget-text-editor' );
			return Number( getComputedStyle( w ).opacity );
		} );
		check( 'content', 'moving on, the new slide\'s content rises in one widget after another: the heading at 100 ms, the text 150 ms later, 600 ms each, from 50px lower', 2 === rising.length && 100 === rising[ 0 ].delay && 250 === rising[ 1 ].delay && 600 === rising[ 0 ].duration && /translateY\(50px\)/.test( rising[ 0 ].from ) && midContent < 0.05, JSON.stringify( { rising, midContent } ) );
		await p.waitForTimeout( 1300 );
		const settled = await p.evaluate( () => [ ...document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' )[ 1 ].querySelectorAll( '.refraction-widget' ) ].map( ( w ) => getComputedStyle( w ).opacity + ' ' + getComputedStyle( w ).transform ) );
		check( 'content', 'then it rests in place, fully shown', settled.length && settled.every( ( x ) => '1 none' === x ), JSON.stringify( settled ) );
		await p.goto( stillPage.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );
		await p.click( '.rf-sw__next' );
		await p.waitForTimeout( 60 );
		check( 'content', '"None": the content only fades with its slide (no animation of its own)', 0 === ( await contentAnims() ).length, JSON.stringify( await contentAnims() ) );

		// ------------------------------------------------------------ arc in a corner, shapes, thumbnail spacing and shape box
		await p.goto( decoPage.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );
		const deco = await p.evaluate( () => {
			const slots = [ ...document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' ) ];
			const arc = slots[ 0 ].querySelector( '.rf-sw__corner' );
			const r = arc && arc.getBoundingClientRect();
			const sr = slots[ 0 ].getBoundingClientRect();
			const ring = arc && getComputedStyle( arc.querySelector( '.rf-sw__corner-ring' ) );
			const path = ( k ) => slots[ k ].querySelector( '.rf-sw__deco--blob path' );
			const thumb = document.querySelector( '.rf-sw__thumb.is-active' );
			const before = getComputedStyle( thumb, '::before' );
			return {
				corner: r ? ( Math.abs( r.right - sr.right ) < 2 && Math.abs( r.top - sr.top ) < 2 ? 'top right' : 'elsewhere' ) : '',
				box: r ? Math.round( r.width ) + 'x' + Math.round( r.height ) : '',
				ring: ring ? ring.borderTopWidth + ' ' + ring.borderTopColor + ' ' + ring.borderTopLeftRadius + ' ' + Math.round( parseFloat( ring.width ) ) : '',
				builtin: path( 1 ) ? path( 1 ).getAttribute( 'd' ) : '',
				mine: path( 2 ) ? path( 2 ).getAttribute( 'd' ) : '',
				mineBox: path( 2 ) ? path( 2 ).closest( 'svg' ).getAttribute( 'viewBox' ) : '',
				gap: getComputedStyle( thumb ).rowGap,
				shapeW: before.width,
				shapeH: before.height,
				shapeMove: before.transform,
			};
		} );
		check( 'corner arc', 'a slide set to "An arc in a corner" shows a quarter of a 200px circle (a 40px red ring centred on the corner) in the top corner on its picture\'s side', 'top right' === deco.corner && '200x200' === deco.box && '40px rgb(255, 0, 0) 50% 400' === deco.ring, JSON.stringify( deco ) );
		check( 'shapes', 'the shape behind the picture is a Deco Blob shape: a built-in one (Blob: bean) and an uploaded one (My Shapes, its own viewBox)', deco.builtin === blob3 && 'M5 0L10 5L5 10L0 5Z' === deco.mine && '0 0 10 10' === deco.mineBox, JSON.stringify( { builtin: deco.builtin.slice( 0, 40 ), blob3: blob3.slice( 0, 40 ), mine: deco.mine, box: deco.mineBox } ) );
		// A matrix moving by (-50% of 120 + 10, -50% of 90 - 6) = (-50, -51).
		check( 'thumbs', 'thumbnail settings: 20px between picture and label; the shape 120 x 90, moved 10px across and 6px up from its centre', '20px' === deco.gap && '120px' === deco.shapeW && '90px' === deco.shapeH && /matrix\(1, 0, 0, 1, -50, -51\)/.test( deco.shapeMove ), JSON.stringify( deco ) );
		await shot( 'corner-arc-shapes.png' );
		await p.goto( variant.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );

		await p.click( '.rf-sw__next' );
		await p.waitForTimeout( 200 );
		const slideMid = await p.evaluate( () => getComputedStyle( document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' )[ 1 ].querySelector( '.rf-sw__picture' ) ).transform );
		check( 'options', '"Slide": the new picture slides across (moved, not turned)', /matrix\(1, 0, 0, 1, [\d.-]+/.test( slideMid ) && ! /matrix\(1, 0, 0, 1, 0, 0\)/.test( slideMid ), slideMid );
		await p.waitForTimeout( 900 );
		await shot( 'circle-right.png' );

		// ------------------------------------------------------------ playing by itself; reduced motion; a phone
		await p.goto( auto.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-sw.is-ready' );
		await p.mouse.move( 5, 5 );
		await p.waitForTimeout( 2000 );
		check( 'autoplay', 'playing by itself it has moved on', 0 !== ( await state() ).active );

		const rctx = await browser.newContext( { viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		await r.goto( main1.url, { waitUntil: 'load' } );
		await r.waitForSelector( '.rf-sw.is-ready' );
		await r.click( '.rf-sw__next' );
		const instant = await r.evaluate( () => ( { anims: document.getAnimations().filter( ( a ) => 'running' === a.playState ).length, active: [ ...document.querySelectorAll( '.rf-sw__slot' ) ].findIndex( ( s ) => s.classList.contains( 'is-active' ) ) } ) );
		check( 'motion', 'with reduced motion it changes at once, without animating', 0 === instant.anims && 1 === instant.active, JSON.stringify( instant ) );
		await rctx.close();

		const mctx = await browser.newContext( { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } );
		const m = await mctx.newPage();
		await m.goto( main1.url, { waitUntil: 'load' } );
		await m.waitForSelector( '.rf-sw.is-ready' );
		const phone = await m.evaluate( () => {
			const slot = document.querySelector( '.rf-sw__slot.is-active' );
			const pic = slot.querySelector( '.rf-sw__visual' ).getBoundingClientRect();
			const content = slot.querySelector( ':scope > .e-con .e-con' ).getBoundingClientRect();
			const nav = document.querySelector( '.rf-sw__thumb.is-active' ).getBoundingClientRect();
			return { above: pic.bottom <= content.top + 20, clearOfThumbs: content.bottom <= nav.top, overflow: document.documentElement.scrollWidth - innerWidth };
		} );
		check( 'phone', 'on a phone the picture sits above the content and the content above the thumbnails, nothing scrolls sideways', phone.above && phone.clearOfThumbs && phone.overflow <= 0, JSON.stringify( phone ) );
		await m.screenshot( { path: join( SHOTS, 'phone.png' ) } );
		await mctx.close();

		// ------------------------------------------------------------ Edit Mode
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ main1.id }&action=refraction`, { timeout: 120000 } );
		await p.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await p.waitForTimeout( 2500 );
		const frame = p.frame( { name: 'refraction-preview-iframe' } ) || p.frames().find( ( f ) => f.url().includes( 'refraction-preview' ) ) || p.frames()[ 1 ];
		await frame.waitForSelector( '.rf-sw.is-ready', { timeout: 20000 } );
		const edState = () => frame.evaluate( () => {
			const root = document.querySelector( '.rf-sw' );
			const slots = [ ...root.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' ) ];
			const active = slots.findIndex( ( s ) => s.classList.contains( 'is-active' ) );
			const slot = slots[ active ];
			const con = slot.querySelector( ':scope > .e-con' );
			const pic = slot.querySelector( '.rf-sw__picture' ).getBoundingClientRect();
			const c = con.getBoundingClientRect();
			return {
				slots: slots.length,
				filled: slots.every( ( s ) => !! s.querySelector( ':scope > .e-con > .e-con, :scope > .e-con > .e-con-inner > .e-con' ) ),
				active,
				pictureSide: pic.left + ( pic.width / 2 ) > c.left + ( c.width / 2 ) ? 'right' : 'left',
				thumbs: root.querySelectorAll( '.rf-sw__thumb' ).length,
			};
		} );
		const widget = () => p.evaluateHandle( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			return find( refraction.getPreviewContainer() ).find( ( c ) => 'refraction-showcase-wheel' === c.model.get( 'widgetType' ) );
		} );
		let ed = await edState();
		check( 'editor', 'Edit Mode shows the same showcase: 3 slots each holding its slide container, slide 1 with its picture on the right, 3 thumbnails', 3 === ed.slots && ed.filled && 0 === ed.active && 'right' === ed.pictureSide && 3 === ed.thumbs, JSON.stringify( ed ) );
		let w = await widget();
		await p.evaluate( ( c ) => {
			c.model.get( 'editSettings' ).set( 'activeItemIndex', 2 );
		}, w );
		await p.waitForTimeout( 120 );
		const edContent = await frame.evaluate( () => {
			const slot = document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' )[ 1 ];
			return document.getAnimations().filter( ( a ) => a.effect && a.effect.target && a.effect.target !== slot && slot.contains( a.effect.target ) && ! a.effect.target.closest( '.rf-sw__visual' ) ).length;
		} );
		await p.waitForTimeout( 1200 );
		ed = await edState();
		check( 'editor', 'picking slide 2 in the panel shows it, its picture on the left, its content coming in as on the site', 1 === ed.active && 'left' === ed.pictureSide && edContent >= 1, JSON.stringify( { ed, edContent } ) );
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 1 ], settings: { side: 'left' } } );
		}, w );
		await p.waitForTimeout( 1500 );
		ed = await edState();
		check( 'editor', 'setting slide 2\'s content to the left in the slide list moves its picture to the right at once', 1 === ed.active && 'right' === ed.pictureSide && ed.filled, JSON.stringify( ed ) );
		// The new settings show in Edit Mode at once.
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 1 ], settings: { deco: 'corner', arc_corner: 'bottom-left' } } );
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 2 ], settings: { deco: 'blob', sw_blob_source: 'mine', sw_blob_mine: 'my-kite' } } );
			$e.run( 'document/elements/settings', { container: c, settings: { label_gap: { unit: 'px', size: 14 }, shape_width: { unit: 'px', size: 100 } } } );
		}, w );
		await p.waitForTimeout( 1800 );
		const edDeco = await frame.evaluate( () => {
			const slots = [ ...document.querySelectorAll( '.rf-sw__slots > .rf-sw__slot' ) ];
			const arc = slots[ 1 ].querySelector( '.rf-sw__corner' );
			const path = slots[ 2 ].querySelector( '.rf-sw__deco--blob path' );
			const thumb = document.querySelector( '.rf-sw__thumb.is-active' );
			return {
				corner: arc ? [ 'top-left', 'top-right', 'bottom-left', 'bottom-right' ].find( ( c ) => arc.classList.contains( 'rf-sw__corner--' + c ) ) : '',
				mine: path ? path.getAttribute( 'd' ) : '',
				gap: getComputedStyle( thumb ).rowGap,
				shapeW: getComputedStyle( thumb, '::before' ).width,
			};
		} );
		check( 'editor', 'in Edit Mode a slide\'s arc in a corner (bottom left), an uploaded shape, the label spacing and the shape width show at once', 'bottom-left' === edDeco.corner && 'M5 0L10 5L5 10L0 5Z' === edDeco.mine && '14px' === edDeco.gap && '100px' === edDeco.shapeW, JSON.stringify( edDeco ) );
		const panel = await p.evaluate( ( c ) => {
			$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
			return new Promise( ( done ) => setTimeout( () => {
				const rows = document.querySelectorAll( '.refraction-control-slides .refraction-repeater-row-item-title' );
				if ( rows[ 2 ] ) {
					rows[ 2 ].click();
				}
				setTimeout( () => done( {
					tabs: [ ...document.querySelectorAll( '.refraction-control-sw_blob_source label' ) ].map( ( l ) => l.textContent.trim() ).join( '/' ),
					upload: !! document.querySelector( '.refraction-control-sw_blob_mine_upload button' ),
					tiles: document.querySelectorAll( '.refraction-control-sw_blob_mine .refraction-visual-choice-option, .refraction-control-sw_blob_mine input[type=radio]' ).length,
				} ), 700 );
			}, 900 ) );
		}, w );
		check( 'editor', 'each slide\'s shape has the Deco Blob pickers: Built-in / Uploaded, "Upload or manage", and the uploaded shapes as tiles', /Built-in/.test( panel.tabs ) && /Uploaded/.test( panel.tabs ) && panel.upload && panel.tiles >= 1, JSON.stringify( panel ) );
		// The panel: the shape's Content / Style tabs, its color under Style; the shape pickers show 12 and scroll.
		const panel2 = await p.evaluate( async ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 0 ], settings: { deco: 'blob', sw_blob_source: 'builtin' } } );
			$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
			await new Promise( ( r ) => setTimeout( r, 700 ) );
			const row = document.querySelector( '.refraction-control-slides .refraction-repeater-row-item-title' );
			if ( row ) {
				row.click();
			}
			await new Promise( ( r ) => setTimeout( r, 800 ) );
			const tabs = [ ...document.querySelectorAll( '.refraction-control-deco_tabs .refraction-control-type-tab, .refraction-control-deco_tabs [class*="refraction-control-deco_tab_"]' ) ].map( ( t ) => t.textContent.trim() );
			const shown = ( n ) => { const el = document.querySelector( '.refraction-control-' + n ); return !! ( el && el.offsetParent ); };
			// Inside the tabs each setting keeps its own condition (a shape: no Corner; Built-in: no uploaded list).
			const conditions = { corner: shown( 'arc_corner' ), builtin: shown( 'sw_blob_pick' ), uploaded: shown( 'sw_blob_mine' ) };
			const grid = document.querySelector( '.refraction-control-sw_blob_pick .refraction-visual-choice-choices' );
			const tile = grid && grid.querySelector( '.refraction-visual-choice-element' );
			const picker = {
				tiles: grid ? grid.querySelectorAll( '.refraction-visual-choice-element' ).length : 0,
				rowsShown: grid && tile ? Math.round( grid.clientHeight / ( tile.getBoundingClientRect().height + 8 ) * 10 ) / 10 : 0,
				scrolls: grid ? grid.scrollHeight > grid.clientHeight + 4 : false,
			};
			const styleTab = document.querySelector( '.refraction-control-deco_tab_style' );
			if ( styleTab ) {
				styleTab.click();
			}
			await new Promise( ( r ) => setTimeout( r, 300 ) );
			const color = document.querySelector( '.refraction-control-deco_color' );
			return {
				tabs,
				colorShown: !! ( color && color.offsetParent ),
				colorLabel: color ? color.querySelector( '.refraction-control-title' ).textContent.trim() : '',
				conditions,
				...picker,
			};
		}, w );
		check( 'editor', 'each slide\'s shape has Content and Style tabs; its color (no longer "Its color") is under Style', panel2.tabs.join( '/' ).includes( 'Content' ) && panel2.tabs.join( '/' ).includes( 'Style' ) && panel2.colorShown && 'Color' === panel2.colorLabel, JSON.stringify( panel2 ) );
		check( 'editor', 'inside the tabs each setting keeps its own condition: for a shape, no Corner; with Built-in, the built-in shapes and not the uploaded ones', ! panel2.conditions.corner && panel2.conditions.builtin && ! panel2.conditions.uploaded, JSON.stringify( panel2.conditions ) );
		check( 'editor', 'the shape picker shows 12 shapes (3 rows) and scrolls for the rest', panel2.tiles > 12 && panel2.scrolls && panel2.rowsShown >= 2.8 && panel2.rowsShown <= 3.3, JSON.stringify( panel2 ) );

		// Dragging a floating image and the picture writes the slide's own settings.
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 1 ], settings: { float_count: '1', fl1_type: 'icon', fl1_icon: { value: 'fas fa-star', library: 'fa-solid' }, fl1_size: { unit: 'px', size: 48 } } } );
			c.model.get( 'editSettings' ).set( 'activeItemIndex', 2 );
		}, w );
		await p.waitForTimeout( 2000 );
		const dragOf = async ( selector, dx, dy ) => {
			// Playwright gives a frame element's box in the page's own coordinates.
			const box = await ( await frame.$( `.rf-sw__slot.is-active ${ selector }` ) ).boundingBox();
			const sx = box.x + ( box.width / 2 );
			const sy = box.y + ( box.height / 2 );
			await p.mouse.move( sx, sy );
			await p.mouse.down();
			await p.mouse.move( sx + ( dx / 2 ), sy + ( dy / 2 ), { steps: 4 } );
			await p.mouse.move( sx + dx, sy + dy, { steps: 4 } );
			await p.mouse.up();
			await p.waitForTimeout( 1200 );
		};
		await dragOf( '.rf-sw__float--1', 60, 40 );
		await dragOf( '.rf-sw__img', -50, 0 );
		const dragged = await p.evaluate( ( c ) => {
			const item = c.repeaters.slides.children[ 1 ].settings;
			return { fx: item.get( 'fl1_x' ), fy: item.get( 'fl1_y' ), px: item.get( 'pic_x' ) };
		}, w );
		check( 'editor', 'dragging a floating image and the picture in the preview writes the slide\'s Across / Down and Move the picture settings', dragged.fx && dragged.fx.size !== 14 && dragged.fy && dragged.fy.size !== 22 && dragged.px && dragged.px.size < 0, JSON.stringify( dragged ) );

		// The drags drew the widget again: find it afresh.
		w = await widget();
		const added = await p.evaluate( async ( c ) => {
			$e.run( 'document/repeater/insert', { container: c, name: 'slides', model: { slide_title: 'Minibus' } } );
			await new Promise( ( done ) => setTimeout( done, 1500 ) );
			const last = c.children[ c.children.length - 1 ];
			return { count: c.children.length, inner: last.children.map( ( x ) => x.model.get( 'settings' ).get( '_title' ) ).join( '/' ), background: last.model.get( 'settings' ).get( 'background_color' ) };
		}, w );
		await p.waitForTimeout( 800 );
		ed = await edState();
		check( 'editor', 'Add Slide gives a fourth slide with its Content container and a background, and the preview a fourth slot and thumbnail', 4 === added.count && 'Content' === added.inner && !! added.background && 4 === ed.slots && ed.filled && 4 === ed.thumbs, JSON.stringify( { added, ed } ) );
		await frame.evaluate( () => {
			const s = document.createElement( 'style' );
			s.textContent = '.refraction-element-overlay, .refraction-editor-element-settings { display: none !important; }';
			document.head.appendChild( s );
		} );
		const el = await frame.$( '.rf-sw' );
		await el.screenshot( { path: join( SHOTS, 'editor.png' ) } );

		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Warning|Fatal|Parse|Deprecated)|PHP Notice/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		server?.kill();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall showcase wheel checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
