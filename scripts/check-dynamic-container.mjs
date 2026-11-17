#!/usr/bin/env node
/**
 * Dynamic Container (0.120.0, SQLite test site, Chromium). On the site:
 * - desktop: a grid of 3 columns (the 4th item starts a second row); tablet: 2 columns;
 * - phone: one row scrolling sideways, no scrollbar shown, each item 1/1.15 of the row so the next one peeks in, and a
 *   swipe stops at an item (scroll snap);
 * - settings: 4 columns on desktop; the scrolling row on desktop with 2.5 items in view; gaps.
 * In Edit Mode: a new Dynamic Container starts with three containers (Item #1 to #3) in a row of three; a changed
 * Columns setting shows at once; Add Item gives a fourth container like the others; the phone preview scrolls sideways.
 *
 * Usage: node scripts/check-dynamic-container.mjs [--site /tmp/rf-dc-site] [--port 8964] [--shots /tmp/dc-shots]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-dc-site' );
const PORT = arg( 'port', '8964' );
const SHOTS = arg( 'shots', '/tmp/dc-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 600 ) }` }` );
};
const wp = ( args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8' } );

let uid = 0;
const id = () => 'dc' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const item = ( n ) => ( { id: id(), elType: 'container', isInner: true, settings: { _title: `Item #${ n }`, content_width: 'full', min_height: { unit: 'px', size: 200 }, border_border: 'solid', border_width: { unit: 'px', top: '1', right: '1', bottom: '1', left: '1', isLinked: true }, border_color: '#D5D8DC' }, elements: [ { id: id(), elType: 'widget', widgetType: 'heading', settings: { title: `Card ${ n }`, header_size: 'h3' }, elements: [] } ] } );
const grid = ( settings, n = 5 ) => [ { id: id(), elType: 'container', settings: { content_width: 'boxed' }, elements: [ {
	id: id(), elType: 'widget', widgetType: 'refraction-dynamic-container',
	settings: { items: Array.from( { length: n }, ( _, i ) => ( { _id: id(), item_title: `Item #${ i + 1 }` } ) ), ...settings },
	elements: Array.from( { length: n }, ( _, i ) => item( i + 1 ) ),
} ] } ];

function page( title, elements ) {
	const pid = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', pid, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', pid, '--page_template=refraction_canvas' ] );
	return { id: pid, url: wp( [ 'post', 'list', '--post_type=page', `--post__in=${ pid }`, '--field=url' ] ).trim() };
}

/** Where the items are: rows (distinct tops), items per first row, the list's scroll state. */
const layout = ( p ) => p.evaluate( () => {
	const list = document.querySelector( '.rf-dc' );
	const items = [ ...list.children ].filter( ( el ) => el.classList.contains( 'e-con' ) );
	const rects = items.map( ( el ) => el.getBoundingClientRect() );
	const tops = [ ...new Set( rects.map( ( r ) => Math.round( r.top ) ) ) ];
	const cs = getComputedStyle( list );
	return {
		items: items.length,
		rows: tops.length,
		perRow: rects.filter( ( r ) => Math.round( r.top ) === tops[ 0 ] ).length,
		width: Math.round( list.clientWidth ),
		itemWidth: Math.round( rects[ 0 ].width ),
		secondLeft: Math.round( rects[ 1 ].left - list.getBoundingClientRect().left ),
		scrolls: list.scrollWidth > list.clientWidth + 2,
		overflowX: cs.overflowX,
		scrollbar: list.offsetHeight - list.clientHeight - parseFloat( cs.borderTopWidth ) - parseFloat( cs.borderBottomWidth ),
		snap: cs.scrollSnapType,
		gap: cs.columnGap,
	};
} );

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );

	const base = page( 'Dynamic container', grid( {} ) );
	const four = page( 'Dynamic container four', grid( { columns: 4 }, 8 ) );
	const row = page( 'Dynamic container row', grid( { layout: 'scroll', show: 2.5, column_gap: { unit: 'px', size: 24 } }, 6 ) );

	const browser = await chromium.launch();
	const errors = [];

	try {
		const at = async ( url, width ) => {
			const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
			const pg = await ctx.newPage();
			pg.on( 'pageerror', ( e ) => errors.push( e.message ) );
			await pg.goto( url, { waitUntil: 'load' } );
			await pg.waitForTimeout( 300 );
			return { pg, ctx };
		};

		// ------------------------------------------------------------ desktop, tablet, phone
		let { pg, ctx } = await at( base.url, 1280 );
		let l = await layout( pg );
		check( 'desktop', 'a grid of 3 columns: 5 items in 2 rows, 3 in the first, 16px apart', 5 === l.items && 2 === l.rows && 3 === l.perRow && '16px' === l.gap && ! l.scrolls, JSON.stringify( l ) );
		await pg.locator( '.rf-dc' ).screenshot( { path: join( SHOTS, 'desktop.png' ) } );
		await ctx.close();

		( { pg, ctx } = await at( base.url, 900 ) );
		l = await layout( pg );
		check( 'tablet', '2 columns on a tablet', 2 === l.perRow && 3 === l.rows && ! l.scrolls, JSON.stringify( l ) );
		await ctx.close();

		( { pg, ctx } = await at( base.url, 390 ) );
		l = await layout( pg );
		const expected = Math.round( ( l.width - ( 0.15 * 16 ) ) / 1.15 );
		check( 'phone', 'one row scrolling sideways, no scrollbar shown, stopping at each item', 1 === l.rows && l.scrolls && 'auto' === l.overflowX && 0 === l.scrollbar && /x mandatory/.test( l.snap ), JSON.stringify( l ) );
		check( 'phone', 'each item 1/1.15 of the row, so the next one peeks in', Math.abs( l.itemWidth - expected ) <= 2 && l.secondLeft < l.width, JSON.stringify( { l, expected } ) );
		await pg.screenshot( { path: join( SHOTS, 'phone.png' ) } );
		await pg.evaluate( () => document.querySelector( '.rf-dc' ).scrollBy( { left: 140, behavior: 'instant' } ) );
		await pg.waitForTimeout( 600 );
		const snapped = await pg.evaluate( () => {
			const list = document.querySelector( '.rf-dc' );
			const second = list.children[ 1 ].getBoundingClientRect().left - list.getBoundingClientRect().left;
			return { scrollLeft: Math.round( list.scrollLeft ), second: Math.round( second ) };
		} );
		check( 'phone', 'scrolled part way, the row settles with an item lined up at the start', 0 === snapped.second || 0 === snapped.scrollLeft, JSON.stringify( snapped ) );
		await ctx.close();

		// ------------------------------------------------------------ settings
		( { pg, ctx } = await at( four.url, 1280 ) );
		l = await layout( pg );
		check( 'settings', 'Columns 4: 8 items in 2 rows of 4', 4 === l.perRow && 2 === l.rows, JSON.stringify( l ) );
		await ctx.close();

		( { pg, ctx } = await at( row.url, 1280 ) );
		l = await layout( pg );
		check( 'settings', 'the scrolling row on desktop with 2.5 items in view and 24px gaps', 1 === l.rows && l.scrolls && '24px' === l.gap && Math.abs( l.itemWidth - Math.round( ( l.width - ( 1.5 * 24 ) ) / 2.5 ) ) <= 2, JSON.stringify( l ) );
		await pg.locator( '.rf-dc' ).screenshot( { path: join( SHOTS, 'desktop-row.png' ) } );
		await ctx.close();

		// ------------------------------------------------------------ Edit Mode
		const blank = page( 'Dynamic container editor', [ { id: id(), elType: 'container', settings: {}, elements: [] } ] );
		const ectx = await browser.newContext( { viewport: { width: 1500, height: 1000 } } );
		const p = await ectx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ blank.id }&action=refraction`, { timeout: 120000 } );
		await p.waitForFunction( () => window.refraction && window.$e && refraction.documents?.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await p.waitForTimeout( 2500 );
		const frame = p.frame( { name: 'refraction-preview-iframe' } ) || p.frames().find( ( f ) => f.url().includes( 'refraction-preview' ) );

		const made = await p.evaluate( async () => {
			const box = refraction.getPreviewContainer().children[ 0 ];
			const el = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'refraction-dynamic-container' } } );
			await new Promise( ( r ) => setTimeout( r, 1500 ) );
			window.__dc = el.id;
			return { count: el.children.length, titles: el.children.map( ( c ) => c.model.get( 'settings' ).get( '_title' ) ).join( '/' ), types: el.children.map( ( c ) => c.model.get( 'elType' ) ).join( '/' ) };
		} );
		check( 'editor', 'a new Dynamic Container starts with three containers (Item #1 to #3)', 3 === made.count && 'container/container/container' === made.types && /Item #1/.test( made.titles ), JSON.stringify( made ) );
		const edLayout = () => frame.evaluate( () => {
			const list = document.querySelector( '.rf-dc' );
			const items = [ ...list.children ].filter( ( el ) => el.classList.contains( 'e-con' ) );
			const tops = [ ...new Set( items.map( ( el ) => Math.round( el.getBoundingClientRect().top ) ) ) ];
			return { items: items.length, rows: tops.length, scrolls: list.scrollWidth > list.clientWidth + 2, outline: getComputedStyle( items[ items.length - 1 ] ).borderTopStyle };
		} );
		let ed = await edLayout();
		check( 'editor', 'and the preview shows them in a row of three, outlined', 3 === ed.items && 1 === ed.rows && 'solid' === ed.outline, JSON.stringify( ed ) );
		await frame.locator( '.rf-dc' ).screenshot( { path: join( SHOTS, 'editor.png' ) } );

		await p.evaluate( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const el = find( refraction.getPreviewContainer() ).find( ( c ) => c.id === window.__dc );
			$e.run( 'document/elements/settings', { container: el, settings: { columns: 2 } } );
		} );
		await p.waitForTimeout( 800 );
		ed = await edLayout();
		check( 'editor', 'Columns 2 in the panel shows at once: 2 rows', 2 === ed.rows, JSON.stringify( ed ) );

		const added = await p.evaluate( async () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const el = find( refraction.getPreviewContainer() ).find( ( c ) => c.id === window.__dc );
			$e.run( 'document/repeater/insert', { container: el, name: 'items', model: { item_title: 'Item #4' } } );
			await new Promise( ( r ) => setTimeout( r, 1500 ) );
			const last = el.children[ el.children.length - 1 ];
			return { count: el.children.length, border: last.model.get( 'settings' ).get( 'border_border' ), minHeight: ( last.model.get( 'settings' ).get( 'min_height' ) || {} ).size };
		} );
		ed = await edLayout();
		check( 'editor', 'Add Item gives a fourth container like the others (outline, height) and the preview shows it', 4 === added.count && 'solid' === added.border && 240 === added.minHeight && 4 === ed.items, JSON.stringify( { added, ed } ) );

		await p.evaluate( () => refraction.changeDeviceMode( 'mobile' ) );
		await p.waitForTimeout( 1500 );
		ed = await edLayout();
		check( 'editor', 'in the phone preview the items are one row scrolling sideways', 1 === ed.rows && ed.scrolls, JSON.stringify( ed ) );
		await frame.locator( '.rf-dc' ).screenshot( { path: join( SHOTS, 'editor-phone.png' ) } );

		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall dynamic container checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
