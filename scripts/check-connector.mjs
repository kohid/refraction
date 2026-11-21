#!/usr/bin/env node
/**
 * Connector widget (0.140.0), SQLite test site, Chromium. Six containers in a grid of two (as in a process diagram),
 * joined 1 > 2 > 4 > 3 > 5 > 6 by Connectors (the next container, or a CSS ID):
 * - each arrow leaves the right side and reaches the facing side (right > left, bottom > top, left < right), at the
 *   middle, the gap away, with its head; the widget takes no room in its container;
 * - elbow with rounded corners, curved, both ends, dashed / dotted;
 * - animations: flowing dashes, drawn when it comes into view, a dot travelling along;
 * - phones (430, 393, 375): the containers stack and the arrows turn down (bottom > top), no sideways scrolling;
 * - Edit Mode: drawn, the chip selects the widget, a Side change and the phone view redraw at once.
 *
 * Usage: node scripts/check-connector.mjs [--site /tmp/rf-cn-site] [--port 9382] [--shots /tmp/connector-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-cn-site' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/connector-shots' );
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
	return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
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
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

const connector = ( id, settings = {} ) => ( { id, elType: 'widget', widgetType: 'refraction-connector', settings, elements: [] } );
const box = ( n, connectors = [] ) => ( {
	id: `box000${ n }`, elType: 'container', isInner: true,
	settings: {
		_element_id: `c${ n }`, content_width: 'full', width: { unit: '%', size: 44 }, width_mobile: { unit: '%', size: 100 },
		min_height: { unit: 'px', size: 150 }, flex_justify_content: 'center', flex_align_items: 'center',
		border_border: 'solid', border_width: { unit: 'px', top: '1', right: '1', bottom: '1', left: '1', isLinked: true }, border_color: '#6B7280',
		border_radius: { unit: 'px', top: '8', right: '8', bottom: '8', left: '8', isLinked: true }, background_background: 'classic', background_color: '#FFFFFF',
	},
	elements: [ ...connectors, { id: `head000${ n }`, elType: 'widget', widgetType: 'heading', settings: { title: `Container ${ n }`, header_size: 'h3' }, elements: [] } ],
} );

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

	// Where an arrow starts and ends, in page coordinates, and what it is made of.
	const arrow = ( p, wid ) => p.evaluate( ( w ) => {
		const host = document.querySelector( `[data-id="${ w }"]` );
		const svg = host && host.querySelector( '.rf-cn__svg' );
		const line = svg && svg.querySelector( 'path.rf-cn__line' );
		if ( ! line ) {
			return null;
		}
		const origin = host.querySelector( '.rf-cn' ).getBoundingClientRect();
		const len = line.getTotalLength();
		const at = ( l ) => {
			const pt = line.getPointAtLength( l );
			return [ Math.round( origin.left + pt.x ), Math.round( origin.top + pt.y + window.scrollY ) ];
		};
		const end = line.getAttribute( 'marker-end' );
		const start = line.getAttribute( 'marker-start' );
		const hr = host.getBoundingClientRect();
		return {
			start: at( 0 ), end: at( len ), len: Math.round( len ), d: line.getAttribute( 'd' ),
			endHead: end ? svg.querySelector( end.replace( /^url\(|\)$/g, '' ) )?.firstChild?.getAttribute( 'd' ) : null,
			startHead: start ? svg.querySelector( start.replace( /^url\(|\)$/g, '' ) )?.firstChild?.getAttribute( 'd' ) : null,
			dash: line.getAttribute( 'stroke-dasharray' ), anim: getComputedStyle( line ).animationName, color: getComputedStyle( line ).stroke,
			box: host.querySelector( '.rf-cn' ).className, dot: !! svg.querySelector( 'circle.rf-cn__dot animateMotion' ),
			room: [ Math.round( hr.width ), Math.round( hr.height ) ],
		};
	}, wid );
	const rect = ( p, cssId ) => p.evaluate( ( id ) => {
		const r = document.getElementById( id ).getBoundingClientRect();
		return { l: Math.round( r.left ), r: Math.round( r.right ), t: Math.round( r.top + window.scrollY ), b: Math.round( r.bottom + window.scrollY ), cx: Math.round( r.left + ( r.width / 2 ) ), cy: Math.round( r.top + ( r.height / 2 ) + window.scrollY ) };
	}, cssId );
	const near = ( a, b, tol = 2 ) => Math.abs( a - b ) <= tol;

	try {
		const pg = page( 'Connector', [ {
			id: 'grid0001', elType: 'container',
			settings: { content_width: 'boxed', boxed_width: { unit: 'px', size: 900 }, flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: 'space-between', flex_gap: { unit: 'px', size: 40, column: '40', row: '40', isLinked: true }, padding: { unit: 'px', top: '40', right: '20', bottom: '40', left: '20', isLinked: false } },
			elements: [
				box( 1, [ connector( 'cn000001' ) ] ),
				box( 2, [ connector( 'cn000002', { to: 'id', to_id: 'c4' } ) ] ),
				box( 3, [ connector( 'cn000003', { to: 'id', to_id: 'c5', line_style: 'dashed', animation: 'draw' } ) ] ),
				box( 4, [ connector( 'cn000004', { to: 'previous', path: 'straight', line_style: 'solid', head_start: 'circle', head_end: 'open', color: '#E20A17', animation: 'flow' } ) ] ),
				box( 5, [ connector( 'cn000005', { animation: 'pulse' } ), connector( 'cn000006', { to: 'id', to_id: 'c2', path: 'curved', head_end: 'diamond', from_side: 'top', to_side: 'bottom' } ) ] ),
				box( 6 ),
			],
		}, { id: 'spacer01', elType: 'container', settings: { min_height: { unit: 'px', size: 600 } }, elements: [] } ] );

		// ------------------------------------------------------------ desktop
		const d = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
		d.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ desktop` ) );
		await d.goto( pg.url );
		await d.waitForTimeout( 1200 );
		const c = {};
		for ( const n of [ 1, 2, 3, 4, 5, 6 ] ) {
			c[ n ] = await rect( d, `c${ n }` );
		}
		const a1 = await arrow( d, 'cn000001' );
		check( 'desktop', '1 > 2 (the next container): from 1\'s right side to 2\'s left side, at their middles, 4px away, with an arrow head', a1 && near( a1.start[ 0 ], c[ 1 ].r + 4 ) && near( a1.start[ 1 ], c[ 1 ].cy ) && near( a1.end[ 0 ], c[ 2 ].l - 4 ) && near( a1.end[ 1 ], c[ 2 ].cy ) && /^M0,0 L10,5/.test( a1.endHead || '' ), JSON.stringify( { a1, c1: c[ 1 ], c2: c[ 2 ] } ) );
		check( 'desktop', 'the widget takes no room: no size, and Container 1\'s heading in the same place as Container 6\'s', a1 && 0 === a1.room[ 0 ] && 0 === a1.room[ 1 ] && await d.evaluate( () => Math.abs( ( document.getElementById( 'c1' ).querySelector( 'h3' ).getBoundingClientRect().top - document.getElementById( 'c1' ).getBoundingClientRect().top ) - ( document.getElementById( 'c6' ).querySelector( 'h3' ).getBoundingClientRect().top - document.getElementById( 'c6' ).getBoundingClientRect().top ) ) <= 1 ), JSON.stringify( a1 && a1.room ) );
		const a2 = await arrow( d, 'cn000002' );
		check( 'desktop', '2 > 4 (CSS ID): straight down, from 2\'s bottom to 4\'s top', a2 && near( a2.start[ 1 ], c[ 2 ].b + 4 ) && near( a2.start[ 0 ], c[ 2 ].cx ) && near( a2.end[ 1 ], c[ 4 ].t - 4 ) && near( a2.end[ 0 ], c[ 4 ].cx ), JSON.stringify( { a2, c2: c[ 2 ], c4: c[ 4 ] } ) );
		const a4 = await arrow( d, 'cn000004' );
		check( 'desktop', '4 > 3 (the container before): leftwards, straight, solid red, a dot at the start and an open arrow at the end, flowing dashes', a4 && near( a4.start[ 0 ], c[ 4 ].l - 4 ) && near( a4.end[ 0 ], c[ 3 ].r + 4 ) && /^M1,1 L9,5 L1,9$/.test( a4.endHead || '' ) && /^M5,1\.5 A/.test( a4.startHead || '' ) && 'rgb(226, 10, 23)' === a4.color && 'rf-cn-flow' === a4.anim && /^M[\d.-]+,[\d.-]+ L/.test( a4.d ), JSON.stringify( a4 ) );
		check( 'desktop', 'the default is dotted (round dots), the 3 > 5 one dashed', a1 && /^0\.01 /.test( a1.dash || '' ), JSON.stringify( a1 && a1.dash ) );
		const a6 = await arrow( d, 'cn000006' );
		check( 'desktop', '5 > 2 curved, from 5\'s top to 2\'s bottom (set sides), with a diamond', a6 && / C/.test( a6.d ) && near( a6.start[ 1 ], c[ 5 ].t - 4 ) && near( a6.end[ 1 ], c[ 2 ].b + 4 ) && /^M1,5 L5,1/.test( a6.endHead || '' ), JSON.stringify( a6 ) );
		const a5 = await arrow( d, 'cn000005' );
		check( 'desktop', '5 > 6 with a dot travelling along', a5 && a5.dot && near( a5.end[ 0 ], c[ 6 ].l - 4 ), JSON.stringify( a5 ) );
		// 3 > 5 draws itself when it comes into view.
		await d.evaluate( () => document.getElementById( 'c3' ).scrollIntoView( { block: 'center', behavior: 'instant' } ) );
		await d.waitForTimeout( 2800 );
		const a3 = await arrow( d, 'cn000003' );
		check( 'desktop', '3 > 5 draws itself in view, then keeps its dashes', a3 && /is-drawn/.test( a3.box ) && a3.dash && ! /^0\.01/.test( a3.dash ) && near( a3.end[ 1 ], c[ 5 ].t - 4 ), JSON.stringify( a3 ) );
		await d.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
		await d.locator( '[data-id="grid0001"]' ).screenshot( { path: join( SHOTS, 'connector-1200.png' ) } );
		// Elbow between offset elements: rounded corners (quadratic curves at the bends).
		await d.evaluate( () => {
			document.getElementById( 'c2' ).style.marginTop = '60px';
			window.dispatchEvent( new Event( 'resize' ) );
		} );
		await d.waitForTimeout( 500 );
		const bent = await arrow( d, 'cn000001' );
		check( 'desktop', 'an elbow between offset boxes turns at right angles with rounded corners, and follows the box when it moves', bent && / Q/.test( bent.d ) && near( bent.end[ 1 ], ( await rect( d, 'c2' ) ).cy ), JSON.stringify( bent ) );
		await d.context().close();

		// ------------------------------------------------------------ phones
		for ( const w of [ 430, 393, 375 ] ) {
			const m = await ( await browser.newContext( { viewport: { width: w, height: 800 } } ) ).newPage();
			m.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ ${ w }` ) );
			await m.goto( pg.url );
			await m.waitForTimeout( 1200 );
			const r1 = await rect( m, 'c1' );
			const r2 = await rect( m, 'c2' );
			const p1 = await arrow( m, 'cn000001' );
			const overflow = await m.evaluate( () => document.documentElement.scrollWidth - window.innerWidth );
			check( `${ w }px`, 'stacked containers: the 1 > 2 arrow turns down, from 1\'s bottom to 2\'s top, no sideways scrolling', p1 && near( p1.start[ 1 ], r1.b + 4 ) && near( p1.end[ 1 ], r2.t - 4 ) && near( p1.start[ 0 ], r1.cx ) && overflow <= 0, JSON.stringify( { p1, r1, r2, overflow } ) );
			if ( 375 === w ) {
				await m.screenshot( { path: join( SHOTS, 'connector-375.png' ), fullPage: true } );
			}
			await m.context().close();
		}

		// ------------------------------------------------------------ Edit Mode
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ctx.newPage();
		e.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ editor` ) );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ pg.id }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const f = e.frame( { name: 'refraction-preview-iframe' } );
		let ea = await arrow( f, 'cn000001' );
		const er2 = await rect( f, 'c2' );
		check( 'editor', 'Edit Mode draws the arrows as on the site', ea && near( ea.end[ 0 ], er2.l - 4 ), JSON.stringify( { ea, er2 } ) );
		await f.click( '[data-id="cn000001"] .rf-cn__chip' );
		await sleep( 800 );
		const picked = await e.evaluate( () => refraction.selection.getElements().map( ( x ) => x.model.get( 'widgetType' ) ).join() );
		check( 'editor', 'the Connector chip shows and selects the widget', 'refraction-connector' === picked, picked );
		await e.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'cn000001' ), settings: { to_side: 'top', to_at: { size: 20 } } } ) );
		await sleep( 800 );
		ea = await arrow( f, 'cn000001' );
		check( 'editor', 'Side "top" at 20% for the end: redrawn at once, ending above 2, a fifth of the way along', ea && near( ea.end[ 1 ], er2.t - 4 ) && near( ea.end[ 0 ], Math.round( er2.l + ( ( er2.r - er2.l ) * 0.2 ) ) ), JSON.stringify( { ea, er2 } ) );
		await e.evaluate( () => $e.run( 'panel/change-device-mode', { device: 'mobile' } ) );
		await sleep( 2500 );
		ea = await arrow( f, 'cn000002' );
		const m2 = await rect( f, 'c2' );
		check( 'editor', 'the phone view redraws: 2 > 4 still leaves 2\'s bottom', ea && near( ea.start[ 1 ], m2.b + 4 ), JSON.stringify( { ea, m2 } ) );
		await e.screenshot( { path: join( SHOTS, 'connector-editor.png' ) } );

		check( 'site', 'no JavaScript errors', ! errors.length, errors.slice( 0, 4 ).join( ' | ' ) );
		const php = logTail( logStart );
		check( 'site', 'no PHP errors', ! /PHP (Fatal|Warning|Parse|Deprecated)/.test( php ), php.slice( 0, 600 ) );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } failed` : '\nall passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( err ) => {
	console.error( err );
	process.exit( 1 );
} );
