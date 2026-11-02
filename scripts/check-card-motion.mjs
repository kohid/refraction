#!/usr/bin/env node
/**
 * Card motion check (SQLite test site, Chromium): the Image and Image Box card stack (fan, deck, carousel, shuffle)
 * builds five cards from the widget's image and four more, hovering a card behind brings it forward, the deck and
 * shuffle play by themselves, the carousel's dots pick a card, the glow takes the front card's color; the Slides
 * "Timed cards" layout grows the next card into the slide, moves the counter and plays with its timer; the editor
 * builds the stacks from the live settings; nothing scrolls sideways on a phone.
 *
 * Usage: node scripts/check-card-motion.mjs [--site /tmp/rf-cards-site] [--port 8997] [--shots /tmp/card-motion-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-cards-site' );
const PORT = arg( 'port', '8997' );
const SHOTS = arg( 'shots', '/tmp/card-motion-shots' );
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

function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id, url: wp( [ 'post', 'list', '--post_type=page', `--post__in=${ id }`, '--field=url' ] ).trim() };
}

const box = ( id, elements ) => ( { id, elType: 'container', settings: { content_width: 'full', min_height: { unit: 'px', size: 620 }, flex_justify_content: 'center' }, elements, isInner: false } );

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
		wp( [ 'user', 'update', 'admin', '--user_pass=admin' ] );
		const dir = join( tmpdir(), `rfcards-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		const colors = [ '#e94e3c', '#2f80ed', '#27ae60', '#f2c94c', '#9b51e0', '#1abc9c' ];
		const ids = colors.map( ( c, i ) => {
			execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${ c }:size=600x800`, '-frames:v', '1', join( dir, `card-${ i }.jpg` ) ] );
			return Number( wp( [ 'media', 'import', join( dir, `card-${ i }.jpg` ), '--porcelain', `--alt=Card ${ i }` ] ).trim() );
		} );
		const urlOf = ( id ) => wp( [ 'post', 'list', '--post_type=attachment', `--post__in=${ id }`, '--field=guid' ] ).trim();
		const urls = Object.fromEntries( ids.map( ( id ) => [ id, urlOf( id ) ] ) );
		const media = ( id ) => ( { id, url: urls[ id ] } );
		const extra = ids.slice( 1, 5 ).map( media );
		const stack = ( style, more = {} ) => ( { id: 'w' + style, elType: 'widget', widgetType: 'image', settings: { image: media( ids[ 0 ] ), image_size: 'full', rf_stack: style, rf_stack_images: extra, rf_stack_interval: '1500', ...more }, elements: [] } );
		const demo = page( 'Stacks', [
			box( 'b1', [ stack( 'fan' ) ] ),
			box( 'b2', [ stack( 'deck' ) ] ),
			box( 'b3', [ stack( 'carousel', { rf_stack_autoplay: '' } ) ] ),
			box( 'b4', [ stack( 'shuffle', { rf_stack_glow: 'yes', rf_stack_reflection: 'yes', rf_stack_autoplay: '' } ) ] ),
			box( 'b5', [ { id: 'wbox', elType: 'widget', widgetType: 'image-box', settings: { image: media( ids[ 0 ] ), title_text: 'Boxed stack', description_text: 'Text stays.', rf_stack: 'fan', rf_stack_images: extra.slice( 0, 2 ) }, elements: [] } ] ),
		] );
		const slide = ( i, title, sub ) => ( { _id: 's' + i, heading: title, subtitle: sub, description: 'A place to remember.', button_text: 'Discover', background_image: media( ids[ i ] ), background_color: '#222222' } );
		const slidesPage = page( 'Timed cards', [ box( 'bs', [ { id: 'wslides', elType: 'widget', widgetType: 'refraction-slides', settings: {
			layout: 'cards', autoplay: 'yes', autoplay_speed: 2500, transition_speed: 700, slides_height: { unit: 'vh', size: 100 },
			slides: [ slide( 1, 'Saint Antonien', 'Switzerland Alps' ), slide( 2, 'Nagano', 'Japan Alps' ), slide( 3, 'Merzouga', 'Sahara' ), slide( 4, 'Yosemite', 'California' ) ],
		}, elements: [] } ] ) ] );

		const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( demo.url, { waitUntil: 'load' } );
		const at = ( id ) => `.refraction-element-${ id }`;
		const front = ( id ) => p.evaluate( ( sel ) => {
			const card = document.querySelector( `${ sel } .rf-stack__card.is-front` );
			return card ? card.dataset.index : null;
		}, at( id ) );
		const look = async ( id ) => {
			await p.locator( at( id ) ).scrollIntoViewIfNeeded();
			await sleep( 1100 );
		};

		// ------------------------------------------------------------ fan
		await look( 'wfan' );
		const fan = await p.evaluate( ( sel ) => {
			const cards = [ ...document.querySelectorAll( `${ sel } .rf-stack__card` ) ];
			return { n: cards.length, ready: !! document.querySelector( `${ sel } .rf-stack.is-ready` ), alts: cards.map( ( c ) => c.querySelector( 'img' ).alt ), rot: cards.map( ( c ) => c.style.transform ) };
		}, at( 'wfan' ) );
		await p.screenshot( { path: join( SHOTS, 'fan.png' ) } );
		check( 'stack', 'the image and four more become five cards, fanned out, with their alt texts', 5 === fan.n && fan.ready && 'Card 1' === fan.alts[ 1 ] && /rotate\(-8deg\)/.test( fan.rot[ 1 ] ) && /rotate\(8deg\)/.test( fan.rot[ 2 ] ), JSON.stringify( fan ) );
		// A point where a card behind the front one shows (its edge sticking out to the right).
		const spot = await p.evaluate( ( sel ) => {
			const r = document.querySelector( `${ sel } .rf-stack` ).getBoundingClientRect();
			for ( let x = r.right + 200; x > r.left; x -= 6 ) {
				const hit = document.elementFromPoint( x, r.top + ( r.height / 2 ) );
				const card = hit && hit.closest( '.rf-stack__card' );
				if ( card && ! card.classList.contains( 'is-front' ) ) {
					return { x, y: r.top + ( r.height / 2 ), index: card.dataset.index };
				}
			}
			return null;
		}, at( 'wfan' ) );
		await p.mouse.move( spot.x, spot.y );
		await sleep( 400 );
		check( 'stack', 'hovering a card behind brings it to the front', spot && spot.index === await front( 'wfan' ), JSON.stringify( spot ) );
		await p.mouse.move( 5, 5 );

		// ------------------------------------------------------------ deck
		await look( 'wdeck' );
		const deck0 = await front( 'wdeck' );
		await sleep( 2300 );
		const deck1 = await front( 'wdeck' );
		await p.screenshot( { path: join( SHOTS, 'deck.png' ) } );
		check( 'stack', 'the deck plays by itself: the top card leaves for the back', '0' === deck0 && '1' === deck1, `${ deck0 } -> ${ deck1 }` );

		// ------------------------------------------------------------ carousel
		await look( 'wcarousel' );
		const dots = p.locator( `${ at( 'wcarousel' ) } .rf-stack__dots button` );
		check( 'stack', 'the carousel has one dot per card', 5 === await dots.count() );
		await dots.nth( 3 ).click();
		await sleep( 500 );
		const sides = await p.evaluate( ( sel ) => [ ...document.querySelectorAll( `${ sel } .rf-stack__card` ) ].map( ( c ) => c.style.opacity ), at( 'wcarousel' ) );
		await p.screenshot( { path: join( SHOTS, 'carousel.png' ) } );
		check( 'stack', 'a dot brings its card to the front, its neighbours wait at the sides', '3' === await front( 'wcarousel' ) && 'true' === await dots.nth( 3 ).getAttribute( 'aria-current' ) && 3 === sides.filter( ( o ) => '1' === o ).length, JSON.stringify( sides ) );

		// ------------------------------------------------------------ shuffle
		await look( 'wshuffle' );
		await p.locator( `${ at( 'wshuffle' ) } .rf-stack__card.is-front` ).click();
		await sleep( 900 );
		const glow = await p.evaluate( ( sel ) => getComputedStyle( document.querySelector( `${ sel } .rf-stack` ) ).getPropertyValue( '--rf-stack-glow' ).trim(), at( 'wshuffle' ) );
		await p.screenshot( { path: join( SHOTS, 'shuffle.png' ) } );
		check( 'stack', 'a click sends the shuffle\'s front card to the back; the glow takes the new front card\'s color (blue)', '1' === await front( 'wshuffle' ) && /rgb\(4\d, 1[23]\d, 2[2-4]\d\)/.test( glow ), glow );

		// ------------------------------------------------------------ image box
		await look( 'wbox' );
		const boxed = await p.evaluate( ( sel ) => ( { n: document.querySelectorAll( `${ sel } .rf-stack__card` ).length, text: document.querySelector( `${ sel } .refraction-image-box-title` ).textContent } ), at( 'wbox' ) );
		check( 'stack', 'the Image Box shows its stack and keeps its text', 3 === boxed.n && 'Boxed stack' === boxed.text, JSON.stringify( boxed ) );

		// ------------------------------------------------------------ slides: timed cards
		await p.goto( slidesPage.url, { waitUntil: 'load' } );
		await sleep( 600 );
		const state = () => p.evaluate( () => ( {
			active: [ ...document.querySelectorAll( '.rf-tco__slide' ) ].findIndex( ( s ) => s.classList.contains( 'is-active' ) ),
			count: document.querySelector( '.rf-tco__count' ).textContent,
			text: document.querySelector( '.rf-tco__text.is-active .refraction-slide__title' ) ? document.querySelector( '.rf-tco__text.is-active .refraction-slide__title' ).textContent : '',
			gone: [ ...document.querySelectorAll( '.rf-tco__card' ) ].findIndex( ( c ) => c.classList.contains( 'is-gone' ) ),
			line: document.querySelector( '.rf-tco__line i' ).style.width,
		} ) );
		const s0 = await state();
		await p.screenshot( { path: join( SHOTS, 'slides-1.png' ) } );
		check( 'slides', 'Timed cards: the first slide fills the widget, the next ones wait as cards, counter 01', 0 === s0.active && '01' === s0.count && 'Saint Antonien' === s0.text && 0 === s0.gone && '25%' === s0.line, JSON.stringify( s0 ) );
		await p.click( '.rf-tco__next' );
		await sleep( 250 );
		const growing = await p.evaluate( () => !! document.querySelector( '.rf-tco__grow' ) );
		await p.screenshot( { path: join( SHOTS, 'slides-grow.png' ) } );
		await sleep( 800 );
		const s1 = await state();
		check( 'slides', 'next: the card grows into the slide, then the title, counter and line follow', growing && 1 === s1.active && '02' === s1.count && 'Nagano' === s1.text && 1 === s1.gone && '50%' === s1.line, JSON.stringify( s1 ) );
		await p.click( '.rf-tco__card >> nth=2' );
		await sleep( 1100 );
		check( 'slides', 'clicking a card opens that slide', 2 === ( await state() ).active );
		await p.mouse.move( 5, 790 );
		await p.evaluate( () => document.activeElement && document.activeElement.blur() );
		await sleep( 3600 );
		check( 'slides', 'the timer moves on by itself', 3 === ( await state() ).active, JSON.stringify( await state() ) );
		await p.screenshot( { path: join( SHOTS, 'slides-2.png' ) } );
		await ctx.close();

		// ------------------------------------------------------------ phone
		const m = await browser.newContext( { viewport: { width: 390, height: 844 } } );
		const mp = await m.newPage();
		mp.on( 'pageerror', ( e ) => errors.push( e.message ) );
		for ( const target of [ demo.url, slidesPage.url ] ) {
			await mp.goto( target, { waitUntil: 'load' } );
			await sleep( 1200 );
			for ( let y = 0; y < 4000; y += 700 ) {
				await mp.evaluate( ( v ) => window.scrollTo( 0, v ), y );
				await sleep( 150 );
			}
			check( 'phone', `no sideways scrolling on a phone (${ target.includes( demo.id ) ? 'stacks' : 'slides' })`, ! ( await mp.evaluate( () => document.documentElement.scrollWidth > window.innerWidth ) ) );
		}
		await mp.goto( slidesPage.url, { waitUntil: 'load' } );
		await sleep( 800 );
		await mp.screenshot( { path: join( SHOTS, 'slides-phone.png' ) } );
		await m.close();

		// ------------------------------------------------------------ editor
		const ed = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
		const ep = await ed.newPage();
		ep.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await ep.goto( `${ BASE }/wp-login.php?redirect_to=${ encodeURIComponent( `${ BASE }/wp-admin/profile.php` ) }` );
		await ep.fill( '#user_login', 'admin' );
		await ep.fill( '#user_pass', 'admin' );
		await Promise.all( [ ep.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), ep.click( '#wp-submit' ) ] );
		await ep.goto( `${ BASE }/wp-admin/post.php?post=${ demo.id }&action=refraction`, { timeout: 120000 } );
		await ep.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await sleep( 2500 );
		const preview = ep.frameLocator( '#refraction-preview-iframe' );
		const inEditor = await preview.locator( '.rf-stack__card' ).count();
		await ep.evaluate( () => {
			const c = refraction.getPreviewContainer().children[ 0 ].children[ 0 ];
			$e.run( 'document/elements/settings', { container: c, settings: { rf_stack: 'carousel' } } );
		} );
		await sleep( 1500 );
		const changed = await preview.locator( '.refraction-element-wfan .rf-stack--carousel' ).count();
		check( 'editor', 'the editor builds the stacks and follows a change of style live', inEditor >= 18 && 1 === changed, `${ inEditor } ${ changed }` );
		await ed.close();
	} catch ( err ) {
		failures++;
		console.log( 'FAIL  script / ' + ( err.stack || err.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', errors.length === 0, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 1500 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall card motion checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
