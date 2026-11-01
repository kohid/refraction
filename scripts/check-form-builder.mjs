#!/usr/bin/env node
/**
 * Form Builder check on a real WordPress (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-form-builder.mjs [--site /tmp/rf-fb-site] [--port 8921] [--shots /tmp/fb-shots]
 *                                            [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). The site is changed
 * (collections, records, pages, users); use a throw-away site.
 *
 * Covers: the Builder menu entry, creating a Booking collection from a preset, editing its design (add / reorder / remove
 * a field, statuses, switches) and saving it, adding a record with validation errors then a valid one, the table (columns,
 * status tabs and counts, search, filter, sort, pagination, bulk status change, bulk delete, CSV export with formula
 * protection), the public form for a visitor (honeypot, minimum fill time, validation, hourly limit, success, stored values
 * stripped of markup), a Listing collection shown publicly as cards and as a table (only published records and only public
 * fields), shortcodes of collections that did not opt in, an editor-role user refused, deleting a collection with the typed
 * confirmation, labels on every control, and no PHP or console errors, on a classic and a block theme.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fb-site' );
const PORT = arg( 'port', '8921' );
const SHOTS = arg( 'shots', '/tmp/fb-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/form-builder-seed.php' );
const BUILDER = `${ BASE }/wp-admin/admin.php?page=refraction-builder`;

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


/** Drag with real mouse events: scroll both ends into view first, then move in steps so Chromium starts a native drag. */
async function drag( page, source, target, offset = { x: 40, y: 4 } ) {
	if ( process.env.DEBUG_DRAG ) {
		await page.evaluate( () => { window.__ev = []; [ 'dragstart', 'dragover', 'dragend', 'drop' ].forEach( ( n ) => document.addEventListener( n, ( e ) => window.__ev.push( n + ':' + String( e.target.className || e.target.tagName ).slice( 0, 30 ) + '@' + Math.round( e.clientX ) + ',' + Math.round( e.clientY ) ), true ) ); } );
	}
	await target.evaluate( ( el ) => el.scrollIntoView( { block: 'center' } ) );
	await source.evaluate( ( el ) => el.scrollIntoView( { block: 'center' } ) );
	const from = await source.boundingBox();
	await page.mouse.move( from.x + from.width / 2, from.y + from.height / 2 );
	await page.mouse.down();
	await page.mouse.move( from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 } );
	// Scrolling the canvas while a drag is active would move the target, so bring it into view with the wheel-free API first.
	const to = await target.boundingBox();
	const y = offset.y < 0 ? to.height + offset.y : offset.y; // a negative offset counts from the bottom edge
	await page.mouse.move( to.x + offset.x, to.y + y, { steps: 12 } );
	await page.waitForTimeout( 200 ); // Chromium needs a dragover tick on the target before it will deliver a drop.
	await page.mouse.move( to.x + offset.x + 1, to.y + y + 1 );
	await page.waitForTimeout( 200 );
	await page.mouse.up();
	await page.waitForTimeout( 400 );

	if ( process.env.DEBUG_DRAG ) {
		console.log( 'drag events', JSON.stringify( ( await page.evaluate( () => window.__ev ) ) ), JSON.stringify( await source.boundingBox().catch( () => null ) ), JSON.stringify( to ) );
	}
}

