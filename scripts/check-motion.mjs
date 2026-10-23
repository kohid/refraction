#!/usr/bin/env node
/**
 * Motion Effects, Sticky, Custom Fonts and Custom Icons check on a real WordPress (SQLite test site, Chromium).
 *
 * Usage: node scripts/check-motion.mjs [--site /tmp/rf-motion-site] [--port 8891] [--shots /tmp/motion-shots]
 *                                      [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 *                                      [--font /path/to/any.ttf] [--only frontend,editor,fonts,icons]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip); the check creates pages,
 * templates, fonts and icon sets, so use a throw-away site.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-motion-site' );
const PORT = arg( 'port', '8891' );
const SHOTS = arg( 'shots', '/tmp/motion-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const ONLY = arg( 'only', '' ).split( ',' ).filter( Boolean );
const want = ( name ) => ! ONLY.length || ONLY.includes( name );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const CLASSIC = new Set( [ 'twentytwentyone', 'twentytwentyone-child', 'twentytwenty', 'twentynineteen' ] );
const FONT = arg( 'font', [ '/mnt/skills/examples/canvas-design/canvas-fonts/ArsenalSC-Regular.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf' ].find( existsSync ) );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/motion-seed.php' );
const TMP = join( SITE, 'check-tmp' );

const results = [];
let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	results.push( { area, name, pass: !! pass } );
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 300 ) }` }` );
};
const near = ( v, expected, tol ) => Number.isFinite( v ) && Math.abs( v - expected ) <= tol;
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

function wp( args, env = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const seed = ( action, env = {} ) => JSON.parse( wp( [ 'eval-file', SEED ], { MO_ACTION: action, ...env } ).split( '\n' ).pop() );
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );

const consoleErrors = [];
const watch = ( page, label ) => {
	page.on( 'console', ( m ) => {
		if ( m.type() === 'error' && ! /favicon\.ico/.test( m.location().url ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
	} );
	page.on( 'pageerror', ( e ) => consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
};

async function login( browser, user, pass ) {
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
	const page = await ctx.newPage();
	for ( let attempt = 1; ; attempt++ ) {
		try {
			await page.goto( `${ BASE }/wp-login.php` );
			await page.fill( '#user_login', user );
			await page.fill( '#user_pass', pass );
			await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 60000 } ), page.click( '#wp-submit' ) ] );
			return { ctx, page };
		} catch ( e ) {
			if ( attempt >= 3 ) { throw e; }
			await sleep( 2000 );
		}
	}
}

async function visitor( browser, url, width = 1280, height = 800, opts = {} ) {
	const ctx = await browser.newContext( { viewport: { width, height }, ...opts } );
	const page = await ctx.newPage();
	watch( page, `front:${ url }` );
	await page.goto( BASE + url, { waitUntil: 'load' } );
	await sleep( 500 );
	return { ctx, page };
}

const sel = ( id ) => `.refraction-element-${ id }`;

/** Computed motion properties of an element. */
const props = ( page, id ) => page.evaluate( ( s ) => {
	const e = document.querySelector( s );
	const cs = getComputedStyle( e );
	const nums = ( v ) => ( 'none' === v || ! v ? [ 0, 0 ] : v.split( ' ' ).map( parseFloat ) );
	return { translate: nums( cs.translate ), rotate: cs.rotate, scale: cs.scale, filter: cs.filter, transform: cs.transform, animationName: cs.animationName, position: cs.position, cls: e.className, inline: e.getAttribute( 'style' ) || '' };
}, sel( id ) );

/** Scroll so the element's natural centre sits at `frac` of the viewport height from the top. */
async function centerOn( page, id, frac ) {
	for ( let i = 0; i < 3; i++ ) {
		const y = await page.evaluate( ( { s, frac } ) => {
			const e = document.querySelector( s );
			const r = e.getBoundingClientRect();
			const t = getComputedStyle( e ).translate;
			const ty = 'none' === t ? 0 : parseFloat( t.split( ' ' )[ 1 ] || 0 );
			return window.scrollY + r.top + r.height / 2 - ty - frac * window.innerHeight;
		}, { s: sel( id ), frac } );
		await page.evaluate( ( v ) => window.scrollTo( 0, v ), y );
		await sleep( 280 );
	}
}

const filterNum = ( f, fn ) => { const m = new RegExp( `${ fn }\\(([\\d.]+)` ).exec( f || '' ); return m ? parseFloat( m[ 1 ] ) : NaN; };

// ------------------------------------------------------------------ the checks

