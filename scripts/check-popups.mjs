#!/usr/bin/env node
/**
 * Popups check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-popups.mjs [--site /tmp/rf-popups-site] [--port 8871] [--shots /tmp/popups-shots]
 *                                      [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip); the site is changed (content,
 * active theme), use a throw-away site. Classic/block themes missing from the site are downloaded from wordpress.org.
 *
 * Covers, in a classic theme (everything) and a block theme (core flows):
 *   - nothing is printed on pages without a match; drafts are never printed; the popup runtime is only loaded when needed;
 *   - every trigger with real input: page load, delay, scroll (percent and element), scroll back up, click, hash links
 *     (Popup dynamic tag, toggle), exit intent (mouse and touch back button), inactivity, page views, JS event and API;
 *   - closing: button, overlay, Escape, auto close, settings that disable them, focus trap, focus return, scroll lock;
 *   - frequency rules across reloads (once, every N, session, day, "do not show again"), cookie fallback;
 *   - display conditions (include/exclude, post types, search), audience (guest, logged in, role), devices, referrer,
 *     URL parameter, schedule, queue with priority, stacking and nested popups;
 *   - a Form inside a popup (closes it, stays dismissed) and a Form action that opens a popup;
 *   - animations and prefers-reduced-motion, accessibility attributes, hostile settings are escaped;
 *   - the editor: popup preview canvas, settings, live CSS, save, front end result; Theme Builder tab;
 *   - no PHP errors in the debug log, no JS console errors.
 */
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-popups-site' );
const PORT = arg( 'port', '8871' );
const SHOTS = arg( 'shots', '/tmp/popups-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/popups-seed.php' );
const CLASSIC = new Set( [ 'twentytwentyone', 'twentytwenty', 'twentynineteen' ] );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 400 ) }` }` );
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

