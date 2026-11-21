#!/usr/bin/env node
/**
 * Focus Stack (0.110.0, SQLite test site, Chromium). On the site:
 * - the current slide shows its header, content and footer; the next slides wait before it (above, the reference's
 *   way) showing their header, the previous ones after it showing their footer; two away: narrower and fainter;
 * - moving on (arrow key, click on a waiting card) the waiting card grows into the current one while the old one folds
 *   into a slim card on the other side (sampled half way), then everything rests in its new place;
 * - "Moves: up" puts the next slides below; the parts shown are chosen per side; side by side: slim side cards with
 *   their text turned, the next on the right; playing by itself moves on; reduced motion moves at once;
 * Per slide (0.114.0): next, previous and in-focus choices; a Reveal (fade up) header widget shows in waiting cards;
 * clicking off, selecting a widget in a waiting slide in Edit Mode keeps the slide waiting.
 * In Edit Mode: the preview is the same stack, follows a changed setting at once and the slide picked in the panel,
 * and a new Focus Stack starts with three slides of Header, Content and Footer containers. No script or PHP errors.
 *
 * Usage: node scripts/check-focus-stack.mjs [--site /tmp/rf-fs-site] [--port 8945] [--shots /tmp/focus-stack-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fs-site' );
const PORT = arg( 'port', '8945' );
const SHOTS = arg( 'shots', '/tmp/focus-stack-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 500 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	if ( process.env.CHROMIUM ) {
		return process.env.CHROMIUM;
	}
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

function wp( args, { allowFail = false } = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		if ( allowFail ) {
			return null;
		}
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => {
	try {
		await fetch( `${ BASE }/wp-login.php` ); return true;
	} catch {
		return false;
	}
};

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

let uid = 0;
const id = () => 'fs' + ( ++uid ).toString( 16 ).padStart( 5, '0' );
const heading = ( title ) => ( { id: id(), elType: 'widget', widgetType: 'heading', settings: { title, header_size: 'p' }, elements: [] } );
const partBox = ( name, title, extra = {} ) => box( id(), { _title: name, padding: { unit: 'px', top: '12', right: '16', bottom: '12', left: '16', isLinked: false }, ...extra }, [ heading( title ) ], true );
const slide = ( n ) => box( id(), { _title: `Slide #${ n }`, padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true }, flex_gap: { unit: 'px', size: 0, column: '0', row: '0', isLinked: true } }, [
	partBox( 'Header', `S${ n } header` ),
	partBox( 'Content', `S${ n } content`, { min_height: { unit: 'px', size: 160 } } ),
	partBox( 'Footer', `S${ n } footer` ),
], true );
const stack = ( settings, n = 5 ) => [ box( id(), { content_width: 'boxed', boxed_width: { unit: 'px', size: 520 }, padding: { unit: 'px', top: '40', right: '20', bottom: '40', left: '20', isLinked: false } }, [ {
	id: id(), elType: 'widget', widgetType: 'refraction-focus-stack',
	settings: { slides: Array.from( { length: n }, ( _, i ) => ( { _id: id(), slide_title: `Slide ${ i + 1 }` } ) ), autoplay: '', duration: 600, ...settings },
	elements: Array.from( { length: n }, ( _, i ) => slide( i + 1 ) ),
} ] ) ];

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

	try {
		const down = page( 'Focus stack down', stack( {} ) );
		const own = stack( {} );
		own[ 0 ].elements[ 0 ].settings.slides[ 1 ].waiting_part = 'footer';
		const ownPart = page( 'Focus stack own part', own );
		// 0.114.0: every slide chooses what it shows waiting as a next slide, as a previous one, and in focus.
		const ownAll = stack( { easing: 'bounce' } );
		ownAll[ 0 ].elements[ 0 ].settings.slides[ 0 ].slide_focus = 'header_content';
		ownAll[ 0 ].elements[ 0 ].settings.slides[ 1 ].slide_next = 'footer';
		ownAll[ 0 ].elements[ 0 ].settings.slides[ 4 ].slide_prev = 'header';
		const ownAllPage = page( 'Focus stack own choices', ownAll );
		// A header widget revealed (fade up, every time): hidden, it sits lower, right out of the slim card.
		const revealed = stack( { visible: '1', next_part: 'header', prev_part: 'header' } );
		revealed[ 0 ].elements[ 0 ].elements.forEach( ( sl, k ) => sl.elements[ 0 ].elements.push( { id: id(), elType: 'widget', widgetType: 'heading', settings: { title: `Fleet ${ k + 1 }`, header_size: 'p', rf_reveal: 'fade-up', rf_reveal_trigger: 'always', rf_reveal_duration: 300 }, elements: [] } ) );
		const revealPage = page( 'Focus stack reveal', revealed );
		const focusOnly = page( 'Focus stack content only', stack( { focus_shows: 'content', next_part_justify: 'flex-start', next_part_gap: { unit: 'px', size: 30 }, prev_part_direction: 'column' } ) );
		const upwards = page( 'Focus stack up', stack( { direction_v: 'up', next_part: 'footer', prev_part: 'header', visible: '1' } ) );
		const side = page( 'Focus stack side', stack( { orientation: 'horizontal', stack_height: { unit: 'px', size: 360 } } ) );
		const auto = page( 'Focus stack auto', stack( { autoplay: 'yes', interval: 900, duration: 300, pause_on_hover: '' }, 3 ) );

		const ctx = await browser.newContext( { viewport: { width: 1280, height: 1100 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		p.on( 'console', ( m ) => {
			if ( 'error' === m.type() && ! /favicon|Failed to load resource/.test( m.text() ) ) {
				errors.push( m.text() );
			}
		} );
		const shot = async ( name ) => {
			const el = await p.$( '.rf-fs' ); if ( el ) {
				await el.screenshot( { path: join( SHOTS, name ) } );
			}
		};

		// Where every slide is: state, part shown, box.
		const state = () => p.evaluate( () => [ ...document.querySelectorAll( '.rf-fs__slides > .rf-fs__slide' ) ].map( ( s, i ) => {
			const r = s.getBoundingClientRect();
			const visible = [ ...s.querySelectorAll( '.rf-fs__part' ) ].filter( ( x ) => x.offsetParent ).map( ( x ) => x.textContent.trim() );
			const shown = s.querySelector( '.rf-fs__part.is-shown' );
			return {
				i,
				state: [ 'is-active', 'is-near', 'is-far', 'is-hidden' ].find( ( c ) => s.classList.contains( c ) ),
				side: [ 'before', 'after' ].find( ( x ) => s.classList.contains( 'is-' + x ) ) || '',
				visible,
				turned: shown ? getComputedStyle( shown ).writingMode : '',
				top: Math.round( r.top ), bottom: Math.round( r.bottom ), left: Math.round( r.left ), right: Math.round( r.right ),
				width: Math.round( r.width ), height: Math.round( r.height ),
				opacity: Number( getComputedStyle( s ).opacity ),
			};
		} ) );
		const byState = ( st, name, where ) => st.find( ( s ) => s.state === name && ( ! where || s.side === where ) );

		// ------------------------------------------------------------ moving down (the reference)
		await p.goto( down.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		await p.waitForTimeout( 300 );
		let st = await state();
		let act = byState( st, 'is-active' );
		const nextNear = st[ 1 ];
		const prevNear = st[ 4 ];
		check( 'site', 'slide 1 is current and shows its header, content and footer', 0 === act.i && 'S1 header,S1 content,S1 footer' === act.visible.join(), JSON.stringify( act ) );
		check( 'site', 'the next slide waits above, showing only its header', 'is-near' === nextNear.state && 'before' === nextNear.side && nextNear.bottom <= act.top && 'S2 header' === nextNear.visible.join(), JSON.stringify( nextNear ) );
		check( 'site', 'the previous slide (going round) waits below, showing only its footer', 'is-near' === prevNear.state && 'after' === prevNear.side && prevNear.top >= act.bottom && 'S5 footer' === prevNear.visible.join(), JSON.stringify( prevNear ) );
		const far = st[ 2 ];
		check( 'site', 'two away: above the next one, narrower and fainter (76% wide, opacity 0.45); near ones 88%', 'is-far' === far.state && far.bottom <= nextNear.top && Math.abs( ( far.width / act.width ) - 0.76 ) < 0.02 && Math.abs( ( nextNear.width / act.width ) - 0.88 ) < 0.02 && Math.abs( far.opacity - 0.45 ) < 0.02, JSON.stringify( { far, nextNear, act: act.width } ) );
		await shot( 'down-1.png' );

		// Arrow up (towards the waiting next card): the next card grows down into the current one.
		await p.focus( '.rf-fs' );
		const growing = { before: nextNear.height };
		await p.keyboard.press( 'ArrowUp' );
		await p.waitForTimeout( 300 );
		const mid = await state();
		growing.mid = mid[ 1 ].height;
		const anims = await p.evaluate( () => document.getAnimations().length );
		await shot( 'down-mid.png' );
		await p.waitForTimeout( 600 );
		st = await state();
		act = byState( st, 'is-active' );
		growing.after = act.height;
		check( 'motion', 'half way the next card is growing (taller than its slim card, not yet full) with animations running', anims > 0 && growing.mid > growing.before + 5 && growing.mid < growing.after - 5, JSON.stringify( { growing, anims } ) );
		check( 'motion', 'then slide 2 is current with all its parts', 1 === act.i && 'S2 header,S2 content,S2 footer' === act.visible.join(), JSON.stringify( act ) );
		const folded = st[ 0 ];
		check( 'motion', 'and slide 1 has folded below it into a slim card showing its footer', 'is-near' === folded.state && 'after' === folded.side && folded.top >= act.bottom && 'S1 footer' === folded.visible.join(), JSON.stringify( folded ) );
		check( 'motion', 'nothing left moving', 0 === ( await p.evaluate( () => document.querySelectorAll( '.rf-fs__slide.is-moving, .rf-fs__slide.is-leaving' ).length ) ) );
		await shot( 'down-2.png' );

		// A click on a waiting card opens it.
		await p.click( '.rf-fs__slide:nth-child(1)' );
		await p.waitForTimeout( 800 );
		check( 'site', 'clicking the waiting slide 1 opens it again', 0 === byState( await state(), 'is-active' ).i );

		// ------------------------------------------------------------ a slide's own choice
		await p.goto( ownPart.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		st = await state();
		check( 'per slide', 'slide 2 set to "Its footer" waits above showing its footer, while slide 3 (as set for the stack) shows its header', 'S2 footer' === st[ 1 ].visible.join() && 'before' === st[ 1 ].side && 'S3 header' === st[ 2 ].visible.join(), JSON.stringify( [ st[ 1 ], st[ 2 ] ] ) );

		await p.goto( ownAllPage.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		st = await state();
		const curve = await p.evaluate( () => document.querySelector( '.rf-fs' ).style.getPropertyValue( '--rf-fs-easing' ) );
		check( 'easing', 'the new easings: "Bounce at the end" gives the stack a bounce curve (linear())', /^linear\(0, 0\.0047/.test( curve ), curve );
		check( 'per slide', 'each slide\'s own choices: slide 1 in focus shows its header and content, slide 2 waits as the next one showing its footer, slide 5 as the previous one showing its header', 'S1 header,S1 content' === st[ 0 ].visible.join() && 'S2 footer' === st[ 1 ].visible.join() && 'before' === st[ 1 ].side && 'S5 header' === st[ 4 ].visible.join() && 'after' === st[ 4 ].side, JSON.stringify( [ st[ 0 ], st[ 1 ], st[ 4 ] ] ) );
		await p.focus( '.rf-fs' );
		await p.keyboard.press( 'ArrowUp' );
		await p.waitForTimeout( 900 );
		st = await state();
		check( 'per slide', 'moving on, slide 2 in focus shows everything (as set for every slide) and slide 1, now previous, its footer', 'S2 header,S2 content,S2 footer' === st[ 1 ].visible.join() && 'S1 footer' === st[ 0 ].visible.join(), JSON.stringify( [ st[ 0 ], st[ 1 ] ] ) );

		// ------------------------------------------------------------ a revealed widget in a waiting card shows
		await p.goto( revealPage.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		await p.waitForTimeout( 1500 );
		const revealOps = async () => p.evaluate( () => [ ...document.querySelectorAll( '.rf-fs__slides > .rf-fs__slide:not(.is-hidden)' ) ].map( ( sl ) => {
			const w = [ ...sl.querySelectorAll( '.refraction-widget-heading' ) ].find( ( x ) => /Fleet/.test( x.textContent ) );
			return sl.className.match( /is-(active|next|prev)/g ).join() + ':' + Number( getComputedStyle( w ).opacity ).toFixed( 2 );
		} ) );
		let ops = await revealOps();
		check( 'reveal', 'a header widget with Reveal (fade up, every time) shows in the waiting cards too, not only in the current one', 3 === ops.length && ops.every( ( x ) => x.endsWith( ':1.00' ) ), JSON.stringify( ops ) );
		await p.focus( '.rf-fs' );
		await p.keyboard.press( 'ArrowUp' );
		await p.waitForTimeout( 1800 );
		ops = await revealOps();
		check( 'reveal', 'and after moving on (cards folding and opening) every shown one is still there', 3 === ops.length && ops.every( ( x ) => x.endsWith( ':1.00' ) ), JSON.stringify( ops ) );

		// ------------------------------------------------------------ the slide in focus shows its content only; waiting layout
		await p.goto( focusOnly.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		st = await state();
		check( 'focus shows', '"Its content only": the slide in focus shows its content, not its header or footer', 'S1 content' === byState( st, 'is-active' ).visible.join(), JSON.stringify( byState( st, 'is-active' ) ) );
		const layout = await p.evaluate( () => {
			const shownPart = ( sel ) => getComputedStyle( document.querySelector( sel + ' .rf-fs__part.is-shown' ) );
			const next = shownPart( '.rf-fs__slide.is-next.is-near' );
			const prev = shownPart( '.rf-fs__slide.is-prev.is-near' );
			return { nextJustify: next.justifyContent, nextGap: next.columnGap, prevDirection: prev.flexDirection };
		} );
		check( 'waiting layout', 'Waiting slides layout: the next slides\' header starts at the left with a 30px gap; the previous slides\' footer is a column', 'flex-start' === layout.nextJustify && '30px' === layout.nextGap && 'column' === layout.prevDirection, JSON.stringify( layout ) );
		await p.focus( '.rf-fs' );
		await p.keyboard.press( 'ArrowUp' );
		await p.waitForTimeout( 300 );
		const midParts = await p.evaluate( () => [ ...document.querySelectorAll( '.rf-fs__slides > .rf-fs__slide' ) ][ 1 ].querySelector( '.rf-fs__part--header' ).getBoundingClientRect().height );
		await p.waitForTimeout( 600 );
		st = await state();
		check( 'focus shows', 'moving on, the opening slide\'s header shrinks away (half way part of it is still there) and it ends with its content only', midParts > 1 && 'S2 content' === byState( st, 'is-active' ).visible.join() && 'S1 footer' === st[ 0 ].visible.join(), JSON.stringify( { midParts, act: byState( st, 'is-active' ), s1: st[ 0 ] } ) );
		await shot( 'content-only.png' );

		// ------------------------------------------------------------ moving up, parts swapped, one each side
		await p.goto( upwards.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		st = await state();
		act = byState( st, 'is-active' );
		check( 'reverse', '"Moves: up": the next slide waits below and shows its footer; the previous above shows its header', 'after' === st[ 1 ].side && st[ 1 ].top >= act.bottom && 'S2 footer' === st[ 1 ].visible.join() && 'before' === st[ 4 ].side && st[ 4 ].bottom <= act.top && 'S5 header' === st[ 4 ].visible.join(), JSON.stringify( [ st[ 1 ], st[ 4 ] ] ) );
		check( 'reverse', 'one waiting slide on each side: the others are hidden', 2 === st.filter( ( s ) => 'is-near' === s.state ).length && 2 === st.filter( ( s ) => 'is-hidden' === s.state ).length, JSON.stringify( st.map( ( s ) => s.state ) ) );
		await p.focus( '.rf-fs' );
		await p.keyboard.press( 'ArrowDown' );
		await p.waitForTimeout( 900 );
		st = await state();
		check( 'reverse', 'the arrow towards the next card (down) moves up: slide 2 current, slide 1 above it showing its header', 1 === byState( st, 'is-active' ).i && 'before' === st[ 0 ].side && 'S1 header' === st[ 0 ].visible.join(), JSON.stringify( st.map( ( s ) => [ s.state, s.side ] ) ) );
		await shot( 'up.png' );

		// ------------------------------------------------------------ side by side
		await p.goto( side.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		st = await state();
		act = byState( st, 'is-active' );
		check( 'side', 'side by side: the next slide waits on the right, 64px wide, its header text turned', 'after' === st[ 1 ].side && st[ 1 ].left >= act.right && 64 === st[ 1 ].width && 'vertical-rl' === st[ 1 ].turned, JSON.stringify( st[ 1 ] ) );
		check( 'side', 'the previous on the left, the current one filling the row 360px high', 'before' === st[ 4 ].side && st[ 4 ].right <= act.left && 360 === act.height, JSON.stringify( { prev: st[ 4 ], act } ) );
		await p.focus( '.rf-fs' );
		await p.keyboard.press( 'ArrowRight' );
		await p.waitForTimeout( 900 );
		check( 'side', 'the arrow towards the next card (right) moves the stack left: slide 2 current', 1 === byState( await state(), 'is-active' ).i );
		await shot( 'side.png' );

		// ------------------------------------------------------------ playing by itself, reduced motion
		await p.goto( auto.url, { waitUntil: 'load' } );
		await p.waitForSelector( '.rf-fs.is-ready' );
		await p.mouse.move( 5, 5 );
		await p.waitForTimeout( 2600 );
		check( 'autoplay', 'playing by itself it has moved on', 0 !== byState( await state(), 'is-active' ).i );

		const rctx = await browser.newContext( { viewport: { width: 1280, height: 1100 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		await r.goto( down.url, { waitUntil: 'load' } );
		await r.waitForSelector( '.rf-fs.is-ready' );
		await r.focus( '.rf-fs' );
		await r.keyboard.press( 'ArrowUp' );
		const instant = await r.evaluate( () => ( { anims: document.getAnimations().filter( ( a ) => 'running' === a.playState ).length, current: [ ...document.querySelectorAll( '.rf-fs__slide' ) ].findIndex( ( s ) => s.classList.contains( 'is-active' ) ) } ) );
		check( 'motion', 'with reduced motion it moves at once, without animating', 0 === instant.anims && 1 === instant.current, JSON.stringify( instant ) );
		await rctx.close();

		// ------------------------------------------------------------ Edit Mode
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ down.id }&action=refraction`, { timeout: 120000 } );
		await p.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await p.waitForTimeout( 2500 );
		const frame = p.frame( { name: 'refraction-preview-iframe' } ) || p.frames().find( ( f ) => f.url().includes( 'refraction-preview' ) ) || p.frames()[ 1 ];
		const edState = () => frame.evaluate( () => [ ...document.querySelectorAll( '.rf-fs__slides > .rf-fs__slide' ) ].map( ( s ) => ( {
			state: [ 'is-active', 'is-near', 'is-far', 'is-hidden' ].find( ( c ) => s.classList.contains( c ) ),
			side: [ 'before', 'after' ].find( ( x ) => s.classList.contains( 'is-' + x ) ) || '',
			visible: [ ...s.querySelectorAll( '.rf-fs__part' ) ].filter( ( x ) => x.offsetParent ).map( ( x ) => x.textContent.trim() ).join(),
		} ) ) );
		const widget = () => p.evaluateHandle( () => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			return find( refraction.getPreviewContainer() ).find( ( c ) => 'refraction-focus-stack' === c.model.get( 'widgetType' ) );
		} );
		await frame.waitForSelector( '.rf-fs.is-ready', { timeout: 20000 } );
		let ed = await edState();
		check( 'editor', 'Edit Mode shows the same stack: slide 1 whole, slide 2 above as its header, slide 5 below as its footer', 'is-active' === ed[ 0 ].state && 'S1 header,S1 content,S1 footer' === ed[ 0 ].visible && 'before' === ed[ 1 ].side && 'S2 header' === ed[ 1 ].visible && 'after' === ed[ 4 ].side && 'S5 footer' === ed[ 4 ].visible, JSON.stringify( ed ) );
		const edShot = async ( name ) => {
			await p.evaluate( () => {
				try {
					$e.run( 'panel/close' );
				} catch ( e ) {}
			} );
			await frame.evaluate( () => {
				const s = document.createElement( 'style' ); s.id = 'rf-shot'; s.textContent = '.refraction-element-overlay, .refraction-editor-element-settings { display: none !important; }'; document.head.appendChild( s );
			} );
			await p.waitForTimeout( 400 );
			const el = await frame.$( '.rf-fs' );
			if ( el ) {
				await el.screenshot( { path: join( SHOTS, name ) } );
			}
			await frame.evaluate( () => document.getElementById( 'rf-shot' ).remove() );
			await p.evaluate( () => {
				try {
					$e.run( 'panel/open' );
				} catch ( e ) {}
			} );
		};
		await edShot( 'editor-1.png' );

		const w = await widget();
		await p.evaluate( ( c ) => $e.run( 'document/elements/settings', { container: c, settings: { direction_v: 'up', next_part: 'footer' } } ), w );
		await p.waitForTimeout( 1200 );
		ed = await edState();
		check( 'editor', 'changing "Moves" and "The next slides show" in the panel shows at once: next below, as its footer', 'after' === ed[ 1 ].side && 'S2 footer' === ed[ 1 ].visible, JSON.stringify( ed ) );
		await p.evaluate( ( c ) => $e.run( 'document/elements/settings', { container: c, settings: { orientation: 'horizontal' } } ), w );
		await p.waitForTimeout( 1500 );
		const turned = await frame.evaluate( () => {
			const s = [ ...document.querySelectorAll( '.rf-fs__slides > .rf-fs__slide' ) ][ 1 ];
			return { horizontal: !! s.closest( '.rf-fs-o-horizontal' ), width: Math.round( s.getBoundingClientRect().width ), mode: getComputedStyle( s.querySelector( '.rf-fs__part.is-shown' ) ).writingMode };
		} );
		check( 'editor', 'switching to side by side shows slim side cards with turned text in Edit Mode', turned.horizontal && 64 === turned.width && 'vertical-rl' === turned.mode, JSON.stringify( turned ) );
		await edShot( 'editor-side.png' );
		await p.evaluate( ( c ) => $e.run( 'document/elements/settings', { container: c, settings: { orientation: 'vertical', direction_v: 'down', next_part: 'header' } } ), w );
		await p.waitForTimeout( 1200 );

		// Picking slide 3 in the panel shows it.
		await p.evaluate( ( c ) => {
			c.model.get( 'editSettings' ).set( 'activeItemIndex', 3 );
		}, w );
		await p.waitForTimeout( 1200 );
		ed = await edState();
		check( 'editor', 'picking slide 3 in the panel makes it the current one in the preview', 'is-active' === ed[ 2 ].state && 'S3 header,S3 content,S3 footer' === ed[ 2 ].visible, JSON.stringify( ed ) );

		// A slide's own choices in the panel show at once.
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 4 ], settings: { slide_next: 'footer' } } );
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 2 ], settings: { slide_focus: 'content_footer' } } );
		}, w );
		await p.waitForTimeout( 1200 );
		ed = await edState();
		check( 'editor', 'in the slide list, slide 5 "Waiting as a next slide, it shows: Its footer" and slide 3 "In focus, it shows: content and footer" show in the preview at once', 'S5 footer' === ed[ 4 ].visible && 'S3 content,S3 footer' === ed[ 2 ].visible, JSON.stringify( ed ) );
		const panelLabels = await p.evaluate( ( c ) => {
			$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
			return new Promise( ( done ) => setTimeout( () => {
				const item = document.querySelector( '.refraction-control-slides .refraction-repeater-row-tool, .refraction-control-slides .refraction-repeater-row-item-title' );
				if ( item ) {
					item.click();
				}
				setTimeout( () => done( [ ...document.querySelectorAll( '.refraction-control-slides .refraction-control-title' ) ].map( ( x ) => x.textContent.trim() ) ), 600 );
			}, 800 ) );
		}, w );
		check( 'editor', 'each slide in the list has its own "next", "previous", "in focus on the site" and "in focus in Edit Mode" choices', [ 'Waiting as a next slide, it shows', 'Waiting as a previous slide, it shows', 'In focus on the site, it shows', 'In focus in Edit Mode, it shows' ].every( ( l ) => panelLabels.includes( l ) ), JSON.stringify( panelLabels ) );
		// In focus in Edit Mode (0.116.0): slide 3 shows its content only on the site, everything while editing.
		await p.evaluate( ( c ) => {
			c.model.get( 'editSettings' ).set( 'activeItemIndex', 3 );
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 2 ], settings: { slide_focus: 'content', slide_focus_edit: 'full' } } );
		}, w );
		await p.waitForTimeout( 1200 );
		ed = await edState();
		const editFull = ed[ 2 ].visible;
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 2 ], settings: { slide_focus_edit: '' } } );
		}, w );
		await p.waitForTimeout( 1200 );
		ed = await edState();
		check( 'editor', '"In focus in Edit Mode, it shows: Everything" shows all of slide 3 while editing although the site shows its content only; "As on the site" shows its content only', 'S3 header,S3 content,S3 footer' === editFull && 'S3 content' === ed[ 2 ].visible, JSON.stringify( { editFull, now: ed[ 2 ].visible } ) );
		const easings = await p.evaluate( ( c ) => Object.keys( ( c.controls || c.settings.controls ).easing.options ), w );
		check( 'editor', 'Easing offers the new curves (glide, speed up, sharp, anticipate, bounce, elastic...)', [ 'soft', 'glide', 'speed-up', 'sharp', 'anticipate', 'bounce', 'elastic' ].every( ( k ) => easings.includes( k ) ), easings.join() );
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/settings', { container: c.repeaters.slides.children[ 2 ], settings: { slide_focus: '' } } );
		}, w );

		// Selecting a widget in a waiting slide edits it there: the slide stays waiting, unless clicking opens it.
		const clickWaiting = async ( setting, side ) => {
			await p.evaluate( ( [ c, v ] ) => $e.run( 'document/elements/settings', { container: c, settings: { click_waiting: v } } ), [ w, setting ] );
			await p.waitForTimeout( 800 );
			const before = ( ( await edState() ).find( ( x ) => 'is-active' === x.state ) || {} ).visible || '';
			const target = await frame.$( `.rf-fs__slide.is-waiting.is-near.is-${ side } .rf-fs__part.is-shown .refraction-widget-heading` );
			const label = await target.evaluate( ( el ) => el.textContent.replace( /[\u200b]/g, '' ).trim() );
			await target.click();
			await p.waitForTimeout( 2000 );
			const after = await edState();
			const selected = await p.evaluate( () => {
				const s = refraction.selection && refraction.selection.getElements ? refraction.selection.getElements() : [];
				return s.length ? s[ 0 ].model.get( 'settings' ).get( 'title' ) : '';
			} );
			return { label, selected, before, active: ( after.find( ( x ) => 'is-active' === x.state ) || {} ).visible || '', after };
		};
		const kept = await clickWaiting( '', 'before' );
		check( 'editor', '"Clicking a waiting slide opens it" off: selecting a heading in a waiting slide edits it where it is (the slide stays waiting)', kept.selected === kept.label && kept.before && kept.before === kept.active, JSON.stringify( kept ) );
		const opened = await clickWaiting( 'yes', 'after' );
		check( 'editor', 'on: selecting something in a waiting slide brings that slide into focus', opened.selected === opened.label && opened.active.startsWith( opened.label.replace( ' header', '' ).replace( ' footer', '' ) ), JSON.stringify( opened ) );
		await p.evaluate( ( c ) => {
			c.model.get( 'editSettings' ).set( 'activeItemIndex', 3 );
		}, w );
		await p.waitForTimeout( 1200 );

		// Speed (0.111.0): a setting the script reads does not draw the widget again; one that does keeps the slides.
		const speed = await p.evaluate( async ( c ) => {
			const preview = document.getElementById( 'refraction-preview-iframe' ).contentWindow;
			const raf = () => new Promise( ( done ) => preview.requestAnimationFrame( () => preview.requestAnimationFrame( done ) ) );
			const slideEl = () => c.view.$el[ 0 ].querySelector( '.rf-fs__slides > .rf-fs__slide' );
			const before = slideEl();
			before.__rfMark = 1;
			let t0 = performance.now();
			$e.run( 'document/elements/settings', { container: c, settings: { duration: 650 } } );
			await raf();
			const scriptSetting = performance.now() - t0;
			t0 = performance.now();
			$e.run( 'document/elements/settings', { container: c, settings: { stack_label: 'Our cards' } } );
			await new Promise( ( done ) => setTimeout( done, 400 ) );
			const templateSetting = performance.now() - t0;
			return { scriptSetting: Math.round( scriptSetting ), templateSetting: Math.round( templateSetting ), kept: 1 === slideEl().__rfMark, label: c.view.$el[ 0 ].querySelector( '.rf-fs' ).getAttribute( 'aria-label' ) };
		}, w );
		check( 'speed', 'a setting the script reads applies without drawing the widget again (under 300 ms; it took about 1.8 s)', speed.scriptSetting < 300, JSON.stringify( speed ) );
		check( 'speed', 'a setting that draws the widget again keeps its slide containers (same elements) and updates it', speed.kept && 'Our cards' === speed.label, JSON.stringify( speed ) );

		// Add Slide: the new slide comes with its Header, Content and Footer containers.
		const added = await p.evaluate( async ( c ) => {
			const t0 = performance.now();
			$e.run( 'document/repeater/insert', { container: c, name: 'slides', model: { slide_title: 'Slide 6' } } );
			const ms = Math.round( performance.now() - t0 );
			await new Promise( ( done ) => setTimeout( done, 1200 ) );
			const last = c.children[ c.children.length - 1 ];
			return { ms, count: c.children.length, parts: last.children.map( ( part ) => part.model.get( 'settings' ).get( '_title' ) ).join( '/' ), title: last.model.get( 'settings' ).get( '_title' ), widgets: last.children.reduce( ( n, part ) => n + part.children.length, 0 ) };
		}, w );
		check( 'editor', 'Add Slide gives the new slide its Header, Content and Footer containers (with examples)', 6 === added.count && 'Header/Content/Footer' === added.parts && added.widgets > 0 && /6/.test( added.title ), JSON.stringify( added ) );
		await p.waitForTimeout( 800 );
		check( 'editor', 'and the preview shows it as a waiting slide with its own part', 6 === ( await edState() ).length && 1 === ( await edState() ).filter( ( x ) => 'is-active' === x.state ).length, JSON.stringify( await edState() ) );

		// The panel's tooltips go away after a click that draws the control again (the "Row - horizontal" one stayed).
		// The widget's container: its Direction buttons and the device switchers (a device change draws the panel again).
		await p.evaluate( ( c ) => {
			$e.run( 'document/elements/select', { container: c.parent } );
		}, w );
		await p.waitForTimeout( 1500 );
		let triedTips = 0;
		for ( let i = 0; i < 24; i++ ) {
			const target = ( await p.$$( '#refraction-panel .tooltip-target' ) )[ i ];
			if ( ! target ) {
				break;
			}
			if ( ! ( await target.isVisible() ) ) {
				continue;
			}
			triedTips++;
			await target.hover();
			await p.waitForTimeout( 400 );
			await target.click( { force: true } ).catch( () => {} );
			await p.waitForTimeout( 300 );
			await p.mouse.move( 900, 600 );
			await p.waitForTimeout( 400 );
		}
		const stuck = await p.evaluate( () => [ ...document.querySelectorAll( '.tipsy' ) ].filter( ( tip ) => tip.offsetParent && 'hidden' !== getComputedStyle( tip ).visibility ).map( ( tip ) => tip.textContent.trim() ) );
		check( 'editor', 'after hovering and clicking the panel\'s tooltip targets (directions, devices...) no tooltip is left on screen', triedTips > 5 && 0 === stuck.length, JSON.stringify( { triedTips, stuck } ) );

		// A new Focus Stack from the panel: three slides, each with Header, Content and Footer.
		const made = await p.evaluate( () => {
			const root = $e.run( 'document/elements/create', { container: refraction.getPreviewContainer(), model: { elType: 'container', settings: {} }, options: { edit: false } } );
			const fs = $e.run( 'document/elements/create', { container: root, model: { elType: 'widget', widgetType: 'refraction-focus-stack' }, options: { edit: false } } );
			return fs.children.map( ( s ) => s.children.map( ( part ) => part.model.get( 'settings' ).get( '_title' ) ).join( '/' ) );
		} );
		check( 'editor', 'a new Focus Stack starts with three slides of Header, Content and Footer containers', 3 === made.length && made.every( ( m ) => 'Header/Content/Footer' === m ), JSON.stringify( made ) );
		// The editor draws a new widget in 1.5 to 4 s here: wait for it rather than a fixed time.
		await frame.waitForFunction( () => {
			const stacks = document.querySelectorAll( '.rf-fs' );
			return stacks.length && stacks[ stacks.length - 1 ].classList.contains( 'is-ready' );
		}, null, { timeout: 10000 } ).catch( () => {} );
		const fresh = await frame.evaluate( () => {
			const stacks = document.querySelectorAll( '.rf-fs' );
			const s = stacks[ stacks.length - 1 ];
			return { ready: s.classList.contains( 'is-ready' ), active: s.querySelectorAll( '.rf-fs__slide.is-active' ).length, waiting: s.querySelectorAll( '.rf-fs__slide.is-waiting' ).length };
		} );
		check( 'editor', 'and its preview is a stack at once (one current, two waiting)', fresh.ready && 1 === fresh.active && 2 === fresh.waiting, JSON.stringify( fresh ) );

		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Warning|Fatal|Parse|Deprecated)|PHP Notice/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		server?.kill();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall focus stack checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e ); process.exit( 1 );
} );
