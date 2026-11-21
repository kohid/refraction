#!/usr/bin/env node
/**
 * Connector, steps with arrows (0.142.0), SQLite test site, Chromium:
 * - desktop: four steps sharing the row, an arrow in each gap (three), centred between the two steps, pointing right,
 *   none after the last step;
 * - other looks: solid line with an arrow in a circle, the head only, an icon; the flowing line;
 * - phones (430, 393, 375): steps one under another, arrows pointing down between them, no sideways scrolling;
 * - Edit Mode: a new Connector starts with four numbered steps; Add Step and moving steps keep an arrow between each
 *   step and the next (none after the last); the phone view stacks them.
 *
 * Usage: node scripts/check-connector-steps.mjs [--site /tmp/rf-cs-site] [--port 9382] [--shots /tmp/connector-steps-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-cs-site' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/connector-steps-shots' );
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

let uid = 0;
const id = () => 'cs' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const step = ( n ) => ( {
	id: id(), elType: 'container', isInner: true,
	settings: { _title: `Step #${ n }`, content_width: 'full', padding: { unit: 'px', top: '24', right: '20', bottom: '24', left: '20', isLinked: false }, background_background: 'classic', background_color: '#FFFFFF', border_radius: { unit: 'px', top: '16', right: '16', bottom: '16', left: '16', isLinked: true } },
	elements: [
		{ id: id(), elType: 'widget', widgetType: 'heading', settings: { title: String( n ).padStart( 2, '0' ), header_size: 'div' }, elements: [] },
		{ id: id(), elType: 'widget', widgetType: 'text-editor', settings: { editor: `<p>What happens at step ${ n }.${ 1 === n ? ' A longer first step, so the steps differ in height.' : '' }</p>` }, elements: [] },
	],
} );
const steps = ( wid, settings = {}, n = 4 ) => ( {
	id: wid, elType: 'widget', widgetType: 'refraction-connector-steps',
	settings: { items: Array.from( { length: n }, ( x, i ) => ( { _id: `${ wid }i${ i }`, item_title: `Step #${ i + 1 }` } ) ), ...settings },
	elements: Array.from( { length: n }, ( x, i ) => step( i + 1 ) ),
} );
const section = ( elements ) => ( { id: id(), elType: 'container', settings: { content_width: 'boxed', boxed_width: { unit: 'px', size: 1140 }, background_background: 'classic', background_color: '#F1F4F8', padding: { unit: 'px', top: '40', right: '16', bottom: '40', left: '16', isLinked: false } }, elements } );

// Every step and arrow of a Connector, measured.
const measure = ( p, wid ) => p.evaluate( ( w ) => {
	const root = document.querySelector( `[data-id="${ w }"] .rf-cs` );
	const items = [ ...root.querySelectorAll( ':scope > .rf-cs__step' ) ];
	return {
		overflow: document.documentElement.scrollWidth - window.innerWidth,
		steps: items.map( ( item ) => {
			const con = item.querySelector( ':scope > .e-con' ).getBoundingClientRect();
			const arrow = item.querySelector( ':scope > .rf-cs__arrow' );
			const a = arrow ? arrow.getBoundingClientRect() : null;
			const head = arrow && arrow.querySelector( '.rf-cs__head' );
			const line = arrow && arrow.querySelector( '.rf-cs__line' );
			return {
				l: Math.round( con.left ), r: Math.round( con.right ), t: Math.round( con.top ), b: Math.round( con.bottom ), w: Math.round( con.width ),
				text: item.querySelector( '.refraction-heading-title' )?.textContent.trim(),
				arrow: a ? { cx: Math.round( a.left + ( a.width / 2 ) ), cy: Math.round( a.top + ( a.height / 2 ) ), w: Math.round( a.width ), h: Math.round( a.height ), head: !! head && !! head.querySelector( 'svg, i' ), headX: head ? Math.round( head.getBoundingClientRect().left + ( head.getBoundingClientRect().width / 2 ) ) : null, headY: head ? Math.round( head.getBoundingClientRect().top + ( head.getBoundingClientRect().height / 2 ) ) : null, line: line ? getComputedStyle( line ).display : null, bg: line ? getComputedStyle( line ).backgroundImage.slice( 0, 15 ) : '', anim: line ? getComputedStyle( line ).animationName : '', circle: head ? getComputedStyle( head ).borderRadius : '' } : null,
			};
		} ),
	};
}, wid );
const near = ( a, b, tol = 2 ) => Math.abs( a - b ) <= tol;

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
		const pg = page( 'Connector steps', [
			section( [ steps( 'csa0001' ) ] ),
			section( [ steps( 'csb0001', { line: 'solid', head: 'circle', circle_bg: '#2563EB', motion: 'flow' }, 3 ) ] ),
			section( [ steps( 'csc0001', { line: 'none', head: 'double', motion: 'nudge' }, 3 ) ] ),
			section( [ steps( 'csd0001', { line: 'dashed', head: 'icon', head_icon: { value: 'fas fa-arrow-right', library: 'fa-solid' }, motion: 'flow' }, 3 ) ] ),
		] );

		// ------------------------------------------------------------ desktop
		const d = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
		d.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ desktop` ) );
		await d.goto( pg.url );
		await d.waitForTimeout( 900 );
		let m = await measure( d, 'csa0001' );
		const s = m.steps;
		const widths = s.map( ( x ) => x.w );
		check( 'desktop', 'four steps in a row, sharing it equally', 4 === s.length && s.every( ( x, i ) => 0 === i || x.l > s[ i - 1 ].r ) && Math.max( ...widths ) - Math.min( ...widths ) <= 2, JSON.stringify( s.map( ( x ) => [ x.l, x.r, x.w ] ) ) );
		check( 'desktop', 'three arrows, one in each gap, centred between the two steps and at their middle; none after the last', s.slice( 0, 3 ).every( ( x, i ) => x.arrow && near( x.arrow.cx, ( x.r + s[ i + 1 ].l ) / 2 ) && near( x.arrow.cy, ( x.t + x.b ) / 2 ) ) && ! s[ 3 ].arrow, JSON.stringify( s.map( ( x ) => [ x.r, x.arrow && x.arrow.cx, x.arrow && x.arrow.cy, ( x.t + x.b ) / 2 ] ) ) );
		check( 'desktop', 'each arrow points right: a dotted line, then the chevron head at its right end, inside the gap (64 - 2 x 8 = 48px)', s.slice( 0, 3 ).every( ( x ) => x.arrow.head && x.arrow.headX > x.arrow.cx && x.arrow.w === 48 && x.arrow.bg.startsWith( 'radial-gradient' ) ), JSON.stringify( s.map( ( x ) => x.arrow ) ) );
		await d.locator( '[data-id="csa0001"]' ).screenshot( { path: join( SHOTS, 'connector-steps-1200.png' ) } );
		m = await measure( d, 'csb0001' );
		check( 'desktop', 'solid line with an arrow in a circle, the line flowing', m.steps[ 0 ].arrow && '50%' === m.steps[ 0 ].arrow.circle && 'rf-cs-flow' === m.steps[ 0 ].arrow.anim, JSON.stringify( m.steps[ 0 ].arrow ) );
		m = await measure( d, 'csc0001' );
		check( 'desktop', 'the head only (no line), a double chevron in the middle of the gap', m.steps[ 0 ].arrow && 'none' === m.steps[ 0 ].arrow.line && near( m.steps[ 0 ].arrow.headX, m.steps[ 0 ].arrow.cx, 3 ), JSON.stringify( m.steps[ 0 ].arrow ) );
		m = await measure( d, 'csd0001' );
		check( 'desktop', 'an icon as the head, on a dashed line', m.steps[ 0 ].arrow && m.steps[ 0 ].arrow.head && m.steps[ 0 ].arrow.bg.startsWith( 'linear-gradient' ), JSON.stringify( m.steps[ 0 ].arrow ) );
		await d.screenshot( { path: join( SHOTS, 'connector-steps-looks-1200.png' ), fullPage: true } );
		check( 'desktop', 'no sideways scrolling', m.overflow <= 0, m.overflow );
		await d.context().close();

		// ------------------------------------------------------------ phones
		for ( const w of [ 430, 393, 375 ] ) {
			const p = await ( await browser.newContext( { viewport: { width: w, height: 800 } } ) ).newPage();
			p.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ ${ w }` ) );
			await p.goto( pg.url );
			await p.waitForTimeout( 900 );
			const pm = await measure( p, 'csa0001' );
			const ps = pm.steps;
			const ok = ps.every( ( x, i ) => 0 === i || x.t > ps[ i - 1 ].b ) &&
				ps.slice( 0, 3 ).every( ( x, i ) => x.arrow && near( x.arrow.cy, ( x.b + ps[ i + 1 ].t ) / 2 ) && near( x.arrow.cx, ( x.l + x.r ) / 2 ) && x.arrow.h > x.arrow.w && x.arrow.headY > x.arrow.cy ) &&
				! ps[ 3 ].arrow && ps.every( ( x ) => x.l >= 0 && x.r <= w ) && pm.overflow <= 0;
			check( `${ w }px`, 'steps one under another, arrows pointing down between them (head below the middle), none after the last, inside the screen', ok, JSON.stringify( ps.map( ( x ) => [ x.t, x.b, x.arrow ] ) ) );
			if ( 375 === w ) {
				await p.locator( '[data-id="csa0001"]' ).screenshot( { path: join( SHOTS, 'connector-steps-375.png' ) } );
			}
			await p.context().close();
		}

		// ------------------------------------------------------------ Edit Mode
		const e = await ( await browser.newContext( { viewport: { width: 1500, height: 950 } } ) ).newPage();
		e.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ editor` ) );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ pg.id }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const f = e.frame( { name: 'refraction-preview-iframe' } );
		const made = await e.evaluate( () => {
			const doc = refraction.documents.getCurrent().container;
			const box = $e.run( 'document/elements/create', { container: doc, model: { elType: 'container', settings: { content_width: 'boxed' } }, options: { edit: false, at: 0 } } );
			return $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'refraction-connector-steps' }, options: { edit: false } } ).id;
		} );
		await sleep( 2000 );
		let em = await measure( f, made );
		check( 'editor', 'a new Connector starts with four steps numbered 01 to 04, three arrows in a row', '01,02,03,04' === em.steps.map( ( x ) => x.text ).join() && 3 === em.steps.filter( ( x ) => x.arrow ).length && ! em.steps[ 3 ].arrow && em.steps.every( ( x, i ) => 0 === i || x.l > em.steps[ i - 1 ].r ), JSON.stringify( em.steps.map( ( x ) => [ x.text, !! x.arrow ] ) ) );
		await e.evaluate( ( wid ) => {
			const c = refraction.getContainer( wid );
			$e.run( 'document/repeater/insert', { container: c, name: 'items', model: { item_title: 'Step #5' } } );
		}, made );
		await sleep( 1500 );
		em = await measure( f, made );
		check( 'editor', 'Add Step: five steps, an arrow after each but the last (now also after the fourth)', 5 === em.steps.length && '1,1,1,1,0' === em.steps.map( ( x ) => ( x.arrow ? 1 : 0 ) ).join() && em.steps.slice( 0, 4 ).every( ( x, i ) => near( x.arrow.cx, ( x.r + em.steps[ i + 1 ].l ) / 2 ) ), JSON.stringify( em.steps.map( ( x ) => [ x.text, x.r, x.arrow && x.arrow.cx ] ) ) );
		await e.evaluate( ( wid ) => $e.run( 'document/repeater/move', { container: refraction.getContainer( wid ), name: 'items', sourceIndex: 4, targetIndex: 0 } ), made );
		await sleep( 1500 );
		em = await measure( f, made );
		check( 'editor', 'moving the last step to the front: still an arrow after each but the last, each step\'s content in its place', '1,1,1,1,0' === em.steps.map( ( x ) => ( x.arrow ? 1 : 0 ) ).join() && '01,02,03,04' === em.steps.slice( 1 ).map( ( x ) => x.text ).join(), JSON.stringify( em.steps.map( ( x ) => [ x.text, !! x.arrow ] ) ) );
		await e.evaluate( () => $e.run( 'panel/change-device-mode', { device: 'mobile' } ) );
		await sleep( 2500 );
		em = await measure( f, 'csa0001' );
		check( 'editor', 'the phone view stacks the steps, arrows pointing down', em.steps.every( ( x, i ) => 0 === i || x.t > em.steps[ i - 1 ].b ) && em.steps[ 0 ].arrow.h > em.steps[ 0 ].arrow.w, JSON.stringify( em.steps.map( ( x ) => [ x.t, x.b, x.arrow && [ x.arrow.w, x.arrow.h ] ] ) ) );
		const titles = await e.evaluate( () => [ refraction.widgetsCache[ 'refraction-connector-steps' ]?.title, refraction.widgetsCache[ 'refraction-connector' ]?.title ].join( '|' ) );
		check( 'editor', 'in the panel: "Connector" (the steps) and "Arrow Link" (an arrow between two elements)', 'Connector|Arrow Link' === titles, titles );

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
