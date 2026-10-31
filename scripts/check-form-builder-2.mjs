#!/usr/bin/env node
/**
 * Form Builder part 2 check: the designer's rules, and the multi-step / repeater / group / upload / hidden / conditional
 * form, on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-form-builder-2.mjs [--site /tmp/rf-fb2-site] [--port 8922] [--shots /tmp/fb2-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip), served by `php -d
 * upload_max_filesize=20M -d post_max_size=25M -S ...` so 6 MB test uploads reach the plugin's own limit. Throw-away site.
 *
 * Covers: the Applications starting point on the canvas; groups refuse steps and groups, repeaters refuse uploads; the
 * conditional visibility editor; the Style tab reaching the public form (width, label position, button position,
 * colors, custom CSS); a three-step public form (progress, Next / Back, blocked until the step is valid, conditional field
 * shown and hidden and not submitted, group, repeater add / remove / limits and blank rows dropped, upload checks in the
 * browser and on the server, hidden field from the URL, required switch, errors returning to the right step); what is
 * stored; the admin edit screen (nested values, file download as an attachment, removing and replacing a file, bad nonce
 * and editor role refused); CSV columns; email notification and webhook; closing date, opening date, submission cap,
 * login required and redirect; files deleted with their record and collection; labels on every control.
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
const SITE = arg( 'site', '/tmp/rf-fb2-site' );
const PORT = arg( 'port', '8922' );
const SHOTS = arg( 'shots', '/tmp/fb2-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/form-builder-seed.php' );
const BUILDER = `${ BASE }/wp-admin/admin.php?page=refraction-builder`;
const FILES = '/tmp/fb2-files';

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

function wp( args, env = {} ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const seed = ( action, spec = {} ) => {
	const out = wp( [ 'eval-file', SEED ], { FB_ACTION: action, FB_SPEC: JSON.stringify( spec ) } );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
};
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

async function login( browser, user, pass ) {
	const ctx = await browser.newContext( { viewport: { width: 1500, height: 1000 }, acceptDownloads: true } );
	const page = await ctx.newPage();
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000 } ), page.click( '#wp-submit' ) ] );
	return { ctx, page };
}

const unlabelled = ( page ) => page.evaluate( () => Array.from( document.querySelectorAll( '.rfb-wrap input, .rfb-wrap select, .rfb-wrap textarea, .rfb-front input, .rfb-front select, .rfb-front textarea' ) )
	.filter( ( el ) => el.type !== 'hidden' && ! el.closest( 'template, [hidden], .rfb-hp' ) && el.offsetParent !== null && ! el.closest( '.rfb-color-row, .rfb-range-row' ) )
	.filter( ( el ) => ! ( el.labels && el.labels.length ) && ! el.getAttribute( 'aria-label' ) && ! el.getAttribute( 'aria-labelledby' ) )
	.map( ( el ) => `${ el.tagName }[name=${ el.name }]` ) );

/** Native drag with real mouse events (see check-form-builder.mjs). */
async function drag( page, source, target, offset = { x: 40, y: 4 } ) {
	await target.evaluate( ( el ) => el.scrollIntoView( { block: 'center' } ) );
	await source.evaluate( ( el ) => el.scrollIntoView( { block: 'center' } ) );
	const from = await source.boundingBox();
	await page.mouse.move( from.x + from.width / 2, from.y + from.height / 2 );
	await page.mouse.down();
	await page.mouse.move( from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 } );
	const to = await target.boundingBox();
	await page.mouse.move( to.x + offset.x, to.y + offset.y, { steps: 12 } );
	await page.waitForTimeout( 200 );
	await page.mouse.move( to.x + offset.x + 1, to.y + offset.y + 1 );
	await page.waitForTimeout( 200 );
	await page.mouse.up();
	await page.waitForTimeout( 400 );
}

