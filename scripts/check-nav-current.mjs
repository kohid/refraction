#!/usr/bin/env node
/**
 * Nav Menu: the current page's item, and the logo per view (0.132.0, SQLite test site, Chromium).
 *
 * - With the element cache on (the default), a Nav Menu in a Theme Builder header for the whole site marks the item of
 *   the page being viewed (`.current-menu-item`, `aria-current`) on every page, whichever page was visited first: Home,
 *   About (a page item), Services (a custom link) and Contact. Share Buttons in the same header share the page being
 *   viewed.
 * - Content > Logo or Site Title > Visible, per view: shown on desktop, hidden from 430 (and 393, which has no choice
 *   of its own), shown again at 375; in Edit Mode a choice made at 393 hides it in the 393 preview only, and the
 *   control has the device switcher.
 *
 * Usage: node scripts/check-nav-current.mjs [--site /tmp/rf-fresh-9382] [--port 9382] [--shots DIR]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fresh-9382' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/nav-current-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
};
const wp = ( args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8' } ).trim();
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

// Pages, a menu of page items and custom links, and a site-wide header with the Nav Menu (logo hidden from 430 to
// 393) and Share Buttons. A page with the same Nav Menu for Edit Mode.
const SEED = `<?php
$ids = [];
foreach ( [ 'Home', 'About', 'Services', 'Contact', 'Editor' ] as $t ) {
	$ids[ $t ] = wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $t ] );
}
update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $ids['Home'] );
$menu = wp_create_nav_menu( 'Main ' . wp_generate_password( 4, false ) );
$add = static function ( array $args ) use ( $menu ) {
	wp_update_nav_menu_item( $menu, 0, $args + [ 'menu-item-status' => 'publish' ] );
};
$add( [ 'menu-item-object-id' => $ids['Home'], 'menu-item-object' => 'page', 'menu-item-type' => 'post_type', 'menu-item-title' => 'Home' ] );
$add( [ 'menu-item-object-id' => $ids['About'], 'menu-item-object' => 'page', 'menu-item-type' => 'post_type' ] );
$add( [ 'menu-item-type' => 'custom', 'menu-item-url' => get_permalink( $ids['Services'] ), 'menu-item-title' => 'Services' ] );
$add( [ 'menu-item-object-id' => $ids['Contact'], 'menu-item-object' => 'page', 'menu-item-type' => 'post_type' ] );
$nav = [ 'id' => 'nv1', 'elType' => 'widget', 'widgetType' => 'refraction-nav-menu', 'settings' => [
	'menu' => (string) $menu, 'bar_brand' => 'text', 'bar_brand_text' => 'Brand', 'bar_brand_visible_phone_md' => 'hide', 'bar_brand_visible_phone_xs' => 'show', 'collapse' => 'none',
], 'elements' => [] ];
$share = [ 'id' => 'sh1', 'elType' => 'widget', 'widgetType' => 'refraction-share-buttons', 'settings' => [], 'elements' => [] ];
$h = wp_insert_post( [ 'post_type' => 'refraction_library', 'post_status' => 'publish', 'post_title' => 'Site header' ] );
update_post_meta( $h, '_refraction_edit_mode', 'builder' );
update_post_meta( $h, '_refraction_template_type', 'header' );
wp_set_object_terms( $h, 'header', 'refraction_library_type' );
update_post_meta( $h, '_refraction_data', wp_slash( wp_json_encode( [ [ 'id' => 'hc1', 'elType' => 'container', 'settings' => [], 'elements' => [ $nav, $share ] ] ] ) ) );
( new Refraction\\Modules\\ThemeBuilder\\Classes\\Conditions_Store() )->save_rules( $h, 'header', [ 'include/general' ] );
$e = $ids['Editor'];
update_post_meta( $e, '_refraction_edit_mode', 'builder' );
update_post_meta( $e, '_refraction_template_type', 'wp-page' );
update_post_meta( $e, '_refraction_data', wp_slash( wp_json_encode( [ [ 'id' => 'ec1', 'elType' => 'container', 'settings' => [], 'elements' => [ array_merge( $nav, [ 'id' => 'nv2', 'settings' => array_diff_key( $nav['settings'], [ 'bar_brand_visible_phone_md' => 1, 'bar_brand_visible_phone_xs' => 1 ] ) ] ) ] ] ] ) ) );
echo wp_json_encode( [ 'ids' => $ids, 'urls' => array_map( 'get_permalink', $ids ), 'cache' => get_option( 'refraction_element_cache_ttl', '' ) ] );
`;

async function main() {
	mkdirSync( SHOTS, { recursive: true } );
	const seedFile = join( tmpdir(), `nav-current-seed-${ process.pid }.php` );
	writeFileSync( seedFile, SEED );
	const seed = JSON.parse( wp( [ 'eval-file', seedFile ] ) );
	const { urls } = seed;

	check( 'setup', 'the element cache is on (the default)', 'disable' !== seed.cache, seed.cache );

	const browser = await chromium.launch( existsSync( '/opt/pw-browsers/chromium' ) ? { executablePath: '/opt/pw-browsers/chromium', args: [ '--no-sandbox' ] } : {} );
	const errors = [];

	try {
		// ------------------------------------------------------- current item
		const ctx = await browser.newContext( { viewport: { width: 1280, height: 900 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );

		for ( const [ page, label ] of [ [ 'Home', 'Home' ], [ 'About', 'About' ], [ 'Services', 'Services' ], [ 'Contact', 'Contact' ], [ 'Home', 'Home' ] ] ) {
			await p.goto( urls[ page ] );
			const got = await p.evaluate( () => {
				const nav = document.querySelector( '.refraction-location-header .refraction-nav-menu, header .refraction-nav-menu, .refraction-nav-menu' );
				const current = [ ...nav.querySelectorAll( '.current-menu-item > .refraction-nav-menu__link' ) ].map( ( a ) => a.textContent.trim() );
				const aria = [ ...nav.querySelectorAll( '[aria-current="page"]' ) ].map( ( a ) => a.textContent.trim() );
				const share = document.querySelector( '.refraction-share__button--facebook, [class*="refraction-share__button"]' )?.getAttribute( 'href' ) || '';
				return { current, aria, share: decodeURIComponent( share ) };
			} );
			check( 'current', `on ${ page } the header menu marks ${ label } only`, 1 === got.current.length && label === got.current[ 0 ] && label === got.aria[ 0 ], JSON.stringify( got ) );
			if ( 'Home' !== page ) {
				check( 'share', `Share Buttons in the header share ${ page }`, got.share.includes( urls[ page ] ), got.share );
			}
		}
		await p.screenshot( { path: join( SHOTS, 'home-header.png' ) } );

		// ------------------------------------------------------- logo per view
		const brand = {};

		for ( const width of [ 1200, 480, 430, 393, 375 ] ) {
			await p.setViewportSize( { width, height: 800 } );
			await p.goto( urls.About );
			brand[ width ] = await p.evaluate( () => {
				const el = document.querySelector( '.refraction-nav-menu__bar-brand:not(.refraction-nav-menu__bar-brand--collapsed):not(.refraction-nav-menu__bar-brand--middle)' );
				return el ? getComputedStyle( el ).display : 'missing';
			} );
		}
		check( 'logo', 'Visible per view: shown on desktop and 480, hidden at 430 and 393, shown again at 375', 'flex' === brand[ 1200 ] && 'flex' === brand[ 480 ] && 'none' === brand[ 430 ] && 'none' === brand[ 393 ] && 'flex' === brand[ 375 ], JSON.stringify( brand ) );
		await ctx.close();

		// ------------------------------------------------------------ editor
		const ectx = await browser.newContext( { viewport: { width: 1440, height: 1000 } } );
		const e = await ectx.newPage();
		e.on( 'pageerror', ( err ) => errors.push( err.message ) );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ seed.ids.Editor }&action=refraction`, { timeout: 120000 } );
		await e.waitForFunction( () => window.refraction && window.$e && refraction.documents?.getCurrent() && document.querySelector( '#refraction-preview-iframe' ), null, { timeout: 120000 } );
		await sleep( 2500 );
		const shown = () => e.evaluate( () => {
			const el = document.getElementById( 'refraction-preview-iframe' ).contentDocument.querySelector( '.refraction-element-nv2 .refraction-nav-menu__bar-brand' );
			return el ? getComputedStyle( el ).display : 'missing';
		} );

		await e.evaluate( () => {
			const c = refraction.getContainer( 'nv2' );
			$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
			refraction.changeDeviceMode( 'phone_sm' );
		} );
		await sleep( 1500 );
		await e.evaluate( () => {
			const page = refraction.getPanelView().getCurrentPageView();
			page.activateSection( 'section_bar_brand' );
			page._renderChildren();
		} );
		await sleep( 800 );
		const control = await e.evaluate( () => {
			const el = document.querySelector( '.refraction-control-bar_brand_visible_phone_sm' );
			return el && { shown: !! el.offsetParent, device: !! el.querySelector( '.refraction-control-responsive-switchers' ) };
		} );
		check( 'editor', 'at 393 Logo or Site Title > Visible has its own 393 control with the device switcher', control && control.shown && control.device, JSON.stringify( control ) );
		const before = await shown();
		await e.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'nv2' ), settings: { bar_brand_visible_phone_sm: 'hide' } } ) );
		await sleep( 900 );
		const at393 = await shown();
		await e.screenshot( { path: join( SHOTS, 'editor-393.png' ) } );
		await e.evaluate( () => refraction.changeDeviceMode( 'phone_md' ) );
		await sleep( 1300 );
		const at430 = await shown();
		await e.evaluate( () => refraction.changeDeviceMode( 'desktop' ) );
		await sleep( 1300 );
		const atDesktop = await shown();
		check( 'editor', 'hiding it at 393 shows at once in the 393 preview only (430 and desktop keep it)', 'flex' === before && 'none' === at393 && 'flex' === at430 && 'flex' === atDesktop, JSON.stringify( { before, at393, at430, atDesktop } ) );
		await ectx.close();

		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall nav current checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( err ) => {
	console.error( err );
	process.exit( 1 );
} );