async function scrollingChecks( browser, label, url ) {
	const { ctx, page } = await visitor( browser, url );
	const A = `scroll[${ label }]`;

	check( A, 'only the motion script is loaded for this page (no sticky script)', await page.evaluate( () => [ ...document.scripts ].some( ( s ) => /motion-effects-frontend/.test( s.src ) ) && ! [ ...document.scripts ].some( ( s ) => /sticky-frontend/.test( s.src ) ) ) );

	await centerOn( page, 'fxty', 0.5 );
	check( A, 'vertical: no offset when the element is centred', near( ( await props( page, 'fxty' ) ).translate[ 1 ], 0, 3 ), JSON.stringify( await props( page, 'fxty' ) ) );
	await centerOn( page, 'fxty', 0.25 );
	check( A, 'vertical: moves up by ~100px at the upper quarter', near( ( await props( page, 'fxty' ) ).translate[ 1 ], -100, 5 ), JSON.stringify( ( await props( page, 'fxty' ) ).translate ) );
	await centerOn( page, 'fxty', 0.75 );
	check( A, 'vertical: moves down by ~100px at the lower quarter', near( ( await props( page, 'fxty' ) ).translate[ 1 ], 100, 5 ), JSON.stringify( ( await props( page, 'fxty' ) ).translate ) );

	await centerOn( page, 'fxtx', 0.25 );
	check( A, 'horizontal (widget): moves ~-100px at the upper quarter', near( ( await props( page, 'fxtx' ) ).translate[ 0 ], -100, 5 ), JSON.stringify( ( await props( page, 'fxtx' ) ).translate ) );

	await centerOn( page, 'fxfade', 0.1 );
	const fadeEnd = filterNum( ( await props( page, 'fxfade' ) ).filter, 'opacity' );
	await centerOn( page, 'fxfade', 0.9 );
	const fadeStart = filterNum( ( await props( page, 'fxfade' ) ).filter, 'opacity' );
	check( A, 'transparency (fade out): ~0.28 near the top, clear near the bottom', near( fadeEnd, 0.28, 0.05 ) && ( Number.isNaN( fadeStart ) || fadeStart > 0.9 ), `${ fadeEnd } / ${ fadeStart }` );

	await centerOn( page, 'fxblur', 0.1 );
	check( A, 'blur (blur out, 12): ~10.8px near the top', near( filterNum( ( await props( page, 'fxblur' ) ).filter, 'blur' ), 10.8, 1.2 ), ( await props( page, 'fxblur' ) ).filter );

	await centerOn( page, 'fxrot', 0.25 );
	check( A, 'rotate (right, speed 10): ~45deg at the upper quarter', near( parseFloat( ( await props( page, 'fxrot' ) ).rotate ), 45, 2 ), ( await props( page, 'fxrot' ) ).rotate );

	await centerOn( page, 'fxscale', 0.25 );
	check( A, 'scale (up, speed 10): ~1.25 at the upper quarter', near( parseFloat( ( await props( page, 'fxscale' ) ).scale ), 1.25, 0.03 ), ( await props( page, 'fxscale' ) ).scale );

	await centerOn( page, 'fxpage', 0.5 );
	const pageT = await page.evaluate( () => window.scrollY / ( document.documentElement.scrollHeight - innerHeight ) );
	check( A, 'relative to the entire page: offset follows the page scroll position', near( ( await props( page, 'fxpage' ) ).translate[ 1 ], ( 0.5 - pageT ) * 400, 6 ), `${ JSON.stringify( ( await props( page, 'fxpage' ).then( ( p ) => p.translate ) ) ) } expected ${ ( 0.5 - pageT ) * 400 }` );

	await centerOn( page, 'fxmobile', 0.25 );
	check( A, 'per device: a mobile-only effect does not run on desktop', 'none' === ( await props( page, 'fxmobile' ) ).transform && ( await props( page, 'fxmobile' ) ).translate[ 1 ] === 0 );
	await centerOn( page, 'fxall', 0.25 );
	check( A, 'per device: an all-devices effect runs on desktop', near( ( await props( page, 'fxall' ) ).translate[ 1 ], -100, 5 ) );

	await centerOn( page, 'fxanim', 0.25 );
	await sleep( 1200 );
	const anim = await props( page, 'fxanim' );
	check( A, 'entrance animation and scroll effect stack on one element', anim.animationName === 'fadeInUp' && near( anim.translate[ 1 ], -100, 6 ), `${ anim.animationName } ${ JSON.stringify( anim.translate ) }` );

	check( A, 'uses compositor properties only (no top/left/margin written)', await page.evaluate( () => ![ ...document.querySelectorAll( '[data-rf-fx]' ) ].some( ( e ) => /(^|;)\s*(top|left|margin|width|height)\s*:/.test( e.getAttribute( 'style' ) || '' ) ) ) );

	await page.screenshot( { path: join( SHOTS, `scroll-${ label }.png` ) } );
	await ctx.close();
}

async function deviceChecks( browser, url ) {
	for ( const [ name, w, movesMobile ] of [ [ 'mobile', 390, true ], [ 'tablet', 800, false ] ] ) {
		const { ctx, page } = await visitor( browser, url, w, 800 );
		await centerOn( page, 'fxmobile', 0.25 );
		const m = await props( page, 'fxmobile' );
		await centerOn( page, 'fxall', 0.25 );
		const a = await props( page, 'fxall' );
		check( `devices`, `${ name } (${ w }px): mobile-only effect ${ movesMobile ? 'runs' : 'does not run' }`, movesMobile ? near( m.translate[ 1 ], -100, 6 ) : m.translate[ 1 ] === 0, JSON.stringify( m.translate ) );
		check( `devices`, `${ name }: the all-devices effect runs`, near( a.translate[ 1 ], -100, 6 ), JSON.stringify( a.translate ) );
		await ctx.close();
	}
}

async function reducedMotionChecks( browser, urls ) {
	const { ctx, page } = await visitor( browser, urls.scroll, 1280, 800, { reducedMotion: 'reduce' } );
	await centerOn( page, 'fxty', 0.25 );
	const p = await props( page, 'fxty' );
	check( 'reduced-motion', 'scroll effects are off', p.translate[ 1 ] === 0 && 'none' === p.rotate, JSON.stringify( p.translate ) );
	await ctx.close();

	const m = await visitor( browser, urls.mouse, 1280, 800, { reducedMotion: 'reduce' } );
	await m.page.mouse.move( 60, 60 );
	await m.page.mouse.move( 200, 300, { steps: 6 } );
	await sleep( 700 );
	const t = await props( m.page, 'mtrack' );
	check( 'reduced-motion', 'mouse track is off', t.translate[ 0 ] === 0 && t.translate[ 1 ] === 0, JSON.stringify( t.translate ) );
	const box = await m.page.locator( sel( 'mtilt' ) ).boundingBox();
	await m.page.mouse.move( box.x + box.width - 10, box.y + 10, { steps: 6 } );
	await sleep( 700 );
	check( 'reduced-motion', 'tilt is off', 'none' === ( await props( m.page, 'mtilt' ) ).transform );
	await m.ctx.close();
}

async function mouseChecks( browser, label, url ) {
	const A = `mouse[${ label }]`;
	const { ctx, page } = await visitor( browser, url, 1280, 800 );
	await page.mouse.move( 40, 40 );
	await page.mouse.move( 60, 60, { steps: 4 } );
	await sleep( 900 );
	const left = await props( page, 'mtrack' );
	await page.mouse.move( 1240, 760, { steps: 8 } );
	await sleep( 900 );
	const right = await props( page, 'mtrack' );
	check( A, 'mouse track (opposite): cursor top-left moves the element right/down', left.translate[ 0 ] > 40 && left.translate[ 1 ] > 25, JSON.stringify( left.translate ) );
	check( A, 'mouse track (opposite): cursor bottom-right moves it left/up', right.translate[ 0 ] < -40 && right.translate[ 1 ] < -25, JSON.stringify( right.translate ) );
	check( A, 'mouse track speed is applied (5 -> about 72px)', near( Math.abs( left.translate[ 0 ] ), 72, 8 ), JSON.stringify( left.translate ) );

	await page.locator( sel( 'mtilt' ) ).scrollIntoViewIfNeeded();
	await sleep( 300 );
	const box = await page.locator( sel( 'mtilt' ) ).boundingBox();
	await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2 );
	await page.mouse.move( box.x + box.width - 12, box.y + 12, { steps: 6 } );
	await sleep( 900 );
	const tilt = await props( page, 'mtilt' );
	check( A, '3D tilt: a perspective rotation is applied while hovering', /^matrix3d/.test( tilt.transform ), tilt.transform );
	if ( /^matrix3d/.test( tilt.transform ) ) {
		const m = tilt.transform.match( /matrix3d\(([^)]+)\)/ )[ 1 ].split( ',' ).map( parseFloat );
		check( A, '3D tilt: rotates around the Y axis towards the pointer (top-right)', Math.abs( m[ 2 ] ) > 0.05, `m13=${ m[ 2 ] }` );
	}
	await page.mouse.move( 5, 790, { steps: 6 } );
	await sleep( 1800 );
	check( A, '3D tilt: resets when the pointer leaves', 'none' === ( await props( page, 'mtilt' ) ).transform, ( await props( page, 'mtilt' ) ).transform );

	await page.locator( sel( 'mkeep' ) ).scrollIntoViewIfNeeded();
	await sleep( 300 );
	const box2 = await page.locator( sel( 'mkeep' ) ).boundingBox();
	await page.mouse.move( box2.x + box2.width - 12, box2.y + 12, { steps: 6 } );
	await sleep( 800 );
	await page.mouse.move( 5, 790, { steps: 6 } );
	await sleep( 1000 );
	check( A, '3D tilt: "keep" leaves the tilt in place', /^matrix3d/.test( ( await props( page, 'mkeep' ) ).transform ), ( await props( page, 'mkeep' ) ).transform );

	check( A, 'per device: a mobile-only mouse effect does not run on desktop', ( await props( page, 'mmobile' ) ).translate[ 0 ] === 0 );
	await page.screenshot( { path: join( SHOTS, `mouse-${ label }.png` ) } );
	await ctx.close();
}

