#!/usr/bin/env node
/**
 * Theme Builder list (0.148.0), SQLite test site, Chromium:
 * - a new Error 404 template starts on "Entire site" and shows on a broken link (a new header does not: it waits);
 * - Refraction > Theme Builder: each template has "Display conditions" (Set where it appears / Edit conditions): the
 *   editor's picker in a dialog; "Show on entire site", a narrower choice and Save store the rules, the row shows
 *   them, and the site uses them at once; Cancel changes nothing;
 * - the editor's Display Conditions control (now the shared picker) still shows the rules saved from the list.
 *
 * Usage: node scripts/check-theme-builder-list.mjs [--site /tmp/rf-tbl-site] [--port 8961] [--shots /tmp/tb-list-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-tbl-site' );
const PORT = arg( 'port', '8961' );
const SHOTS = arg( 'shots', '/tmp/tb-list-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 600 ) }` }` );
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

const wp = ( args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();
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

/** A template made like the Add New dialog makes it: created, then saved with content only. */
const template = ( type, title, text ) => Number( wp( [ 'eval', `
	wp_set_current_user( 1 );
	$doc = \\Refraction\\Plugin::$instance->documents->create( '${ type }', [ 'post_title' => '${ title }', 'post_status' => 'publish' ] );
	$doc->save( [ 'elements' => [ [ 'id' => 'tbl' . substr( md5( '${ title }' ), 0, 4 ), 'elType' => 'container', 'settings' => [], 'elements' => [ [ 'id' => 'tbh' . substr( md5( '${ title }' ), 0, 4 ), 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => '${ text }' ], 'elements' => [] ] ] ] ], 'settings' => [ 'post_status' => 'publish' ] ] );
	echo $doc->get_main_id();
` ] ) );
const rules = ( id ) => JSON.parse( wp( [ 'eval', `echo wp_json_encode( ( new \\Refraction\\Modules\\ThemeBuilder\\Classes\\Conditions_Store() )->get_rules( ${ id } ) );` ] ) || '[]' );

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
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
		const about = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=About the glen', '--porcelain' ] );

		// ------------------------------------------------------------ a new 404 template is used at once
		const notFound = template( 'error-404', 'Lost page', 'Lost in the Highlands' );
		const header = template( 'header', 'Glen header', 'GLEN HEADER' );
		check( '404', 'a new Error 404 template starts on "Entire site"; a new header has no conditions', 'include/general' === rules( notFound ).join() && 0 === rules( header ).length, JSON.stringify( { notFound: rules( notFound ), header: rules( header ) } ) );

		const visitor = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
		visitor.on( 'pageerror', ( e ) => errors.push( 'site: ' + e.message ) );
		const broken = await visitor.goto( `${ BASE }/no-such-glen/` );
		check( '404', 'a broken link shows the Error 404 template (and still answers 404)', 404 === broken.status() && /Lost in the Highlands/.test( await visitor.content() ), broken.status() );
		await visitor.goto( `${ BASE }/?page_id=${ about }` );
		check( '404', 'the 404 template does not replace a real page, and the new header is not shown yet', ! /Lost in the Highlands|GLEN HEADER/.test( await visitor.content() ) );

		// ------------------------------------------------------------ the list
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
		const admin = await ctx.newPage();
		admin.on( 'pageerror', ( e ) => ! /Transition was (skipped|aborted because of invalid state)/.test( e.message ) && errors.push( 'admin: ' + e.message ) );
		await admin.goto( `${ BASE }/wp-login.php` );
		await admin.fill( '#user_login', 'admin' );
		await admin.fill( '#user_pass', 'admin' );
		await Promise.all( [ admin.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), admin.click( '#wp-submit' ) ] );

		await admin.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=error-404` );
		const row404 = await admin.locator( '.column-conditions' ).nth( 1 ).innerText();
		check( 'list', 'the 404 tab shows the template on "Entire site" with "Edit conditions"', /Entire site/.test( row404 ) && /Edit conditions/.test( row404 ) && ! /Not displayed/.test( row404 ), row404 );

		await admin.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=header` );
		const cell = admin.locator( 'tr', { hasText: 'Glen header' } ).locator( '.column-conditions' );
		check( 'list', 'a header without rules says "Not displayed anywhere" and offers "Set where it appears"', /Not displayed anywhere/.test( await cell.innerText() ) && 1 === await cell.locator( 'button.rtb-cond-edit.is-primary', { hasText: 'Set where it appears' } ).count() );
		await admin.screenshot( { path: join( SHOTS, 'list-header.png' ) } );

		// Cancel changes nothing.
		await cell.locator( 'button.rtb-cond-edit' ).click();
		await admin.waitForSelector( 'dialog.rtb-dialog[open] .rtb-cond' );
		check( 'dialog', 'it opens the conditions picker for that template, in a dialog', /Glen header/.test( await admin.locator( 'dialog.rtb-dialog' ).innerText() ) && 1 === await admin.locator( 'dialog.rtb-dialog .rtb-cond__notice' ).count() );
		await admin.locator( 'dialog.rtb-dialog .rtb-cond__quick' ).click();
		await admin.locator( 'dialog.rtb-dialog .rtb-dialog__foot button', { hasText: 'Cancel' } ).click();
		check( 'dialog', 'Cancel closes it and saves nothing', 0 === await admin.locator( 'dialog.rtb-dialog' ).count() && 0 === rules( header ).length );

		// Entire site, except the About page (a search for it), then Save.
		await cell.locator( 'button.rtb-cond-edit' ).click();
		await admin.waitForSelector( 'dialog.rtb-dialog[open] .rtb-cond' );
		await admin.locator( 'dialog.rtb-dialog .rtb-cond__quick' ).click();
		await admin.locator( 'dialog.rtb-dialog .rtb-cond__add' ).click();
		const second = admin.locator( 'dialog.rtb-dialog .rtb-cond__row' ).nth( 1 );
		check( 'dialog', 'the second row is an Exclude row, as in the editor', /is-exclude/.test( await second.getAttribute( 'class' ) ) );
		await second.locator( 'select' ).nth( 1 ).selectOption( 'page' );
		await second.locator( 'input[type=search]' ).fill( 'About' );
		await admin.waitForSelector( 'dialog.rtb-dialog .rtb-cond__results li button', { timeout: 10000 } );
		await second.locator( '.rtb-cond__results li button', { hasText: 'About the glen' } ).click();
		await admin.locator( 'dialog.rtb-dialog' ).screenshot( { path: join( SHOTS, 'dialog.png' ) } );
		await admin.locator( 'dialog.rtb-dialog .rtb-dialog__foot button', { hasText: 'Save conditions' } ).click();
		await admin.waitForFunction( () => ! document.querySelector( 'dialog.rtb-dialog' ), null, { timeout: 15000 } );
		const saved = rules( header );
		check( 'dialog', 'Save stores the rules (entire site, except the About page)', JSON.stringify( saved ) === JSON.stringify( [ 'include/general', `exclude/singular/page/${ about }` ] ), JSON.stringify( saved ) );
		const after = await cell.innerText();
		check( 'list', 'the row shows the new conditions at once, with "Edit conditions"', /Entire site/.test( after ) && /About the glen/.test( after ) && ! /Not displayed/.test( after ) && /Edit conditions/.test( after ), after );
		await admin.screenshot( { path: join( SHOTS, 'list-header-saved.png' ) } );

		await visitor.goto( `${ BASE }/` );
		const onHome = /GLEN HEADER/.test( await visitor.content() );
		await visitor.goto( `${ BASE }/?page_id=${ about }` );
		const onAbout = /GLEN HEADER/.test( await visitor.content() );
		check( 'site', 'the site uses them at once: the header shows on the home page, not on the About page', onHome && ! onAbout, JSON.stringify( { onHome, onAbout } ) );

		// The editor's control (the shared picker) shows what the list saved.
		await admin.goto( `${ BASE }/wp-admin/post.php?post=${ header }&action=refraction`, { timeout: 120000 } );
		await admin.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '#refraction-panel' ), null, { timeout: 120000 } );
		await sleep( 2500 );
		const inEditor = await admin.evaluate( () => refraction.documents.getCurrent().container.settings.get( 'refraction_display_conditions' ) );
		check( 'editor', 'the template\'s Display Conditions in the editor holds the rules saved from the list', JSON.stringify( inEditor ) === JSON.stringify( saved ), JSON.stringify( inEditor ) );

		check( 'site', 'no JavaScript errors', ! errors.length, errors.slice( 0, 4 ).join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse|Deprecated)/.test( l ) );
		check( 'site', 'no PHP errors', ! php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( err ) => {
	console.error( err );
	process.exit( 1 );
} );
