#!/usr/bin/env node
/**
 * Tabs icons (SQLite test site, Chromium): an icon drawn as inline SVG (Solar, Phosphor) shows on every tab, once,
 * in the tab icon colors (normal and active); the Font Awesome icon still works the same way.
 *
 * Usage: node scripts/check-tabs-icons.mjs [--site /tmp/rf-tabs-site] [--port 9290] [--shots /tmp/tabs-icons-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-tabs-site' );
const PORT = arg( 'port', '9290' );
const SHOTS = arg( 'shots', '/tmp/tabs-icons-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
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
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
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

function page( title, widgets ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	const data = [ { id: `c${ id }`.slice( 0, 7 ), elType: 'container', isInner: false, settings: {}, elements: widgets } ];
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

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
		const tab = ( i, icon ) => ( { _id: `t${ i }`, tab_title: `Tab #${ i }`, tab_icon: icon, tab_icon_active: { value: '', library: '' } } );
		const tabs = ( id, icon ) => ( { id, elType: 'widget', widgetType: 'nested-tabs', settings: { tabs: [ tab( 1, icon ), tab( 2, icon ), tab( 3, icon ) ], icon_color: '#0000FF', icon_color_active: '#00AA00' }, elements: [ 1, 2, 3 ].map( ( i ) => ( { id: `${ id }c${ i }`.slice( 0, 7 ), elType: 'container', isInner: true, settings: {}, elements: [] } ) ) } );
		const p1 = page( 'Tabs icons', [
			tabs( 'tbsol', { value: 'rf-solar rf-solar-home-smile', library: 'solar-linear' } ),
			tabs( 'tbpho', { value: 'rf-ph rf-ph-house', library: 'phosphor-regular' } ),
			tabs( 'tbfas', { value: 'fas fa-home', library: 'fa-solid' } ),
		] );
		const p = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( p1.url );
		await sleep( 1000 );
		const shown = ( id ) => p.evaluate( ( wid ) => {
			// A bare <svg> icon is colored with fill, an <i> (and the <svg> inside it) with color.
			const tint = ( i ) => {
				if ( ! i ) {
					return '';
				}
				return 'svg' === i.tagName.toLowerCase() ? getComputedStyle( i ).fill : getComputedStyle( i ).color;
			};
			return [ ...document.querySelectorAll( `[data-id="${ wid }"] .e-n-tab-title` ) ].map( ( t ) => {
				const visible = [ ...t.querySelectorAll( '.e-n-tab-icon > *' ) ].filter( ( i ) => '0' !== getComputedStyle( i ).opacity && i.getBoundingClientRect().height > 0 );
				const drawn = visible.map( ( i ) => ( i.querySelector( 'svg' ) || i ).getBoundingClientRect() ).filter( ( r ) => r.width > 0 && r.height > 0 );
				return { selected: t.getAttribute( 'aria-selected' ), visible: visible.length, drawn: drawn.length, color: tint( visible[ 0 ] ) };
			} );
		}, id );
		for ( const [ id, name ] of [ [ 'tbsol', 'Solar' ], [ 'tbpho', 'Phosphor' ], [ 'tbfas', 'Font Awesome' ] ] ) {
			const s = await shown( id );
			const ok = 3 === s.length && s.every( ( t ) => 1 === t.visible && 1 === t.drawn ) && 'rgb(0, 170, 0)' === s[ 0 ].color && 'rgb(0, 0, 255)' === s[ 1 ].color;
			check( 'tabs', `${ name } icon: one icon shows on every tab, green on the active tab and blue on the others`, ok, JSON.stringify( s ) );
		}
		await p.locator( '[data-id="tbsol"] .e-n-tabs-heading' ).screenshot( { path: join( SHOTS, 'solar-tabs.png' ) } );
		await p.click( '[data-id="tbsol"] .e-n-tab-title:nth-child(2)' );
		await sleep( 500 );
		const switched = await shown( 'tbsol' );
		check( 'tabs', 'clicking the second tab: its icon turns green, the first tab\'s blue, still one icon each', 'rgb(0, 170, 0)' === switched[ 1 ].color && 'rgb(0, 0, 255)' === switched[ 0 ].color && switched.every( ( t ) => 1 === t.visible ), JSON.stringify( switched ) );
		await p.context().close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 700 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall tabs icon checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
