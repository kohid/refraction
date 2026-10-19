#!/usr/bin/env node
/**
 * Pro widgets batch 2 (Advanced category) check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-pro-widgets-2.mjs [--site /tmp/rf-widgets2-site] [--port 8841] [--shots /tmp/rfw2-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--only media-carousel,hotspot,...]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). The site gets generated
 * images, a Lottie file, a video clip (needs ffmpeg) and one page per widget; use a throw-away site.
 * YouTube, Vimeo and Facebook addresses are answered with an empty stub page by the browser, so the check runs
 * offline and also proves what the page would request.
 *
 * Covers, per widget: appears in the panel search and in the "Advanced" category, can be created inside a
 * container in the editor, renders on the front end with the expected HTML, key interactions in the browser,
 * controls change the output, accessibility basics, and no PHP errors / console errors.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-widgets2-site' );
const PORT = arg( 'port', '8841' );
const SHOTS = arg( 'shots', '/tmp/rfw2-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const ONLY = arg( 'only', '' ).split( ',' ).filter( Boolean );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/pro-widgets-2-seed.php' );
const CLIP = '/tmp/rf-widgets2-clip.mp4';

const results = [];
let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	results.push( { area, name, pass: !! pass } );
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 300 ) }` }` );
};
const requested = [];
/** Answer the external embed hosts with a stub page and remember every request to them. */
async function stubExternal( ctx ) {
	await ctx.route( /^https?:\/\/([^/]*\.)?(youtube-nocookie\.com|youtube\.com|vimeo\.com|facebook\.com|facebook\.net|ytimg\.com)\//, ( route ) => {
		requested.push( route.request().url() );
		route.fulfill( { status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title><p>stub</p>' } );
	} );
}
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
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

async function login( browser, user, pass ) {
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
	await stubExternal( ctx );
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

const consoleErrors = [];
const watch = ( page, label ) => {
	page.on( 'console', ( m ) => {
		if ( m.type() === 'error' && ! /favicon\.ico/.test( m.location().url ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
	} );
	page.on( 'pageerror', ( e ) => consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
};

/** Open a new visitor page (no login) at a viewport size and collect its console errors. */
async function visitor( browser, url, width = 1280, height = 900, opts = {} ) {
	const ctx = await browser.newContext( { viewport: { width, height }, ...opts } );
	await stubExternal( ctx );
	const page = await ctx.newPage();
	watch( page, `front:${ url }` );
	await page.goto( BASE + url, { waitUntil: 'load' } );
	return { ctx, page };
}

/** Open the Refraction editor for a post and wait until the preview is ready. */
async function openEditor( admin, id ) {
	await admin.page.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
	await admin.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
	await admin.page.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
	await admin.page.waitForSelector( '#refraction-preview-iframe', { timeout: 30000 } );
	await sleep( 1500 );
}

const frameOf = ( admin ) => admin.page.frame( { name: 'refraction-preview-iframe' } ) ?? admin.page.frames().find( ( f ) => f !== admin.page.mainFrame() && /preview/.test( f.url() ) );

/** Editor facts that every widget shares. */
async function editorBasics( ctx, admin, key, widgetType, title ) {
	const info = await admin.page.evaluate( ( wt ) => {
		const cfg = window.refraction.widgetsCache[ wt ];
		return cfg ? { title: cfg.title, categories: cfg.categories, icon: cfg.icon } : null;
	}, widgetType );
	check( key, 'registered in the editor with the Advanced category', info && info.categories.includes( 'refraction-advanced' ), JSON.stringify( info ) );
	check( key, `title is "${ title }"`, info?.title === title, info?.title );

	// Panel search
	await admin.page.evaluate( () => { $e.route( "panel/elements/categories" ); } );
	await admin.page.waitForSelector( '#refraction-panel-elements-search-input', { timeout: 15000 } );
	await admin.page.fill( '#refraction-panel-elements-search-input', title );
	await sleep( 500 );
	const found = await admin.page.locator( '#refraction-panel-elements .refraction-element .title' ).allInnerTexts();
	check( key, 'found by name in the panel search', found.some( ( t ) => t.trim() === title ), found.join( '|' ) );
	await admin.page.fill( '#refraction-panel-elements-search-input', '' );
	await sleep( 500 );

	// Category list: the widget sits inside the "Advanced" category.
	const catOk = await admin.page.evaluate( ( wt ) => {
		for ( const c of document.querySelectorAll( '.refraction-panel-category' ) ) {
			const label = ( c.querySelector( '.refraction-panel-category-title' )?.textContent || c.textContent ).trim().split( '\n' )[ 0 ].trim();
			if ( 'Advanced' === label ) {
				return !! c.querySelector( `.refraction-element[data-library-element-type="${ wt }"]` );
			}
		}
		return false;
	}, widgetType );
	check( key, 'the widget is listed in the Advanced category of the panel', catOk );

	// Drag the widget from the panel into the container shown in the preview (a real mouse drag).
	await admin.page.fill( '#refraction-panel-elements-search-input', title );
	await sleep( 600 );
	const idsBefore = await admin.page.evaluate( () => refraction.documents.getCurrent().container.children[ 0 ].children.map( ( c ) => c.id ) );
	const src = admin.page.locator( `#refraction-panel-elements .refraction-element[data-library-element-type="${ widgetType }"]` );
	const tgt = frameOf( admin ).locator( '.refraction-widget' ).first();
	const sb = await src.boundingBox();
	const tb = await tgt.boundingBox();
	await admin.page.mouse.move( sb.x + sb.width / 2, sb.y + sb.height / 2 );
	await admin.page.mouse.down();
	await admin.page.mouse.move( sb.x + sb.width / 2 + 20, sb.y + 20, { steps: 5 } );
	await admin.page.mouse.move( tb.x + 30, tb.y + tb.height - 4, { steps: 15 } );
	await admin.page.mouse.move( tb.x + 32, tb.y + tb.height - 3, { steps: 3 } );
	await sleep( 300 );
	await admin.page.mouse.up();
	await admin.page.waitForFunction( ( n ) => refraction.documents.getCurrent().container.children[ 0 ].children.length > n, idsBefore.length, { timeout: 15000 } ).catch( () => {} );
	await sleep( 1500 );
	const created = await admin.page.evaluate( ( [ before, wt ] ) => {
		const kids = refraction.documents.getCurrent().container.children[ 0 ].children;
		const added = kids.find( ( c ) => ! before.includes( c.id ) );
		return added ? { id: added.id, type: added.model.get( 'widgetType' ), count: kids.length } : null;
	}, [ idsBefore, widgetType ] );
	check( key, 'can be dragged from the panel into a container', created && created.type === widgetType, JSON.stringify( created ) );
	if ( created ) {
		const rendered = await frameOf( admin ).evaluate( ( id ) => !! document.querySelector( `[data-id="${ id }"] *` ), created.id );
		check( key, 'the dropped widget renders in the preview', rendered, JSON.stringify( created ) );
		await admin.page.evaluate( ( id ) => { $e.run( 'document/elements/delete', { container: refraction.getContainer( id ) } ); }, created.id );
	}
	await admin.page.fill( '#refraction-panel-elements-search-input', '' );
	return created;
}

const rel = ( url ) => { const u = new URL( url ); return u.pathname + u.search; };

const SECTIONS = {};

/* helpers ---------------------------------------------------------------- */
const swiperOf = ( loc, sel = '.refraction-pc' ) => loc.evaluate( ( el, s ) => { const n = el.querySelector( s ); return n?.swiper ? { index: n.swiper.realIndex, active: n.swiper.activeIndex, per: n.swiper.params.slidesPerView, effect: n.swiper.params.effect, loop: n.swiper.params.loop, autoplay: !! n.swiper.autoplay?.running } : null; }, sel );
const setSetting = ( admin, id, settings ) => admin.page.evaluate( ( [ i, s ] ) => { $e.run( 'document/elements/settings', { container: refraction.getContainer( i ), settings: s } ); }, [ id, settings ] );
const closeLightbox = async ( page ) => {
	await page.keyboard.press( 'Escape' );
	return page.waitForSelector( '.dialog-lightbox-widget', { state: 'hidden', timeout: 6000 } ).then( () => true ).catch( () => false );
};
const noScripts = ( loc ) => loc.evaluate( ( el ) => el.querySelectorAll( 'script' ).length === 0 );

/* ------------------------------------------------------------ media carousel */
SECTIONS[ 'media-carousel' ] = async ( { browser, admin, pages } ) => {
	const k = 'media-carousel';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-media-carousel', 'Media Carousel' );
	await setSetting( admin, 'mc000001', { show_caption: '' } );
	await sleep( 2500 );
	check( k, 'turning Show Captions off re-renders the preview without captions', ( await frameOf( admin ).locator( '[data-id="mc000001"] .refraction-mc__caption' ).count() ) === 0 );
	await setSetting( admin, 'mc000002', { mode: 'carousel' } );
	await sleep( 2500 );
	check( k, 'switching Layout to Carousel removes the thumbnail strip in the preview', ( await frameOf( admin ).locator( '[data-id="mc000002"] .refraction-pc-thumbs' ).count() ) === 0 );

	const before = requested.length;
	const v = await visitor( browser, rel( pages[ k ].url ), 1280 );
	const p = v.page;
	await p.waitForSelector( '[data-id="mc000001"] .swiper-initialized' );
	const a = p.locator( '[data-id="mc000001"]' );
	check( k, 'six slides in a labelled carousel region', ( await a.locator( '.refraction-pc__slide:not(.swiper-slide-duplicate)' ).count() ) === 6 && ( await a.locator( '[role="region"][aria-roledescription="carousel"]' ).getAttribute( 'aria-label' ) ) === 'Photo carousel' );
	check( k, 'slides carry "n of total" labels', /^1 (of|\/) 6$/.test( ( await a.locator( '.refraction-pc__slide:not(.swiper-slide-duplicate)' ).first().getAttribute( 'aria-label' ) ) || '' ) );
	check( k, 'captions are escaped text', ( await a.locator( '.refraction-pc__slide:not(.swiper-slide-duplicate) .refraction-mc__caption' ).first().innerHTML() ) === 'First &lt;b&gt;caption&lt;/b&gt;' );
	let s = await swiperOf( a );
	check( k, 'three slides per view on desktop', s.per === 3, JSON.stringify( s ) );
	const w = await a.evaluate( ( el ) => { const sl = el.querySelector( '.refraction-pc__slide' ); return sl.getBoundingClientRect().width / el.querySelector( '.refraction-pc' ).getBoundingClientRect().width; } );
	check( k, 'a slide is about a third of the width', w > 0.28 && w < 0.36, w );
	const i0 = s.index;
	await a.locator( '.refraction-swiper-button-next' ).click();
	await sleep( 800 );
	check( k, 'next arrow moves one slide', ( await swiperOf( a ) ).index === ( i0 + 1 ) % 6 );
	await a.locator( '.swiper-pagination-bullet' ).nth( 0 ).click();
	await sleep( 800 );
	check( k, 'clicking a dot jumps to that slide', ( await swiperOf( a ) ).index === 0 );
	await a.locator( '.refraction-swiper-button-prev' ).focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 800 );
	check( k, 'arrows are real buttons and work with the keyboard', ( await a.locator( 'button.refraction-swiper-button' ).count() ) === 2 && ( await swiperOf( a ) ).index === 5 );
	check( k, 'no request to a video site before anything is clicked', requested.length === before && ( await p.locator( 'iframe' ).count() ) === 0, requested.slice( before ).join( ',' ) );

	// lightbox for an image
	await a.locator( '.refraction-pc__slide:not(.swiper-slide-duplicate) a.refraction-mc__media[data-refraction-lightbox-slideshow]' ).first().click();
	await p.waitForSelector( '.dialog-lightbox-widget, .refraction-lightbox', { state: 'visible', timeout: 10000 } ).catch( () => {} );
	check( k, 'clicking an image opens the site lightbox', await p.locator( '.dialog-lightbox-widget:visible, .refraction-lightbox:visible' ).count() > 0 );
	check( k, 'Escape closes the lightbox', await closeLightbox( p ) );

	// lightbox for the video
	const vid = a.locator( '.refraction-pc__slide:not(.swiper-slide-duplicate) .refraction-mc__media--video' ).first();
	check( k, 'the video slide is a button with a play icon and an accessible name', ( await vid.getAttribute( 'aria-label' ) ) === 'Play video: A video' && await vid.locator( '.refraction-mc__play' ).count() === 1 );
	await vid.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await a.evaluate( ( el ) => el.querySelector( '.refraction-pc' ).swiper.slideToLoop( 3, 0 ) );
	await sleep( 400 );
	await vid.click();
	await p.waitForSelector( '.refraction-lightbox iframe', { timeout: 10000 } ).catch( () => {} );
	const src = await p.locator( '.refraction-lightbox iframe' ).first().getAttribute( 'src' ).catch( () => null );
	check( k, 'clicking the video opens it in the lightbox from the privacy-enhanced YouTube address', !! src && src.startsWith( 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' ), src );
	await closeLightbox( p );

	// slideshow with thumbnails
	const b = p.locator( '[data-id="mc000002"]' );
	await b.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await p.waitForSelector( '[data-id="mc000002"] .refraction-pc.swiper-initialized' );
	check( k, 'slideshow shows a thumbnail strip with one button per slide', ( await b.locator( '.refraction-pc-thumbs button.refraction-pc-thumb' ).count() ) === 4 && ( await b.locator( '.refraction-pc-thumb' ).nth( 2 ).getAttribute( 'aria-label' ) ) === 'Show slide 3' );
	await b.locator( '.refraction-pc-thumb' ).nth( 2 ).click();
	await sleep( 800 );
	check( k, 'clicking a thumbnail shows that slide', ( await swiperOf( b ) ).active === 2 && await b.locator( '.refraction-pc-thumb' ).nth( 2 ).evaluate( ( e ) => e.classList.contains( 'swiper-slide-thumb-active' ) ) );
	await b.locator( '.refraction-pc-thumb' ).nth( 0 ).focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 800 );
	check( k, 'thumbnails work with the keyboard', ( await swiperOf( b ) ).active === 0 );
	check( k, 'slideshow with lightbox off has no lightbox links', ( await b.locator( 'a[data-refraction-open-lightbox]' ).count() ) === 0 );

	// coverflow, single slide, empty, fade
	const c = p.locator( '[data-id="mc000003"]' );
	await c.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await p.waitForSelector( '[data-id="mc000003"] .swiper-initialized' );
	check( k, 'coverflow effect is active (3D)', ( await swiperOf( c ) ).effect === 'coverflow' && await c.locator( '.swiper-3d' ).count() === 1 );
	await p.screenshot( { path: join( SHOTS, 'media-carousel-coverflow.png' ) } );
	const d = p.locator( '[data-id="mc000004"]' );
	check( k, 'a single slide has no arrows, dots or Swiper', ( await d.locator( '.refraction-swiper-button, .swiper-pagination' ).count() ) === 0 && ( await d.locator( '.swiper-initialized' ).count() ) === 0 && ( await d.locator( 'img' ).count() ) === 1 );
	check( k, 'no slides: nothing is printed for visitors', ( await p.locator( '[data-id="mc000005"] .refraction-pc' ).count() ) === 0 );
	const f = p.locator( '[data-id="mc000006"]' );
	await f.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await p.waitForSelector( '[data-id="mc000006"] .swiper-initialized' );
	await p.mouse.move( 5, 5 );
	const f0 = await swiperOf( f );
	await sleep( 2600 );
	check( k, 'fade effect with autoplay advances without interaction', f0.effect === 'fade' && ( await swiperOf( f ) ).index !== f0.index, JSON.stringify( f0 ) );
	await v.ctx.close();

	const m = await visitor( browser, rel( pages[ k ].url ), 390, 800 );
	await m.page.waitForSelector( '[data-id="mc000001"] .swiper-initialized' );
	const mr = await m.page.locator( '[data-id="mc000001"]' ).evaluate( ( el ) => { const sl = el.querySelector( '.refraction-pc__slide' ); return sl.getBoundingClientRect().width / el.querySelector( '.refraction-pc' ).getBoundingClientRect().width; } );
	check( k, 'mobile: one slide per view', mr > 0.9, mr );
	await m.ctx.close();

	const r = await visitor( browser, rel( pages[ k ].url ), 1280, 900, { reducedMotion: 'reduce' } );
	await r.page.waitForSelector( '[data-id="mc000006"] .swiper-initialized' );
	const r0 = await swiperOf( r.page.locator( '[data-id="mc000006"]' ) );
	await sleep( 2600 );
	check( k, 'reduced motion: autoplay does not start', ( await swiperOf( r.page.locator( '[data-id="mc000006"]' ) ) ).index === r0.index );
	await r.ctx.close();
};

/* ------------------------------------------------------ testimonial carousel */
SECTIONS[ 'testimonial-carousel' ] = async ( { browser, admin, pages } ) => {
	const k = 'testimonial-carousel';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-testimonial-carousel', 'Testimonial Carousel' );
	await setSetting( admin, 'tc000001', { layout: 'above' } );
	await sleep( 2500 );
	check( k, 'changing Layout re-renders the preview (above)', ( await frameOf( admin ).locator( '[data-id="tc000001"].refraction-tc-layout-above' ).count() ) === 1 );

	const v = await visitor( browser, rel( pages[ k ].url ), 1280 );
	const p = v.page;
	await p.waitForSelector( '[data-id="tc000001"] .swiper-initialized' );
	const a = p.locator( '[data-id="tc000001"]' );
	check( k, 'three testimonials as figures with a labelled region', ( await a.locator( 'figure.refraction-tc:not(.swiper-slide-duplicate)' ).count() ) === 3 && ( await a.locator( '[role="region"]' ).getAttribute( 'aria-label' ) ) === 'Customer quotes' );
	check( k, 'quote is a blockquote; script text is escaped, not executed', ( await a.locator( '.refraction-tc:not(.swiper-slide-duplicate) blockquote.refraction-tc__content' ).first().innerHTML() ).includes( '&lt;script&gt;alert(1)&lt;/script&gt;' ) && await noScripts( a ) );
	check( k, 'name is escaped; photo rendered; name link has its href', ( await a.locator( '.refraction-tc:not(.swiper-slide-duplicate) .refraction-tc__name' ).first().innerHTML() ).includes( 'Ann &lt;i&gt;A&lt;/i&gt;' ) && ( await a.locator( '.refraction-tc:not(.swiper-slide-duplicate) .refraction-tc__image img' ).count() ) === 1 && ( await a.locator( '.refraction-tc:not(.swiper-slide-duplicate) .refraction-tc__name a' ).first().getAttribute( 'href' ) ) === 'https://example.com/bob' );
	check( k, 'line breaks in the quote are kept', ( await a.locator( '.refraction-tc:not(.swiper-slide-duplicate) blockquote' ).nth( 1 ).innerHTML() ).includes( '<br>' ) );
	check( k, 'an empty job prints no element', ( await a.locator( '.refraction-repeater-item-ta000003 .refraction-tc__job' ).count() ) === 0 );
	const i0 = ( await swiperOf( a ) ).index;
	await a.locator( '.refraction-swiper-button-next' ).click();
	await sleep( 800 );
	check( k, 'next arrow shows the next testimonial', ( await swiperOf( a ) ).index === ( i0 + 1 ) % 3 );
	check( k, 'a single testimonial has no navigation', ( await p.locator( '[data-id="tc000002"] .refraction-swiper-button, [data-id="tc000002"] .swiper-pagination' ).count() ) === 0 );
	await p.locator( '[data-id="tc000003"]' ).evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await p.waitForSelector( '[data-id="tc000003"] .swiper-initialized' );
	check( k, 'two per view when asked', ( await swiperOf( p.locator( '[data-id="tc000003"]' ) ) ).per === 2 );
	await p.screenshot( { path: join( SHOTS, 'testimonial-carousel.png' ) } );
	await v.ctx.close();
};

/* ------------------------------------------------------------------- reviews */
SECTIONS.reviews = async ( { browser, admin, pages } ) => {
	const k = 'reviews';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-reviews', 'Reviews' );
	await setSetting( admin, 'rv000001', { layout: 'carousel' } );
	await sleep( 2500 );
	check( k, 'switching Layout to Carousel re-renders the preview as a carousel', ( await frameOf( admin ).locator( '[data-id="rv000001"] .refraction-pc' ).count() ) === 1 );

	const v = await visitor( browser, rel( pages[ k ].url ), 1280 );
	const p = v.page;
	const a = p.locator( '[data-id="rv000001"]' );
	check( k, 'grid layout prints five review articles', ( await a.locator( 'article.refraction-review' ).count() ) === 5 );
	const labels = await a.locator( '.refraction-stars' ).evaluateAll( ( els ) => els.map( ( e ) => e.getAttribute( 'aria-label' ) ) );
	check( k, 'each rating is announced as "Rated x out of 5" (9 is clamped to 5)', JSON.stringify( labels ) === JSON.stringify( [ 'Rated 5 out of 5', 'Rated 4.5 out of 5', 'Rated 3 out of 5', 'Rated 0 out of 5', 'Rated 5 out of 5' ] ), labels.join( '|' ) );
	const states = ( n ) => a.locator( 'article' ).nth( n ).locator( '.refraction-star' ).evaluateAll( ( els ) => els.map( ( e ) => e.className.replace( /.*--/, '' ) ).join( ',' ) );
	check( k, '4.5 shows four full stars and a half star', ( await states( 1 ) ) === 'full,full,full,full,half', await states( 1 ) );
	check( k, '3 shows three full and two empty stars', ( await states( 2 ) ) === 'full,full,full,empty,empty' );
	const halfW = await a.locator( 'article' ).nth( 1 ).locator( '.refraction-star--half .refraction-star__fill' ).evaluate( ( e ) => e.getBoundingClientRect().width / e.parentElement.getBoundingClientRect().width );
	check( k, 'the half star is filled for half its width', Math.abs( halfW - 0.5 ) < 0.05, halfW );
	check( k, 'names and reviews are escaped; no script runs', ( await a.locator( '.refraction-review__name' ).first().innerHTML() ) === 'Alex &lt;b&gt;x&lt;/b&gt;' && ( await a.locator( '.refraction-review__content' ).first().innerHTML() ).includes( '&lt;script&gt;' ) && await noScripts( a ) );
	check( k, 'source and date are joined; the rating number is shown', ( await a.locator( '.refraction-review__meta' ).first().innerText() ) === 'Verified buyer, May 2026' && ( await a.locator( '.refraction-review__number' ).nth( 1 ).innerText() ) === '4.5' );
	check( k, 'a review without text prints no paragraph', ( await a.locator( 'article' ).nth( 3 ).locator( '.refraction-review__content' ).count() ) === 0 );
	const tops = await a.locator( 'article' ).evaluateAll( ( els ) => els.slice( 0, 3 ).map( ( e ) => Math.round( e.getBoundingClientRect().top ) ) );
	check( k, 'two columns: first two cards share a row, the third wraps', tops[ 0 ] === tops[ 1 ] && tops[ 2 ] > tops[ 0 ], tops.join() );
	const b = p.locator( '[data-id="rv000002"]' );
	await b.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await p.waitForSelector( '[data-id="rv000002"] .swiper-initialized' );
	check( k, 'carousel layout: two per view, labelled region', ( await swiperOf( b ) ).per === 2 && ( await b.locator( '[role="region"]' ).getAttribute( 'aria-label' ) ) === 'Review slider' );
	const i0 = ( await swiperOf( b ) ).index;
	await b.locator( '.refraction-swiper-button-next' ).click();
	await sleep( 800 );
	check( k, 'carousel layout: next arrow moves', ( await swiperOf( b ) ).index !== i0 );
	await p.screenshot( { path: join( SHOTS, 'reviews.png' ), fullPage: true } );
	await v.ctx.close();
};

/* ------------------------------------------------------------------- hotspot */
SECTIONS.hotspot = async ( { browser, admin, pages } ) => {
	const k = 'hotspot';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-hotspot', 'Hotspot' );
	await setSetting( admin, 'hs000002', { trigger: 'always' } );
	await sleep( 2500 );
	check( k, 'changing Tooltip Trigger re-renders the preview', ( await frameOf( admin ).locator( '[data-id="hs000002"] .refraction-hotspot--always' ).count() ) === 1 );

	const v = await visitor( browser, rel( pages[ k ].url ), 1280 );
	const p = v.page;
	const a = p.locator( '[data-id="hs000001"]' );
	await a.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	const mk = ( n ) => a.locator( '.refraction-hotspot__marker' ).nth( n );
	const tip = ( n ) => a.locator( '.refraction-hotspot__tip' ).nth( n );
	await sleep( 600 );
	check( k, 'markers are buttons named by the hotspot name; tooltips start hidden', ( await mk( 0 ).getAttribute( 'aria-label' ) ) === 'Point A' && ( await mk( 0 ).getAttribute( 'aria-expanded' ) ) === 'false' && ! ( await tip( 0 ).isVisible() ) );
	check( k, 'marker is positioned at its percentage of the image', await a.locator( '.refraction-hotspot__point' ).first().evaluate( ( e ) => { const r = e.parentElement.getBoundingClientRect(), b = e.getBoundingClientRect(); return Math.abs( ( b.left - r.left ) / r.width - 0.2 ) < 0.01; } ) );
	await mk( 0 ).click();
	check( k, 'click opens the tooltip and sets aria-expanded', await tip( 0 ).isVisible() && ( await mk( 0 ).getAttribute( 'aria-expanded' ) ) === 'true' && ( await tip( 0 ).getAttribute( 'role' ) ) === 'tooltip' );
	check( k, 'tooltip text is escaped and the link works', ( await tip( 0 ).innerHTML() ).includes( '&lt;script&gt;' ) && await noScripts( a ) && ( await tip( 0 ).locator( 'a' ).getAttribute( 'href' ) ) === 'https://example.com/a' );
	await mk( 1 ).click();
	check( k, 'opening another hotspot closes the first', ! ( await tip( 0 ).isVisible() ) && await tip( 1 ).isVisible() );
	await p.keyboard.press( 'Escape' );
	check( k, 'Escape closes the tooltip', ! ( await tip( 1 ).isVisible() ) );
	await mk( 0 ).click();
	await p.mouse.click( 5, 5 );
	check( k, 'a click outside closes the tooltip', ! ( await tip( 0 ).isVisible() ) );
	await mk( 0 ).focus();
	await p.keyboard.press( 'Enter' );
	check( k, 'Enter on a focused marker opens it', await tip( 0 ).isVisible() );
	await mk( 2 ).click();
	const inside = await tip( 2 ).evaluate( ( t ) => { const w = t.closest( '.refraction-hotspot' ).getBoundingClientRect(), r = t.getBoundingClientRect(); return r.right <= w.right + 1 && r.left >= w.left - 1; } );
	check( k, 'a tooltip near the right edge is kept inside the image', inside );
	await p.screenshot( { path: join( SHOTS, 'hotspot.png' ) } );

	const h = p.locator( '[data-id="hs000002"]' );
	await h.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	check( k, 'hover mode: tooltips are in the page but hidden', ! ( await h.locator( '.refraction-hotspot__tip' ).first().isVisible() ) );
	await h.locator( '.refraction-hotspot__marker' ).first().hover();
	await sleep( 200 );
	check( k, 'hovering shows the tooltip', await h.locator( '.refraction-hotspot__tip' ).first().isVisible() );
	await h.locator( '.refraction-hotspot__marker' ).first().click();
	check( k, 'a mouse click while hovering keeps it open', await h.locator( '.refraction-hotspot__tip' ).first().isVisible() );
	await p.mouse.move( 5, 5 );
	await sleep( 200 );
	check( k, 'leaving hides it', ! ( await h.locator( '.refraction-hotspot__tip' ).first().isVisible() ) );
	await h.locator( '.refraction-hotspot__marker' ).nth( 1 ).focus();
	await sleep( 200 );
	check( k, 'keyboard focus shows the tooltip in hover mode', await h.locator( '.refraction-hotspot__tip' ).nth( 1 ).isVisible() );

	const w = p.locator( '[data-id="hs000003"]' );
	await w.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	check( k, 'always mode: the tooltip is visible with no interaction, and there is no pulse class', await w.locator( '.refraction-hotspot__tip' ).isVisible() && ( await w.locator( '.refraction-hotspot--pulse' ).count() ) === 0 );
	check( k, 'no image: nothing is printed for visitors', ( await p.locator( '[data-id="hs000004"] .refraction-hotspot' ).count() ) === 0 );
	await v.ctx.close();

	const m = await visitor( browser, rel( pages[ k ].url ), 390, 800 );
	const ma = m.page.locator( '[data-id="hs000001"]' );
	await ma.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	const left = await ma.locator( '.refraction-hotspot__point' ).nth( 1 ).evaluate( ( e ) => { const r = e.parentElement.getBoundingClientRect(); return ( e.getBoundingClientRect().left - r.left ) / r.width; } );
	check( k, 'mobile: the responsive position (40%) replaces the desktop one (80%)', Math.abs( left - 0.4 ) < 0.02, left );
	await ma.locator( '.refraction-hotspot__marker' ).first().tap().catch( () => ma.locator( '.refraction-hotspot__marker' ).first().click() );
	check( k, 'mobile: tapping a marker opens its tooltip within the screen', await ma.locator( '.refraction-hotspot__tip' ).first().evaluate( ( t ) => { const r = t.getBoundingClientRect(); return r.right <= window.innerWidth + 1 && r.left >= -1 && r.width > 0; } ) );
	await m.ctx.close();
};

/* ------------------------------------------------------------ code highlight */
SECTIONS[ 'code-highlight' ] = async ( { browser, admin, pages } ) => {
	const k = 'code-highlight';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-code-highlight', 'Code Highlight' );
	await setSetting( admin, 'ch000001', { theme: 'solar', show_line_numbers: '' } );
	await sleep( 2500 );
	const pv = frameOf( admin );
	check( k, 'changing Theme and Line Numbers re-renders the preview', ( await pv.locator( '.refraction-code-theme-solar[data-id="ch000001"]' ).count() ) === 1 && ( await pv.locator( '[data-id="ch000001"] .refraction-code--numbers' ).count() ) === 0 );

	const v = await visitor( browser, rel( pages[ k ].url ), 1280, 900, { permissions: [ 'clipboard-read', 'clipboard-write' ] } );
	const p = v.page;
	const a = p.locator( '[data-id="ch000001"]' );
	check( k, 'three code lines inside pre > code', ( await a.locator( 'pre > code > .refraction-code__line' ).count() ) === 3 );
	check( k, 'file name, language label and a keyboard-focusable pre', ( await a.locator( '.refraction-code__file' ).innerText() ) === 'demo.js' && ( await a.locator( '.refraction-code__lang' ).innerText() ) === 'JavaScript' && ( await a.locator( 'pre' ).getAttribute( 'tabindex' ) ) === '0' );
	check( k, 'syntax is highlighted (comment, keyword, string, function)', await a.locator( '.rf-tok--comment' ).count() >= 1 && await a.locator( '.rf-tok--keyword' ).count() >= 2 && await a.locator( '.rf-tok--string' ).count() >= 1 && await a.locator( '.rf-tok--function' ).count() >= 1 );
	check( k, 'highlighted lines 2 and 3 are marked', JSON.stringify( await a.locator( '.refraction-code__line' ).evaluateAll( ( els ) => els.map( ( e ) => e.classList.contains( 'is-highlighted' ) ) ) ) === '[false,true,true]' );
	check( k, 'script text inside the code is shown, not run', ( await a.locator( 'code' ).innerText() ).includes( '<script>alert(1)</script>' ) && await noScripts( a ) );
	const nums = await a.locator( '.refraction-code__line' ).evaluateAll( ( els ) => els.map( ( e ) => getComputedStyle( e, '::before' ).content ) );
	check( k, 'line numbers come from CSS counters (generated content, not selectable text)', nums.every( ( n ) => /counter\(rf-line\)/.test( n ) ) && ! ( await a.locator( 'code' ).innerText() ).match( /^\s*1\s/ ), nums.join() );
	const original = await a.locator( '.refraction-code__line' ).evaluateAll( ( els ) => els.map( ( e ) => e.textContent ).join( '\n' ) );
	await a.locator( 'button.refraction-code__copy' ).click();
	await sleep( 400 );
	const clip = await p.evaluate( () => navigator.clipboard.readText() );
	check( k, 'Copy puts the code (without line numbers) on the clipboard', clip === original && clip.startsWith( '// hi\nconst a' ), JSON.stringify( clip ).slice( 0, 80 ) );
	check( k, 'the button says Copied and a live region announces it, then it resets', ( await a.locator( 'button.refraction-code__copy' ).innerText() ) === 'Copied' && ( await a.locator( '[role="status"]' ).innerText() ) === 'Copied' );
	await sleep( 2400 );
	check( k, 'the button label returns to Copy', ( await a.locator( 'button.refraction-code__copy' ).innerText() ) === 'Copy' );
	await a.locator( 'button.refraction-code__copy' ).focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 300 );
	check( k, 'Copy works with the keyboard', ( await a.locator( 'button.refraction-code__copy' ).innerText() ) === 'Copied' );

	const has = async ( id, sel ) => ( await p.locator( `[data-id="${ id }"] ${ sel }` ).count() ) > 0;
	check( k, 'PHP: variable, keyword and comment tokens', await has( 'ch000002', '.rf-tok--variable' ) && await has( 'ch000002', '.rf-tok--keyword' ) && await has( 'ch000002', '.rf-tok--comment' ) );
	check( k, 'CSS: selector, property and number tokens', await has( 'ch000003', '.rf-tok--selector' ) && await has( 'ch000003', '.rf-tok--property' ) && await has( 'ch000003', '.rf-tok--number' ) );
	check( k, 'HTML: tag, attribute and string tokens', await has( 'ch000004', '.rf-tok--tag' ) && await has( 'ch000004', '.rf-tok--attr' ) && await has( 'ch000004', '.rf-tok--string' ) );
	check( k, 'JSON: property, string, number and literal tokens', await has( 'ch000005', '.rf-tok--property' ) && await has( 'ch000005', '.rf-tok--number' ) && await has( 'ch000005', '.rf-tok--keyword' ) );
	check( k, 'Bash: comment, keyword and string tokens', await has( 'ch000006', '.rf-tok--comment' ) && await has( 'ch000006', '.rf-tok--keyword' ) && await has( 'ch000006', '.rf-tok--string' ) );
	check( k, 'Python: keyword, comment and function tokens (trailing newline dropped)', await has( 'ch000007', '.rf-tok--keyword' ) && await has( 'ch000007', '.rf-tok--comment' ) && ( await p.locator( '[data-id="ch000007"] .refraction-code__line' ).count() ) === 3 );
	const plain = p.locator( '[data-id="ch000008"]' );
	check( k, 'paper theme without bar, copy button or line numbers', ( await plain.locator( '.refraction-code__bar' ).count() ) === 0 && ( await plain.locator( '.refraction-code--numbers' ).count() ) === 0 && ( await p.locator( '.refraction-code-theme-paper[data-id="ch000008"]' ).count() ) === 1 );
	check( k, 'blank code prints nothing', ( await p.locator( '[data-id="ch000009"] .refraction-code' ).count() ) === 0 );
	const bg = await p.locator( '[data-id="ch000001"] .refraction-code' ).evaluate( ( e ) => getComputedStyle( e ).backgroundColor );
	const bg2 = await plain.locator( '.refraction-code' ).evaluate( ( e ) => getComputedStyle( e ).backgroundColor );
	check( k, 'themes change the colours', bg !== bg2, `${ bg } ${ bg2 }` );
	await p.screenshot( { path: join( SHOTS, 'code-highlight.png' ), fullPage: true } );
	await v.ctx.close();
};

/* -------------------------------------------------------------------- lottie */
SECTIONS.lottie = async ( { browser, admin, pages } ) => {
	const k = 'lottie';
	// Upload rules: only real animations are accepted as .json files.
	writeFileSync( '/tmp/rf2-good.json', JSON.stringify( { v: '5.7.0', fr: 30, ip: 0, op: 30, w: 10, h: 10, layers: [] } ) );
	writeFileSync( '/tmp/rf2-bad.json', JSON.stringify( { hello: 'world' } ) );
	const imp = ( f ) => { try { return wp( [ 'media', 'import', f, '--porcelain' ] ); } catch ( e ) { return 'ERR ' + e.message; } };
	const good = imp( '/tmp/rf2-good.json' );
	const bad = imp( '/tmp/rf2-bad.json' );
	check( k, 'the media library accepts a real Lottie .json file', /^\d+$/.test( good ), good );
	check( k, 'the media library rejects a .json file that is not a Lottie animation', /^ERR/.test( bad ) || ! /^\d+$/.test( bad ), bad );

	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-lottie', 'Lottie' );
	await setSetting( admin, 'lt000001', { label: 'Changed label' } );
	await sleep( 2500 );
	check( k, 'changing the description re-renders the preview', ( await frameOf( admin ).locator( '[data-id="lt000001"] [aria-label="Changed label"]' ).count() ) === 1 );
	check( k, 'the animation renders inside the editor preview', await frameOf( admin ).locator( '[data-id="lt000001"] svg' ).first().waitFor( { timeout: 15000 } ).then( () => true ).catch( () => false ) );

	const html = await ( await fetch( BASE + rel( pages[ k ].url ) ) ).text();
	check( k, 'the page source has no script tag for the player (it is loaded on demand)', ! /<script[^>]+lib\/lottie/.test( html ) );
	const reqs = [];
	const v = await visitor( browser, rel( pages[ k ].url ), 1280, 900 );
	const p = v.page;
	p.on( 'request', ( r ) => reqs.push( r.url() ) );
	await p.reload();
	const a = p.locator( '[data-id="lt000001"] .refraction-lottie' );
	await a.locator( 'svg' ).waitFor( { timeout: 15000 } );
	check( k, 'the bundled player is requested from the plugin folder (no CDN)', reqs.some( ( u ) => u.includes( '/refraction/assets/lib/lottie/lottie.min.js' ) ) && ! reqs.some( ( u ) => /cdnjs|unpkg|jsdelivr|lottiefiles/.test( u ) ), reqs.filter( ( u ) => /lottie/.test( u ) ).join() );
	check( k, 'it renders an SVG with an accessible name (role img)', ( await a.getAttribute( 'role' ) ) === 'img' && ( await a.getAttribute( 'aria-label' ) ) === 'Spinning square' && ( await a.getAttribute( 'data-state' ) ) === 'ready' );
	const snap = ( loc ) => loc.locator( 'svg' ).first().innerHTML();
	const s1 = await snap( a );
	await sleep( 350 );
	check( k, 'autoplay: the animation moves', ( await snap( a ) ) !== s1 );

	const c = p.locator( '[data-id="lt000002"] .refraction-lottie' );
	await c.locator( 'svg' ).waitFor( { timeout: 15000 } );
	check( k, 'click mode: a labelled button, paused on the first frame', ( await c.getAttribute( 'role' ) ) === 'button' && ( await c.getAttribute( 'aria-pressed' ) ) === 'false' && ( await c.getAttribute( 'tabindex' ) ) === '0' );
	const c1 = await snap( c );
	await sleep( 300 );
	check( k, 'click mode: it does not move until clicked', ( await snap( c ) ) === c1 );
	await c.click();
	await sleep( 300 );
	const c2 = await snap( c );
	await sleep( 250 );
	check( k, 'click mode: clicking plays it', ( await c.getAttribute( 'aria-pressed' ) ) === 'true' && ( await snap( c ) ) !== c2 );
	await c.focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 150 );
	const c3 = await snap( c );
	await sleep( 250 );
	check( k, 'click mode: Enter pauses it again', ( await c.getAttribute( 'aria-pressed' ) ) === 'false' && ( await snap( c ) ) === c3 );

	const h = p.locator( '[data-id="lt000003"] .refraction-lottie' );
	await h.locator( 'svg' ).waitFor( { timeout: 15000 } );
	const h1 = await snap( h );
	await sleep( 300 );
	check( k, 'hover mode: still until hovered', ( await snap( h ) ) === h1 );
	await h.hover();
	await sleep( 300 );
	const h2 = await snap( h );
	await sleep( 250 );
	check( k, 'hover mode: plays while hovered', ( await snap( h ) ) !== h2 );
	await p.mouse.move( 5, 5 );
	await sleep( 150 );
	const h3 = await snap( h );
	await sleep( 250 );
	check( k, 'hover mode: pauses when the pointer leaves', ( await snap( h ) ) === h3 );

	const e = p.locator( '[data-id="lt000004"] .refraction-lottie' );
	await sleep( 1500 );
	check( k, 'a JSON file that is not an animation ends in an error state with no SVG', ( await e.getAttribute( 'data-state' ) ) === 'error' && ( await e.locator( 'svg' ).count() ) === 0, await e.getAttribute( 'data-state' ) );
	check( k, 'a javascript: address prints nothing', ( await p.locator( '[data-id="lt000005"] .refraction-lottie' ).count() ) === 0 );

	const s = p.locator( '[data-id="lt000006"] .refraction-lottie' );
	check( k, 'below the fold: nothing is loaded for the animation yet', ( await s.locator( 'svg' ).count() ) === 0 );
	await s.evaluate( ( el ) => el.scrollIntoView( { block: 'start' } ) );
	await s.locator( 'svg' ).waitFor( { timeout: 15000 } );
	check( k, 'it loads when scrolled near', ( await s.getAttribute( 'data-state' ) ) === 'ready' );
	const y0 = await s.evaluate( ( el ) => Math.round( window.scrollY + el.getBoundingClientRect().top ) );
	// Rotation of the test animation is linear: 0 to 360 degrees over 60 frames, so the angle shows the frame.
	const reading = () => s.evaluate( ( el ) => {
		const r = el.getBoundingClientRect(), progress = Math.min( 1, Math.max( 0, ( innerHeight - r.top ) / ( innerHeight + r.height ) ) );
		const m = ( el.querySelector( 'svg' ).innerHTML.match( /matrix\(([-\d.e]+),([-\d.e]+),([-\d.e]+),([-\d.e]+),50,50\)/ ) || [] ).slice( 1 ).map( Number );
		const angle = ( ( Math.atan2( m[ 1 ], m[ 0 ] ) * 180 / Math.PI ) + 360 ) % 360;
		return { angle, expected: ( progress * 59 / 60 * 360 ) % 360, top: Math.round( r.top ), h: Math.round( r.height ), y: Math.round( scrollY ), ih: innerHeight };
	} );
	const goto = async ( y ) => { await p.evaluate( ( top ) => window.scrollTo( { top, behavior: 'instant' } ), y ); await sleep( 500 ); return reading(); };
	const pa = await goto( y0 - 300 );
	const pb = await goto( y0 + 100 );
	const pc = await goto( y0 - 300 );
	const near = ( r ) => Math.abs( r.angle - r.expected ) < 3 || Math.abs( Math.abs( r.angle - r.expected ) - 360 ) < 3;
	check( k, 'scroll mode: the frame follows the scroll position, both ways', near( pa ) && near( pb ) && near( pc ) && Math.abs( pa.angle - pb.angle ) > 10, JSON.stringify( [ pa, pb, pc ] ) );
	await v.ctx.close();

	const r = await visitor( browser, rel( pages[ k ].url ), 1280, 900, { reducedMotion: 'reduce' } );
	const ra = r.page.locator( '[data-id="lt000001"] .refraction-lottie' );
	await ra.locator( 'svg' ).waitFor( { timeout: 15000 } );
	const r1 = await snap( ra );
	await sleep( 400 );
	check( k, 'reduced motion: autoplay shows the first frame and stays still', ( await snap( ra ) ) === r1 );
	await r.ctx.close();
};

/* ------------------------------------------------------------ video playlist */
SECTIONS[ 'video-playlist' ] = async ( { browser, admin, pages } ) => {
	const k = 'video-playlist';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-video-playlist', 'Video Playlist' );
	await setSetting( admin, 'vp000001', { layout: 'left' } );
	await sleep( 2500 );
	check( k, 'changing Playlist Position re-renders the preview', ( await frameOf( admin ).locator( '[data-id="vp000001"].refraction-vp-layout-left' ).count() ) === 1 );

	const before = requested.length;
	const v = await visitor( browser, rel( pages[ k ].url ), 1280, 900 );
	const p = v.page;
	const a = p.locator( '[data-id="vp000001"]' );
	const cur = () => a.locator( '.refraction-vp__item[aria-current="true"]' ).getAttribute( 'data-index' );
	check( k, 'three playable items (the link that is not a video is dropped)', ( await a.locator( '.refraction-vp__item' ).count() ) === 3 );
	check( k, 'titles are escaped; durations and thumbnails show', ( await a.locator( '.refraction-vp__label' ).nth( 1 ).innerHTML() ) === 'Clip &lt;b&gt;two&lt;/b&gt;' && ( await a.locator( '.refraction-vp__duration' ).first().innerText() ) === '0:01' && ( await a.locator( '.refraction-vp__thumb' ).count() ) === 1 );
	check( k, 'nothing is loaded before play: no player, no request to a video site', ( await a.locator( 'iframe, video' ).count() ) === 0 && requested.length === before && await a.locator( '.refraction-vp__cover' ).isVisible() );
	check( k, 'the first item is current', ( await cur() ) === '0' );
	await a.locator( '.refraction-vp__play' ).click();
	await a.locator( 'video' ).waitFor();
	check( k, 'Play creates the video player for a video file', ( await a.locator( 'video' ).getAttribute( 'src' ) ).endsWith( 'rf2-clip.mp4' ) && await a.evaluate( ( e ) => e.querySelector( '.refraction-vp' ).classList.contains( 'is-playing' ) ) );
	// the 1 second clip ends and the next item starts by itself
	await p.waitForFunction( () => document.querySelector( '[data-id="vp000001"] .refraction-vp__item[aria-current="true"]' )?.dataset.index === '1', null, { timeout: 8000 } ).catch( () => {} );
	check( k, 'play next: when a video ends the next item starts', ( await cur() ) === '1' && ( await a.locator( 'video' ).count() ) === 1 && ( await a.locator( '.refraction-vp__now' ).innerText() ) === 'Clip <b>two</b>' );
	await p.waitForFunction( () => document.querySelector( '[data-id="vp000001"] .refraction-vp__item[aria-current="true"]' )?.dataset.index === '2', null, { timeout: 8000 } ).catch( () => {} );
	await a.locator( 'iframe' ).waitFor( { timeout: 5000 } ).catch( () => {} );
	const src = await a.locator( 'iframe' ).getAttribute( 'src' ).catch( () => null );
	check( k, 'a YouTube item becomes a privacy-enhanced iframe only when reached', ( await cur() ) === '2' && !! src && src.startsWith( 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1&enablejsapi=1&origin=' ) && ( await a.locator( 'iframe' ).getAttribute( 'title' ) ) === 'YouTube three', src );
	check( k, 'the iframe is allowed to autoplay and go fullscreen', /autoplay/.test( await a.locator( 'iframe' ).getAttribute( 'allow' ) ) );
	await a.locator( '.refraction-vp__prev' ).click();
	await sleep( 400 );
	check( k, 'Previous goes back and keeps playing', ( await cur() ) === '1' && ( await a.locator( 'video' ).count() ) === 1 );
	await a.locator( '.refraction-vp__item' ).nth( 0 ).focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 300 );
	check( k, 'a playlist item can be chosen with the keyboard', ( await cur() ) === '0' && ( await a.locator( '.refraction-vp__item' ).nth( 0 ).getAttribute( 'aria-current' ) ) === 'true' && ( await a.locator( '.refraction-vp__item' ).nth( 1 ).getAttribute( 'aria-current' ) ) === 'false' );
	await a.locator( '.refraction-vp__next' ).click();
	await sleep( 300 );
	check( k, 'Next advances', ( await cur() ) === '1' );
	await a.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await p.screenshot( { path: join( SHOTS, 'video-playlist.png' ) } );

	const b = p.locator( '[data-id="vp000002"]' );
	await b.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	const geo = await b.evaluate( ( e ) => ( { stage: e.querySelector( '.refraction-vp__stage' ).getBoundingClientRect().bottom, list: e.querySelector( '.refraction-vp__list' ).getBoundingClientRect().top } ) );
	check( k, 'layout "below" puts the playlist under the player', geo.list >= geo.stage - 1, JSON.stringify( geo ) );
	await b.locator( '.refraction-vp__play' ).click();
	await b.locator( 'video' ).waitFor();
	await sleep( 2500 );
	check( k, 'play next off: the first item stays current after the video ends', ( await b.locator( '.refraction-vp__item[aria-current="true"]' ).getAttribute( 'data-index' ) ) === '0' );
	check( k, 'a playlist without any playable video prints nothing', ( await p.locator( '[data-id="vp000003"] .refraction-vp' ).count() ) === 0 );
	await v.ctx.close();
};

/* ------------------------------------------------------------------- gallery */
SECTIONS.gallery = async ( { browser, admin, pages } ) => {
	const k = 'gallery';
	await openEditor( admin, pages[ k ].id );
	await editorBasics( null, admin, k, 'refraction-gallery', 'Gallery' );
	await setSetting( admin, 'gl000001', { layout: 'masonry' } );
	check( k, 'changing Layout re-renders the preview (masonry)', await frameOf( admin ).waitForSelector( '[data-id="gl000001"] .refraction-gallery--masonry', { timeout: 15000 } ).then( () => true ).catch( () => false ) );

	const v = await visitor( browser, rel( pages[ k ].url ), 1280, 900 );
	const p = v.page;
	const a = p.locator( '[data-id="gl000001"]' );
	const shown = () => a.locator( '.refraction-gallery__item:not([hidden])' ).count();
	const btn = a.locator( '.refraction-gallery__filter' );
	check( k, 'filter buttons: All plus one per gallery, escaped text', JSON.stringify( await btn.evaluateAll( ( els ) => els.map( ( e ) => e.innerHTML ) ) ) === JSON.stringify( [ 'All', 'Warm &lt;b&gt;tones&lt;/b&gt;', 'Cool tones' ] ) && ( await btn.first().getAttribute( 'aria-pressed' ) ) === 'true' );
	check( k, 'six images, lazy-loaded with width and height', ( await shown() ) === 6 && ( await a.locator( 'img[loading="lazy"][width][height]' ).count() ) === 6 );
	check( k, 'captions below the images come from the media library', ( await a.locator( '.refraction-gallery__caption' ).first().innerText() ) === 'Red caption' );
	const tops = await a.locator( '.refraction-gallery__item' ).evaluateAll( ( els ) => els.slice( 0, 4 ).map( ( e ) => Math.round( e.getBoundingClientRect().top ) ) );
	check( k, 'grid: three columns (first three share a row)', tops[ 0 ] === tops[ 1 ] && tops[ 1 ] === tops[ 2 ] && tops[ 3 ] > tops[ 0 ], tops.join() );
	await btn.nth( 2 ).click();
	await sleep( 200 );
	check( k, 'a filter shows only that gallery and marks the button pressed', ( await shown() ) === 3 && ( await btn.nth( 2 ).getAttribute( 'aria-pressed' ) ) === 'true' && ( await btn.first().getAttribute( 'aria-pressed' ) ) === 'false' && ( await a.locator( '[role="status"]' ).innerText() ) === '3' );
	const groups = await a.locator( '.refraction-gallery__item:not([hidden])' ).evaluateAll( ( els ) => els.map( ( e ) => e.dataset.group ) );
	check( k, 'only the chosen gallery is visible', groups.every( ( g ) => g === 'g2' ), groups.join() );
	// lightbox walks through the filtered images only
	await a.locator( '.refraction-gallery__item:not([hidden]) a' ).first().click();
	await p.waitForSelector( '.refraction-lightbox', { state: 'visible', timeout: 10000 } ).catch( () => {} );
	const slides = await p.locator( '.refraction-lightbox .swiper-slide:not(.swiper-slide-duplicate)' ).count();
	check( k, 'the lightbox opens and contains only the three filtered images', await p.locator( '.refraction-lightbox:visible' ).count() > 0 && slides === 3, slides );
	await closeLightbox( p );
	await btn.first().focus();
	await p.keyboard.press( 'Enter' );
	await sleep( 200 );
	check( k, 'filters work with the keyboard; All shows everything again', ( await shown() ) === 6 );
	await a.locator( '.refraction-gallery__item a' ).first().click();
	await p.waitForSelector( '.refraction-lightbox', { state: 'visible', timeout: 10000 } ).catch( () => {} );
	check( k, 'with All selected the lightbox holds all six', ( await p.locator( '.refraction-lightbox .swiper-slide:not(.swiper-slide-duplicate)' ).count() ) === 6 );
	await closeLightbox( p );

	const m = p.locator( '[data-id="gl000002"] .refraction-gallery__items' );
	await m.evaluate( ( e ) => e.scrollIntoView( { block: 'start' } ) );
	check( k, 'masonry: three CSS columns', ( await m.evaluate( ( e ) => getComputedStyle( e ).columnCount ) ) === '3' );
	const j = p.locator( '[data-id="gl000003"]' );
	await j.evaluate( ( e ) => e.scrollIntoView( { block: 'start' } ) );
	const rows = await j.locator( '.refraction-gallery__item' ).evaluateAll( ( els ) => { const out = {}; els.forEach( ( e ) => { const r = e.getBoundingClientRect(); ( out[ Math.round( r.top ) ] ||= [] ).push( { h: r.height, right: r.right } ); } ); return Object.values( out ); } );
	const box = await j.locator( '.refraction-gallery__items' ).evaluate( ( e ) => e.getBoundingClientRect().right );
	check( k, 'justified: several rows', rows.length >= 2, rows.length );
	check( k, 'justified: items of a full row have the same height and end flush with the right edge', rows.length >= 2 && Math.max( ...rows[ 0 ].map( ( x ) => x.h ) ) - Math.min( ...rows[ 0 ].map( ( x ) => x.h ) ) < 2 && Math.abs( Math.max( ...rows[ 0 ].map( ( x ) => x.right ) ) - box ) < 2, JSON.stringify( rows[ 0 ] ) );
	const o = p.locator( '[data-id="gl000004"]' );
	check( k, 'lightbox off: images are not links', ( await o.locator( 'a' ).count() ) === 0 && ( await o.locator( 'span.refraction-gallery__link' ).count() ) === 3 );
	check( k, 'no "All" button: the first gallery is selected and the other is hidden', ( await o.locator( '.refraction-gallery__filter' ).count() ) === 2 && ( await o.locator( '.refraction-gallery__item:not([hidden])' ).count() ) === 2 && ( await o.locator( '.refraction-gallery__filter' ).first().getAttribute( 'aria-pressed' ) ) === 'true' );
	check( k, 'overlay captions exist', ( await o.locator( '.refraction-gallery--caption-overlay .refraction-gallery__caption' ).count() ) === 3 );
	check( k, 'a gallery without images prints nothing', ( await p.locator( '[data-id="gl000005"] .refraction-gallery' ).count() ) === 0 );
	await p.screenshot( { path: join( SHOTS, 'gallery.png' ), fullPage: true } );
	await v.ctx.close();

	const mob = await visitor( browser, rel( pages[ k ].url ), 390, 800 );
	const mt = await mob.page.locator( '[data-id="gl000001"] .refraction-gallery__item' ).evaluateAll( ( els ) => els.slice( 0, 3 ).map( ( e ) => Math.round( e.getBoundingClientRect().top ) ) );
	check( k, 'mobile: two columns', mt[ 0 ] === mt[ 1 ] && mt[ 2 ] > mt[ 0 ], mt.join() );
	await mob.ctx.close();
};

/* ------------------------------------------------------------------ facebook */
SECTIONS.facebook = async ( { browser, admin, pages } ) => {
	const k = 'facebook';
	await openEditor( admin, pages[ k ].id );
	for ( const [ type, title ] of [ [ 'refraction-facebook-button', 'Facebook Button' ], [ 'refraction-facebook-comments', 'Facebook Comments' ], [ 'refraction-facebook-embed', 'Facebook Embed' ], [ 'refraction-facebook-page', 'Facebook Page' ] ] ) {
		await editorBasics( null, admin, `${ k }:${ title }`, type, title );
	}
	await setSetting( admin, 'fb000006', { small_header: '' } );
	await sleep( 2500 );
	const fsrc = await frameOf( admin ).locator( '[data-id="fb000006"] iframe' ).getAttribute( 'src' );
	check( k, 'changing Small Header re-renders the preview iframe', !! fsrc && fsrc.includes( 'small_header=false' ), fsrc );

	const html = await ( await fetch( BASE + rel( pages[ k ].url ) ) ).text();
	check( k, 'the page has no Facebook SDK or pixel script', ! /connect\.facebook\.net|fbevents|fbq\(|sdk\.js/.test( html ) );
	const seen = requested.length;
	const v = await visitor( browser, rel( pages[ k ].url ), 1280, 900 );
	const p = v.page;
	const srcOf = ( id ) => p.locator( `[data-id="${ id }"] iframe` ).getAttribute( 'src' );
	check( k, 'Button: like.php iframe with action, layout, size, share', ( await srcOf( 'fb000001' ) ) === 'https://www.facebook.com/plugins/like.php?href=https%3A%2F%2Fexample.com%2Flike-me&layout=button_count&action=recommend&size=large&share=true&show_faces=false', await srcOf( 'fb000001' ) );
	const cur = await srcOf( 'fb000002' );
	check( k, 'Button: current page address is encoded into href', cur.startsWith( 'https://www.facebook.com/plugins/like.php?href=' + encodeURIComponent( BASE + rel( pages[ k ].url ) ) ), cur );
	check( k, 'Comments: comments.php iframe with the number of posts', ( await srcOf( 'fb000003' ) ) === 'https://www.facebook.com/plugins/comments.php?href=https%3A%2F%2Fexample.com%2Fdiscuss&numposts=7&width=1000' );
	check( k, 'Embed (post): post.php iframe, width and height set', ( await srcOf( 'fb000004' ) ) === 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FMeta%2Fposts%2F123&width=500&show_text=true' && ( await p.locator( '[data-id="fb000004"] iframe' ).getAttribute( 'height' ) ) === '400' );
	check( k, 'Embed (video): video.php iframe without text', ( await srcOf( 'fb000005' ) ) === 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FMeta%2Fvideos%2F456&width=500&show_text=false' );
	check( k, 'Page: page.php iframe with tabs, size and header options', ( await srcOf( 'fb000006' ) ) === 'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FMeta&tabs=timeline%2Cevents&width=340&height=450&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true', await srcOf( 'fb000006' ) );
	check( k, 'a non-Facebook page address prints no iframe', ( await p.locator( '[data-id="fb000007"] iframe' ).count() ) === 0 );
	check( k, 'an empty embed prints no iframe', ( await p.locator( '[data-id="fb000008"] iframe' ).count() ) === 0 );
	const attrs = await p.locator( '.refraction-facebook iframe' ).evaluateAll( ( els ) => els.map( ( e ) => ( { t: e.title, l: e.getAttribute( 'loading' ), r: e.getAttribute( 'referrerpolicy' ), s: e.getAttribute( 'src' ).startsWith( 'https://www.facebook.com/plugins/' ) } ) ) );
	check( k, 'every iframe has a title, loads lazily, and points at facebook.com/plugins', attrs.length === 6 && attrs.every( ( x ) => x.t && 'lazy' === x.l && x.r && x.s ), JSON.stringify( attrs ) );
	check( k, 'only plugin addresses on facebook.com are requested (no SDK, no pixel)', requested.slice( seen ).every( ( u ) => u.startsWith( 'https://www.facebook.com/plugins/' ) ), requested.slice( seen ).join() );
	await v.ctx.close();

	const other = requested.length;
	const o = await visitor( browser, '/', 1280, 800 );
	check( k, 'a page without a Facebook widget makes no request to Facebook', requested.slice( other ).length === 0 );
	await o.ctx.close();
};

/* ------------------------------------------------------------------- driver */
async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	if ( ! existsSync( CLIP ) ) {
		execFileSync( 'ffmpeg', [ '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=160x90:rate=10', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', CLIP ] );
	}

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox', '--autoplay-policy=no-user-gesture-required' ] } );
	try {
		wp( [ 'plugin', 'activate', 'refraction' ] );
		const out = wp( [ 'eval-file', SEED ], { RF2_CLIP: CLIP } );
		const pages = JSON.parse( out.slice( out.indexOf( '{' ) ) );
		const admin = await login( browser, 'admin', 'admin' );
		watch( admin.page, 'admin' );

		for ( const [ name, fn ] of Object.entries( SECTIONS ) ) {
			if ( ONLY.length && ! ONLY.includes( name ) ) { continue; }
			console.log( `\n== ${ name } ==` );
			try {
				await fn( { browser, admin, pages } );
			} catch ( e ) {
				check( name, 'section ran without throwing', false, e.stack || e.message );
			}
		}

		const php = logTail( logStart );
		check( 'global', 'no PHP errors/warnings in the debug log', ! /PHP (Warning|Notice|Fatal|Deprecated|Parse)/.test( php ), php.slice( 0, 400 ) );
		const real = consoleErrors.filter( ( e ) => ! /favicon|Failed to load resource: the server responded with a status of 404 \(Not Found\)$/.test( e ) );
		check( 'global', 'no browser console errors', real.length === 0, real.slice( 0, 4 ).join( ' || ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( `\n${ results.length - failures }/${ results.length } checks passed` );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