/** Every visible input, select and textarea has a label, an aria-label or a wrapping label. */
const unlabelled = ( page ) => page.evaluate( () => Array.from( document.querySelectorAll( '.rfb-wrap input, .rfb-wrap select, .rfb-wrap textarea, .rfb-front input, .rfb-front select, .rfb-front textarea' ) )
	.filter( ( el ) => el.type !== 'hidden' && ! el.closest( 'template, [hidden], .rfb-hp' ) && el.offsetParent !== null )
	.filter( ( el ) => ! ( el.labels && el.labels.length ) && ! el.getAttribute( 'aria-label' ) && ! el.getAttribute( 'aria-labelledby' ) )
	.map( ( el ) => `${ el.tagName }[name=${ el.name }]` ) );

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
	const watch = ( page, label ) => {
		page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /favicon\.ico/.test( m.location().url + m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text() } @ ${ page.url() }` ); } } );
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

		// ------------------------------------------------------------ menu and empty state
		await page.goto( `${ BASE }/wp-admin/index.php` );
		const menuLabels = await page.$$eval( '#adminmenu a', ( as ) => as.map( ( a ) => a.textContent.trim() ) );
		check( 'menu', 'Builder is in the Refraction menu', menuLabels.includes( 'Builder' ), menuLabels.join( '|' ) );
		await page.goto( BUILDER );
		check( 'overview', 'empty state offers to build a form in the page editor', ( await page.textContent( '.rfb-empty' ) ).includes( 'Create your first collection' ) && ( await page.locator( '.rfb-empty a:has-text("New form")' ).getAttribute( 'href' ) ).includes( 'template_type=rfb-form' ) );
		check( 'overview', 'the old designer and its starting points are gone', ( await page.locator( 'a[href*="view=new"], a[href*="view=design"]' ).count() ) === 0 );
		await page.screenshot( { path: join( SHOTS, 'overview-empty.png' ) } );

		// ------------------------------------------------------------ a booking collection (seeded: forms are built in the page editor, see checks 9 and 10)
		check( 'setup', 'the Bookings collection is created', seed( 'preset', { preset: 'booking' } ).slug === 'bookings' );
		const booking = seed( 'definition', { collection: 'bookings' } );
		booking.fields = booking.fields.filter( ( f ) => f.key !== 'guests' );
		booking.fields.push( { key: 'budget', label: 'Budget', type: 'currency', in_table: true } );
		booking.success_message = 'Booked! We will email you.';
		booking.settings.submit_text = 'Book now';
		booking.style.primary = '#7239ea';
		check( 'setup', 'the booking fields and settings are saved', seed( 'save', { definition: booking } ).fields === 8 && seed( 'definition', { collection: 'bookings' } ).settings.submit_text === 'Book now' );
		await page.goto( BUILDER );
		check( 'overview', 'a collection without a form page offers no designer, only its records', ( await page.locator( '.rfb-collection:has-text("Bookings") a:has-text("Open records")' ).count() ) === 1 && ( await page.locator( '.rfb-collection:has-text("Bookings") a:has-text("Edit design")' ).count() ) === 0 );

		// ------------------------------------------------------------ add a record
		await page.goto( `${ BUILDER }&view=records&collection=bookings` );
		check( 'records', 'empty table says so', ( await page.textContent( '.rfb-empty-body' ) ).includes( 'No records yet' ) );
		await Promise.all( [ page.waitForURL( /view=record/ ), page.click( 'a:has-text("Add Booking")' ) ] );
		await page.waitForLoadState( 'load' );
		await page.fill( '#rfb-values-guest_name', '<b>Ada</b> Lovelace' );
		await page.fill( '#rfb-values-email', 'not-an-email' );
		await page.click( '.rfb-card-footer button[type=submit]' );
		await page.waitForTimeout( 600 );
		check( 'record form', 'the browser stops an invalid email before it is sent', ! /done=errors/.test( page.url() ) && ( await page.$eval( '#rfb-values-email', ( el ) => ! el.validity.valid ) ) );
		// Skip the script's check to prove the server validates too.
		await Promise.all( [ page.waitForURL( /done=errors/ ), page.evaluate( () => HTMLFormElement.prototype.submit.call( document.querySelector( 'form[data-rfb-form]' ) ) ) ] );
		const errorTexts = await page.$$eval( '.rfb-error', ( els ) => els.map( ( e ) => e.textContent ) );
		check( 'record form', 'invalid email and missing required fields are reported', errorTexts.some( ( t ) => /valid email/.test( t ) ) && errorTexts.some( ( t ) => /required/.test( t ) ), errorTexts.join( '|' ) );
		check( 'record form', 'what was typed is kept', ( await page.inputValue( '#rfb-values-email' ) ) === 'not-an-email' );
		check( 'record form', 'errors are announced and linked to the field', ( await page.getAttribute( '#rfb-values-email', 'aria-describedby' ) ).includes( 'error' ) && ( await page.$( '.rfb-error[role=alert]' ) ) !== null );
		await page.screenshot( { path: join( SHOTS, 'record-errors.png' ), fullPage: true } );
		await page.fill( '#rfb-values-email', 'ada@example.com' );
		await page.selectOption( '#rfb-values-service', 'Consultation' );
		await page.fill( '#rfb-values-date', '2026-12-24' );
		await page.fill( '#rfb-values-time', '14:30' );
		await page.fill( '#rfb-values-budget', '1500.5' );
		await page.selectOption( '#rfb-status', 'confirmed' );
		await Promise.all( [ page.waitForURL( /done=record-saved/ ), page.click( '.rfb-card-footer button[type=submit]' ) ] );
		const firstRow = ( await page.textContent( '.rfb-table tbody tr' ) ).replace( /\s+/g, ' ' );
		check( 'records', 'saved record is in the table, markup stripped, status badge shown', firstRow.includes( 'Ada Lovelace' ) && ! firstRow.includes( '<b>' ) && firstRow.includes( 'Confirmed' ), firstRow );
		check( 'records', 'amount is shown with two decimals', firstRow.includes( '1,500.50' ) || firstRow.includes( '1500.50' ), firstRow );
		check( 'records', 'initials avatar', ( await page.textContent( '.rfb-table tbody tr .rfb-symbol' ) ) === 'AL' );

		// edit it
		await page.click( '.rfb-table tbody tr .rfb-user-name' );
		check( 'record form', 'edit shows the saved values', ( await page.inputValue( '#rfb-values-guest_name' ) ) === 'Ada Lovelace' && ( await page.inputValue( '#rfb-status' ) ) === 'confirmed' );
		const unl2 = await unlabelled( page );
		check( 'a11y', 'record form controls are labelled', unl2.length === 0, unl2.join( ',' ) );
		await page.fill( '#rfb-values-notes', 'Window seat please' );
		await Promise.all( [ page.waitForURL( /done=record-saved/ ), page.click( '.rfb-card-footer button[type=submit]' ) ] );

		// ------------------------------------------------------------ table at scale
		seed( 'records', { collection: 'bookings', count: 27, status: 'pending' } );
		await page.goto( `${ BUILDER }&view=records&collection=bookings` );
		const tabs = await page.$$eval( '.rfb-tab', ( els ) => els.map( ( e ) => e.textContent.replace( /\s+/g, ' ' ).trim() ) );
		check( 'table', 'status tabs carry counts', tabs[ 0 ] === 'All 28' && tabs.includes( 'Pending 27' ) && tabs.includes( 'Confirmed 1' ), tabs.join( '|' ) );
		check( 'table', 'first page shows 20 rows', ( await page.$$( '.rfb-table tbody tr' ) ).length === 20 );
		check( 'table', 'footer counts the rows', ( await page.textContent( '.rfb-card-footer' ) ).includes( 'Showing 1 to 20 of 28' ) );
		await Promise.all( [ page.waitForURL( /paged=2/ ), page.click( '.rfb-pagination a:has-text("2")' ) ] );
		check( 'table', 'page 2 shows the remaining 8', ( await page.$$( '.rfb-table tbody tr' ) ).length === 8 );
		await page.goto( `${ BUILDER }&view=records&collection=bookings` );
		await page.fill( '.rfb-search input', 'guest7@example.com' );
		await Promise.all( [ page.waitForURL( /s=guest7/ ), page.press( '.rfb-search input', 'Enter' ) ] );
		const found = await page.$$eval( '.rfb-table tbody .rfb-user-name', ( els ) => els.map( ( e ) => e.textContent ) );
		check( 'table', 'search finds one guest', found.length === 1 && found[ 0 ] === 'Guest 07', found.join( '|' ) );
		await page.goto( `${ BUILDER }&view=records&collection=bookings&status=confirmed` );
		check( 'table', 'status tab filters', ( await page.$$( '.rfb-table tbody tr' ) ).length === 1 );
		await page.goto( `${ BUILDER }&view=records&collection=bookings` );
		await page.selectOption( 'select[name=f_service]', 'Standard visit' );
		await Promise.all( [ page.waitForURL( /f_service=/ ), page.click( '.rfb-filters button[type=submit]' ) ] );
		const serviceCells = await page.$$eval( '.rfb-table tbody tr', ( rows ) => rows.map( ( r ) => r.textContent.includes( 'Standard visit' ) ) );
		check( 'table', 'dropdown filter shows only that service', serviceCells.length > 0 && serviceCells.every( Boolean ) );
		await page.goto( `${ BUILDER }&view=records&collection=bookings&orderby=guest_name&order=asc` );
		const asc = await page.$$eval( '.rfb-table tbody .rfb-user-name', ( els ) => els.map( ( e ) => e.textContent ) );
		check( 'table', 'sort by a column ascending', asc[ 0 ] === 'Ada Lovelace' && asc[ 1 ] === 'Guest 01', asc.slice( 0, 3 ).join( '|' ) );
		await page.goto( `${ BUILDER }&view=records&collection=bookings&orderby=guest_name&order=desc` );
		const desc = await page.$$eval( '.rfb-table tbody .rfb-user-name', ( els ) => els.map( ( e ) => e.textContent ) );
		check( 'table', 'sort by a column descending', desc[ 0 ] === 'Guest 27', desc.slice( 0, 3 ).join( '|' ) );
		check( 'a11y', 'sorted column is announced', ( await page.getAttribute( 'th[aria-sort="descending"]', 'aria-sort' ) ) === 'descending' );
		const unl3 = await unlabelled( page );
		check( 'a11y', 'table controls are labelled', unl3.length === 0, unl3.join( ',' ) );
		await page.screenshot( { path: join( SHOTS, 'records.png' ), fullPage: true } );

		// bulk status and delete
		await page.goto( `${ BUILDER }&view=records&collection=bookings&orderby=guest_name&order=asc` );
		check( 'table', 'bulk bar hidden until a row is ticked', ! ( await page.locator( '.rfb-bulkbar' ).isVisible() ) );
		await page.locator( 'input[name="records[]"]' ).nth( 1 ).check();
		await page.locator( 'input[name="records[]"]' ).nth( 2 ).check();
		check( 'table', 'bulk bar counts the selection', ( await page.textContent( '#rfb-selected' ) ) === '2 selected' );
		await Promise.all( [ page.waitForURL( /done=status-changed/ ), page.selectOption( '#rfb-bulk-status', 'completed' ) ] );
		check( 'table', 'bulk status change applied to two records', ( await page.$$eval( '.rfb-tab', ( els ) => els.map( ( e ) => e.textContent.replace( /\s+/g, ' ' ).trim() ) ) ).includes( 'Completed 2' ) );
		await page.goto( `${ BUILDER }&view=records&collection=bookings&status=completed` );
		await page.check( '#rfb-all' );
		page.once( 'dialog', ( d ) => d.accept() );
		await Promise.all( [ page.waitForURL( /done=records-deleted/ ), page.click( '.rfb-bulkbar button[type=submit]' ) ] );
		check( 'table', 'bulk delete after confirmation', ( await page.textContent( '.rfb-alert-success' ) ).includes( '2 records deleted' ) && seed( 'state', { collection: 'bookings' } ).count === 26 );

		// export
		const cookies = ( await ctx.cookies() ).map( ( c ) => `${ c.name }=${ c.value }` ).join( '; ' );
		seed( 'records', { collection: 'bookings', count: 1, values: { guest_name: '=HYPERLINK("http://evil.test","x")', notes: 'a,b' }, status: 'pending' } );
		const exportHref = await ( async () => { await page.goto( `${ BUILDER }&view=records&collection=bookings` ); return page.getAttribute( 'a:has-text("Export CSV")', 'href' ); } )();
		const csvResponse = await fetch( exportHref.replace( /&amp;/g, '&' ), { headers: { cookie: cookies } } );
		const csv = await csvResponse.text();
		check( 'export', 'CSV download with the right headers', ( csvResponse.headers.get( 'content-type' ) || '' ).startsWith( 'text/csv' ) && ( csvResponse.headers.get( 'content-disposition' ) || '' ).includes( 'bookings-' ), csvResponse.headers.get( 'content-type' ) );
		check( 'export', 'header row and all records', csv.split( '\n' )[ 0 ].includes( 'Name' ) && csv.trim().split( '\n' ).length >= 27, csv.split( '\n' ).length );
		check( 'export', 'formula cells are neutralised', csv.includes( '\'=HYPERLINK' ) && ! /(^|,)"?=HYPERLINK/m.test( csv ) );
		const noNonce = await fetch( exportHref.replace( /&amp;/g, '&' ).replace( /_wpnonce=[a-z0-9]+/, '_wpnonce=bad' ), { headers: { cookie: cookies } } );
		check( 'export', 'a bad nonce is refused', noNonce.status === 403 || noNonce.status === 302 || ( await noNonce.text() ).includes( 'link you followed has expired' ) );

		// ------------------------------------------------------------ public form, per theme
		wp( [ 'eval', 'update_option("default_comment_status","closed");' ] );
		const formPage = seed( 'page', { title: 'Book now', slug: 'book-now', content: '[refraction_form collection="bookings"]' } );
		const privPage = seed( 'page', { title: 'Private', slug: 'private-test', content: '[refraction_form collection="nothing"] [refraction_records collection="bookings"]' } );
		const submit = async ( visitor, values, opts = {} ) => {
			await visitor.goto( formPage.url );
			if ( opts.wait ) { await sleep( 3300 ); }
			await visitor.fill( '#rfb-values-guest_name', values.name ?? '' );
			await visitor.fill( '#rfb-values-email', values.email ?? '' );
			if ( values.service ) { await visitor.selectOption( '#rfb-values-service', values.service ); }
			await visitor.fill( '#rfb-values-date', values.date ?? '' );
			await visitor.fill( '#rfb-values-time', values.time ?? '' );
			if ( opts.honeypot ) { await visitor.evaluate( ( v ) => ( document.querySelector( 'input[name=rfb_website]' ).value = v ), opts.honeypot ); }
			// `native` skips the page script's own checks so the server's validation is what gets tested.
			await Promise.all( [ visitor.waitForNavigation(), opts.native ? visitor.evaluate( () => HTMLFormElement.prototype.submit.call( document.querySelector( '.rfb-form' ) ) ) : visitor.click( '.rfb-form button[type=submit]' ) ] );
			await visitor.waitForLoadState( 'load' );
		};

		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 900 } } );
			const visitor = await vctx.newPage();
			watch( visitor, `visitor ${ theme }` );
			const before = seed( 'state', { collection: 'bookings' } ).count;

			await visitor.goto( formPage.url );
			const unlV = await unlabelled( visitor );
			check( `form ${ theme }`, 'public form renders with labelled controls', ( await visitor.$$( '.rfb-form .rfb-input' ) ).length >= 6 && unlV.length === 0, unlV.join( ',' ) );
			const hp = await visitor.locator( '.rfb-hp' ).boundingBox();
			check( `form ${ theme }`, 'honeypot is off screen and hidden from screen readers', hp && hp.x + hp.width < 0 && ( await visitor.getAttribute( '.rfb-hp', 'aria-hidden' ) ) === 'true', JSON.stringify( hp ) );
			await visitor.screenshot( { path: join( SHOTS, `public-form-${ theme }.png` ), fullPage: true } );

			await submit( visitor, { name: 'Bot', email: 'bot@example.com', service: 'Consultation', date: '2027-01-02', time: '09:00' }, { wait: true, honeypot: 'spam' } );
			check( `form ${ theme }`, 'honeypot submission looks fine but stores nothing', ( await visitor.textContent( '.rfb-front' ) ).includes( 'Booked!' ) && seed( 'state', { collection: 'bookings' } ).count === before );

			await submit( visitor, { name: 'Quick Quentin', email: 'q@example.com', service: 'Consultation', date: '2027-01-02', time: '09:00' } );
			check( `form ${ theme }`, 'a submission faster than 3 seconds is refused', ( await visitor.textContent( '.rfb-front' ) ).includes( 'too quickly' ) && seed( 'state', { collection: 'bookings' } ).count === before );

			await visitor.goto( formPage.url );
			await visitor.waitForLoadState( 'load' );
			await visitor.fill( '#rfb-values-email', 'bad' );
			await visitor.click( '.rfb-form button[type=submit]' );
			await sleep( 700 );
			check( `form ${ theme }`, 'the page script stops an incomplete form before it is sent', ! /rfb_e=/.test( visitor.url() ) && ( await visitor.locator( '.rfb-front .rfb-error' ).count() ) === 0 );
			await submit( visitor, { name: '', email: 'bad', service: 'Consultation', date: '2027-01-02', time: '09:00' }, { wait: true, native: true } );
			const publicErrors = await visitor.$$eval( '.rfb-front .rfb-error', ( els ) => els.map( ( e ) => e.textContent ) );
			check( `form ${ theme }`, 'validation errors are shown to the visitor', publicErrors.length >= 2 && ( await visitor.$( '.rfb-alert-error[role=alert]' ) ) !== null, publicErrors.join( '|' ) );
			check( `form ${ theme }`, 'typed values survive the error', ( await visitor.inputValue( '#rfb-values-email' ) ) === 'bad' );
			await visitor.screenshot( { path: join( SHOTS, `public-form-errors-${ theme }.png` ), fullPage: true } );

			await visitor.fill( '#rfb-values-guest_name', '<img src=x onerror=alert(1)>Visitor ' + theme );
			await visitor.fill( '#rfb-values-email', `visitor-${ theme }@example.com` );
			await sleep( 3300 );
			await Promise.all( [ visitor.waitForLoadState( 'load' ), visitor.click( '.rfb-form button[type=submit]' ) ] );
			await visitor.waitForLoadState( 'load' );
			check( `form ${ theme }`, 'a valid submission shows the success message', ( await visitor.textContent( '.rfb-front' ) ).includes( 'Booked! We will email you.' ), ( await visitor.textContent( '.rfb-front' ) ).slice( 0, 200 ) );
			const state = seed( 'state', { collection: 'bookings' } );
			check( `form ${ theme }`, 'the record is saved as pending with markup stripped', state.count === before + 1 && state.latest.status === 'pending' && ! state.latest.title.includes( '<' ) && state.latest.title.includes( 'Visitor' ), JSON.stringify( state.latest ) );
			await visitor.screenshot( { path: join( SHOTS, `public-form-done-${ theme }.png` ), fullPage: true } );

			await visitor.goto( privPage.url );
			const visible = ( await visitor.textContent( 'body' ) );
			check( `form ${ theme }`, 'shortcodes of missing or non-public collections print nothing for a visitor', ! visible.includes( 'Refraction form' ) && ! visible.includes( 'Refraction records' ) );
			await vctx.close();
		}

		// per-visitor hourly limit
		wp( [ 'theme', 'activate', themes[ 0 ] ] );
		const lctx = await browser.newContext();
		const lim = await lctx.newPage();
		seed( 'limit', { ip: '127.0.0.1' } );
		const beforeLimit = seed( 'state', { collection: 'bookings' } ).count;
		await submit( lim, { name: 'Limited', email: 'l@example.com', service: 'Consultation', date: '2027-01-02', time: '09:00' }, { wait: true } );
		check( 'form', 'a visitor over the hourly limit is refused', ( await lim.textContent( '.rfb-front' ) ).includes( 'Too many submissions' ) && seed( 'state', { collection: 'bookings' } ).count === beforeLimit );
		await lctx.close();

		// admin sees a hint for a collection that did not opt in
		const adminSees = await ( async () => { await page.goto( privPage.url ); return page.textContent( 'body' ); } )();
		check( 'shortcodes', 'an administrator sees a hint for a mistaken shortcode', adminSees.includes( 'Refraction form: that collection does not exist' ) && adminSees.includes( 'turn on "Show records publicly"' ) );

		// ------------------------------------------------------------ listings
		seed( 'preset', { preset: 'listing' } );
		const listingFields = seed( 'definition', { collection: 'listings' } ).fields;
		check( 'listing', 'preset marks only some fields public', listingFields.some( ( f ) => f.label === 'Featured' && ! f.public ) && listingFields.some( ( f ) => f.label === 'Price' && f.public ) );
		for ( const [ title, price, status, featured ] of [ [ 'Sea View Villa', '450000', 'published', '1' ], [ 'City Loft', '210000.5', 'published', '0' ], [ 'Draft Cabin', '99000', 'draft', '0' ], [ 'Sold Barn', '120000', 'sold', '0' ] ] ) {
			const r = seed( 'listing', { status, values: { title, price, category: 'Residential', location: 'Lisbon', rating: '4', featured, link: 'https://example.com/' + title.split( ' ' )[ 0 ].toLowerCase(), description: `About ${ title }` } } );
			if ( r.errors && Object.keys( r.errors ).length ) { throw new Error( 'listing seed: ' + JSON.stringify( r.errors ) ); }
		}
		const cards = seed( 'page', { title: 'Homes', slug: 'homes', content: '[refraction_records collection="listings" status="published" view="cards"]' } );
		const tablePage = seed( 'page', { title: 'Homes table', slug: 'homes-table', content: '[refraction_records collection="listings" status="published" view="table"]' } );
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 900 } } );
			const visitor = await vctx.newPage();
			watch( visitor, `visitor ${ theme }` );
			await visitor.goto( cards.url );
			const cardText = await visitor.textContent( '.rfb-public-cards' );
			check( `listing ${ theme }`, 'cards show only published records', ( await visitor.$$( '.rfb-public-card' ) ).length === 2 && cardText.includes( 'Sea View Villa' ) && ! cardText.includes( 'Draft Cabin' ) && ! cardText.includes( 'Sold Barn' ), cardText.slice( 0, 200 ) );
			check( `listing ${ theme }`, 'cards show public fields and hide private ones', cardText.includes( 'Price' ) && cardText.includes( '450,000.00' ) && ! cardText.includes( 'Featured' ), cardText.slice( 0, 300 ) );
			check( `listing ${ theme }`, 'link is a safe external link', ( await visitor.getAttribute( '.rfb-public-card a', 'rel' ) ) === 'noopener noreferrer' );
			await visitor.screenshot( { path: join( SHOTS, `listing-cards-${ theme }.png` ), fullPage: true } );
			await visitor.goto( tablePage.url );
			const heads = await visitor.$$eval( '.rfb-public-table-wrap th', ( els ) => els.map( ( e ) => e.textContent ) );
			check( `listing ${ theme }`, 'table view lists public columns for published records', heads.includes( 'Price' ) && ! heads.includes( 'Featured' ) && ( await visitor.$$( '.rfb-public-table-wrap tbody tr' ) ).length === 2, heads.join( '|' ) );
			await visitor.setViewportSize( { width: 390, height: 800 } );
			check( `listing ${ theme }`, 'no horizontal page scroll on a phone', await visitor.evaluate( () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 ) );
			await visitor.screenshot( { path: join( SHOTS, `listing-table-phone-${ theme }.png` ), fullPage: true } );
			await vctx.close();
		}

		// ------------------------------------------------------------ overview with data
		await page.goto( BUILDER );
		const cardsAdmin = await page.$$eval( '.rfb-collection h2', ( hs ) => hs.map( ( h ) => h.textContent.trim() ) );
		check( 'overview', 'both collections are listed with counts', cardsAdmin.includes( 'Bookings' ) && cardsAdmin.includes( 'Listings' ) && ( await page.textContent( '.rfb-stat' ) ).includes( String( seed( 'state', { collection: 'bookings' } ).count ) ) );
		await page.screenshot( { path: join( SHOTS, 'overview.png' ), fullPage: true } );

		// ------------------------------------------------------------ permissions
		const bookingCount = seed( 'state', { collection: 'bookings' } ).count;
		seed( 'user', { login: 'editor1', pass: 'editor1pass', role: 'editor' } );
		const ed = await login( browser, 'editor1', 'editor1pass' );
		const denied = await ed.page.goto( BUILDER );
		check( 'permissions', 'an editor cannot open the Builder', denied.status() === 403 || ( await ed.page.content() ).includes( 'not allowed' ) || ( await ed.page.content() ).includes( 'permission' ) );
		const post = await ed.ctx.request.post( `${ BASE }/wp-admin/admin-post.php`, { form: { action: 'refraction_fb_delete_records', collection: 'bookings', 'records[]': '1' }, failOnStatusCode: false } );
		check( 'permissions', 'an editor cannot delete records', ( post.status() === 403 || post.status() >= 400 ) && seed( 'state', { collection: 'bookings' } ).count === bookingCount );
		await ed.ctx.close();
		const nonceless = await ctx.request.post( `${ BASE }/wp-admin/admin-post.php`, { form: { action: 'refraction_fb_delete_records', collection: 'bookings', 'records[]': '1' }, failOnStatusCode: false } );
		check( 'permissions', 'a post without a nonce is refused for an administrator', nonceless.status() >= 400 && seed( 'state', { collection: 'bookings' } ).count === bookingCount );

		// ------------------------------------------------------------ delete a collection
		await page.goto( `${ BUILDER }&view=records&collection=listings` );
		check( 'delete', 'the collection page shows the shortcodes and the delete box', ( await page.textContent( '.rfb-wrap' ) ).includes( '[refraction_form collection="listings"]' ) && ( await page.locator( '.rfb-danger' ).count() ) === 1 );
		await page.fill( '#rfb-confirm', 'wrong name' );
		await Promise.all( [ page.waitForURL( /done=confirm/ ), page.click( '.rfb-danger button' ) ] );
		check( 'delete', 'a wrong confirmation deletes nothing', seed( 'state', { collection: 'listings' } ).exists && seed( 'state', { collection: 'listings' } ).count === 4 );
		await page.fill( '#rfb-confirm', 'Listings' );
		await Promise.all( [ page.waitForURL( /done=collection-deleted/ ), page.click( '.rfb-danger button' ) ] );
		const gone = seed( 'state', { collection: 'listings' } );
		check( 'delete', 'the typed name deletes the collection and its records', ! gone.exists && gone.count === 0 );
		check( 'delete', 'other collections are untouched', seed( 'state', { collection: 'bookings' } ).count === bookingCount );
		await page.goto( `${ BUILDER }&view=records&collection=listings` );
		check( 'delete', 'a deleted collection falls back to the overview', ( await page.textContent( '.rfb-title' ) ) === 'Builder' );

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
