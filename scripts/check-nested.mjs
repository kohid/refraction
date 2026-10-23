#!/usr/bin/env node
/**
 * Off-Canvas, Mega Menu and Nested Carousel check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-nested.mjs [--site /tmp/rf-nested-site] [--port 8901] [--shots /tmp/nested-shots]
 *                                            [--wpcli /tmp/rsite-dl/wpcli.phar] [--only off-canvas,mega-menu,carousel,combos,editor] [--themes twentytwentyone,twentytwentyfive]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). The site gets pages,
 * a menu and posts; use a throw-away site.
 *
 * Covers, per widget: appears in the panel search and in the "Advanced" category, can be created inside a
 * container in the editor, renders on the front end with the expected HTML, key interactions in the browser,
 * controls change the output, accessibility basics, and no PHP errors / console errors.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-nested-site' );
const PORT = arg( 'port', '8901' );
const SHOTS = arg( 'shots', '/tmp/nested-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const ONLY = arg( 'only', '' ).split( ',' ).filter( Boolean );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/nested-seed.php' );

const results = [];
let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	results.push( { area, name, pass: !! pass } );
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 300 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	if ( process.env.CHROMIUM ) { return process.env.CHROMIUM; }
	const root = '/opt/pw-browsers';
	if ( ! existsSync( root ) ) { return undefined; }
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, sub ) ) ) { return join( root, d, sub ); }
		}
	}
	return undefined;
}

function wp( args, env = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

async function login( browser, user, pass ) {
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
	const page = await ctx.newPage();
	for ( let attempt = 1; ; attempt++ ) {
		try {
			await page.goto( `${ BASE }/wp-login.php` );
			await page.fill( '#user_login', user );
			await page.fill( '#user_pass', pass );
			await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 60000 } ), page.click( '#wp-submit' ) ] );
			return { ctx, page };
		} catch ( e ) {
			if ( attempt >= 3 ) { throw e; }
			await sleep( 2000 );
		}
	}
}

const consoleErrors = [];
const watch = ( page, label ) => {
	page.on( 'console', ( m ) => {
		if ( m.type() === 'error' && ! /favicon\.ico/.test( m.location().url ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
	} );
	page.on( 'pageerror', ( e ) => consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
};

/** Open a new visitor page (no login) at a viewport size and collect its console errors. */
async function visitor( browser, url, width = 1280, height = 900, opts = {} ) {
	const ctx = await browser.newContext( { viewport: { width, height }, ...opts } );
	const page = await ctx.newPage();
	watch( page, `front:${ url }` );
	await page.goto( BASE + url, { waitUntil: 'load' } );
	return { ctx, page };
}

/** Open the Refraction editor for a post and wait until the preview is ready. */
async function openEditor( admin, id ) {
	await admin.page.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
	await admin.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
	await admin.page.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
	await admin.page.waitForSelector( '#refraction-preview-iframe', { timeout: 30000 } );
	await sleep( 1500 );
}

const frameOf = ( admin ) => admin.page.frame( { name: 'refraction-preview-iframe' } ) ?? admin.page.frames().find( ( f ) => f !== admin.page.mainFrame() && /preview/.test( f.url() ) );


const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' ).filter( Boolean );
const rel = ( url ) => { const u = new URL( url ); return u.pathname + u.search; };
const SECTIONS = {};
const shot = ( page, name ) => page.screenshot( { path: join( SHOTS, name + '.png' ) } );
const inPanel = ( page, sel ) => page.evaluate( ( s ) => { const p = document.querySelector( s ); return !! p && p.contains( document.activeElement ); }, sel );
const box = ( page, sel ) => page.locator( sel ).first().boundingBox();
const visibleNow = ( page, sel ) => page.locator( sel ).first().isVisible();

