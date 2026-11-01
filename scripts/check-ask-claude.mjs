#!/usr/bin/env node
/**
 * Ask Claude check (SQLite test site, Chromium, a fake Anthropic API on --api-port that costs nothing): the key is
 * saved encrypted and never reaches the browser; a whole page, a section after the selected element and a change of the
 * selected element (from the right-click menu) are built in the editor from what the official SDK received, cleaned
 * (unknown widgets and scripts dropped, library images only, site colors kept) and undone in one step; the requests
 * carry the model, effort, tools, cached instructions, fallback and echoed thinking; refusals, the hourly limit,
 * reference images and who may use it (editors yes, key settings administrators only, authors and visitors no).
 *
 * Usage: node scripts/check-ask-claude.mjs [--site /tmp/rf-claude-site] [--port 8970] [--api-port 8971] [--shots /tmp/ask-claude-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { fakeAnthropic } from './fixtures/fake-anthropic.mjs';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-claude-site' );
const PORT = arg( 'port', '8970' );
const SHOTS = arg( 'shots', '/tmp/ask-claude-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const API_PORT = Number( arg( 'api-port', String( Number( PORT ) + 1 ) ) );
const KEY = 'sk-ant-test-0123456789abcdefghijklmnop';
const MU = join( WPDIR, 'wp-content/mu-plugins/refraction-claude-test-api.php' );

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

async function login( browser, user ) {
	const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
	const p = await ctx.newPage();
	// Straight to the profile: the dashboard waits on remote news feeds this test site can not reach.
	await p.goto( `${ BASE }/wp-login.php?redirect_to=${ encodeURIComponent( `${ BASE }/wp-admin/profile.php` ) }` );
	await p.fill( '#user_login', user );
	await p.fill( '#user_pass', user );
	await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
	return { ctx, p };
}

async function openEditor( p, id ) {
	await p.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction`, { timeout: 120000 } );
	await p.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
	await p.waitForTimeout( 1500 );
}

const topLevel = ( p ) => p.evaluate( () => refraction.getPreviewContainer().children.map( ( c ) => c.children.map( ( w ) => w.model.get( 'widgetType' ) + ':' + ( w.settings.get( 'title' ) || '' ) ).join( ',' ) ) );
const askButton = ( p ) => p.locator( 'button[aria-label="Ask Claude"], [role="button"][aria-label="Ask Claude"]' ).first();

async function generate( p, mode, prompt ) {
	await p.click( `[data-ask-claude="mode-${ mode }"]` );
	await p.fill( '[data-ask-claude="prompt"]', prompt );
	await p.click( '[data-ask-claude="generate"]' );

	if ( await p.locator( '[data-ask-claude="confirm"]' ).isVisible().catch( () => false ) ) {
		await p.click( '[data-ask-claude="generate"]' );
	}

	await p.waitForSelector( '[data-ask-claude="done"], [data-ask-claude="error"]', { timeout: 60000 } );
	await p.waitForTimeout( 800 );
}

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const api = await fakeAnthropic( API_PORT );
	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];
	const watch = ( p, label ) => {
		p.on( 'pageerror', ( e ) => errors.push( `[${ label }] ${ e.message }` ) );
	};

	try {
		mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );
		writeFileSync( MU, `<?php define( 'REFRACTION_CLAUDE_BASE_URL', 'http://127.0.0.1:${ API_PORT }' );\n` );
		wp( [ 'option', 'delete', 'refraction_ask_claude' ], { allowFail: true } );
		for ( const [ user, role ] of [ [ 'editor1', 'editor' ], [ 'author1', 'author' ], [ 'sub1', 'subscriber' ] ] ) {
			wp( [ 'user', 'create', user, `${ user }@example.test`, `--role=${ role }`, `--user_pass=${ user }` ], { allowFail: true } );
		}
		wp( [ 'user', 'update', 'admin', '--user_pass=admin' ] );
		const dir = join( tmpdir(), `rfclaude-${ PORT }` );
		mkdirSync( dir, { recursive: true } );
		execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=800x500', '-frames:v', '1', join( dir, 'oak-house.jpg' ) ] );
		const imageId = Number( wp( [ 'media', 'import', join( dir, 'oak-house.jpg' ), '--user=admin', '--porcelain', '--title=Oak house' ] ).trim() );
		const home = page( 'Home', [] );
		const other = page( 'About', [] );

		// ------------------------------------------------------------ the key
		const { ctx, p } = await login( browser, 'admin' );
		watch( p, 'admin' );
		await openEditor( p, home.id );
		check( 'editor', 'Ask Claude is in the top bar', await askButton( p ).isVisible() );
		await askButton( p ).click();
		await p.waitForSelector( '[data-ask-claude="panel"]' );
		check( 'key', 'without a key an administrator is asked for one', await p.locator( '[data-ask-claude="settings"]' ).isVisible() );
		await p.fill( '[data-ask-claude="key"]', 'not-a-key' );
		await p.click( '[data-ask-claude="save-key"]' );
		await p.waitForTimeout( 800 );
		check( 'key', 'a value that is not an Anthropic key is refused', /does not look like/.test( await p.textContent( '[data-ask-claude="settings"]' ) ) );
		await p.fill( '[data-ask-claude="key"]', KEY );
		await p.click( '[data-ask-claude="save-key"]' );
		await p.waitForSelector( '[data-ask-claude="prompt"]' );
		const stored = wp( [ 'option', 'get', 'refraction_ask_claude', '--format=json' ] );
		check( 'key', 'the key is stored encrypted, never in plain text', ! stored.includes( KEY ) && ! stored.includes( 'abcdefghij' ) && /"key"/.test( stored ) );
		const html = await p.content();
		check( 'key', 'the editor page never contains the key', ! html.includes( KEY ) );

		// ------------------------------------------------------------ whole page
		await generate( p, 'page', 'A home page for a builder of timber and stone houses.' );
		const done = await p.textContent( '[data-ask-claude="done"]' ).catch( () => '' );
		check( 'page', 'Claude\'s page is built in the editor and the summary shows', /hero for a home builder/.test( done ), done || await p.textContent( '[data-ask-claude="error"]' ).catch( () => '' ) );
		const built = await topLevel( p );
		check( 'page', 'the elements arrive as editable widgets; the HTML widget is left out and said so', built.length === 2 && /heading:Houses that age well/.test( built[ 0 ] ) && /text-editor/.test( built[ 0 ] ) && /button/.test( built[ 0 ] ) && ! /html/.test( built[ 0 ] ) && /widget "html"/.test( done ), JSON.stringify( built ) );
		const hero = await p.evaluate( () => {
			const c = refraction.getPreviewContainer().children[ 0 ];
			return { bg: c.settings.get( 'background_image' ), text: c.children[ 1 ].settings.get( 'editor' ), globals: c.children[ 0 ].settings.get( '__globals__' ) };
		} );
		check( 'page', 'the image is the library image, the script is gone, the site color is used', hero.bg && hero.bg.id === imageId && /oak-house/.test( hero.bg.url ) && ! /script|steal/.test( hero.text ) && hero.globals && hero.globals.title_color === 'globals/colors?id=primary', JSON.stringify( hero ) );
		const preview = p.frameLocator( '#refraction-preview-iframe' );
		check( 'page', 'the preview shows it', ( await preview.locator( 'h1' ).first().textContent() ).includes( 'Houses that age well' ) );
		await p.screenshot( { path: join( SHOTS, 'page.png' ) } );
		await p.evaluate( () => $e.run( 'document/history/undo' ) );
		await p.waitForTimeout( 800 );
		check( 'page', 'one Undo removes everything Claude added', ( await topLevel( p ) ).length === 0, JSON.stringify( await topLevel( p ) ) );
		await p.evaluate( () => $e.run( 'document/history/redo' ) );
		await p.waitForTimeout( 800 );

		// what the SDK sent
		const first = api.requests[ 0 ];
		const second = api.requests[ 1 ];
		check( 'request', 'the official SDK calls the beta Messages API with the site key', /\/v1\/messages/.test( first.url ) && ( first.headers[ 'x-api-key' ] === KEY || first.headers.authorization === `Bearer ${ KEY }` ) && /anthropic\/PHP/.test( first.headers[ 'user-agent' ] || '' ), JSON.stringify( first.headers ) );
		check( 'request', 'Opus 5.5 by default, high effort, automatic tool choice, server-side fallback on', first.body.model === 'claude-opus-5-5' && first.body.output_config.effort === 'high' && first.body.tool_choice.type === 'auto' && first.body.fallbacks === 'default' && /server-side-fallback-2026-07-01/.test( first.headers[ 'anthropic-beta' ] || '' ), JSON.stringify( { m: first.body.model, o: first.body.output_config, f: first.body.fallbacks, b: first.headers[ 'anthropic-beta' ] } ) );
		check( 'request', 'the instructions list the widgets and the site colors, and are cached', /build-scene - 3D Build Scene/.test( first.body.system[ 0 ].text ) && /globals\/colors/.test( first.body.system[ 0 ].text ) && first.body.system[ 0 ].cache_control.type === 'ephemeral' && first.body.tools.map( ( t ) => t.name ).join() === 'get_widget_controls,list_images,submit_elements' );
		const answers = second.body.messages[ 2 ].content;
		const echoed = second.body.messages[ 1 ].content;
		const controls = JSON.parse( answers.find( ( r ) => r.tool_use_id === 'toolu_1' ).content );
		check( 'request', 'the tools answer: real controls and library images', controls.container && controls.heading && controls.heading.header_size && controls.heading.header_size.options.includes( 'h1' ) && JSON.parse( answers.find( ( r ) => r.tool_use_id === 'toolu_2' ).content )[ 0 ].id === imageId );
		check( 'request', 'the thinking block is sent back unchanged with the tool calls', echoed[ 0 ].type === 'thinking' && echoed[ 0 ].signature === 'sig-turn-1' && echoed[ 1 ].id === 'toolu_1' );

		// ------------------------------------------------------------ a section after the selected element
		await p.evaluate( () => $e.run( 'document/elements/select', { container: refraction.getPreviewContainer().children[ 0 ] } ) );
		await generate( p, 'section', 'Three ways to start a project.' );
		const withSection = await topLevel( p );
		check( 'section', 'a new section is added after the selected one', withSection.length === 3 && /Three ways to start/.test( withSection[ 1 ] ) && /How we build/.test( withSection[ 2 ] ), JSON.stringify( withSection ) );
		check( 'section', 'Claude saw the page it adds to', /Houses that age well/.test( JSON.stringify( api.requests[ api.requests.length - 2 ].body.messages[ 0 ] ) ) );

		// ------------------------------------------------------------ change the selected element, from the right-click menu
		await preview.locator( 'h1' ).first().click( { button: 'right' } );
		await p.waitForSelector( '.refraction-context-menu-list__item-ask-claude', { timeout: 10000 } );
		await p.click( '.refraction-context-menu-list__item-ask-claude' );
		await p.waitForTimeout( 400 );
		check( 'selected', 'the right-click entry opens the panel on "Change selected"', await p.locator( '[data-ask-claude="mode-selected"][aria-pressed="true"]' ).isVisible() );
		await p.fill( '[data-ask-claude="prompt"]', 'Say homes instead of houses.' );
		await p.click( '[data-ask-claude="generate"]' );
		await p.waitForSelector( '[data-ask-claude="done"], [data-ask-claude="error"]', { timeout: 60000 } );
		await p.waitForTimeout( 600 );
		const changed = await topLevel( p );
		check( 'selected', 'the selected heading is replaced in place', /^heading:Homes that age well,text-editor/.test( changed[ 0 ] ) && changed.length === 3, JSON.stringify( changed ) );

		// ------------------------------------------------------------ a long brief
		const brief = '# Luxury villa\n\n' + Array.from( { length: 300 }, ( _, i ) => `## Section ${ i }\nHeadline: Architecture beyond imagination, part ${ i }.\n` ).join( '\n' );
		await p.click( '[data-ask-claude="mode-section"]' );
		await p.fill( '[data-ask-claude="prompt"]', brief );
		const typed = await p.inputValue( '[data-ask-claude="prompt"]' );
		const counter = await p.textContent( '[data-ask-claude="count"]' );
		check( 'long', 'a long brief is kept whole in the box, with a character count', typed.length === brief.length && brief.length > 15000 && counter.replace( /[^\d/]/g, '' ) === `${ brief.length }/60000` && counter.includes( '60,000' ), `${ typed.length } of ${ brief.length }, "${ counter }"` );
		await p.click( '[data-ask-claude="generate"]' );
		await p.waitForSelector( '[data-ask-claude="done"], [data-ask-claude="error"]', { timeout: 60000 } );
		const sentBrief = JSON.stringify( api.requests.filter( ( r ) => 1 === r.body.messages.length ).pop().body.messages[ 0 ] );
		check( 'long', 'the whole brief reaches Claude', sentBrief.includes( 'part 299.' ), sentBrief.length );
		const tooLong = await p.evaluate( ( id ) => wp.apiFetch( { path: '/refraction/v1/ask-claude/generate', method: 'POST', data: { post_id: id, prompt: 'x'.repeat( 60001 ), mode: 'section' } } ).then( () => 'ok', ( e ) => e.message ), home.id );
		check( 'long', 'more than 60,000 characters is refused with a clear message', /longer than 60,000 characters/.test( tooLong ), tooLong );
		await p.evaluate( () => $e.run( 'document/history/undo' ) );
		await p.waitForTimeout( 400 );

		// ------------------------------------------------------------ refusals and limits
		await generate( p, 'section', 'REFUSE this one' );
		check( 'errors', 'a refusal is explained, nothing is added', /declined/.test( await p.textContent( '[data-ask-claude="error"]' ) ) && ( await topLevel( p ) ).length === 3 );
		await p.screenshot( { path: join( SHOTS, 'panel.png' ) } );
		const adminId = wp( [ 'user', 'get', 'admin', '--field=ID' ] ).trim();
		wp( [ 'transient', 'set', `rf_ask_claude_${ adminId }`, '40', '3600' ] );
		const limited = await p.evaluate( ( id ) => wp.apiFetch( { path: '/refraction/v1/ask-claude/generate', method: 'POST', data: { post_id: id, prompt: 'x', mode: 'section' } } ).then( () => 'ok', ( e ) => e.code + ' ' + e.message ), home.id );
		check( 'errors', 'after 40 requests in an hour a person is asked to wait', /limit of requests/.test( limited ), limited );
		wp( [ 'transient', 'delete', `rf_ask_claude_${ adminId }` ] );
		const imageSent = await p.evaluate( ( [ id, img ] ) => wp.apiFetch( { path: '/refraction/v1/ask-claude/generate', method: 'POST', data: { post_id: id, prompt: 'Like this picture', mode: 'section', images: [ img ] } } ).then( () => 'ok', ( e ) => e.message ), [ home.id, imageId ] );
		const withImage = api.requests.filter( ( r ) => 1 === r.body.messages.length ).pop();
		const imageBlock = withImage.body.messages[ 0 ].content.find( ( b ) => 'image' === b.type );
		check( 'images', 'reference images from the library are sent to Claude as JPEG', imageSent === 'ok' && imageBlock && imageBlock.source.type === 'base64' && imageBlock.source.media_type === 'image/jpeg' && imageBlock.source.data.length > 1000 );
		await ctx.close();

		// ------------------------------------------------------------ the interface theme
		wp( [ 'user', 'meta', 'update', 'admin', 'refraction_ui_theme', 'blueprint' ] );
		const themed = await login( browser, 'admin' );
		watch( themed.p, 'themed' );
		const themedPage = page( 'Themed', [] );
		await openEditor( themed.p, themedPage.id );

		if ( await themed.p.locator( '.dialog-widget:visible' ).count() ) {
			await themed.p.locator( '.dialog-widget:visible .dialog-button' ).first().click();
		}

		await askButton( themed.p ).click();
		await themed.p.waitForSelector( '[data-ask-claude="prompt"]' );
		const look = await themed.p.evaluate( () => {
			const probe = document.createElement( 'div' );
			probe.style.background = 'var(--e-a-bg-default)';
			document.body.appendChild( probe );
			const expected = getComputedStyle( probe ).backgroundColor;
			probe.remove();
			const panel = document.querySelector( '[data-ask-claude="panel"]' );
			const rgb = getComputedStyle( panel ).backgroundColor.match( /\d+/g ).map( Number );
			return { theme: document.documentElement.getAttribute( 'data-refraction-theme' ), panel: getComputedStyle( panel ).backgroundColor, expected, dark: ( ( 0.2126 * rgb[ 0 ] ) + ( 0.7152 * rgb[ 1 ] ) + ( 0.0722 * rgb[ 2 ] ) ) < 80, field: getComputedStyle( document.querySelector( '[data-ask-claude="prompt"]' ) ).color };
		} );
		check( 'theme', 'the panel follows the interface theme (Blueprint: the editor\'s own dark background)', look.theme === 'blueprint' && look.panel === look.expected && look.dark && look.field !== 'rgba(0, 0, 0, 0.87)', JSON.stringify( look ) );
		await themed.p.click( '[data-ask-claude="panel"] [aria-label="Model"]' );
		await themed.p.waitForSelector( '.rf-ac-menu' );
		const menuBg = await themed.p.evaluate( () => getComputedStyle( document.querySelector( '.rf-ac-menu' ) ).backgroundColor );
		check( 'theme', 'its model menu too', menuBg === look.panel, `${ menuBg } vs ${ look.panel }` );
		await themed.p.keyboard.press( 'Escape' );
		await themed.p.screenshot( { path: join( SHOTS, 'panel-blueprint.png' ) } );
		await themed.ctx.close();
		wp( [ 'user', 'meta', 'delete', 'admin', 'refraction_ui_theme' ] );

		// ------------------------------------------------------------ who may use it
		const e = await login( browser, 'editor1' );
		watch( e.p, 'editor' );
		await openEditor( e.p, other.id );
		await askButton( e.p ).click();
		await e.p.waitForSelector( '[data-ask-claude="prompt"]' );
		check( 'roles', 'an editor can ask Claude but sees no key settings', ! ( await e.p.locator( '[aria-label="API key and model"]' ).count() ) && ! ( await e.p.content() ).includes( 'sk-ant-test' ) );
		const editorSettings = await e.p.evaluate( () => wp.apiFetch( { path: '/refraction/v1/ask-claude/settings', method: 'POST', data: { key: 'sk-ant-evil-0123456789abcdefghijklmnop' } } ).then( () => 'ok', ( err ) => String( err.data && err.data.status ) ) );
		check( 'roles', 'an editor can not change the key', '403' === editorSettings, editorSettings );
		await e.ctx.close();
		const a = await login( browser, 'author1' );
		await a.p.goto( `${ BASE }/wp-admin/profile.php` );
		const nonce = await a.p.evaluate( () => ( window.wpApiSettings && wpApiSettings.nonce ) || '' );
		const authorTry = await a.p.evaluate( ( [ id, n ] ) => fetch( '/?rest_route=/refraction/v1/ask-claude/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': n }, body: JSON.stringify( { post_id: id, prompt: 'x', mode: 'page' } ) } ).then( ( r ) => r.status ), [ home.id, nonce ] );
		check( 'roles', 'an author can not generate for a page they can not edit', 403 === authorTry || 401 === authorTry, authorTry );
		await a.ctx.close();
		const anon = await ( await fetch( `${ BASE }/?rest_route=/refraction/v1/ask-claude/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( { post_id: home.id, prompt: 'x', mode: 'page' } ) } ) ).status;
		check( 'roles', 'visitors get nothing', 401 === anon || 403 === anon, anon );
	} catch ( err ) {
		failures++;
		console.log( 'FAIL  script / ' + ( err.stack || err.message ).slice( 0, 900 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', errors.length === 0, errors.join( ' || ' ) );
		const log = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( log.replace( /[^\n]*wpcli\.phar[^\n]*/g, '' ) ), log.slice( 0, 1500 ) );
		rmSync( MU, { force: true } );
		await browser.close();
		api.server.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall ask claude checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