function wp( args, env = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

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
	const consoleErrors = [];
	const watch = ( page, label = 'page' ) => {
		page.on( 'console', ( m ) => {
			if ( m.type() === 'error' && ! /favicon\.ico/.test( m.location().url ) && ! /Transition was skipped/.test( m.text() ) && ! /status of 40[34]/.test( m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
		} );
		page.on( 'pageerror', ( e ) => ! /Transition was skipped/.test( e.message ) && consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
	};

	try {
		const installed = new Set( wp( [ 'theme', 'list', '--field=name' ] ).split( '\n' ) );
		const themes = [];
		for ( const t of THEMES ) {
			if ( ! installed.has( t ) ) {
				try { wp( [ 'theme', 'install', t ] ); installed.add( t ); } catch { console.log( `note: theme ${ t } is not installed and could not be downloaded; skipped` ); continue; }
			}
			themes.push( t );
		}
		check( 'setup', 'a classic and a block theme are available', themes.some( ( t ) => CLASSIC.has( t ) ) && themes.some( ( t ) => ! CLASSIC.has( t ) ), themes.join( ',' ) );

		wp( [ 'plugin', 'activate', 'refraction' ] );
		wp( [ 'rewrite', 'structure', '' ] );
		const out = wp( [ 'eval-file', SEED ] );
		const seed = JSON.parse( out.slice( out.indexOf( '{' ) ) );
		const P = seed.popups;
		const pageUrl = ( slug ) => `${ BASE }/?page_id=${ seed.pages[ slug ] }`;
		const sel = ( name ) => `#refraction-popup-${ P[ name ] }`;

		// ------------------------------------------------------------------------------------------------ helpers
		const visitor = async ( opts = {} ) => {
			const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 }, ...opts } );
			const page = await ctx.newPage();
			watch( page, 'visitor' );
			return { ctx, page };
		};
		const isOpen = ( page, name ) => page.locator( `${ sel( name ) }.is-open` ).count().then( ( n ) => n === 1 );
		const waitOpen = async ( page, name, timeout = 6000 ) => {
			try { await page.waitForSelector( `${ sel( name ) }.is-open`, { timeout } ); return true; } catch { return false; }
		};
		const waitClosed = async ( page, name, timeout = 4000 ) => {
			try { await page.waitForSelector( `${ sel( name ) }[hidden]`, { state: 'attached', timeout } ); return true; } catch { return false; }
		};
		const staysClosed = async ( page, name, ms = 1500 ) => { await sleep( ms ); return ! ( await isOpen( page, name ) ); };
		const html = async ( url, ctx ) => ( ctx ? ( await ctx.request.get( url ) ).text() : ( await fetch( url ) ).text() );
		const has = ( text, name ) => text.includes( `id="refraction-popup-${ P[ name ] }"` );
		const wheel = async ( page, dy ) => { await page.mouse.move( 640, 400 ); await page.mouse.wheel( 0, dy ); await sleep( 250 ); };
		const active = ( page ) => page.evaluate( () => ( document.activeElement ? ( document.activeElement.id || document.activeElement.className || document.activeElement.tagName ) : '' ) );
		const login = async ( user, pass ) => {
			const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
			const page = await ctx.newPage();
			watch( page, user );
			await page.goto( `${ BASE }/wp-login.php` );
			await page.fill( '#user_login', user );
			await page.fill( '#user_pass', pass );
			await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );
			return { ctx, page };
		};

		// ------------------------------------------------------------------------------------------------ server side
		console.log( '\n== server side ==' );
		wp( [ 'theme', 'activate', themes.find( ( t ) => CLASSIC.has( t ) ) || themes[ 0 ] ] );
		const none = await html( pageUrl( 'pp-none' ) );
		check( 'server', 'a page without a matching popup prints no popup markup', ! /class="refraction-popup[ "]/.test( none ) && ! none.includes( 'data-rp-config' ) );
		check( 'server', 'a page without a matching popup loads no popup script or style', ! none.includes( 'popups-frontend' ) && ! none.includes( 'refractionPopups' ) );
		const loadHtml = await html( pageUrl( 'pp-load' ) );
		check( 'server', 'the matching popup is printed once, hidden, with its content in a template', ( loadHtml.match( new RegExp( `id="refraction-popup-${ P.load }"`, 'g' ) ) || [] ).length === 1 && /id="refraction-popup-\d+"[^>]* hidden>/.test( loadHtml ) && /<template data-rp-template>[\s\S]*Popup load/.test( loadHtml ) );
		check( 'server', 'the popup script and style are loaded on that page', loadHtml.includes( 'popups-frontend' ) && loadHtml.includes( 'refractionPopups' ) );
		check( 'server', 'a draft popup is never printed', ! has( loadHtml, 'draft' ) );
		check( 'server', 'the popup widgets are not in the page markup outside the template', ! /<\/template>[\s\S]*Popup load/.test( loadHtml.split( `id="refraction-popup-${ P.load }"` )[ 1 ] || '' ) );
		check( 'server', 'conditions: post A gets the popup, post B (excluded) does not', has( await html( `${ BASE }/?p=${ seed.posts.a }` ), 'cond' ) && ! has( await html( `${ BASE }/?p=${ seed.posts.b }` ), 'cond' ) );
		check( 'server', 'conditions: a page does not get the post popup', ! has( loadHtml, 'cond' ) );
		check( 'server', 'conditions: search results get the search popup, other pages do not', has( await html( `${ BASE }/?s=hello` ), 'search' ) && ! has( loadHtml, 'search' ) );
		const aud = pageUrl( 'pp-aud' );
		const guestHtml = await html( aud );
		const admin = await login( 'admin', 'admin' );
		const editor = await login( 'editor', 'editor' );
		const adminHtml = await html( aud, admin.ctx );
		const editorHtml = await html( aud, editor.ctx );
		check( 'server', 'audience: a guest gets only the logged out popup', has( guestHtml, 'aud_out' ) && ! has( guestHtml, 'aud_in' ) && ! has( guestHtml, 'aud_editor' ) );
		check( 'server', 'audience: an administrator gets the logged in popup only', has( adminHtml, 'aud_in' ) && ! has( adminHtml, 'aud_out' ) && ! has( adminHtml, 'aud_editor' ) );
		check( 'server', 'audience: an editor also gets the editor role popup', has( editorHtml, 'aud_in' ) && has( editorHtml, 'aud_editor' ) && ! has( editorHtml, 'aud_out' ) );
		const sched = await html( pageUrl( 'pp-sched' ) );
		check( 'server', 'schedule: an ended and a not yet started popup are not printed', ! has( sched, 'sched_expired' ) && ! has( sched, 'sched_future' ) );
		check( 'server', 'schedule: daily-hours popups are printed (the browser decides)', has( sched, 'sched_hours_in' ) && has( sched, 'sched_hours_out' ) );
		const xss = await html( pageUrl( 'pp-xss' ) );
		check( 'server', 'hostile titles and selectors are escaped', ! xss.includes( '<script>window.__xss' ) && ! xss.includes( '<img src=x onerror' ) && has( xss, 'xss' ) );
		check( 'server', 'the config attribute is valid JSON', ( () => { const m = /data-rp-config="([^"]*)"/.exec( loadHtml ); if ( ! m ) { return false; } try { const c = JSON.parse( m[ 1 ].replace( /&quot;/g, '"' ).replace( /&#039;/g, "'" ).replace( /&amp;/g, '&' ) ); return c.id === P.load && c.triggers.load.delay === 0 && c.display.esc_close === true; } catch { return false; } } )() );
		const popupView = await html( `${ BASE }/?p=${ P.load }&post_type=refraction_library`, admin.ctx );
		check( 'server', 'a popup opened on its own shows the popup preview, not a live popup', popupView.includes( 'is-preview' ) && ! popupView.includes( 'data-rp-config' ) && popupView.includes( 'Popup load' ), popupView.slice( 0, 200 ) );

		// ------------------------------------------------------------------------------------------------ browser, per theme
		for ( const theme of themes ) {
			const full = CLASSIC.has( theme ) || themes.length === 1;
			const T = `${ theme }`;
			console.log( `\n== browser: ${ theme } (${ full ? 'full' : 'core flows' }) ==` );
			wp( [ 'theme', 'activate', theme ] );

			// load, attributes, closing
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-load' ) );
				check( T, 'page load: the popup opens', await waitOpen( page, 'load' ) );
				const attrs = await page.evaluate( ( s ) => {
					const root = document.querySelector( s ); const box = root.querySelector( '.refraction-popup__box' );
					const label = box.getAttribute( 'aria-labelledby' );
					const h = label ? document.getElementById( label ) : null;
					return { role: box.getAttribute( 'role' ), modal: box.getAttribute( 'aria-modal' ), heading: h ? h.textContent.trim() : null, focus: document.activeElement === box, lock: document.documentElement.classList.contains( 'refraction-popup-lock' ), content: box.querySelector( '[data-rp-content]' ).textContent.includes( 'Body of load' ), rect: box.getBoundingClientRect().toJSON(), vw: innerWidth, z: root.style.zIndex };
				}, sel( 'load' ) );
				check( T, 'a11y: role dialog, aria-modal and labelled by the heading', attrs.role === 'dialog' && attrs.modal === 'true' && attrs.heading === 'Popup load', JSON.stringify( attrs ) );
				check( T, 'a11y: focus moves into the dialog', attrs.focus );
				check( T, 'the widgets render into the dialog on open', attrs.content );
				check( T, 'the page scroll is locked while open', attrs.lock );
				check( T, 'the box is centred', Math.abs( attrs.rect.x + attrs.rect.width / 2 - attrs.vw / 2 ) < 20 && attrs.rect.width > 300, JSON.stringify( attrs.rect ) );
				await page.screenshot( { path: join( SHOTS, `${ theme }-popup-open.png` ) } );
				await page.click( `${ sel( 'load' ) } .refraction-popup__close` );
				check( T, 'closing: the close button closes it', await waitClosed( page, 'load' ) );
				check( T, 'closing: the scroll lock is released', ! ( await page.evaluate( () => document.documentElement.classList.contains( 'refraction-popup-lock' ) ) ) );

				await page.reload();
				await waitOpen( page, 'load' );
				await page.mouse.click( 4, 4 );
				check( T, 'closing: a click on the overlay closes it', await waitClosed( page, 'load' ) );
				await page.reload();
				await waitOpen( page, 'load' );
				await page.keyboard.press( 'Escape' );
				check( T, 'closing: Escape closes it', await waitClosed( page, 'load' ) );
				await ctx.close();
			}

			// conditions in the browser
			{
				const { ctx, page } = await visitor();
				await page.goto( `${ BASE }/?p=${ seed.posts.a }` );
				check( T, 'conditions: the post popup opens on post A', await waitOpen( page, 'cond' ) );
				await page.goto( `${ BASE }/?p=${ seed.posts.b }` );
				check( T, 'conditions: and nowhere on post B', ( await page.locator( '.refraction-popup[data-rp]' ).count() ) === 0 );
				await ctx.close();
			}

			// form in a popup
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-form' ) );
				check( T, 'form popup: opens', await waitOpen( page, 'formpop' ) );
				await page.fill( `${ sel( 'formpop' ) } input[name="form_fields[name]"]`, 'Pat Tester' );
				await page.fill( `${ sel( 'formpop' ) } input[name="form_fields[email]"]`, 'pat@example.com' );
				await page.click( `${ sel( 'formpop' ) } .refraction-form__submit` );
				check( T, 'form popup: a sent form runs the "Close popup" action', await waitClosed( page, 'formpop', 8000 ) );
				await page.reload();
				check( T, 'form popup: it stays dismissed after the form was sent', await staysClosed( page, 'formpop', 1500 ) );
				if ( full ) {
					await page.goto( pageUrl( 'pp-form2' ) );
					await page.fill( 'input[name="form_fields[name]"]', 'Pat Tester' );
					await page.fill( 'input[name="form_fields[email]"]', 'pat@example.com' );
					await page.click( '.refraction-form__submit' );
					check( T, 'form action "Open popup" opens the thanks popup', await waitOpen( page, 'thanks', 8000 ) );
				}
				await ctx.close();
			}

			// a11y focus trap / return
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-a11y' ) );
				check( T, 'click trigger: not open before the click', await staysClosed( page, 'a11y', 600 ) );
				await page.click( '#opener' );
				check( T, 'click trigger: opens on the selector', await waitOpen( page, 'a11y' ) );
				const seq = [];
				for ( let i = 0; i < 4; i++ ) { await page.keyboard.press( 'Tab' ); seq.push( await active( page ) ); }
				check( T, 'a11y: Tab stays inside the dialog and wraps', seq[ 0 ].includes( 'refraction-popup__close' ) && seq[ 1 ] === 'a11y-one' && seq[ 2 ] === 'a11y-two' && seq[ 3 ].includes( 'refraction-popup__close' ), seq.join( ' > ' ) );
				await page.keyboard.press( 'Shift+Tab' );
				check( T, 'a11y: Shift+Tab wraps backwards', ( await active( page ) ) === 'a11y-two' );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'a11y' );
				check( T, 'a11y: focus returns to the element that opened it', ( await active( page ) ) === 'opener', await active( page ) );
				await ctx.close();
			}

			if ( ! full ) { continue; }

			// delay
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-delay' ) );
				const early = await staysClosed( page, 'delay', 900 );
				check( T, 'page load with delay: not open before the delay', early );
				check( T, 'page load with delay: opens after 2 seconds', await waitOpen( page, 'delay', 4000 ) );
				await ctx.close();
			}

			// scroll
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-scroll' ) );
				check( T, 'scroll: not open before scrolling', await staysClosed( page, 'scroll', 600 ) );
				await wheel( page, 300 );
				check( T, 'scroll: not open at ~10%', await isOpen( page, 'scroll' ) === false );
				for ( let i = 0; i < 6 && ! ( await isOpen( page, 'scroll' ) ); i++ ) { await wheel( page, 300 ); }
				const y = await page.evaluate( () => window.pageYOffset );
				check( T, 'scroll: opens at 50% of the page', await waitOpen( page, 'scroll', 2000 ) && y > 900, `y=${ y }` );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-scrollel' ) );
				check( T, 'scroll to element: not open at the top', await staysClosed( page, 'scrollel', 600 ) );
				for ( let i = 0; i < 12 && ! ( await isOpen( page, 'scrollel' ) ); i++ ) { await wheel( page, 400 ); }
				check( T, 'scroll to element: opens when the element is reached', await waitOpen( page, 'scrollel', 2000 ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-scrollup' ) );
				for ( let i = 0; i < 3; i++ ) { await wheel( page, 400 ); }
				await wheel( page, -100 );
				check( T, 'scroll back up: not open after a short scroll up', await isOpen( page, 'scrollup' ) === false );
				await wheel( page, -250 );
				check( T, 'scroll back up: opens after scrolling up by the distance', await waitOpen( page, 'scrollup', 2000 ) );
				await ctx.close();
			}

			// click + links
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-click' ) );
				check( T, 'click: not open on load', await staysClosed( page, 'click', 500 ) );
				await page.click( '.open-me' );
				check( T, 'click: opens from any element matching the selector', await waitOpen( page, 'click' ) );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'click' );
				check( T, 'click: focus returns to the clicked element', ( await active( page ) ).includes( 'open-me' ), await active( page ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-link' ) );
				const href = await page.getAttribute( '.tag-link a', 'href' );
				check( T, 'Popup dynamic tag: the button link is #refraction-popup:open:ID (colons encoded)', decodeURIComponent( href || '' ) === `#refraction-popup:open:${ P.link }`, href );
				await page.click( '.tag-link a' );
				check( T, 'hash link: opens the popup', await waitOpen( page, 'link' ) );
				check( T, 'hash link: the address does not change', ! page.url().includes( 'refraction-popup' ) );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'link' );
				await page.evaluate( () => document.querySelector( '.toggle-link' ).click() );
				const t1 = await waitOpen( page, 'link' );
				await page.evaluate( () => document.querySelector( '.toggle-link' ).click() );
				check( T, 'hash link: toggle opens then closes', t1 && await waitClosed( page, 'link' ) );
				await ctx.close();
			}

			// exit intent
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-exit' ) );
				await page.mouse.move( 500, 300 );
				await page.mouse.move( 500, 100 );
				check( T, 'exit intent: moving inside the page does nothing', await staysClosed( page, 'exit', 500 ) );
				await page.mouse.move( 500, 1, { steps: 4 } );
				await page.mouse.move( 500, -30, { steps: 3 } );
				let opened = await waitOpen( page, 'exit', 1500 );
				let how = 'mouse leaves the window';
				if ( ! opened ) {
					await page.evaluate( () => document.dispatchEvent( new MouseEvent( 'mouseout', { clientX: 400, clientY: -1, relatedTarget: null, bubbles: true } ) ) );
					opened = await waitOpen( page, 'exit', 1500 );
					how = 'synthetic mouseout (the real mouse move did not produce one)';
				}
				check( T, `exit intent (desktop): opens when the pointer leaves through the top [${ how }]`, opened );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor( { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true } );
				await page.goto( pageUrl( 'pp-exit' ) );
				await page.touchscreen.tap( 100, 200 );
				await sleep( 300 );
				check( T, 'exit intent (touch): not open yet', await isOpen( page, 'exit' ) === false );
				await page.goBack().catch( () => {} );
				check( T, 'exit intent (touch): the back button opens it and the page stays', await waitOpen( page, 'exit', 3000 ) && page.url().includes( `page_id=${ seed.pages[ 'pp-exit' ] }` ), page.url() );
				await ctx.close();
			}

			// idle
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-idle' ) );
				await sleep( 1200 );
				await page.mouse.move( 300, 300 );
				await sleep( 1300 );
				check( T, 'inactivity: activity resets the timer', await isOpen( page, 'idle' ) === false );
				check( T, 'inactivity: opens after the idle time', await waitOpen( page, 'idle', 4000 ) );
				await ctx.close();
			}

			// page views
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-views' ) );
				check( T, 'page views: not open on the first view', await staysClosed( page, 'views', 800 ) );
				await page.goto( pageUrl( 'pp-views' ) );
				check( T, 'page views: opens on the second view of the session', await waitOpen( page, 'views', 3000 ) );
				await ctx.close();
			}

			// event, API, scroll lock without jump
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-event' ) );
				const apiKeys = await page.evaluate( () => Object.keys( window.refractionPopup || {} ).sort().join( ',' ) );
				check( T, 'API: window.refractionPopup exists', apiKeys.includes( 'open' ) && apiKeys.includes( 'close' ), apiKeys );
				await wheel( page, 500 );
				const before = await page.evaluate( () => ( { y: window.pageYOffset, left: document.body.getBoundingClientRect().left, width: document.body.getBoundingClientRect().width } ) );
				await page.evaluate( ( id ) => { window.__ev = []; [ 'shown', 'hidden' ].forEach( ( n ) => document.addEventListener( 'refraction:popup:' + n, ( e ) => window.__ev.push( n + ':' + e.detail.id ) ) ); document.dispatchEvent( new CustomEvent( 'refraction:popup:open', { detail: { id } } ) ); }, P.event );
				check( T, 'event: refraction:popup:open opens the popup', await waitOpen( page, 'event' ) );
				const during = await page.evaluate( () => ( { y: window.pageYOffset, left: document.body.getBoundingClientRect().left, width: document.body.getBoundingClientRect().width, lock: document.documentElement.classList.contains( 'refraction-popup-lock' ) } ) );
				check( T, 'scroll lock: no jump and no layout shift', during.lock && during.y === before.y && Math.abs( during.left - before.left ) < 1 && Math.abs( during.width - before.width ) < 1, JSON.stringify( { before, during } ) );
				await page.evaluate( ( id ) => window.refractionPopup.close( id ), P.event );
				await waitClosed( page, 'event' );
				const after = await page.evaluate( () => ( { y: window.pageYOffset, events: window.__ev, unknown: window.refractionPopup.open( 999999 ) } ) );
				check( T, 'API: close works, events fire, scroll position is kept, unknown ids are ignored', after.y === before.y && after.events.join() === `shown:${ P.event },hidden:${ P.event }` && after.unknown === false, JSON.stringify( after ) );
				await ctx.close();
			}

			// frequency
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-once' ) );
				check( T, 'frequency once: shows the first time', await waitOpen( page, 'once' ) );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'once' );
				await page.reload();
				check( T, 'frequency once: not again after a reload', await staysClosed( page, 'once', 1200 ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-everyn' ) );
				const seen = [];
				for ( let i = 0; i < 5; i++ ) {
					if ( i ) { await page.reload(); }
					const o = await waitOpen( page, 'everyn', i % 3 === 0 ? 3000 : 1000 );
					seen.push( o ? 1 : 0 );
					if ( o ) { await page.keyboard.press( 'Escape' ); await waitClosed( page, 'everyn' ); }
				}
				check( T, 'frequency every 3 visits: shows on visits 1 and 4 only', seen.join( '' ) === '10010', seen.join( '' ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-session' ) );
				await waitOpen( page, 'session' );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'session' );
				await page.reload();
				check( T, 'frequency per session: not again in the same session', await staysClosed( page, 'session', 1200 ) );
				const second = await ctx.newPage();
				watch( second, 'visitor2' );
				await second.goto( pageUrl( 'pp-session' ) );
				check( T, 'frequency per session: shows again in a new session (new tab)', await waitOpen( second, 'session' ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-day' ) );
				await waitOpen( page, 'day' );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'day' );
				await page.reload();
				const blocked = await staysClosed( page, 'day', 1200 );
				await page.evaluate( ( id ) => { const k = 'refraction_popup_' + id; const s = JSON.parse( localStorage.getItem( k ) ); s.last -= 90000; localStorage.setItem( k, JSON.stringify( s ) ); }, P.day );
				await page.reload();
				check( T, 'frequency once per day: hidden for a day, back after 25 hours', blocked && await waitOpen( page, 'day' ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.addInitScript( () => { Object.defineProperty( window, 'localStorage', { get() { throw new Error( 'blocked' ); } } ); Object.defineProperty( window, 'sessionStorage', { get() { throw new Error( 'blocked' ); } } ); } );
				await page.goto( pageUrl( 'pp-once' ) );
				check( T, 'cookie fallback: opens with storage blocked', await waitOpen( page, 'once' ) );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'once' );
				const cookie = ( await ctx.cookies() ).some( ( c ) => c.name === `refraction_popup_${ P.once }` );
				await page.reload();
				check( T, 'cookie fallback: the frequency rule still works through a cookie', cookie && await staysClosed( page, 'once', 1200 ), `cookie=${ cookie }` );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-dismiss' ) );
				await waitOpen( page, 'dismiss' );
				await page.click( `${ sel( 'dismiss' ) } .never` );
				check( T, 'do not show again: the marked button closes the popup', await waitClosed( page, 'dismiss' ) );
				await page.reload();
				check( T, 'do not show again: and it stays away', await staysClosed( page, 'dismiss', 1200 ) );
				await ctx.close();
			}

			// device, referrer, param, schedule
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-dev' ) );
				check( T, 'devices: a mobile-only popup stays closed on desktop', await staysClosed( page, 'dev_mobile', 1500 ) );
				await ctx.close();
				const m = await visitor( { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true } );
				await m.page.goto( pageUrl( 'pp-dev' ) );
				check( T, 'devices: and opens on a phone', await waitOpen( m.page, 'dev_mobile' ) );
				await m.page.screenshot( { path: join( SHOTS, `${ theme }-popup-mobile.png` ) } );
				await m.ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-ref' ) );
				check( T, 'referrer: no referrer, search-engine popup stays closed', await staysClosed( page, 'ref_search', 1200 ) );
				await page.goto( pageUrl( 'pp-ref' ), { referer: 'https://www.google.com/search?q=refraction' } );
				check( T, 'referrer: a visit from a search engine opens it', await waitOpen( page, 'ref_search' ) );
				await ctx.close();
				const o = await visitor();
				await o.page.goto( pageUrl( 'pp-ref' ), { referer: 'https://blog.example.org/post' } );
				check( T, 'referrer: another website does not', await staysClosed( o.page, 'ref_search', 1200 ) );
				await o.ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( `${ pageUrl( 'pp-param' ) }&promo=winter` );
				const wrong = await staysClosed( page, 'param', 1200 );
				await page.goto( `${ pageUrl( 'pp-param' ) }&promo=spring` );
				check( T, 'URL parameter: only with the right parameter value', wrong && await waitOpen( page, 'param' ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-sched' ) );
				check( T, 'schedule: the popup inside its daily hours opens', await waitOpen( page, 'sched_hours_in' ) );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'sched_hours_in' );
				check( T, 'schedule: the one outside its daily hours does not', await staysClosed( page, 'sched_hours_out', 1500 ) );
				await ctx.close();
			}

			// queue, nested, animations
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-queue' ) );
				await waitOpen( page, 'queue_high' );
				check( T, 'queue: the higher priority popup opens first and the other waits', await isOpen( page, 'queue_high' ) && await isOpen( page, 'queue_low' ) === false );
				await page.screenshot( { path: join( SHOTS, `${ theme }-queue-first.png` ) } );
				await page.keyboard.press( 'Escape' );
				check( T, 'queue: the next popup opens when the first one closes', await waitOpen( page, 'queue_low', 4000 ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-nested' ) );
				await waitOpen( page, 'nest_a' );
				await page.click( `${ sel( 'nest_a' ) } .to-b` );
				const both = await waitOpen( page, 'nest_b' ) && await isOpen( page, 'nest_a' );
				const z = await page.evaluate( ( [ a, b ] ) => [ document.querySelector( a ).style.zIndex, document.querySelector( b ).style.zIndex ].map( Number ), [ sel( 'nest_a' ), sel( 'nest_b' ) ] );
				check( T, 'nested: a link inside a popup opens another one on top', both && z[ 1 ] > z[ 0 ], z.join( ' < ' ) );
				await page.screenshot( { path: join( SHOTS, `${ theme }-nested.png` ) } );
				await page.keyboard.press( 'Escape' );
				await waitClosed( page, 'nest_b' );
				check( T, 'nested: Escape closes only the top popup and focus returns into the first', await isOpen( page, 'nest_a' ) && ( await active( page ) ) === 'to-b', await active( page ) );
				await page.keyboard.press( 'Escape' );
				check( T, 'nested: a second Escape closes the first popup', await waitClosed( page, 'nest_a' ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-anim' ) );
				let animated = false;
				try { await page.waitForSelector( `${ sel( 'anim' ) }.rp-in-zoom`, { timeout: 3000 } ); animated = true; } catch { /* below */ }
				const gone = animated && await page.waitForFunction( ( s ) => ! document.querySelector( s ).classList.contains( 'rp-in-zoom' ) && document.querySelector( s ).classList.contains( 'is-open' ), sel( 'anim' ), { timeout: 3000 } ).then( () => true ).catch( () => false );
				check( T, 'animation: the entrance animation runs and ends', animated && gone );
				await page.keyboard.press( 'Escape' );
				let out = false;
				try { await page.waitForSelector( `${ sel( 'anim' ) }.rp-out-zoom`, { timeout: 2000 } ); out = true; } catch { /* below */ }
				check( T, 'animation: the exit animation runs, then the popup is hidden', out && await waitClosed( page, 'anim' ) );
				await ctx.close();
				const r = await visitor( { reducedMotion: 'reduce' } );
				await r.page.goto( pageUrl( 'pp-anim' ) );
				await r.page.waitForSelector( `${ sel( 'anim' ) }.is-open`, { timeout: 6000 } );
				const cls = await r.page.evaluate( ( s ) => document.querySelector( s ).className, sel( 'anim' ) );
				const anim = await r.page.evaluate( ( s ) => getComputedStyle( document.querySelector( s + ' .refraction-popup__box' ) ).animationName, sel( 'anim' ) );
				check( T, 'animation: reduced motion skips it completely', ! /rp-in-/.test( cls ) && anim === 'none', `${ cls } / ${ anim }` );
				await r.ctx.close();
			}

			// close settings, auto close, lock
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-auto' ) );
				const o = await waitOpen( page, 'auto' );
				check( T, 'auto close: closes by itself after the set time', o && await waitClosed( page, 'auto', 5000 ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				await page.goto( pageUrl( 'pp-noclose' ) );
				await waitOpen( page, 'noclose' );
				await page.keyboard.press( 'Escape' );
				await page.mouse.click( 4, 4 );
				await sleep( 600 );
				check( T, 'close settings: Escape and the overlay can be turned off', await isOpen( page, 'noclose' ) );
				await page.click( `${ sel( 'noclose' ) } .refraction-popup__close` );
				check( T, 'close settings: the close button still works', await waitClosed( page, 'noclose' ) );
				await ctx.close();
			}
			{
				const { ctx, page } = await visitor();
				let hit = false;
				await page.addInitScript( () => { window.addEventListener( 'error', () => {} ); } );
				await page.goto( pageUrl( 'pp-xss' ) );
				await waitOpen( page, 'xss' );
				hit = await page.evaluate( () => typeof window.__xss !== 'undefined' );
				check( T, 'security: hostile titles and selectors run no script in the browser', ! hit );
				await ctx.close();
			}
		}

		// ------------------------------------------------------------------------------------------------ admin, editor
		console.log( '\n== admin and editor ==' );
		wp( [ 'theme', 'activate', themes.find( ( t ) => ! CLASSIC.has( t ) ) || themes[ 0 ] ] );
		const ap = admin.page;
		await ap.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=popup` );
		const tabText = await ap.locator( '.wrap' ).first().innerText();
		check( 'admin', 'Theme Builder has a Popups tab listing the popups with their conditions', /Popups/.test( tabText ) && tabText.includes( 'load' ) && /Add New|Add new/.test( tabText ), tabText.slice( 0, 200 ) );
		const addHref = await ap.locator( 'a[href*="refraction_library_type=popup"]' ).first().getAttribute( 'href' ).catch( () => '' );
		check( 'admin', 'Add New opens the template dialog with the Popup type', !! addHref, addHref );
		await ap.screenshot( { path: join( SHOTS, 'admin-popups-tab.png' ) } );

		const openEditor = async ( id, who = ap ) => {
			await who.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
			await who.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '#refraction-preview-iframe' ), null, { timeout: 90000 } );
			await who.waitForTimeout( 3500 );
		};
		await openEditor( P.load );
		const frame = ap.frameLocator( '#refraction-preview-iframe' );
		await frame.locator( '.refraction-popup.is-preview .refraction-popup__box' ).waitFor( { timeout: 30000 } );
		check( 'editor', 'a popup opens in the editor on a popup canvas (overlay + box)', ( await frame.locator( '.refraction-popup__overlay' ).count() ) === 1 && ( await frame.locator( '.refraction-popup__box' ).count() ) === 1 );
		check( 'editor', 'the preview shows the popup content', ( await frame.locator( '.refraction-popup__box' ).innerText() ).includes( 'Popup load' ) );
		check( 'editor', 'the preview has no live popup markup', ( await frame.locator( '[data-rp-config]' ).count() ) === 0 );
		await ap.screenshot( { path: join( SHOTS, 'editor-popup.png' ) } );
		await ap.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await ap.waitForTimeout( 1000 );
		const controls = await ap.evaluate( () => [ 'rp_width', 'rp_pos_h', 'rp_overlay_color', 'rp_close_icon', 'rp_anim_in', 'rp_prevent_scroll', 'rp_trigger_load', 'rp_trigger_exit', 'rp_frequency', 'rp_devices', 'rp_referrer', 'rp_schedule', 'rp_audience', 'rp_priority' ].filter( ( n ) => ! refraction.documents.getCurrent().container.settings.get( n ) && ! document.querySelector( `.refraction-control-${ n }` ) && ! Object.keys( refraction.documents.getCurrent().config.settings.controls ).includes( n ) ) );
		check( 'editor', 'the document settings contain every popup control', controls.length === 0, controls.join( ',' ) );
		check( 'editor', 'the Display Conditions control is available', ( await ap.locator( '[data-tb-mount]' ).count() ) >= 0 && ( await ap.evaluate( () => Object.keys( refraction.documents.getCurrent().config.settings.controls ).includes( 'refraction_display_conditions' ) ) ) );
		await ap.evaluate( () => {
			const container = refraction.settings.page.getEditedView().getContainer();
			$e.run( 'document/elements/settings', { container, settings: { rp_width: { size: 500, unit: 'px' } } } );
		} );
		await ap.waitForTimeout( 1200 );
		const liveWidth = await frame.locator( '.refraction-popup__box' ).evaluate( ( el ) => Math.round( el.getBoundingClientRect().width ) );
		check( 'editor', 'changing the width updates the preview live', liveWidth === 500, `${ liveWidth }` );
		await ap.evaluate( () => $e.run( 'document/save/update' ) );
		await ap.waitForFunction( () => ! refraction.documents.getCurrent().editor.isChanged, null, { timeout: 30000 } ).catch( () => {} );
		const saved = wp( [ 'post', 'meta', 'get', String( P.load ), '_refraction_page_settings' ] );
		check( 'editor', 'saving stores the setting', saved.includes( 'rp_width' ) && saved.includes( '500' ), saved.slice( 0, 200 ) );
		await ap.screenshot( { path: join( SHOTS, 'editor-popup-settings.png' ) } );
		{
			const { ctx, page } = await visitor();
			await page.goto( pageUrl( 'pp-load' ) );
			await waitOpen( page, 'load' );
			const w = await page.locator( `${ sel( 'load' ) } .refraction-popup__box` ).evaluate( ( el ) => Math.round( el.getBoundingClientRect().width ) );
			check( 'editor', 'the saved width applies to the live popup', w === 500, `${ w }` );
			await ctx.close();
		}
		// A normal page opened in the editor never shows popups in its preview.
		await openEditor( seed.pages[ 'pp-load' ] );
		check( 'editor', 'the editor preview of a normal page prints no popups', ( await ap.frameLocator( '#refraction-preview-iframe' ).locator( '.refraction-popup[data-rp]' ).count() ) === 0 );

		await admin.ctx.close();
		await editor.ctx.close();
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	const log = logTail( logStart );
	check( 'log', 'no PHP errors in the debug log', ! /PHP (Fatal|Warning|Notice|Deprecated|Parse)|Uncaught/.test( log ), log.slice( 0, 600 ) );
	check( 'log', 'no JS console errors', consoleErrors.length === 0, consoleErrors.slice( 0, 5 ).join( ' || ' ) );

	console.log( failures ? `\n${ failures } check(s) FAILED` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
