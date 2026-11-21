#!/usr/bin/env node
/**
 * Copy and paste in the editor (0.137.0), SQLite test site, Chromium:
 * - every widget: Copy fits the browser's storage (it used to hold every default of every view of every child: a
 *   Focus Stack came to 2.6 million characters and Copy did nothing), pastes once on the same page and once on
 *   another page, and the pasted copies are there after saving;
 * - Ctrl+C on a widget whose text is being edited (a click on a heading puts the caret in it) copies the widget, and
 *   Ctrl+V there pastes the widget, not its code; with text selected, Ctrl+C stays the text's;
 * - a nested widget's slide (Showcase Wheel) offers "Copy Showcase Wheel", and Ctrl+C on the slide copies the widget;
 * - a right-click on an embed (Video) opens the editor's menu, not the iframe's.
 *
 * Usage: node scripts/check-copy-paste.mjs [--site /tmp/rf-copy-site] [--port 9382] [--shots /tmp/copy-paste-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-copy-site' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/copy-paste-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 1200 ) }` }` );
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
	return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
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
function page( title ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( [ { id: 'tgt0001', elType: 'container', settings: {}, elements: [] } ] ) ] );
	return Number( id );
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
		const A = page( 'Copy from' );
		const B = page( 'Paste into' );
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		let e = await ctx.newPage();
		e.on( 'pageerror', ( x ) => errors.push( x.message + ' @ ' + String( x.stack || '' ).split( '\n' ).slice( 1, 4 ).join( ' < ' ) ) );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), e.click( '#wp-submit' ) ] );
		// Each page in a fresh tab (a tab that held some 200 widgets runs out of memory).
		const open = async ( id ) => {
			await e.close();
			e = await ctx.newPage();
			e.on( 'pageerror', ( x ) => errors.push( x.message + ' @ ' + String( x.stack || '' ).split( '\n' ).slice( 1, 4 ).join( ' < ' ) ) );
			await e.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
			await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
			await sleep( 2500 );
			return e.frame( { name: 'refraction-preview-iframe' } );
		};
		const count = ( t ) => e.evaluate( ( type ) => {
			const all = ( c ) => c.children.flatMap( ( x ) => [ x, ...all( x ) ] );
			return all( refraction.documents.getCurrent().container ).filter( ( c ) => c.model.get( 'widgetType' ) === type ).length;
		}, t );
		const save = async () => {
			await e.evaluate( async () => {
				await $e.run( 'document/save/publish' );
			} );
			await sleep( 1500 );
		};

		// ------------------------------------------------------------ every widget, each in its own container
		await open( A );
		const made = await e.evaluate( () => {
			const doc = refraction.documents.getCurrent().container;
			const out = {};
			Object.keys( refraction.widgetsCache ).filter( ( t ) => 'container' !== t && false !== refraction.widgetsCache[ t ].show_in_panel && ! refraction.widgetsCache[ t ].atomic_controls ).forEach( ( t ) => {
				try {
					const box = $e.run( 'document/elements/create', { container: doc, model: { elType: 'container' }, options: { edit: false } } );
					out[ t ] = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: t }, options: { edit: false } } ).id;
				} catch ( x ) {}
			} );
			return out;
		} );
		await save();
		let frame = await open( A );
		const types = Object.keys( made );
		check( 'setup', `${ types.length } widgets on the page`, types.length > 60, types.length );

		const sizes = {};
		const samePage = [];
		const clips = {};
		const missing = [];
		for ( const t of types ) {
			const r = await e.evaluate( ( id ) => {
				const c = refraction.getContainer( id );
				if ( ! c ) {
					return 'missing';
				}
				refraction.selection.add( c );
				refractionCommon.storage.set( 'clipboard', null );
				$e.run( 'document/elements/copy', { containers: [ c ] } );
				const d = refractionCommon.storage.get( 'clipboard' );
				refraction.selection.remove( c, true );
				return d ? { size: JSON.stringify( d ).length, data: d } : null;
			}, made[ t ] );
			if ( 'missing' === r ) {
				missing.push( t );
				continue;
			}
			if ( ! r ) {
				sizes[ t ] = 'nothing copied';
				continue;
			}
			sizes[ t ] = r.size;
			clips[ t ] = r.data;
			const before = await count( t );
			await e.evaluate( ( id ) => {
				$e.run( 'document/ui/paste', { container: refraction.getContainer( id ) } );
			}, made[ t ] );
			await sleep( 150 );
			const after = await count( t );
			if ( after !== before + 1 ) {
				samePage.push( `${ t }: ${ before }->${ after }` );
			}
		}
		console.log( `       (not on the page after saving: ${ missing.join( ', ' ) || 'none' })` );
		const notCopied = Object.entries( sizes ).filter( ( [ , v ] ) => 'number' !== typeof v );
		const biggest = Object.entries( sizes ).filter( ( [ , v ] ) => 'number' === typeof v ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).slice( 0, 4 );
		check( 'copy', 'every widget copies, the largest well under the browser\'s storage (under 1 million characters)', ! notCopied.length && biggest[ 0 ][ 1 ] < 1000000, JSON.stringify( { notCopied, biggest } ) );
		check( 'paste', 'every widget pastes once on the same page', ! samePage.length, samePage.join( ', ' ) );

		// ------------------------------------------------------------ the keyboard on a heading being edited
		frame = await open( A );
		const heading = frame.locator( `[data-id="${ made.heading }"] .refraction-heading-title` );
		await heading.scrollIntoViewIfNeeded();
		await heading.click();
		await sleep( 300 );
		const editing = await frame.evaluate( () => !! document.activeElement.closest( '[contenteditable="true"]' ) );
		await e.evaluate( () => refractionCommon.storage.set( 'clipboard', null ) );
		await e.keyboard.press( 'Control+c' );
		await sleep( 300 );
		const copied = await e.evaluate( () => refractionCommon.storage.get( 'clipboard' )?.elements?.[ 0 ]?.widgetType );
		check( 'keyboard', 'Ctrl+C on a heading whose text has the caret copies the heading', editing && 'heading' === copied, JSON.stringify( { editing, copied } ) );
		const hBefore = await count( 'heading' );
		await heading.click();
		await e.keyboard.press( 'Control+v' );
		await sleep( 800 );
		const text = await heading.textContent();
		check( 'keyboard', 'Ctrl+V there pastes a heading, and no code goes into the text', hBefore + 1 === await count( 'heading' ) && ! text.includes( '{' ), JSON.stringify( [ hBefore, await count( 'heading' ), text.slice( 0, 60 ) ] ) );
		await heading.click();
		await frame.evaluate( ( id ) => {
			const el = document.querySelector( `[data-id="${ id }"] .refraction-heading-title` );
			const range = document.createRange();
			range.selectNodeContents( el );
			getSelection().removeAllRanges();
			getSelection().addRange( range );
		}, made.heading );
		await e.evaluate( () => refractionCommon.storage.set( 'clipboard', null ) );
		await e.keyboard.press( 'Control+c' );
		await sleep( 300 );
		check( 'keyboard', 'with text selected, Ctrl+C copies the text (the widget is not copied)', null === await e.evaluate( () => refractionCommon.storage.get( 'clipboard' ) ) );

		// ------------------------------------------------------------ a nested widget's slide
		const wheel = frame.locator( `[data-id="${ made[ 'refraction-showcase-wheel' ] }"]` );
		await wheel.scrollIntoViewIfNeeded();
		await wheel.click( { button: 'right', position: { x: 40, y: 60 }, force: true } );
		await sleep( 300 );
		const menuItem = await e.evaluate( () => {
			const m = [ ...document.querySelectorAll( '.refraction-context-menu' ) ].find( ( x ) => x.offsetParent );
			const i = m && m.querySelector( '.refraction-context-menu-list__item-copyWidget' );
			return i && i.offsetParent ? i.textContent.trim() : null;
		} );
		await e.screenshot( { path: join( SHOTS, 'slide-menu.png' ) } );
		await e.evaluate( () => refractionCommon.storage.set( 'clipboard', null ) );
		if ( menuItem ) {
			await e.click( '.refraction-context-menu:visible .refraction-context-menu-list__item-copyWidget' );
		}
		const viaMenu = await e.evaluate( () => refractionCommon.storage.get( 'clipboard' )?.elements?.[ 0 ]?.widgetType );
		check( 'nested', 'right-clicking a Showcase Wheel slide offers "Copy Showcase Wheel", which copies the widget', 'Copy Showcase Wheel' === menuItem && 'refraction-showcase-wheel' === viaMenu, JSON.stringify( { menuItem, viaMenu } ) );
		await e.keyboard.press( 'Escape' );
		await wheel.click( { position: { x: 40, y: 60 }, force: true } );
		await sleep( 300 );
		await e.evaluate( () => refractionCommon.storage.set( 'clipboard', null ) );
		await e.keyboard.press( 'Control+c' );
		await sleep( 300 );
		const viaKey = await e.evaluate( () => refractionCommon.storage.get( 'clipboard' )?.elements?.[ 0 ]?.widgetType );
		check( 'nested', 'Ctrl+C on the slide copies the Showcase Wheel', 'refraction-showcase-wheel' === viaKey, viaKey );
		const plain = await e.evaluate( ( id ) => {
			const c = refraction.getContainer( id );
			return [ ...document.querySelectorAll( '.refraction-context-menu-list__item-copyWidget' ) ].some( ( x ) => x.offsetParent ) || ! c;
		}, made.heading );
		check( 'nested', 'other containers do not show it', ! plain );

		// ------------------------------------------------------------ an embed
		const video = frame.locator( `[data-id="${ made.video }"]` );
		await e.keyboard.press( 'Escape' );
		await video.scrollIntoViewIfNeeded();
		await video.click( { button: 'right', force: true } );
		await sleep( 300 );
		const videoMenu = await e.evaluate( () => {
			const m = [ ...document.querySelectorAll( '.refraction-context-menu' ) ].find( ( x ) => x.offsetParent );
			return m ? m.querySelector( '.refraction-context-menu-list__item-edit' )?.textContent.trim() : null;
		} );
		check( 'embed', 'a right-click on a Video opens the editor\'s menu (Copy, Paste) instead of the iframe\'s', /Video/.test( videoMenu || '' ), videoMenu );
		await e.keyboard.press( 'Escape' );

		// ------------------------------------------------------------ to another page
		await open( B );
		const otherPage = [];
		for ( const t of Object.keys( clips ) ) {
			await e.evaluate( ( d ) => {
				refractionCommon.storage.set( 'clipboard', d );
				$e.run( 'document/ui/paste', { container: refraction.getContainer( 'tgt0001' ) } );
			}, clips[ t ] );
			await sleep( 150 );
			if ( 1 !== await count( t ) ) {
				otherPage.push( `${ t }: ${ await count( t ) }` );
			}
		}
		check( 'paste', 'every widget pastes once on another page', ! otherPage.length, otherPage.join( ', ' ) );
		await save();
		await open( B );
		const kept = await e.evaluate( ( list ) => {
			const all = ( c ) => c.children.flatMap( ( x ) => [ x, ...all( x ) ] );
			const there = new Set( all( refraction.documents.getCurrent().container ).map( ( c ) => c.model.get( 'widgetType' ) ) );
			return list.filter( ( t ) => ! there.has( t ) );
		}, Object.keys( clips ) );
		check( 'paste', 'the pasted widgets are there after saving and opening the page again', ! kept.length, kept.join( ', ' ) );

		const own = errors.filter( ( x ) => ! /slideToLoop|is not a valid selector|createPattern/.test( x ) );
		check( 'site', 'no JavaScript errors', ! own.length, own.slice( 0, 5 ).join( ' | ' ) );
		const php = logTail( logStart );
		check( 'site', 'no PHP errors', ! /PHP (Fatal|Warning|Parse)/.test( php ), php.slice( 0, 600 ) );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } failed` : '\nall passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
