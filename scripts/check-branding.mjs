#!/usr/bin/env node
/**
 * Visible-branding scan (browser). Fails when the old upstream product name shows up where a user (or a developer
 * reading the DOM) can see it.
 *
 * Usage: node scripts/check-branding.mjs [--site /tmp/refraction-site] [--port 8766] [--shots /tmp/refraction-shots]
 *                                        [--wpcli /tmp/rsite-dl/wpcli.phar] [--out branding-results.json]
 * Prepare the site with scripts/setup-menu-test-site.sh and serve it on --port.
 *
 * What it scans on the main wp-admin pages, the Plugins row, the dashboard widget, the editor (loading screen, panel,
 * hamburger menu, template library, settings) and a front-end page:
 *   - rendered text (innerText) and the text of hidden nodes and inline template scripts,
 *   - the attributes aria-label, title, alt, placeholder, value, href, src, data-tooltip,
 *   - every network request the page makes (no request may leave for the upstream vendor),
 *   - string values inside the editor's config objects (inline data).
 * The match is case-insensitive "element[o]r" (the old product name). ALLOW lists the attribution that has to stay.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/refraction-site' );
const PORT = arg( 'port', '8766' );
const SHOTS = arg( 'shots', '/tmp/refraction-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const OUT = arg( 'out', join( SHOTS, 'branding-results.json' ) );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
mkdirSync( SHOTS, { recursive: true } );

// Attribution that is required by the licence and stays on purpose (plugin author line on the Plugins screen).
const ALLOW = [ /based on Elementor by Elementor\.com/i, /Elementor Ltd/i ];
const RE = /element[o]r/i; // written element[o]r so scripts/rename-to-refraction.mjs can never rewrite it

const wp = ( ...a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...a ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();

function chromePath() {
	if ( process.env.CHROMIUM ) { return process.env.CHROMIUM; }
	const root = '/opt/pw-browsers';
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const s of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, s ) ) ) { return join( root, d, s ); }
		}
	}
	return undefined;
}

const findings = [];
const requests = new Set();
let pagesScanned = 0;

async function scan( page, label ) {
	pagesScanned++;
	const hits = await page.evaluate( () => {
		const out = [];
		const add = ( kind, text ) => { if ( /element[o]r/i.test( text ) ) { out.push( [ kind, text.replace( /\s+/g, ' ' ).trim().slice( 0, 400000 ) ] ); } };
		add( 'title', document.title );
		if ( document.body ) { add( 'innerText', document.body.innerText ); }
		const walker = document.createTreeWalker( document.documentElement, NodeFilter.SHOW_ELEMENT );
		for ( let n = walker.currentNode; n; n = walker.nextNode() ) {
			const tag = n.tagName;
			if ( tag === 'STYLE' || ( tag === 'SCRIPT' && n.type !== 'text/template' && n.type !== 'text/html' ) ) { continue; }
			if ( tag === 'SCRIPT' || tag === 'TEMPLATE' ) { add( 'template', n.textContent || '' ); }
			else if ( n.children.length === 0 && n.textContent ) { add( 'text', n.textContent ); }
			for ( const a of [ 'aria-label', 'title', 'alt', 'placeholder', 'value', 'href', 'src', 'data-tooltip', 'data-title', 'data-tip' ] ) {
				const v = n.getAttribute && n.getAttribute( a );
				if ( v ) { add( `@${ a }`, v ); }
			}
		}
		return out;
	} );
	for ( const [ kind, text ] of hits ) {
		// innerText is the whole page text, so report only the matching sentence-sized windows.
		if ( kind === 'innerText' || kind === 'template' || kind === 'text' ) {
			const all = text.match( /.{0,70}element[o]r.{0,70}/gi ) || [ text.slice( 0, 200 ) ];
			for ( const w of all ) { findings.push( { label, kind, text: w } ); }
		} else {
			findings.push( { label, kind, text } );
		}
	}
}

async function scanConfig( page, label ) {
	const hits = await page.evaluate( () => {
		const out = [];
		const seen = new WeakSet();
		const walk = ( v, path, depth ) => {
			if ( depth > 7 || v === null ) { return; }
			if ( typeof v === 'string' ) { if ( /element[o]r/i.test( v ) ) { out.push( `${ path } = ${ v.slice( 0, 160 ) }` ); } return; }
			if ( typeof v !== 'object' || seen.has( v ) ) { return; }
			seen.add( v );
			let keys = [];
			try { keys = Object.keys( v ); } catch { return; }
			if ( keys.length > 3000 ) { return; }
			for ( const k of keys ) { try { walk( v[ k ], `${ path }.${ k }`, depth + 1 ); } catch { /* getter */ } }
		};
		for ( const k of [ 'refractionCommon', 'refractionCommonConfig', 'refractionConfig', 'refractionAppConfig' ] ) {
			if ( window[ k ] ) { walk( window[ k ], k, 0 ); }
		}
		if ( window.refraction && window.refraction.config ) { walk( window.refraction.config, 'refraction.config', 0 ); }
		return out;
	} );
	for ( const h of hits ) { findings.push( { label, kind: 'config', text: h.slice( 0, 240 ) } ); }
}

