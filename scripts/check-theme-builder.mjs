#!/usr/bin/env node
/**
 * Theme Builder check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-theme-builder.mjs [--site /tmp/refraction-site] [--port 8766] [--shots /tmp/tb-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). Classic themes that are
 * missing from the site are downloaded from wordpress.org (skipped with a note when offline). The site is changed
 * (content, permalinks, front page, active theme); use a throw-away site.
 *
 * What it covers, for a classic theme and a block theme (WordPress ships block themes):
 *   - header and footer shown on the front end, with a valid document skeleton on classic themes;
 *   - front page vs inner pages, specific page include/exclude, child of, author, archives (category, term,
 *     author, date), search, 404;
 *   - logged out / logged in / role conditions, audience tie-break, exclude by role;
 *   - specificity precedence, newest wins a tie, drafts and trashed templates are ignored;
 *   - fallback to the theme's own header/footer when nothing matches or no template exists;
 *   - explicit opt-in (add_theme_support + refraction_theme_builder_header());
 *   - nothing printed in wp-admin; template preview/direct view shows only the template;
 *   - admin screen (tabs, readable conditions, add new through the type dialog, delete), editor opens, conditions UI
 *     (search for a page, include/exclude, hint), publish saves rules, role/capability behaviour of the endpoint;
 *   - Floating Elements are evaluated by the same engine;
 *   - no PHP errors in the debug log, no JS console errors.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/refraction-site' );
const PORT = arg( 'port', '8766' );
const SHOTS = arg( 'shots', '/tmp/tb-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwenty,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/theme-builder-seed.php' );
const CLASSIC_MARKERS_BY_THEME = { twentytwentyone: { header: 'id="masthead"', footer: 'id="colophon"' }, twentytwenty: { header: 'id="site-header"', footer: 'id="site-footer"' } };
const CLASSIC_MARKERS = CLASSIC_MARKERS_BY_THEME.twentytwentyone;

const results = [];
let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	results.push( { area, name, pass: !! pass } );
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 300 ) }` }` );
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
const seed = ( action, extra = {} ) => {
	const out = wp( [ 'eval-file', SEED ], { TB_ACTION: action, ...extra } );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
};
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );

async function up() {
	try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; }
}

async function login( browser, user, pass ) {
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 1000 } } );
	const page = await ctx.newPage();
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );
	return { ctx, page };
}

/** Fetch a front end URL as a visitor: 'out', or a logged in Playwright context. */
async function html( url, who ) {
	if ( ! who ) {
		const res = await fetch( BASE + url, { redirect: 'follow' } );
		return res.text();
	}
	const res = await who.ctx.request.get( BASE + url );
	return res.text();
}

/** Which Refraction template (by key) fills each location in this HTML. */
function slots( page, ids ) {
	const key = ( id ) => Object.keys( ids ).find( ( k ) => ids[ k ] === id ) ?? `#${ id }`;
	const pick = ( tag, loc ) => {
		const m = page.match( new RegExp( `<${ tag } class="refraction-location-${ loc }"[^>]*data-refraction-template-id="(\\d+)"` ) );
		return m ? key( parseInt( m[ 1 ], 10 ) ) : null;
	};

	return { header: pick( 'header', 'header' ), footer: pick( 'footer', 'footer' ) };
}

function themeHas( page, theme, loc ) {
	if ( CLASSIC.has( theme ) ) { return page.includes( CLASSIC_MARKERS_BY_THEME[ theme ][ loc ] ); }
	const tag = loc === 'header' ? 'header' : 'footer';

	return new RegExp( `<${ tag } class="wp-block-template-part"` ).test( page ) || new RegExp( `<${ tag }[^>]*class="[^"]*wp-block-template-part` ).test( page );
}