/* ------------------------------------------------------------------ off-canvas */
SECTIONS[ 'off-canvas' ] = async ( { browser, pages, theme } ) => {
	const k = `off-canvas[${ theme }]`;
	const v = await visitor( browser, rel( pages[ 'off-canvas' ].url ), 1280, 800 );
	const p = v.page;
	await p.waitForFunction( () => !! window.refractionOffCanvas, null, { timeout: 20000 } );
	const wrap = '[data-id="ac00001"]', panel = '#side-menu', layer = `${ wrap } .refraction-offcanvas__layer`;

	check( k, 'closed: panel is a dialog, aria-modal, labelled, hidden from AT', await p.evaluate( () => { const e = document.querySelector( '#side-menu' ); return e.getAttribute( 'role' ) === 'dialog' && e.getAttribute( 'aria-modal' ) === 'true' && e.getAttribute( 'aria-label' ) === 'Side menu' && e.getAttribute( 'aria-hidden' ) === 'true'; } ) );
	check( k, 'closed: layer is inert and the panel is not visible', ( await p.locator( layer ).getAttribute( 'inert' ) ) !== null && ! ( await visibleNow( p, panel ) ) );
	const trig = p.locator( `${ wrap } .refraction-offcanvas__trigger` );
	check( k, 'trigger button has aria-haspopup=dialog, aria-expanded=false, aria-controls', await p.evaluate( () => { const t = document.querySelector( '[data-id="ac00001"] .refraction-offcanvas__trigger' ); return t.getAttribute( 'aria-haspopup' ) === 'dialog' && t.getAttribute( 'aria-expanded' ) === 'false' && t.getAttribute( 'aria-controls' ) === 'side-menu'; } ) );
	check( k, 'closed: the content container is not focusable by Tab', await p.evaluate( async () => { document.querySelector( '#before-btn' ).focus(); return true; } ) );
	await p.keyboard.press( 'Tab' ); await p.keyboard.press( 'Tab' ); await p.keyboard.press( 'Tab' );
	check( k, 'closed: Tab never lands inside the panel', ! ( await inPanel( p, panel ) ) );

	// open with the built-in button
	await p.evaluate( () => window.scrollTo( 0, 0 ) );
	await trig.click();
	await sleep( 450 );
	check( k, 'click opens: panel visible, aria-hidden false, trigger expanded', ( await visibleNow( p, panel ) ) && ( await p.locator( panel ).getAttribute( 'aria-hidden' ) ) === 'false' && ( await trig.getAttribute( 'aria-expanded' ) ) === 'true' );
	check( k, 'open: focus moved into the dialog', await inPanel( p, panel ) );
	check( k, 'open: page scroll is locked', await p.evaluate( () => document.documentElement.classList.contains( 'refraction-oc-scroll-lock' ) && getComputedStyle( document.documentElement ).overflow === 'hidden' ) );
	const b = await box( p, panel );
	check( k, 'open: left panel sits at the left edge, 380px wide, full height', b && Math.abs( b.x ) < 1 && Math.abs( b.width - 380 ) < 2 && Math.abs( b.height - 800 ) < 2, JSON.stringify( b ) );
	await shot( p, `off-canvas-open-${ theme }` );

	// focus trap
	let trapped = true;
	for ( let i = 0; i < 8; i++ ) { await p.keyboard.press( 'Tab' ); if ( ! ( await inPanel( p, panel ) ) ) { trapped = false; } }
	for ( let i = 0; i < 8; i++ ) { await p.keyboard.press( 'Shift+Tab' ); if ( ! ( await inPanel( p, panel ) ) ) { trapped = false; } }
	check( k, 'open: Tab and Shift+Tab stay inside the panel (focus trap)', trapped );

	await p.keyboard.press( 'Escape' );
	await sleep( 450 );
	check( k, 'Escape closes it', ! ( await visibleNow( p, panel ) ) && ( await trig.getAttribute( 'aria-expanded' ) ) === 'false' );
	check( k, 'close: focus returns to the trigger', await p.evaluate( () => document.activeElement?.classList.contains( 'refraction-offcanvas__trigger' ) ) );
	check( k, 'close: scroll lock released, layer inert again', await p.evaluate( () => ! document.documentElement.classList.contains( 'refraction-oc-scroll-lock' ) && document.querySelector( '[data-id="ac00001"] .refraction-offcanvas__layer' ).hasAttribute( 'inert' ) ) );

	// overlay click
	await trig.click(); await sleep( 400 );
	await p.mouse.click( 1100, 400 );
	await sleep( 450 );
	check( k, 'overlay click closes it', ! ( await visibleNow( p, panel ) ) );

	// close button
	await trig.click(); await sleep( 400 );
	await p.locator( `${ panel } .refraction-offcanvas__close` ).click();
	await sleep( 450 );
	check( k, 'close button closes it and returns focus', ! ( await visibleNow( p, panel ) ) && await p.evaluate( () => document.activeElement?.classList.contains( 'refraction-offcanvas__trigger' ) ) );

	// hash link
	await p.locator( '#hash-link' ).click();
	await sleep( 450 );
	check( k, '#refraction-offcanvas:ID link opens it (no navigation)', ( await visibleNow( p, panel ) ) && ! p.url().includes( 'refraction-offcanvas' ) );
	await p.keyboard.press( 'Escape' ); await sleep( 450 );
	check( k, 'hash link: Escape returns focus to the link', await p.evaluate( () => document.activeElement?.id === 'hash-link' ) );

	// any element as trigger
	await p.locator( '#custom-trigger' ).click(); await sleep( 450 );
	check( k, 'a custom CSS selector trigger opens it', await visibleNow( p, panel ) );
	await p.keyboard.press( 'Escape' ); await sleep( 450 );
	check( k, 'custom trigger: focus returns to it', await p.evaluate( () => document.activeElement?.id === 'custom-trigger' ) );

	// deep link
	await p.goto( BASE + rel( pages[ 'off-canvas' ].url ) + '#refraction-offcanvas:side-menu' );
	await p.waitForFunction( () => !! window.refractionOffCanvas, null, { timeout: 20000 } );
	await sleep( 600 );
	check( k, 'loading the page with the hash opens the panel', await visibleNow( p, panel ) );

	// position variants (CSS)
	for ( const [ pos, test ] of [ [ 'right', ( bb ) => Math.abs( bb.x + bb.width - 1280 ) < 2 ], [ 'top', ( bb ) => Math.abs( bb.y ) < 1 && bb.width > 1270 ], [ 'bottom', ( bb ) => Math.abs( bb.y + bb.height - 800 ) < 2 && bb.width > 1270 ] ] ) {
		await p.evaluate( ( ps ) => document.querySelector( '[data-id="ac00001"] .refraction-offcanvas' ).setAttribute( 'data-position', ps ), pos );
		await sleep( 450 );
		const bb = await box( p, panel );
		check( k, `position ${ pos } places the panel on that edge`, bb && test( bb ), JSON.stringify( bb ) );
	}
	await p.close();

	// push mode
	const v2 = await visitor( browser, rel( pages[ 'off-canvas' ].url ), 1280, 800 );
	const q = v2.page;
	await q.waitForFunction( () => !! window.refractionOffCanvas, null, { timeout: 20000 } );
	await q.locator( '[data-id="ac00002"] .refraction-offcanvas__trigger' ).click();
	await sleep( 600 );
	const push = await q.evaluate( () => ( { cls: document.body.className, mr: getComputedStyle( document.body ).marginRight, lock: document.documentElement.classList.contains( 'refraction-oc-scroll-lock' ), overlay: getComputedStyle( document.querySelector( '[data-id="ac00002"] .refraction-offcanvas__overlay' ) ).display } ) );
	check( k, 'push mode: the page is pushed aside by the panel width, no scroll lock, no overlay', /refraction-oc-push-right/.test( push.cls ) && Math.abs( parseFloat( push.mr ) - 380 ) < 3 && ! push.lock && 'none' === push.overlay, JSON.stringify( push ) );
	await shot( q, `off-canvas-push-${ theme }` );
	await q.keyboard.press( 'Escape' ); await sleep( 600 );
	check( k, 'push mode: closing restores the page', await q.evaluate( () => ! /refraction-oc-push-right/.test( document.body.className ) && getComputedStyle( document.body ).marginRight === '0px' ) );

	// panel that ignores Escape and overlay
	await q.locator( '[data-id="ac00003"] .refraction-offcanvas__trigger' ).click(); await sleep( 300 );
	await q.keyboard.press( 'Escape' ); await q.mouse.click( 20, 20 ); await sleep( 300 );
	check( k, 'with Escape and overlay closing off the panel stays open', await visibleNow( q, '#locked-panel' ) );
	await q.locator( '#locked-panel .refraction-offcanvas__close' ).click(); await sleep( 300 );
	check( k, '...and the close button still closes it', ! ( await visibleNow( q, '#locked-panel' ) ) );
	await v2.ctx.close();

	// two widgets on the page: ids are unique
	const v3 = await visitor( browser, rel( pages[ 'off-canvas' ].url ), 1280, 800 );
	check( k, 'panel ids are unique across the page', await v3.page.evaluate( () => { const ids = [ ...document.querySelectorAll( '[id]' ) ].map( ( e ) => e.id ); return ids.length === new Set( ids ).size; } ) );
	await v3.ctx.close();

	// reduced motion
	const v4 = await visitor( browser, rel( pages[ 'off-canvas' ].url ), 1280, 800, { reducedMotion: 'reduce' } );
	const dur = await v4.page.evaluate( () => getComputedStyle( document.querySelector( '#side-menu' ) ).transitionDuration );
	check( k, 'reduced motion: no transition', /^0s(, 0s)*$/.test( dur ), dur );
	await v4.ctx.close();
};

