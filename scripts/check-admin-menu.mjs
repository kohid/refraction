#!/usr/bin/env node
/**
 * Admin menu regression check. Fails when the "Refraction" top-level menu is missing or hidden,
 * or when one of its submenu pages is not reachable.
 *
 * Usage: node scripts/check-admin-menu.mjs [--site /tmp/refraction-site] [--port 8766]
 *                                          [--shots /tmp/refraction-shots] [--role admin|editor|all]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip).
 * It starts `php -S` when nothing listens on the port, drops a mu-plugin that dumps the global
 * $menu/$submenu (admin_menu priority 100000) to <site>/menu-dump-<user>.json, then for each role:
 *   1. logs in with Chromium (Playwright, executable found under /opt/pw-browsers or $CHROMIUM),
 *   2. asserts $menu has a "Refraction" top-level entry (data check),
 *   3. asserts the sidebar <li> is visible (computed style + box, DOM check),
 *   4. visits every submenu link: HTTP 200, no PHP error text, no console errors, no new debug.log lines.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( name, fallback ) => {
	const i = process.argv.indexOf( `--${ name }` );
	return i >= 0 ? process.argv[ i + 1 ] : fallback;
};
const SITE = arg( 'site', '/tmp/refraction-site' );
const PORT = arg( 'port', '8766' );
const SHOTS = arg( 'shots', '/tmp/refraction-shots' );
const ROLES = arg( 'role', 'all' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WP = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

const USERS = {
	admin: { login: 'admin', pass: 'admin', expect: [ 'Home', 'Settings', 'Tools', 'Saved Templates', 'Floating Elements', 'Role Manager', 'System Info' ] },
	editor: { login: 'editor', pass: 'editor', expect: [ 'Home', 'Saved Templates' ], forbid: [ 'Settings', 'Tools', 'System Info' ] },
};

const failures = [];
const fail = ( msg ) => { failures.push( msg ); console.error( `FAIL  ${ msg }` ); };
const ok = ( msg ) => console.log( `ok    ${ msg }` );

function findChromium() {
	if ( process.env.CHROMIUM ) { return process.env.CHROMIUM; }
	const root = '/opt/pw-browsers';
	if ( ! existsSync( root ) ) { return undefined; }
	const dirs = readdirSync( root ).filter( ( d ) => /^chromium-\d+$/.test( d ) ).sort().reverse();
	for ( const d of dirs ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			const p = join( root, d, sub );
			if ( existsSync( p ) ) { return p; }
		}
	}
	return undefined;
}

async function up() {
	try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; }
}

async function main() {
	if ( ! existsSync( join( WP, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WP }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );
	mkdirSync( join( WP, 'wp-content/mu-plugins' ), { recursive: true } );
	writeFileSync( join( WP, 'wp-content/mu-plugins/menu-dump.php' ), `<?php
add_action( 'admin_menu', function () {
	global $menu, $submenu;
	$u = wp_get_current_user();
	file_put_contents( '${ SITE }/menu-dump-' . $u->user_login . '.json', wp_json_encode( [ 'menu' => $menu, 'submenu' => $submenu ], JSON_PRETTY_PRINT ) );
}, 100000 );
` );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WP ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await new Promise( ( r ) => setTimeout( r, 200 ) ); }
	}
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	try {
		for ( const role of Object.keys( USERS ) ) {
			if ( ROLES !== 'all' && ROLES !== role ) { continue; }
			await checkRole( browser, role, USERS[ role ] );
		}
	} finally {
		await browser.close();
		server?.kill();
	}
}

const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const PHP_ERR = /(Fatal error|Parse error|Warning|Notice|Deprecated)<\/b>:|(Fatal error|Warning|Notice|Deprecated): .* in \/|There has been a critical error/;

async function checkRole( browser, role, user ) {
	console.log( `\n== ${ role } ==` );
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
	const page = await ctx.newPage();
	const consoleErrors = [];
	page.on( 'console', ( m ) => { if ( m.type() === 'error' ) { consoleErrors.push( `${ m.text() } @ ${ page.url() }` ); } } );
	page.on( 'pageerror', ( e ) => consoleErrors.push( `pageerror ${ e.message } @ ${ page.url() }` ) );

	const dumpFile = join( SITE, `menu-dump-${ user.login }.json` );
	rmSync( dumpFile, { force: true } );
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user.login );
	await page.fill( '#user_pass', user.pass );
	await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );
	await page.goto( `${ BASE }/wp-admin/index.php` );

	// 1. data check
	const dump = existsSync( dumpFile ) ? JSON.parse( readFileSync( dumpFile, 'utf8' ) ) : null;
	const topEntries = dump ? Object.values( dump.menu ).filter( ( m ) => String( m[ 0 ] ).replace( /<[^>]*>/g, '' ).trim() === 'Refraction' ) : [];
	if ( ! topEntries.length ) { fail( `[${ role }] no top-level "Refraction" entry in global $menu` ); } else {
		ok( `[${ role }] $menu has top-level "Refraction" (slug ${ topEntries[ 0 ][ 2 ] }, cap ${ topEntries[ 0 ][ 1 ] })` );
		const subs = dump.submenu[ topEntries[ 0 ][ 2 ] ] || [];
		console.log( `      $submenu: ${ subs.map( ( s ) => s[ 0 ] ).join( ' | ' ) || '(none)' }` );
	}

	// 2. DOM visibility
	const li = await page.evaluate( () => {
		const items = [ ...document.querySelectorAll( '#adminmenu > li.menu-top' ) ].filter( ( e ) => e.querySelector( ':scope > a .wp-menu-name' )?.textContent.trim().replace( /\s+\d+$/, '' ) === 'Refraction' );
		const e = items[ 0 ];
		if ( ! e ) { return null; }
		const cs = getComputedStyle( e );
		const r = e.getBoundingClientRect();
		const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
		const links = [ ...e.querySelectorAll( '.wp-submenu li:not(.wp-submenu-head) a' ) ].map( ( a ) => ( { text: a.textContent.trim(), href: a.href } ) );
		return { id: e.id, visible, display: cs.display, links, href: e.querySelector( ':scope > a' ).href };
	} );
	if ( ! li ) { fail( `[${ role }] no #adminmenu item labelled "Refraction" in the DOM` ); } else if ( ! li.visible ) {
		fail( `[${ role }] #${ li.id } exists but is not visible (display: ${ li.display })` );
	} else { ok( `[${ role }] sidebar item #${ li.id } is visible` ); }
	await page.screenshot( { path: join( SHOTS, `sidebar-${ role }.png` ), clip: { x: 0, y: 0, width: 400, height: 900 } } );

	// 3. reachability
	const targets = [];
	if ( li ) { targets.push( { text: 'Refraction (top)', href: li.href }, ...li.links ); }
	if ( li ) {
		for ( const want of user.expect ) {
			if ( ! li.links.some( ( l ) => l.text === want ) ) { fail( `[${ role }] expected submenu "${ want }" missing; have: ${ li.links.map( ( l ) => l.text ).join( ', ' ) }` ); }
		}
	}
	for ( const bad of user.forbid || [] ) {
		if ( li?.links.some( ( l ) => l.text === bad ) ) { fail( `[${ role }] submenu "${ bad }" must not be listed for this role` ); }
	}
	for ( const t of targets ) {
		const before = logSize();
		consoleErrors.length = 0;
		const resp = await page.goto( t.href, { waitUntil: 'load' } );
		const html = await page.content();
		const title = ( await page.title() ) || '';
		const problems = [];
		if ( ! resp || resp.status() !== 200 ) { problems.push( `HTTP ${ resp?.status() }` ); }
		if ( PHP_ERR.test( html ) ) { problems.push( 'PHP error text in page' ); }
		if ( /not allowed to access this page|Sorry, you are not allowed/.test( html ) ) { problems.push( 'permission error page' ); }
		if ( await page.locator( 'body.error404, #error-page' ).count() ) { problems.push( 'WP error page' ); }
		const newLog = logTail( before ).trim();
		if ( newLog ) { problems.push( `debug.log: ${ newLog.split( '\n' )[ 0 ].slice( 0, 160 ) }` ); }
		if ( consoleErrors.length ) { problems.push( `console: ${ consoleErrors[ 0 ].slice( 0, 160 ) }` ); }
		const slug = t.text.replace( /\W+/g, '-' ).toLowerCase();
		await page.screenshot( { path: join( SHOTS, `${ role }-${ slug }.png` ) } );
		if ( problems.length ) { fail( `[${ role }] ${ t.text } ${ t.href}: ${ problems.join( '; ' ) }` ); } else { ok( `[${ role }] ${ t.text } -> 200 (${ title.slice( 0, 40 ) })` ); }
	}
	await ctx.close();
}

main().then( () => {
	console.log( failures.length ? `\n${ failures.length } failure(s)` : '\nall admin menu checks passed' );
	process.exit( failures.length ? 1 : 0 );
} ).catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
