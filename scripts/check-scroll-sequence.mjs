#!/usr/bin/env node
/**
 * Scroll Sequence check (SQLite test site, Chromium): an image sequence (48 frames made with ffmpeg, imported in reverse
 * order) and an all-keyframe video play with the scroll, text overlays and their shade show between their points, the
 * page does not load the 3D library, reduced motion shows the still picture and every text, and the editor's preview
 * slider works. Needs ffmpeg. Saves screenshots to --shots.
 *
 * Usage: node scripts/check-scroll-sequence.mjs [--site /tmp/rf-seq-site] [--port 8960] [--shots /tmp/scroll-sequence-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-seq-site' );
const PORT = arg( 'port', '8960' );
const SHOTS = arg( 'shots', '/tmp/scroll-sequence-shots' );
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
const container = ( id, widgets ) => ( { id, elType: 'container', settings: { content_width: 'full' }, elements: widgets, isInner: false } );
const spacer = ( id, text ) => ( { id, elType: 'widget', widgetType: 'heading', settings: { title: text, align: 'center' }, elements: [] } );

/** Scrolls to a share of the sequence track and waits until it is shown; returns its state. */
async function scrollTo( p, share ) {
	await p.evaluate( ( f ) => {
		const el = document.querySelector( '.rfseq' );
		const top = el.getBoundingClientRect().top + window.scrollY;
		window.scrollTo( 0, top + ( f * ( el.offsetHeight - el.querySelector( '.rf3d-stage' ).offsetHeight ) ) );
	}, share );
	await p.waitForFunction( ( f ) => {
		const v = Number( document.querySelector( '.rfseq' ).dataset.rfseqProgress );
		return 0 === f || 1 === f ? v === f : Math.abs( v - f ) < 0.003;
	}, share, { timeout: 20000 } ).catch( () => {} );
	await p.waitForTimeout( 400 );
	return p.evaluate( () => {
		const el = document.querySelector( '.rfseq' );
		return {
			progress: Number( el.dataset.rfseqProgress ),
			frame: el.dataset.rfseqFrame,
			time: el.dataset.rfseqTime,
			loaded: el.dataset.rfseqLoaded,
			side: el.dataset.rfseqSide || '',
			visible: [ ...el.querySelectorAll( '.rfseq-overlay.is-visible .rfseq-title' ) ].map( ( t ) => t.textContent ),
			classes: el.className,
		};
	} );
}

