#!/usr/bin/env node
/**
 * Dynamic Container (0.120.0, SQLite test site, Chromium). On the site:
 * - desktop: a grid of 3 columns (the 4th item starts a second row); tablet: 2 columns;
 * - phone: one row scrolling sideways, no scrollbar shown, each item 1/1.15 of the row so the next one peeks in, and a
 *   swipe stops at an item (scroll snap);
 * - settings: 4 columns on desktop; the scrolling row on desktop with 2.5 items in view; gaps.
 * In Edit Mode: a new Dynamic Container starts with three containers (Item #1 to #3) in a row of three; a changed
 * Columns setting shows at once; Add Item gives a fourth container like the others; the phone preview scrolls sideways.
 * 0.121.0: the Entrance (items in sync, then the widgets inside), Padding on phones, a Container's Link (default tag)
 * and Hover Animation.
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
	// 0.121.0: the Entrance, Padding, and a container's Link and Hover Animation.
	const animated = grid( { entrance: 'fade-up', entrance_parts: 'cascade', entrance_item_gap: 150, entrance_inner_gap: 100, entrance_duration: 500, list_padding_mobile: { unit: 'px', top: '0', right: '12', bottom: '0', left: '12', isLinked: false } }, 4 );
	animated[ 0 ].elements[ 0 ].elements[ 0 ].elements.push( { id: id(), elType: 'widget', widgetType: 'text-editor', settings: { editor: '<p>Second widget</p>' }, elements: [] } );
	Object.assign( animated[ 0 ].elements[ 0 ].elements[ 1 ].settings, { link: { url: 'https://example.com/fleet', is_external: '', nofollow: '' }, hover_animation: 'grow' } );
	const anim = page( 'Dynamic container entrance', animated );
	// 0.128.0: a linked card that holds its own link (a button) must stay whole: links can not sit inside links.
	const cards = grid( {}, 3 );
	cards[ 0 ].elements[ 0 ].elements.forEach( ( item, i ) => {
		item.settings.link = { url: `https://example.com/card-${ i + 1 }`, is_external: '', nofollow: '' };
		item.elements.push(
			{ id: id(), elType: 'widget', widgetType: 'text-editor', settings: { editor: `<p>Card text ${ i + 1 }</p>` }, elements: [] },
			{ id: id(), elType: 'widget', widgetType: 'button', settings: { text: 'Read more', link: { url: `https://example.com/more-${ i + 1 }` } }, elements: [] }
		);
	} );
	const linkedCards = page( 'Linked cards', cards );
	const plainLink = page( 'Container link', [ { id: id(), elType: 'container', settings: { link: { url: 'https://example.com/plain' } }, elements: [ { id: id(), elType: 'widget', widgetType: 'heading', settings: { title: 'Linked box' }, elements: [] } ] } ] );
	const row = page( 'Dynamic container row', grid( { layout: 'scroll', show: 2.5, column_gap: { unit: 'px', size: 24 } }, 6 ) );

	const browser = await chromium.launch( existsSync( '/opt/pw-browsers/chromium' ) ? { executablePath: '/opt/pw-browsers/chromium', args: [ '--no-sandbox' ] } : {} );
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

		// ------------------------------------------------------------ the Entrance
		// Settings > Performance > Animations On The First Screen (on by default, 0.146.0): a list on screen when the page
		// opens shows at once.
		( { pg, ctx } = await at( anim.url, 1280 ) );
		const first = await pg.evaluate( () => {
			const list = document.querySelector( '.rf-dc' );
			return { armed: list.classList.contains( 'is-armed' ), parts: list.querySelectorAll( '.rf-dc-a' ).length, opacity: [ ...list.children ].map( ( el ) => getComputedStyle( el ).opacity ).join() };
		} );
		check( 'entrance', 'on the first screen (the default) the list shows at once, without its entrance', ! first.armed && 0 === first.parts && '1,1,1,1' === first.opacity, JSON.stringify( first ) );
		await ctx.close();
		wp( [ 'option', 'update', 'refraction_first_screen_animations', '0' ] );
		( { pg, ctx } = await at( anim.url, 1280 ) );
		const during = await pg.evaluate( () => {
			const list = document.querySelector( '.rf-dc' );
			const items = [ ...list.children ];
			const d = ( el ) => el.style.getPropertyValue( '--rf-dc-d' );
			const widgets = [ ...items[ 0 ].querySelectorAll( '.refraction-widget' ) ];
			return { armed: list.classList.contains( 'is-armed' ), delays: items.map( d ), inner: widgets.map( d ), parts: list.querySelectorAll( '.rf-dc-a' ).length };
		} );
		check( 'entrance', 'fade in up, item by item (0, 150, 300, 450 ms), each item\'s widgets after it (100, 200 ms)', during.armed && '0ms,150ms,300ms,450ms' === during.delays.join() && '100ms,200ms' === during.inner.join() && during.parts >= 6, JSON.stringify( during ) );
		const mid = await pg.evaluate( () => [ ...document.querySelector( '.rf-dc' ).children ].map( ( el ) => Math.round( Number( getComputedStyle( el ).opacity ) * 100 ) / 100 ) );
		check( 'entrance', 'part way through, the items are coming in one after another (the first furthest, the last not yet all there)', mid[ 0 ] >= mid[ 1 ] && mid[ 1 ] >= mid[ 2 ] && mid[ 2 ] >= mid[ 3 ] && mid[ 3 ] < 1 && mid[ 0 ] > mid[ 3 ], JSON.stringify( mid ) );
		await pg.waitForTimeout( 1600 );
		const after = await pg.evaluate( () => {
			const list = document.querySelector( '.rf-dc' );
			return { left: list.querySelectorAll( '.rf-dc-a' ).length, armed: list.classList.contains( 'is-armed' ), opacity: [ ...list.children ].map( ( el ) => getComputedStyle( el ).opacity ).join(), transform: getComputedStyle( list.children[ 1 ] ).transform };
		} );
		check( 'entrance', 'then everything is in place and the entrance classes are gone (hover animations work as before)', 0 === after.left && ! after.armed && '1,1,1,1' === after.opacity && 'none' === after.transform, JSON.stringify( after ) );
		wp( [ 'option', 'delete', 'refraction_first_screen_animations' ] );
		const linked = await pg.evaluate( () => {
			const el = document.querySelector( '.rf-dc' ).children[ 1 ];
			const cover = el.querySelector( ':scope > .refraction-container-link' );
			return { tag: el.tagName, href: cover && cover.getAttribute( 'href' ), grow: el.classList.contains( 'refraction-animation-grow' ), css: !! document.querySelector( 'link[id^="e-animation-grow"]' ) };
		} );
		check( 'container', 'an item with a Link (default tag) keeps its box and carries the link over it; its Hover Animation (grow) applies with its CSS', 'DIV' === linked.tag && 'https://example.com/fleet' === linked.href && linked.grow && linked.css, JSON.stringify( linked ) );
		await pg.hover( '.rf-dc > :nth-child(2)' );
		await pg.waitForTimeout( 500 );
		const grown = await pg.evaluate( () => getComputedStyle( document.querySelector( '.rf-dc' ).children[ 1 ] ).transform );
		check( 'container', 'hovering it grows it', /^matrix\(1\.[01]/.test( grown ), grown );
		await ctx.close();

		( { pg, ctx } = await at( linkedCards.url, 1280 ) );
		const whole = await pg.evaluate( () => {
			const list = document.querySelector( '.rf-dc' );
			return {
				items: list.children.length,
				inside: [ ...list.children ].map( ( item ) => !! item.querySelector( '.refraction-widget-button' ) && /Card text/.test( item.textContent ) ),
				nested: document.querySelectorAll( 'a a' ).length,
			};
		} );
		check( 'link', 'linked cards that hold a Read more button stay whole: 3 items, each with its text and button, no link inside a link', whole.items === 3 && whole.inside.every( Boolean ) && whole.nested === 0, JSON.stringify( whole ) );
		const hit = await pg.evaluate( () => {
			const item = document.querySelector( '.rf-dc' ).children[ 1 ];
			const r = item.getBoundingClientRect();
			const card = document.elementFromPoint( r.left + r.width / 2, r.top + 8 );
			const button = item.querySelector( '.refraction-widget-button a' ).getBoundingClientRect();
			const onButton = document.elementFromPoint( button.left + button.width / 2, button.top + button.height / 2 );
			return { card: card && card.closest( 'a' ) && card.closest( 'a' ).getAttribute( 'href' ), button: onButton && onButton.closest( 'a' ) && onButton.closest( 'a' ).getAttribute( 'href' ) };
		} );
		check( 'link', 'clicking the card opens its link; its own button still opens the button\'s link', hit.card === 'https://example.com/card-2' && hit.button === 'https://example.com/more-2', JSON.stringify( hit ) );
		await pg.screenshot( { path: join( SHOTS, 'linked-cards.png' ) } );
		await ctx.close();

		( { pg, ctx } = await at( plainLink.url, 1280 ) );
		const plain = await pg.evaluate( () => {
			const el = [ ...document.querySelectorAll( '.e-con' ) ].find( ( c ) => /Linked box/.test( c.textContent ) );
			const cover = el && el.querySelector( ':scope > .refraction-container-link' );
			return el ? el.tagName + ' ' + ( cover && cover.getAttribute( 'href' ) ) + ' ' + ( cover && cover.getAttribute( 'aria-label' ) ) : '';
		} );
		check( 'container', 'any Container with a Link and the default tag opens the link from anywhere on it (a link over the box, named for screen readers)', 'DIV https://example.com/plain Open' === plain, plain );
		await ctx.close();

		( { pg, ctx } = await at( anim.url, 390 ) );
		const pad = await pg.evaluate( () => {
			const cs = getComputedStyle( document.querySelector( '.rf-dc' ) );
			return cs.paddingLeft + ' ' + cs.paddingRight + ' ' + cs.paddingTop;
		} );
		check( 'padding', 'Padding on phones (12px left and right, 0 top) applies to the row', '12px 12px 0px' === pad, pad );
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

		// As a person would: the widget's panel open on Entrance, a choice in its Animation list.
		await p.evaluate( async () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const el = find( refraction.getPreviewContainer() ).find( ( c ) => c.id === window.__dc );
			$e.run( 'panel/editor/open', { model: el.model, view: el.view } );
			await new Promise( ( r ) => setTimeout( r, 600 ) );
			const page = refraction.getPanelView().getCurrentPageView();
			page.activateSection( 'section_entrance' );
			page._renderChildren();
			await new Promise( ( r ) => setTimeout( r, 400 ) );
		} );
		await frame.evaluate( () => {
			window.__dcSeen = 0;
			const list = document.querySelector( '.rf-dc' );
			new MutationObserver( () => {
				window.__dcSeen = Math.max( window.__dcSeen, list.querySelectorAll( '.rf-dc-a' ).length );
			} ).observe( list, { attributes: true, subtree: true, attributeFilter: [ 'class' ] } );
		} );
		await p.selectOption( '.refraction-control-entrance select', 'zoom-in' );
		await p.waitForTimeout( 2000 );
		const replay = await frame.evaluate( () => ( { first: window.__dcSeen, after: document.querySelectorAll( '.rf-dc .rf-dc-a' ).length } ) );
		check( 'editor', 'choosing an Entrance in the panel plays it in the preview', replay.first >= 3 && 0 === replay.after, JSON.stringify( replay ) );

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
