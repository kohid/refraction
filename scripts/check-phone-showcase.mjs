#!/usr/bin/env node
/**
 * Phone Showcase widget (modules/interactions/widgets/phone-showcase.php), SQLite test site, Chromium: steps beside a
 * phone; a step (click, keys) or a tap inside the phone shows its screen; the number replaces the icon of the current
 * step; floating cards (one tied to a step); at most 20 steps; every device of the library and an own frame image;
 * playing by itself (paused while hovered; not for reduced motion); stacked on a phone; the editor.
 *
 * Usage: node scripts/check-phone-showcase.mjs [--site /tmp/rf-ps-site] [--port 9250] [--shots /tmp/phone-showcase-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ps-site' );
const PORT = arg( 'port', '9250' );
const SHOTS = arg( 'shots', '/tmp/phone-showcase-shots' );
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
	// Full width with the site's header and footer (a theme's narrow content column would hold the sections in).
	wp( [ 'post', 'meta', 'update', id, '_wp_page_template', 'refraction_header_footer' ] );
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

	const img = ( name ) => `${ BASE }/wp-includes/images/${ name }`;
	const w = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'refraction-phone-showcase', settings, elements: [] } );
	const step = ( n, screen ) => ( { _id: `st${ n }`, title: `Step ${ n }`, text: `What happens at step ${ n }.`, icon: { value: 'fas fa-star', library: 'fa-solid' }, ...( screen ? { screen: { url: img( screen ) } } : {} ) } );
	const box = ( elements, extra = {} ) => [ { id: `c${ Math.random().toString( 36 ).slice( 2, 7 ) }`, elType: 'container', isInner: false, settings: { background_background: 'classic', background_color: '#0E4A3A', ...extra }, elements } ];
	const cards = [
		{ _id: 'cd1', title: '4.9', stars: 5, icon: { value: '', library: '' }, x: { size: 100 }, y: { size: 8 } },
		{ _id: 'cd2', title: 'Booked!', text: 'Full grooming, 10:00 AM', step: 2, x: { size: -12 }, y: { size: 24 } },
	];

	try {
		const showcase = page( 'Showcase', box( [ w( 'ps01', { steps: [ step( 1, 'w-logo-blue.png' ), step( 2, 'wordpress-logo.png' ), step( 3 ), step( 4 ) ], cards, button_text: 'Open full demo', button_link: { url: '#demo' } } ) ] ), {} );
		const many = page( 'Many steps', box( [ w( 'ps02', { steps: Array.from( { length: 25 }, ( x, i ) => step( i + 1 ) ), cards: [] } ) ] ), {} );
		const devices = [ 'island', 'notch', 'hole', 'hole-left', 'edge', 'rounded', 'compact', 'classic', 'fold', 'clay', 'outline', 'tablet', 'tablet-wide' ];
		const ratios = { island: 0.488, notch: 0.488, hole: 0.46, 'hole-left': 0.46, edge: 0.47, rounded: 0.47, compact: 0.52, classic: 0.49, fold: 0.87, clay: 0.48, outline: 0.48, tablet: 0.72, 'tablet-wide': 1.39 };
		const library = page( 'Devices', box( [ ...devices.map( ( d, i ) => w( `dv${ i }`, { device: d, color: [ 'black', 'silver', 'gold', 'blue', 'green', 'rose', 'purple', 'white', 'graphite' ][ i % 9 ], steps: [ step( 1 ) ], cards: [], label: '', phone_width: { unit: 'px', size: d.startsWith( 'tablet' ) || 'fold' === d ? 420 : 220 } } ) ), w( 'dvx', { device: 'custom', frame_image: { url: img( 'w-logo-blue.png' ) }, frame_top: { size: 10 }, frame_right: { size: 20 }, frame_bottom: { size: 10 }, frame_left: { size: 20 }, steps: [ step( 1 ) ], cards: [], label: '', phone_width: { unit: 'px', size: 200 } } ) ], { flex_wrap: 'wrap', flex_direction: 'row' } ), {} );
		const auto = page( 'Autoplay', box( [ w( 'ps04', { steps: [ step( 1 ), step( 2 ), step( 3 ) ], cards: [], autoplay: 'yes', interval: { size: 2 } } ) ] ), {} );
		const phoneOnly = page( 'Phone layout', box( [ w( 'ps05', { steps: [ step( 1 ), step( 2 ) ], cards, cards_phone: '', stack_order: 'phone' } ) ] ), {} );

		const state = ( p, id ) => p.evaluate( ( wid ) => {
			const root = document.querySelector( `[data-id="${ wid }"] .rf-showcase` );
			const steps = [ ...root.querySelectorAll( '.rf-showcase__step' ) ];
			const shots = [ ...root.querySelectorAll( '.rf-phone__shot' ) ];
			const current = steps.findIndex( ( s ) => s.classList.contains( 'is-active' ) );
			const badge = steps[ current ].querySelector( '.rf-showcase__badge' );
			return {
				at: current,
				n: steps.length,
				selected: steps.map( ( s ) => s.getAttribute( 'aria-selected' ) ).join(),
				shot: shots.findIndex( ( s ) => s.classList.contains( 'is-active' ) ),
				past: shots.map( ( s ) => s.classList.contains( 'is-past' ) ).join(),
				number: getComputedStyle( badge.querySelector( '.rf-showcase__number' ) ).display !== 'none' ? badge.querySelector( '.rf-showcase__number' ).textContent : '',
				icon: getComputedStyle( badge.querySelector( '.rf-showcase__icon' ) ).display,
				cards: [ ...root.querySelectorAll( '.rf-showcase__card' ) ].map( ( c ) => c.classList.contains( 'is-hidden' ) ? 'hidden' : 'shown' ).join(),
				focus: root.ownerDocument.activeElement === steps[ current ],
			};
		}, id );

		// ------------------------------------------------------------ the steps and the phone
		const d = await at( showcase.url, 1280, 900 );
		await sleep( 800 );
		const phone = await d.evaluate( () => {
			const body = document.querySelector( '[data-id="ps01"] .rf-phone__body' ).getBoundingClientRect();
			const cut = document.querySelector( '[data-id="ps01"] .rf-phone__cutout' ).getBoundingClientRect();
			const side = document.querySelector( '[data-id="ps01"] .rf-showcase__side' ).getBoundingClientRect();
			return { ratio: body.width / body.height, cut: cut.width / body.width, time: document.querySelector( '[data-id="ps01"] .rf-phone__time' )?.textContent, right: body.left > side.right, img: document.querySelector( '[data-id="ps01"] .rf-phone__shot.is-active img' )?.naturalWidth > 0, button: document.querySelector( '[data-id="ps01"] .rf-showcase__button' )?.getAttribute( 'href' ) };
		} );
		check( 'phone', 'a phone with a camera island and a status bar (9:41) to the right of the steps, showing the first screen', Math.abs( phone.ratio - 0.488 ) < 0.01 && Math.abs( phone.cut - 0.29 ) < 0.02 && '9:41' === phone.time && phone.right && phone.img && '#demo' === phone.button, JSON.stringify( phone ) );
		let s = await state( d, 'ps01' );
		check( 'steps', 'the first step is current, shows its number in place of its icon; a card tied to step 2 waits hidden', 0 === s.at && 0 === s.shot && '1' === s.number && 'none' === s.icon && 'true,false,false,false' === s.selected && 'shown,hidden' === s.cards, JSON.stringify( s ) );
		await d.locator( '[data-id="ps01"]' ).screenshot( { path: join( SHOTS, 'showcase-1.png' ) } );
		await d.click( '[data-id="ps01"] .rf-showcase__step >> nth=1' );
		await sleep( 600 );
		s = await state( d, 'ps01' );
		check( 'steps', 'clicking step 2 shows its screen (the first slides out); its card pops in', 1 === s.at && 1 === s.shot && 'true,false,false,false' === s.past && '2' === s.number && 'shown,shown' === s.cards, JSON.stringify( s ) );
		await d.locator( '[data-id="ps01"]' ).screenshot( { path: join( SHOTS, 'showcase-2.png' ) } );
		const sbox = await d.locator( '[data-id="ps01"] .rf-phone__screen' ).boundingBox();
		await d.mouse.click( sbox.x + ( sbox.width / 2 ), sbox.y + ( sbox.height / 2 ) );
		await sleep( 600 );
		s = await state( d, 'ps01' );
		check( 'steps', 'a tap inside the phone shows the next step (a placeholder screen when it has no image)', 2 === s.at && 2 === s.shot && 'Step 3' === ( await d.evaluate( () => document.querySelector( '[data-id="ps01"] .rf-phone__shot.is-active .rf-phone__placeholder' )?.textContent.replace( /^\d+/, '' ) ) ), JSON.stringify( s ) );
		await d.mouse.click( sbox.x + ( sbox.width / 2 ), sbox.y + ( sbox.height / 2 ) );
		await sleep( 300 );
		await d.mouse.click( sbox.x + ( sbox.width / 2 ), sbox.y + ( sbox.height / 2 ) );
		await sleep( 600 );
		check( 'steps', 'after the last step a tap starts again at the first', 0 === ( await state( d, 'ps01' ) ).at );
		await d.focus( '[data-id="ps01"] .rf-showcase__step.is-active' );
		await d.keyboard.press( 'ArrowDown' );
		await sleep( 300 );
		s = await state( d, 'ps01' );
		check( 'keyboard', 'the steps are tabs: the down arrow shows and focuses the next one', 1 === s.at && s.focus && 'false,true,false,false' === s.selected, JSON.stringify( s ) );
		await d.keyboard.press( 'End' );
		await sleep( 300 );
		check( 'keyboard', 'End: the last step', 3 === ( await state( d, 'ps01' ) ).at );
		const tabs = await d.evaluate( () => {
			const list = document.querySelector( '[data-id="ps01"] [role="tablist"]' ); const panel = document.querySelector( '[data-id="ps01"] [role="tabpanel"]' ); const active = list.querySelector( '[aria-selected="true"]' ); return list && panel && active.getAttribute( 'aria-controls' ) === panel.id && panel.getAttribute( 'aria-labelledby' ) === active.id;
		} );
		check( 'keyboard', 'tab list, tabs and the screen as their panel are named for screen readers', tabs );
		await d.context().close();

		// ------------------------------------------------------------ at most 20
		const m = await at( many.url, 1280, 900 );
		await sleep( 500 );
		check( 'steps', 'at most 20 steps (25 given)', 20 === ( await state( m, 'ps02' ) ).n );
		await m.context().close();

		// ------------------------------------------------------------ the device library and an own frame
		const lib = await at( library.url, 1400, 1000 );
		await sleep( 1000 );
		const shapes = await lib.evaluate( ( list ) => list.map( ( dev, i ) => {
			const b = document.querySelector( `[data-id="dv${ i }"] .rf-phone__body` ).getBoundingClientRect(); const cut = document.querySelector( `[data-id="dv${ i }"] .rf-phone__cutout` ); return [ dev, Math.round( ( b.width / b.height ) * 100 ) / 100, getComputedStyle( cut ).display, getComputedStyle( document.querySelector( `[data-id="dv${ i }"] .rf-phone__body` ) ).backgroundColor ];
		} ), devices );
		const wrong = shapes.filter( ( [ dev, ratio ] ) => Math.abs( ratio - ratios[ dev ] ) > 0.02 );
		check( 'devices', 'all 13 devices of the library draw at their own shape', 13 === shapes.length && 0 === wrong.length, JSON.stringify( wrong.length ? wrong : shapes ) );
		const cuts = Object.fromEntries( shapes.map( ( [ dev, , cut ] ) => [ dev, cut ] ) );
		check( 'devices', 'each with its own cutout (island, notch, camera hole; none on the edge-to-edge and the tablets)', 'block' === cuts.island && 'block' === cuts.notch && 'block' === cuts.hole && 'none' === cuts.edge && 'none' === cuts.tablet, JSON.stringify( cuts ) );
		const colorsSeen = new Set( shapes.filter( ( x ) => ! [ 'outline', 'clay' ].includes( x[ 0 ] ) ).map( ( x ) => x[ 3 ] ) );
		check( 'devices', 'and the chosen colors', colorsSeen.size >= 6, [ ...colorsSeen ].join( ' ' ) );
		const own = await lib.evaluate( () => {
			const b = document.querySelector( '[data-id="dvx"] .rf-phone__body' ).getBoundingClientRect(); const sc = document.querySelector( '[data-id="dvx"] .rf-phone__screen' ).getBoundingClientRect(); const fr = document.querySelector( '[data-id="dvx"] .rf-phone__frame' ); return { frame: !! fr && fr.naturalWidth > 0, top: Math.round( ( ( sc.top - b.top ) / b.height ) * 100 ), left: Math.round( ( ( sc.left - b.left ) / b.width ) * 100 ), z: getComputedStyle( fr ).zIndex };
		} );
		check( 'devices', 'my own frame image: the screen sits where it is set (10% down, 20% in), under the picture', own.frame && 10 === own.top && 20 === own.left && '1' === own.z, JSON.stringify( own ) );
		await lib.screenshot( { path: join( SHOTS, 'devices.png' ), fullPage: true } );
		await lib.context().close();

		// ------------------------------------------------------------ playing by itself
		const a = await at( auto.url, 1280, 900 );
		await a.mouse.move( 5, 5 );
		await sleep( 2600 );
		check( 'autoplay', 'it moves on by itself after the time per step (2 s), with the timing line', 1 === ( await state( a, 'ps04' ) ).at && ( await a.evaluate( () => document.querySelector( '[data-id="ps04"] .rf-showcase' ).classList.contains( 'is-playing' ) ) ) );
		await a.hover( '[data-id="ps04"] .rf-phone__screen' );
		await sleep( 2600 );
		check( 'autoplay', 'and waits while hovered', 1 === ( await state( a, 'ps04' ) ).at );
		await a.context().close();
		const rctx = await browser.newContext( { viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		watch( r );
		await r.goto( auto.url );
		await sleep( 2600 );
		check( 'autoplay', 'not for visitors who ask for reduced motion', 0 === ( await state( r, 'ps04' ) ).at );
		await rctx.close();

		// ------------------------------------------------------------ a phone screen
		const pctx = await browser.newContext( { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } );
		const p = await pctx.newPage();
		watch( p );
		await p.goto( phoneOnly.url );
		await sleep( 800 );
		const small = await p.evaluate( () => {
			const dev = document.querySelector( '[data-id="ps05"] .rf-showcase__device' ).getBoundingClientRect(); const side = document.querySelector( '[data-id="ps05"] .rf-showcase__side' ).getBoundingClientRect(); return { stacked: dev.bottom <= side.top + 1, sideways: document.documentElement.scrollWidth > window.innerWidth, cards: [ ...document.querySelectorAll( '[data-id="ps05"] .rf-showcase__card' ) ].map( ( c ) => getComputedStyle( c ).display ).join() };
		} );
		check( 'phone screen', 'on a phone: the phone first (as set), then the steps; no sideways scroll; cards hidden (as set)', small.stacked && ! small.sideways && 'none,none' === small.cards, JSON.stringify( small ) );
		await p.screenshot( { path: join( SHOTS, 'small.png' ), fullPage: true } );
		await pctx.close();

		// ------------------------------------------------------------ the editor
		const ectx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ectx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ showcase.id }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3500 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const stepBox = await frame.locator( '[data-id="ps01"] .rf-showcase__step >> nth=2' ).boundingBox();
		await frame.click( '[data-id="ps01"] .rf-showcase__step >> nth=2', { position: { x: stepBox.width - 30, y: stepBox.height / 2 } } );
		await sleep( 800 );
		const ed = await frame.evaluate( () => ( { phone: !! document.querySelector( '[data-id="ps01"] .rf-phone__body' ), at: [ ...document.querySelectorAll( '[data-id="ps01"] .rf-showcase__step' ) ].findIndex( ( x ) => x.classList.contains( 'is-active' ) ) } ) );
		const panel = await e.evaluate( () => {
			const c = window.refraction.widgetsCache[ 'refraction-phone-showcase' ]?.controls || {}; return { max: c.steps?.max_items, devices: Object.keys( c.device?.options || {} ).length, cards: c.cards?.max_items };
		} );
		check( 'editor', 'the preview draws it and a click on a step works there; up to 20 steps, 14 device choices (13 and my own frame)', ed.phone && 2 === ed.at && 20 === panel.max && 14 === panel.devices && 8 === panel.cards, JSON.stringify( [ ed, panel ] ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall phone showcase checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