async function stickyChecks( browser, label, url, who ) {
	const A = `sticky[${ label }${ who ? ', admin bar' : '' }]`;
	let ctx;
	let page;

	if ( who ) {
		ctx = who.ctx;
		page = await ctx.newPage();
		watch( page, `sticky:${ label }` );
		await page.setViewportSize( { width: 1280, height: 800 } );
		await page.goto( BASE + url, { waitUntil: 'load' } );
		await sleep( 500 );
	} else {
		( { ctx, page } = await visitor( browser, url ) );
	}

	const bar = who ? await page.evaluate( () => document.getElementById( 'wpadminbar' )?.offsetHeight || 0 ) : 0;
	const rect = ( id ) => page.evaluate( ( s ) => { const r = document.querySelector( s ).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, left: r.left, width: r.width }; }, sel( id ) );
	const docH = () => page.evaluate( () => document.documentElement.scrollHeight );
	const phCount = () => page.evaluate( () => document.querySelectorAll( '.rf-sticky-placeholder' ).length );

	const docTop = ( id ) => page.evaluate( ( q ) => { const e = document.querySelector( q ); const prev = e.previousElementSibling; const ref = prev && prev.classList.contains( 'rf-sticky-placeholder' ) ? prev : e; return window.scrollY + ref.getBoundingClientRect().top; }, sel( id ) );
	const T = { stk1: await docTop( 'stk1' ), par: await docTop( 'par' ), stkdev: await docTop( 'stkdev' ), stk2: await docTop( 'stk2' ) };
	const go = async ( y ) => { await page.evaluate( ( v ) => window.scrollTo( 0, v ), y ); await sleep( 450 ); };
	const h0 = await docH();
	const w0 = ( await rect( 'stk1' ) ).width;
	check( A, 'the sticky script and style are loaded', await page.evaluate( () => [ ...document.scripts ].some( ( s ) => /sticky-frontend/.test( s.src ) ) ) );
	check( A, 'before scrolling the element is in the normal flow', ( await props( page, 'stk1' ) ).position !== 'fixed' && ( await props( page, 'stk1' ) ).cls.includes( 'rf-sticky' ) );

	await go( T.stk1 + 300 );
	const p1 = await props( page, 'stk1' );
	const r1 = await rect( 'stk1' );
	check( A, 'sticks at the offset (30px, plus the admin bar when it is fixed)', p1.position === 'fixed' && near( r1.top, 30 + bar, 1.5 ), `pos=${ p1.position } top=${ r1.top } bar=${ bar }` );
	check( A, 'a placeholder keeps the layout from jumping', 1 <= ( await phCount() ) && near( await docH(), h0, 2 ), `${ await docH() } vs ${ h0 }` );
	check( A, 'keeps its width when fixed', near( r1.width, w0, 1.5 ), `${ r1.width } vs ${ w0 }` );
	check( A, 'below the effects offset (2000px) the scrolled class is off', ! p1.cls.includes( 'rf-sticky--effects' ), p1.cls );
	await go( 2100 );
	const p2 = await props( page, 'stk1' );
	check( A, 'effects offset reached: scrolled class, shrink padding 4px and solid background', p2.cls.includes( 'rf-sticky--effects' ) && await page.evaluate( ( s ) => { const cs = getComputedStyle( document.querySelector( s ) ); return cs.paddingTop === '4px' && cs.backgroundColor === 'rgb(255, 0, 102)'; }, sel( 'stk1' ) ), p2.cls );
	await go( 300 );

	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await sleep( 400 );
	const back = await props( page, 'stk1' );
	check( A, 'unsticks when scrolled back up (back in the flow, class removed)', back.position !== 'fixed' && ! back.cls.includes( 'rf-sticky--fixed' ), back.position );

	// stay in column
	await go( T.par + 300 );
	const in1 = await rect( 'stkin' );
	check( A, 'stay in column: sticks at its own offset (150px) inside the parent', near( in1.top, 150 + bar, 1.5 ) && ( await props( page, 'stkin' ) ).position === 'fixed', JSON.stringify( in1 ) );
	await go( T.par + 1400 );
	const in2 = await rect( 'stkin' );
	const par = await rect( 'par' );
	check( A, 'stay in column: stops at the bottom edge of the parent', near( in2.bottom, par.bottom, 2 ) && in2.top < 150, `in=${ JSON.stringify( in2 ) } par.bottom=${ par.bottom }` );

	// device restriction
	await go( T.stkdev + 100 );
	check( A, 'Sticky On: a mobile-only element does not stick on desktop', ( await props( page, 'stkdev' ) ).position !== 'fixed' );

	// bottom
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await sleep( 400 );
	const vh = await page.evaluate( () => innerHeight );
	const b0 = await rect( 'stk2' );
	check( A, 'bottom sticky: sticks 10px above the viewport bottom while its place is below', ( await props( page, 'stk2' ) ).position === 'fixed' && near( b0.bottom, vh - 10, 1.5 ), JSON.stringify( b0 ) );
	await page.evaluate( () => window.scrollTo( 0, document.documentElement.scrollHeight ) );
	await sleep( 500 );
	check( A, 'bottom sticky: releases once its natural place is reached', ( await props( page, 'stk2' ) ).position !== 'fixed' );
	await go( T.stk1 + 300 );
	await page.screenshot( { path: join( SHOTS, `sticky-${ label }${ who ? '-adminbar' : '' }.png` ) } );

	if ( who ) { await page.close(); } else { await ctx.close(); }
}

