#!/usr/bin/env node
/**
 * Pin Board (0.143.0), SQLite test site, Chromium:
 * - desktop zigzag: notes left and right in turn, each rising beside the one before, tilted in turn, pins coloured in
 *   turn (orange, blue, purple), a dashed curve from each note to the next (from its facing side), lined paper;
 * - grid: three columns, no curves (lines in the zigzag only by default);
 * - phones (430, 393, 375): wider notes (82%), a gentler tilt (60%), curves still drawn, no sideways scrolling;
 * - Edit Mode: a new Pin Board starts with five numbered notes; Add Note adds a note and a curve; Grid takes the curves
 *   away at once.
 * - 0.144.0: the reveal (notes out of view wait, in view they come in and the lines draw), straight long-dash lines
 *   with arrows, a gradient board under the paper; Heading and Footer containers; dragging a note (the screen size turns
 *   Free, the others staying), resizing it by its handle, Undo, and the places on the site.
 *
 * Usage: node scripts/check-pin-board.mjs [--site /tmp/rf-pb-site] [--port 9382] [--shots /tmp/pin-board-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-pb-site' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/pin-board-shots' );
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
const id = () => 'pb' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const papers = [ '#FDEBDF', '#E4E9FE', '#F2E5FD' ];
const titles = [ 'Testimonials', 'Trust Badges', 'Add Contacts', 'Case Studies', 'Clear Refund Policy', 'Pexels' ];
const note = ( n ) => ( {
	id: id(), elType: 'container', isInner: true,
	settings: { _title: `Note #${ n }`, content_width: 'full', padding: { unit: 'px', top: '22', right: '22', bottom: '24', left: '22', isLinked: false }, background_background: 'classic', background_color: papers[ ( n - 1 ) % 3 ], border_radius: { unit: 'px', top: '14', right: '14', bottom: '14', left: '14', isLinked: true } },
	elements: [
		{ id: id(), elType: 'widget', widgetType: 'heading', settings: { title: String( n ).padStart( 2, '0' ), header_size: 'div' }, elements: [] },
		{ id: id(), elType: 'widget', widgetType: 'heading', settings: { title: titles[ ( n - 1 ) % titles.length ], header_size: 'h3' }, elements: [] },
		{ id: id(), elType: 'widget', widgetType: 'text-editor', settings: { editor: `<p>A few words for note ${ n }.${ 1 === n ? ' The first one says a little more than the others.' : '' }</p>` }, elements: [] },
	],
} );
const board = ( wid, settings = {}, n = 5 ) => ( {
	id: wid, elType: 'widget', widgetType: 'refraction-pin-board',
	settings: { items: Array.from( { length: n }, ( x, i ) => ( { _id: `${ wid }i${ i }`, item_title: `Note #${ i + 1 }` } ) ), ...settings },
	elements: Array.from( { length: n }, ( x, i ) => note( i + 1 ) ),
} );
const section = ( elements ) => ( { id: id(), elType: 'container', settings: { content_width: 'boxed', boxed_width: { unit: 'px', size: 900 }, padding: { unit: 'px', top: '30', right: '16', bottom: '30', left: '16', isLinked: false } }, elements } );

const measure = ( p, wid ) => p.evaluate( ( w ) => {
	const root = document.querySelector( `[data-id="${ w }"] .rf-pb` );
	const rb = root.getBoundingClientRect();
	const cs = getComputedStyle( root );
	const notes = [ ...root.querySelectorAll( ':scope > .rf-pb__notes > .rf-pb__note' ) ].map( ( n ) => {
		// The note's own box, without its tilt.
		const rotate = getComputedStyle( n ).rotate;
		n.style.transition = 'none';
		n.style.rotate = '0deg';
		const r = n.getBoundingClientRect();
		n.style.rotate = '';
		n.getBoundingClientRect();
		n.style.transition = '';
		const pin = n.querySelector( ':scope > .rf-pb__pin' );
		return { l: Math.round( r.left - rb.left ), r: Math.round( r.right - rb.left ), t: Math.round( r.top - rb.top ), b: Math.round( r.bottom - rb.top ), w: Math.round( r.width ), rotate, pin: pin ? getComputedStyle( pin ).color : null, text: n.querySelector( '.refraction-heading-title' )?.textContent.trim() };
	} );
	const paths = [ ...root.querySelectorAll( ':scope > .rf-pb__links path' ) ].map( ( path ) => {
		const len = path.getTotalLength();
		const a = path.getPointAtLength( 0 );
		const b = path.getPointAtLength( len );
		return { a: [ Math.round( a.x ), Math.round( a.y ) ], b: [ Math.round( b.x ), Math.round( b.y ) ], dash: path.getAttribute( 'stroke-dasharray' ) };
	} );
	return { notes, paths, inner: Math.round( rb.width - parseFloat( cs.paddingLeft ) - parseFloat( cs.paddingRight ) ), padL: Math.round( parseFloat( cs.paddingLeft ) ), bg: cs.backgroundImage.slice( 0, 26 ), overflow: document.documentElement.scrollWidth - window.innerWidth };
}, wid );
const deg = ( v ) => parseFloat( v ) || 0;
const near = ( a, b, tol = 3 ) => Math.abs( a - b ) <= tol;

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
		const pg = page( 'Pin board', [
			section( [ board( 'pba0001' ) ] ),
			section( [ board( 'pbb0001', { layout: 'grid', pin: 'tape', paper: 'dots' }, 6 ) ] ),
			{ id: id(), elType: 'container', settings: { min_height: { unit: 'px', size: 1400 } }, elements: [] },
			section( [ board( 'pbc0001', { reveal: 'drop', reveal_duration: 400, reveal_stagger: 60, link_shape: 'straight', link_style: 'long', link_marker: 'arrow', board_background_background: 'gradient', board_background_color: '#FDE68A', board_background_color_b: '#BFDBFE' }, 4 ) ] ),
		] );

		// ------------------------------------------------------------ desktop
		const d = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
		d.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ desktop` ) );
		await d.goto( pg.url );
		await d.waitForTimeout( 1200 );
		let m = await measure( d, 'pba0001' );
		const n = m.notes;
		check( 'desktop', 'zigzag: notes left, right, left, right, left, each 44% of the board', n.every( ( x, i ) => ( 0 === i % 2 ? near( x.l, m.padL ) : near( x.r, m.padL + m.inner ) ) && near( x.w, m.inner * 0.44, 2 ) ), JSON.stringify( { n, inner: m.inner, padL: m.padL } ) );
		check( 'desktop', 'each note rises beside the one before (overlapping its height)', n.slice( 1 ).every( ( x, i ) => x.t < n[ i ].b ), JSON.stringify( n.map( ( x ) => [ x.t, x.b ] ) ) );
		check( 'desktop', 'tilted in turn (-5, 4, -3, 5, -4 degrees) with pins orange, blue, purple in turn', '-5,4,-3,5,-4' === n.map( ( x ) => deg( x.rotate ) ).join() && 'rgb(242, 100, 59),rgb(59, 108, 242),rgb(139, 92, 246),rgb(242, 100, 59)' === n.slice( 0, 4 ).map( ( x ) => x.pin ).join(), JSON.stringify( n.map( ( x ) => [ x.rotate, x.pin ] ) ) );
		check( 'desktop', 'four dashed curves, each from a note\'s side facing the next to the next note\'s facing side', 4 === m.paths.length && m.paths.every( ( p, i ) => {
			const a = n[ i ];
			const b = n[ i + 1 ];
			const right = 0 === i % 2;
			// The curves meet the notes as they are drawn: tilted, so a few pixels outside their straight sides.
			return near( p.a[ 0 ], right ? a.r : a.l, 14 ) && near( p.b[ 0 ], right ? b.l : b.r, 14 ) && p.dash;
		} ), JSON.stringify( { paths: m.paths, n: n.map( ( x ) => [ x.l, x.r ] ) } ) );
		check( 'desktop', 'the board is lined paper', m.bg.startsWith( 'repeating-linear-gradient' ), m.bg );
		await d.locator( '[data-id="pba0001"]' ).screenshot( { path: join( SHOTS, 'pin-board-1200.png' ) } );
		m = await measure( d, 'pbb0001' );
		check( 'desktop', 'grid: three notes a row, sharing it; no curves; dotted paper', near( m.notes[ 0 ].t, m.notes[ 2 ].t, 30 ) && m.notes[ 3 ].t > m.notes[ 0 ].b - 30 && 0 === m.paths.length && m.bg.startsWith( 'radial-gradient' ), JSON.stringify( { notes: m.notes.map( ( x ) => [ x.l, x.t, x.w ] ), paths: m.paths.length, bg: m.bg } ) );
		await d.locator( '[data-id="pbb0001"]' ).screenshot( { path: join( SHOTS, 'pin-board-grid-1200.png' ) } );
		check( 'desktop', 'no sideways scrolling', m.overflow <= 0, m.overflow );

		// ---- 0.144.0: reveal, lines, board background
		const pending = await d.evaluate( () => [ ...document.querySelectorAll( '[data-id="pbc0001"] .rf-pb__note' ) ].map( ( n ) => n.classList.contains( 'is-pending' ) ).join() );
		check( 'reveal', 'notes not yet in view wait for it (hidden)', 'true,true,true,true' === pending, pending );
		await d.evaluate( () => document.querySelector( '[data-id="pbc0001"]' ).scrollIntoView( { block: 'start', behavior: 'instant' } ) );
		await d.waitForTimeout( 2200 );
		const revealed = await d.evaluate( () => {
			const root = document.querySelector( '[data-id="pbc0001"] .rf-pb' );
			const notes = [ ...root.querySelectorAll( '.rf-pb__note' ) ];
			const lines = [ ...root.querySelectorAll( '.rf-pb__reveal-line' ) ].map( ( l ) => l.getAttribute( 'stroke-dashoffset' ) );
			const link = root.querySelector( 'path.rf-pb__link' );
			return {
				visible: notes.filter( ( n ) => ! n.classList.contains( 'is-pending' ) && '1' === getComputedStyle( n ).opacity ).length,
				inView: notes.filter( ( n ) => n.getBoundingClientRect().top < window.innerHeight * 0.85 ).length,
				lines,
				d: link && link.getAttribute( 'd' ),
				dash: link && link.getAttribute( 'stroke-dasharray' ),
				arrow: !! ( link && link.getAttribute( 'marker-end' ) ),
				bg: getComputedStyle( root ).backgroundImage.slice( 0, 15 ),
				paper: getComputedStyle( root, '::before' ).backgroundImage.slice( 0, 26 ),
			};
		} );
		check( 'reveal', 'in view, the notes have come in (dropped and pinned) and the lines between them have drawn themselves', revealed.visible >= 2 && revealed.visible >= revealed.inView && revealed.lines.slice( 0, revealed.visible - 1 ).every( ( o ) => '0' === o ), JSON.stringify( revealed ) );
		check( 'lines', 'straight lines, long dashes, an arrow at the next note', / L/.test( revealed.d || '' ) && ! / C/.test( revealed.d || '' ) && revealed.dash && revealed.dash.split( ' ' )[ 0 ] === '15' && revealed.arrow, JSON.stringify( revealed ) );
		check( 'board', 'the board takes a gradient background, the lined paper still over it', revealed.bg.startsWith( 'linear-gradient' ) && revealed.paper.startsWith( 'repeating-linear' ), JSON.stringify( revealed ) );
		await d.locator( '[data-id="pbc0001"]' ).screenshot( { path: join( SHOTS, 'pin-board-reveal-1200.png' ) } );
		await d.context().close();

		// ------------------------------------------------------------ phones
		for ( const w of [ 430, 393, 375 ] ) {
			const p = await ( await browser.newContext( { viewport: { width: w, height: 800 } } ) ).newPage();
			p.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ ${ w }` ) );
			await p.goto( pg.url );
			await p.waitForTimeout( 1200 );
			const pm = await measure( p, 'pba0001' );
			const ok = pm.notes.every( ( x ) => near( x.w, pm.inner * 0.82, 2 ) && x.l >= 0 ) && near( deg( pm.notes[ 0 ].rotate ), -3 ) && 4 === pm.paths.length && pm.overflow <= 0;
			check( `${ w }px`, 'zigzag with notes 82% wide, a gentler tilt (60%: -3 degrees), the curves drawn, no sideways scrolling', ok, JSON.stringify( { notes: pm.notes.map( ( x ) => [ x.l, x.w, x.rotate ] ), inner: pm.inner, paths: pm.paths.length, overflow: pm.overflow } ) );
			const gm = await measure( p, 'pbb0001' );
			check( `${ w }px`, 'the grid is one column on phones', gm.notes.every( ( x, i ) => 0 === i || x.t > gm.notes[ i - 1 ].t + 40 ), JSON.stringify( gm.notes.map( ( x ) => x.t ) ) );
			if ( 375 === w ) {
				await p.locator( '[data-id="pba0001"]' ).screenshot( { path: join( SHOTS, 'pin-board-375.png' ) } );
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
			const box = $e.run( 'document/elements/create', { container: doc, model: { elType: 'container', settings: { content_width: 'boxed', boxed_width: { unit: 'px', size: 900 } } }, options: { edit: false, at: 0 } } );
			return $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'refraction-pin-board' }, options: { edit: false } } ).id;
		} );
		await sleep( 2500 );
		let em = await measure( f, made );
		check( 'editor', 'a new Pin Board starts with five notes numbered 01 to 05, in a zigzag, with four curves', '01,02,03,04,05' === em.notes.map( ( x ) => x.text ).join() && 4 === em.paths.length && em.notes[ 1 ].l > em.notes[ 0 ].l + 100, JSON.stringify( { notes: em.notes.map( ( x ) => [ x.text, x.l ] ), paths: em.paths.length } ) );
		await e.evaluate( ( wid ) => $e.run( 'document/repeater/insert', { container: refraction.getContainer( wid ), name: 'items', model: { item_title: 'Note #6' } } ), made );
		await sleep( 1500 );
		em = await measure( f, made );
		check( 'editor', 'Add Note: six notes, five curves, the new one on the right', 6 === em.notes.length && 5 === em.paths.length && em.notes[ 5 ].l > em.notes[ 4 ].l, JSON.stringify( { n: em.notes.length, paths: em.paths.length } ) );
		await e.evaluate( ( wid ) => $e.run( 'document/elements/settings', { container: refraction.getContainer( wid ), settings: { layout: 'grid' } } ), made );
		await sleep( 1200 );
		em = await measure( f, made );
		check( 'editor', 'Layout: Grid shows at once, without the curves', 0 === em.paths.length && near( em.notes[ 0 ].t, em.notes[ 1 ].t, 30 ), JSON.stringify( { paths: em.paths.length, t: em.notes.map( ( x ) => x.t ) } ) );
		await e.screenshot( { path: join( SHOTS, 'pin-board-editor.png' ) } );

		// ---- 0.144.0: Heading and Footer, drag and resize.
		await e.evaluate( ( wid ) => $e.run( 'document/elements/settings', { container: refraction.getContainer( wid ), settings: { layout: 'zigzag', show_heading: 'yes', show_footer: 'yes' } } ), made );
		await sleep( 1800 );
		const parts = await e.evaluate( ( wid ) => {
			const c = refraction.getContainer( wid );
			const rows = c.repeaters.items.children.map( ( r ) => r.settings.get( 'role' ) || 'note' );
			return { rows: rows.join(), first: c.children[ 0 ].children.map( ( w ) => w.settings.get( 'title' ) ).filter( Boolean ).join( '|' ), names: c.children.map( ( x ) => x.model.getTitle() ).join( '|' ) };
		}, made );
		const partBoxes = await f.evaluate( ( wid ) => {
			const root = document.querySelector( `[data-id="${ wid }"] .rf-pb__notes` );
			const r = root.getBoundingClientRect();
			const h = root.querySelector( ':scope > .rf-pb__part--heading' ).getBoundingClientRect();
			const ft = root.querySelector( ':scope > .rf-pb__part--footer' ).getBoundingClientRect();
			const notes = [ ...root.querySelectorAll( ':scope > .rf-pb__note' ) ].map( ( n ) => n.getBoundingClientRect() );
			return { full: Math.round( h.width ) === Math.round( r.width ) && Math.round( ft.width ) === Math.round( r.width ), above: h.bottom <= Math.min( ...notes.map( ( n ) => n.top ) ) + 2, below: ft.top >= Math.max( ...notes.map( ( n ) => n.bottom ) ) - 2 };
		}, made );
		check( 'parts', 'Heading and Footer: containers first and last in the list, across the board above and below the notes, the heading starting with its title; notes still Note #1...', 'heading,note,note,note,note,note,note,footer' === parts.rows && /Our route/.test( parts.first ) && /^Heading\|Note #1\|Note #2/.test( parts.names ) && /Footer$/.test( parts.names ) && partBoxes.full && partBoxes.above && partBoxes.below, JSON.stringify( { parts, partBoxes } ) );
		// Drag the second note by its frame (zigzag: this screen size turns Free, every note staying put).
		const noteBox = async ( k ) => f.evaluate( ( [ wid, i ] ) => {
			const n = document.querySelectorAll( `[data-id="${ wid }"] .rf-pb__notes > .rf-pb__note` )[ i ];
			return { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth };
		}, [ made, k ] );
		const before = [ await noteBox( 0 ), await noteBox( 1 ), await noteBox( 2 ) ];
		const grab = await f.locator( `[data-id="${ made }"] .rf-pb__notes > .rf-pb__note >> nth=1` ).boundingBox();
		await e.mouse.move( grab.x + 30, grab.y + 14 );
		await e.mouse.down();
		await e.mouse.move( grab.x + 60, grab.y + 40, { steps: 6 } );
		await e.mouse.move( grab.x - 30, grab.y + 74, { steps: 6 } );
		await e.mouse.up();
		await sleep( 1500 );
		const after = [ await noteBox( 0 ), await noteBox( 1 ), await noteBox( 2 ) ];
		const saved = await e.evaluate( ( wid ) => {
			const c = refraction.getContainer( wid );
			const row = c.repeaters.items.children[ 2 ];
			return [ c.settings.get( 'layout' ), row.settings.get( 'pos_x' )?.size, row.settings.get( 'pos_y' )?.size, row.settings.get( 'note_w' )?.size ].join( '|' );
		}, made );
		check( 'drag', 'dragging the second note by its frame moves it by the drag (-60, +60), the others staying put; this screen size is now Free with the places saved', /^free\|/.test( saved ) && Math.abs( after[ 1 ].x - ( before[ 1 ].x - 60 ) ) <= 3 && Math.abs( after[ 1 ].y - ( before[ 1 ].y + 60 ) ) <= 3 && Math.abs( after[ 0 ].x - before[ 0 ].x ) <= 2 && Math.abs( after[ 0 ].y - before[ 0 ].y ) <= 2 && Math.abs( after[ 2 ].y - before[ 2 ].y ) <= 2, JSON.stringify( { before, after, saved } ) );
		// Resize the first note by its right-edge handle.
		await f.hover( `[data-id="${ made }"] .rf-pb__notes > .rf-pb__note >> nth=0` );
		const handle = await f.locator( `[data-id="${ made }"] .rf-pb__notes > .rf-pb__note >> nth=0 >> .rf-pb__resize` ).boundingBox();
		await e.mouse.move( handle.x + 7, handle.y + 22 );
		await e.mouse.down();
		await e.mouse.move( handle.x - 40, handle.y + 22, { steps: 5 } );
		await e.mouse.move( handle.x - 73, handle.y + 22, { steps: 5 } );
		await e.mouse.up();
		await sleep( 1200 );
		const resized = await noteBox( 0 );
		check( 'drag', 'the handle on the right edge makes the note 80px narrower, kept where it was', Math.abs( resized.w - ( after[ 0 ].w - 80 ) ) <= 4 && Math.abs( resized.x - after[ 0 ].x ) <= 2, JSON.stringify( { was: after[ 0 ], now: resized } ) );
		await e.evaluate( () => $e.run( 'document/history/undo' ) );
		await sleep( 800 );
		check( 'drag', 'Undo takes the width back in one step', Math.abs( ( await noteBox( 0 ) ).w - after[ 0 ].w ) <= 3 );
		await e.evaluate( () => $e.run( 'document/history/redo' ) );
		await sleep( 800 );
		await e.screenshot( { path: join( SHOTS, 'pin-board-editor-free.png' ) } );
		// Saved: the site shows the notes where they were put.
		const inEditor = [ await noteBox( 0 ), await noteBox( 1 ) ];
		await e.evaluate( async () => {
			await $e.run( 'document/save/publish' );
		} );
		await sleep( 1500 );
		const site = await ( await browser.newContext( { viewport: { width: 1500, height: 950 } } ) ).newPage();
		site.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ site` ) );
		await site.goto( pg.url );
		await site.waitForTimeout( 1200 );
		const onSite = await site.evaluate( ( wid ) => [ ...document.querySelectorAll( `[data-id="${ wid }"] .rf-pb__notes > .rf-pb__note` ) ].slice( 0, 2 ).map( ( n ) => ( { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth } ) ), made );
		check( 'drag', 'on the site the notes are where they were put in Edit Mode (place and width)', onSite.every( ( p, i ) => Math.abs( p.x - inEditor[ i ].x ) <= 3 && Math.abs( p.y - inEditor[ i ].y ) <= 3 && Math.abs( p.w - inEditor[ i ].w ) <= 3 ), JSON.stringify( { inEditor, onSite } ) );
		await site.context().close();

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
