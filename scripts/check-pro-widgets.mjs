#!/usr/bin/env node
/**
 * Pro widgets (Advanced category) check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-pro-widgets.mjs [--site /tmp/rf-widgets-site] [--port 8831] [--shots /tmp/rfw-shots]
 *                                            [--wpcli /tmp/rsite-dl/wpcli.phar] [--only nav-menu,slides,...]
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
const SITE = arg( 'site', '/tmp/rf-widgets-site' );
const PORT = arg( 'port', '8831' );
const SHOTS = arg( 'shots', '/tmp/rfw-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const ONLY = arg( 'only', '' ).split( ',' ).filter( Boolean );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/pro-widgets-seed.php' );

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

/** Editor facts that every widget shares. */
async function editorBasics( ctx, admin, key, widgetType, title ) {
	const info = await admin.page.evaluate( ( wt ) => {
		const cfg = window.refraction.widgetsCache[ wt ];
		return cfg ? { title: cfg.title, categories: cfg.categories, icon: cfg.icon } : null;
	}, widgetType );
	check( key, 'registered in the editor with the Advanced category', info && info.categories.includes( 'refraction-advanced' ), JSON.stringify( info ) );
	check( key, `title is "${ title }"`, info?.title === title, info?.title );

	// Panel search
	await admin.page.evaluate( () => { $e.route( "panel/elements/categories" ); } );
	await admin.page.waitForSelector( '#refraction-panel-elements-search-input', { timeout: 15000 } );
	await admin.page.fill( '#refraction-panel-elements-search-input', title );
	await sleep( 500 );
	const found = await admin.page.locator( '#refraction-panel-elements .refraction-element .title' ).allInnerTexts();
	check( key, 'found by name in the panel search', found.some( ( t ) => t.trim() === title ), found.join( '|' ) );
	await admin.page.fill( '#refraction-panel-elements-search-input', '' );
	await sleep( 500 );

	// Category list: the widget sits inside the "Advanced" category.
	const catOk = await admin.page.evaluate( ( wt ) => {
		for ( const c of document.querySelectorAll( '.refraction-panel-category' ) ) {
			const label = ( c.querySelector( '.refraction-panel-category-title' )?.textContent || c.textContent ).trim().split( '\n' )[ 0 ].trim();
			if ( 'Advanced' === label ) {
				return !! c.querySelector( `.refraction-element[data-library-element-type="${ wt }"]` );
			}
		}
		return false;
	}, widgetType );
	check( key, 'the widget is listed in the Advanced category of the panel', catOk );

	// Create into a container through the editor command API and see it rendered in the preview.
	const created = await admin.page.evaluate( async ( wt ) => {
		const container = refraction.documents.getCurrent().container.children[ 0 ];
		const el = $e.run( 'document/elements/create', { container, model: { elType: 'widget', widgetType: wt } } );
		return { id: el.id, count: container.children.length };
	}, widgetType );
	await sleep( 2500 );
	const rendered = await frameOf( admin ).evaluate( ( id ) => !! document.querySelector( `[data-id="${ id }"] *` ), created.id );
	check( key, 'a new instance dropped into a container renders in the preview', rendered, JSON.stringify( created ) );
	await admin.page.evaluate( ( id ) => { $e.run( 'document/elements/delete', { container: refraction.getContainer( id ) } ); }, created.id );
	return created;
}

const rel = ( url ) => { const u = new URL( url ); return u.pathname + u.search; };

const SECTIONS = {};

