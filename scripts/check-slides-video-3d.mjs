#!/usr/bin/env node
/**
 * Slides video and 3D animations check (SQLite test site, Chromium with software WebGL; YouTube replaced by a fake
 * player, so nothing leaves the machine):
 * - Slides: a slide's YouTube address becomes a muted background video that covers the slide; the slide waits for
 *   the video and moves on when it ends (classic and Timed cards layouts); a sound button; two buttons per slide.
 * - 3D Build Scene: Drive in (the car rolls in with four spinning wheels), Turntable, the model's own animation
 *   (a character: looping and scroll-played clips, by name), Float, Follow the cursor (the model, or the head) and
 *   Grab to rotate at any time.
 *
 * Usage: node scripts/check-slides-video-3d.mjs [--site /tmp/rf-sv-site] [--port 8998] [--shots /tmp/slides-video-3d-shots]
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
const SITE = arg( 'site', '/tmp/rf-sv-site' );
const PORT = arg( 'port', '8998' );
const SHOTS = arg( 'shots', '/tmp/slides-video-3d-shots' );
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
import { makeCar, makeCharacter } from './fixtures/make-figures.mjs';

const GL = [ '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist' ];

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
	frame.src = 'about:blank'; frame.setAttribute( 'data-video', opts.videoId ); frame.setAttribute( 'data-host', opts.host || '' ); mount.replaceWith( frame );
	window.rfFakeYt.players.push( { id: opts.videoId, host: opts.host, mute: opts.playerVars.mute, self: self } );
	function emit( s ) { opts.events.onStateChange( { data: s, target: self } ); }
	self.playVideo = function () { clearInterval( timer ); emit( 1 ); timer = setInterval( function () { t += 0.1; if ( t >= 1.6 ) { clearInterval( timer ); emit( 0 ); } }, 100 ); window.rfFakeYt.playing = opts.videoId; };
	self.pauseVideo = function () { clearInterval( timer ); };
	self.seekTo = function () { t = 0; };
	self.getDuration = function () { return 1.6; }; self.getCurrentTime = function () { return t; };
	self.mute = function () { muted = true; }; self.unMute = function () { muted = false; }; self.isMuted = function () { return muted; };
	self.destroy = function () { clearInterval( timer ); };
	setTimeout( function () { opts.events.onReady( { target: self } ); }, 50 );
} };
setTimeout( function () { window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 0 );`;

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: GL } );
	const errors = [];

	try {
		// ------------------------------------------------------------ the YouTube address
		const ids = wp( [ 'eval', 'foreach ( [ "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "https://vimeo.com/123", "javascript:alert(1)" ] as $u ) { echo Refraction\\Modules\\ProWidgets\\Widgets\\Slides::youtube_id( $u ), "|"; }' ] ).trim();
		check( 'video', 'watch, youtu.be, shorts and embed addresses give the video id; anything else gives nothing', 'dQw4w9WgXcQ|dQw4w9WgXcQ|dQw4w9WgXcQ|dQw4w9WgXcQ|||' === ids, ids );

		const dir = join( tmpdir(), `rfsv-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=#335577:size=1200x700', '-frames:v', '1', join( dir, 'poster.jpg' ) ] );
		const poster = Number( wp( [ 'media', 'import', join( dir, 'poster.jpg' ), '--porcelain' ] ).trim() );
		const posterUrl = wp( [ 'post', 'list', '--post_type=attachment', `--post__in=${ poster }`, '--field=guid' ] ).trim();
		const slide = ( i, video ) => ( { _id: 'v' + i, heading: 'Slide ' + i, description: 'Text ' + i, button_text: 'Book now', button_link: { url: '#book' }, button2_text: 'Watch the film', button2_link: { url: '#film' }, background_image: { id: poster, url: posterUrl }, background_color: '#223344', ...( video ? { background_video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', video_next: 'yes', video_sound: 'yes' } : {} ) } );
		const slidesWidget = ( id, layout ) => ( { id, elType: 'widget', widgetType: 'refraction-slides', settings: { layout, autoplay: 'yes', autoplay_speed: 9000, transition_speed: 400, slides_height: { unit: 'px', size: 560 }, navigation: 'both', slides: [ slide( 1, true ), slide( 2, false ), slide( 3, false ), { _id: 'v4', heading: 'Video only', background_video: 'https://youtu.be/aBcDeFgHiJk' } ] }, elements: [] } );
		const classic = page( 'Video slides', [ { id: 'c1', elType: 'container', settings: { content_width: 'full' }, isInner: false, elements: [ slidesWidget( 'sclassic', 'classic' ) ] } ] );
		const cards = page( 'Video cards', [ { id: 'c2', elType: 'container', settings: { content_width: 'full' }, isInner: false, elements: [ slidesWidget( 'scards', 'cards' ) ] } ] );

		const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 } } );
		await ctx.route( /youtube\.com\/iframe_api/, ( route ) => route.fulfill( { contentType: 'text/javascript', body: FAKE_YT } ) );
		await ctx.route( /(youtube|ytimg|googlevideo)/, ( route ) => ( /iframe_api/.test( route.request().url() ) ? route.fallback() : route.abort() ) );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );

		for ( const [ name, target, activeIndex ] of [ [ 'classic', classic, () => p.evaluate( () => {
			const el = document.querySelector( '.refraction-slides-wrapper' );
			return el && el.swiper ? el.swiper.realIndex : -1;
		} ) ], [ 'cards', cards, () => p.evaluate( () => [ ...document.querySelectorAll( '.rf-tco__slide' ) ].findIndex( ( s ) => s.classList.contains( 'is-active' ) ) ) ] ] ) {
			await p.goto( target.url, { waitUntil: 'load' } );
			await p.waitForFunction( () => window.rfFakeYt && window.rfFakeYt.players.length, null, { timeout: 8000 } ).catch( () => null );
			await sleep( 500 );
			const v = await p.evaluate( () => {
				const frame = document.querySelector( '.refraction-slide__video iframe' );
				const box = document.querySelector( '.refraction-slide__video' );
				const r = frame ? frame.getBoundingClientRect() : null;
				const slideBox = box ? box.getBoundingClientRect() : null;
				return { player: window.rfFakeYt && window.rfFakeYt.players[ 0 ], playing: !! document.querySelector( '.refraction-slide__video.is-playing' ), covers: !! r && r.width >= slideBox.width - 1 && r.height >= slideBox.height - 1, sound: !! document.querySelector( '.refraction-slide__sound:not([hidden])' ), buttons: document.querySelector( '.swiper-slide-active .refraction-slide__buttons, .rf-tco__text.is-active .refraction-slide__buttons' ).textContent.replace( /\s+/g, ' ' ).trim() };
			} );
			await p.screenshot( { path: join( SHOTS, `slides-${ name }.png` ) } );
			check( name, 'the slide\'s YouTube video plays muted from youtube-nocookie.com, covering the slide, with a sound button', v.player && 'dQw4w9WgXcQ' === v.player.id && /youtube-nocookie\.com/.test( v.player.host ) && 1 === v.player.mute && v.playing && v.covers && v.sound, JSON.stringify( v ) );
			check( name, 'two buttons per slide', 'Book now Watch the film' === v.buttons, v.buttons );
			const thumbs = await p.evaluate( () => [ ...document.querySelectorAll( '.refraction-slide__bg, .rf-tco__bg, .rf-tco__card' ) ].map( ( el ) => el.getAttribute( 'style' ) || '' ).filter( ( st ) => /ytimg/.test( st ) ) );
			check( name, 'a slide with a YouTube video and no image uses the video\'s thumbnail (large, with the small one behind)', thumbs.length >= 1 && thumbs.every( ( st ) => /i\.ytimg\.com\/vi\/aBcDeFgHiJk\/maxresdefault\.jpg/.test( st ) && /aBcDeFgHiJk\/hqdefault\.jpg/.test( st ) ) && ( 'classic' === name || 2 === thumbs.length ), JSON.stringify( thumbs ) );
			const before = await activeIndex();
			await sleep( 2400 );
			const after = await activeIndex();
			check( name, 'the slide waits for its video and moves on when it ends (before the 9 s autoplay)', 0 === before && 1 === after, `${ before } -> ${ after }` );
		}

		const twoStyles = await p.evaluate( () => {
			const a = getComputedStyle( document.querySelector( '.refraction-slide__button--1' ) );
			const b = getComputedStyle( document.querySelector( '.refraction-slide__button--2' ) );
			return { a: a.backgroundColor, b: b.backgroundColor, border: b.borderTopWidth };
		} );
		check( 'cards', 'the second button is an outline button by default', twoStyles.a !== twoStyles.b && 'rgba(0, 0, 0, 0)' === twoStyles.b && '1px' === twoStyles.border, JSON.stringify( twoStyles ) );
		await ctx.close();

		// ------------------------------------------------------------ 3D: car, character
		writeFileSync( join( dir, 'car.glb' ), makeCar() );
		writeFileSync( join( dir, 'character.glb' ), makeCharacter() );
		const media = ( file ) => {
			const id = Number( wp( [ 'media', 'import', join( dir, file ), '--user=admin', '--porcelain' ] ).trim() );
			return { id, url: wp( [ 'post', 'list', '--post_type=attachment', `--post__in=${ id }`, '--field=guid' ] ).trim() };
		};
		const car = media( 'car.glb' );
		const person = media( 'character.glb' );
		const scene = ( id, model, more ) => ( { id: 'c' + id, elType: 'container', settings: { content_width: 'full' }, isInner: false, elements: [ { id, elType: 'widget', widgetType: 'build-scene', settings: { model_source: 'media', model, stages: [], show_tools: '', caption_position: 'none', show_progress: '', height: { unit: 'vh', size: 100 }, ...more }, elements: [] } ] } );
		const scenes = page( '3D animations', [
			scene( 'sdrive', car, { motion: 'drive', length: { size: 2 }, caption_position: 'left', show_progress: 'yes', show_tools: 'yes', tool_parts: 'yes', stages: [ { stage_title: 'Body', stage_text: 'Steel', stage_parts: 'body' }, { stage_title: 'Wheels', stage_text: 'Four', stage_parts: '*wheel*' } ] } ),
			scene( 'sturn', car, { motion: 'turntable', turns: { size: 1 }, length: { size: 2 }, caption_position: 'left', show_progress: 'yes', show_stages: 'yes', stages: [ { stage_title: 'Body', stage_text: 'Steel', stage_parts: 'body' }, { stage_title: 'Wheels', stage_text: 'Four', stage_parts: '*wheel*' } ] } ),
			scene( 'swave', person, { motion: 'clip', clip: 'wave', clip_play: 'loop', follow: 'head', grab: 'yes', drag: '', show_tools: 'yes', tool_clips: 'yes' } ),
			scene( 'sidle', person, { motion: 'clip', clip: '', clip_play: 'scroll', follow: 'turn', length: { size: 2 } } ),
			scene( 'sfloat', car, { motion: 'float', grab: 'yes' } ),
		] );

		const g = await browser.newContext( { viewport: { width: 1280, height: 800 } } );
		const q = await g.newPage();
		q.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await q.goto( scenes.url, { waitUntil: 'load' } );
		const data = ( id ) => q.evaluate( ( i ) => ( { ...document.querySelector( `.refraction-element-${ i } .rf3d` ).dataset } ), id );
		const ready = ( id ) => q.waitForFunction( ( i ) => {
			const el = document.querySelector( `.refraction-element-${ i } .rf3d` );
			return el && undefined !== el.dataset.rf3dProgress;
		}, id, { timeout: 20000 } );
		// Five software-rendered scenes draw slowly here: wait for a value to change rather than for a fixed time.
		const until = ( id, test, ...args ) => q.waitForFunction( ( [ i, src, a ] ) => {
			const el = document.querySelector( `.refraction-element-${ i } .rf3d` );
			return el && new Function( 'd', 'a', 'return ' + src )( el.dataset, a );
		}, [ id, test, args ], { timeout: 15000 } ).then( () => true, () => false );
		const into = async ( id, share ) => {
			await q.evaluate( ( [ i, s ] ) => {
				const el = document.querySelector( `.refraction-element-${ i }` );
				const top = el.getBoundingClientRect().top + window.scrollY;
				window.scrollTo( 0, top + ( ( el.offsetHeight - window.innerHeight ) * s ) );
			}, [ id, share ] );
			await ready( id );
			await sleep( 1200 );
		};

		await into( 'sdrive', 0.05 );
		const d0 = await data( 'sdrive' );
		await q.screenshot( { path: join( SHOTS, 'drive-start.png' ) } );
		await into( 'sdrive', 0.7 );
		await until( 'sdrive', 'Number( d.rf3dTravel ) < 0.05' );
		const d1 = await data( 'sdrive' );
		await q.screenshot( { path: join( SHOTS, 'drive-arrived.png' ) } );
		check( '3d', 'Drive in: the car finds its four wheels and rolls in with the scroll, then stands', '4' === d0.rf3dWheels && Number( d0.rf3dTravel ) > 2 && Number( d1.rf3dTravel ) < 0.05, JSON.stringify( [ d0.rf3dWheels, d0.rf3dTravel, d1.rf3dTravel ] ) );

		const stagesShown = await q.evaluate( () => [ 'sdrive', 'sturn' ].map( ( i ) => ( {
			caps: !! document.querySelector( `.refraction-element-${ i } .rf3d-caps` ),
			line: !! document.querySelector( `.refraction-element-${ i } .rf3d-progress` ),
		} ) ) );
		check( '3d', 'other animations hide the stages unless "Show the stages on the site" is on', ! stagesShown[ 0 ].caps && ! stagesShown[ 0 ].line && stagesShown[ 1 ].caps && stagesShown[ 1 ].line, JSON.stringify( stagesShown ) );
		const label = await q.textContent( '.refraction-element-sdrive [data-rf3d-view="build"]' );
		check( '3d', 'the first view button is named after the animation ("Drive")', 'Drive' === label.trim(), label );

		await into( 'sturn', 0.1 );
		const t0 = Number( ( await data( 'sturn' ) ).rf3dTurn );
		await into( 'sturn', 0.6 );
		await until( 'sturn', 'Number( d.rf3dTurn ) > a[ 0 ] + 100', t0 );
		const t1 = Number( ( await data( 'sturn' ) ).rf3dTurn );
		check( '3d', 'Turntable: the model turns with the scroll', t1 - t0 > 100, `${ t0 } -> ${ t1 }` );

		await into( 'swave', 0.3 );
		const w0 = await data( 'swave' );
		await sleep( 500 );
		const w1 = await data( 'swave' );
		check( '3d', 'the character plays its own animation by name ("wave" finds "Wave"), in a loop', 'Wave' === w0.rf3dClip && w0.rf3dClipTime !== w1.rf3dClipTime, JSON.stringify( [ w0.rf3dClip, w0.rf3dClipTime, w1.rf3dClipTime ] ) );
		const clipButtons = await q.evaluate( () => [ ...document.querySelectorAll( '.refraction-element-swave [data-rf3d-clip-name]' ) ].map( ( b ) => b.textContent + ':' + b.getAttribute( 'aria-pressed' ) ) );
		await q.click( '.refraction-element-swave [data-rf3d-clip-name="Idle"]' );
		await until( 'swave', 'd.rf3dClip === "Idle"' );
		check( '3d', 'animation buttons: one per animation in the model; a click switches to it', 'Wave:true,Idle:false' === clipButtons.join() && 'Idle' === ( await data( 'swave' ) ).rf3dClip, JSON.stringify( clipButtons ) );
		await q.mouse.move( 5, 5 );
		const box = await q.locator( '.refraction-element-swave .rf3d-canvas' ).boundingBox();
		await q.mouse.move( box.x + box.width - 20, box.y + ( box.height / 2 ) );
		await sleep( 900 );
		const f = await data( 'swave' );
		check( '3d', 'Follow the cursor (head): the head turns toward the pointer', 'Head' === f.rf3dHead && Number( f.rf3dFollow ) > 0.8, JSON.stringify( [ f.rf3dHead, f.rf3dFollow ] ) );
		const yawBefore = Number( ( await data( 'swave' ) ).rf3dYaw );
		await q.mouse.move( box.x + ( box.width / 2 ), box.y + ( box.height / 2 ) );
		await q.mouse.down();
		await q.mouse.move( box.x + ( box.width / 2 ) - 220, box.y + ( box.height / 2 ) + 40, { steps: 8 } );
		await q.mouse.up();
		await sleep( 300 );
		const grabbed = await data( 'swave' );
		await q.screenshot( { path: join( SHOTS, 'character.png' ) } );
		check( '3d', 'Grab to rotate: dragging turns the model at any point of the scroll, up and down too', Math.abs( Number( grabbed.rf3dYaw ) - yawBefore ) > 40 && '0.0' !== grabbed.rf3dElevation, JSON.stringify( [ yawBefore, grabbed.rf3dYaw, grabbed.rf3dElevation ] ) );

		await into( 'sidle', 0.1 );
		const i0 = await data( 'sidle' );
		await into( 'sidle', 0.8 );
		await until( 'sidle', 'Number( d.rf3dClipTime ) > a[ 0 ] + 0.15', Number( i0.rf3dClipTime ) );
		const i1 = await data( 'sidle' );
		check( '3d', 'played with the scroll: an empty name takes the first animation, and the scroll sets its time', 'Wave' === i0.rf3dClip && Number( i1.rf3dClipTime ) > Number( i0.rf3dClipTime ), JSON.stringify( [ i0.rf3dClip, i0.rf3dClipTime, i1.rf3dClipTime ] ) );

		await into( 'sfloat', 0.3 );
		const fl0 = await data( 'sfloat' );
		await until( 'sfloat', 'd.rf3dTurn !== a[ 0 ] && d.rf3dLift !== a[ 1 ]', fl0.rf3dTurn, fl0.rf3dLift );
		const fl1 = await data( 'sfloat' );
		check( '3d', 'Float: the model hovers and turns by itself', fl0.rf3dLift !== fl1.rf3dLift && fl0.rf3dTurn !== fl1.rf3dTurn, JSON.stringify( [ fl0.rf3dLift, fl1.rf3dLift, fl0.rf3dTurn, fl1.rf3dTurn ] ) );
		await g.close();

		// ------------------------------------------------------------ editor: detecting wheels and animations
		wp( [ 'user', 'update', 'admin', '--user_pass=admin' ] );
		const ed = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
		const ep = await ed.newPage();
		ep.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await ep.goto( `${ BASE }/wp-login.php?redirect_to=${ encodeURIComponent( `${ BASE }/wp-admin/profile.php` ) }` );
		await ep.fill( '#user_login', 'admin' );
		await ep.fill( '#user_pass', 'admin' );
		await Promise.all( [ ep.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), ep.click( '#wp-submit' ) ] );
		await ep.goto( `${ BASE }/wp-admin/post.php?post=${ scenes.id }&action=refraction`, { timeout: 120000 } );
		await ep.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await sleep( 1500 );
		const detected = await ep.evaluate( async ( [ carUrl, personUrl ] ) => {
			const find = ( id ) => refraction.getPreviewContainer().children.find( ( c ) => c.children[ 0 ].id === id ).children[ 0 ];
			const wait = ( fn ) => new Promise( ( resolve ) => {
				let n = 0;
				const t = setInterval( () => {
					if ( fn() || ++n > 60 ) {
						clearInterval( t );
						resolve();
					}
				}, 100 );
			} );
			const float = find( 'sfloat' );
			// A car chosen for a Drive scene with no wheel names yet.
			$e.run( 'document/elements/settings', { container: float, settings: { wheels: '' } } );
			$e.run( 'document/elements/settings', { container: float, settings: { motion: 'drive' } } );
			await wait( () => float.settings.get( 'wheels' ) );
			const wheels = float.settings.get( 'wheels' );
			// A character chosen for its own animation, with no name.
			$e.run( 'document/elements/settings', { container: float, settings: { clip: '', model: { id: 0, url: personUrl } } } );
			$e.run( 'document/elements/settings', { container: float, settings: { motion: 'clip' } } );
			await wait( () => float.settings.get( 'clip' ) );
			return { wheels, clip: float.settings.get( 'clip' ), car: carUrl };
		}, [ car.url, person.url ] );
		check( 'editor', 'choosing Drive in fills the wheel parts from the model; choosing its own animation fills the first animation name', '*wheel*, *tire*, *tyre*' === detected.wheels && 'Wave' === detected.clip, JSON.stringify( detected ) );
		await ed.close();

		// Reduced motion: nothing moves by itself.
		const r = await browser.newContext( { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' } );
		const rp = await r.newPage();
		rp.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await rp.goto( scenes.url, { waitUntil: 'load' } );
		await rp.evaluate( () => document.querySelector( '.refraction-element-sfloat' ).scrollIntoView() );
		await rp.waitForFunction( () => undefined !== document.querySelector( '.refraction-element-sfloat .rf3d' ).dataset.rf3dLift, null, { timeout: 20000 } );
		await sleep( 600 );
		const s0 = await rp.evaluate( () => ( { ...document.querySelector( '.refraction-element-sfloat .rf3d' ).dataset } ) );
		await sleep( 700 );
		const s1 = await rp.evaluate( () => ( { ...document.querySelector( '.refraction-element-sfloat .rf3d' ).dataset } ) );
		check( '3d', 'reduced motion: Float stays still', s0.rf3dLift === s1.rf3dLift && s0.rf3dTurn === s1.rf3dTurn, JSON.stringify( [ s0.rf3dLift, s1.rf3dLift ] ) );
		await r.close();
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall slides video and 3D animation checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
