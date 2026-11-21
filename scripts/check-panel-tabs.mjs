#!/usr/bin/env node
/**
 * Settings that appear on a condition inside Normal / Hover tabs (0.118.0, SQLite test site, Chromium). The panel
 * builds hidden settings only when they apply (0.10x speed work); placing a new one next to a tab's own button put it
 * inside the tabs row (Background > Color and Image after choosing Classic, on every widget). Here, for a widget's
 * Advanced > Background (Classic, then Gradient), a container's Style > Background and the Button's background:
 * - no setting sits inside a tabs row (only the tab buttons do);
 * - the settings follow "Background Type" in order, under the open tab;
 * - switching to Hover shows the hover settings and hides the normal ones.
 * And the Showcase Wheel's Motion section shows no label twice.
 *
 * Usage: node scripts/check-panel-tabs.mjs [--site /tmp/rf-tabs-site] [--port 8962] [--shots /tmp/panel-tabs-shots]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-tabs-site' );
const PORT = arg( 'port', '8962' );
const SHOTS = arg( 'shots', '/tmp/panel-tabs-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 600 ) }` }` );
};
const wp = ( args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8' } );

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );

	const pid = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Panel tabs', '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', pid, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_data', JSON.stringify( [ { id: 'pt00001', elType: 'container', settings: {}, elements: [
		{ id: 'pt00002', elType: 'widget', widgetType: 'heading', settings: { title: 'Hello' }, elements: [] },
		{ id: 'pt00003', elType: 'widget', widgetType: 'button', settings: { text: 'Go' }, elements: [] },
		{ id: 'pt00004', elType: 'widget', widgetType: 'refraction-showcase-wheel', settings: {}, elements: [] },
	] } ] ) ] );

	const browser = await chromium.launch( existsSync( '/opt/pw-browsers/chromium' ) ? { executablePath: '/opt/pw-browsers/chromium', args: [ '--no-sandbox' ] } : {} );
	const errors = [];

	try {
		const p = await browser.newPage( { viewport: { width: 1400, height: 1000 } } );
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( `${ BASE }/wp-login.php` );
		await p.fill( '#user_login', 'admin' );
		await p.fill( '#user_pass', 'admin' );
		await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ pid }&action=refraction`, { timeout: 120000 } );
		await p.waitForFunction( () => window.refraction && window.$e && refraction.documents?.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await p.waitForTimeout( 2500 );

		/** Opens an element's panel on a tab and section. */
		const open = ( id, tab, section ) => p.evaluate( async ( [ elId, tabName, sectionName ] ) => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const el = find( refraction.getPreviewContainer() ).find( ( c ) => c.id === elId );
			$e.run( 'panel/editor/open', { model: el.model, view: el.view } );
			await new Promise( ( r ) => setTimeout( r, 500 ) );
			const tabEl = document.querySelector( `#refraction-panel .refraction-tab-control-${ tabName }` );
			( tabEl.querySelector( 'a,button' ) || tabEl ).click();
			await new Promise( ( r ) => setTimeout( r, 500 ) );
			const page = refraction.getPanelView().getCurrentPageView();
			page.activateSection( sectionName );
			page._renderChildren();
			await new Promise( ( r ) => setTimeout( r, 400 ) );
		}, [ id, tab, section ] );

		/** Sets a setting the way the panel does, then reads where the controls sit. */
		const layout = ( id, settings, prefix ) => p.evaluate( async ( [ elId, values, pre ] ) => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const el = find( refraction.getPreviewContainer() ).find( ( c ) => c.id === elId );
			if ( values ) {
				$e.run( 'document/elements/settings', { container: el, settings: values } );
				await new Promise( ( r ) => setTimeout( r, 700 ) );
			}
			const panel = document.querySelector( '#refraction-panel' );
			const inRow = [ ...panel.querySelectorAll( '.refraction-control-type-tabs .refraction-control' ) ].filter( ( c ) => ! c.classList.contains( 'refraction-control-type-tab' ) ).map( ( c ) => ( c.className.match( /refraction-control-([a-z_]+)/ ) || [] )[ 1 ] );
			const order = [ ...panel.querySelectorAll( '.refraction-control' ) ].filter( ( c ) => c.offsetParent && ! c.classList.contains( 'refraction-control-type-section' ) ).map( ( c ) => ( c.className.match( /refraction-control-([a-z_]+)/ ) || [] )[ 1 ] ).filter( ( n ) => n && n.startsWith( pre ) );
			return { inRow, order };
		}, [ id, settings, prefix ] );

		// ------------------------------------------------------------ a widget's Advanced > Background
		await open( 'pt00002', 'advanced', '_section_background' );
		let l = await layout( 'pt00002', { _background_background: 'classic' }, '_background' );
		await p.evaluate( () => document.querySelector( '#refraction-panel .refraction-control-_section_background' ).scrollIntoView() );
		await p.waitForTimeout( 300 );
		await p.screenshot( { path: join( SHOTS, 'widget-classic-panel.png' ), clip: { x: 0, y: 40, width: 300, height: 520 } } );
		check( 'widget background', 'Classic: Color and Image come after "Background Type", none inside the Normal / Hover row', 0 === l.inRow.length && l.order.indexOf( '_background_background' ) < l.order.indexOf( '_background_color' ) && l.order.includes( '_background_image' ), JSON.stringify( l ) );
		l = await layout( 'pt00002', { _background_background: 'gradient' }, '_background' );
		check( 'widget background', 'Gradient: its colors and stops come after "Background Type", none inside the row', 0 === l.inRow.length && l.order.indexOf( '_background_background' ) < l.order.indexOf( '_background_color_b' ), JSON.stringify( l ) );
		await p.evaluate( () => document.querySelector( '#refraction-panel .refraction-control-_section_background' ).scrollIntoView() );
		await p.waitForTimeout( 300 );
		await p.screenshot( { path: join( SHOTS, 'widget-gradient-panel.png' ), clip: { x: 0, y: 40, width: 300, height: 700 } } );
		await p.click( '#refraction-panel .refraction-control-_tab_background_hover' );
		await p.waitForTimeout( 400 );
		l = await layout( 'pt00002', { _background_hover_background: 'classic' }, '_background' );
		check( 'widget background', 'on Hover, its Classic settings show (after its type) and the normal ones are hidden', 0 === l.inRow.length && l.order.includes( '_background_hover_color' ) && ! l.order.includes( '_background_color_b' ), JSON.stringify( l ) );

		// ------------------------------------------------------------ a container's Style > Background
		await open( 'pt00001', 'style', 'section_background' );
		l = await layout( 'pt00001', { background_background: 'gradient' }, 'background' );
		check( 'container background', 'Gradient on a container: nothing inside the row, its settings in order', 0 === l.inRow.length && l.order.indexOf( 'background_background' ) < l.order.indexOf( 'background_color_b' ), JSON.stringify( l ) );

		// ------------------------------------------------------------ the Button's background (Normal / Hover inside Style)
		await open( 'pt00003', 'style', 'section_style' );
		l = await layout( 'pt00003', { background_background: 'gradient' }, 'background' );
		check( 'button', 'the Button\'s background gradient: nothing inside its Normal / Hover row', 0 === l.inRow.length && l.order.includes( 'background_color_b' ), JSON.stringify( l ) );

		// ------------------------------------------------------------ Showcase Wheel: no label twice in Motion
		await open( 'pt00004', 'content', 'section_motion' );
		// The section is long, so the panel splits it into groups at its headings ("General", "The content coming in"),
		// one open at a time: read every group.
		const labels = await p.evaluate( async () => {
			const seen = [];
			const read = () => [ ...document.querySelectorAll( '#refraction-panel .refraction-control' ) ].filter( ( c ) => c.offsetParent && ! c.classList.contains( 'refraction-control-type-section' ) && ! c.classList.contains( 'refraction-control-type-heading' ) ).map( ( c ) => ( c.querySelector( '.refraction-control-title' ) || {} ).textContent?.trim() ).filter( Boolean );
			const heads = document.querySelectorAll( '#refraction-panel .rf-acc__head' ).length;
			for ( let i = 0; i < Math.max( 1, heads ); i++ ) {
				const head = document.querySelectorAll( '#refraction-panel .rf-acc__head' )[ i ];
				if ( head && 'true' !== head.getAttribute( 'aria-expanded' ) ) {
					head.click();
					await new Promise( ( r ) => setTimeout( r, 250 ) );
				}
				read().forEach( ( x ) => ! seen.includes( '\u0000' + x ) && seen.push( x ) );
			}
			return seen;
		} );
		const twice = labels.filter( ( x, i ) => labels.indexOf( x ) !== i );
		check( 'showcase wheel', 'its Motion section shows each label once (slide change and content duration and easing named apart)', labels.length > 8 && 0 === twice.length, JSON.stringify( { twice, labels } ) );

		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall panel tab checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