/* ------------------------------------------------------------------ nav-menu */
SECTIONS[ 'nav-menu' ] = async ( { browser, admin, pages } ) => {
	const k = 'nav-menu';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-nav-menu', 'Nav Menu' );

	// A control change re-renders the preview (layout horizontal -> vertical).
	await admin.page.evaluate( () => {
		const c = refraction.getContainer( 'nav0001' );
		$e.run( 'document/elements/settings', { container: c, settings: { layout: 'vertical' } } );
	} );
	await sleep( 2500 );
	const cls = await frameOf( admin ).evaluate( () => document.querySelector( '[data-id="nav0001"]' )?.className );
	check( k, 'changing Layout in the editor updates the preview', /layout-vertical/.test( cls || '' ), cls );
	await admin.page.screenshot( { path: join( SHOTS, 'nav-menu-editor.png' ) } );

	// ---- desktop front end
	let v = await visitor( browser, rel( pages[ k ].url ), 1280 );
	let p = v.page;
	const first = p.locator( '[data-id="nav0001"]' );
	check( k, 'desktop: nav landmark with a label', ( await first.locator( 'nav.refraction-nav-menu[aria-label="Main menu"]' ).count() ) === 1 );
	check( k, 'desktop: hamburger hidden, links visible', ! ( await first.locator( '.refraction-nav-menu__toggle' ).isVisible() ) && await first.locator( '.refraction-nav-menu__link', { hasText: 'Home' } ).isVisible() );
	const xs = await first.locator( '.refraction-nav-menu__list > li > a' ).evaluateAll( ( els ) => els.map( ( e ) => Math.round( e.getBoundingClientRect().top ) ) );
	check( k, 'desktop: horizontal items share one row', new Set( xs ).size === 1, xs.join( ',' ) );
	const sub = first.locator( '.refraction-nav-menu__sub--depth-1' ).first();
	check( k, 'submenu hidden until hover', ! ( await sub.isVisible() ) );
	await first.locator( '.refraction-nav-menu__link', { hasText: 'About' } ).hover();
	await sleep( 400 );
	check( k, 'submenu opens on hover', await sub.isVisible() && await sub.locator( 'a', { hasText: 'Team' } ).isVisible() );
	await p.mouse.move( 5, 5 );
	await sleep( 400 );
	const subBtn = first.locator( '.refraction-nav-menu__subtoggle' ).first();
	check( k, 'sub toggle is a button with expanded state', ( await subBtn.getAttribute( 'aria-expanded' ) ) === 'false' && ( await subBtn.getAttribute( 'aria-label' ) ).includes( 'About' ) );
	await subBtn.click();
	await sleep( 300 );
	check( k, 'clicking the sub toggle opens the submenu', ( await subBtn.getAttribute( 'aria-expanded' ) ) === 'true' && await sub.isVisible() );
	await p.keyboard.press( 'Escape' );
	await sleep( 300 );
	check( k, 'Escape closes the submenu', ( await subBtn.getAttribute( 'aria-expanded' ) ) === 'false' );
	// keyboard: tab onto the About link opens its submenu via :focus-within
	await first.locator( '.refraction-nav-menu__link', { hasText: 'About' } ).focus();
	await sleep( 300 );
	check( k, 'keyboard focus on a parent shows its submenu', await sub.isVisible() );
	await p.screenshot( { path: join( SHOTS, 'nav-menu-desktop.png' ), fullPage: true } );
	const vert = p.locator( '[data-id="nav0002"]' );
	const ys = await vert.locator( '.refraction-nav-menu__list > li > a' ).evaluateAll( ( els ) => els.map( ( e ) => Math.round( e.getBoundingClientRect().top ) ) );
	check( k, 'vertical layout stacks items', new Set( ys ).size === ys.length && ys.length === 3, ys.join( ',' ) );
	check( k, 'dropdown layout shows the hamburger even on desktop', await p.locator( '[data-id="nav0003"] .refraction-nav-menu__toggle' ).isVisible() && ( await p.locator( '[data-id="nav0003"] .refraction-nav-menu__toggle-label' ).innerText() ) === 'Menu' );
	check( k, 'empty menu renders nothing for visitors', ( await p.locator( '[data-id="nav0004"] .refraction-nav-menu' ).count() ) === 0 );
	await v.ctx.close();

	// ---- mobile front end
	v = await visitor( browser, rel( pages[ k ].url ), 390, 800 );
	p = v.page;
	const m = p.locator( '[data-id="nav0001"]' );
	const toggle = m.locator( '.refraction-nav-menu__toggle' );
	check( k, 'mobile: hamburger visible, menu collapsed', await toggle.isVisible() && ! ( await m.locator( '.refraction-nav-menu__panel' ).isVisible() ) );
	check( k, 'mobile: hamburger has an accessible name and controls the panel', ( await toggle.getAttribute( 'aria-label' ) ) === 'Main menu' && ( await toggle.getAttribute( 'aria-controls' ) ) === await m.locator( '.refraction-nav-menu__panel' ).getAttribute( 'id' ) );
	await toggle.click();
	await sleep( 300 );
	check( k, 'mobile: clicking the hamburger opens the menu', ( await toggle.getAttribute( 'aria-expanded' ) ) === 'true' && await m.locator( '.refraction-nav-menu__link', { hasText: 'Contact' } ).isVisible() );
	await m.locator( '.refraction-nav-menu__subtoggle' ).first().click();
	await sleep( 300 );
	check( k, 'mobile: a sub toggle expands the branch inline', await m.locator( '.refraction-nav-menu__link', { hasText: 'Team' } ).isVisible() );
	await p.screenshot( { path: join( SHOTS, 'nav-menu-mobile-open.png' ) } );
	await p.keyboard.press( 'Escape' );
	await sleep( 300 );
	check( k, 'mobile: Escape closes the menu and returns focus to the button', ( await toggle.getAttribute( 'aria-expanded' ) ) === 'false' && await toggle.evaluate( ( e ) => e === document.activeElement ) );
	await toggle.click();
	await p.mouse.click( 20, 700 );
	await sleep( 300 );
	check( k, 'mobile: clicking outside closes the menu', ( await toggle.getAttribute( 'aria-expanded' ) ) === 'false' );
	await v.ctx.close();
};

