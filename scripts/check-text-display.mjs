#!/usr/bin/env node
/**
 * Showing a widget's text (Text_Display_Trait; SQLite test site, Chromium): cut to a number of lines with a Show more /
 * Show less toggle (a full-width button or a text link, hidden when the text is not cut, gone once open when there is
 * no Show less text, usable from the keyboard), the full text in a tooltip, and the text as a tooltip (on a trigger in
 * Text Editor). Text Editor, Icon Box, Image Box, Testimonial, Alert, Call to Action and Author Box; and the editor.
 *
 * Usage: node scripts/check-text-display.mjs [--site /tmp/rf-td-site] [--port 9210] [--shots /tmp/text-display-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-td-site' );
const PORT = arg( 'port', '9210' );
const SHOTS = arg( 'shots', '/tmp/text-display-shots' );
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

function page( title, widgets ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	const data = [ { id: `c${ id }`.slice( 0, 7 ), elType: 'container', isInner: false, settings: {}, elements: widgets } ];
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ] ] ) {
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
	const watch = ( p ) => p.on( 'pageerror', ( e ) => 'Transition was skipped' !== e.message && errors.push( `${ e.message } @ ${ p.url() }` ) );
	const at = async ( url, width, height = 800 ) => {
		const p = await ( await browser.newContext( { viewport: { width, height } } ) ).newPage();
		watch( p );
		await p.goto( url );
		return p;
	};

	const long = 'Inverness Taxis, with over 60 years of service in the Highlands, offers tailored corporate transportation solutions designed to meet the needs of every business, large or small, every day of the year. Our drivers know every road from the city centre to the most remote glens, and every journey is planned around you: airport transfers, meetings, events and tours. ';
	const para = `<p>${ long.repeat( 2 ) }</p><p>${ long }</p><ul><li>Airport transfers</li><li>Corporate accounts</li></ul>`;
	const clamp = ( lines, more = {} ) => ( { box_description_display: 'clamp', box_description_lines: lines, box_read_more: 'yes', ...more } );

	try {
		wp( [ 'user', 'meta', 'update', '1', 'description', long.repeat( 2 ) ] );
		const w = ( id, widgetType, settings ) => ( { id, elType: 'widget', widgetType, settings, elements: [] } );
		const p1 = page( 'Text display', [
			w( 'te01', 'text-editor', { editor: para, ...clamp( 3 ) } ),
			w( 'te02', 'text-editor', { editor: '<p>Short text.</p>', ...clamp( 3 ) } ),
			w( 'te03', 'text-editor', { editor: '<p>Booking lines open 24/7.</p>', box_description_display: 'tooltip', box_tooltip_trigger: 'Opening hours' } ),
			w( 'te04', 'text-editor', { editor: para, ...clamp( 2, { box_read_more_style: 'text', box_read_more_text: 'Read more', box_read_less_text: '' } ) } ),
			w( 'ib01', 'icon-box', { title_text: 'Corporate', description_text: long, ...clamp( 2, { box_read_more_style: 'text', box_description_full_tooltip: 'yes' } ) } ),
			w( 'mb01', 'image-box', { title_text: 'Our cars', description_text: long, image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` }, ...clamp( 2 ) } ),
			w( 'ts01', 'testimonial', { testimonial_content: long, testimonial_name: 'Anna', ...clamp( 2 ) } ),
			w( 'ts02', 'testimonial', { testimonial_content: 'Always on time.', testimonial_name: 'Ben', box_description_display: 'tooltip' } ),
			w( 'al01', 'alert', { alert_title: 'Road works', alert_description: 'The A9 is closed at night this week.', box_description_display: 'tooltip' } ),
			w( 'ct01', 'refraction-call-to-action', { title: 'Book now', description: long, ...clamp( 2 ) } ),
			w( 'au01', 'theme-author-box', { source: 'custom', user: '1', ...clamp( 2 ) } ),
		] );
		const b = await at( p1.url, 1280, 900 );
		await sleep( 800 );

		const state = ( id ) => b.evaluate( ( wid ) => {
			const el = document.querySelector( `[data-id="${ wid }"]` );
			const text = el.querySelector( '.refraction-box-description' );
			const btn = el.querySelector( '.refraction-read-more' );
			const lh = parseFloat( getComputedStyle( text ).lineHeight );
			return {
				lines: Math.round( text.getBoundingClientRect().height / lh ), width: Math.round( text.getBoundingClientRect().width ), cut: text.scrollHeight > text.clientHeight + 1,
				toggle: btn ? { shown: !! btn.offsetParent, label: [ ...btn.children ].filter( ( c ) => c.offsetParent && c.textContent.trim() ).map( ( c ) => c.textContent.trim() ).join( '|' ), expanded: btn.getAttribute( 'aria-expanded' ), width: Math.round( btn.getBoundingClientRect().width ), wrap: Math.round( btn.parentElement.getBoundingClientRect().width ), icon: btn.querySelector( '.refraction-read-more__icon' ) ? getComputedStyle( btn.querySelector( '.refraction-read-more__icon' ) ).rotate : null } : null,
			};
		}, id );

		// Text Editor: cut to three lines with a full-width "Show more" button; open; close again.
		let te = await state( 'te01' );
		check( 'text editor', 'rich text (paragraphs, list) cut to three lines', 3 === te.lines && te.cut, JSON.stringify( te ) );
		check( 'text editor', 'a full-width "Show more" button under it', te.toggle?.shown && 'Show more' === te.toggle.label && te.toggle.width === te.toggle.wrap && te.toggle.wrap === te.width && 'false' === te.toggle.expanded, JSON.stringify( te.toggle ) );
		await b.locator( '[data-id="te01"]' ).screenshot( { path: join( SHOTS, 'text-editor-cut.png' ) } );
		await b.click( '[data-id="te01"] .refraction-read-more' );
		await sleep( 300 );
		const open = await state( 'te01' );
		check( 'text editor', 'Show more opens the whole text; the button says Show less and its arrow turns', open.lines > 8 && ! open.cut && 'Show less' === open.toggle.label && 'true' === open.toggle.expanded && '180deg' === open.toggle.icon, JSON.stringify( open ) );
		await b.locator( '[data-id="te01"]' ).screenshot( { path: join( SHOTS, 'text-editor-open.png' ) } );
		await b.click( '[data-id="te01"] .refraction-read-more' );
		await sleep( 300 );
		te = await state( 'te01' );
		check( 'text editor', 'Show less cuts it again', 3 === te.lines && 'Show more' === te.toggle.label && 'false' === te.toggle.expanded, JSON.stringify( te ) );
		await b.focus( '[data-id="te01"] .refraction-read-more' );
		await b.keyboard.press( 'Enter' );
		await sleep( 300 );
		const keyed = await state( 'te01' );
		check( 'text editor', 'the button works from the keyboard', 'true' === keyed.toggle.expanded && ! keyed.cut, JSON.stringify( keyed.toggle ) );
		const controls = await b.evaluate( () => {
			const btn = document.querySelector( '[data-id="te01"] .refraction-read-more' ); return btn.getAttribute( 'aria-controls' ) && document.getElementById( btn.getAttribute( 'aria-controls' ) )?.classList.contains( 'refraction-box-description' );
		} );
		check( 'text editor', 'the button names the text it opens (aria-controls)', controls );

		const short = await state( 'te02' );
		check( 'text editor', 'text short enough not to be cut: no toggle', ! short.cut && ! short.toggle.shown, JSON.stringify( short ) );

		let te4 = await state( 'te04' );
		check( 'text editor', 'a text link toggle with its own text ("Read more"), two lines', 2 === te4.lines && te4.toggle.shown && 'Read more' === te4.toggle.label && te4.toggle.width < 200, JSON.stringify( te4 ) );
		await b.click( '[data-id="te04"] .refraction-read-more' );
		await sleep( 300 );
		te4 = await state( 'te04' );
		check( 'text editor', 'with no Show less text the toggle goes away once open', ! te4.cut && ! te4.toggle.shown, JSON.stringify( te4 ) );

		// Text Editor as a tooltip on its trigger.
		const tip = ( id, sel ) => b.evaluate( ( [ wid, s ] ) => {
			const t = document.querySelector( `[data-id="${ wid }"] .refraction-box-tooltip` ); const a = document.querySelector( `[data-id="${ wid }"] ${ s }` ).getBoundingClientRect(); const r = t.getBoundingClientRect(); return { opacity: getComputedStyle( t ).opacity, below: r.top >= a.bottom - 1, color: getComputedStyle( t ).color, inner: getComputedStyle( t.firstElementChild || t ).color, text: t.textContent.trim().slice( 0, 40 ) };
		}, [ id, sel ] );
		const trig = await b.evaluate( () => document.querySelector( '[data-id="te03"] .refraction-text-tooltip-trigger' )?.textContent.trim() );
		let t3 = await tip( 'te03', '.refraction-text-tooltip-trigger' );
		check( 'text editor', 'as a tooltip: the trigger text shows, the text waits hidden', 'Opening hours' === trig && '0' === t3.opacity, JSON.stringify( [ trig, t3 ] ) );
		await b.hover( '[data-id="te03"] .refraction-text-tooltip-trigger' );
		await sleep( 400 );
		t3 = await tip( 'te03', '.refraction-text-tooltip-trigger' );
		check( 'text editor', 'hovering the trigger shows the text in a tooltip under it (white on dark)', '1' === t3.opacity && t3.below && 'rgb(255, 255, 255)' === t3.color && 'rgb(255, 255, 255)' === t3.inner && /Booking lines/.test( t3.text ), JSON.stringify( t3 ) );
		await b.screenshot( { path: join( SHOTS, 'text-editor-tooltip.png' ), clip: await b.locator( '[data-id="te03"]' ).boundingBox().then( ( r ) => ( { x: 0, y: Math.max( 0, r.y - 20 ), width: 1280, height: 200 } ) ) } );
		await b.mouse.move( 1270, 5 );
		await sleep( 300 );
		await b.focus( '[data-id="te03"] .refraction-text-tooltip-trigger' );
		await sleep( 400 );
		check( 'text editor', 'and reaching the trigger with the keyboard shows it too', '1' === ( await tip( 'te03', '.refraction-text-tooltip-trigger' ) ).opacity );
		await b.locator( '[data-id="te03"] .refraction-text-tooltip-trigger' ).blur();

		// Icon Box: text link toggle and the full text in a tooltip, which stops while the text is open.
		await b.mouse.move( 1270, 5 );
		let ib = await state( 'ib01' );
		check( 'icon box', 'description cut to two lines with a "Show more" text link', 2 === ib.lines && ib.cut && ib.toggle.shown && 'Show more' === ib.toggle.label && ib.toggle.width < 200, JSON.stringify( ib ) );
		await b.hover( '[data-id="ib01"] .refraction-icon-box-title' );
		await sleep( 400 );
		const fullBefore = await b.evaluate( () => getComputedStyle( document.querySelector( '[data-id="ib01"] .refraction-box-tooltip--full' ) ).opacity );
		await b.click( '[data-id="ib01"] .refraction-read-more' );
		await b.hover( '[data-id="ib01"] .refraction-icon-box-title' );
		await sleep( 400 );
		ib = await state( 'ib01' );
		const fullAfter = await b.evaluate( () => getComputedStyle( document.querySelector( '[data-id="ib01"] .refraction-box-tooltip--full' ) ).opacity );
		check( 'icon box', 'Show more opens it, and the full-text tooltip shows only while it is cut', ! ib.cut && 'Show less' === ib.toggle.label && '1' === fullBefore && '0' === fullAfter, JSON.stringify( [ ib, fullBefore, fullAfter ] ) );
		await b.mouse.move( 1270, 5 );

		// The others: cut, opened by the toggle.
		for ( const [ id, name ] of [ [ 'mb01', 'image box' ], [ 'ts01', 'testimonial' ], [ 'ct01', 'call to action' ], [ 'au01', 'author box' ] ] ) {
			const before = await state( id );
			await b.click( `[data-id="${ id }"] .refraction-read-more` );
			await sleep( 300 );
			const after = await state( id );
			check( name, 'its text cut to two lines; Show more opens it', 2 === before.lines && before.cut && before.toggle.shown && ! after.cut && 'true' === after.toggle.expanded, JSON.stringify( [ before, after ] ) );
		}

		// Testimonial and Alert as a tooltip of the widget.
		for ( const [ id, name, sel, re ] of [ [ 'ts02', 'testimonial', '.refraction-testimonial-name', /Always on time/ ], [ 'al01', 'alert', '.refraction-alert-title', /A9 is closed/ ] ] ) {
			const hidden = ( await tip( id, sel ) ).opacity;
			await b.hover( `[data-id="${ id }"] ${ sel }` );
			await sleep( 400 );
			const shown = await tip( id, sel );
			check( name, 'its text as a tooltip, shown while it is hovered', '0' === hidden && '1' === shown.opacity && 'rgb(255, 255, 255)' === shown.color && re.test( shown.text ), JSON.stringify( [ hidden, shown ] ) );
			await b.mouse.move( 1270, 5 );
			await sleep( 300 );
		}

		// Phone width: still cut, the toggle still opens it.
		const phone = await at( p1.url, 375, 800 );
		await sleep( 600 );
		const ph = await phone.evaluate( () => {
			const t = document.querySelector( '[data-id="te01"] .refraction-box-description' ); return { lines: Math.round( t.getBoundingClientRect().height / parseFloat( getComputedStyle( t ).lineHeight ) ), sideways: document.documentElement.scrollWidth > window.innerWidth };
		} );
		await phone.click( '[data-id="te01"] .refraction-read-more' );
		await sleep( 300 );
		const phOpen = await phone.evaluate( () => document.querySelector( '[data-id="te01"]' ).classList.contains( 'is-text-expanded' ) );
		check( 'phone', 'cut to three lines at phone width, no sideways scroll, the toggle opens it', 3 === ph.lines && ! ph.sideways && phOpen, JSON.stringify( [ ph, phOpen ] ) );
		await phone.locator( '[data-id="te01"]' ).screenshot( { path: join( SHOTS, 'phone.png' ) } );
		await phone.context().close();
		await b.context().close();

		// The editor: the toggle and the tooltip trigger in the preview, the toggle opens the text there too.
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const e = await ctx.newPage();
		watch( e );
		await e.goto( `${ BASE }/wp-login.php` );
		await e.fill( '#user_login', 'admin' );
		await e.fill( '#user_pass', 'admin' );
		await Promise.all( [ e.waitForURL( /wp-admin/, { timeout: 120000 } ), e.click( '#wp-submit' ) ] );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p1.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3000 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const inEditor = await frame.evaluate( () => ( {
			toggles: [ ...document.querySelectorAll( '.refraction-read-more' ) ].filter( ( x ) => x.offsetParent ).length,
			trigger: !! document.querySelector( '[data-id="te03"] .refraction-text-tooltip-trigger' ),
			cut: ( () => {
				const t = document.querySelector( '[data-id="te01"] .refraction-box-description' ); return t.scrollHeight > t.clientHeight + 1;
			} )(),
		} ) );
		check( 'editor', 'the preview shows the toggles (not on the short text), the cut text and the tooltip trigger', 7 === inEditor.toggles && inEditor.trigger && inEditor.cut, JSON.stringify( inEditor ) );
		// The floating panel covers the preview's left side: click the button's right end.
		const edBox = await frame.locator( '[data-id="te01"] .refraction-read-more' ).boundingBox();
		await frame.click( '[data-id="te01"] .refraction-read-more', { position: { x: edBox.width - 40, y: edBox.height / 2 } } );
		await sleep( 600 );
		const edOpen = await frame.evaluate( () => ( { open: document.querySelector( '[data-id="te01"]' ).classList.contains( 'is-text-expanded' ), aria: document.querySelector( '[data-id="te01"] .refraction-read-more' ).getAttribute( 'aria-expanded' ) } ) );
		check( 'editor', 'the toggle opens the text in the preview too', edOpen.open && 'true' === edOpen.aria, JSON.stringify( edOpen ) );
		const panel = await e.evaluate( () => {
			const c = window.refraction.widgetsCache[ 'text-editor' ]?.controls || {}; const cta = window.refraction.widgetsCache[ 'refraction-call-to-action' ]?.controls || {}; return { te: [ 'box_description_display', 'box_read_more', 'box_read_more_style', 'box_tooltip_trigger', 'box_read_more_align' ].every( ( k ) => c[ k ] ), teOptions: Object.keys( c.box_description_display?.options || {} ), ctaOptions: Object.keys( cta.box_description_display?.options || {} ) };
		} );
		check( 'editor', 'Text Editor has the display, toggle and trigger settings; Call to Action offers no tooltip (its box clips it)', panel.te && 'text,clamp,tooltip' === panel.teOptions.join() && 'text,clamp' === panel.ctaOptions.join(), JSON.stringify( panel ) );
		await e.screenshot( { path: join( SHOTS, 'editor.png' ) } );
		await ctx.close();

		check( 'console', 'no JavaScript errors', 0 === errors.length, errors.slice( 0, 5 ).join( ' | ' ) );
		const phpLog = logTail( logStart ).trim();
		check( 'php', 'nothing in the PHP error log', '' === phpLog, phpLog.slice( 0, 700 ) );
	} catch ( err ) {
		check( 'script', err.message.split( '\n' )[ 0 ], false );
		console.error( err );
	} finally {
		await browser.close();
		if ( server ) {
			server.kill();
		}
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall text display checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
