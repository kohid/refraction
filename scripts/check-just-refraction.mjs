#!/usr/bin/env node
/**
 * Just Refraction theme check (SQLite test site with Refraction, Chromium): the theme zip installs; a post not built
 * with Refraction gets the theme header, footer, title and basic style; a Refraction page gets no theme styles or title;
 * Refraction Theme Builder header and footer replace the theme's and are printed once; the Customizer switches turn the
 * header/footer and the basic style off; skip link, 404 and search work. Saves screenshots to --shots.
 *
 * Usage: node scripts/check-just-refraction.mjs [--site /tmp/rf-theme-site] [--port 8990] [--zip dist/just-refraction.zip]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-theme-site' );
const PORT = arg( 'port', '8990' );
const SHOTS = arg( 'shots', '/tmp/just-refraction-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const ZIP = arg( 'zip', join( dirname( fileURLToPath( import.meta.url ) ), '../dist/just-refraction.zip' ) );
const TB_SEED = join( dirname( fileURLToPath( import.meta.url ) ), 'fixtures/theme-builder-seed.php' );

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


/** Everything about a page that matters for the theme. */
async function inspect( p, url ) {
	const response = await p.goto( url );
	const html = await p.content();
	const info = await p.evaluate( () => ( {
		jrHeader: !! document.querySelector( '.jr-header' ),
		jrFooter: !! document.querySelector( '.jr-footer' ),
		basicClass: document.body.classList.contains( 'jr-basic' ),
		title: ( document.querySelector( 'h1.entry-title' ) || {} ).textContent || '',
		skip: ( () => {
			const link = document.querySelector( 'a.skip-link' );
			return link ? { href: link.getAttribute( 'href' ), hidden: link.getBoundingClientRect().width <= 1 } : null;
		} )(),
		main: !! document.querySelector( 'main#content' ),
		siteTitle: ( document.querySelector( '.jr-site-title' ) || {} ).textContent || '',
	} ) );

	return {
		...info,
		status: response.status(),
		html,
		basicCss: /just-refraction\/assets\/basic\.css/.test( html ),
		bodies: ( html.match( /<body[\s>]/g ) || [] ).length,
		charsets: ( html.match( /<meta charset=/g ) || [] ).length,
		themeStyles: ( html.match( /just-refraction[^"']*\.css/g ) || [] ),
	};
}

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
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
		wp( [ 'theme', 'install', ZIP, '--activate', '--force' ] );
		check( 'install', 'the theme zip installs and activates as "Just Refraction"', 'just-refraction' === wp( [ 'option', 'get', 'stylesheet' ] ).trim() && /Just Refraction/.test( wp( [ 'theme', 'list', '--status=active', '--field=title' ] ) ) );
		const tbSeed = ( action, extra = {} ) => {
			const out = execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', 'eval-file', TB_SEED ], { encoding: 'utf8', env: { ...process.env, TB_ACTION: action, ...extra } } );
			return out.includes( '{' ) ? JSON.parse( out.slice( out.indexOf( '{' ) ) ) : {};
		};
		tbSeed( 'reset' );
		wp( [ 'theme', 'mod', 'remove', 'just_refraction_header_footer', 'just_refraction_basic_styles' ], { allowFail: true } );
		const postId = wp( [ 'post', 'create', '--post_type=post', '--post_status=publish', '--post_title=A plain story', '--post_content=<p>Written in the block editor, not with Refraction.</p>', '--porcelain' ] ).trim();
		const postUrl = wp( [ 'post', 'list', '--post_type=post', `--post__in=${ postId }`, '--field=url' ] ).trim();
		const built = page( 'Built page', [ container( 'c1', [ spacer( 'h1', 'Designed in Refraction' ) ] ) ] );
		wp( [ 'post', 'update', built.id, '--page_template=default' ] );
		const canvas = page( 'Canvas page', [ container( 'c2', [ spacer( 'h2', 'Edge to edge' ) ] ) ] );

		const ctx = await browser.newContext( { viewport: { width: 1280, height: 900 } } );
		const p = await ctx.newPage();
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );

		// ------------------------------------------------------------ no Refraction header or footer yet
		const plain = await inspect( p, postUrl );
		check( 'plain', 'a post not built with Refraction: theme header and footer, its title, the basic style', plain.jrHeader && plain.jrFooter && plain.title === 'A plain story' && plain.basicClass && plain.basicCss, JSON.stringify( { ...plain, html: undefined } ) );
		check( 'plain', 'one document: one <body>, one charset, a main landmark and a skip link to it', plain.bodies === 1 && plain.charsets === 1 && plain.main && plain.skip && plain.skip.href === '#content' && plain.skip.hidden );
		await p.screenshot( { path: join( SHOTS, 'plain-post.png' ), fullPage: true } );
		await p.keyboard.press( 'Tab' );
		check( 'plain', 'the skip link shows when it gets keyboard focus', await p.evaluate( () => document.activeElement.classList.contains( 'skip-link' ) && document.activeElement.getBoundingClientRect().width > 20 ) );

		const page1 = await inspect( p, built.url );
		check( 'refraction', 'a page built with Refraction gets no theme styles and no theme title', ! page1.basicCss && ! page1.basicClass && page1.title === '' && /Designed in Refraction/.test( page1.html ), JSON.stringify( { ...page1, html: undefined } ) );
		check( 'refraction', 'only the accessibility rule is added (skip link), nothing that styles content', page1.themeStyles.length === 0 && /just-refraction-a11y-inline-css/.test( page1.html ) );

		// ------------------------------------------------------------ Refraction header and footer templates
		tbSeed( 'templates', { TB_SPEC: JSON.stringify( [ { key: 'h', type: 'header', title: 'Site header', rules: [ 'include/general' ] }, { key: 'f', type: 'footer', title: 'Site footer', rules: [ 'include/general' ] } ] ) } );
		for ( const [ label, url ] of [ [ 'plain post', postUrl ], [ 'Refraction page', built.url ] ] ) {
			const withTb = await inspect( p, url );
			const headerCount = ( withTb.html.match( /data-refraction-type="header"/g ) || [] ).length;
			const footerCount = ( withTb.html.match( /data-refraction-type="footer"/g ) || [] ).length;
			check( 'theme builder', `${ label }: Refraction's header and footer replace the theme's, printed once`, ! withTb.jrHeader && ! withTb.jrFooter && headerCount === 1 && footerCount === 1 && withTb.bodies === 1 && withTb.charsets === 1, JSON.stringify( { headerCount, footerCount, jr: withTb.jrHeader, bodies: withTb.bodies } ) );
		}
		const bareCanvas = await inspect( p, canvas.url );
		check( 'theme builder', 'a Refraction Canvas page stays bare: no header or footer of any kind', ! bareCanvas.jrHeader && ! /data-refraction-type="header"/.test( bareCanvas.html ) && /Edge to edge/.test( bareCanvas.html ) );
		await p.goto( built.url );
		await p.screenshot( { path: join( SHOTS, 'refraction-page.png' ), fullPage: true } );
		tbSeed( 'reset' );

		// ------------------------------------------------------------ the Customizer switches
		wp( [ 'theme', 'mod', 'set', 'just_refraction_header_footer', '' ] );
		wp( [ 'theme', 'mod', 'set', 'just_refraction_basic_styles', '' ] );
		const bare = await inspect( p, postUrl );
		check( 'switches', 'both switches off: no theme header or footer and no styles at all', ! bare.jrHeader && ! bare.jrFooter && ! bare.basicClass && ! bare.basicCss && bare.title === 'A plain story', JSON.stringify( { ...bare, html: undefined } ) );
		wp( [ 'theme', 'mod', 'remove', 'just_refraction_header_footer', 'just_refraction_basic_styles' ] );

		// ------------------------------------------------------------ other views
		const missing = await inspect( p, `${ BASE }/no-such-page-here/` );
		check( 'views', 'a missing page answers 404 with a message and a search form', missing.status === 404 && missing.title === 'Page not found' && /search-form/.test( missing.html ) );
		const search = await inspect( p, `${ BASE }/?s=plain` );
		check( 'views', 'search lists the matching post', search.title.includes( 'plain' ) && /A plain story/.test( search.html ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall just refraction theme checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