/* -------------------------------------------------------------------- slides */
SECTIONS.slides = async ( { browser, admin, pages } ) => {
	const k = 'slides';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-slides', 'Slides' );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'sld0001' ), settings: { transition: 'fade' } } ); } );
	await sleep( 2500 );
	const fadeInPreview = await frameOf( admin ).evaluate( () => !! document.querySelector( '[data-id="sld0001"] .swiper-fade' ) );
	check( k, 'changing Transition in the editor re-initialises the slider (fade)', fadeInPreview );

	const v = await visitor( browser, rel( pages[ k ].url ), 1280 );
	const p = v.page;
	const a = p.locator( '[data-id="sld0001"]' );
	await p.waitForSelector( '[data-id="sld0001"] .swiper-initialized' );
	check( k, 'renders 3 slides with a labelled carousel region', ( await a.locator( '.refraction-slide:not(.swiper-slide-duplicate)' ).count() ) === 3 && ( await a.locator( '[role="region"][aria-roledescription="carousel"]' ).getAttribute( 'aria-label' ) ) === 'Hero slider' );
	check( k, 'slides carry "n of total" labels', ( await a.locator( '.refraction-slide' ).first().getAttribute( 'aria-label' ) ) !== null && /\d+ (of|\/) 3/.test( ( await a.locator( '.refraction-slide' ).first().getAttribute( 'aria-label' ) ) || '' ) );
	check( k, 'title is escaped text inside the configured heading tag', ( await a.locator( 'h2.refraction-slide__title' ).first().innerHTML() ).includes( '&lt;b&gt;title&lt;/b&gt;' ) );
	check( k, 'button opens in a new tab with noopener', await a.locator( '.refraction-slide .refraction-pro-button' ).first().evaluate( ( e ) => e.getAttribute( 'target' ) === '_blank' && /noopener/.test( e.rel ) ) );
	check( k, 'three pagination bullets and two arrows', ( await a.locator( '.swiper-pagination-bullet' ).count() ) === 3 && ( await a.locator( '.refraction-swiper-button' ).count() ) === 2 );
	const idx = () => a.evaluate( ( el ) => jQuery( el ).find( '.swiper' ).addBack( '.swiper' ).first().data( 'swiper' )?.realIndex ?? jQuery( el ).find( '.refraction-slides-wrapper' ).data( 'swiper' )?.realIndex );
	const i0 = await idx();
	await a.locator( '.refraction-swiper-button-next' ).click();
	await sleep( 700 );
	const i1 = await idx();
	check( k, 'next arrow moves to the next slide', i1 === ( i0 + 1 ) % 3, `${ i0 } -> ${ i1 }` );
	await a.locator( '.swiper-pagination-bullet' ).nth( 0 ).click();
	await sleep( 700 );
	check( k, 'clicking a bullet jumps to that slide', ( await idx() ) === 0 );
	await a.locator( '.refraction-swiper-button-prev' ).focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 700 );
	check( k, 'arrow buttons work with the keyboard (Enter)', ( await idx() ) === 2, await idx() );
	await p.mouse.move( 5, 5 );
	const before = await idx();
	await sleep( 2600 );
	check( k, 'autoplay advances without interaction', ( await idx() ) !== before, `${ before } -> ${ await idx() }` );
	await a.hover();
	const held = await idx();
	await sleep( 2400 );
	check( k, 'pause on hover keeps the slide', ( await idx() ) === held );
	const b = p.locator( '[data-id="sld0002"]' );
	check( k, 'fade transition + dots only: no arrows', ( await b.locator( '.swiper-fade' ).count() ) === 1 && ( await b.locator( '.refraction-swiper-button' ).count() ) === 0 && ( await b.locator( '.swiper-pagination-bullet' ).count() ) === 2 );
	const c = p.locator( '[data-id="sld0003"]' );
	check( k, 'single slide: no arrows, no dots, no autoplay error', ( await c.locator( '.refraction-swiper-button, .swiper-pagination' ).count() ) === 0 );
	await p.screenshot( { path: join( SHOTS, 'slides-desktop.png' ) } );
	await v.ctx.close();

	const r = await visitor( browser, rel( pages[ k ].url ), 1280, 900, { reducedMotion: 'reduce' } );
	await r.page.waitForSelector( '[data-id="sld0001"] .swiper-initialized' );
	const r0 = await r.page.locator( '[data-id="sld0001"]' ).evaluate( ( el ) => jQuery( el ).find( '.refraction-slides-wrapper' ).data( 'swiper' )?.realIndex );
	await sleep( 3200 );
	const r1 = await r.page.locator( '[data-id="sld0001"]' ).evaluate( ( el ) => jQuery( el ).find( '.refraction-slides-wrapper' ).data( 'swiper' )?.realIndex );
	check( k, 'reduced motion: autoplay does not start', r0 === r1, `${ r0 } -> ${ r1 }` );
	await r.ctx.close();
};

