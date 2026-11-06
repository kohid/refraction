#!/usr/bin/env node
/**
 * The editor's views: Desktop, 1024, 820, 768, 480, 430, 393 and 375px (SQLite test site, Chromium).
 * - An existing site's saved devices list gets the new views once (and keeps a device turned off afterwards).
 * - The top bar offers the eight views with their widths; each opens the preview at its width; a widget's responsive
 *   setting has a value per view (the device picker lists them with their widths).
 * - On the site each width gets its own value, smaller views fall back to the next larger one, "Hide on" works per
 *   phone view, "Hide on Mobile" still hides on phones, and the device mode is reported per view.
 * - Motion effect device lists saved before keep their meaning.
 *
 * Usage: node scripts/check-devices.mjs [--site /tmp/rf-dev-site] [--port 8895] [--shots /tmp/devices-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-dev-site' );
const PORT = arg( 'port', '8895' );
const SHOTS = arg( 'shots', '/tmp/devices-shots' );
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
const php = ( code ) => wp( [ 'eval', code ] ).trim();
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

const VIEWS = [ 'tablet', 'mobile_extra', 'mobile', 'phone_lg', 'phone_md', 'phone_sm', 'phone_xs' ];
const WIDTHS = { tablet: 1024, mobile_extra: 820, mobile: 768, phone_lg: 480, phone_md: 430, phone_sm: 393, phone_xs: 375 };

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

	try {
		// ------------------------------------------------------------ an existing site's saved devices list
		const kit = php( 'echo Refraction\\Plugin::$instance->kits_manager->get_active_id();' );
		php( `$s = get_post_meta( ${ kit }, '_refraction_page_settings', true ); $s = is_array( $s ) ? $s : []; $s['active_breakpoints'] = [ 'viewport_mobile', 'viewport_tablet', 'viewport_laptop' ]; unset( $s['refraction_devices_version'] ); update_post_meta( ${ kit }, '_refraction_page_settings', $s );` );
		const list = php( 'echo implode( ",", Refraction\\Plugin::$instance->breakpoints->get_active_devices_list( [ "reverse" => true ] ) );' );
		check( 'upgrade', 'a saved devices list gets the new views once, keeping its own (laptop)', 'laptop,desktop,tablet,mobile_extra,mobile,phone_lg,phone_md,phone_sm,phone_xs' === list.replace( 'desktop,laptop', 'laptop,desktop' ) || 'desktop,laptop,tablet,mobile_extra,mobile,phone_lg,phone_md,phone_sm,phone_xs' === list, list );
		php( `$s = get_post_meta( ${ kit }, '_refraction_page_settings', true ); $s['active_breakpoints'] = array_values( array_diff( $s['active_breakpoints'], [ 'viewport_phone_md', 'viewport_laptop' ] ) ); update_post_meta( ${ kit }, '_refraction_page_settings', $s );` );
		const after = php( 'echo implode( ",", Refraction\\Plugin::$instance->breakpoints->get_active_devices_list() );' );
		check( 'upgrade', 'a view turned off afterwards stays off', ! /phone_md|laptop/.test( after ) && /phone_xs/.test( after ), after );
		php( `$s = get_post_meta( ${ kit }, '_refraction_page_settings', true ); unset( $s['active_breakpoints'] ); update_post_meta( ${ kit }, '_refraction_page_settings', $s ); Refraction\\Core\\Breakpoints\\Manager::compile_stylesheet_templates(); Refraction\\Plugin::$instance->files_manager->clear_cache();` );
		const defaults = php( 'echo implode( ",", Refraction\\Plugin::$instance->breakpoints->get_active_devices_list( [ "reverse" => true ] ) );' );
		check( 'devices', 'by default: Desktop, 1024, 820, 768, 480, 430, 393, 375', 'desktop,tablet,mobile_extra,mobile,phone_lg,phone_md,phone_sm,phone_xs' === defaults, defaults );
		const values = php( 'foreach ( Refraction\\Plugin::$instance->breakpoints->get_active_breakpoints() as $k => $b ) { echo $k, "=", $b->get_value(), " "; }' );
		check( 'devices', 'their widths', 'phone_xs=375 phone_sm=393 phone_md=430 phone_lg=480 mobile=768 mobile_extra=820 tablet=1024' === values.trim(), values );

		// ------------------------------------------------------------ a page with a value per view
		const settings = { title: 'Hello views', align: 'left', align_tablet: 'center', align_mobile: 'right', align_phone_xs: 'center' };
		const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Views', '--porcelain' ] ).trim();
		const data = [ { id: 'c001', elType: 'container', isInner: false, settings: {}, elements: [
			{ id: 'h001', elType: 'widget', widgetType: 'heading', settings, elements: [] },
			{ id: 'h002', elType: 'widget', widgetType: 'heading', settings: { title: 'Hidden on 430', hide_phone_md: 'hidden-phone_md' }, elements: [] },
			{ id: 'h003', elType: 'widget', widgetType: 'heading', settings: { title: 'Hidden on mobile', hide_mobile: 'hidden-mobile' }, elements: [] },
		] } ];
		for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
			wp( [ 'post', 'meta', 'update', id, k, v ] );
		}
		const url = `${ BASE }/?page_id=${ id }`;
		const at = {};
		for ( const width of [ 1280, 1024, 900, 820, 768, 600, 480, 430, 393, 375, 360 ] ) {
			const p = await ( await browser.newContext( { viewport: { width, height: 800 } } ) ).newPage();
			watch( p );
			await p.goto( url );
			at[ width ] = await p.evaluate( () => {
				const shown = ( id ) => { const el = document.querySelector( `[data-id="${ id }"]` ); return !! el && 'none' !== getComputedStyle( el ).display; };
				return { align: getComputedStyle( document.querySelector( '[data-id="h001"] .refraction-heading-title' ) ).textAlign, h430: shown( 'h002' ), hMobile: shown( 'h003' ), mode: document.body.getAttribute( 'data-refraction-device-mode' ) };
			} );
			await p.context().close();
		}
		// Computed text-align reads start / end for left / right.
		const aligns = Object.fromEntries( Object.entries( at ).map( ( [ w, v ] ) => [ w, { start: 'left', end: 'right' }[ v.align ] || v.align ] ) );
		check( 'site', 'each width gets its value; smaller views fall back to the next larger one', 'left' === aligns[ 1280 ] && 'center' === aligns[ 1024 ] && 'center' === aligns[ 820 ] && 'right' === aligns[ 768 ] && 'right' === aligns[ 480 ] && 'right' === aligns[ 393 ] && 'center' === aligns[ 375 ] && 'center' === aligns[ 360 ], JSON.stringify( aligns ) );
		check( 'site', '"Hide on 430" hides only from 394 to 430px', ! at[ 430 ].h430 && at[ 393 ].h430 && at[ 480 ].h430 && at[ 375 ].h430, JSON.stringify( Object.fromEntries( Object.entries( at ).map( ( [ w, v ] ) => [ w, v.h430 ] ) ) ) );
		check( 'site', '"Hide on Mobile" still hides on phones too (as before), not on 820', ! at[ 768 ].hMobile && ! at[ 480 ].hMobile && ! at[ 375 ].hMobile && at[ 820 ].hMobile && at[ 1280 ].hMobile, JSON.stringify( Object.fromEntries( Object.entries( at ).map( ( [ w, v ] ) => [ w, v.hMobile ] ) ) ) );
		const modes = Object.fromEntries( Object.entries( at ).map( ( [ w, v ] ) => [ w, v.mode ] ) );
		check( 'site', 'the device mode is reported per view', 'desktop' === modes[ 1280 ] && 'tablet' === modes[ 1024 ] && 'mobile_extra' === modes[ 820 ] && 'mobile' === modes[ 768 ] && 'phone_lg' === modes[ 480 ] && 'phone_md' === modes[ 430 ] && 'phone_sm' === modes[ 393 ] && 'phone_xs' === modes[ 375 ], JSON.stringify( modes ) );

		// ------------------------------------------------------------ the editor
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000 } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
		await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2500 );
		const tabs = await p.evaluate( () => [ ...document.querySelectorAll( '[data-testid^="switch-device-to-"]' ) ].map( ( t ) => t.getAttribute( 'data-testid' ).replace( 'switch-device-to-', '' ) + ':' + t.textContent.trim() ) );
		check( 'editor', 'the top bar offers the eight views with their widths', 'desktop:,tablet:1024,mobile_extra:820,mobile:768,phone_lg:480,phone_md:430,phone_sm:393,phone_xs:375' === tabs.join( ',' ), tabs.join( ',' ) );
		await p.screenshot( { path: join( SHOTS, 'top-bar.png' ), clip: { x: 0, y: 0, width: 1500, height: 60 } } );

		const previewWidths = {};
		for ( const view of VIEWS ) {
			await p.click( `[data-testid="switch-device-to-${ view }"]` );
			await sleep( 900 );
			previewWidths[ view ] = await p.evaluate( () => Math.round( document.querySelector( '#refraction-preview-iframe' ).getBoundingClientRect().width / ( parseFloat( getComputedStyle( document.querySelector( '#refraction-preview-responsive-wrapper' ) ).getPropertyValue( '--e-preview-scale' ) ) || 1 ) ) );
		}
		check( 'editor', 'each view opens the preview at its own width', VIEWS.every( ( v ) => Math.abs( previewWidths[ v ] - WIDTHS[ v ] ) <= 1 ), JSON.stringify( previewWidths ) );
		const frame = p.frame( { name: 'refraction-preview-iframe' } );
		check( 'editor', 'the 375px view shows its own value (center)', 'center' === await frame.evaluate( () => getComputedStyle( document.querySelector( '[data-id="h001"] .refraction-heading-title' ) ).textAlign ) );
		await p.screenshot( { path: join( SHOTS, 'editor-375.png' ) } );

		// The heading's Alignment: a value per view, picked from the device picker.
		await frame.click( '[data-id="h001"]' );
		await sleep( 1200 );
		await p.click( '.refraction-tab-control-style' );
		await sleep( 800 );
		const control = p.locator( '.refraction-control-align_phone_xs' ).first(); // the editor is on the 375px view
		const picker = await control.evaluate( ( el ) => [ ...el.querySelectorAll( '.refraction-responsive-switcher' ) ].map( ( b ) => b.getAttribute( 'data-device' ) + ':' + ( b.querySelector( '.refraction-responsive-switcher__width' )?.textContent || '' ) ) );
		check( 'widget settings', 'a responsive setting has the eight views in its device picker, with their widths', 'desktop:,tablet:1024,mobile_extra:820,mobile:768,phone_lg:480,phone_md:430,phone_sm:393,phone_xs:375' === picker.join( ',' ), picker.join( ',' ) );
		await control.locator( '.refraction-control-responsive-switchers' ).first().click();
		await sleep( 400 );
		const box = await control.locator( '.refraction-control-responsive-switchers__holder' ).first().boundingBox();
		await p.screenshot( { path: join( SHOTS, 'device-picker.png' ), clip: { x: Math.max( 0, box.x - 120 ), y: Math.max( 0, box.y - 10 ), width: 300, height: Math.min( 420, box.height + 30 ) } } );
		await control.locator( '.refraction-responsive-switcher-phone_sm' ).click();
		await sleep( 800 );
		const phoneSm = await p.evaluate( () => ( { mode: refraction.channels.deviceMode.request( 'currentMode' ), controls: [ ...document.querySelectorAll( '.refraction-control-align_phone_sm' ) ].filter( ( el ) => el.offsetParent ).length } ) );
		check( 'widget settings', 'choosing 393 in the picker switches the editor to it and shows that view\'s Alignment', 'phone_sm' === phoneSm.mode && 1 === phoneSm.controls, JSON.stringify( phoneSm ) );
		await ctx.close();

		// ------------------------------------------------------------ motion effects chosen before the new views
		const legacy = php( 'echo implode( ",", Refraction\\Modules\\MotionEffects\\Classes\\Pure_Motion_Settings::devices( [ "rf_sticky_on" => [ "desktop", "tablet", "mobile" ] ], "rf_sticky_on", [ "desktop", "tablet", "mobile_extra", "mobile", "phone_lg", "phone_md", "phone_sm", "phone_xs" ], [] ) );' );
		check( 'motion', 'a device list saved as Desktop/Tablet/Mobile also covers 820 and the phones', 'desktop,tablet,mobile_extra,mobile,phone_lg,phone_md,phone_sm,phone_xs' === legacy, legacy );
		const chosen = php( 'echo implode( ",", Refraction\\Modules\\MotionEffects\\Classes\\Pure_Motion_Settings::devices( [ "rf_sticky_on" => [ "desktop", "mobile", "phone_xs" ] ], "rf_sticky_on", [ "desktop", "tablet", "mobile_extra", "mobile", "phone_lg", "phone_md", "phone_sm", "phone_xs" ], [] ) );' );
		check( 'motion', 'a list naming a new view is taken as it is', 'desktop,mobile,phone_xs' === chosen, chosen );

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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall device checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
