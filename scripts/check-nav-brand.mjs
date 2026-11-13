#!/usr/bin/env node
/**
 * Nav Menu brand and widget polish check (SQLite test site, Chromium):
 * - Nav Menu > Logo or Site Title: the site title or logo on the left, in the middle (the items share out on both sides)
 *   or on the right; shown only after scrolling down (or only before) with an animation; the collapsed (phone) bar.
 * - Button > Style > Icon: size, padding, corners, colors.
 * - Text Editor: no margin above the first paragraph or below the last.
 * - Highlighted words: drawn again every time they come into view when asked.
 *
 * Usage: node scripts/check-nav-brand.mjs [--site /tmp/rf-nb-site] [--port 8992] [--shots /tmp/nav-brand-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-nb-site' );
const PORT = arg( 'port', '8992' );
const SHOTS = arg( 'shots', '/tmp/nav-brand-shots' );
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

const nav = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'refraction-nav-menu', settings: { menu: MENU, layout: 'horizontal', breakpoint: 'mobile', ...settings }, elements: [] } );
let MENU = '';

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
		wp( [ 'option', 'update', 'blogname', 'Highland Rides' ] );
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
		MENU = wp( [ 'menu', 'create', `Brand ${ Date.now() }`, '--porcelain' ] ).trim();
		for ( const name of [ 'Home', 'Tours', 'Fleet', 'Contact' ] ) {
			wp( [ 'menu', 'item', 'add-custom', MENU, name, `${ BASE }/#${ name.toLowerCase() }` ] );
		}
		const logo = wp( [ 'media', 'import', join( process.cwd(), 'assets/images/logo-icon.png' ), '--porcelain' ] ).trim();

		const tall = { min_height: { unit: 'vh', size: 260 }, flex_direction: 'column', flex_justify_content: 'flex-start' };
		const doc = page( 'Nav brand', [
			box( 'bl', {}, [ nav( 'nleft', { bar_brand: 'title', bar_brand_position: 'left' } ) ] ),
			box( 'bc', {}, [ nav( 'ncenter', { bar_brand: 'title', bar_brand_position: 'center' } ) ] ),
			box( 'br', {}, [ nav( 'nright', { bar_brand: 'image', bar_brand_image: { id: Number( logo ), url: '' }, bar_brand_position: 'right' } ) ] ),
			box( 'ba', {}, [ nav( 'nafter', { bar_brand: 'title', bar_brand_show: 'after', bar_brand_offset: 200, bar_brand_animation: 'zoom', bar_brand_duration: 100 } ) ] ),
			box( 'bb', {}, [ nav( 'nbefore', { bar_brand: 'title', bar_brand_show: 'before', bar_brand_offset: 200, bar_brand_animation: 'collapse', bar_brand_duration: 100 } ) ] ),
			box( 'tall', tall, [ { id: 'spacer', elType: 'widget', widgetType: 'heading', settings: { title: 'Scroll' }, elements: [] } ] ),
		] );

		const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( doc.url );
		await sleep( 900 );
		const look = ( id ) => p.evaluate( ( id ) => {
			const w = document.querySelector( `[data-id="${ id }"]` );
			const r = ( el ) => { if ( ! el ) { return null; } const b = el.getBoundingClientRect(); return { l: Math.round( b.left ), r: Math.round( b.right ), w: Math.round( b.width ), cx: Math.round( b.left + b.width / 2 ) }; };
			const brand = [ ...w.querySelectorAll( '.refraction-nav-menu__bar-brand' ) ].find( ( b ) => 'none' !== getComputedStyle( b ).display );
			const items = [ ...w.querySelectorAll( '.refraction-nav-menu__list > .refraction-nav-menu__item' ) ].filter( ( i ) => i.offsetParent );
			const cs = brand ? getComputedStyle( brand ) : null;
			return {
				text: brand ? brand.innerText.trim() : null,
				img: !! brand?.querySelector( 'img' ),
				href: brand?.querySelector( 'a' )?.getAttribute( 'href' ),
				brand: r( brand ),
				nav: r( w.querySelector( '.refraction-nav-menu' ) ),
				items: items.map( ( i ) => ( { t: i.innerText.trim(), ...r( i ) } ) ),
				opacity: cs ? +cs.opacity : null,
				visibility: cs?.visibility,
				hidden: w.querySelector( '.refraction-nav-menu' ).classList.contains( 'is-brand-hidden' ),
				lists: w.querySelectorAll( '.refraction-nav-menu__list' ).length,
			};
		}, id );

		let s = await look( 'nleft' );
		check( 'left', 'the site title shows on the left of the menu, linked to the home page', 'Highland Rides' === s.text && s.brand.r <= s.items[ 0 ].l && /\/$/.test( s.href || '' ), JSON.stringify( s ) );
		s = await look( 'ncenter' );
		const before = s.items.filter( ( i ) => i.r <= s.brand.l ).map( ( i ) => i.t );
		const after = s.items.filter( ( i ) => i.l >= s.brand.r ).map( ( i ) => i.t );
		check( 'middle', 'in the middle: two items on each side, the title centered in the bar', 'Home,Tours' === before.join() && 'Fleet,Contact' === after.join() && Math.abs( s.brand.cx - s.nav.cx ) < 8 && 2 === s.lists, JSON.stringify( s ) );
		s = await look( 'nright' );
		check( 'right', 'an image on the right of the menu', s.img && s.brand.l >= s.items[ s.items.length - 1 ].r, JSON.stringify( s ) );
		await p.locator( '[data-id="bl"]' ).screenshot( { path: join( SHOTS, 'brand-left.png' ) } );
		await p.locator( '[data-id="bc"]' ).screenshot( { path: join( SHOTS, 'brand-middle.png' ) } );
		await p.locator( '[data-id="br"]' ).screenshot( { path: join( SHOTS, 'brand-right.png' ) } );

		const a0 = await look( 'nafter' );
		const b0 = await look( 'nbefore' );
		check( 'scroll', 'at the top: "show once scrolled" is hidden, "hide once scrolled" shows', a0.hidden && 0 === a0.opacity && 'hidden' === a0.visibility && ! b0.hidden && 1 === b0.opacity, JSON.stringify( { a0, b0 } ) );
		await p.evaluate( () => window.scrollTo( 0, 300 ) );
		await sleep( 600 );
		const a1 = await look( 'nafter' );
		const b1 = await look( 'nbefore' );
		check( 'scroll', 'scrolled 300px (past 200): the first shows, zoomed back to full size; the second is gone and takes no room (Grow in)', ! a1.hidden && 1 === a1.opacity && b1.hidden && b1.brand.w <= 1, JSON.stringify( { a1, b1 } ) );
		await p.evaluate( () => window.scrollTo( 0, 0 ) );
		await sleep( 600 );
		check( 'scroll', 'back at the top they swap back', ( await look( 'nafter' ) ).hidden && ! ( await look( 'nbefore' ) ).hidden );
		await ctx.close();

		// ------------------------------------------------------------ phone: collapsed bar
		const m = await ( await browser.newContext( { viewport: { width: 390, height: 800 } } ) ).newPage();
		m.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await m.goto( doc.url );
		await sleep( 900 );
		const phone = await m.evaluate( () => {
			const w = document.querySelector( '[data-id="ncenter"]' );
			const vis = ( el ) => el && 'none' !== getComputedStyle( el ).display;
			const brand = w.querySelector( '.refraction-nav-menu__bar-brand--collapsed' );
			const toggle = w.querySelector( '.refraction-nav-menu__toggle' );
			const b = brand.getBoundingClientRect();
			const t = toggle.getBoundingClientRect();
			return { brand: vis( brand ), middle: vis( w.querySelector( '.refraction-nav-menu__bar-brand--middle' ) ), toggle: vis( toggle ), sameLine: Math.abs( ( b.top + b.height / 2 ) - ( t.top + t.height / 2 ) ) < 12, order: b.right <= t.left };
		} );
		check( 'phone', 'collapsed: the title and the hamburger on one line, the middle copy hidden', phone.brand && ! phone.middle && phone.toggle && phone.sameLine && phone.order, JSON.stringify( phone ) );
		await m.click( '[data-id="ncenter"] .refraction-nav-menu__toggle' );
		await sleep( 600 );
		const opened = await m.evaluate( () => [ ...document.querySelectorAll( '[data-id="ncenter"] .refraction-nav-menu__panel .refraction-nav-menu__item' ) ].filter( ( i ) => i.offsetParent ).map( ( i ) => i.innerText.trim() ) );
		check( 'phone', 'the opened menu lists all four items, one under the other', 'Home,Tours,Fleet,Contact' === opened.join(), opened.join() );
		await m.locator( '[data-id="bc"]' ).screenshot( { path: join( SHOTS, 'brand-phone.png' ) } );
		await m.context().close();

		// ------------------------------------------------------------ button icon, text editor, highlight redraw
		const polish = page( 'Widget polish', [
			box( 'pb', {}, [ { id: 'btn', elType: 'widget', widgetType: 'button', settings: { text: 'Book a ride', selected_icon: { value: 'fas fa-arrow-right', library: 'fa-solid' }, button_icon_size: { unit: 'px', size: 22 }, button_icon_padding: { unit: 'px', size: 8 }, button_icon_radius: { unit: 'px', size: 50 }, button_icon_color: '#ff0000', button_icon_bg: '#ffffff' }, elements: [] } ] ),
			box( 'pt', { background_background: 'classic', background_color: '#ffd9b3' }, [ { id: 'te', elType: 'widget', widgetType: 'text-editor', settings: { editor: '<p>First paragraph.</p><p>Last paragraph.</p>' }, elements: [] } ] ),
			box( 'gap', { min_height: { unit: 'vh', size: 150 } }, [] ),
			box( 'ph', {}, [ { id: 'hd', elType: 'widget', widgetType: 'heading', settings: { title: 'Ride with Highland Rides', rf_hl_words: 'Highland Rides', rf_dual_mark: 'underline', rf_dual_draw: 'yes', rf_dual_draw_repeat: 'yes', rf_dual_draw_duration: 200, rf_dual_draw_delay: 0 }, elements: [] } ] ),
			box( 'gap2', { min_height: { unit: 'vh', size: 150 } }, [] ),
		] );
		const q = await ( await browser.newContext( { viewport: { width: 1280, height: 800 } } ) ).newPage();
		q.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await q.goto( polish.url );
		await sleep( 900 );
		const icon = await q.evaluate( () => {
			const box = document.querySelector( '[data-id="btn"] .refraction-button-icon' );
			const svg = box.querySelector( 'svg, i' );
			const cs = getComputedStyle( box );
			const text = document.querySelector( '[data-id="btn"] .refraction-button-text' ).getBoundingClientRect();
			const b = box.getBoundingClientRect();
			return { pad: cs.paddingTop, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, color: cs.color, size: Math.round( svg.getBoundingClientRect().height ), level: Math.abs( ( text.top + text.height / 2 ) - ( b.top + b.height / 2 ) ) < 2 };
		} );
		check( 'button', 'Button > Style > Icon: size 22px, padding 8px, round corners, its own colors; the text stays level with it', '8px' === icon.pad && '50px' === icon.radius && 'rgb(255, 255, 255)' === icon.bg && 'rgb(255, 0, 0)' === icon.color && 22 === icon.size && icon.level, JSON.stringify( icon ) );
		await q.locator( '[data-id="pb"]' ).screenshot( { path: join( SHOTS, 'button-icon.png' ) } );
		const te = await q.evaluate( () => {
			const ps = [ ...document.querySelectorAll( '[data-id="te"] p' ) ];
			const w = document.querySelector( '[data-id="te"]' ).getBoundingClientRect();
			const first = ps[ 0 ].getBoundingClientRect();
			const last = ps[ ps.length - 1 ].getBoundingClientRect();
			return { top: Math.round( first.top - w.top ), bottom: Math.round( w.bottom - last.bottom ), between: getComputedStyle( ps[ 0 ] ).marginBottom };
		} );
		check( 'text editor', 'no margin above the first paragraph or below the last; paragraphs keep their space between', 0 === te.top && 0 === te.bottom && '0px' !== te.between, JSON.stringify( te ) );
		const drawn = () => q.evaluate( () => document.querySelector( '[data-id="hd"] .refraction-heading-dual' ).classList.contains( 'is-drawn' ) );
		const d0 = await drawn();
		await q.evaluate( () => document.querySelector( '[data-id="hd"]' ).scrollIntoView( { block: 'center' } ) );
		await sleep( 500 );
		const d1 = await drawn();
		await q.evaluate( () => window.scrollTo( 0, document.body.scrollHeight ) );
		await sleep( 500 );
		const d2 = await drawn();
		await q.evaluate( () => document.querySelector( '[data-id="hd"]' ).scrollIntoView( { block: 'center' } ) );
		await sleep( 500 );
		const d3 = await drawn();
		check( 'highlight', 'Draw Every Time: drawn in view, reset once off screen, drawn again on return', ! d0 && d1 && ! d2 && d3, JSON.stringify( [ d0, d1, d2, d3 ] ) );
		await q.context().close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall nav brand and widget polish checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
