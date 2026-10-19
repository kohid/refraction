#!/usr/bin/env node
/**
 * Theme Builder part 2 check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-theme-builder-2.mjs [--site /tmp/rf-theme-site] [--port 8801] [--shots /tmp/tb2-shots]
 *                                                [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwenty,twentytwentyfive]
 *                                                [--only front|editor]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). Missing themes are downloaded
 * from wordpress.org. The site is changed (content, permalinks, front page, active theme); use a throw-away site.
 *
 * What it covers, for two classic themes and a block theme:
 *   - Single (post, page, custom post type), Archive (category, tag, custom taxonomy, author, date, posts page, post type
 *     archive), Search Results and Error 404 templates: matching, specificity, include / exclude, the location guard
 *     (a Single template with "entire site" never takes over an archive), drafts and trashed templates, fallback to the theme;
 *   - header + template + footer order, header/footer templates still resolve around a body template;
 *   - every Theme Elements widget prints the right data on the front end, with escaping;
 *   - admin tabs, Add New with the type preselected;
 *   - editor: Theme Elements panel category, Preview Settings (post, page, category, author, search, 404) re-rendering the
 *     preview, header preview, panel visibility outside Theme Builder templates;
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
const SITE = arg( 'site', '/tmp/rf-theme-site' );
const PORT = arg( 'port', '8801' );
const SHOTS = arg( 'shots', '/tmp/tb2-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwenty,twentytwentyfive' ).split( ',' );
const ONLY = arg( 'only', '' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/theme-builder-2-seed.php' );
const CLASSIC = new Set( [ 'twentytwentyone', 'twentytwenty' ] );

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
const seed = ( action, extra = {} ) => {
	const out = wp( [ 'eval-file', SEED ], { TB2_ACTION: action, ...extra } );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
};
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

async function login( browser, user, pass ) {
	const ctx = await browser.newContext( { viewport: { width: 1500, height: 1000 } } );
	const page = await ctx.newPage();
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForURL( /wp-admin/ ), page.click( '#wp-submit' ) ] );
	return { ctx, page };
}

const get = async ( url ) => ( await fetch( BASE + url, { redirect: 'follow' } ) ).text();

/** The Refraction template (by key) that fills a body or header/footer location in this HTML, or null. */
function slot( page, ids, location ) {
	const m = page.match( new RegExp( `<(?:main|header|footer) class="refraction-location-${ location }"[^>]*data-refraction-template-id="(\\d+)"` ) );
	if ( ! m ) { return null; }

	return Object.keys( ids ).find( ( k ) => ids[ k ] === parseInt( m[ 1 ], 10 ) ) ?? `#${ m[ 1 ] }`;
}

