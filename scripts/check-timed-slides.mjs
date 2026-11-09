#!/usr/bin/env node
/**
 * Timed Slides widget check (SQLite test site, Chromium; YouTube replaced by a fake player, nothing leaves the machine):
 * - Site: the slider fills a row container; one slide container shows at a time and its widgets can be clicked;
 *   arrows, cards and the arrow keys move; counter and progress line follow; a YouTube slide plays muted from
 *   youtube-nocookie.com with its thumbnail as background and card, and a sound button for that slide only.
 * - Content Position and Cards are separate: each moves on its own; Card shape, corners, width; arrows, number,
 *   shade on and off; timer and progress color; content without the rise.
 * - Autoplay moves on by itself (and keeps going on hover when Pause on hover is off).
 * - Phone: the content sits above the cards without overlapping.
 * - Editor: dragged in from the panel it brings three slide containers with example widgets (unique ids);
 *   picking a slide in the panel shows its container; a widget dragged from the panel lands in the shown slide;
 *   Add Slide adds a container and a card; Content Position changes live; saved, the site shows it all.
 *
 * Usage: node scripts/check-timed-slides.mjs [--site /tmp/rf-ts-site] [--port 8997] [--shots /tmp/timed-slides-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ts-site' );
const PORT = arg( 'port', '8997' );
const SHOTS = arg( 'shots', '/tmp/timed-slides-shots' );
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
const near = ( a, b, tol = 4 ) => Math.abs( a - b ) <= tol;

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

function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id, url: wp( [ 'post', 'list', '--post_type=page', `--post__in=${ id }`, '--field=url' ] ).trim() };
}

// A stand-in for the YouTube IFrame API: an iframe that "plays" for 1.6 s and ends.
const FAKE_YT = `window.rfFakeYt = { players: [] };
window.YT = { PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 }, Player: function ( mount, opts ) {
	var self = this, frame = document.createElement( 'iframe' ), t = 0, timer = null, muted = !! opts.playerVars.mute;
	frame.src = 'about:blank'; frame.setAttribute( 'data-video', opts.videoId ); mount.replaceWith( frame );
	window.rfFakeYt.players.push( { id: opts.videoId, host: opts.host, mute: opts.playerVars.mute } );
	function emit( s ) { opts.events.onStateChange( { data: s, target: self } ); }
	self.playVideo = function () { clearInterval( timer ); emit( 1 ); timer = setInterval( function () { t += 0.1; if ( t >= 60 ) { clearInterval( timer ); emit( 0 ); } }, 100 ); };
	self.pauseVideo = function () { clearInterval( timer ); };
	self.seekTo = function () { t = 0; };
	self.getDuration = function () { return 60; }; self.getCurrentTime = function () { return t; };
	self.mute = function () { muted = true; }; self.unMute = function () { muted = false; }; self.isMuted = function () { return muted; };
	self.destroy = function () { clearInterval( timer ); };
	setTimeout( function () { opts.events.onReady( { target: self } ); }, 50 );
} };
setTimeout( function () { window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 0 );`;

const widgets = ( n ) => [
	{ id: `h${ n }a`, elType: 'widget', widgetType: 'heading', settings: { title: `Title ${ n }`, header_size: 'h2', title_color: '#FFFFFF' }, elements: [] },
	{ id: `b${ n }a`, elType: 'widget', widgetType: 'button', settings: { text: `Book ${ n }`, link: { url: `#book-${ n }` } }, elements: [] },
];
const content = ( n ) => ( { id: `ct${ n }`, elType: 'container', isInner: true, settings: { _title: `Slide #${ n }`, content_width: 'full', padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }, elements: widgets( n ) } );

function slider( id, settings, slides ) {
	return {
		id: `w${ id }`,
		elType: 'widget',
		widgetType: 'refraction-timed-slides',
		settings: { slides, autoplay: '', transition_speed: 400, ...settings },
		elements: slides.map( ( _, i ) => ( { ...content( i + 1 ), id: `${ id }c${ i + 1 }`, elements: widgets( i + 1 ).map( ( w ) => ( { ...w, id: `${ id }${ w.id }` } ) ) } ) ),
	};
}
const row = ( id, widget ) => [ { id: `r${ id }`, elType: 'container', isInner: false, settings: { content_width: 'full', flex_direction: 'row' }, elements: [ widget ] } ];

const state = ( p, id ) => p.evaluate( ( wid ) => {
	const el = document.querySelector( `[data-id="${ wid }"]` );
	const root = el.querySelector( '.rf-tco' );
	const r = root.getBoundingClientRect();
	const texts = Array.from( el.querySelectorAll( '.rf-ts__content > .rf-tco__text' ) );
	const shown = texts.map( ( t, i ) => ( 'visible' === getComputedStyle( t ).visibility ? i : -1 ) ).filter( ( i ) => i >= 0 );
	const box = ( s ) => {
		const n = el.querySelector( s );
		if ( ! n ) {
			return null;
		}
		const b = n.getBoundingClientRect();
		return { l: b.left - r.left, t: b.top - r.top, r: r.right - b.right, b: r.bottom - b.bottom, w: b.width, h: b.height };
	};
	return {
		w: r.width,
		h: r.height,
		page: document.documentElement.clientWidth,
		texts: texts.length,
		shown,
		count: el.querySelector( '.rf-tco__count' )?.textContent,
		line: el.querySelector( '.rf-tco__line i' ) ? parseFloat( el.querySelector( '.rf-tco__line i' ).style.width ) : null,
		cards: el.querySelectorAll( '.rf-tco__card' ).length,
		content: box( '.rf-ts__content' ),
		rail: box( '.rf-ts__rail' ),
		align: getComputedStyle( el.querySelector( '.rf-ts__content' ) ).textAlign,
	};
}, id );

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
	const watch = ( p ) => {
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		p.on( 'console', ( m ) => {
			if ( 'error' === m.type() && ! /favicon|ytimg|youtube/.test( m.text() + m.location().url ) ) {
				errors.push( m.text() );
			}
		} );
	};
	const visit = async ( url, width = 1280, height = 800 ) => {
		const ctx = await browser.newContext( { viewport: { width, height } } );
		await ctx.route( /youtube\.com\/iframe_api/, ( route ) => route.fulfill( { contentType: 'text/javascript', body: FAKE_YT } ) );
		await ctx.route( /i\.ytimg\.com/, ( route ) => route.fulfill( { status: 404, body: '' } ) );
		const p = await ctx.newPage();
		watch( p );
		await p.goto( url );
		await p.waitForSelector( '.rf-tco' );
		await sleep( 900 );
		return { ctx, p };
	};

	try {
		const dir = join( tmpdir(), `rfts-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=#335577:size=1200x700', '-frames:v', '1', join( dir, 'poster.jpg' ) ] );
		const poster = Number( wp( [ 'media', 'import', join( dir, 'poster.jpg' ), '--porcelain' ] ).trim() );
		const posterUrl = wp( [ 'post', 'list', '--post_type=attachment', `--post__in=${ poster }`, '--field=guid' ] ).trim();
		const slides = [
			{ _id: 's1', slide_title: 'First', card_label: 'Slide 1', background_video: 'https://youtu.be/dQw4w9WgXcQ', video_next: 'yes', video_sound: 'yes' },
			{ _id: 's2', slide_title: 'Second', card_label: 'Slide 2', background_image: { id: poster, url: posterUrl } },
			{ _id: 's3', slide_title: 'Third', background_color: '#553377' },
		];

		// ------------------------------------------------------------ the site, default placement
		const main = page( 'Timed slides', row( 'a', slider( 'a', {}, slides ) ) );
		const { ctx, p } = await visit( main.url );
		let s = await state( p, 'wa' );
		check( 'site', 'in a row container the slider takes the full width', s.w >= s.page - 30 && s.w > 1000, JSON.stringify( s ) );
		check( 'site', 'three slide containers; only the first shows', 3 === s.texts && '0' === s.shown.join(), JSON.stringify( s.shown ) );
		check( 'site', 'content on the left, 6% in, vertically centered, 42% of the room inside the spacing', near( s.content.l, s.w * 0.06 ) && near( s.content.t, s.content.b, 6 ) && near( s.content.w, s.w * 0.94 * 0.42 ), JSON.stringify( s.content ) );
		check( 'site', 'cards on the right edge, 56% wide, vertically centered', near( s.rail.r, 0 ) && near( s.rail.w, s.w * 0.56 ) && near( s.rail.t, s.rail.b, 6 ), JSON.stringify( s.rail ) );
		check( 'site', 'three cards, counter 01, line at a third', 3 === s.cards && '01' === s.count && near( s.line, 33.3, 1 ), JSON.stringify( s ) );
		const hit = await p.evaluate( () => {
			const a = document.querySelector( '[data-id="wa"] .rf-tco__text.is-active .refraction-button' );
			const b = a.getBoundingClientRect();
			const at = document.elementFromPoint( b.left + b.width / 2, b.top + b.height / 2 );
			return { href: a.getAttribute( 'href' ), ok: a.contains( at ) };
		} );
		check( 'site', 'the widgets in the shown slide can be clicked (nothing covers them)', hit.ok && '#book-1' === hit.href, JSON.stringify( hit ) );
		const video = await p.evaluate( () => ( {
			players: window.rfFakeYt?.players || [],
			bg: getComputedStyle( document.querySelector( '[data-id="wa"] .rf-tco__slide .rf-tco__bg' ) ).backgroundImage,
			card: document.querySelectorAll( '[data-id="wa"] .rf-tco__card' )[ 0 ].getAttribute( 'style' ),
			sound: ( () => {
				const b = document.querySelector( '[data-id="wa"] .refraction-slide__sound' );
				return b && ! b.hidden && 'none' !== getComputedStyle( b ).display;
			} )(),
		} ) );
		check( 'site', 'the YouTube slide plays muted from youtube-nocookie.com', 1 === video.players.length && 'dQw4w9WgXcQ' === video.players[ 0 ].id && /nocookie/.test( video.players[ 0 ].host ) && 1 === video.players[ 0 ].mute, JSON.stringify( video.players ) );
		check( 'site', 'without an image the video thumbnail is the background and the card picture', /ytimg\.com\/vi\/dQw4w9WgXcQ/.test( video.bg ) && /ytimg\.com\/vi\/dQw4w9WgXcQ/.test( video.card ), video.bg.slice( 0, 120 ) );
		check( 'site', 'the video slide\'s sound button shows next to the arrows', video.sound );
		await p.screenshot( { path: join( SHOTS, 'site-default.png' ) } );

		await p.click( '[data-id="wa"] .rf-tco__next' );
		await sleep( 900 );
		s = await state( p, 'wa' );
		const sound2 = await p.evaluate( () => 'none' === getComputedStyle( document.querySelector( '[data-id="wa"] .refraction-slide__sound' ) ).display );
		check( 'site', 'Next: the second slide\'s container shows, counter 02, line at two thirds', '1' === s.shown.join() && '02' === s.count && near( s.line, 66.7, 1 ), JSON.stringify( s ) );
		check( 'site', '...and the first slide\'s sound button goes away', sound2 );
		await p.click( '[data-id="wa"] .rf-tco__card >> nth=2' );
		await sleep( 900 );
		s = await state( p, 'wa' );
		check( 'site', 'clicking a card grows it into its slide', '2' === s.shown.join() && '03' === s.count, JSON.stringify( s ) );
		await p.focus( '[data-id="wa"] .rf-tco' );
		await p.keyboard.press( 'ArrowLeft' );
		await sleep( 900 );
		s = await state( p, 'wa' );
		check( 'site', 'arrow keys move', '1' === s.shown.join(), JSON.stringify( s.shown ) );
		await ctx.close();

		// ------------------------------------------------------------ separate placement and styles
		const placed = page( 'Timed slides placed', row( 'b', slider( 'b', {
			content_horizontal: 'flex-end',
			content_vertical: 'flex-end',
			content_align: 'right',
			content_width: { unit: '%', size: 30 },
			content_padding: { unit: 'px', top: '0', right: '40', bottom: '40', left: '0', isLinked: false },
			cards_horizontal: 'flex-start',
			cards_vertical: 'flex-start',
			cards_area_width: { unit: '%', size: 50 },
			cards_padding: { unit: 'px', top: '30', right: '0', bottom: '0', left: '30', isLinked: false },
			card_width: { unit: 'px', size: 140 },
			cards_ratio: '1/1',
			cards_radius: { unit: 'px', size: 22 },
			show_arrows: '',
			show_count: '',
			overlay: '',
			accent_color: '#FF0055',
			content_animation: 'none',
			height: { unit: 'px', size: 600 },
		}, slides ) ) );
		const b = await visit( placed.url );
		s = await state( b.p, 'wb' );
		check( 'placement', 'Content Position: right, bottom, text right, 30% wide', near( s.content.r, 40 ) && near( s.content.b, 40 ) && 'right' === s.align && near( s.content.w, ( s.w - 40 ) * 0.3 ), JSON.stringify( s.content ) + s.align );
		check( 'placement', 'Cards placed on their own: top left', near( s.rail.l, 30 ) && near( s.rail.t, 30 ) && near( s.rail.w, ( s.w - 30 ) * 0.5, 6 ), JSON.stringify( s.rail ) );
		check( 'placement', 'Height 600 px', near( s.h, 600, 1 ), String( s.h ) );
		const look = await b.p.evaluate( () => {
			const el = document.querySelector( '[data-id="wb"]' );
			const card = el.querySelector( '.rf-tco__card' );
			const r = card.getBoundingClientRect();
			const shown = el.querySelector( '.rf-tco__text.is-active > *' );
			return {
				card: [ Math.round( r.width ), Math.round( r.height ) ],
				radius: getComputedStyle( card ).borderTopLeftRadius,
				arrows: el.querySelectorAll( '.rf-tco__arrow' ).length,
				count: el.querySelectorAll( '.rf-tco__count' ).length,
				overlay: el.querySelectorAll( '.refraction-slide__overlay' ).length,
				line: getComputedStyle( el.querySelector( '.rf-tco__line i' ) ).backgroundColor,
				transform: getComputedStyle( shown ).transform,
			};
		} );
		check( 'placement', 'Card width 140, shape 1/1, corners 22 px', '140,140' === look.card.join() && '22px' === look.radius, JSON.stringify( look ) );
		check( 'placement', 'arrows, number and shade switched off', 0 === look.arrows && 0 === look.count && 0 === look.overlay, JSON.stringify( look ) );
		check( 'placement', 'timer and progress color, content at once', 'rgb(255, 0, 85)' === look.line && 'none' === look.transform, JSON.stringify( look ) );
		await b.p.screenshot( { path: join( SHOTS, 'site-placed.png' ) } );
		await b.ctx.close();

		// ------------------------------------------------------------ autoplay
		const auto = page( 'Timed slides autoplay', row( 'c', slider( 'c', { autoplay: 'yes', autoplay_speed: 1500, transition_speed: 300, pause_on_hover: '' }, slides.slice( 1 ).concat( [ { _id: 's4', slide_title: 'Fourth', background_color: '#335533' } ] ) ) ) );
		const c = await visit( auto.url );
		await c.p.hover( '[data-id="wc"] .rf-ts__content' );
		const moved = await c.p.waitForFunction( () => document.querySelectorAll( '[data-id="wc"] .rf-tco__text' )[ 1 ].classList.contains( 'is-active' ), null, { timeout: 5000 } ).then( () => true, () => false );
		check( 'autoplay', 'moves on by itself, also on hover when Pause on hover is off', moved && await c.p.evaluate( () => document.querySelector( '[data-id="wc"] .rf-tco' ).classList.contains( 'rf-ts--no-pause' ) ), '' );
		await c.ctx.close();

		// ------------------------------------------------------------ transitions
		const effects = [ 'fade', 'slide', 'slide-up', 'zoom-in', 'zoom-out', 'blur', 'circle', 'wipe', 'wipe-up', 'curtain', 'diagonal', 'flip' ];
		const colour = [ { _id: 'k1', slide_title: 'One', background_color: '#1E508C' }, { _id: 'k2', slide_title: 'Two', background_color: '#E20A17' }, { _id: 'k3', slide_title: 'Three', background_color: '#0B8A5B' } ];
		const fx = page( 'Timed slides transitions', effects.flatMap( ( e, i ) => row( `t${ i }`, slider( `t${ i }`, { transition: e, transition_speed: 800, height: { unit: 'px', size: 320 } }, colour ) ) ) );
		const tv = await visit( fx.url, 1280, 800 );
		const mid = ( id ) => tv.p.evaluate( ( wid ) => {
			const el = document.querySelector( `[data-id="${ wid }"]` );
			const g = el.querySelector( '.rf-tco__grow--full' );
			const layers = [ ...el.querySelectorAll( '.rf-tco__slide' ) ];
			if ( ! g ) {
				return null;
			}
			const cs = getComputedStyle( g );
			return { clip: cs.clipPath, transform: cs.transform, opacity: Number( cs.opacity ).toFixed( 2 ), filter: cs.filter, color: cs.backgroundColor, oldMoves: layers.some( ( sl ) => sl.getAnimations().length > 0 ) };
		}, id );
		const settled = ( id ) => tv.p.evaluate( ( wid ) => {
			const el = document.querySelector( `[data-id="${ wid }"]` );
			return { grow: !! el.querySelector( '.rf-tco__grow' ), shown: [ ...el.querySelectorAll( '.rf-ts__content > .rf-tco__text' ) ].findIndex( ( x ) => x.classList.contains( 'is-active' ) ), still: [ ...el.querySelectorAll( '.rf-tco__slide' ) ].every( ( sl ) => 0 === sl.getAnimations().length && 'none' === getComputedStyle( sl ).transform ) };
		}, id );
		const moving = ( e, m ) => {
			if ( ! m ) {
				return false;
			}
			const changed = { clip: 'none' !== m.clip, transform: 'none' !== m.transform, opacity: '1.00' !== m.opacity };
			return {
				fade: changed.opacity, slide: changed.transform && m.oldMoves, 'slide-up': changed.transform && m.oldMoves, 'zoom-in': changed.transform && changed.opacity, 'zoom-out': changed.transform && m.oldMoves, blur: /blur/.test( m.filter ),
				circle: /circle/.test( m.clip ), wipe: /inset/.test( m.clip ), 'wipe-up': /inset/.test( m.clip ), curtain: /inset/.test( m.clip ), diagonal: /polygon/.test( m.clip ), flip: changed.transform && m.oldMoves,
			}[ e ];
		};
		const bad = [];
		for ( const [ i, e ] of effects.entries() ) {
			const id = `wt${ i }`;
			await tv.p.locator( `[data-id="${ id }"]` ).scrollIntoViewIfNeeded();
			await sleep( 150 );
			await tv.p.click( `[data-id="${ id }"] .rf-tco__next` );
			await sleep( 330 );
			const m = await mid( id );
			if ( [ 'circle', 'slide', 'curtain', 'flip' ].includes( e ) ) {
				await tv.p.locator( `[data-id="${ id }"]` ).screenshot( { path: join( SHOTS, `transition-${ e }.png` ) } );
			}
			await sleep( 800 );
			const a = await settled( id );
			if ( ! moving( e, m ) || a.grow || 1 !== a.shown || ! a.still ) {
				bad.push( { e, m, a } );
			}
		}
		check( 'transitions', 'each of the 12 new transitions animates the next slide in (and the old one out for slide, zoom out and flip), then leaves the second slide shown and nothing moving', 0 === bad.length, JSON.stringify( bad ) );

		// Going back runs "slide" the other way: the new picture comes from the left.
		await tv.p.locator( '[data-id="wt1"]' ).scrollIntoViewIfNeeded();
		await tv.p.click( '[data-id="wt1"] .rf-tco__prev' );
		await sleep( 250 );
		const back = await tv.p.evaluate( () => new DOMMatrix( getComputedStyle( document.querySelector( '[data-id="wt1"] .rf-tco__grow--full' ) ).transform ).m41 );
		await sleep( 900 );
		check( 'transitions', 'the previous arrow slides the other way (in from the left)', back < 0, String( back ) );
		const grown = await tv.p.evaluate( () => document.querySelector( '[data-id="wt0"] .rf-tco' ) && ! document.querySelector( '[data-id="wt0"] .rf-tco__grow' ) );
		check( 'transitions', 'no picture copy is left behind once a transition ends', grown, '' );
		await tv.ctx.close();

		// ------------------------------------------------------------ phone
		const m = await visit( main.url, 390, 844 );
		s = await state( m.p, 'wa' );
		const gap = ( s.h - s.rail.b - s.rail.h ) - ( s.content.t + s.content.h );
		check( 'phone', 'content at the top, cards at the bottom, no overlap; 640 px high', s.content.t < s.rail.t && gap >= 0 && near( s.h, 640, 1 ) && near( s.content.w, s.w - 40, 2 ), JSON.stringify( { s, gap } ) );
		await m.p.screenshot( { path: join( SHOTS, 'site-phone.png' ) } );
		await m.ctx.close();

		// ------------------------------------------------------------ editor
		const blank = page( 'Timed slides editor', [ { id: 'ed01', elType: 'container', isInner: false, settings: { min_height: { unit: 'px', size: 200 } }, elements: [ { id: 'edh1', elType: 'widget', widgetType: 'heading', settings: { title: 'Above the slider' }, elements: [] } ] } ] );
		const actx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
		await actx.route( /youtube\.com\/iframe_api/, ( route ) => route.fulfill( { contentType: 'text/javascript', body: FAKE_YT } ) );
		const admin = await actx.newPage();
		watch( admin );
		await admin.goto( `${ BASE }/wp-login.php` );
		await admin.fill( '#user_login', 'admin' );
		await admin.fill( '#user_pass', 'admin' );
		await Promise.all( [ admin.waitForURL( /wp-admin/, { timeout: 60000 } ), admin.click( '#wp-submit' ) ] );
		await admin.goto( `${ BASE }/wp-admin/post.php?post=${ blank.id }&action=refraction` );
		await admin.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
		await sleep( 2500 );
		const frame = () => admin.frame( { name: 'refraction-preview-iframe' } ) ?? admin.frames().find( ( f ) => f !== admin.mainFrame() && /preview/.test( f.url() ) );

		const info = await admin.evaluate( () => window.refraction.widgetsCache[ 'refraction-timed-slides' ] && { title: window.refraction.widgetsCache[ 'refraction-timed-slides' ].title, cats: window.refraction.widgetsCache[ 'refraction-timed-slides' ].categories } );
		check( 'editor', 'the Timed Slides widget is in the Advanced category', info && 'Timed Slides' === info.title && info.cats.includes( 'refraction-advanced' ), JSON.stringify( info ) );

		// Drag it from the panel below the heading.
		await admin.evaluate( () => $e.route( 'panel/elements/categories' ) );
		await admin.fill( '#refraction-panel-elements-search-input', 'Timed Slides' );
		await sleep( 600 );
		const drag = async ( src, tgt, dy = -4 ) => {
			const sb = await src.boundingBox();
			const tb = await tgt.boundingBox();
			await admin.mouse.move( sb.x + sb.width / 2, sb.y + sb.height / 2 );
			await admin.mouse.down();
			await admin.mouse.move( sb.x + sb.width / 2 + 20, sb.y + 20, { steps: 5 } );
			await admin.mouse.move( tb.x + tb.width / 2, tb.y + ( dy < 0 ? tb.height + dy : dy ), { steps: 15 } );
			await admin.mouse.move( tb.x + tb.width / 2 + 2, tb.y + ( dy < 0 ? tb.height + dy + 1 : dy + 1 ), { steps: 3 } );
			await sleep( 300 );
			await admin.mouse.up();
			await sleep( 2500 );
		};
		await drag( admin.locator( '#refraction-panel-elements .refraction-element[data-library-element-type="refraction-timed-slides"]' ), frame().locator( '[data-id="edh1"]' ) );
		const made = await admin.evaluate( () => {
			const kids = refraction.getContainer( 'ed01' ).children;
			const w = kids.find( ( k ) => 'refraction-timed-slides' === k.model.get( 'widgetType' ) );
			if ( ! w ) {
				return null;
			}
			const ids = [];
			const walk = ( c ) => {
				ids.push( c.id );
				c.children.forEach( walk );
			};
			walk( w );
			return { id: w.id, slides: w.children.length, inside: w.children.map( ( c ) => c.children.length ), unique: new Set( ids ).size === ids.length, n: ids.length };
		} );
		check( 'editor', 'dragged in: three slide containers, each with an eyebrow, title, text and button (unique ids)', made && 3 === made.slides && '4,4,4' === made.inside.join() && made.unique, JSON.stringify( made ) );

		if ( made ) {
			const wid = made.id;
			const prev = async () => frame().evaluate( ( id ) => {
				const el = document.querySelector( `[data-id="${ id }"]` );
				const texts = Array.from( el.querySelectorAll( '.rf-ts__content > .rf-tco__text' ) );
				return {
					texts: texts.length,
					shown: texts.map( ( t, i ) => ( 'visible' === getComputedStyle( t ).visibility ? i : -1 ) ).filter( ( i ) => i >= 0 ).join(),
					cards: el.querySelectorAll( '.rf-tco__card' ).length,
					first: texts[ 0 ]?.textContent.replace( /\s+/g, ' ' ).trim().slice( 0, 60 ),
				};
			}, wid );
			let v = await prev();
			check( 'editor', 'the preview shows the first slide\'s widgets and three cards', 3 === v.texts && '0' === v.shown && 3 === v.cards && /Slide 1 title/i.test( v.first ), JSON.stringify( v ) );

			await admin.evaluate( ( id ) => $e.run( 'panel/editor/open', { model: refraction.getContainer( id ).model, view: refraction.getContainer( id ).view } ), wid );
			await sleep( 800 );
			await admin.locator( '.refraction-control-slides .refraction-repeater-row-item-title' ).nth( 1 ).click();
			await sleep( 1200 );
			v = await prev();
			check( 'editor', 'picking slide 2 in the panel shows its container', '1' === v.shown, JSON.stringify( v ) );

			// Drag a Text Editor from the panel into the shown slide.
			const slide2 = await admin.evaluate( ( id ) => refraction.getContainer( id ).children[ 1 ].id, wid );
			const before = await admin.evaluate( ( id ) => refraction.getContainer( id ).children.length, slide2 );
			await admin.evaluate( () => $e.route( 'panel/elements/categories' ) );
			await admin.fill( '#refraction-panel-elements-search-input', 'Image' );
			await sleep( 600 );
			await drag( admin.locator( '#refraction-panel-elements .refraction-element[data-library-element-type="image"]' ), frame().locator( `[data-id="${ slide2 }"] .refraction-widget-button` ) );
			const after = await admin.evaluate( ( id ) => refraction.getContainer( id ).children.map( ( c ) => c.model.get( 'widgetType' ) ), slide2 );
			check( 'editor', 'a widget dragged from the panel lands in the shown slide', after.length === before + 1 && after.includes( 'image' ), JSON.stringify( after ) );

			await admin.evaluate( ( id ) => $e.run( 'document/repeater/insert', { container: refraction.getContainer( id ), name: 'slides', model: { slide_title: 'Fresh' } } ), wid );
			await sleep( 2500 );
			v = await prev();
			const kids = await admin.evaluate( ( id ) => refraction.getContainer( id ).children.length, wid );
			check( 'editor', 'Add Slide adds a slide container and a card', 4 === kids && 4 === v.texts && 4 === v.cards, JSON.stringify( { kids, v } ) );

			await admin.evaluate( ( id ) => $e.run( 'document/elements/settings', { container: refraction.getContainer( id ), settings: { content_horizontal: 'center' } } ), wid );
			await sleep( 1200 );
			const centered = await frame().evaluate( ( id ) => {
				const el = document.querySelector( `[data-id="${ id }"]` );
				const r = el.querySelector( '.rf-tco' ).getBoundingClientRect();
				const c = el.querySelector( '.rf-ts__content' ).getBoundingClientRect();
				return [ Math.round( c.left - r.left ), Math.round( r.right - c.right ) ];
			}, wid );
			check( 'editor', 'Content Position changes live', Math.abs( centered[ 0 ] - centered[ 1 ] - ( await frame().evaluate( ( id ) => document.querySelector( `[data-id="${ id }"] .rf-tco` ).getBoundingClientRect().width * 0.06, wid ) ) ) < 6, JSON.stringify( centered ) );
			await admin.screenshot( { path: join( SHOTS, 'editor.png' ) } );

			await admin.evaluate( () => $e.run( 'document/save/publish' ) );
			await sleep( 4000 );
			const f = await visit( blank.url );
			const site = await f.p.evaluate( ( [ id, s2 ] ) => {
				const el = document.querySelector( `[data-id="${ id }"]` );
				return { texts: el.querySelectorAll( '.rf-ts__content > .rf-tco__text' ).length, image: !! el.querySelector( `[data-id="${ s2 }"] .refraction-widget-image` ), cards: el.querySelectorAll( '.rf-tco__card' ).length };
			}, [ wid, slide2 ] );
			check( 'editor', 'saved: the site shows four slides, and the added widget in slide 2', 4 === site.texts && site.image && 4 === site.cards, JSON.stringify( site ) );
			await f.ctx.close();
		}
		await actx.close();

		check( 'console', 'no JavaScript errors in the browser', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const php = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === php, php.slice( 0, 400 ) );
	} catch ( e ) {
		check( 'script', e.message.split( '\n' )[ 0 ], false );
		console.error( e );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall timed slides checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
