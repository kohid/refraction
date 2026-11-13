#!/usr/bin/env node
/**
 * Reveal check (SQLite test site, Chromium): headline text split line by line behind masks (screen readers get the whole
 * sentence), words that play every time, cards inside a container one after another, an element that plays with the
 * scroll (forward and backward), parallax presets, reduced motion, the no-script failsafe, and live rebuilds in the
 * editor. Saves screenshots and a scroll recording to --shots.
 *
 * Usage: node scripts/check-reveal.mjs [--site /tmp/rf-reveal-site] [--port 8980] [--shots /tmp/reveal-shots]
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
const SITE = arg( 'site', '/tmp/rf-reveal-site' );
const PORT = arg( 'port', '8980' );
const SHOTS = arg( 'shots', '/tmp/reveal-shots' );
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

const ink = '#f4f1ff';
const heading = ( id, title, settings = {} ) => ( { id, elType: 'widget', widgetType: 'heading', settings: { title, header_size: 'h2', title_color: ink, typography_typography: 'custom', typography_font_size: { unit: 'px', size: 56 }, typography_font_weight: '700', typography_line_height: { unit: 'em', size: 1.05 }, ...settings }, elements: [] } );
const text = ( id, html, settings = {} ) => ( { id, elType: 'widget', widgetType: 'text-editor', settings: { editor: html, text_color: '#b9b4d6', typography_typography: 'custom', typography_font_size: { unit: 'px', size: 18 }, ...settings }, elements: [] } );
const card = ( id, title, body ) => box( id, { background_background: 'classic', background_color: '#221d4a', padding: { unit: 'px', top: 28, right: 28, bottom: 28, left: 28, isLinked: true }, border_radius: { unit: 'px', top: 14, right: 14, bottom: 14, left: 14, isLinked: true }, width: { unit: '%', size: 30 } }, [ heading( id + 'h', title, { header_size: 'h3', typography_font_size: { unit: 'px', size: 22 } } ), text( id + 't', `<p>${ body }</p>` ) ], true );
const dark = { background_background: 'classic', background_color: '#120f2e', padding: { unit: 'px', top: 120, right: 80, bottom: 120, left: 80, isLinked: false }, min_height: { unit: 'vh', size: 90 }, flex_justify_content: 'center' };

const piecesOf = ( p, sel ) => p.evaluate( ( s ) => Array.from( document.querySelectorAll( s ) ).map( ( el ) => ( {
	p: parseFloat( getComputedStyle( el ).getPropertyValue( '--rf-rv-p' ) ),
	delay: el.style.getPropertyValue( '--rf-rv-delay' ),
	fx: el.getAttribute( 'data-rf-rv-fx' ) || el.getAttribute( 'data-rf-rv-played' ),
	opacity: parseFloat( getComputedStyle( el ).opacity ),
} ) ), sel );
const scrollToEl = ( p, sel, share = 0 ) => p.evaluate( ( [ s, f ] ) => {
	const el = document.querySelector( s );
	const top = el.getBoundingClientRect().top + window.scrollY;
	window.scrollTo( 0, top - ( innerHeight * ( 1 - f ) ) );
}, [ sel, share ] );

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
	const watch = ( p, label ) => p.on( 'pageerror', ( e ) => errors.push( `[${ label }] ${ e.message }` ) );

	try {
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
		const demo = page( 'Reveal', [
			box( 'hero', { ...dark, min_height: { unit: 'vh', size: 115 }, flex_direction: 'row', flex_align_items: 'center' }, [
				box( 'herotext', { width: { unit: '%', size: 55 } }, [
					heading( 'h1', 'The future of ad tracking, measured as you scroll', { header_size: 'h1', typography_font_size: { unit: 'px', size: 64 }, rf_reveal_text: 'lines', rf_reveal_stagger: 120, rf_reveal_duration: 900 } ),
					text( 'lead', '<p>Track, manage and <strong>optimise</strong> every campaign in one place.</p>', { rf_reveal_text: 'words', rf_reveal_text_effect: 'fade-up', rf_reveal_trigger: 'always', rf_reveal_delay: 500, rf_reveal_stagger: 40, rf_reveal_distance: 16 } ),
				], true ),
				box( 'art', { width: { unit: '%', size: 40 } }, [
					heading( 'layer-far', '◆', { typography_font_size: { unit: 'px', size: 140 }, title_color: '#3b2f8f', rf_scroll_preset: 'far' } ),
					heading( 'layer-near', '●', { typography_font_size: { unit: 'px', size: 80 }, title_color: '#ff5a4e', rf_scroll_preset: 'near' } ),
				], true ),
			] ),
			box( 'features', { ...dark, background_color: '#18143a', flex_direction: 'row', flex_wrap: 'wrap', flex_gap: { unit: 'px', column: '24', row: '24', isLinked: true }, rf_reveal_children: 'fade-up', rf_reveal_stagger: 150 }, [
				card( 'c1', 'Track data points', 'Thirty data points about every impression, visit, click and conversion.' ),
				card( 'c2', 'Drill-down reports', 'Granular reports from your own database.' ),
				card( 'c3', 'Budget alerts', 'Know before a campaign overspends.' ),
			] ),
			box( 'scrub', { ...dark, min_height: { unit: 'vh', size: 120 } }, [
				heading( 'scrubbed', 'This one follows your scroll', { rf_reveal: 'zoom-in', rf_reveal_trigger: 'scroll', rf_reveal_start: 0, rf_reveal_end: 60 } ),
			] ),
			box( 'end', { ...dark, min_height: { unit: 'vh', size: 100 } }, [ heading( 'endh', 'Start tracking', { rf_reveal: 'rise' } ) ] ),
		] );

		// ------------------------------------------------------------ the site
		const ctx = await browser.newContext( { viewport: { width: 1400, height: 850 }, recordVideo: { dir: SHOTS, size: { width: 1400, height: 850 } } } );
		const v = await ctx.newPage();
		watch( v, 'site' );
		await v.goto( demo.url );
		const html = await v.content();
		check( 'site', 'the reveal script loads with the page that uses it', /reveal-frontend(\.min)?\.js/.test( html ) );
		await v.waitForFunction( () => document.querySelector( '[data-id="h1"] [data-rf-rv-piece]' ), null, { timeout: 15000 } );
		await sleep( 2200 );
		await v.screenshot( { path: join( SHOTS, 'hero.png' ) } );
		const hero = await v.evaluate( () => {
			const el = document.querySelector( '[data-id="h1"]' );
			const words = el.querySelectorAll( '.rf-rv-word' );
			return {
				words: words.length,
				clipped: el.querySelectorAll( '.rf-rv-clip > .rf-rv-word[data-rf-rv-fx="mask"], .rf-rv-clip > .rf-rv-word[data-rf-rv-played="mask"]' ).length,
				sr: ( el.querySelector( '.rf-rv-sr' ) || {} ).textContent,
				hidden: Array.from( words ).every( ( w ) => 'true' === w.getAttribute( 'aria-hidden' ) ),
				delays: [ ...new Set( Array.from( words ).map( ( w ) => w.style.getPropertyValue( '--rf-rv-delay' ) ) ) ],
				lines: new Set( Array.from( words ).map( ( w ) => Math.round( w.getBoundingClientRect().top ) ) ).size,
				wait: el.classList.contains( 'rf-rv-wait' ),
			};
		} );
		check( 'text', 'a heading is split into words that slide up from behind their own line', hero.words === 9 && hero.clipped === 9 && ! hero.wait, JSON.stringify( hero ) );
		check( 'text', 'screen readers get the whole sentence once; the pieces are hidden from them', hero.sr === 'The future of ad tracking, measured as you scroll' && hero.hidden );
		check( 'text', 'line by line: one delay per line, 120 ms apart', hero.delays.length === hero.lines && hero.lines >= 2 && hero.delays[ 1 ] === '120ms', JSON.stringify( hero ) );
		const heroPieces = await piecesOf( v, '[data-id="h1"] [data-rf-rv-piece]' );
		check( 'text', 'after it played every piece is in place', heroPieces.every( ( x ) => x.p === 1 ), JSON.stringify( heroPieces.slice( 0, 3 ) ) );
		const lead = await v.evaluate( () => ( { bold: !! document.querySelector( '[data-id="lead"] strong .rf-rv-word' ), sr: Array.from( document.querySelectorAll( '[data-id="lead"] .rf-rv-sr' ) ).map( ( s ) => s.textContent ).join( '' ) } ) );
		check( 'text', 'formatting inside the text (bold) is kept around its words', lead.bold && lead.sr === 'Track, manage and optimise every campaign in one place.', JSON.stringify( lead ) );

		const before = await piecesOf( v, '[data-id="features"] [data-rf-rv-piece]' );
		check( 'children', 'cards below the fold wait hidden', before.length === 3 && before.every( ( x ) => x.p === 0 && x.opacity === 0 ), JSON.stringify( before ) );
		await scrollToEl( v, '[data-id="features"]', 0.6 );
		await sleep( 1800 );
		await v.screenshot( { path: join( SHOTS, 'cards.png' ) } );
		const after = await piecesOf( v, '[data-id="features"] [data-rf-rv-piece]' );
		check( 'children', 'they come in one after another: 0, 150, 300 ms', after.every( ( x ) => x.p === 1 ) && after.map( ( x ) => x.delay ).join() === '0ms,150ms,300ms' && after.every( ( x ) => x.fx === 'fade-up' ), JSON.stringify( after ) );

		const fx = await v.evaluate( () => [ JSON.parse( document.querySelector( '[data-id="layer-far"]' ).getAttribute( 'data-rf-fx' ) ), JSON.parse( document.querySelector( '[data-id="layer-near"]' ).getAttribute( 'data-rf-fx' ) ) ] );
		check( 'parallax', 'presets give each layer its own speed', fx[ 0 ].scroll.effects.ty.speed === 2 && fx[ 1 ].scroll.effects.ty.speed === 7, JSON.stringify( fx ) );

		const scrubAt = async ( share ) => {
			await scrollToEl( v, '[data-id="scrubbed"]', share );
			await sleep( 500 );
			return v.evaluate( () => {
				const el = document.querySelector( '[data-id="scrubbed"]' );
				return { progress: Number( el.getAttribute( 'data-rf-rv-progress' ) ), p: parseFloat( getComputedStyle( el ).getPropertyValue( '--rf-rv-p' ) ) };
			} );
		};
		const s1 = await scrubAt( 0.15 );
		const s2 = await scrubAt( 0.35 );
		const s3 = await scrubAt( 0.75 );
		const s4 = await scrubAt( 0.2 );
		check( 'scroll', 'with the scroll: it plays forward as you scroll down', s1.p < s2.p && s2.p < s3.p && s3.p === 1, JSON.stringify( [ s1, s2, s3 ] ) );
		check( 'scroll', 'and backward as you scroll up', s4.p < s3.p && s4.p < s2.p, JSON.stringify( [ s3, s4 ] ) );
		await scrollToEl( v, '[data-id="scrubbed"]', 0.4 );
		await sleep( 400 );
		await v.screenshot( { path: join( SHOTS, 'scroll.png' ) } );

		// "every time": leave and come back
		const state = () => v.evaluate( () => document.querySelector( '[data-id="lead"]' ).getAttribute( 'data-rf-rv-state' ) );
		const away = await state();
		await v.evaluate( () => window.scrollTo( 0, 0 ) );
		await sleep( 1600 );
		check( 'always', 'a text set to play every time is hidden after leaving and plays again on return', away === 'out' && 'in' === await state(), away );
		await ctx.close();
		const video = readdirSync( SHOTS ).filter( ( f ) => f.endsWith( '.webm' ) )[ 0 ];
		if ( video ) { renameSync( join( SHOTS, video ), join( SHOTS, 'reveal-scroll.webm' ) ); }

		// ------------------------------------------------------------ reduced motion and no script
		const r = await ( await browser.newContext( { viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' } ) ).newPage();
		watch( r, 'reduced' );
		await r.goto( demo.url );
		await sleep( 800 );
		const still = await r.evaluate( () => ( { pieces: document.querySelectorAll( '[data-rf-rv-piece]' ).length, split: document.querySelectorAll( '.rf-rv-word' ).length, hidden: Array.from( document.querySelectorAll( '[data-rf-reveal]' ) ).filter( ( el ) => getComputedStyle( el ).opacity !== '1' ).length } ) );
		check( 'reduced', 'with reduced motion nothing is split or hidden', still.pieces === 0 && still.split === 0 && still.hidden === 0, JSON.stringify( still ) );
		const n = await ( await browser.newContext( { javaScriptEnabled: false } ) ).newPage();
		await n.goto( demo.url );
		const early = await n.evaluate( () => getComputedStyle( document.querySelector( '[data-id="h1"]' ) ).opacity ).catch( () => null );
		await sleep( 3500 );
		const late = await n.evaluate( () => getComputedStyle( document.querySelector( '[data-id="h1"]' ) ).opacity ).catch( () => null );
		check( 'failsafe', 'without the script the content still shows after 3 seconds', late === '1', `${ early } -> ${ late }` );

		// ------------------------------------------------------------ every effect, the widgets that rewrite their text
		const EFFECTS = [ 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'fade', 'zoom-in', 'zoom-out', 'blur', 'rise', 'wipe-up', 'wipe-down', 'wipe-left', 'wipe-right', 'dim', 'blur-up', 'pop', 'spin', 'skew-up', 'flip-up', 'flip-left', 'swing', 'iris', 'curtain', 'split', 'diagonal', 'drop' ];
		const tall = { min_height: { unit: 'vh', size: 105 } };
		const fxKey = ( fx ) => fx.replace( /-/g, '' );
		const all = page( 'Reveal effects', [
			box( 'first', tall, [ heading( 'firsth', 'Effects' ) ] ),
			...EFFECTS.map( ( fx ) => box( 'e' + fxKey( fx ), { ...tall, flex_direction: 'row', rf_reveal_children: fx, rf_reveal_duration: 300, rf_reveal_stagger: 20 }, [
				heading( 'w' + fxKey( fx ), 'Whole ' + fx, { rf_reveal: fx, rf_reveal_duration: 300 } ),
				heading( 't' + fxKey( fx ), 'Words of ' + fx, { rf_reveal_text: 'words', rf_reveal_text_effect: fx, rf_reveal_duration: 300, rf_reveal_stagger: 20 } ),
			] ) ),
			box( 'live', { ...tall, flex_direction: 'column' }, [
				{ id: 'ahl', elType: 'widget', widgetType: 'refraction-animated-headline', settings: { rf_reveal_text: 'words' }, elements: [] },
				{ id: 'mq', elType: 'widget', widgetType: 'refraction-marquee', settings: { rf_reveal_text: 'chars' }, elements: [] },
				{ id: 'cnt', elType: 'widget', widgetType: 'counter', settings: { title: 'Happy riders', rf_reveal_text: 'words' }, elements: [] },
				{ id: 'cd', elType: 'widget', widgetType: 'refraction-countdown', settings: { rf_reveal_text: 'words' }, elements: [] },
			] ),
			box( 'slow', tall, [ heading( 'slowh', 'Takes its time', { rf_reveal: 'fade-up', rf_reveal_duration: 2000 } ) ] ),
			box( 'own', tall, [ heading( 'ownh', 'Keeps its own transform', { rf_reveal: 'zoom-in', rf_reveal_duration: 200, _transform_rotate_popover: 'transform', _transform_rotateZ_effect: { unit: 'deg', size: 8 } } ) ] ),
			box( 'scrolldef', { ...tall, min_height: { unit: 'vh', size: 150 } }, [ heading( 'scrolldefh', 'Scroll with the default range', { rf_reveal: 'fade-up', rf_reveal_trigger: 'scroll' } ) ] ),
		] );
		const e = await ( await browser.newContext( { viewport: { width: 1200, height: 800 } } ) ).newPage();
		watch( e, 'effects' );
		await e.goto( all.url );
		await e.waitForFunction( () => document.querySelector( '[data-id="wfadeup"][data-rf-rv-piece]' ), null, { timeout: 15000 } );
		const look = ( id ) => e.evaluate( ( id ) => {
			const el = document.querySelector( `[data-id="${ id }"]` );
			const pieces = [ ...( el.hasAttribute( 'data-rf-rv-piece' ) ? [ el ] : [] ), ...el.querySelectorAll( '[data-rf-rv-piece]' ) ];
			return pieces.map( ( x ) => {
				const cs = getComputedStyle( x );
				return { state: x.getAttribute( 'data-rf-rv-piece' ), fx: x.getAttribute( 'data-rf-rv-fx' ) || x.getAttribute( 'data-rf-rv-played' ), o: +cs.opacity, t: cs.transform, c: cs.clipPath, f: cs.filter };
			} );
		}, id );
		// Hidden or changed before it plays: not at full opacity, or moved, clipped or blurred.
		const changed = ( x ) => x.o < 0.99 || ( 'none' !== x.t && 'matrix(1, 0, 0, 1, 0, 0)' !== x.t ) || 'none' !== x.c || 'none' !== x.f;
		// No movement left: none, or a matrix (2D or 3D) equal to the identity within rounding.
		const atRest = ( t ) => {
			if ( 'none' === t ) { return true; }
			const m = t.slice( t.indexOf( '(' ) + 1, -1 ).split( ',' ).map( Number );
			const id = 6 === m.length ? [ 1, 0, 0, 1, 0, 0 ] : [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
			return m.length === id.length && m.every( ( v, i ) => Math.abs( v - id[ i ] ) < 0.001 );
		};
		const settled = ( x ) => 'done' === x.state && x.o > 0.99 && atRest( x.t ) && 'none' === x.c && 'none' === x.f;
		const notHidden = [];
		const notSettled = [];
		for ( const fx of EFFECTS ) {
			const ids = [ 'w' + fxKey( fx ), 't' + fxKey( fx ), 'e' + fxKey( fx ) ];
			for ( const id of ids ) {
				const before = ( await look( id ) ).filter( ( x ) => x.fx === fx );
				if ( ! before.length || ! before.every( changed ) ) { notHidden.push( id ); }
			}
			await e.evaluate( ( id ) => document.querySelector( `[data-id="${ id }"]` ).scrollIntoView( { block: 'center' } ), 'e' + fxKey( fx ) );
			await sleep( 900 );
			for ( const id of ids ) {
				const after = ( await look( id ) ).filter( ( x ) => x.fx === fx );
				if ( ! after.length || ! after.every( settled ) ) { notSettled.push( id + JSON.stringify( after[ 0 ] ) ); }
			}
			if ( 'flip-up' === fx || 'iris' === fx ) {
				await e.evaluate( ( id ) => document.querySelector( `[data-id="${ id }"]` ).scrollIntoView( { block: 'start' } ), 'e' + fxKey( fx === 'flip-up' ? 'swing' : 'diagonal' ) );
				await e.evaluate( () => window.scrollBy( 0, -500 ) );
				await sleep( 120 );
				await e.screenshot( { path: join( SHOTS, `effect-${ fx }-midway.png` ) } );
			}
		}
		check( 'effects', `all ${ EFFECTS.length } effects start hidden or changed: on the element, on its words and on a container's elements`, 0 === notHidden.length, notHidden.join( ', ' ) );
		check( 'effects', 'and all of them end in place, with nothing of the reveal left (no transform, clip or blur)', 0 === notSettled.length, notSettled.join( ' | ' ) );

		await e.evaluate( () => document.querySelector( '[data-id="live"]' ).scrollIntoView( { block: 'start' } ) );
		await sleep( 3500 );
		await e.screenshot( { path: join( SHOTS, 'live-text.png' ) } );
		const liveText = await e.evaluate( () => {
			const q = ( s ) => document.querySelector( s );
			return {
				headlineWordsSplit: q( '[data-id="ahl"] .refraction-headline__dynamic .rf-rv-word' ) !== null,
				headlineBeforeSplit: q( '[data-id="ahl"] .refraction-headline__before .rf-rv-word' ) !== null,
				marqueeSplit: q( '[data-id="mq"] .rf-marquee .rf-rv-char' ) !== null,
				marqueeHidden: [ ...document.querySelectorAll( '[data-id="mq"] .rf-marquee__text' ) ].filter( ( t ) => +getComputedStyle( t ).opacity < 0.99 ).length,
				counterTitle: [ ...document.querySelectorAll( '[data-id="cnt"] .refraction-counter-title .rf-rv-word' ) ].map( ( w ) => w.textContent ).join( ' ' ),
				counterGap: ( () => {
					const w = document.querySelectorAll( '[data-id="cnt"] .refraction-counter-title .rf-rv-word' );
					return w.length === 2 ? Math.round( w[ 1 ].getBoundingClientRect().left - w[ 0 ].getBoundingClientRect().right ) : -1;
				} )(),
				counterNumberSplit: q( '[data-id="cnt"] .refraction-counter-number .rf-rv-word' ) !== null,
				countdownSplit: q( '[data-id="cd"] .refraction-countdown__digits .rf-rv-word' ) !== null,
				countdownLabelSplit: q( '[data-id="cd"] .refraction-countdown__label .rf-rv-word' ) !== null,
			};
		} );
		check( 'live text', 'Animated Headline: the fixed words reveal, the changing words are left to the headline', liveText.headlineBeforeSplit && ! liveText.headlineWordsSplit, JSON.stringify( liveText ) );
		check( 'live text', 'Marquee: its running text is not split, so no copy stays hidden', ! liveText.marqueeSplit && 0 === liveText.marqueeHidden, JSON.stringify( liveText ) );
		check( 'live text', 'Counter: the title keeps its space in a flex box ("Happy riders"); the number is left to count', 'Happy riders' === liveText.counterTitle && liveText.counterGap >= 3 && ! liveText.counterNumberSplit, JSON.stringify( liveText ) );
		check( 'live text', 'Countdown: labels reveal, digits keep ticking unsplit', liveText.countdownLabelSplit && ! liveText.countdownSplit, JSON.stringify( liveText ) );

		await e.evaluate( () => document.querySelector( '[data-id="slow"]' ).scrollIntoView( { block: 'center' } ) );
		await sleep( 600 );
		const midway = await e.evaluate( () => { const cs = getComputedStyle( document.querySelector( '[data-id="slowh"]' ) ); return { o: +cs.opacity, t: cs.transform }; } );
		check( 'timing', "a widget's own hover transition does not cut the reveal short: 600 ms into a 2 s fade it is still on its way", midway.o > 0.2 && midway.o < 0.98 && 'none' !== midway.t, JSON.stringify( midway ) );
		await e.evaluate( () => document.querySelector( '[data-id="own"]' ).scrollIntoView( { block: 'center' } ) );
		await sleep( 1400 );
		const own = await e.evaluate( () => {
			const el = document.querySelector( '[data-id="ownh"]' );
			return getComputedStyle( el.querySelector( ':scope > .refraction-widget-container' ) || el ).transform;
		} );
		check( 'settled', "after playing once, the element's own Transform (rotate) still applies", /^matrix(3d)?\(0\.990268, 0\.139173,/.test( own ), own );

		// With the scroll and Viewport end left empty: done once the element's top is halfway up the screen.
		const halfway = await e.evaluate( async () => {
			const el = document.querySelector( '[data-id="scrolldefh"]' );
			const top = el.getBoundingClientRect().top + window.scrollY;
			window.scrollTo( 0, top - ( innerHeight * 0.45 ) );
			await new Promise( ( r ) => setTimeout( r, 400 ) );
			return Number( el.getAttribute( 'data-rf-rv-progress' ) );
		} );
		check( 'scroll', 'with the scroll and no Viewport end set, it is complete halfway up the screen (as the panel shows)', 1 === halfway, String( halfway ) );
		await e.context().close();

		// ------------------------------------------------------------ the editor
		const actx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const a = await actx.newPage();
		watch( a, 'editor' );
		await a.goto( `${ BASE }/wp-login.php?redirect_to=${ encodeURIComponent( `${ BASE }/wp-admin/profile.php` ) }` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ demo.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 2500 );
		const preview = a.frameLocator( '#refraction-preview-iframe' );
		check( 'editor', 'the preview plays the text reveal too', ( await preview.locator( '[data-id="h1"] .rf-rv-word' ).count() ) === 9 );
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'endh' ), settings: { rf_reveal: '', rf_reveal_text: 'chars' }, options: { external: true } } ) );
		await a.waitForTimeout( 1500 );
		check( 'editor', 'changing a setting rebuilds it live: letter by letter', ( await preview.locator( '[data-id="endh"] .rf-rv-char[data-rf-rv-piece]' ).count() ) === 'Start tracking'.replace( / /g, '' ).length );
		await preview.locator( '[data-id="endh"]' ).click();
		await a.waitForTimeout( 600 );
		await a.click( '.refraction-panel-navigation-tab:has-text("Advanced")' );
		await a.waitForTimeout( 500 );
		const sections = await a.$$eval( '.refraction-section-title', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) );
		check( 'editor', 'the Advanced tab has Reveal next to Scrolling Effects', sections.includes( 'Reveal' ) && sections.includes( 'Scrolling Effects' ), sections.join( '|' ) );
		await a.click( '.refraction-control-section_rf_reveal' );
		await a.waitForTimeout( 500 );
		const groups = await a.$$eval( '.refraction-control-rf_reveal select optgroup', ( g ) => g.map( ( x ) => x.label + ':' + x.children.length ) );
		check( 'editor', 'the effects are listed in groups (26 in all)', groups.length === 5 && groups.reduce( ( n, g ) => n + Number( g.split( ':' )[ 1 ] ), 0 ) === 26, groups.join( ' ' ) );
		const noticeShown = () => a.evaluate( () => { const n = document.querySelector( '.refraction-control-rf_reveal_entrance_notice' ); return !! n && null !== n.offsetParent; } );
		await a.selectOption( '.refraction-control-rf_reveal select', 'flip-up' );
		await a.waitForTimeout( 400 );
		const quiet = await noticeShown();
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'endh' ), settings: { _animation: 'fadeIn' }, options: { external: true } } ) );
		await a.waitForTimeout( 600 );
		const warned = await noticeShown();
		await a.screenshot( { path: join( SHOTS, 'editor-entrance-notice.png' ) } );
		check( 'editor', 'with an Entrance Animation too, the panel says the whole-element reveal is skipped', ! quiet && warned, `${ quiet } ${ warned }` );
		await actx.close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', errors.length === 0, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall reveal checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
