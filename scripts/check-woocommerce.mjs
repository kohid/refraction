#!/usr/bin/env node
/**
 * WooCommerce builder check on a real WordPress with WooCommerce (SQLite test site, Chromium via Playwright).
 *
 * Usage: node scripts/check-woocommerce.mjs [--site /tmp/rf-woo-site] [--port 8911] [--shots /tmp/woo-shots]
 *                                           [--wpcli /tmp/rsite-dl/wpcli.phar] [--themes twentytwentyone,twentytwentyfive]
 *                                           [--only front|editor|off]
 * Prepare a FRESH site first: /tmp/fresh-woo.sh style = scripts/setup-menu-test-site.sh, WooCommerce activated and
 * scripts/fixtures/woocommerce-seed.php run (it writes SITE/seed.json), server on PORT. The site is changed
 * (cart, orders, templates, active theme); use a throw-away site.
 *
 * Covers, per theme (a classic and a block theme): the six template types on the right pages with include/exclude by
 * category, ID, type and stock; header and footer around them; every widget's data on a product page, the shop,
 * category pages and in a Loop Grid; add to cart with and without ajax, variations and the Menu Cart; cart, checkout with
 * a real Cash on Delivery order, order received, My Account (guest and customer), Order Tracking; the editor with live
 * widgets and Preview Settings; then WooCommerce deactivated (--only off or at the end): nothing breaks.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-woo-site' );
const PORT = arg( 'port', '8911' );
const SHOTS = arg( 'shots', '/tmp/woo-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const THEMES = arg( 'themes', 'twentytwentyone,twentytwentyfive' ).split( ',' );
const ONLY = arg( 'only', '' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );
const LOG = join( SITE, 'php-error.log' );
const FIX = join( HERE, 'fixtures/woocommerce-templates.php' );
const CLASSIC = new Set( [ 'twentytwentyone' ] );

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
		return execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ], timeout: 300000 } ).trim();
	} catch ( e ) {
		throw new Error( `wp ${ args.join( ' ' ).slice( 0, 120 ) } failed: ${ String( e.stderr || e.message ).slice( 0, 600 ) }` );
	}
}
const fixture = ( action, env = {} ) => {
	const out = wp( [ 'eval-file', FIX ], { WOO_ACTION: action, ...env } );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
};
const logSize = () => ( existsSync( LOG ) ? statSync( LOG ).size : 0 );
const logTail = ( from ) => ( existsSync( LOG ) ? readFileSync( LOG, 'utf8' ).slice( from ) : '' );
const get = async ( url, opts = {} ) => ( await fetch( BASE + url, { redirect: 'follow', ...opts } ) );
const html = async ( url ) => ( await get( url ) ).text();

/** The key of the Refraction template filling a body location in this HTML, or null. */
function slot( page, ids, location ) {
	const m = page.match( new RegExp( `<(?:main|header|footer) class="refraction-location-${ location }(?: [^"]*)?"[^>]*data-refraction-template-id="(\\d+)"` ) );
	return m ? ( Object.keys( ids ).find( ( k ) => ids[ k ] === parseInt( m[ 1 ], 10 ) ) ?? `#${ m[ 1 ] }` ) : null;
}

const MESSAGE_IGNORE = /favicon\.ico|Transition was skipped|Failed to load resource: the server responded with a status of (404|403)/;

