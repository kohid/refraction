#!/usr/bin/env node
/**
 * Timeline widget (0.139.0), SQLite test site, Chromium:
 * - middle layout on desktop: entries on alternate sides of the line, markers on the line, the text across the line,
 *   the pointer at the entry's edge towards the line, the line from the first marker to the last;
 * - the scroll fill: the line colours in to the middle of the screen, the markers it passed are "reached";
 * - line on the right with icon markers; numbered markers (01) in the middle of their entries;
 * - Zigzag: alternate sides, each entry starting half-way down the one before, never over its own side's earlier entry,
 *   clicks still reaching the entry beside; one line on the left on phones;
 * - phones (430, 393, 375) and tablet: the line on the left, every entry right of it and inside the screen, no sideways
 *   scrolling, the text across the line hidden;
 * - Edit Mode: the same layout, a Layout change shows at once, Add Entry gives an entry in its own slot with a marker,
 *   and the phone view puts the line on the left.
 *
 * Usage: node scripts/check-timeline.mjs [--site /tmp/rf-tl-site] [--port 9382] [--shots /tmp/timeline-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-tl-site' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/timeline-shots' );
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
const id = () => 'tl' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const card = ( n, extra = '' ) => ( {
	id: id(), elType: 'container', isInner: true,
	settings: { _title: `Entry #${ n }`, content_width: 'full', padding: { unit: 'px', top: '20', right: '20', bottom: '20', left: '20', isLinked: true }, background_background: 'classic', background_color: '#FFFFFF', border_radius: { unit: 'px', top: '12', right: '12', bottom: '12', left: '12', isLinked: true } },
	elements: [
		{ id: id(), elType: 'widget', widgetType: 'heading', settings: { title: `Milestone ${ n }`, header_size: 'h3' }, elements: [] },
		{ id: id(), elType: 'widget', widgetType: 'text-editor', settings: { editor: `<p>What happened at milestone ${ n }. ${ extra }</p>` }, elements: [] },
	],
} );
const timeline = ( wid, settings, n = 3 ) => ( {
	id: wid, elType: 'widget', widgetType: 'refraction-timeline',
	settings: {
		items: Array.from( { length: n }, ( x, i ) => ( { _id: `${ wid }i${ i }`, item_title: `Entry #${ i + 1 }`, marker_text: String( 2017 + i ), aside: `March ${ 2017 + i }`, marker_icon: { value: 'fas fa-flag', library: 'fa-solid' } } ) ),
		...settings,
	},
	elements: Array.from( { length: n }, ( x, i ) => card( i + 1, 0 === i % 2 ? 'A longer entry, with a second sentence so the cards differ in height.' : '' ) ),
} );
const section = ( elements ) => ( { id: id(), elType: 'container', settings: { content_width: 'boxed', boxed_width: { unit: 'px', size: 1100 }, background_background: 'classic', background_color: '#F3F5F8', padding: { unit: 'px', top: '40', right: '16', bottom: '40', left: '16', isLinked: false } }, elements } );

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
	const at = async ( url, width, height = 900 ) => {
		const p = await ( await browser.newContext( { viewport: { width, height } } ) ).newPage();
		p.on( 'pageerror', ( x ) => errors.push( `${ x.message } @ ${ width }` ) );
		await p.goto( url );
		await p.waitForTimeout( 700 );
		return p;
	};

	// Where every part of a timeline is, relative to its line.
	const geometry = ( p, wid ) => p.evaluate( ( w ) => {
		const root = document.querySelector( `[data-id="${ w }"] .rf-tl` );
		const line = root.querySelector( ':scope > .rf-tl__line' ).getBoundingClientRect();
		const lineX = line.left + ( line.width / 2 );
		const items = [ ...root.querySelectorAll( ':scope > .rf-tl__items > .rf-tl__item' ) ].map( ( item ) => {
			const con = item.querySelector( ':scope > .e-con' ).getBoundingClientRect();
			const mk = item.querySelector( ':scope > .rf-tl__marker' );
			const m = mk.getBoundingClientRect();
			const ptr = item.querySelector( ':scope > .rf-tl__pointer' );
			const pr = ptr.getBoundingClientRect();
			const aside = item.querySelector( ':scope > .rf-tl__aside' );
			const ar = aside && getComputedStyle( aside ).display !== 'none' ? aside.getBoundingClientRect() : null;
			return {
				side: con.right <= lineX ? 'left' : ( con.left >= lineX ? 'right' : 'across' ),
				conL: Math.round( con.left ), conR: Math.round( con.right ), conW: Math.round( con.width ), conTop: Math.round( con.top ), conBottom: Math.round( con.bottom ), conH: Math.round( con.height ), conMid: Math.round( con.top + ( con.height / 2 ) ),
				markX: Math.round( m.left + ( m.width / 2 ) ), markY: Math.round( m.top + ( m.height / 2 ) ), markW: Math.round( m.width ),
				text: mk.textContent.trim(), icon: !! mk.querySelector( 'svg, i' ),
				ptr: 'none' !== getComputedStyle( ptr ).display ? { l: Math.round( pr.left ), r: Math.round( pr.right ), y: Math.round( pr.top + ( pr.height / 2 ) ) } : null,
				aside: ar ? { l: Math.round( ar.left ), r: Math.round( ar.right ), text: aside.textContent.trim() } : null,
				reached: item.classList.contains( 'is-reached' ),
			};
		} );
		return { lineX: Math.round( lineX ), lineTop: Math.round( line.top ), lineBottom: Math.round( line.bottom ), fill: root.querySelector( '.rf-tl__fill' ).getBoundingClientRect().height, items, overflow: document.documentElement.scrollWidth - window.innerWidth };
	}, wid );

	try {
		const pg = page( 'Timeline', [
			// Room above the first timeline, so the scroll fill can be seen filling.
			{ id: id(), elType: 'container', settings: { min_height: { unit: 'px', size: 700 } }, elements: [] },
			section( [ timeline( 'tla0001', { marker: 'text', progress: 'yes' } ) ] ),
			section( [ timeline( 'tlb0001', { marker: 'icon', layout: 'right', layout_mobile: 'right' } ) ] ),
			section( [ timeline( 'tlc0001', { marker: 'number', number_format: '01', marker_align: 'center', pointer: '' } ) ] ),
			section( [ timeline( 'tld0001', { layout: 'zigzag', zigzag_start: { size: 50 } }, 4 ) ] ),
			{ id: id(), elType: 'container', settings: { min_height: { unit: 'px', size: 900 } }, elements: [] },
		] );

		// ------------------------------------------------------------ desktop
		const d = await at( pg.url, 1300 );
		let g = await geometry( d, 'tla0001' );
		check( 'desktop', 'line in the middle: entries on alternate sides (left, right, left), markers on the line', 'left,right,left' === g.items.map( ( i ) => i.side ).join() && g.items.every( ( i ) => Math.abs( i.markX - g.lineX ) <= 1 ), JSON.stringify( g ) );
		check( 'desktop', 'Text markers show each entry\'s year', '2017,2018,2019' === g.items.map( ( i ) => i.text ).join(), g.items.map( ( i ) => i.text ).join() );
		check( 'desktop', 'the line runs from the first marker\'s middle to the last one\'s', Math.abs( g.lineTop - g.items[ 0 ].markY ) <= 2 && Math.abs( g.lineBottom - g.items[ 2 ].markY ) <= 2, JSON.stringify( [ g.lineTop, g.lineBottom, g.items.map( ( i ) => i.markY ) ] ) );
		check( 'desktop', 'each pointer sits on its entry\'s edge towards the line, level with the marker', g.items.every( ( i ) => i.ptr && ( 'left' === i.side ? Math.abs( i.ptr.l - i.conR ) <= 1 : Math.abs( i.ptr.r - i.conL ) <= 1 ) && Math.abs( i.ptr.y - i.markY ) <= 2 ), JSON.stringify( g.items.map( ( i ) => [ i.side, i.conL, i.conR, i.ptr, i.markY ] ) ) );
		check( 'desktop', 'the text across the line is on the other side, next to the line', g.items.every( ( i ) => i.aside && ( 'left' === i.side ? i.aside.l > g.lineX : i.aside.r < g.lineX ) ), JSON.stringify( g.items.map( ( i ) => [ i.side, i.aside ] ) ) );
		// The scroll fill: the middle of the screen between the second and third markers (measured again).
		g = await geometry( d, 'tla0001' );
		await d.evaluate( ( y ) => window.scrollBy( { top: y, behavior: 'instant' } ), Math.round( ( g.items[ 1 ].markY + g.items[ 2 ].markY ) / 2 ) - 450 );
		await d.waitForTimeout( 400 );
		g = await geometry( d, 'tla0001' );
		check( 'desktop', 'the line fills down to the middle of the screen; the first two markers are reached, the third not', g.fill > 20 && Math.abs( g.lineTop + g.fill - 450 ) <= 3 && '1,1,0' === g.items.map( ( i ) => ( i.reached ? 1 : 0 ) ).join(), JSON.stringify( [ g.fill, g.lineTop, g.items.map( ( i ) => i.reached ) ] ) );
		await d.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
		await d.screenshot( { path: join( SHOTS, 'timeline-1300.png' ), fullPage: true } );
		const gb = await geometry( d, 'tlb0001' );
		check( 'desktop', 'line on the right: every entry left of it, Icon markers', gb.items.every( ( i ) => 'left' === i.side && i.icon ) && gb.items.every( ( i ) => Math.abs( i.markX - gb.lineX ) <= 1 ), JSON.stringify( gb ) );
		const gc = await geometry( d, 'tlc0001' );
		check( 'desktop', 'numbered markers (01, 02, 03) in the middle of their entries, no pointer', '01,02,03' === gc.items.map( ( i ) => i.text ).join() && gc.items.every( ( i ) => Math.abs( i.markY - i.conMid ) <= 2 && ! i.ptr ), JSON.stringify( gc.items ) );
		check( 'desktop', 'no sideways scrolling', g.overflow <= 0, g.overflow );

		// Zigzag: each entry starts half-way down the one before, never over the one before it on its own side.
		const gz = await geometry( d, 'tld0001' );
		const zz = gz.items;
		const zigzagOk = 'left,right,left,right' === zz.map( ( i ) => i.side ).join() &&
			// Entries 2 and 4 start half-way down 1 and 3; 3 waits for 1 (its own side) and the space between entries.
			zz[ 1 ].conTop < zz[ 0 ].conBottom && zz[ 3 ].conTop < zz[ 2 ].conBottom &&
			Math.abs( zz[ 1 ].conTop - ( zz[ 0 ].conTop + ( zz[ 0 ].conH / 2 ) ) ) <= 3 &&
			Math.abs( zz[ 3 ].conTop - ( zz[ 2 ].conTop + ( zz[ 2 ].conH / 2 ) ) ) <= 3 &&
			zz.slice( 2 ).every( ( it, k ) => it.conTop >= zz[ k ].conBottom + 39 );
		check( 'desktop', 'Zigzag: alternate sides, each entry starting half-way down the one before (they interlock), never over the earlier entry on its own side', zigzagOk, JSON.stringify( zz.map( ( i ) => [ i.side, i.conTop, i.conBottom ] ) ) );
		const reach = await d.evaluate( () => {
			const first = document.querySelector( '[data-id="tld0001"] .rf-tl__item > .e-con' );
			first.scrollIntoView( { block: 'center', behavior: 'instant' } );
			const second = document.querySelectorAll( '[data-id="tld0001"] .rf-tl__item' )[ 1 ].getBoundingClientRect();
			const r = first.getBoundingClientRect();
			// A point of the first entry inside the second entry's row.
			const y = Math.max( r.top, second.top ) + 5;
			const hit = document.elementFromPoint( r.left + 20, y );
			return { ok: !! ( hit && first.contains( hit ) ), hit: hit ? hit.tagName + '.' + hit.className + ' < ' + ( hit.parentElement && hit.parentElement.className ) : null, y: Math.round( y ), r: [ Math.round( r.top ), Math.round( r.bottom ), Math.round( r.left ) ], second: [ Math.round( second.top ), Math.round( second.bottom ) ] };
		} );
		check( 'desktop', 'Zigzag: the first entry still takes clicks where the next entry\'s row reaches beside it', reach.ok, JSON.stringify( reach ) );
		await d.locator( '[data-id="tld0001"]' ).screenshot( { path: join( SHOTS, 'timeline-zigzag-1300.png' ) } );
		await d.context().close();

		// ------------------------------------------------------------ phones and tablet
		for ( const w of [ 1024, 768, 430, 393, 375 ] ) {
			const m = await at( pg.url, w, 800 );
			const ga = await geometry( m, 'tla0001' );
			// This site's phone screen size reaches 768px.
			const phone = w <= 768;
			const sides = ga.items.map( ( i ) => i.side ).join();
			const inside = ga.items.every( ( i ) => i.conL >= 0 && i.conR <= w );
			if ( phone ) {
				check( `${ w }px`, 'line on the left: every entry right of it, inside the screen and wide enough to read (over 60%), the text across the line hidden, no sideways scrolling', 'right,right,right' === sides && inside && ga.items.every( ( i ) => i.conW > w * 0.6 && ! i.aside ) && ga.overflow <= 0 && ga.items.every( ( i ) => Math.abs( i.markX - ga.lineX ) <= 1 ), JSON.stringify( { sides, w: ga.items.map( ( i ) => i.conW ), overflow: ga.overflow, aside: ga.items.map( ( i ) => !! i.aside ) } ) );
				const gbm = await geometry( m, 'tlb0001' );
				check( `${ w }px`, 'line on the right kept on phones (set for phones): entries left of it, inside the screen', gbm.items.every( ( i ) => 'left' === i.side && i.conL >= 0 ) && gbm.overflow <= 0, JSON.stringify( gbm.items.map( ( i ) => [ i.side, i.conL, i.conR ] ) ) );
				const gzm = await geometry( m, 'tld0001' );
				check( `${ w }px`, 'the Zigzag timeline is one line on the left on phones, entries one under another, not overlapping', gzm.items.every( ( i ) => 'right' === i.side ) && gzm.items.slice( 1 ).every( ( it, k ) => it.conTop >= gzm.items[ k ].conBottom ), JSON.stringify( gzm.items.map( ( i ) => [ i.side, i.conTop, i.conBottom ] ) ) );
			} else {
				check( `${ w }px`, 'line in the middle on a tablet, entries alternating and inside the screen, no sideways scrolling', 'left,right,left' === sides && inside && ga.overflow <= 0, JSON.stringify( { sides, overflow: ga.overflow } ) );
			}
			if ( 375 === w || 768 === w ) {
				await m.screenshot( { path: join( SHOTS, `timeline-${ w }.png` ), fullPage: true } );
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
		let ge = await geometry( f, 'tla0001' );
		check( 'editor', 'Edit Mode draws the timeline: entries alternating, markers on the line, each container in its entry', 'left,right,left' === ge.items.map( ( i ) => i.side ).join() && ge.items.every( ( i ) => Math.abs( i.markX - ge.lineX ) <= 1 ), JSON.stringify( ge ) );
		await e.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'tla0001' ), settings: { layout: 'right' } } ) );
		await sleep( 1200 );
		ge = await geometry( f, 'tla0001' );
		check( 'editor', 'Layout changed to the line on the right shows at once', ge.items.every( ( i ) => 'left' === i.side ), JSON.stringify( ge.items.map( ( i ) => i.side ) ) );
		await e.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'tla0001' ), settings: { layout: 'zigzag' } } ) );
		await sleep( 1500 );
		ge = await geometry( f, 'tla0001' );
		check( 'editor', 'Layout changed to Zigzag interlocks the entries at once', 'left,right,left' === ge.items.map( ( i ) => i.side ).join() && ge.items[ 1 ].conTop < ge.items[ 0 ].conBottom, JSON.stringify( ge.items.map( ( i ) => [ i.side, i.conTop, i.conBottom ] ) ) );
		await e.evaluate( () => {
			const c = refraction.getContainer( 'tla0001' );
			$e.run( 'document/elements/settings', { container: c, settings: { layout: 'alternate' } } );
			$e.run( 'document/repeater/insert', { container: c, name: 'items', model: { item_title: 'Entry #4', marker_text: '2020' } } );
		} );
		await sleep( 1500 );
		ge = await geometry( f, 'tla0001' );
		check( 'editor', 'Add Entry: a fourth entry, its container in its own slot (right of the line), its marker on the line with its year', 4 === ge.items.length && 'left,right,left,right' === ge.items.map( ( i ) => i.side ).join() && '2020' === ge.items[ 3 ].text, JSON.stringify( ge.items.map( ( i ) => [ i.side, i.text ] ) ) );
		await e.evaluate( () => $e.run( 'panel/change-device-mode', { device: 'mobile' } ) );
		await sleep( 2000 );
		ge = await geometry( f, 'tla0001' );
		check( 'editor', 'the phone view puts the line on the left', ge.items.every( ( i ) => 'right' === i.side ), JSON.stringify( ge.items.map( ( i ) => i.side ) ) );
		await e.screenshot( { path: join( SHOTS, 'timeline-editor-mobile.png' ) } );
		const panel = await e.evaluate( () => {
			const c = refraction.widgetsCache[ 'refraction-timeline' ]?.controls || {};
			return [ 'layout', 'layout_mobile', 'rail_mobile', 'gap_mobile', 'row_gap_mobile', 'marker_size_mobile', 'marker_align_mobile', 'list_padding_mobile' ].filter( ( k ) => ! c[ k ] );
		} );
		check( 'editor', 'layout, room for the line, spacing, marker size, marker place and padding each have a phone setting', ! panel.length, panel.join() );

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