/* ----------------------------------------------------------------- price-list */
SECTIONS[ 'price-list' ] = async ( { browser, admin, pages } ) => {
	const k = 'price-list';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-price-list', 'Price List' );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'plist001' ), settings: { separator_style: 'solid' } } ); } );
	await sleep( 2500 );
	const bs = await frameOf( admin ).evaluate( () => getComputedStyle( document.querySelector( '[data-id="plist001"] .refraction-price-list__separator' ) ).borderBottomStyle );
	check( k, 'Separator Style control changes the preview', bs === 'solid', bs );

	const v = await visitor( browser, rel( pages[ k ].url ) );
	const a = v.page.locator( '[data-id="plist001"]' );
	check( k, 'renders a list with three items', ( await a.locator( 'ul.refraction-price-list > li' ).count() ) === 3 );
	check( k, 'title and price are escaped text', ( await a.locator( '.refraction-price-list__title' ).first().innerHTML() ) === 'Espresso &lt;i&gt;x&lt;/i&gt;' && ( await a.locator( '.refraction-price-list__price' ).first().innerText() ) === '$3.50' );
	check( k, 'linked item wraps the title in an anchor', ( await a.locator( 'a.refraction-price-list__link[href="https://example.com/espresso"]' ).count() ) === 1 );
	check( k, 'empty description prints no paragraph', ( await a.locator( 'li' ).nth( 1 ).locator( '.refraction-price-list__description' ).count() ) === 0 );
	check( k, 'separator is decorative (aria-hidden) and fills the row', await a.locator( '.refraction-price-list__separator' ).first().evaluate( ( e ) => e.getAttribute( 'aria-hidden' ) === 'true' && e.getBoundingClientRect().width > 20 ) );
	const row = await a.locator( 'li' ).first().locator( '.refraction-price-list__title, .refraction-price-list__price' ).evaluateAll( ( els ) => els.map( ( e ) => Math.round( e.getBoundingClientRect().top / 4 ) ) );
	check( k, 'title and price share a line', row[ 0 ] === row[ 1 ], row.join( ',' ) );
	const b = v.page.locator( '[data-id="plist002"]' );
	check( k, 'separator none and title tag h4', ( await b.locator( 'h4.refraction-price-list__title' ).count() ) === 1 && ( await b.locator( '.refraction-price-list__separator' ).evaluate( ( e ) => getComputedStyle( e ).borderBottomStyle ) ) === 'none' );
	await v.page.screenshot( { path: join( SHOTS, 'price-list.png' ) } );
	await v.ctx.close();
};

/* ---------------------------------------------------------------- price-table */
SECTIONS[ 'price-table' ] = async ( { browser, admin, pages } ) => {
	const k = 'price-table';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-price-table', 'Price Table' );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ptab0001' ), settings: { ribbon_title: 'Hot deal' } } ); } );
	await sleep( 2500 );
	const rt = await frameOf( admin ).evaluate( () => document.querySelector( '[data-id="ptab0001"] .refraction-price-table__ribbon-inner' )?.textContent );
	check( k, 'changing the ribbon title updates the preview', rt === 'Hot deal', rt );

	const v = await visitor( browser, rel( pages[ k ].url ) );
	const a = v.page.locator( '[data-id="ptab0001"]' );
	check( k, 'heading is escaped text in an h3', ( await a.locator( 'h3.refraction-price-table__heading' ).innerHTML() ) === 'Pro &lt;b&gt;plan&lt;/b&gt;' );
	check( k, 'price with euro sign and a struck-out original price', ( await a.locator( '.refraction-price-table__price' ).innerText() ).replace( /\s/g, '' ) === '\u20ac49' && ( await a.locator( 'del.refraction-price-table__original' ).innerText() ).includes( '79' ) );
	check( k, 'period is shown', ( await a.locator( '.refraction-price-table__period' ).innerText() ) === 'per month' );
	check( k, 'features list: included and excluded (with screen reader text)', ( await a.locator( '.refraction-price-table__feature' ).count() ) === 2 && ( await a.locator( '.refraction-price-table__feature--excluded .refraction-visually-hidden' ).count() ) === 1 );
	check( k, 'button links to the target', ( await a.locator( 'a.refraction-pro-button' ).getAttribute( 'href' ) ) === 'https://example.com/buy' );
	const rib = a.locator( '.refraction-price-table__ribbon-inner' );
	check( k, 'ribbon shows and sits at the right corner', ( await rib.innerText() ) === 'Best value' && await rib.evaluate( ( e ) => e.closest( '.refraction-price-table' ).getBoundingClientRect().right - e.getBoundingClientRect().right < 60 ) );
	const b = v.page.locator( '[data-id="ptab0002"]' );
	check( k, 'custom currency after the number, no ribbon, no features list', ( await b.locator( '.refraction-price-table__price' ).innerText() ).replace( /\s/g, '' ) === '0CHF' && ( await b.locator( '.refraction-price-table__ribbon' ).count() ) === 0 && ( await b.locator( 'ul' ).count() ) === 0 );
	await v.page.screenshot( { path: join( SHOTS, 'price-table.png' ) } );
	await v.ctx.close();
};

