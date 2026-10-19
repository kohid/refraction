#!/usr/bin/env node
/**
 * Forms check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-forms.mjs [--site /tmp/rf-forms-site] [--port 8821] [--hook-port 18823] [--shots /tmp/forms-shots]
 *                                     [--wpcli /tmp/rsite-dl/wpcli.phar]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). The check seeds pages with
 * forms (scripts/fixtures/forms-seed.php), installs a mu-plugin that captures wp_mail() (pre_wp_mail) and points the
 * captcha verification at a local fake, and starts a local fake receiver for webhooks. Use a throw-away site.
 *
 * Covers: every field type rendered, failing and successful submits (ajax and without JavaScript), stored values in the
 * admin, the action log, emails (recipients, headers, injection), webhooks (generic, Discord, Slack, failure, private
 * network refusal), honeypot, minimum time, math question, rate limit, captcha settings and verification, multi-step,
 * file upload rules and protected storage, CSV export (formula safety, nonce, capability), list filters and bulk actions,
 * retention and privacy toggles, privacy exporter/eraser, the Login widget, the editor, PHP log and console errors.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-forms-site' );
const PORT = arg( 'port', '8821' );
const HOOK_PORT = arg( 'hook-port', '18823' );
const SHOTS = arg( 'shots', '/tmp/forms-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/forms-seed.php' );

let failures = 0;
let total = 0;
const check = ( area, name, pass, evidence = '' ) => {
	total++;
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
	const out = wp( [ 'eval-file', SEED ], { FM_ACTION: action, ...extra } );
	const start = out.search( /[[{0-9]/ );
	return JSON.parse( out.slice( start ) );
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

// --------------------------------------------------------------------------- fake receiver (webhooks, captcha verify)
const received = [];
const receiver = createServer( ( req, res ) => {
	let body = '';
	req.on( 'data', ( c ) => ( body += c ) );
	req.on( 'end', () => {
		if ( req.url.startsWith( '/captcha' ) ) {
			const response = new URLSearchParams( body ).get( 'response' );
			res.setHeader( 'Content-Type', 'application/json' );
			res.end( JSON.stringify( { success: response === 'good', score: 0.9 } ) );
			return;
		}
		received.push( { method: req.method, url: req.url, type: req.headers[ 'content-type' ], body } );
		res.setHeader( 'Content-Type', 'application/json' );
		res.end( '{"ok":true}' );
	} );
} );

const MU = `<?php
// Test helper (scripts/check-forms.mjs): capture mail, point the captcha check at the local fake.
add_filter( 'pre_wp_mail', function ( $null, $atts ) {
	file_put_contents( WP_CONTENT_DIR . '/rf-mail.log', wp_json_encode( $atts ) . "\\n", FILE_APPEND );
	return true;
}, 10, 2 );
add_filter( 'refraction/forms/captcha_verify_url', function () {
	return 'http://127.0.0.1:${ HOOK_PORT }/captcha';
} );
`;

/** Posts a form from inside the page (same cookies), optionally changing the fields. */
const postForm = ( page, formId, changes = {} ) =>
	page.evaluate( async ( { formId, changes } ) => {
		const form = document.querySelector( `#refraction-form-${ formId } form` );
		const fd = new FormData( form );
		for ( const [ k, v ] of Object.entries( changes ) ) {
			if ( v === null ) { fd.delete( k ); } else { fd.set( k, v ); }
		}
		const r = await fetch( form.dataset.rfAjax, { method: 'POST', body: fd, credentials: 'same-origin' } );
		let json = null;
		try { json = await r.json(); } catch { /* not json */ }
		return { status: r.status, json };
	}, { formId, changes } );

