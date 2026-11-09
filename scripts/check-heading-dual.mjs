#!/usr/bin/env node
/**
 * Dual Heading (Heading widget, Heading_Dual_Trait; SQLite test site, Chromium): the highlighted part after the title
 * in its own color or gradient, the text after it (punctuation joined, words after a space), a new line before it,
 * the marks (rounded highlighter, highlighter, underline, background) following the words when they wrap, drawing
 * when scrolled into view (at once with reduced motion), the heading unchanged with it off; and the editor.
 *
 * Usage: node scripts/check-heading-dual.mjs [--site /tmp/rf-hd-site] [--port 9230] [--shots /tmp/heading-dual-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-hd-site' );
const PORT = arg( 'port', '9230' );
const SHOTS = arg( 'shots', '/tmp/heading-dual-shots' );
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
		return p;
	};

	const px = ( size ) => ( { unit: 'px', size } );
	const type = { typography_typography: 'custom', typography_font_size: px( 56 ), typography_font_weight: '800', typography_line_height: { unit: 'em', size: 1.15 } };
	const h = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'heading', settings: { header_size: 'h2', title_color: '#0F2E25', align: 'center', ...type, ...settings }, elements: [] } );
	const dual = { title: 'Pet pros who found their', rf_dual: 'yes', rf_dual_text: 'stride with GoPet AI', rf_dual_after: '.', rf_dual_color: '#0B5D46' };

	try {
		const p1 = page( 'Dual heading', [
			h( 'hd01', { ...dual } ),
			h( 'hd02', { ...dual, rf_dual_break: 'yes', rf_dual_mark: 'marker', rf_dual_mark_color: '#FFE066' } ),
			h( 'hd03', { ...dual, rf_dual_fill: 'gradient', rf_dual_grad_a: '#7C3AED', rf_dual_grad_b: '#EC4899' } ),
			h( 'hd04', { ...dual, rf_dual_mark: 'underline', rf_dual_mark_color: '#E20A17', rf_dual_after: 'and more' } ),
			h( 'hd05', { ...dual, rf_dual_mark: 'block', rf_dual_mark_color: '#0B5D46', rf_dual_color: '#FFFFFF' } ),
			h( 'hd06', { title: 'Plain heading', rf_dual: '', rf_dual_text: 'not shown' } ),
			{ id: 'spacer1', elType: 'container', isInner: true, settings: { min_height: px( 1600 ) }, elements: [] },
			h( 'hd07', { ...dual, rf_dual_draw: 'yes', rf_dual_draw_duration: 700, rf_dual_draw_delay: 0 } ),
		] );

		const b = await at( p1.url, 1280 );
		await sleep( 1000 );
		const info = ( id ) => b.evaluate( ( wid ) => {
			const el = document.querySelector( `[data-id="${ wid }"]` );
			const title = el.querySelector( '.refraction-heading-title' );
			const part = el.querySelector( '.refraction-heading-dual' );
			if ( ! part ) {
				return { text: title.textContent, part: false, edit: title.hasAttribute( 'data-refraction-setting-key' ) };
			}
			const cs = getComputedStyle( part );
			return {
				text: title.textContent, html: title.innerHTML, part: true, color: cs.color, titleColor: getComputedStyle( title ).color,
				bg: cs.backgroundImage.replace( /\s+/g, ' ' ).slice( 0, 400 ), clip: cs.backgroundClip || cs.webkitBackgroundClip, fill: cs.webkitTextFillColor,
				deco: cs.boxDecorationBreak || cs.webkitBoxDecorationBreak, p: cs.getPropertyValue( '--rf-dual-p' ).trim(), drawn: part.classList.contains( 'is-drawn' ),
				rects: part.getClientRects().length, br: !! title.querySelector( 'br' ), radius: cs.borderTopLeftRadius,
			};
		}, id );

		const d1 = await info( 'hd01' );
		check( 'dual', 'title, highlighted part and the full stop read as one sentence', 'Pet pros who found their stride with GoPet AI.' === d1.text, JSON.stringify( d1.text ) );
		check( 'dual', 'the highlighted part has its own color, the rest the title color', 'rgb(11, 93, 70)' === d1.color && 'rgb(15, 46, 37)' === d1.titleColor, JSON.stringify( [ d1.color, d1.titleColor ] ) );
		check( 'dual', 'the default mark is the rounded highlighter (round ends and a band), drawn', 2 === ( d1.bg.match( /radial-gradient/g ) || [] ).length && /linear-gradient/.test( d1.bg ) && /212, 242, 90/.test( d1.bg ) && '1' === d1.p, d1.bg );
		check( 'dual', 'the mark is cut per line (box-decoration-break: clone)', 'clone' === d1.deco, d1.deco );
		check( 'dual', 'no inline editing on the heading while it has the dual parts', ! /data-refraction-setting-key/.test( await b.evaluate( () => document.querySelector( '[data-id="hd01"] .refraction-heading-title' ).outerHTML ) ) );
		await b.locator( '[data-id="hd01"]' ).screenshot( { path: join( SHOTS, 'rounded.png' ) } );

		const d2 = await info( 'hd02' );
		check( 'dual', 'on a new line: a line break before the highlighted part; highlighter in its own color', d2.br && 'Pet pros who found theirstride with GoPet AI.' === d2.text && ! /radial/.test( d2.bg ) && /255, 224, 102/.test( d2.bg ), JSON.stringify( d2 ) );
		await b.locator( '[data-id="hd02"]' ).screenshot( { path: join( SHOTS, 'marker-new-line.png' ) } );

		const d3 = await info( 'hd03' );
		check( 'dual', 'gradient fill: the words are filled with the gradient, no mark', 'text' === d3.clip && 'rgba(0, 0, 0, 0)' === d3.fill && /124, 58, 237/.test( d3.bg ) && ! /radial/.test( d3.bg ), JSON.stringify( d3 ) );
		await b.locator( '[data-id="hd03"]' ).screenshot( { path: join( SHOTS, 'gradient.png' ) } );

		const d4 = await info( 'hd04' );
		check( 'dual', 'words after the part get a space; underline mark', 'Pet pros who found their stride with GoPet AI and more' === d4.text && /226, 10, 23/.test( d4.bg ), JSON.stringify( d4 ) );
		const d5 = await info( 'hd05' );
		check( 'dual', 'background mark with rounded corners, white words', 'rgb(255, 255, 255)' === d5.color && '0px' !== d5.radius && /11, 93, 70/.test( d5.bg ), JSON.stringify( d5 ) );
		await b.locator( '[data-id="hd04"]' ).screenshot( { path: join( SHOTS, 'underline.png' ) } );
		await b.locator( '[data-id="hd05"]' ).screenshot( { path: join( SHOTS, 'background.png' ) } );

		const d6 = await info( 'hd06' );
		check( 'dual', 'switched off: the plain title only, inline editing kept', 'Plain heading' === d6.text && ! d6.part, JSON.stringify( d6 ) );

		// Drawing when scrolled into view.
		const d7a = await info( 'hd07' );
		check( 'draw', 'below the fold the mark waits undrawn', ! d7a.drawn && '0' === d7a.p, JSON.stringify( [ d7a.drawn, d7a.p ] ) );
		await b.locator( '[data-id="hd07"]' ).scrollIntoViewIfNeeded();
		await sleep( 350 );
		const mid = Number( ( await info( 'hd07' ) ).p );
		await b.locator( '[data-id="hd07"]' ).screenshot( { path: join( SHOTS, 'drawing.png' ) } );
		await sleep( 1200 );
		const d7 = await info( 'hd07' );
		check( 'draw', 'scrolled into view it draws across (part way after 350 ms, whole after the drawing time)', mid > 0 && mid < 1 && d7.drawn && '1' === d7.p, JSON.stringify( [ mid, d7.p ] ) );
		await b.locator( '[data-id="hd07"]' ).screenshot( { path: join( SHOTS, 'drawn.png' ) } );
		await b.context().close();

		const rm = await at( p1.url, 1280, 900, { reducedMotion: 'reduce' } );
		await sleep( 800 );
		const reduced = await rm.evaluate( () => getComputedStyle( document.querySelector( '[data-id="hd07"] .refraction-heading-dual' ) ).getPropertyValue( '--rf-dual-p' ).trim() );
		check( 'draw', 'with reduced motion the mark is there at once', '1' === reduced, reduced );
		await rm.context().close();

		// Phone: the highlighted part wraps, the mark follows each line.
		const ph = await at( p1.url, 390, 844 );
		await sleep( 800 );
		const wrap = await ph.evaluate( () => {
			const part = document.querySelector( '[data-id="hd01"] .refraction-heading-dual' ); const r = [ ...part.getClientRects() ]; return { lines: r.length, widths: r.map( ( x ) => Math.round( x.width ) ), page: document.documentElement.scrollWidth };
		} );
		check( 'phone', 'the highlighted part wraps onto two lines with the mark on each, no sideways scroll', wrap.lines >= 2 && wrap.widths.every( ( w ) => w > 40 ) && wrap.page <= 390, JSON.stringify( wrap ) );
		await ph.locator( '[data-id="hd01"]' ).screenshot( { path: join( SHOTS, 'phone-wrap.png' ) } );
		await ph.context().close();

		// The editor: the panel has the settings, the preview renders the parts.
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
		const panel = await e.evaluate( () => {
			const c = window.refraction.widgetsCache.heading?.controls || {}; return [ 'rf_dual', 'rf_dual_text', 'rf_dual_after', 'rf_dual_break', 'rf_dual_fill', 'rf_dual_color', 'rf_dual_mark', 'rf_dual_mark_color', 'rf_dual_mark_height', 'rf_dual_draw' ].filter( ( k ) => ! c[ k ] );
		} );
		check( 'editor', 'Heading has the Dual Heading settings', 0 === panel.length, JSON.stringify( panel ) );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const inEditor = await frame.evaluate( () => ( { text: document.querySelector( '[data-id="hd01"] .refraction-heading-title' )?.textContent, parts: document.querySelectorAll( '.refraction-heading-dual' ).length, plain: document.querySelector( '[data-id="hd06"] .refraction-heading-title' )?.textContent } ) );
		check( 'editor', 'the preview shows the dual parts (six headings) and the plain one', 'Pet pros who found their stride with GoPet AI.' === inEditor.text && 6 === inEditor.parts && 'Plain heading' === inEditor.plain, JSON.stringify( inEditor ) );

		// Change the highlighted text in the panel: the editor template renders it.
		await e.evaluate( () => {
			const c = window.refraction.getContainer( 'hd01' ); window.$e.run( 'document/elements/settings', { container: c, settings: { rf_dual_text: 'a new stride', rf_dual_after: '!' } } );
		} );
		await sleep( 1200 );
		const changed = await frame.evaluate( () => document.querySelector( '[data-id="hd01"] .refraction-heading-title' )?.textContent );
		check( 'editor', 'changing the highlighted text and the text after it updates the preview', 'Pet pros who found their a new stride!' === changed, JSON.stringify( changed ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall dual heading checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
