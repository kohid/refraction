#!/usr/bin/env node
/**
 * Panel accordion and global colours on Organic FX (0.104.0, SQLite test site, Chromium).
 * - A long section's groups (General, Shapes, Motion, Colors, Place...) are an accordion, one open at a time, with a
 *   header row in place; tabs made with the tabs control stay tabs: states (Normal / Hover) and pairs such as a
 *   floating card's Content / Style.
 * - Floating Shapes' colours have the globe (Global Colors) like every colour, and a global colour chosen there
 *   colours the shapes on the page and in Edit Mode.
 *
 * Usage: node scripts/check-panel-accordion.mjs [--site /tmp/rf-pa-site] [--port 8941] [--shots /tmp/panel-accordion-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-pa-site' );
const PORT = arg( 'port', '8941' );
const SHOTS = arg( 'shots', '/tmp/panel-accordion-shots' );
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
		const globals = { rf_fs_color_1: 'globals/colors?id=primary', rf_fs_color_2: 'globals/colors?id=primary', rf_fs_color_3: 'globals/colors?id=primary', rf_fs_color_4: 'globals/colors?id=primary' };
		const doc = page( 'Panel accordion', [
			box( 'fs', { rf_fs: 'yes', rf_fs_color_1: '', rf_fs_color_2: '', rf_fs_color_3: '', rf_fs_color_4: '', __globals__: globals, min_height: { unit: 'px', size: 320 } }, [] ),
			box( 'b2', {}, [ { id: 'ib', elType: 'widget', widgetType: 'image-box', settings: { title_text: 'Airport Transfers', description_text: 'Reliable transfers.' }, elements: [] } ] ),
			box( 'b3', {}, [ { id: 'ps', elType: 'widget', widgetType: 'refraction-phone-showcase', settings: { autoplay: '', cards: [ { _id: 'cd1', title: 'Rated 4.9', text: 'By 2,000 riders' } ] }, elements: [] } ] ),
		] );

		// The shapes' colours against the kit's primary colour.
		const shapes = ( target ) => target.evaluate( () => {
			const el = document.querySelector( '[data-id="fs"]' );
			const primary = getComputedStyle( el ).getPropertyValue( '--e-global-color-primary' ).trim().toLowerCase();
			const paints = [ ...el.querySelectorAll( 'svg path' ) ].map( ( p ) => ( 'none' !== p.getAttribute( 'fill' ) ? p.getAttribute( 'fill' ) : p.getAttribute( 'stroke' ) ) || '' ).map( ( c ) => c.toLowerCase() ).filter( Boolean );
			return { primary, count: paints.length, others: [ ...new Set( paints.filter( ( c ) => c !== primary ) ) ], globalsAttr: el.getAttribute( 'data-rf-globals' ) };
		} );

		// ------------------------------------------------------------ on the page
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( doc.url, { waitUntil: 'load', timeout: 120000 } );
		await p.waitForTimeout( 2000 );
		const site = await shapes( p );
		check( 'page', 'Floating Shapes with the global Primary colour: every shape takes the kit\'s primary colour', site.primary && site.count > 0 && 0 === site.others.length && /primary/.test( site.globalsAttr || '' ), JSON.stringify( site ) );

		// ------------------------------------------------------------ in the editor
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 3000 );
		const frame = a.frames().find( ( f ) => f !== a.mainFrame() && f.url().includes( 'refraction-preview' ) ) || a.frames()[ 1 ];
		const ed = await shapes( frame );
		check( 'edit mode', 'the shapes take the global Primary colour in Edit Mode too', ed.primary && ed.count > 0 && 0 === ed.others.length, JSON.stringify( ed ) );

		const open = async ( id, tab, section ) => {
			await a.evaluate( ( i ) => $e.run( 'panel/editor/open', { model: refraction.getContainer( i ).model, view: refraction.getContainer( i ).view } ), id );
			await a.waitForTimeout( 800 );
			await a.locator( `.refraction-panel-navigation-tab:has-text("${ tab }")` ).first().click();
			await a.waitForTimeout( 600 );
			await a.evaluate( ( n ) => { const s = document.querySelector( '.refraction-control-' + n ); if ( s && ! s.classList.contains( 'e-open' ) ) { s.querySelector( '.refraction-panel-heading' ).click(); } }, section );
			await a.waitForTimeout( 800 );
		};
		const acc = () => a.evaluate( () => [ ...document.querySelectorAll( '.rf-section-groups.rf-acc' ) ].filter( ( h ) => h.offsetParent ).map( ( h ) => ( { label: h.textContent.trim(), open: h.classList.contains( 'is-open' ) } ) ) );

		await open( 'fs', 'Style', 'section_rf_fs' );
		let heads = await acc();
		check( 'panel', 'Floating Shapes: its groups are accordion headers (General, Shapes, Motion, Colors, Place), General open, no row of group tabs', heads.map( ( h ) => h.label ).join( '|' ) === 'General|Shapes|Motion|Colors|Place' && heads.filter( ( h ) => h.open ).map( ( h ) => h.label ).join() === 'General' && 0 === ( await a.locator( '.rf-section-groups:not(.rf-acc)' ).count() ), JSON.stringify( heads ) );
		await a.locator( '.rf-acc__head:has-text("Colors")' ).click();
		await a.waitForTimeout( 600 );
		heads = await acc();
		const colourPlace = await a.evaluate( () => {
			const head = [ ...document.querySelectorAll( '.rf-section-groups.rf-acc' ) ].find( ( h ) => 'Colors' === h.textContent.trim() );
			const c1 = document.querySelector( '.refraction-control-rf_fs_color_1' );
			return { below: !! ( head && c1 && ( head.compareDocumentPosition( c1 ) & Node.DOCUMENT_POSITION_FOLLOWING ) ), visible: !! c1?.offsetParent, globe: !! c1?.querySelector( '.e-global__popover-toggle' ), opacity: !! document.querySelector( '.refraction-control-rf_fs_opacity' )?.offsetParent };
		} );
		check( 'panel', 'opening Colors closes General and shows its settings right under its header', heads.filter( ( h ) => h.open ).map( ( h ) => h.label ).join() === 'Colors' && colourPlace.below && colourPlace.visible, JSON.stringify( { heads, colourPlace } ) );
		check( 'panel', 'Colour 1 has the globe to pick a Global Color, like every other colour', colourPlace.globe, JSON.stringify( colourPlace ) );
		await a.locator( '.refraction-control-rf_fs_color_1 .refraction-control-title' ).scrollIntoViewIfNeeded();
		await a.screenshot( { path: join( SHOTS, 'panel-accordion.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );
		await a.locator( '.refraction-control-rf_fs_color_1 .e-global__popover-toggle' ).click();
		await a.waitForTimeout( 1200 );
		const pop = await a.evaluate( () => [ ...document.querySelectorAll( '.e-global__popover' ) ].some( ( p ) => p.offsetParent && /Primary/i.test( p.textContent ) ) );
		check( 'panel', 'the globe opens the Global Colors panel with the kit\'s colours', pop );
		await a.screenshot( { path: join( SHOTS, 'panel-global-colours.png' ), clip: { x: 0, y: 0, width: 720, height: 1000 } } );
		await a.keyboard.press( 'Escape' );
		await a.mouse.click( 150, 150 );
		await a.waitForTimeout( 400 );
		await a.locator( '.rf-acc__head:has-text("Colors")' ).click();
		await a.waitForTimeout( 500 );
		check( 'panel', 'clicking the open header closes it: every group closed', 0 === ( await acc() ).filter( ( h ) => h.open ).length );

		// State tabs stay tabs: Image Box > Style > Box group holds Normal / Hover.
		await open( 'ib', 'Style', 'section_style_box' );
		const boxHead = a.locator( '.rf-acc__head:has-text("Box")' );
		if ( ! ( await boxHead.evaluate( ( b ) => b.closest( '.rf-acc' ).classList.contains( 'is-open' ) ) ) ) { await boxHead.click(); await a.waitForTimeout( 500 ); }
		const tabs = await a.evaluate( () => [ ...document.querySelectorAll( '.refraction-control-type-tab' ) ].filter( ( t ) => t.offsetParent ).map( ( t ) => t.textContent.trim() ).join( ',' ) );
		check( 'panel', 'inside the Box group, Normal / Hover are still tabs', 'Normal,Hover' === tabs, tabs );
		await a.screenshot( { path: join( SHOTS, 'panel-states.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );

		// Content / Style tabs inside a floating card stay tabs.
		await open( 'ps', 'Content', 'section_cards' );
		await a.locator( '.refraction-control-cards .refraction-repeater-row-item-title' ).first().click();
		await a.waitForTimeout( 800 );
		const cardTabs = await a.evaluate( () => [ ...document.querySelectorAll( '.refraction-control-cards .refraction-control-type-tab' ) ].filter( ( t ) => t.offsetParent ).map( ( t ) => t.textContent.trim() ).join( ',' ) );
		await a.locator( '.refraction-control-cards .refraction-control-card_tab_style' ).first().click();
		await a.waitForTimeout( 500 );
		const styleShown = await a.evaluate( () => !! document.querySelector( '.refraction-control-cards .refraction-control-card_bg' )?.offsetParent );
		check( 'panel', 'a floating card keeps its Content / Style tabs, and Style shows its colours', 'Content,Style' === cardTabs && styleShown, JSON.stringify( { cardTabs, styleShown } ) );
		await a.locator( '.refraction-control-cards .refraction-control-card_bg' ).first().scrollIntoViewIfNeeded();
		await a.screenshot( { path: join( SHOTS, 'panel-card-tabs.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );

		check( 'errors', 'no script errors', 0 === errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse)/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