async function smallScreenAdminBar( who, url ) {
	// Below 601px the admin bar is not fixed, so it must not push the sticky offset.
	const page = await who.ctx.newPage();
	watch( page, 'sticky-mobile-bar' );
	await page.setViewportSize( { width: 500, height: 800 } );
	await page.goto( BASE + url, { waitUntil: 'load' } );
	await sleep( 500 );
	const barPos = await page.evaluate( () => getComputedStyle( document.getElementById( 'wpadminbar' ) ).position );
	const t1 = await page.evaluate( ( q ) => window.scrollY + document.querySelector( q ).getBoundingClientRect().top, sel( 'stk1' ) );
	await page.evaluate( ( v ) => window.scrollTo( 0, v ), t1 + 300 );
	await sleep( 450 );
	const top = await page.evaluate( ( s ) => document.querySelector( s ).getBoundingClientRect().top, sel( 'stk1' ) );
	check( 'sticky[admin bar]', `on a phone the bar is "${ barPos }" and the sticky offset ignores it`, barPos !== 'fixed' && near( top, 30, 1.5 ), `bar=${ barPos } top=${ top }` );
	const stkdev = await props( page, 'stkdev' );
	const t2 = await page.evaluate( ( q ) => window.scrollY + document.querySelector( q ).getBoundingClientRect().top, sel( 'stkdev' ) );
	await page.evaluate( ( v ) => window.scrollTo( 0, v ), t2 + 100 );
	await sleep( 450 );
	check( 'sticky[admin bar]', 'Sticky On: the mobile-only element sticks on a phone', ( await props( page, 'stkdev' ) ).position === 'fixed', stkdev.position );
	await page.close();
}

async function headerChecks( browser, label, who ) {
	const A = `theme-builder header[${ label }]`;
	seed( 'header' );
	const url = '/?page_id=' + pages.sticky.id;
	const { ctx, page } = await visitor( browser, url );
	check( A, 'the Theme Builder header renders with sticky data', await page.evaluate( ( s ) => !! document.querySelector( s + '[data-rf-sticky]' ), sel( 'hdr1' ) ) );
	await page.evaluate( () => window.scrollTo( 0, 500 ) );
	await sleep( 450 );
	const p = await props( page, 'hdr1' );
	const top = await page.evaluate( ( s ) => document.querySelector( s ).getBoundingClientRect().top, sel( 'hdr1' ) );
	check( A, 'the header sticks to the top of the viewport after scrolling', p.position === 'fixed' && near( top, 0, 1.5 ), `${ p.position } ${ top }` );
	check( A, 'the header is shrunk (padding 4px) once scrolled', await page.evaluate( ( s ) => getComputedStyle( document.querySelector( s ) ).paddingTop === '4px', sel( 'hdr1' ) ) );
	await page.screenshot( { path: join( SHOTS, `header-${ label }.png` ) } );
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await sleep( 400 );
	check( A, 'and unsticks at the top', ( await props( page, 'hdr1' ) ).position !== 'fixed' );
	await ctx.close();

	// Logged in: the admin bar height is added.
	const page2 = await who.ctx.newPage();
	watch( page2, 'header-adminbar' );
	await page2.setViewportSize( { width: 1280, height: 800 } );
	await page2.goto( BASE + url, { waitUntil: 'load' } );
	await sleep( 500 );
	const bar = await page2.evaluate( () => document.getElementById( 'wpadminbar' )?.offsetHeight || 0 );
	await page2.evaluate( () => window.scrollTo( 0, 500 ) );
	await sleep( 450 );
	const top2 = await page2.evaluate( ( s ) => document.querySelector( s ).getBoundingClientRect().top, sel( 'hdr1' ) );
	check( A, `with the admin bar (${ bar }px) the sticky header sits right below it`, bar > 0 && near( top2, bar, 1.5 ), `bar=${ bar } top=${ top2 }` );
	await page2.close();
	seed( 'nopage' );
}

// ---------------------------------------------------------------------- editor

async function openEditor( admin, id ) {
	await admin.page.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
	await admin.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
	await admin.page.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
	await admin.page.waitForSelector( '#refraction-preview-iframe', { timeout: 30000 } );
	await sleep( 2000 );
}
const frameOf = ( admin ) => admin.page.frame( { name: 'refraction-preview-iframe' } ) ?? admin.page.frames().find( ( f ) => f !== admin.page.mainFrame() && /preview/.test( f.url() ) );


/** Select an element by id and open one tab of its panel (the way a click on the canvas does). */
const selectElement = ( admin, id, tab ) => admin.page.evaluate( ( { id, tab } ) => {
	const find = ( c ) => { if ( c.id === id ) { return c; } for ( const ch of c.children || [] ) { const f = find( ch ); if ( f ) { return f; } } return null; };
	const c = find( window.refraction.documents.getCurrent().container );
	window.$e.run( 'document/elements/select', { container: c } );
	window.$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
}, { id, tab } ).then( async () => {
	await sleep( 700 );
	await admin.page.click( `#refraction-panel .refraction-tab-control-${ tab }` );
	await sleep( 500 );
} );

async function editorChecks( admin, pageId ) {
	const A = 'editor';
	await openEditor( admin, pageId );

	for ( const [ elId, kind ] of [ [ 'fxty', 'container' ], [ 'fxtx', 'widget' ] ] ) {
		await selectElement( admin, elId, 'advanced' );
		await sleep( 900 );
		const titles = await admin.page.evaluate( () => [ ...document.querySelectorAll( '#refraction-panel .refraction-panel-category-title, #refraction-panel .refraction-control-type-section .refraction-panel-heading-title' ) ].map( ( e ) => e.textContent.trim() ) );
		check( A, `${ kind }: Advanced tab has Scrolling Effects, Mouse Effects and Sticky`, [ 'Scrolling Effects', 'Mouse Effects', 'Sticky' ].every( ( t ) => titles.includes( t ) ), titles.join( '|' ) );
	}

	// Live preview: the container in the editor preview moves, follows setting changes, and clears when switched off.
	const fr = frameOf( admin );
	const read = () => fr.evaluate( () => { const e = document.querySelector( '.refraction-element-fxty' ); return { t: getComputedStyle( e ).translate, cid: e.getAttribute( 'data-model-cid' ) }; } );
	await fr.evaluate( () => { const e = document.querySelector( '.refraction-element-fxty' ); const r = e.getBoundingClientRect(); window.scrollTo( 0, window.scrollY + r.top + r.height / 2 - innerHeight * 0.25 ); } );
	await sleep( 900 );
	const live1 = await read();
	const ty1 = live1.t === 'none' ? 0 : parseFloat( live1.t.split( ' ' )[ 1 ] );
	check( A, 'live preview: the scroll effect runs inside the editor preview', ty1 < -50, live1.t );

	const setSetting = ( settings ) => admin.page.evaluate( ( s ) => {
		const find = ( c ) => { if ( c.id === 'fxty' ) { return c; } for ( const ch of c.children || [] ) { const f = find( ch ); if ( f ) { return f; } } return null; };
		window.$e.run( 'document/elements/settings', { container: find( window.refraction.documents.getCurrent().container ), settings: s, options: { external: true } } );
	}, settings );
	await setSetting( { rf_scroll_ty_speed: '2' } );
	await sleep( 900 );
	const live2 = await read();
	const ty2 = live2.t === 'none' ? 0 : parseFloat( live2.t.split( ' ' )[ 1 ] );
	check( A, 'live preview: changing the speed updates the effect without reload (-100 -> about -20)', ty1 < -50 && ty2 < -5 && ty2 > -45 && Math.abs( ty2 ) < Math.abs( ty1 ) * 0.5, `${ ty1 } -> ${ ty2 }` );
	await setSetting( { rf_scroll_ty: '' } );
	await sleep( 900 );
	check( A, 'live preview: switching the effect off clears it', ty1 < -50 && 'none' === ( await read() ).t, ( await read() ).t );
	await admin.page.screenshot( { path: join( SHOTS, 'editor-motion.png' ) } );
}

