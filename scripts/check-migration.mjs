#!/usr/bin/env node
/**
 * Moving a site from the page builder Refraction comes from (SQLite test site, Chromium). The site gets that builder
 * and one of its add-ons from wordpress.org, pages and templates built with them, then:
 * - "Convert to Refraction" under a page converts it: same content, Refraction draws it (the other builder no longer),
 *   dynamic tags, global colors, popup links, template shortcodes and the global header come along; the add-on's
 *   widget is kept as HTML and named in the notice; the page opens in Refraction's editor;
 * - "Back to ..." undoes it; Refraction > Move from ... converts everything in batches;
 * - with the other builder and its add-on deactivated, the pages still show the same.
 *
 * Usage: node scripts/check-migration.mjs [--site /tmp/rf-mig-site] [--port 8870] [--shots /tmp/migration-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-mig-site' );
const PORT = arg( 'port', '8870' );
const SHOTS = arg( 'shots', '/tmp/migration-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
// The other builder's name, from parts (scripts/rename-to-refraction.mjs renames the plain word).
const UP = [ 'element', 'or' ].join( '' );
const UPL = UP[ 0 ].toUpperCase() + UP.slice( 1 );
const ADDON = 'essential-addons-for-' + UP + '-lite';

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

/** A post with the other builder's data (its own format). */
function built( type, title, elements, extra = {} ) {
	const id = wp( [ 'post', 'create', `--post_type=${ type }`, '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	const meta = { [ `_${ UP }_edit_mode` ]: 'builder', [ `_${ UP }_version` ]: '3.30.0', [ `_${ UP }_data` ]: JSON.stringify( elements ), ...extra };
	for ( const [ k, v ] of Object.entries( meta ) ) {
		wp( [ 'post', 'meta', 'update', id, k, typeof v === 'string' ? v : JSON.stringify( v ), ...( typeof v === 'string' ? [] : [ '--format=json' ] ) ] );
	}
	return Number( id );
}
const w = ( id, widgetType, settings ) => ( { id, elType: 'widget', widgetType, settings, elements: [] } );
const con = ( id, widgets ) => [ { id, elType: 'container', isInner: false, settings: { content_width: 'boxed' }, elements: widgets } ];

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

	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];
	const watch = ( p ) => {
		p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && errors.push( `${ e.message } @ ${ p.url() }` ) );
	};
	let logStart = 0;

	try {
		// ------------------------------------------------------------ a site built with the other builder
		wp( [ 'plugin', 'install', UP, ADDON, '--activate' ] );
		wp( [ 'option', 'update', 'permalink_structure', '/%postname%/' ] );
		logStart = logSize();

		// Its global colors.
		const oldKit = Number( php( `echo (int) get_option( '${ UP }_active_kit' );` ) );
		php( `$s = get_post_meta( ${ oldKit }, '_${ UP }_page_settings', true ); $s = is_array( $s ) ? $s : []; $s['system_colors'] = [ [ '_id' => 'primary', 'title' => 'Primary', 'color' => '#1A73E8' ], [ '_id' => 'secondary', 'title' => 'Secondary', 'color' => '#FF7A00' ] ]; update_post_meta( ${ oldKit }, '_${ UP }_page_settings', $s );` );

		// Templates: a section, a site-wide header and a popup.
		const section = built( `${ UP }_library`, 'Taxi section', con( 'sec0001', [ w( 'sech001', 'heading', { title: 'SECTION-TEXT' } ) ] ), { [ `_${ UP }_template_type` ]: 'section' } );
		const header = built( `${ UP }_library`, 'Site header', con( 'hdr0001', [ w( 'hdrh001', 'heading', { title: 'HEADER-TEXT' } ) ] ), { [ `_${ UP }_template_type` ]: 'header', [ `_${ UP }_conditions` ]: [ 'include/general' ] } );
		const popup = built( `${ UP }_library`, 'Book popup', con( 'pop0001', [ w( 'poph001', 'heading', { title: 'POPUP-TEXT' } ) ] ), { [ `_${ UP }_template_type` ]: 'popup', [ `_${ UP }_conditions` ]: [ 'include/general' ], [ `_${ UP }_popup_display_settings` ]: { triggers: { page_load: 'yes', page_load_delay: 3 } } } );
		for ( const [ id, type ] of [ [ section, 'section' ], [ header, 'header' ], [ popup, 'popup' ] ] ) {
			wp( [ 'post', 'term', 'set', String( id ), `${ UP }_library_type`, type ] );
		}

		const popupLink = `#${ UP }-action%3Aaction%3Dpopup%3Aopen%26settings%3D${ encodeURIComponent( Buffer.from( JSON.stringify( { id: String( popup ), toggle: false } ) ).toString( 'base64' ) ) }`;
		const about = built( 'page', 'About Us', con( 'abt0001', [
			w( 'abth001', 'heading', { title: 'x', __dynamic__: { title: `[${ UP }-tag id="a1b2c3d" name="post-title" settings="%7B%7D"]` }, __globals__: { title_color: 'globals/colors?id=primary' } } ),
			w( 'abtt001', 'text-editor', { editor: '<p>We drive you around Inverness.</p>' } ),
			w( 'abtb001', 'button', { text: 'Book now', link: { url: popupLink } } ),
			w( 'abte001', 'eael-creative-button', { creative_button_text: 'ADDON-BUTTON', creative_button_secondary_text: 'Go' } ),
			w( 'abts001', 'shortcode', { shortcode: `[${ UP }-template id="${ section }"]` } ),
		] ), { _wp_page_template: `${ UP }_header_footer` } );
		const contact = built( 'page', 'Contact Us', con( 'cnt0001', [ w( 'cnth001', 'heading', { title: 'CONTACT-TEXT' } ) ] ) );
		const tours = built( 'page', 'Tours', con( 'tor0001', [ w( 'torh001', 'heading', { title: 'TOURS-TEXT' } ) ] ) );

		const aboutUrl = php( `echo get_permalink( ${ about } );` );
		const v = await ( await browser.newContext( { viewport: { width: 1280, height: 900 } } ) ).newPage();
		watch( v );
		await v.goto( aboutUrl );
		const before = await v.evaluate( ( up ) => ( { theirs: !! document.querySelector( `.${ up }-widget-heading` ), addon: /ADDON-BUTTON/.test( document.body.innerText ) } ), UP );
		check( 'setup', 'the page is drawn by the other builder, with the add-on\'s widget', before.theirs && before.addon, JSON.stringify( before ) );

		// ------------------------------------------------------------ convert one page from Pages
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000 } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/edit.php?post_type=page` );
		const row = p.locator( `#post-${ about }` );
		check( 'pages', '"Convert to Refraction" shows under a page built with the other builder', 1 === await row.locator( 'a.refraction-convert' ).count() );
		await row.hover();
		await Promise.all( [ p.waitForURL( /edit\.php/ ), row.locator( 'a.refraction-convert' ).click() ] );
		const notice = await p.locator( '.notice-success' ).first().innerText();
		check( 'pages', 'the notice says it is converted and names the add-on widget kept as HTML', /1 page converted to Refraction/.test( notice ) && /About Us: eael-creative-button/.test( notice ), notice );
		await p.screenshot( { path: join( SHOTS, 'pages-notice.png' ) } );
		check( 'pages', 'the converted page offers "Back to ..." instead', 1 === await p.locator( `#post-${ about } a.refraction-revert` ).count() && 0 === await p.locator( `#post-${ about } a.refraction-convert` ).count() );

		const popupNew = Number( php( `$m = get_option( 'refraction_migration_templates' ); echo (int) ( $m[ ${ popup } ] ?? 0 );` ) );
		await v.goto( aboutUrl );
		const after = await v.evaluate( ( [ up, page ] ) => ( {
			ours: !! document.querySelector( '.refraction-widget-heading' ),
			theirs: !! document.querySelector( `.${ up }-widget-heading` ),
			title: document.querySelector( `.refraction-${ page } .refraction-widget-heading .refraction-heading-title` )?.textContent.trim(),
			text: /We drive you around Inverness/.test( document.body.innerText ),
			addon: /ADDON-BUTTON/.test( document.querySelector( '.rf-imported-eael-creative-button' )?.innerText || '' ),
			section: /SECTION-TEXT/.test( document.querySelector( '.refraction-widget-shortcode' )?.innerText || '' ),
			header: /HEADER-TEXT/.test( document.querySelector( '.refraction-location-header' )?.innerText || '' ),
			popupLink: document.querySelector( '.refraction-widget-button a' )?.getAttribute( 'href' ),
			color: getComputedStyle( document.querySelector( `.refraction-${ page } .refraction-heading-title` ) ).color,
		} ), [ UP, about ] );
		check( 'page', 'Refraction draws the converted page, not the other builder', after.ours && ! after.theirs, JSON.stringify( after ) );
		check( 'page', 'its dynamic tag (the page title) and its text came along', 'About Us' === after.title && after.text, JSON.stringify( after ) );
		check( 'page', 'the global primary color came along', 'rgb(26, 115, 232)' === after.color, after.color );
		check( 'page', 'the add-on widget is kept as HTML showing what it showed', after.addon, JSON.stringify( after ) );
		check( 'page', 'the template shortcode shows the converted section', after.section, JSON.stringify( after ) );
		check( 'page', 'the site-wide header template came along with its conditions', after.header, JSON.stringify( after ) );
		check( 'page', 'the popup link opens the converted popup', `#refraction-popup%3Aopen%3A${ popupNew }` === after.popupLink, `${ after.popupLink } ${ popupNew }` );
		await v.screenshot( { path: join( SHOTS, 'about-converted.png' ), fullPage: true } );
		const triggers = php( `$s = get_post_meta( ${ popupNew }, '_refraction_page_settings', true ); echo ( $s['rp_trigger_load'] ?? '' ) . '/' . ( $s['rp_load_delay'] ?? '' ) . '/' . get_post_meta( ${ popupNew }, '_refraction_template_type', true );` );
		check( 'templates', 'the popup keeps its page load trigger (3 s)', 'yes/3/popup' === triggers, triggers );

		await p.goto( `${ BASE }/wp-admin/post.php?post=${ about }&action=refraction` );
		const editor = await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } ).then( () => true ).catch( () => false );
		await sleep( 2000 );
		const inEditor = editor ? await p.frame( { name: 'refraction-preview-iframe' } ).evaluate( ( page ) => ( { heading: document.querySelector( `.refraction-${ page } .refraction-widget-heading .refraction-heading-title` )?.textContent.trim(), addon: !! document.querySelector( '.rf-imported-widget' ) } ), about ) : {};
		check( 'editor', 'the converted page opens in Refraction\'s editor', editor && 'About Us' === inEditor.heading && inEditor.addon, JSON.stringify( inEditor ) );
		await p.screenshot( { path: join( SHOTS, 'about-editor.png' ) } );

		// ------------------------------------------------------------ back, then everything at once
		await p.goto( `${ BASE }/wp-admin/edit.php?post_type=page` );
		await p.locator( `#post-${ about }` ).hover();
		await Promise.all( [ p.waitForURL( /edit\.php/ ), p.locator( `#post-${ about } a.refraction-revert` ).click() ] );
		await v.goto( aboutUrl );
		const back = await v.evaluate( ( up ) => ( { theirs: !! document.querySelector( `.${ up }-widget-heading` ), ours: !! document.querySelector( '.refraction-widget-heading' ) } ), UP );
		check( 'undo', '"Back to ..." gives the page back to the other builder', back.theirs && ! back.ours, JSON.stringify( back ) );

		await p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-migration` );
		const status = await p.locator( '.refraction-migration table' ).innerText();
		check( 'move', 'Refraction > Move from ... shows what is left: 3 pages, the templates done', /3 to convert, 0 converted/.test( status ) && /3 of 3 converted/.test( status ), status );
		await Promise.all( [ p.waitForURL( /page=refraction-migration&done=1/, { timeout: 120000 } ), p.click( 'text=Convert everything' ) ] );
		const done = await p.locator( '.wrap' ).innerText();
		check( 'move', '"Convert everything" converts the 3 pages and says what to do next', /0 to convert, 3 converted/.test( done ) && /Everything is converted/.test( done ) && /Widgets kept as HTML/.test( done ), done.slice( 0, 600 ) );
		await p.screenshot( { path: join( SHOTS, 'move-done.png' ), fullPage: true } );

		// ------------------------------------------------------------ without the other builder
		wp( [ 'plugin', 'deactivate', ADDON, UP ] );
		await v.goto( aboutUrl );
		const gone = await v.evaluate( ( page ) => ( { title: document.querySelector( `.refraction-${ page } .refraction-heading-title` )?.textContent.trim(), addon: /ADDON-BUTTON/.test( document.body.innerText ), header: /HEADER-TEXT/.test( document.body.innerText ), section: /SECTION-TEXT/.test( document.body.innerText ) } ), about );
		check( 'without', 'with the other builder and its add-on deactivated, the page shows the same', 'About Us' === gone.title && gone.addon && gone.header && gone.section, JSON.stringify( gone ) );
		await v.goto( php( `echo get_permalink( ${ tours } );` ) );
		check( 'without', 'and so do the other converted pages', /TOURS-TEXT/.test( await v.locator( 'body' ).innerText() ) );
		await v.screenshot( { path: join( SHOTS, 'about-without.png' ), fullPage: true } );
		await p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-migration` );
		check( 'without', 'the Move page still opens (nothing left to convert)', /Everything is converted/.test( await p.locator( '.wrap' ).innerText() ) );
		void contact;

		check( 'console', 'no JavaScript errors on the pages', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		// Only Refraction's own messages (the other builder and its add-on log their own notices on this site).
		const phpLog = logTail( logStart ).split( '\n' ).filter( ( l ) => /plugins\/refraction\//.test( l ) ).join( '\n' );
		check( 'php', 'nothing from Refraction in the PHP error log', '' === phpLog, phpLog.slice( 0, 700 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall migration checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