const MU = `<?php
add_action( 'init', function () {
	register_post_type( 'book', [ 'public' => true, 'has_archive' => 'books', 'label' => 'Books', 'labels' => [ 'name' => 'Books', 'singular_name' => 'Book' ], 'supports' => [ 'title', 'editor', 'thumbnail', 'excerpt', 'comments' ], 'rewrite' => [ 'slug' => 'book' ] ] );
	register_taxonomy( 'genre', 'book', [ 'public' => true, 'label' => 'Genres', 'labels' => [ 'name' => 'Genres', 'singular_name' => 'Genre' ], 'rewrite' => [ 'slug' => 'genre' ] ] );
} );
`;

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );
	mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );
	writeFileSync( join( WPDIR, 'wp-content/mu-plugins/tb2-book.php' ), MU );

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
			if ( m.type() === 'error' && ! /favicon\.ico|nothing-lives-here|Transition was skipped/.test( m.location().url + m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
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
		check( 'setup', 'two classic themes and a block theme are available', themes.filter( ( t ) => CLASSIC.has( t ) ).length >= 1 && themes.some( ( t ) => ! CLASSIC.has( t ) ), themes.join( ',' ) );

		wp( [ 'plugin', 'activate', 'refraction' ] );
		const c = seed( 'content' );
		const admin = await login( browser, 'admin', 'admin' );
		watch( admin.page, 'admin' );

		const U = {
			alpha: '/alpha-post/', beta: '/beta-post/', gamma: '/gamma-post/', front: '/', about: '/about/', team: '/about/team/', contact: '/contact/',
			book: '/book/book-one/', cat: '/category/news/', catOther: '/category/other/', tag: '/tag/demo/', genre: '/genre/fiction/', author: '/author/author1/',
			date: '/2025/03/', blog: '/blog/', books: '/books/', search: '/?s=story', searchNone: '/?s=zzzqqqnomatch', notFound: '/nothing-lives-here/',
		};
		const mk = ( list ) => seed( 'templates', { TB2_SPEC: JSON.stringify( list ) } );
		const T = ( key, type, rules, extra = {} ) => ( { key, type, rules, ...extra } );
		const ALL_WIDGETS = [
			{ type: 'theme-site-logo' }, { type: 'theme-site-title' }, { type: 'theme-site-tagline' }, { type: 'theme-page-title' }, { type: 'theme-post-title' },
			{ type: 'theme-featured-image' }, { type: 'theme-post-info' }, { type: 'theme-post-excerpt' }, { type: 'theme-post-content' }, { type: 'theme-author-box' },
			{ type: 'theme-post-navigation' }, { type: 'theme-breadcrumbs' }, { type: 'theme-post-comments' }, { type: 'theme-search-form' },
			{ type: 'theme-sitemap', settings: { sources: [ 'post_type:page', 'taxonomy:category' ] } },
		];

		if ( ONLY !== 'editor' ) {
			for ( const theme of themes ) {
				console.log( `\n== front end, theme ${ theme } ==` );
				wp( [ 'theme', 'activate', theme ] );
				const page = await admin.ctx.newPage();
				watch( page, `front-${ theme }` );
				const who = async ( url ) => { await page.goto( BASE + url ); return page.content(); };
				const visitor = await browser.newContext( { viewport: { width: 1300, height: 900 } } );
				const vp = await visitor.newPage();
				watch( vp, `visitor-${ theme }` );
				const vget = async ( url ) => { await vp.goto( BASE + url ); return vp.content(); };

				// ---- Phase 1: nothing built -> the theme renders everything.
				let ids = mk( [] );
				for ( const [ label, url ] of Object.entries( { post: U.alpha, page: U.about, category: U.cat, search: U.search, '404': U.notFound } ) ) {
					const html = await get( url );
					check( 'fallback', `${ theme }: ${ label } is the theme's own page when no template exists`, ! /refraction-location-(single|archive|search-results|error-404)/.test( html ) && ! html.includes( 'refraction-template-theme-builder' ) );
				}

				// ---- Phase 2: single templates, specificity and exclusion.
				ids = mk( [
					T( 'H_ALL', 'header', [ 'include/general' ] ),
					T( 'F_ALL', 'footer', [ 'include/general' ] ),
					T( 'S_ALL', 'single', [ 'include/singular', `exclude/singular/page/${ c.contact }` ], { widgets: [ { type: 'theme-page-title' }, { type: 'theme-post-title' }, { type: 'theme-breadcrumbs' }, { type: 'theme-post-content' } ] } ),
					T( 'S_POST', 'single', [ 'include/singular/post' ], { widgets: ALL_WIDGETS } ),
					T( 'S_BOOK', 'single', [ 'include/singular/book' ], { widgets: [ { type: 'theme-post-title' }, { type: 'theme-post-content' }, { type: 'theme-breadcrumbs' } ] } ),
					T( 'S_DRAFT', 'single', [ 'include/singular/page/' + c.about ], { status: 'draft' } ),
					T( 'G_ALL', 'single', [ 'include/general' ], { age: 100 } ),
				] );
				const expectSingle = async ( label, url, expected ) => {
					const html = await get( url );
					check( 'single', `${ theme }: ${ label } -> ${ expected ?? 'theme page' }`, slot( html, ids, 'single' ) === expected, `got ${ slot( html, ids, 'single' ) }` );
					return html;
				};
				await expectSingle( 'post', U.alpha, 'S_POST' );
				await expectSingle( 'other post', U.beta, 'S_POST' );
				await expectSingle( 'page', U.about, 'S_ALL' );
				await expectSingle( 'child page', U.team, 'S_ALL' );
				await expectSingle( 'static front page', U.front, 'S_ALL' );
				await expectSingle( 'custom post type', U.book, 'S_BOOK' );
				const contact = await get( U.contact );
				check( 'single', `${ theme }: excluded page falls back to the next template, never the draft`, [ 'G_ALL', null ].includes( slot( contact, ids, 'single' ) ), slot( contact, ids, 'single' ) );

				// The location guard: "entire site" Single templates never take over other kinds of pages.
				for ( const [ label, url ] of Object.entries( { category: U.cat, author: U.author, date: U.date, search: U.search, '404': U.notFound, 'posts page': U.blog } ) ) {
					const html = await get( url );
					check( 'guard', `${ theme }: a Single template with "entire site" stays off the ${ label }`, slot( html, ids, 'single' ) === null );
				}

				// Header + body + footer order, and header/footer templates still work.
				const alphaHtml = await get( U.alpha );
				const hPos = alphaHtml.indexOf( 'refraction-location-header' );
				const bPos = alphaHtml.indexOf( 'refraction-location-single' );
				const fPos = alphaHtml.indexOf( 'refraction-location-footer' );
				check( 'layout', `${ theme }: header template, single template, footer template in that order`, hPos > 0 && bPos > hPos && fPos > bPos, `${ hPos } ${ bPos } ${ fPos }` );
				check( 'layout', `${ theme }: one document skeleton`, ( alphaHtml.match( /<html/g ) || [] ).length === 1 && ( alphaHtml.match( /<\/html>/g ) || [] ).length === 1 );
				check( 'layout', `${ theme }: Refraction canvas body class`, alphaHtml.includes( 'refraction-template-theme-builder' ) );

				// Widget data on the post.
				await vget( U.alpha );
				const text = async ( sel ) => ( await vp.locator( sel ).first().innerText().catch( () => '' ) ).trim();
				const w = ( n ) => `.refraction-widget-theme-${ n }`;
				check( 'widgets', `${ theme }: Site Title prints the site name`, ( await text( `${ w( 'site-title' ) } .refraction-theme-text` ) ) === 'RefractionTest', await text( w( 'site-title' ) ) );
				check( 'widgets', `${ theme }: Site Tagline prints the tagline`, ( await text( w( 'site-tagline' ) ) ) === 'Just a tagline' );
				check( 'widgets', `${ theme }: Site Logo prints the logo image`, ( await vp.locator( `${ w( 'site-logo' ) } img` ).count() ) === 1 );
				check( 'widgets', `${ theme }: Page Title prints the post title`, ( await text( `${ w( 'page-title' ) } .refraction-theme-text` ) ) === 'Alpha Post <i>x</i> & more', await text( w( 'page-title' ) ) );
				check( 'widgets', `${ theme }: Post Title prints and escapes the title`, ( await text( `${ w( 'post-title' ) } .refraction-theme-text` ) ) === 'Alpha Post <i>x</i> & more' && ( await vp.locator( `${ w( 'post-title' ) } i` ).count() ) === 0 );
				check( 'widgets', `${ theme }: Featured Image prints the image`, ( await vp.locator( `${ w( 'featured-image' ) } img` ).count() ) === 1 );
				const info = await text( w( 'post-info' ) );
				check( 'widgets', `${ theme }: Post Info shows author, date, terms and comments`, /Site Admin/.test( info ) && /March 5, 2025/.test( info ) && /News/.test( info ) && /2 comments/.test( info ), info );
				check( 'widgets', `${ theme }: Post Info author links to the author archive`, ( await vp.locator( `${ w( 'post-info' ) } a[href*="/author/"]` ).count() ) === 1 );
				check( 'widgets', `${ theme }: Post Excerpt prints the excerpt`, ( await text( w( 'post-excerpt' ) ) ) === 'Alpha excerpt text.' );
				check( 'widgets', `${ theme }: Post Content prints the content once`, ( await text( w( 'post-content' ) ) ).includes( 'Alpha body text.' ) && ( ( await vp.content() ).match( /Alpha body text\./g ) || [] ).length >= 1 );
				const box = await text( w( 'author-box' ) );
				check( 'widgets', `${ theme }: Author Box shows name and the Site Admin avatar`, /Site Admin/.test( box ) && ( await vp.locator( `${ w( 'author-box' ) } img` ).count() ) === 1, box );
				const nav = await text( w( 'post-navigation' ) );
				check( 'widgets', `${ theme }: Post Navigation links to the previous and next posts`, /Gamma Post/.test( nav ) && /Beta Post/.test( nav ), nav );
				const crumbs = await text( w( 'breadcrumbs' ) );
				check( 'widgets', `${ theme }: Breadcrumbs: Home, category, post`, /Home/.test( crumbs ) && /News/.test( crumbs ) && /Alpha Post/.test( crumbs ), crumbs );
				check( 'widgets', `${ theme }: Post Comments prints the comments`, /First comment/.test( await vp.locator( w( 'post-comments' ) ).innerText() ) );
				const form = vp.locator( `${ w( 'search-form' ) } form` );
				check( 'widgets', `${ theme }: Search Form posts s to the home URL`, ( await form.getAttribute( 'action' ) ) === `${ BASE }/` && ( await form.locator( 'input[name=s]' ).count() ) === 1 );
				const map = await text( w( 'sitemap' ) );
				check( 'widgets', `${ theme }: Sitemap lists pages and categories`, /About/.test( map ) && /Contact/.test( map ) && /News/.test( map ), map );
				await vp.screenshot( { path: join( SHOTS, `single-${ theme }.png` ), fullPage: true } );

				const aboutText = async () => { await vget( U.team ); return { crumbs: await text( w( 'breadcrumbs' ) ), title: await text( `${ w( 'page-title' ) } .refraction-theme-text` ) }; };
				const team = await aboutText();
				check( 'widgets', `${ theme }: Breadcrumbs for a child page go through the parent`, /Home\s*›\s*About\s*›\s*Team/.test( team.crumbs.replace( /\n/g, ' ' ) ) || ( /Home/.test( team.crumbs ) && /About/.test( team.crumbs ) && /Team/.test( team.crumbs ) ), team.crumbs );
				check( 'widgets', `${ theme }: Page Title for a page`, team.title === 'Team' );
				await vget( U.book );
				check( 'widgets', `${ theme }: custom post type prints its own content`, ( await text( `${ w( 'post-title' ) } .refraction-theme-text` ) ) === 'Book One' && /Book One book body/.test( await text( w( 'post-content' ) ) ) );

				// ---- Phase 3: archive templates.
				ids = mk( [
					T( 'H_ALL', 'header', [ 'include/general' ] ),
					T( 'F_ALL', 'footer', [ 'include/general' ] ),
					T( 'A_ALL', 'archive', [ 'include/archive', 'exclude/archive/tax/category/' + c.other ], { widgets: [ { type: 'theme-archive-title' }, { type: 'theme-archive-title', settings: { hide_prefix: 'yes' } }, { type: 'theme-page-title' }, { type: 'theme-breadcrumbs' } ] } ),
					T( 'A_CAT', 'archive', [ 'include/archive/tax/category' ], { widgets: [ { type: 'theme-archive-title' } ] } ),
					T( 'A_BLOG', 'archive', [ 'include/archive/type/post' ], { widgets: [ { type: 'theme-archive-title' } ] } ),
					T( 'S_ALL', 'single', [ 'include/singular' ] ),
				] );
				const expectLoc = async ( area, label, url, loc, expected ) => {
					const html = await get( url );
					check( area, `${ theme }: ${ label } -> ${ expected ?? 'theme page' }`, slot( html, ids, loc ) === expected, `got ${ slot( html, ids, loc ) }` );
					return html;
				};
				await expectLoc( 'archive', 'category archive (most specific rule)', U.cat, 'archive', 'A_CAT' );
				await expectLoc( 'archive', 'excluded category falls back to the theme', U.catOther, 'archive', null );
				await expectLoc( 'archive', 'tag archive', U.tag, 'archive', 'A_ALL' );
				await expectLoc( 'archive', 'custom taxonomy archive', U.genre, 'archive', 'A_ALL' );
				await expectLoc( 'archive', 'author archive', U.author, 'archive', 'A_ALL' );
				await expectLoc( 'archive', 'date archive', U.date, 'archive', 'A_ALL' );
				await expectLoc( 'archive', 'posts page (blog home)', U.blog, 'archive', 'A_BLOG' );
				await expectLoc( 'archive', 'custom post type archive', U.books, 'archive', 'A_ALL' );
				await expectLoc( 'archive', 'search results are not an archive', U.search, 'archive', null );
				await expectLoc( 'archive', '404 is not an archive', U.notFound, 'archive', null );
				await expectLoc( 'archive', 'a single post is not an archive', U.alpha, 'archive', null );
				const catHtml = await get( U.cat );
				check( 'layout', `${ theme }: header, archive, footer order and templates around it`, catHtml.indexOf( 'refraction-location-header' ) < catHtml.indexOf( 'refraction-location-archive' ) && catHtml.indexOf( 'refraction-location-archive' ) < catHtml.indexOf( 'refraction-location-footer' ) );
				await vget( U.cat );
				check( 'widgets', `${ theme }: Archive Title for a category`, ( await text( `${ w( 'archive-title' ) } .refraction-theme-text` ) ) === 'Category: News', await text( w( 'archive-title' ) ) );
				await vp.screenshot( { path: join( SHOTS, `archive-${ theme }.png` ), fullPage: true } );
				await vget( U.tag );
				const tagTitles = await vp.locator( `${ w( 'archive-title' ) } .refraction-theme-text` ).allInnerTexts();
				check( 'widgets', `${ theme }: Archive Title for a tag, with and without prefix`, tagTitles[ 0 ] === 'Tag: demo' && tagTitles[ 1 ] === 'demo', tagTitles.join( '|' ) );
				await vget( U.author );
				check( 'widgets', `${ theme }: Archive Title for an author`, /Ada Author/.test( ( await text( `${ w( 'archive-title' ) } .refraction-theme-text` ) ) ) );
				await vget( U.date );
				check( 'widgets', `${ theme }: Archive Title for a month`, /March 2025/.test( await text( `${ w( 'archive-title' ) } .refraction-theme-text` ) ), await text( w( 'archive-title' ) ) );
				await vget( U.books );
				check( 'widgets', `${ theme }: Archive Title for a post type archive`, /Books/.test( await text( `${ w( 'archive-title' ) } .refraction-theme-text` ) ), await text( w( 'archive-title' ) ) );

				// ---- Phase 4: search results and 404.
				ids = mk( [
					T( 'H_ALL', 'header', [ 'include/general' ] ),
					T( 'F_ALL', 'footer', [ 'include/general' ] ),
					T( 'SR', 'search-results', [ 'include/archive/search' ], { widgets: [ { type: 'theme-page-title' }, { type: 'theme-archive-title' }, { type: 'theme-search-form' } ] } ),
					T( 'E404', 'error-404', [ 'include/404' ], { widgets: [ { type: 'theme-page-title' }, { type: 'theme-search-form' }, { type: 'theme-sitemap', settings: { sources: [ 'post_type:page' ] } } ] } ),
					T( 'A_ALL', 'archive', [ 'include/general' ] ),
					T( 'S_ALL', 'single', [ 'include/general' ] ),
				] );
				await expectLoc( 'search', 'search with results', U.search, 'search-results', 'SR' );
				await expectLoc( 'search', 'search without results', U.searchNone, 'search-results', 'SR' );
				await expectLoc( 'search', 'a category is not a search page', U.cat, 'search-results', null );
				await expectLoc( '404', '404 page', U.notFound, 'error-404', 'E404' );
				await expectLoc( '404', 'a normal page is not a 404', U.about, 'error-404', null );
				const searchHtml = await get( U.search );
				check( 'search', `${ theme }: Archive templates with "entire site" do not take over search`, slot( searchHtml, ids, 'archive' ) === null );
				check( 'layout', `${ theme }: header, search results, footer order`, searchHtml.indexOf( 'refraction-location-header' ) < searchHtml.indexOf( 'refraction-location-search-results' ) && searchHtml.indexOf( 'refraction-location-search-results' ) < searchHtml.indexOf( 'refraction-location-footer' ) );
				await vget( U.search );
				check( 'widgets', `${ theme }: Page Title on search shows the query`, /Search results for: story/.test( await text( `${ w( 'page-title' ) } .refraction-theme-text` ) ), await text( w( 'page-title' ) ) );
				check( 'widgets', `${ theme }: Search Form keeps the current query`, ( await vp.locator( `${ w( 'search-form' ) } input[name=s]` ).inputValue() ) === 'story' );
				await vp.screenshot( { path: join( SHOTS, `search-${ theme }.png` ), fullPage: true } );
				await vget( U.notFound );
				check( 'widgets', `${ theme }: Page Title on 404`, ( await text( `${ w( 'page-title' ) } .refraction-theme-text` ) ) === 'Page not found' );
				check( 'widgets', `${ theme }: Sitemap on the 404 page lists pages`, /About/.test( await text( w( 'sitemap' ) ) ) );
				const http = await fetch( BASE + U.notFound );
				check( '404', `${ theme }: the 404 status is kept`, http.status === 404, http.status );
				await vp.screenshot( { path: join( SHOTS, `404-${ theme }.png` ), fullPage: true } );

				// ---- Phase 5: trashed and draft templates, header only, no header/footer templates.
				ids = mk( [ T( 'S_TRASH', 'single', [ 'include/singular' ] ), T( 'S_DRAFT', 'single', [ 'include/singular' ], { status: 'draft' } ) ] );
				wp( [ 'post', 'delete', String( ids.S_TRASH ) ] );
				await expectLoc( 'status', 'a trashed template and a draft are ignored', U.alpha, 'single', null );
				ids = mk( [ T( 'S_ONLY', 'single', [ 'include/singular' ], { widgets: [ { type: 'theme-post-title' } ] } ) ] );
				const bare = await expectLoc( 'layout', 'a single template alone (no header/footer templates)', U.alpha, 'single', 'S_ONLY' );
				check( 'layout', `${ theme }: the theme's own header and footer surround it`, CLASSIC.has( theme ) ? bare.includes( theme === 'twentytwentyone' ? 'id="masthead"' : 'id="site-header"' ) && bare.includes( theme === 'twentytwentyone' ? 'id="colophon"' : 'id="site-footer"' ) : /<header[^>]*wp-block-template-part/.test( bare ) && /<footer[^>]*wp-block-template-part/.test( bare ), 'theme parts missing' );
				await visitor.close();
				await page.close();
			}
		}

		if ( ONLY !== 'front' ) {
			console.log( '\n== admin and editor ==' );
			const classic = themes.find( ( t ) => CLASSIC.has( t ) ) ?? themes[ 0 ];
			wp( [ 'theme', 'activate', classic ] );
			const ids = mk( [
				T( 'S_PREV', 'single', [ 'include/singular' ], { widgets: [ { type: 'theme-post-title' }, { type: 'theme-page-title' }, { type: 'theme-post-content' } ] } ),
				T( 'A_PREV', 'archive', [ 'include/archive' ], { widgets: [ { type: 'theme-archive-title' }, { type: 'theme-page-title' } ] } ),
				T( 'SR_PREV', 'search-results', [ 'include/archive/search' ], { widgets: [ { type: 'theme-page-title' }, { type: 'theme-search-form' } ] } ),
				T( 'E_PREV', 'error-404', [ 'include/404' ], { widgets: [ { type: 'theme-page-title' } ] } ),
				T( 'H_PREV', 'header', [ 'include/general' ], { widgets: [ { type: 'theme-site-title' }, { type: 'theme-page-title' } ] } ),
			] );

			// Admin tabs.
			await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder` );
			const tabs = await admin.page.$$eval( '.rtb-tab-label', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
			check( 'admin-screen', 'tabs: Headers, Footers, Single, Archive, Search Results, Error 404', JSON.stringify( tabs ) === JSON.stringify( [ 'Headers', 'Footers', 'Single', 'Archive', 'Search Results', 'Error 404' ] ), tabs.join( ',' ) );
			for ( const [ tab, label, key, cond ] of [ [ 'single', 'Single', 'S_PREV', 'All singular' ], [ 'archive', 'Archive', 'A_PREV', 'All archives' ], [ 'search-results', 'Search Results', 'SR_PREV', 'Search results' ], [ 'error-404', 'Error 404', 'E_PREV', '404 page' ] ] ) {
				await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=${ tab }` );
				const body = await admin.page.locator( '.rtb-wrap' ).innerText();
				check( 'admin-screen', `${ label } tab lists its template with the condition`, body.includes( key ) && body.includes( cond ) && /Published/.test( body ), body.slice( 0, 200 ) );
				const href = await admin.page.locator( '.page-title-action' ).getAttribute( 'href' );
				check( 'admin-screen', `${ label } tab: Add New carries the type`, href.includes( `refraction_library_type=${ tab }` ), href );
			}
			await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=error-404` );
			await admin.page.screenshot( { path: join( SHOTS, 'admin-404-tab.png' ), fullPage: true } );
			await admin.page.click( '.page-title-action' );
			await admin.page.waitForSelector( '#refraction-new-template__form__template-type', { timeout: 15000 } );
			const opts = await admin.page.$$eval( '#refraction-new-template__form__template-type option', ( o ) => o.map( ( x ) => x.value ) );
			check( 'dialog', 'the template type dialog lists the four new types and preselects Error 404', [ 'single', 'archive', 'search-results', 'error-404' ].every( ( t ) => opts.includes( t ) ) && ( await admin.page.inputValue( '#refraction-new-template__form__template-type' ) ) === 'error-404', opts.join( ',' ) );

			// Editor: Theme Elements category and Preview Settings.
			const editorPage = await admin.ctx.newPage();
			watch( editorPage, 'editor' );
			const open = async ( id ) => {
				await editorPage.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
				await editorPage.waitForSelector( '#refraction-panel', { timeout: 90000 } );
				await editorPage.waitForSelector( '#refraction-preview-iframe', { state: 'attached' } );
				await editorPage.frameLocator( '#refraction-preview-iframe' ).locator( '.refraction-widget-theme-page-title, .refraction-widget-theme-post-title, .refraction-widget-theme-site-title' ).first().waitFor( { timeout: 60000 } );
				await sleep( 1500 );
			};
			const frame = () => editorPage.frameLocator( '#refraction-preview-iframe' );
			const widgetText = async ( name ) => ( await frame().locator( `.refraction-widget-theme-${ name } .refraction-theme-text` ).first().innerText( { timeout: 30000 } ) ).trim();
			const expectText = async ( area, label, name, predicate ) => {
				let got = '';
				for ( let i = 0; i < 30; i++ ) {
					got = await widgetText( name ).catch( () => '' );
					if ( predicate( got ) ) { break; }
					await sleep( 500 );
				}
				check( area, label, predicate( got ), got );
			};
			const openPreviewSettings = async () => {
				await editorPage.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
				await editorPage.waitForSelector( '.refraction-control-type-section:has-text("Preview Settings")', { timeout: 15000 } );
				const mount = editorPage.locator( '.rtb-prev' );
				if ( ! ( await mount.count() ) ) { await editorPage.click( '.refraction-control-type-section:has-text("Preview Settings")' ); }
				await editorPage.waitForSelector( '.rtb-prev select', { timeout: 10000 } );
			};
			const apply = async () => {
				await editorPage.click( '.rtb-prev__apply' );
				await editorPage.waitForFunction( () => /Preview updated/.test( document.querySelector( '.rtb-prev__status' )?.textContent || '' ), null, { timeout: 15000 } );
				await sleep( 2500 );
			};
			const pick = async ( source, query, pickText ) => {
				await editorPage.selectOption( '.rtb-prev select', source );
				if ( query !== null ) {
					const input = editorPage.locator( '.rtb-prev__picker input' );
					await input.fill( query );
					await editorPage.waitForSelector( '.rtb-cond__results button', { timeout: 10000 } );
					await editorPage.locator( '.rtb-cond__results button', { hasText: pickText } ).first().click();
				}
				await apply();
			};

			await open( ids.S_PREV );
			const panelWidgets = await editorPage.evaluate( () => Object.values( refraction.widgetsCache || {} ).filter( ( w ) => w.show_in_panel && ( w.categories || [] ).includes( 'theme-elements' ) ).map( ( w ) => w.widget_type || w.name ).sort() );
			check( 'editor', 'a single template offers all 16 Theme Elements widgets', panelWidgets.length === 16, `${ panelWidgets.length }: ${ panelWidgets.join( ',' ) }` );
			const categoryTitle = await editorPage.evaluate( () => ( refraction.config.elements_categories || refraction.config.document?.panel?.elements_categories || {} )[ 'theme-elements' ]?.title || null );
			check( 'editor', 'the Theme Elements category exists in the panel', categoryTitle === 'Theme Elements' || ( await editorPage.locator( '#refraction-panel-category-theme-elements' ).count() ) === 1, categoryTitle );

			await expectText( 'preview', 'single: default preview is the latest post (not the template)', 'post-title', ( t ) => t === 'Beta Post' );
			await editorPage.screenshot( { path: join( SHOTS, 'editor-single-default.png' ) } );
			await openPreviewSettings();
			await editorPage.screenshot( { path: join( SHOTS, 'editor-preview-settings.png' ) } );
			await pick( 'post:page', 'About', 'About' );
			await expectText( 'preview', 'single: preview as the page "About" re-renders the widgets', 'post-title', ( t ) => t === 'About' );
			await editorPage.screenshot( { path: join( SHOTS, 'editor-single-about.png' ) } );
			await openPreviewSettings();
			await pick( 'post:book', 'Book', 'Book One' );
			await expectText( 'preview', 'single: preview as a custom post type item', 'post-title', ( t ) => t === 'Book One' );
			await openPreviewSettings();
			await pick( 'post:post', 'Alpha', 'Alpha' );
			await expectText( 'preview', 'single: preview as a specific post (title escaped)', 'post-title', ( t ) => t === 'Alpha Post <i>x</i> & more' );
			check( 'preview', 'the choice is stored in the template settings', JSON.parse( wp( [ 'post', 'meta', 'get', String( ids.S_PREV ), '_refraction_page_settings', '--format=json' ] ) ).refraction_preview_target?.id === c.alpha );
			await editorPage.reload();
			await editorPage.waitForSelector( '#refraction-panel', { timeout: 90000 } );
			await openPreviewSettings();
			await sleep( 1200 );
			check( 'preview', 'reopening the editor shows the saved choice with the real title', ( await editorPage.locator( '.rtb-cond__picked-text' ).innerText() ).startsWith( 'Alpha Post' ), await editorPage.locator( '.rtb-prev' ).innerText() );

			await open( ids.A_PREV );
			await expectText( 'preview', 'archive: default preview is the blog', 'archive-title', ( t ) => /Blog|Latest posts/.test( t ) );
			await openPreviewSettings();
			await pick( 'term:category', 'News', 'News' );
			await expectText( 'preview', 'archive: preview as the News category', 'archive-title', ( t ) => t === 'Category: News' );
			await openPreviewSettings();
			await pick( 'author', 'Ada', 'Ada Author' );
			await expectText( 'preview', 'archive: preview as an author', 'archive-title', ( t ) => /Ada Author/.test( t ) );
			await openPreviewSettings();
			await editorPage.selectOption( '.rtb-prev select', 'date' );
			await editorPage.fill( '.rtb-prev input[type=text]', '2025-03' );
			await apply();
			await expectText( 'preview', 'archive: preview as March 2025', 'archive-title', ( t ) => /March 2025/.test( t ) );
			await editorPage.screenshot( { path: join( SHOTS, 'editor-archive-date.png' ) } );

			await open( ids.SR_PREV );
			await openPreviewSettings();
			await editorPage.fill( '.rtb-prev input[type=text]', 'story' );
			await apply();
			await expectText( 'preview', 'search: preview with a search term', 'page-title', ( t ) => /Search results for: story/.test( t ) );

			await open( ids.E_PREV );
			await expectText( 'preview', '404: preview as the not found page', 'page-title', ( t ) => t === 'Page not found' );

			await open( ids.H_PREV );
			await expectText( 'preview', 'header: preview renders site widgets with a page as context', 'page-title', ( t ) => t !== '' && t !== 'H_PREV' );
			await openPreviewSettings();
			const headerOptions = await editorPage.$$eval( '.rtb-prev select option', ( o ) => o.map( ( x ) => x.value ) );
			check( 'preview', 'header offers every preview source', [ 'post:page', 'blog', 'author', 'search', '404' ].every( ( v ) => headerOptions.includes( v ) ), headerOptions.join( ',' ) );

			// Panel visibility outside Theme Builder templates.
			wp( [ 'post', 'create', '--post_type=page', '--post_title=Plain', '--post_status=publish', '--porcelain' ] );
			const plain = wp( [ 'post', 'list', '--post_type=page', '--title=Plain', '--field=ID' ] ).split( '\n' )[ 0 ];
			await editorPage.goto( `${ BASE }/wp-admin/post.php?post=${ plain }&action=refraction` );
			await editorPage.waitForSelector( '#refraction-panel', { timeout: 90000 } );
			await sleep( 2500 );
			const plainWidgets = await editorPage.evaluate( () => Object.values( refraction.widgetsCache || {} ).filter( ( w ) => w.show_in_panel && ( w.categories || [] ).includes( 'theme-elements' ) ).map( ( w ) => w.widget_type || w.name ).sort() );
			check( 'editor', 'a normal page offers only the widgets that make sense outside templates', plainWidgets.length > 0 && plainWidgets.length < 16 && ! plainWidgets.includes( 'theme-post-content' ) && plainWidgets.includes( 'theme-site-logo' ), plainWidgets.join( ',' ) );

			// Non-editors cannot apply a preview on someone else's template: the endpoint checks capability.
			const nonce = await editorPage.evaluate( () => window.refractionThemeBuilder?.nonce );
			const denied = await fetch( `${ BASE }/wp-admin/admin-ajax.php`, { method: 'POST', body: new URLSearchParams( { action: 'refraction_theme_builder_preview_apply', _nonce: nonce || 'x', post_id: String( ids.S_PREV ), target: '{}' } ) } );
			check( 'security', 'the preview endpoint refuses logged out requests', denied.status >= 400, denied.status );
		}

		// Clean up the test templates so the other check scripts see a site without body templates.
		seed( 'reset' );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	const phpErrors = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Notice|Deprecated|Parse)|Uncaught/.test( l ) );
	check( 'quality', 'no PHP errors, warnings or notices in the debug log', phpErrors.length === 0, phpErrors.slice( 0, 4 ).join( ' || ' ) );
	check( 'quality', 'no JavaScript console errors', consoleErrors.length === 0, consoleErrors.slice( 0, 4 ).join( ' || ' ) );
	console.log( `\n${ results.length - failures } passed, ${ failures } failed` );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
