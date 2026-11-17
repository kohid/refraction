#!/usr/bin/env node
/**
 * Showcase Wheel (0.113.0, SQLite test site, Chromium). On the site: each slide in its own container's background,
 * content and picture on the sides chosen per slide, the arc or blob behind the picture; the thumbnails (shape behind the
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
		const w = await widget();
		await p.evaluate( ( c ) => {
			c.model.get( 'editSettings' ).set( 'activeItemIndex', 2 );
		}, w );
		await p.waitForTimeout( 1200 );
		ed = await edState();
		check( 'editor', 'picking slide 2 in the panel shows it, its picture on the left', 1 === ed.active && 'left' === ed.pictureSide, JSON.stringify( ed ) );
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 1 ], settings: { side: 'left' } } );
		}, w );
		await p.waitForTimeout( 1500 );
		ed = await edState();
		check( 'editor', 'setting slide 2\'s content to the left in the slide list moves its picture to the right at once', 1 === ed.active && 'right' === ed.pictureSide && ed.filled, JSON.stringify( ed ) );
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
