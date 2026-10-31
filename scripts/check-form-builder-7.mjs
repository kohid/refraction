#!/usr/bin/env node
/**
 * Form Builder part 7 check: free layout. Field widths (10% to 100%), the Columns block (10/90, 20/80...), choice cards with any content inside and
 * cards of different widths (3 on top, 4 below), the Icon List, and the Image style (alignment, width, fit), in the designer and on the
 * public form, on a real WordPress (SQLite test site, Chromium).
 *
 * Usage: node scripts/check-form-builder-7.mjs [--site /tmp/rf-fb7-site] [--port 8927] [--shots /tmp/fb7-shots]
 *                                              [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 * Prepare a FRESH site with scripts/setup-menu-test-site.sh (installs dist/refraction.zip). Throw-away site.
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
const SITE = arg( 'site', '/tmp/rf-fb7-site' );
const PORT = arg( 'port', '8927' );
const SHOTS = arg( 'shots', '/tmp/fb7-shots' );
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
	.filter( ( el ) => el.type !== 'hidden' && ! el.closest( 'template, [hidden], .rfb-hp, [aria-hidden=true], .rfb-cc-fields' ) && el.offsetParent !== null && ! el.closest( '.rfb-color-row, .rfb-range-row' ) )
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
add_filter( 'pre_wp_mail', function ( $null, $atts ) { return true; }, 10, 2 );
`;

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) { throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` ); }
	mkdirSync( SHOTS, { recursive: true } );

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

		const att = seed( 'attachment' );
		const card = ( key, label, width, extra = {} ) => Object.assign( { key, label, type: 'group', card_width: width, card_price: 10, card_subtitle: 'Sub ' + label, children: [
			{ key: key + '_inc', label: 'Included', type: 'icon_list', items: [ { text: 'Trim', icon: 'check' }, { text: 'File', icon: 'star' } ] },
		] }, extra );
		const def = {
			label: 'Layouts', singular: 'Layout', public_form: true, success_message: 'Thanks.',
			statuses: [ { label: 'New', color: 'primary' } ],
			settings: { hourly_limit: 0, min_seconds: 3 },
			fields: [
				{ key: 'name', label: 'Name', type: 'text', required: true, in_table: true, width: 'w20' },
				{ key: 'email', label: 'Email', type: 'email', width: 'w80' },
				{ key: 'split', label: 'Split', type: 'columns', col_gap: 20, children: [
					{ key: 'cl', label: 'Left', type: 'panel', width: 'w20', children: [ { key: 'logo', label: 'Logo', type: 'image', image_id: att.id, image_width: 50, image_align: 'right' } ] },
					{ key: 'cr', label: 'Right', type: 'panel', width: 'w80', children: [ { key: 'phone', label: 'Phone', type: 'phone' } ] },
				] },
				{ key: 'hero', label: 'Hero', type: 'image', image_id: att.id, image_width: 60, image_align: 'left', style: { im_align: 'right', im_width: 40, im_radius: 20, im_h_shadow: 'strong' } },
				{ key: 'perks', label: 'Perks', type: 'icon_list', list_layout: 'horizontal', style: { il_ic_color: '#ff0000', il_ic_size: 24, il_tx_weight: '700', il_gap: 30 }, items: [ { text: 'Fast', icon: 'bolt' }, { text: 'Safe', icon: 'shield', link: 'https://example.com/safe' }, { text: 'Cheap', icon: 'sell' } ] },
				{ key: 'plan', label: 'Plan', type: 'choice_set', required: true, card_columns: 2, card_gap: 12, default: 'a', children: [
					card( 'a', 'Card A', 'third' ), card( 'b', 'Card B', 'third' ), card( 'c', 'Card C', 'third' ),
					card( 'd', 'Card D', 'w25' ), card( 'e', 'Card E', 'w25' ), card( 'f', 'Card F', 'w25' ),
					card( 'g', 'Card G', 'full', { card_inline: true, children: [
						{ key: 'g_cols', label: 'Cols', type: 'columns', children: [
							{ key: 'g_l', label: 'L', type: 'panel', width: 'w10', children: [ { key: 'g_img', label: 'Pic', type: 'image', image_id: att.id, image_width: 100 } ] },
							{ key: 'g_r', label: 'R', type: 'panel', width: 'w90', children: [ { key: 'g_h', label: 'Head', type: 'heading', content: 'Inside heading' }, { key: 'g_t', label: 'Visits', type: 'text', default: 'Unlimited' } ] },
						] },
					] } ),
					card( 'h', 'Wide card', 'auto' ),
				] },
			],
		};
		const saved = seed( 'collection', { definition: def } );
		check( 'setup', 'the layout collection is saved', saved.fields === 6, JSON.stringify( saved ) );
		const stored = seed( 'definition', { collection: 'layouts' } );
		const plan = stored.fields.find( ( f ) => f.key === 'plan' );
		check( 'schema', 'widths, columns, card layout and icon list options survive the cleaning', stored.fields[ 0 ].width === 'w20' && stored.fields[ 2 ].children[ 0 ].width === 'w20' && plan.card_columns === 2 && plan.children[ 3 ].card_width === 'w25' && plan.children[ 6 ].card_inline === true && stored.fields[ 4 ].items.length === 3 && stored.fields[ 3 ].style.im_align === 'right', JSON.stringify( plan.children[ 6 ] ).slice( 0, 300 ) );

		// ------------------------------------------------------------ the public form
		const formPage = seed( 'page', { title: 'Layouts', slug: 'layouts-form', content: '[refraction_form collection="layouts"]' } );
		for ( const theme of themes ) {
			wp( [ 'theme', 'activate', theme ] );
			const vctx = await browser.newContext( { viewport: { width: 1200, height: 1400 } } );
			const v = await vctx.newPage();
			watch( v, `visitor ${ theme }` );
			const area = `public ${ theme }`;
			await v.goto( formPage.url );
			await v.waitForLoadState( 'load' );
			await v.waitForSelector( '.rfb-form' );
			const box = ( sel ) => v.locator( sel ).first().evaluate( ( el ) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, r: r.right + scrollX }; } );
			const near = ( a, b, tol = 3 ) => Math.abs( a - b ) <= tol;

			// widths
			const n = await box( '[data-rfb-key="name"]' );
			const em = await box( '[data-rfb-key="email"]' );
			check( area, '20% and 80% fields sit on one row and add up to the row', near( n.y, em.y ) && near( n.w, 0.2 * ( em.r - n.x ) - 0.8 * 24, 2 ) && near( em.r - n.x, n.w + em.w + 24, 2 ), JSON.stringify( [ n, em ] ) );

			// columns
			const cl = await box( '.rfb-columns > .rfb-column:nth-child(1)' );
			const cr = await box( '.rfb-columns > .rfb-column:nth-child(2)' );
			check( area, 'Columns 20 / 80 with a 20px gap', near( cl.y, cr.y ) && near( cl.w, 0.2 * ( cr.r - cl.x ) - 0.8 * 20, 2 ) && near( cr.x - cl.r, 20, 2 ) && near( cl.w + 20 + cr.w, cr.r - cl.x, 2 ), JSON.stringify( [ cl, cr ] ) );
			const logo = await box( '[data-rfb-key="logo"] .rfb-image' );
			check( area, 'an image block in a narrow column: 50% wide and aligned right in its column', near( logo.w / cl.w, 0.5, 0.03 ) && near( logo.r, cl.r, 2 ), JSON.stringify( [ logo, cl ] ) );

			// image style: alignment from the Style tab wins and applies
			const hero = await box( '[data-rfb-key="hero"] .rfb-image' );
			const heroWrap = await box( '[data-rfb-key="hero"]' );
			check( area, 'the Style tab alignment and width move the picture (right, 40%)', near( hero.r, heroWrap.r, 2 ) && near( hero.w / heroWrap.w, 0.4, 0.02 ), JSON.stringify( [ hero, heroWrap ] ) );
			check( area, 'the Style tab radius is on the picture', ( await v.locator( '[data-rfb-key="hero"] .rfb-image img' ).evaluate( ( el ) => getComputedStyle( el ).borderTopLeftRadius ) ) === '20px' );
			await v.locator( '[data-rfb-key="hero"] .rfb-image img' ).hover();
			await sleep( 300 );
			check( area, 'the picture has a hover shadow', ( await v.locator( '[data-rfb-key="hero"] .rfb-image img' ).evaluate( ( el ) => getComputedStyle( el ).boxShadow ) ) !== 'none' );
			await v.mouse.move( 2, 2 );

			// icon list
			const items = await v.locator( '[data-rfb-key="perks"] .rfb-il-item' ).count();
			const i1 = await box( '[data-rfb-key="perks"] .rfb-il-item:nth-child(1)' );
			const i2 = await box( '[data-rfb-key="perks"] .rfb-il-item:nth-child(2)' );
			check( area, 'the icon list is horizontal with an icon per item and a link', items === 3 && near( i1.y, i2.y, 2 ) && ( await v.locator( '[data-rfb-key="perks"] .rfb-il-icon svg' ).count() ) === 3 && ( await v.locator( '[data-rfb-key="perks"] a.rfb-il-link' ).getAttribute( 'href' ) ) === 'https://example.com/safe' );
			check( area, 'the icon list style (icon color and size, text weight, gap) is applied', ( await v.locator( '[data-rfb-key="perks"] .rfb-il-icon' ).first().evaluate( ( el ) => getComputedStyle( el ).color + '|' + getComputedStyle( el ).fontSize ) ) === 'rgb(255, 0, 0)|24px' && ( await v.locator( '[data-rfb-key="perks"] .rfb-il-text' ).first().evaluate( ( el ) => getComputedStyle( el ).fontWeight ) ) === '700' && ( await v.locator( '[data-rfb-key="perks"] .rfb-il' ).evaluate( ( el ) => getComputedStyle( el ).columnGap ) ) === '30px' );

			// card grid: 3 on top, 4 below, then a wide card
			const cards = await v.locator( '.rfb-choice-card' ).evaluateAll( ( els ) => els.map( ( el ) => { const r = el.getBoundingClientRect(); return { k: el.dataset.rfbKey, x: Math.round( r.left ), y: Math.round( r.top + scrollY ), w: Math.round( r.width ) }; } ) );
			const rowOf = ( keys ) => keys.map( ( k ) => cards.find( ( c ) => c.k === k ) );
			const top = rowOf( [ 'a', 'b', 'c' ] );
			const bottom = rowOf( [ 'd', 'e', 'f' ] );
			const wide = cards.find( ( c ) => c.k === 'h' );
			check( area, 'three cards on top share one row at equal widths', top.every( ( c ) => near( c.y, top[ 0 ].y, 2 ) ) && near( top[ 0 ].w, top[ 1 ].w, 2 ) && near( top[ 1 ].w, top[ 2 ].w, 2 ), JSON.stringify( top ) );
			check( area, 'three more cards share the next row, narrower than the ones above', bottom.every( ( c ) => near( c.y, bottom[ 0 ].y, 2 ) ) && bottom[ 0 ].y > top[ 0 ].y + 20 && bottom[ 0 ].w < top[ 0 ].w, JSON.stringify( bottom ) );
			check( area, 'an automatic card uses the set\'s two per row and wraps below', wide.y > bottom[ 0 ].y + 20 && wide.w > bottom[ 0 ].w, JSON.stringify( wide ) );
			// card G: inline content with 10/90 columns, not behind a toggle
			const gl = await box( '.rfb-choice-card[data-rfb-key="g"] .rfb-column:nth-child(1)' );
			const gr = await box( '.rfb-choice-card[data-rfb-key="g"] .rfb-column:nth-child(2)' );
			check( area, 'a card shows its content inline (no toggle) with columns 10 / 90 inside', ( await v.locator( '.rfb-choice-card[data-rfb-key="g"] details' ).count() ) === 0 && near( gl.y, gr.y, 3 ) && near( gl.w, 0.1 * ( gr.r - gl.x ) - 0.9 * 24, 2 ) && ( await v.locator( '.rfb-choice-card[data-rfb-key="g"] .rfb-heading' ).textContent() ) === 'Inside heading', JSON.stringify( [ gl, gr ] ) );
			check( area, 'only inputs are locked inside a card; the heading is plain content', ( await v.locator( '.rfb-choice-card[data-rfb-key="g"] input[type=text]' ).evaluate( ( el ) => el.disabled && el.value === 'Unlimited' ) ) );
			await v.locator( '.rfb-choice-card[data-rfb-key="a"] .rfb-cc-details > summary' ).click();
			check( area, 'a card with the toggle shows its icon list when opened', ( await v.locator( '.rfb-choice-card[data-rfb-key="a"] .rfb-il-item' ).count() ) === 2 && await v.locator( '.rfb-choice-card[data-rfb-key="a"] .rfb-il-item' ).first().isVisible() );
			await v.screenshot( { path: join( SHOTS, `public-${ theme }.png` ), fullPage: true } );

			// phone: columns and cards stack
			await v.setViewportSize( { width: 420, height: 900 } );
			await sleep( 300 );
			const pl = await box( '.rfb-columns > .rfb-column:nth-child(1)' );
			const pr = await box( '.rfb-columns > .rfb-column:nth-child(2)' );
			const pa = await box( '.rfb-choice-card[data-rfb-key="a"]' );
			const pb = await box( '.rfb-choice-card[data-rfb-key="b"]' );
			check( area, 'on a phone columns and cards stack one under the other', pr.y > pl.y + 10 && pb.y > pa.y + 10 && pa.w > 300, JSON.stringify( [ pl, pr, pa, pb ] ) );
			check( area, 'and nothing scrolls sideways', ( await v.evaluate( () => document.documentElement.scrollWidth <= window.innerWidth + 1 ) ) );
			await v.setViewportSize( { width: 1200, height: 1400 } );

			// submit
			await v.fill( '[data-rfb-key="name"] .rfb-input', `Ann ${ theme }` );
			await v.locator( '.rfb-choice-card[data-rfb-key="d"] .rfb-cc-main' ).click();
			await sleep( 3200 );
			await Promise.all( [ v.waitForLoadState( 'load' ), v.click( '.rfb-submit' ) ] );
			await sleep( 500 );
			const rec = seed( 'latest', { collection: 'layouts' } ).record;
			check( area, 'the form submits: the picked card is stored and nothing from the layout leaks into the values', rec && rec.values.plan && rec.values.plan[ 0 ].key === 'd' && ! ( 'split' in rec.values ) && ! ( 'perks' in rec.values ) && ! ( 'g_t' in rec.values ), JSON.stringify( rec && rec.values ).slice( 0, 300 ) );
			await vctx.close();
		}

		// ------------------------------------------------------------ the designer
		await page.setViewportSize( { width: 1500, height: 1000 } );
		await page.goto( `${ BUILDER }&view=design&collection=layouts` );
		await page.waitForSelector( '.rfb-cv-item' );
		const types = await page.$$eval( '.rfb-palette-item', ( els ) => els.map( ( e ) => e.dataset.type ) );
		check( 'palette', 'Columns and Icon List are in the field list', types.includes( 'columns' ) && types.includes( 'icon_list' ) && ! types.includes( 'panel' ), types.join( ',' ) );
		check( 'palette', 'every tile has an icon', ( await page.$$eval( '.rfb-palette-item', ( els ) => els.filter( ( e ) => ! e.querySelector( '.rfb-palette-icon svg' ) ).map( ( e ) => e.dataset.type ) ) ).length === 0 );
		const cbox = ( sel ) => page.locator( sel ).first().evaluate( ( el ) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, r: r.right }; } );

		const dcl = await cbox( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel[data-rfb-key="cl"]' );
		const dcr = await cbox( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel[data-rfb-key="cr"]' );
		check( 'canvas', 'the columns are drawn side by side at their widths', Math.abs( dcl.y - dcr.y ) < 4 && dcl.w / ( dcr.r - dcl.x ) < 0.25 && dcr.w > dcl.w * 3, JSON.stringify( [ dcl, dcr ] ) );
		const da = await cbox( '.rfb-cv-item[data-rfb-key="a"]' );
		const db = await cbox( '.rfb-cv-item[data-rfb-key="b"]' );
		const dd = await cbox( '.rfb-cv-item[data-rfb-key="d"]' );
		check( 'canvas', 'the cards are drawn in the same rows as on the page (three on top, narrower below)', Math.abs( da.y - db.y ) < 4 && dd.y > da.y + 20 && dd.w < da.w, JSON.stringify( [ da, db, dd ] ) );
		const dhero = await page.locator( '.rfb-cv-item[data-rfb-key="hero"] .rfb-image' ).evaluate( ( el ) => { const r = el.getBoundingClientRect(); const p = el.closest( '.rfb-cv-preview-body' ).getBoundingClientRect(); return { right: Math.abs( r.right - p.right ) < 8, ratio: r.width / p.width }; } );
		check( 'canvas', 'the picture\'s Style alignment and width show on the canvas (right, 40%)', dhero.right && Math.abs( dhero.ratio - 0.4 ) < 0.03, JSON.stringify( dhero ) );
		await page.screenshot( { path: join( SHOTS, 'designer.png' ) } );

		// split buttons
		await page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel-head' ).first().click( { force: true } ).catch( () => null );
		await page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-title' ).click( { force: true } );
		check( 'inspector', 'Columns offer ready-made splits and a gap', ( await page.locator( '.rfb-split-btn' ).count() ) >= 14 && ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Space between columns (px)"))' ).count() ) === 1 );
		await page.locator( '.rfb-split-btn[title="30 / 70"]' ).click();
		check( 'inspector', 'choosing 30 / 70 sets both column widths', ( await page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel.rfb-w-w30' ).count() ) === 1 && ( await page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel.rfb-w-w70' ).count() ) === 1 );
		await page.locator( '.rfb-split-btn[title="33 / 33 / 33"]' ).click();
		check( 'inspector', 'choosing three columns adds one, keeping the fields', ( await page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel' ).count() ) === 3 && ( await page.locator( '.rfb-cv-item[data-rfb-key="logo"]' ).count() ) === 1 && ( await page.locator( '.rfb-cv-item[data-rfb-key="phone"]' ).count() ) === 1 );
		await page.locator( '.rfb-split-btn[title="50 / 50"]' ).click();
		check( 'inspector', 'going back to two folds the extra column\'s fields into the last one', ( await page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel' ).count() ) === 2 );
		await page.locator( '.rfb-split-btn[title="20 / 80"]' ).click();

		// drag a field into the second column and into a card
		await drag( page, page.locator( '.rfb-palette-item[data-type="number"]' ), page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel[data-rfb-key="cr"] .rfb-cv-list' ) );
		check( 'drag', 'a field dragged into a column lands in it', ( await page.locator( '.rfb-cv-panel[data-rfb-key="cr"] .rfb-cv-item.rfb-cv-number' ).count() ) === 1 );
		await drag( page, page.locator( '.rfb-palette-item[data-type="columns"]' ), page.locator( '.rfb-cv-item[data-rfb-key="h"] > .rfb-cv-container.rfb-choice-card > .rfb-cc-fields > .rfb-cv-list' ) );
		check( 'drag', 'a Columns block can be dropped inside a card', ( await page.locator( '.rfb-cv-item[data-rfb-key="h"] .rfb-cv-item.rfb-cv-columns' ).count() ) === 1 );
		await drag( page, page.locator( '.rfb-palette-item[data-type="columns"]' ), page.locator( '.rfb-cv-item[data-rfb-key="split"] .rfb-cv-panel[data-rfb-key="cr"] .rfb-cv-list' ) );
		check( 'drag', 'Columns can be dropped into a column of another Columns block (30 / 70 with two rows inside)', ( await page.locator( '.rfb-cv-panel[data-rfb-key="cr"] .rfb-cv-item.rfb-cv-columns' ).count() ) === 1 );
		const inner = page.locator( '.rfb-cv-panel[data-rfb-key="cr"] .rfb-cv-item.rfb-cv-columns .rfb-cv-panel' );
		check( 'drag', 'the inner Columns block starts with two columns of its own', await inner.count() === 2 );
		await drag( page, page.locator( '.rfb-palette-item[data-type="accordion"]' ), inner.first().locator( '.rfb-cv-list' ) );
		check( 'drag', 'an Accordion can not go into a column', ( await page.locator( '.rfb-cv-panel[data-rfb-key="cr"] .rfb-cv-item.rfb-cv-accordion' ).count() ) === 0 );
		await drag( page, page.locator( '.rfb-palette-item[data-type="file"]' ), page.locator( '.rfb-cv-item[data-rfb-key="h"] > .rfb-cv-container.rfb-choice-card > .rfb-cc-fields > .rfb-cv-list' ) );
		check( 'drag', 'an upload is refused inside a card', ( await page.locator( '.rfb-cv-item[data-rfb-key="h"] .rfb-cv-item.rfb-cv-file' ).count() ) === 0 );

		// card options
		await page.locator( '.rfb-cv-item[data-rfb-key="d"] .rfb-cc-main' ).first().click( { force: true } );
		const lbls = await page.$$eval( '.rfb-inspector .rfb-mini', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'inspector', 'a card has a width and the always-show option', lbls.includes( 'Card width' ) && ( await page.locator( '.rfb-inspector label:has-text("Always show what is inside")' ).count() ) === 1, lbls.join( '|' ) );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Card width")) select' ).selectOption( 'half' );
		const dd2 = await cbox( '.rfb-cv-item[data-rfb-key="d"]' );
		check( 'inspector', 'changing a card\'s width changes it on the canvas right away', dd2.w > dd.w * 1.5, JSON.stringify( [ dd, dd2 ] ) );
		await page.locator( '.rfb-cv-item[data-rfb-key="plan"] > .rfb-cv-container > .rfb-cv-title' ).click( { force: true } );
		await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Cards per row")) input' ).fill( '3' );
		check( 'inspector', 'the set has cards per row and a gap', ( await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Space between cards (px)")) input' ).count() ) === 1 );

		// width select of an ordinary field
		await page.locator( '.rfb-cv-item[data-rfb-key="name"] .rfb-cv-preview-body' ).click( { force: true } );
		const widths = await page.locator( '.rfb-inspector .rfb-field:has(.rfb-mini:text-is("Width")) select option' ).allTextContents();
		check( 'inspector', 'a field can be 10%, 20%, 1/4, 1/3, 1/2, 3/4... wide', [ '10%', '1/5 (20%)', '1/4 (25%)', '1/3 (33%)', '1/2 (50%)', '3/4 (75%)', '90%', 'Full width' ].every( ( w ) => widths.includes( w ) ), widths.join( '|' ) );

		// icon list editor
		await page.locator( '.rfb-cv-item[data-rfb-key="perks"] .rfb-cv-preview-body' ).click( { force: true } );
		check( 'icon list', 'the settings panel lists each item with an icon, text and link', ( await page.locator( '.rfb-il-row' ).count() ) === 3 && ( await page.locator( '.rfb-il-row .rfb-il-pick-icon svg' ).count() ) === 3 );
		await page.locator( '.rfb-il-editor > .rfb-btn' ).click();
		await page.locator( '.rfb-il-row' ).last().locator( 'input[aria-label="Item text"]' ).fill( 'Brand new' );
		await page.locator( '.rfb-il-row' ).last().locator( 'select' ).selectOption( 'diamond' );
		check( 'icon list', 'adding an item shows it on the canvas with the chosen icon', ( await page.locator( '.rfb-cv-item[data-rfb-key="perks"] .rfb-il-item' ).count() ) === 4 && ( await page.locator( '.rfb-cv-item[data-rfb-key="perks"] .rfb-il-item' ).last().textContent() ).includes( 'Brand new' ) );
		await page.locator( '.rfb-il-row' ).first().locator( 'button[aria-label="Remove item"]' ).click();
		check( 'icon list', 'removing an item takes it off the canvas', ( await page.locator( '.rfb-cv-item[data-rfb-key="perks"] .rfb-il-item' ).count() ) === 3 );
		await page.click( '.rfb-field-tab[data-fieldtab="style"]' );
		const ilSections = await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'icon list', 'its Style tab has list, icon and text groups (with Normal / Hover)', [ 'List', 'Icons', 'Item text' ].every( ( s ) => ilSections.includes( s ) ) && ( await page.locator( '.rfb-state-tab' ).allTextContents() ).join( '|' ) === 'Normal|Hover|Focus', ilSections.join( '|' ) );

		// image style panel
		await page.click( '.rfb-field-tab[data-fieldtab="settings"]' ).catch( () => null );
		await page.locator( '.rfb-cv-item[data-rfb-key="hero"] .rfb-cv-preview-body' ).click( { force: true } );
		await page.click( '.rfb-field-tab[data-fieldtab="style"]' );
		const imSections = await page.$$eval( '.rfb-inspector .rfb-section > summary', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		const imLabels = await page.$$eval( '.rfb-inspector .rfb-mini', ( els ) => els.map( ( e ) => e.textContent.trim() ) );
		check( 'image style', 'the picture has its own groups: box (alignment, width) and the picture (fit, height, border, radius)', imSections.includes( 'Image box (.rfb-image)' ) && imSections.includes( 'The picture' ) && [ 'Alignment', 'Width (%)', 'Fit', 'Height (px)' ].every( ( l ) => imLabels.includes( l ) ), imSections.join( '|' ) + ' // ' + imLabels.join( '|' ) );
		check( 'image style', 'text-only options (text color, font, size) are gone for images', ! imLabels.includes( 'Font' ) && ! imLabels.includes( 'Text size (px)' ) && ! imLabels.includes( 'Text color' ) );
		const alignBox = page.locator( '.rfb-inspector .rfb-section:has(> summary:text-is("Image box (.rfb-image)")) .rfb-field:has(.rfb-mini:text-is("Alignment")) select' );
		await alignBox.selectOption( 'center' );
		const dh2 = await page.locator( '.rfb-cv-item[data-rfb-key="hero"] .rfb-image' ).evaluate( ( el ) => { const r = el.getBoundingClientRect(); const p = el.closest( '.rfb-cv-preview-body' ).getBoundingClientRect(); return Math.abs( ( r.left - p.left ) - ( p.right - r.right ) ) < 4; } );
		check( 'image style', 'changing the Style alignment to center centers it on the canvas', dh2 );

		// save and reopen
		await Promise.all( [ page.waitForURL( /done=saved/ ), page.click( '.rfb-sticky-actions button[type=submit]' ) ] );
		const after = seed( 'definition', { collection: 'layouts' } );
		const hero = after.fields.find( ( f ) => f.key === 'hero' );
		const aplan = after.fields.find( ( f ) => f.key === 'plan' );
		const aperks = after.fields.find( ( f ) => f.key === 'perks' );
		check( 'save', 'columns, widths, card options, icon list items and image style are saved', hero.style.im_align === 'center' && aplan.card_columns === 3 && aplan.children.find( ( c ) => c.key === 'd' ).card_width === 'half' && aperks.items.length === 3 && aperks.items[ 2 ].text === 'Brand new' && aperks.items[ 2 ].icon === 'diamond' && after.fields.find( ( f ) => f.key === 'split' ).children[ 0 ].width === 'w20' && aplan.children.find( ( c ) => c.key === 'h' ).children.some( ( c ) => c.type === 'columns' ), JSON.stringify( aperks.items ) );
		const unl = await unlabelled( page );
		check( 'a11y', 'every control of the designer is labelled', unl.length === 0, unl.join( ',' ) );
	} catch ( e ) {
		failures++;
		console.log( 'FAIL  script / ' + ( e.stack || e.message ).slice( 0, 800 ) );
	} finally {
		check( 'console', 'no JavaScript errors in the browser', consoleErrors.length === 0, consoleErrors.join( ' || ' ) );
		const errors = logTail( logStart );
		check( 'php', 'nothing in the PHP error log', ! /(Fatal error|Parse error|Warning|Notice|Deprecated)/.test( errors ), errors.slice( 0, 800 ) );
		await browser.close();
		if ( server ) { server.kill(); }
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall form builder part 7 checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
