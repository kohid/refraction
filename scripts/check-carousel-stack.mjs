#!/usr/bin/env node
/**
 * Nested Carousel, Stack effect (SQLite test site, Chromium): one card open with the next card as a bar above and the
 * previous one below; a click on a bar, the arrows, the dots and the arrow keys open another card, its height growing
 * while the open one shrinks into a bar; looping round; without a loop the ends stop; cards coming from below with two
 * bars a side (the far ones narrower and dimmer); autoplay with its pause button; bars kept out of the keyboard order;
 * a phone; the editor.
 *
 * Usage: node scripts/check-carousel-stack.mjs [--site /tmp/rf-stack-site] [--port 9260] [--shots /tmp/carousel-stack-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-stack-site' );
const PORT = arg( 'port', '9260' );
const SHOTS = arg( 'shots', '/tmp/carousel-stack-shots' );
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
	const watch = ( p ) => p.on( 'pageerror', ( e ) => errors.push( `${ e.message } @ ${ p.url() }` ) );
	const at = async ( url, width, height = 900, more = {} ) => {
		const p = await ( await browser.newContext( { viewport: { width, height }, ...more } ) ).newPage();
		watch( p );
		await p.goto( url );
		await sleep( 900 );
		return p;
	};
	const px = ( size, unit = 'px' ) => ( { unit, size } );
	const pad = ( n ) => ( { unit: 'px', top: String( n ), right: String( n ), bottom: String( n ), left: String( n ), isLinked: true } );

	// A card: a title row at its top (what a bar shows), then its body of a different height each.
	const cards = [ [ 'Annual Health Check', 'Dr. Alicia Kim', 200 ], [ 'Heart Check', 'Dr. Alicia Kim', 150 ], [ 'Labs', 'Dr. John Smith', 240 ], [ 'Dental Check', 'Dr. Alex Prime', 120 ], [ 'AI Report', 'Identified issues: 8', 180 ] ];
	const w = ( id, type, settings ) => ( { id, elType: 'widget', widgetType: type, settings, elements: [] } );
	const card = ( n, [ title, who, body ] ) => ( {
		id: `cs${ n }0000`.slice( 0, 7 ), elType: 'container', isInner: true,
		settings: { flex_direction: 'column', flex_gap: { unit: 'px', column: '10', row: '10', isLinked: true }, padding: pad( 14 ), background_background: 'classic', background_color: '#FFFFFF', border_radius: pad( 18 ), box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 6, blur: 20, spread: -8, color: 'rgba(0,0,0,0.18)' } },
		elements: [
			{ id: `ch${ n }0000`.slice( 0, 7 ), elType: 'container', isInner: true, settings: { flex_direction: 'row', flex_justify_content: 'space-between', flex_align_items: 'center', padding: pad( 0 ), min_height: px( 28 ) }, elements: [
				w( `th${ n }0000`.slice( 0, 7 ), 'heading', { title, header_size: 'h3', typography_typography: 'custom', typography_font_size: px( 16 ), title_color: '#111111' } ),
				w( `tw${ n }0000`.slice( 0, 7 ), 'heading', { title: who, header_size: 'p', typography_typography: 'custom', typography_font_size: px( 12 ), title_color: '#666666' } ),
			] },
			w( `tb${ n }0000`.slice( 0, 7 ), 'spacer', { space: px( body ), _background_background: 'classic', _background_color: [ '#1E508C', '#FDE2E4', '#E0F2FE', '#DCFCE7', '#EDE9FE' ][ n ], _border_radius: pad( 12 ) } ),
		],
	} );
	const carousel = ( id, settings ) => ( {
		id, elType: 'widget', widgetType: 'refraction-nested-carousel',
		settings: { effect: 'stack', slides: cards.map( ( c ) => ( { slide_title: c[ 0 ] } ) ), speed: 500, loop: 'yes', arrows: 'yes', pagination: 'bullets', stack_min_height: px( 560 ), ...settings },
		elements: cards.map( ( c, n ) => card( n, c ) ),
	} );
	const pageOf = ( title, widget ) => page( title, [ { id: `p${ widget.id }`.slice( 0, 7 ), elType: 'container', isInner: true, settings: { background_background: 'classic', background_color: '#EDEDED', padding: pad( 30 ), boxed_width: px( 520 ), content_width: 'boxed' }, elements: [ widget ] } ] );

	const state = ( p, id ) => p.evaluate( ( wid ) => {
		const slides = [ ...document.querySelectorAll( `[data-id="${ wid }"] .refraction-nc__track > .refraction-nc__slide` ) ];
		return slides.map( ( s ) => {
			const r = s.getBoundingClientRect();
			return { cls: [ 'open', 'bar', 'far', 'hidden' ].find( ( c ) => s.classList.contains( `is-stack-${ c }` ) ), top: Math.round( r.top ), bottom: Math.round( r.bottom ), h: Math.round( r.height ), w: Math.round( r.width ), opacity: Number( getComputedStyle( s ).opacity ).toFixed( 2 ), inert: s.hasAttribute( 'inert' ) };
		} );
	}, id );
	const openIndex = ( st ) => st.findIndex( ( s ) => 'open' === s.cls );

	try {
		// ---------------------------------------------------------------- the default stack, as the reference
		const p1 = pageOf( 'Stack', carousel( 'nc01', {} ) );
		const d = await at( p1.url, 1280 );
		let st = await state( d, 'nc01' );
		const open = st[ 0 ];
		check( 'stack', 'the first card is open, the next as a bar above it, the last (previous) as a bar below', 'open' === open.cls && open.h > 200 && 'bar' === st[ 1 ].cls && st[ 1 ].bottom <= open.top && 56 === st[ 1 ].h && 'bar' === st[ 4 ].cls && st[ 4 ].top >= open.bottom && 'hidden' === st[ 2 ].cls && 0 === st[ 2 ].h, JSON.stringify( st ) );
		check( 'stack', 'bars are narrower than the open card (90%)', Math.abs( st[ 1 ].w - Math.round( open.w * 0.9 ) ) <= 1, JSON.stringify( [ open.w, st[ 1 ].w ] ) );
		check( 'stack', 'bars are out of the keyboard order (inert), the open card is not', st[ 1 ].inert && st[ 4 ].inert && ! open.inert, JSON.stringify( st.map( ( s ) => s.inert ) ) );
		await d.locator( '[data-id="nc01"]' ).screenshot( { path: join( SHOTS, 'stack.png' ) } );

		// A click on the bar above opens it; frames of the change.
		const bar = await d.locator( '[data-id="nc01"] .refraction-nc__slide' ).nth( 1 ).boundingBox();
		await d.mouse.click( bar.x + ( bar.width / 2 ), bar.y + ( bar.height / 2 ) );
		for ( let f = 0; f < 6; f++ ) {
			await d.locator( '[data-id="nc01"]' ).screenshot( { path: join( SHOTS, `step-${ f }.png` ) } );
			await sleep( 90 );
		}
		await sleep( 500 );
		st = await state( d, 'nc01' );
		check( 'stack', 'clicking the bar above opens that card; the one that was open is a bar below; the next comes in at the top', 1 === openIndex( st ) && 'bar' === st[ 0 ].cls && st[ 0 ].top >= st[ 1 ].bottom && 'bar' === st[ 2 ].cls && st[ 2 ].bottom <= st[ 1 ].top && 'hidden' === st[ 4 ].cls, JSON.stringify( st ) );
		check( 'stack', 'the open card takes its own height (another body height)', Math.abs( st[ 1 ].h - open.h + 50 ) <= 2, JSON.stringify( [ open.h, st[ 1 ].h ] ) );

		await d.click( '[data-id="nc01"] .refraction-nc__next' );
		await sleep( 700 );
		const dots = await d.evaluate( () => [ ...document.querySelectorAll( '[data-id="nc01"] .swiper-pagination-bullet' ) ].map( ( b ) => b.classList.contains( 'swiper-pagination-bullet-active' ) ) );
		check( 'stack', 'the next arrow opens the next card; the dots follow', 2 === openIndex( await state( d, 'nc01' ) ) && 5 === dots.length && dots[ 2 ], JSON.stringify( dots ) );
		await d.click( '[data-id="nc01"] .swiper-pagination-bullet:nth-child(5)' );
		await sleep( 700 );
		check( 'stack', 'a dot opens its card', 4 === openIndex( await state( d, 'nc01' ) ) );
		await d.locator( '[data-id="nc01"] .refraction-nc__next' ).focus();
		await d.keyboard.press( 'ArrowUp' );
		await sleep( 700 );
		st = await state( d, 'nc01' );
		check( 'stack', 'with a loop, the arrow key goes on from the last card to the first (the card above)', 0 === openIndex( st ) && 'bar' === st[ 4 ].cls && st[ 4 ].top >= st[ 0 ].bottom, JSON.stringify( st ) );
		await d.context().close();

		// ---------------------------------------------------------------- from below, two bars, no loop
		const p2 = pageOf( 'Stack below', carousel( 'nc02', { stack_flow: 'bottom', stack_peek: '2', loop: '', pagination: 'fraction' } ) );
		const d2 = await at( p2.url, 1280 );
		st = await state( d2, 'nc02' );
		const ends = await d2.evaluate( () => ( { prev: document.querySelector( '[data-id="nc02"] .refraction-nc__prev' ).classList.contains( 'swiper-button-disabled' ), fraction: document.querySelector( '[data-id="nc02"] .refraction-nc__pagination' ).textContent.replace( /\s+/g, '' ) } ) );
		check( 'below', 'next cards below the open one, two bars, the far one narrower and dimmer; nothing above the first', 'open' === st[ 0 ].cls && 'bar' === st[ 1 ].cls && st[ 1 ].top >= st[ 0 ].bottom && 'far' !== st[ 1 ].cls && st[ 2 ].top >= st[ 1 ].bottom && st[ 2 ].w < st[ 1 ].w && Number( st[ 2 ].opacity ) < 1 && 'hidden' === st[ 4 ].cls, JSON.stringify( st ) );
		check( 'below', 'without a loop the previous arrow is off at the first card; the fraction reads 1/5', ends.prev && '1/5' === ends.fraction, JSON.stringify( ends ) );
		await d2.locator( '[data-id="nc02"]' ).screenshot( { path: join( SHOTS, 'below-two-bars.png' ) } );
		await d2.context().close();

		// ---------------------------------------------------------------- autoplay
		const p3 = pageOf( 'Stack autoplay', carousel( 'nc03', { autoplay: 'yes', autoplay_speed: 1200, pause_on_hover: '' } ) );
		const d3 = await at( p3.url, 1280 );
		await sleep( 1500 );
		const moved = openIndex( await state( d3, 'nc03' ) );
		await d3.click( '[data-id="nc03"] .refraction-nc__autoplay' );
		const paused = openIndex( await state( d3, 'nc03' ) );
		await sleep( 2600 );
		const still = openIndex( await state( d3, 'nc03' ) );
		check( 'autoplay', 'it moves on by itself, and the pause button stops it', moved >= 1 && paused === still, JSON.stringify( [ moved, paused, still ] ) );
		await d3.context().close();

		// ---------------------------------------------------------------- phone
		const ph = await at( p1.url, 390, 844 );
		const phone = await ph.evaluate( () => ( { page: document.documentElement.scrollWidth, open: document.querySelector( '[data-id="nc01"] .is-stack-open' )?.getBoundingClientRect().width } ) );
		check( 'phone', 'fits a phone, no sideways scroll', phone.page <= 390 && phone.open >= 250, JSON.stringify( phone ) );
		await ph.screenshot( { path: join( SHOTS, 'phone.png' ), fullPage: true } );
		await ph.context().close();

		// ---------------------------------------------------------------- editor
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ctx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p1.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const ed = await frame.evaluate( () => ( { ready: !! document.querySelector( '[data-id="nc01"] .refraction-nc.is-stack.is-stack-ready' ), open: document.querySelectorAll( '[data-id="nc01"] .is-stack-open' ).length, bars: document.querySelectorAll( '[data-id="nc01"] .is-stack-bar' ).length } ) );
		const controls = await e.evaluate( () => {
			const c = window.refraction.widgetsCache[ 'refraction-nested-carousel' ]?.controls || {}; return [ 'stack_flow', 'stack_peek', 'stack_bar_height', 'stack_bar_width', 'stack_gap', 'stack_dim', 'stack_min_height' ].filter( ( k ) => ! c[ k ] ).concat( c.effect?.options?.stack ? [] : [ 'effect stack' ] );
		} );
		check( 'editor', 'the preview shows the stack (one open card, two bars) and the panel has its settings', ed.ready && 1 === ed.open && 2 === ed.bars && 0 === controls.length, JSON.stringify( [ ed, controls ] ) );
		await e.screenshot( { path: join( SHOTS, 'editor.png' ) } );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall carousel stack checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
