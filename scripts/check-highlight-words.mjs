#!/usr/bin/env node
/**
 * Highlight Words and Pill Labels (modules/highlight-words; SQLite test site, Chromium): many phrases highlighted in a
 * Heading, a Text Editor, an Icon Box and a Call to Action (marks, colors, drawing in), a Heading shown as a pill with
 * a numbered badge, the Phone Showcase's text above the steps as a pill, and the same in the editor's preview.
 *
 * Usage: node scripts/check-highlight-words.mjs [--site /tmp/rf-hl-site] [--port 9371] [--shots /tmp/highlight-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-hl-site' );
const PORT = arg( 'port', '9371' );
const SHOTS = arg( 'shots', '/tmp/highlight-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function findChromium() {
	const root = '/opt/pw-browsers';
	if ( ! existsSync( root ) ) {
		return undefined;
	}
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, sub ) ) ) {
				return join( root, d, sub );
			}
		}
	}
	return undefined;
}

function wp( args ) {
	try {
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const up = async () => {
	try {
		await fetch( `${ BASE }/wp-login.php` );
		return true;
	} catch {
		return false;
	}
};

// Rows of [ widget, width % ] on one page.
function dashboard( title, rows ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	const pad = { unit: 'px', top: '32', right: '32', bottom: '32', left: '32', isLinked: true };
	const gap = { unit: 'px', column: '24', row: '24', isLinked: true };
	const data = [ { id: 'dsboard', elType: 'container', isInner: false, settings: { content_width: 'full', padding: pad, flex_gap: gap, background_background: 'classic', background_color: '#F5F8FA' }, elements: rows.map( ( r, i ) => ( { id: `dsrow0${ i }`, elType: 'container', isInner: true, settings: { flex_direction: 'row', flex_direction_mobile: 'column', flex_gap: gap, padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }, elements: r.map( ( [ w, grow ], j ) => ( { id: `dscol${ i }${ j }`, elType: 'container', isInner: true, settings: { width: { unit: '%', size: grow }, width_mobile: { unit: '%', size: 100 }, padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }, elements: [ w ] } ) ) } ) ) } ];
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ], [ '_wp_page_template', 'refraction_header_footer' ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

async function main() {
	if ( ! existsSync( join( WPDIR, 'wp-config.php' ) ) ) {
		throw new Error( `no WordPress at ${ WPDIR }; run scripts/setup-menu-test-site.sh` );
	}
	mkdirSync( SHOTS, { recursive: true } );
	let server;
	if ( ! ( await up() ) ) {
		server = spawn( 'php', [ '-S', `127.0.0.1:${ PORT }`, '-t', WPDIR ], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } );
		for ( let i = 0; i < 50 && ! ( await up() ); i++ ) {
			await sleep( 200 );
		}
	}

	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const errors = [];
	const watch = ( p ) => p.on( 'pageerror', ( e ) => errors.push( `${ e.message } @ ${ p.url() }` ) );
	const w = ( id, type, settings ) => ( { id, elType: 'widget', widgetType: type, settings, elements: [] } );

	try {
		const p1 = dashboard( 'Highlights', [
			[ [ w( 'hl00001', 'heading', { title: 'Payments go straight into your bank. Not ours.', header_size: 'h2', rf_hl_words: 'your bank\nNot ours', rf_dual_mark: 'round', rf_dual_mark_color: '#D4F25A', rf_dual_draw: 'yes' } ), 100 ] ],
			[ [ w( 'hl00002', 'heading', { title: 'How it works', header_size: 'h6', rf_pill: 'yes', rf_pill_badge: '3' } ), 100 ] ],
			[ [ w( 'hl00003', 'text-editor', { editor: '<p>Book a taxi any hour. Fixed fares to the airport, and <a href="#x">airport</a> pick-ups too.</p><p>Our drivers know the Highlands.</p>', rf_hl_words: 'any hour\nairport\nthe Highlands', rf_dual_fill: 'gradient' } ), 100 ] ],
			[ [ w( 'hl00004', 'icon-box', { title_text: 'Safe transport', description_text: 'Licensed drivers, safe cars, every journey.', rf_hl_words: 'Safe', rf_hl_desc: 'every journey', rf_dual_mark: 'underline', rf_dual_color: '#E20A17' } ), 50 ], [ w( 'hl00005', 'refraction-call-to-action', { title: 'Book your ride today', description: 'Call us any time.', rf_hl_words: 'today', rf_hl_desc: 'any time' } ), 50 ] ],
			[ [ w( 'hl00007', 'alert', { alert_title: 'Bookings open', alert_description: 'Call us any time, we are open.', rf_hl_words: 'open', rf_hl_desc: 'any time' } ), 34 ], [ w( 'hl00008', 'counter', { title: 'Happy riders', ending_number: 500, rf_hl_words: 'Happy' } ), 33 ], [ w( 'hl00009', 'refraction-stat-card', { label: 'Monthly riders', value: '1200', rf_hl_words: 'riders' } ), 33 ] ],
			[ [ w( 'hl00010', 'refraction-slides', { rf_hl_words: 'Heading' } ), 100 ] ],
			[ [ w( 'hl00012', 'refraction-phone-showcase', { label: 'Download for free', heading: 'Download our app today', description: 'Book in the SafeKab app.', steps: [ { _id: 'st1', title: 'Download the SafeKab app', text: 'Free on Google Play. Download now.' } ], button_text: 'Google Play', button_small: 'Download on', button2_text: 'App Store', button2_small: 'Download on', button_hover_animation: 'grow', cards: [ { _id: 'cd1', title: 'Download', text: 'Booked' } ], rf_hl_part_heading: 'Download', rf_hl_part_step_text: 'Download', rf_hl_part_buttons: 'App Store', rf_hl_part_description: 'SafeKab' } ), 100 ] ],
			[ [ w( 'hl00013', 'refraction-phone-showcase', { label: 'Download for free', heading: 'Download our app', description: 'Use SafeKab.', steps: [ { _id: 'st2', title: 'Step', text: 'Text' } ], rf_hl_words: 'Download', rf_hl_desc: 'SafeKab' } ), 100 ] ],
			[ [ w( 'hl00006', 'refraction-phone-showcase', { label: 'How it works', label_icon: { value: 'fas fa-taxi', library: 'fa-solid' }, label_pill: 'yes', steps: [ { title: 'Step one', text: 'One' } ] } ), 100 ] ],
		] );

		const d = await ( await browser.newContext( { viewport: { width: 1280, height: 900 } } ) ).newPage();
		watch( d );
		await d.goto( p1.url );
		await sleep( 2500 );
		const front = await d.evaluate( () => {
			const parts = ( id ) => [ ...document.querySelectorAll( `[data-id="${ id }"] .rf-hl` ) ].map( ( s ) => s.textContent );
			const h = document.querySelector( '[data-id="hl00001"]' );
			const mark = getComputedStyle( h.querySelector( '.rf-hl' ) ).backgroundImage;
			const pill = document.querySelector( '[data-id="hl00002"] .refraction-heading-title' );
			const badge = pill?.querySelector( '.rf-pill__badge' );
			const grad = getComputedStyle( document.querySelector( '[data-id="hl00003"] .rf-hl' ) );
			const ib = document.querySelector( '[data-id="hl00004"] .rf-hl' );
			const label = document.querySelector( '[data-id="hl00006"] .rf-showcase__label' );
			return {
				heading: parts( 'hl00001' ), drawn: h.querySelector( '.rf-hl' ).classList.contains( 'is-drawn' ), mark: /gradient/.test( mark ),
				pill: pill && { radius: getComputedStyle( pill ).borderRadius, bg: getComputedStyle( pill ).backgroundColor, caps: getComputedStyle( pill ).textTransform, badge: badge?.textContent, round: badge && getComputedStyle( badge ).borderRadius, first: pill.firstElementChild === badge },
				text: parts( 'hl00003' ), linkKept: document.querySelector( '[data-id="hl00003"] a .rf-hl' )?.textContent, gradient: /gradient/.test( grad.backgroundImage ) && 'text' === ( grad.backgroundClip || grad.webkitBackgroundClip ),
				iconBox: parts( 'hl00004' ), underline: ib && getComputedStyle( ib ).color, cta: parts( 'hl00005' ),
				label: label && { radius: getComputedStyle( label ).borderRadius, bg: getComputedStyle( label ).backgroundColor, badge: !! label.querySelector( '.rf-showcase__label-badge svg, .rf-showcase__label-badge i' ), caps: getComputedStyle( label ).textTransform },
			};
		} );
		check( 'heading', 'many phrases highlighted in a Heading, with a rounded mark that draws in', 'your bank,Not ours' === front.heading.join() && front.mark && front.drawn, JSON.stringify( front ) );
		check( 'text editor', 'phrases highlighted in a Text Editor wherever they appear (also inside a link), with a gradient fill', 'any hour,airport,airport,the Highlands' === front.text.join() && 'airport' === front.linkKept && front.gradient, JSON.stringify( front.text ) );
		check( 'cards', 'Icon Box and Call to Action with Title and Description Words: title words only in the title (not "safe" in the description), highlighted with their own style (red underline)', 'Safe,every journey' === front.iconBox.join() && 'rgb(226, 10, 23)' === front.underline && 'today,any time' === front.cta.join(), JSON.stringify( [ front.iconBox, front.underline, front.cta ] ) );
		const parts = await d.evaluate( () => {
			const hl = ( sel ) => [ ...document.querySelectorAll( `[data-id="hl00012"] ${ sel } .rf-hl` ) ].map( ( x ) => x.textContent ).join();
			return { label: hl( '.rf-showcase__label' ), heading: hl( '.rf-showcase__heading' ), desc: hl( '.rf-showcase__description' ), stepTitle: hl( '.rf-showcase__title' ), stepText: hl( '.rf-showcase__text' ), buttons: hl( '.rf-showcase__buttons' ), cards: hl( '.rf-showcase__card' ), legacy: [ ...document.querySelectorAll( '[data-id="hl00013"] .rf-hl' ) ].map( ( x ) => x.textContent ).join() };
		} );
		check( 'phone showcase parts', 'each part has its own words: "Download" only in the heading and the step text (not the label, step title, buttons or cards), "App Store" only in the buttons, "SafeKab" only in the description', '' === parts.label && 'Download' === parts.heading && 'SafeKab' === parts.desc && '' === parts.stepTitle && 'Download' === parts.stepText && 'App Store' === parts.buttons && '' === parts.cards, JSON.stringify( parts ) );
		check( 'phone showcase parts', 'a showcase saved with the earlier Title / Description lists still looks the same', /Download/.test( parts.legacy ) && /SafeKab/.test( parts.legacy ), parts.legacy );
		const btn = await d.evaluate( () => {
			const b = document.querySelector( '[data-id="hl00012"] .rf-showcase__button--primary' );
			const b2 = document.querySelector( '[data-id="hl00012"] .rf-showcase__button--secondary' );
			return { anim: b.classList.contains( 'refraction-animation-grow' ), animCss: [ ...document.styleSheets ].some( ( sh ) => {
				try {
					return [ ...sh.cssRules ].some( ( r ) => /refraction-animation-grow/.test( r.selectorText || '' ) );
				} catch ( e ) {
					return false;
				}
			} ), transition: getComputedStyle( b2 ).transitionProperty, lift: document.querySelector( '[data-id="hl00012"]' ).classList.contains( 'rf-showcase-lift-yes' ) };
		} );
		await d.hover( '[data-id="hl00012"] .rf-showcase__button--secondary' );
		await sleep( 500 );
		const lifted = await d.evaluate( () => getComputedStyle( document.querySelector( '[data-id="hl00012"] .rf-showcase__button--secondary' ) ).transform );
		check( 'phone showcase buttons', 'Hover Animation (Grow) on the first button with its CSS loaded; the second lifts on hover; colours, border, shadow and movement ease in', btn.anim && btn.animCss && btn.lift && /color/.test( btn.transition ) && /transform/.test( btn.transition ) && /matrix\(1, 0, 0, 1, 0, -3\)/.test( lifted ), JSON.stringify( [ btn, lifted ] ) );
		await d.locator( '[data-id="hl00012"]' ).screenshot( { path: join( SHOTS, 'showcase-parts.png' ) } );
		const more = await d.evaluate( () => Object.fromEntries( [ 'hl00007', 'hl00008', 'hl00009', 'hl00010' ].map( ( id ) => [ id, [ ...document.querySelectorAll( `[data-id="${ id }"] .rf-hl` ) ].map( ( s ) => s.textContent ).join() ] ) ) );
		check( 'all widgets', 'every widget with a title or description has it: Alert ("open" only in its title, "any time" in its description), Counter title, Stat Card label, Slides headings', 'open,any time' === more.hl00007 && 'Happy' === more.hl00008 && 'riders' === more.hl00009 && /Heading/.test( more.hl00010 ), JSON.stringify( more ) );
		check( 'pill', 'a Heading as a pill label: rounded, tinted, capitals, a round badge "3" first', front.pill && '999px' === front.pill.radius && 'rgb(221, 247, 238)' === front.pill.bg && 'uppercase' === front.pill.caps && '3' === front.pill.badge && '50%' === front.pill.round && front.pill.first, JSON.stringify( front.pill ) );
		check( 'pill', 'the Phone Showcase text above the steps as a pill, its icon in a badge', front.label && '999px' === front.label.radius && 'rgb(221, 247, 238)' === front.label.bg && front.label.badge && 'uppercase' === front.label.caps, JSON.stringify( front.label ) );
		await d.locator( '[data-id="hl00001"]' ).screenshot( { path: join( SHOTS, 'heading.png' ) } );
		await d.locator( '[data-id="hl00002"]' ).screenshot( { path: join( SHOTS, 'pill.png' ) } );
		await d.screenshot( { path: join( SHOTS, 'page.png' ), fullPage: true } );
		await d.context().close();

		// The editor's preview (JS templates).
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ctx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p1.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3500 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const preview = await frame.evaluate( () => ( {
			heading: [ ...document.querySelectorAll( '[data-id="hl00001"] .rf-hl' ) ].map( ( s ) => s.textContent ).join(),
			text: [ ...document.querySelectorAll( '[data-id="hl00003"] .rf-hl' ) ].length,
			badge: document.querySelector( '[data-id="hl00002"] .rf-pill__badge' )?.textContent,
		} ) );
		check( 'editor', 'the preview shows the highlighted phrases and the pill badge', 'your bank,Not ours' === preview.heading && 4 === preview.text && '3' === preview.badge, JSON.stringify( preview ) );
		await e.evaluate( () => window.$e.run( 'document/elements/settings', { container: window.refraction.getContainer( 'hl00001' ), settings: { rf_hl_words: 'straight' } } ) );
		await sleep( 1500 );
		const changed = await frame.evaluate( () => [ ...document.querySelectorAll( '[data-id="hl00001"] .rf-hl' ) ].map( ( s ) => s.textContent ).join() );
		check( 'editor', 'changing the words redraws the preview', 'straight' === changed, changed );
		const panel = await e.evaluate( async () => {
			const c = window.refraction.getContainer( 'hl00004' );
			window.$e.run( 'document/elements/select', { container: c } );
			await new Promise( ( r ) => setTimeout( r, 1500 ) );
			const page = window.refraction.getPanelView().getCurrentPageView();
			page.activateSection( 'section_rf_hl' );
			page._renderChildren();
			await new Promise( ( r ) => setTimeout( r, 500 ) );
			const label = ( n ) => document.querySelector( `.refraction-control-${ n } .refraction-control-title` )?.textContent.trim();
			window.$e.run( 'document/elements/settings', { container: c, settings: { rf_hl_desc: 'Licensed' } } );
			return [ label( 'rf_hl_words' ), label( 'rf_hl_desc' ) ];
		} );
		await sleep( 1500 );
		const two = await frame.evaluate( () => [ ...document.querySelectorAll( '[data-id="hl00004"] .rf-hl' ) ].map( ( s ) => s.textContent ).join() );
		check( 'editor', 'a widget with a title and a description has two boxes, and the preview follows each', 'Title Words To Highlight' === panel[ 0 ] && 'Description Words To Highlight' === panel[ 1 ] && 'Safe,Licensed' === two, JSON.stringify( [ panel, two ] ) );
		const showPanel = await e.evaluate( async () => {
			const c = window.refraction.getContainer( 'hl00012' );
			window.$e.run( 'document/elements/select', { container: c } );
			await new Promise( ( r ) => setTimeout( r, 1500 ) );
			const v = window.refraction.getPanelView().getCurrentPageView();
			v.activateSection( 'section_rf_hl' );
			v._renderChildren();
			await new Promise( ( r ) => setTimeout( r, 500 ) );
			const boxes = [ ...document.querySelectorAll( '[class*="refraction-control-rf_hl_part_"] .refraction-control-title' ) ].map( ( t ) => t.textContent.trim() );
			window.$e.run( 'document/elements/settings', { container: c, settings: { rf_hl_part_label: 'free' } } );
			return boxes;
		} );
		await sleep( 2500 );
		const showLive = await frame.evaluate( () => ( {
			label: [ ...document.querySelectorAll( '[data-id="hl00012"] .rf-showcase__label .rf-hl' ) ].map( ( x ) => x.textContent ).join(),
			heading: [ ...document.querySelectorAll( '[data-id="hl00012"] .rf-showcase__heading .rf-hl' ) ].map( ( x ) => x.textContent ).join(),
		} ) );
		check( 'editor', 'Phone Showcase has a words box per part (Label, Heading, Description, Step Titles, Step Texts, Buttons, Floating Cards); typing in the Label box highlights only the label', 7 === showPanel.length && /^Label/.test( showPanel[ 0 ] ) && /^Floating Cards/.test( showPanel[ 6 ] ) && 'free' === showLive.label && 'Download' === showLive.heading, JSON.stringify( [ showPanel, showLive ] ) );
		await e.locator( '#refraction-panel' ).screenshot( { path: join( SHOTS, 'showcase-panel.png' ) } ).catch( () => {} );
		await ctx.close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 900 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall highlight checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
