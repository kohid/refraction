#!/usr/bin/env node
/**
 * Step icon colors and box styles (SQLite test site, Chromium): a Phone Showcase step's own icon colors in Normal,
 * Hover and Active (other steps keep the Style tab's); the Image Box and the Timed Slides slider take rounded
 * corners, a border and a shadow (Normal and Hover), the Image Box cuts its image to the corners only when rounded;
 * the panel shows the new settings.
 *
 * Usage: node scripts/check-box-style.mjs [--site /tmp/rf-bs-site] [--port 8996] [--shots /tmp/box-style-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-bs-site' );
const PORT = arg( 'port', '8996' );
const SHOTS = arg( 'shots', '/tmp/box-style-shots' );
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

const steps = [
	{ _id: 'st1', title: 'Download the app', text: 'Free on both stores.', own_icon_bg_normal: '' },
	{ _id: 'st2', title: 'Set your pick-up', text: 'Anywhere in the Highlands.', own_icon_bg_normal: '#00aa55', own_icon_color_normal: '#ffffff', own_icon_bg_hover: '#0000ff', own_icon_bg_active: '#ff8800' },
	{ _id: 'st3', title: 'Choose your car', text: 'Saloon to 16-seater.' },
];
const imageBox = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'image-box', settings: { title_text: 'Airport Transfers', description_text: 'Reliable transfers.', image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` }, ...settings }, elements: [] } );

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
		const dim = ( n ) => ( { unit: 'px', top: String( n ), right: String( n ), bottom: String( n ), left: String( n ), isLinked: true } );
		const doc = page( 'Box styles', [ box( 'top', { flex_direction: 'column' }, [
			{ id: 'ps', elType: 'widget', widgetType: 'refraction-phone-showcase', settings: { steps, cards: [], autoplay: '' }, elements: [] },
			imageBox( 'ib1', { ib_box_radius: dim( 24 ), ib_box_border_border: 'solid', ib_box_border_width: dim( 2 ), ib_box_border_color: '#ff00aa', ib_box_shadow_box_shadow_type: 'yes', ib_box_shadow_box_shadow: { horizontal: 0, vertical: 8, blur: 20, spread: 0, color: 'rgba(0,0,0,0.3)' }, ib_box_padding: dim( 16 ), ib_box_hover_border_color: '#00ccff' } ),
			imageBox( 'ib2', {} ),
			{ id: 'ts', elType: 'widget', widgetType: 'refraction-timed-slides', settings: { ts_box_radius: dim( 30 ), ts_box_border_border: 'solid', ts_box_border_width: dim( 3 ), ts_box_border_color: '#112233', card_border_border: 'solid', card_border_width: dim( 2 ), card_border_color: '#ffffff' }, elements: [] },
		] ) ] );

		// ------------------------------------------------------------ on the page
		const ctx = await browser.newContext( { viewport: { width: 1300, height: 900 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( doc.url, { waitUntil: 'load', timeout: 120000 } );
		await p.waitForTimeout( 1500 );

		const badge = ( n ) => p.evaluate( ( i ) => {
			const b = document.querySelectorAll( '[data-id="ps"] .rf-showcase__step' )[ i ].querySelector( '.rf-showcase__badge' );
			const cs = getComputedStyle( b );
			return { bg: cs.backgroundColor, color: cs.color };
		}, n );
		const first = await badge( 0 );
		const second = await badge( 1 );
		check( 'steps', 'a step\'s own Normal icon colors apply to that step only (green badge, white icon)', 'rgb(0, 170, 85)' === second.bg && 'rgb(255, 255, 255)' === second.color && 'rgb(0, 170, 85)' !== first.bg, JSON.stringify( { first, second } ) );

		await p.locator( '[data-id="ps"] .rf-showcase__step >> nth=1' ).hover();
		await p.waitForTimeout( 500 );
		const hovered = await badge( 1 );
		check( 'steps', 'its own Hover background shows when pointing at it', 'rgb(0, 0, 255)' === hovered.bg, JSON.stringify( hovered ) );

		await p.locator( '[data-id="ps"] .rf-showcase__step >> nth=1' ).click();
		await p.mouse.move( 5, 5 );
		await p.waitForTimeout( 700 );
		const active = await badge( 1 );
		const firstNow = await badge( 0 );
		check( 'steps', 'its own Active background shows when it is the step shown; the first step goes back to the Style tab\'s look', 'rgb(255, 136, 0)' === active.bg && firstNow.bg !== 'rgb(255, 136, 0)', JSON.stringify( { active, firstNow } ) );
		await p.locator( '[data-id="ps"]' ).screenshot( { path: join( SHOTS, 'steps.png' ) } );

		const ib = ( id ) => p.evaluate( ( i ) => {
			const w = document.querySelector( `[data-id="${ i }"] .refraction-image-box-wrapper` );
			const cs = getComputedStyle( w );
			return { radius: cs.borderTopLeftRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor, shadow: cs.boxShadow, overflow: cs.overflow, padding: cs.paddingTop };
		}, id );
		const one = await ib( 'ib1' );
		check( 'image box', 'Image Box > Box: rounded corners, border, shadow and padding apply to the card', '24px' === one.radius && '2px rgb(255, 0, 170)' === one.border && 'none' !== one.shadow && '16px' === one.padding, JSON.stringify( one ) );
		check( 'image box', 'a rounded Image Box cuts its image to the corners', 'hidden' === one.overflow, one.overflow );
		const two = await ib( 'ib2' );
		check( 'image box', 'an Image Box without rounded corners is unchanged (nothing cut, no border)', 'visible' === two.overflow && '0px' === two.radius && 'none' === two.shadow, JSON.stringify( two ) );
		await p.locator( '[data-id="ib1"] .refraction-image-box-wrapper' ).hover();
		await p.waitForTimeout( 600 );
		const oneHover = await ib( 'ib1' );
		check( 'image box', 'Hover: the border takes its hover color', oneHover.border.endsWith( 'rgb(0, 204, 255)' ), JSON.stringify( oneHover ) );
		await p.locator( '[data-id="ib1"]' ).screenshot( { path: join( SHOTS, 'image-box.png' ) } );

		const ts = await p.evaluate( () => {
			const s = getComputedStyle( document.querySelector( '[data-id="ts"] .rf-tco' ) );
			const card = document.querySelector( '[data-id="ts"] .rf-tco__card' );
			return { radius: s.borderTopLeftRadius, border: s.borderTopWidth + ' ' + s.borderTopColor, overflow: s.overflow, card: card ? getComputedStyle( card ).borderTopWidth : 'no card' };
		} );
		check( 'timed slides', 'Timed Slides > Slider: rounded corners and a border on the slider, content still cut to them', '30px' === ts.radius && '3px rgb(17, 34, 51)' === ts.border && 'hidden' === ts.overflow, JSON.stringify( ts ) );
		check( 'timed slides', 'Timed Slides > Cards: a border on the cards', '2px' === ts.card, ts.card );

		// ------------------------------------------------------------ in the editor
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 1500 );
		const edit = async ( id, tab ) => {
			await a.evaluate( ( i ) => $e.run( 'panel/editor/open', { model: refraction.getContainer( i ).model, view: refraction.getContainer( i ).view } ), id );
			await a.waitForTimeout( 700 );
			await a.locator( `.refraction-panel-navigation-tab:has-text("${ tab }")` ).first().click();
			await a.waitForTimeout( 500 );
		};
		const openSection = async ( name ) => {
			await a.evaluate( ( n ) => {
				const s = document.querySelector( '.refraction-control-' + n );
				if ( s && ! s.classList.contains( 'e-open' ) ) {
					s.querySelector( '.refraction-panel-heading' ).click();
				}
			}, name );
			await a.waitForTimeout( 700 );
		};

		await edit( 'ps', 'Content' );
		await a.locator( '.refraction-control-steps .refraction-repeater-fields >> nth=1' ).locator( '.refraction-repeater-row-item-title' ).click();
		await a.waitForTimeout( 800 );
		const row = await a.evaluate( () => {
			const r = document.querySelectorAll( '.refraction-control-steps .refraction-repeater-fields' )[ 1 ];
			return {
				heading: !! [ ...r.querySelectorAll( '.refraction-control-type-heading' ) ].find( ( h ) => /Icon Colors Of This Step/.test( h.textContent ) && h.offsetParent ),
				tabs: [ ...r.querySelectorAll( '.refraction-control-type-tab' ) ].filter( ( t ) => t.offsetParent ).map( ( t ) => t.textContent.trim() ).join(),
			};
		} );
		check( 'panel', 'each step has "Icon Colors Of This Step" with Normal / Hover / Active tabs', row.heading && 'Normal,Hover,Active' === row.tabs, JSON.stringify( row ) );
		await a.screenshot( { path: join( SHOTS, 'step-panel.png' ) } );

		await edit( 'ib1', 'Style' );
		await openSection( 'section_style_box' );
		const ibPanel = await a.evaluate( () => ( {
			tabs: [ ...document.querySelectorAll( '.refraction-control-type-tab' ) ].filter( ( t ) => t.offsetParent ).map( ( t ) => t.textContent.trim() ).join(),
			radius: !! document.querySelector( '.refraction-control-ib_box_radius' ),
			groups: [ ...document.querySelectorAll( '.rf-section-groups__tab' ) ].map( ( t ) => t.textContent.trim() ).join(),
		} ) );
		check( 'panel', 'Image Box > Style > Box has the Box settings with Normal / Hover', ibPanel.radius && ( 'Normal,Hover' === ibPanel.tabs || /Box/.test( ibPanel.groups ) ), JSON.stringify( ibPanel ) );
		if ( ibPanel.groups ) {
			await a.locator( '.rf-section-groups__tab:has-text("Box")' ).click();
			await a.waitForTimeout( 500 );
		}
		await a.screenshot( { path: join( SHOTS, 'image-box-panel.png' ) } );

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