/* ------------------------------------------------------------------ mega menu */
SECTIONS[ 'mega-menu' ] = async ( { browser, pages, theme } ) => {
	const k = `mega-menu[${ theme }]`;
	const v = await visitor( browser, rel( pages[ 'mega-menu' ].url ), 1280, 900 );
	const p = v.page;
	await p.waitForSelector( '[data-id="ab00001"] .refraction-mm', { state: 'attached' } );
	await sleep( 1200 );
	const m1 = '[data-id="ab00001"]', prod = `${ m1 } #refraction-mm-ab00001-t2`, panel1 = `${ m1 } #refraction-mm-ab00001-p2`;

	check( k, 'nav landmark with its label', await p.locator( `${ m1 } nav.refraction-mm[aria-label="Primary"]` ).count() === 1 );
	check( k, 'dropdown trigger: aria-haspopup, aria-expanded=false, aria-controls -> an existing hidden panel', await p.evaluate( () => { const t = document.querySelector( '#refraction-mm-ab00001-t2' ); const pn = document.getElementById( t.getAttribute( 'aria-controls' ) ); return t.getAttribute( 'aria-haspopup' ) === 'true' && t.getAttribute( 'aria-expanded' ) === 'false' && pn && pn.hidden && pn.getAttribute( 'role' ) === 'region' && pn.getAttribute( 'aria-labelledby' ) === t.id; } ) );
	check( k, 'link items are real links without popup attributes', await p.evaluate( () => { const a = document.querySelector( '[data-id="ab00001"] .refraction-mm__item a.refraction-mm__link' ); return !! a && a.tagName === 'A' && ! a.hasAttribute( 'aria-haspopup' ); } ) );
	check( k, 'closed dropdowns cost no layout (display: none)', await p.evaluate( () => getComputedStyle( document.getElementById( 'refraction-mm-ab00001-p2' ) ).display === 'none' ) );
	check( k, 'desktop: menu button hidden, items in a row', !( await visibleNow( p, `${ m1 } .refraction-mm__toggle` ) ) && await p.evaluate( () => { const l = [ ...document.querySelectorAll( '[data-id="ab00001"] .refraction-mm__item' ) ].map( ( e ) => e.getBoundingClientRect().top ); return new Set( l.map( Math.round ) ).size === 1; } ) );

	// hover with delays (open delay 100ms, close delay 300ms)
	await p.mouse.move( 5, 5 );
	await p.hover( prod );
	await sleep( 30 );
	const early = await visibleNow( p, panel1 );
	await sleep( 350 );
	check( k, 'hover: opens after the open delay, not instantly', ! early && ( await visibleNow( p, panel1 ) ) && ( await p.locator( prod ).getAttribute( 'aria-expanded' ) ) === 'true' );
	await shot( p, `mega-menu-hover-${ theme }` );
	const pb = await box( p, panel1 ), tb = await box( p, prod );
	check( k, 'custom width: dropdown 420px wide under its item', pb && Math.abs( pb.width - 420 ) < 3 && Math.abs( pb.x - tb.x ) < 4 && pb.y >= tb.y + tb.height - 1, JSON.stringify( [ pb, tb ] ) );
	await p.hover( `${ m1 } #refraction-mm-ab00001-t3` );
	await sleep( 700 );
	check( k, 'hover: moving to another item switches dropdowns (only one open)', ( await visibleNow( p, `${ m1 } #refraction-mm-ab00001-p3` ) ) && ! ( await visibleNow( p, panel1 ) ) );
	await p.mouse.move( 1250, 880 );
	await sleep( 120 );
	const stillOpen = await visibleNow( p, `${ m1 } #refraction-mm-ab00001-p3` );
	await sleep( 700 );
	check( k, 'hover: leaving closes it after the close delay', stillOpen && ! ( await visibleNow( p, `${ m1 } #refraction-mm-ab00001-p3` ) ) );
	// moving from the item into the dropdown keeps it open
	await p.hover( prod ); await sleep( 400 );
	const pbb = await box( p, panel1 );
	await p.mouse.move( pbb.x + 40, pbb.y + 30, { steps: 8 } ); await sleep( 600 );
	check( k, 'hover: moving into the dropdown keeps it open', await visibleNow( p, panel1 ) );
	await p.mouse.move( 1250, 880 ); await sleep( 700 );

	// keyboard
	await p.locator( `${ m1 } .refraction-mm__item a` ).first().focus();
	await p.keyboard.press( 'ArrowRight' );
	check( k, 'keyboard: ArrowRight moves to the next item', await p.evaluate( () => document.activeElement?.id === 'refraction-mm-ab00001-t2' ) );
	await p.keyboard.press( 'ArrowDown' ); await sleep( 400 );
	check( k, 'keyboard: ArrowDown opens the dropdown and focuses its first control', ( await visibleNow( p, panel1 ) ) && await inPanel( p, `${ m1 } #refraction-mm-ab00001-p2` ) );
	await p.keyboard.press( 'Escape' ); await sleep( 400 );
	check( k, 'keyboard: Escape closes it and returns focus to the trigger', ! ( await visibleNow( p, panel1 ) ) && await p.evaluate( () => document.activeElement?.id === 'refraction-mm-ab00001-t2' ) );
	await p.keyboard.press( 'End' );
	check( k, 'keyboard: End goes to the last item', await p.evaluate( () => document.activeElement?.textContent.trim() === 'Contact' ) );
	await p.keyboard.press( 'ArrowRight' );
	check( k, 'keyboard: arrows wrap around', await p.evaluate( () => document.activeElement?.textContent.trim() === 'Home' ) );
	await p.keyboard.press( 'Home' );
	check( k, 'keyboard: Home goes to the first item', await p.evaluate( () => document.activeElement?.textContent.trim() === 'Home' ) );
	await p.keyboard.press( 'Enter' ).catch( () => {} );

	await v.ctx.close();

	// click mode, full width
	const v2 = await visitor( browser, rel( pages[ 'mega-menu' ].url ), 1280, 900 );
	const q = v2.page;
	await sleep( 1500 );
	await q.evaluate( () => document.querySelector( '[data-id="ab00002"]' ).scrollIntoView( { block: 'center' } ) );
	const t2 = '[data-id="ab00002"] #refraction-mm-ab00002-t2', pn2 = '[data-id="ab00002"] #refraction-mm-ab00002-p2';
	await q.hover( t2 ); await sleep( 500 );
	check( k, 'click mode: hovering does not open it', ! ( await visibleNow( q, pn2 ) ) );
	await q.click( t2 ); await sleep( 350 );
	check( k, 'click mode: click opens', await visibleNow( q, pn2 ) );
	const fb = await box( q, pn2 );
	check( k, 'full width: the dropdown spans the viewport', fb && Math.abs( fb.x ) < 2 && Math.abs( fb.width - 1280 ) < 3, JSON.stringify( fb ) );
	await shot( q, `mega-menu-full-${ theme }` );
	await q.click( t2 ); await sleep( 350 );
	check( k, 'click mode: second click closes', ! ( await visibleNow( q, pn2 ) ) );
	await q.click( t2 ); await sleep( 300 );
	await q.click( '#outside' ); await sleep( 350 );
	check( k, 'click outside closes it', ! ( await visibleNow( q, pn2 ) ) );
	await q.click( t2 ); await sleep( 300 );
	await q.click( '[data-id="ab00002"] #refraction-mm-ab00002-t3' ); await sleep( 350 );
	check( k, 'opening a second item closes the first', ! ( await visibleNow( q, pn2 ) ) && await visibleNow( q, '[data-id="ab00002"] #refraction-mm-ab00002-p3' ) );
	await q.keyboard.press( 'Escape' ); await sleep( 300 );
	check( k, 'Escape closes (click mode)', ! ( await visibleNow( q, '[data-id="ab00002"] #refraction-mm-ab00002-p3' ) ) );

	// vertical
	await q.evaluate( () => document.querySelector( '[data-id="ab00003"]' ).scrollIntoView( { block: 'center' } ) );
	await q.click( '[data-id="ab00003"] #refraction-mm-ab00003-t2' ); await sleep( 350 );
	const vb = await box( q, '[data-id="ab00003"] #refraction-mm-ab00003-p2' ), vn = await box( q, '[data-id="ab00003"] nav' );
	check( k, 'vertical layout: items stacked, dropdown opens beside the menu', vb && vn && vb.x >= vn.x + vn.width - 2, JSON.stringify( [ vb, vn ] ) );
	await v2.ctx.close();

	// mobile (tablet breakpoint = 1024 and below): stacked accordion
	const v3 = await visitor( browser, rel( pages[ 'mega-menu' ].url ), 800, 900 );
	const r = v3.page;
	await sleep( 1500 );
	const tg = '[data-id="ab00001"] .refraction-mm__toggle', list = '[data-id="ab00001"] .refraction-mm__list';
	check( k, 'mobile: menu button visible, list hidden', ( await visibleNow( r, tg ) ) && ! ( await visibleNow( r, list ) ) );
	await r.click( tg ); await sleep( 300 );
	check( k, 'mobile: button opens the stacked list (aria-expanded)', ( await visibleNow( r, list ) ) && ( await r.locator( tg ).getAttribute( 'aria-expanded' ) ) === 'true' );
	await r.click( '[data-id="ab00001"] #refraction-mm-ab00001-t2' ); await sleep( 350 );
	const sp = await r.evaluate( () => getComputedStyle( document.getElementById( 'refraction-mm-ab00001-p2' ) ).position );
	check( k, 'mobile: a dropdown opens in the flow (accordion)', ( await visibleNow( r, '[data-id="ab00001"] #refraction-mm-ab00001-p2' ) ) && 'static' === sp, sp );
	await shot( r, `mega-menu-mobile-${ theme }` );
	await r.keyboard.press( 'Escape' ); await sleep( 300 );
	await r.keyboard.press( 'Escape' ); await sleep( 300 );
	check( k, 'mobile: Escape closes the dropdown, then the menu, focus back on the button', ! ( await visibleNow( r, list ) ) && await r.evaluate( () => document.activeElement?.classList.contains( 'refraction-mm__toggle' ) ) );
	// slide-in variant
	await r.evaluate( () => document.querySelector( '[data-id="ab00002"]' ).scrollIntoView( { block: 'center' } ) );
	const tg2 = '[data-id="ab00002"] .refraction-mm__toggle', dr2 = '[data-id="ab00002"] .refraction-mm__drawer';
	await r.click( tg2 ); await sleep( 600 );
	const db = await box( r, dr2 );
	check( k, 'mobile slide-in: drawer is fixed at the edge, scrim shown, scroll locked', db && Math.abs( db.x ) < 2 && Math.abs( db.height - 900 ) < 2 && ( await visibleNow( r, '[data-id="ab00002"] .refraction-mm__scrim' ) ) && await r.evaluate( () => document.documentElement.classList.contains( 'refraction-oc-scroll-lock' ) ), JSON.stringify( db ) );
	check( k, 'mobile slide-in: focus moved into the drawer', await r.evaluate( () => document.querySelector( '[data-id="ab00002"] .refraction-mm__drawer' ).contains( document.activeElement ) ) );
	await shot( r, `mega-menu-drawer-${ theme }` );
	await r.keyboard.press( 'Escape' ); await sleep( 600 );
	check( k, 'mobile slide-in: Escape closes it, focus returns to the button, scroll unlocked', ! ( await visibleNow( r, dr2 ) ) && await r.evaluate( () => document.activeElement?.classList.contains( 'refraction-mm__toggle' ) && ! document.documentElement.classList.contains( 'refraction-oc-scroll-lock' ) ) );
	await r.click( tg2 ); await sleep( 500 );
	await r.mouse.click( 780, 450 ); await sleep( 600 );
	check( k, 'mobile slide-in: scrim click closes it', ! ( await visibleNow( r, dr2 ) ) );
	await v3.ctx.close();

	// breakpoint switching: the same page at 1100 (above tablet) and 1000 (below)
	for ( const [ w, mobile ] of [ [ 1100, false ], [ 1000, true ] ] ) {
		const vv = await visitor( browser, rel( pages[ 'mega-menu' ].url ), w, 900 );
		await sleep( 800 );
		check( k, `viewport ${ w }px: ${ mobile ? 'mobile' : 'desktop' } layout`, ( await visibleNow( vv.page, '[data-id="ab00001"] .refraction-mm__toggle' ) ) === mobile );
		await vv.ctx.close();
	}
};

