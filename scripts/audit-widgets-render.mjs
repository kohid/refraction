/**
 * Widget audit, step 2: renders every widget (desktop and phone) with each color setting from step 1 set to a color of
 * its own, and reports the colors that appear nowhere in the widget (a setting that does nothing, or one whose part
 * the default content leaves out), widgets that render nothing, phone overflow, JavaScript errors and PHP notices.
 * Findings need reading: a color can be missing only because the default content has no such part.
 *
 * Usage: node scripts/audit-widgets-render.mjs PORT SITE_DIR IN.json OUT.json
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
const require = createRequire( import.meta.url );
const { chromium } = require( 'playwright' );
const [ , , PORT, SITE, IN, OUT ] = process.argv;
const BASE = `http://127.0.0.1:${ PORT }`;
const LOG = `${ SITE }/php-error.log`;
const wp = ( a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', '/tmp/rsite-dl/wpcli.phar', `--path=${ SITE }/wordpress`, '--allow-root', ...a ], { encoding: 'utf8' } );
const all = JSON.parse( readFileSync( IN, 'utf8' ) );
const skip = /^(rfb-|wp-widget-|refraction-facebook|google_maps|container$|refraction-template$|shortcode$|html$|sidebar$|menu-anchor$|floating-bars|contact-buttons|audio$|refraction-login$)/;
const nested = { 'nested-accordion': 2, 'nested-tabs': 2, 'refraction-mega-menu': 2, 'refraction-nested-carousel': 2, 'refraction-off-canvas': 1, 'refraction-timed-slides': 2 };
const names = Object.keys( all ).filter( ( n ) => ! skip.test( n ) );
let menu = '';
try {
	menu = wp( [ 'menu', 'create', 'Audit', '--porcelain' ] ).trim();
	wp( [ 'menu', 'item', 'add-custom', menu, 'Home', BASE ] );
	const parent = wp( [ 'menu', 'item', 'add-custom', menu, 'Services', '#s', '--porcelain' ] ).trim();
	wp( [ 'menu', 'item', 'add-custom', menu, 'Airport', '#a', `--parent-id=${ parent }` ] );
} catch ( e ) {}
// Unique colors, one per control.
let k = 0;
const hex = () => {
	k++;
	const r = 20 + ( ( k * 37 ) % 200 ),
		g = 30 + ( ( k * 53 ) % 190 ),
		b = 40 + ( ( k * 71 ) % 180 );
	return '#' + [ r, g, b ].map( ( x ) => x.toString( 16 ).padStart( 2, '0' ) ).join( '' );
};
const plan = [];
names.forEach( ( name, i ) => {
	const id = 'w' + String( i ).padStart( 6, '0' );
	const settings = {};
	const tests = all[ name ].colors.map( ( c ) => {
		const v = hex();
		settings[ c.id ] = v;
		return { ...c, value: v };
	} );
	if ( 'refraction-nav-menu' === name && menu ) {
		settings.menu = menu;
	}
	const kids = nested[ name ] ? Array.from( { length: nested[ name ] }, ( _, j ) => ( { id: `${ id.slice( 0, 6 ) }${ j }`, elType: 'container', isInner: true, settings: {}, elements: [ { id: `t${ id.slice( 1, 6 ) }${ j }`, elType: 'widget', widgetType: 'heading', settings: { title: `Inside ${ j + 1 }` }, elements: [] } ] } ) ) : [];
	plan.push( { name, id, tests, el: { id, elType: 'widget', widgetType: name, settings, elements: kids } } );
} );
const pages = [];
for ( let i = 0; i < plan.length; i += 12 ) {
	const chunk = plan.slice( i, i + 12 );
	const data = chunk.map( ( p, j ) => ( { id: `c${ String( i + j ).padStart( 6, '0' ) }`, elType: 'container', isInner: false, settings: { content_width: 'boxed' }, elements: [ p.el ] } ) );
	const pid = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=Audit ${ i }`, '--porcelain' ] ).trim();
	for ( const [ kk, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ], [ '_wp_page_template', 'refraction_header_footer' ] ] ) {
		wp( [ 'post', 'meta', 'update', pid, kk, v ] );
	}
	pages.push( { pid, chunk } );
}
const b = await chromium.launch( { args: [ '--use-gl=swiftshader', '--enable-unsafe-swiftshader' ] } );
const results = {};
const rgb = ( h ) => `rgb(${ parseInt( h.slice( 1, 3 ), 16 ) }, ${ parseInt( h.slice( 3, 5 ), 16 ) }, ${ parseInt( h.slice( 5, 7 ), 16 ) })`;
for ( const { pid, chunk } of pages ) {
	for ( const [ vw, vh ] of [ [ 1280, 900 ], [ 390, 844 ] ] ) {
		const logFrom = existsSync( LOG ) ? statSync( LOG ).size : 0;
		const ctx = await b.newContext( { viewport: { width: vw, height: vh } } );
		const p = await ctx.newPage();
		const errs = [];
		p.on( 'pageerror', ( e ) => errs.push( 'pageerror: ' + e.message ) );
		p.on( 'console', ( m ) => 'error' === m.type() && ! /favicon|net::ERR|Failed to load resource|youtube|vimeo|google|facebook|ytimg/i.test( m.text() ) && errs.push( 'console: ' + m.text() ) );
		await p.goto( `${ BASE }/?page_id=${ pid }`, { waitUntil: 'load', timeout: 120000 } );
		await p.waitForTimeout( 2500 );
		for ( const item of chunk ) {
			const r = await p.evaluate( ( [ id ] ) => {
				const el = document.querySelector( `[data-id="${ id }"]` );
				if ( ! el ) {
					return { missing: true };
				}
				const props = [ 'color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke', 'textDecorationColor', 'columnRuleColor', 'caretColor', 'boxShadow', 'textShadow', 'backgroundImage', 'webkitTextStrokeColor', 'webkitTextFillColor' ];
				const seen = new Set();
				const add = ( cs ) => props.forEach( ( pr ) => {
					const v = cs[ pr ];
					if ( v ) {
						( String( v ).match( /rgba?\([^)]*\)/g ) || [] ).forEach( ( m ) => seen.add( m.replace( /rgba\((\d+), (\d+), (\d+), 1\)/, 'rgb($1, $2, $3)' ).replace( /rgba\((\d+), (\d+), (\d+), [0-9.]+\)/, 'rgb($1, $2, $3)' ) ) );
					}
				} );
				const nodes = [ el, ...el.querySelectorAll( '*' ) ];
				nodes.forEach( ( n ) => {
					add( getComputedStyle( n ) );
					add( getComputedStyle( n, '::before' ) );
					add( getComputedStyle( n, '::after' ) );
					add( getComputedStyle( n, '::marker' ) );
				} );
				const rect = el.getBoundingClientRect();
				return { seen: [ ...seen ], h: Math.round( rect.height ), right: Math.round( rect.right ), page: document.documentElement.scrollWidth, vw: window.innerWidth };
			}, [ item.id ] );
			const res = results[ item.name ] || ( results[ item.name ] = { title: all[ item.name ].title, unused: null, issues: [] } );
			if ( r.missing ) {
				res.issues.push( `${ vw }px: not on the page` );
				continue;
			}
			if ( 1280 === vw ) {
				res.unused = item.tests.filter( ( t ) => ! r.seen.includes( rgb( t.value ) ) ).map( ( t ) => `${ t.id } (${ t.label }) ${ t.sel.slice( 0, 90 ) }` );
				res.tested = item.tests.length;
				if ( 0 === r.h ) {
					res.issues.push( 'renders nothing (0 height) on desktop' );
				}
			} else if ( r.right > r.vw + 2 ) {
				res.issues.push( `phone: wider than the screen (right edge ${ r.right } > ${ r.vw })` );
			}
		}
		const pageWide = await p.evaluate( () => document.documentElement.scrollWidth > window.innerWidth + 1 );
		const php = existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( logFrom ).trim() : '';
		if ( errs.length || php || ( 390 === vw && pageWide ) ) {
			results[ `_page ${ pid } ${ vw }` ] = { widgets: chunk.map( ( c ) => c.name ), errs: errs.slice( 0, 6 ), php: php.slice( 0, 1500 ), pageWide };
		}
		await ctx.close();
	}
}
writeFileSync( OUT, JSON.stringify( results, null, 1 ) );
const bad = Object.entries( results ).filter( ( [ n, r ] ) => ! n.startsWith( '_' ) && ( ( r.unused && r.unused.length ) || r.issues.length ) );
console.log( names.length, 'widgets rendered;', bad.length, 'with findings;', Object.keys( results ).filter( ( n ) => n.startsWith( '_' ) ).length, 'pages with errors' );
await b.close();
