#!/usr/bin/env node
/**
 * Admin design check (0.107.0): the Refraction admin screens get one look (assets/ui-theme/ui-admin-design.css) in the
 * colours of the chosen Interface theme.
 *
 * Usage: node scripts/check-admin-design.mjs --site DIR --port N [--shots DIR]
 *
 * For Automatic and each Interface theme (saved through the picker's own AJAX save), on every Refraction admin page:
 *   - body has the rf-admin class and the design stylesheet is loaded;
 *   - the page background, the primary button and the cards use the theme's colours (Automatic: the design's own);
 *   - text on cards and on the primary button clears WCAG AA (4.5:1);
 *   - no console errors.
 * Also: the WordPress Dashboard and Posts screens get neither the class nor the stylesheet.
 * 0.108.0, every view (Settings and Tools tabs, Submissions settings, Role Manager opened, Element Manager, Custom
 * Code editor, Custom Fonts / Icons, the New Template dialog, category screens), in Automatic and Blueprint: no text
 * under 3:1 against what is behind it (disabled controls included), and on Blueprint no white box left.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire( import.meta.url );
const { chromium } = require( 'playwright' );

const arg = ( name, fallback ) => {
	const i = process.argv.indexOf( `--${ name }` );
	return i >= 0 ? process.argv[ i + 1 ] : fallback;
};
const PORT = arg( 'port', '8766' );
const SHOTS = arg( 'shots', '' );
const BASE = `http://127.0.0.1:${ PORT }`;

const failures = [];
const fail = ( msg ) => {
	failures.push( msg );
	console.error( `FAIL  ${ msg }` );
};
const ok = ( msg ) => console.log( `ok    ${ msg }` );

// The pages that make up the Refraction menu (the ones that exist on every site).
const PAGES = [
	[ 'home', '/wp-admin/admin.php?page=refraction' ],
	[ 'settings', '/wp-admin/admin.php?page=refraction-settings' ],
	[ 'tools', '/wp-admin/admin.php?page=refraction-tools' ],
	[ 'templates', '/wp-admin/edit.php?post_type=refraction_library' ],
	[ 'theme-builder', '/wp-admin/admin.php?page=refraction-theme-builder' ],
	[ 'builder', '/wp-admin/admin.php?page=refraction-builder' ],
	[ 'events', '/wp-admin/edit.php?post_type=refraction_event' ],
	[ 'event-types', '/wp-admin/admin.php?page=refraction-event-types' ],
	[ 'floating', '/wp-admin/edit.php?post_type=e-floating-buttons' ],
	[ 'submissions', '/wp-admin/admin.php?page=refraction-submissions' ],
	[ 'custom-code', '/wp-admin/admin.php?page=refraction-custom-code' ],
	[ 'custom-fonts', '/wp-admin/admin.php?page=refraction-custom-fonts' ],
	[ 'custom-icons', '/wp-admin/admin.php?page=refraction-custom-icons' ],
	[ 'role-manager', '/wp-admin/admin.php?page=refraction-role-manager' ],
	[ 'system-info', '/wp-admin/admin.php?page=refraction-system-info' ],
	[ 'element-manager', '/wp-admin/admin.php?page=refraction-element-manager' ],
];

// Expected page / card / accent per theme (from assets/ui-theme/ui-themes.css; auto = the design's own palette).
const THEMES = {
	auto: { page: 'rgb(243, 245, 249)', card: 'rgb(255, 255, 255)', accent: 'rgb(10, 111, 194)' },
	daylight: { page: 'rgb(244, 246, 249)', card: 'rgb(255, 255, 255)', accent: 'rgb(59, 91, 219)' },
	graphite: { page: 'rgb(22, 24, 28)', card: 'rgb(29, 32, 38)', accent: 'rgb(91, 157, 255)' },
	ember: { page: 'rgb(26, 22, 19)', card: 'rgb(34, 29, 24)', accent: 'rgb(240, 161, 58)' },
	blueprint: { page: 'rgb(13, 27, 42)', card: 'rgb(19, 38, 56)', accent: 'rgb(34, 211, 238)' },
	contrast: { page: 'rgb(242, 242, 242)', card: 'rgb(255, 255, 255)', accent: 'rgb(0, 51, 204)' },
};

// The pages photographed for each theme (all of them for Automatic).
const SHOT_PAGES = [ 'home', 'settings', 'templates', 'builder', 'submissions' ];

const rgb = ( s ) => ( s.match( /[\d.]+/g ) || [] ).slice( 0, 3 ).map( Number );
const lum = ( c ) => {
	const [ r, g, b ] = c.map( ( v ) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : ( ( v + 0.055 ) / 1.055 ) ** 2.4;
	} );
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = ( a, b ) => {
	const [ x, y ] = [ lum( rgb( a ) ), lum( rgb( b ) ) ].sort( ( m, n ) => n - m );
	return ( x + 0.05 ) / ( y + 0.05 );
};

const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 1400, height: 900 } } );
const errors = [];
page.on( 'console', ( m ) => {
	if ( 'error' === m.type() && ! /favicon|Failed to load resource/.test( m.text() ) ) {
		errors.push( m.text() );
	}
} );
page.on( 'pageerror', ( e ) => errors.push( e.message ) );

if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

await page.goto( `${ BASE }/wp-login.php` );
await page.fill( '#user_login', 'admin' );
await page.fill( '#user_pass', 'admin' );
await Promise.all( [ page.waitForNavigation(), page.click( '#wp-submit' ) ] );

// Saves the theme the way the Settings > Theme picker does.
async function useTheme( theme ) {
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-settings` );
	const saved = await page.evaluate( async ( t ) => {
		const d = window.refractionUiTheme;
		const body = new URLSearchParams( { action: d.action, nonce: d.nonce, theme: t, scope: 'user' } );
		const r = await fetch( d.ajaxUrl, { method: 'POST', body, credentials: 'same-origin' } );
		return ( await r.json() ).success;
	}, theme );

	if ( ! saved ) {
		fail( `could not save theme ${ theme }` );
	}
}

for ( const [ theme, want ] of Object.entries( THEMES ) ) {
	await useTheme( theme );
	let pageFails = 0;

	for ( const [ name, path ] of PAGES ) {
		errors.length = 0;
		await page.goto( BASE + path, { waitUntil: 'networkidle' } ).catch( () => {} );
		await page.waitForTimeout( 300 );

		const got = await page.evaluate( () => {
			const css = ( el, prop ) => ( el ? getComputedStyle( el )[ prop ] : '' );
			const primary = document.querySelector( '#wpbody-content .page-title-action, #wpbody-content .button-primary, #wpbody-content .rfb-btn-primary' );
			const card = document.querySelector( '#wpbody-content .wp-list-table tbody td, #wpbody-content .form-table, #wpbody-content .rfb-card, #wpbody-content .refraction-home__links a, #wpbody-content .rtb-empty, #wpbody-content .rcc-empty, #wpbody-content .rf-cf__add, #wpbody-content .refraction-role-row, #wpbody-content .refraction-system-info-section' );
			const cardText = card && ( card.querySelector( 'strong, th, label, p, h2, span' ) || card );

			return {
				rfAdmin: document.body.classList.contains( 'rf-admin' ),
				sheet: !! document.querySelector( 'link#refraction-admin-design-css' ),
				theme: document.documentElement.getAttribute( 'data-refraction-theme' ) || 'auto',
				pageBg: css( document.getElementById( 'wpcontent' ), 'backgroundColor' ),
				primaryBg: css( primary, 'backgroundColor' ),
				primaryInk: css( primary, 'color' ),
				primaryText: primary ? primary.textContent.trim().slice( 0, 30 ) : '',
				cardBg: css( card, 'backgroundColor' ),
				cardInk: css( cardText, 'color' ),
				cardKind: card ? card.className.split( ' ' )[ 0 ] || card.tagName : '',
			};
		} );

		const where = `${ theme } / ${ name }`;
		const problems = [];

		if ( ! got.rfAdmin || ! got.sheet ) {
			problems.push( `rf-admin class ${ got.rfAdmin }, stylesheet ${ got.sheet }` );
		}

		if ( got.theme !== theme ) {
			problems.push( `theme attribute is ${ got.theme }` );
		}

		if ( got.pageBg !== want.page ) {
			problems.push( `page background ${ got.pageBg }, want ${ want.page }` );
		}

		if ( got.primaryBg && got.primaryBg !== want.accent ) {
			problems.push( `primary button "${ got.primaryText }" ${ got.primaryBg }, want ${ want.accent }` );
		}

		if ( got.primaryBg && contrast( got.primaryBg, got.primaryInk ) < 4.5 ) {
			problems.push( `primary button text contrast ${ contrast( got.primaryBg, got.primaryInk ).toFixed( 2 ) }` );
		}

		if ( got.cardBg && got.cardBg !== want.card ) {
			problems.push( `card (${ got.cardKind }) ${ got.cardBg }, want ${ want.card }` );
		}

		if ( got.cardBg && contrast( got.cardBg, got.cardInk ) < 4.5 ) {
			problems.push( `card text contrast ${ contrast( got.cardBg, got.cardInk ).toFixed( 2 ) } (${ got.cardInk } on ${ got.cardBg })` );
		}

		if ( errors.length ) {
			problems.push( `console: ${ errors[ 0 ] }` );
		}

		if ( problems.length ) {
			pageFails++;
			problems.forEach( ( p ) => fail( `${ where }: ${ p }` ) );
		}

		if ( SHOTS && ( 'auto' === theme || SHOT_PAGES.includes( name ) ) ) {
			await page.screenshot( { path: join( SHOTS, `admin-${ theme }-${ name }.png` ) } );
		}
	}

	if ( ! pageFails ) {
		ok( `${ theme }: ${ PAGES.length } pages in the theme's colours, text AA, no console errors` );
	}
}

// The New event wizard in a dark theme: its dialog is the card colour, not white.
await useTheme( 'blueprint' );
await page.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_event`, { waitUntil: 'networkidle' } );
await page.click( '.page-title-action' );
await page.waitForSelector( '.rf-wizard:not([hidden]) .rf-wizard__dialog' );
await page.waitForTimeout( 400 ); // Past the dialog's fade-in.
const dialogBg = await page.$eval( '.rf-wizard:not([hidden]) .rf-wizard__dialog', ( el ) => getComputedStyle( el ).backgroundColor );

if ( THEMES.blueprint.card === dialogBg ) {
	ok( 'New event wizard follows the theme (Blueprint card colour)' );
} else {
	fail( `New event wizard dialog ${ dialogBg }, want ${ THEMES.blueprint.card }` );
}

if ( SHOTS ) {
	await page.screenshot( { path: join( SHOTS, 'admin-blueprint-event-wizard.png' ) } );
}

await page.keyboard.press( 'Escape' );

// Not on WordPress's own screens.
for ( const path of [ '/wp-admin/index.php', '/wp-admin/edit.php' ] ) {
	await page.goto( BASE + path );
	const leak = await page.evaluate( () => document.body.classList.contains( 'rf-admin' ) || !! document.querySelector( 'link#refraction-admin-design-css' ) );

	if ( leak ) {
		fail( `${ path } got the Refraction admin design` );
	} else {
		ok( `${ path } keeps WordPress's own look` );
	}
}

// Every view: text readable against its background; on a dark theme, nothing left white.
const VIEWS = [
	...[ 'general', 'integrations', 'advanced', 'performance', 'experiments', 'theme', 'images' ].map( ( t ) => [ `settings ${ t }`, '/wp-admin/admin.php?page=refraction-settings', `#refraction-settings-tab-${ t }` ] ),
	...[ 0, 1, 2, 3 ].map( ( i ) => [ `tools tab ${ i + 1 }`, '/wp-admin/admin.php?page=refraction-tools', `.nav-tab-wrapper a >> nth=${ i }` ] ),
	[ 'submissions settings', '/wp-admin/admin.php?page=refraction-submissions', '.nav-tab-wrapper a >> nth=1' ],
	[ 'role manager, a role open', '/wp-admin/admin.php?page=refraction-role-manager', '.refraction-role-toggle >> nth=0' ],
	[ 'element manager', '/wp-admin/admin.php?page=refraction-element-manager' ],
	[ 'custom code editor', '/wp-admin/admin.php?page=refraction-custom-code&edit=0' ],
	[ 'custom fonts', '/wp-admin/admin.php?page=refraction-custom-fonts' ],
	[ 'custom icons', '/wp-admin/admin.php?page=refraction-custom-icons' ],
	[ 'new template dialog', '/wp-admin/post-new.php?post_type=refraction_library' ],
	[ 'event categories', '/wp-admin/edit-tags.php?taxonomy=refraction_event_cat&post_type=refraction_event' ],
];

for ( const theme of [ 'auto', 'blueprint' ] ) {
	await useTheme( theme );
	let viewFails = 0;

	for ( const [ name, path, click ] of VIEWS ) {
		errors.length = 0;
		await page.goto( BASE + path, { waitUntil: 'networkidle' } ).catch( () => {} );

		if ( click ) {
			await page.click( click ).catch( () => fail( `${ theme } / ${ name }: could not open (${ click })` ) );
		}

		await page.waitForTimeout( 600 );
		const found = await page.evaluate( ( dark ) => {
			const out = new Set();
			const where = ( e ) => {
				const parts = [];

				for ( let x = e, i = 0; x && x !== document.body && i < 3; x = x.parentElement, i++ ) {
					parts.unshift( x.tagName.toLowerCase() + ( x.id ? '#' + x.id : '' ) + ( x.classList.length ? '.' + [ ...x.classList ].slice( 0, 2 ).join( '.' ) : '' ) );
				}

				return parts.join( ' > ' );
			};
			const rgba = ( s ) => ( s.match( /[\d.]+/g ) || [] ).map( Number );
			const solid = ( c ) => c.length >= 3 && ( undefined === c[ 3 ] || c[ 3 ] > 0.5 );
			const lum = ( c ) => {
				const [ r, g, b ] = c.slice( 0, 3 ).map( ( v ) => {
					v /= 255;
					return v <= 0.03928 ? v / 12.92 : ( ( v + 0.055 ) / 1.055 ) ** 2.4;
				} );
				return 0.2126 * r + 0.7152 * g + 0.0722 * b;
			};
			const behind = ( e ) => {
				for ( let x = e; x; x = x.parentElement ) {
					const c = rgba( getComputedStyle( x ).backgroundColor );

					if ( solid( c ) ) {
						return c;
					}
				}

				return [ 255, 255, 255 ];
			};

			for ( const e of document.querySelectorAll( 'body *' ) ) {
				if ( e.closest( '#adminmenumain, #wpadminbar, .refraction-mini, .e-admin-top-bar, .screen-reader-text, #screen-meta-links' ) ) {
					continue;
				}

				const box = e.getBoundingClientRect();
				const cs = getComputedStyle( e );

				if ( box.width < 20 || box.height < 10 || 'hidden' === cs.visibility || 0 === +cs.opacity ) {
					continue;
				}

				const bg = rgba( cs.backgroundColor );

				if ( dark && solid( bg ) && lum( bg ) > 0.85 && box.width > 80 && ! e.matches( 'input[type=checkbox], input[type=radio]' ) ) {
					out.add( `white box: ${ where( e ) }` );
				}

				const color = rgba( cs.color );

				if ( [ ...e.childNodes ].some( ( t ) => 3 === t.nodeType && t.textContent.trim() ) && solid( color ) ) {
					const [ a, b ] = [ lum( color ), lum( behind( e ) ) ];
					const ratio = ( Math.max( a, b ) + 0.05 ) / ( Math.min( a, b ) + 0.05 );

					if ( ratio < 3 ) {
						out.add( `text ${ ratio.toFixed( 1 ) }:1: ${ where( e ) }` );
					}
				}
			}

			return [ ...out ].slice( 0, 6 );
		}, 'blueprint' === theme );

		if ( errors.length ) {
			found.push( `console: ${ errors[ 0 ] }` );
		}

		if ( found.length ) {
			viewFails++;
			found.forEach( ( f ) => fail( `${ theme } / ${ name }: ${ f }` ) );
		}

		if ( SHOTS && 'blueprint' === theme ) {
			await page.screenshot( { path: join( SHOTS, `view-${ theme }-${ name.replace( /\W+/g, '-' ) }.png` ) } );
		}
	}

	if ( ! viewFails ) {
		ok( `${ theme }: ${ VIEWS.length } more views readable${ 'blueprint' === theme ? ', nothing left white' : '' }` );
	}
}

await useTheme( 'auto' );
await browser.close();

if ( failures.length ) {
	console.error( `\n${ failures.length } failure(s)` );
	process.exit( 1 );
}

console.log( '\nAll admin design checks passed.' );