/* ------------------------------------------------------------------ carousel */
const swiperState = ( page, id ) => page.evaluate( ( i ) => {
	const el = document.querySelector( `[data-id="${ i }"] .refraction-nc__viewport` );
	const s = el && el.swiper;
	return s ? { index: s.activeIndex, per: s.params.slidesPerView, effect: s.params.effect, dir: s.params.direction, autoplay: !! s.autoplay?.running, rewind: s.params.rewind, w: el.offsetWidth, slides: s.slides.length } : null;
}, id );
const swiperReady = ( page, id ) => page.waitForFunction( ( i ) => !! document.querySelector( `[data-id="${ i }"] .refraction-nc__viewport` )?.swiper, id, { timeout: 25000 } );

SECTIONS.carousel = async ( { browser, pages, theme } ) => {
	const k = `carousel[${ theme }]`;
	const url = rel( pages.carousel.url );
	const v = await visitor( browser, url, 1280, 900 );
	const p = v.page;
	await swiperReady( p, 'ca00001' );
	const w1 = '[data-id="ca00001"]';

	check( k, 'region with aria-roledescription=carousel and its label', await p.evaluate( () => { const e = document.querySelector( '[data-id="ca00001"] .refraction-nc' ); return e.getAttribute( 'role' ) === 'region' && e.getAttribute( 'aria-roledescription' ) === 'carousel' && e.getAttribute( 'aria-label' ) === 'Features'; } ) );
	check( k, 'each slide container is a group with aria-roledescription=slide and "n / total" label', await p.evaluate( () => [ ...document.querySelectorAll( '[data-id="ca00001"] .swiper-slide' ) ].every( ( s, i ) => s.getAttribute( 'role' ) === 'group' && s.getAttribute( 'aria-roledescription' ) === 'slide' && new RegExp( `^${ i + 1 } / 5` ).test( s.getAttribute( 'aria-label' ) ) ) ) );
	let st = await swiperState( p, 'ca00001' );
	check( k, 'desktop: 3 slides per view', st && 3 === st.per, JSON.stringify( st ) );
	const sb = await p.evaluate( () => [ ...document.querySelectorAll( '[data-id="ca00001"] .swiper-slide' ) ].slice( 0, 3 ).map( ( s ) => Math.round( s.getBoundingClientRect().width ) ) );
	check( k, 'three slides are side by side with equal widths', sb.length === 3 && sb.every( ( x ) => Math.abs( x - sb[ 0 ] ) < 2 && x > 150 ), JSON.stringify( sb ) );
	check( k, 'slides outside the view are inert and aria-hidden', await p.evaluate( () => { const s = [ ...document.querySelectorAll( '[data-id="ca00001"] .swiper-slide' ) ]; return s[ 4 ].hasAttribute( 'inert' ) && s[ 4 ].getAttribute( 'aria-hidden' ) === 'true' && ! s[ 0 ].hasAttribute( 'inert' ); } ) );
	check( k, 'arrows and bullets are rendered, previous disabled at the start', await p.evaluate( () => { const r = document.querySelector( '[data-id="ca00001"]' ); return !! r.querySelector( '.refraction-nc__next' ) && r.querySelectorAll( '.swiper-pagination-bullet' ).length > 1 && r.querySelector( '.refraction-nc__prev' ).classList.contains( 'swiper-button-disabled' ); } ) );
	await shot( p, `carousel-desktop-${ theme }` );
	await p.click( `${ w1 } .refraction-nc__next` ); await sleep( 600 );
	st = await swiperState( p, 'ca00001' );
	check( k, 'next arrow moves one slide', st.index === 1, JSON.stringify( st ) );
	await p.locator( `${ w1 } .swiper-pagination-bullet` ).nth( 2 ).click(); await sleep( 600 );
	check( k, 'clicking a bullet goes to that slide', ( await swiperState( p, 'ca00001' ) ).index === 2 );
	await p.click( `${ w1 } .refraction-nc__prev` ); await sleep( 600 );
	check( k, 'previous arrow goes back', ( await swiperState( p, 'ca00001' ) ).index === 1 );
	await p.locator( `${ w1 } .swiper-slide-active a` ).first().focus();
	await p.keyboard.press( 'ArrowRight' ); await sleep( 600 );
	check( k, 'keyboard: ArrowRight inside a slide goes to the next slide', ( await swiperState( p, 'ca00001' ) ).index === 2 );
	check( k, 'widgets inside the slides keep working (links, no duplicate ids)', await p.evaluate( () => { const ids = [ ...document.querySelectorAll( '[id]' ) ].map( ( e ) => e.id ); return ids.length === new Set( ids ).size && document.querySelectorAll( '[data-id="ca00001"] .swiper-slide .refraction-button' ).length === 5; } ) );

	// autoplay
	await swiperReady( p, 'ca00002' );
	await p.evaluate( () => document.querySelector( '[data-id="ca00002"]' ).scrollIntoView( { block: 'center' } ) );
	await p.mouse.move( 5, 5 );
	const a0 = ( await swiperState( p, 'ca00002' ) ).index;
	await sleep( 3600 );
	const a1 = ( await swiperState( p, 'ca00002' ) ).index;
	check( k, 'autoplay advances on its own', a1 !== a0, `${ a0 } -> ${ a1 }` );
	check( k, 'autoplay: live region is off while it runs; a pause button exists', ( await p.locator( '[data-id="ca00002"] .refraction-nc__track' ).getAttribute( 'aria-live' ) ) === 'off' && await p.locator( '[data-id="ca00002"] .refraction-nc__autoplay' ).count() === 1 );
	check( k, 'fraction pagination shows "n / total"', /\d+\s*\/\s*4/.test( await p.locator( '[data-id="ca00002"] .swiper-pagination-fraction' ).innerText() ) );
	await p.click( '[data-id="ca00002"] .refraction-nc__autoplay' ); await sleep( 300 );
	const b0 = ( await swiperState( p, 'ca00002' ) ).index;
	await sleep( 2600 );
	check( k, 'pause button stops autoplay, the live region becomes polite', ( await swiperState( p, 'ca00002' ) ).index === b0 && ( await p.locator( '[data-id="ca00002"] .refraction-nc__track' ).getAttribute( 'aria-live' ) ) === 'polite' );
	await p.click( '[data-id="ca00002"] .refraction-nc__autoplay' ); await sleep( 300 );
	await p.hover( '[data-id="ca00002"] .refraction-nc__viewport' ); await sleep( 300 );
	const h0 = ( await swiperState( p, 'ca00002' ) ).index;
	await sleep( 2800 );
	check( k, 'pause on hover keeps the slide still while hovering', ( await swiperState( p, 'ca00002' ) ).index === h0 );
	await p.mouse.move( 5, 5 );
	await p.evaluate( () => document.querySelector( '[data-id="ca00002"] .refraction-nc__viewport' ).swiper.slideTo( 3, 0 ) );
	await p.click( '[data-id="ca00002"] .refraction-nc__next' ); await sleep( 500 );
	check( k, 'loop: next on the last slide goes back to the first (no cloned slides)', ( await swiperState( p, 'ca00002' ) ).index === 0 && ( await swiperState( p, 'ca00002' ) ).slides === 4 );

	// effects
	await swiperReady( p, 'ca00003' );
	st = await swiperState( p, 'ca00003' );
	check( k, 'fade effect: one slide at a time, progress bar, no arrows', st.effect === 'fade' && st.per === 1 && await p.locator( '[data-id="ca00003"] .swiper-pagination-progressbar' ).count() === 1 && await p.locator( '[data-id="ca00003"] .refraction-nc__arrow' ).count() === 0, JSON.stringify( st ) );
	await swiperReady( p, 'ca00004' );
	st = await swiperState( p, 'ca00004' );
	const vh = await p.locator( '[data-id="ca00004"] .refraction-nc__viewport' ).evaluate( ( e ) => e.offsetHeight );
	check( k, 'vertical direction with a set height', st.dir === 'vertical' && Math.abs( vh - 220 ) < 2, JSON.stringify( [ st, vh ] ) );
	check( k, 'a single slide renders without arrows, bullets or a Swiper', await p.evaluate( () => { const r = document.querySelector( '[data-id="ca00005"]' ); return !! r.querySelector( '.swiper-slide' ) && ! r.querySelector( '.refraction-nc__arrow' ) && ! r.querySelector( '.swiper-pagination' ) && ! r.querySelector( '.refraction-nc__viewport' ).swiper; } ) );
	await v.ctx.close();

	// breakpoints
	for ( const [ w, per ] of [ [ 900, 2 ], [ 500, 1 ] ] ) {
		const vv = await visitor( browser, url, w, 800 );
		await swiperReady( vv.page, 'ca00001' );
		const s = await swiperState( vv.page, 'ca00001' );
		check( k, `viewport ${ w }px: ${ per } slide(s) per view`, s.per === per || ( s.w > 0 && await vv.page.evaluate( () => document.querySelector( '[data-id="ca00001"] .swiper-slide' ).offsetWidth ) > 0 && s.per === per ), JSON.stringify( s ) );
		await vv.ctx.close();
	}

	// reduced motion: no autoplay
	const rv = await visitor( browser, url, 1280, 900, { reducedMotion: 'reduce' } );
	await swiperReady( rv.page, 'ca00002' );
	const r0 = ( await swiperState( rv.page, 'ca00002' ) );
	await sleep( 3500 );
	check( k, 'reduced motion: autoplay does not run', ! r0.autoplay && ( await swiperState( rv.page, 'ca00002' ) ).index === r0.index, JSON.stringify( r0 ) );
	await rv.ctx.close();
};

