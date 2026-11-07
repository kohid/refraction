#!/usr/bin/env node
/**
 * Interactions (modules/interactions) and the new Reveal effects (SQLite test site, Chromium):
 * - Marquee: runs without a seam (copies fill the row, the loop is one group long), two rows going opposite ways,
 *   outlined words, pauses on hover, speeds up with the scroll, no sideways page scroll even tilted; with reduced
 *   motion it does not run and its items wrap; screen readers get the items once; the editor preview runs it.
 * - Reveal: Wipe up (clip) and Light up from faint (text word by word).
 * - Site cursor (Site Settings > Motion & Cursor): follows the pointer, grows over links, shows an element's Cursor
 *   Word, steps aside where asked, hides the usual cursor; none for touch.
 * - Magnetic: the inside of an element moves towards the pointer and springs back.
 * - Page transitions: the view transition CSS is printed and a link to another page of the site plays one.
 *
 * Usage: node scripts/check-interactions.mjs [--site /tmp/rf-ix-site] [--port 9220] [--shots /tmp/interactions-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ix-site' );
const PORT = arg( 'port', '9220' );
const SHOTS = arg( 'shots', '/tmp/interactions-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
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

function page( title, widgets ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	const data = [ { id: `c${ id }`.slice( 0, 7 ), elType: 'container', isInner: false, settings: {}, elements: widgets } ];
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

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
	const watch = ( p ) => p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && errors.push( `${ e.message } @ ${ p.url() }` ) );
	const at = async ( url, width, height = 800 ) => {
		const p = await ( await browser.newContext( { viewport: { width, height } } ) ).newPage();
		watch( p );
		await p.goto( url );
		return p;
	};

	const w = ( id, widgetType, settings ) => ( { id, elType: 'widget', widgetType, settings, elements: [] } );
	const kit = ( settings ) => wp( [ 'eval', `$k = \\Refraction\\Plugin::$instance->kits_manager->get_active_kit(); $k->update_settings( array_merge( (array) $k->get_settings(), json_decode( '${ JSON.stringify( settings ) }', true ) ) ); \\Refraction\\Plugin::$instance->files_manager->clear_cache();` ] );
	const items = [
		{ _id: 'i1', type: 'text', text: 'Airport transfers' },
		{ _id: 'i2', type: 'text', text: 'Highland tours', outline: 'yes' },
		{ _id: 'i3', type: 'text', text: 'Corporate travel', link: { url: '#corporate' } },
		{ _id: 'i4', type: 'icon', icon: { value: 'fas fa-car', library: 'fa-solid' }, label: 'Taxi' },
	];

	try {
		kit( { rf_cursor: '', rf_transition: '' } );
		const other = page( 'Second page', [ w( 'h0', 'heading', { title: 'The second page' } ) ] );
		const p1 = page( 'Interactions', [
			w( 'mq01', 'refraction-marquee', { items, rows: '2', speed: { size: 80 }, scroll: 'boost', tilt: { size: -3 }, text_color: '#1B3A2F', band_bg: '#E9F1EC' } ),
			w( 'bt01', 'button', { text: 'Book a taxi', link: { url: '#book' }, rf_magnetic: 'yes', rf_magnetic_strength: { size: 0.5 }, rf_magnetic_area: { size: 60 } } ),
			w( 'im01', 'image', { image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` }, rf_cursor_label: 'View', rf_reveal: 'wipe-up' } ),
			w( 'hd01', 'heading', { title: 'Every journey is planned around you, from the airport to the glens', rf_reveal_text: 'words', rf_reveal_text_effect: 'dim', rf_reveal_stagger: 40 } ),
			w( 'tx01', 'text-editor', { editor: '<p>A map would go here.</p>', rf_cursor_hide: 'yes' } ),
			w( 'ln01', 'text-editor', { editor: `<p><a id="to-other" href="${ other.url }">Go to the second page</a></p>` } ),
			w( 'sp01', 'spacer', { space: { unit: 'px', size: 900 } } ),
		] );

		// ------------------------------------------------------------ marquee
		const b = await at( p1.url, 1280, 900 );
		await sleep( 1200 );
		const mq = await b.evaluate( () => {
			const el = document.querySelector( '[data-id="mq01"] .rf-marquee' );
			const rows = [ ...el.querySelectorAll( '.rf-marquee__row' ) ];
			const track = rows[ 0 ].querySelector( '.rf-marquee__track' );
			const group = track.querySelector( '.rf-marquee__group' );
			const anims = rows.map( ( r ) => r.querySelector( '.rf-marquee__track' ).getAnimations()[ 0 ] );
			const outline = el.querySelector( '.rf-marquee__item--outline' );
			return {
				running: el.classList.contains( 'is-running' ),
				groups: track.querySelectorAll( '.rf-marquee__group' ).length,
				filled: track.getBoundingClientRect().width >= rows[ 0 ].getBoundingClientRect().width * 2,
				shift: parseFloat( track.style.getPropertyValue( '--rf-mq-shift' ) ) + group.getBoundingClientRect().width,
				copiesHidden: [ ...track.querySelectorAll( '.rf-marquee__group[data-copy]' ) ].every( ( g ) => 'true' === g.getAttribute( 'aria-hidden' ) && g.hasAttribute( 'inert' ) ),
				row2Hidden: 'true' === rows[ 1 ].getAttribute( 'aria-hidden' ),
				dirs: anims.map( ( a ) => a && a.effect.getComputedTiming().direction ),
				playing: anims.every( ( a ) => a && 'running' === a.playState ),
				outline: outline && [ getComputedStyle( outline ).color, getComputedStyle( outline ).webkitTextStrokeWidth ],
				sideways: document.documentElement.scrollWidth > window.innerWidth,
				readable: document.querySelectorAll( '[data-id="mq01"] .rf-marquee__item:not([data-copy] *):not([aria-hidden="true"] *)' ).length,
			};
		} );
		check( 'marquee', 'runs: the row is filled with copies (twice its width) and loops over exactly one group', mq.running && mq.groups > 1 && mq.filled && Math.abs( mq.shift ) < 1 && mq.playing, JSON.stringify( mq ) );
		check( 'marquee', 'two rows going opposite ways', 'normal' === mq.dirs[ 0 ] && 'reverse' === mq.dirs[ 1 ], JSON.stringify( mq.dirs ) );
		check( 'marquee', 'screen readers get the items once (copies and the second row are hidden and inert)', mq.copiesHidden && mq.row2Hidden && 4 === mq.readable, JSON.stringify( mq ) );
		check( 'marquee', 'outlined words are hollow', 'rgba(0, 0, 0, 0)' === mq.outline?.[ 0 ] && '1px' === mq.outline?.[ 1 ], JSON.stringify( mq.outline ) );
		check( 'marquee', 'tilted, yet the page does not scroll sideways', ! mq.sideways );
		const x1 = await b.evaluate( () => new DOMMatrix( getComputedStyle( document.querySelector( '[data-id="mq01"] .rf-marquee__track' ) ).transform ).m41 );
		await sleep( 500 );
		const x2 = await b.evaluate( () => new DOMMatrix( getComputedStyle( document.querySelector( '[data-id="mq01"] .rf-marquee__track' ) ).transform ).m41 );
		check( 'marquee', 'moves to the left at about its speed (80 px/s)', x2 < x1 && Math.abs( ( x1 - x2 ) - 40 ) < 20, `${ x1 } -> ${ x2 }` );
		await b.locator( '[data-id="mq01"] .rf-marquee' ).screenshot( { path: join( SHOTS, 'marquee.png' ) } );
		await b.hover( '[data-id="mq01"] .rf-marquee__row' );
		await sleep( 200 );
		const paused = await b.evaluate( () => document.querySelector( '[data-id="mq01"] .rf-marquee__track' ).getAnimations()[ 0 ].playState );
		check( 'marquee', 'pauses on hover', 'paused' === paused, paused );
		await b.mouse.move( 5, 880 );
		const rates = await b.evaluate( async () => {
			const anim = document.querySelector( '[data-id="mq01"] .rf-marquee__track' ).getAnimations()[ 0 ];
			const seen = [];
			for ( let i = 0; i < 8; i++ ) {
				window.scrollBy( 0, 40 );
				await new Promise( ( r ) => requestAnimationFrame( r ) );
				seen.push( anim.playbackRate );
			}
			await new Promise( ( r ) => setTimeout( r, 1500 ) );
			return { peak: Math.max( ...seen ), after: anim.playbackRate };
		} );
		check( 'marquee', 'speeds up while the page scrolls, then eases back', rates.peak > 1.6 && rates.after < 1.2, JSON.stringify( rates ) );
		await b.evaluate( () => window.scrollTo( 0, 0 ) );

		// ------------------------------------------------------------ reveal: wipe and light up
		await b.locator( '[data-id="im01"]' ).scrollIntoViewIfNeeded();
		await sleep( 1500 );
		const wipe = await b.evaluate( () => {
			const el = document.querySelector( '[data-id="im01"]' ); return { fx: el.querySelector( '[data-rf-rv-fx="wipe-up"]' ) ? 'piece' : el.getAttribute( 'data-rf-rv-fx' ), clip: getComputedStyle( el.querySelector( '[data-rf-rv-fx]' ) || el ).clipPath };
		} );
		check( 'reveal', 'Wipe up uncovers the image fully once in view', ( 'wipe-up' === wipe.fx || 'piece' === wipe.fx ) && /^(none|inset\(0(%|px)?( 0(%|px)?)*\))$/.test( wipe.clip ), JSON.stringify( wipe ) );
		await b.locator( '[data-id="hd01"]' ).scrollIntoViewIfNeeded();
		await sleep( 2500 );
		const dim = await b.evaluate( () => {
			const words = [ ...document.querySelectorAll( '[data-id="hd01"] [data-rf-rv-fx="dim"]' ) ]; return { n: words.length, opacities: [ ...new Set( words.map( ( x ) => getComputedStyle( x ).opacity ) ) ] };
		} );
		check( 'reveal', 'Light up from faint: the heading word by word, all lit at the end', dim.n > 8 && 1 === dim.opacities.length && '1' === dim.opacities[ 0 ], JSON.stringify( dim ) );
		await b.context().close();

		// Reduced motion: the marquee stands still and wraps.
		const rctx = await browser.newContext( { viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' } );
		const r = await rctx.newPage();
		watch( r );
		await r.goto( p1.url );
		await sleep( 800 );
		const still = await r.evaluate( () => {
			const el = document.querySelector( '[data-id="mq01"] .rf-marquee' ); return { running: el.classList.contains( 'is-running' ), copies: el.querySelectorAll( '[data-copy]' ).length, wraps: 'wrap' === getComputedStyle( el.querySelector( '.rf-marquee__group' ) ).flexWrap, sideways: document.documentElement.scrollWidth > window.innerWidth };
		} );
		check( 'marquee', 'reduced motion: it stands still, no copies, its items wrap', ! still.running && 0 === still.copies && still.wraps && ! still.sideways, JSON.stringify( still ) );
		await rctx.close();

		// ------------------------------------------------------------ magnetic (no site cursor yet)
		const m = await at( p1.url, 1280, 900 );
		await sleep( 600 );
		const mbox = await m.locator( '[data-id="bt01"]' ).boundingBox();
		const inner = () => m.evaluate( () => {
			const t = getComputedStyle( document.querySelector( '[data-id="bt01"] > *' ) ).translate; const v = 'none' === t ? [ 0, 0 ] : t.split( ' ' ).map( parseFloat ); return [ v[ 0 ] || 0, v[ 1 ] || 0 ];
		} );
		await m.mouse.move( mbox.x + ( mbox.width / 2 ), mbox.y + ( mbox.height / 2 ) );
		await m.mouse.move( mbox.x + mbox.width + 30, mbox.y + ( mbox.height / 2 ) + 10, { steps: 4 } );
		await sleep( 700 );
		const pulled = await inner();
		check( 'magnetic', 'the button moves towards a pointer just outside it', pulled[ 0 ] > 10 && pulled[ 1 ] > 0, JSON.stringify( pulled ) );
		await m.mouse.move( 5, 5, { steps: 3 } );
		await sleep( 900 );
		const back = await inner();
		check( 'magnetic', 'and springs back when the pointer leaves', Math.abs( back[ 0 ] ) < 1 && Math.abs( back[ 1 ] ) < 1, JSON.stringify( back ) );
		const noCursor = await m.evaluate( () => ! document.querySelector( '.rf-cursor' ) && ! document.getElementById( 'rf-page-transition' ) );
		check( 'site', 'no site cursor and no page transition until switched on', noCursor );
		await m.context().close();

		// ------------------------------------------------------------ site cursor and page transitions
		kit( { rf_cursor: 'dot-ring', rf_cursor_color: '#1B3A2F', rf_cursor_hide_system: 'yes', rf_transition: 'slide', rf_transition_duration: { size: 500 } } );
		const c = await at( p1.url, 1280, 900 );
		await sleep( 600 );
		const cur = () => c.evaluate( () => {
			const el = document.querySelector( '.rf-cursor' ); const dot = el.querySelector( '.rf-cursor__dot' ).getBoundingClientRect(); const ring = el.querySelector( '.rf-cursor__ring' ).getBoundingClientRect(); return { cls: el.className, dot: [ Math.round( dot.x + ( dot.width / 2 ) ), Math.round( dot.y + ( dot.height / 2 ) ) ], ring: Math.round( ring.width ), label: el.querySelector( '.rf-cursor__label' ).textContent, opacity: getComputedStyle( el ).opacity, system: getComputedStyle( document.body ).cursor };
		} );
		await c.locator( '[data-id="sp01"]' ).scrollIntoViewIfNeeded();
		const sbox = await c.locator( '[data-id="sp01"]' ).boundingBox();
		const [ px, py ] = [ Math.round( sbox.x + ( sbox.width / 2 ) ), Math.round( Math.min( sbox.y + 200, 850 ) ) ];
		await c.mouse.move( px, py, { steps: 3 } );
		await sleep( 500 );
		let cs = await cur();
		check( 'cursor', 'the site cursor follows the pointer (the dot on it), the usual cursor hidden', /is-on/.test( cs.cls ) && ! /has-label|is-link/.test( cs.cls ) && Math.abs( cs.dot[ 0 ] - px ) < 3 && Math.abs( cs.dot[ 1 ] - py ) < 3 && 'none' === cs.system && 36 === cs.ring, JSON.stringify( cs ) );
		await c.evaluate( () => window.scrollTo( 0, 0 ) );
		await sleep( 300 );
		const bbox = await c.locator( '[data-id="bt01"] a' ).boundingBox();
		await c.mouse.move( bbox.x + 10, bbox.y + 10, { steps: 3 } );
		await sleep( 500 );
		cs = await cur();
		check( 'cursor', 'it grows over a link or button', /is-link/.test( cs.cls ) && cs.ring > 50, JSON.stringify( cs ) );
		await c.locator( '[data-id="im01"]' ).scrollIntoViewIfNeeded();
		const ibox = await c.locator( '[data-id="im01"] img' ).boundingBox();
		await c.mouse.move( ibox.x + ( ibox.width / 2 ), ibox.y + ( ibox.height / 2 ), { steps: 3 } );
		await sleep( 500 );
		cs = await cur();
		check( 'cursor', 'over an element with a Cursor Word it becomes a disc with the word', /has-label/.test( cs.cls ) && 'View' === cs.label && cs.ring > 80, JSON.stringify( cs ) );
		await c.screenshot( { path: join( SHOTS, 'cursor-label.png' ), clip: { x: Math.max( 0, ibox.x - 120 ), y: Math.max( 0, ibox.y - 60 ), width: ibox.width + 240, height: ibox.height + 120 } } );
		await c.locator( '[data-id="tx01"]' ).scrollIntoViewIfNeeded();
		const tbox = await c.locator( '[data-id="tx01"] p' ).boundingBox();
		await c.mouse.move( tbox.x + 20, tbox.y + 5, { steps: 3 } );
		await sleep( 400 );
		cs = await cur();
		const sysHere = await c.evaluate( () => getComputedStyle( document.querySelector( '[data-id="tx01"] p' ) ).cursor );
		check( 'cursor', 'it steps aside over "No Site Cursor Here" (the usual cursor comes back)', '0' === cs.opacity && 'none' !== sysHere, JSON.stringify( [ cs.opacity, sysHere ] ) );
		const head = await c.evaluate( () => document.getElementById( 'rf-page-transition' )?.textContent || '' );
		check( 'transitions', 'the page transition CSS is in the head (slide, 500 ms, off for reduced motion)', /@view-transition\{navigation:auto\}/.test( head ) && /500ms/.test( head ) && /rf-vt-in/.test( head ) && /prefers-reduced-motion/.test( head ), head.slice( 0, 200 ) );
		await c.context().close();

		// A link to another page of the site plays a view transition (Chromium supports cross-document ones).
		const vctx = await browser.newContext( { viewport: { width: 1280, height: 900 } } );
		await vctx.addInitScript( () => window.addEventListener( 'pagereveal', ( e ) => {
			window.__rfVt = !! e.viewTransition;
		} ) );
		const v = await vctx.newPage();
		watch( v );
		await v.goto( p1.url );
		await sleep( 500 );
		await Promise.all( [ v.waitForURL( new RegExp( `page_id=${ other.id }` ) ), v.click( '#to-other' ) ] );
		await sleep( 800 );
		const vt = await v.evaluate( () => window.__rfVt );
		check( 'transitions', 'following a link to another page plays a view transition', true === vt, String( vt ) );
		await vctx.close();

		// Touch: no site cursor.
		const tctx = await browser.newContext( { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } );
		const t = await tctx.newPage();
		watch( t );
		await t.goto( p1.url );
		await sleep( 600 );
		const touch = await t.evaluate( () => ( { cursor: !! document.querySelector( '.rf-cursor' ), sideways: document.documentElement.scrollWidth > window.innerWidth } ) );
		check( 'cursor', 'a touch screen keeps its own (no site cursor); the marquee does not scroll the phone sideways', ! touch.cursor && ! touch.sideways, JSON.stringify( touch ) );
		await t.locator( '[data-id="mq01"]' ).screenshot( { path: join( SHOTS, 'marquee-phone.png' ) } );
		await tctx.close();

		// ------------------------------------------------------------ editor
		const ectx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ectx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p1.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const ed = await frame.evaluate( () => ( { running: !! document.querySelector( '[data-id="mq01"] .rf-marquee.is-running' ), cursor: !! document.querySelector( '.rf-cursor' ) } ) );
		const controls = await e.evaluate( () => {
			const mqc = window.refraction.widgetsCache[ 'refraction-marquee' ]?.controls || {};
			const btn = window.refraction.widgetsCache.button?.controls || {};
			return { marquee: [ 'items', 'direction', 'speed', 'rows', 'scroll', 'pause', 'tilt', 'fade' ].every( ( k ) => mqc[ k ] ), interactions: [ 'rf_magnetic', 'rf_cursor_label', 'rf_cursor_hide' ].every( ( k ) => btn[ k ] ), wipe: !! btn.rf_reveal?.options?.[ 'wipe-up' ] && !! btn.rf_reveal_text_effect?.options?.dim };
		} );
		check( 'editor', 'the Marquee runs in the preview; no site cursor in the editor', ed.running && ! ed.cursor, JSON.stringify( ed ) );
		check( 'editor', 'the Marquee, Interactions and the new Reveal effects are in the panel', controls.marquee && controls.interactions && controls.wipe, JSON.stringify( controls ) );
		await ectx.close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 700 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall interactions checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