const VALID_BASIC = {
	'form_fields[name]': 'Jane <b>Doe</b>',
	'form_fields[email]': 'jane@example.org',
	'form_fields[phone]': '+1 555 123',
	'form_fields[msg]': 'Hello\nthere',
	'form_fields[site]': 'https://example.org',
	'form_fields[age]': '30',
	'form_fields[color]': 'b',
	'form_fields[size]': 'M',
	'form_fields[when]': '2026-02-28',
	'form_fields[at]': '13:45',
	'form_fields[pw]': 'sup3rsecret',
	'form_fields[terms]': 'on',
};

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );
	writeFileSync( join( WPDIR, 'wp-content/mu-plugins/rf-forms-test.php' ), MU, { flag: 'w' } );

	await new Promise( ( r ) => receiver.listen( Number( HOOK_PORT ), '127.0.0.1', r ) );

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
			// Our own tests make the server answer 4xx; the browser logs those as console errors.
			if ( m.type() === 'error' && ! /favicon\.ico|status of (4\d\d|5\d\d)|Failed to load resource.*(4\d\d|5\d\d)/.test( m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ m.location().url }` ); }
		} );
		page.on( 'pageerror', ( e ) => consoleErrors.push( `[${ label }] pageerror ${ e.message }` ) );
	};

	try {
		wp( [ 'plugin', 'activate', 'refraction' ] );
		wp( [ 'option', 'update', 'permalink_structure', '' ] );
		seed( 'reset' );
		const ids = seed( 'site', { FM_HOOK_URL: `http://127.0.0.1:${ HOOK_PORT }/hook` } );
		check( 'setup', 'seeded the form pages', Object.keys( ids ).length >= 10, JSON.stringify( ids ) );
		const url = ( slug ) => `${ BASE }/?pagename=${ slug }`;

		const admin = await login( browser, 'admin', 'admin' );
		const editor = await login( browser, 'editor', 'editor' );
		watch( admin.page, 'admin' );
		watch( editor.page, 'editor-role' );

		const newVisitor = async ( opts = {} ) => {
			const ctx = await browser.newContext( { viewport: { width: 1100, height: 1200 }, ...opts } );
			const page = await ctx.newPage();
			watch( page, 'visitor' );
			return { ctx, page };
		};

		// ------------------------------------------------------------------ rendering of every field type
		const v = await newVisitor();
		const page = v.page;
		await page.goto( url( 'form-basic' ) );
		await page.waitForSelector( '[data-rf-form]' );
		const W = '#refraction-form-frmbasic';
		check( 'render', 'the form is on the page with its live region', ( await page.locator( `${ W } [data-rf-messages][aria-live="polite"]` ).count() ) === 1 );
		const types = await page.$$eval( `${ W } .refraction-form__field input, ${ W } .refraction-form__field select, ${ W } .refraction-form__field textarea`, ( els ) => els.map( ( e ) => `${ e.tagName.toLowerCase() }:${ e.type }:${ e.name }` ) );
		for ( const want of [ 'input:text:form_fields[name]', 'input:email:form_fields[email]', 'input:tel:form_fields[phone]', 'textarea:textarea:form_fields[msg]', 'input:url:form_fields[site]', 'input:number:form_fields[age]', 'select:select-one:form_fields[color]', 'input:radio:form_fields[size]', 'input:checkbox:form_fields[extras][]', 'input:date:form_fields[when]', 'input:time:form_fields[at]', 'input:password:form_fields[pw]', 'input:checkbox:form_fields[terms]' ] ) {
			check( 'render', `field ${ want }`, types.includes( want ), types.join( ' ' ) );
		}
		check( 'render', 'hidden field carries its default', ( await page.inputValue( 'input[type=hidden][name="form_fields[src]"]' ) ) === 'landing' );
		check( 'render', 'html field is rendered (kses keeps strong)', ( await page.locator( `${ W } .fm-note strong` ).count() ) === 1 );
		check( 'render', 'select has its options', ( await page.$$eval( `${ W } select option`, ( o ) => o.map( ( x ) => x.value ) ) ).join() === ',r,b', '' );
		check( 'render', 'radio has 3 options and checkbox 3', ( await page.locator( `${ W } input[type=radio]` ).count() ) === 3 && ( await page.locator( `${ W } input[name="form_fields[extras][]"]` ).count() ) === 3 );
		check( 'render', 'number has min and max', ( await page.getAttribute( `${ W } input[type=number]`, 'min' ) ) === '18' && ( await page.getAttribute( `${ W } input[type=number]`, 'max' ) ) === '99' );
		check( 'render', 'labels are tied to inputs', ( await page.locator( `${ W } label[for="rf-frmbasic-name"]` ).innerText() ).includes( 'Your name' ) );
		check( 'render', 'required inputs have required + aria-required, with a visible mark hidden from screen readers', ( await page.getAttribute( '#rf-frmbasic-name', 'aria-required' ) ) === 'true' && ( await page.locator( `${ W } label[for="rf-frmbasic-name"] .refraction-form__required[aria-hidden="true"]` ).count() ) === 1 );
		check( 'render', 'radio and checkbox groups are fieldsets with legends', ( await page.locator( `${ W } fieldset.refraction-form__group legend` ).count() ) === 2 );
		check( 'render', 'acceptance label keeps its link', ( await page.locator( `${ W } .refraction-form__field--acceptance a[href="/terms/"]` ).count() ) === 1 );
		check( 'render', 'honeypots are present but hidden from assistive tech', ( await page.locator( `${ W } .refraction-form__hp[aria-hidden="true"] input[name="rf_hp_main"]` ).count() ) === 1 && ( await page.locator( `${ W } .refraction-form__hp input[name="rf_hp_trap"][tabindex="-1"]` ).count() ) === 1 );
		check( 'render', 'columns: email and phone are 50% wide each (side by side)', await page.evaluate( () => { const a = document.querySelector( '[data-rf-field=email]' ).getBoundingClientRect(); const b = document.querySelector( '[data-rf-field=phone]' ).getBoundingClientRect(); return Math.abs( a.top - b.top ) < 2 && a.right <= b.left + 1; } ) );
		check( 'render', 'form posts to the ajax endpoint and has a nonce', ( await page.getAttribute( `${ W } form`, 'data-rf-ajax' ) ).includes( 'admin-ajax.php?action=refraction_form_submit' ) && ( await page.inputValue( `${ W } input[name=rf_nonce]` ) ).length > 5 );
		check( 'render', 'no captcha script loads when no provider is set', ! ( await page.content() ).includes( 'recaptcha' ) );
		await page.screenshot( { path: join( SHOTS, 'form-basic.png' ), fullPage: true } );

		// ------------------------------------------------------------------ failing submit in the browser
		await page.click( `${ W } .refraction-form__submit` );
		await page.waitForSelector( `${ W } .has-error` );
		check( 'invalid', 'empty required fields show an error text next to the field', ( await page.locator( `${ W } [data-rf-error-for="name"]` ).innerText() ).length > 0 && ( await page.locator( `${ W } [data-rf-error-for="msg"]` ).innerText() ).length > 0 );
		check( 'invalid', 'invalid fields are marked aria-invalid and linked with aria-describedby', ( await page.getAttribute( '#rf-frmbasic-name', 'aria-invalid' ) ) === 'true' && ( await page.getAttribute( '#rf-frmbasic-name', 'aria-describedby' ) ) === 'rf-frmbasic-name-error' );
		check( 'invalid', 'focus moves to the first invalid field', await page.evaluate( () => document.activeElement && document.activeElement.id === 'rf-frmbasic-name' ) );
		check( 'invalid', 'a summary message is announced in the live region', ( await page.locator( `${ W } [data-rf-messages] [role=alert]` ).innerText() ).length > 3 );
		check( 'invalid', 'nothing was stored', seed( 'count' ) === 0 );

		// Server-side validation, bypassing the browser checks.
		let r = await postForm( page, 'frmbasic', { ...VALID_BASIC, 'form_fields[email]': 'nope', 'form_fields[age]': '17', 'form_fields[color]': 'zzz', 'form_fields[terms]': null, 'form_fields[site]': 'javascript:alert(1)' } );
		check( 'invalid', 'server answers 422 with an error per bad field', r.status === 422 && r.json && r.json.success === false && [ 'email', 'age', 'color', 'terms', 'site' ].every( ( k ) => r.json.errors[ k ] ), JSON.stringify( r ) );
		r = await postForm( page, 'frmbasic', { ...VALID_BASIC, rf_nonce: 'bogus' } );
		check( 'invalid', 'a wrong nonce is refused with 403', r.status === 403 && r.json.success === false, JSON.stringify( r ) );
		r = await postForm( page, 'frmbasic', { ...VALID_BASIC, rf_form_id: 'doesnotexist' } );
		check( 'invalid', 'an unknown form id is refused (404), never trusting the browser for structure', r.status === 404, JSON.stringify( r ) );
		r = await postForm( page, 'frmbasic', { ...VALID_BASIC, rf_form_post: '999999' } );
		check( 'invalid', 'an unknown document is refused', r.status === 404, JSON.stringify( r ) );
		check( 'invalid', 'still nothing stored', seed( 'count' ) === 0 );

		// ------------------------------------------------------------------ successful submit; webhook private network refused first
		await page.fill( '#rf-frmbasic-name', 'Jane <b>Doe</b>' );
		await page.fill( '#rf-frmbasic-email', 'jane@example.org' );
		await page.fill( '#rf-frmbasic-phone', '+1 555 123' );
		await page.fill( '#rf-frmbasic-msg', 'Hello\nthere' );
		await page.fill( '#rf-frmbasic-site', 'https://example.org' );
		await page.fill( '#rf-frmbasic-age', '30' );
		await page.selectOption( '#rf-frmbasic-color', 'b' );
		await page.check( `${ W } input[name="form_fields[size]"][value=M]` );
		await page.check( `${ W } input[name="form_fields[extras][]"][value=A]` );
		await page.check( `${ W } input[name="form_fields[extras][]"][value=C]` );
		await page.fill( '#rf-frmbasic-when', '2026-02-28' );
		await page.fill( '#rf-frmbasic-at', '13:45' );
		await page.fill( '#rf-frmbasic-pw', 'sup3rsecret' );
		await page.check( '#rf-frmbasic-terms' );
		await Promise.all( [ page.waitForResponse( ( x ) => x.url().includes( 'refraction_form_submit' ) ), page.click( `${ W } .refraction-form__submit` ) ] );
		await page.waitForSelector( `${ W } .refraction-form__message--success` );
		check( 'submit', 'the success message is shown in the live region and takes focus', ( await page.locator( `${ W } [data-rf-messages]` ).innerText() ).includes( 'Thanks, sent OK.' ) && await page.evaluate( () => document.activeElement && document.activeElement.hasAttribute( 'data-rf-messages' ) ) );
		check( 'submit', 'the form is reset afterwards', ( await page.inputValue( '#rf-frmbasic-name' ) ) === '' );
		check( 'submit', 'one submission was stored', seed( 'count' ) === 1 );
		check( 'webhook', 'a webhook to a private/localhost address is refused by default', received.length === 0, JSON.stringify( received ) );

		let list = await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` ).then( () => admin.page );
		const firstId = Number( ( await list.locator( '.rf-admin__table tbody tr a' ).first().innerText() ).replace( '#', '' ) );
		await list.click( '.rf-admin__table tbody tr a' );
		await list.waitForSelector( '.rf-admin__values' );
		const values = await list.locator( '.rf-admin__values' ).innerText();
		check( 'admin', 'single view shows every value, with tags stripped', values.includes( 'Jane Doe' ) && values.includes( 'jane@example.org' ) && values.includes( 'Hello' ) && values.includes( 'A, C' ) && values.includes( 'landing' ), values );
		check( 'admin', 'the password is never stored or shown', ! values.includes( 'sup3rsecret' ) && ! values.includes( 'Password' ) );
		const logText = await list.locator( '.rf-admin__log' ).innerText();
		check( 'admin', 'action log shows collect and both emails as success', /collect\s+success/.test( logText ) && /email\s+success/.test( logText ) && /email2\s+success/.test( logText ), logText );
		check( 'webhook', 'the refused webhook is logged as failed in the action log', /webhook\s+failed/.test( logText ), logText );
		check( 'privacy', 'IP address and browser are not stored by default', ! ( await list.content() ).includes( 'IP address' ) && ! ( await list.content() ).includes( 'Browser' ) );
		await list.screenshot( { path: join( SHOTS, 'admin-single.png' ), fullPage: true } );

		// ------------------------------------------------------------------ email composed correctly
		let mails = seed( 'mail' );
		const m1 = mails.find( ( m ) => String( m.subject ).startsWith( 'Mail from' ) );
		const m2 = mails.find( ( m ) => String( m.subject ).startsWith( 'Thanks' ) );
		check( 'mail', 'two emails were composed (owner mail and auto-responder)', mails.length === 2 && m1 && m2, JSON.stringify( mails ).slice( 0, 400 ) );
		check( 'mail', 'recipients are the two configured addresses', JSON.stringify( m1.to ) === JSON.stringify( [ 'owner@example.com', 'boss@example.com' ] ), JSON.stringify( m1.to ) );
		check( 'mail', 'subject uses the [field] tag', m1.subject === 'Mail from Jane Doe', m1.subject );
		const headers = [].concat( m1.headers );
		check( 'mail', 'From, Reply-To, Bcc and plain content type headers', headers.includes( 'From: My Site <site@example.com>' ) && headers.includes( 'Reply-To: jane@example.org' ) && headers.includes( 'Bcc: log@example.com' ) && headers.includes( 'Content-Type: text/plain; charset=UTF-8' ), headers.join( ' | ' ) );
		check( 'mail', 'body has the greeting and [all-fields] with labels, but no password', m1.message.startsWith( 'Hello Jane Doe' ) && m1.message.includes( 'Your name: Jane Doe' ) && m1.message.includes( 'Message: Hello\nthere' ) && ! m1.message.includes( 'sup3rsecret' ), m1.message );
		check( 'mail', 'auto-responder goes to the address the visitor typed, as HTML', JSON.stringify( m2.to ) === JSON.stringify( [ 'jane@example.org' ] ) && [].concat( m2.headers ).includes( 'Content-Type: text/html; charset=UTF-8' ) && m2.message.includes( 'We got it: Hello' ), JSON.stringify( m2 ).slice( 0, 300 ) );

		// ------------------------------------------------------------------ webhooks (after allowing the private network)
		seed( 'set', { FM_SETTINGS: JSON.stringify( { allow_private_webhooks: true } ) } );
		await page.reload();
		r = await postForm( page, 'frmbasic', { ...VALID_BASIC, 'form_fields[name]': 'Hook Person' } );
		check( 'webhook', 'submit still succeeds when one webhook fails', r.status === 200 && r.json.success === true, JSON.stringify( r ) );
		const generic = received.find( ( x ) => x.url === '/hook' );
		const gj = generic ? JSON.parse( generic.body ) : {};
		check( 'webhook', 'generic webhook delivered as JSON POST to the local receiver', generic && generic.method === 'POST' && /application\/json/.test( generic.type ) && gj.fields && gj.fields.name === 'Hook Person' && gj.form && gj.form.name === 'Form frmbasic' && gj.submission_id > 0, JSON.stringify( received ).slice( 0, 400 ) );
		check( 'webhook', 'webhook payload never contains the password', generic && ! generic.body.includes( 'sup3rsecret' ) && ! ( 'pw' in gj.fields ) );
		const disc = received.find( ( x ) => x.url.includes( 'kind=discord' ) );
		const slack = received.find( ( x ) => x.url.includes( 'kind=slack' ) );
		check( 'webhook', 'Discord preset posts {content}', disc && JSON.parse( disc.body ).content === 'Discord: Hook Person', JSON.stringify( disc ) );
		check( 'webhook', 'Slack preset posts {text}', slack && JSON.parse( slack.body ).text === 'Slack: Hook Person', JSON.stringify( slack ) );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` );
		await admin.page.click( '.rf-admin__table tbody tr:first-child a' );
		const log2 = await admin.page.locator( '.rf-admin__log' ).innerText();
		check( 'webhook', 'delivered webhooks are logged as success, the dead one as failed', ( log2.match( /webhook\s+success/g ) || [] ).length === 1 && ( log2.match( /webhook\s+failed/g ) || [] ).length === 1 && /discord\s+success/.test( log2 ) && /slack\s+success/.test( log2 ), log2 );

		// ------------------------------------------------------------------ no JavaScript
		const nojs = await newVisitor( { javaScriptEnabled: false } );
		await nojs.page.goto( url( 'form-basic' ) );
		await nojs.page.fill( '#rf-frmbasic-name', 'NoJS Nora' );
		await nojs.page.fill( '#rf-frmbasic-email', 'nora@example.org' );
		await nojs.page.fill( '#rf-frmbasic-phone', 'abc' );
		await nojs.page.fill( '#rf-frmbasic-msg', 'plain post' );
		await nojs.page.fill( '#rf-frmbasic-pw', 'topsecret' );
		await nojs.page.check( '#rf-frmbasic-terms' );
		await Promise.all( [ nojs.page.waitForLoadState( 'load' ), nojs.page.click( `${ W } .refraction-form__submit` ) ] );
		check( 'nojs', 'without JavaScript a server error shows the field error and the message', ( await nojs.page.locator( `${ W } [data-rf-error-for="phone"]` ).innerText() ).length > 0 && ( await nojs.page.locator( `${ W } .refraction-form__message--error` ).count() ) === 1 );
		check( 'nojs', 'the typed values stay in place (password does not)', ( await nojs.page.inputValue( '#rf-frmbasic-name' ) ) === 'NoJS Nora' && ( await nojs.page.inputValue( '#rf-frmbasic-pw' ) ) === '' );
		await nojs.page.fill( '#rf-frmbasic-phone', '555 0100' );
		await nojs.page.fill( '#rf-frmbasic-pw', 'topsecret' );
		await Promise.all( [ nojs.page.waitForURL( /rf_sent=frmbasic/ ), nojs.page.click( `${ W } .refraction-form__submit` ) ] );
		check( 'nojs', 'a good post redirects (post/redirect/get) and shows the success message', ( await nojs.page.locator( `${ W } .refraction-form__message--success` ).innerText() ) === 'Thanks, sent OK.' );
		const before = seed( 'count' );
		await nojs.page.reload();
		check( 'nojs', 'reloading the success page does not submit again', seed( 'count' ) === before );
		check( 'nojs', 'multi-step form without JavaScript shows all steps and the submit button', await ( async () => { await nojs.page.goto( url( 'form-steps' ) ); return ( await nojs.page.locator( '[data-rf-step]:visible' ).count() ) === 3 && await nojs.page.locator( '.refraction-form__submit' ).isVisible() && ! ( await nojs.page.locator( '[data-rf-next]' ).isVisible() ); } )() );
		await nojs.ctx.close();

		// ------------------------------------------------------------------ honeypot
		const countBefore = seed( 'count' );
		await page.goto( url( 'form-basic' ) );
		r = await postForm( page, 'frmbasic', { ...VALID_BASIC, rf_hp_main: 'http://spam.example' } );
		check( 'honeypot', 'a filled honeypot gets a quiet success but nothing is stored or sent', r.status === 200 && r.json.success === true && seed( 'count' ) === countBefore, JSON.stringify( r ) );
		const mailsBefore = seed( 'mail' ).length;
		r = await postForm( page, 'frmbasic', { ...VALID_BASIC, rf_hp_trap: 'x' } );
		check( 'honeypot', 'the honeypot field type works the same way', r.status === 200 && seed( 'count' ) === countBefore && seed( 'mail' ).length === mailsBefore, JSON.stringify( r ) );

		// ------------------------------------------------------------------ minimum time, math question, rate limit
		seed( 'reset' );
		await page.goto( url( 'form-spam' ) );
		const S = '#refraction-form-frmspam';
		const question = await page.locator( `${ S } .refraction-form__field--math label` ).innerText();
		const mm = question.match( /(\d+) \+ (\d+)/ );
		const answer = String( Number( mm[ 1 ] ) + Number( mm[ 2 ] ) );
		check( 'spam', 'the math question is rendered', !! mm, question );
		r = await postForm( page, 'frmspam', { 'form_fields[name]': 'Fast Bot', rf_math: answer } );
		check( 'spam', 'a form sent faster than the minimum time is refused', r.status === 422 && /quick/i.test( r.json.message ), JSON.stringify( r ) );
		await sleep( 2300 );
		r = await postForm( page, 'frmspam', { 'form_fields[name]': 'Slow Human', rf_math: String( Number( answer ) + 1 ) } );
		check( 'spam', 'a wrong math answer is refused with a field error', r.status === 422 && r.json.errors.rf_math, JSON.stringify( r ) );
		r = await postForm( page, 'frmspam', { 'form_fields[name]': 'Slow Human', rf_math: answer, rf_ts: '1.' + 'a'.repeat( 32 ) } );
		check( 'spam', 'a forged time token is refused', r.status === 422, JSON.stringify( r ) );
		check( 'spam', 'refused attempts stored nothing', seed( 'count' ) === 0 );
		// 3 attempts used. Next is over the limit even though it would be valid.
		r = await postForm( page, 'frmspam', { 'form_fields[name]': 'Slow Human', rf_math: answer } );
		check( 'rate-limit', 'the 4th attempt within the window is blocked with 429', r.status === 429, JSON.stringify( r ) );
		seed( 'reset' );
		await page.goto( url( 'form-spam' ) );
		await sleep( 2300 );
		const q2 = ( await page.locator( `${ S } .refraction-form__field--math label` ).innerText() ).match( /(\d+) \+ (\d+)/ );
		r = await postForm( page, 'frmspam', { 'form_fields[name]': 'Slow Human', rf_math: String( Number( q2[ 1 ] ) + Number( q2[ 2 ] ) ) } );
		check( 'spam', 'a slow visitor with the right answer succeeds', r.status === 200 && r.json.success && seed( 'count' ) === 1, JSON.stringify( r ) );
		// UI path for the math field
		await page.goto( url( 'form-spam' ) );
		await sleep( 2300 );
		await page.fill( '#rf-frmspam-name', 'UI Human' );
		await page.fill( '#rf-frmspam-math', '999' );
		await page.click( `${ S } .refraction-form__submit` );
		await page.waitForSelector( `${ S } [data-rf-error-for="rf_math"]:not(:empty)` );
		check( 'spam', 'the browser shows the math error next to the math field', true );

		seed( 'reset' );
		await page.goto( url( 'form-rate' ) );
		const codes = [];
		for ( let i = 0; i < 5; i++ ) { codes.push( ( await postForm( page, 'frmrate', { 'form_fields[name]': `Visitor ${ i }` } ) ).status ); }
		check( 'rate-limit', 'per-IP limit of 3: three go through, the rest get 429', codes.join() === '200,200,200,429,429' && seed( 'count' ) === 3, codes.join() );

		// ------------------------------------------------------------------ multi-step
		await page.goto( url( 'form-steps' ) );
		const T = '#refraction-form-frmsteps';
		const visibleSteps = async () => page.$$eval( `${ T } [data-rf-step]`, ( s ) => s.map( ( x ) => ! x.hidden ) );
		check( 'steps', 'only the first step is visible, with a 3 item progress indicator', ( await visibleSteps() ).join() === 'true,false,false' && ( await page.locator( `${ T } .refraction-form__progress-item` ).count() ) === 3 );
		check( 'steps', 'progress marks step 1 as current (aria-current) and shows titles', ( await page.getAttribute( `${ T } .refraction-form__progress-item.is-current`, 'aria-current' ) ) === 'step' && ( await page.locator( `${ T } .refraction-form__progress-item` ).first().innerText() ).includes( 'Who are you' ) );
		check( 'steps', 'Previous and Submit are hidden on the first step, Next is shown', await page.locator( `${ T } [data-rf-next]` ).isVisible() && ! ( await page.locator( `${ T } [data-rf-prev]` ).isVisible() ) && ! ( await page.locator( `${ T } .refraction-form__submit` ).isVisible() ) );
		await page.click( `${ T } [data-rf-next]` );
		check( 'steps', 'Next with empty required fields stays on the step and shows errors', ( await visibleSteps() ).join() === 'true,false,false' && ( await page.locator( `${ T } [data-rf-error-for="name"]` ).innerText() ).length > 0 );
		await page.fill( '#rf-frmsteps-name', 'Step Sam' );
		await page.fill( '#rf-frmsteps-email', 'sam@example.org' );
		await page.click( `${ T } [data-rf-next]` );
		check( 'steps', 'a valid step moves on; focus goes to the first field of the new step', ( await visibleSteps() ).join() === 'false,true,false' && await page.evaluate( () => document.activeElement && document.activeElement.id === 'rf-frmsteps-topic' ) );
		check( 'steps', 'progress updates (step 1 done, step 2 current)', await page.evaluate( () => { const i = document.querySelectorAll( '#refraction-form-frmsteps .refraction-form__progress-item' ); return i[ 0 ].classList.contains( 'is-done' ) && i[ 1 ].getAttribute( 'aria-current' ) === 'step' && ! i[ 0 ].hasAttribute( 'aria-current' ); } ) );
		await page.click( `${ T } [data-rf-prev]` );
		check( 'steps', 'Previous goes back and keeps the typed values', ( await visibleSteps() ).join() === 'true,false,false' && ( await page.inputValue( '#rf-frmsteps-name' ) ) === 'Step Sam' );
		await page.click( `${ T } [data-rf-next]` );
		await page.click( `${ T } [data-rf-next]` );
		check( 'steps', 'Next on step 2 without a topic is blocked', ( await visibleSteps() ).join() === 'false,true,false' );
		await page.selectOption( '#rf-frmsteps-topic', 'Support' );
		await page.click( `${ T } [data-rf-next]` );
		check( 'steps', 'last step shows Submit and hides Next', ( await visibleSteps() ).join() === 'false,false,true' && await page.locator( `${ T } .refraction-form__submit` ).isVisible() && ! ( await page.locator( `${ T } [data-rf-next]` ).isVisible() ) );
		await page.screenshot( { path: join( SHOTS, 'form-steps-3.png' ) } );
		await page.fill( '#rf-frmsteps-msg', 'multi step message' );
		const cStep = seed( 'count' );
		await Promise.all( [ page.waitForResponse( ( x ) => x.url().includes( 'refraction_form_submit' ) ), page.click( `${ T } .refraction-form__submit` ) ] );
		await page.waitForSelector( `${ T } .refraction-form__message--success` );
		check( 'steps', 'submitting the last step stores one submission with all three steps of data', seed( 'count' ) === cStep + 1 );
		check( 'steps', 'after success the form returns to step 1', ( await visibleSteps() ).join() === 'true,false,false' );
		await page.goto( url( 'form-bar' ) );
		check( 'steps', 'progress bar variant exposes role=progressbar and updates', ( await page.getAttribute( '[role=progressbar]', 'aria-valuenow' ) ) === '1' && await ( async () => { await page.fill( '#rf-frmbar-name', 'Bar' ); await page.fill( '#rf-frmbar-email', 'bar@example.org' ); await page.click( '[data-rf-next]' ); return ( await page.getAttribute( '[role=progressbar]', 'aria-valuenow' ) ) === '2' && ( await page.locator( '[data-rf-bar-text]' ).innerText() ).includes( 'Step 2 of 3' ); } )() );

		// ------------------------------------------------------------------ file uploads
		seed( 'reset' );
		await page.goto( url( 'form-upload' ) );
		const U = '#refraction-form-frmupload';
		const fileInput = `${ U } input[type=file]`;
		check( 'upload', 'accept attribute lists the allowed types without php', ( await page.getAttribute( fileInput, 'accept' ) ) === '.pdf,.png' );
		const tmp = join( SITE, 'upload-fixtures' );
		mkdirSync( tmp, { recursive: true } );
		writeFileSync( join( tmp, 'shell.php' ), '<?php echo 1;' );
		writeFileSync( join( tmp, 'evil.php.png' ), '<?php echo 1;' );
		writeFileSync( join( tmp, 'sneaky.png' ), 'GIF89a<?php system($_GET[0]); ?>' );
		writeFileSync( join( tmp, 'big.pdf' ), Buffer.concat( [ Buffer.from( '%PDF-1.4\n' ), Buffer.alloc( 200000, 65 ) ] ) );
		writeFileSync( join( tmp, 'ok.pdf' ), '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n' );
		const upload = async ( file ) => {
			await page.goto( url( 'form-upload' ) );
			return page.evaluate( async ( { name, content, type } ) => {
				const form = document.querySelector( '#refraction-form-frmupload form' );
				const fd = new FormData( form );
				fd.set( 'form_fields[cv]', new File( [ content ], name, { type } ) );
				const res = await fetch( form.dataset.rfAjax, { method: 'POST', body: fd, credentials: 'same-origin' } );
				return { status: res.status, json: await res.json() };
			}, { name: file.name, content: file.content, type: file.type || 'application/octet-stream' } );
		};
		const rd = ( n ) => readFileSync( join( tmp, n ), 'latin1' );
		r = await upload( { name: 'shell.php', content: rd( 'shell.php' ) } );
		check( 'upload', 'a .php file is refused even though the owner listed php', r.status === 422 && r.json.errors.cv, JSON.stringify( r ) );
		r = await upload( { name: 'evil.php.png', content: rd( 'evil.php.png' ), type: 'image/png' } );
		check( 'upload', 'a double extension (evil.php.png) is refused', r.status === 422 && r.json.errors.cv, JSON.stringify( r ) );
		r = await upload( { name: 'sneaky.png', content: rd( 'sneaky.png' ), type: 'image/png' } );
		check( 'upload', 'a PNG that contains PHP code is refused', r.status === 422 && r.json.errors.cv, JSON.stringify( r ) );
		r = await upload( { name: 'big.pdf', content: rd( 'big.pdf' ), type: 'application/pdf' } );
		check( 'upload', 'a file over the size limit is refused', r.status === 422 && /large/i.test( r.json.errors.cv ), JSON.stringify( r ) );
		r = await upload( { name: 'readme.txt', content: 'hello' } );
		check( 'upload', 'a type that is not listed is refused', r.status === 422 && r.json.errors.cv, JSON.stringify( r ) );
		await page.goto( url( 'form-upload' ) );
		r = await postForm( page, 'frmupload', { 'form_fields[name]': 'no file' } );
		check( 'upload', 'a missing required file is an error', r.status === 422 && r.json.errors.cv, JSON.stringify( r ) );
		check( 'upload', 'nothing was stored by the refused uploads', seed( 'count' ) === 0 );
		await page.goto( url( 'form-upload' ) );
		await page.fill( '#rf-frmupload-name', 'Uploader' );
		await page.setInputFiles( fileInput, join( tmp, 'ok.pdf' ) );
		await Promise.all( [ page.waitForResponse( ( x ) => x.url().includes( 'refraction_form_submit' ) ), page.click( `${ U } .refraction-form__submit` ) ] );
		await page.waitForSelector( `${ U } .refraction-form__message--success` );
		check( 'upload', 'a valid PDF is accepted through the browser', seed( 'count' ) === 1 );
		const root = join( WPDIR, 'wp-content/uploads/refraction-forms' );
		const stored = [];
		const walk = ( d ) => { for ( const e of readdirSync( d, { withFileTypes: true } ) ) { e.isDirectory() ? walk( join( d, e.name ) ) : stored.push( join( d, e.name ) ); } };
		walk( root );
		const pdf = stored.find( ( f ) => f.endsWith( 'ok.pdf' ) );
		check( 'upload', 'the file is stored in the protected folder with a random prefix', !! pdf && /[0-9a-f]{32}-ok\.pdf$/.test( pdf ) && ! stored.some( ( f ) => /php|shell|evil|sneaky|big/.test( f.split( '/' ).pop() ) ), stored.join() );
		check( 'upload', 'the folder carries .htaccess (deny), index.php and web.config', [ '.htaccess', 'index.php', 'web.config' ].every( ( f ) => existsSync( join( root, f ) ) ) && readFileSync( join( root, '.htaccess' ), 'utf8' ).includes( 'Require all denied' ) );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` );
		await admin.page.click( '.rf-admin__table tbody tr:first-child a' );
		const dl = await admin.page.locator( '.rf-admin__values a[href*=refraction_forms_download]' ).getAttribute( 'href' );
		const got = await admin.ctx.request.get( dl );
		check( 'upload', 'an administrator downloads the file through the nonce-protected endpoint as an attachment', got.status() === 200 && /attachment/.test( got.headers()[ 'content-disposition' ] || '' ) && got.headers()[ 'x-content-type-options' ] === 'nosniff' && ( await got.text() ).startsWith( '%PDF' ) );
		const anon = await fetch( dl, { redirect: 'manual' } );
		check( 'upload', 'a visitor cannot use the download link', ! ( await anon.text() ).startsWith( '%PDF' ) );
		const ed = await editor.ctx.request.get( dl );
		check( 'upload', 'an editor (no manage_options) cannot download', ed.status() === 403 );
		const noNonce = await admin.ctx.request.get( dl.replace( /_wpnonce=[^&]+/, '_wpnonce=bad' ) );
		check( 'upload', 'a bad nonce cannot download', noNonce.status() === 403 );

		// ------------------------------------------------------------------ redirect action
		seed( 'reset' );
		await page.goto( url( 'form-redirect' ) );
		await page.fill( '#rf-frmredirect-name', 'Re Direct' );
		await Promise.all( [ page.waitForURL( /redirected=1/ ), page.click( '#refraction-form-frmredirect .refraction-form__submit' ) ] );
		check( 'redirect', 'the Redirect action sends the visitor on, with the field value URL-encoded', new URL( page.url() ).searchParams.get( 'who' ) === 'Re Direct' && page.url().includes( 'who=Re+Direct' ), page.url() );
		check( 'redirect', 'the submission was stored before redirecting', seed( 'count' ) === 1 );

		// ------------------------------------------------------------------ header / recipient injection
		seed( 'reset' );
		await page.goto( url( 'form-inject' ) );
		r = await postForm( page, 'frminject', { 'form_fields[name]': 'Mallory\r\nBcc: evil@example.com', 'form_fields[email]': 'a@example.com\r\nBcc: evil@example.com' } );
		check( 'injection', 'an email field with a CRLF header injection is refused', r.status === 422 && r.json.errors.email, JSON.stringify( r ) );
		r = await postForm( page, 'frminject', { 'form_fields[name]': 'Mallory\r\nBcc: evil@example.com', 'form_fields[email]': 'a@example.com,evil@example.com' } );
		check( 'injection', 'an email field with two addresses is refused', r.status === 422 && r.json.errors.email, JSON.stringify( r ) );
		r = await postForm( page, 'frminject', { 'form_fields[name]': 'Mallory\r\nBcc: evil@example.com', 'form_fields[email]': 'good@example.com' } );
		const im = seed( 'mail' );
		const first = im.find( ( m ) => String( m.subject ).startsWith( 'Mail from' ) );
		const flat = JSON.stringify( im.map( ( m ) => [ m.to, m.headers ] ) );
		check( 'injection', 'a CRLF in the name cannot add a header or recipient or break the subject', r.status === 200 && first && ! /[\r\n]/.test( first.subject ) && ! flat.includes( 'evil@example.com' ), flat + ' ' + JSON.stringify( first ) );

		// ------------------------------------------------------------------ CSV export, list, filters, bulk, privacy
		seed( 'reset' );
		await page.goto( url( 'form-basic' ) );
		await postForm( page, 'frmbasic', { ...VALID_BASIC, 'form_fields[name]': '=HYPERLINK("http://evil.example","click")', 'form_fields[email]': 'csv1@example.org' } );
		await postForm( page, 'frmbasic', { ...VALID_BASIC, 'form_fields[name]': '+cmd|calc', 'form_fields[email]': 'csv2@example.org' } );
		await postForm( page, 'frmbasic', { ...VALID_BASIC, 'form_fields[name]': 'Findable Fran', 'form_fields[email]': 'fran@example.org' } );
		await page.goto( url( 'form-redirect' ) );
		await postForm( page, 'frmredirect', { 'form_fields[name]': 'Other Form Person' } );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` );
		check( 'list', 'the list shows four submissions, all unread', ( await admin.page.locator( '.rf-admin__table tbody tr.rf-admin__unread' ).count() ) === 4 );
		check( 'list', 'status views carry counts', ( await admin.page.locator( '.subsubsub' ).innerText() ).replace( /\s+/g, ' ' ).includes( 'Unread (4)' ) );
		await admin.page.screenshot( { path: join( SHOTS, 'admin-list.png' ), fullPage: true } );
		const exportHref = await admin.page.locator( 'a:has-text("Export CSV")' ).getAttribute( 'href' );
		const csvRes = await admin.ctx.request.get( exportHref );
		const csv = await csvRes.text();
		check( 'csv', 'export is a CSV attachment', csvRes.status() === 200 && /text\/csv/.test( csvRes.headers()[ 'content-type' ] ) && /attachment/.test( csvRes.headers()[ 'content-disposition' ] ) );
		check( 'csv', 'a cell that starts with = is prefixed so spreadsheets do not run it', csv.includes( `"'=HYPERLINK(""http://evil.example"",""click"")"` ) && ! /(^|,|\n)"?=HYPERLINK/.test( csv ), csv.slice( 0, 600 ) );
		check( 'csv', 'a cell that starts with + is prefixed too', csv.includes( `"'+cmd|calc"` ) );
		check( 'csv', 'the export has a header row with field labels and no password column', csv.split( '\n' )[ 0 ].includes( 'Your name' ) && ! csv.includes( 'sup3rsecret' ) && ! csv.split( '\n' )[ 0 ].includes( 'Password' ) );
		check( 'csv', 'a missing/invalid nonce is refused', ( await admin.ctx.request.get( exportHref.replace( /_wpnonce=[^&]+/, '_wpnonce=bad' ) ) ).status() === 403 );
		check( 'csv', 'an editor cannot export', ( await editor.ctx.request.get( exportHref ) ).status() === 403 );
		check( 'csv', 'a visitor cannot export', ! ( await (await fetch( exportHref )).text() ).includes( 'HYPERLINK' ) );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions&s=Findable` );
		check( 'list', 'search finds a submission by value', ( await admin.page.locator( '.rf-admin__table tbody tr' ).count() ) === 1 && ( await admin.page.locator( '.rf-admin__table' ).innerText() ).includes( 'Findable Fran' ) );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions&s=%27%20OR%201%3D1%20--` );
		check( 'list', 'SQL in the search box finds nothing (prepared queries)', ( await admin.page.locator( '.rf-admin__table' ).innerText() ).includes( 'No submissions found' ) );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` );
		const formOptions = await admin.page.$$eval( '#rf-form-filter option', ( o ) => o.map( ( x ) => x.value ).filter( Boolean ) );
		check( 'list', 'the form filter lists both forms', formOptions.length === 2, formOptions.join() );
		const redirectKey = formOptions.find( ( k ) => k.endsWith( 'frmredirect' ) );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions&form_key=${ redirectKey }` );
		check( 'list', 'filtering by form shows only that form', ( await admin.page.locator( '.rf-admin__table tbody tr' ).count() ) === 1 );
		const today = new Date().toISOString().slice( 0, 10 );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions&date_from=${ today }&date_to=${ today }` );
		check( 'list', 'date filter keeps today', ( await admin.page.locator( '.rf-admin__table tbody tr' ).count() ) === 4 );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions&date_from=2001-01-01&date_to=2001-01-02` );
		check( 'list', 'date filter excludes other days', ( await admin.page.locator( '.rf-admin__table' ).innerText() ).includes( 'No submissions found' ) );

		// Bulk actions.
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` );
		await admin.page.locator( '.rf-admin__table tbody input[type=checkbox]' ).nth( 0 ).check();
		await admin.page.locator( '.rf-admin__table tbody input[type=checkbox]' ).nth( 1 ).check();
		await admin.page.selectOption( '#rf-bulk', 'read' );
		await Promise.all( [ admin.page.waitForURL( /notice=bulk/ ), admin.page.click( 'button.action' ) ] );
		check( 'bulk', 'mark as read changes two rows', ( await admin.page.locator( '.rf-admin__table tbody tr.rf-admin__unread' ).count() ) === 2 && ( await admin.page.locator( '.notice-success' ).innerText() ).includes( '2' ) );
		await admin.page.locator( '.rf-admin__table tbody input[type=checkbox]' ).nth( 0 ).check();
		await admin.page.selectOption( '#rf-bulk', 'trash' );
		await Promise.all( [ admin.page.waitForURL( /notice=bulk/ ), admin.page.click( 'button.action' ) ] );
		check( 'bulk', 'trash moves a row out of All into Trash (1)', ( await admin.page.locator( '.rf-admin__table tbody tr' ).count() ) === 3 && ( await admin.page.locator( '.subsubsub' ).innerText() ).replace( /\s+/g, ' ' ).includes( 'Trash (1)' ) );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions&status=trash` );
		await admin.page.locator( '.rf-admin__table tbody input[type=checkbox]' ).nth( 0 ).check();
		await admin.page.selectOption( '#rf-bulk', 'delete' );
		await Promise.all( [ admin.page.waitForURL( /notice=bulk/ ), admin.page.click( 'button.action' ) ] );
		check( 'bulk', 'delete permanently removes the row', seed( 'count' ) === 3 );
		// A bulk post without a nonce or from an editor is refused.
		const bulkNoNonce = await admin.ctx.request.post( `${ BASE }/wp-admin/admin-post.php`, { form: { action: 'refraction_forms_bulk', bulk_action: 'delete', 'ids[]': '1' } } );
		check( 'bulk', 'a bulk request without a nonce is refused', bulkNoNonce.status() === 403 && seed( 'count' ) === 3 );
		const bulkEditor = await editor.ctx.request.post( `${ BASE }/wp-admin/admin-post.php`, { form: { action: 'refraction_forms_bulk', bulk_action: 'delete', 'ids[]': '1', _wpnonce: 'x' } } );
		check( 'bulk', 'an editor cannot bulk delete', bulkEditor.status() === 403 && seed( 'count' ) === 3 );
		const editorPage = await editor.ctx.request.get( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` );
		check( 'bulk', 'the Submissions screen is not available to an editor', editorPage.status() === 403 || ! ( await editorPage.text() ).includes( 'rf-admin__table' ) );

		// Privacy toggles, retention, eraser.
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions&tab=settings` );
		check( 'privacy', 'settings screen: IP and user agent unchecked by default', ! ( await admin.page.locator( 'input[name="settings[store_ip]"]' ).isChecked() ) && ! ( await admin.page.locator( 'input[name="settings[store_user_agent]"]' ).isChecked() ) );
		await admin.page.check( 'input[name="settings[store_ip]"]' );
		await admin.page.check( 'input[name="settings[mask_emails]"]' );
		await admin.page.fill( '#rf-ret', '30' );
		await Promise.all( [ admin.page.waitForURL( /notice=saved/ ), admin.page.click( '#submit' ) ] );
		check( 'privacy', 'settings are saved', ( await admin.page.locator( '.notice-success' ).innerText() ).includes( 'saved' ) );
		await page.goto( url( 'form-basic' ) );
		await postForm( page, 'frmbasic', { ...VALID_BASIC, 'form_fields[name]': 'Tracked Tim', 'form_fields[email]': 'tim@example.org' } );
		await admin.page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-submissions` );
		check( 'privacy', 'email masking hides the address in the list', ( await admin.page.locator( '.rf-admin__table' ).innerText() ).includes( 't***@example.org' ) && ! ( await admin.page.locator( '.rf-admin__table' ).innerText() ).includes( 'tim@example.org' ) );
		await admin.page.click( '.rf-admin__table tbody tr:first-child a' );
		check( 'privacy', 'with the toggle on, the IP address is stored and shown', ( await admin.page.locator( '.rf-admin__single' ).innerText() ).includes( '127.0.0.1' ) );
		const oldId = Number( ( await admin.page.locator( 'h2:has-text("Submission #")' ).innerText() ).replace( /\D/g, '' ) ) - 1;
		seed( 'backdate', { FM_ID: String( oldId ), FM_DAYS: '45' } );
		const countBeforePurge = seed( 'count' );
		const purged = seed( 'purge' );
		check( 'retention', 'submissions older than the retention period are purged (45 days > 30)', purged === 1 && seed( 'count' ) === countBeforePurge - 1, `${ purged }` );
		check( 'retention', 'a daily clean-up is scheduled while retention is on', wp( [ 'cron', 'event', 'list', '--format=csv' ] ).includes( 'refraction_forms_purge' ) );
		const priv = seed( 'privacy', { FM_EMAIL: 'tim@example.org' } );
		check( 'privacy', 'WordPress exporter returns the submission for that email', priv.exported.data.length === 1 && priv.exported.data[ 0 ].data.some( ( d ) => d.value === 'Tracked Tim' ), JSON.stringify( priv.exported ).slice( 0, 300 ) );
		check( 'privacy', 'WordPress eraser removes it', priv.erased.items_removed === true && priv.after.data.length === 0, JSON.stringify( priv.erased ) );
		seed( 'set', { FM_SETTINGS: JSON.stringify( { store_ip: false, mask_emails: false, retention_days: 0 } ) } );

		// ------------------------------------------------------------------ captcha (optional, external): script only when enabled
		const htmlOf = async ( slug ) => (await fetch( url( slug ) )).text();
		seed( 'set', { FM_SETTINGS: JSON.stringify( { captcha_provider: 'recaptcha_v2', captcha_site_key: 'SITEKEY123', captcha_secret_key: 'SECRET' } ) } );
		const withCaptcha = await htmlOf( 'form-captcha' );
		check( 'captcha', 'the provider script and widget load only on a form with captcha switched on', withCaptcha.includes( 'www.google.com/recaptcha/api.js' ) && withCaptcha.includes( 'data-sitekey="SITEKEY123"' ) );
		check( 'captcha', 'forms without the switch load no external script', ! ( await htmlOf( 'form-basic' ) ).includes( 'recaptcha' ) && ! ( await htmlOf( 'form-rate' ) ).includes( 'recaptcha' ) );
		await page.route( '**/recaptcha/**', ( route ) => route.abort() );
		await page.goto( url( 'form-captcha' ) );
		await sleep( 2300 );
		const base = { 'form_fields[name]': 'Cap' };
		seed( 'reset' );
		seed( 'set', { FM_SETTINGS: JSON.stringify( { captcha_provider: 'recaptcha_v2', captcha_site_key: 'SITEKEY123', captcha_secret_key: 'SECRET' } ) } );
		await page.goto( url( 'form-captcha' ) );
		await sleep( 2300 );
		r = await postForm( page, 'frmcaptcha', { ...base, rf_math: 'x' } );
		check( 'captcha', 'a submission without a captcha response is refused', r.status === 422 && ( r.json.errors.rf_captcha || r.json.errors.rf_math ), JSON.stringify( r ) );
		const qc = ( await page.locator( '#refraction-form-frmcaptcha .refraction-form__field--math label' ).innerText() ).match( /(\d+) \+ (\d+)/ );
		const ans = String( Number( qc[ 1 ] ) + Number( qc[ 2 ] ) );
		r = await postForm( page, 'frmcaptcha', { ...base, rf_math: ans, 'g-recaptcha-response': 'bad' } );
		check( 'captcha', 'a response the provider rejects is refused (verified server-side against the fake)', r.status === 422 && r.json.errors.rf_captcha, JSON.stringify( r ) );
		r = await postForm( page, 'frmcaptcha', { ...base, rf_math: ans, 'g-recaptcha-response': 'good' } );
		check( 'captcha', 'a response the provider accepts goes through', r.status === 200 && r.json.success, JSON.stringify( r ) );
		seed( 'set', { FM_SETTINGS: JSON.stringify( { captcha_provider: 'none', captcha_site_key: '', captcha_secret_key: '' } ) } );
		check( 'captcha', 'switching the provider off removes the script again', ! ( await htmlOf( 'form-captcha' ) ).includes( 'recaptcha' ) );
		await page.unroute( '**/recaptcha/**' );

		// ------------------------------------------------------------------ Login widget
		const lv = await newVisitor();
		await lv.page.goto( url( 'login-page' ) );
		const L = '.refraction-login';
		check( 'login', 'renders username, password, remember me and lost password link; no register link while registration is closed', ( await lv.page.locator( 'input[name=rf_login_user][autocomplete=username]' ).count() ) === 1 && ( await lv.page.locator( 'input[name=rf_login_pass][autocomplete=current-password]' ).count() ) === 1 && ( await lv.page.locator( 'input[name=rf_login_remember]' ).count() ) === 1 && ( await lv.page.locator( `${ L } a[href*="action=lostpassword"]` ).count() ) === 1 && ( await lv.page.locator( `${ L } a[href*="action=register"]` ).count() ) === 0 );
		check( 'login', 'labels are associated with the inputs', ( await lv.page.locator( 'label[for="rf-login-lgnone-user"]' ).count() ) === 1 && ( await lv.page.locator( 'label[for="rf-login-lgnone-pass"]' ).count() ) === 1 );
		await lv.page.fill( 'input[name=rf_login_user]', 'admin' );
		await lv.page.fill( 'input[name=rf_login_pass]', 'wrong-password' );
		await Promise.all( [ lv.page.waitForLoadState( 'load' ), lv.page.click( `${ L } .refraction-form__submit` ) ] );
		const e1 = await lv.page.locator( '.refraction-form__message--error' ).innerText();
		await lv.page.fill( 'input[name=rf_login_user]', 'no-such-user' );
		await lv.page.fill( 'input[name=rf_login_pass]', 'wrong-password' );
		await Promise.all( [ lv.page.waitForLoadState( 'load' ), lv.page.click( `${ L } .refraction-form__submit` ) ] );
		const e2 = await lv.page.locator( '.refraction-form__message--error' ).innerText();
		check( 'login', 'a wrong password and an unknown user give the same generic error (no user enumeration)', e1 === 'Invalid username or password.' && e1 === e2, `${ e1 } / ${ e2 }` );
		const noNonceLogin = await fetch( url( 'login-page' ), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'rf_login_id=lgnone&rf_login_post=' + ids.login + '&rf_login_user=admin&rf_login_pass=admin', redirect: 'manual' } );
		check( 'login', 'a login post without the nonce does not log in', ! ( noNonceLogin.headers.get( 'set-cookie' ) || '' ).includes( 'wordpress_logged_in' ) );
		await lv.page.fill( 'input[name=rf_login_user]', 'admin' );
		await lv.page.fill( 'input[name=rf_login_pass]', 'admin' );
		await lv.page.check( 'input[name=rf_login_remember]' );
		await Promise.all( [ lv.page.waitForURL( /logged-in=1/ ), lv.page.click( `${ L } .refraction-form__submit` ) ] );
		const cookies = await lv.ctx.cookies();
		check( 'login', 'a good login signs in and redirects to the configured URL', cookies.some( ( c ) => c.name.startsWith( 'wordpress_logged_in' ) ) && new URL( lv.page.url() ).searchParams.get( 'logged-in' ) === '1', lv.page.url() );
		check( 'login', 'remember me sets a persistent cookie', cookies.some( ( c ) => c.name.startsWith( 'wordpress_logged_in' ) && c.expires > Date.now() / 1000 + 86400 ) );
		await lv.page.goto( url( 'login-page' ) );
		check( 'login', 'logged-in visitors see the logged-in state with a log out link instead of the form', ( await lv.page.locator( '.refraction-login__status' ).innerText() ).includes( 'You are logged in as' ) && ( await lv.page.locator( 'input[name=rf_login_pass]' ).count() ) === 0 && ( await lv.page.locator( '.refraction-login__status a[href*="action=logout"]' ).count() ) === 1 );
		await lv.page.goto( url( 'login-hidden' ) );
		check( 'login', 'with "show logged-in state" off, logged-in visitors see nothing', ( await lv.page.locator( '.refraction-login' ).count() ) === 0 );
		await lv.ctx.close();
		const lv2 = await newVisitor();
		await lv2.page.goto( url( 'login-hidden' ) );
		check( 'login', 'remember me and lost password can be switched off', ( await lv2.page.locator( 'input[name=rf_login_remember]' ).count() ) === 0 && ( await lv2.page.locator( '.refraction-login__links' ).count() ) === 0 );
		await lv2.page.goto( url( 'login-evil' ) );
		await lv2.page.fill( 'input[name=rf_login_user]', 'admin' );
		await lv2.page.fill( 'input[name=rf_login_pass]', 'admin' );
		await Promise.all( [ lv2.page.waitForLoadState( 'load' ), lv2.page.click( '.refraction-login .refraction-form__submit' ) ] );
		await sleep( 500 );
		check( 'login', 'an off-site redirect URL is not followed', lv2.page.url().startsWith( BASE ), lv2.page.url() );
		await lv2.ctx.close();
		wp( [ 'option', 'update', 'users_can_register', '1' ] );
		const lv3 = await newVisitor();
		await lv3.page.goto( url( 'login-page' ) );
		check( 'login', 'the register link appears when registration is open', ( await lv3.page.locator( '.refraction-login a[href*="action=register"]' ).count() ) === 1 );
		wp( [ 'option', 'update', 'users_can_register', '0' ] );
		const flood = await lv3.page.evaluate( async ( id ) => {
			const form = document.querySelector( 'form[data-rf-login]' );
			let last = '';
			for ( let i = 0; i < 14; i++ ) {
				const fd = new FormData( form );
				fd.set( 'rf_login_user', 'admin' );
				fd.set( 'rf_login_pass', 'nope' + i );
				const res = await fetch( location.href, { method: 'POST', body: new URLSearchParams( fd ), credentials: 'same-origin' } );
				last = await res.text();
			}
			return last.includes( 'Too many login attempts' );
		}, '' );
		check( 'login', 'repeated wrong passwords from one address are rate-limited', flood );
		await lv3.ctx.close();
		await v.ctx.close();

		// ------------------------------------------------------------------ the editor
		await admin.page.goto( `${ BASE }/wp-admin/post.php?post=${ ids.basic }&action=refraction` );
		await admin.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		await sleep( 3000 );
		const frame = admin.page.frameLocator( '#refraction-preview-iframe' );
		check( 'editor', 'the form widget renders in the preview', ( await frame.locator( '#refraction-form-frmbasic form' ).count() ) === 1 );
		check( 'editor', 'preview forms do not submit', await frame.locator( '#refraction-form-frmbasic form.refraction-form--preview' ).count() === 1 );
		check( 'editor', 'the widget is in the panel under General with its title', await admin.page.evaluate( () => { const w = refraction.widgetsCache[ 'refraction-form' ]; return !! w && w.title === 'Form' && !! refraction.widgetsCache[ 'refraction-login' ]; } ) );
		await admin.page.evaluate( () => { const c = refraction.getContainer( 'frmbasic' ); $e.run( 'document/elements/select', { container: c } ); } );
		await admin.page.waitForSelector( '.refraction-control-form_fields', { timeout: 15000 } );
		const rows = await admin.page.locator( '.refraction-control-form_fields .refraction-repeater-row-item-title' ).count();
		check( 'editor', 'the repeater lists the form fields', rows === 17, `${ rows }` );
		await admin.page.screenshot( { path: join( SHOTS, 'editor-form.png' ) } );
		await admin.page.click( '.refraction-control-form_fields .refraction-repeater-add' );
		await sleep( 500 );
		check( 'editor', 'adding a field adds a row and re-renders the preview', ( await admin.page.locator( '.refraction-control-form_fields .refraction-repeater-row-item-title' ).count() ) === 18 );
		await admin.page.evaluate( () => {
			const c = refraction.getContainer( 'frmbasic' );
			const items = c.settings.get( 'form_fields' );
			const last = items.models[ items.length - 1 ];
			$e.run( 'document/elements/settings', { container: c.repeaters.form_fields.children[ items.length - 1 ], settings: { field_label: 'Added in editor', field_type: 'text', custom_id: 'added', field_width: '50' } } );
			$e.run( 'document/elements/settings', { container: c, settings: { button_text: 'Send it now', form_name: 'Edited form', success_message: 'Edited message' } } );
		} );
		await sleep( 1500 );
		check( 'editor', 'the preview updates with the new field label and button text', ( await frame.locator( '#refraction-form-frmbasic label:has-text("Added in editor")' ).count() ) === 1 && ( await frame.locator( '#refraction-form-frmbasic .refraction-form__submit' ).innerText() ).includes( 'Send it now' ) );
		await admin.page.evaluate( () => $e.run( 'document/save/publish' ) );
		await admin.page.waitForFunction( () => ! refraction.documents.getCurrent().editor.isChanged, null, { timeout: 30000 } );
		const savedJson = wp( [ 'post', 'meta', 'get', String( ids.basic ), '_refraction_data' ] );
		check( 'editor', 'saving stores the edited form settings', savedJson.includes( 'Added in editor' ) && savedJson.includes( 'Send it now' ) && savedJson.includes( 'Edited message' ) );
		await admin.page.goto( `${ BASE }/wp-admin/index.php` );
		await page.goto( url( 'form-basic' ) );
		check( 'editor', 'the edited form shows on the front end', ( await page.locator( 'label:has-text("Added in editor")' ).count() ) === 1 && ( await page.locator( '.refraction-form__submit' ).innerText() ).includes( 'Send it now' ) );

		// A new page with a new form built through the editor API.
		const newId = Number( wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Editor Built Form', '--porcelain' ] ) );
		await admin.page.goto( `${ BASE }/wp-admin/post.php?post=${ newId }&action=refraction` );
		await admin.page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		await sleep( 2500 );
		await admin.page.evaluate( () => {
			const container = $e.run( 'document/elements/create', { container: refraction.getPreviewContainer(), model: { elType: 'container' } } );
			$e.run( 'document/elements/create', { container, model: { elType: 'widget', widgetType: 'refraction-form', settings: { form_name: 'Built in UI' } } } );
		} );
		await sleep( 2000 );
		const defaults = await frame.locator( '.refraction-form__field' ).count();
		check( 'editor', 'a new Form widget comes with name, email and message fields', defaults === 3, `${ defaults }` );
		await admin.page.evaluate( () => $e.run( 'document/save/publish' ) );
		await admin.page.waitForFunction( () => ! refraction.documents.getCurrent().editor.isChanged, null, { timeout: 30000 } );
		await admin.page.goto( `${ BASE }/wp-admin/index.php` );
		const built = await newVisitor();
		await built.page.goto( `${ BASE }/?p=${ newId }` );
		await sleep( 3200 );
		await built.page.fill( 'input[name="form_fields[name]"]', 'Built Bob' );
		await built.page.fill( 'input[name="form_fields[email]"]', 'bob@example.org' );
		await built.page.fill( 'textarea[name="form_fields[message]"]', 'works with defaults' );
		const cBuilt = seed( 'count' );
		await Promise.all( [ built.page.waitForResponse( ( x ) => x.url().includes( 'refraction_form_submit' ) ), built.page.click( '.refraction-form__submit' ) ] );
		await built.page.waitForSelector( '.refraction-form__message--success' );
		check( 'editor', 'a form built in the editor with only defaults submits and is stored (default actions: collect + email)', seed( 'count' ) === cBuilt + 1 && seed( 'mail' ).some( ( m ) => JSON.stringify( m.to ).includes( 'a@example.com' ) ), JSON.stringify( seed( 'mail' ).slice( -1 ) ) );
		await built.ctx.close();

		// ------------------------------------------------------------------ cleanliness
		await sleep( 500 );
		const phpLog = logTail( logStart );
		check( 'quality', 'no PHP warnings, notices or errors in the debug log', phpLog.trim() === '', phpLog.slice( 0, 1500 ) );
		check( 'quality', 'no JavaScript console errors', consoleErrors.length === 0, consoleErrors.slice( 0, 6 ).join( ' || ' ) );
	} finally {
		await browser.close();
		receiver.close();
		if ( server ) { server.kill(); }
	}

	console.log( `\n${ total - failures }/${ total } checks passed` );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