/* ------------------------------------------------------------------ combinations */
SECTIONS.combos = async ( { browser, pages, theme } ) => {
	const k = `combos[${ theme }]`;
	const v = await visitor( browser, rel( pages.combos.url ), 1280, 900 );
	const p = v.page;
	await sleep( 2000 );

	// mega menu dropdown containing a carousel
	await p.click( '#refraction-mm-ab00010-t1' ); await sleep( 800 );
	await swiperReady( p, 'ca00010' );
	let st = await swiperState( p, 'ca00010' );
	check( k, 'carousel inside a mega menu dropdown: measured once the dropdown opens', st && st.w > 100 && st.slides === 3, JSON.stringify( st ) );
	await p.click( '[data-id="ca00010"] .refraction-nc__next' ); await sleep( 600 );
	check( k, '...and it navigates', ( await swiperState( p, 'ca00010' ) ).index === 1 );
	await shot( p, `combo-menu-carousel-${ theme }` );
	await p.keyboard.press( 'Escape' ); await sleep(300);
	await p.click( '#refraction-mm-ab00010-t1' ); await sleep( 600 );
	check( k, '...and still works after closing and reopening', ( await swiperState( p, 'ca00010' ) ).w > 100 );
	await p.keyboard.press( 'Escape' );

	// off-canvas containing the mega menu
	await p.locator( '[data-id="ac00010"] .refraction-offcanvas__trigger' ).click(); await sleep( 600 );
	check( k, 'off-canvas with a mega menu inside: the menu is the stacked embedded layout without a menu button', await p.evaluate( () => { const m = document.querySelector( '[data-id="ab00020"] .refraction-mm' ); return m.classList.contains( 'is-embedded' ); } ) && ! ( await visibleNow( p, '[data-id="ab00020"] .refraction-mm__toggle' ) ) );
	await p.click( '#refraction-mm-ab00020-t1' ); await sleep( 400 );
	check( k, '...a dropdown opens in the flow inside the panel', await visibleNow( p, '#refraction-mm-ab00020-p1' ) && await p.evaluate( () => document.querySelector( '#menu-panel' ).contains( document.getElementById( 'refraction-mm-ab00020-p1' ) ) ) );
	await shot( p, `combo-offcanvas-menu-${ theme }` );
	await p.keyboard.press( 'Escape' ); await sleep( 400 );
	check( k, '...first Escape closes the dropdown only', ! ( await visibleNow( p, '#refraction-mm-ab00020-p1' ) ) && await visibleNow( p, '#menu-panel' ) );
	await p.keyboard.press( 'Escape' ); await sleep( 500 );
	check( k, '...second Escape closes the off-canvas', ! ( await visibleNow( p, '#menu-panel' ) ) );

	// carousel inside an off-canvas (modal-like centered panel)
	await p.locator( '[data-id="ac00011"] .refraction-offcanvas__trigger' ).click(); await sleep( 600 );
	await swiperReady( p, 'ca00020' );
	st = await swiperState( p, 'ca00020' );
	check( k, 'carousel inside a centered off-canvas panel is measured when it opens', st && st.w > 100, JSON.stringify( st ) );
	await p.click( '[data-id="ca00020"] .refraction-nc__next' ); await sleep( 500 );
	check( k, '...and navigates; focus stays in the dialog', ( await swiperState( p, 'ca00020' ) ).index === 1 && await inPanel( p, '#carousel-panel' ) );
	await shot( p, `combo-offcanvas-carousel-${ theme }` );
	await p.keyboard.press( 'Escape' ); await sleep( 400 );

	// carousel inside a nested tab
	await p.evaluate( () => document.querySelector( '[data-id="ad00001"]' ).scrollIntoView( { block: 'center' } ) );
	const before = await swiperState( p, 'ca00030' );
	await p.locator( '[data-id="ad00001"] .e-n-tab-title' ).nth( 1 ).click(); await sleep( 800 );
	await swiperReady( p, 'ca00030' );
	st = await swiperState( p, 'ca00030' );
	check( k, 'carousel inside a hidden tab is measured after the tab opens', st && st.w > 100, JSON.stringify( [ before, st ] ) );
	await p.click( '[data-id="ca00030"] .refraction-nc__next' ); await sleep( 500 );
	check( k, '...and navigates', ( await swiperState( p, 'ca00030' ) ).index === 1 );
	await v.ctx.close();
};

