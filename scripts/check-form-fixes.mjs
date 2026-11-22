#!/usr/bin/env node
/**
 * Form Builder fixes (0.147.0, SQLite test site, Chromium), in Edit Mode and on the site:
 * - a required Choice (radio list) stops Next; a required tick-box list needs one ticked;
 * - Name field: first / last name width per screen size;
 * - Steps: Style > Sidebar on phones (on top): its layouts and colors, in the editor's phone view and on a phone;
 * - after sending: the confirmation (heading, the reference in its box, Copy, "send another"), shown by Form Canvas in
 *   the editor with a sample reference and styled from its Style tab;
 * - the email preview buttons in the form's settings show the designed email with the panel's (unsaved) values;
 * - Records Table: the reference column and search; once a collection is chosen, its field settings list only that
 *   collection's fields.
 *
 * Usage: node scripts/check-form-fixes.mjs [--site /tmp/rf-ff-site] [--port 8955] [--shots /tmp/form-fixes-shots]
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
const SITE = arg( 'site', '/tmp/rf-ff-site' );
const PORT = arg( 'port', '8955' );
const SHOTS = arg( 'shots', '/tmp/form-fixes-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const SEED = join( HERE, 'fixtures/form-builder-seed.php' );
const BUILDER = `${ BASE }/wp-admin/admin.php?page=refraction-builder`;

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) { failures++; }
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 600 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
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
	return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
}
const seed = ( action, spec = {} ) => {
	const out = wp( [ 'eval-file', SEED ], { FB_ACTION: action, FB_SPEC: JSON.stringify( spec ) } );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
};
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => { try { await fetch( `${ BASE }/wp-login.php` ); return true; } catch { return false; } };

function page( title, elements ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', id, '--page_template=refraction_canvas' ] );
	return { id, url: `${ BASE }/?page_id=${ id }` };
}
const box = ( id, elements ) => ( { id, elType: 'container', settings: {}, elements } );

const previewFrame = ( p ) => p.frame( { name: 'refraction-preview-iframe' } ) || p.frames().find( ( f ) => f !== p.mainFrame() && f.url().includes( 'refraction-preview' ) );
const editorReady = ( p ) => p.waitForFunction( () => window.refraction && window.$e && refraction.documents && refraction.documents.getCurrent() && document.querySelector( '#refraction-panel' ), null, { timeout: 120000 } );

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) { await sleep( 200 ); }
	}

	wp( [ 'transient', 'delete', '--all' ] );
	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];

	try {
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 1000 } } );
		const ed = await ctx.newPage();
		ed.on( 'pageerror', ( e ) => ! /Transition was (skipped|aborted)/.test( e.message ) && errors.push( 'editor: ' + e.message ) );
		await ed.goto( `${ BASE }/wp-login.php` );
		await ed.fill( '#user_login', 'admin' );
		await ed.fill( '#user_pass', 'admin' );
		await Promise.all( [ ed.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), ed.click( '#wp-submit' ) ] );

		// ------------------------------------------------------------ the form, built in the editor
		await ed.goto( BUILDER );
		await ed.goto( await ed.locator( 'a:has-text("New form")' ).first().getAttribute( 'href' ), { timeout: 120000 } );
		await editorReady( ed );
		await ed.waitForFunction( () => document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await sleep( 2500 );
		await ed.evaluate( async () => {
			const add = ( container, model ) => $e.run( 'document/elements/create', { container, model, options: { edit: false } } );
			const root = add( refraction.getPreviewContainer(), { elType: 'container', settings: {} } );
			const steps = add( root, { elType: 'widget', widgetType: 'rfb-steps', settings: {
				step_layout: 'sidebar',
				side_heading: 'Your booking',
				steps: [ { _id: 'ff1', step_title: 'Tour details' }, { _id: 'ff2', step_title: 'Information' } ],
			} } );
			add( steps.children[ 0 ], { id: 'ffveh01', elType: 'widget', widgetType: 'rfb-field-radio', settings: { field_label: 'Vehicle Option', field_key: 'vehicle', field_required: 'yes', field_options: 'car|Car Tours\nbus|Minibus Tours' } } );
			add( steps.children[ 0 ], { id: 'ffxtra1', elType: 'widget', widgetType: 'rfb-field-checkbox', settings: { field_label: 'Extras', field_key: 'extras', field_required: 'yes', field_options: 'water|Water\nguide|Guide' } } );
			add( steps.children[ 1 ], { id: 'ffname1', elType: 'widget', widgetType: 'rfb-field-name', settings: { field_label: 'Name', field_key: 'name', field_required: 'yes', name_parts: [ 'first', 'last' ] } } );
			add( steps.children[ 1 ], { id: 'ffmail1', elType: 'widget', widgetType: 'rfb-field-email', settings: { field_label: 'Email', field_key: 'email', field_required: 'yes' } } );
			add( steps.children[ 1 ], { id: 'ffnote1', elType: 'widget', widgetType: 'rfb-field-text', settings: { field_label: 'Note', field_key: 'note' } } );
			await new Promise( ( r ) => setTimeout( r, 400 ) );
			await $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: {
				post_title: 'Highland tour', rfb_singular: 'Booking', rfb_min_seconds: 0, rfb_hourly_limit: 0,
				rfb_reference_prefix: 'HT', rfb_success_message: 'Thank you. We will confirm your tour shortly.',
				rfb_done_heading: 'Booking received', rfb_done_note: 'Quote it when you call us.', rfb_done_again: 'Book another tour',
				rfb_confirm_enabled: 'yes', rfb_confirm_field: 'email', rfb_notify_enabled: 'yes', rfb_notify_to: 'office@example.com',
			} } );
		} );
		await sleep( 2000 );
		let frame = previewFrame( ed );

		// Name widths: desktop 60% / 40% side by side; at the 430 phone view each on its own line.
		const nameWidths = () => frame.evaluate( () => {
			const row = document.querySelector( '.refraction-element-ffname1 .rfb-name-row' );
			const w = ( sel ) => Math.round( row.querySelector( sel ).getBoundingClientRect().width );
			return row ? { row: Math.round( row.getBoundingClientRect().width ), first: w( '.rfb-name-first' ), last: w( '.rfb-name-last' ), top1: Math.round( row.querySelector( '.rfb-name-first' ).getBoundingClientRect().top ), top2: Math.round( row.querySelector( '.rfb-name-last' ).getBoundingClientRect().top ) } : null;
		} );
		await ed.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ffname1' ), settings: {
			name_gap: { unit: 'px', size: 20 },
			name_w_first: { unit: '%', size: 60 }, name_w_last: { unit: '%', size: 40 },
			name_w_first_phone_md: { unit: '%', size: 100 }, name_w_last_phone_md: { unit: '%', size: 100 },
		} } ) );
		// The Name field sits on step 2: show it in the preview.
		await frame.evaluate( () => document.querySelector( '.rfb-steps-editor .rfb-next' )?.click() );
		await sleep( 1200 );
		const wide = await nameWidths();
		check( 'name', 'Edit Mode: first name 60% and last name 40% of the row, side by side (the 20px space taken off)', wide && wide.top1 === wide.top2 && Math.abs( wide.first - ( ( wide.row * 0.6 ) - 8 ) ) <= 2 && Math.abs( wide.last - ( ( wide.row * 0.4 ) - 12 ) ) <= 2, JSON.stringify( wide ) );
		await ed.evaluate( () => refraction.changeDeviceMode( 'phone_md' ) );
		await sleep( 1800 );
		frame = previewFrame( ed );
		const narrow = await nameWidths();
		check( 'name', 'Edit Mode, phone view (430): 100% each, one under the other', narrow && narrow.top2 > narrow.top1 && Math.abs( narrow.first - narrow.row ) <= 1 && Math.abs( narrow.last - narrow.row ) <= 1, JSON.stringify( narrow ) );

		// Sidebar on phones: the phone view shows the row with its own background and layout.
		const side = () => frame.evaluate( () => {
			const nav = document.querySelector( '.rfb-steps-side' );
			if ( ! nav ) { return null; }
			const ol = nav.querySelector( 'ol' );
			const items = [ ...ol.children ];
			return {
				bg: getComputedStyle( nav ).backgroundColor,
				radius: getComputedStyle( nav ).borderTopLeftRadius,
				bar: getComputedStyle( ol ).scrollbarWidth,
				wrap: getComputedStyle( ol ).flexWrap,
				grow: getComputedStyle( items[ 0 ] ).flexGrow,
				titles: items.map( ( li ) => getComputedStyle( li.querySelector( '.rfb-side-text' ) ).display ),
				heading: nav.querySelector( '.rfb-side-heading' ) ? getComputedStyle( nav.querySelector( '.rfb-side-heading' ) ).display : 'none',
				overflow: Math.round( ol.scrollWidth - ol.clientWidth ),
				above: nav.getBoundingClientRect().bottom <= document.querySelector( '.rfb-steps-editor .rfb-step-slot, .rfb-steps-editor [data-rfb-step]' )?.getBoundingClientRect().top + 1,
			};
		} );
		const setSteps = ( settings ) => ed.evaluate( ( s ) => {
			const find = ( c ) => c.children.flatMap( ( x ) => [ x, ...find( x ) ] );
			const steps = find( refraction.getPreviewContainer() ).find( ( c ) => 'rfb-steps' === c.model.get( 'widgetType' ) );
			$e.run( 'document/elements/settings', { container: steps, settings: s } );
		}, settings );
		const s0 = await side();
		check( 'steps on phones', 'Edit Mode, phone view: the sidebar is above the step, one row, scroll bar hidden by default', s0 && 'none' === s0.bar && 'nowrap' === s0.wrap, JSON.stringify( s0 ) );
		await setSteps( { side_m_layout: 'fit', side_m_bg: '#12345A', side_m_radius: { unit: 'px', size: 4 }, side_m_heading: 'hide' } );
		await sleep( 1500 );
		frame = previewFrame( ed );
		const s1 = await side();
		check( 'steps on phones', 'Edit Mode: "Share the width" fits every step in the row, with its own background, corners, no heading', s1 && 'rgb(18, 52, 90)' === s1.bg && '4px' === s1.radius && '1' === s1.grow && s1.overflow <= 1 && 'none' === s1.heading, JSON.stringify( s1 ) );
		await frame.locator( '.rfb-steps-side' ).screenshot( { path: join( SHOTS, 'editor-phone-sidebar-fit.png' ) } ).catch( () => {} );
		await setSteps( { side_m_layout: 'numbers' } );
		await sleep( 1500 );
		frame = previewFrame( ed );
		const s2 = await side();
		check( 'steps on phones', 'Edit Mode: "Numbers, with the current title" hides the other titles', s2 && 2 === s2.titles.length && 'none' !== s2.titles[ 1 ] && 'none' === s2.titles[ 0 ], JSON.stringify( s2 ) );
		await ed.evaluate( () => refraction.changeDeviceMode( 'desktop' ) );
		await sleep( 1500 );
		frame = previewFrame( ed );
		const s3 = await side();
		check( 'steps on phones', 'desktop keeps the sidebar beside the step (the phone settings do not touch it)', s3 && 'rgb(18, 52, 90)' !== s3.bg, JSON.stringify( s3 ) );

		// The email preview: the panel's values, before saving.
		await ed.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.settings.page.getEditedView().getContainer(), settings: { rfb_email_footer: 'Highland Tours, 1 High Street, Inverness', rfb_email_accent: '#E20A17' } } ) );
		await ed.evaluate( () => $e.route( 'panel/page-settings/settings' ) );
		await sleep( 1200 );
		await ed.evaluate( () => { const s = document.querySelector( '.refraction-control-rfb_notify' ); if ( s && ! s.classList.contains( 'e-open' ) ) { s.querySelector( '.refraction-panel-heading' ).click(); } } );
		await sleep( 800 );
		await ed.locator( '.rfb-email-preview[data-who="visitor"]' ).click();
		await ed.waitForSelector( '.rfb-email-modal iframe', { timeout: 20000 } ).catch( () => {} );
		await sleep( 800 );
		const mail = await ed.evaluate( () => document.querySelector( '.rfb-email-modal iframe' )?.srcdoc || '' );
		check( 'emails', 'Edit Mode: "Preview the visitor\'s email" shows the designed email with the panel\'s footer and color (not saved yet)', /rfb-email-reference[^>]*>HT-\d{6}-4821</.test( mail ) && /Highland Tours, 1 High Street/.test( mail ) && /#E20A17/i.test( mail ) && /Booking received/.test( mail ), mail.slice( 0, 300 ) );
		await ed.locator( '.rfb-email-modal > div' ).screenshot( { path: join( SHOTS, 'editor-email-preview.png' ) } ).catch( () => {} );
		await ed.locator( '.rfb-email-modal__close' ).click();
		check( 'emails', 'the preview window closes', 0 === await ed.locator( '.rfb-email-modal' ).count() );
		await ed.locator( '.rfb-email-preview[data-who="office"]' ).click();
		await ed.waitForFunction( () => /Open the record/.test( document.querySelector( '.rfb-email-modal iframe' )?.srcdoc || '' ), null, { timeout: 20000 } ).catch( () => {} );
		const office = await ed.evaluate( () => document.querySelector( '.rfb-email-modal iframe' )?.srcdoc || '' );
		check( 'emails', 'Edit Mode: "Preview the office email": New Booking, the reference, the answers, Open the record', /New Booking/.test( office ) && /HT-\d{6}-4821/.test( office ) && /Open the record/.test( office ), office.slice( 0, 300 ) );
		await ed.locator( '.rfb-email-modal__close' ).click().catch( () => {} );

		// Publish: the collection is made.
		await ed.evaluate( () => $e.run( 'document/save/publish' ) );
		await sleep( 4000 );
		const docId = await ed.evaluate( () => refraction.config.document.id );
		const map = JSON.parse( wp( [ 'eval', 'echo wp_json_encode( get_option( "refraction_fb_editor_forms" ) );' ] ) || '{}' );
		const slug = Object.keys( map ).find( ( k ) => map[ k ] === docId );
		const def = seed( 'definition', { collection: slug } );
		const st = ( def.definition || def ).settings || {};
		check( 'save', 'the form keeps its After sending and email settings', 'Booking received' === st.done_heading && 'Book another tour' === st.done_again && 'html' === st.email_style && /Inverness/.test( st.email_footer ) && true === st.done_ref_box, JSON.stringify( st ).slice( 0, 400 ) );
		const other = seed( 'collection', { definition: { label: 'Gear rental', singular: 'Rental', fields: [ { type: 'text', key: 'gear_item', label: 'Gear item' } ] } } );

		// ------------------------------------------------------------ the site
		const formPage = page( 'Book the Highland tour', [ box( 'fp', [ { id: 'ffcanvas', elType: 'widget', widgetType: 'rfb-form-canvas', settings: { form: slug }, elements: [] } ] ) ] );
		const site = await ctx.newPage();
		site.on( 'pageerror', ( e ) => errors.push( 'site: ' + e.message ) );
		await site.goto( formPage.url, { waitUntil: 'load' } );
		await sleep( 800 );
		const next = () => site.locator( 'form[data-rfb-form] button:visible', { hasText: /^\s*Next\s*$/ } ).first().click();
		const current = () => site.evaluate( () => [ ...document.querySelectorAll( '.rfb-steps-side li' ) ].findIndex( ( li ) => li.classList.contains( 'is-current' ) ) );
		await next();
		await sleep( 400 );
		const r1 = await site.evaluate( () => ( { vehicle: document.querySelector( 'input[name="values[vehicle]"]' ).validationMessage, extras: document.querySelector( 'input[name="values[extras][]"]' ).validationMessage } ) );
		check( 'required', 'site: Next with no vehicle picked stays on step 1 and says why', 0 === await current() && '' !== r1.vehicle, JSON.stringify( r1 ) );
		await site.check( 'input[name="values[vehicle]"][value="car"]' );
		await next();
		await sleep( 400 );
		const r2 = await site.evaluate( () => document.querySelector( 'input[name="values[extras][]"]' ).validationMessage );
		check( 'required', 'site: a required tick-box list with none ticked still stops Next ("Please choose at least one.")', 0 === await current() && /at least one/.test( r2 ), r2 );
		await site.check( 'input[name="values[extras][]"][value="guide"]' );
		await next();
		await sleep( 500 );
		check( 'required', 'site: with both answered, Next goes on to step 2', 1 === await current() );
		const deskName = await site.evaluate( () => { const r = document.querySelector( '.rfb-name-row' ); const f = r.querySelector( '.rfb-name-first' ).getBoundingClientRect(); const l = r.querySelector( '.rfb-name-last' ).getBoundingClientRect(); return { row: r.getBoundingClientRect().width, first: f.width, same: Math.round( f.top ) === Math.round( l.top ) }; } );
		check( 'name', 'site, desktop: first name 60% beside last name', deskName.same && Math.abs( deskName.first - ( ( deskName.row * 0.6 ) - 8 ) ) <= 2, JSON.stringify( deskName ) );
		await site.fill( 'input[name="values[name][first]"]', 'Morag' );
		await site.fill( 'input[name="values[name][last]"]', 'Fraser' );
		await site.fill( 'input[name="values[email]"]', 'morag@example.com' );
		await Promise.all( [ site.waitForURL( /rfb_done=/, { timeout: 60000 } ), site.locator( 'form[data-rfb-form] button[type=submit]:visible' ).first().click() ] );
		await sleep( 600 );
		const done = await site.evaluate( () => {
			const b = document.querySelector( '.rfb-done' );
			return b && { heading: b.querySelector( '.rfb-done__heading' )?.textContent, ref: b.querySelector( '.rfb-done__ref .rfb-reference' )?.textContent || '', note: b.querySelector( '.rfb-done__ref-note' )?.textContent, again: b.querySelector( '.rfb-done__again' )?.textContent, copy: !! b.querySelector( '.rfb-done__copy' ) };
		} );
		check( 'after sending', 'site: Booking received, the reference in its box with Copy and the note, "Book another tour"', done && 'Booking received' === done.heading && /^HT-\d{6}-\d{4}$/.test( done.ref ) && 'Quote it when you call us.' === done.note && 'Book another tour' === done.again && done.copy, JSON.stringify( done ) );
		await site.locator( '.rfb-done' ).screenshot( { path: join( SHOTS, 'site-after-sending.png' ) } );
		const ref = done ? done.ref : '';

		// Phone: the sidebar row with the phone settings; the name boxes one under the other.
		const phone = await browser.newContext( { viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 } );
		const m = await phone.newPage();
		await m.goto( formPage.url, { waitUntil: 'load' } );
		await sleep( 800 );
		const ms = await m.evaluate( () => { const nav = document.querySelector( '.rfb-steps-side' ); const items = [ ...nav.querySelectorAll( 'li' ) ]; return { bg: getComputedStyle( nav ).backgroundColor, titles: items.map( ( li ) => getComputedStyle( li.querySelector( '.rfb-side-text' ) ).display ), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; } );
		check( 'steps on phones', 'site, phone: the sidebar row has its phone background and "numbers" layout, no sideways scrolling', 'rgb(18, 52, 90)' === ms.bg && 'none' !== ms.titles[ 0 ] && 'none' === ms.titles[ 1 ] && ms.overflow <= 1, JSON.stringify( ms ) );
		await m.screenshot( { path: join( SHOTS, 'site-phone.png' ) } );
		await phone.close();

		// ------------------------------------------------------------ Form Canvas shows the confirmation in the editor
		await ed.goto( `${ BASE }/wp-admin/post.php?post=${ formPage.id }&action=refraction`, { timeout: 120000 } );
		await editorReady( ed );
		await sleep( 3000 );
		await ed.evaluate( () => {
			const c = refraction.getContainer( 'ffcanvas' );
			$e.run( 'panel/editor/open', { model: c.model, view: c.view } );
			$e.run( 'document/elements/settings', { container: c, settings: { done_preview: 'yes' } } );
		} );
		await sleep( 2500 );
		frame = previewFrame( ed );
		const pre = await frame.evaluate( () => { const b = document.querySelector( '.refraction-element-ffcanvas .rfb-done' ); return b && { heading: b.querySelector( '.rfb-done__heading' )?.textContent, ref: b.querySelector( '.rfb-reference' )?.textContent, form: !! document.querySelector( '.refraction-element-ffcanvas form' ) }; } );
		check( 'after sending', 'Edit Mode: "Show the message after sending" shows it in place of the form, with a sample reference', pre && 'Booking received' === pre.heading && /^HT-\d{6}-4821$/.test( pre.ref ) && ! pre.form, JSON.stringify( pre ) );
		await ed.evaluate( () => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'ffcanvas' ), settings: { done_accent: '#E20A17', done_ref_bg: '#FFF1F1', done_align: 'flex-start', done_ref_color: '#0B3D2E' } } ) );
		await sleep( 1200 );
		const styled = await frame.evaluate( () => { const b = document.querySelector( '.refraction-element-ffcanvas .rfb-done' ); return { icon: getComputedStyle( b.querySelector( '.rfb-done__icon' ) ).color, ref: getComputedStyle( b.querySelector( '.rfb-done__ref' ) ).backgroundColor, align: getComputedStyle( b ).alignItems, num: getComputedStyle( b.querySelector( '.rfb-reference' ) ).color }; } );
		check( 'after sending', 'Edit Mode: its Style tab changes it at once (accent, reference box, alignment, number color)', 'rgb(226, 10, 23)' === styled.icon && 'rgb(255, 241, 241)' === styled.ref && 'flex-start' === styled.align && 'rgb(11, 61, 46)' === styled.num, JSON.stringify( styled ) );
		await frame.locator( '.refraction-element-ffcanvas .rfb-done' ).screenshot( { path: join( SHOTS, 'editor-after-sending.png' ) } ).catch( () => {} );

		// ------------------------------------------------------------ Records Table
		const tablePage = page( 'Tour bookings', [ box( 'tb', [ { id: 'fftable', elType: 'widget', widgetType: 'refraction-records-table', settings: { collection: slug, access: 'admins', columns: [ { _id: 'c1', col_label: 'Reference', col_type: 'reference', col_field: '' }, { _id: 'c2', col_label: 'Ref no.', col_type: 'text', col_field: '_reference' } ] }, elements: [] } ] ) ] );
		const t = await ctx.newPage();
		await t.goto( tablePage.url, { waitUntil: 'load' } );
		await sleep( 1500 );
		const cells = await t.evaluate( () => [ ...document.querySelectorAll( '.rf-rt tbody tr:first-child td, [class*="rf-rt"] tbody tr:first-child td' ) ].map( ( td ) => td.textContent.trim() ) );
		check( 'records table', 'the Reference column and a "Reference number" column show the booking\'s reference', !! ref && cells.some( ( c ) => c.startsWith( ref ) ) && cells.includes( ref ), JSON.stringify( cells ) );
		const found = seed( 'latest', { collection: slug } );
		const searched = JSON.parse( wp( [ 'eval', `$m = \\Refraction\\Plugin::$instance->modules_manager->get_modules( 'form-builder' ); $d = $m->get_collections()->get( '${ slug }' ); $r = $m->get_records()->query( $d, [ 'search' => '${ ref.toLowerCase() }' ] ); echo wp_json_encode( [ 'total' => $r['total'], 'ref' => $r['items'][0]['reference'] ?? '' ] );` ] ) );
		check( 'records table', 'a reference typed in the search finds its record', 1 === searched.total && ref === searched.ref && !! found.record, JSON.stringify( searched ) );

		await ed.goto( `${ BASE }/wp-admin/post.php?post=${ tablePage.id }&action=refraction`, { timeout: 120000 } );
		await editorReady( ed );
		await sleep( 3000 );
		await ed.evaluate( () => { const c = refraction.getContainer( 'fftable' ); $e.run( 'panel/editor/open', { model: c.model, view: c.view } ); } );
		await sleep( 1500 );
		const options = ( setting ) => ed.evaluate( ( name ) => {
			const select = document.querySelector( `select[data-setting="${ name }"]` );
			return select ? [ ...select.options ].filter( ( o ) => ! o.hidden ).map( ( o ) => `${ o.value }=${ o.textContent.trim() }` ) : null;
		}, setting );
		const sortBy = await options( 'orderby' );
		check( 'records table', 'Edit Mode: with "Highland tour" chosen, Sort by lists only its fields, by their own names', sortBy && sortBy.includes( 'name=Name' ) && sortBy.includes( 'vehicle=Vehicle Option' ) && ! sortBy.some( ( o ) => o.startsWith( 'gear_item' ) ) && sortBy.includes( '_reference=Reference number' ), JSON.stringify( sortBy ) );
		await ed.evaluate( () => { const s = document.querySelector( '.refraction-control-section_columns' ); if ( s && ! s.classList.contains( 'e-open' ) ) { s.querySelector( '.refraction-panel-heading' ).click(); } } );
		await sleep( 800 );
		await ed.locator( '.refraction-control-columns .refraction-repeater-row-item-title' ).first().click();
		await sleep( 800 );
		const colField = await options( 'col_field' );
		check( 'records table', 'Edit Mode: a column\'s Field lists only the chosen collection\'s fields', colField && colField.includes( 'email=Email' ) && ! colField.some( ( o ) => o.startsWith( 'gear_item' ) ), JSON.stringify( colField ) );
		await ed.evaluate( ( s ) => $e.run( 'document/elements/settings', { container: refraction.getContainer( 'fftable' ), settings: { collection: s } } ), other.slug );
		await sleep( 800 );
		const switched = await options( 'col_field' );
		check( 'records table', 'Edit Mode: choosing another collection switches the lists to its fields', switched && switched.includes( 'gear_item=Gear item' ) && ! switched.some( ( o ) => o.startsWith( 'vehicle=' ) ), JSON.stringify( switched ) );
		await ed.locator( '#refraction-panel' ).screenshot( { path: join( SHOTS, 'editor-records-fields.png' ) } ).catch( () => {} );

		check( 'site', 'no JavaScript errors', ! errors.length, errors.slice( 0, 4 ).join( ' | ' ) );
		const php = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Fatal|Warning|Parse|Deprecated)/.test( l ) );
		check( 'site', 'no PHP errors', ! php.length, php.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
