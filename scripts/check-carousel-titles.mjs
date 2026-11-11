#!/usr/bin/env node
/**
 * Nested Carousel, Slide Titles (SQLite test site, Chromium): the slides' titles as buttons beside a vertical carousel
 * (left, right) or above / below it; a click shows that slide, the arrows move the current title along; numbers;
 * the style settings (current title background, marker, width); titles with the Stack effect; phones (a row on top, or
 * hidden); the editor's preview.
 *
 * Usage: node scripts/check-carousel-titles.mjs [--site /tmp/rf-titles-site] [--port 9270] [--shots /tmp/carousel-titles-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-titles-site' );
const PORT = arg( 'port', '9270' );
const SHOTS = arg( 'shots', '/tmp/carousel-titles-shots' );
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
		await sleep( 1200 );
		return p;
	};
	const px = ( size, unit = 'px' ) => ( { unit, size } );
	const pad = ( n ) => ( { unit: 'px', top: String( n ), right: String( n ), bottom: String( n ), left: String( n ), isLinked: true } );
	const titles = [ 'Book online', 'Airport transfers', 'Executive cars', 'Wheelchair access', 'Pay by card' ];
	const colors = [ '#1E508C', '#E20A17', '#0E4A3A', '#F69216', '#6D28D9' ];
	const w = ( id, type, settings ) => ( { id, elType: 'widget', widgetType: type, settings, elements: [] } );
	const slide = ( p, n ) => ( {
		id: `${ p }s${ n }`, elType: 'container', isInner: true,
		settings: { min_height: px( 420 ), padding: pad( 30 ), background_background: 'classic', background_color: colors[ n ], flex_justify_content: 'center' },
		elements: [ w( `${ p }h${ n }`, 'heading', { title: titles[ n ], header_size: 'h2', title_color: '#FFFFFF' } ) ],
	} );
	const carousel = ( id, settings ) => ( {
		id, elType: 'widget', widgetType: 'refraction-nested-carousel',
		settings: { effect: 'slide', direction: 'vertical', vertical_height: px( 420 ), slides: titles.map( ( t ) => ( { slide_title: t } ) ), speed: 300, arrows: 'yes', pagination: 'bullets', title_nav: 'yes', ...settings },
		elements: titles.map( ( t, n ) => slide( id.slice( 0, 3 ), n ) ),
	} );
	const geo = ( p, id ) => p.evaluate( ( wid ) => {
		const root = document.querySelector( `[data-id="${ wid }"]` );
		const r = ( el ) => el && el.getBoundingClientRect();
		const nav = r( root.querySelector( '.refraction-nc__titles' ) );
		const stage = r( root.querySelector( '.refraction-nc__stage' ) );
		const buttons = [ ...root.querySelectorAll( '.refraction-nc__title' ) ];
		const prev = r( root.querySelector( '.refraction-nc__prev' ) );
		const vp = r( root.querySelector( '.refraction-nc__viewport' ) );
		const visible = [ ...root.querySelectorAll( '.refraction-nc__slide' ) ].findIndex( ( s ) => {
			const b = s.getBoundingClientRect();
			return Math.abs( b.top - vp.top ) < 4 && Math.abs( b.left - vp.left ) < 4;
		} );
		return {
			nav: nav && { left: Math.round( nav.left ), right: Math.round( nav.right ), top: Math.round( nav.top ), bottom: Math.round( nav.bottom ), w: Math.round( nav.width ), display: getComputedStyle( root.querySelector( '.refraction-nc__titles' ) ).display },
			stage: stage && { left: Math.round( stage.left ), right: Math.round( stage.right ), top: Math.round( stage.top ), bottom: Math.round( stage.bottom ) },
			texts: buttons.map( ( b ) => b.textContent.trim() ),
			active: buttons.findIndex( ( b ) => b.classList.contains( 'is-active' ) && 'true' === b.getAttribute( 'aria-current' ) ),
			visible,
			arrowCentre: prev && stage ? Math.round( ( prev.left + ( prev.width / 2 ) ) - ( stage.left + ( ( stage.right - stage.left ) / 2 ) ) ) : null,
		};
	}, id );

	try {
		const pLeft = page( 'Titles left', [ carousel( 'ncl0001', { title_nav_numbers: 'yes', titles_bg_active: '#111111', titles_color_active: '#FFFFFF', titles_marker_color: '#E20A17', titles_marker_size: px( 4 ), titles_width: px( 260 ) } ) ] );
		const pRest = page( 'Titles elsewhere', [
			carousel( 'ncr0001', { title_nav_position: 'right' } ),
			carousel( 'nct0001', { title_nav_position: 'top', direction: 'horizontal' } ),
			carousel( 'ncb0001', { title_nav_position: 'bottom', title_nav_mobile: 'hide' } ),
			carousel( 'ncs0001', { effect: 'stack', stack_min_height: px( 520 ), title_nav_position: 'left' } ),
		] );

		// ---------------------------------------------------------------- titles on the left of a vertical carousel
		const d = await at( pLeft.url, 1280 );
		let g = await geo( d, 'ncl0001' );
		check( 'left', 'the titles are a 260px column left of the slides, numbered, the first current; the arrows stay centred on the slides', g.nav && 260 === g.nav.w && g.nav.right <= g.stage.left && '01Book online' === g.texts[ 0 ].replace( /\s+/g, '' ).replace( 'Bookonline', 'Book online' ) && 5 === g.texts.length && 0 === g.active && 0 === g.visible && Math.abs( g.arrowCentre ) <= 2, JSON.stringify( g ) );
		await d.click( '[data-id="ncl0001"] .refraction-nc__title[data-index="3"]' );
		await sleep( 700 );
		g = await geo( d, 'ncl0001' );
		check( 'left', 'a click on the 4th title shows the 4th slide and marks that title', 3 === g.active && 3 === g.visible, JSON.stringify( g ) );
		await d.click( '[data-id="ncl0001"] .refraction-nc__next' );
		await sleep( 700 );
		g = await geo( d, 'ncl0001' );
		check( 'left', 'the next arrow moves the current title along', 4 === g.active && 4 === g.visible, JSON.stringify( g ) );
		const style = await d.evaluate( () => {
			const b = document.querySelector( '[data-id="ncl0001"] .refraction-nc__title.is-active' );
			const m = getComputedStyle( b, '::after' );
			return { bg: getComputedStyle( b ).backgroundColor, color: getComputedStyle( b ).color, marker: m.backgroundColor, mw: m.width, mo: m.opacity };
		} );
		check( 'style', 'the current title takes its own background and text colour, with a 4px red marker facing the slides', 'rgb(17, 17, 17)' === style.bg && 'rgb(255, 255, 255)' === style.color && 'rgb(226, 10, 23)' === style.marker && '4px' === style.mw && '1' === style.mo, JSON.stringify( style ) );
		await d.locator( '[data-id="ncl0001"]' ).screenshot( { path: join( SHOTS, 'left.png' ) } );
		await d.context().close();

		// ---------------------------------------------------------------- right, top, bottom, stack
		const e = await at( pRest.url, 1280, 2600 );
		const right = await geo( e, 'ncr0001' );
		const top = await geo( e, 'nct0001' );
		const bottom = await geo( e, 'ncb0001' );
		check( 'positions', 'right: a column right of the slides; top: a row above them; bottom: a row below them', right.nav.left >= right.stage.right && top.nav.bottom <= top.stage.top && top.nav.w > 600 && bottom.nav.top >= bottom.stage.bottom, JSON.stringify( { right, top, bottom } ) );
		await e.click( '[data-id="nct0001"] .refraction-nc__title[data-index="2"]' );
		await sleep( 700 );
		const topAfter = await geo( e, 'nct0001' );
		check( 'positions', 'a horizontal carousel with titles on top: a click shows that slide', 2 === topAfter.active && 2 === topAfter.visible, JSON.stringify( topAfter ) );
		await e.click( '[data-id="ncs0001"] .refraction-nc__title[data-index="2"]' );
		await sleep( 900 );
		const stack = await e.evaluate( () => {
			const slides = [ ...document.querySelectorAll( '[data-id="ncs0001"] .refraction-nc__slide' ) ];
			return { open: slides.findIndex( ( s ) => s.classList.contains( 'is-stack-open' ) ), active: [ ...document.querySelectorAll( '[data-id="ncs0001"] .refraction-nc__title' ) ].findIndex( ( b ) => b.classList.contains( 'is-active' ) ) };
		} );
		check( 'stack', 'with the Stack effect a click on a title opens that card', 2 === stack.open && 2 === stack.active, JSON.stringify( stack ) );
		await e.screenshot( { path: join( SHOTS, 'positions.png' ), fullPage: true } );
		await e.context().close();

		// ---------------------------------------------------------------- phones
		const ph = await at( pRest.url, 390, 844, { isMobile: true, hasTouch: true } );
		const phone = await ph.evaluate( () => {
			const g2 = ( id ) => {
				const root = document.querySelector( `[data-id="${ id }"]` );
				const nav = root.querySelector( '.refraction-nc__titles' );
				const stage = root.querySelector( '.refraction-nc__stage' ).getBoundingClientRect();
				const n = nav.getBoundingClientRect();
				return { display: getComputedStyle( nav ).display, above: n.bottom <= stage.top + 1, row: 'row' === getComputedStyle( nav ).flexDirection, fullWidth: stage.width > 300 };
			};
			return { right: g2( 'ncr0001' ), bottom: g2( 'ncb0001' ), sideways: document.documentElement.scrollWidth > window.innerWidth };
		} );
		check( 'phone', 'on phones titles from the side become a row above the full-width slides (default); a carousel set to hide them has none; no sideways scroll', phone.right.above && phone.right.row && phone.right.fullWidth && 'none' === phone.bottom.display && ! phone.sideways, JSON.stringify( phone ) );
		await ph.screenshot( { path: join( SHOTS, 'phone.png' ) } );
		await ph.context().close();

		// ---------------------------------------------------------------- editor
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const ed = await ctx.newPage();
		watch( ed );
		await ed.goto( `${ BASE }/wp-login.php` );
		await ed.fill( '#user_login', 'admin' );
		await ed.fill( '#user_pass', 'admin' );
		await Promise.all( [ ed.waitForURL( /wp-admin/, { timeout: 120000 } ), ed.click( '#wp-submit' ) ] );
		await ed.goto( `${ BASE }/wp-admin/post.php?post=${ pLeft.id }&action=refraction` );
		await ed.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 4000 );
		const frame = ed.frame( { name: 'refraction-preview-iframe' } );
		const pre = await geo( frame, 'ncl0001' );
		await frame.click( '[data-id="ncl0001"] .refraction-nc__title[data-index="1"]' );
		await sleep( 800 );
		const preAfter = await geo( frame, 'ncl0001' );
		check( 'editor', 'the preview draws the titles beside the slides, and a click there shows that slide', 5 === pre.texts.length && pre.nav.right <= pre.stage.left && 1 === preAfter.active && 1 === preAfter.visible, JSON.stringify( [ pre, preAfter ] ) );
		await ed.evaluate( () => window.$e.run( 'document/elements/settings', { container: window.refraction.getContainer( 'ncl0001' ), settings: { title_nav_position: 'right' } } ) );
		await sleep( 2500 );
		const moved = await geo( frame, 'ncl0001' );
		check( 'editor', 'changing Titles Position moves them at once', moved.nav && moved.nav.left >= moved.stage.right, JSON.stringify( moved ) );
		await ctx.close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 900 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall carousel title checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