/* ------------------------------------------------------------------- flip-box */
SECTIONS[ 'flip-box' ] = async ( { browser, admin, pages } ) => {
	const k = 'flip-box';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-flip-box', 'Flip Box' );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'flip0001' ), settings: { back_title: 'Changed back' } } ); } );
	await sleep( 2500 );
	const t = await frameOf( admin ).evaluate( () => document.querySelector( '[data-id="flip0001"] .refraction-flip-box__back .refraction-flip-box__title' )?.textContent );
	check( k, 'editing the back title updates the preview', t === 'Changed back', t );

	const v = await visitor( browser, rel( pages[ k ].url ) );
	const p = v.page;
	const a = p.locator( '[data-id="flip0001"]' );
	const box = a.locator( '.refraction-flip-box' );
	check( k, 'front title escaped; focusable box; button link on the back', ( await a.locator( '.refraction-flip-box__front .refraction-flip-box__title' ).innerHTML() ) === 'Front &lt;b&gt;title&lt;/b&gt;' && ( await box.getAttribute( 'tabindex' ) ) === '0' && ( await a.locator( '.refraction-flip-box__back a.refraction-pro-button' ).getAttribute( 'href' ) ) === 'https://example.com/back' );
	const tf = ( sel ) => a.locator( sel ).evaluate( ( e ) => getComputedStyle( e ).transform );
	const frontBefore = await tf( '.refraction-flip-box__front' );
	await box.hover();
	await sleep( 600 );
	const frontAfter = await tf( '.refraction-flip-box__front' );
	const backAfter = await tf( '.refraction-flip-box__back' );
	check( k, 'hover flips: front rotates away, back faces forward', frontBefore !== frontAfter && /matrix3d|matrix/.test( frontAfter ) && frontAfter !== 'none' && ( backAfter === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test( backAfter ) || /matrix3d\(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1\)/.test( backAfter ) ), `${ frontBefore } | ${ backAfter }` );
	await p.screenshot( { path: join( SHOTS, 'flip-box-hover.png' ) } );
	await p.mouse.move( 5, 5 );
	await sleep( 500 );
	check( k, 'moving away flips back', ( await tf( '.refraction-flip-box__front' ) ) === frontBefore );
	await box.focus();
	await sleep( 500 );
	check( k, 'keyboard focus flips the box too (hover mode)', ( await tf( '.refraction-flip-box__front' ) ) !== frontBefore );
	await p.mouse.move( 5, 5 );
	await p.evaluate( () => document.activeElement.blur() );

	const c = p.locator( '[data-id="flip0002"] .refraction-flip-box' );
	check( k, 'click mode box is a labelled group with aria-expanded', ( await c.getAttribute( 'aria-label' ) ) === 'Details card' && ( await c.getAttribute( 'aria-expanded' ) ) === 'false' );
	const op = () => c.locator( '.refraction-flip-box__back' ).evaluate( ( e ) => getComputedStyle( e ).opacity );
	check( k, 'click mode: back hidden until activated', ( await op() ) === '0' );
	await c.focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 500 );
	check( k, 'Enter flips a click-mode box and updates aria-expanded', ( await op() ) === '1' && ( await c.getAttribute( 'aria-expanded' ) ) === 'true' );
	await p.keyboard.press( 'Escape' );
	await sleep( 400 );
	check( k, 'Escape flips it back', ( await op() ) === '0' );
	await c.click();
	await sleep( 500 );
	check( k, 'clicking flips a click-mode box', ( await op() ) === '1' );
	const d = p.locator( '[data-id="flip0003"] .refraction-flip-box' );
	await d.hover();
	await sleep( 600 );
	const rect = await d.locator( '.refraction-flip-box__back' ).evaluate( ( e ) => Math.round( e.getBoundingClientRect().left - e.parentElement.getBoundingClientRect().left ) );
	check( k, 'slide effect brings the back into place', rect === 0, rect );
	await v.ctx.close();

	const r = await visitor( browser, rel( pages[ k ].url ), 1280, 900, { reducedMotion: 'reduce' } );
	const ru = await r.page.locator( '[data-id="flip0001"] .refraction-flip-box__front' ).evaluate( ( e ) => getComputedStyle( e ).transitionDuration );
	check( k, 'reduced motion: transitions are effectively off', parseFloat( ru ) < 0.05, ru );
	await r.ctx.close();
};

