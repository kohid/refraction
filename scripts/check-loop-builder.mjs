#!/usr/bin/env node
/**
 * Dynamic content and Loop Builder check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-loop-builder.mjs [--site /tmp/refraction-site] [--port 8766] [--shots /tmp/lb-shots]
 *                                            [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). The site is changed (content, active
 * theme, a test mu-plugin); use a throw-away site. Classic themes missing from the site are downloaded from wordpress.org
 * (skipped with a note when offline).
 *
 * What it covers, for a classic theme and a block theme:
 *   - dynamic tags on a normal page and on a single post (post, author, site, request, shortcode, visitor, contact,
 *     internal, lightbox, popup stub, custom field incl. protected keys, ACF only when ACF exists);
 *   - Loop Grid, Posts (classic, cards, full content), Portfolio, Loop Carousel, Archive Posts (real archive request) and
 *     the Taxonomy Filter: markup, query settings, dynamic tags per loop item, pagination links, clamping, empty state,
 *     recursion guard, hidden posts (private, draft, password, scheduled) never printed, escaping;
 *   - the REST endpoint: nonce, token, tampering, clamping, filter, draft documents;
 *   - in the browser: ajax pagination, load more, infinite load, taxonomy filter, portfolio filter and masonry, carousel,
 *     responsive columns;
 *   - the editor: dynamic switcher on every supported control type, applying tags, tag settings, Query autocomplete,
 *     Loop Item preview post, template buttons, admin tab and template type dialog, lookup endpoint security;
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
const SITE = arg( 'site', '/tmp/refraction-site' );
const PORT = arg( 'port', '8766' );
const SHOTS = arg( 'shots', '/tmp/lb-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/loop-builder-seed.php' );
const MU = join( HERE, 'fixtures/loop-builder-mu.php' );
const CLASSIC = new Set( [ 'twentytwentyone', 'twentytwenty' ] );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 400 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );
const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

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
	const out = wp( [ 'eval-file', SEED ], { LB_ACTION: action, ...extra } );
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

/** Front end HTML as a visitor (no cookies) or as a logged in context. */
async function html( url, who ) {
	if ( ! who ) {
		const res = await fetch( BASE + url, { redirect: 'follow' } );
		return res.text();
	}
	const res = await who.ctx.request.get( BASE + url );
	return res.text();
}

