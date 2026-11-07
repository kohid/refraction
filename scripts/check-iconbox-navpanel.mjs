#!/usr/bin/env node
/**
 * Nav Menu panel, Icon Box icons and box titles (SQLite test site, Chromium):
 * - The collapsed menu panel never scrolls sideways (long submenu items wrap), nor does the page; the full width
 *   dropdown fits the page; the panel shows the site name or an image at its top and buttons under the menu, and
 *   neither shows in the desktop menu.
 * - Icon Box and Image Box: the title's Margin control removes the theme's heading margin.
 * - Icon Box: more icons next to the main one (own color, link), the space between them, an animation played all the
 *   time with a delay between icons, and one played when the box comes into view; the editor draws them too.
 *
 * Usage: node scripts/check-iconbox-navpanel.mjs [--site /tmp/rf-ib-site] [--port 9200] [--shots /tmp/iconbox-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ib-site' );
const PORT = arg( 'port', '9200' );
const SHOTS = arg( 'shots', '/tmp/iconbox-shots' );
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
	const watch = ( p ) => p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && errors.push( `${ e.message } @ ${ p.url() }` ) );
	const at = async ( url, width, height = 800 ) => {
		const p = await ( await browser.newContext( { viewport: { width, height } } ) ).newPage();
		watch( p );
		await p.goto( url );
		return p;
	};

	try {
		wp( [ 'option', 'update', 'blogname', 'Inverness Taxis' ] );
		const menu = wp( [ 'menu', 'create', 'Main', '--porcelain' ] ).trim();
		wp( [ 'menu', 'item', 'add-custom', menu, 'About us', `${ BASE }/#about` ] );
		const tours = wp( [ 'menu', 'item', 'add-custom', menu, 'Inverness tours', `${ BASE }/#tours`, '--porcelain' ] ).trim();
		wp( [ 'menu', 'item', 'add-custom', menu, 'Culloden Battlefield, Clava Cairns & Cawdor Castle Tour', `${ BASE }/#culloden`, `--parent-id=${ tours }` ] );
		wp( [ 'menu', 'item', 'add-custom', menu, 'Dunrobin Castle & Northern Highlands Tour', `${ BASE }/#dunrobin`, `--parent-id=${ tours }` ] );
		wp( [ 'menu', 'item', 'add-custom', menu, 'Contact us', `${ BASE }/#contact` ] );
		const nav = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'refraction-nav-menu', settings: { menu, ...settings }, elements: [] } );
		const buttons = [ { _id: 'pb1', text: 'Book a taxi', link: { url: '#book' }, style: 'filled' }, { _id: 'pb2', text: 'Call us', link: { url: 'tel:0123' }, style: 'outline' } ];

		// ------------------------------------------------------------ the collapsed menu panel
		const side = page( 'Side panel', [ nav( 'n001', { panel_style: 'offcanvas-right', panel_brand: 'name', panel_buttons: buttons } ) ] );
		const m = await at( side.url, 375 );
		await m.click( '.refraction-nav-menu__toggle' );
		await sleep( 500 );
		await m.click( '.refraction-nav-menu__subtoggle' );
		await sleep( 400 );
		const panel = await m.evaluate( () => {
			const el = document.querySelector( '.refraction-nav-menu__panel' );
			const buttonsEl = [ ...document.querySelectorAll( '.refraction-nav-menu__panel-button' ) ];
			return {
				panelScroll: el.scrollWidth - el.clientWidth,
				pageScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
				brand: document.querySelector( '.refraction-nav-menu__brand-text' )?.textContent,
				brandHref: document.querySelector( '.refraction-nav-menu__brand' )?.getAttribute( 'href' ),
				closeInHead: !! document.querySelector( '.refraction-nav-menu__panel-head .refraction-nav-menu__close' ),
				buttons: buttonsEl.map( ( b ) => [ b.textContent.trim(), b.getAttribute( 'href' ), Math.round( b.getBoundingClientRect().width ) ] ),
				filledBg: buttonsEl[ 0 ] ? getComputedStyle( buttonsEl[ 0 ] ).backgroundColor : null,
				panelWidth: Math.round( el.clientWidth ),
			};
		} );
		check( 'panel', 'with a long submenu open, neither the panel nor the page scrolls sideways', panel.panelScroll <= 0 && panel.pageScroll <= 0, JSON.stringify( panel ) );
		check( 'panel', 'the site name at its top, linked to the home page, next to the close button', 'Inverness Taxis' === panel.brand && /127\.0\.0\.1/.test( panel.brandHref || '' ) && panel.closeInHead, JSON.stringify( panel ) );
		check( 'panel', 'its buttons under the menu (filled and outline), full width', 2 === panel.buttons.length && 'Book a taxi' === panel.buttons[ 0 ][ 0 ] && '#book' === panel.buttons[ 0 ][ 1 ] && 'rgba(0, 0, 0, 0)' !== panel.filledBg && panel.buttons[ 0 ][ 2 ] >= panel.panelWidth - 40, JSON.stringify( panel ) );
		await m.screenshot( { path: join( SHOTS, 'panel.png' ) } );
		await m.context().close();

		const d = await at( side.url, 1280 );
		const desktop = await d.evaluate( () => [ getComputedStyle( document.querySelector( '.refraction-nav-menu__panel-head' ) ).display, getComputedStyle( document.querySelector( '.refraction-nav-menu__panel-buttons' ) ).display ] );
		check( 'panel', 'the desktop menu shows neither the header nor the buttons', 'none' === desktop[ 0 ] && 'none' === desktop[ 1 ], JSON.stringify( desktop ) );
		await d.context().close();

		// The full width dropdown on a page tall enough to have a scrollbar.
		const filler = { id: 'sp01', elType: 'widget', widgetType: 'spacer', settings: { space: { unit: 'px', size: 2000 } }, elements: [] };
		const dropdown = page( 'Dropdown panel', [ nav( 'n002', { layout: 'dropdown', panel_style: 'dropdown', panel_stretch: 'full' } ), filler ] );
		const dd = await at( dropdown.url, 1000 );
		await dd.click( '.refraction-nav-menu__toggle' );
		await sleep( 500 );
		const fit = await dd.evaluate( () => ( { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, panel: Math.round( document.querySelector( '.refraction-nav-menu__panel' ).getBoundingClientRect().width ), client: document.documentElement.clientWidth } ) );
		check( 'panel', 'the full width dropdown fits the page (no sideways scroll)', fit.page <= 0 && Math.abs( fit.panel - fit.client ) <= 1, JSON.stringify( fit ) );
		await dd.context().close();

		const imagePanel = page( 'Image panel', [ nav( 'n003', { panel_style: 'fullscreen', panel_brand: 'image', panel_brand_image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` } } ) ] );
		const im = await at( imagePanel.url, 375 );
		await im.click( '.refraction-nav-menu__toggle' );
		await sleep( 500 );
		check( 'panel', 'or an image at its top', await im.evaluate( () => !! document.querySelector( '.refraction-nav-menu__brand img' )?.getBoundingClientRect().width ) );
		await im.context().close();

		// ------------------------------------------------------------ box titles and Icon Box icons
		const zero = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true };
		const boxes = page( 'Boxes', [
			{ id: 'ib01', elType: 'widget', widgetType: 'icon-box', settings: {
				title_text: 'Our tours', title_margin: zero,
				more_icons: [
					{ _id: 'mi1', icon: { value: 'rf-solar rf-solar-map-point', library: 'solar-bold-duotone' }, color: '#FF0000', link: { url: '#map' }, label: 'Map' },
					{ _id: 'mi2', icon: { value: 'fas fa-car', library: 'fa-solid' } },
					{ _id: 'mi3', icon: { value: 'fas fa-phone', library: 'fa-solid' } },
					{ _id: 'mi4', icon: { value: 'fas fa-globe', library: 'fa-solid' } },
				],
				icons_gap: { unit: 'px', size: 18 }, icons_animation: 'pulse', icons_animation_trigger: 'loop', icons_animation_stagger: { unit: 'px', size: 200 },
			}, elements: [] },
			{ id: 'mb01', elType: 'widget', widgetType: 'image-box', settings: { title_text: 'Our cars', title_margin: zero, image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` } }, elements: [] },
			filler,
			{ id: 'ib02', elType: 'widget', widgetType: 'icon-box', settings: { title_text: 'Later', icons_animation: 'fade-in', icons_animation_trigger: 'view' }, elements: [] },
		] );
		const b = await at( boxes.url, 1280 );
		const box = await b.evaluate( () => {
			const icons = [ ...document.querySelectorAll( '[data-id="ib01"] .refraction-icon-box-icon > .refraction-icon' ) ];
			const holder = document.querySelector( '[data-id="ib01"] .refraction-icon-box-icon' );
			const red = document.querySelector( '[data-id="ib01"] .refraction-repeater-item-mi1' );
			return {
				count: icons.length,
				gap: getComputedStyle( icons[ 1 ] ).marginInlineStart,
				centered: Math.abs( ( icons[ 0 ].getBoundingClientRect().left + icons[ icons.length - 1 ].getBoundingClientRect().right ) / 2 - ( holder.getBoundingClientRect().left + holder.getBoundingClientRect().right ) / 2 ) < 4,
				red: red ? getComputedStyle( red ).color : null,
				link: red?.getAttribute( 'href' ),
				anim: icons.map( ( i ) => getComputedStyle( i ).animationName + '@' + getComputedStyle( i ).animationDelay ),
				titleMargin: [ getComputedStyle( document.querySelector( '[data-id="ib01"] .refraction-icon-box-title' ) ).marginTop, getComputedStyle( document.querySelector( '[data-id="ib01"] .refraction-icon-box-title' ) ).marginBottom ],
				imageTitleMargin: [ getComputedStyle( document.querySelector( '[data-id="mb01"] .refraction-image-box-title' ) ).marginTop, getComputedStyle( document.querySelector( '[data-id="mb01"] .refraction-image-box-title' ) ).marginBottom ],
				laterBefore: getComputedStyle( document.querySelector( '[data-id="ib02"] .refraction-icon-box-icon > .refraction-icon' ) ).opacity,
			};
		} );
		check( 'icon box', 'the main icon and four more, in a row with the space between them, following the box alignment (center)', 5 === box.count && '18px' === box.gap && box.centered, JSON.stringify( box ) );
		check( 'icon box', 'an icon with its own color and link', 'rgb(255, 0, 0)' === box.red && '#map' === box.link, JSON.stringify( box ) );
		check( 'icon box', 'the animation plays on every icon, each 200 ms after the one before', box.anim.every( ( a, i ) => 'rf-ib-pulse' === a.split( '@' )[ 0 ] && Math.abs( parseFloat( a.split( '@' )[ 1 ] ) - i * 0.2 ) < 0.001 ), box.anim.join() );
		check( 'titles', 'the Margin control removes the title margin (Icon Box and Image Box)', '0px,0px' === box.titleMargin.join() && '0px,0px' === box.imageTitleMargin.join(), JSON.stringify( [ box.titleMargin, box.imageTitleMargin ] ) );
		check( 'icon box', 'with "when it comes into view", the icon waits hidden', '0' === box.laterBefore, box.laterBefore );
		await b.locator( '[data-id="ib02"]' ).scrollIntoViewIfNeeded();
		await sleep( 1800 );
		const later = await b.evaluate( () => ( { visible: document.querySelector( '[data-id="ib02"]' ).classList.contains( 'is-visible' ), name: getComputedStyle( document.querySelector( '[data-id="ib02"] .refraction-icon-box-icon > .refraction-icon' ) ).animationName, opacity: getComputedStyle( document.querySelector( '[data-id="ib02"] .refraction-icon-box-icon > .refraction-icon' ) ).opacity } ) );
		check( 'icon box', 'and fades in once it is seen', later.visible && 'rf-ib-fade-in' === later.name && '1' === later.opacity, JSON.stringify( later ) );
		await b.evaluate( () => window.scrollTo( 0, 0 ) );
		await b.screenshot( { path: join( SHOTS, 'icon-box.png' ), clip: { x: 0, y: 0, width: 1280, height: 700 } } );
		await b.context().close();

		// The editor draws the icons too.
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000 } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ boxes.id }&action=refraction` );
		await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const inEditor = await p.frame( { name: 'refraction-preview-iframe' } ).evaluate( () => ( { count: document.querySelectorAll( '[data-id="ib01"] .refraction-icon-box-icon > .refraction-icon' ).length, svg: !! document.querySelector( '[data-id="ib01"] .refraction-repeater-item-mi1 svg' ) } ) );
		check( 'editor', 'the editor draws the five icons (the Solar one as SVG)', 5 === inEditor.count && inEditor.svg, JSON.stringify( inEditor ) );
		await ctx.close();

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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall icon box and nav panel checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