const allowed = ( f ) => ALLOW.some( ( r ) => r.test( f.text ) );

async function main() {
	const browser = await chromium.launch( { executablePath: chromePath(), args: [ '--no-sandbox' ] } );
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
	const page = await ctx.newPage();
	page.on( 'request', ( r ) => { if ( RE.test( r.url() ) ) { requests.add( r.url() ); } } );
	// Anything that is not our own site would be an external call: record those too (informational).
	const external = new Set();
	page.on( 'request', ( r ) => { const u = new URL( r.url() ); if ( u.hostname !== '127.0.0.1' && ! /^(data|blob):/.test( r.url() ) ) { external.add( u.origin ); } } );

	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'admin' );
	await Promise.all( [ page.waitForURL( /wp-admin/, { waitUntil: 'commit' } ), page.click( '#wp-submit' ) ] );

	// --- admin pages
	const adminPages = [ [ 'dashboard', 'index.php' ], [ 'plugins', 'plugins.php' ], [ 'saved-templates', 'edit.php?post_type=refraction_library' ], [ 'pages', 'edit.php?post_type=page' ], [ 'general-settings', 'options-general.php' ] ];
	await page.goto( `${ BASE }/wp-admin/index.php` );
	const menu = await page.evaluate( () => [ ...document.querySelectorAll( '#adminmenu a[href*="refraction"], #adminmenu a[href*="post_type=refraction"], #adminmenu a[href*="e-floating"]' ) ].map( ( a ) => a.getAttribute( 'href' ) ) );
	for ( const href of new Set( menu ) ) { adminPages.push( [ `menu:${ href }`, href ] ); }
	for ( const [ label, href ] of adminPages ) {
		await page.goto( /^https?:/.test( href ) ? href : `${ BASE }/wp-admin/${ href.replace( /^\/?(wp-admin\/)?/, '' ) }`, { waitUntil: 'load' } ).catch( () => {} );
		await page.waitForTimeout( 500 );
		await scan( page, label );
		const tabs = await page.evaluate( () => [ ...document.querySelectorAll( '#refraction-settings-tabs-wrapper a[id]' ) ].map( ( a ) => a.id ) );
		for ( const id of tabs ) {
			await page.click( `#${ id }` ).catch( () => {} );
			await page.waitForTimeout( 200 );
			await scan( page, `${ label }#${ id }` );
		}
	}

	// shots of the key admin screens
	const shot = async ( url, name ) => { await page.goto( `${ BASE }${ url }`, { waitUntil: 'load' } ); await page.waitForTimeout( 700 ); await page.screenshot( { path: join( SHOTS, `${ name }.png` ) } ); };
	await shot( '/wp-admin/index.php', 'dashboard-widget' );
	await shot( '/wp-admin/plugins.php', 'plugins-row' );
	await shot( '/wp-admin/admin.php?page=refraction', 'refraction-home' );
	await shot( '/wp-admin/admin.php?page=refraction-settings', 'settings' );
	await shot( '/wp-admin/admin.php?page=refraction-tools', 'tools' );
	await page.goto( `${ BASE }/wp-admin/index.php` );
	await page.screenshot( { path: join( SHOTS, 'admin-sidebar.png' ), clip: { x: 0, y: 0, width: 360, height: 900 } } );

	// --- editor
	const id = wp( 'post', 'create', '--post_type=page', '--post_title=Branding Page', '--post_status=publish', '--porcelain' );
	const loading = ctx.newPage ? await ctx.newPage() : page;
	loading.on( 'request', ( r ) => { if ( RE.test( r.url() ) ) { requests.add( r.url() ); } } );
	await loading.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction`, { waitUntil: 'commit' } );
	await loading.waitForSelector( '#refraction-editor-wrapper, #refraction-loading, body', { timeout: 20000 } ).catch( () => {} );
	await loading.waitForTimeout( 250 );
	await loading.screenshot( { path: join( SHOTS, 'editor-loading.png' ) } );
	await scan( loading, 'editor-loading' );
	await loading.waitForFunction( () => window.refraction?.documents?.getCurrent?.() && document.querySelector( '#refraction-panel' ), null, { timeout: 90000 } );
	await loading.waitForTimeout( 2500 );
	await loading.screenshot( { path: join( SHOTS, 'editor-panel.png' ) } );
	await scan( loading, 'editor-panel' );
	await scanConfig( loading, 'editor-config' );

	const tryClick = async ( sel, name, wait = 900 ) => {
		const el = loading.locator( sel ).first();
		if ( ! ( await el.count() ) ) { findings.push( { label: name, kind: 'missing-control', text: sel, soft: true } ); return false; }
		await el.click( { timeout: 4000 } ).catch( () => {} );
		await loading.waitForTimeout( wait );
		await scan( loading, name );
		return true;
	};
	// hamburger / main menu, then close
	await tryClick( 'button[value="selected"], #refraction-panel-header-menu-button', 'editor-main-menu' );
	await loading.screenshot( { path: join( SHOTS, 'editor-main-menu.png' ) } );
	await loading.keyboard.press( 'Escape' );
	await tryClick( '#refraction-panel-header-menu-button', 'editor-main-menu-close', 300 );
	// widgets search + element wrapper tooltips
	await tryClick( '#refraction-panel-header-add-button, #refraction-panel-header-kit-button', 'editor-header', 300 );
	// template library via the add-template button in the canvas
	await loading.evaluate( () => { try { $e.run( 'library/open', { toDefault: true } ); } catch ( e ) { /* ignore */ } } );
	await loading.waitForTimeout( 3000 );
	await loading.screenshot( { path: join( SHOTS, 'template-library.png' ) } );
	await scan( loading, 'template-library' );
	await loading.evaluate( () => { try { $e.run( 'library/close' ); } catch ( e ) { /* ignore */ } } );
	await loading.waitForTimeout( 500 );
	// panel pages: site settings, page settings, finder, shortcuts, history, navigator
	for ( const [ name, run ] of [
		[ 'editor-page-settings', "$e.run('panel/page-settings/settings')" ],
		[ 'editor-site-settings', "$e.route('panel/global/menu')" ],
		[ 'editor-history', "$e.route('panel/history/actions')" ],
		[ 'editor-finder', "$e.run('finder/toggle')" ],
		[ 'editor-shortcuts', "$e.run('shortcuts/open')" ],
		[ 'editor-navigator', "$e.run('navigator/toggle')" ],
		[ 'editor-elements', "$e.route('panel/elements/categories')" ],
	] ) {
		await loading.evaluate( ( code ) => { try { ( 0, eval )( code ); } catch ( e ) { /* ignore */ } }, run );
		await loading.waitForTimeout( 1200 );
		await scan( loading, name );
		await loading.keyboard.press( 'Escape' ).catch( () => {} );
	}
	await loading.screenshot( { path: join( SHOTS, 'editor-after-panels.png' ) } );

	// --- front end
	await page.goto( `${ BASE }/?page_id=${ id }`, { waitUntil: 'load' } );
	await scan( page, 'frontend' );

	await browser.close();

	const hard = findings.filter( ( f ) => ! allowed( f ) && ! f.soft );
	const byKind = {};
	for ( const f of hard ) { ( byKind[ f.kind ] ||= [] ).push( f ); }
	const net = [ ...requests ];
	writeFileSync( OUT, JSON.stringify( { pagesScanned, hits: hard, allowed: findings.filter( allowed ), requests: net, external: [ ...external ] }, null, 2 ) );
	console.log( `scanned ${ pagesScanned } views; ${ hard.length } non-allowlisted hit(s); ${ findings.filter( allowed ).length } allowlisted; ${ net.length } request(s) to *element[o]r* hosts; external origins: ${ [ ...external ].join( ', ' ) || 'none' }` );
	for ( const [ k, list ] of Object.entries( byKind ) ) {
		console.log( `\n== ${ k } (${ list.length })` );
		const uniq = new Map();
		for ( const f of list ) { uniq.set( `${ f.text }`, f ); }
		for ( const f of [ ...uniq.values() ].slice( 0, 40 ) ) { console.log( `  [${ f.label }] ${ f.text }` ); }
	}
	for ( const u of net ) { console.log( `REQUEST ${ u }` ); }
	process.exit( hard.length || net.length ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
