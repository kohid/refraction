#!/usr/bin/env node
/**
 * Floating Elements check (SQLite test site, Chromium): the top bar button shows and hides the window; it lists the
 * widgets with its own search; clicking or dragging a tile adds the widget; it docks to the right (before a docked
 * Structure) and to the left (beside the panel), by its buttons and by dragging, and the page makes room; it floats
 * again when pulled away; it remembers its state after a reload; Ctrl+Shift+K toggles it. Saves screenshots to --shots.
 *
 * Usage: node scripts/check-elements-float.mjs [--site /tmp/rf-ef-site] [--port 8990] [--shots /tmp/elements-float-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ef-site' );
const PORT = arg( 'port', '8990' );
const SHOTS = arg( 'shots', '/tmp/elements-float-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 500 ) }` }` );
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

function wp( args, { allowFail = false } = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		if ( allowFail ) { return null; }
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

/** A published page whose editor data is the given elements; returns its id and address. */
function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id, url: wp( [ 'post', 'list', '--post_type=page', `--post__in=${ id }`, '--field=url' ] ).trim() };
}
const box = ( id, settings, elements, isInner = false ) => ( { id, elType: 'container', settings: { content_width: 'full', ...settings }, elements, isInner } );


const heading = ( id, title ) => ( { id, elType: 'widget', widgetType: 'heading', settings: { title }, elements: [] } );

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
	const errors = [];

	try {
		const doc = page( 'Floating Elements', [ box( 'top', { min_height: { unit: 'vh', size: 40 } }, [ heading( 'h1', 'Drop widgets here' ) ] ) ] );
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 900 } } );
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php?redirect_to=${ encodeURIComponent( `${ BASE }/wp-admin/profile.php` ) }` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );

		const openEditor = async () => {
			await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
			await a.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
			await a.waitForTimeout( 2000 );
		};
		await openEditor();
		await a.evaluate( () => $e.components.get( 'navigator' ).isOpen && $e.run( 'navigator/close' ) );

		const win = () => a.evaluate( () => {
			const el = document.getElementById( 'refraction-elements-float' );
			const r = el.getBoundingClientRect();
			const preview = document.getElementById( 'refraction-preview' ).getBoundingClientRect();
			const panel = document.getElementById( 'refraction-panel' ).getBoundingClientRect();
			const nav = document.getElementById( 'refraction-navigator' ).getBoundingClientRect();
			return {
				visible: 'none' !== getComputedStyle( el ).display,
				bar: Math.round( document.getElementById( 'refraction-editor-wrapper-v2' ).getBoundingClientRect().height ),
				navTop: Math.round( nav.top ), navBottom: Math.round( nav.bottom ), wrapBottom: Math.round( document.getElementById( 'refraction-editor-wrapper' ).getBoundingClientRect().bottom ),
				bottom: Math.round( r.bottom ),
				left: Math.round( r.left ), right: Math.round( r.right ), top: Math.round( r.top ), height: Math.round( r.height ), width: Math.round( r.width ),
				previewLeft: Math.round( preview.left ), previewRight: Math.round( preview.right ),
				panelRight: Math.round( panel.right ), navLeft: Math.round( nav.left ),
				body: [ ...document.body.classList ].filter( ( c ) => c.startsWith( 'rf-ef' ) ).join( ' ' ),
				route: $e.routes.isPartOf( 'elements-float' ),
				tiles: el.querySelectorAll( '.refraction-element-wrapper' ).length,
				categories: el.querySelectorAll( '.refraction-panel-category' ).length,
				pressed: [ ...el.querySelectorAll( '.rf-ef__dock[aria-pressed="true"]' ) ].map( ( b ) => b.dataset.dock ).join(),
			};
		} );

		// ------------------------------------------------------------ toggle from the top bar
		const button = a.locator( 'button[aria-label="Floating Elements"]' ).first();
		check( 'toggle', 'the top bar has a Floating Elements button', 1 === await button.count() );
		check( 'toggle', 'hidden until asked for', ! ( await win() ).visible );
		await button.click();
		await a.waitForTimeout( 600 );
		let w = await win();
		check( 'toggle', 'the button shows it, floating beside the panel', w.visible && w.route && '' === w.body.replace( /rf-ef--dock-hint-\w+/, '' ).trim() && w.left > w.panelRight, JSON.stringify( w ) );
		check( 'list', 'it lists the widget categories and their widgets', w.categories >= 3 && w.tiles >= 20, JSON.stringify( w ) );
		const dupIds = await a.evaluate( () => {
			const seen = {};
			document.querySelectorAll( '[id]' ).forEach( ( el ) => { seen[ el.id ] = ( seen[ el.id ] || 0 ) + 1; } );
			return Object.keys( seen ).filter( ( k ) => seen[ k ] > 1 && /elements|category/.test( k ) );
		} );
		check( 'list', 'no element id is doubled by the second list', 0 === dupIds.length, dupIds.join() );
		await a.screenshot( { path: join( SHOTS, 'floating.png' ) } );

		// ------------------------------------------------------------ search
		await a.fill( '#refraction-elements-float .rf-ef__search-input', 'head' );
		await a.waitForTimeout( 300 );
		const found = await a.$$eval( '#refraction-elements-float .rf-ef__results .refraction-element .title', ( t ) => t.map( ( x ) => x.textContent.trim() ) );
		const panelFiltered = await a.evaluate( () => refraction.channels.panelElements.request( 'filter:value' ) );
		check( 'search', 'its search finds Heading and leaves the panel unfiltered', found.includes( 'Heading' ) && ! found.includes( 'Image' ) && ! panelFiltered, `${ found.join() } / ${ panelFiltered }` );
		await a.fill( '#refraction-elements-float .rf-ef__search-input', 'zzzz' );
		await a.waitForTimeout( 200 );
		check( 'search', 'no match says so', 1 === await a.locator( '#refraction-elements-float .rf-ef__empty' ).count() );
		await a.fill( '#refraction-elements-float .rf-ef__search-input', '' );
		await a.waitForTimeout( 200 );

		// ------------------------------------------------------------ adding widgets
		const preview = a.frameLocator( '#refraction-preview-iframe' );
		const widgets = async ( type ) => preview.locator( `.refraction-widget-${ type }` ).count();
		const dividersBefore = await widgets( 'divider' );
		await a.locator( '#refraction-elements-float .refraction-element:has(.title:text-is("Divider"))' ).click();
		await a.waitForTimeout( 1200 );
		check( 'add', 'clicking a widget adds it to the page', ( await widgets( 'divider' ) ) === dividersBefore + 1 );
		const spacersBefore = await widgets( 'spacer' );
		const tile = a.locator( '#refraction-elements-float .refraction-element:has(.title:text-is("Spacer"))' );
		await tile.dragTo( preview.locator( '[data-id="h1"]' ) );
		await a.waitForTimeout( 1500 );
		check( 'add', 'dragging a widget into the page adds it there', ( await widgets( 'spacer' ) ) === spacersBefore + 1 );

		// ------------------------------------------------------------ docking by the buttons
		await a.click( '#refraction-elements-float .rf-ef__dock[data-dock="right"]' );
		await a.waitForTimeout( 900 );
		w = await win();
		check( 'dock', 'right: from under the top bar to the bottom, against the right edge, the page narrower by its width', w.right === 1500 && w.top === w.bar && w.bottom === 900 && Math.abs( w.previewRight - w.left ) <= 1 && 'right' === w.pressed, JSON.stringify( w ) );
		await a.screenshot( { path: join( SHOTS, 'docked-right.png' ) } );
		await a.evaluate( () => $e.run( 'navigator/open' ) );
		await a.waitForTimeout( 400 );
		await a.evaluate( () => refraction.navigator.dock() );
		await a.waitForTimeout( 900 );
		w = await win();
		check( 'dock', 'a docked Structure starts under the top bar too, and the editor ends at the bottom of the window', w.navTop === w.bar && w.navBottom === 900 && w.wrapBottom === 900, JSON.stringify( w ) );
		check( 'dock', 'with Structure docked on the right too, it sits just before it and the page makes room for both', Math.abs( w.right - w.navLeft ) <= 1 && Math.abs( w.previewRight - w.left ) <= 1, JSON.stringify( w ) );
		await a.screenshot( { path: join( SHOTS, 'docked-right-with-structure.png' ) } );
		await a.evaluate( () => $e.run( 'navigator/close' ) );
		await a.waitForTimeout( 600 );

		await a.click( '#refraction-elements-float .rf-ef__dock[data-dock="left"]' );
		await a.waitForTimeout( 900 );
		w = await win();
		check( 'dock', 'left: against the panel, full height, the page starts after it', Math.abs( w.left - w.panelRight ) <= 1 && w.top === w.bar && w.bottom === 900 && Math.abs( w.previewLeft - w.right ) <= 1 && w.previewRight === 1500 && 'left' === w.pressed, JSON.stringify( w ) );
		await a.screenshot( { path: join( SHOTS, 'docked-left.png' ) } );
		await a.click( '#refraction-elements-float .rf-ef__dock[data-dock="left"]' );
		await a.waitForTimeout( 900 );
		w = await win();
		check( 'dock', 'pressing the docked side again floats it, and the page has its full width back', '' === w.body && w.height < 800 && w.previewLeft === 0 && w.previewRight === 1500, JSON.stringify( w ) );

		// ------------------------------------------------------------ docking by dragging
		const title = a.locator( '#refraction-elements-float .rf-ef__title' );
		const drag = async ( toX, toY ) => {
			const b = await title.boundingBox();
			await a.mouse.move( b.x + 10, b.y + b.height / 2 );
			await a.mouse.down();
			for ( let i = 1; i <= 12; i++ ) {
				await a.mouse.move( b.x + 10 + ( ( toX - b.x - 10 ) * i / 12 ), b.y + ( b.height / 2 ) + ( ( toY - b.y ) * i / 12 ) );
				await a.waitForTimeout( 30 );
			}
			const hint = await a.evaluate( () => [ ...document.body.classList ].filter( ( c ) => c.includes( 'dock-hint' ) ).join() );
			await a.mouse.up();
			await a.waitForTimeout( 900 );
			return hint;
		};
		const hintRight = await drag( 1490, 300 );
		w = await win();
		check( 'drag', 'dragged against the right edge it shows where it will dock, and docks there', 'rf-ef--dock-hint-right' === hintRight && w.body.includes( 'rf-ef-docked--right' ), `${ hintRight } ${ JSON.stringify( w ) }` );
		await drag( 900, 300 );
		w = await win();
		check( 'drag', 'pulled away from the edge it floats again', '' === w.body && w.height < 800 && w.previewRight === 1500, JSON.stringify( w ) );
		const panelRight = w.panelRight;
		const hintLeft = await drag( panelRight + 5, 300 );
		w = await win();
		check( 'drag', 'dragged against the panel it docks to the left', 'rf-ef--dock-hint-left' === hintLeft && w.body.includes( 'rf-ef-docked--left' ), `${ hintLeft } ${ JSON.stringify( w ) }` );

		// ------------------------------------------------------------ remembered, hidden, shortcut
		await openEditor();
		w = await win();
		check( 'remember', 'after a reload it is shown again, docked to the left', w.visible && w.body.includes( 'rf-ef-docked--left' ), JSON.stringify( w ) );
		await a.click( '#refraction-elements-float .rf-ef__close' );
		await a.waitForTimeout( 700 );
		w = await win();
		check( 'toggle', 'its close button hides it and the page has its full width back', ! w.visible && ! w.route && '' === w.body && w.previewLeft === 0, JSON.stringify( w ) );
		await openEditor();
		check( 'remember', 'hidden stays hidden after a reload', ! ( await win() ).visible );
		await preview.locator( 'body' ).click( { position: { x: 5, y: 5 } } ).catch( () => {} );
		await a.locator( 'body' ).press( 'Control+Shift+K' );
		await a.waitForTimeout( 700 );
		const viaKeys = ( await win() ).visible;
		await a.locator( 'body' ).press( 'Control+Shift+K' );
		await a.waitForTimeout( 700 );
		check( 'toggle', 'Ctrl+Shift+K shows and hides it', viaKeys && ! ( await win() ).visible );
		await button.click();
		await a.waitForTimeout( 700 );
		check( 'toggle', 'and the top bar button shows it again', ( await win() ).visible );
		await a.evaluate( () => $e.run( 'elements-float/dock', { side: '' } ) );
		await a.evaluate( () => $e.run( 'elements-float/close' ) );
		await ctx.close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the editor', 0 === errors.length, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall floating elements checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
