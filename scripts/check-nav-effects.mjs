#!/usr/bin/env node
/**
 * Nav Menu hover effects, submenus and the hamburger button's animations (SQLite test site, Chromium):
 * - Main items: the effect as wide as the text by default, or its own width placed left; the new effects (highlighter,
 *   brackets, dot, pill) and growing from the left; the main effect no longer drawn inside submenus.
 * - Submenus: their own hover effect (side bar), the open animation, centred under the item at a distance, keeping the
 *   hover across the gap; in the collapsed menu none of that moves them.
 * - The hamburger button: hover animation (grow) and click animation (ripple), played on every click.
 * - The editor has the settings.
 *
 * Usage: node scripts/check-nav-effects.mjs [--site /tmp/rf-navfx-site] [--port 9240] [--shots /tmp/nav-effects-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-navfx-site' );
const PORT = arg( 'port', '9240' );
const SHOTS = arg( 'shots', '/tmp/nav-effects-shots' );
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
	const px = ( size, unit = 'px' ) => ( { size, unit } );

	try {
		const menu = wp( [ 'menu', 'create', 'Main', '--porcelain' ] ).trim();
		wp( [ 'menu', 'item', 'add-custom', menu, 'About us', `${ BASE }/#about` ] );
		const services = wp( [ 'menu', 'item', 'add-custom', menu, 'Services', `${ BASE }/#services`, '--porcelain' ] ).trim();
		wp( [ 'menu', 'item', 'add-custom', menu, 'Airport transfers', `${ BASE }/#airport`, `--parent-id=${ services }` ] );
		wp( [ 'menu', 'item', 'add-custom', menu, 'Highland tours', `${ BASE }/#tours`, `--parent-id=${ services }` ] );
		wp( [ 'menu', 'item', 'add-custom', menu, 'Contact', `${ BASE }/#contact` ] );
		const nav = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'refraction-nav-menu', settings: { menu, pointer_color: '#E20A17', ...settings }, elements: [] } );

		const p1 = page( 'Effects', [
			nav( 'nv01', { hover_effect: 'underline', pointer_width: px( 50, '%' ), pointer_align: 'left', sub_hover_effect: 'bar', sub_pointer_color: '#0B5D46', sub_animation: 'zoom', sub_align: 'center', sub_offset: px( 12 ), sub_divider: '#E5E7EB', sub_panel_padding: { unit: 'px', top: '6', right: '6', bottom: '6', left: '6', isLinked: true } } ),
			nav( 'nv02', { hover_effect: 'underline' } ),
			nav( 'nv03', { hover_effect: 'highlight', pointer_color: '#D4F25A' } ),
			nav( 'nv04', { hover_effect: 'brackets' } ),
			nav( 'nv05', { hover_effect: 'dot' } ),
			nav( 'nv06', { hover_effect: 'pill', pointer_text: '#FFFFFF' } ),
			nav( 'nv07', { hover_effect: 'underline', hover_animation: 'from-left' } ),
		] );
		const d = await at( p1.url, 1280, 1000 );
		await sleep( 600 );
		const first = ( id ) => `[data-id="${ id }"] .refraction-nav-menu__list > li:first-child > .refraction-nav-menu__link`;
		const pseudo = ( id, which = '::after' ) => d.evaluate( ( [ sel, w ] ) => {
			const a = document.querySelector( sel ); const cs = getComputedStyle( a, w ); const r = a.getBoundingClientRect();
			return { content: cs.content, opacity: cs.opacity, width: parseFloat( cs.width ), left: parseFloat( cs.left ), link: Math.round( r.width ), pl: parseFloat( getComputedStyle( a ).paddingLeft ), transform: cs.transform, origin: cs.transformOrigin, z: cs.zIndex, height: parseFloat( cs.height ), radius: getComputedStyle( a ).borderRadius, bg: getComputedStyle( a ).backgroundColor, color: getComputedStyle( a ).color };
		}, [ first( id ), which ] );

		await d.hover( first( 'nv01' ) );
		await sleep( 450 );
		const own = await pseudo( 'nv01' );
		check( 'main', 'Effect Width 50% placed left: the line is half the item, starting at the text', '1' === own.opacity && Math.abs( own.width - ( own.link / 2 ) ) <= 1 && Math.abs( own.left - own.pl ) <= 1, JSON.stringify( own ) );
		await d.locator( '[data-id="nv01"]' ).screenshot( { path: join( SHOTS, 'width-50-left.png' ) } );

		await d.hover( first( 'nv02' ) );
		await sleep( 450 );
		const text = await pseudo( 'nv02' );
		check( 'main', 'by default the line is as wide as the text', Math.abs( text.width - ( text.link - ( 2 * text.pl ) ) ) <= 1 && Math.abs( text.left - text.pl ) <= 1, JSON.stringify( text ) );

		await d.hover( first( 'nv03' ) );
		await sleep( 450 );
		const hl = await pseudo( 'nv03' );
		check( 'main', 'highlighter: a band behind the lower half of the text', '1' === hl.opacity && '-1' === hl.z && hl.height >= 7, JSON.stringify( hl ) );
		await d.locator( '[data-id="nv03"]' ).screenshot( { path: join( SHOTS, 'highlighter.png' ) } );

		await d.hover( first( 'nv04' ) );
		await sleep( 450 );
		const br = [ await pseudo( 'nv04', '::before' ), await pseudo( 'nv04' ) ];
		check( 'main', 'brackets: [ and ] appear around the text', '"["' === br[ 0 ].content && '"]"' === br[ 1 ].content && '1' === br[ 0 ].opacity && '1' === br[ 1 ].opacity, JSON.stringify( br.map( ( b ) => [ b.content, b.opacity ] ) ) );
		await d.locator( '[data-id="nv04"]' ).screenshot( { path: join( SHOTS, 'brackets.png' ) } );

		await d.hover( first( 'nv05' ) );
		await sleep( 450 );
		const dot = await pseudo( 'nv05' );
		check( 'main', 'dot: a round dot under the text', '1' === dot.opacity && dot.width === dot.height && dot.width >= 5, JSON.stringify( dot ) );
		await d.locator( '[data-id="nv05"]' ).screenshot( { path: join( SHOTS, 'dot.png' ) } );

		await d.hover( first( 'nv06' ) );
		await sleep( 450 );
		const pill = await pseudo( 'nv06' );
		check( 'main', 'pill: a rounded background in the effect color, white text', 'rgb(226, 10, 23)' === pill.bg && 'rgb(255, 255, 255)' === pill.color && parseFloat( pill.radius ) > 100, JSON.stringify( pill ) );
		await d.locator( '[data-id="nv06"]' ).screenshot( { path: join( SHOTS, 'pill.png' ) } );

		const fromLeft = await pseudo( 'nv07' );
		check( 'main', 'grow from the left: the line grows from its left end', fromLeft.origin.startsWith( '0px' ) && /matrix\(0/.test( fromLeft.transform ), JSON.stringify( fromLeft ) );

		// Submenus.
		const services1 = '[data-id="nv01"] .refraction-nav-menu__list > li:nth-child(2)';
		await d.hover( `${ services1 } > .refraction-nav-menu__link` );
		await sleep( 500 );
		const sub = await d.evaluate( ( sel ) => {
			const li = document.querySelector( sel ); const s = li.querySelector( '.refraction-nav-menu__sub' ); const a = li.getBoundingClientRect(); const b = s.getBoundingClientRect();
			const link = s.querySelector( '.refraction-nav-menu__link' );
			return { visible: getComputedStyle( s ).visibility, gap: Math.round( b.top - a.bottom ), centre: Math.round( ( b.left + ( b.width / 2 ) ) - ( a.left + ( a.width / 2 ) ) ), origin: getComputedStyle( s ).transformOrigin, mainLine: getComputedStyle( link, '::after' ).width, divider: getComputedStyle( s.querySelectorAll( ':scope > li' )[ 1 ] ).borderTopColor, padding: getComputedStyle( s ).paddingTop };
		}, services1 );
		check( 'submenu', 'opens centred under its item, 12px below it, with its padding and a line between items', 'visible' === sub.visible && 12 === sub.gap && Math.abs( sub.centre ) <= 1 && '6px' === sub.padding && 'rgb(229, 231, 235)' === sub.divider, JSON.stringify( sub ) );
		const subLink = `${ services1 } .refraction-nav-menu__sub li:first-child > .refraction-nav-menu__link`;
		await d.hover( subLink );
		await sleep( 450 );
		const bar = await d.evaluate( ( sel ) => {
			const a = document.querySelector( sel ); const cs = getComputedStyle( a, '::after' ); return { open: getComputedStyle( a.closest( '.refraction-nav-menu__sub' ) ).visibility, transform: cs.transform, bg: cs.backgroundColor, width: parseFloat( cs.width ), height: parseFloat( cs.height ) };
		}, subLink );
		check( 'submenu', 'moving onto it keeps it open (across the gap); its own effect: a side bar in its color', 'visible' === bar.open && 'none' === bar.transform && 'rgb(11, 93, 70)' === bar.bg && bar.height > bar.width, JSON.stringify( bar ) );
		await d.screenshot( { path: join( SHOTS, 'submenu.png' ), clip: await d.locator( '[data-id="nv01"]' ).boundingBox().then( ( r ) => ( { x: 0, y: r.y, width: 900, height: 220 } ) ) } );

		await d.hover( '[data-id="nv02"] .refraction-nav-menu__list > li:nth-child(2) > .refraction-nav-menu__link' );
		await sleep( 400 );
		const noMain = await d.evaluate( () => getComputedStyle( document.querySelector( '[data-id="nv02"] .refraction-nav-menu__sub .refraction-nav-menu__link' ), '::after' ).content );
		check( 'submenu', 'the main items\' underline is not drawn on submenu items', 'none' === noMain, noMain );
		await d.context().close();

		// The hamburger button, and submenus in the collapsed menu.
		const p2 = page( 'Toggle', [ nav( 'nv10', { toggle_hover_anim: 'grow', toggle_click_anim: 'ripple', toggle_ripple_color: '#E20A17', sub_align: 'center', sub_offset: px( 12 ) } ) ] );
		const m = await at( p2.url, 375 );
		await sleep( 500 );
		await m.hover( '.refraction-nav-menu__toggle' );
		await sleep( 400 );
		const grown = await m.evaluate( () => getComputedStyle( document.querySelector( '.refraction-nav-menu__toggle' ) ).scale );
		check( 'hamburger', 'hover animation: the button grows', '1.1' === grown, grown );
		await m.click( '.refraction-nav-menu__toggle' );
		await sleep( 120 );
		const ripple = await m.evaluate( () => {
			const t = document.querySelector( '.refraction-nav-menu__toggle' ); const cs = getComputedStyle( t, '::after' ); return { clicked: t.classList.contains( 'is-clicked' ), anim: cs.animationName, color: cs.backgroundColor, open: document.querySelector( '.refraction-nav-menu' ).classList.contains( 'is-open' ) };
		} );
		check( 'hamburger', 'click animation: a ripple in its color plays, and the menu opens', ripple.clicked && 'refraction-nav-ripple' === ripple.anim && 'rgb(226, 10, 23)' === ripple.color && ripple.open, JSON.stringify( ripple ) );
		await m.screenshot( { path: join( SHOTS, 'ripple.png' ), clip: { x: 0, y: 0, width: 375, height: 120 } } );
		await sleep( 800 );
		const after = await m.evaluate( () => document.querySelector( '.refraction-nav-menu__toggle' ).classList.contains( 'is-clicked' ) );
		await m.click( '.refraction-nav-menu__toggle' );
		await sleep( 60 );
		const again = await m.evaluate( () => document.querySelector( '.refraction-nav-menu__toggle' ).classList.contains( 'is-clicked' ) );
		check( 'hamburger', 'the animation ends, and plays again on the next click', ! after && again, JSON.stringify( [ after, again ] ) );
		await sleep( 800 );
		await m.click( '.refraction-nav-menu__toggle' );
		await sleep( 500 );
		await m.click( '.refraction-nav-menu__subtoggle' );
		await sleep( 400 );
		const inPanel = await m.evaluate( () => {
			const s = document.querySelector( '.refraction-nav-menu__sub' ); const cs = getComputedStyle( s ); const r = s.getBoundingClientRect(); return { display: cs.display, translate: cs.translate, margin: cs.marginTop, left: Math.round( r.left ), right: Math.round( r.right ) };
		} );
		check( 'collapsed', 'in the collapsed menu the submenu stays in the list (no centring or distance)', 'block' === inPanel.display && 'none' === inPanel.translate && '0px' === inPanel.margin && inPanel.left >= 0 && inPanel.right <= 375, JSON.stringify( inPanel ) );
		await m.screenshot( { path: join( SHOTS, 'collapsed.png' ) } );
		await m.context().close();

		// The editor.
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ctx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p1.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2500 );
		const missing = await e.evaluate( () => {
			const c = window.refraction.widgetsCache[ 'refraction-nav-menu' ]?.controls || {};
			return [ 'pointer_width', 'pointer_align', 'pointer_offset', 'pointer_radius', 'pointer_speed', 'pointer_text', 'sub_hover_effect', 'sub_pointer_color', 'sub_animation', 'sub_align', 'sub_offset', 'sub_panel_padding', 'sub_divider', 'toggle_hover_anim', 'toggle_click_anim', 'toggle_bg_hover' ].filter( ( k ) => ! c[ k ] ).concat( Object.keys( c.hover_effect?.options || {} ).length < 14 ? [ 'hover_effect options' ] : [] );
		} );
		check( 'editor', 'the Nav Menu has the new settings', 0 === missing.length, JSON.stringify( missing ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall nav effect checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