/** Whether the middle of the canvas has been painted with something other than the background. */
const painted = ( p ) => p.evaluate( () => {
	const c = document.querySelector( '.rfseq-canvas' );
	const d = c.getContext( '2d' ).getImageData( Math.floor( c.width / 2 ), Math.floor( c.height / 2 ), 1, 1 ).data;
	return d[ 0 ] + d[ 1 ] + d[ 2 ] > 60;
} );

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
	const watch = ( p, label ) => {
		p.on( 'pageerror', ( e ) => errors.push( `[${ label }] ${ e.message }` ) );
		p.on( 'console', ( m ) => 'error' === m.type() && ! /favicon|Failed to load resource/.test( m.text() ) && errors.push( `[${ label }] console ${ m.text() }` ) );
	};

	try {
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );

		// ------------------------------------------------------------ media: 48 numbered frames and an all-keyframe video
		const dir = join( tmpdir(), `rfseq-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		const ff = ( args ) => execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', ...args ] );
		ff( [ '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24', '-t', '2', '-q:v', '4', join( dir, 'frame-%03d.jpg' ) ] );
		ff( [ '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24', '-t', '3', '-g', '1', '-pix_fmt', 'yuv420p', '-an', join( dir, 'walk.mp4' ) ] );
		// Imported in a shuffled order: "By file name" must put them back.
		const files = readdirSync( dir ).filter( ( f ) => f.endsWith( '.jpg' ) ).sort().reverse();
		const ids = wp( [ 'media', 'import', ...files.map( ( f ) => join( dir, f ) ), '--user=admin', '--porcelain' ] ).trim().split( /\s+/ ).map( Number );
		check( 'media', 'the 48 frames are imported', ids.length === 48 && ids.every( ( id ) => id > 0 ), ids.length );
		const frames = ids.map( ( id ) => ( { id, url: wp( [ 'eval', `echo wp_get_attachment_url( ${ id } );` ] ).trim() } ) );
		const videoId = Number( wp( [ 'media', 'import', join( dir, 'walk.mp4' ), '--user=admin', '--porcelain' ] ).trim() );
		const videoUrl = wp( [ 'eval', `echo wp_get_attachment_url( ${ videoId } );` ] ).trim();

		const overlays = [
			{ _id: 'o1', title: 'The living space', text: 'Where the day gathers.', from: 0, to: 30, place: 'left' },
			{ _id: 'o2', title: 'Light first', text: 'Planned around the view.', from: 45, to: 70, place: 'right' },
		];
		const images = page( 'Walkthrough', [
			container( 'c1', [ spacer( 'h1', 'Studio' ) ] ),
			container( 'c2', [ { id: 'q1', elType: 'widget', widgetType: 'scroll-sequence', settings: { frames, overlays, show_progress: 'yes', length: { size: 4 } }, elements: [] } ] ),
			container( 'c3', [ spacer( 'h2', 'Projects' ) ] ),
		] );
		const film = page( 'Film', [
			container( 'c1', [ spacer( 'h1', 'Film' ) ] ),
			container( 'c2', [ { id: 'q2', elType: 'widget', widgetType: 'scroll-sequence', settings: { source: 'video', video: { id: videoId, url: videoUrl }, overlays: [], length: { size: 3 } }, elements: [] } ] ),
			container( 'c3', [ spacer( 'h2', 'End' ) ] ),
		] );

		// ------------------------------------------------------------ image sequence
		const vctx = await browser.newContext( { viewport: { width: 1400, height: 850 } } );
		const v = await vctx.newPage();
		watch( v, 'images' );
		await v.goto( images.url );
		const html = await v.content();
		check( 'site', 'the page loads the small sequence script and not the 3D library', /scroll-sequence-frontend(\.min)?\.js/.test( html ) && ! /build-scene-frontend/.test( html ) );
		await v.waitForFunction( () => Number( document.querySelector( '.rfseq' )?.dataset.rfseqLoaded ) === 48, null, { timeout: 60000 } );
		check( 'site', 'every frame is loaded', true );
		const s0 = await scrollTo( v, 0 );
		check( 'site', 'at the start: the first frame, the first text on the left with its shade', s0.frame === '0' && s0.visible.join() === 'The living space' && s0.side === 'left' && await painted( v ), JSON.stringify( s0 ) );
		await v.screenshot( { path: join( SHOTS, 'images-0.png' ) } );
		const s5 = await scrollTo( v, 0.55 );
		check( 'site', 'halfway: the frame follows the scroll and the second text shows on the right', Math.abs( Number( s5.frame ) - Math.round( ( 0.55 / 0.92 ) * 47 ) ) <= 1 && s5.visible.join() === 'Light first' && s5.side === 'right', JSON.stringify( s5 ) );
		await v.screenshot( { path: join( SHOTS, 'images-55.png' ) } );
		const s8 = await scrollTo( v, 0.8 );
		check( 'site', 'between texts nothing is over the picture', s8.visible.length === 0 && s8.side === '', JSON.stringify( s8 ) );
		const s1 = await scrollTo( v, 1 );
		check( 'site', 'at the end: the last frame (in file-name order, though imported backwards)', s1.frame === '47', JSON.stringify( s1 ) );
		const order = await v.evaluate( () => JSON.parse( document.querySelector( '.rfseq' ).dataset.rfseq ).frames.map( ( u ) => u.match( /frame-(\d+)/ )[ 1 ] ).join() );
		check( 'site', 'frames play by file name', order === Array.from( { length: 48 }, ( _, i ) => String( i + 1 ).padStart( 3, '0' ) ).join(), order.slice( 0, 40 ) );
		const back = await scrollTo( v, 0.1 );
		check( 'site', 'scrolling up plays it backwards', Number( back.frame ) < 10, JSON.stringify( back ) );
		const bar = await v.evaluate( () => document.querySelector( '.rfseq-bar span' ).style.transform );
		check( 'site', 'the progress line follows', /scaleX\(0\.1/.test( bar ), bar );
		await vctx.close();

		// ------------------------------------------------------------ video
		const fctx = await browser.newContext( { viewport: { width: 1200, height: 800 } } );
		const f = await fctx.newPage();
		watch( f, 'video' );
		await f.goto( film.url );
		await f.waitForFunction( () => document.querySelector( '.rfseq-video' )?.readyState >= 2, null, { timeout: 60000 } );
		const f1 = await scrollTo( f, 0.5 );
		await f.waitForTimeout( 800 );
		const time = await f.evaluate( () => document.querySelector( '.rfseq-video' ).currentTime );
		const expected = ( 0.5 / 0.92 ) * ( 3 - 0.05 );
		check( 'site', 'a video is seeked to the scroll point and drawn', Math.abs( time - expected ) < 0.1 && await painted( f ), JSON.stringify( { time, expected, f1 } ) );
		await fctx.close();

		// ------------------------------------------------------------ reduced motion
		const rctx = await browser.newContext( { viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		watch( r, 'reduced' );
		await r.goto( images.url );
		await r.waitForSelector( '.rfseq.rfseq--still' );
		const still = await r.evaluate( () => ( {
			poster: ! document.querySelector( '.rfseq-poster' ).hidden,
			texts: document.querySelectorAll( '.rfseq-overlay.is-visible' ).length,
			tall: document.querySelector( '.rfseq' ).offsetHeight < innerHeight * 2,
		} ) );
		check( 'site', 'with reduced motion: the still picture, all the texts, and no long scroll', still.poster && still.texts === 2 && still.tall, JSON.stringify( still ) );
		await r.screenshot( { path: join( SHOTS, 'reduced.png' ), fullPage: true } );
		await rctx.close();

		// ------------------------------------------------------------ editor
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const a = await ctx.newPage();
		watch( a, 'editor' );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000 } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ images.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 2000 );
		const tiles = await a.$$eval( '.refraction-element', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'editor', 'Scroll Sequence is in the panel', tiles.includes( 'Scroll Sequence' ) );
		const preview = a.frameLocator( '#refraction-preview-iframe' );
		await preview.locator( '.rfseq[data-rfseq-loaded]' ).waitFor( { timeout: 60000 } );
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'q1' ), settings: { preview: { unit: 'px', size: 50 } }, options: { external: true } } ) );
		await a.waitForTimeout( 2500 );
		const ep = await preview.locator( '.rfseq' ).evaluate( ( el ) => ( { progress: Number( el.dataset.rfseqProgress ), frame: el.dataset.rfseqFrame } ) );
		check( 'editor', 'the preview slider shows that point without scrolling', Math.abs( ep.progress - 0.5 ) < 0.01 && Number( ep.frame ) > 20, JSON.stringify( ep ) );
		await ctx.close();
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall scroll sequence checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
