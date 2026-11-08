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
			{ id: 'ib03', elType: 'widget', widgetType: 'icon-box', settings: { title_text: 'Default title' }, elements: [] },
			{ id: 'ib04', elType: 'widget', widgetType: 'icon-box', settings: {
				title_text: 'Arranged', icons_layout: 'free', icons_area_width: { unit: 'px', size: 120 }, icons_area_height: { unit: 'px', size: 100 },
				main_icon_pos_x: { unit: 'px', size: 30 }, main_icon_pos_y: { unit: 'px', size: 40 }, main_icon_layer: 1,
				more_icons: [ { _id: 'ar1', icon: { value: 'fas fa-car', library: 'fa-solid' }, pos_x: { unit: 'px', size: 70 }, pos_y: { unit: 'px', size: 75 }, size: { unit: 'px', size: 40 }, color: '#00AA00', turn: { unit: 'px', size: 20 }, layer: 3 } ],
			}, elements: [] },
			{ id: 'ib06', elType: 'widget', widgetType: 'icon-box', settings: {
				title_text: 'Each its own', view: 'stacked', primary_color: '#333333',
				main_icon_background: '#FF8800', main_icon_size: { unit: 'px', size: 30 },
				more_icons: [
					{ _id: 'own1', icon: { value: 'fas fa-car', library: 'fa-solid' }, color: '#FFFFFF', background: '#0055FF', border_color: '#00FF00', border_width: { unit: 'px', size: 3 }, padding: { unit: 'px', size: 12 }, radius: { unit: '%', top: '50', right: '50', bottom: '50', left: '50', isLinked: true }, rotate: { unit: 'px', size: 45 }, opacity: { unit: 'px', size: 0.6 }, shadow_box_shadow_type: 'yes', shadow_box_shadow: { horizontal: 0, vertical: 4, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)' }, hover_background: '#FF0000', animation: 'spin', animation_duration: { unit: 'px', size: 2000 } },
					{ _id: 'own2', icon: { value: 'fas fa-phone', library: 'fa-solid' } },
				],
			}, elements: [] },
			{ id: 'ib07', elType: 'widget', widgetType: 'icon-box', settings: {
				title_text: 'Phosphor and hover', icons_hover_on: 'icon', selected_icon: { value: 'rf-ph rf-ph-car', library: 'phosphor-regular' },
				more_icons: [ { _id: 'hv1', icon: { value: 'rf-ph rf-ph-shield-check', library: 'phosphor-duotone' }, hover_color: '#FF0000', hover_scale: { unit: 'px', size: 1.3 }, hover_rotate: { unit: 'px', size: 90 }, hover_animation: 'pulse' } ],
			}, elements: [] },
			{ id: 'ib05', elType: 'widget', widgetType: 'icon-box', settings: { title_text: 'Corporate', description_text: 'Inverness Taxis, with over 60 years of service in the Highlands, offers tailored corporate transportation solutions designed to meet the needs of every business, large or small, every day of the year.', box_description_display: 'clamp', box_description_lines: 2, box_description_full_tooltip: 'yes', box_button_text: 'Learn more', box_button_link: { url: '#corporate' }, box_button_style: 'outline' }, elements: [] },
			{ id: 'mb02', elType: 'widget', widgetType: 'image-box', settings: { title_text: 'Safe transfers', description_text: 'We are dedicated to offering safe transfer to give you peace of mind on each and every journey 24/7.', box_description_display: 'tooltip', box_button_text: 'Book now', box_button_link: { url: '#book' }, image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` } }, elements: [] },
			{ id: 'mb01', elType: 'widget', widgetType: 'image-box', settings: { title_text: 'Our cars', title_margin: zero, image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` } }, elements: [] },
			filler,
			{ id: 'ib02', elType: 'widget', widgetType: 'icon-box', settings: { title_text: 'Later', icons_animation: 'fade-in', icons_animation_trigger: 'view' }, elements: [] },
		] );
		const b = await at( boxes.url, 1280 );
		const box = await b.evaluate( () => {
			const icons = [ ...document.querySelectorAll( '[data-id="ib01"] .refraction-icon-box-icon .refraction-icon' ) ];
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
				defaultTitle: getComputedStyle( document.querySelector( '[data-id="ib03"] .refraction-icon-box-title' ) ).marginTop,
				arranged: ( () => {
					const area = document.querySelector( '[data-id="ib04"] .refraction-icon-box-icons-area' ).getBoundingClientRect();
					const center = ( el ) => {
						const r = el.getBoundingClientRect(); return [ Math.round( ( r.left + r.width / 2 - area.left ) / area.width * 100 ), Math.round( ( r.top + r.height / 2 - area.top ) / area.height * 100 ) ];
					};
					const main = document.querySelector( '[data-id="ib04"] .refraction-icon-box-icons-area > .refraction-icon:first-child' );
					const car = document.querySelector( '[data-id="ib04"] .refraction-repeater-item-ar1' );
					return { area: [ Math.round( area.width ), Math.round( area.height ) ], main: center( main ), car: center( car ), carColor: getComputedStyle( car ).color, carSize: getComputedStyle( car ).fontSize, carRotate: getComputedStyle( car ).rotate, carZ: getComputedStyle( car ).zIndex };
				} )(),
				laterBefore: getComputedStyle( document.querySelector( '[data-id="ib02"] .refraction-icon-box-icon .refraction-icon' ) ).opacity,
			};
		} );
		check( 'icon box', 'the main icon and four more, in a row with the space between them, following the box alignment (center)', 5 === box.count && '18px' === box.gap && box.centered, JSON.stringify( box ) );
		check( 'icon box', 'an icon with its own color and link', 'rgb(255, 0, 0)' === box.red && '#map' === box.link, JSON.stringify( box ) );
		check( 'icon box', 'the animation plays on every icon, each 200 ms after the one before', box.anim.every( ( a, i ) => 'rf-ib-pulse' === a.split( '@' )[ 0 ] && Math.abs( parseFloat( a.split( '@' )[ 1 ] ) - i * 0.2 ) < 0.001 ), box.anim.join() );
		check( 'titles', 'the Margin control removes the title margin (Icon Box and Image Box)', '0px,0px' === box.titleMargin.join() && '0px,0px' === box.imageTitleMargin.join(), JSON.stringify( [ box.titleMargin, box.imageTitleMargin ] ) );
		check( 'titles', 'by default the Icon Box title has no margin (the theme\'s heading margin does not show)', '0px' === box.defaultTitle, box.defaultTitle );
		const ar = box.arranged;
		check( 'arrange', 'arranged freely: the area has its size, each icon sits on its point with its size, color, turn and layer', '120,100' === ar.area.join() && Math.abs( ar.main[ 0 ] - 30 ) <= 3 && Math.abs( ar.main[ 1 ] - 40 ) <= 3 && Math.abs( ar.car[ 0 ] - 70 ) <= 3 && Math.abs( ar.car[ 1 ] - 75 ) <= 3 && 'rgb(0, 170, 0)' === ar.carColor && '40px' === ar.carSize && '20deg' === ar.carRotate && '3' === ar.carZ, JSON.stringify( ar ) );
		const own = await b.evaluate( () => {
			const q = ( sel ) => document.querySelector( '[data-id="ib06"] ' + sel );
			const main = q( '.refraction-icon--main' ),
				car = q( '.refraction-repeater-item-own1' ),
				phone = q( '.refraction-repeater-item-own2' );
			const cs = getComputedStyle( car );
			return {
				main: [ getComputedStyle( main ).backgroundColor, getComputedStyle( main ).fontSize ],
				phone: getComputedStyle( phone ).backgroundColor,
				car: [ cs.backgroundColor, cs.color, cs.borderTopWidth, cs.borderTopColor, cs.paddingTop, cs.borderTopLeftRadius, getComputedStyle( car.firstElementChild ).rotate, cs.opacity, 'none' !== cs.boxShadow, cs.animationName, cs.animationDuration ],
				phoneAnim: getComputedStyle( phone ).animationName,
			};
		} );
		check( 'own style', 'the main icon has its own background and size; an icon without its own takes Style > Icon', 'rgb(255, 136, 0)' === own.main[ 0 ] && '30px' === own.main[ 1 ] && 'rgb(51, 51, 51)' === own.phone, JSON.stringify( own ) );
		check( 'own style', 'a More Icon has its own colors, border, padding, shape, turn, opacity, shadow and animation', 'rgb(0, 85, 255),rgb(255, 255, 255),3px,rgb(0, 255, 0),12px,50%,45deg,0.6,true,rf-ib-spin,2s' === own.car.join() && 'none' === own.phoneAnim, JSON.stringify( own ) );
		await b.hover( '[data-id="ib06"] .refraction-icon-box-title' );
		await sleep( 500 );
		const ownHover = await b.evaluate( () => [ getComputedStyle( document.querySelector( '[data-id="ib06"] .refraction-repeater-item-own1' ) ).backgroundColor, getComputedStyle( document.querySelector( '[data-id="ib06"] .refraction-icon--main' ) ).backgroundColor ] );
		check( 'own style', 'and its own hover color while the box is hovered (the main icon keeps its own)', 'rgb(255, 0, 0),rgb(255, 136, 0)' === ownHover.join(), ownHover.join( ' ' ) );
		await b.mouse.move( 5, 5 );
		await b.locator( '[data-id="ib06"]' ).screenshot( { path: join( SHOTS, 'own-style.png' ) } );
		// Phosphor icons, and the Hover tab started by the icon itself.
		const hv = () => b.evaluate( () => {
			const icon = document.querySelector( '[data-id="ib07"] .refraction-repeater-item-hv1' );
			const mainIcon = document.querySelector( '[data-id="ib07"] .refraction-icon--main' );
			const cs = getComputedStyle( icon );
			const svg = mainIcon.querySelector( 'svg' );
			return { scale: cs.scale, rotate: getComputedStyle( icon.firstElementChild ).rotate, anim: cs.animationName, color: cs.color, mainScale: getComputedStyle( mainIcon ).scale, mainSvg: svg ? [ svg.getAttribute( 'viewBox' ), Math.round( svg.getBoundingClientRect().width ), !! svg.querySelector( 'path' ) ] : null, duo: !! icon.querySelector( '.rf-duo-f' ), classes: icon.firstElementChild?.className };
		} );
		const hv0 = await hv();
		check( 'phosphor', 'Phosphor icons on the site: inline SVG (256 grid) with a size, the Duotone weight with its second layer', hv0.mainSvg && '0 0 256 256' === hv0.mainSvg[ 0 ] && hv0.mainSvg[ 1 ] > 20 && hv0.mainSvg[ 2 ] && hv0.duo && /rf-ph/.test( hv0.classes ), JSON.stringify( hv0 ) );
		await b.hover( '[data-id="ib07"] .refraction-icon-box-title' );
		await sleep( 500 );
		const hvBox = await hv();
		check( 'own hover', 'with "the icon itself", hovering the box does not start an icon\'s Hover', 'none' === hvBox.scale && 'none' === hvBox.anim, JSON.stringify( hvBox ) );
		await b.hover( '[data-id="ib07"] .refraction-repeater-item-hv1' );
		await sleep( 600 );
		const hv1 = await hv();
		check( 'own hover', 'hovering the icon: its Hover tab\'s color, scale, rotate and hover animation; the main icon is left alone', '1.3' === hv1.scale && '90deg' === hv1.rotate && 'rf-ib-pulse' === hv1.anim && 'rgb(255, 0, 0)' === hv1.color && 'none' === hv1.mainScale, JSON.stringify( hv1 ) );
		await b.mouse.move( 5, 5 );
		await sleep( 600 );
		const hv2 = await hv();
		check( 'own hover', 'and back to normal when the pointer leaves', 'none' === hv2.scale && 'none' === hv2.anim, JSON.stringify( hv2 ) );
		check( 'icon box', 'with "when it comes into view", the icon waits hidden', '0' === box.laterBefore, box.laterBefore );
		// The button, the description cut to two lines with its full text on hover, and the description as a tooltip.
		const extras = await b.evaluate( () => {
			const desc = document.querySelector( '[data-id="ib05"] .refraction-icon-box-description' );
			const lh = parseFloat( getComputedStyle( desc ).lineHeight );
			const btn = document.querySelector( '[data-id="ib05"] .refraction-box-button' );
			const tip = document.querySelector( '[data-id="mb02"] .refraction-box-tooltip' );
			return {
				lines: Math.round( desc.getBoundingClientRect().height / lh ), cut: desc.scrollHeight > desc.clientHeight,
				button: [ btn?.textContent.trim(), btn?.getAttribute( 'href' ), btn?.classList.contains( 'refraction-box-button--outline' ) ],
				imageButton: document.querySelector( '[data-id="mb02"] .refraction-box-button' )?.getAttribute( 'href' ),
				tipHidden: getComputedStyle( tip ).opacity,
				fullHidden: getComputedStyle( document.querySelector( '[data-id="ib05"] .refraction-box-tooltip--full' ) ).visibility,
			};
		} );
		check( 'box extras', 'the description cut to two lines', 2 === extras.lines && extras.cut, JSON.stringify( extras ) );
		check( 'box extras', 'a button under the text (Icon Box outline, Image Box)', 'Learn more' === extras.button[ 0 ] && '#corporate' === extras.button[ 1 ] && extras.button[ 2 ] && '#book' === extras.imageButton, JSON.stringify( extras ) );
		check( 'box extras', 'the tooltips wait hidden', '0' === extras.tipHidden && 'hidden' === extras.fullHidden, JSON.stringify( extras ) );
		await b.hover( '[data-id="mb02"] .refraction-image-box-title' );
		await sleep( 400 );
		const tipShown = await b.evaluate( () => {
			const t = document.querySelector( '[data-id="mb02"] .refraction-box-tooltip' ); const box = document.querySelector( '[data-id="mb02"] .refraction-image-box-wrapper' ).getBoundingClientRect(); const r = t.getBoundingClientRect(); return { opacity: getComputedStyle( t ).opacity, below: r.top >= box.bottom, text: t.textContent.trim().slice( 0, 30 ), color: getComputedStyle( t ).color };
		} );
		check( 'box extras', 'hovering the Image Box shows its description as a tooltip under it', '1' === tipShown.opacity && tipShown.below && /We are dedicated/.test( tipShown.text ) && 'rgb(255, 255, 255)' === tipShown.color, JSON.stringify( tipShown ) );
		await b.screenshot( { path: join( SHOTS, 'tooltip.png' ), fullPage: false } );
		await b.hover( '[data-id="ib05"] .refraction-icon-box-title' );
		await sleep( 400 );
		const full = await b.evaluate( () => {
			const t = document.querySelector( '[data-id="ib05"] .refraction-box-tooltip--full' ); return { opacity: getComputedStyle( t ).opacity, text: /every day of the year/.test( t.textContent ) };
		} );
		check( 'box extras', 'hovering the cut description shows the full text', '1' === full.opacity && full.text, JSON.stringify( full ) );
		await b.locator( '[data-id="ib02"]' ).scrollIntoViewIfNeeded();
		await sleep( 1800 );
		const later = await b.evaluate( () => ( { visible: document.querySelector( '[data-id="ib02"]' ).classList.contains( 'is-visible' ), name: getComputedStyle( document.querySelector( '[data-id="ib02"] .refraction-icon-box-icon .refraction-icon' ) ).animationName, opacity: getComputedStyle( document.querySelector( '[data-id="ib02"] .refraction-icon-box-icon .refraction-icon' ) ).opacity } ) );
		check( 'icon box', 'and fades in once it is seen', later.visible && 'rf-ib-fade-in' === later.name && '1' === later.opacity, JSON.stringify( later ) );
		await b.locator( '[data-id="ib04"]' ).scrollIntoViewIfNeeded();
		await b.locator( '[data-id="ib04"]' ).screenshot( { path: join( SHOTS, 'arranged.png' ) } );
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
		const inEditor = await p.frame( { name: 'refraction-preview-iframe' } ).evaluate( () => ( { count: document.querySelectorAll( '[data-id="ib01"] .refraction-icon-box-icon .refraction-icon' ).length, svg: !! document.querySelector( '[data-id="ib01"] .refraction-repeater-item-mi1 svg' ), buttons: document.querySelectorAll( '.refraction-box-button' ).length, tooltip: !! document.querySelector( '[data-id="mb02"] .refraction-box-tooltip' ), arranged: !! document.querySelector( '[data-id="ib04"] .refraction-icon-box-icons-area' ), ownBg: getComputedStyle( document.querySelector( '[data-id="ib06"] .refraction-repeater-item-own1' ) ).backgroundColor, mainBg: getComputedStyle( document.querySelector( '[data-id="ib06"] .refraction-icon--main' ) ).backgroundColor } ) );
		check( 'editor', 'the editor draws the five icons (the Solar one as SVG), the arranged icons, the buttons and the tooltip', 5 === inEditor.count && inEditor.svg && 2 === inEditor.buttons && inEditor.tooltip && inEditor.arranged, JSON.stringify( inEditor ) );
		check( 'editor', 'and each icon\'s own style', 'rgb(0, 85, 255)' === inEditor.ownBg && 'rgb(255, 136, 0)' === inEditor.mainBg, JSON.stringify( inEditor ) );
		// The panel: a More Icon's own settings (Normal / Hover tabs and the rest) and Style > Main Icon.
		await p.frame( { name: 'refraction-preview-iframe' } ).click( '[data-id="ib06"] .refraction-icon-box-title', { position: { x: 5, y: 5 } } );
		await p.waitForSelector( '.refraction-control-more_icons', { timeout: 20000 } );
		await p.click( '.refraction-control-more_icons .refraction-repeater-row-item-title >> nth=0' );
		await sleep( 800 );
		const row = await p.evaluate( () => {
			const r = document.querySelector( '.refraction-control-more_icons .refraction-repeater-fields-wrapper .refraction-repeater-fields' );
			const visible = ( sel ) => [ ...r.querySelectorAll( sel ) ].some( ( e ) => e.offsetParent );
			return { tabs: [ ...r.querySelectorAll( '.refraction-control-type-tab' ) ].filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ), color: visible( '.refraction-control-color' ), padding: visible( '.refraction-control-padding' ), shadow: visible( '.refraction-control-shadow_box_shadow_type' ), anim: visible( '.refraction-control-animation' ) };
		} );
		await p.screenshot( { path: join( SHOTS, 'own-panel.png' ) } );
		check( 'editor', 'a More Icon shows its own settings in the panel (Normal / Hover, padding, shadow, animation)', 'Normal,Hover' === row.tabs.join() && row.color && row.padding && row.shadow && row.anim, JSON.stringify( row ) );
		await p.click( '.refraction-tab-control-style' );
		await sleep( 600 );
		const sections = await p.evaluate( () => [ ...document.querySelectorAll( '.refraction-control-type-section .refraction-panel-heading-title' ) ].map( ( e ) => e.textContent.trim() ) );
		check( 'editor', 'Style has a Main Icon section', sections.includes( 'Main Icon' ), sections.join( ', ' ) );
		await p.click( '.refraction-tab-control-content' );
		// The icon previews in the panel draw SVG icons (Phosphor main icon, Phosphor duotone More Icon), and the Hover tab holds every setting.
		await p.frame( { name: 'refraction-preview-iframe' } ).click( '[data-id="ib07"] .refraction-icon-box-title', { position: { x: 5, y: 5 } } );
		await p.waitForSelector( '.refraction-control-selected_icon', { timeout: 20000 } );
		await p.click( '.refraction-control-more_icons .refraction-repeater-row-item-title >> nth=0' );
		await sleep( 1500 );
		const previews = await p.evaluate( () => [ ...document.querySelectorAll( '.refraction-control-type-icons .refraction-control-media__preview' ) ].filter( ( x ) => x.offsetParent ).slice( 0, 2 ).map( ( x ) => {
			const svg = x.querySelector( 'svg' ); return svg ? Math.round( svg.getBoundingClientRect().width ) : 0;
		} ) );
		check( 'editor', 'the Icon previews in the panel show the chosen SVG icons (main and More Icon)', 2 === previews.length && previews.every( ( w ) => w > 30 ), JSON.stringify( previews ) );
		await p.click( '.refraction-control-more_icons .refraction-repeater-fields .refraction-control-type-tab:has-text("Hover") >> nth=0' );
		await sleep( 500 );
		const hoverTab = await p.evaluate( () => {
			const r = document.querySelector( '.refraction-control-more_icons .refraction-repeater-fields' );
			const visible = ( name ) => [ ...r.querySelectorAll( '.refraction-control-' + name ) ].some( ( e ) => e.offsetParent );
			return [ 'hover_color', 'hover_background', 'hover_size', 'hover_padding', 'hover_border_width', 'hover_radius', 'hover_rotate', 'hover_scale', 'hover_opacity', 'hover_shadow_box_shadow_type', 'hover_animation' ].filter( ( n ) => ! visible( n ) );
		} );
		await p.screenshot( { path: join( SHOTS, 'hover-panel.png' ) } );
		check( 'editor', 'a More Icon\'s Hover tab has every setting (colors, size, padding, border, corners, rotate, scale, opacity, shadow, hover animation)', 0 === hoverTab.length, 'missing: ' + hoverTab.join() );
		const libs = await p.evaluate( () => ( window.refraction.config.icons?.libraries || [] ).map( ( l ) => l.name ).filter( ( n ) => n.startsWith( 'phosphor-' ) ) );
		check( 'editor', 'the icon library has the six Phosphor weights', 6 === libs.length, libs.join() );
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
