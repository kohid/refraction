#!/usr/bin/env node
/**
 * 3D Build Scene > Parts check (SQLite test site, Chromium, the sample house): a part's own settings on the page
 * (hidden, color, glow, moved, turned, resized, a label over it, a link), the finished model with reduced motion;
 * in the editor, pointing at a part lights it up with its name, clicking it opens (or adds) its row in Content > Parts,
 * and Add every part makes one row per part.
 *
 * Usage: node scripts/check-build-scene-parts.mjs [--site /tmp/rf-3dp-site] [--port 8993] [--shots /tmp/build-scene-parts-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-3dp-site' );
const PORT = arg( 'port', '8993' );
const SHOTS = arg( 'shots', '/tmp/build-scene-parts-shots' );
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


const heading = ( id, title ) => ( { id, elType: 'widget', widgetType: 'heading', settings: { title }, elements: [] } );

const scene = ( id, settings ) => ( { id, elType: 'widget', widgetType: 'build-scene', settings: { model_source: 'sample', ...settings }, elements: [] } );

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist' ] } );
	const errors = [];

	try {
		const parts = [
			{ _id: 'p1', part_match: 'roof-wing', part_hide: 'yes' },
			{ _id: 'p2', part_match: 'roof-left, roof-right', part_color: '#c0392b', part_label: 'New roof', part_link: { url: '#roof', is_external: '' } },
			{ _id: 'p3', part_match: 'glass-*', part_glow: '#ffd27a', part_opacity: { size: 60 } },
			{ _id: 'p4', part_match: 'furniture-table', part_move_y: { size: 10 }, part_turn_y: { size: 45 }, part_scale: { size: 200 } },
			{ _id: 'p5', part_match: 'stone-chimney', part_from: 'below', part_delay: { size: 20 }, part_metal: { size: 80 }, part_rough: { size: 10 } },
		];
		const doc = page( 'Scene parts', [ box( 'top', {}, [ scene( 'sc1', { parts } ) ] ), box( 'plain', {}, [ scene( 'sc2', {} ) ] ) ] );

		// ------------------------------------------------------------ the page (finished model, reduced motion)
		const ctx = await browser.newContext( { viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( doc.url );
		await p.waitForFunction( () => document.querySelector( '[data-id="sc1"] .rf3d' )?.rf_build_scene?.parts?.length > 0, null, { timeout: 30000 } );
		await sleep( 1200 );
		const look = await p.evaluate( () => {
			const part = ( id, name ) => document.querySelector( `[data-id="${ id }"] .rf3d` ).rf_build_scene.parts.find( ( x ) => x.name === name );
			const m = ( pt ) => pt.materials[ 0 ].m;
			const mine = ( n ) => part( 'sc1', n );
			const plain = ( n ) => part( 'sc2', n );
			const label = document.querySelector( '[data-id="sc1"] .rf3d-label' );
			const canvas = document.querySelector( '[data-id="sc1"] .rf3d-canvas' ).getBoundingClientRect();
			const lr = label ? label.getBoundingClientRect() : null;
			return {
				hidden: ! mine( 'roof-wing' ).mesh.visible && plain( 'roof-wing' ).mesh.visible,
				roof: m( mine( 'roof-left' ) ).color.getHexString() + '/' + m( mine( 'roof-right' ) ).color.getHexString(),
				glow: m( mine( 'glass-main-front' ) ).emissive.getHexString(),
				glassOpacity: +( m( mine( 'glass-main-front' ) ).opacity / m( plain( 'glass-main-front' ) ).opacity ).toFixed( 2 ),
				tableScale: +mine( 'furniture-table' ).mesh.scale.x.toFixed( 2 ) / +plain( 'furniture-table' ).mesh.scale.x.toFixed( 2 ),
				tableTurn: Math.round( ( mine( 'furniture-table' ).mesh.rotation.y - plain( 'furniture-table' ).mesh.rotation.y ) * 180 / Math.PI ),
				tableRaised: mine( 'furniture-table' ).mesh.getWorldPosition( mine( 'furniture-table' ).mesh.position.clone() ).y > plain( 'furniture-table' ).mesh.getWorldPosition( plain( 'furniture-table' ).mesh.position.clone() ).y,
				chimney: { metal: m( mine( 'stone-chimney' ) ).metalness, rough: +m( mine( 'stone-chimney' ) ).roughness.toFixed( 2 ), from: mine( 'stone-chimney' ).offset.y < 0 },
				label: label ? { text: label.textContent, href: label.getAttribute( 'href' ), shown: ! label.hidden, inside: lr.left >= canvas.left && lr.right <= canvas.right && lr.top >= canvas.top && lr.bottom <= canvas.bottom } : null,
				plainLabels: document.querySelectorAll( '[data-id="sc2"] .rf3d-label' ).length,
			};
		} );
		check( 'page', 'a part set to hide is not drawn (the same part shows in a scene without rows)', look.hidden, JSON.stringify( look ) );
		check( 'page', 'Look: the two roof halves take the row\'s color; the glass glows and is 60% as opaque; the chimney is metal and shiny', 'c0392b/c0392b' === look.roof && 'ffd27a' === look.glow && 0.6 === look.glassOpacity && 0.8 === look.chimney.metal && 0.1 === look.chimney.rough, JSON.stringify( look ) );
		check( 'page', 'Place: the table is twice the size, turned 45° and raised', 2 === look.tableScale && 45 === look.tableTurn && look.tableRaised, JSON.stringify( look ) );
		check( 'page', 'Build: the chimney comes from below', look.chimney.from, JSON.stringify( look.chimney ) );
		check( 'page', 'the label "New roof" shows over the scene as a link; a scene without rows has none', look.label && 'New roof' === look.label.text && '#roof' === look.label.href && look.label.shown && look.label.inside && 0 === look.plainLabels, JSON.stringify( look.label ) );
		await p.locator( '[data-id="sc1"] .rf3d-stage' ).screenshot( { path: join( SHOTS, 'parts-page.png' ) } );
		await p.click( '[data-id="sc1"] .rf3d-label' );
		await sleep( 300 );
		check( 'page', 'clicking the label follows its link', p.url().endsWith( '#roof' ), p.url() );
		await ctx.close();

		// ------------------------------------------------------------ the editor
		const ectx = await browser.newContext( { viewport: { width: 1500, height: 950 }, reducedMotion: 'reduce' } );
		const a = await ectx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		const frame = a.frame( { name: 'refraction-preview-iframe' } );
		await frame.waitForFunction( () => document.querySelector( '[data-id="sc2"] .rf3d' )?.rf_build_scene?.parts?.length > 0, null, { timeout: 60000 } ).catch( () => {} );
		await frame.evaluate( () => document.querySelector( '[data-id="sc2"]' ).scrollIntoView( { block: 'center' } ) );
		await frame.waitForFunction( () => document.querySelector( '[data-id="sc2"] .rf3d' )?.rf_build_scene?.parts?.length > 0, null, { timeout: 60000 } );
		await sleep( 1500 );

		// A point on the wall of the plain scene: the screen position of a part's centre.
		const where = await frame.evaluate( () => {
			const sc = document.querySelector( '[data-id="sc2"] .rf3d' ).rf_build_scene;
			const part = sc.parts.find( ( x ) => 'wall-main' === x.name );
			const v = part.mesh.localToWorld( part.center.clone() ).project( sc.camera );
			const r = sc.canvas.getBoundingClientRect();
			return { x: r.left + ( ( v.x + 1 ) / 2 * r.width ), y: r.top + ( ( 1 - v.y ) / 2 * r.height ) };
		} );
		const iframeBox = await a.locator( '#refraction-preview-iframe' ).boundingBox();
		await a.mouse.move( iframeBox.x + where.x, iframeBox.y + where.y );
		await sleep( 600 );
		const hovered = await frame.evaluate( () => document.querySelector( '[data-id="sc2"] .rf3d' ).dataset.rf3dHover );
		check( 'editor', 'pointing at a part in the preview lights it up and names it', !! hovered, String( hovered ) );
		await a.mouse.down();
		await a.mouse.up();
		await sleep( 1500 );
		const opened = await a.evaluate( () => {
			const c = window.refraction.getContainer( 'sc2' );
			const rows = c.settings.get( 'parts' ).models.map( ( r ) => r.get( 'part_match' ) );
			const open = document.querySelector( '.refraction-control-parts .refraction-repeater-row-controls.editable' );
			const match = open?.querySelector( '.refraction-control-part_match input' )?.value;
			return { rows, match, selected: window.refraction.selection.getElements().map( ( x ) => x.id ) };
		} );
		await a.screenshot( { path: join( SHOTS, 'parts-editor.png' ) } );
		check( 'editor', 'clicking it selects the widget, adds a row named after the part and opens it in Content > Parts', 1 === opened.rows.length && opened.rows[ 0 ] === hovered && opened.match === hovered && opened.selected.includes( 'sc2' ), JSON.stringify( opened ) );
		await a.mouse.down();
		await a.mouse.up();
		await sleep( 1200 );
		const again = await a.evaluate( () => window.refraction.getContainer( 'sc2' ).settings.get( 'parts' ).length );
		check( 'editor', 'clicking the same part again opens its row (no second row)', 1 === again, String( again ) );
		// The scene is drawn again after each change: count its parts before.
		await frame.waitForFunction( () => document.querySelector( '[data-id="sc2"] .rf3d' )?.rf_build_scene?.parts?.length > 0, null, { timeout: 60000 } );
		const names = await frame.evaluate( () => document.querySelector( '[data-id="sc2"] .rf3d' ).rf_build_scene.partNames().length );
		await a.evaluate( () => window.refraction.channels.editor.trigger( 'refraction:build-scene:parts', { container: window.refraction.getContainer( 'sc2' ) } ) );
		await sleep( 1200 );
		const all = { rows: await a.evaluate( () => window.refraction.getContainer( 'sc2' ).settings.get( 'parts' ).length ), names };
		check( 'editor', 'Add every part makes one row per part of the model', all.rows === all.names && all.rows > 15, JSON.stringify( all ) );
		await ectx.close();
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall build scene parts checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
