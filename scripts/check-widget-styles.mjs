/**
 * Style additions of 0.62.0 (a test site): Nested Carousel arrow hover, corners, border, distance from the edge and
 * the active bullet pill, gap and spacing; Share Buttons hover color; Phone Showcase floating cards kept on a phone
 * screen with no sideways page scroll.
 *
 * Usage: node scripts/check-widget-styles.mjs PORT SITE_DIR
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire( import.meta.url );
const { chromium } = require( 'playwright' );
const [ , , PORT, SITE ] = process.argv;
const wp = ( a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', '/tmp/rsite-dl/wpcli.phar', `--path=${ SITE }/wordpress`, '--allow-root', ...a ], { encoding: 'utf8' } );
const px = ( n ) => ( { unit: 'px', size: n } );
const kids = ( p ) => [ 1, 2, 3 ].map( ( i ) => ( { id: `${ p }${ i }`, elType: 'container', isInner: true, settings: { min_height: px( 120 ), background_background: 'classic', background_color: '#DDDDDD' }, elements: [] } ) );
const data = [ { id: 'cstyle1', elType: 'container', isInner: false, settings: {}, elements: [
	{ id: 'ncstyle', elType: 'widget', widgetType: 'refraction-nested-carousel', settings: { slides: [ { slide_title: 'A' }, { slide_title: 'B' }, { slide_title: 'C' } ], arrow_color: '#111111', arrow_bg: '#FFFFFF', arrow_color_hover: '#FFFFFF', arrow_bg_hover: '#E20A17', arrow_radius: { unit: 'px', size: 8 }, arrow_border_border: 'solid', arrow_border_width: { unit: 'px', top: '2', right: '2', bottom: '2', left: '2', isLinked: true }, arrow_border_color: '#E20A17', arrow_offset: px( 30 ), dots_active_width: px( 28 ), dots_gap: px( 14 ), pagination_spacing: px( 30 ) }, elements: kids( 'nck' ) },
	{ id: 'shstyle', elType: 'widget', widgetType: 'refraction-share-buttons', settings: { color_mode: 'custom', primary_color: '#222222', primary_color_hover: '#E20A17' }, elements: [] },
	{ id: 'psstyle', elType: 'widget', widgetType: 'refraction-phone-showcase', settings: { cards_phone: 'yes' }, elements: [] },
] } ];
const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Style check', '--porcelain' ] ).trim();
for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ], [ '_wp_page_template', 'refraction_header_footer' ] ] ) {
	wp( [ 'post', 'meta', 'update', id, k, v ] );
}
const b = await chromium.launch();
const p = await b.newPage( { viewport: { width: 1280, height: 900 } } );
await p.goto( `http://127.0.0.1:${ PORT }/?page_id=${ id }` ); await p.waitForTimeout( 1800 );
const arrow = () => p.evaluate( () => {
	const a = document.querySelector( '[data-id="ncstyle"] .refraction-nc__prev' ); const r = a.getBoundingClientRect(); const v = document.querySelector( '[data-id="ncstyle"] .refraction-nc' ).getBoundingClientRect(); const cs = getComputedStyle( a ); return { bg: cs.backgroundColor, color: cs.color, radius: cs.borderTopLeftRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor, left: Math.round( r.left - v.left ) };
} );
const before = await arrow();
await p.hover( '[data-id="ncstyle"] .refraction-nc__prev' ); await p.waitForTimeout( 400 );
const hover = await arrow();
const dots = await p.evaluate( () => {
	const d = [ ...document.querySelectorAll( '[data-id="ncstyle"] .swiper-pagination-bullet' ) ]; const pg = document.querySelector( '[data-id="ncstyle"] .refraction-nc__pagination' ); return { widths: d.map( ( x ) => Math.round( x.getBoundingClientRect().width ) ), gap: getComputedStyle( pg ).columnGap, top: getComputedStyle( pg ).marginBlockStart };
} );
await p.hover( '[data-id="shstyle"] .refraction-share__button' ); await p.waitForTimeout( 400 );
const share = await p.evaluate( () => getComputedStyle( document.querySelector( '[data-id="shstyle"] .refraction-share__button' ) ).backgroundColor );
const m = await b.newPage( { viewport: { width: 390, height: 844 } } );
await m.goto( `http://127.0.0.1:${ PORT }/?page_id=${ id }` ); await m.waitForTimeout( 1500 );
const phone = await m.evaluate( () => ( { page: document.documentElement.scrollWidth, cards: [ ...document.querySelectorAll( '[data-id="psstyle"] .rf-showcase__card' ) ].map( ( c ) => {
	const r = c.getBoundingClientRect(); return [ Math.round( r.left ), Math.round( r.right ) ];
} ) } ) );
console.log( JSON.stringify( { before, hover, dots, share, phone } ) );
const ok = 'rgb(255, 255, 255)' === before.bg && '8px' === before.radius && /2px rgb\(226, 10, 23\)/.test( before.border ) && 30 === before.left && 'rgb(226, 10, 23)' === hover.bg && 'rgb(255, 255, 255)' === hover.color && 28 === dots.widths[ 0 ] && 10 === dots.widths[ 1 ] && '14px' === dots.gap && '30px' === dots.top && 'rgb(226, 10, 23)' === share && phone.page <= 390 && phone.cards.every( ( [ l, r ] ) => l >= 0 && r <= 390 );
console.log( ok ? 'STYLE CHECKS OK' : 'STYLE CHECKS FAILED' );
await b.close();
