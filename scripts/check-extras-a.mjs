#!/usr/bin/env node
/**
 * Extras A check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-extras-a.mjs [--site /tmp/rf-extras-site] [--port 8881] [--shots /tmp/extras-a-shots]
 *                                        [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). The site is changed
 * (content, active theme, options); use a throw-away site. Missing themes are downloaded from wordpress.org.
 *
 * Covers, on a classic and a block theme:
 *   - Custom CSS on an element, a container, the page and the site; risky constructs removed from the CSS file and the HTML;
 *   - Custom Code snippets: head, body start, body end, JS/CSS wrapping, priority, include/exclude, drafts, no output in wp-admin
 *     and in the editor preview, the kill switch and the admin recovery parameter, editor role refused, create/toggle/delete in the UI;
 *   - Display Conditions: logged in/out, role (real logins), date windows (injected clock, site timezone), day of week, time of day,
 *     URL parameter, cookie, browser language, AND/OR, hide mode, container with a child; hidden HTML is absent;
 *   - Custom Attributes: applied, unsafe ones dropped, dynamic tag value;
 *   - editor: controls and Site Settings tab exist, badge on conditioned elements, "Show elements with conditions" toggle, live CSS preview;
 *   - no PHP errors in the debug log, no JS console errors.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-extras-site' );
const PORT = arg( 'port', '8881' );
const SHOTS = arg( 'shots', '/tmp/extras-a-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/extras-a-seed.php' );

const results = [];
let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	results.push( { area, name, pass: !! pass } );
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
const seed = ( action, env = {} ) => {
	const out = wp( [ 'eval-file', SEED ], { EA_ACTION: action, ...env } );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
};
const snippet = ( spec ) => seed( 'snippet', { EA_SPEC: JSON.stringify( spec ) } ).id;
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

async function login( browser, user, pass, extra = {} ) {
	const ctx = await browser.newContext( { viewport: { width: 1500, height: 1000 }, ...extra } );
	const page = await ctx.newPage();
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000 } ), page.click( '#wp-submit' ) ] );
	return { ctx, page };
}

const MU = `<?php
// Test clock for Display Conditions: option ea_now_ts (timestamp) or ea_now (string in the site timezone).
add_filter( 'refraction/display_conditions/now', function ( $now ) {
	$ts = get_option( 'ea_now_ts' );
	if ( $ts ) { return (int) $ts; }
	$s = get_option( 'ea_now' );
	return $s ? $s : $now;
} );
if ( get_option( 'ea_kill' ) ) { define( 'REFRACTION_DISABLE_CUSTOM_CODE', true ); }
`;

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );
	mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );
	writeFileSync( join( WPDIR, 'wp-content/mu-plugins/ea-clock.php' ), MU );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const consoleErrors = [];
	const watch = ( page, label ) => {
		page.on( 'console', ( m ) => {
			if ( m.type() === 'error' && ! /favicon\.ico|Transition was skipped|evil\.test/.test( m.location().url + m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
		} );
		page.on( 'pageerror', ( e ) => ! /Transition was skipped/.test( e.message ) && consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
	};

	try {
		const installed = new Set( wp( [ 'theme', 'list', '--field=name' ] ).split( '\n' ) );
		const themes = [];
		for ( const t of THEMES ) {
			if ( ! installed.has( t ) ) {
				try { wp( [ 'theme', 'install', t ] ); installed.add( t ); } catch { console.log( `note: theme ${ t } could not be installed; skipped` ); continue; }
			}
			themes.push( t );
		}
		check( 'setup', 'a classic and a block theme are available', themes.length >= 2, themes.join( ',' ) );

		wp( [ 'plugin', 'activate', 'refraction' ] );
		wp( [ 'rewrite', 'structure', '/%postname%/' ] );
		wp( [ 'option', 'update', 'ea_now', '2026-06-15 10:00:00' ] ); // A Monday, 10:00.
		const c = seed( 'content' );
		const ids = Object.fromEntries( Object.entries( c ).map( ( [ k, v ] ) => [ k, v.id ] ) );

		const admin = await login( browser, 'admin', 'admin' );
		watch( admin.page, 'admin' );

		// ---------------------------------------------------------------- hostile CSS saved by a user without unfiltered_html
		const san = seed( 'sanitize' );
		check( 'custom-css', 'an author (no unfiltered_html) can not store risky CSS (page, element, nested element)', ! san.can && [ san.page, san.el, san.inner ].every( ( v ) => v.includes( 'a{color:red}' ) && ! /<|@import|expression|evil\.test/i.test( v ) ), JSON.stringify( san ) );

		// ---------------------------------------------------------------- snippets
		const snip = {
			head: snippet( { title: 'EA head', code: '<meta name="ea-head" content="1">', location: 'head', rules: [ 'include/general', `exclude/singular/page/${ ids.plain }` ] } ),
			bodyStart: snippet( { title: 'EA body start', code: '<div id="ea-body-start">bs</div>', location: 'body_start' } ),
			bodyEndJs: snippet( { title: 'EA footer js', code: 'window.__eaFooter=1;', type: 'js', location: 'body_end', rules: [ `include/singular/page/${ ids.css }` ] } ),
			cssHead: snippet( { title: 'EA css', code: 'body{--ea-snip:on}', type: 'css', location: 'head' } ),
			draft: snippet( { title: 'EA draft', code: '<meta name="ea-draft" content="1">', active: false } ),
			p20: snippet( { title: 'EA p20', code: '<!--ea-p20-->', priority: 20 } ),
			p5: snippet( { title: 'EA p5', code: '<!--ea-p5-->', priority: 5 } ),
			breaker: snippet( { title: 'EA breaker', code: 'var a="</script><b id=\\"ea-break\\">x</b>";', type: 'js', location: 'body_end' } ),
			none: snippet( { title: 'EA no include', code: '<meta name="ea-none" content="1">', rules: [] } ),
		};
		check( 'custom-code', 'snippets are stored', Object.values( snip ).every( ( v ) => v > 0 ) );

		for ( const theme of themes ) {
			console.log( `\n== front end, theme ${ theme } ==` );
			wp( [ 'theme', 'activate', theme ] );
			const visitor = await browser.newContext( { viewport: { width: 1300, height: 900 } } );
			const vp = await visitor.newPage();
			watch( vp, `visitor-${ theme }` );
			const vget = async ( url, p = vp ) => { await p.goto( BASE + url, { waitUntil: 'load' } ); return p.content(); };

			// ------------------------------------------------------------ Custom CSS
			const html = await vget( new URL( c.css.url ).pathname );
			const cssText = await vp.evaluate( async () => {
				const hrefs = [ ...document.querySelectorAll( 'link[rel=stylesheet]' ) ].map( ( l ) => l.href ).filter( ( h ) => /refraction/.test( h ) );
				return ( await Promise.all( hrefs.map( ( h ) => fetch( h ).then( ( r ) => r.text() ) ) ) ).join( '\n' );
			} );
			const cs = ( sel, prop ) => vp.evaluate( ( [ s, p ] ) => { const e = document.querySelector( s ); return e ? getComputedStyle( e )[ p ] : null; }, [ sel, prop ] );
			check( 'custom-css', `${ theme }: container CSS with "selector" applies`, '6px' === await cs( '[data-id="cssbox1"]', 'borderTopWidth' ) && 'rgb(1, 2, 3)' === await cs( '[data-id="cssbox1"]', 'borderTopColor' ) );
			check( 'custom-css', `${ theme }: container rule reaches its child and the widget's own rule applies too`, 'uppercase' === await cs( '[data-id="cssh001"] .refraction-heading-title', 'textTransform' ) && 'rgb(11, 22, 33)' === await cs( '[data-id="cssh001"] .refraction-heading-title', 'color' ), await cs( '[data-id="cssh001"] .refraction-heading-title', 'color' ) );
			check( 'custom-css', `${ theme }: widget outline from "selector"`, '4px' === await cs( '[data-id="cssh001"]', 'outlineWidth' ) );
			check( 'custom-css', `${ theme }: page CSS applies to the page body`, 'rgb(250, 250, 200)' === await cs( 'body', 'backgroundColor' ), await cs( 'body', 'backgroundColor' ) );
			check( 'custom-css', `${ theme }: site CSS applies to every heading`, '7px' === await cs( '[data-id="cssh001"] .refraction-heading-title', 'letterSpacing' ) && '7px' === await cs( '[data-id="cssh002"] .refraction-heading-title', 'letterSpacing' ) );
			check( 'custom-css', `${ theme }: the other element is not styled by the custom CSS of a sibling`, 'none' === await cs( '[data-id="cssh002"]', 'outlineStyle' ) || '0px' === await cs( '[data-id="cssh002"]', 'outlineWidth' ) );
			check( 'custom-css', `${ theme }: risky constructs are not in the generated CSS`, cssText.length > 500 && ! /evil\.test|expression\s*\(|javascript:|@import|<\/style|<script/i.test( cssText ), cssText.match( /.{0,40}(evil\.test|expression|javascript:|@import).{0,40}/i )?.[ 0 ] );
			check( 'custom-css', `${ theme }: no injected script ran or is in the page`, ! html.includes( 'window.__xss' ) && undefined === await vp.evaluate( () => window.__xss ) );

			// ------------------------------------------------------------ Custom Attributes
			await vget( new URL( c.attr.url ).pathname );
			const attrs = await vp.evaluate( () => { const e = document.querySelector( '[data-id="at00001"]' ); return e ? Object.fromEntries( [ ...e.attributes ].map( ( a ) => [ a.name, a.value ] ) ) : null; } );
			check( 'attributes', `${ theme }: safe attributes are applied`, attrs && 'hero' === attrs[ 'data-track' ] && 'Hero banner' === attrs[ 'aria-label' ] && 'hidden' in attrs, JSON.stringify( attrs ) );
			check( 'attributes', `${ theme }: unsafe attributes are dropped`, attrs && ! ( 'onclick' in attrs ) && ! ( 'onmouseover' in attrs ) && ! ( 'href' in attrs ) && ! ( 'srcdoc' in attrs ) && ! Object.keys( attrs ).some( ( k ) => /key|^bad/.test( k ) ), JSON.stringify( attrs ) );
			check( 'attributes', `${ theme }: style is sanitised and tags stripped from values`, attrs && /border-top/.test( attrs.style || '' ) && ! /expression/.test( attrs.style || '' ) && 'Hi there' === attrs.title, JSON.stringify( attrs ) );
			const dyn = await vp.evaluate( () => document.querySelector( '[data-id="at00002"]' )?.getAttribute( 'data-page' ) );
			check( 'attributes', `${ theme }: a dynamic tag (with Before text) works in the value`, String( ids.attr ) === dyn, dyn );

			// ------------------------------------------------------------ Custom Code
			const cssPage = await vget( new URL( c.css.url ).pathname );
			const plainPage = await vget( new URL( c.plain.url ).pathname );
			check( 'custom-code', `${ theme }: head snippet prints in the head`, /<head[\s\S]*<meta name="ea-head" content="1">[\s\S]*<\/head>/.test( cssPage ) );
			check( 'custom-code', `${ theme }: exclude rule keeps a snippet off the excluded page`, ! plainPage.includes( 'ea-head' ) );
			check( 'custom-code', `${ theme }: body start snippet prints after <body>`, /<body[^>]*>[\s\S]{0,6000}<div id="ea-body-start">bs<\/div>/.test( cssPage ), theme );
			check( 'custom-code', `${ theme }: footer JS is wrapped in a script tag and runs only where included`, cssPage.includes( '<script id="refraction-snippet-' + snip.bodyEndJs + '">window.__eaFooter=1;</script>' ) && ! plainPage.includes( 'window.__eaFooter' ) );
			check( 'custom-code', `${ theme }: CSS snippet is wrapped in a style tag`, cssPage.includes( `<style id="refraction-snippet-${ snip.cssHead }">body{--ea-snip:on}</style>` ) );
			check( 'custom-code', `${ theme }: drafts and snippets without an Include rule do not print`, ! cssPage.includes( 'ea-draft' ) && ! cssPage.includes( 'ea-none' ) );
			check( 'custom-code', `${ theme }: lower priority prints first`, cssPage.indexOf( '<!--ea-p5-->' ) > 0 && cssPage.indexOf( '<!--ea-p5-->' ) < cssPage.indexOf( '<!--ea-p20-->' ) );
			check( 'custom-code', `${ theme }: JS can not close its script tag`, 0 === await vp.evaluate( () => document.querySelectorAll( '#ea-break' ).length ) );
			await vp.screenshot( { path: join( SHOTS, `custom-code-front-${ theme }.png` ) } );

			// recovery
			const adminCtx = await login( browser, 'admin', 'admin' );
			watch( adminCtx.page, `admin-${ theme }` );
			const recovered = await vget( new URL( c.css.url ).pathname + '?refraction-disable-code=1', adminCtx.page );
			check( 'custom-code', `${ theme }: ?refraction-disable-code=1 switches snippets off for an admin`, ! recovered.includes( 'ea-head' ) && ! recovered.includes( 'ea-body-start' ) );
			const stillOn = await vget( new URL( c.css.url ).pathname + '?refraction-disable-code=1' );
			check( 'custom-code', `${ theme }: the recovery parameter does nothing for a visitor`, stillOn.includes( 'ea-head' ) );
			wp( [ 'option', 'update', 'ea_kill', '1' ] );
			const killed = await vget( new URL( c.css.url ).pathname );
			check( 'custom-code', `${ theme }: REFRACTION_DISABLE_CUSTOM_CODE switches everything off`, ! killed.includes( 'ea-head' ) && ! killed.includes( 'refraction-snippet-' ) );
			wp( [ 'option', 'delete', 'ea_kill' ] );

			// ------------------------------------------------------------ Display Conditions
			const dcUrl = new URL( c.dc.url ).pathname;
			const editor = await login( browser, 'editor', 'editor' );
			watch( editor.page, `editor-${ theme }` );
			const seen = async ( p, url = dcUrl ) => {
				const h = await vget( url, p );
				return ( key ) => h.includes( key );
			};
			// Admin first so the element cache is written by a logged in visitor, then everyone else.
			const asAdmin = await seen( adminCtx.page );
			const asVisitor = await seen( vp );
			const asEditor = await seen( editor.page );
			const asAdmin2 = await seen( adminCtx.page );
			check( 'conditions', `${ theme }: unconditioned element always shows`, asVisitor( 'DC-ALWAYS' ) && asAdmin( 'DC-ALWAYS' ) );
			check( 'conditions', `${ theme }: logged in only`, ! asVisitor( 'DC-LOGGED-IN' ) && asAdmin( 'DC-LOGGED-IN' ) && asEditor( 'DC-LOGGED-IN' ) );
			check( 'conditions', `${ theme }: logged out only`, asVisitor( 'DC-LOGGED-OUT' ) && ! asAdmin( 'DC-LOGGED-OUT' ) && ! asEditor( 'DC-LOGGED-OUT' ) );
			check( 'conditions', `${ theme }: role (real logins)`, asEditor( 'DC-ROLE-EDITOR' ) && ! asAdmin( 'DC-ROLE-EDITOR' ) && ! asVisitor( 'DC-ROLE-EDITOR' ) && asAdmin( 'DC-ROLE-ADMIN' ) && ! asEditor( 'DC-ROLE-ADMIN' ) );
			check( 'conditions', `${ theme }: element cache does not leak between visitors`, asAdmin2( 'DC-LOGGED-IN' ) && ! asVisitor( 'DC-LOGGED-IN' ) );
			check( 'conditions', `${ theme }: hidden element is not in the HTML at all`, ! ( await vget( dcUrl ) ).match( /DC-LOGGED-IN|dc00002|DC-ROLE-ADMIN|dc00005/ ) );
			check( 'conditions', `${ theme }: hide mode`, asVisitor( 'DC-HIDE-LOGGED-IN' ) && ! asAdmin( 'DC-HIDE-LOGGED-IN' ) );
			check( 'conditions', `${ theme }: a hidden container takes its children with it`, ! asVisitor( 'DC-CHILD-OF-CONDITIONED' ) && ! asVisitor( 'dccont01' ) && asAdmin( 'DC-CHILD-OF-CONDITIONED' ) );
			check( 'conditions', `${ theme }: date windows follow the injected clock`, asVisitor( 'DC-2026' ) && ! asVisitor( 'DC-2030' ) );
			wp( [ 'option', 'update', 'ea_now', '2030-06-01 10:00:00' ] );
			const in2030 = await seen( vp );
			check( 'conditions', `${ theme }: date window moves with the clock`, in2030( 'DC-2030' ) && ! in2030( 'DC-2026' ) );
			wp( [ 'option', 'update', 'ea_now', '2026-06-15 10:00:00' ] );
			const monday = await seen( vp );
			check( 'conditions', `${ theme }: day of week and time of day (Monday 10:00)`, monday( 'DC-MONDAY' ) && monday( 'DC-WORKHOURS' ) );
			wp( [ 'option', 'update', 'ea_now', '2026-06-16 20:00:00' ] );
			const tue = await seen( vp );
			check( 'conditions', `${ theme }: day of week and time of day (Tuesday 20:00)`, ! tue( 'DC-MONDAY' ) && ! tue( 'DC-WORKHOURS' ) );
			// 2026-06-15 20:00 UTC is already Tuesday 05:00 in Tokyo.
			wp( [ 'option', 'delete', 'ea_now' ] );
			wp( [ 'option', 'update', 'ea_now_ts', String( Date.UTC( 2026, 5, 15, 20, 0, 0 ) / 1000 ) ] );
			wp( [ 'option', 'update', 'timezone_string', 'Asia/Tokyo' ] );
			const tokyo = await seen( vp );
			wp( [ 'option', 'update', 'timezone_string', 'UTC' ] );
			const utc = await seen( vp );
			check( 'conditions', `${ theme }: the site timezone decides the day (Tokyo: Tuesday, UTC: Monday)`, ! tokyo( 'DC-MONDAY' ) && utc( 'DC-MONDAY' ), `tokyo=${ tokyo( 'DC-MONDAY' ) } utc=${ utc( 'DC-MONDAY' ) }` );
			wp( [ 'option', 'delete', 'ea_now_ts' ] );
			wp( [ 'option', 'update', 'ea_now', '2026-06-15 10:00:00' ] );
			const withParam = await seen( vp, dcUrl + '?ea=1' );
			const noParam = await seen( vp );
			check( 'conditions', `${ theme }: URL parameter`, withParam( 'DC-PARAM' ) && ! noParam( 'DC-PARAM' ) );
			check( 'conditions', `${ theme }: OR shows with one match, AND needs both`, withParam( 'DC-OR' ) && ! noParam( 'DC-OR' ) && ! withParam( 'DC-AND' ) );
			const adminParam = await seen( adminCtx.page, dcUrl + '?ea=1' );
			check( 'conditions', `${ theme }: AND shows when both match, OR with the other branch`, adminParam( 'DC-AND' ) && ( await seen( adminCtx.page ) )( 'DC-OR' ) );
			await visitor.addCookies( [ { name: 'ea_seen', value: 'yes', url: BASE } ] );
			const withCookie = await seen( vp );
			await visitor.clearCookies();
			check( 'conditions', `${ theme }: cookie`, withCookie( 'DC-COOKIE' ) && ! noParam( 'DC-COOKIE' ) );
			const de = await browser.newContext( { locale: 'de-DE' } );
			const dp = await de.newPage();
			const asGerman = await seen( dp );
			check( 'conditions', `${ theme }: browser language`, asGerman( 'DC-LANG-DE' ) && ! noParam( 'DC-LANG-DE' ) );
			await de.close();

			// ------------------------------------------------------------ no snippet output in admin
			const dash = await vget( '/wp-admin/index.php', adminCtx.page );
			const opts = await vget( '/wp-admin/options-general.php', adminCtx.page );
			check( 'custom-code', `${ theme }: no snippet output in wp-admin`, ! dash.includes( 'ea-head' ) && ! opts.includes( 'ea-body-start' ) && ! opts.includes( 'refraction-snippet-' ) );
			await adminCtx.ctx.close();
			await editor.ctx.close();
			await visitor.close();
		}

		// ---------------------------------------------------------------- Custom Code admin screens (classic theme active or not does not matter)
		console.log( '\n== Custom Code admin ==' );
		const ed = await login( browser, 'editor', 'editor' );
		watch( ed.page, 'editor-role' );
		const resp = await ed.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-code` );
		check( 'custom-code', 'editor role: the Custom Code screen is refused', [ 403 ].includes( resp.status() ) || /not allowed|sorry/i.test( await ed.page.content() ), resp.status() );
		const post = await ed.page.request.post( `${ BASE }/wp-admin/admin-post.php`, { form: { action: 'refraction_custom_code_save', snippet: '0', title: 'sneaky', code: '<script>x</script>', _wpnonce: 'bad' } } );
		check( 'custom-code', 'editor role: saving a snippet is refused', post.status() >= 400, post.status() );
		const sneaky = wp( [ 'post', 'list', '--post_type=refraction_snippet', '--post_status=any', '--field=post_title' ] );
		check( 'custom-code', 'editor role: no snippet was created', ! sneaky.includes( 'sneaky' ) );
		const menu = await ed.page.goto( `${ BASE }/wp-admin/index.php` ).then( () => ed.page.content() );
		check( 'custom-code', 'editor role: no Custom Code menu entry', ! /page=refraction-custom-code/.test( menu ) );
		await ed.ctx.close();

		const ad = await login( browser, 'admin', 'admin' );
		watch( ad.page, 'admin-code' );
		const p = ad.page;
		await p.goto( `${ BASE }/wp-admin/admin.php?page=refraction-custom-code` );
		check( 'custom-code', 'list shows the snippets with a conditions column and a switch', ( await p.locator( '.rcc-table tbody tr' ).count() ) >= 8 && ( await p.locator( '.rcc-switch' ).count() ) >= 8 && ( await p.locator( '.rcc-chip' ).count() ) > 3 );
		check( 'custom-code', 'a snippet without an Include shows "Not displayed anywhere"', ( await p.locator( '.rcc-chip.is-none' ).count() ) >= 1 );
		await p.screenshot( { path: join( SHOTS, 'custom-code-list.png' ), fullPage: true } );
		await p.click( '.page-title-action' );
		await p.waitForSelector( '#rcc-code' );
		await p.waitForSelector( '.CodeMirror', { timeout: 15000 } );
		check( 'custom-code', 'form uses the WordPress code editor and starts with an Include condition', ( await p.locator( '.CodeMirror' ).count() ) === 1 && ( await p.locator( '.rcc-cond__row' ).count() ) === 1 );
		await p.fill( 'input[name=title]', 'EA created in UI' );
		await p.selectOption( '#rcc-type', 'js' );
		await p.waitForTimeout( 400 );
		await p.evaluate( () => document.querySelector( '.CodeMirror' ).CodeMirror.setValue( 'window.__eaUi = 1;' ) );
		await p.selectOption( 'select[name=location]', 'body_end' );
		await p.evaluate( () => document.querySelector( '.CodeMirror' ).CodeMirror.setValue( 'window.__eaUi = (;' ) );
		await p.waitForTimeout( 1200 );
		const lint = await p.locator( '.CodeMirror-lint-marker-error, .CodeMirror-lint-marker, .CodeMirror-lint-tooltip' ).count();
		check( 'custom-code', 'the code editor flags a JavaScript syntax error', lint > 0, lint );
		await p.screenshot( { path: join( SHOTS, 'custom-code-form.png' ), fullPage: true } );
		await p.evaluate( () => document.querySelector( '.CodeMirror' ).CodeMirror.setValue( 'window.__eaUi = 1;' ) );
		await p.click( '.rcc-cond__add' );
		await p.locator( '.rcc-cond__row' ).nth( 1 ).locator( 'select' ).first().selectOption( 'singular' );
		await p.locator( '.rcc-cond__row' ).nth( 1 ).locator( '.rcc-cond__verb button.is-exclude' ).click();
		const rulesField = await p.inputValue( '#rcc-rules' );
		check( 'custom-code', 'the conditions picker writes include/exclude rules', /include\/general/.test( rulesField ) && /exclude\/singular/.test( rulesField ), rulesField );
		await Promise.all( [ p.waitForURL( /done=saved/ ), p.click( '.rcc-actions .button-primary' ) ] );
		check( 'custom-code', 'saving returns to the list with the new snippet', ( await p.locator( 'text=EA created in UI' ).count() ) >= 1 );
		const front = await (await fetch( BASE + '/' )).text();
		check( 'custom-code', 'the new JS snippet prints on the home page (not excluded: singular only)', front.includes( 'window.__eaUi = 1;' ) );
		const aboutless = await (await fetch( BASE + new URL( c.plain.url ).pathname )).text();
		check( 'custom-code', 'the UI exclude rule keeps it off single pages', ! aboutless.includes( 'window.__eaUi' ) );
		await p.locator( 'tr', { hasText: 'EA created in UI' } ).locator( '.rcc-switch' ).click();
		await p.waitForURL( /done=toggled/ );
		check( 'custom-code', 'the status switch turns a snippet off', ( await p.locator( 'tr', { hasText: 'EA created in UI' } ).locator( '.rcc-switch[aria-checked=false]' ).count() ) === 1 && ! ( await ( await fetch( BASE + '/' ) ).text() ).includes( '__eaUi' ) );
		p.on( 'dialog', ( d ) => d.accept() );
		await p.locator( 'tr', { hasText: 'EA created in UI' } ).hover();
		await p.locator( 'tr', { hasText: 'EA created in UI' } ).locator( '.submitdelete' ).click();
		await p.waitForURL( /done=deleted/ );
		check( 'custom-code', 'delete removes the snippet', ( await p.locator( 'text=EA created in UI' ).count() ) === 0 );

		// ---------------------------------------------------------------- Editor
		console.log( '\n== editor ==' );
		wp( [ 'theme', 'activate', themes[ 0 ] ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ ids.dc }&action=refraction` );
		await p.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		await p.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 90000 } );
		await p.waitForSelector( '#refraction-preview-iframe', { timeout: 30000 } );
		await sleep( 2500 );
		const frame = () => p.frame( { name: 'refraction-preview-iframe' } ) ?? p.frames().find( ( f ) => f !== p.mainFrame() && /preview/.test( f.url() ) );
		const ctl = await p.evaluate( () => {
			const el = refraction.getContainer( 'dc00002' ); const k = Object.keys( el.settings.controls );
			return { css: k.includes( 'custom_css' ), items: k.includes( 'refraction_dc_items' ), logic: k.includes( 'refraction_dc_logic' ), mode: k.includes( 'refraction_dc_mode' ), attrs: k.includes( '_attributes' ), tab: el.settings.controls.custom_css?.tab };
		} );
		check( 'editor', 'a widget has Custom CSS, Display Conditions and Attributes controls in the Advanced tab', ctl.css && ctl.items && ctl.logic && ctl.mode && ctl.attrs && 'advanced' === ctl.tab, JSON.stringify( ctl ) );
		const containerCtl = await p.evaluate( () => { const k = Object.keys( refraction.getContainer( 'dccont01' ).settings.controls ); return k.includes( 'custom_css' ) && k.includes( 'refraction_dc_items' ) && k.includes( '_attributes' ); } );
		check( 'editor', 'a container has the same controls', containerCtl );
		const pageCtl = await p.evaluate( () => { const k = Object.keys( refraction.documents.getCurrent().container.settings.controls ); return k.includes( 'custom_css' ) && k.includes( 'refraction_dc_editor_show' ); } );
		check( 'editor', 'Page Settings has Custom CSS and the "Show elements with conditions" switch', pageCtl );
		const badged = await frame().evaluate( () => ( { yes: [ ...document.querySelectorAll( '.refraction-has-conditions' ) ].map( ( e ) => e.dataset.id ), always: document.querySelector( '[data-id="dc00001"]' )?.classList.contains( 'refraction-has-conditions' ) } ) );
		check( 'editor', 'every element is shown in the editor; conditioned ones carry the badge class', badged.yes.includes( 'dc00002' ) && badged.yes.includes( 'dc00010' ) && badged.yes.includes( 'dccont01' ) && ! badged.always, JSON.stringify( badged ) );
		const visibleInEditor = await frame().evaluate( () => [ 'dc00002', 'dc00005', 'dc00006', 'dc00016' ].every( ( id ) => { const e = document.querySelector( `[data-id="${ id }"]` ); return e && getComputedStyle( e ).display !== 'none'; } ) );
		check( 'editor', 'hidden-for-visitors elements are visible in the editor', visibleInEditor );
		const badgeIcon = await frame().evaluate( () => { const e = document.querySelector( '[data-id="dc00002"]' ); const s = getComputedStyle( e, '::before' ); return { mask: s.maskImage || s.webkitMaskImage, content: s.content }; } );
		check( 'editor', 'the badge draws the bundled visibility icon', /visibility\.svg/.test( badgeIcon.mask || '' ), JSON.stringify( badgeIcon ) );
		await p.screenshot( { path: join( SHOTS, 'editor-badges.png' ) } );
		await p.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.documents.getCurrent().container, settings: { refraction_dc_editor_show: '' } } ) );
		await sleep( 600 );
		const hiddenNow = await frame().evaluate( () => getComputedStyle( document.querySelector( '[data-id="dc00002"]' ) ).display === 'none' && getComputedStyle( document.querySelector( '[data-id="dc00001"]' ) ).display !== 'none' );
		check( 'editor', '"Show elements with conditions" off hides only conditioned elements in the preview', hiddenNow );
		await p.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.documents.getCurrent().container, settings: { refraction_dc_editor_show: 'yes' } } ) );
		await sleep( 600 );
		check( 'editor', 'turning it on shows them again', await frame().evaluate( () => getComputedStyle( document.querySelector( '[data-id="dc00002"]' ) ).display !== 'none' ) );

		// live CSS
		await p.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'dc00001' ), settings: { custom_css: 'selector{outline:5px solid rgb(9, 8, 7)} </style><script>window.__edXss=1</script>' } } ) );
		await sleep( 800 );
		const live = await frame().evaluate( () => ( { w: getComputedStyle( document.querySelector( '[data-id="dc00001"]' ) ).outlineWidth, x: window.__edXss } ) );
		check( 'editor', 'element Custom CSS previews live ("selector" replaced, markup dropped)', '5px' === live.w && undefined === live.x, JSON.stringify( live ) );
		await p.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.documents.getCurrent().container, settings: { custom_css: 'selector{background-color:rgb(1, 200, 3)}' } } ) );
		await sleep( 800 );
		check( 'editor', 'page Custom CSS previews live', 'rgb(1, 200, 3)' === await frame().evaluate( () => getComputedStyle( document.body ).backgroundColor ) );
		await p.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.documents.getCurrent().container, settings: { custom_css: '' } } ) );
		const kitTab = wp( [ 'eval', 'echo isset( \\Refraction\\Plugin::$instance->kits_manager->get_active_kit()->get_tabs()["settings-custom-css"] ) ? "yes" : "no";' ] );
		check( 'editor', 'Site Settings has a Custom CSS tab', kitTab.endsWith( 'yes' ), kitTab );
		const noSnippets = await frame().evaluate( () => document.documentElement.outerHTML );
		check( 'custom-code', 'no snippet output in the editor preview', ! noSnippets.includes( 'ea-head' ) && ! noSnippets.includes( 'ea-body-start' ) && ! noSnippets.includes( 'refraction-snippet-' ) );

		// the Advanced tab in the real panel
		await p.evaluate( () => { const c = refraction.getContainer( 'dc00002' ); $e.run( 'document/elements/select', { container: c } ); $e.route( 'panel/editor/advanced' ); } );
		await sleep( 1200 );
		const panelText = await p.locator( '#refraction-panel' ).innerText();
		check( 'editor', 'the Advanced tab lists Custom CSS, Display Conditions and Attributes sections', /Custom CSS/i.test( panelText ) && /Display Conditions/i.test( panelText ) && /Attributes/i.test( panelText ), panelText.slice( 0, 300 ) );
		await p.screenshot( { path: join( SHOTS, 'editor-advanced.png' ) } );
		await ad.ctx.close();
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	const phpErrors = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Notice|Deprecated|Parse)|Uncaught/.test( l ) );
	check( 'logs', 'no PHP errors, warnings or notices in the debug log', 0 === phpErrors.length, phpErrors.slice( 0, 5 ).join( ' | ' ) );
	check( 'logs', 'no JavaScript console errors', 0 === consoleErrors.length, consoleErrors.slice( 0, 5 ).join( ' | ' ) );

	console.log( `\n${ results.filter( ( r ) => r.pass ).length } passed, ${ failures } failed` );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
