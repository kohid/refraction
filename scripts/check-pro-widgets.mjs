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
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );
	return { ctx, page };
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
	await admin.page.evaluate( () => $e.run( 'panel/elements/open' ) ).catch( () => {} );
	await admin.page.evaluate( () => $e.route( 'panel/elements/categories' ) );
	await admin.page.waitForSelector( '#refraction-panel-elements-search-input', { timeout: 15000 } );
	await admin.page.fill( '#refraction-panel-elements-search-input', title );
	await sleep( 500 );
	const found = await admin.page.locator( '#refraction-panel-elements-search-area .refraction-element' ).allInnerTexts();
	check( key, 'found by name in the panel search', found.some( ( t ) => t.trim() === title ), found.join( '|' ) );
	await admin.page.fill( '#refraction-panel-elements-search-input', '' );
	await sleep( 300 );

	// Category list
	const catOk = await admin.page.evaluate( ( wt ) => {
		const cats = document.querySelectorAll( '#refraction-panel-elements-categories .refraction-panel-category' );
		for ( const c of cats ) {
			if ( c.querySelector( '.refraction-panel-category-title' )?.textContent.trim() === 'Advanced' ) {
				return [ ...c.querySelectorAll( '.refraction-element' ) ].some( ( e ) => e.textContent.trim().length > 0 ) && !! c.querySelector( `[data-widget-type="${ wt }"], .refraction-element` );
			}
		}
		return false;
	}, widgetType );
	check( key, 'the panel has an Advanced category', catOk );

	// Create into a container through the editor command API and see it rendered in the preview.
	const created = await admin.page.evaluate( async ( wt ) => {
		const container = refraction.documents.getCurrent().container.children[ 0 ];
		const el = $e.run( 'document/elements/create', { container, model: { elType: 'widget', widgetType: wt } } );
		return { id: el.id, count: container.children.length };
	}, widgetType );
	await sleep( 2500 );
	const rendered = await frameOf( admin ).evaluate( ( id ) => !! document.querySelector( `[data-id="${ id }"] *` ), created.id );
	check( key, 'a new instance dropped into a container renders in the preview', rendered, JSON.stringify( created ) );
	await admin.page.evaluate( ( id ) => $e.run( 'document/elements/delete', { container: refraction.getContainer( id ) } ), created.id );
	return created;
}

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
	let v = await visitor( browser, new URL( pages[ k ].url ).pathname, 1280 );
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
	check( k, 'vertical layout stacks items', new Set( ys ).size === ys.length && ys.length >= 4, ys.join( ',' ) );
	check( k, 'dropdown layout shows the hamburger even on desktop', await p.locator( '[data-id="nav0003"] .refraction-nav-menu__toggle' ).isVisible() && ( await p.locator( '[data-id="nav0003"] .refraction-nav-menu__toggle-label' ).innerText() ) === 'Menu' );
	check( k, 'empty menu renders nothing for visitors', ( await p.locator( '[data-id="nav0004"] .refraction-nav-menu' ).count() ) === 0 );
	await v.ctx.close();

	// ---- mobile front end
	v = await visitor( browser, new URL( pages[ k ].url ).pathname, 390, 800 );
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
