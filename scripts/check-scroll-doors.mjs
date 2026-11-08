#!/usr/bin/env node
/**
 * Scrolling effects of containers (Container > Layout > Scrolling Effect; modules/interactions/assets/js/doors.js),
 * SQLite test site, Chromium. Six containers, each with its own effect: a door to the left, a door to the right (taller
 * than the screen: it scrolls through first), sinking back as the next slides over, sliding to the left as the next
 * comes in (with layers), turning over like a book page, and the last one, which stays. On another page: zooming
 * through into the next (titles growing past the viewer, the next coming into focus) and its reverse (falling away
 * into the distance, the next coming in from close up). Also: closed again when
 * scrolling up, phones, "not on phones", reduced motion, not with Pages Side By Side, and the editor (a plain page
 * there, the setting in the container's Layout tab).
 *
 * Usage: node scripts/check-scroll-doors.mjs [--site /tmp/rf-door-site] [--port 9240] [--shots /tmp/scroll-doors-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-door-site' );
const PORT = arg( 'port', '9240' );
const SHOTS = arg( 'shots', '/tmp/scroll-doors-shots' );
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

	const w = ( id, widgetType, settings ) => ( { id, elType: 'widget', widgetType, settings, elements: [] } );
	const section = ( id, vh, color, extra, title ) => ( { id, elType: 'container', isInner: false, settings: { min_height: { unit: 'vh', size: vh }, flex_justify_content: 'center', flex_align_items: 'center', background_background: 'classic', background_color: color, ...extra }, elements: [ w( `h${ id }`, 'heading', { title, header_size: 'h2' } ) ] } );
	const sections = ( own = {} ) => [
		section( 's1', 100, '#1B3A2F', { rf_door: 'left', ...own }, 'The first door' ),
		section( 's2', 160, '#C9E4D6', { rf_door: 'right', ...own }, 'A tall room' ),
		section( 's3', 100, '#F2C14E', { rf_door: 'push', ...own }, 'Sinks back' ),
		{ ...section( 's4', 100, '#B8D8F0', { rf_door: 'slide', ...own }, 'Slides away' ), elements: [ w( 'h4a', 'heading', { title: 'Slides away' } ), w( 'h4b', 'heading', { title: 'in layers' } ) ] },
		{ ...section( 's5', 100, '#EADBC8', { rf_door: 'book', ...own }, 'A book page' ), elements: [ w( 'h5a', 'heading', { title: 'A book page' } ), w( 'h5b', 'heading', { title: 'comes in' } ) ] },
		section( 's6', 100, '#F6E8F4', {}, 'The last one stays' ),
	];
	const state = ( p ) => p.evaluate( () => {
		const all = [ ...document.querySelectorAll( '.rf-door' ) ];
		return {
			on: document.documentElement.classList.contains( 'rf-doors' ),
			effects: all.map( ( el ) => ( el.className.match( /rf-door--(left|right|push|slide|book|none)/ ) || [] )[ 1 ] ),
			z: all.map( ( el ) => Number( el.style.zIndex ) ),
			p: all.map( ( el ) => Number( el.style.getPropertyValue( '--rf-door-p' ) || 0 ) ),
			tops: all.map( ( el ) => Math.round( el.getBoundingClientRect().top ) ),
			open: all.map( ( el ) => el.classList.contains( 'is-open' ) ),
			transforms: all.map( ( el ) => getComputedStyle( el ).transform ),
			sticky: all.map( ( el ) => getComputedStyle( el ).position ),
			starts: all.map( ( el ) => el.getBoundingClientRect().top + window.scrollY ),
		};
	} );
	const scrollTo = async ( p, y ) => {
		await p.evaluate( ( to ) => window.scrollTo( 0, to ), y );
		await sleep( 250 );
	};
	const hit = ( p, x, y ) => p.evaluate( ( [ px, py ] ) => document.elementFromPoint( px, py )?.closest( '.rf-door' )?.getAttribute( 'data-id' ), [ x, y ] );

	try {
		const doors = page( 'Doors', sections(), {} );
		const noPhones = page( 'Doors not on phones', sections( { rf_door_phones: 'no' } ), {} );
		const both = page( 'Doors and side pages', sections(), { rf_hp: 'slide' } );
		const zoomSection = ( id, color, door, title ) => ( { ...section( id, 100, color, door ? { rf_door: door } : {}, title ), elements: [ w( `t${ id }`, 'heading', { title, header_size: 'h2' } ), w( `x${ id }`, 'text-editor', { editor: '<p>A rentable creative studio.</p>' } ) ] } );
		const zoom = page( 'Zoom', [ zoomSection( 'z1', '#2B2118', 'zoom', 'The art of life' ), zoomSection( 'z2', '#1E2A24', 'zoom-out', 'The art of god' ), zoomSection( 'z3', '#3A2A1E', '', 'A walk in nature' ) ], {} );

		const d = await at( doors.url, 1280, 800 );
		await sleep( 800 );
		let s = await state( d );
		check( 'doors', 'each container its own effect: door left, door right, sink back, slide, book page; the last stays', s.on && 'left,right,push,slide,book,none' === s.effects.join() && 'sticky,sticky,sticky,sticky,sticky,static' === s.sticky.join().replace( 'relative', 'static' ), JSON.stringify( s ) );
		const A = Math.round( s.starts[ 0 ] ); // Where the first section starts (below the theme's header)
		check( 'doors', 'a door, a slide or a page lies above the next container, a sinking one under it', s.z[ 0 ] > s.z[ 1 ] && s.z[ 1 ] > s.z[ 2 ] && s.z[ 2 ] < s.z[ 3 ] && s.z[ 3 ] > s.z[ 4 ] && s.z[ 4 ] > s.z[ 5 ], JSON.stringify( s.z ) );

		// The first door, half way.
		await scrollTo( d, A + 400 );
		s = await state( d );
		const right = await hit( d, 1260, 700 );
		// The hinge stays on the screen's left edge (the box of a turned door grows towards the viewer, so not its top).
		const hinge = await d.evaluate( () => Math.round( document.querySelector( '[data-id="s1"]' ).getBoundingClientRect().left ) );
		check( 'doors', 'half a screen down: the first stays in place and opens on its left hinge; the second waits in place behind it', Math.abs( s.p[ 0 ] - 0.5 ) < 0.02 && 0 === hinge && 'none' !== s.transforms[ 0 ] && 0 === s.tops[ 1 ] && 's2' === right, JSON.stringify( { p: s.p, tops: s.tops, hinge, right } ) );
		await d.screenshot( { path: join( SHOTS, 'door-left.png' ) } );
		await scrollTo( d, A + 800 );
		s = await state( d );
		check( 'doors', 'one screen down: the first is open (out of the way), the second at the top', s.open[ 0 ] && 0 === s.tops[ 1 ], JSON.stringify( s ) );

		// The tall second section scrolls through first (480px), then opens to the right.
		await scrollTo( d, A + 800 + 240 );
		s = await state( d );
		check( 'doors', 'a section taller than the screen scrolls through first', 0 === s.p[ 1 ] && -240 === s.tops[ 1 ], JSON.stringify( s ) );
		await scrollTo( d, A + 800 + 480 + 400 );
		s = await state( d );
		const leftSide = await hit( d, 20, 700 );
		check( 'doors', 'then, at its end, opens on its right hinge', Math.abs( s.p[ 1 ] - 0.5 ) < 0.02 && 'none' !== s.transforms[ 1 ] && 's3' === leftSide, JSON.stringify( { p: s.p, tops: s.tops, leftSide } ) );
		await d.screenshot( { path: join( SHOTS, 'door-right.png' ) } );

		// The third sinks back while the last slides over it.
		const third = A + 800 + 1280;
		await scrollTo( d, third + 400 );
		s = await state( d );
		const scale = await d.evaluate( () => new DOMMatrix( getComputedStyle( document.querySelector( '[data-id="s3"]' ) ).transform ).a );
		const middle = await hit( d, 640, 700 );
		check( 'doors', 'the third sinks back (smaller) while the next slides over it', Math.abs( s.p[ 2 ] - 0.5 ) < 0.02 && scale < 0.95 && scale > 0.85 && Math.abs( s.tops[ 3 ] - 400 ) < 3 && 's4' === middle, JSON.stringify( { p: s.p, scale, tops: s.tops, middle } ) );
		await d.screenshot( { path: join( SHOTS, 'push-back.png' ) } );

		// The fourth slides out to the left as the fifth comes in from the right, their headings as layers.
		const fourth = third + 800;
		await scrollTo( d, fourth + 400 );
		const sl = await d.evaluate( () => {
			const r = ( id ) => document.querySelector( `[data-id="${ id }"]` ).getBoundingClientRect();
			const layer = ( id ) => Math.round( r( id ).left - r( id.slice( 0, 2 ).replace( 'h', 's' ) ).left );
			const home = r( 's6' ); // The last one does not move: where a container sits, and how wide
			return { home: [ Math.round( home.left ), Math.round( home.width ) ], s4: [ Math.round( r( 's4' ).left ), Math.round( r( 's4' ).top ) ], s5: [ Math.round( r( 's5' ).left ), Math.round( r( 's5' ).top ) ], layers: [ document.querySelectorAll( '[data-id="s4"] [data-rf-door-layer]' ).length, document.querySelectorAll( '[data-id="s5"] [data-rf-door-layer]' ).length ], offsets: [ layer( 'h4a' ), layer( 'h4b' ) ], sideways: document.documentElement.scrollWidth > window.innerWidth };
		} );
		const slideRight = await hit( d, 1200, 400 );
		check( 'slide', 'half way: the fourth is half out to the left, the fifth half in from the right at the same height, no sideways scroll', Math.abs( sl.s4[ 0 ] - ( sl.home[ 0 ] - ( sl.home[ 1 ] / 2 ) ) ) < 4 && Math.abs( sl.s5[ 0 ] - ( sl.home[ 0 ] + ( sl.home[ 1 ] / 2 ) ) ) < 4 && 0 === sl.s5[ 1 ] && 's5' === slideRight && ! sl.sideways, JSON.stringify( { sl, slideRight } ) );
		const sl2 = await d.evaluate( () => [ ...document.querySelectorAll( '[data-id="s4"] [data-rf-door-layer]' ) ].map( ( el ) => getComputedStyle( el ).translate ) );
		check( 'slide', 'what is on them moves as layers (each its own offset)', sl.layers[ 0 ] >= 2 && sl.layers[ 1 ] >= 2 && new Set( sl2 ).size >= 2 && sl2.some( ( t ) => 'none' !== t && ! /^0px/.test( t ) ), JSON.stringify( { sl2, layers: sl.layers } ) );
		await d.screenshot( { path: join( SHOTS, 'slide.png' ) } );

		// The fifth turns over like a book page, showing the last one under it.
		const fifth = fourth + 800;
		await scrollTo( d, fifth + 200 );
		const bookEarly = await hit( d, 900, 400 );
		await d.screenshot( { path: join( SHOTS, 'book-turning.png' ) } );
		await scrollTo( d, fifth + 600 );
		const bookLate = await hit( d, 640, 400 );
		s = await state( d );
		check( 'book', 'it turns towards the viewer and over: still covering early on, gone past the middle, the last one under it', 's5' === bookEarly && 's6' === bookLate && Math.abs( s.p[ 4 ] - 0.75 ) < 0.02 && 0 === s.tops[ 5 ], JSON.stringify( { bookEarly, bookLate, p: s.p, tops: s.tops } ) );
		await scrollTo( d, 100000 );
		s = await state( d );
		check( 'doors', 'at the end the last one is in view, the page ends as usual', s.tops[ 5 ] <= 0 && s.open[ 4 ], JSON.stringify( s ) );
		await scrollTo( d, 0 );
		s = await state( d );
		const closed = await d.evaluate( () => {
			const m = new DOMMatrix( getComputedStyle( document.querySelector( '[data-id="s1"]' ) ).transform ); return [ m.m11, m.m13 ];
		} );
		check( 'doors', 'scrolling back up closes them again', 0 === s.p[ 0 ] && ! s.open[ 0 ] && Math.abs( closed[ 0 ] - 1 ) < 1e-6 && Math.abs( closed[ 1 ] ) < 1e-6, JSON.stringify( closed ) );
		await d.context().close();

		// Zoom through, and its reverse.
		const zp = await at( zoom.url, 1280, 800 );
		await sleep( 800 );
		const zStart = await zp.evaluate( () => Number( document.querySelector( '[data-id="z1"]' ).getAttribute( 'data-rf-door-start' ) ) );
		const look = () => zp.evaluate( () => {
			const blur = ( el ) => Number( ( getComputedStyle( el ).filter.match( /blur\(([\d.]+)px\)/ ) || [ 0, 0 ] )[ 1 ] );
			const q = ( id ) => document.querySelector( `[data-id="${ id }"]` );
			return {
				z1: { opacity: Number( getComputedStyle( q( 'z1' ) ).opacity ), blur: blur( q( 'z1' ) ), title: Number( getComputedStyle( q( 'tz1' ) ).scale ), text: Number( getComputedStyle( q( 'xz1' ) ).scale ), open: q( 'z1' ).classList.contains( 'is-open' ) },
				z2: { blur: blur( q( 'z2' ) ), scale: getComputedStyle( q( 'z2' ) ).scale, top: Math.round( q( 'z2' ).getBoundingClientRect().top ), shrink: new DOMMatrix( getComputedStyle( q( 'z2' ) ).transform ).a, title: Number( getComputedStyle( q( 'tz2' ) ).scale ), opacity: Number( getComputedStyle( q( 'z2' ) ).opacity ) },
				z3: { blur: blur( q( 'z3' ) ), scale: 'none' === getComputedStyle( q( 'z3' ) ).scale ? 1 : Number( getComputedStyle( q( 'z3' ) ).scale ) },
			};
		} );
		await scrollTo( zp, zStart + 400 );
		let z = await look();
		check( 'zoom', 'half way: its title grows past the viewer (most), the rest a little; it is only starting to blur and fade; the next waits behind, still a little blurred', Math.abs( z.z1.title - 2.5 ) < 0.05 && Math.abs( z.z1.text - 1.6 ) < 0.05 && Math.abs( z.z1.opacity - 0.714 ) < 0.03 && Math.abs( z.z1.blur - 2.33 ) < 0.3 && Math.abs( z.z2.top ) <= 13 && Math.abs( z.z2.blur - 7 ) < 0.5 && Math.abs( Number( z.z2.scale ) - 1.03 ) < 0.01, JSON.stringify( z ) );
		await zp.screenshot( { path: join( SHOTS, 'zoom.png' ) } );
		await scrollTo( zp, zStart + 800 );
		z = await look();
		check( 'zoom', 'then it is gone and the next is in focus', z.z1.open && 0 === z.z2.blur && 0 === z.z2.top && ( 'none' === z.z2.scale || 1 === Number( z.z2.scale ) ), JSON.stringify( z ) );
		const z2Start = await zp.evaluate( () => Number( document.querySelector( '[data-id="z2"]' ).getAttribute( 'data-rf-door-start' ) ) );
		await scrollTo( zp, z2Start + 400 );
		z = await look();
		check( 'zoom out', 'the reverse: it falls away (smaller, its title most), blurs and fades; the next comes in from close up, blurred', Math.abs( z.z2.shrink - 0.85 ) < 0.02 && Math.abs( z.z2.title - 0.4 ) < 0.02 && Math.abs( z.z2.opacity - 0.5 ) < 0.03 && Math.abs( z.z2.blur - 7 ) < 0.5 && Math.abs( z.z3.scale - 1.225 ) < 0.01 && Math.abs( z.z3.blur - 7 ) < 0.5, JSON.stringify( z ) );
		await zp.screenshot( { path: join( SHOTS, 'zoom-out.png' ) } );
		await scrollTo( zp, z2Start + 800 );
		z = await look();
		check( 'zoom out', 'and the last one settles into focus', 0 === z.z3.blur && 1 === z.z3.scale, JSON.stringify( z ) );
		await zp.context().close();

		// Phones: on by default, off when asked.
		const phone = async ( url ) => {
			const ctx = await browser.newContext( { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } );
			const p = await ctx.newPage();
			watch( p );
			await p.goto( url );
			await sleep( 800 );
			return p;
		};
		const ph = await phone( doors.url );
		const phoneStart = Math.round( ( await state( ph ) ).starts[ 0 ] );
		await scrollTo( ph, phoneStart + 422 );
		s = await state( ph );
		check( 'phone', 'on a phone the doors open too', s.on && Math.abs( s.p[ 0 ] - 0.5 ) < 0.03, JSON.stringify( s.p ) );
		await ph.screenshot( { path: join( SHOTS, 'phone.png' ) } );
		await ph.context().close();
		const np = await phone( noPhones.url );
		check( 'phone', '"Also On Phones" off: a plain page on a phone', ! ( await state( np ) ).on );
		await np.context().close();

		// Reduced motion: a plain page.
		const rctx = await browser.newContext( { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		watch( r );
		await r.goto( doors.url );
		await sleep( 600 );
		const rs = await state( r );
		check( 'reduced motion', 'a plain page: nothing sticks or opens', ! rs.on && rs.sticky.every( ( x ) => 'sticky' !== x ), JSON.stringify( rs ) );
		await rctx.close();

		// With Pages Side By Side, the pages win.
		const bp = await at( both.url, 1280, 800 );
		await sleep( 700 );
		const bs = await bp.evaluate( () => ( { doors: document.documentElement.classList.contains( 'rf-doors' ), pages: document.documentElement.classList.contains( 'rf-hp-on' ) } ) );
		check( 'doors', 'not together with Pages Side By Side (the pages win)', ! bs.doors && bs.pages, JSON.stringify( bs ) );
		await bp.context().close();

		// The editor.
		const ectx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ectx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ doors.id }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const ed = await e.frame( { name: 'refraction-preview-iframe' } ).evaluate( () => document.documentElement.classList.contains( 'rf-doors' ) );
		const controls = await e.evaluate( () => {
			const c = window.refraction.config.elements?.container?.controls || {}; return { page: Object.keys( window.refraction.documents.getCurrent().config.settings.controls ).filter( ( k ) => k.startsWith( 'rf_doors' ) ), tab: c.rf_door?.tab, options: Object.keys( c.rf_door?.options || {} ), more: [ 'rf_door_angle', 'rf_door_depth', 'rf_door_shade', 'rf_door_phones' ].every( ( k ) => c[ k ] ) };
		} );
		check( 'editor', 'a plain page in the editor; the choice is in the container\'s Layout tab (no longer in Page Settings)', ! ed && 0 === controls.page.length && 'layout' === controls.tab && ',left,right,push,slide,book,zoom,zoom-out' === controls.options.join() && controls.more, JSON.stringify( [ ed, controls ] ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall scroll doors checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