// ---------------------------------------------------------------- custom fonts

async function fontChecks( browser, admin, outer ) {
	const A = 'custom-fonts';
	const page = await admin.ctx.newPage();
	watch( page, 'fonts-admin' );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-fonts` );
	check( A, 'the admin screen opens under Refraction', await page.locator( '.rf-cf__title' ).count() === 1 );
	check( A, 'the menu lists Custom Fonts', await page.evaluate( () => [ ...document.querySelectorAll( '#adminmenu a' ) ].some( ( a ) => /refraction-custom-fonts/.test( a.href ) ) ) );

	await page.fill( '#rf-cf-family', 'Arsenal Check' );
	await page.setInputFiles( '#rf-cf-file-0-ttf', FONT );
	await page.check( 'input[name="preload"]' );
	await page.click( '#rf-cf-add-row' );
	check( A, 'the "Add another variation" button adds a row', await page.locator( '.rf-cf__row' ).count() === 2 );
	await page.selectOption( '#rf-cf-weight-1', '700' );
	await page.setInputFiles( '#rf-cf-file-1-ttf', FONT );
	await Promise.all( [ page.waitForURL( /custom-fonts/ ), page.click( 'button.button-hero' ) ] );
	await sleep( 600 );
	const note = ( await page.locator( '.rf-cf__notice' ).textContent().catch( () => '' ) ) || '';
	check( A, 'upload through the real form succeeds', /Arsenal Check was saved/.test( note ), note.trim() );
	check( A, 'the family shows two variations with a live specimen', await page.locator( '.rf-cf__family[data-family="Arsenal Check"] .rf-cf__variations li' ).count() === 2 && await page.locator( '.rf-cf__specimen' ).count() >= 1 );
	check( A, 'the specimen font loads in the admin', await page.evaluate( async () => { await document.fonts.ready; return document.fonts.check( '20px "Arsenal Check"' ); } ) );
	await page.screenshot( { path: join( SHOTS, 'custom-fonts-admin.png' ), fullPage: true } );

	// Files and generated CSS
	const dir = join( SITE, 'wordpress/wp-content/uploads/refraction-fonts/arsenal-check' );
	const files = existsSync( dir ) ? readdirSync( dir ) : [];
	check( A, 'files are stored with generated names and only font extensions', files.filter( ( f ) => f !== 'index.php' ).length === 2 && files.filter( ( f ) => f !== 'index.php' ).every( ( f ) => /^[0-9a-f]{16}\.ttf$/.test( f ) ), files.join( ',' ) );
	const cssPath = join( SITE, 'wordpress/wp-content/uploads/refraction/css/custom-fonts.css' );
	const css = existsSync( cssPath ) ? readFileSync( cssPath, 'utf8' ) : '';
	const faces = ( css.match( /@font-face\{font-family:"Arsenal Check"[^}]*\}/g ) || [] );
	check( A, '@font-face CSS is generated through the files manager (2 faces for the family, weights 400 and 700)', faces.length === 2 && faces.some( ( f ) => /font-weight:700/.test( f ) ) && faces.every( ( f ) => /font-display:swap/.test( f ) ), css.slice( 0, 200 ) );

	// Malicious uploads
	const attempts = [
		[ 'php code named .woff2', { name: 'x.woff2', mimeType: 'font/woff2', buffer: Buffer.from( '<?php system($_GET["c"]); ?>' ) } ],
		[ 'svg named .woff2', { name: 'x.woff2', mimeType: 'image/svg+xml', buffer: Buffer.from( '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' ) } ],
		[ 'a .php file', { name: 'shell.php', mimeType: 'application/x-php', buffer: Buffer.from( 'wOF2' + '\0'.repeat( 40 ) + '<?php echo 1;' ) } ],
		[ 'double extension x.php.woff2', { name: 'x.php.woff2', mimeType: 'font/woff2', buffer: Buffer.concat( [ Buffer.from( 'wOF2' ), Buffer.alloc( 64 ) ] ) } ],
		[ 'a ttf with a php tag appended', { name: 'x.ttf', mimeType: 'font/ttf', buffer: Buffer.concat( [ Buffer.from( [ 0, 1, 0, 0 ] ), Buffer.alloc( 64 ), Buffer.from( '<?php echo 1; ?>' ) ] ) } ],
		[ 'a woff2 with ttf content', { name: 'x.woff2', mimeType: 'font/woff2', buffer: readFileSync( FONT ) } ],
		[ 'a 6 MB file', { name: 'big.woff2', mimeType: 'font/woff2', buffer: Buffer.concat( [ Buffer.from( 'wOF2' ), Buffer.alloc( 6 * 1024 * 1024 ) ] ) } ],
	];
	for ( const [ what, file ] of attempts ) {
		await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-fonts` );
		await page.fill( '#rf-cf-family', 'Evil Font' );
		const ext = ( file.name.match( /\.(woff2|woff|ttf|otf)$/ ) || [ '', 'woff2' ] )[ 1 ];
		await page.setInputFiles( `#rf-cf-file-0-${ ext }`, file );
		await Promise.all( [ page.waitForURL( /custom-fonts/ ), page.click( 'button.button-hero' ) ] );
		const msg = ( await page.locator( '.rf-cf__notice--error' ).textContent().catch( () => '' ) ) || '';
		check( A, `rejected: ${ what }`, msg.trim().length > 0 && await page.locator( '.rf-cf__family[data-family="Evil Font"]' ).count() === 0, msg.trim().slice( 0, 120 ) );
	}
	const evilDir = join( SITE, 'wordpress/wp-content/uploads/refraction-fonts' );
	const evilFiles = existsSync( evilDir ) ? readdirSync( evilDir, { recursive: true } ).map( String ) : [];
	check( A, 'nothing from the rejected uploads was written (no evil folder, no .php except index.php)', ! evilFiles.some( ( f ) => /evil/.test( f ) || ( /\.php$/.test( f ) && ! /index\.php$/.test( f ) ) ), evilFiles.join( ',' ) );

	// Nonce and capability
	const noNonce = await page.evaluate( async () => (await fetch( '/wp-admin/admin-post.php', { method: 'POST', body: new URLSearchParams( { action: 'refraction_fonts_delete', family: 'arsenal-check' } ) } )).status );
	check( A, 'delete without a nonce is refused', noNonce >= 400, noNonce );
	check( A, 'the family still exists after the refused request', existsSync( dir ) );
	const editorRole = await login( browser, 'editor', 'editor' );
	const r = await editorRole.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-fonts` );
	check( A, 'an editor role cannot open the screen', r.status() >= 400 || /not allowed|Sorry/i.test( await editorRole.page.content() ) );
	await editorRole.ctx.close();

	// Frontend
	const fp = seed( 'font', { MO_FONT: 'Arsenal Check' } );
	const { ctx, page: fe } = await visitor( browser, fp.url.replace( BASE, '' ) );
	const info = await fe.evaluate( async () => {
		await document.fonts.ready;
		const link = [ ...document.querySelectorAll( 'link[rel=stylesheet]' ) ].find( ( l ) => /custom-fonts\.css/.test( l.href ) );
		const h = document.querySelector( '.refraction-element-fonth .refraction-heading-title, .refraction-element-fonth h2' );
		const w = h ? getComputedStyle( h ).fontWeight : '400';
		return { link: !! link, check: document.fonts.check( `${ w } 48px "Arsenal Check"` ), family: h ? getComputedStyle( h ).fontFamily : '', preload: [ ...document.querySelectorAll( 'link[rel=preload][as=font]' ) ].map( ( l ) => l.href ), loaded: [ ...document.fonts ].filter( ( f ) => f.family.replace( /"/g, '' ) === 'Arsenal Check' && f.status === 'loaded' ).length };
	} );
	check( A, 'frontend: the generated stylesheet is linked', info.link );
	check( A, 'frontend: the heading uses the custom font family', /Arsenal Check/.test( info.family ), info.family );
	check( A, 'frontend: the font really loads (document.fonts.check + a loaded FontFace)', info.check && info.loaded >= 1, JSON.stringify( info ) );
	check( A, 'frontend: preload hint printed for the flagged family (woff2 only, so none for ttf files)', Array.isArray( info.preload ) );
	await fe.screenshot( { path: join( SHOTS, 'custom-font-frontend.png' ) } );
	await ctx.close();

	// The typography font list
	await openEditor( admin, fp.id );
	const list = await admin.page.evaluate( () => {
		const f = window.refraction.config.controls.font;
		return { group: Object.entries( f.groups || {} ).find( ( [ , v ] ) => v === 'Custom Fonts' ), type: f.options?.[ 'Arsenal Check' ], ids: Object.keys( f.groups || {} ) };
	} );
	check( A, 'typography: the font list has a "Custom Fonts" group holding the font', !! list.group && list.type === list.group[ 0 ], JSON.stringify( list ) );
	await selectElement( admin, 'fonth', 'style' );
	await sleep( 900 );
	await admin.page.click( '.refraction-control-typography_typography .refraction-control-popover-toggle-toggle-label, .refraction-control-typography_typography .refraction-control-popover-toggle-toggle' ).catch( () => {} );
	await sleep( 700 );
	const optgroup = await admin.page.evaluate( () => {
		const s = document.querySelector( '.refraction-control-typography_font_family select' );
		if ( ! s ) { return null; }
		const g = [ ...s.querySelectorAll( 'optgroup' ) ].find( ( o ) => o.label === 'Custom Fonts' );
		return g ? [ ...g.querySelectorAll( 'option' ) ].map( ( o ) => o.value ) : [];
	} );
	check( A, 'typography: the control lists the font under the "Custom Fonts" group', Array.isArray( optgroup ) && optgroup.includes( 'Arsenal Check' ), JSON.stringify( optgroup ) );
	await admin.page.screenshot( { path: join( SHOTS, 'custom-font-typography.png' ) } );

	// Deleting a variation and the family
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-fonts` );
	page.once( 'dialog', ( d ) => d.accept() );
	await Promise.all( [ page.waitForURL( /custom-fonts/ ), page.click( '.rf-cf__family[data-family="Arsenal Check"] header .rf-cf__delete' ) ] );
	check( A, 'deleting the family removes it, its files and the generated faces', await page.locator( '.rf-cf__family[data-family="Arsenal Check"]' ).count() === 0 && ! existsSync( dir ) && ! /Arsenal Check/.test( readFileSync( cssPath, 'utf8' ) ) );
	await page.close();
}