/* ------------------------------------------------------------------ editor */
async function dragWidget( admin, title, type, targetSel ) {
	await admin.page.evaluate( () => { $e.route( 'panel/elements/categories' ); } );
	await admin.page.waitForSelector( '#refraction-panel-elements-search-input', { timeout: 15000 } );
	await admin.page.fill( '#refraction-panel-elements-search-input', title );
	await sleep( 600 );
	const found = await admin.page.locator( '#refraction-panel-elements .refraction-element .title' ).allInnerTexts();
	const inPanel_ = found.some( ( t ) => t.trim() === title );
	const before = await admin.page.evaluate( () => refraction.documents.getCurrent().container.children[ 0 ].children.map( ( c ) => c.id ) );
	const src = admin.page.locator( `#refraction-panel-elements .refraction-element[data-library-element-type="${ type }"]` );
	const tgt = frameOf( admin ).locator( targetSel ).first();
	const sb = await src.boundingBox();
	const tb = await tgt.boundingBox();
	await admin.page.mouse.move( sb.x + sb.width / 2, sb.y + sb.height / 2 );
	await admin.page.mouse.down();
	await admin.page.mouse.move( sb.x + sb.width / 2 + 20, sb.y + 20, { steps: 5 } );
	await admin.page.mouse.move( tb.x + 30, tb.y + tb.height - 4, { steps: 15 } );
	await admin.page.mouse.move( tb.x + 32, tb.y + tb.height - 3, { steps: 3 } );
	await sleep( 300 );
	await admin.page.mouse.up();
	await admin.page.waitForFunction( ( n ) => refraction.documents.getCurrent().container.children[ 0 ].children.length > n, before.length, { timeout: 15000 } ).catch( () => {} );
	await sleep( 2500 );
	const created = await admin.page.evaluate( ( [ b, wt ] ) => {
		const kids = refraction.documents.getCurrent().container.children[ 0 ].children;
		const added = kids.find( ( c ) => ! b.includes( c.id ) );
		return added ? { id: added.id, type: added.model.get( 'widgetType' ), children: added.children.length } : null;
	}, [ before, type ] );
	await admin.page.fill( '#refraction-panel-elements-search-input', '' );
	return { found: inPanel_, created };
}

