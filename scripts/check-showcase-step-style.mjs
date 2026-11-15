#!/usr/bin/env node
/**
 * Phone Showcase step style and per-part highlighted text (0.102.0, SQLite test site, Chromium).
 * - Each step's "Style Of This Step" (Normal / Hover / Active): background, border, icon / number colors, title / arrow
 *   and description colors; Style > Steps' "Title / Arrow Color" colors the arrow too.
 * - Highlight Words with parts: each part with words gets "Highlighted Text: <part>"; "Same as all highlighted text"
 *   keeps the shared look, "Its own style" gives that part its own fill, mark and colors.
 * In the panel, in Edit Mode and on the page.
 *
 * Usage: node scripts/check-showcase-step-style.mjs [--site /tmp/rf-sss-site] [--port 8939] [--shots /tmp/showcase-style-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';


const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-sss-site' );
const PORT = arg( 'port', '8939' );
const SHOTS = arg( 'shots', '/tmp/showcase-style-shots' );
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


const steps = [
	{ _id: 'st1', title: 'Download the app', text: 'Free on both stores.' },
	{ _id: 'st2', title: 'Book a ride', text: 'Anywhere in the Highlands.', own_bg_normal: '#ffeeee', own_border_normal: '#ff0000', own_title_color_normal: '#00aa00', own_text_color_normal: '#0000aa', own_title_color_active: '#aa00aa', own_bg_active: '#eeffee' },
	{ _id: 'st3', title: 'Choose your car', text: 'Saloon to 16-seater.' },
];

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
		const doc = page( 'Showcase style', [ box( 'top', { flex_direction: 'column' }, [
			{ id: 'ps', elType: 'widget', widgetType: 'refraction-phone-showcase', settings: {
				steps, cards: [], autoplay: '',
				heading: 'Download the SafeKab app', description: 'Free on Google Play. Get home safe with SafeKab.',
				step_title_color_normal: '#123456',
				rf_hl_part_heading: 'Download', rf_hl_heading_style: 'own', rf_hl_heading_fill: 'color', rf_hl_heading_color: '#0000ff', rf_hl_heading_mark: 'underline', rf_hl_heading_mark_color: '#ff0000',
				rf_hl_part_description: 'SafeKab',
				rf_hl_part_step_title: 'ride', rf_hl_step_title_style: 'own', rf_hl_step_title_fill: 'gradient', rf_hl_step_title_ga: '#ff0000', rf_hl_step_title_gb: '#0000ff',
			}, elements: [] },
		] ) ] );

		// What both the page and the editor's preview must show.
		const look = ( target ) => target.evaluate( () => {
			const root = document.querySelector( '[data-id="ps"]' );
			const stepEls = [ ...root.querySelectorAll( '.rf-showcase__step' ) ];
			const step = ( i ) => {
				const s = stepEls[ i ];
				const cs = getComputedStyle( s );
				return { bg: cs.backgroundColor, border: cs.borderTopColor, title: getComputedStyle( s.querySelector( '.rf-showcase__title' ) ).color, arrow: getComputedStyle( s.querySelector( '.rf-showcase__chevron' ) ).color, text: getComputedStyle( s.querySelector( '.rf-showcase__text' ) ).color };
			};
			const mark = ( part ) => {
				const m = root.querySelector( `.${ part } .refraction-heading-dual` );
				if ( ! m ) { return null; }
				const cs = getComputedStyle( m );
				return { image: cs.backgroundImage, color: cs.color, clip: cs.backgroundClip || cs.webkitBackgroundClip, fill: cs.webkitTextFillColor };
			};
			return { st1: step( 0 ), st2: step( 1 ), st3: step( 2 ), heading: mark( 'rf-showcase__heading' ), description: mark( 'rf-showcase__description' ), stepTitle: mark( 'rf-showcase__title' ) };
		} );
		const judge = ( where, l ) => {
			check( where, 'a step\'s own Normal style: pink background, red border, green title and arrow, blue description', 'rgb(255, 238, 238)' === l.st2.bg && 'rgb(255, 0, 0)' === l.st2.border && 'rgb(0, 170, 0)' === l.st2.title && 'rgb(0, 170, 0)' === l.st2.arrow && 'rgb(0, 0, 170)' === l.st2.text, JSON.stringify( l.st2 ) );
			check( where, 'Style > Steps "Title / Arrow Color" colors the title and the arrow of the other steps', 'rgb(18, 52, 86)' === l.st3.title && 'rgb(18, 52, 86)' === l.st3.arrow, JSON.stringify( l.st3 ) );
			check( where, 'Highlighted Text: Heading, own style: blue words over a red underline (no rounded ends)', l.heading && 'rgb(0, 0, 255)' === l.heading.color && l.heading.image.includes( 'rgb(255, 0, 0)' ) && ! l.heading.image.includes( 'radial-gradient' ), JSON.stringify( l.heading ) );
			check( where, 'Highlighted Text: Description, same as all: the shared rounded lime highlighter', l.description && l.description.image.includes( 'radial-gradient' ) && l.description.image.includes( 'rgb(212, 242, 90)' ), JSON.stringify( l.description ) );
			check( where, 'Highlighted Text: Step Titles, own style: a red-to-blue gradient fill of the words', l.stepTitle && 'text' === l.stepTitle.clip && l.stepTitle.image.includes( 'rgb(255, 0, 0)' ) && l.stepTitle.image.includes( 'rgb(0, 0, 255)' ) && 'rgba(0, 0, 0, 0)' === l.stepTitle.fill, JSON.stringify( l.stepTitle ) );
		};

		// ------------------------------------------------------------ on the page
		const ctx = await browser.newContext( { viewport: { width: 1300, height: 900 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await p.goto( doc.url, { waitUntil: 'load', timeout: 120000 } );
		await p.waitForTimeout( 1500 );
		judge( 'page', await look( p ) );
		await p.locator( '[data-id="ps"] .rf-showcase__step >> nth=1' ).click();
		await p.mouse.move( 5, 5 );
		await p.waitForTimeout( 700 );
		const active = ( await look( p ) ).st2;
		check( 'page', 'the step\'s own Active style: green background, purple title and arrow when it is the step shown', 'rgb(238, 255, 238)' === active.bg && 'rgb(170, 0, 170)' === active.title && 'rgb(170, 0, 170)' === active.arrow, JSON.stringify( active ) );
		await p.locator( '[data-id="ps"]' ).screenshot( { path: join( SHOTS, 'page.png' ) } );

		// ------------------------------------------------------------ in the editor
		const a = await ctx.newPage();
		a.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ doc.id }&action=refraction`, { timeout: 120000 } );
		await a.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await a.waitForTimeout( 2500 );
		const frame = a.frames().find( ( f ) => f !== a.mainFrame() && f.url().includes( 'refraction-preview' ) ) || a.frames()[ 1 ];
		judge( 'edit mode', await look( frame ) );

		const edit = async ( tab ) => {
			await a.evaluate( () => $e.run( 'panel/editor/open', { model: refraction.getContainer( 'ps' ).model, view: refraction.getContainer( 'ps' ).view } ) );
			await a.waitForTimeout( 700 );
			await a.locator( `.refraction-panel-navigation-tab:has-text("${ tab }")` ).first().click();
			await a.waitForTimeout( 600 );
		};
		const sections = () => a.evaluate( () => [ ...document.querySelectorAll( '.refraction-control-type-section' ) ].filter( ( s ) => s.offsetParent ).map( ( s ) => s.textContent.trim() ) );

		await edit( 'Content' );
		await a.locator( '.refraction-control-steps .refraction-repeater-fields >> nth=1' ).locator( '.refraction-repeater-row-item-title' ).click();
		await a.waitForTimeout( 800 );
		const row = await a.evaluate( () => {
			const r = document.querySelectorAll( '.refraction-control-steps .refraction-repeater-fields' )[ 1 ];
			return {
				heading: !! [ ...r.querySelectorAll( '.refraction-control-type-heading' ) ].find( ( h ) => /^Style Of This Step$/.test( h.textContent.trim() ) && h.offsetParent ),
				tabs: [ ...r.querySelectorAll( '.refraction-control-type-tab' ) ].filter( ( t ) => t.offsetParent ).map( ( t ) => t.textContent.trim() ).join(),
				labels: [ ...r.querySelectorAll( '.refraction-control-type-color' ) ].filter( ( c ) => c.offsetParent ).map( ( c ) => c.querySelector( '.refraction-control-title' ).textContent.trim() ).filter( ( t ) => 'Screen Background' !== t ),
			};
		} );
		check( 'panel', 'each step has "Style Of This Step" with Normal / Hover / Active and its six colors in order', row.heading && 'Normal,Hover,Active' === row.tabs && row.labels.join( '|' ) === 'Background Color|Border Color|Icon / Number Color|Icon / Number Background|Title / Arrow Color|Description Color', JSON.stringify( row ) );
		await a.locator( '.refraction-control-steps .refraction-repeater-fields >> nth=1' ).locator( '.refraction-control-step_own_heading' ).scrollIntoViewIfNeeded();
		await a.screenshot( { path: join( SHOTS, 'panel-step-style.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );

		await edit( 'Style' );
		const styleSections = await sections();
		check( 'panel', 'Style: "Highlighted Text (All Parts)" and one section per part with words (Heading, Description, Step Titles), none for the empty Label', styleSections.includes( 'Highlighted Text (All Parts)' ) && styleSections.includes( 'Highlighted Text: Heading' ) && styleSections.includes( 'Highlighted Text: Description' ) && styleSections.includes( 'Highlighted Text: Step Titles' ) && ! styleSections.includes( 'Highlighted Text: Label' ), styleSections.join( '|' ) );
		const titleLabel = await a.evaluate( () => {
			const s = document.querySelector( '.refraction-control-section_style_steps' );
			if ( s && ! s.classList.contains( 'e-open' ) ) { s.querySelector( '.refraction-panel-heading' ).click(); }
			return new Promise( ( r ) => setTimeout( () => r( document.querySelector( '.refraction-control-step_title_color_normal .refraction-control-title' )?.textContent.trim() ), 600 ) );
		} );
		check( 'panel', 'Style > Steps reads "Title / Arrow Color"', 'Title / Arrow Color' === titleLabel, titleLabel );

		await a.evaluate( () => {
			const s = document.querySelector( '.refraction-control-section_rf_hl_style_heading' );
			if ( s && ! s.classList.contains( 'e-open' ) ) { s.querySelector( '.refraction-panel-heading' ).click(); }
		} );
		await a.waitForTimeout( 700 );
		const own = await a.evaluate( () => [ 'rf_hl_heading_style', 'rf_hl_heading_fill', 'rf_hl_heading_color', 'rf_hl_heading_mark', 'rf_hl_heading_mark_color', 'rf_hl_heading_mark_height' ].filter( ( n ) => document.querySelector( '.refraction-control-' + n )?.offsetParent ) );
		check( 'panel', 'Highlighted Text: Heading shows its own fill, color, mark and mark settings', 6 === own.length, own.join( '|' ) );
		await a.locator( '.refraction-control-section_rf_hl_style_heading' ).scrollIntoViewIfNeeded();
		await a.screenshot( { path: join( SHOTS, 'panel-highlight-part.png' ), clip: { x: 0, y: 0, width: 420, height: 1000 } } );

		// A change in the panel shows in Edit Mode at once.
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ps' ), settings: { rf_hl_heading_mark: 'block', rf_hl_heading_mark_color: '#00ff00' } } ) );
		await a.waitForTimeout( 1500 );
		const changed = ( await look( frame ) ).heading;
		check( 'edit mode', 'switching the Heading part to a green Background mark shows at once', changed && changed.image.includes( 'rgb(0, 255, 0)' ), JSON.stringify( changed ) );
		await a.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ps' ), settings: { rf_hl_part_label: 'App' } } ) );
		await a.waitForTimeout( 1200 );
		check( 'panel', 'typing words for the Label adds "Highlighted Text: Label"', ( await sections() ).includes( 'Highlighted Text: Label' ) );
		const el = await frame.$( '[data-id="ps"]' );
		if ( el ) { await el.screenshot( { path: join( SHOTS, 'edit-mode.png' ) } ); }

		check( 'errors', 'no script errors', 0 === errors.length, errors.join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse)/.test( l ) );
		check( 'errors', 'no PHP warnings or errors', 0 === php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