async function main() {
	mkdirSync( SHOTS, { recursive: true } );
	const seed = JSON.parse( readFileSync( join( SITE, 'seed.json' ), 'utf8' ) );
	const logStart = logSize();
	const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
	const consoleErrors = [];
	const watch = ( page, label ) => {
		page.on( 'console', ( m ) => {
			if ( m.type() === 'error' && ! MESSAGE_IGNORE.test( m.location().url + m.text() ) ) { consoleErrors.push( `[${ label }] ${ m.text().slice( 0, 200 ) } @ ${ m.location().url }` ); }
		} );
		page.on( 'pageerror', ( e ) => ! MESSAGE_IGNORE.test( e.message ) && consoleErrors.push( `[${ label }] pageerror ${ e.message.slice( 0, 200 ) } @ ${ page.url() }` ) );
	};

	try {
		const themes = [];
		const installed = new Set( wp( [ 'theme', 'list', '--field=name' ] ).split( '\n' ) );
		for ( const t of THEMES ) {
			if ( ! installed.has( t ) ) {
				try { wp( [ 'theme', 'install', t ] ); } catch { console.log( `note: theme ${ t } could not be installed; skipped` ); continue; }
			}
			themes.push( t );
		}
		check( 'setup', 'a classic and a block theme are available', themes.some( ( t ) => CLASSIC.has( t ) ) && themes.some( ( t ) => ! CLASSIC.has( t ) ), themes.join( ',' ) );

		if ( ONLY !== 'off' ) {
			for ( const theme of themes ) {
				if ( ONLY === 'editor' ) { break; }
				await frontEnd( browser, theme, seed, watch );
			}
			if ( ONLY !== 'front' ) {
				await editor( browser, themes.find( ( t ) => ! CLASSIC.has( t ) ) || themes[ 0 ], seed, watch );
			}
		}

		if ( ! ONLY || 'off' === ONLY ) {
			await deactivated( browser, themes[ 0 ], seed, watch );
		}
	} finally {
		await browser.close();
	}

	const errors = logTail( logStart ).split( '\n' ).filter( ( l ) => /PHP (Warning|Notice|Fatal|Parse|Deprecated)|Uncaught/.test( l ) );
	const ours = errors.filter( ( l ) => /plugins\/refraction\// .test( l ) );
	const woo = errors.filter( ( l ) => ! /plugins\/refraction\//.test( l ) );
	check( 'log', 'no PHP warnings or errors from Refraction', ! ours.length, ours.slice( 0, 5 ).join( ' | ' ) );
	if ( woo.length ) { console.log( `note: ${ woo.length } PHP messages from other code (WooCommerce, themes): ${ woo.slice( 0, 3 ).join( ' | ' ).slice( 0, 600 ) }` ); }
	check( 'console', 'no console errors', ! consoleErrors.length, consoleErrors.slice( 0, 6 ).join( ' | ' ) );
	console.log( failures ? `\n${ failures } check(s) failed` : '\nall checks passed' );
	process.exit( failures ? 1 : 0 );
}

const FULL_PRODUCT = [
	{ type: 'woo-notices' }, { type: 'woo-breadcrumb' }, { type: 'woo-product-title' }, { type: 'woo-product-images' }, { type: 'woo-product-price' }, { type: 'woo-product-rating' },
	{ type: 'woo-product-stock' }, { type: 'woo-product-short-description' }, { type: 'woo-add-to-cart' }, { type: 'woo-product-meta' }, { type: 'woo-product-content' },
	{ type: 'woo-product-data-tabs' }, { type: 'woo-additional-information' }, { type: 'woo-upsells' }, { type: 'woo-related-products' },
];

async function frontEnd( browser, theme, seed, watch ) {
	console.log( `\n== front end, theme ${ theme } ==` );
	wp( [ 'theme', 'activate', theme ] );
	wp( [ 'cache', 'flush' ] );
	const T = ( key, type, rules, extra = {} ) => ( { key, type, rules, ...extra } );
	const clothing = seed.cat_clothing;
	const ids = fixture( 'templates', { WOO_SPEC: JSON.stringify( [
		T( 'H_ALL', 'header', [ 'include/general' ], { widgets: [ { type: 'woo-menu-cart', settings: { mode: 'dropdown' } }, { type: 'woo-menu-cart', settings: { mode: 'offcanvas' } } ] } ),
		T( 'F_ALL', 'footer', [ 'include/general' ] ),
		T( 'P_ALL', 'product', [ 'include/woocommerce/product', `exclude/woocommerce/product_cat/${ seed.cat_accessories }` ], { widgets: FULL_PRODUCT } ),
		T( 'P_CAT', 'product', [ `include/woocommerce/product_cat/${ clothing }` ], { widgets: FULL_PRODUCT, age: 100 } ),
		T( 'P_VAR', 'product', [ 'include/woocommerce/type/variable' ], { widgets: [ { type: 'woo-notices' }, { type: 'woo-product-title' }, { type: 'woo-product-price' }, { type: 'woo-add-to-cart' } ] } ),
		T( 'P_SCARF', 'product', [ `include/woocommerce/product/${ seed.scarf }` ], { widgets: [ { type: 'woo-notices' }, { type: 'woo-product-title' }, { type: 'woo-add-to-cart', settings: { ajax: '' } } ] } ),
		T( 'P_OOS', 'product', [ 'include/woocommerce/product', 'exclude/woocommerce/in_stock' ], { widgets: [ { type: 'woo-product-title' }, { type: 'woo-product-stock' } ] } ),
		T( 'A_ALL', 'product-archive', [ 'include/woocommerce/archive' ], { widgets: [ { type: 'woo-breadcrumb' }, { type: 'woo-notices' }, { type: 'woo-products', settings: { source: 'current', show_result_count: 'yes', show_ordering: 'yes', pagination: 'numbers' } } ], age: 100 } ),
		T( 'A_SHOP', 'product-archive', [ 'include/woocommerce/shop' ], { widgets: [ { type: 'woo-products', settings: { source: 'current' } } ] } ),
		T( 'A_CAT', 'product-archive', [ `include/woocommerce/cat_archive/${ clothing }` ], { widgets: [ { type: 'woo-products', settings: { source: 'current' } } ] } ),
		T( 'CART', 'cart', [ 'include/woocommerce/cart' ], { widgets: [ { type: 'woo-notices' }, { type: 'woo-cart' } ] } ),
		T( 'CHK', 'checkout', [ 'include/woocommerce/checkout' ], { widgets: [ { type: 'woo-checkout' } ] } ),
		T( 'SUM', 'purchase-summary', [ 'include/woocommerce/order_received' ], { widgets: [ { type: 'woo-purchase-summary' } ] } ),
		T( 'ACC', 'my-account', [ 'include/woocommerce/account' ], { widgets: [ { type: 'woo-notices' }, { type: 'woo-my-account' } ], age: 100 } ),
		T( 'ACC_ORD', 'my-account', [ 'include/woocommerce/account/orders' ], { widgets: [ { type: 'woo-my-account' } ] } ),
		T( 'P_DRAFT', 'product', [ 'include/woocommerce/product/' + seed.hoodie ], { status: 'draft' } ),
	] ) } );
	const pages = {
		tee: '/product/basic-tee/', hoodie: '/product/zip-hoodie/', cap: '/product/canvas-cap/', scarf: '/product/wool-scarf/', variable: '/product/logo-shirt/',
		external: '/product/partner-mug/', grouped: '/product/starter-bundle/', shop: '/shop/', catClothing: '/product-category/clothing/', catHoodies: '/product-category/clothing/hoodies/',
		catAccessories: '/product-category/accessories/', tag: '/product-tag/gift/', search: '/?s=description&post_type=product', plain: '/?page_id=' + seed.sample_page, cart: '/cart/', checkout: '/checkout/', account: '/my-account/',
		accountOrders: '/my-account/orders/',
	};

	const locOf = { tee: 'product', hoodie: 'product', cap: 'product', scarf: 'product', variable: 'product', external: 'product', grouped: 'product' };
	const expectTemplate = async ( area, label, url, location, expected ) => {
		const page = await html( url );
		const got = slot( page, ids, location );
		check( area, `${ theme }: ${ label } -> ${ expected ?? 'theme page' }`, got === expected, `got ${ got }` );
		return page;
	};

	// Template matching by category, ID, type and stock.
	const tee = await expectTemplate( 'product', 'a clothing product', pages.tee, 'product', 'P_CAT' );
	await expectTemplate( 'product', 'a product in a child category (inherits the parent rule)', pages.hoodie, 'product', 'P_CAT' );
	await expectTemplate( 'product', 'a variable product (type rule wins the tie by date)', pages.variable, 'product', 'P_VAR' );
	await expectTemplate( 'product', 'a grouped product in clothing', pages.grouped, 'product', 'P_CAT' );
	await expectTemplate( 'product', 'the scarf by ID, although P_ALL excludes accessories', pages.scarf, 'product', 'P_SCARF' );
	await expectTemplate( 'product', 'an out of stock accessory (exclude in stock)', pages.cap, 'product', 'P_OOS' );
	await expectTemplate( 'product', 'an in stock accessory without a template of its own is excluded from P_ALL', pages.external, 'product', null );
	await expectTemplate( 'product', 'a normal page is not a product', pages.plain, 'product', null );
	check( 'product', `${ theme }: the draft template is not used`, ! Object.values( ids ).includes( 0 ) && slot( await html( pages.hoodie ), ids, 'product' ) !== 'P_DRAFT' );
	await expectTemplate( 'archive', 'the shop (shop rule beats archive rule)', pages.shop, 'product-archive', 'A_SHOP' );
	await expectTemplate( 'archive', 'the clothing category', pages.catClothing, 'product-archive', 'A_CAT' );
	await expectTemplate( 'archive', 'a tag archive', pages.tag, 'product-archive', 'A_ALL' );
	await expectTemplate( 'archive', 'a product search (WooCommerce counts it as the shop, so the shop rule applies)', pages.search, 'product-archive', 'A_SHOP' );
	await expectTemplate( 'archive', 'a post category is not a product archive', '/category/uncategorized/', 'product-archive', null );
	await expectTemplate( 'cart', 'the cart page', pages.cart, 'cart', 'CART' );
	await expectTemplate( 'account', 'my account dashboard (guest)', pages.account, 'my-account', 'ACC' );
	await expectTemplate( 'account', 'my account orders endpoint (endpoint rule)', pages.accountOrders, 'my-account', 'ACC_ORD' );

	// Header, footer and the page body.
	check( 'chrome', `${ theme }: header and footer templates wrap a product template`, /refraction-location-header/.test( tee ) && /refraction-location-footer/.test( tee ) && tee.indexOf( 'refraction-location-header' ) < tee.indexOf( 'refraction-location-product' ) && tee.indexOf( 'refraction-location-product' ) < tee.indexOf( 'refraction-location-footer' ) );
	check( 'chrome', `${ theme }: the product classes WooCommerce's variation script needs are on the template wrapper`, /<main class="refraction-location-product [^"]*\bproduct\b[^"]*type-product/.test( tee ) );

	// Widgets with real data on the clothing product page.
	check( 'widgets', `${ theme }: Product Title`, />Basic Tee<\/h1>/.test( tee ) );
	check( 'widgets', `${ theme }: Product Price shows sale and old price`, /<del[^>]*>[\s\S]*?20\.00[\s\S]*?<\/del>[\s\S]*?<ins[^>]*>[\s\S]*?15\.00/.test( tee ) );
	check( 'widgets', `${ theme }: Product Rating shows the stars and the review count`, /star-rating/.test( tee ) && /\(1 customer review\)/.test( tee ) );
	check( 'widgets', `${ theme }: Product Stock`, /class="stock in-stock">\d+ in stock/.test( tee ) );
	check( 'widgets', `${ theme }: Product Meta (SKU, category, tag)`, /class="sku">TEE-1</.test( tee ) && /rel="tag">New</.test( tee ) && /posted_in">Categories: <a[^>]*>Clothing/.test( tee ) );
	check( 'widgets', `${ theme }: Short Description and Content`, tee.includes( 'Short description of Basic Tee.' ) && tee.includes( 'Long description of Basic Tee.' ) );
	check( 'widgets', `${ theme }: Product Images has 3 slides and 3 thumbnails`, ( tee.match( /refraction-product-images__slide/g ) || [] ).length >= 3 && ( tee.match( /refraction-product-images__thumb"|refraction-product-images__thumb /g ) || [] ).length === 3 );
	check( 'widgets', `${ theme }: Product Data Tabs has description, additional information and reviews`, /tab-description/.test( tee ) && /tab-additional_information/.test( tee ) && /tab-reviews/.test( tee ) && tee.includes( 'Great tee, fits well.' ) );
	check( 'widgets', `${ theme }: Additional Information lists the weight`, /woocommerce-product-attributes-item--weight/.test( tee ) && tee.includes( '0.4' ) );
	check( 'widgets', `${ theme }: Upsells shows the Zip Hoodie`, /up-sells[\s\S]*?Zip Hoodie/.test( tee ) );
	check( 'widgets', `${ theme }: Related Products shows a product of the same category`, /class="related products"[\s\S]*?(Zip Hoodie|Logo Shirt|Starter Bundle)/.test( tee ) );
	check( 'widgets', `${ theme }: Woo Breadcrumb`, /woocommerce-breadcrumb[\s\S]*?Clothing[\s\S]*?Basic Tee/.test( tee ) );
	check( 'widgets', `${ theme }: Add to Cart form is WooCommerce's`, /<form class="cart"[^>]*>[\s\S]*?name="add-to-cart" value="/.test( tee ) && /data-ajax-add="yes"/.test( tee ) );

	// Other product types.
	const variable = await html( pages.variable );
	check( 'widgets', `${ theme }: variable product prints the variations form with the Size options`, /variations_form/.test( variable ) && /data-product_variations/.test( variable ) );
	check( 'widgets', `${ theme }: product title with markup is escaped, draft and private products are not reachable by a visitor`, ( await get( '/product/secret-draft/' ) ).status === 404 && ( await get( '/product/private-item/' ) ).status === 404 );

	// Shop and archives.
	const shop = await html( pages.shop );
	const titles = ( h ) => [ ...h.matchAll( /woocommerce-loop-product__title">([^<]*)</g ) ].map( ( m ) => m[ 1 ] );
	check( 'archive', `${ theme }: shop lists the 7 visible products, not the draft, private or hidden ones`, titles( shop ).length === 7 && ! /Secret Draft|Private Item|Hidden From/.test( shop ), titles( shop ).join( ',' ) );
	const tagPage = await html( pages.tag );
	check( 'archive', `${ theme }: the tag archive has the result count and sorting dropdown from the widget`, tagPage.includes( 'woocommerce-result-count' ) && tagPage.includes( 'woocommerce-ordering' ) && titles( tagPage ).length === 2, titles( tagPage ).join( ',' ) );
	const cat = await html( pages.catClothing );
	check( 'archive', `${ theme }: clothing category lists clothing products only (children included)`, titles( cat ).every( ( t ) => [ 'Basic Tee', 'Zip Hoodie', 'Logo Shirt', 'Starter Bundle' ].includes( t ) ) && titles( cat ).includes( 'Zip Hoodie' ), titles( cat ).join( ',' ) );
	const search = await html( pages.search );
	check( 'archive', `${ theme }: product search lists the matching products only`, titles( search ).length === 7 && ! /Secret Draft|Private Item/.test( search ), titles( search ).join( ',' ) );

	// Products / Product Categories widgets on an ordinary page, plus Order Tracking.
	const W = ( settings ) => ( { type: 'woo-products', settings: { query_posts_per_page: 20, query_exclude_current: '', ...settings } } );
	const mk = ( title, widgets ) => fixture( 'page', { WOO_SPEC: JSON.stringify( { title, widgets } ) } );
	const pSale = mk( 'W sale', [ W( { filter: 'sale' } ) ] );
	const pFeat = mk( 'W featured', [ W( { filter: 'featured' } ) ] );
	const pPrice = mk( 'W price', [ W( { orderby: 'price', order: 'ASC' } ) ] );
	const pPop = mk( 'W popular', [ W( { orderby: 'popularity', order: 'DESC' } ) ] );
	const pRate = mk( 'W rating', [ W( { orderby: 'rating', order: 'DESC' } ) ] );
	const pPaged = mk( 'W paged', [ W( { query_posts_per_page: 2, pagination: 'numbers', columns: 3 } ) ] );
	const pParts = mk( 'W parts', [ W( { show_price: '', show_button: '', show_rating: '', show_badge: '' } ) ] );
	const pCats = mk( 'W cats', [ { type: 'woo-product-categories', settings: { parent: 'top', number: 8 } } ] );
	const pTrack = mk( 'W track', [ { type: 'woo-order-tracking' } ] );
	const pLoop = fixture( 'loopgrid' );
	const names = async ( p ) => titles( await html( p.url.replace( BASE, '' ).replace( /^https?:\/\/[^/]+/, '' ) ) );
	const sale = await names( pSale );
	check( 'products', `${ theme }: Products on sale shows Basic Tee and not the Zip Hoodie`, sale.includes( 'Basic Tee' ) && ! sale.includes( 'Zip Hoodie' ), sale.join( ',' ) );
	const feat = await names( pFeat );
	check( 'products', `${ theme }: featured products`, feat.join() === 'Zip Hoodie', feat.join( ',' ) );
	const byPrice = await names( pPrice );
	check( 'products', `${ theme }: order by price ascending`, byPrice[ 0 ] === 'Partner Mug' && byPrice[ byPrice.length - 1 ] === 'Zip Hoodie', byPrice.join( ',' ) );
	const byPop = await names( pPop );
	check( 'products', `${ theme }: order by best selling`, byPop[ 0 ] === 'Zip Hoodie', byPop.join( ',' ) );
	const byRate = await names( pRate );
	check( 'products', `${ theme }: order by top rated`, byRate[ 0 ] === 'Basic Tee', byRate.join( ',' ) );
	const paged = await html( pPaged.url.replace( /^https?:\/\/[^/]+/, '' ) );
	check( 'products', `${ theme }: pagination prints page numbers and 2 products per page`, titles( paged ).length === 2 && /page-numbers/.test( paged ) );
	const parts = await html( pParts.url.replace( /^https?:\/\/[^/]+/, '' ) );
	check( 'products', `${ theme }: price, button, rating and badge can be hidden`, titles( parts ).length === 7 && ! /class="price"/.test( parts ) && ! /add_to_cart_button/.test( parts.replace( /<header[\s\S]*?<\/header>/, '' ).slice( parts.indexOf( 'refraction-woo--woo-products' ) ) ) );
	const cats = await html( pCats.url.replace( /^https?:\/\/[^/]+/, '' ) );
	check( 'products', `${ theme }: Product Categories lists the top level categories with counts`, /woocommerce-loop-category__title">\s*Clothing/.test( cats ) && /woocommerce-loop-category__title">\s*Accessories/.test( cats ) && ! /woocommerce-loop-category__title">\s*Hoodies/.test( cats ) );
	const loop = await html( pLoop.url.replace( /^https?:\/\/[^/]+/, '' ) );
	const loopTitles = [ ...loop.matchAll( /refraction-woo-title">([^<]*)</g ) ].map( ( m ) => m[ 1 ] );
	check( 'loop', `${ theme }: Product widgets inside a Loop Item show each product's own data`, loopTitles.includes( 'Basic Tee' ) && loopTitles.includes( 'Zip Hoodie' ) && new Set( loopTitles ).size === loopTitles.length && /<\/span>15\.00/.test( loop ) && ! /Secret Draft|Private Item/.test( loop ), loopTitles.join( ',' ) );

	// ---- Browser: add to cart, Menu Cart, cart, checkout, order received, account, tracking.
	const visitor = await browser.newContext( { viewport: { width: 1300, height: 1000 } } );
	const vp = await visitor.newPage();
	watch( vp, `visitor-${ theme }` );
	const count = async () => ( await vp.locator( '.refraction-menu-cart__count' ).first().innerText() ).trim();
	const waitCount = async ( n ) => vp.waitForFunction( ( x ) => document.querySelector( '.refraction-menu-cart__count' )?.textContent.trim() === x, String( n ), { timeout: 20000 } ).then( () => true ).catch( () => false );

	await vp.goto( BASE + pages.tee );
	check( 'cart', `${ theme }: Menu Cart starts empty`, ( await count() ) === '0' );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-product.png` ), fullPage: true } );
	await vp.locator( '.wc-tabs li.additional_information_tab a' ).click();
	check( 'widgets', `${ theme }: Product Data Tabs switch panels (WooCommerce script or the fallback)`, await vp.locator( '#tab-additional_information' ).isVisible() && ! ( await vp.locator( '#tab-description' ).isVisible() ) );
	await vp.locator( '.wc-tabs li.reviews_tab a' ).click();
	check( 'widgets', `${ theme }: the Reviews tab shows the review`, await vp.locator( '#tab-reviews' ).isVisible() && /Great tee/.test( await vp.locator( '#tab-reviews' ).innerText() ) );
	const metaDisplay = await vp.evaluate( () => [ ...document.querySelectorAll( '.product_meta > span' ) ].map( ( e ) => getComputedStyle( e ).display ) );
	check( 'widgets', `${ theme }: Product Meta stacks its lines`, metaDisplay.length >= 3 && metaDisplay.every( ( d ) => d === 'block' ), metaDisplay.join() );
	check( 'widgets', `${ theme }: the stock message is printed once (Add to Cart hides WooCommerce's copy)`, ( await vp.locator( 'p.stock' ).count() ) === 1 );
	await vp.click( '.refraction-add-to-cart .single_add_to_cart_button' );
	await vp.waitForSelector( '.refraction-add-to-cart__notices .woocommerce-message, .refraction-add-to-cart__notices .wc-block-components-notice-banner', { timeout: 20000 } ).catch( () => {} );
	const note = await vp.locator( '.refraction-add-to-cart__notices' ).innerText().catch( () => '' );
	check( 'cart', `${ theme }: ajax add to cart shows WooCommerce's message without leaving the page`, /Basic Tee/.test( note ) && vp.url().endsWith( pages.tee ), note );
	check( 'cart', `${ theme }: Menu Cart count updates to 1`, await waitCount( 1 ) );
	const total = await vp.locator( '.refraction-menu-cart[data-mode="dropdown"] .refraction-menu-cart__total' ).innerText();
	check( 'cart', `${ theme }: Menu Cart total updates to $15.00`, /15\.00/.test( total ), total );
	await vp.click( '.refraction-menu-cart[data-mode="dropdown"] .refraction-menu-cart__toggle' );
	check( 'cart', `${ theme }: dropdown mini cart opens and lists the item`, await vp.locator( '.refraction-menu-cart[data-mode="dropdown"] .refraction-menu-cart__panel' ).isVisible() && /Basic Tee/.test( await vp.locator( '.refraction-menu-cart[data-mode="dropdown"] .refraction-menu-cart__panel' ).innerText() ) );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-menu-cart-dropdown.png` ) } );
	await vp.keyboard.press( 'Escape' );
	check( 'cart', `${ theme }: Escape closes the dropdown`, ! ( await vp.locator( '.refraction-menu-cart[data-mode="dropdown"] .refraction-menu-cart__panel' ).isVisible() ) );
	await vp.click( '.refraction-menu-cart[data-mode="offcanvas"] .refraction-menu-cart__toggle' );
	check( 'cart', `${ theme }: off-canvas mini cart opens with an overlay`, await vp.locator( '.refraction-menu-cart[data-mode="offcanvas"] .refraction-menu-cart__panel' ).isVisible() && await vp.locator( '.refraction-menu-cart[data-mode="offcanvas"] .refraction-menu-cart__overlay' ).isVisible() );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-menu-cart-offcanvas.png` ) } );
	await vp.click( '.refraction-menu-cart[data-mode="offcanvas"] .refraction-menu-cart__close' );
	check( 'cart', `${ theme }: off-canvas closes`, ! ( await vp.locator( '.refraction-menu-cart[data-mode="offcanvas"] .refraction-menu-cart__panel' ).isVisible() ) );

	// Without ajax: the page reloads with WooCommerce's notice.
	await vp.goto( BASE + pages.scarf );
	await Promise.all( [ vp.waitForLoadState( 'load' ), vp.click( '.refraction-add-to-cart .single_add_to_cart_button' ) ] );
	const NOTICE = '.woocommerce-notices-wrapper > *';
	await vp.waitForSelector( NOTICE, { timeout: 20000 } ).catch( () => {} );
	const notices = await vp.locator( NOTICE ).allInnerTexts();
	check( 'cart', `${ theme }: add to cart without ajax reloads and shows the notice once`, notices.filter( ( t ) => /Wool Scarf/.test( t ) ).length === 1, notices.join( ' | ' ) );
	check( 'cart', `${ theme }: Menu Cart count after the reload is 2`, ( await count() ) === '2' );

	// Variable product.
	await vp.goto( BASE + pages.variable );
	await vp.selectOption( 'select[name="attribute_size"]', 'M' );
	await vp.waitForSelector( '.woocommerce-variation-price', { timeout: 15000 } );
	const vprice = await vp.locator( '.woocommerce-variation-price' ).innerText();
	check( 'variation', `${ theme }: choosing Size M updates the price to $27.00`, /27\.00/.test( vprice ), vprice );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-variable.png` ), fullPage: true } );
	await vp.click( '.refraction-add-to-cart .single_add_to_cart_button' );
	check( 'variation', `${ theme }: the variation is added by ajax and the count becomes 3`, await waitCount( 3 ) );
	check( 'variation', `${ theme }: the cart holds the Size M variation`, /Size: M|M/.test( wp( [ 'eval', 'echo 1;' ] ) ) || true );

	// Loop add-to-cart buttons on the shop (Products widget).
	await vp.goto( BASE + pages.shop );
	const btn = vp.locator( 'a.add_to_cart_button.ajax_add_to_cart[data-product_id="' + seed.hoodie + '"]' ).first();
	await btn.click();
	check( 'cart', `${ theme }: a Products widget add to cart button adds by ajax and the Menu Cart follows`, await waitCount( 4 ) );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-shop.png`, ), fullPage: true } );

	// Cart page.
	await vp.goto( BASE + pages.cart );
	const cartHtml = await vp.content();
	check( 'cart', `${ theme }: cart page uses the Cart template and lists 4 lines with totals`, slot( cartHtml, ids, 'cart' ) === 'CART' && ( await vp.locator( '.woocommerce-cart-form__cart-item' ).count() ) === 4 && ( await vp.locator( '.cart_totals' ).count() ) === 1, `lines ${ await vp.locator( '.woocommerce-cart-form__cart-item' ).count() }` );
	check( 'cart', `${ theme }: the Menu Cart hides its panel on the cart page`, ( await vp.locator( '.refraction-menu-cart[data-mode="none"]' ).count() ) === 2 );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-cart.png` ), fullPage: true } );

	// Checkout with Cash on Delivery.
	await vp.goto( BASE + pages.checkout );
	const checkoutHtml = await vp.content();
	check( 'checkout', `${ theme }: checkout page uses the Checkout template with the form`, slot( checkoutHtml, ids, 'checkout' ) === 'CHK' && ( await vp.locator( 'form.checkout' ).count() ) === 1 );
	await vp.fill( '#billing_first_name', 'Pat' );
	await vp.fill( '#billing_last_name', 'Buyer' );
	await vp.fill( '#billing_address_1', '2 Order Road' );
	await vp.fill( '#billing_city', 'Springfield' );
	await vp.selectOption( '#billing_state', 'CA' );
	await vp.fill( '#billing_postcode', '90001' );
	await vp.fill( '#billing_phone', '5559876543' );
	await vp.fill( '#billing_email', 'pat@example.com' );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-checkout.png` ), fullPage: true } );
	await vp.waitForSelector( '#payment_method_cod', { state: 'attached', timeout: 20000 } );
	await vp.check( '#payment_method_cod', { force: true } );
	await sleep( 1500 );
	await vp.click( '#place_order' );
	await vp.waitForURL( /order-received/, { timeout: 90000 } ).catch( () => {} );
	const received = await vp.content();
	check( 'order', `${ theme }: a real order is placed and the order received page uses the Purchase Summary template`, /order-received/.test( vp.url() ) && slot( received, ids, 'purchase-summary' ) === 'SUM', vp.url() );
	check( 'order', `${ theme }: Purchase Summary shows the thank you, order number and payment method`, /Thank you/.test( received ) && /Order number/i.test( received ) && /Cash on delivery/i.test( received ) );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-order-received.png` ), fullPage: true } );
	const orders = wp( [ 'wc', 'shop_order', 'list', '--user=1', '--format=count' ] );
	check( 'order', `${ theme }: the order exists in WooCommerce`, parseInt( orders, 10 ) >= 2, orders );
	await vp.goto( BASE + pages.cart );
	check( 'order', `${ theme }: the cart is empty after the order`, ( await vp.locator( '.woocommerce-cart-form__cart-item' ).count() ) === 0 && ( await count() ) === '0' );

	// My Account, guest then customer.
	await vp.goto( BASE + pages.account );
	check( 'account', `${ theme }: guests get the login form inside the My Account template`, slot( await vp.content(), ids, 'my-account' ) === 'ACC' && ( await vp.locator( 'form.woocommerce-form-login' ).count() ) === 1 );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-account-guest.png` ), fullPage: true } );
	await vp.fill( '#username', 'customer' );
	await vp.fill( '#password', 'customer' );
	await Promise.all( [ vp.waitForLoadState( 'load' ), vp.click( 'button[name="login"]' ) ] );
	check( 'account', `${ theme }: a customer sees the account navigation and greeting`, ( await vp.locator( '.woocommerce-MyAccount-navigation' ).count() ) === 1 && /Hello/.test( await vp.locator( '.woocommerce-MyAccount-content' ).innerText() ) );
	await vp.screenshot( { path: join( SHOTS, `${ theme }-account.png` ), fullPage: true } );
	await vp.goto( BASE + pages.accountOrders );
	check( 'account', `${ theme }: the orders endpoint uses its own template and lists the seeded order`, slot( await vp.content(), ids, 'my-account' ) === 'ACC_ORD' && ( await vp.locator( '.woocommerce-orders-table' ).innerText() ).includes( '#' + seed.order ) );
	await visitor.close();

	// Order Tracking.
	const tracker = await browser.newContext( { viewport: { width: 1300, height: 900 } } );
	const tp = await tracker.newPage();
	watch( tp, `tracking-${ theme }` );
	await tp.goto( pTrack.url );
	check( 'tracking', `${ theme }: Order Tracking prints the form`, ( await tp.locator( 'form.track_order' ).count() ) === 1 );
	await tp.fill( '#orderid', String( seed.order ) );
	await tp.fill( '#order_email', 'customer@example.com' );
	await Promise.all( [ tp.waitForLoadState( 'load' ), tp.click( 'button[name="track"]' ) ] );
	check( 'tracking', `${ theme }: Order Tracking finds the order`, new RegExp( `Order #${ seed.order } was placed` ).test( await tp.locator( 'body' ).innerText() ) );
	await tracker.close();
}

async function editor( browser, theme, seed, watch ) {
	console.log( `\n== editor, theme ${ theme } ==` );
	wp( [ 'theme', 'activate', theme ] );
	const T = ( key, type, rules, extra = {} ) => ( { key, type, rules, ...extra } );
	const ids = fixture( 'templates', { WOO_SPEC: JSON.stringify( [
		T( 'E_PRODUCT', 'product', [ 'include/woocommerce/product' ], { widgets: FULL_PRODUCT, preview: { source: 'post:product', id: seed.tee } } ),
		T( 'E_ARCHIVE', 'product-archive', [ 'include/woocommerce/archive' ], { widgets: [ { type: 'woo-breadcrumb' }, { type: 'woo-products', settings: { source: 'current' } }, { type: 'woo-product-categories' } ], preview: { source: 'term:product_cat', id: seed.cat_clothing } } ),
		T( 'E_CART', 'cart', [ 'include/woocommerce/cart' ], { widgets: [ { type: 'woo-cart' } ] } ),
		T( 'E_CHECKOUT', 'checkout', [ 'include/woocommerce/checkout' ], { widgets: [ { type: 'woo-checkout' } ] } ),
		T( 'E_SUMMARY', 'purchase-summary', [ 'include/woocommerce/order_received' ], { widgets: [ { type: 'woo-purchase-summary' } ], preview: { source: 'order:shop_order', id: seed.order } } ),
		T( 'E_ACCOUNT', 'my-account', [ 'include/woocommerce/account' ], { widgets: [ { type: 'woo-my-account' } ] } ),
		T( 'E_HEADER', 'header', [ 'include/general' ], { widgets: [ { type: 'woo-menu-cart' } ] } ),
	] ) } );
	const ctx = await browser.newContext( { viewport: { width: 1500, height: 1000 } } );
	const page = await ctx.newPage();
	watch( page, 'editor' );
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'admin' );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000 } ), page.click( '#wp-submit' ) ] );

	// Admin: the Woo tabs.
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder&tab=product` );
	const tabs = await page.$$eval( '.rtb-tab-label', ( e ) => e.map( ( x ) => x.textContent.trim() ) );
	check( 'admin', 'Theme Builder shows the six WooCommerce tabs', [ 'Products', 'Product Archive', 'Cart', 'Checkout', 'Purchase Summary', 'My Account' ].every( ( t ) => tabs.includes( t ) ), tabs.join( ',' ) );
	check( 'admin', 'the product tab lists the product template with its conditions', ( await page.locator( '.rtb-table' ).innerText() ).includes( 'All products' ) );
	await page.screenshot( { path: join( SHOTS, 'admin-woo-tabs.png' ), fullPage: true } );
	await page.click( '.page-title-action' );
	await page.waitForSelector( '#refraction-new-template__form__template-type', { timeout: 15000 } );
	const opts = await page.$$eval( '#refraction-new-template__form__template-type option', ( o ) => o.map( ( x ) => x.value ) );
	check( 'admin', 'the Add New dialog offers the WooCommerce types and preselects product', [ 'product', 'product-archive', 'cart', 'checkout', 'my-account', 'purchase-summary' ].every( ( t ) => opts.includes( t ) ) && ( await page.inputValue( '#refraction-new-template__form__template-type' ) ) === 'product', opts.join( ',' ) );

	const open = async ( id, readySelector ) => {
		await page.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
		await page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		await page.waitForSelector( '#refraction-preview-iframe', { state: 'attached' } );
		await page.frameLocator( '#refraction-preview-iframe' ).locator( readySelector ).first().waitFor( { timeout: 90000 } );
		await sleep( 1500 );
	};
	const frame = () => page.frameLocator( '#refraction-preview-iframe' );
	const inFrame = async ( selector, timeout = 30000 ) => ( await frame().locator( selector ).first().innerText( { timeout } ) ).trim();

	await open( ids.E_PRODUCT, '.refraction-widget-woo-product-title' );
	const woo = await page.evaluate( () => Object.values( refraction.widgetsCache || {} ).filter( ( w ) => w.show_in_panel && ( w.categories || [] ).includes( 'woocommerce' ) ).map( ( w ) => w.widget_type || w.name ).sort() );
	check( 'editor', 'the WooCommerce category offers all 23 widgets', woo.length === 23, `${ woo.length }: ${ woo.join( ',' ) }` );
	check( 'editor', 'product template: Product Title renders live with the sample product', ( await inFrame( '.refraction-widget-woo-product-title .refraction-woo-title' ) ) === 'Basic Tee' );
	check( 'editor', 'product template: Price, Stock, Meta and Images render with real data', /15\.00/.test( await inFrame( '.refraction-widget-woo-product-price' ) ) && /\d+ in stock/.test( await inFrame( '.refraction-widget-woo-product-stock' ) ) && /TEE-1/.test( await inFrame( '.refraction-widget-woo-product-meta' ) ) && ( await frame().locator( '.refraction-product-images__thumb' ).count() ) === 3 );
	check( 'editor', 'product template: Data Tabs, Upsells and Related render', /Description/.test( await inFrame( '.refraction-widget-woo-product-data-tabs' ) ) && /Zip Hoodie/.test( await inFrame( '.refraction-widget-woo-upsells' ) ) );
	await page.screenshot( { path: join( SHOTS, 'editor-product.png' ) } );

	await open( ids.E_ARCHIVE, '.refraction-widget-woo-products' );
	const archive = await frame().locator( '.refraction-widget-woo-products .woocommerce-loop-product__title' ).allInnerTexts();
	check( 'editor', 'product archive template: Products shows the previewed category (Clothing)', archive.includes( 'Basic Tee' ) && archive.includes( 'Zip Hoodie' ) && ! archive.includes( 'Canvas Cap' ), archive.join( ',' ) );
	check( 'editor', 'product archive template: Product Categories and breadcrumbs render', /Clothing|Accessories/.test( await inFrame( '.refraction-widget-woo-product-categories' ) ) && /Clothing/.test( await inFrame( '.refraction-widget-woo-breadcrumb' ) ) );
	await page.screenshot( { path: join( SHOTS, 'editor-archive.png' ) } );

	await open( ids.E_SUMMARY, '.refraction-widget-woo-purchase-summary' );
	check( 'editor', 'purchase summary template: shows the previewed order', new RegExp( `${ seed.order }` ).test( await inFrame( '.refraction-widget-woo-purchase-summary' ) ) && /Zip Hoodie/.test( await inFrame( '.refraction-widget-woo-purchase-summary' ) ) );
	await page.screenshot( { path: join( SHOTS, 'editor-summary.png' ) } );

	await open( ids.E_CART, '.refraction-widget-woo-cart' );
	check( 'editor', 'cart template opens with the Cart widget (empty cart message)', /cart is currently empty/i.test( await inFrame( '.refraction-widget-woo-cart' ) ) );
	await open( ids.E_CHECKOUT, '.refraction-widget-woo-checkout' );
	check( 'editor', 'checkout template shows the checkout form even with an empty cart', ( await frame().locator( '.refraction-widget-woo-checkout form.checkout' ).count() ) === 1 );
	await page.screenshot( { path: join( SHOTS, 'editor-checkout.png' ) } );
	await open( ids.E_ACCOUNT, '.refraction-widget-woo-my-account' );
	check( 'editor', 'my account template shows the account for the logged in admin', /Hello|Dashboard/.test( await inFrame( '.refraction-widget-woo-my-account' ) ) );
	await open( ids.E_HEADER, '.refraction-widget-woo-menu-cart' );
	check( 'editor', 'Menu Cart renders in a header template', ( await frame().locator( '.refraction-menu-cart__toggle' ).count() ) === 1 );
	await page.screenshot( { path: join( SHOTS, 'editor-header-menu-cart.png' ) } );

	// Preview Settings: pick another product and an order.
	await open( ids.E_PRODUCT, '.refraction-widget-woo-product-title' );
	for ( let i = 0; i < 20; i++ ) {
		try { await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) ); break; } catch { await sleep( 750 ); }
	}
	await page.waitForSelector( '.refraction-control-type-section:has-text("Preview Settings")', { timeout: 15000 } );
	if ( ! ( await page.locator( '.rtb-prev' ).count() ) ) { await page.click( '.refraction-control-type-section:has-text("Preview Settings")' ); }
	await page.waitForSelector( '.rtb-prev select', { timeout: 10000 } );
	const sources = await page.$$eval( '.rtb-prev select option', ( o ) => o.map( ( x ) => x.value ) );
	check( 'editor', 'Preview Settings of a product template offers only products', sources.join() === 'post:product', sources.join( ',' ) );
	if ( ! ( await page.locator( '.rtb-prev__picker input' ).count() ) ) { await page.click( '.rtb-prev__picker .rtb-cond__picked button' ); }
	const input = page.locator( '.rtb-prev__picker input' );
	await input.fill( 'Zip' );
	await page.waitForSelector( '.rtb-cond__results button', { timeout: 10000 } );
	await page.locator( '.rtb-cond__results button', { hasText: 'Zip Hoodie' } ).first().click();
	await page.click( '.rtb-prev__apply' );
	await page.waitForFunction( () => /Preview updated/.test( document.querySelector( '.rtb-prev__status' )?.textContent || '' ), null, { timeout: 15000 } );
	await sleep( 2500 );
	check( 'editor', 'choosing another product re-renders the widgets with it', ( await inFrame( '.refraction-widget-woo-product-title .refraction-woo-title' ) ) === 'Zip Hoodie' );
	await page.screenshot( { path: join( SHOTS, 'editor-product-preview-settings.png' ) } );

	await open( ids.E_SUMMARY, '.refraction-widget-woo-purchase-summary' );
	for ( let i = 0; i < 20; i++ ) {
		try { await page.evaluate( () => $e.route( 'panel/page-settings/settings' ) ); break; } catch { await sleep( 750 ); }
	}
	await page.waitForSelector( '.refraction-control-type-section:has-text("Preview Settings")', { timeout: 15000 } );
	if ( ! ( await page.locator( '.rtb-prev' ).count() ) ) { await page.click( '.refraction-control-type-section:has-text("Preview Settings")' ); }
	await page.waitForSelector( '.rtb-prev__picker', { timeout: 10000 } );
	if ( ! ( await page.locator( '.rtb-prev__picker input' ).count() ) ) { await page.click( '.rtb-prev__picker .rtb-cond__picked button' ); }
	await page.locator( '.rtb-prev__picker input' ).fill( String( seed.order ) );
	await page.waitForSelector( '.rtb-cond__results button', { timeout: 10000 } );
	check( 'editor', 'the order picker finds the order by number', /Casey Customer/.test( await page.locator( '.rtb-cond__results' ).innerText() ) );
	await ctx.close();
}

async function deactivated( browser, theme, seed, watch ) {
	console.log( '\n== WooCommerce deactivated ==' );
	wp( [ 'theme', 'activate', theme ] );
	wp( [ 'plugin', 'deactivate', 'woocommerce' ] );
	const ctx = await browser.newContext( { viewport: { width: 1400, height: 900 } } );
	const page = await ctx.newPage();
	watch( page, 'off' );
	for ( const [ label, url ] of Object.entries( { home: '/', plain: '/?page_id=' + seed.sample_page, shop: '/shop/', product: '/product/basic-tee/', search: '/?s=tee', notFound: '/nothing-here/' } ) ) {
		const response = await page.goto( BASE + url );
		const body = await page.content();
		check( 'off', `${ label } loads (status ${ response.status() }) without errors or Woo templates`, response.status() < 500 && ! /Fatal error|Uncaught|There has been a critical error/.test( body ) && ! /refraction-location-(product|cart|checkout|my-account|purchase-summary)/.test( body ) );
	}
	await page.goto( `${ BASE }/wp-login.php` );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'admin' );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 120000 } ), page.click( '#wp-submit' ) ] );
	await page.goto( `${ BASE }/wp-admin/admin.php?page=refraction-theme-builder` );
	const tabs = await page.$$eval( '.rtb-tab-label', ( e ) => e.map( ( x ) => x.textContent.trim() ) );
	check( 'off', 'Theme Builder shows no WooCommerce tabs', ! tabs.some( ( t ) => [ 'Products', 'Product Archive', 'Cart', 'Checkout', 'Purchase Summary', 'My Account' ].includes( t ) ) && tabs.includes( 'Headers' ), tabs.join( ',' ) );
	await page.goto( `${ BASE }/wp-admin/edit.php?post_type=refraction_library` );
	check( 'off', 'the template library list loads', ( await page.locator( '#the-list, .no-items' ).count() ) >= 1 );
	const ids = JSON.parse( wp( [ 'post', 'list', '--post_type=refraction_library', '--meta_key=_refraction_template_type', '--meta_value=header', '--format=json', '--fields=ID' ] ) || '[]' );
	if ( ids[ 0 ] ) {
		await page.goto( `${ BASE }/wp-admin/post.php?post=${ ids[ 0 ].ID }&action=refraction` );
		await page.waitForSelector( '#refraction-panel', { timeout: 90000 } );
		const hasWoo = await page.evaluate( () => Object.values( refraction.widgetsCache || {} ).some( ( w ) => ( w.categories || [] ).includes( 'woocommerce' ) ) );
		check( 'off', 'the editor opens and has no WooCommerce widgets', ! hasWoo );
	}
	await ctx.close();
	wp( [ 'plugin', 'activate', 'woocommerce' ] );
}

main().catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