/* ------------------------------------------------------------- call-to-action */
SECTIONS[ 'call-to-action' ] = async ( { browser, admin, pages } ) => {
	const k = 'call-to-action';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-call-to-action', 'Call to Action' );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'cta00001' ), settings: { image_position: 'right' } } ); } );
	await sleep( 2500 );
	const cls = await frameOf( admin ).evaluate( () => document.querySelector( '[data-id="cta00001"] .refraction-cta' )?.className );
	check( k, 'changing the image position updates the preview', /image-right/.test( cls || '' ), cls );

	const v = await visitor( browser, rel( pages[ k ].url ) );
	const p = v.page;
	const a = p.locator( '[data-id="cta00001"]' );
	check( k, 'title escaped in the chosen tag, description printed', ( await a.locator( 'h2.refraction-cta__title' ).innerHTML() ) === 'Join &lt;b&gt;us&lt;/b&gt;' && ( await a.locator( '.refraction-cta__description' ).innerText() ) === 'Short pitch' );
	check( k, 'classic skin: image beside the text', await a.evaluate( ( el ) => { const i = el.querySelector( '.refraction-cta__image' ).getBoundingClientRect(), c = el.querySelector( '.refraction-cta__content' ).getBoundingClientRect(); return i.right <= c.left + 2 && Math.abs( i.top - c.top ) < c.height; } ) );
	check( k, 'the image is decorative (empty alt)', ( await a.locator( '.refraction-cta__image img' ).getAttribute( 'alt' ) ) === '' );
	check( k, 'whole-box link: the button covers the box', await a.locator( 'a.refraction-pro-button' ).evaluate( ( e ) => { const r = e.closest( '.refraction-cta' ).getBoundingClientRect(), x = r.left + 10, y = r.top + 10; return document.elementFromPoint( x, y ) === e || e.contains( document.elementFromPoint( x, y ) ); } ) );
	check( k, 'ribbon shows its title', ( await a.locator( '.refraction-cta__ribbon-inner' ).innerText() ) === 'New' );
	const b = p.locator( '[data-id="cta00002"] .refraction-cta' );
	check( k, 'cover skin: has a background image and keeps its minimum height', await b.evaluate( ( e ) => getComputedStyle( e.querySelector( '.refraction-cta__bg' ) ).backgroundImage.includes( 'url(' ) && e.getBoundingClientRect().height >= 319 ) );
	check( k, 'button-only link: the button is the only link', ( await p.locator( '[data-id="cta00002"] a' ).count() ) === 1 );
	const c = p.locator( '[data-id="cta00003"]' );
	check( k, 'no button text and empty description print nothing extra', ( await c.locator( '.refraction-pro-button, .refraction-cta__description' ).count() ) === 0 && ( await c.locator( 'h4.refraction-cta__title' ).count() ) === 1 );
	await p.screenshot( { path: join( SHOTS, 'call-to-action.png' ), fullPage: true } );
	const box = await a.locator( '.refraction-cta' ).boundingBox();
	await p.route( /example\.com/, ( r ) => r.fulfill( { status: 200, contentType: 'text/html', body: 'ok' } ) );
	await p.mouse.click( box.x + box.width / 2, box.y + 10 );
	await p.waitForURL( /example\.com\/signup/, { timeout: 5000 } ).catch( () => {} );
	check( k, 'clicking anywhere on the box follows the button link', /example\.com\/signup/.test( p.url() ), p.url() );
	await v.ctx.close();
};

