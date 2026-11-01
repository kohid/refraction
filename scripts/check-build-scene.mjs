#!/usr/bin/env node
/**
 * 3D Build Scene check (SQLite test site, Chromium with software WebGL): .glb uploads (a real one is accepted, a fake
 * one refused), the widget in the editor panel and preview (with the preview slider), and on the site: the sample house
 * and an uploaded model build up with the scroll, captions and progress follow the stages, reduced motion shows the
 * finished model, and a browser without WebGL gets the message. Saves screenshots and a scroll recording to --shots.
 *
 * Usage: node scripts/check-build-scene.mjs [--site /tmp/rf-3d-site] [--port 8950] [--shots /tmp/build-scene-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { makeGlb } from './fixtures/make-glb.mjs';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-3d-site' );
const PORT = arg( 'port', '8950' );
const SHOTS = arg( 'shots', '/tmp/build-scene-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const GL = [ '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist' ];

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
const scene = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'build-scene', settings, elements: [] } );

/** Scrolls to a share of the scene's track and waits for the drawing to settle; returns its state. */
async function scrollTo( p, sel, share ) {
	await p.evaluate( ( [ s, f ] ) => {
		const el = document.querySelector( s );
		const top = el.getBoundingClientRect().top + window.scrollY;
		window.scrollTo( 0, top + f * ( el.offsetHeight - el.querySelector( '.rf3d-stage' ).offsetHeight ) );
	}, [ sel, share ] );
	await p.waitForFunction( ( [ s, f ] ) => {
		const v = Number( document.querySelector( s ).dataset.rf3dProgress );
		return 0 === f || 1 === f ? v === f : Math.abs( v - f ) < 0.003;
	}, [ sel, share ], { timeout: 20000 } ).catch( () => {} );
	return state( p, sel );
}
const state = ( p, sel ) => p.evaluate( ( s ) => {
	const el = document.querySelector( s );
	const cap = el.querySelector( '.rf3d-cap.is-active .rf3d-cap-title' );
	return { progress: Number( el.dataset.rf3dProgress ), step: el.dataset.rf3dStep, parts: el.dataset.rf3dParts, caption: cap ? cap.textContent : '', done: el.querySelectorAll( '.rf3d-progress li.is-done' ).length, classes: el.className, status: ( el.querySelector( '.rf3d-status' ) || {} ).textContent || '' };
}, sel );

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
	const watch = ( p, label ) => {
		p.on( 'pageerror', ( e ) => errors.push( `[${ label }] ${ e.message }` ) );
		p.on( 'console', ( m ) => 'error' === m.type() && ! /favicon|Failed to load resource/.test( m.text() ) && errors.push( `[${ label }] console ${ m.text() }` ) );
	};

	try {
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );

		// ------------------------------------------------------------ uploads
		const dir = join( tmpdir(), `rf3d-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		writeFileSync( join( dir, 'tower.glb' ), makeGlb( [ 'base-slab', 'middle-floor', 'top-roof' ] ) );
		writeFileSync( join( dir, 'fake.glb' ), '<?php echo "not a model"; ?>' );
		const modelId = ( wp( [ 'media', 'import', join( dir, 'tower.glb' ), '--user=admin', '--porcelain' ], { allowFail: true } ) || '' ).trim();
		check( 'upload', 'an administrator can upload a real .glb model', /^\d+$/.test( modelId ), modelId );
		const fake = wp( [ 'media', 'import', join( dir, 'fake.glb' ), '--user=admin', '--porcelain' ], { allowFail: true } );
		check( 'upload', 'a file named .glb that is not a glTF binary is refused', ! fake || ! /^\d+$/.test( fake.trim() ), fake );
		const modelUrl = wp( [ 'eval', `echo wp_get_attachment_url( ${ modelId } );` ] ).trim();
		check( 'upload', 'the model is stored with the gltf-binary type', wp( [ 'eval', `echo get_post_mime_type( ${ modelId } );` ] ).trim() === 'model/gltf-binary' );

		// ------------------------------------------------------------ pages
		const house = page( 'House build', [
			container( 'c1', [ spacer( 'h1', 'Our way of building' ) ] ),
			container( 'c2', [ scene( 's1', { length: { size: 3 } } ) ] ),
			container( 'c3', [ spacer( 'h2', 'Talk to us' ) ] ),
		] );
		const tower = page( 'Tower build', [
			container( 'c1', [ spacer( 'h1', 'Tower' ) ] ),
			container( 'c2', [ scene( 's2', { model_source: 'media', model: { id: Number( modelId ), url: modelUrl }, stages: [ { _id: 'a', stage_title: 'Base', stage_parts: 'base*' }, { _id: 'b', stage_title: 'Top', stage_parts: 'top*' } ], from: 'sides', length: { size: 2 } } ) ] ),
			container( 'c3', [ spacer( 'h2', 'End' ) ] ),
		] );

		// ------------------------------------------------------------ the site: sample house
		const vctx = await browser.newContext( { viewport: { width: 1400, height: 850 }, recordVideo: { dir: SHOTS, size: { width: 1400, height: 850 } } } );
		const v = await vctx.newPage();
		watch( v, 'visitor' );
		await v.goto( house.url );
		await v.waitForFunction( () => document.querySelector( '.rf3d' )?.dataset.rf3dParts, null, { timeout: 60000 } );
		const html = await v.content();
		check( 'site', 'the scene script and style load only with the widget, from this site', /build-scene-frontend(\.min)?\.js/.test( html ) && /css\/modules\/build-scene\/frontend/.test( html ) && ! /cdn|unpkg|jsdelivr/.test( ( html.match( /<script[^>]+build-scene[^>]+>/ ) || [ '' ] )[ 0 ] ) );
		const s0 = await scrollTo( v, '.rf3d', 0 );
		check( 'site', 'the sample house has its parts and starts empty on the first stage', Number( s0.parts ) > 50 && s0.progress < 0.02 && s0.step === '0' && s0.caption === 'Groundwork', JSON.stringify( s0 ) );
		await v.screenshot( { path: join( SHOTS, 'house-0.png' ) } );
		const seen = [];
		for ( const share of [ 0.2, 0.4, 0.6, 0.75 ] ) {
			const s = await scrollTo( v, '.rf3d', share );
			seen.push( s.caption );
			await v.screenshot( { path: join( SHOTS, `house-${ Math.round( share * 100 ) }.png` ) } );
		}
		check( 'site', 'scrolling down builds it stage by stage: the caption follows', new Set( seen ).size >= 3 && seen[ seen.length - 1 ] !== 'Groundwork', seen.join( ' > ' ) );
		const pinned = await v.evaluate( () => Math.abs( document.querySelector( '.rf3d-stage' ).getBoundingClientRect().top ) < 2 );
		check( 'site', 'the scene stays pinned while it builds', pinned );
		const end = await scrollTo( v, '.rf3d', 1 );
		check( 'site', 'at the end every stage is done and the model can be turned', end.progress > 0.98 && end.done === 6 && /rf3d--done/.test( end.classes ), JSON.stringify( end ) );
		await v.screenshot( { path: join( SHOTS, 'house-100.png' ) } );
		const back = await scrollTo( v, '.rf3d', 0.1 );
		check( 'site', 'scrolling back up takes it apart again', back.progress < 0.15 && back.done < 6, JSON.stringify( back ) );
		const drawn = await v.evaluate( () => {
			const c = document.querySelector( '.rf3d-canvas' );
			return c.width > 0 && c.height > 0;
		} );
		check( 'site', 'the canvas is drawn at the scene size', drawn );
		await vctx.close();
		const video = ( await readdirSync( SHOTS ).filter( ( f ) => f.endsWith( '.webm' ) ) )[ 0 ];
		if ( video ) { renameSync( join( SHOTS, video ), join( SHOTS, 'house-scroll.webm' ) ); }

		// ------------------------------------------------------------ the site: uploaded model, stages by part name
		const tctx = await browser.newContext( { viewport: { width: 1200, height: 800 } } );
		const t = await tctx.newPage();
		watch( t, 'tower' );
		await t.goto( tower.url );
		await t.waitForFunction( () => document.querySelector( '.rf3d' )?.dataset.rf3dParts, null, { timeout: 60000 } );
		const t1 = await scrollTo( t, '.rf3d', 0.2 );
		const t2 = await scrollTo( t, '.rf3d', 0.7 );
		check( 'site', 'an uploaded .glb loads with its meshes as parts, staged by part name', t1.parts === '3' && t1.caption === 'Base' && t2.caption === 'Top', JSON.stringify( [ t1, t2 ] ) );
		await tctx.close();

		// ------------------------------------------------------------ reduced motion, phones, no WebGL
		const rctx = await browser.newContext( { viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		watch( r, 'reduced' );
		await r.goto( house.url );
		await r.waitForFunction( () => document.querySelector( '.rf3d' )?.dataset.rf3dProgress, null, { timeout: 60000 } );
		const rs = await state( r, '.rf3d' );
		const rh = await r.evaluate( () => [ document.querySelector( '.rf3d' ).offsetHeight, document.querySelector( '.rf3d-stage' ).offsetHeight ] );
		check( 'site', 'with reduced motion the finished model shows and the section is not stretched', rs.progress === 1 && /rf3d--still/.test( rs.classes ) && rh[ 0 ] === rh[ 1 ], JSON.stringify( [ rs, rh ] ) );
		await rctx.close();

		const mctx = await browser.newContext( { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true } );
		const m = await mctx.newPage();
		watch( m, 'phone' );
		await m.goto( house.url );
		await m.waitForFunction( () => document.querySelector( '.rf3d' )?.dataset.rf3dParts, null, { timeout: 60000 } );
		await scrollTo( m, '.rf3d', 0.55 );
		await m.screenshot( { path: join( SHOTS, 'house-phone.png' ) } );
		const capBox = await m.evaluate( () => {
			const r = document.querySelector( '.rf3d-cap.is-active' ).getBoundingClientRect();
			return { left: r.left, right: r.right, width: innerWidth };
		} );
		check( 'site', 'on a phone the caption sits inside the screen', capBox.left >= 0 && capBox.right <= capBox.width, JSON.stringify( capBox ) );
		await mctx.close();

		const nogl = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox', '--disable-webgl', '--disable-3d-apis' ] } );
		const n = await ( await nogl.newContext() ).newPage();
		await n.goto( house.url );
		await n.waitForFunction( () => document.querySelector( '.rf3d-status' )?.textContent, null, { timeout: 30000 } ).catch( () => {} );
		check( 'site', 'without WebGL the visitor gets a plain message instead of a blank box', /can not show 3D/.test( await n.textContent( '.rf3d-status' ) ) );
		await nogl.close();

		// ------------------------------------------------------------ the editor
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const a = await ctx.newPage();
		watch( a, 'editor' );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000 } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ house.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 2000 );
		const tiles = await a.$$eval( '.refraction-element', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'editor', 'the 3D Build Scene widget is in the panel', tiles.includes( '3D Build Scene' ), tiles.slice( 0, 40 ).join( '|' ) );
		const preview = a.frameLocator( '#refraction-preview-iframe' );
		await preview.locator( '.rf3d[data-rf3d-parts]' ).waitFor( { timeout: 60000 } );
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 's1' ), settings: { preview: { unit: 'px', size: 50 } }, options: { external: true } } ) );
		await a.waitForTimeout( 3000 );
		const ep = await preview.locator( '.rf3d' ).evaluate( ( el ) => ( { progress: Number( el.dataset.rf3dProgress ), parts: el.dataset.rf3dParts } ) );
		check( 'editor', 'the preview slider shows the build at that point, without scrolling', Math.abs( ep.progress - 0.5 ) < 0.02 && Number( ep.parts ) > 50, JSON.stringify( ep ) );
		await preview.locator( '.rf3d' ).scrollIntoViewIfNeeded();
		await a.screenshot( { path: join( SHOTS, 'editor.png' ) } );
		const sections = [];
		await preview.locator( '.refraction-widget-build-scene' ).click( { position: { x: 20, y: 20 } } );
		await a.waitForTimeout( 800 );
		sections.push( ...await a.$$eval( '.refraction-section-title', ( els ) => els.filter( ( e ) => e.offsetParent ).map( ( e ) => e.textContent.trim() ) ) );
		check( 'editor', 'its Content tab has Model, Build, Scroll and Camera and light', [ 'Model', 'Build', 'Scroll', 'Camera and light' ].every( ( s ) => sections.includes( s ) ), sections.join( '|' ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall build scene checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