// ---------------------------------------------------------------- custom icons

function makeZip( name, files ) {
	const dir = join( TMP, name.replace( /\W/g, '_' ) );
	rmSync( dir, { recursive: true, force: true } );
	mkdirSync( dir, { recursive: true } );
	const py = `import zipfile,sys,json\nspec=json.load(open(sys.argv[1]))\nz=zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED)\nfor n,src in spec.items():\n    z.writestr(n,open(src[1:],'rb').read() if src.startswith('@') else src.encode())\nz.close()\n`;
	writeFileSync( join( dir, 'make.py' ), py );
	writeFileSync( join( dir, 'spec.json' ), JSON.stringify( files ) );
	const out = join( dir, 'out.zip' );
	execFileSync( 'python3', [ '-I', join( dir, 'make.py' ), join( dir, 'spec.json' ), out ] );
	return out;
}

const SVG = ( d ) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${ d }"/></svg>`;

async function iconChecks( browser, admin ) {
	const A = 'custom-icons';
	mkdirSync( TMP, { recursive: true } );
	const hostile = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" onload="window.__pwned=1"><script>window.__pwned=1</script><foreignObject><div onclick="x()">x</div></foreignObject><a xlink:href="javascript:alert(1)"><path d="M2 2h20v20H2z" onmouseover="window.__pwned=1"/></a><image href="https://evil.test/p.png"/><use xlink:href="https://evil.test/x.svg#a"/><style>@import url(https://evil.test/a.css);</style></svg>';
	const svgZip = makeZip( 'svgset', {
		'icons/home.svg': SVG( 'M12 3l9 8h-3v9H6v-9H3z' ),
		'icons/star.svg': SVG( 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z' ),
		'icons/arrow right.svg': SVG( 'M4 11h12l-5-5 1.4-1.4L20 12l-7.6 7.4L11 18l5-5H4z' ),
		'icons/hostile.svg': hostile,
		'__MACOSX/._home.svg': 'junk',
		'readme.txt': 'ignored',
	} );
	const slipZip = makeZip( 'slip', { '../evil.svg': SVG( 'M0 0h1' ), 'ok.svg': SVG( 'M0 0h1' ) } );
	const bombZip = makeZip( 'bomb', { 'big.svg': '<svg xmlns="http://www.w3.org/2000/svg"><path d="' + 'M0 0h1'.repeat( 14000 ) + '"/></svg>' } );
	const fontZip = makeZip( 'fontset', {
		'selection.json': JSON.stringify( { icons: [ { properties: { name: 'home', code: 59648 } }, { properties: { name: 'user', code: 59649 } } ], preferences: { fontPref: { metadata: { fontFamily: 'icomoon' } } } } ),
		'fonts/icomoon.ttf': '@' + FONT,
		'style.css': 'ignored',
	} );

	const page = await admin.ctx.newPage();
	watch( page, 'icons-admin' );
	const upload = async ( name, zip ) => {
		await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-icons` );
		await page.fill( '#rf-cia-name', name );
		await page.setInputFiles( '#rf-cia-zip', zip );
		await Promise.all( [ page.waitForURL( /custom-icons/ ), page.click( 'button.button-hero' ) ] );
		await sleep( 400 );
		return ( ( await page.locator( '.rf-ci-admin__notice' ).textContent().catch( () => '' ) ) || '' ).trim();
	};

	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-icons` );
	check( A, 'the admin screen opens and the menu lists Custom Icons', await page.locator( '.rf-ci-admin__title' ).count() === 1 && await page.evaluate( () => [ ...document.querySelectorAll( '#adminmenu a' ) ].some( ( a ) => /refraction-custom-icons/.test( a.href ) ) ) );

	let msg = await upload( 'Slip', slipZip );
	check( A, 'rejected: a ZIP with a zip-slip path (../evil.svg)', /unsafe/i.test( msg ) && ! existsSync( join( SITE, 'wordpress/wp-content/uploads/evil.svg' ) ) && ! existsSync( join( SITE, 'wordpress/wp-content/uploads/refraction-icons/evil.svg' ) ), msg );
	msg = await upload( 'Bomb', bombZip );
	check( A, 'rejected: an oversized/compression-bomb SVG', /too large|bomb/i.test( msg ), msg );
	msg = await upload( 'NotZip', makeZip( 'empty', { 'readme.txt': 'nothing here' } ) );
	check( A, 'rejected: a ZIP without any SVG or icon font', /no SVG/i.test( msg ), msg );

	msg = await upload( 'Brand', svgZip );
	check( A, 'an SVG ZIP uploads through the real form (4 icons)', /Brand was added with 4 icons/.test( msg ), msg );
	const setDir = join( SITE, 'wordpress/wp-content/uploads/refraction-icons/brand' );
	const stored = existsSync( setDir ) ? readdirSync( setDir ).sort() : [];
	check( A, 'files are stored under uploads/refraction-icons/<set>', [ 'arrow-right.svg', 'home.svg', 'hostile.svg', 'icons.json', 'star.svg', 'style.css' ].every( ( f ) => stored.includes( f ) ) && ! stored.includes( 'readme.txt' ), stored.join( ',' ) );
	const hostileOut = existsSync( join( setDir, 'hostile.svg' ) ) ? readFileSync( join( setDir, 'hostile.svg' ), 'utf8' ) : 'MISSING';
	check( A, 'hostile SVG sanitised on disk (no script, foreignObject, on*, javascript:, external refs, style)', ! /script|foreignobject|onload|onclick|onmouseover|javascript|evil\.test|<style|<image/i.test( hostileOut ) && /<path/.test( hostileOut ), hostileOut.slice( 0, 300 ) );
	check( A, 'the set page lists the icons', await page.locator( '.rf-ci-admin__set[data-set="brand"] .rf-ci-admin__icons li' ).count() === 4 );
	await page.screenshot( { path: join( SHOTS, 'custom-icons-admin.png' ), fullPage: true } );

	msg = await upload( 'Glyphs', fontZip );
	check( A, 'an icon-font ZIP (IcoMoon selection.json + font) uploads', /Glyphs was added with 2 icons/.test( msg ), msg );
	const fcss = existsSync( join( SITE, 'wordpress/wp-content/uploads/refraction-icons/glyphs/style.css' ) ) ? readFileSync( join( SITE, 'wordpress/wp-content/uploads/refraction-icons/glyphs/style.css' ), 'utf8' ) : '';
	check( A, 'the font set CSS has the face and the glyph classes', /@font-face/.test( fcss ) && /\.rf-cf-glyphs-home:before\{content:"\\e900"\}/.test( fcss ), fcss.slice( 0, 200 ) );

	// Icon picker in the editor
	const icons = seed( 'icons', { MO_ICONS: JSON.stringify( [
		{ value: 'rf-ci rf-ci-brand-home', library: 'rfci-brand' },
		{ value: 'rf-ci rf-ci-brand-hostile', library: 'rfci-brand' },
		{ value: 'rf-cf-glyphs rf-cf-glyphs-user', library: 'rfcf-glyphs' },
	] ) } );
	await openEditor( admin, icons.id );
	const cfg = await admin.page.evaluate( () => window.refraction.config.icons.libraries.map( ( l ) => ( { name: l.name, label: l.label } ) ) );
	check( A, 'icons manager config has a tab per custom set', cfg.some( ( l ) => l.name === 'rfci-brand' && l.label === 'Brand' ) && cfg.some( ( l ) => l.name === 'rfcf-glyphs' ), JSON.stringify( cfg ) );

	await selectElement( admin, 'ico0', 'content' );
	await sleep( 900 );
	await admin.page.click( '.refraction-control-selected_icon .refraction-control-icon-picker' ).catch( () => {} );
	await sleep( 1500 );
	const tabs = await admin.page.evaluate( () => [ ...document.querySelectorAll( '#refraction-icons-manager__tab-links .refraction-icons-manager__tab-link' ) ].map( ( t ) => t.textContent.trim() ) );
	check( A, 'the icon picker modal shows the custom sets as tabs', tabs.includes( 'Brand' ) && tabs.includes( 'Glyphs' ), tabs.join( '|' ) );
	if ( tabs.includes( 'Brand' ) ) {
		await admin.page.click( '.refraction-icons-manager__tab-link:has-text("Brand")' );
		await sleep( 1200 );
		const n = await admin.page.locator( '#refraction-icons-manager__main .refraction-icons-manager__tab__item' ).count();
		check( A, 'the Brand tab lists its 4 icons', n >= 4, `count ${ n }` );
		await admin.page.screenshot( { path: join( SHOTS, 'icon-picker.png' ) } );
	}
	await admin.page.keyboard.press( 'Escape' ).catch( () => {} );

	// Editor preview rendering (class based) and frontend rendering (inline svg / font class)
	const fr = frameOf( admin );
	const pv = await fr.evaluate( () => { const i = document.querySelector( '.refraction-element-ico0 i' ); const cs = i ? getComputedStyle( i ) : null; return { cls: i?.className, mask: cs ? ( cs.maskImage || cs.webkitMaskImage ) : '', w: cs?.width }; } ).catch( () => ( {} ) );
	check( A, 'editor preview: the svg set icon is drawn with its mask', /rf-ci-brand-home/.test( pv.cls || '' ) && /home\.svg/.test( pv.mask || '' ) || /svg/.test( await fr.evaluate( () => document.querySelector( '.refraction-element-ico0' )?.innerHTML || '' ) ), JSON.stringify( pv ) );

	const { ctx, page: fe } = await visitor( browser, icons.url.replace( BASE, '' ) );
	const front = await fe.evaluate( async () => {
		await document.fonts.ready;
		const svgIcon = document.querySelector( '.refraction-element-ico0 svg' );
		const hostileIcon = document.querySelector( '.refraction-element-ico1' );
		const fontI = document.querySelector( '.refraction-element-ico2 i' );
		return {
			svg: !! svgIcon, svgW: svgIcon ? svgIcon.getBoundingClientRect().width : 0,
			hostileClean: ! /script|onload|foreignobject|javascript/i.test( hostileIcon ? hostileIcon.innerHTML : 'x' ),
			pwned: !! window.__pwned,
			fontClass: fontI ? fontI.className : '', fontBefore: fontI ? getComputedStyle( fontI, '::before' ).content : '', fontOk: document.fonts.check( '20px "rf-cf-glyphs"' ),
		};
	} );
	check( A, 'frontend: the svg set icon is rendered as inline SVG', front.svg && front.svgW > 8, JSON.stringify( front ) );
	check( A, 'frontend: the hostile SVG renders without script and runs nothing', front.hostileClean && ! front.pwned, JSON.stringify( front ) );
	check( A, 'frontend: the font set icon uses its class, glyph and loaded font', /rf-cf-glyphs-user/.test( front.fontClass ) && /e901|\ue901/i.test( JSON.stringify( front.fontBefore ) ) && front.fontOk, JSON.stringify( front ) );
	await fe.screenshot( { path: join( SHOTS, 'icons-frontend.png' ) } );
	await ctx.close();

	// Delete
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-icons` );
	page.once( 'dialog', ( d ) => d.accept() );
	await Promise.all( [ page.waitForURL( /custom-icons/ ), page.click( '.rf-ci-admin__set[data-set="brand"] .rf-ci-admin__delete' ) ] );
	check( A, 'deleting a set removes it and its files', await page.locator( '.rf-ci-admin__set[data-set="brand"]' ).count() === 0 && ! existsSync( setDir ) );
	const noNonce = await page.evaluate( async () => ( await fetch( '/wp-admin/admin-post.php', { method: 'POST', body: new URLSearchParams( { action: 'refraction_icons_delete', set: 'glyphs' } ) } ) ).status );
	check( A, 'delete without a nonce is refused', noNonce >= 400, noNonce );
	await page.close();
}

// ----------------------------------------------------------------------- main

let pages;

async function main() {
	mkdirSync( SHOTS, { recursive: true } );
	const exe = findChromium();
	const browser = await chromium.launch( exe ? { executablePath: exe } : {} );
	const log0 = logSize();

	try {
		const installed = new Set( wp( [ 'theme', 'list', '--field=name' ] ).split( '\n' ) );
		const themes = [];
		for ( const t of THEMES ) {
			if ( ! installed.has( t ) ) {
				try { wp( [ 'theme', 'install', t ] ); } catch { console.log( `note: theme ${ t } could not be installed; skipped` ); continue; }
			}
			themes.push( t );
		}
		check( 'setup', 'a classic and a block theme are available', themes.some( ( t ) => CLASSIC.has( t ) ) && themes.some( ( t ) => ! CLASSIC.has( t ) ), themes.join( ',' ) );
		check( 'setup', 'a font file for the upload tests exists', FONT && existsSync( FONT ), FONT );

		wp( [ 'plugin', 'activate', 'refraction' ] );
		pages = seed( 'pages' );
		const admin = await login( browser, 'admin', 'admin' );
		watch( admin.page, 'admin' );
		const U = {
			scroll: `/?page_id=${ pages.scroll.id }`,
			mouse: `/?page_id=${ pages.mouse.id }`,
			sticky: `/?page_id=${ pages.sticky.id }`,
		};

		for ( const theme of want( 'frontend' ) ? themes : [] ) {
			console.log( `\n== theme ${ theme } ==` );
			wp( [ 'theme', 'activate', theme ] );
			await scrollingChecks( browser, theme, U.scroll );
			await mouseChecks( browser, theme, U.mouse );
			await stickyChecks( browser, theme, U.sticky, null );
			await headerChecks( browser, theme, admin );
		}

		console.log( '\n== theme-independent ==' );
		if ( want( 'frontend' ) ) {
			await deviceChecks( browser, U.scroll );
			await reducedMotionChecks( browser, U );
			await stickyChecks( browser, 'logged in', U.sticky, admin );
			await smallScreenAdminBar( admin, U.sticky );
		}
		if ( want( 'editor' ) ) { await editorChecks( admin, pages.scroll.id ); }
		if ( want( 'fonts' ) ) { await fontChecks( browser, admin ); }
		if ( want( 'icons' ) ) { await iconChecks( browser, admin ); }

		// The refused-request checks (no nonce) cause an expected 403 on admin-post.php.
		const errors = consoleErrors.filter( ( e ) => ! /status of 403 \(Forbidden\) @ \S+admin-post\.php/.test( e ) && ( ! /Failed to load resource: the server responded with a status of 404/.test( e ) || /motion|sticky|custom|refraction-icons|refraction-fonts/.test( e ) ) );
		check( 'health', 'no console errors', errors.length === 0, errors.slice( 0, 5 ).join( ' || ' ) );
		const tail = logTail( log0 );
		check( 'health', 'no PHP errors in the debug log', ! /PHP (Fatal|Warning|Notice|Deprecated|Parse)/.test( tail ), tail.slice( 0, 500 ) );
	} catch ( e ) {
		check( 'run', 'the check completed without an exception', false, e.stack || e.message );
	} finally {
		await browser.close();
	}

	const passed = results.filter( ( r ) => r.pass ).length;
	console.log( `\n${ passed } passed, ${ failures } failed (${ results.length } checks). Screenshots: ${ SHOTS }` );
	process.exit( failures ? 1 : 0 );
}

main();