const CLASSIC = new Set( [ 'twentytwentyone', 'twentytwenty' ] );

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
			// A 404 test URL is expected to log its own 404; favicon is not part of the plugin.
			if ( m.type() === 'error' && ! /favicon\.ico|nothing-lives-here/.test( m.location().url ) && ! /Transition was skipped/.test( m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
		} );
		page.on( 'pageerror', ( e ) => ! /Transition was skipped/.test( e.message ) && consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
		page.on( 'response', ( r ) => { if ( r.status() >= 400 && ! /favicon\.ico|nothing-lives-here/.test( r.url() ) ) { console.log( `      http ${ r.status() } ${ r.url().slice( 0, 90 ) } ${ String( r.request().postData() || '' ).slice( 0, 120 ) } [${ label }]` ); } } );
	};

	try {
		// Themes available in this run.
		const installed = new Set( wp( [ 'theme', 'list', '--field=name' ] ).split( '\n' ) );
		const themes = [];
		for ( const t of THEMES ) {
			if ( ! installed.has( t ) ) {
				try { wp( [ 'theme', 'install', t ] ); installed.add( t ); } catch { console.log( `note: theme ${ t } is not installed and could not be downloaded; skipped` ); continue; }
			}
			themes.push( t );
		}
		check( 'setup', 'at least one classic and one block theme are available', themes.some( ( t ) => CLASSIC.has( t ) ) && themes.some( ( t ) => ! CLASSIC.has( t ) ), themes.join( ',' ) );

		wp( [ 'plugin', 'activate', 'refraction' ] );
		const c = seed( 'content' );
		const URLS = {
			front: '/', about: '/about/', contact: '/contact/', team: '/about/team/', postNews: '/news-story/', postOther: '/other-story/',
			notFound: '/nothing-lives-here/', search: '/?s=story', catNews: '/category/news/', catOther: '/category/other/', author: '/author/author1/', date: '/2025/03/',
		};
		const admin = await login( browser, 'admin', 'admin' );
		const editor = await login( browser, 'editor', 'editor' );
		watch( admin.page, 'admin' );
		watch( editor.page, 'editor-role' );
		const whoOf = { out: null, admin, editor };

		const mk = ( list ) => seed( 'templates', { TB_SPEC: JSON.stringify( list ) } );
		const H = ( key, rules, extra = {} ) => ( { key, type: 'header', title: key, rules, ...extra } );
		const F = ( key, rules, extra = {} ) => ( { key, type: 'footer', title: key, rules, ...extra } );
		const expectAll = async ( area, theme, ids, table ) => {
			for ( const [ label, [ url, who, header, footer ] ] of Object.entries( table ) ) {
				const page = await html( url, whoOf[ who ] );
				const got = slots( page, ids );
				const hOk = got.header === header && ( header !== null || themeHas( page, theme, 'header' ) );
				const fOk = got.footer === footer && ( footer !== null || themeHas( page, theme, 'footer' ) );
				check( area, `${ theme }: ${ label } -> header ${ header ?? 'theme' }, footer ${ footer ?? 'theme' }`, hOk && fOk, `got header=${ got.header } footer=${ got.footer }` );
			}
		};

		for ( const theme of themes ) {
			console.log( `\n== theme ${ theme } ==` );
			wp( [ 'theme', 'activate', theme ] );

			// Phase A: entire site, one exclusion.
			let ids = mk( [
				H( 'H_ALL', [ 'include/general' ] ),
				F( 'F_ALL', [ 'include/general', `exclude/singular/page/${ c.contact }` ] ),
			] );
			await expectAll( 'entire-site', theme, ids, {
				'front page': [ URLS.front, 'out', 'H_ALL', 'F_ALL' ],
				'about page': [ URLS.about, 'out', 'H_ALL', 'F_ALL' ],
				'excluded page falls back to the theme footer': [ URLS.contact, 'out', 'H_ALL', null ],
				'single post': [ URLS.postNews, 'out', 'H_ALL', 'F_ALL' ],
				'404': [ URLS.notFound, 'out', 'H_ALL', 'F_ALL' ],
				'search': [ URLS.search, 'out', 'H_ALL', 'F_ALL' ],
				'category archive': [ URLS.catNews, 'out', 'H_ALL', 'F_ALL' ],
				'date archive': [ URLS.date, 'out', 'H_ALL', 'F_ALL' ],
			} );

			const sample = await html( URLS.about );
			if ( CLASSIC.has( theme ) ) {
				const count = ( re ) => ( sample.match( re ) || [] ).length;
				check( 'skeleton', `${ theme }: one doctype, html, head, body and closing tags`, count( /<!DOCTYPE html>/gi ) === 1 && count( /<html[ >]/g ) === 1 && count( /<head>/g ) === 1 && count( /<body[ >]/g ) === 1 && count( /<\/body>/g ) === 1 && count( /<\/html>/g ) === 1, `doctype ${ count( /<!DOCTYPE html>/gi ) } html ${ count( /<html[ >]/g ) } body ${ count( /<body[ >]/g ) }` );
				check( 'skeleton', `${ theme }: the theme's own header and footer markup is gone`, ! sample.includes( CLASSIC_MARKERS_BY_THEME[ theme ].header ) && ! sample.includes( CLASSIC_MARKERS_BY_THEME[ theme ].footer ) );
				check( 'skeleton', `${ theme }: wp_head and wp_footer ran once (admin bar logged out, one jQuery, body class)`, count( /<title>/g ) === 1 && /<body class="[^"]*page/.test( sample ) && count( /id='jquery-core-js'|id="jquery-core-js"/g ) <= 1 );
			}
			check( 'assets', `${ theme }: template CSS is linked in <head>`, new RegExp( `<head>[\\s\\S]*post-${ ids.H_ALL }\\.css[\\s\\S]*</head>` ).test( sample ) && new RegExp( `post-${ ids.F_ALL }\\.css` ).test( sample ) );

			// Phase B: specificity.
			ids = mk( [
				H( 'H_ALL', [ 'include/general' ] ),
				H( 'H_FRONT', [ 'include/front_page' ] ),
				H( 'H_ABOUT', [ `include/singular/page/${ c.about }` ] ),
				H( 'H_TEAM', [ `include/singular/child_of/${ c.about }` ] ),
				H( 'H_AUTHOR', [ `include/singular/author/${ c.author }` ] ),
				H( 'H_ARCH', [ 'include/archive' ] ),
				H( 'H_CAT', [ `include/archive/tax/category/${ c.news }` ] ),
				H( 'H_SRCH', [ 'include/archive/search' ] ),
				H( 'H_404', [ 'include/404' ] ),
				F( 'F_ALL', [ 'include/general', `exclude/singular/page/${ c.contact }` ] ),
				F( 'F_POSTS', [ 'include/singular/post' ] ),
			] );
			await expectAll( 'specificity', theme, ids, {
				'front page beats entire site': [ URLS.front, 'out', 'H_FRONT', 'F_ALL' ],
				'specific page beats entire site': [ URLS.about, 'out', 'H_ABOUT', 'F_ALL' ],
				'child page matches child-of, not the parent page rule': [ URLS.team, 'out', 'H_TEAM', 'F_ALL' ],
				'other page keeps the entire site header': [ URLS.contact, 'out', 'H_ALL', null ],
				'post by admin: entire site header, posts footer': [ URLS.postNews, 'out', 'H_ALL', 'F_POSTS' ],
				'post by author1: author rule': [ URLS.postOther, 'out', 'H_AUTHOR', 'F_POSTS' ],
				'404 rule': [ URLS.notFound, 'out', 'H_404', 'F_ALL' ],
				'search rule': [ URLS.search, 'out', 'H_SRCH', 'F_ALL' ],
				'category term archive': [ URLS.catNews, 'out', 'H_CAT', 'F_ALL' ],
				'other category falls to all archives': [ URLS.catOther, 'out', 'H_ARCH', 'F_ALL' ],
				'author archive falls to all archives': [ URLS.author, 'out', 'H_ARCH', 'F_ALL' ],
				'date archive falls to all archives': [ URLS.date, 'out', 'H_ARCH', 'F_ALL' ],
			} );

			// Phase C: visitors.
			ids = mk( [
				H( 'H_ALL', [ 'include/general' ], { age: 5000 } ),
				H( 'H_OUT', [ 'include/general', 'include/visitor/logged_out' ], { age: 4000 } ),
				H( 'H_IN', [ 'include/general', 'include/visitor/logged_in' ], { age: 3000 } ),
				H( 'H_EDITOR', [ 'include/visitor/role/editor' ], { age: 100 } ),
				F( 'F_ALL', [ 'include/general', 'exclude/visitor/role/editor' ] ),
			] );
			await expectAll( 'visitors', theme, ids, {
				'logged out sees the logged-out header': [ URLS.about, 'out', 'H_OUT', 'F_ALL' ],
				'administrator sees the logged-in header': [ URLS.about, 'admin', 'H_IN', 'F_ALL' ],
				'editor: role rule wins the tie as the newest, exclude by role removes the footer': [ URLS.about, 'editor', 'H_EDITOR', null ],
			} );

			// Phase D: ties, drafts, trash, exclude wins.
			ids = mk( [
				H( 'H_OLD', [ 'include/general' ], { age: 1000 } ),
				H( 'H_NEW', [ 'include/general' ], { age: 10 } ),
				H( 'H_DRAFT', [ 'include/general' ], { age: 0, status: 'draft' } ),
				H( 'H_TRASH', [ 'include/general' ], { age: 0 } ),
				F( 'F_Y', [ 'include/general' ], { age: 1000 } ),
				F( 'F_X', [ 'include/general', `exclude/singular/page/${ c.about }` ], { age: 10 } ),
			] );
			wp( [ 'eval', `wp_trash_post( ${ ids.H_TRASH } );` ] );
			await expectAll( 'ties', theme, ids, {
				'newest template wins a tie; drafts and trashed templates are ignored': [ URLS.contact, 'out', 'H_NEW', 'F_X' ],
				'an excluded template loses even when newer': [ URLS.about, 'out', 'H_NEW', 'F_Y' ],
			} );

			// Phase E: nothing configured.
			seed( 'reset' );
			await expectAll( 'fallback', theme, {}, {
				'front page, no templates at all': [ URLS.front, 'out', null, null ],
				'inner page, no templates at all': [ URLS.about, 'out', null, null ],
			} );
			const plain = await html( URLS.about );
			check( 'fallback', `${ theme }: no Refraction location markup anywhere`, ! plain.includes( 'refraction-location' ) );

			// A header only: the footer stays the theme's.
			ids = mk( [ H( 'H_ONLY', [ 'include/general' ] ) ] );
			await expectAll( 'fallback', theme, ids, { 'header only': [ URLS.about, 'out', 'H_ONLY', null ] } );
		}

		// ---- Checks on the first classic theme. -------------------------------------------------
		const classic = themes.find( ( t ) => CLASSIC.has( t ) ) ?? themes[ 0 ];
		wp( [ 'theme', 'activate', classic ] );
		console.log( `\n== admin, editor, endpoint, preview, opt-in, floating (theme ${ classic }) ==` );

		let ids = mk( [
			H( 'H_ALL', [ 'include/general' ] ),
			H( 'H_NONE', [] ),
			F( 'F_ALL', [ 'include/general', `exclude/singular/page/${ c.contact }` ] ),
		] );

		// No output in wp-admin.
		for ( const p of [ '/wp-admin/index.php', '/wp-admin/edit.php?post_type=page', '/wp-admin/admin.php?page=refraction-theme-builder' ] ) {
			const page = await html( p, admin );
			check( 'admin', `no Theme Builder markup on ${ p }`, ! page.includes( 'refraction-location' ) );
		}
		const ajaxPage = await admin.ctx.request.post( `${ BASE }/wp-admin/admin-ajax.php`, { form: { action: 'heartbeat' } } );
		check( 'admin', 'no Theme Builder markup in an admin-ajax response', ! ( await ajaxPage.text() ).includes( 'refraction-location' ) );

		// Admin screen.
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder` );
		const body = await admin.page.locator( '.rtb-wrap' ).innerText();
		check( 'admin-screen', 'headers tab lists the templates with readable conditions', /H_ALL/.test( body ) && /Entire site/.test( body ) && /Not displayed anywhere/.test( body ), body.slice( 0, 200 ) );
		check( 'admin-screen', 'tab counts', /Headers\s*2/.test( body ) && /Footers\s*1/.test( body ), body.slice( 0, 160 ) );
		await admin.page.screenshot( { path: join( SHOTS, 'admin-headers.png' ), fullPage: true } );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=footer` );
		const footerBody = await admin.page.locator( '.rtb-wrap' ).innerText();
		check( 'admin-screen', 'footers tab shows an exclusion as readable text', /Entire site/.test( footerBody ) && /Exclude: Page: Contact/.test( footerBody ), footerBody );
		check( 'admin-screen', 'status column', /Published/.test( footerBody ) );
		await admin.page.screenshot( { path: join( SHOTS, 'admin-footers.png' ), fullPage: true } );
		const menuLabels = await admin.page.$$eval( '#adminmenu .wp-submenu a', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'admin-screen', 'Theme Builder is in the Refraction submenu', menuLabels.includes( 'Theme Builder' ) );

		// Row action: delete.
		const tmp = mk( [ H( 'H_TMP', [ 'include/general' ] ), H( 'H_ALL', [ 'include/general' ] ), H( 'H_NONE', [] ), F( 'F_ALL', [ 'include/general', `exclude/singular/page/${ c.contact }` ] ) ] );
		ids = tmp;
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder` );
		const row = admin.page.locator( 'tr', { hasText: 'H_TMP' } );
		await row.hover();
		check( 'admin-screen', 'row actions: Edit with Refraction and Delete', ( await row.locator( '.row-actions' ).innerText() ).includes( 'Edit with Refraction' ) && ( await row.locator( '.row-actions' ).innerText() ).includes( 'Delete' ) );
		await Promise.all( [ admin.page.waitForURL( /deleted=1/ ), row.locator( '.submitdelete' ).click() ] );
		check( 'admin-screen', 'Delete trashes the template and leaves a notice', ( await admin.page.locator( '.notice-success' ).innerText() ).includes( 'trash' ) && wp( [ 'post', 'get', String( ids.H_TMP ), '--field=post_status' ] ) === 'trash' );

		// Add New goes through the template type dialog with the type preselected.
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=footer` );
		const addHref = await admin.page.locator( '.page-title-action' ).getAttribute( 'href' );
		check( 'admin-screen', 'Add New links to the template dialog for the open tab', /refraction_library_type=footer/.test( addHref ) && addHref.endsWith( '#add_new' ), addHref );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder` );
		await admin.page.click( '.page-title-action' );
		await admin.page.waitForSelector( '#refraction-new-template__form__template-type', { timeout: 15000 } );
		const preselected = await admin.page.inputValue( '#refraction-new-template__form__template-type' );
		const typeOptions = await admin.page.$$eval( '#refraction-new-template__form__template-type option', ( o ) => o.map( ( x ) => x.value ) );
		check( 'dialog', 'Choose Template Type lists Header and Footer and preselects Header', typeOptions.includes( 'header' ) && typeOptions.includes( 'footer' ) && 'header' === preselected, `${ preselected } of ${ typeOptions }` );
		await admin.page.screenshot( { path: join( SHOTS, 'dialog-new-header.png' ) } );
		await admin.page.fill( '#refraction-new-template__form__post-title', 'UI-HEADER' );
		await Promise.all( [ admin.page.waitForURL( /action=refraction/, { timeout: 60000 } ), admin.page.click( '#refraction-new-template__form__submit' ) ] );

		// Editor opens; build content and conditions through the UI.
		await admin.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		await sleep( 2500 );
		const uiId = parseInt( new URL( admin.page.url() ).searchParams.get( 'post' ), 10 );
		check( 'editor', 'the editor opens for the new header', uiId > 0 );
		await admin.page.evaluate( () => {
			const container = $e.run( 'document/elements/create', { container: refraction.getPreviewContainer(), model: { elType: 'container' } } );
			$e.run( 'document/elements/create', { container, model: { elType: 'widget', widgetType: 'heading', settings: { title: 'UI-HEADER-TEXT' } } } );
		} );
		await admin.page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await sleep( 800 );
		await admin.page.click( '.refraction-control-type-section:has-text("Display Conditions")' );
		await sleep( 500 );
		check( 'conditions-ui', 'a header without rules says "Not displayed anywhere"', await admin.page.locator( '.rtb-cond__notice' ).isVisible() && /Not displayed anywhere/.test( await admin.page.locator( '.rtb-cond__notice' ).innerText() ) );
		await admin.page.screenshot( { path: join( SHOTS, 'editor-conditions-empty.png' ) } );
		await admin.page.click( '.rtb-cond__quick' );
		check( 'conditions-ui', '"Show on entire site" adds Include / Entire site and clears the hint', ( await admin.page.locator( '.rtb-cond__row' ).count() ) === 1 && ! ( await admin.page.locator( '.rtb-cond__notice' ).count() ) );
		await admin.page.click( '.rtb-cond__add' );
		await admin.page.locator( '.rtb-cond__row' ).nth( 1 ).locator( '.rtb-cond__verb .is-exclude' ).click();
		check( 'conditions-ui', 'the second row is an exclude row', ( await admin.page.locator( '.rtb-cond__row' ).nth( 1 ).getAttribute( 'class' ) ).includes( 'is-exclude' ) );
		await admin.page.locator( '.rtb-cond__row' ).nth( 1 ).locator( 'select' ).first().selectOption( 'singular' );
		await admin.page.locator( '.rtb-cond__row' ).nth( 1 ).locator( 'select' ).nth( 1 ).selectOption( 'page' );
		const search = admin.page.locator( '.rtb-cond__row' ).nth( 1 ).locator( '.rtb-cond__target input' );
		await search.fill( 'Contact' );
		await admin.page.waitForSelector( '.rtb-cond__results button', { timeout: 10000 } );
		check( 'conditions-ui', 'target search finds the page by title', ( await admin.page.locator( '.rtb-cond__results' ).innerText() ).includes( 'Contact' ) );
		await admin.page.screenshot( { path: join( SHOTS, 'editor-conditions-search.png' ) } );
		await admin.page.locator( '.rtb-cond__results button', { hasText: 'Contact' } ).first().click();
		check( 'conditions-ui', 'picking a result shows it as the target', ( await admin.page.locator( '.rtb-cond__picked-text' ).innerText() ) === 'Contact' );
		const value = await admin.page.evaluate( () => $e.components.get( 'document' ) && refraction.documents.getCurrent().container.settings.get( 'refraction_display_conditions' ) );
		check( 'conditions-ui', 'the control value is the rule list', JSON.stringify( value ) === JSON.stringify( [ 'include/general', `exclude/singular/page/${ c.contact }` ] ), JSON.stringify( value ) );
		await admin.page.click( '.rtb-cond__add' );
		await admin.page.locator( '.rtb-cond__row' ).nth( 2 ).locator( 'select' ).first().selectOption( 'singular' );
		await admin.page.locator( '.rtb-cond__row' ).nth( 2 ).locator( 'select' ).nth( 1 ).selectOption( 'author' );
		check( 'conditions-ui', 'a row missing its required target is flagged and left out of the value', ( await admin.page.locator( '.rtb-cond__row.is-incomplete' ).count() ) === 1 && ( await admin.page.evaluate( () => refraction.documents.getCurrent().container.settings.get( 'refraction_display_conditions' ).length ) ) === 2 );
		await admin.page.screenshot( { path: join( SHOTS, 'editor-conditions-rows.png' ) } );
		await admin.page.locator( '.rtb-cond__row' ).nth( 2 ).locator( '.rtb-cond__remove' ).click();
		await admin.page.evaluate( () => $e.run( 'document/save/publish' ) );
		await admin.page.waitForFunction( () => ! refraction.documents.getCurrent().editor.isChanged, null, { timeout: 30000 } );
		await sleep( 800 );
		const metaRules = JSON.parse( wp( [ 'post', 'meta', 'get', String( uiId ), '_refraction_conditions', '--format=json' ] ) );
		const option = JSON.parse( wp( [ 'option', 'get', 'refraction_pro_theme_builder_conditions', '--format=json' ] ) );
		check( 'conditions-ui', 'publishing stores the rules in post meta', JSON.stringify( metaRules ) === JSON.stringify( [ 'include/general', `exclude/singular/page/${ c.contact }` ] ), JSON.stringify( metaRules ) );
		check( 'conditions-ui', 'publishing mirrors the rules in the shared conditions option', JSON.stringify( option.header?.[ uiId ] ) === JSON.stringify( metaRules ), JSON.stringify( option ) );
		check( 'editor', 'the template is published after saving', wp( [ 'post', 'get', String( uiId ), '--field=post_status' ] ) === 'publish' );
		const uiIds = { ...ids, UI: uiId };
		const afterAbout = slots( await html( URLS.about ), uiIds );
		const afterContact = slots( await html( URLS.contact ), uiIds );
		check( 'conditions-ui', 'the header built through the UI shows on the front end and honours its exclusion', afterAbout.header === 'UI' && afterContact.header !== 'UI', JSON.stringify( [ afterAbout, afterContact ] ) );
		check( 'conditions-ui', 'its content reaches the page', ( await html( URLS.about ) ).includes( 'UI-HEADER-TEXT' ) );
		await admin.page.goto( `${ BASE }/wp-admin/post.php?post=${ uiId }&action=refraction` );
		await admin.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		await sleep( 2000 );
		await admin.page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await sleep( 600 );
		await admin.page.click( '.refraction-control-type-section:has-text("Display Conditions")' );
		await sleep( 800 );
		const reopened = await admin.page.locator( '.rtb-cond__picked-text' ).allInnerTexts();
		check( 'conditions-ui', 'reopening the editor shows the saved rules with real titles', ( await admin.page.locator( '.rtb-cond__row' ).count() ) === 2 && reopened.includes( 'Contact' ), reopened.join( ',' ) );

		const cfg = await admin.page.evaluate( () => ( { nonce: window.refractionThemeBuilder.nonce, url: window.refractionThemeBuilder.ajaxUrl, action: window.refractionThemeBuilder.action } ) );
		// Editor role: read only control, cannot change rules by posting settings.
		// The administrator's editor tab holds the post lock; leave it first.
		await admin.page.goto( `${ BASE }/wp-admin/index.php` );
		wp( [ 'post', 'meta', 'delete', String( uiId ), '_edit_lock' ] );
		await editor.page.goto( `${ BASE }/wp-admin/post.php?post=${ uiId }&action=refraction` );
		await editor.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		await sleep( 2000 );
		await editor.page.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await sleep( 600 );
		await editor.page.click( '.refraction-control-type-section:has-text("Display Conditions")' );
		await sleep( 600 );
		check( 'capability', 'an editor sees the conditions read-only', ( await editor.page.locator( '.rtb-cond.is-readonly' ).count() ) === 1 && ( await editor.page.locator( '.rtb-cond__add' ).count() ) === 0 );
		const forged = wp( [ 'eval', `wp_set_current_user( ${ c.editor } ); $d = \\Refraction\\Plugin::$instance->documents->get( ${ uiId } ); $d->save( [ 'settings' => [ 'refraction_display_conditions' => [ 'include/general', 'include/404' ] ] ] ); echo wp_json_encode( ( new \\Refraction\\Modules\\ThemeBuilder\\Classes\\Conditions_Store() )->get_rules( ${ uiId } ) );` ] );
		check( 'capability', 'saving as an editor cannot change the rules', JSON.stringify( JSON.parse( forged.slice( forged.indexOf( '[' ) ) ) ) === JSON.stringify( metaRules ), forged );
		const forgedAdmin = wp( [ 'eval', `wp_set_current_user( 1 ); $d = \\Refraction\\Plugin::$instance->documents->get( ${ uiId } ); $d->save( [ 'settings' => [ 'refraction_display_conditions' => [ 'include/general', 'include/../x', 'exclude/singular/page/abc', 'include/404', '<script>' ] ] ] ); echo wp_json_encode( ( new \\Refraction\\Modules\\ThemeBuilder\\Classes\\Conditions_Store() )->get_rules( ${ uiId } ) );` ] );
		check( 'security', 'saving as an administrator drops invalid rule strings', JSON.stringify( JSON.parse( forgedAdmin.slice( forgedAdmin.indexOf( '[' ) ) ) ) === JSON.stringify( [ 'include/general', 'include/404' ] ), forgedAdmin );

		// Lookup endpoint.
		const post = ( who, form ) => ( who ? who.ctx.request.post( cfg.url, { form } ) : fetch( cfg.url, { method: 'POST', body: new URLSearchParams( form ) } ) );
		const json = async ( res ) => ( res.json ? res.json() : JSON.parse( await res.text() ) );
		const okRes = await post( admin, { action: cfg.action, _nonce: cfg.nonce, kind: 'post', subtype: 'page', q: 'Cont' } );
		const okJson = await json( okRes );
		check( 'security', 'lookup returns matches for an administrator with a nonce', okJson.success && okJson.data.items.some( ( i ) => i.text === 'Contact' ) );
		const termJson = await json( await post( admin, { action: cfg.action, _nonce: cfg.nonce, kind: 'term', subtype: 'category', q: 'New' } ) );
		const userJson = await json( await post( admin, { action: cfg.action, _nonce: cfg.nonce, kind: 'user', q: 'Ada' } ) );
		check( 'security', 'lookup finds terms and users', termJson.data.items.some( ( i ) => i.text === 'News' ) && userJson.data.items.some( ( i ) => i.text === 'Ada Author' ) );
		const labels = await json( await post( admin, { action: cfg.action, _nonce: cfg.nonce, kind: 'post', subtype: 'any', ids: `${ c.about },${ c.contact }` } ) );
		check( 'security', 'lookup turns IDs into labels', labels.data.items.length === 2 );
		check( 'security', 'lookup without a nonce is refused', ( await post( admin, { action: cfg.action, kind: 'post', q: 'a' } ) ).status() === 403 );
		check( 'security', 'lookup with a bad nonce is refused', ( await post( admin, { action: cfg.action, _nonce: 'nope', kind: 'post', q: 'a' } ) ).status() === 403 );
		const edNonce = await editor.page.evaluate( () => window.refractionThemeBuilder?.nonce );
		check( 'security', 'an editor cannot use the lookup, even with a valid nonce', ( await post( editor, { action: cfg.action, _nonce: edNonce, kind: 'post', q: 'a' } ) ).status() === 403, edNonce );
		const edLabels = await json( await post( editor, { action: cfg.action, _nonce: edNonce, kind: 'post', subtype: 'any', ids: `${ c.contact }` } ) );
		check( 'security', 'an editor can turn saved IDs into labels (read-only view) but only for posts they may read', edLabels.success && edLabels.data.items[ 0 ]?.text === 'Contact' );
		check( 'security', 'a logged out visitor cannot use the lookup', ( await post( null, { action: cfg.action, _nonce: cfg.nonce, kind: 'post', q: 'a' } ) ).status !== 200 );
		check( 'security', 'an unknown lookup kind is a 400', ( await post( admin, { action: cfg.action, _nonce: cfg.nonce, kind: 'option', q: 'a' } ) ).status() === 400 );
		const sqlish = await json( await post( admin, { action: cfg.action, _nonce: cfg.nonce, kind: 'term', subtype: "category' OR 1=1 --", q: "' OR 1=1 --" } ) );
		check( 'security', 'odd input returns an empty result, not an error', sqlish.success && sqlish.data.items.length === 0 );

		// Row rendering escapes titles.
		wp( [ 'post', 'update', String( ids.H_ALL ), '--post_title=<img src=x onerror=alert(1)> Evil' ] );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder` );
		check( 'security', 'template titles are escaped in the admin list', ( await admin.page.locator( '.rtb-table img[onerror]' ).count() ) === 0 && ( await admin.page.locator( '.rtb-table' ).innerText() ).includes( '<img src=x' ) );
		wp( [ 'post', 'update', String( ids.H_ALL ), '--post_title=H_ALL' ] );

		// Preview / direct view of a template shows only the template.
		const own = await html( `/?p=${ uiId }`, admin );
		check( 'preview', 'a template opened on its own shows no other header or footer', own.includes( 'UI-HEADER-TEXT' ) && ! own.includes( 'refraction-location' ) && own.includes( 'refraction-template-canvas' ) );
		const prev = await html( `/?p=${ uiId }&refraction-preview=${ uiId }&ver=1`, admin );
		check( 'preview', 'the editor preview frame does not swap in a header or footer', ! prev.includes( 'refraction-location' ) );
		const pagePrev = await html( `${ URLS.about }?refraction-preview=${ c.about }&ver=1`, admin );
		check( 'preview', 'previewing a normal page still shows the matching header', pagePrev.includes( 'refraction-location-header' ) );

		// Explicit opt-in for classic themes.
		mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );
		const optin = join( WPDIR, 'wp-content/mu-plugins/tb-optin.php' );
		writeFileSync( optin, `<?php
add_action( 'after_setup_theme', function () { if ( get_option( 'tb_optin' ) ) { add_theme_support( 'refraction-theme-builder' ); } } );
add_action( 'wp_body_open', function () { if ( get_option( 'tb_optin' ) && function_exists( 'refraction_theme_builder_header' ) ) { refraction_theme_builder_header(); } } );
` );
		wp( [ 'option', 'update', 'tb_optin', '1' ] );
		const opted = await html( URLS.about );
		check( 'opt-in', 'with theme support the theme keeps its markup and refraction_theme_builder_header() prints the header once', opted.includes( CLASSIC_MARKERS.header ) && ( opted.match( /refraction-location-header/g ) || [] ).length === 1 && ! opted.includes( 'refraction-location-footer' ), `${ ( opted.match( /refraction-location-header/g ) || [] ).length }` );
		wp( [ 'option', 'delete', 'tb_optin' ] );
		rmSync( optin, { force: true } );

		// Floating Elements use the same engine.
		const fl = seed( 'floating', { TB_RULES: JSON.stringify( [ 'include/general', 'exclude/front_page' ] ) } );
		const flFront = await html( URLS.front );
		const flAbout = await html( URLS.about );
		check( 'floating', 'a Floating Element honours an exclude rule', ! flFront.includes( 'TB-FLOAT-CONTENT' ) && flAbout.includes( 'TB-FLOAT-CONTENT' ), `id ${ fl.id }` );
		wp( [ 'post', 'meta', 'update', String( fl.id ), '_refraction_conditions', JSON.stringify( [ 'include/general' ] ), '--format=json' ] );
		check( 'floating', 'entire site still shows it on the front page', ( await html( URLS.front ) ).includes( 'TB-FLOAT-CONTENT' ) );
		wp( [ 'post', 'delete', String( fl.id ), '--force' ] );

		// Front end screenshots and console errors.
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const sids = mk( [ H( 'Header', [ 'include/general' ] ), F( 'Footer', [ 'include/general' ] ) ] );
			const page = await ( await browser.newContext( { viewport: { width: 1300, height: 900 } } ) ).newPage();
			watch( page, `front ${ theme }` );
			await page.goto( BASE + URLS.about );
			await page.screenshot( { path: join( SHOTS, `front-${ theme }.png` ), fullPage: true } );
			const info = await page.evaluate( () => ( { h: !! document.querySelector( 'header.refraction-location-header' ), f: !! document.querySelector( 'footer.refraction-location-footer' ) } ) );
			check( 'frontend', `${ theme }: the browser renders the header and footer, no console errors`, info.h && info.f && ! consoleErrors.length, consoleErrors.join( ' | ' ) );
			await page.goto( BASE + URLS.notFound );
			await page.screenshot( { path: join( SHOTS, `front-404-${ theme }.png` ) } );
			void sids;
		}

		// Fixtures: leave a clean site.
		seed( 'reset' );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder` );
		check( 'admin-screen', 'empty state invites the first template', ( await admin.page.locator( '.rtb-empty' ).innerText() ).includes( 'No header yet' ) );
		await admin.page.screenshot( { path: join( SHOTS, 'admin-empty.png' ), fullPage: true } );
	} finally {
		await browser.close();
		server?.kill();
	}

	check( 'console', 'no JavaScript console errors', ! consoleErrors.length, consoleErrors.join( ' | ' ) );
	const tail = logTail( logStart );
	const phpErrors = tail.split( '\n' ).filter( ( l ) => /PHP (Fatal|Parse|Warning|Notice|Deprecated)|Uncaught/.test( l ) );
	check( 'php-log', 'no PHP errors, warnings or notices in the debug log', ! phpErrors.length, phpErrors.slice( 0, 3 ).join( ' | ' ) );

	console.log( `\n${ results.length - failures }/${ results.length } checks passed` );
	writeFileSync( join( SHOTS, 'theme-builder-results.json' ), JSON.stringify( results, null, 2 ) );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