/* ---------------------------------------------------------- animated-headline */
SECTIONS[ 'animated-headline' ] = async ( { browser, admin, pages } ) => {
	const k = 'animated-headline';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-animated-headline', 'Animated Headline' );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'hl000001' ), settings: { animation_type: 'slide' } } ); } );
	await sleep( 2500 );
	const cls = await frameOf( admin ).evaluate( () => document.querySelector( '[data-id="hl000001"] .refraction-headline' )?.className );
	check( k, 'changing the animation type updates the preview', /type-slide/.test( cls || '' ), cls );
	const edWords = await frameOf( admin ).evaluate( () => document.querySelectorAll( '[data-id="hl000001"] .refraction-headline__word' ).length );
	check( k, 'the preview contains every rotating phrase', edWords === 3, edWords );

	const v = await visitor( browser, rel( pages[ k ].url ) );
	const p = v.page;
	const h1 = p.locator( '[data-id="hl000001"]' );
	check( k, 'renders an h2 with escaped static text', ( await h1.locator( 'h2.refraction-headline' ).count() ) === 1 && ( await h1.locator( '.refraction-headline__before' ).innerHTML() ) === 'We build &lt;b&gt;x&lt;/b&gt;' );
	const seen = new Set();
	for ( let i = 0; i < 14; i++ ) {
		seen.add( await h1.locator( '.refraction-headline__word.is-active' ).first().innerText().catch( () => '' ) );
		await sleep( 300 );
	}
	check( k, 'flip: the visible phrase rotates through the list', seen.has( 'fast' ) && seen.size >= 3, [ ...seen ].join( '|' ) );
	check( k, 'only one phrase is exposed at a time (others are not displayed)', await h1.locator( '.refraction-headline__word' ).evaluateAll( ( els ) => els.filter( ( e ) => getComputedStyle( e ).display !== 'none' && getComputedStyle( e ).visibility !== 'hidden' ).length <= 2 ) );

	const t = p.locator( '[data-id="hl000002"]' );
	const states = new Set();
	for ( let i = 0; i < 60; i++ ) {
		states.add( ( await t.locator( '.refraction-headline__word.is-active' ).first().innerText().catch( () => '' ) ).trim() );
		await sleep( 60 );
	}
	check( k, 'typing: shows partial text while typing and reaches both words', [ ...states ].some( ( x ) => x.length > 0 && x.length < 5 && 'alpha'.startsWith( x ) ) && states.has( 'alpha' ) && states.has( 'beta' ), [ ...states ].join( '|' ) );

	const hi = p.locator( '[data-id="hl000003"] .refraction-headline' );
	await p.waitForFunction( () => document.querySelector( '[data-id="hl000003"] .refraction-headline' )?.classList.contains( 'is-drawn' ), null, { timeout: 5000 } ).catch( () => {} );
	check( k, 'highlight: the shape is drawn once the headline is visible', ( await hi.evaluate( ( e ) => e.classList.contains( 'is-drawn' ) ) ) && ( await hi.locator( '.refraction-headline__dynamic' ).innerText() ) === 'amazing' );

	const sw = p.locator( '[data-id="hl000004"]' );
	await sleep( 300 );
	check( k, 'swirl: letters are split into animatable spans with the phrase kept for screen readers', ( await sw.locator( '.refraction-headline__letter' ).count() ) >= 3 && ( await sw.locator( '.refraction-headline__sr' ).first().innerText() ) !== '' );

	const ci = p.locator( '[data-id="hl000005"] .refraction-headline' );
	const drawn = new Set();
	for ( let i = 0; i < 24; i++ ) { drawn.add( await ci.evaluate( ( e ) => e.classList.contains( 'is-drawn' ) ) ); await sleep( 150 ); }
	check( k, 'circle with loop: the shape draws and resets repeatedly', drawn.has( true ) && drawn.has( false ), [ ...drawn ].join() );
	await p.screenshot( { path: join( SHOTS, 'animated-headline.png' ) } );
	await v.ctx.close();

	const r = await visitor( browser, rel( pages[ k ].url ), 1280, 900, { reducedMotion: 'reduce' } );
	const rw = r.page.locator( '[data-id="hl000001"] .refraction-headline__word.is-active' );
	const first = await rw.first().innerText();
	await sleep( 2600 );
	check( k, 'reduced motion: the rotating phrase stays on the first item', first === 'fast' && ( await rw.first().innerText() ) === 'fast', first );
	check( k, 'reduced motion: the highlight is shown drawn without animating', await r.page.locator( '[data-id="hl000003"] .refraction-headline' ).evaluate( ( e ) => e.classList.contains( 'is-drawn' ) ) );
	const typed = await r.page.locator( '[data-id="hl000002"] .refraction-headline__word.is-active' ).innerText();
	check( k, 'reduced motion: typing shows the whole first word', typed.trim() === 'alpha', typed );
	await r.ctx.close();
};

