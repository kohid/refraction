#!/usr/bin/env node
/**
 * End-to-end check of the Refraction updater against a fake GitHub (no internet needed).
 *
 * Usage: node scripts/check-updater.mjs [--site /tmp/refraction-site] [--port 8766] [--fake-port 8767]
 *                                       [--zip dist/refraction.zip] [--new-version 9.9.9] [--no-setup]
 *
 * 1. Reinstalls the plugin from --zip into the SQLite test site (scripts/setup-menu-test-site.sh).
 * 2. Builds a "release" zip: a copy of --zip with the version bumped to --new-version.
 * 3. Starts scripts/fixtures/fake-github.php (php -S) and a mu-plugin that points the updater at it
 *    (REFRACTION_UPDATE_API_BASE), blocks every other outbound host and can set REFRACTION_DISABLE_UPDATE_CHECK.
 * 4. In Chromium: disabled, network failure, rate limit, no release, no asset, up to date, update available
 *    (View details thickbox, Update now, plugin stays active at the new version), then runs
 *    scripts/check-admin-menu.mjs. The site is left at the new version (rerun to reinstall).
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
const ROOT = resolve( HERE, '..' );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( name, fallback ) => {
	const i = process.argv.indexOf( `--${ name }` );
	return i >= 0 ? process.argv[ i + 1 ] : fallback;
};
const SITE = arg( 'site', '/tmp/refraction-site' );
const PORT = arg( 'port', '8766' );
const FAKE_PORT = arg( 'fake-port', '8767' );
const ZIP = resolve( arg( 'zip', join( ROOT, 'dist/refraction.zip' ) ) );
const NEW_VERSION = arg( 'new-version', '9.9.9' );
const SETUP = ! process.argv.includes( '--no-setup' );
const SHOTS = arg( 'shots', '/tmp/refraction-shots' );
const WP_DIR = join( SITE, 'wordpress' );
const DL = process.env.DL_DIR || '/tmp/rsite-dl';
const GH = '/tmp/refraction-updater-test';
const BASE = `http://127.0.0.1:${ PORT }`;
const PLUGIN = 'refraction/refraction.php';

const failures = [];
const ok = ( msg ) => console.log( `ok    ${ msg }` );
const fail = ( msg ) => { failures.push( msg ); console.error( `FAIL  ${ msg }` ); };
const check = ( cond, msg, detail = '' ) => ( cond ? ok( msg ) : fail( `${ msg }${ detail ? ` -- ${ detail }` : '' }` ) );

const wp = ( ...args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', join( DL, 'wpcli.phar' ), `--path=${ WP_DIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();
const wpEval = ( code ) => wp( 'eval', code );
const setState = ( state ) => writeFileSync( join( GH, 'state.json' ), JSON.stringify( state ) );
const requestCount = () => ( existsSync( join( GH, 'requests.log' ) ) ? readFileSync( join( GH, 'requests.log' ), 'utf8' ).split( '\n' ).filter( Boolean ).length : 0 );
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

async function serverUp( port, path ) {
	try { await fetch( `http://127.0.0.1:${ port }${ path }` ); return true; } catch { return false; }
}

async function startServer( cmdArgs, port, path, env = {} ) {
	if ( await serverUp( port, path ) ) { return null; }
	const child = spawn( 'php', cmdArgs, { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4', ...env } } );
	for ( let i = 0; i < 50 && ! ( await serverUp( port, path ) ); i++ ) { await sleep( 200 ); }
	return child;
}

/** A copy of the plugin zip whose version is NEW_VERSION (header and REFRACTION_VERSION). */
function buildReleaseZip() {
	const tmp = join( GH, 'pkg' );
	rmSync( tmp, { recursive: true, force: true } );
	mkdirSync( tmp, { recursive: true } );
	execFileSync( 'unzip', [ '-q', ZIP, '-d', tmp ] );
	const file = join( tmp, 'refraction/refraction.php' );
	let src = readFileSync( file, 'utf8' );
	const current = src.match( /^\s*\*\s*Version:\s*(\S+)\s*$/m )[ 1 ];
	src = src.replace( /^(\s*\*\s*Version:\s*)\S+/m, `$1${ NEW_VERSION }` ).replace( /(define\(\s*'REFRACTION_VERSION',\s*')[^']+/, `$1${ NEW_VERSION }` );
	writeFileSync( file, src );
	rmSync( join( GH, 'refraction.zip' ), { force: true } );
	execFileSync( 'zip', [ '-qr', join( GH, 'refraction.zip' ), 'refraction' ], { cwd: tmp } );
	return current;
}

function installMuPlugin() {
	mkdirSync( join( WP_DIR, 'wp-content/mu-plugins' ), { recursive: true } );
	writeFileSync( join( WP_DIR, 'wp-content/mu-plugins/refraction-updater-test.php' ), `<?php
// Written by scripts/check-updater.mjs. Test site only.
$state = json_decode( (string) @file_get_contents( '${ GH }/state.json' ), true ) ?: [];
define( 'WP_HTTP_BLOCK_EXTERNAL', true );
define( 'WP_ACCESSIBLE_HOSTS', '127.0.0.1' );
define( 'REFRACTION_UPDATE_API_BASE', $state['api_base'] ?? 'http://127.0.0.1:${ FAKE_PORT }' );
if ( ! empty( $state['disable'] ) ) { define( 'REFRACTION_DISABLE_UPDATE_CHECK', true ); }
add_filter( 'http_request_host_is_external', function ( $external, $host ) { return '127.0.0.1' === $host ? true : $external; }, 10, 2 );
add_filter( 'http_allowed_safe_ports', function ( $ports ) { $ports[] = ${ FAKE_PORT }; return $ports; } );
` );
}

const resetCaches = () => wpEval( 'delete_site_transient("refraction_update_release"); delete_site_transient("update_plugins"); global $wpdb; $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE \'%refraction_update_notice%\'");' );

async function rowOf( page ) {
	await page.goto( `${ BASE }/wp-admin/plugins.php` );
	return page.locator( `tr[data-plugin="${ PLUGIN }"]` ).first();
}

/** Clicks "Check for updates" on the Refraction row; returns the notice text (or null) after the redirect. */
async function clickCheck( page, label ) {
	const row = await rowOf( page );
	const link = row.locator( '.row-actions a', { hasText: 'Check for updates' } );
	if ( ! ( await link.count() ) ) { fail( `${ label }: no "Check for updates" link on the Refraction row` ); return null; }
	ok( `${ label }: "Check for updates" link is on the Refraction row` );
	await Promise.all( [ page.waitForURL( /plugins\.php/ ), link.click() ] );
	const notice = page.locator( '#refraction-update-notice' );
	if ( ! ( await notice.count() ) ) { fail( `${ label }: no #refraction-update-notice after the check` ); return null; }
	const text = ( await notice.first().innerText() ).replace( /\s+/g, ' ' ).trim();
	console.log( `      notice: ${ text }` );
	return { text, cls: await notice.first().getAttribute( 'class' ) };
}

async function scenario( page, name, state, fn ) {
	console.log( `\n== ${ name } ==` );
	setState( state );
	resetCaches();
	try { await fn(); } catch ( e ) { fail( `${ name }: ${ e.message.split( '\n' )[ 0 ] }` ); await page.screenshot( { path: join( SHOTS, `updater-${ name.replace( /\W+/g, '-' ) }-error.png` ) } ).catch( () => {} ); }
}

async function main() {
	mkdirSync( SHOTS, { recursive: true } );
	rmSync( GH, { recursive: true, force: true } );
	mkdirSync( GH, { recursive: true } );
	if ( SETUP ) {
		console.log( `[setup] reinstalling ${ ZIP } into ${ SITE }` );
		execFileSync( 'bash', [ join( HERE, 'setup-menu-test-site.sh' ), SITE, ZIP ], { stdio: 'inherit', env: { ...process.env, PORT } } );
	}
	const installed = buildReleaseZip();
	console.log( `[setup] installed version ${ installed }, fake release ${ NEW_VERSION }` );
	setState( { scenario: 'ok', version: NEW_VERSION } );
	installMuPlugin();
	rmSync( join( SITE, 'php-error.log' ), { force: true } );

	const fake = await startServer( [ '-S', `127.0.0.1:${ FAKE_PORT }`, join( HERE, 'fixtures/fake-github.php' ) ], FAKE_PORT, '/', { FAKE_GH_DIR: GH } );
	const site = await startServer( [ '-S', `127.0.0.1:${ PORT }`, '-t', WP_DIR ], PORT, '/wp-login.php' );
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );

	try {
		const page = await ( await browser.newContext( { viewport: { width: 1400, height: 1000 } } ) ).newPage();
		page.on( 'dialog', ( d ) => d.accept() );
		await page.goto( `${ BASE }/wp-login.php` );
		await page.fill( '#user_login', 'admin' );
		await page.fill( '#user_pass', 'admin' );
		await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );

		await scenario( page, 'disabled', { scenario: 'ok', version: NEW_VERSION, disable: true }, async () => {
			const before = requestCount();
			const row = await rowOf( page );
			check( ( await row.locator( '.row-actions a', { hasText: 'Check for updates' } ).count() ) === 0, 'REFRACTION_DISABLE_UPDATE_CHECK hides the link' );
			check( ( await row.locator( '.plugin-update' ).count() ) === 0, 'no update notice when disabled' );
			check( requestCount() === before, 'no request reached GitHub while disabled', `${ requestCount() - before } requests` );
			check( wpEval( 'echo class_exists("Refraction\\\\Updater") && Refraction\\Updater::init() === null ? "null" : "active";' ) === 'null', 'Updater::init() returns null when disabled' );
		} );

		await scenario( page, 'network failure', { scenario: 'ok', version: NEW_VERSION, api_base: 'http://127.0.0.1:1' }, async () => {
			const n = await clickCheck( page, 'network failure' );
			check( n && /could not reach GitHub/i.test( n.text ) && n.cls.includes( 'notice-error' ), 'network failure shows an error notice', n?.text );
		} );

		await scenario( page, 'rate limited', { scenario: 'ratelimit', version: NEW_VERSION }, async () => {
			const n = await clickCheck( page, 'rate limit' );
			check( n && /rate limit/i.test( n.text ) && n.cls.includes( 'notice-error' ), 'HTTP 403 rate limit shows a clear error notice', n?.text );
			setState( { scenario: 'ok', version: NEW_VERSION } );
			const before = requestCount();
			const code = wpEval( '$r = Refraction\\Updater::init()->get_release(); echo is_wp_error($r) ? $r->get_error_code() : "release";' );
			check( code === 'refraction_rate_limited' && requestCount() === before, 'rate limit is negatively cached (no new request on a normal lookup)', `${ code }, ${ requestCount() - before } new requests` );
		} );

		await scenario( page, 'no release', { scenario: 'norelease', version: NEW_VERSION }, async () => {
			const n = await clickCheck( page, 'no release' );
			check( n && /no (published )?release/i.test( n.text ) && n.cls.includes( 'notice-error' ), 'HTTP 404 says no release is published', n?.text );
		} );

		await scenario( page, 'no asset', { scenario: 'noasset', version: NEW_VERSION }, async () => {
			const n = await clickCheck( page, 'no asset' );
			check( n && /refraction\.zip/.test( n.text ) && /no|missing|does not/i.test( n.text ) && n.cls.includes( 'notice-error' ), 'release without refraction.zip is reported', n?.text );
		} );

		await scenario( page, 'up to date', { scenario: 'ok', version: installed }, async () => {
			const n = await clickCheck( page, 'up to date' );
			check( n && new RegExp( `Refraction is up to date \\(${ installed.replace( /\./g, '\\.' ) }\\)` ).test( n.text ) && n.cls.includes( 'notice-success' ), 'up to date notice names the version', n?.text );
			const row = await rowOf( page );
			check( ( await row.locator( '.plugin-update' ).count() ) === 0 && ( await page.locator( `tr.plugin-update-tr[data-plugin="${ PLUGIN }"]` ).count() ) === 0, 'no update notice when current' );
			check( ( await row.locator( '.row-actions', { hasText: 'View details' } ).count() ) + ( await row.locator( 'a.open-plugin-details-modal' ).count() ) > 0, '"View details" is shown while up to date' );
			check( ( await row.locator( '.column-auto-updates' ).innerText() ).includes( 'Enable auto-updates' ), '"Enable auto-updates" toggle is shown while up to date' );
		} );

		await scenario( page, 'update available', { scenario: 'ok', version: NEW_VERSION }, async () => {
			const n = await clickCheck( page, 'update available' );
			check( n && new RegExp( `Version ${ NEW_VERSION.replace( /\./g, '\\.' ) } is available` ).test( n.text ) && /update now/i.test( n.text ), 'notice says the new version is available with an update link', n?.text );
			const upd = page.locator( `tr.plugin-update-tr[data-plugin="${ PLUGIN }"]` );
			check( /There is a new version of Refraction available/.test( await upd.innerText() ), 'core shows "There is a new version of Refraction available"' );
			await page.screenshot( { path: join( SHOTS, 'updater-update-available.png' ), fullPage: true } );

			await upd.locator( 'a.open-plugin-details-modal' ).first().click();
			const frame = page.frameLocator( '#TB_iframeContent' );
			await frame.locator( 'body' ).getByText( 'Fake release notes for the updater test' ).first().waitFor( { timeout: 20000 } );
			ok( 'View details thickbox shows the GitHub release notes' );
			const body = await frame.locator( 'body' ).innerHTML();
			check( ! /<script>alert/.test( body ), 'release notes are escaped (no raw <script>)' );
			await page.screenshot( { path: join( SHOTS, 'updater-view-details.png' ) } );
			await page.goto( `${ BASE }/wp-admin/plugins.php` );

			await page.locator( `tr.plugin-update-tr[data-plugin="${ PLUGIN }"] a.update-link` ).click();
			await page.locator( `tr[data-plugin="${ PLUGIN }"].updated, tr[data-plugin="${ PLUGIN }"] .updated-message` ).first().waitFor( { timeout: 120000 } ).catch( () => {} );
			for ( let i = 0; i < 60 && wp( 'plugin', 'get', 'refraction', '--field=version' ) !== NEW_VERSION; i++ ) { await sleep( 1000 ); }
			await page.screenshot( { path: join( SHOTS, 'updater-after-update.png' ), fullPage: true } );
			check( wp( 'plugin', 'get', 'refraction', '--field=version' ) === NEW_VERSION, `Update now installs ${ NEW_VERSION } in place`, wp( 'plugin', 'get', 'refraction', '--field=version' ) );
			check( wp( 'plugin', 'get', 'refraction', '--field=status' ) === 'active', 'plugin is still active after the update' );
			const dirs = readdirSync( join( WP_DIR, 'wp-content/plugins' ) ).filter( ( d ) => /refraction/i.test( d ) );
			check( dirs.join() === 'refraction', 'no stray plugin folder (only refraction/)', dirs.join() );
		} );

		const log = join( SITE, 'php-error.log' );
		const phpLog = existsSync( log ) ? readFileSync( log, 'utf8' ).split( '\n' ).filter( ( l ) => /wp-content\/plugins\/refraction\//.test( l ) && /PHP (Fatal|Warning|Notice|Deprecated|Parse)/.test( l ) ) : [];
		check( phpLog.length === 0, 'no PHP warnings/notices from the plugin in debug.log', phpLog.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		fake?.kill();
		site?.kill();
	}

	console.log( '\n== admin menu check after the update ==' );
	const menu = spawnSync( 'node', [ join( HERE, 'check-admin-menu.mjs' ), '--site', SITE, '--port', PORT ], { stdio: 'inherit' } );
	check( menu.status === 0, 'scripts/check-admin-menu.mjs still passes after the update' );

	console.log( failures.length ? `\n${ failures.length } check(s) FAILED` : '\nall updater checks passed' );
	process.exit( failures.length ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