const count = ( text, re ) => ( text.match( re ) || [] ).length;
const grab = ( text, re ) => [ ...text.matchAll( re ) ].map( ( m ) => m[ 1 ] );
/** Titles printed by a Loop Grid whose Loop Item uses a linked Post Title heading. */
const gridTitles = ( text ) => grab( text, /<h3 class="refraction-heading-title[^"]*"><a href="[^"]*">([^<]*)<\/a><\/h3>/g );
/** Titles printed by the Posts widget. */
const postTitles = ( text ) => grab( text, /<h3 class="refraction-post__title"><a href="[^"]*">([^<]*)<\/a><\/h3>/g );
const nums = ( from, to ) => Array.from( { length: to - from + 1 }, ( _, i ) => `Loop Post ${ String( from + i ).padStart( 2, '0' ) }` );
/** Only the markup of the loop widgets (the theme prints its own latest posts widgets, with protected titles). */
const loops = ( text ) => ( text.match( /<div class="refraction-loop [\s\S]*?refraction-loop-status[^>]*><\/div>/g ) || [] ).join( '\n' );
const HIDDEN = /Hidden (Private|Draft|Password|Scheduled) Post/;

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

	mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );
	copyFileSync( MU, join( WPDIR, 'wp-content/mu-plugins/lb-test.php' ) );

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
		wp( [ 'option', 'update', 'blogdescription', 'Loops and tags' ] );
		wp( [ 'option', 'delete', 'lb_fake_acf' ] );
		wp( [ 'option', 'delete', 'lb_archive_page' ] );
		wp( [ 'rewrite', 'structure', '' ] );
		const c = seed( 'content' );
		const T = seed( 'templates', { LB_CONTENT: JSON.stringify( c ) } );
		try { wp( [ 'user', 'delete', 'subscriber1', '--yes' ] ); } catch { /* not there */ }
		wp( [ 'user', 'create', 'subscriber1', 'subscriber1@example.com', '--role=subscriber', '--user_pass=subscriber1' ] ).toString();
		wp( [ 'option', 'update', 'lb_fake_acf_image', String( c.thumb_a ) ] );

		const admin = await login( browser, 'admin', 'admin' );
		const editorUser = await login( browser, 'editor', 'editor' );
		watch( admin.page, 'admin' );
		watch( editorUser.page, 'editor-role' );

		const url = ( key ) => `/?p=${ T[ key ] }`;

		for ( const theme of themes ) {
			console.log( `\n== theme ${ theme } ==` );
			wp( [ 'theme', 'activate', theme ] );
			wp( [ 'theme', 'mod', 'set', 'custom_logo', String( c.thumb_a ) ] );
			const A = `${ theme }`;

			// ---- Loop Grid -------------------------------------------------------------------------------------
			let page = await html( url( 'grid' ) );
			check( A, 'Loop Grid prints 4 items in newest-first order', same( gridTitles( page ), nums( 1, 4 ) ), gridTitles( page ).join( ',' ) );
			check( A, 'each loop item has the dynamic values of its own post', page.includes( 'Sub: Subtitle 01' ) && page.includes( 'Sub: Subtitle 04' ) && count( page, /Sub: Subtitle/g ) === 4, '' );
			check( A, 'author tag follows the item (odd posts by Ada, even by admin)', count( page, /By Ada Author/g ) === 2 && count( page, /By admin/g ) === 2, '' );
			check( A, 'featured image tag gives each item its image', count( page, /<img [^>]*lb-(red|blue)[^>]*>/g ) >= 4, '' );
			check( A, 'terms tag prints the category', count( page, /<div class="refraction-widget-container">\s*News\s*<\/div>|>\s*News\s*</g ) >= 4, '' );
			check( A, 'private, draft, password and scheduled posts are not printed', loops( page ).length > 500 && ! HIDDEN.test( loops( page ) ) && ! page.includes( 'Hidden body' ), '' );
			check( A, 'the loop item template css is on the page', page.includes( `refraction-post-${ T.item }-css` ), '' );
			check( A, 'numbered pagination: 4 pages, current page 1', /data-total="4"/.test( page ) && /page-numbers current"[^>]*>1</.test( page ), '' );
			check( A, 'front end script, style and rest config are on the page', page.includes( 'loop-builder-frontend' ) && page.includes( 'refractionLoop' ) && page.includes( 'modules/loop-builder/frontend' ), '' );
			const wid = ( page.match( /rpage-([0-9a-f]+)=2/ ) || [] )[ 1 ];
			check( A, 'page links use a per widget parameter', !! wid, '' );
			page = await html( `${ url( 'grid' ) }&rpage-${ wid }=2` );
			check( A, 'page 2 prints posts 5-8', same( gridTitles( page ), nums( 5, 8 ) ), gridTitles( page ).join( ',' ) );
			page = await html( `${ url( 'grid' ) }&rpage-${ wid }=99` );
			check( A, 'a page number past the end shows the last page', same( gridTitles( page ), [ 'Loop Post 13', 'LB Built Post' ] ) && /data-page="4"/.test( page ), gridTitles( page ).join( ',' ) );
			page = await html( `${ url( 'grid' ) }&rpage-${ wid }=abc` );
			check( A, 'a junk page number shows page 1', same( gridTitles( page ), nums( 1, 4 ) ), '' );

			page = await html( url( 'grid_excl' ) );
			const sorted = gridTitles( page );
			check( A, 'query settings: News only, title order, one post excluded, offset 1', sorted.length === 6 && same( sorted, [ ...sorted ].sort() ) && ! sorted.includes( 'Loop Post 01' ) && ! sorted.includes( 'Loop Post 08' ) && sorted.every( ( t ) => /Loop Post 0[1-7]|LB Built Post/.test( t ) ), sorted.join( ',' ) );

			page = await html( url( 'recursion' ) );
			check( A, 'a Loop Grid prints its Loop Item per post', count( page, /class="refraction-loop-item /g ) === 2, String( count( page, /class="refraction-loop-item /g ) ) );
			page = await html( url( 'self_page' ) );
			check( A, 'a loop item that contains a grid of itself does not recurse', count( page, /class="refraction-loop-item /g ) === 2 && page.length < 400000, `${ count( page, /class="refraction-loop-item /g ) } items, ${ page.length } bytes` );

			page = await html( url( 'empty' ) );
			check( A, 'empty query prints the nothing found message', page.includes( 'Nothing here at all.' ) && count( page, /class="[^"]*\brefraction-post\b/g ) === 0, '' );

			// ---- Posts -----------------------------------------------------------------------------------------
			page = await html( url( 'posts_cards' ) );
			check( A, 'Posts cards skin: 4 articles', count( page, /<article class="[^"]*refraction-post--cards/g ) === 4 && same( postTitles( page ), nums( 1, 4 ) ), postTitles( page ).join( ',' ) );
			check( A, 'Posts shows image, meta, excerpt and read more', count( page, /refraction-post__image/g ) === 4 && page.includes( 'refraction-post__meta' ) && page.includes( 'Ada Author' ) && page.includes( '0 comments' ) && page.includes( 'refraction-post__excerpt' ) && page.includes( 'refraction-post__read-more' ), '' );
			check( A, 'Previous / Next + numbers pagination (previous disabled on page 1)', /page-numbers prev disabled/.test( page ) && /rel="next"/.test( page ), '' );
			page = await html( url( 'posts_full' ) );
			check( A, 'Posts full content skin prints the post body', page.includes( 'Body of loop post 01.' ) && count( page, /refraction-post--full_content/g ) >= 2, '' );
			page = await html( url( 'posts_classic_more' ) );
			check( A, 'Posts load more prints the button and 3 posts', count( page, /class="refraction-loop-more"/g ) === 1 && count( page, /<article class="[^"]*refraction-post--classic/g ) === 3, '' );

			// ---- Portfolio, carousel ---------------------------------------------------------------------------
			page = await html( url( 'portfolio' ) );
			check( A, 'Portfolio masonry: 8 tiles and a filter bar built from the terms of the tiles', count( page, /<article class="refraction-portfolio-item"/g ) === 8 && page.includes( 'refraction-portfolio--masonry' ) && /data-filter-term="\d+"[^>]*>News</.test( page ) && /data-filter-term="\d+"[^>]*>Other</.test( page ), '' );
			page = await html( url( 'portfolio_grid' ) );
			check( A, 'Portfolio grid with load more', count( page, /<article class="refraction-portfolio-item"/g ) === 6 && page.includes( 'refraction-portfolio--grid' ) && page.includes( 'refraction-loop-more' ), '' );
			page = await html( url( 'carousel' ) );
			check( A, 'Loop Carousel prints 6 slides with the loop item, arrows and dots', count( page, /class="swiper-slide"/g ) === 6 && page.includes( 'refraction-swiper-button-next' ) && page.includes( 'swiper-pagination' ) && count( page, /Sub: Subtitle/g ) === 6, '' );
			check( A, 'carousel settings are handed to the script', /data-settings="[^"]*slides_to_show/.test( page ), '' );

			// ---- Dynamic tags on a page -------------------------------------------------------------------------
			const tagsUrl = `${ url( 'tags_page' ) }&who=%3Cb%3EBob%3C/b%3E`;
			page = await html( tagsUrl );
			const heads = grab( page, /<h2 class="refraction-heading-title[^"]*">([^<]*)<\/h2>/g );
			check( A, 'tags: page title, site title, tagline with before/after, request parameter (tags stripped), shortcode, anonymous fallback', same( heads.slice( 0, 6 ), [ 'LB Tags Page', 'RefractionTest', 'Tagline: Loops and tags!', 'Bob', 'SC-OK', 'visitor-anon' ] ), heads.join( '|' ) );
			check( A, 'tags: post id and the protected key is never read', heads[ 6 ] === String( T.tags_page ) && heads[ 7 ] === 'protected-key-empty' && ! page.includes( 'must-not-leak' ), heads.join( '|' ) );
			const hrefs = grab( page, /<a class="refraction-button[^"]*" href="([^"]*)"/g );
			check( A, 'tags: contact URLs, popup stub, internal URL and lightbox action', hrefs[ 0 ] === 'mailto:hi@example.com?subject=Hello' && hrefs[ 1 ] === 'tel:+15550102030' && hrefs[ 2 ] === 'https://wa.me/442079460958?text=Hi' && hrefs[ 3 ].startsWith( '#refraction-action' ) && hrefs[ 3 ].includes( 'popup' ) && hrefs[ 4 ].endsWith( `?p=${ c.posts[ 2 ] }` ) && hrefs[ 5 ].includes( 'lightbox' ), hrefs.join( ' | ' ) );
			page = await html( tagsUrl, admin );
			check( A, 'tags: visitor info shows the logged in user', grab( page, /<h2 class="refraction-heading-title[^"]*">([^<]*)<\/h2>/g )[ 5 ] === 'admin', '' );

			// ---- Single post: author, terms, custom field, related ---------------------------------------------
			page = await html( url( 'built_post' ) );
			const bh = grab( page, /<h2 class="refraction-heading-title[^"]*">([^<]*(?:<a [^>]*>[^<]*<\/a>)?[^<]*)<\/h2>/g );
			check( A, 'single post: title, author name, terms, custom field, comments, date', bh[ 0 ] === 'LB Built Post' && bh[ 1 ] === 'Author: Ada Author' && / <a href="[^"]*">News<\/a>|<a href="[^"]*">News<\/a>/.test( bh[ 2 ] || '' ) && bh[ 3 ] === 'Built subtitle' && bh[ 4 ] === 'No comments' && /^\d{4}-\d{2}-\d{2}$/.test( bh[ 5 ] ), bh.join( '|' ) );
			check( A, 'single post: author bio', page.includes( 'Ada writes about loops.' ), '' );
			check( A, 'ACF tag prints nothing while ACF is not active (the control falls back to its own value)', ! page.includes( 'ACF-TEXT' ) && bh[ 6 ] === 'x', bh.join( '|' ) );
			check( A, 'related posts: 3 News posts, not the post itself', count( page, /<article class="[^"]*refraction-post--classic/g ) === 3 && ! postTitles( page ).includes( 'LB Built Post' ) && postTitles( page ).every( ( t ) => /^Loop Post 0[1-7]$/.test( t ) ), postTitles( page ).join( ',' ) );
			wp( [ 'option', 'update', 'lb_fake_acf', '1' ] );
			page = await html( url( 'built_post' ) );
			check( A, 'ACF stand in: ACF tag shows the field value', page.includes( 'ACF-TEXT' ), grab( page, /<h2 class="refraction-heading-title[^"]*">([^<]*)<\/h2>/g ).join( '|' ) );
			wp( [ 'option', 'delete', 'lb_fake_acf' ] );

			// ---- Archive Posts on a real archive request --------------------------------------------------------
			wp( [ 'option', 'update', 'lb_archive_page', String( T.archive ) ] );
			page = await html( `/?cat=${ c.news }` );
			const footer = ( page.match( /<div id="lb-archive-footer">([\s\S]*)<\/div>/ ) || [] )[ 1 ] || '';
			check( A, 'Archive Posts lists the posts of the category archive (News only, 4 per page)', same( postTitles( footer ), [ 'Loop Post 01', 'Loop Post 02', 'Loop Post 03', 'Loop Post 04' ] ) && /data-total="2"/.test( footer ), postTitles( footer ).join( ',' ) );
			const apid = ( footer.match( /rpage-([0-9a-f]+)=2/ ) || [] )[ 1 ];
			check( A, 'archive pagination links use the widget page parameter (the theme paged variable is not touched)', !! apid, '' );
			page = await html( `/?cat=${ c.news }&rpage-${ apid }=2` );
			const footer2 = ( page.match( /<div id="lb-archive-footer">([\s\S]*)<\/div>/ ) || [] )[ 1 ] || '';
			check( A, 'archive page 2 shows the rest of the News posts', same( postTitles( footer2 ), [ 'Loop Post 05', 'Loop Post 06', 'Loop Post 07', 'LB Built Post' ] ), postTitles( footer2 ).join( ',' ) );
			page = await html( '/?s=Loop+Post+13' );
			const footer3 = ( page.match( /<div id="lb-archive-footer">([\s\S]*)<\/div>/ ) || [] )[ 1 ] || '';
			check( A, 'Archive Posts follows a search archive', same( postTitles( footer3 ), [ 'Loop Post 13' ] ), postTitles( footer3 ).join( ',' ) );
			page = await html( url( 'archive' ) );
			check( A, 'Archive Posts on a normal page shows the latest posts', postTitles( page ).length === 4, '' );
			wp( [ 'option', 'delete', 'lb_archive_page' ] );

			// ---- Escaping --------------------------------------------------------------------------------------
			const evil = wp( [ 'post', 'create', '--post_title=Evil <script>window.__pwn=1</script> <img src=x onerror=alert(1)> Title', '--post_status=publish', '--porcelain' ] );
			page = await html( url( 'grid' ) );
			const posts = await html( url( 'posts_cards' ) );
			check( A, 'markup in a post title is not executable in the grid or the posts widget', loops( page + posts ).length > 500 && ! /<script>window\.__pwn/.test( loops( page + posts ) ) && ! /<img src=x onerror/.test( loops( page + posts ) ), '' );
			wp( [ 'post', 'delete', evil, '--force' ] );

			// ---- REST endpoint ---------------------------------------------------------------------------------
			page = await html( url( 'grid' ) );
			const token = ( page.match( /data-token="([^"]+)"/ ) || [] )[ 1 ];
			const nonce = ( page.match( /"nonce":"([a-z0-9]+)"/ ) || [] )[ 1 ];
			const rest = async ( body, headers = { 'X-Refraction-Nonce': nonce } ) => {
				const res = await fetch( `${ BASE }/?rest_route=/refraction/v1/loop-page`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify( body ) } );
				let json = null;
				try { json = await res.json(); } catch { /* not json */ }
				return { status: res.status, json };
			};
			check( A, 'rest: token and nonce are on the page', !! token && !! nonce, '' );
			let r = await rest( { token, page: 2 } );
			check( A, 'rest: page 2 returns posts 5-8 and the new pagination', r.status === 200 && same( gridTitles( r.json.items ), nums( 5, 8 ) ) && r.json.page === 2 && r.json.total === 4 && r.json.has_more === true && /page-numbers current"[^>]*>2</.test( r.json.pagination ), JSON.stringify( r.json ).slice( 0, 200 ) );
			r = await rest( { token, page: 2 }, {} );
			check( A, 'rest: no nonce is refused (403)', r.status === 403, String( r.status ) );
			r = await rest( { token, page: 2 }, { 'X-Refraction-Nonce': 'abcdef1234' } );
			check( A, 'rest: wrong nonce is refused (403)', r.status === 403, String( r.status ) );
			r = await rest( { token: `${ token }x`, page: 1 } );
			check( A, 'rest: tampered token is refused (400)', r.status === 400, String( r.status ) );
			r = await rest( { token: `${ token.split( '.' )[ 0 ] }.AAAA`, page: 1 } );
			check( A, 'rest: forged signature is refused (400)', r.status === 400, String( r.status ) );
			r = await rest( { page: 1 } );
			check( A, 'rest: missing token is refused', r.status === 400 || r.status === 401, String( r.status ) );
			r = await rest( { token, page: 0 } );
			check( A, 'rest: page 0 is page 1', r.status === 200 && r.json.page === 1 && same( gridTitles( r.json.items ), nums( 1, 4 ) ), String( r.status ) );
			r = await rest( { token, page: 99999999 } );
			check( A, 'rest: huge page is clamped to the last page', r.status === 200 && r.json.page === 4 && r.json.has_more === false, String( r.json && r.json.page ) );
			r = await rest( { token, page: 1, filter: { taxonomy: 'category', term_id: c.other } } );
			check( A, 'rest: filter by a term of a public taxonomy', r.status === 200 && same( gridTitles( r.json.items ), nums( 8, 11 ) ) && r.json.total === 2, JSON.stringify( gridTitles( r.json.items ) ) );
			r = await rest( { token, page: 1, filter: { taxonomy: 'nav_menu', term_id: 1 } } );
			check( A, 'rest: filter by a non public taxonomy is ignored', r.status === 200 && same( gridTitles( r.json.items ), nums( 1, 4 ) ), '' );
			r = await rest( { token, page: 1, filter: { taxonomy: 'category', term_id: 999999 } } );
			check( A, 'rest: filter by a term that does not exist is ignored', r.status === 200 && same( gridTitles( r.json.items ), nums( 1, 4 ) ), '' );
			r = await rest( { token, page: 1, filter: 'category' } );
			check( A, 'rest: junk filter is rejected or ignored', r.status === 400 || ( r.status === 200 && same( gridTitles( r.json.items ), nums( 1, 4 ) ) ), String( r.status ) );
			r = await rest( { token, page: 1, filter: { taxonomy: 'category', term_id: c.news }, settings: { query_post_type: 'page' } } );
			check( A, 'rest: client sent settings are ignored', r.status === 200 && gridTitles( r.json.items ).every( ( t ) => /Loop Post|LB Built/.test( t ) ), '' );
			check( A, 'rest: hidden posts are never in a response', r.json && r.json.items && ! HIDDEN.test( JSON.stringify( r.json ) ), '' );

			// the document of a token stops being served once it is not public any more
			wp( [ 'post', 'update', String( T.grid ), '--post_status=draft' ] );
			r = await rest( { token, page: 1 } );
			check( A, 'rest: a document that is a draft is not served (404)', r.status === 404, String( r.status ) );
			wp( [ 'post', 'update', String( T.grid ), '--post_status=publish' ] );
			wp( [ 'post', 'update', String( T.grid ), '--post_password=pw' ] );
			r = await rest( { token, page: 1 } );
			check( A, 'rest: a password protected document is not served (404)', r.status === 404, String( r.status ) );
			wp( [ 'post', 'update', String( T.grid ), '--post_password=' ] );
			r = await rest( { token, page: 1 } );
			check( A, 'rest: served again once public', r.status === 200, String( r.status ) );

			// archive widget over rest keeps the archive
			wp( [ 'option', 'update', 'lb_archive_page', String( T.archive ) ] );
			page = await html( `/?cat=${ c.news }` );
			const atoken = ( page.match( /data-widget-type="archive-posts"[^>]*data-token="([^"]+)"/ ) || [] )[ 1 ];
			r = await rest( { token: atoken, page: 2 } );
			check( A, 'rest: Archive Posts page 2 keeps the category', r.status === 200 && same( postTitles( r.json.items ), [ 'Loop Post 05', 'Loop Post 06', 'Loop Post 07', 'LB Built Post' ] ), JSON.stringify( r.json && postTitles( r.json.items ) ) );
			wp( [ 'option', 'delete', 'lb_archive_page' ] );

			// ---- Browser: front end behaviour --------------------------------------------------------------------
			const visitor = await browser.newContext( { viewport: { width: 1280, height: 900 } } );
			const vp = await visitor.newPage();
			watch( vp, `visitor-${ theme }` );
			const itemTitles = async () => vp.$$eval( '.refraction-loop-items h3.refraction-heading-title a', ( els ) => els.map( ( e ) => e.textContent ) );

			await vp.goto( BASE + url( 'grid' ) );
			await vp.waitForSelector( '.refraction-loop--grid' );
			await vp.evaluate( () => { window.__marker = 'same-document'; } );
			const cols = await vp.$eval( '.refraction-loop-items', ( e ) => getComputedStyle( e ).gridTemplateColumns.split( ' ' ).length );
			check( A, 'browser: Loop Grid shows 3 columns on desktop', cols === 3, String( cols ) );
			await vp.click( '.refraction-pagination a[data-page="2"]' );
			await vp.waitForFunction( () => /current[^>]*>2</.test( document.querySelector( '.refraction-loop-pagination' ).innerHTML ), null, { timeout: 15000 } );
			check( A, 'browser: numbered link loads page 2 without leaving the document', same( await itemTitles(), nums( 5, 8 ) ) && await vp.evaluate( () => window.__marker ) === 'same-document', ( await itemTitles() ).join( ',' ) );
			check( A, 'browser: loaded items run their widget handlers (image/heading markup intact)', await vp.$$eval( '.refraction-loop-item .refraction-widget-heading', ( e ) => e.length ) === 4, '' );
			await vp.setViewportSize( { width: 400, height: 800 } );
			await vp.waitForTimeout( 300 );
			check( A, 'browser: one column on a phone', await vp.$eval( '.refraction-loop-items', ( e ) => getComputedStyle( e ).gridTemplateColumns.split( ' ' ).length ) === 1, '' );
			await vp.setViewportSize( { width: 1280, height: 900 } );
			await vp.screenshot( { path: join( SHOTS, `${ theme }-grid.png` ) } );

			await vp.goto( BASE + url( 'grid_more' ) );
			await vp.waitForSelector( '.refraction-loop-more' );
			let n = await vp.$$eval( '.refraction-loop-item', ( e ) => e.length );
			await vp.click( '.refraction-loop-more' );
			await vp.waitForFunction( ( was ) => document.querySelectorAll( '.refraction-loop-item' ).length > was, n, { timeout: 15000 } );
			check( A, 'browser: load more appends the next 5 and keeps the first', ( await vp.$$eval( '.refraction-loop-item', ( e ) => e.length ) ) === 10 && ( await itemTitles() )[ 0 ] === 'Loop Post 01', '' );
			await vp.click( '.refraction-loop-more' );
			await vp.waitForFunction( () => document.querySelectorAll( '.refraction-loop-item' ).length === 14, null, { timeout: 15000 } );
			check( A, 'browser: the last load more removes the button', ( await vp.$$( '.refraction-loop-more' ) ).length === 0 && ( await itemTitles() ).length === 14, '' );

			await vp.goto( BASE + url( 'grid_infinite' ) );
			await vp.waitForSelector( '.refraction-loop-more' );
			for ( let i = 0; i < 6 && ( await vp.$$eval( '.refraction-loop-item', ( e ) => e.length ) ) < 14; i++ ) {
				await vp.evaluate( () => document.querySelector( '.refraction-loop-more' ) && document.querySelector( '.refraction-loop-more' ).scrollIntoView() );
				await vp.waitForTimeout( 900 );
			}
			check( A, 'browser: infinite load fetches pages while scrolling until everything is shown', ( await vp.$$eval( '.refraction-loop-item', ( e ) => e.length ) ) === 14, String( await vp.$$eval( '.refraction-loop-item', ( e ) => e.length ) ) );

			await vp.goto( BASE + url( 'grid_filter' ) );
			await vp.waitForSelector( '.refraction-taxonomy-filter__item' );
			const labels = await vp.$$eval( '.refraction-taxonomy-filter__item', ( e ) => e.map( ( x ) => x.textContent.replace( /\s+/g, ' ' ).trim() ) );
			check( A, 'browser: Taxonomy Filter lists All and the categories with counts', labels[ 0 ] === 'All' && labels.some( ( l ) => /^News\s*8$/.test( l ) ) && labels.some( ( l ) => /^Other\s*6$/.test( l ) ), labels.join( '|' ) );
			await vp.evaluate( () => { window.__marker = 'same-document'; } );
			await vp.click( '.refraction-taxonomy-filter__item:has-text("Other")' );
			await vp.waitForFunction( () => document.querySelector( '.refraction-loop' ).getAttribute( 'data-total' ) === '2', null, { timeout: 15000 } );
			check( A, 'browser: filtering by Other shows Other posts only, pressed state and page count', same( await itemTitles(), nums( 8, 11 ) ) && await vp.$eval( '.refraction-taxonomy-filter__item.is-active', ( e ) => e.textContent.includes( 'Other' ) ) && await vp.evaluate( () => window.__marker ) === 'same-document', ( await itemTitles() ).join( ',' ) );
			await vp.click( '.refraction-pagination a[data-page="2"]' );
			await vp.waitForFunction( () => /current[^>]*>2</.test( document.querySelector( '.refraction-loop-pagination' ).innerHTML ), null, { timeout: 15000 } );
			check( A, 'browser: paging keeps the filter', same( await itemTitles(), nums( 12, 13 ) ), ( await itemTitles() ).join( ',' ) );
			await vp.click( '.refraction-taxonomy-filter__item:has-text("News")' );
			await vp.waitForFunction( () => document.querySelector( '.refraction-loop' ).getAttribute( 'data-total' ) === '2' && document.querySelector( '.refraction-loop-items a' ).textContent === 'Loop Post 01', null, { timeout: 15000 } );
			check( A, 'browser: News filter', ( await itemTitles() ).every( ( t ) => /Loop Post 0[1-4]/.test( t ) ), ( await itemTitles() ).join( ',' ) );
			await vp.click( '.refraction-taxonomy-filter__item:has-text("All")' );
			await vp.waitForFunction( () => document.querySelector( '.refraction-loop' ).getAttribute( 'data-total' ) === '4', null, { timeout: 15000 } );
			check( A, 'browser: All removes the filter', same( await itemTitles(), nums( 1, 4 ) ), '' );

			await vp.goto( BASE + url( 'portfolio' ) );
			await vp.waitForSelector( '.refraction-portfolio-item' );
			await vp.waitForTimeout( 600 );
			const spans = await vp.$$eval( '.refraction-portfolio-item', ( e ) => e.map( ( x ) => x.style.gridRowEnd ) );
			check( A, 'browser: masonry gives every tile a row span', spans.length === 8 && spans.every( ( s ) => /^span \d+$/.test( s ) ), spans.join( ',' ) );
			await vp.click( '.refraction-portfolio-filter__item:has-text("Other")' );
			const visibleTiles = await vp.$$eval( '.refraction-portfolio-item:not([hidden])', ( e ) => e.length );
			check( A, 'browser: portfolio filter hides the tiles of other terms', visibleTiles === 1, String( visibleTiles ) );
			await vp.click( '.refraction-portfolio-filter__item:has-text("All")' );
			check( A, 'browser: portfolio All shows every tile', await vp.$$eval( '.refraction-portfolio-item:not([hidden])', ( e ) => e.length ) === 8, '' );
			await vp.screenshot( { path: join( SHOTS, `${ theme }-portfolio.png` ) } );

			await vp.goto( BASE + url( 'portfolio_grid' ) );
			await vp.click( '.refraction-loop-more' );
			await vp.waitForFunction( () => document.querySelectorAll( '.refraction-portfolio-item' ).length === 12, null, { timeout: 15000 } );
			check( A, 'browser: portfolio load more', true );

			await vp.goto( BASE + url( 'carousel' ) );
			await vp.waitForSelector( '.refraction-loop-carousel-wrapper.swiper-initialized', { timeout: 15000 } );
			const before = await vp.$eval( '.refraction-loop-carousel-wrapper .swiper-wrapper', ( e ) => e.style.transform );
			await vp.click( '.refraction-swiper-button-next' );
			await vp.waitForTimeout( 900 );
			const after = await vp.$eval( '.refraction-loop-carousel-wrapper .swiper-wrapper', ( e ) => e.style.transform );
			check( A, 'browser: Loop Carousel initialises Swiper and the next arrow moves it', before !== after, `${ before } -> ${ after }` );
			check( A, 'browser: carousel shows 3 slides at once on desktop', await vp.$eval( '.refraction-loop-carousel-wrapper .swiper-slide', ( e ) => Math.round( 1000 / e.getBoundingClientRect().width * e.parentElement.parentElement.getBoundingClientRect().width / 1000 ) ) <= 4, '' );
			await vp.screenshot( { path: join( SHOTS, `${ theme }-carousel.png` ) } );
			await visitor.close();
		}

		// ---- The editor ----------------------------------------------------------------------------------------------
		console.log( '\n== editor ==' );
		wp( [ 'theme', 'activate', themes.find( ( t ) => ! CLASSIC.has( t ) ) || themes[ 0 ] ] );
		const ap = admin.page;
		let page;
		const openEditor = async ( id, who = ap ) => {
			await who.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
			await who.waitForFunction( () => window.refraction && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '#refraction-preview-iframe' ), null, { timeout: 90000 } );
			await who.waitForTimeout( 3500 );
		};
		const selectWidget = async ( who, index = 0 ) => {
			await who.evaluate( ( i ) => { const c = refraction.documents.getCurrent().container.children[ 0 ].children[ i ]; $e.run( 'document/elements/select', { container: c } ); }, index );
			await who.waitForTimeout( 1200 );
		};

		await openEditor( T.dyn_page );
		const E = 'editor';
		const tagInfo = await ap.evaluate( () => {
			const tags = refraction.config.dynamicTags.tags;
			const by = ( cat ) => Object.values( tags ).filter( ( t ) => t.categories.includes( cat ) ).map( ( t ) => t.title );
			return { total: Object.keys( tags ).length, groups: Object.values( refraction.config.dynamicTags.groups ).map( ( g ) => g.title ), text: by( 'text' ), url: by( 'url' ), image: by( 'image' ), gallery: by( 'gallery' ), number: by( 'number' ), color: by( 'color' ), datetime: by( 'datetime' ), names: Object.keys( tags ) };
		} );
		check( E, 'the tag set is registered (>= 38 tags) without ACF', tagInfo.total >= 38 && ! tagInfo.names.some( ( n ) => n.startsWith( 'acf-' ) ), String( tagInfo.total ) );
		for ( const [ cat, must ] of Object.entries( { text: [ 'Post Title', 'Post Excerpt', 'Post Content', 'Post Date', 'Post Modified Date', 'Post Time', 'Post Terms', 'Comments Number', 'Custom Field', 'Author Name', 'Author Bio', 'Author Meta', 'Site Title', 'Site Tagline', 'Current Date Time', 'Request Parameter', 'Shortcode', 'Page Title', 'Visitor Info', 'Archive Title', 'Archive Description', 'Archive Meta' ], url: [ 'Post URL', 'Author URL', 'Site URL', 'Archive URL', 'Contact URL', 'Internal URL', 'Lightbox', 'Popup', 'Custom Field (URL)' ], image: [ 'Featured Image', 'Author Avatar', 'Site Logo', 'Custom Field (Image)' ], gallery: [ 'Custom Field (Gallery)' ], number: [ 'Post ID', 'Comments Number', 'Custom Field' ], color: [ 'Custom Field (Color)' ], datetime: [ 'Post Date', 'Current Date Time' ] } ) ) {
			const missing = must.filter( ( m ) => ! tagInfo[ cat ].includes( m ) );
			check( E, `tags for ${ cat } controls: ${ must.length } expected`, ! missing.length, `missing ${ missing.join( ', ' ) }` );
		}
		check( E, 'groups: Post, Author, Archive, Site, Actions and URLs', [ 'Post', 'Author', 'Archive', 'Site', 'Actions and URLs' ].every( ( g ) => tagInfo.groups.includes( g ) ), tagInfo.groups.join( ',' ) );

		await selectWidget( ap, 0 );
		const controlNames = [ 't_text', 't_textarea', 't_wysiwyg', 't_url', 't_image', 't_gallery', 't_number', 't_color', 't_date' ];
		for ( const name of controlNames ) {
			const visible = await ap.locator( `.refraction-control-${ name } .refraction-control-dynamic-switcher, .pcr-app .refraction-control-dynamic-switcher` ).count();
			check( E, `dynamic switcher is present on the ${ name.replace( 't_', '' ) } control`, name === 't_color' ? await ap.locator( '.refraction-control-dynamic-switcher' ).count() === 9 : visible >= 1, String( visible ) );
		}

		const pick = async ( name, title, fill ) => {
			if ( name === 't_color' ) {
				await ap.locator( '.refraction-control-t_color .pcr-button, .refraction-control-t_color [class*=color-picker]' ).first().click();
				await ap.locator( '.pcr-app .refraction-control-dynamic-switcher' ).first().click();
			} else {
				const sw = ap.locator( `.refraction-control-${ name } .refraction-control-dynamic-switcher` );
				await sw.hover().catch( () => {} );
				await sw.click();
			}
			await ap.locator( '.refraction-tags-list__item:visible', { hasText: new RegExp( `^\\s*${ title.replace( /[()]/g, '\\$&' ) }\\s*$` ) } ).first().click();
			await ap.waitForTimeout( 700 );
			if ( fill ) {
				await ap.locator( '.dialog-widget:visible input[data-setting="key"]' ).fill( fill );
				await ap.keyboard.press( 'Tab' );
				await ap.waitForTimeout( 500 );
				await ap.keyboard.press( 'Escape' );
				await ap.mouse.click( 5, 400 );
			}
			await ap.waitForTimeout( 600 );
		};
		await pick( 't_text', 'Site Title' );
		await pick( 't_textarea', 'Site Tagline' );
		await pick( 't_wysiwyg', 'Site Tagline' );
		await pick( 't_url', 'Site URL' );
		await pick( 't_image', 'Site Logo' );
		await pick( 't_gallery', 'Custom Field (Gallery)', 'gallery_ids' );
		await pick( 't_number', 'Post ID' );
		await pick( 't_color', 'Custom Field (Color)', 'brand_color' );
		await pick( 't_date', 'Post Date' );
		const dyn = await ap.evaluate( () => refraction.documents.getCurrent().container.children[ 0 ].children[ 0 ].settings.get( '__dynamic__' ) );
		const used = Object.fromEntries( Object.entries( dyn || {} ).map( ( [ k, v ] ) => [ k, ( String( v ).match( /name="([^"]+)"/ ) || [] )[ 1 ] ] ) );
		check( E, 'a tag can be applied to every control type from the panel', same( used, { t_text: 'site-title', t_textarea: 'site-tagline', t_wysiwyg: 'site-tagline', t_url: 'site-url', t_image: 'site-logo', t_gallery: 'post-custom-field-gallery', t_number: 'post-id', t_color: 'post-custom-field-color', t_date: 'post-date' } ), JSON.stringify( used ) );
		check( E, 'tag settings (field name) are stored with the tag', decodeURIComponent( String( dyn && dyn.t_gallery ) ).includes( 'gallery_ids' ) && decodeURIComponent( String( dyn && dyn.t_color ) ).includes( 'brand_color' ), '' );
		const previewText = await ap.frameLocator( '#refraction-preview-iframe' ).locator( '.lb-dyn' ).innerText();
		check( E, 'the preview shows the tag values (site title, tagline, post id)', previewText.includes( 'RefractionTest' ) && previewText.includes( 'Loops and tags' ) && previewText.includes( String( T.dyn_page ) ), previewText.replace( /\s+/g, ' ' ).slice( 0, 200 ) );
		await ap.screenshot( { path: join( SHOTS, 'editor-dynamic.png' ) } );
		wp( [ 'post', 'meta', 'update', String( T.dyn_page ), 'gallery_ids', `${ c.thumb_a },${ c.thumb_b }` ] );
		wp( [ 'post', 'meta', 'update', String( T.dyn_page ), 'brand_color', '#aa5500' ] );
		await ap.evaluate( () => $e.run( 'document/save/publish' ) );
		await ap.waitForFunction( () => ! refraction.documents.getCurrent().editor.isChanged, null, { timeout: 30000 } );
		page = await html( url( 'dyn_page' ) );
		check( E, 'front end: text, textarea, wysiwyg, url, number, number', page.includes( '<p class="lb-dyn-text">RefractionTest</p>' ) && page.includes( '<p class="lb-dyn-textarea">Loops and tags</p>' ) && page.includes( 'Loops and tags' ) && page.includes( `href="${ BASE }/"` ) && page.includes( `<p class="lb-dyn-number">${ T.dyn_page }</p>` ), '' );
		check( E, 'front end: image, gallery, color and date values', /<img class="lb-dyn-image" alt="" src="[^"]*lb-red[^"]*"/.test( page ) && /lb-dyn-gallery">[^<]*lb-red[^<]*lb-blue/.test( page ) && page.includes( 'color: #aa5500' ) && /<p class="lb-dyn-date">\w+ \d+, \d{4}<\/p>/.test( page ), grab( page, /(<p class="lb-dyn-(?:gallery|date)">[^<]*<\/p>)/g ).join( '' ) );
		wp( [ 'post', 'meta', 'update', String( T.dyn_page ), 'brand_color', 'red; background:url(x)' ] );
		page = await html( url( 'dyn_page' ) );
		check( E, 'a custom field cannot inject css into a color control', ! page.includes( 'background:url(x)' ), '' );

		// Loop Grid in the editor
		await openEditor( T.grid );
		await selectWidget( ap, 0 );
		const tmplOptions = await ap.locator( 'select[data-setting="template_id"] option' ).allInnerTexts();
		check( E, 'Loop Grid: template list holds the published Loop Items', tmplOptions.includes( 'LB Card' ) && tmplOptions[ 0 ] === 'Choose a template', tmplOptions.join( '|' ) );
		check( E, 'Loop Grid: edit and create template buttons', await ap.locator( '.refraction-control-edit_template button' ).count() === 1 && await ap.locator( '.refraction-control-create_template button' ).count() === 1, '' );
		const frame = ap.frameLocator( '#refraction-preview-iframe' );
		await frame.locator( '.refraction-loop-item' ).first().waitFor( { timeout: 30000 } );
		check( E, 'Loop Grid: the preview prints the items with dynamic content', ( await frame.locator( '.refraction-loop-item' ).count() ) === 4 && ( await frame.locator( '.refraction-loop-items' ).innerText() ).includes( 'Sub: Subtitle 01' ), '' );
		const [ editTab ] = await Promise.all( [ admin.ctx.waitForEvent( 'page', { timeout: 15000 } ), ap.locator( '.refraction-control-edit_template button' ).click() ] );
		check( E, 'Loop Grid: Edit the template opens the Loop Item editor', /post=\d+&action=refraction/.test( editTab.url() ) || /action=refraction/.test( editTab.url() ), editTab.url() );
		await editTab.close();
		const before = await ap.locator( 'select[data-setting="template_id"] option' ).count();
		const [ newTab ] = await Promise.all( [ admin.ctx.waitForEvent( 'page', { timeout: 30000 } ), ap.locator( '.refraction-control-create_template button' ).click() ] );
		await ap.waitForFunction( ( was ) => document.querySelectorAll( 'select[data-setting="template_id"] option' ).length > was, before, { timeout: 15000 } );
		const chosen = await ap.evaluate( () => refraction.documents.getCurrent().container.children[ 0 ].children[ 0 ].settings.get( 'template_id' ) );
		check( E, 'Loop Grid: Create a template makes a Loop Item, opens it and selects it', /action=refraction/.test( newTab.url() ) && String( chosen ) !== String( T.item ), `${ newTab.url() } chosen ${ chosen }` );
		await newTab.close();
		wp( [ 'post', 'delete', String( chosen ), '--force' ] );

		// Query autocomplete
		await ap.evaluate( ( id ) => { const c = refraction.documents.getCurrent().container.children[ 0 ].children[ 0 ]; $e.run( 'document/elements/settings', { container: c, settings: { template_id: String( id ) } } ); }, T.item );
		await ap.waitForTimeout( 1000 );
		const querySection = ap.locator( '.refraction-control-section_query, .refraction-panel-category-items .refraction-control-type-section:has-text("Query")' ).first();
		await querySection.click().catch( () => {} );
		await ap.waitForTimeout(600);
		const acInput = ap.locator( '.refraction-control-query_include_term_ids .refraction-ac input[type="search"]' );
		check( E, 'Query group: autocomplete control is on the panel', await acInput.count() === 1, '' );
		await acInput.click();
		await ap.locator( '.refraction-control-query_include_term_ids .refraction-ac__results button' ).first().waitFor( { timeout: 10000 } );
		await acInput.fill( 'new' );
		await ap.waitForTimeout( 900 );
		const found = await ap.locator( '.refraction-control-query_include_term_ids .refraction-ac__results button' ).allInnerTexts();
		check( E, 'Query autocomplete: searching terms finds News', found.length === 1 && /News/.test( found[ 0 ] ), found.join( '|' ) );
		await ap.locator( '.refraction-control-query_include_term_ids .refraction-ac__results button' ).first().click();
		await ap.waitForTimeout( 800 );
		const chips = await ap.locator( '.refraction-control-query_include_term_ids .refraction-ac__chip span' ).allInnerTexts();
		const stored = await ap.evaluate( () => refraction.documents.getCurrent().container.children[ 0 ].children[ 0 ].settings.get( 'query_include_term_ids' ) );
		check( E, 'Query autocomplete: the chosen term is a chip and the value is its ID', chips[ 0 ] === 'News' && same( stored.map( String ), [ String( c.news ) ] ), JSON.stringify( stored ) );
		await ap.waitForTimeout( 1500 );
		const filtered = await frame.locator( '.refraction-loop-items a' ).allInnerTexts();
		check( E, 'Query: the preview follows the chosen term (News only)', filtered.length === 4 && filtered.every( ( t ) => /Loop Post 0[1-7]|LB Built/.test( t ) ), filtered.join( ',' ) );
		await ap.locator( '.refraction-control-query_include_term_ids .refraction-ac__chip button' ).click();
		await ap.waitForTimeout( 500 );
		check( E, 'Query autocomplete: a chip can be removed', ( await ap.locator( '.refraction-control-query_include_term_ids .refraction-ac__chip' ).count() ) === 0, '' );
		await ap.screenshot( { path: join( SHOTS, 'editor-loop-grid.png' ) } );

		// Loop Item preview post
		await openEditor( T.item );
		const lpreview = ap.frameLocator( '#refraction-preview-iframe' );
		await lpreview.locator( '.refraction-heading-title' ).first().waitFor( { timeout: 30000 } );
		check( E, 'Loop Item: the dynamic tags show the latest post by default', ( await lpreview.locator( '.refraction-heading-title' ).first().innerText() ) === 'Loop Post 01', await lpreview.locator( '.refraction-heading-title' ).first().innerText() );
		await ap.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await ap.waitForTimeout( 800 );
		await ap.locator( '.refraction-control-refraction_loop_preview_section, .refraction-control-type-section:has-text("Preview")' ).first().click().catch( () => {} );
		await ap.waitForTimeout( 500 );
		const pin = ap.locator( '.refraction-control-refraction_loop_preview_post .refraction-ac input[type="search"]' );
		await pin.fill( 'Post 05' );
		await ap.waitForTimeout( 900 );
		await ap.locator( '.refraction-control-refraction_loop_preview_post .refraction-ac__results button' ).first().click();
		await ap.waitForTimeout( 800 );
		await ap.evaluate( () => $e.run( 'document/save/update' ) ).catch( () => {} );
		await ap.waitForFunction( () => ! refraction.documents.getCurrent().editor.isChanged, null, { timeout: 30000 } ).catch( () => {} );
		await openEditor( T.item );
		await lpreview.locator( '.refraction-heading-title' ).first().waitFor( { timeout: 30000 } );
		check( E, 'Loop Item: the chosen preview post drives the dynamic tags', ( await lpreview.locator( '.refraction-heading-title' ).first().innerText() ) === 'Loop Post 05', await lpreview.locator( '.refraction-heading-title' ).first().innerText() );
		await ap.screenshot( { path: join( SHOTS, 'editor-loop-item.png' ) } );

		// ---- Admin ---------------------------------------------------------------------------------------------------
		console.log( '\n== admin ==' );
		const A2 = 'admin';
		await ap.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=loop-item` );
		const tabs = await ap.locator( '.rtb-tab-label' ).allInnerTexts();
		check( A2, 'Theme Builder has a Loop Items tab', tabs.includes( 'Loop Items' ), tabs.join( ',' ) );
		const rows = await ap.locator( '.rtb-table .row-title' ).allInnerTexts();
		check( A2, 'the Loop Items tab lists the Loop Item templates without a conditions column', rows.includes( 'LB Card' ) && await ap.locator( '.column-conditions' ).count() === 0, rows.join( ',' ) );
		await ap.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_library` );
		await ap.locator( '.page-title-action' ).first().click();
		await ap.waitForSelector( '#refraction-new-template__form__template-type', { timeout: 15000 } );
		const typeOptions = await ap.locator( '#refraction-new-template__form__template-type option' ).allInnerTexts();
		check( A2, 'the template type dialog offers Loop Item', typeOptions.includes( 'Loop Item' ), typeOptions.join( ',' ) );
		await ap.screenshot( { path: join( SHOTS, 'admin-loop-tab.png' ) } );

		// ---- Lookup endpoint security -----------------------------------------------------------------------------
		console.log( '\n== lookup endpoint ==' );
		const L = 'lookup';
		await openEditor( T.grid, editorUser.page );
		const lookupNonce = await editorUser.page.evaluate( () => window.refractionLoopBuilder.lookupNonce );
		const lookup = async ( who, body ) => who.ctx.request.post( `${ BASE }/wp-admin/admin-ajax.php`, { form: { action: 'refraction_query_lookup', ...body } } );
		let res = await lookup( editorUser, { kind: 'term', q: 'new' } );
		check( L, 'no nonce is refused', res.status() === 403, String( res.status() ) );
		res = await lookup( editorUser, { kind: 'term', q: 'new', _nonce: 'deadbeef00' } );
		check( L, 'a wrong nonce is refused', res.status() === 403, String( res.status() ) );
		res = await lookup( admin, { kind: 'term', q: 'new', _nonce: lookupNonce } );
		check( L, 'a nonce of another user is refused', res.status() === 403, String( res.status() ) );
		res = await lookup( editorUser, { kind: 'term', q: 'new', _nonce: lookupNonce } );
		let json = await res.json();
		check( L, 'a valid request finds terms', res.status() === 200 && json.success && json.data.items.some( ( i ) => i.text === 'News' ), JSON.stringify( json ).slice( 0, 150 ) );
		res = await lookup( editorUser, { kind: 'post', subtype: 'any', q: 'Hidden', _nonce: lookupNonce } );
		json = await res.json();
		check( L, 'post search never returns drafts, scheduled or protected posts', json.success && ! json.data.items.some( ( i ) => /Draft|Scheduled|Password/.test( i.text ) ), JSON.stringify( json.data.items ) );
		res = await lookup( editorUser, { kind: 'post', subtype: 'nav_menu_item', q: 'a', _nonce: lookupNonce } );
		json = await res.json();
		check( L, 'a non public post type finds nothing', json.success && json.data.items.length === 0, JSON.stringify( json ).slice( 0, 150 ) );
		res = await lookup( editorUser, { kind: 'bogus', _nonce: lookupNonce } );
		check( L, 'an unknown lookup kind is refused (400)', res.status() === 400, String( res.status() ) );
		res = await lookup( editorUser, { kind: 'user', q: 'Ada', _nonce: lookupNonce } );
		json = await res.json();
		check( L, 'authors are found by name', json.success && json.data.items.some( ( i ) => i.text === 'Ada Author' ), JSON.stringify( json ).slice( 0, 150 ) );
		res = await lookup( editorUser, { kind: 'post', ids: `${ c.posts[ 0 ] },${ c.hidden_draft }`, _nonce: lookupNonce } );
		json = await res.json();
		check( L, 'turning IDs into labels skips unpublished posts', json.success && json.data.items.length === 1 && json.data.items[ 0 ].text === 'Loop Post 01', JSON.stringify( json.data.items ) );
		const sub = await login( browser, 'subscriber1', 'subscriber1' );
		res = await lookup( sub, { kind: 'term', q: 'new', _nonce: lookupNonce } );
		check( L, 'a subscriber is refused', res.status() === 403, String( res.status() ) );
		res = await sub.ctx.request.post( `${ BASE }/wp-admin/admin-ajax.php`, { form: { action: 'refraction_loop_create_template', _nonce: 'x' } } );
		check( L, 'creating a template without a valid nonce is refused', res.status() === 403, String( res.status() ) );

		// ---- Cleanup ---------------------------------------------------------------------------------------------
		seed( 'cleanup' );
		wp( [ 'user', 'delete', 'subscriber1', '--yes' ] );
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
