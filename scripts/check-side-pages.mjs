#!/usr/bin/env node
/**
 * Pages side by side (Page Settings > Pages Side By Side; modules/interactions/assets/js/pages.js), SQLite test site,
 * Chromium. A four-page editorial site (as in the reference: big titles, photos, text, a newsletter page):
 * - slide: no vertical scroll; each page fills the screen; the wheel, the keys, the arrows and a link to a part of the
 *   page turn pages; the number (*01), the arrows and the progress line follow; the things on a page move as layers
 *   while it slides; only the current page can be reached with the keyboard.
 * - book: a page turns over its left edge and back.
 * - phones held upright: shown in landscape (a swipe along the page turns it), or a message asks to turn the phone,
 *   or one long page; held sideways: like a computer. Reduced motion: no movement. The editor keeps the containers
 *   one under another.
 *
 * Usage: node scripts/check-side-pages.mjs [--site /tmp/rf-hp-site] [--port 9230] [--shots /tmp/side-pages-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-hp-site' );
const PORT = arg( 'port', '9230' );
const SHOTS = arg( 'shots', '/tmp/side-pages-shots' );
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

function page( title, sections, pageSettings ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( sections ) ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	// Page settings are stored as an array.
	wp( [ 'post', 'meta', 'update', id, '_refraction_page_settings', JSON.stringify( pageSettings ), '--format=json' ] );
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
	const watch = ( p ) => p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && errors.push( `${ e.message } @ ${ p.url() }` ) );
	const at = async ( url, width, height = 800 ) => {
		const p = await ( await browser.newContext( { viewport: { width, height } } ) ).newPage();
		watch( p );
		await p.goto( url );
		return p;
	};

	const img = `${ BASE }/wp-includes/images/w-logo-blue.png`;
	const w = ( id, widgetType, settings ) => ( { id, elType: 'widget', widgetType, settings, elements: [] } );
	const section = ( id, settings, elements ) => ( { id, elType: 'container', isInner: false, settings: { min_height: { unit: 'vh', size: 100 }, flex_direction: 'row', flex_align_items: 'center', ...settings }, elements } );
	const sections = [
		section( 'p1', { background_background: 'classic', background_color: '#F4F4F4' }, [
			w( 'h1', 'heading', { title: 'The little vanity', header_size: 'h1' } ),
			w( 'i1', 'image', { image: { url: img } } ),
			w( 'l1', 'text-editor', { editor: '<p><a id="to-p3" href="#p3">Unleash your sensuality</a></p>' } ),
		] ),
		section( 'p2', {}, [ w( 'h2', 'heading', { title: 'Week in fashion' } ), w( 'i2', 'image', { image: { url: img } } ), w( 't2', 'text-editor', { editor: '<p>Editorial picks.</p>' } ) ] ),
		section( 'p3', { _element_id: 'p3' }, [ w( 'h3', 'heading', { title: 'Unleash your sensuality' } ), w( 'i3', 'image', { image: { url: img }, rf_hp_depth_own: { unit: 'px', size: 1.5 } } ), w( 't3', 'text-editor', { editor: '<p>Tantra for beginners.</p>' } ) ] ),
		section( 'p4', { background_background: 'classic', background_color: '#F6E8F4' }, [ w( 'h4', 'heading', { title: 'Subscribe newsletter' } ), w( 'f4', 'text-editor', { editor: '<p><input type="email" id="mail" aria-label="Email" /></p>' } ) ] ),
	];
	const base = { rf_hp_counter_prefix: '*', rf_hp_speed: { unit: 'px', size: 600 } };
	const pageState = ( p ) => p.evaluate( () => {
		const stage = document.querySelector( '.rf-hp-stage' );
		const pages = [ ...document.querySelectorAll( '.rf-hp-page' ) ];
		const sr = stage.getBoundingClientRect();
		return {
			on: document.documentElement.classList.contains( 'rf-hp-on' ),
			scroll: document.documentElement.scrollHeight - window.innerHeight,
			count: document.querySelector( '.rf-hp-count' )?.textContent,
			prev: document.querySelector( '.rf-hp-prev' )?.disabled,
			next: document.querySelector( '.rf-hp-next' )?.disabled,
			current: pages.findIndex( ( x ) => x.classList.contains( 'is-current' ) ),
			inert: pages.map( ( x ) => x.hasAttribute( 'inert' ) ),
			lefts: pages.map( ( x ) => Math.round( x.getBoundingClientRect().left - sr.left ) ),
			widths: pages.map( ( x ) => Math.round( x.getBoundingClientRect().width ) ),
			stage: [ Math.round( sr.width ), Math.round( sr.height ) ],
			progress: document.querySelector( '.rf-hp-progress span' ) && new DOMMatrix( getComputedStyle( document.querySelector( '.rf-hp-progress span' ) ).transform ).a,
		};
	} );

	try {
		const slide = page( 'Side pages', sections, { ...base, rf_hp: 'slide' } );
		const book = page( 'Book pages', sections, { ...base, rf_hp: 'book' } );
		const ask = page( 'Ask pages', sections, { ...base, rf_hp: 'slide', rf_hp_phone: 'ask' } );
		const stack = page( 'Stack pages', sections, { ...base, rf_hp: 'slide', rf_hp_phone: 'stack' } );

		// ------------------------------------------------------------ slide, desktop
		const d = await at( slide.url, 1280, 800 );
		await sleep( 800 );
		let s = await pageState( d );
		check( 'slide', 'no vertical scroll; four pages, each as wide as the screen, side by side', s.on && s.scroll <= 0 && 4 === s.widths.length && s.widths.every( ( x ) => x === s.stage[ 0 ] ) && '0,1280,2560,3840' === s.lefts.join(), JSON.stringify( s ) );
		check( 'slide', 'the first page: number *01, no "previous", the others out of keyboard reach, progress a quarter', '*01' === s.count && true === s.prev && false === s.next && 0 === s.current && 'false,true,true,true' === s.inert.join() && Math.abs( s.progress - 0.25 ) < 0.01, JSON.stringify( s ) );
		await d.screenshot( { path: join( SHOTS, 'slide-1.png' ) } );
		await d.mouse.move( 640, 400 );
		await d.mouse.wheel( 0, 120 );
		await sleep( 300 );
		// Mid-way: the layers of the incoming page are not where the page alone would put them (parallax).
		const mid = await d.evaluate( () => {
			const p2 = document.querySelectorAll( '.rf-hp-page' )[ 1 ];
			const layers = [ ...p2.querySelectorAll( '[data-rf-hp-layer]' ) ].map( ( el ) => Math.round( new DOMMatrix( 'none' === getComputedStyle( el ).translate ? 'none' : `translate(${ getComputedStyle( el ).translate.split( ' ' )[ 0 ] })` ).e ) );
			return { pageLeft: Math.round( p2.getBoundingClientRect().left ), layers };
		} );
		check( 'slide', 'while sliding, the things on the page move as layers (each its own offset)', mid.pageLeft > 0 && mid.pageLeft < 1280 && mid.layers.length >= 2 && new Set( mid.layers ).size >= 2 && mid.layers.some( ( x ) => Math.abs( x ) > 10 ), JSON.stringify( mid ) );
		await d.screenshot( { path: join( SHOTS, 'slide-mid.png' ) } );
		await sleep( 600 );
		s = await pageState( d );
		check( 'slide', 'one wheel turn: the second page, *02, the first out of keyboard reach, layers back in place', 1 === s.current && '*02' === s.count && '-1280,0,1280,2560' === s.lefts.join() && 'true,false,true,true' === s.inert.join(), JSON.stringify( s ) );
		await d.keyboard.press( 'ArrowRight' );
		await sleep( 750 );
		s = await pageState( d );
		check( 'slide', 'the right arrow key: the third page', 2 === s.current && '*03' === s.count, JSON.stringify( s ) );
		await d.keyboard.press( 'End' );
		await sleep( 750 );
		s = await pageState( d );
		check( 'slide', 'End: the last page; "next" is off (no loop); progress full', 3 === s.current && true === s.next && Math.abs( s.progress - 1 ) < 0.01, JSON.stringify( s ) );
		await d.screenshot( { path: join( SHOTS, 'slide-4.png' ) } );
		await d.focus( '#mail' );
		await d.keyboard.press( 'ArrowLeft' );
		await sleep( 400 );
		check( 'slide', 'typing in a field does not turn pages', 3 === ( await pageState( d ) ).current );
		await d.click( '.rf-hp-prev' );
		await sleep( 750 );
		check( 'slide', 'the "previous" arrow', 2 === ( await pageState( d ) ).current );
		await d.keyboard.press( 'Home' );
		await sleep( 750 );
		await d.click( '#to-p3' );
		await sleep( 750 );
		s = await pageState( d );
		check( 'slide', 'a link to a part of the page turns to its page', 2 === s.current && ! /#/.test( d.url() ), JSON.stringify( [ s.current, d.url() ] ) );
		const own = await d.evaluate( () => document.querySelector( '[data-id="i3"]' ).getAttribute( 'data-rf-hp-depth' ) );
		check( 'slide', 'an element\'s own depth (Advanced > Interactions) reaches the page', '1.5' === own, own );
		await d.context().close();

		// A link to the page with #p3 opens on the third page.
		const h = await at( `${ slide.url }#p3`, 1280, 800 );
		await sleep( 700 );
		check( 'slide', 'opened with #p3: starts on the third page', 2 === ( await pageState( h ) ).current );
		await h.context().close();

		// ------------------------------------------------------------ book
		const b = await at( book.url, 1280, 800 );
		await sleep( 800 );
		await b.mouse.move( 640, 400 );
		await b.mouse.wheel( 0, 120 );
		await sleep( 330 );
		const turning = await b.evaluate( () => {
			const m = new DOMMatrix( getComputedStyle( document.querySelectorAll( '.rf-hp-page' )[ 0 ] ).transform ); return Math.round( Math.acos( Math.max( -1, Math.min( 1, m.a ) ) ) * 180 / Math.PI );
		} );
		await b.screenshot( { path: join( SHOTS, 'book-turning.png' ) } );
		await sleep( 700 );
		const turned = await b.evaluate( () => {
			const pages = [ ...document.querySelectorAll( '.rf-hp-page' ) ]; const m = new DOMMatrix( getComputedStyle( pages[ 0 ] ).transform ); return { angle: Math.round( Math.acos( Math.max( -1, Math.min( 1, m.a ) ) ) * 180 / Math.PI ), first: pages[ 0 ].classList.contains( 'is-turned' ), current: pages.findIndex( ( x ) => x.classList.contains( 'is-current' ) ), z: pages.map( ( x ) => x.style.zIndex ) };
		} );
		check( 'book', 'the first page turns over its left edge (half way during the turn, over at the end)', turning > 20 && turning < 170 && turned.first && turned.angle > 170 && 1 === turned.current, JSON.stringify( [ turning, turned ] ) );
		await b.keyboard.press( 'ArrowLeft' );
		await sleep( 800 );
		const back = await b.evaluate( () => {
			const p0 = document.querySelectorAll( '.rf-hp-page' )[ 0 ]; return { turned: p0.classList.contains( 'is-turned' ), transform: getComputedStyle( p0 ).transform };
		} );
		check( 'book', 'and turns back', ! back.turned && /^(none|matrix\(1, 0, 0, 1, 0, 0\)|matrix3d\(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1\))$/.test( back.transform ), JSON.stringify( back ) );
		await b.context().close();

		// ------------------------------------------------------------ phones
		const phone = async ( url, width, height ) => {
			const ctx = await browser.newContext( { viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } );
			const p = await ctx.newPage();
			watch( p );
			await p.goto( url );
			await sleep( 800 );
			return p;
		};
		const swipe = async ( p, from, to ) => {
			const cdp = await p.context().newCDPSession( p );
			const steps = 8;
			await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ { x: from[ 0 ], y: from[ 1 ] } ] } );
			for ( let i = 1; i <= steps; i++ ) {
				await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [ { x: from[ 0 ] + ( ( to[ 0 ] - from[ 0 ] ) * i / steps ), y: from[ 1 ] + ( ( to[ 1 ] - from[ 1 ] ) * i / steps ) } ] } );
			}
			await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] } );
			await sleep( 800 );
		};
		const upright = await phone( slide.url, 390, 844 );
		const rot = await upright.evaluate( () => {
			const r = document.querySelector( '.rf-hp-stage' ).getBoundingClientRect(); return { rotated: document.documentElement.classList.contains( 'rf-hp-rotated' ), box: [ Math.round( r.width ), Math.round( r.height ) ], inner: [ document.querySelector( '.rf-hp-stage' ).offsetWidth, document.querySelector( '.rf-hp-stage' ).offsetHeight ] };
		} );
		check( 'phone', 'held upright: the pages are shown in landscape (844 wide, turned to fill the 390 x 844 screen)', rot.rotated && '390,844' === rot.box.join() && '844,390' === rot.inner.join(), JSON.stringify( rot ) );
		await upright.screenshot( { path: join( SHOTS, 'phone-rotated.png' ) } );
		await swipe( upright, [ 195, 650 ], [ 195, 250 ] );
		s = await pageState( upright );
		check( 'phone', 'a swipe along the turned page (up the screen) turns to the next page', 1 === s.current, JSON.stringify( s ) );
		await swipe( upright, [ 195, 250 ], [ 195, 650 ] );
		check( 'phone', 'and back', 0 === ( await pageState( upright ) ).current );
		await upright.context().close();

		const side = await phone( slide.url, 844, 390 );
		const sideState = await pageState( side );
		const sideRot = await side.evaluate( () => document.documentElement.classList.contains( 'rf-hp-rotated' ) );
		await swipe( side, [ 700, 200 ], [ 200, 200 ] );
		const sideAfter = await pageState( side );
		check( 'phone', 'held sideways: like a computer (not turned), a swipe to the left turns the page', sideState.on && ! sideRot && '844,390' === sideState.stage.join() && 1 === sideAfter.current, JSON.stringify( [ sideState.stage, sideRot, sideAfter.current ] ) );
		await side.screenshot( { path: join( SHOTS, 'phone-landscape.png' ) } );
		await side.context().close();

		const askP = await phone( ask.url, 390, 844 );
		const askState = await askP.evaluate( () => {
			const t = document.querySelector( '.rf-hp-turn' ); return { shown: t && 'none' !== getComputedStyle( t ).display, text: t?.textContent.trim() };
		} );
		check( 'phone', '"ask": a message asks to turn the phone sideways', askState.shown && /Turn your phone/.test( askState.text ), JSON.stringify( askState ) );
		await askP.screenshot( { path: join( SHOTS, 'phone-ask.png' ) } );
		await askP.context().close();

		const stackP = await phone( stack.url, 390, 844 );
		const stackState = await stackP.evaluate( () => ( { on: document.documentElement.classList.contains( 'rf-hp-on' ), scroll: document.documentElement.scrollHeight - window.innerHeight, inert: document.querySelectorAll( '.rf-hp-page[inert]' ).length } ) );
		check( 'phone', '"one long page": upright it scrolls down as usual, every page reachable', ! stackState.on && stackState.scroll > 500 && 0 === stackState.inert, JSON.stringify( stackState ) );
		await stackP.context().close();

		// ------------------------------------------------------------ reduced motion
		const rctx = await browser.newContext( { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		watch( r );
		await r.goto( slide.url );
		await sleep( 600 );
		await r.keyboard.press( 'ArrowRight' );
		await sleep( 60 );
		const instant = await pageState( r );
		check( 'reduced motion', 'the page changes at once, without sliding', 1 === instant.current && '-1280,0,1280,2560' === instant.lefts.join(), JSON.stringify( instant ) );
		await rctx.close();

		// ------------------------------------------------------------ editor
		const ectx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ectx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ slide.id }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const ed = await e.frame( { name: 'refraction-preview-iframe' } ).evaluate( () => ( { on: document.documentElement.classList.contains( 'rf-hp-on' ), sections: document.querySelectorAll( '.refraction-element.e-con' ).length } ) );
		const controls = await e.evaluate( () => Object.keys( window.refraction.documents.getCurrent().config.settings.controls ).filter( ( k ) => k.startsWith( 'rf_hp' ) ) );
		check( 'editor', 'the editor keeps the containers one under another; Page Settings has Pages Side By Side', ! ed.on && ed.sections >= 4 && controls.includes( 'rf_hp' ) && controls.includes( 'rf_hp_phone' ) && controls.includes( 'rf_hp_depth' ), JSON.stringify( [ ed, controls ] ) );
		await ectx.close();

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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall side pages checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
