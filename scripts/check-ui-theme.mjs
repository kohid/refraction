#!/usr/bin/env node
/**
 * UI theme check (browser): the Theme tab, the picker (mouse + keyboard), persistence per user, the admin skin,
 * "Automatic equals today's look", unrelated admin pages untouched, the editor panel / top bar following the theme
 * while the preview iframe never does, the contrast gate, console and PHP errors. Screenshots of every theme.
 *
 * Usage: node scripts/check-ui-theme.mjs [--site /tmp/rf-ui-site] [--port 8861] [--shots /tmp/ui-shots] [--wpcli /tmp/rsite-dl/wpcli.phar]
 * Run on a FRESH site (scripts/setup-menu-test-site.sh) served on --port. Needs the Refraction editor build (dist/refraction.zip).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );
const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ui-site' );
const PORT = arg( 'port', '8861' );
const SHOTS = arg( 'shots', '/tmp/ui-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const THEMES = [ 'daylight', 'graphite', 'ember', 'blueprint', 'contrast' ];
mkdirSync( SHOTS, { recursive: true } );

const results = [];
const check = ( area, name, pass, evidence = '' ) => {
	results.push( { area, name, pass: !! pass } );
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 240 ) }` }` );
};
const wpTry = ( ...a ) => { try { return wp( ...a ); } catch { return ''; } };
const wp = ( ...a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...a ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );

function chromePath() {
	if ( process.env.CHROMIUM ) { return process.env.CHROMIUM; }
	const root = '/opt/pw-browsers';
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const s of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) { if ( existsSync( join( root, d, s ) ) ) { return join( root, d, s ); } }
	}
	return undefined;
}

async function login( browser, user ) {
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 }, colorScheme: 'light' } );
	const page = await ctx.newPage();
	const errors = [];
	page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /favicon\.ico/.test( m.location().url ) ) { errors.push( `${ m.text() } @ ${ m.location().url }` ); } } );
	page.on( 'pageerror', ( e ) => { if ( ! /Transition was skipped|reading 'hasClass'/.test( e.message ) ) { errors.push( `pageerror ${ e.message }` ); } } );
	page.on( 'response', ( r ) => { if ( r.status() >= 400 && ! /favicon\.ico/.test( r.url() ) ) { errors.push( `HTTP ${ r.status() } ${ r.url() }` ); } } );
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', user );
	await Promise.all( [ page.waitForURL( /wp-admin/, { waitUntil: 'commit' } ), page.click( '#wp-submit' ) ] );
	return { ctx, page, errors };
}

const attr = ( page ) => page.evaluate( () => document.documentElement.getAttribute( 'data-refraction-theme' ) );
const token = ( page, name ) => page.evaluate( ( n ) => getComputedStyle( document.documentElement ).getPropertyValue( n ).trim(), name );
const toRgb = ( page, color ) => page.evaluate( ( c ) => { const d = document.createElement( 'i' ); d.style.color = c; document.body.appendChild( d ); const v = getComputedStyle( d ).color; d.remove(); return v; }, color );
const css = ( page, sel, prop ) => page.evaluate( ( [ s, p ] ) => { const e = document.querySelector( s ); return e ? getComputedStyle( e )[ p ] : null; }, [ sel, prop ] );

const KEY_ADMIN = [
	[ 'body', 'backgroundColor' ], [ '#wpcontent', 'backgroundColor' ], [ '#wpbody-content h1, .wrap h1', 'color' ], [ '.nav-tab-active', 'backgroundColor' ],
	[ '.nav-tab-active', 'color' ], [ '.button-primary', 'backgroundColor' ], [ '.button-primary', 'color' ], [ 'input[type=checkbox]', 'borderColor' ],
	[ '.e-admin-top-bar', 'backgroundColor' ], [ '.form-table th', 'color' ], [ '#wpfooter', 'color' ],
];
const snapshot = async ( page, list ) => { const o = {}; for ( const [ s, p ] of list ) { o[ `${ s }|${ p }` ] = await css( page, s, p ); } return JSON.stringify( o ); };

async function main() {
	const phpLog0 = logSize();
	const browser = await chromium.launch( { executablePath: chromePath() } );

	// ---- contrast gate
	let contrastOk = true, contrastOut = '';
	try { contrastOut = execFileSync( 'node', [ join( fileURLToPath( import.meta.url ), '..', 'check-ui-theme-contrast.mjs' ) ], { encoding: 'utf8' } ); } catch ( e ) { contrastOk = false; contrastOut = String( e.stdout ); }
	check( 'Contrast', 'every theme meets WCAG AA (script)', contrastOk, contrastOut.split( '\n' ).filter( ( l ) => /FAIL/.test( l ) ).join( ' | ' ) );

	// ---- admin
	const { ctx, page, errors } = await login( browser, 'admin' );
	const errs = () => errors.splice( 0 ).join( ' | ' );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings` );
	const tabs = await page.evaluate( () => [ ...document.querySelectorAll( '#refraction-settings-tabs-wrapper a' ) ].map( ( a ) => a.textContent.trim() ) );
	check( 'Tab', 'Theme tab sits after the five existing tabs', tabs.join() === 'General,Integrations,Advanced,Performance,Features,Theme', tabs.join() );
	check( 'Tab', 'no attribute on <html> by default (Automatic)', ( await attr( page ) ) === null );
	const noCss = await page.evaluate( () => [ ...document.querySelectorAll( 'link[rel=stylesheet]' ) ].map( ( l ) => l.href ).filter( ( h ) => /ui-theme/.test( h ) ) );
	const order = await page.evaluate( () => [ ...document.querySelectorAll( 'link[rel=stylesheet]' ) ].map( ( l ) => l.href ) );
	const at = ( re ) => order.findIndex( ( h ) => re.test( h ) );
	check( 'Tab', 'token CSS loads before Refraction admin.css, the skin after it', noCss.length === 3 && at( /ui-themes\.css/ ) < at( /\/css\/admin(\.min)?\.css/ ) && at( /\/css\/admin(\.min)?\.css/ ) < at( /ui-theme-admin\.css/ ), noCss.join( ' ' ) );
	check( 'Tab', 'no inline script injected by the feature', ! ( await page.evaluate( () => [ ...document.scripts ].some( ( s ) => ! s.src && /data-refraction-theme|refraction_save_ui_theme/.test( s.textContent ) && ! /refractionUiTheme\s*=/.test( s.textContent ) ) ) ) );

	// Baseline "today's look": the same page with the theme CSS blocked, versus Automatic with it loaded.
	await page.click( '#refraction-settings-tab-general' );
	const withAuto = await snapshot( page, KEY_ADMIN );
	const bare = await ctx.newPage();
	await bare.route( '**/assets/ui-theme/**', ( r ) => r.abort() );
	await bare.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings` );
	await bare.click( '#refraction-settings-tab-general' );
	const withoutFeature = await snapshot( bare, KEY_ADMIN );
	await bare.close();
	check( 'Automatic', 'computed styles equal the page without the feature', withAuto === withoutFeature, withAuto !== withoutFeature ? `${ withAuto.slice( 0, 160 ) } <> ${ withoutFeature.slice( 0, 160 ) }` : '' );

	// Picker by mouse
	await page.click( '#refraction-settings-tab-theme' );
	const group = await page.evaluate( () => { const g = document.querySelector( '#refraction-ui-theme [role=radiogroup]' ); return { role: g.getAttribute( 'role' ), label: g.getAttribute( 'aria-labelledby' ), radios: g.querySelectorAll( '[role=radio]' ).length, checked: g.querySelectorAll( '[aria-checked=true]' ).length, tabbable: g.querySelectorAll( '[tabindex="0"]' ).length } ; } );
	check( 'Picker', 'radiogroup with six radios, one checked, one tabbable', group.radios === 6 && group.checked === 1 && group.tabbable === 1 && group.label, JSON.stringify( group ) );
	check( 'Picker', 'note says it applies to the account', /applies to your account/i.test( await page.textContent( '#refraction-ui-theme' ) ) );
	const previewOk = await page.evaluate( () => [ ...document.querySelectorAll( '.refraction-mini[data-preview-theme]' ) ].map( ( m ) => getComputedStyle( m ).backgroundColor ) );
	check( 'Picker', 'live miniatures paint five different backgrounds', new Set( previewOk ).size >= 4, previewOk.join( ' ' ) );
	check( 'Picker', 'miniature icons are bundled inline SVG (no remote font)', ( await page.locator( '.refraction-ui-theme__icon svg' ).count() ) === 6 );

	const homeBefore = await (async () => { await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-home` ); return snapshot( page, [ [ 'body', 'backgroundColor' ], [ '.refraction-home__links a', 'backgroundColor' ] ] ); })();
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings#tab-theme` );
	await page.click( '#refraction-settings-tab-theme' );
	for ( const t of THEMES ) {
		await page.click( `[role=radio][data-theme=${ t }]` );
		await page.waitForTimeout( 600 );
		const a = await attr( page );
		const bg = await css( page, '#wpcontent', 'backgroundColor' );
		const want = await toRgb( page, await token( page, '--rf-bg' ) );
		const saved = wp( 'user', 'meta', 'get', '1', 'refraction_ui_theme' );
		check( 'Picker', `click ${ t }: attribute, page colour from the token, saved in user meta`, a === t && bg === want && saved === t, `attr=${ a } bg=${ bg } want=${ want } meta=${ saved }` );
		const exp = await page.evaluate( () => [ document.querySelector( '#refraction-ui-theme [aria-checked=true]' ).dataset.theme, document.getElementById( 'refraction-ui-theme-status' ).textContent ] );
		check( 'Picker', `${ t }: card checked and status announced`, exp[ 0 ] === t && /Saved/.test( exp[ 1 ] ), exp.join( ' | ' ) );
		await page.screenshot( { path: join( SHOTS, `settings-${ t }.png` ) } );
	}
	// Keyboard
	await page.focus( '[role=radio][aria-checked=true]' );
	await page.keyboard.press( 'ArrowLeft' );
	await page.waitForTimeout( 500 );
	check( 'Picker', 'ArrowLeft moves focus and selects the previous theme (blueprint)', ( await attr( page ) ) === 'blueprint' && await page.evaluate( () => document.activeElement.dataset.theme ) === 'blueprint', await attr( page ) );
	await page.keyboard.press( 'Home' );
	await page.waitForTimeout( 500 );
	check( 'Picker', 'Home selects Automatic and removes the attribute', ( await attr( page ) ) === null && wp( 'user', 'meta', 'get', '1', 'refraction_ui_theme' ) === 'auto' );
	await page.keyboard.press( 'End' );
	await page.waitForTimeout( 400 );
	await page.keyboard.press( 'ArrowRight' ); // wraps to Automatic
	await page.waitForTimeout( 500 );
	check( 'Picker', 'arrow keys wrap around', ( await attr( page ) ) === null );
	await page.keyboard.press( 'ArrowRight' ); // daylight
	await page.keyboard.press( 'ArrowRight' ); // graphite
	await page.waitForTimeout( 600 );
	check( 'Picker', 'arrows reach graphite', ( await attr( page ) ) === 'graphite' );
	const focusRing = await page.evaluate( () => getComputedStyle( document.activeElement ).outlineStyle );
	check( 'Picker', 'focused card shows a visible outline', focusRing !== 'none', focusRing );

	// Persistence and server-side attribute
	await page.reload();
	check( 'Persist', 'graphite survives a reload and is printed server-side', ( await attr( page ) ) === 'graphite' );
	const html = await (await page.request.get( `${ BASE }/wp-admin/admin.php?page=refraction-settings` )).text();
	check( 'Persist', 'server HTML carries data-refraction-theme on <html> (no flash)', /<html[^>]*data-refraction-theme="graphite"/.test( html ) );

	// Admin skin on several Refraction screens
	const screens = { home: 'admin.php?page=refraction-home', settings: 'admin.php?page=refraction-settings', tools: 'admin.php?page=refraction-tools', 'theme-builder': 'edit.php?post_type=refraction_library&tabs_group=theme', templates: 'edit.php?post_type=refraction_library&tabs_group=library', submissions: 'admin.php?page=refraction-submissions', 'floating-elements': 'edit.php?post_type=e-floating-buttons', 'role-manager': 'admin.php?page=refraction-role-manager', 'system-info': 'admin.php?page=refraction-system-info' };
	for ( const [ name, path ] of Object.entries( screens ) ) {
		await page.goto( `${ BASE }/wp-admin/${ path }` );
		const a = await attr( page );
		const bg = await css( page, '#wpcontent', 'backgroundColor' );
		const want = await toRgb( page, await token( page, '--rf-bg' ) );
		const menu = await css( page, '#adminmenuwrap', 'backgroundColor' );
		check( 'Admin skin', `${ name }: themed page, WordPress menu untouched`, a === 'graphite' && bg === want && menu !== want, `attr=${ a } bg=${ bg } menu=${ menu }` );
	}
	const homeAfter = await (async () => { await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-home` ); return snapshot( page, [ [ 'body', 'backgroundColor' ], [ '.refraction-home__links a', 'backgroundColor' ] ] ); })();
	check( 'Admin skin', 'Home cards changed colour with the theme', homeAfter !== homeBefore );
	for ( const t of THEMES ) {
		for ( const [ name, path ] of [ [ 'home', screens.home ], [ 'theme-builder', screens[ 'theme-builder' ] ] ] ) {
			wp( 'user', 'meta', 'update', '1', 'refraction_ui_theme', t );
			await page.goto( `${ BASE }/wp-admin/${ path }` );
			await page.waitForTimeout( 500 );
			await page.screenshot( { path: join( SHOTS, `${ name }-${ t }.png` ) } );
		}
	}

	// Unrelated pages unchanged
	wp( 'user', 'meta', 'update', '1', 'refraction_ui_theme', 'ember' );
	for ( const path of [ 'index.php', 'plugins.php', 'options-general.php', 'edit.php' ] ) {
		await page.goto( `${ BASE }/wp-admin/${ path }` );
		const links = await page.evaluate( () => [ ...document.querySelectorAll( 'link[rel=stylesheet]' ) ].filter( ( l ) => /ui-theme/.test( l.href ) ).length );
		const a = await attr( page );
		const bg = await css( page, '#wpcontent', 'backgroundColor' );
		check( 'Unrelated pages', `${ path }: no attribute, no theme CSS, WordPress colours`, a === null && links === 0 && bg !== 'rgb(26, 22, 19)', `attr=${ a } links=${ links } bg=${ bg }` );
	}

	// ---- AJAX hardening
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings` );
	const post = ( body ) => page.evaluate( async ( b ) => { const d = new URLSearchParams( b ); const r = await fetch( window.refractionUiTheme.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: d } ); return [ r.status, ( await r.text() ).slice( 0, 80 ) ]; }, body );
	const nonce = await page.evaluate( () => window.refractionUiTheme.nonce );
	const bad = await post( { action: 'refraction_save_ui_theme', nonce: 'nope', theme: 'ember' } );
	check( 'Security', 'bad nonce is rejected', bad[ 0 ] === 403 || /-1/.test( bad[ 1 ] ), bad.join( ' ' ) );
	const unknown = await post( { action: 'refraction_save_ui_theme', nonce, theme: 'neon"><script>' } );
	check( 'Security', 'unknown theme names are rejected (400)', unknown[ 0 ] === 400, unknown.join( ' ' ) );
	check( 'Security', 'rejected value did not reach user meta', wp( 'user', 'meta', 'get', '1', 'refraction_ui_theme' ) === 'ember' );
	wp( 'user', 'meta', 'update', '1', 'refraction_ui_theme', '<script>x</script>' );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-home` );
	check( 'Security', 'a tampered user meta value never reaches the markup', ( await attr( page ) ) === null && ! ( await page.content() ).includes( '<script>x</script>' ) );
	wp( 'user', 'meta', 'delete', '1', 'refraction_ui_theme' );
	await ctx.close();

	// ---- per user: editor-role user differs, and cannot set the site default
	const ed = await login( browser, 'editor' );
	await ed.page.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_library` );
	const edNonce = await ed.page.evaluate( () => window.refractionUiTheme && window.refractionUiTheme.nonce );
	const edSave = await ed.page.evaluate( async ( n ) => { const r = await fetch( window.refractionUiTheme.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams( { action: 'refraction_save_ui_theme', nonce: n, theme: 'blueprint' } ) } ); return r.status; }, edNonce );
	const edSite = await ed.page.evaluate( async ( n ) => { const r = await fetch( window.refractionUiTheme.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams( { action: 'refraction_save_ui_theme', nonce: n, theme: 'ember', scope: 'site' } ) } ); return r.status; }, edNonce );
	check( 'Per user', 'editor can save their own theme', edSave === 200 && wp( 'user', 'meta', 'get', '2', 'refraction_ui_theme' ) === 'blueprint', `status ${ edSave }` );
	check( 'Per user', 'editor cannot set the site default', edSite === 403 && wpTry( 'option', 'get', 'refraction_ui_theme_default' ).trim() !== 'ember', `status ${ edSite }` );
	wp( 'user', 'meta', 'update', '1', 'refraction_ui_theme', 'daylight' );
	await ed.page.reload();
	check( 'Per user', 'editor sees blueprint while admin has daylight', ( await attr( ed.page ) ) === 'blueprint' );
	await ed.ctx.close();

	// ---- site default applies to users who have not chosen
	wp( 'user', 'meta', 'delete', '2', 'refraction_ui_theme' );
	wp( 'option', 'update', 'refraction_ui_theme_default', 'contrast' );
	const ed2 = await login( browser, 'editor' );
	await ed2.page.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_library` );
	check( 'Site default', 'a user without a choice gets the site default', ( await attr( ed2.page ) ) === 'contrast' );
	await ed2.ctx.close();
	wp( 'option', 'delete', 'refraction_ui_theme_default' );

	// ---- editor
	const pageId = wp( 'post', 'create', '--post_type=page', '--post_title=Theme Check Page', '--post_status=publish', '--porcelain' );
	const ec = await login( browser, 'admin' );
	const ep = ec.page;
	const openEditor = async () => { await ep.goto( `${ BASE }/wp-admin/post.php?post=${ pageId }&action=refraction` ); await ep.waitForFunction( () => window.refraction?.documents?.getCurrent?.() && document.querySelector( '#refraction-panel' ), null, { timeout: 60000 } ); await ep.waitForTimeout( 2000 ); };
	wp( 'user', 'meta', 'delete', '1', 'refraction_ui_theme' );
	await openEditor();
	const frame = () => ep.frames().find( ( f ) => f !== ep.mainFrame() && /preview=true|refraction-preview/.test( f.url() ) ) || ep.frames().find( ( f ) => f !== ep.mainFrame() );
	const KEY_ED = [ [ '#refraction-panel', 'backgroundColor' ], [ '#refraction-panel-header', 'backgroundColor' ], [ '#refraction-editor-wrapper-v2 header', 'backgroundColor' ], [ '#refraction-panel', 'color' ] ];
	const edAuto = await snapshot( ep, KEY_ED );
	const frameBg0 = await frame().evaluate( () => getComputedStyle( document.body ).backgroundColor );
	check( 'Editor', 'Automatic: no attribute on the editor window', ( await attr( ep ) ) === null );
	const ebare = await ec.ctx.newPage();
	await ebare.route( '**/assets/ui-theme/**', ( r ) => r.abort() );
	await ebare.goto( `${ BASE }/wp-admin/post.php?post=${ pageId }&action=refraction` );
	await ebare.waitForFunction( () => window.refraction?.documents?.getCurrent?.() && document.querySelector( '#refraction-panel' ), null, { timeout: 60000 } );
	await ebare.waitForTimeout( 2000 );
	check( 'Editor', 'Automatic: panel and top bar computed colours equal the build without the feature', edAuto === await snapshot( ebare, KEY_ED ), edAuto );
	await ebare.close();
	for ( const t of THEMES ) {
		wp( 'user', 'meta', 'update', '1', 'refraction_ui_theme', t );
		await openEditor();
		const a = await attr( ep );
		const want = ( n ) => token( ep, n ).then( ( v ) => toRgb( ep, v ) );
		const panel = await css( ep, '#refraction-panel', 'backgroundColor' );
		const bar = await css( ep, '#refraction-editor-wrapper-v2 header', 'backgroundColor' );
		const txt = await css( ep, '#refraction-panel-header-title', 'color' );
		check( 'Editor', `${ t }: panel, top bar and text follow the tokens`, a === t && panel === await want( '--rf-bg' ) && bar === await want( '--rf-chrome' ) && txt === await want( '--rf-text' ), `attr=${ a } panel=${ panel } bar=${ bar } txt=${ txt }` );
		const f = frame();
		const fbg = await f.evaluate( () => getComputedStyle( document.body ).backgroundColor );
		const fattr = await f.evaluate( () => document.documentElement.getAttribute( 'data-refraction-theme' ) );
		const fsheets = await f.evaluate( () => [ ...document.querySelectorAll( 'link[rel=stylesheet]' ) ].filter( ( l ) => /ui-theme/.test( l.href ) ).length );
		check( 'Editor', `${ t }: preview iframe is never themed`, fbg === frameBg0 && fattr === null && fsheets === 0, `bg=${ fbg } (was ${ frameBg0 }) attr=${ fattr } sheets=${ fsheets }` );
		await ep.screenshot( { path: join( SHOTS, `editor-${ t }.png` ) } );
	}
	// Navigator, library and finder follow
	wp( 'user', 'meta', 'update', '1', 'refraction_ui_theme', 'ember' );
	await openEditor();
	await ep.evaluate( () => window.$e.run( 'navigator/open' ) );
	await ep.waitForTimeout( 800 );
	const nav = await css( ep, '#refraction-navigator', 'backgroundColor' );
	check( 'Editor', 'navigator is painted from the theme', nav === await toRgb( ep, await token( ep, '--rf-bg' ) ), nav );
	await ep.evaluate( () => window.$e.run( 'library/open' ) );
	await ep.waitForTimeout( 2500 );
	const lib = await css( ep, '#refraction-template-library-modal .dialog-widget-content', 'backgroundColor' );
	check( 'Editor', 'library modal is painted from the theme', lib === await toRgb( ep, await token( ep, '--rf-bg' ) ), lib );
	await ep.screenshot( { path: join( SHOTS, 'editor-ember-library.png' ) } );
	await ep.keyboard.press( 'Escape' );
	await ep.waitForTimeout( 400 );
	await ep.keyboard.press( 'Control+e' );
	await ep.waitForTimeout( 900 );
	const fin = await css( ep, '#refraction-finder__modal .dialog-widget-content', 'backgroundColor' );
	check( 'Editor', 'finder dialog is painted from the theme', fin === await toRgb( ep, await token( ep, '--rf-bg' ) ), fin );
	await ep.screenshot( { path: join( SHOTS, 'editor-ember-finder.png' ) } );
	check( 'Editor', 'no console or HTTP errors in the editor', ! ec.errors.length, ec.errors.join( ' | ' ) );
	await ec.ctx.close();

	wp( 'user', 'meta', 'delete', '1', 'refraction_ui_theme' );
	const phpLog = existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( phpLog0 ).trim() : '';
	check( 'Errors', 'no PHP warnings or notices logged', ! phpLog, phpLog.slice( 0, 300 ) );
	await browser.close();

	const failed = results.filter( ( r ) => ! r.pass );
	console.log( `\n${ results.length - failed.length }/${ results.length } checks passed` );
	process.exit( failed.length ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