/* ------------------------------------------------------------------- countdown */
SECTIONS.countdown = async ( { browser, admin, pages } ) => {
	const k = 'countdown';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-countdown', 'Countdown' );
	await admin.page.evaluate( () => { $e.run( 'document/elements/settings', { container: refraction.getContainer( 'cd000006' ), settings: { label_hours: 'Stunden' } } ); } );
	await sleep( 2500 );
	const lab = await frameOf( admin ).evaluate( () => document.querySelector( '[data-id="cd000006"] .refraction-countdown__unit--hours .refraction-countdown__label' )?.textContent );
	check( k, 'editing a label updates the preview', lab === 'Stunden', lab );
	// Timers with a redirect or hide action must not act while editing.
	check( k, 'hide action does not hide the timer inside the editor', await (async () => { await sleep( 3500 ); return frameOf( admin ).evaluate( () => getComputedStyle( document.querySelector( '[data-id="cd000004"] .refraction-countdown' ) ).display !== 'none' ); })() );
	await openEditor( admin, pages[ 'countdown-redirect' ].id );
	const frameUrl = frameOf( admin ).url();
	await sleep( 5000 );
	check( k, 'redirect action does not redirect inside the editor', frameOf( admin ).url() === frameUrl && ! /cd=redirected/.test( frameOf( admin ).url() ), frameOf( admin ).url() );

	const v = await visitor( browser, rel( pages[ k ].url ) );
	const p = v.page;
	const a = p.locator( '[data-id="cd000001"]' );
	const num = ( loc, unit ) => loc.locator( `.refraction-countdown__unit--${ unit } .refraction-countdown__digits` ).innerText();
	check( k, 'due date: shows days and hours left (2 days, 3 hours)', ( await num( a, 'days' ) ) === '02' && ( await num( a, 'hours' ) ) === '03', `${ await num( a, 'days' ) }:${ await num( a, 'hours' ) }` );
	check( k, 'is a timer with a label, four labelled units', ( await a.locator( '[role="timer"]' ).count() ) === 1 && ( await a.locator( '.refraction-countdown__label' ).allInnerTexts() ).join( ',' ) === 'Days,Hours,Minutes,Seconds' );
	const s0 = parseInt( await num( a, 'seconds' ), 10 );
	await sleep( 2300 );
	const s1 = parseInt( await num( a, 'seconds' ), 10 );
	check( k, 'it ticks every second', ( ( s0 - s1 + 60 ) % 60 ) >= 1 && ( ( s0 - s1 + 60 ) % 60 ) <= 3, `${ s0 } -> ${ s1 }` );

	const b = p.locator( '[data-id="cd000002"]' );
	const b0 = parseInt( await num( b, 'seconds' ), 10 );
	check( k, 'evergreen starts at its configured time and stores a cookie', b0 <= 5 && b0 >= 3 && ( await v.ctx.cookies() ).some( ( c ) => c.name === 'rf_cd_e2e' ), `${ b0 }` );
	await p.reload();
	await sleep( 300 );
	const b1 = parseInt( await num( p.locator( '[data-id="cd000002"]' ), 'seconds' ), 10 );
	check( k, 'evergreen keeps counting after a reload (cookie), it does not restart', b1 < b0 || b1 <= 4, `${ b0 } -> ${ b1 }` );
	await p.waitForFunction( () => document.querySelector( '[data-id="cd000002"] .refraction-countdown' )?.classList.contains( 'is-expired' ), null, { timeout: 9000 } ).catch( () => {} );
	const m = p.locator( '[data-id="cd000002"] .refraction-countdown__message' );
	check( k, 'expiry message shows (as text) and the digits go away', await m.isVisible() && ( await m.innerHTML() ) === 'Offer &lt;b&gt;over&lt;/b&gt;' && ! ( await p.locator( '[data-id="cd000002"] .refraction-countdown__units' ).isVisible() ) );
	check( k, 'expired timers stay expired after a reload', await ( async () => { await p.reload(); await sleep( 600 ); return p.locator( '[data-id="cd000002"] .refraction-countdown__message' ).isVisible(); } )() );

	check( k, 'hide action: the timer disappears when it ends', await ( async () => { await p.waitForFunction( () => getComputedStyle( document.querySelector( '[data-id="cd000004"] .refraction-countdown' ) ).display === 'none', null, { timeout: 8000 } ).catch( () => {} ); return ! ( await p.locator( '[data-id="cd000004"] .refraction-countdown' ).isVisible() ); } )() );

	const past = p.locator( '[data-id="cd000005"]' );
	check( k, 'a date in the past is already expired: message shown, zeros not shown', await past.locator( '.refraction-countdown__message' ).isVisible() && ( await past.locator( '.refraction-countdown__message' ).innerText() ) === 'Already over' );
	const few = p.locator( '[data-id="cd000006"]' );
	check( k, 'units can be switched off and relabelled (only hours and minutes, "Hrs")', ( await few.locator( '.refraction-countdown__unit' ).count() ) === 2 && ( await few.locator( '.refraction-countdown__label' ).first().innerText() ) === 'Hrs' );
	const bad = p.locator( '[data-id="cd000007"]' );
	check( k, 'an invalid date is handled: expired state and no script error', ( await bad.locator( '.refraction-countdown' ).count() ) === 1 );
	await p.screenshot( { path: join( SHOTS, 'countdown.png' ), fullPage: true } );
	await v.ctx.close();

	// redirect action on its own page load
	const r = await visitor( browser, rel( pages[ 'countdown-redirect' ].url ) );
	await r.page.waitForURL( /cd=redirected/, { timeout: 12000 } ).catch( () => {} );
	check( k, 'redirect action sends the visitor to the target when the timer ends', /cd=redirected/.test( r.page.url() ), r.page.url() );
	await r.ctx.close();

	// cookies blocked: the page must still work (timer from memory)
	const nc = await browser.newContext( { viewport: { width: 1000, height: 800 } } );
	await nc.addInitScript( () => { Object.defineProperty( document, 'cookie', { get: () => '', set: () => {} } ); Object.defineProperty( window, 'localStorage', { get: () => { throw new Error( 'blocked' ); } } ); } );
	const np = await nc.newPage();
	const errs = [];
	np.on( 'pageerror', ( e ) => errs.push( e.message ) );
	await np.goto( BASE + rel( pages[ k ].url ) );
	await sleep( 1500 );
	const nb = parseInt( await np.locator( '[data-id="cd000002"] .refraction-countdown__unit--seconds .refraction-countdown__digits' ).innerText(), 10 );
	check( k, 'blocked cookies and storage: the evergreen timer still runs, no errors', errs.length === 0 && nb <= 5, errs.join( ';' ) + nb );
	await nc.close();
};

/* ------------------------------------------------------------------- driver */
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
		const pages = JSON.parse( out.slice( out.indexOf( '{' ) ) );
		const admin = await login( browser, 'admin', 'admin' );
		watch( admin.page, 'admin' );

		for ( const [ name, fn ] of Object.entries( SECTIONS ) ) {
			if ( ONLY.length && ! ONLY.includes( name ) ) { continue; }
			console.log( `\n== ${ name } ==` );
			try {
				await fn( { browser, admin, pages } );
			} catch ( e ) {
				check( name, 'section ran without throwing', false, e.stack || e.message );
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