const MU = `<?php
// Captures mail and outgoing HTTP for scripts/check-form-builder-2.mjs instead of sending anything.
add_filter( 'pre_wp_mail', function ( $null, $atts ) { file_put_contents( WP_CONTENT_DIR . '/fb-mail.log', wp_json_encode( $atts ) . "\\n", FILE_APPEND ); return true; }, 10, 2 );
add_filter( 'pre_http_request', function ( $pre, $args, $url ) {
	if ( false === strpos( $url, 'hooks.test' ) ) { return $pre; }
	file_put_contents( WP_CONTENT_DIR . '/fb-http.log', wp_json_encode( [ 'url' => $url, 'args' => $args ] ) . "\\n", FILE_APPEND );
	return [ 'response' => [ 'code' => 200, 'message' => 'OK' ], 'body' => 'ok', 'headers' => [], 'cookies' => [], 'filename' => null ];
}, 10, 3 );
`;

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );
	rmSync( FILES, { recursive: true, force: true } );
	mkdirSync( FILES, { recursive: true } );
	mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );
	writeFileSync( join( WPDIR, 'wp-content/mu-plugins/fb-capture.php' ), MU );
	const pdf = Buffer.from( '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n' );
	writeFileSync( join( FILES, 'cv.pdf' ), pdf );
	writeFileSync( join( FILES, 'cv2.pdf' ), Buffer.concat( [ pdf, Buffer.from( '% second\n' ) ] ) );
	writeFileSync( join( FILES, 'fake.pdf' ), 'this is not a pdf at all' );
	writeFileSync( join( FILES, 'malware.exe' ), 'MZ......' );
	writeFileSync( join( FILES, 'big.pdf' ), Buffer.concat( [ pdf, Buffer.alloc( 6 * 1024 * 1024 ) ] ) );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-d', 'upload_max_filesize=20M', '-d', 'post_max_size=25M', '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const consoleErrors = [];
	const watch = ( page, label ) => {
		page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /favicon\.ico|status of 404/.test( m.location().url + m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ page.url() }` ); } } );
		page.on( 'pageerror', ( e ) => consoleErrors.push( `[${ label }] pageerror ${ e.message } @ ${ page.url() }` ) );
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
		wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );

		const { ctx, page } = await login( browser, 'admin', 'admin' );
		watch( page, 'admin' );

		// ------------------------------------------------------------ designer rules on the Applications preset
		await page.goto( `${ BUILDER }&view=new` );
		await Promise.all( [ page.waitForURL( /collection=applications/ ), page.click( 'form:has(input[value="application"]) button' ) ] );
		await page.waitForSelector( '.rfb-cv-item' );
		const top = '#rfb-builder .rfb-canvas-inner > .rfb-cv-list > .rfb-cv-item';
		const kinds = await page.$$eval( top, ( els ) => els.map( ( e ) => e.className.split( ' ' ).find( ( c ) => /^rfb-cv-(?!item$)/.test( c ) ).slice( 7 ) ) );
		check( 'designer', 'Applications shows steps, layout blocks, a group, a repeater, an upload and a hidden field', [ 'step', 'heading', 'paragraph', 'group', 'repeater', 'file', 'hidden' ].every( ( k ) => kinds.includes( k ) ), kinds.join( ',' ) );
		check( 'designer', 'three step banners', kinds.filter( ( k ) => k === 'step' ).length === 3 );
		await page.screenshot( { path: join( SHOTS, 'designer-application.png' ), fullPage: true } );

		// ---- side panels: settings tabs on the right, both sides fold away
		check( 'panels', 'Field, Style, Advanced and General are tabs of the right panel', ( await page.locator( '.rfb-right .rfb-side-tab' ).allTextContents() ).join( '|' ) === 'Field|Style|Advanced|General' && ( await page.locator( '.rfb-design-tabs' ).count() ) === 0 );
		await page.click( '.rfb-right [data-tab="style"]' );
		check( 'panels', 'the form and the field list stay on screen while Style is open', await page.locator( '.rfb-canvas' ).isVisible() && await page.locator( '.rfb-palette-item' ).first().isVisible() && await page.locator( '.rfb-right .rfb-style-controls' ).isVisible() );
		await page.locator( '.rfb-cv-item' ).first().click();
		check( 'panels', 'selecting a field switches the right panel to Field', ( await page.getAttribute( '.rfb-right [data-tab="field"]', 'aria-selected' ) ) === 'true' && await page.locator( '.rfb-inspector .rfb-inspector-head' ).isVisible() );
		const width = async () => Math.round( ( await page.locator( '.rfb-canvas-col' ).boundingBox() ).width );
		const open = await width();
		await page.click( '[data-collapse="left"]' );
		await page.waitForTimeout( 400 );
		const leftFolded = await width();
		check( 'panels', 'the left panel folds to a rail and the form gets wider', leftFolded > open + 150 && ! ( await page.locator( '.rfb-palette-item' ).first().isVisible() ) && ( await page.getAttribute( '[data-collapse="left"]', 'aria-expanded' ) ) === 'false' && ( await page.locator( '.rfb-left' ).boundingBox() ).width < 60, `${ open } -> ${ leftFolded }` );
		await page.click( '[data-collapse="right"]' );
		await page.waitForTimeout( 400 );
		const bothFolded = await width();
		check( 'panels', 'the right panel folds too', bothFolded > leftFolded + 200 && ! ( await page.locator( '.rfb-right [data-tab="style"]' ).isVisible() ) && ( await page.locator( '.rfb-right' ).boundingBox() ).width < 60, `${ leftFolded } -> ${ bothFolded }` );
		await page.screenshot( { path: join( SHOTS, 'panels-folded.png' ), fullPage: true } );
		await page.reload();
		await page.waitForSelector( '.rfb-cv-item' );
		check( 'panels', 'folded panels stay folded after a reload', await page.locator( '.rfb-workspace.is-left-collapsed.is-right-collapsed' ).count() === 1 );
		await page.locator( '.rfb-cv-item' ).first().click();
		check( 'panels', 'selecting a field opens the right panel again', ( await page.locator( '.rfb-right [data-tab="style"]' ).isVisible() ) && ( await page.locator( '.rfb-workspace.is-right-collapsed' ).count() ) === 0 );
		await page.click( '[data-collapse="left"]' );
		await page.waitForTimeout( 400 );
		check( 'panels', 'the left panel opens again', await page.locator( '.rfb-palette-item' ).first().isVisible() && ( await page.getAttribute( '[data-collapse="left"]', 'aria-expanded' ) ) === 'true' && Math.abs( ( await width() ) - open ) < 4, `${ await width() } vs ${ open }` );
		await page.keyboard.press( 'Escape' );

		const groupList = page.locator( '.rfb-cv-group .rfb-cv-list' ).first();
		const groupBefore = await page.locator( '.rfb-cv-group .rfb-cv-list > .rfb-cv-item' ).count();
		await drag( page, page.locator( '.rfb-palette-item[data-type="step"]' ), groupList.locator( '.rfb-cv-item' ).first() );
		await drag( page, page.locator( '.rfb-palette-item[data-type="group"]' ), groupList.locator( '.rfb-cv-item' ).first() );
		check( 'designer', 'a group refuses a step and another group', ( await page.locator( '.rfb-cv-group .rfb-cv-list > .rfb-cv-item' ).count() ) === groupBefore );
		const repBefore = await page.locator( '.rfb-cv-repeater .rfb-cv-list > .rfb-cv-item' ).count();
		await drag( page, page.locator( '.rfb-palette-item[data-type="file"]' ), page.locator( '.rfb-cv-repeater .rfb-cv-list > .rfb-cv-item' ).first() );
		check( 'designer', 'a repeater refuses an upload', ( await page.locator( '.rfb-cv-repeater .rfb-cv-list > .rfb-cv-item' ).count() ) === repBefore );
		await drag( page, page.locator( '.rfb-palette-item[data-type="phone"]' ), groupList.locator( '.rfb-cv-item' ).first() );
		check( 'designer', 'a group accepts a plain field', ( await page.locator( '.rfb-cv-group .rfb-cv-list > .rfb-cv-item' ).count() ) === groupBefore + 1 );

		// conditional visibility editor
		await page.locator( '.rfb-cv-item:has(.rfb-label:text-is("Portfolio link"))' ).click();
		const rule = page.locator( '.rfb-inspector .rfb-rule' );
		check( 'designer', 'the visibility editor shows the saved rule', ( await rule.count() ) === 1 && ( await rule.locator( 'select' ).first().inputValue() ) === 'has_portfolio' );
		check( 'designer', 'a conditional field is marked on the canvas', ( await page.locator( '.rfb-cv-item.is-selected .rfb-badge:text("Conditional")' ).count() ) === 1 );
		await page.locator( '.rfb-inspector button:text-is("Add rule")' ).click();
		check( 'designer', 'a rule can be added', ( await page.locator( '.rfb-inspector .rfb-rule' ).count() ) === 2 );
		await page.locator( '.rfb-inspector .rfb-rule' ).nth( 1 ).locator( 'button[aria-label="Remove rule"]' ).click();
		check( 'designer', 'and removed', ( await page.locator( '.rfb-inspector .rfb-rule' ).count() ) === 1 );
		const unlD = await unlabelled( page );
		check( 'a11y', 'designer controls are labelled', unlD.length === 0, unlD.join( ',' ) );

		// style tab and advanced tab, then save
		await page.click( '[data-tab="style"]' );
		const setRange = async ( label, value ) => page.locator( `.rfb-style-controls .rfb-field:has(.rfb-mini:text-is("${ label }")) .rfb-num` ).fill( String( value ) );
		await setRange( 'Max width (px, 0 = full)', 640 );
		await setRange( 'Corner radius (px)', 14 );
		await page.locator( '.rfb-style-controls .rfb-field:has(.rfb-mini:text-is("Label position")) select' ).selectOption( 'left' );
		await page.locator( '.rfb-style-controls .rfb-field:has(.rfb-mini:text-is("Button position")) select' ).selectOption( 'center' );
		await page.locator( '.rfb-style-controls .rfb-color:has(.rfb-mini:text-is("Button color")) .rfb-hex' ).fill( '#d6336c' );
		await page.locator( '.rfb-style-controls .rfb-code' ).fill( 'selector .rfb-heading { color: rgb(1, 2, 3); } </style><script>window.hacked=1</script>' );
		await page.click( '[data-tab="advanced"]' );
		await page.locator( '.rfb-advanced .rfb-field:has(.rfb-mini:text-is("Progress display")) select' ).selectOption( 'bar' );
		await page.locator( '.rfb-advanced .rfb-field:has(.rfb-mini:text-is("Submit button text")) input' ).fill( 'Send application' );
		await page.locator( '.rfb-advanced .rfb-switch:has-text("Email me when someone submits")' ).click();
		await page.locator( '.rfb-advanced .rfb-field:has(.rfb-mini:text-is("Send to (comma separated)")) input' ).fill( 'hr@example.com, nope, boss@example.com' );
		await page.locator( '.rfb-advanced .rfb-field:has(.rfb-mini:text-is("Reply to the visitor using this email field")) select' ).selectOption( 'email' );
		await page.locator( '.rfb-advanced .rfb-field:has(.rfb-mini:text-is("Send each submission to a webhook (optional)")) input' ).fill( 'https://hooks.test/in' );
		await page.screenshot( { path: join( SHOTS, 'designer-advanced.png' ), fullPage: true } );
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		const saved = seed( 'definition', { collection: 'applications' } );
		check( 'designer', 'style values are saved and clamped', saved.style.width === 640 && saved.style.radius === 14 && saved.style.label_position === 'left' && saved.style.button_align === 'center' && saved.style.button_bg === '#d6336c' );
		check( 'designer', 'custom css is saved without markup', saved.style.custom_css.includes( 'rgb(1, 2, 3)' ) && ! saved.style.custom_css.includes( '<' ), saved.style.custom_css );
		check( 'designer', 'advanced settings are saved and cleaned', saved.settings.progress === 'bar' && saved.settings.submit_text === 'Send application' && saved.settings.notify_to === 'hr@example.com, boss@example.com' && saved.settings.notify_enabled && saved.settings.webhook_url === 'https://hooks.test/in' && saved.settings.reply_to_field === 'email', JSON.stringify( saved.settings ) );
		check( 'designer', 'the new group field was saved in the group', saved.fields.find( ( f ) => f.key === 'address' ).children.length === 3 );
		seed( 'configure', { collection: 'applications', settings: { hourly_limit: 0, min_seconds: 3 } } );

		// ------------------------------------------------------------ public form
		const formPage = seed( 'page', { title: 'Apply', slug: 'apply', content: '[refraction_form collection="applications"]' } );

		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 900 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `apply ${ theme }`;
			const beforeCount = seed( 'state', { collection: 'applications' } ).count;
			await v.goto( formPage.url + '?ref=friend42' );
			await v.waitForLoadState( 'load' );

			// style reaches the page
			const styles = await v.evaluate( () => {
				const form = document.querySelector( '.rfb-form' );
				const wrap = document.querySelector( '.rfb-form-wrap' );
				const submit = document.querySelector( '.rfb-submit' );
				const heading = document.querySelector( '.rfb-heading' );
				const label = document.querySelector( '.rfb-field[data-rfb-key=full_name] .rfb-label' );
				return {
					width: Math.round( form.getBoundingClientRect().width ), radius: getComputedStyle( form ).borderTopLeftRadius,
					button: getComputedStyle( submit ).backgroundColor, headingColor: getComputedStyle( heading ).color,
					labelGrid: getComputedStyle( label.parentElement ).display, actions: getComputedStyle( document.querySelector( '.rfb-actions' ) ).justifyContent,
					hacked: window.hacked === undefined,
				};
			} );
			check( area, 'max width and corner radius from the Style tab', styles.width <= 640 + 2 && styles.radius === '18px', JSON.stringify( styles ) );
			check( area, 'button color, label position and button position apply', styles.button === 'rgb(214, 51, 108)' && styles.labelGrid === 'grid' && styles.actions === 'center', JSON.stringify( styles ) );
			check( area, 'custom css applies scoped to the form and cannot run script', styles.headingColor === 'rgb(1, 2, 3)' && styles.hacked, JSON.stringify( styles ) );

			// steps
			check( area, 'three steps, only the first visible', ( await v.locator( '[data-rfb-step]' ).count() ) === 3 && ( await v.locator( '[data-rfb-step]:visible' ).count() ) === 1 );
			check( area, 'the progress bar reports step 1 of 3', ( await v.getAttribute( '.rfb-bar', 'aria-valuenow' ) ) === '1' && ( await v.textContent( '.rfb-progress-label' ) ).includes( 'Step 1 of 3' ) );
			await v.screenshot( { path: join( SHOTS, `apply-step1-${ theme }.png` ), fullPage: true } );
			await v.click( '.rfb-next' );
			check( area, 'Next is blocked until the step is valid', ( await v.locator( '[data-rfb-step]:visible' ).count() ) === 1 && ( await v.$eval( '#rfb-values-full_name', ( el ) => ! el.validity.valid ) ) );
			check( area, 'back is hidden on the first step, submit hidden until the last', ! ( await v.locator( '.rfb-back' ).isVisible() ) && ! ( await v.locator( '.rfb-submit' ).isVisible() ) );

			// conditional field
			const portfolio = v.locator( '.rfb-field[data-rfb-key=portfolio]' );
			check( area, 'a conditional field starts hidden and disabled', ! ( await portfolio.isVisible() ) && await v.$eval( '#rfb-values-portfolio', ( el ) => el.disabled ) );
			await v.locator( '.rfb-switch:has(#rfb-values-has_portfolio)' ).click();
			check( area, 'it shows when its rule matches', await portfolio.isVisible() && await v.$eval( '#rfb-values-portfolio', ( el ) => ! el.disabled ) );
			await v.locator( '.rfb-switch:has(#rfb-values-has_portfolio)' ).click();
			check( area, 'and hides again', ! ( await portfolio.isVisible() ) );

			await v.fill( '#rfb-values-full_name', `Ada ${ theme }` );
			await v.fill( '#rfb-values-email', `ada-${ theme }@example.com` );
			await v.selectOption( '#rfb-values-role', 'Developer' );
			await v.fill( '#rfb-values-address-street', '1 Analytical Way' );
			await v.fill( '#rfb-values-address-city', 'London' );
			await v.click( '.rfb-next' );
			check( area, 'Next moves to step 2 and updates the progress', ( await v.locator( '[data-rfb-step]:visible' ).count() ) === 1 && ( await v.getAttribute( '.rfb-bar', 'aria-valuenow' ) ) === '2' && await v.locator( '.rfb-repeater' ).isVisible() );
			await v.click( '.rfb-back' );
			check( area, 'Back returns to step 1 with the answers kept', ( await v.inputValue( '#rfb-values-full_name' ) ) === `Ada ${ theme }` && await v.locator( '#rfb-values-role' ).isVisible() );
			await v.click( '.rfb-next' );

			// repeater
			const rows = () => v.locator( '.rfb-repeater .rfb-rep-row' ).count();
			check( area, 'a repeater starts with one row and no remove button on it', ( await rows() ) === 1 && ! ( await v.locator( '.rfb-rep-remove' ).first().isVisible() ) );
			await v.fill( '#rfb-values-jobs-0-company', 'Babbage & Co' );
			await v.fill( '#rfb-values-jobs-0-job_title', 'Engineer' );
			await v.fill( '#rfb-values-jobs-0-years', '4' );
			await v.click( '[data-rfb-add]' );
			check( area, 'Add row adds a row and focuses it', ( await rows() ) === 2 && await v.evaluate( () => document.activeElement.id === 'rfb-values-jobs-1-company' ) );
			for ( let i = 0; i < 6; i++ ) { if ( await v.locator( '[data-rfb-add]' ).isEnabled() ) { await v.click( '[data-rfb-add]' ); } }
			check( area, 'the row limit (5) disables the add button', ( await rows() ) === 5 && ! ( await v.locator( '[data-rfb-add]' ).isEnabled() ) );
			while ( ( await rows() ) > 2 ) { await v.locator( '.rfb-rep-row' ).last().locator( '[data-rfb-remove]' ).click(); }
			check( area, 'rows can be removed', ( await rows() ) === 2 && await v.locator( '[data-rfb-add]' ).isEnabled() );
			// row 2 stays empty on purpose: untouched rows are dropped on the server instead of reported
			// (its required company field would block the browser, so remove the attribute for this row only)
			await v.evaluate( () => document.querySelector( '#rfb-values-jobs-1-company' ).removeAttribute( 'required' ) );

			// files in the browser
			await v.setInputFiles( '#rfb-values-cv', join( FILES, 'malware.exe' ) );
			check( area, 'a file of a type that is not allowed is refused in the browser', ( await v.locator( '.rfb-file-error' ).first().isVisible() ) && ( await v.locator( '.rfb-file-error' ).first().textContent() ).includes( 'malware.exe' ) && ( await v.$eval( '#rfb-values-cv', ( el ) => el.files.length ) ) === 0 );
			await v.setInputFiles( '#rfb-values-cv', join( FILES, 'big.pdf' ) );
			check( area, 'a file over the size limit is refused in the browser', ( await v.locator( '.rfb-file-error' ).first().textContent() ).includes( 'larger' ) && ( await v.$eval( '#rfb-values-cv', ( el ) => el.files.length ) ) === 0 );
			await v.setInputFiles( '#rfb-values-cv', join( FILES, 'fake.pdf' ) );
			check( area, 'a plausible file name passes the browser check', ! ( await v.locator( '.rfb-file-error' ).first().isVisible() ) && ( await v.$eval( '#rfb-values-cv', ( el ) => el.files.length ) ) === 1 );
			await v.click( '.rfb-next' );
			check( area, 'Next moves to the last step, where Submit appears', await v.locator( '.rfb-submit' ).isVisible() && ! ( await v.locator( '.rfb-next' ).isVisible() ) );
			check( area, 'the hidden field was filled from the URL', ( await v.inputValue( 'input[name="values[referral]"]' ) ) === 'friend42' );
			await v.fill( '#rfb-values-cover', 'I would love to build things.' );
			await v.screenshot( { path: join( SHOTS, `apply-step3-${ theme }.png` ), fullPage: true } );

			// server: a file that only looks like a PDF, and an unticked required switch
			const filesBefore = seed( 'files', { collection: 'applications' } ).files.length;
			await sleep( 3300 );
			await Promise.all( [ v.waitForNavigation(), v.click( '.rfb-submit' ) ] );
			await v.waitForLoadState( 'load' );
			const afterErrors = await v.$$eval( '.rfb-form-wrap .rfb-error:not([hidden])', ( els ) => els.map( ( e ) => e.textContent ) );
			check( area, 'the server refuses a file that is not a real PDF and a missing agreement', afterErrors.some( ( e ) => /does not look like a real PDF/.test( e ) ) && afterErrors.some( ( e ) => /required/.test( e ) ), afterErrors.join( ' | ' ) );
			check( area, 'nothing was stored and no file was kept', seed( 'state', { collection: 'applications' } ).count === beforeCount && seed( 'files', { collection: 'applications' } ).files.length === filesBefore );
			check( area, 'the form reopens on the first step that has an error and keeps the typed values', ( await v.inputValue( '#rfb-values-full_name' ) ) === `Ada ${ theme }` && ( await v.inputValue( '#rfb-values-address-street' ) ) === '1 Analytical Way' && ( await v.locator( '[data-rfb-step]:visible .has-error' ).count() ) >= 1 && await v.locator( '.rfb-repeater' ).isVisible() );
			check( area, 'the repeater row survives the round trip', ( await v.inputValue( '#rfb-values-jobs-0-company' ) ) === 'Babbage & Co' );

			// second attempt: real PDF, agreement ticked
			await v.setInputFiles( '#rfb-values-cv', join( FILES, 'cv.pdf' ) );
			await v.click( '.rfb-next' );
			await v.locator( '.rfb-switch:has(#rfb-values-consent)' ).click();
			await sleep( 3300 );
			await Promise.all( [ v.waitForNavigation(), v.click( '.rfb-submit' ) ] );
			await v.waitForLoadState( 'load' );
			check( area, 'a valid application shows the success message', ( await v.textContent( '.rfb-form-wrap' ) ).includes( 'Thank you. Your application was received.' ), ( await v.textContent( '.rfb-form-wrap' ) ).slice( 0, 200 ) );
			const latest = seed( 'latest', { collection: 'applications' } ).record;
			check( area, 'the stored values are nested and clean', latest && latest.values.full_name === `Ada ${ theme }` && latest.values.address.street === '1 Analytical Way' && latest.values.address.city === 'London' && latest.values.role === 'Developer', JSON.stringify( latest && latest.values ) );
			check( area, 'only the filled repeater row was stored', latest.values.jobs.length === 1 && latest.values.jobs[ 0 ].company === 'Babbage & Co' && latest.values.jobs[ 0 ].years === '4', JSON.stringify( latest.values.jobs ) );
			check( area, 'the conditional field that stayed hidden was not stored', latest.values.portfolio === undefined && latest.values.has_portfolio === '0' );
			check( area, 'the hidden field and the agreement were stored', latest.values.referral === 'friend42' && latest.values.consent === '1' );
			check( area, 'the upload is stored with a random name and the original kept as a label', latest.values.cv.length === 1 && latest.values.cv[ 0 ].name === 'cv.pdf' && /^[a-f0-9]{32}$/.test( latest.values.cv[ 0 ].id ) && latest.values.cv[ 0 ].type === 'application/pdf' );
			const stored = seed( 'files', { collection: 'applications' } );
			check( area, 'the upload folder is guarded and holds exactly the kept file(s)', stored.guard && stored.files.every( ( f ) => /^[a-f0-9]{32}\.(pdf|docx)$/.test( f ) ) && stored.files.includes( `${ latest.values.cv[ 0 ].id }.pdf` ), JSON.stringify( stored ) );
			await v.screenshot( { path: join( SHOTS, `apply-done-${ theme }.png` ), fullPage: true } );
			await vctx.close();
		}

		check( 'notify', 'one email per saved application, to the valid addresses only', ( () => {
			const lines = existsSync( join( WPDIR, 'wp-content/fb-mail.log' ) ) ? readFileSync( join( WPDIR, 'wp-content/fb-mail.log' ), 'utf8' ).trim().split( '\n' ).map( ( l ) => JSON.parse( l ) ) : [];
			return lines.length === themes.length && lines.every( ( m ) => m.to === 'hr@example.com, boss@example.com' || ( Array.isArray( m.to ) && m.to.length === 2 ) || String( m.to ).includes( 'boss@example.com' ) );
		} )(), existsSync( join( WPDIR, 'wp-content/fb-mail.log' ) ) ? readFileSync( join( WPDIR, 'wp-content/fb-mail.log' ), 'utf8' ).slice( 0, 300 ) : 'no mail' );
		const mail = JSON.parse( readFileSync( join( WPDIR, 'wp-content/fb-mail.log' ), 'utf8' ).trim().split( '\n' )[ 0 ] );
		check( 'notify', 'the email lists the answers, links to the record and replies to the visitor', mail.message.includes( 'Full name: Ada' ) && mail.message.includes( 'Address: Street: 1 Analytical Way' ) && mail.message.includes( 'view=record' ) && ( [].concat( mail.headers ) ).some( ( h ) => /^Reply-To: ada-.*@example\.com$/.test( h ) ) && /^New Application: Ada/.test( mail.subject ), JSON.stringify( mail ).slice( 0, 500 ) );
		const hooks = readFileSync( join( WPDIR, 'wp-content/fb-http.log' ), 'utf8' ).trim().split( '\n' ).map( ( l ) => JSON.parse( l ) );
		check( 'webhook', 'each application is posted as JSON to the configured address', hooks.length === themes.length && hooks[ 0 ].url === 'https://hooks.test/in' && hooks[ 0 ].args.method === 'POST' && JSON.parse( hooks[ 0 ].args.body ).fields.full_name.value.startsWith( 'Ada' ) && JSON.parse( hooks[ 0 ].args.body ).collection === 'applications' && hooks[ 0 ].args.blocking === false, JSON.stringify( hooks[ 0 ] ).slice( 0, 300 ) );
		check( 'webhook', 'upload contents are never sent, only file names', JSON.parse( hooks[ 0 ].args.body ).fields.cv.value[ 0 ] === 'cv.pdf' );

		// ------------------------------------------------------------ admin: edit screen, downloads, replace file
		const rec = seed( 'latest', { collection: 'applications' } ).record;
		await page.goto( `${ BUILDER }&view=record&collection=applications&record=${ rec.id }` );
		await page.waitForLoadState( 'load' );
		check( 'admin', 'the edit screen shows nested values', ( await page.inputValue( '#rfb-values-address-street' ) ) === '1 Analytical Way' && ( await page.inputValue( '#rfb-values-jobs-0-company' ) ) === 'Babbage & Co' && ( await page.locator( '.rfb-repeater .rfb-rep-row' ).count() ) === 1 );
		check( 'admin', 'the portfolio field stays hidden for this record', ! ( await page.locator( '.rfb-field[data-rfb-key=portfolio]' ).isVisible() ) );
		check( 'admin', 'the hidden field is shown as editable text', ( await page.inputValue( '#rfb-values-referral' ) ) === 'friend42' );
		await page.screenshot( { path: join( SHOTS, 'admin-record.png' ), fullPage: true } );
		const link = page.locator( '.rfb-files a' ).first();
		const href = await link.getAttribute( 'href' );
		const cookies = ( await ctx.cookies() ).map( ( c ) => `${ c.name }=${ c.value }` ).join( '; ' );
		const dl = await fetch( new URL( href, BASE ).toString().replace( /&amp;/g, '&' ), { headers: { cookie: cookies } } );
		const body = Buffer.from( await dl.arrayBuffer() );
		check( 'admin', 'the download is an attachment with the original name and the exact bytes', ( dl.headers.get( 'content-disposition' ) || '' ).includes( 'attachment; filename="cv.pdf"' ) && dl.headers.get( 'x-content-type-options' ) === 'nosniff' && body.equals( readFileSync( join( FILES, 'cv.pdf' ) ) ) && dl.headers.get( 'content-type' ) === 'application/octet-stream', dl.headers.get( 'content-disposition' ) );
		const badNonce = await fetch( new URL( href, BASE ).toString().replace( /&amp;/g, '&' ).replace( /_wpnonce=[a-z0-9]+/, '_wpnonce=bad' ), { headers: { cookie: cookies } } );
		check( 'admin', 'a download link with a bad nonce is refused', badNonce.status === 403 || ( await badNonce.text() ).includes( 'expired' ) );
		const anon = await fetch( new URL( href, BASE ).toString().replace( /&amp;/g, '&' ), { redirect: 'manual' } );
		check( 'admin', 'a visitor cannot download', anon.status !== 200 );
		seed( 'user', { login: 'editor2', pass: 'editor2pass', role: 'editor' } );
		const ed = await login( browser, 'editor2', 'editor2pass' );
		const edDl = await ed.ctx.request.get( new URL( href, BASE ).toString().replace( /&amp;/g, '&' ), { failOnStatusCode: false } );
		check( 'admin', 'an editor cannot download', edDl.status() === 403 );
		await ed.ctx.close();

		// removing the only CV is refused (required), replacing it deletes the old file
		await page.locator( '.rfb-files input[name="rfb_remove[]"]' ).check();
		await page.evaluate( () => HTMLFormElement.prototype.submit.call( document.querySelector( 'form[data-rfb-form]' ) ) );
		await page.waitForURL( /done=errors/ );
		check( 'admin', 'removing a required upload without a replacement is refused', ( await page.textContent( '.rfb-field[data-rfb-key=cv]' ) ).includes( 'Please choose a file' ) );
		const oldFiles = seed( 'files', { collection: 'applications' } ).files;
		await page.setInputFiles( '#rfb-values-cv', join( FILES, 'cv2.pdf' ) );
		await page.locator( '.rfb-files input[name="rfb_remove[]"]' ).count();
		await Promise.all( [ page.waitForURL( /done=record-saved|done=errors/ ), page.click( '.rfb-card-footer button[type=submit]' ) ] );
		const replaced = seed( 'latest', { collection: 'applications' } ).record;
		const nowFiles = seed( 'files', { collection: 'applications' } ).files;
		check( 'admin', 'a replacement upload is saved and the old file is deleted', replaced.values.cv.length === 1 && replaced.values.cv[ 0 ].size !== rec.values.cv[ 0 ].size && ! nowFiles.includes( `${ rec.values.cv[ 0 ].id }.pdf` ) && nowFiles.length === oldFiles.length, `${ JSON.stringify( oldFiles ) } -> ${ JSON.stringify( nowFiles ) }` );

		// CSV
		await page.goto( `${ BUILDER }&view=records&collection=applications` );
		const exportHref = ( await page.getAttribute( 'a:has-text("Export CSV")', 'href' ) ).replace( /&amp;/g, '&' );
		const csv = await ( await fetch( exportHref, { headers: { cookie: cookies } } ) ).text();
		const header = csv.split( '\n' )[ 0 ];
		check( 'export', 'CSV has a column per group child and one for the repeater and the upload', header.includes( 'Address > Street' ) && header.includes( 'Previous jobs' ) && header.includes( 'Your CV' ) && header.includes( 'Referral' ), header );
		check( 'export', 'CSV rows carry the nested answers', csv.includes( '1 Analytical Way' ) && csv.includes( 'Babbage & Co, Engineer, 4' ) && csv.includes( 'cv2.pdf' ), csv.slice( 0, 600 ) );
		check( 'table', 'the table lists the applications with the role filter', ( await page.locator( '.rfb-table tbody tr' ).count() ) === themes.length && ( await page.locator( 'select[name=f_role]' ).count() ) === 1 );

		// ------------------------------------------------------------ settings: availability, cap, login, redirect
		const visit = async ( fn ) => {
			const c = await browser.newContext( { viewport: { width: 1200, height: 900 } } );
			const p = await c.newPage();
			watch( p, 'visitor settings' );
			try { return await fn( p, c ); } finally { await c.close(); }
		};
		seed( 'configure', { collection: 'applications', settings: { closes: '2020-01-01 00:00', closed_message: 'Applications are closed.' } } );
		check( 'settings', 'a closed form shows the closed message and no fields', await visit( async ( p ) => { await p.goto( formPage.url ); const t = await p.textContent( '.rfb-form-wrap' ); return t.includes( 'Applications are closed.' ) && ( await p.locator( '.rfb-form' ).count() ) === 0; } ) );
		seed( 'configure', { collection: 'applications', settings: { closes: '', opens: '2099-01-01 00:00' } } );
		check( 'settings', 'a form that has not opened yet is closed too', await visit( async ( p ) => { await p.goto( formPage.url ); return ( await p.locator( '.rfb-form' ).count() ) === 0; } ) );
		seed( 'configure', { collection: 'applications', settings: { opens: '', max_submissions: seed( 'state', { collection: 'applications' } ).count } } );
		check( 'settings', 'a form that reached its submission cap is closed', await visit( async ( p ) => { await p.goto( formPage.url ); return ( await p.locator( '.rfb-form' ).count() ) === 0; } ) );
		seed( 'configure', { collection: 'applications', settings: { max_submissions: 0, require_login: true } } );
		check( 'settings', 'login required: a visitor sees a log in link', await visit( async ( p ) => { await p.goto( formPage.url ); return ( await p.locator( '.rfb-form' ).count() ) === 0 && ( await p.textContent( '.rfb-form-wrap' ) ).includes( 'log in' ); } ) );
		const loggedIn = await page.goto( formPage.url );
		check( 'settings', 'login required: a logged-in user gets the form', loggedIn.status() === 200 && ( await page.locator( '.rfb-form' ).count() ) === 1 );

		// redirect after submit (simple one-step collection)
		seed( 'configure', { collection: 'applications', settings: { require_login: false } } );
		const thanks = seed( 'page', { title: 'Thanks', slug: 'thanks-page', content: 'Thanks for applying.' } );
		seed( 'configure', { collection: 'applications', settings: { redirect_url: thanks.url } } );
		await visit( async ( p ) => {
			await p.goto( formPage.url );
			await p.fill( '#rfb-values-full_name', 'Redirect Rita' );
			await p.fill( '#rfb-values-email', 'rita@example.com' );
			await p.selectOption( '#rfb-values-role', 'Designer' );
			await p.click( '.rfb-next' );
			await p.fill( '#rfb-values-jobs-0-company', 'Redirect Co' );
			await p.setInputFiles( '#rfb-values-cv', join( FILES, 'cv.pdf' ) );
			await p.click( '.rfb-next' );
			await p.locator( '.rfb-switch:has(#rfb-values-consent)' ).click();
			await sleep( 3300 );
			await Promise.all( [ p.waitForURL( /thanks-page/ ), p.click( '.rfb-submit' ) ] );
			check( 'settings', 'a redirect address replaces the success message', ( await p.textContent( 'body' ) ).includes( 'Thanks for applying.' ) && seed( 'latest', { collection: 'applications' } ).record.values.full_name === 'Redirect Rita' );
		} );

		// ------------------------------------------------------------ cleanup of files
		const target = seed( 'latest', { collection: 'applications' } ).record;
		await page.goto( `${ BUILDER }&view=records&collection=applications` );
		await page.locator( `input[name="records[]"][value="${ target.id }"]` ).check();
		page.once( 'dialog', ( d ) => d.accept() );
		await Promise.all( [ page.waitForURL( /done=records-deleted/ ), page.click( '.rfb-bulkbar button[type=submit]' ) ] );
		check( 'cleanup', 'deleting a record deletes its uploaded file', ! seed( 'files', { collection: 'applications' } ).files.includes( `${ target.values.cv[ 0 ].id }.pdf` ) );
		await page.goto( `${ BUILDER }&view=design&collection=applications` );
		await page.fill( '#rfb-confirm', 'Applications' );
		await Promise.all( [ page.waitForURL( /done=collection-deleted/ ), page.click( '.rfb-danger button' ) ] );
		check( 'cleanup', 'deleting a collection deletes all of its uploads', seed( 'files', { collection: 'applications' } ).files.length === 0 );

		const phpLog = logTail( logStart );
		check( 'php', 'no PHP errors, warnings or notices in the debug log', ! /PHP (Warning|Notice|Fatal|Deprecated)|Uncaught/.test( phpLog ), phpLog );
		check( 'console', 'no console errors', consoleErrors.length === 0, consoleErrors.join( ' || ' ) );
		await ctx.close();
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) FAILED` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
