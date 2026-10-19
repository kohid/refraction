#!/usr/bin/env node
/**
 * Admin/editor entry-point parity check (browser). Complements check-admin-menu.mjs.
 *
 * Usage: node scripts/check-admin-ui.mjs [--site /tmp/refraction-site] [--port 8766] [--shots /tmp/refraction-shots] [--role admin|editor|all]
 *                                        [--wpcli /tmp/rsite-dl/wpcli.phar] [--out results.json]
 * Prepare the site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). The site must already be served on --port
 * (e.g. `cd <site>/wordpress && php -S 127.0.0.1:<port>` with PHP_CLI_SERVER_WORKERS=4).
 *
 * Covers, as administrator and as editor: Settings tabs (click, hash, only one panel visible, no scroll jump, no JS errors,
 * deep link, save + persisted value + saved notice), Tools tabs, Plugins screen link, Home "Create new page", Saved Templates
 * list/add/import/export, Pages list row action + post state, classic editor button, block editor toolbar button, frontend admin
 * bar link, and opening the editor from each entry point (panel, widgets, save, frontend render).
 * Every check records ok/fail with evidence; the process exits 1 on any failure.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/refraction-site' );
const PORT = arg( 'port', '8766' );
const SHOTS = arg( 'shots', '/tmp/refraction-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const ROLES = arg( 'role', 'all' );
const OUT = arg( 'out', join( SHOTS, 'ui-results.json' ) );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

const results = [];
const check = ( role, area, name, pass, evidence = '' ) => {
	results.push( { role, area, name, pass: !! pass, evidence: String( evidence ).slice( 0, 400 ) } );
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  [${ role }] ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 200 ) }` }` );
};

const wpTry = ( ...a ) => { try { return wp( ...a ); } catch { return ''; } };
const wp = ( ...a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...a ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();

function chromePath() {
	if ( process.env.CHROMIUM ) { return process.env.CHROMIUM; }
	const root = '/opt/pw-browsers';
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const s of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, s ) ) ) { return join( root, d, s ); }
		}
	}
	return undefined;
}

const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logSince = ( n ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( n ).trim() : '' );
const visiblePanels = ( page, sel ) => page.evaluate( ( s ) => [ ...document.querySelectorAll( s ) ].filter( ( e ) => getComputedStyle( e ).display !== 'none' ).map( ( e ) => e.id ), sel );

async function login( browser, user ) {
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
	const page = await ctx.newPage();
	const errors = [];
	page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /favicon\.ico/.test( m.location().url ) ) { errors.push( `${ m.text() } @ ${ m.location().url }` ); } } );
	page.on( 'pageerror', ( e ) => { if ( ! /Transition was skipped|reading 'hasClass'/.test( e.message ) ) { errors.push( `pageerror ${ e.message }` ); } } ); // WordPress core noise, not ours: a view-transition notice, and wp-auth-check.js reading its dialog before the editor page prints it (also on upstream)
	page.on( 'response', ( r ) => { if ( r.status() >= 400 && ! /favicon\.ico/.test( r.url() ) ) { errors.push( `HTTP ${ r.status() } ${ r.url() }` ); } } );
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', user );
	await Promise.all( [ page.waitForURL( /wp-admin/, { waitUntil: 'commit' } ), page.click( '#wp-submit' ) ] );
	return { ctx, page, errors };
}

async function closeGutenbergModals( page ) {
	// The block editor may open its welcome guide / pattern chooser over the toolbar (a moment after load); a user closes it first.
	await page.waitForTimeout( 2500 );
	for ( let i = 0; i < 3 && await page.locator( '.components-modal__frame' ).count(); i++ ) {
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 400 );
	}
}

async function waitEditor( page ) {
	await page.waitForFunction( () => window.refraction?.documents?.getCurrent?.() && document.querySelector( '#refraction-panel' ), null, { timeout: 60000 } );
	await page.waitForTimeout( 1500 );
}

async function admin( browser ) {
	const role = 'admin';
	const { ctx, page, errors } = await login( browser, 'admin' );
	const errs = () => errors.splice( 0 ).join( ' | ' );

	// --- Plugins screen
	await page.goto( `${ BASE }/wp-admin/plugins.php` );
	const links = await page.evaluate( () => [ ...document.querySelectorAll( 'tr[data-plugin="refraction/refraction.php"] .row-actions a' ) ].map( ( a ) => `${ a.textContent.trim() }=${ a.getAttribute( 'href' ) }` ) );
	check( role, 'Plugins screen', 'Settings action link', links.some( ( l ) => /^Settings=.*page=refraction-settings/.test( l ) ), links.join( ' ; ' ) );
	errs();

	// --- Settings tabs
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings` );
	for ( const id of [ 'integrations', 'advanced', 'performance', 'experiments', 'general' ] ) {
		const y0 = await page.evaluate( () => scrollY );
		await page.click( `#refraction-settings-tab-${ id }` );
		await page.waitForTimeout( 250 );
		const hash = await page.evaluate( () => location.hash );
		const panels = await visiblePanels( page, '[id^="tab-"]' );
		const y1 = await page.evaluate( () => scrollY );
		const active = await page.evaluate( () => [ ...document.querySelectorAll( '#refraction-settings-tabs-wrapper .nav-tab-active' ) ].map( ( a ) => a.id ) );
		check( role, 'Settings tabs', `click ${ id }`, hash === `#tab-${ id }` && panels.length === 1 && panels[ 0 ] === `tab-${ id }` && y1 === y0 && active.length === 1, `hash=${ hash } panels=${ panels } scroll ${ y0 }->${ y1 } active=${ active }` );
	}
	check( role, 'Settings tabs', 'no JS errors while switching', ! errors.length, errs() );
	await page.goto( `${ BASE }/wp-admin/index.php` );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings#tab-advanced` );
	await page.waitForTimeout( 400 );
	check( role, 'Settings tabs', 'deep link #tab-advanced opens Advanced', ( await visiblePanels( page, '[id^="tab-"]' ) ).join() === 'tab-advanced' );
	await page.screenshot( { path: join( SHOTS, 'settings-advanced.png' ) } );

	// --- Settings save
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings` );
	await page.click( '#refraction-settings-tab-general' );
	errs();
	const box = page.locator( 'input[name="refraction_disable_color_schemes"]' );
	const was = await box.isChecked();
	if ( was ) { await box.uncheck(); } else { await box.check(); }
	await Promise.all( [ page.waitForLoadState( 'load' ), page.click( '#refraction-settings-form input[type=submit]' ) ] );
	await page.waitForTimeout( 600 );
	const stored = wp( 'option', 'get', 'refraction_disable_color_schemes' ).trim();
	check( role, 'Settings save', 'value persisted', ( stored === 'yes' ) === ! was, `stored=${ stored } was=${ was }` );
	check( role, 'Settings save', 'saved notice shown', await page.locator( '.notice-success, #setting-error-settings_updated' ).count() > 0, 'no notice element' );
	check( role, 'Settings save', 'stays on General tab', ( await visiblePanels( page, '[id^="tab-"]' ) ).join() === 'tab-general' );
	check( role, 'Settings save', 'no JS errors on submit', ! errors.length, errs() );
	await page.screenshot( { path: join( SHOTS, 'settings-saved.png' ) } );
	wp( 'option', 'update', 'refraction_disable_color_schemes', was ? 'yes' : '' );

	// --- Tools tabs
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-tools` );
	const toolTabs = await page.evaluate( () => [ ...document.querySelectorAll( '#refraction-settings-tabs-wrapper a' ) ].map( ( a ) => a.id.replace( 'refraction-settings-tab-', '' ) ) );
	check( role, 'Tools tabs', 'tabs listed', toolTabs.length >= 3, toolTabs.join() );
	for ( const id of toolTabs ) {
		await page.click( `#refraction-settings-tab-${ id }` );
		await page.waitForTimeout( 250 );
		const panels = await visiblePanels( page, '[id^="tab-"]' );
		check( role, 'Tools tabs', `click ${ id }`, panels.join() === `tab-${ id }`, panels.join() );
	}
	check( role, 'Tools tabs', 'no JS errors', ! errors.length, errs() );
	await page.click( '#refraction-settings-tab-general' );
	const [ clearResp ] = await Promise.all( [ page.waitForResponse( ( r ) => /admin-ajax\.php/.test( r.url() ), { timeout: 15000 } ).catch( () => null ), page.click( '#refraction-clear-cache-button' ) ] );
	check( role, 'Tools', 'Clear Files & Data ajax', clearResp && clearResp.status() === 200 && ( await clearResp.text() ).includes( '"success":true' ), clearResp ? await clearResp.text() : 'no ajax request' );
	errs();

	// --- Home: create new page lands in the Refraction editor
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-home` );
	await page.click( 'text=Create new page' );
	await page.waitForLoadState( 'load' );
	let landed = page.url();
	let editorOk = true;
	try { await waitEditor( page ); } catch { editorOk = false; }
	check( role, 'Create new page', 'Home button opens the Refraction editor', /action=refraction/.test( landed ) && editorOk, landed );
	const newId = ( landed.match( /post=(\d+)/ ) || [] )[ 1 ];
	if ( newId && editorOk ) {
		await page.screenshot( { path: join( SHOTS, 'create-new-page-editor.png' ) } );
		errs();
	}

	// --- Saved templates
	const tplId = wp( 'post', 'create', '--post_type=refraction_library', '--post_status=publish', '--post_title=UI Check Template', '--porcelain' );
	wp( 'post', 'meta', 'update', tplId, '_refraction_template_type', 'page' );
	wp( 'post', 'meta', 'update', tplId, '_refraction_edit_mode', 'builder' );
	wp( 'post', 'meta', 'update', tplId, '_refraction_data', '[{"id":"a1b2c3d","elType":"container","settings":[],"elements":[{"id":"e4f5a6b","elType":"widget","settings":{"title":"Template Heading"},"elements":[],"widgetType":"heading"}],"isInner":false}]' );
	wpTry( 'term', 'create', 'refraction_library_type', 'page', '--slug=page' );
	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_library` );
	check( role, 'Templates', 'Saved Templates list', await page.locator( '#the-list' ).count() === 1, await page.title() );
	check( role, 'Templates', 'Import Templates button', await page.locator( '#refraction-import-template-trigger' ).count() === 1 );
	await page.locator( '#refraction-import-template-trigger' ).click().catch( () => {} );
	check( role, 'Templates', 'import area opens', await page.locator( '#refraction-import-template-area' ).isVisible().catch( () => false ) );
	const exportHref = await page.evaluate( ( id ) => [ ...document.querySelectorAll( `#post-${ id } a` ) ].find( ( a ) => /export_template/.test( a.href ) )?.href, tplId );
	if ( exportHref ) {
		const r = await page.request.get( exportHref );
		const body = await r.text();
		check( role, 'Templates', 'export template download', r.status() === 200 && body.includes( 'Template Heading' ), `${ r.status() } ${ r.headers()[ 'content-type' ] } ${ body.slice( 0, 80 ) }` );
	} else { check( role, 'Templates', 'export template download', false, 'no export link in list' ); }
	await page.locator( 'a.page-title-action[href*="post-new.php?post_type=refraction_library"]' ).click();
	await page.waitForTimeout( 800 );
	check( role, 'Templates', 'Add New Template opens the template-type dialog', await page.locator( '#refraction-new-template__form' ).isVisible().catch( () => false ) );
	await page.selectOption( '#refraction-new-template__form__template-type', 'page' ).catch( () => {} );
	await page.fill( '#refraction-new-template__form__post-title', 'UI Check New Template' ).catch( () => {} );
	await page.click( '#refraction-new-template__form__submit' ).catch( () => {} );
	let okT = true; try { await page.waitForURL( /action=refraction/, { timeout: 20000 } ); await waitEditor( page ); } catch { okT = false; }
	check( role, 'Templates', 'creating a template opens the editor', okT, page.url() );
	errs();
	// local template library inside the editor: insert the saved template
	await page.goto( `${ BASE }/wp-admin/post.php?post=${ wp( 'post', 'create', '--post_type=page', '--post_title=UI Library Page', '--porcelain' ) }&action=refraction` );
	await waitEditor( page );
	await page.evaluate( () => $e.run( 'library/open' ) ).catch( () => {} );
	await page.waitForTimeout( 2500 );
	const libOpen = await page.locator( '#refraction-template-library-modal .refraction-templates-modal__header' ).first().isVisible().catch( () => false );
	check( role, 'Editor', 'local template library opens', libOpen, '' );
	const card = page.locator( '.refraction-template-library-template-local', { hasText: 'UI Check Template' } ).first();
	check( role, 'Editor', 'library lists the saved template', await card.isVisible().catch( () => false ), '' );
	await page.screenshot( { path: join( SHOTS, 'editor-library.png' ) } );
	await card.locator( '.refraction-template-library-template-insert' ).click().catch( () => {} );
	await page.waitForTimeout( 2500 );
	check( role, 'Editor', 'inserting a saved template adds its elements', ( await page.evaluate( () => refraction.getPreviewContainer().children.length ) ) > 0, '' );
	check( role, 'Editor', 'no JS errors opening the library/inserting', ! errors.length, errs() );
	// Save the current page as a local template from the app bar (Publish > Save Options > Save as Template)
	await page.evaluate( () => $e.run( 'library/close' ) ).catch( () => {} );
	await page.click( 'button[aria-label="Save Options"]' ).catch( () => {} );
	await page.getByText( 'Save as Template' ).click().catch( () => {} );
	await page.fill( '#refraction-template-library-save-template-name', 'Saved From Check' ).catch( () => {} );
	await page.click( '#refraction-template-library-save-template-submit' ).catch( () => {} );
	await page.waitForTimeout( 3000 );
	const savedListed = ( await page.locator( '#refraction-template-library-modal' ).innerText().catch( () => '' ) ).includes( 'Saved From Check' );
	check( role, 'Editor', 'Save as Template (app bar) stores a local template and lists it', savedListed && wpTry( 'post', 'list', '--post_type=refraction_library', '--s=Saved From Check', '--format=count' ) !== '0', '' );
	await page.screenshot( { path: join( SHOTS, 'editor-save-template.png' ) } );
	check( role, 'Editor', 'no JS errors in template library', ! errors.length, errs() );
	// Add New via the legacy admin-bar / Home URL (post-new.php) must lead to the template-type dialog too
	await page.goto( `${ BASE }/wp-admin/post-new.php?post_type=refraction_library` );
	await page.waitForTimeout( 1500 );
	check( role, 'Templates', 'post-new.php?post_type=refraction_library (admin bar + New > Template) opens the dialog', await page.locator( '#refraction-new-template__form' ).isVisible().catch( () => false ), page.url() );
	errs();

	// --- Floating elements, role manager, system info
	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=e-floating-buttons` );
	check( role, 'Floating Elements', 'list loads', await page.locator( '#the-list, .wrap' ).count() > 0, await page.title() );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-role-manager` );
	check( role, 'Role Manager', 'form with role checkboxes', await page.locator( 'form input[type=checkbox]' ).count() > 0, await page.title() );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-system-info` );
	check( role, 'System Info', 'reports render', await page.locator( '#refraction-system-info, .refraction-system-info, .refraction-system-info-report' ).count() > 0 || ( await page.content() ).includes( 'Server Environment' ), await page.title() );
	check( role, 'Admin pages', 'no JS errors on Floating/Role/System pages', ! errors.length, errs() );

	// --- Floating Elements: Add New dialog creates one and opens the editor
	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=e-floating-buttons` );
	await page.locator( 'a.page-title-action' ).first().click();
	await page.waitForTimeout( 800 );
	const feBtn = page.getByRole( 'button', { name: 'Create Floating Element' } );
	check( role, 'Floating Elements', 'Add New opens the Floating Element dialog', await feBtn.isVisible().catch( () => false ), '' );
	await feBtn.click().catch( () => {} );
	let okFe = true; try { await page.waitForURL( /action=refraction/, { timeout: 30000 } ); await waitEditor( page ); } catch { okFe = false; }
	check( role, 'Floating Elements', 'creating one opens the editor', okFe, page.url() );
	errs();

	// --- Tools: Maintenance Mode saves and applies to visitors; Replace URL runs
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-tools` );
	await page.click( '#refraction-settings-tab-maintenance_mode' );
	await page.selectOption( 'select[name="refraction_maintenance_mode_mode"]', 'coming_soon' );
	await page.selectOption( 'select[name="refraction_maintenance_mode_template_id"]', tplId ).catch( () => {} );
	await Promise.all( [ page.waitForLoadState( 'load' ), page.click( '#refraction-settings-form input[type=submit]' ) ] );
	const mmStored = wpTry( 'option', 'get', 'refraction_maintenance_mode_mode' );
	check( role, 'Maintenance Mode', 'mode saves', mmStored === 'coming_soon', mmStored );
	const visitor = await fetch( `${ BASE }/?p=1` , { redirect: 'manual' } );
	const visitorBody = await visitor.text();
	check( role, 'Maintenance Mode', 'visitors get the coming soon response (HTTP 200 + noindex, or 503)', ( visitor.status === 503 || /coming soon|maintenance|will be back/i.test( visitorBody ) || /noindex/i.test( visitorBody + ( visitor.headers.get( 'x-robots-tag' ) || '' ) ) ), `${ visitor.status } ${ visitorBody.replace( /<[^>]+>/g, ' ' ).replace( /\s+/g, ' ' ).slice( 0, 80 ) }` );
	wpTry( 'option', 'update', 'refraction_maintenance_mode_mode', '' );
	check( role, 'Maintenance Mode', 'no JS errors', ! errors.length, errs() );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-tools` );
	await page.click( '#refraction-settings-tab-replace_url' );
	await page.fill( 'input[name="from"]', 'http://old.parity.invalid' );
	await page.fill( 'input[name="to"]', 'http://new.parity.invalid' );
	const [ ruResp ] = await Promise.all( [ page.waitForResponse( ( r ) => /admin-ajax\.php/.test( r.url() ), { timeout: 20000 } ).catch( () => null ), page.click( '#refraction-replace-url-button' ) ] );
	check( role, 'Tools', 'Replace URL ajax', ruResp && ( await ruResp.text() ).includes( '"success":true' ), ruResp ? ( await ruResp.text() ).slice( 0, 120 ) : 'no request' );
	errs();

	// --- Role Manager saves
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-role-manager` );
	await page.locator( 'form' ).getByText( 'Editor', { exact: true } ).first().click(); // expand the accordion
	const rmBox = page.locator( 'input[name="refraction_role-manager[editor][]"]' ).first();
	const rmWas = await rmBox.isChecked();
	if ( rmWas ) { await rmBox.uncheck(); } else { await rmBox.check(); }
	await Promise.all( [ page.waitForLoadState( 'load' ), page.click( 'form input[type=submit]' ) ] );
	const rmNow = await page.locator( 'input[name="refraction_role-manager[editor][]"]' ).first().evaluate( ( e ) => e.checked );
	check( role, 'Role Manager', 'change saves and persists', rmNow !== rmWas, `was ${ rmWas } now ${ rmNow }` );
	await page.locator( 'input[name="refraction_role-manager[editor][]"]' ).first().evaluate( ( e, v ) => { e.checked = v; }, rmWas );
	await Promise.all( [ page.waitForLoadState( 'load' ), page.click( 'form input[type=submit]' ) ] );
	check( role, 'Role Manager', 'no JS errors', ! errors.length, errs() );

	// --- Element Manager
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-element-manager` );
	await page.waitForSelector( '#refraction-element-manager-wrap tbody tr', { timeout: 20000 } ).catch( () => {} );
	check( role, 'Element Manager', 'lists the elements', await page.locator( '#refraction-element-manager-wrap tbody tr' ).count() > 10, await page.title() );
	check( role, 'Element Manager', 'no upgrade prompts', ! /upgrade|go pro/i.test( await page.locator( '#refraction-element-manager-wrap' ).innerText().catch( () => '' ) ), '' );
	check( role, 'Element Manager', 'no JS errors', ! errors.length, errs() );

	// --- Website templates (kit) export and import app, opened from Tools > Website Templates
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-tools#tab-import-export-kit` );
	await page.reload();
	const kitLinks = await page.evaluate( () => [ ...document.querySelectorAll( '#tab-import-export-kit a' ) ].map( ( a ) => a.href ).filter( ( h ) => /refraction-app/.test( h ) ) );
	check( role, 'Website Templates', 'Tools tab links to the export and import app', kitLinks.length >= 2, kitLinks.join( ' ' ) );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-app#/export-customization` );
	await page.reload();
	await page.waitForSelector( '[data-testid="export-kit-footer-export-zip-button"]', { timeout: 20000 } ).catch( () => {} );
	check( role, 'Website Templates', 'export screen renders without upgrade prompts', await page.locator( '[data-testid="export-kit-footer-export-zip-button"]' ).count() === 1 && ! /Upgrade/.test( await page.locator( 'body' ).innerText() ), '' );
	await page.fill( 'input[placeholder="Type name here..."]', 'Parity Kit' ).catch( () => {} );
	const [ download ] = await Promise.all( [ page.waitForEvent( 'download', { timeout: 60000 } ).catch( () => null ), page.click( '[data-testid="export-kit-footer-export-zip-button"]' ).catch( () => {} ) ] );
	const kitPath = join( SHOTS, 'parity-kit.zip' );
	if ( download ) { await download.saveAs( kitPath ); }
	check( role, 'Website Templates', 'export downloads a .zip', !! download && existsSync( kitPath ) && statSync( kitPath ).size > 1000, download ? `${ download.suggestedFilename() } ${ existsSync( kitPath ) ? statSync( kitPath ).size : 0 } bytes` : 'no download' );
	check( role, 'Website Templates', 'no JS errors during export', ! errors.length, errs() );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-app#/import-customization` );
	await page.reload();
	await page.waitForSelector( 'input[type=file]', { state: 'attached', timeout: 20000 } ).catch( () => {} );
	let importOk = false;
	if ( download ) {
		await page.setInputFiles( 'input[type=file]', kitPath ).catch( () => {} );
		importOk = await page.waitForFunction( () => /What.s included|Import (content|plugins)|Select which|Apply|Import now/i.test( document.body.innerText ) && ! /Click to upload/.test( document.body.innerText ), null, { timeout: 30000 } ).then( () => true ).catch( () => false );
	}
	check( role, 'Website Templates', 'importing the exported .zip reaches the selection step', importOk, ( await page.locator( 'body' ).innerText().catch( () => '' ) ).replace( /\s+/g, ' ' ).slice( 0, 120 ) );
	await page.screenshot( { path: join( SHOTS, 'kit-import.png' ) } );
	check( role, 'Website Templates', 'no JS errors during import', ! errors.length, errs() );

	// --- Pages list + post state (page built through the editor)
	const builtId = wp( 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=UI Check Page', '--porcelain' );
	await page.goto( `${ BASE }/wp-admin/post.php?post=${ builtId }&action=refraction` );
	await waitEditor( page );
	const saved = await page.evaluate( async () => {
		const c = $e.run( 'document/elements/create', { container: refraction.getPreviewContainer(), model: { elType: 'container' }, options: { edit: false } } );
		$e.run( 'document/elements/create', { container: c, model: { elType: 'widget', widgetType: 'heading', settings: { title: 'UI Check Heading' } }, options: { edit: false } } );
		await $e.run( 'document/save/default' );
		return true;
	} );
	await page.waitForTimeout( 2000 );
	check( role, 'Editor', 'widget panel + add elements + save', saved && ( await page.evaluate( () => Object.keys( refraction.widgetsCache || {} ).length ) ) > 30, `widgets ${ await page.evaluate( () => Object.keys( refraction.widgetsCache || {} ).length ) }` );
	check( role, 'Editor', 'no JS errors while editing/saving', ! errors.length, errs() );
	await page.screenshot( { path: join( SHOTS, 'editor-built.png' ) } );

	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=page&s=UI+Check+Page` );
	const row = await page.evaluate( ( id ) => {
		const r = document.querySelector( `#post-${ id }` );
		return r ? { actions: [ ...r.querySelectorAll( '.row-actions a' ) ].map( ( a ) => a.textContent.trim() ), states: [ ...r.querySelectorAll( '.post-state' ) ].map( ( s ) => s.textContent.trim() ) } : null;
	}, builtId );
	check( role, 'Pages list', 'row action "Edit with Refraction" on a Refraction page', row?.actions.includes( 'Edit with Refraction' ), JSON.stringify( row ) );
	check( role, 'Pages list', 'post state "Refraction" on a Refraction page', row?.states.includes( 'Refraction' ), JSON.stringify( row ) );
	await page.screenshot( { path: join( SHOTS, 'pages-list.png' ) } );
	// A plain (never built) page also gets the row action, so the editor is reachable from the Pages screen.
	const plainRowId = wp( 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=UI Plain Row', '--porcelain' );
	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=page&s=UI+Plain+Row` );
	const plainActions = await page.evaluate( ( id ) => [ ...document.querySelectorAll( `#post-${ id } .row-actions a` ) ].map( ( a ) => ( { t: a.textContent.trim(), h: a.href } ) ), plainRowId );
	const plainLink = plainActions.find( ( a ) => a.t === 'Edit with Refraction' );
	check( role, 'Pages list', 'row action "Edit with Refraction" on a plain page', !! plainLink, JSON.stringify( plainActions.map( ( a ) => a.t ) ) );
	if ( plainLink ) {
		await page.goto( plainLink.h );
		let okPlain = true; try { await waitEditor( page ); } catch { okPlain = false; }
		check( role, 'Pages list', 'plain page row action opens the editor', okPlain && /action=refraction/.test( page.url() ), page.url() );
		errs();
		await page.goto( `${ BASE }/wp-admin/edit.php?post_type=page&s=UI+Check+Page` );
	}
	const hrefRow = await page.evaluate( ( id ) => [ ...document.querySelectorAll( `#post-${ id } .row-actions a` ) ].find( ( a ) => /Edit with Refraction/.test( a.textContent ) )?.href, builtId );
	if ( hrefRow ) {
		await page.goto( hrefRow );
		let ok = true; try { await waitEditor( page ); } catch { ok = false; }
		check( role, 'Pages list', 'row action opens the editor', ok && /action=refraction/.test( page.url() ), page.url() );
		errs();
	}

	// --- Frontend: render + admin bar
	await page.goto( `${ BASE }/?page_id=${ builtId }` );
	await page.waitForTimeout( 1200 );
	check( role, 'Frontend', 'heading rendered', ( await page.locator( '.refraction-heading-title' ).first().textContent().catch( () => '' ) ).includes( 'UI Check Heading' ) );
	const bar = await page.evaluate( () => [ ...document.querySelectorAll( '#wpadminbar a' ) ].filter( ( a ) => /Edit with Refraction/.test( a.textContent ) ).map( ( a ) => a.href ) );
	check( role, 'Frontend', 'admin bar "Edit with Refraction"', bar.some( ( h ) => /action=refraction/.test( h ) ), bar.join() );
	check( role, 'Frontend', 'no JS errors', ! errors.length, errs() );

	// --- Classic editor entry (host plugin forces classic through an option)
	const plainA = wp( 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=UI Plain Classic', '--porcelain' );
	const plainB = wp( 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=UI Plain Block', '--porcelain' );
	wp( 'option', 'update', 'parity_classic', '1' );
	await page.goto( `${ BASE }/wp-admin/post.php?post=${ plainA }&action=edit` );
	check( role, 'Classic editor', '"Edit with Refraction" button under title', await page.locator( '#refraction-switch-mode-button' ).isVisible(), '' );
	await page.screenshot( { path: join( SHOTS, 'classic-editor.png' ) } );
	await page.click( '#refraction-switch-mode-button' );
	let ok2 = true; try { await waitEditor( page ); } catch { ok2 = false; }
	check( role, 'Classic editor', 'button opens the editor', ok2 && /action=refraction/.test( page.url() ), page.url() );
	wp( 'option', 'update', 'parity_classic', '0' );
	errs();

	// --- Block editor entry
	await page.goto( `${ BASE }/wp-admin/post.php?post=${ plainB }&action=edit` );
	await page.waitForSelector( '#refraction-switch-mode-button', { timeout: 20000 } ).catch( () => {} );
	check( role, 'Block editor', '"Edit with Refraction" toolbar button visible', await page.locator( '#refraction-switch-mode-button' ).isVisible().catch( () => false ), '' );
	await page.screenshot( { path: join( SHOTS, 'block-editor.png' ) } );
	await closeGutenbergModals( page );
	await page.locator( '#refraction-switch-mode-button' ).click().catch( () => {} );
	let ok3 = true; try { await page.waitForURL( /action=refraction/, { timeout: 45000 } ); await waitEditor( page ); } catch { ok3 = false; }
	check( role, 'Block editor', 'toolbar button opens the editor', ok3, page.url() );
	errs();
		await ctx.close();
}

async function editorRole( browser ) {
	const plainC = wp( 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=UI Plain Editor Role', '--porcelain' );
	const role = 'editor';
	const { ctx, page, errors } = await login( browser, 'editor' );
	const errs = () => errors.splice( 0 ).join( ' | ' );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings` );
	check( role, 'Settings', 'blocked for editors', /not allowed|permission/i.test( await page.content() ) );
	errs();
	await page.goto( `${ BASE }/wp-admin/post.php?post=${ plainC }&action=edit` );
	await page.waitForSelector( '#refraction-switch-mode-button', { timeout: 20000 } ).catch( () => {} );
	check( role, 'Block editor', 'toolbar button visible', await page.locator( '#refraction-switch-mode-button' ).isVisible().catch( () => false ) );
	await closeGutenbergModals( page );
	await page.locator( '#refraction-switch-mode-button' ).click().catch( () => {} );
	let ok = true; try { await page.waitForURL( /action=refraction/, { timeout: 45000 } ); await waitEditor( page ); } catch { ok = false; }
	if ( ! ok ) { await page.screenshot( { path: join( SHOTS, 'editor-role-block-fail.png' ) } ); }
	check( role, 'Block editor', 'button opens the editor', ok, page.url() );
	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=page` );
	check( role, 'Pages list', 'list loads', await page.locator( '#the-list' ).count() === 1 );
	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_library` );
	check( role, 'Templates', 'Saved Templates list', await page.locator( '#the-list' ).count() === 1 );
	check( role, 'All', 'no JS errors', ! errors.length, errs() );
	await ctx.close();
}

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );
	mkdirSync( join( WPDIR, 'wp-content/mu-plugins' ), { recursive: true } );
	writeFileSync( join( WPDIR, 'wp-content/mu-plugins/force-classic.php' ), "<?php\nadd_filter( 'use_block_editor_for_post', function ( $use ) { return get_option( 'parity_classic' ) ? false : $use; }, 100 );\n" );
	// Remove pages/templates left by earlier runs so list screens stay small.
	for ( const type of [ 'page', 'refraction_library' ] ) {
		const ids = wpTry( 'post', 'list', `--post_type=${ type }`, '--s=UI ', '--format=ids' );
		if ( ids ) { wpTry( 'post', 'delete', ...ids.split( /\s+/ ), '--force' ); }
	}
	const before = logSize();
	const browser = await chromium.launch( { executablePath: chromePath(), args: [ '--no-sandbox' ] } );
	try {
		if ( 'all' === ROLES || 'admin' === ROLES ) { await admin( browser ); }
		if ( 'all' === ROLES || 'editor' === ROLES ) { await editorRole( browser ); }
	} finally { await browser.close(); }
	const log = logSince( before );
	check( 'all', 'PHP', 'no new debug.log entries', ! log, log.split( '\n' )[ 0 ] );
	writeFileSync( OUT, JSON.stringify( results, null, 2 ) );
	const failed = results.filter( ( r ) => ! r.pass );
	console.log( `\n${ results.length - failed.length }/${ results.length } checks passed; results in ${ OUT }` );
	process.exit( failed.length ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