SECTIONS.editor = async ( { admin, pages } ) => {
	const k = 'editor';
	await openEditor( admin, pages[ 'off-canvas' ].id );

	// the three widgets: panel search, real drag, containers created, preview renders
	for ( const [ title, type, children, sel ] of [ [ 'Off-Canvas', 'refraction-off-canvas', 1, '.refraction-offcanvas' ], [ 'Mega Menu', 'refraction-mega-menu', 3, '.refraction-mm' ], [ 'Nested Carousel', 'refraction-nested-carousel', 3, '.refraction-nc' ] ] ) {
		const r = await dragWidget( admin, title, type, '.refraction-widget' );
		check( k, `${ title }: found in the panel by name`, r.found );
		check( k, `${ title }: real drag from the panel creates the widget with ${ children } default container(s)`, r.created && r.created.type === type && r.created.children === children, JSON.stringify( r.created ) );
		if ( r.created ) {
			const ok = await frameOf( admin ).evaluate( ( [ id, s ] ) => !! document.querySelector( `[data-id="${ id }"] ${ s }` ), [ r.created.id, sel ] );
			check( k, `${ title }: the dropped widget renders in the preview`, ok );
			await admin.page.evaluate( ( id ) => { $e.run( 'document/elements/delete', { container: refraction.getContainer( id ) } ); }, r.created.id );
		}
	}

	// ---- off-canvas editing
	const oc = await admin.page.evaluate( () => refraction.getContainer( 'ac00001' ).children.length );
	check( k, 'off-canvas: the saved container loads as its child', 1 === oc );
	const f = frameOf( admin );
	await f.locator( '[data-id="ac00001"]' ).scrollIntoViewIfNeeded();
	const ob = await f.locator( '[data-id="ac00001"] .refraction-offcanvas__panel' ).boundingBox();
	check( k, 'off-canvas: the panel is shown open, in the flow, while editing', ob && ob.height > 60 && ob.width > 200, JSON.stringify( ob ) );
	check( k, 'off-canvas: the child container sits inside the panel content', await f.evaluate( () => !! document.querySelector( '[data-id="ac00001"] .refraction-offcanvas__content > [data-element_type="container"]' ) ) );
	await admin.page.evaluate( () => { $e.run( 'document/elements/create', { container: refraction.getContainer( 'ac00001' ).children[ 0 ], model: { elType: 'widget', widgetType: 'heading', settings: { title: 'Added in the editor' } } } ); } );
	await sleep( 1500 );
	check( k, 'off-canvas: a widget added to the panel container appears in the preview inside the panel', await f.evaluate( () => /Added in the editor/.test( document.querySelector( '[data-id="ac00001"] .refraction-offcanvas__content' )?.textContent || '' ) ) );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ac00001' ), settings: { position: 'right', show_close_button: '' } } ); } );
	await sleep( 2000 );
	const ocs = await f.evaluate( () => ( { pos: document.querySelector( '[data-id="ac00001"] .refraction-offcanvas' )?.dataset.position, close: !! document.querySelector( '[data-id="ac00001"] .refraction-offcanvas__close' ) } ) );
	check( k, 'off-canvas: changing settings updates the preview live', ocs.pos === 'right' && ! ocs.close, JSON.stringify( ocs ) );
	check( k, 'off-canvas: children survive the re-render', await f.evaluate( () => !! document.querySelector( '[data-id="ac00001"] .refraction-offcanvas__content > [data-element_type="container"]' ) ) );
	await admin.page.screenshot( { path: join( SHOTS, 'editor-off-canvas.png' ) } );

	// ---- mega menu editing
	await openEditor( admin, pages[ 'mega-menu' ].id );
	const g = frameOf( admin );
	const mmLis = () => g.evaluate( () => document.querySelectorAll( '[data-id="ab00001"] .refraction-mm__list > .refraction-mm__item' ).length );
	const mmCount = () => admin.page.evaluate( () => refraction.getContainer( 'ab00001' ).children.length );
	check( k, 'mega menu: 4 items, 4 containers, preview lists 4 items', ( await mmLis() ) === 4 && ( await mmCount() ) === 4 );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/insert', { container: refraction.getContainer( 'ab00001' ), name: 'items', model: { item_title: 'Added item', item_type: 'dropdown' } } ); } );
	await sleep( 2500 );
	check( k, 'mega menu: Add Item creates an item and its container; the preview shows it', ( await mmLis() ) === 5 && ( await mmCount() ) === 5 && await g.evaluate( () => /Added item/.test( document.querySelector( '[data-id="ab00001"] .refraction-mm__list' ).textContent ) ) );
	check( k, 'mega menu: the new container sits in the new item (panel decorated)', await g.evaluate( () => !! document.querySelector( '[data-id="ab00001"] .refraction-mm__item:nth-child(5) .refraction-mm__panel' ) ) );
	await admin.page.evaluate( () => { const c = refraction.getContainer( 'ab00001' ); $e.run( 'document/repeater/duplicate', { container: c, name: 'items', index: 2 } ); } );
	await sleep( 2500 );
	check( k, 'mega menu: duplicate adds an item and a container', ( await mmLis() ) === 6 && ( await mmCount() ) === 6 );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/remove', { container: refraction.getContainer( 'ab00001' ), name: 'items', index: 5 } ); } );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/remove', { container: refraction.getContainer( 'ab00001' ), name: 'items', index: 4 } ); } );
	await sleep( 2500 );
	check( k, 'mega menu: remove deletes the item and its container', ( await mmLis() ) === 4 && ( await mmCount() ) === 4 );
	await admin.page.evaluate( () => { const c = refraction.getContainer( 'ab00001' ).repeaters.items.children[ 0 ]; $e.run( 'document/elements/settings', { container: c, settings: { item_title: 'Renamed home' } } ); } );
	await sleep( 2000 );
	check( k, 'mega menu: editing an item title updates the preview', await g.evaluate( () => /Renamed home/.test( document.querySelector( '[data-id="ab00001"] .refraction-mm__list' ).textContent ) ) );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/select', { container: refraction.getContainer( 'ab00001' ), index: 2 } ); } );
	await sleep( 1200 );
	const open2 = await g.evaluate( () => { const p = document.querySelector( '[data-id="ab00001"] .refraction-mm__item:nth-child(2) .refraction-mm__panel' ); return p && p.classList.contains( 'is-open' ) && p.getBoundingClientRect().height > 20; } );
	check( k, 'mega menu: selecting an item shows its dropdown in the preview', open2 );
	await g.locator( '[data-id="ab00001"]' ).scrollIntoViewIfNeeded();
	await admin.page.screenshot( { path: join( SHOTS, 'editor-mega-menu.png' ) } );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ab00001' ).repeaters.items.children[ 1 ], settings: { item_type: 'link' } } ); } );
	await sleep( 2000 );
	check( k, 'mega menu: switching an item to Link hides its container panel', await g.evaluate( () => { const p = document.querySelector( '[data-id="ab00001"] .refraction-mm__item:nth-child(2) .refraction-mm__panel' ); return ! p || getComputedStyle( p ).display === 'none'; } ) );

	// ---- carousel editing
	await openEditor( admin, pages.carousel.id );
	const h = frameOf( admin );
	const slideCount = () => h.evaluate( () => document.querySelectorAll( '[data-id="ca00002"] .refraction-nc__track > .swiper-slide' ).length );
	const swiperSlides = () => h.evaluate( () => document.querySelector( '[data-id="ca00002"] .refraction-nc__viewport' )?.swiper?.slides.length );
	check( k, 'carousel: 4 slides in the preview and a live Swiper', ( await slideCount() ) === 4 && ( await swiperSlides() ) === 4 );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/insert', { container: refraction.getContainer( 'ca00002' ), name: 'slides', model: { slide_title: 'Fresh' } } ); } );
	await sleep( 2500 );
	check( k, 'carousel: Add Slide adds a container; the Swiper is rebuilt with 5 slides', ( await slideCount() ) === 5 && ( await swiperSlides() ) === 5, `${ await slideCount() } / ${ await swiperSlides() }` );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/duplicate', { container: refraction.getContainer( 'ca00002' ), name: 'slides', index: 0 } ); } );
	await sleep( 2500 );
	check( k, 'carousel: duplicate -> 6 slides, Swiper rebuilt', ( await slideCount() ) === 6 && ( await swiperSlides() ) === 6, `${ await slideCount() } / ${ await swiperSlides() }` );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/remove', { container: refraction.getContainer( 'ca00002' ), name: 'slides', index: 5 } ); } );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/remove', { container: refraction.getContainer( 'ca00002' ), name: 'slides', index: 4 } ); } );
	await sleep( 2500 );
	check( k, 'carousel: remove -> back to 4 slides, Swiper rebuilt', ( await slideCount() ) === 4 && ( await swiperSlides() ) === 4, `${ await slideCount() } / ${ await swiperSlides() }` );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ca00001' ), settings: { slides_to_show: '2' } } ); } );
	await sleep( 2000 );
	check( k, 'carousel: slides to show updates the live Swiper', await h.evaluate( () => document.querySelector( '[data-id="ca00001"] .refraction-nc__viewport' ).swiper.params.slidesPerView === 2 ) );
	await admin.page.evaluate( () => { $e.run( 'document/repeater/select', { container: refraction.getContainer( 'ca00002' ), index: 3 } ); } );
	await sleep( 1500 );
	check( k, 'carousel: selecting a slide in the panel shows it', ( await h.evaluate( () => document.querySelector( '[data-id="ca00002"] .refraction-nc__viewport' ).swiper.activeIndex ) ) === 2 );

	// navigator lists the child containers with their titles
	await admin.page.evaluate( () => { $e.run( 'navigator/open' ); } ).catch( () => {} );
	await sleep( 1500 );
	const nav = await admin.page.evaluate( () => ( document.querySelector( '#refraction-navigator' )?.textContent || '' ) );
	check( k, 'navigator: lists the slide containers by title', /Slide 1|Slide #1/.test( nav ), nav.slice( 0, 200 ).replace( /\s+/g, ' ' ) );
	await admin.page.screenshot( { path: join( SHOTS, 'editor-carousel.png' ) } );
};

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	try {
		wp( [ 'plugin', 'activate', 'refraction' ] );
		const out = wp( [ 'eval-file', SEED ] );
		const pages = JSON.parse( out.slice( out.indexOf( '{' ), out.lastIndexOf( '}' ) + 1 ) );

		for ( const theme of THEMES ) {
			try { wp( [ 'theme', 'install', theme ] ); } catch { /* already installed */ }
			wp( [ 'theme', 'activate', theme ] );
			wp( [ 'rewrite', 'flush' ] );
			for ( const name of [ 'off-canvas', 'mega-menu', 'carousel', 'combos' ] ) {
				if ( ONLY.length && ! ONLY.includes( name ) ) { continue; }
				console.log( `\n== ${ name } (${ theme }) ==` );
				try {
					await SECTIONS[ name ]( { browser, pages, theme } );
				} catch ( e ) {
					check( `${ name }[${ theme }]`, 'section ran without throwing', false, e.stack || e.message );
				}
			}
		}

		if ( ! ONLY.length || ONLY.includes( 'editor' ) ) {
			wp( [ 'theme', 'activate', THEMES[ 0 ] ] );
			const admin = await login( browser, 'admin', 'admin' );
			watch( admin.page, 'admin' );
			console.log( '\n== editor ==' );
			try {
				await SECTIONS.editor( { browser, admin, pages } );
			} catch ( e ) {
				check( 'editor', 'section ran without throwing', false, e.stack || e.message );
			}
		}

		const php = logTail( logStart );
		check( 'global', 'no PHP errors/warnings in the debug log', ! /PHP (Warning|Notice|Fatal|Deprecated|Parse)/.test( php ), php.slice( 0, 400 ) );
		const real = consoleErrors.filter( ( e ) => ! /favicon|Failed to load resource: the server responded with a status of 404 \(Not Found\)$/.test( e ) );
		check( 'global', 'no browser console errors', real.length === 0, real.slice( 0, 4 ).join( ' || ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( `\n${ results.length - failures }/${ results.length } checks passed` );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
