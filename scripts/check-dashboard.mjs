#!/usr/bin/env node
/**
 * Dashboard widgets (SQLite test site, Chromium): a dashboard page with Stat Cards (one fed by the Site Statistic
 * dynamic tag), Charts (bars with a tooltip, a donut with its total, an area from this site's posts, horizontal bars
 * from a pasted table) and Data Tables (badges colored by word, sorting, search, pages; the latest posts); a phone; the
 * editor (Dashboard category, the tag).
 *
 * Usage: node scripts/check-dashboard.mjs [--site /tmp/rf-dash-site] [--port 9295] [--shots /tmp/dashboard-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-dash-site' );
const PORT = arg( 'port', '9295' );
const SHOTS = arg( 'shots', '/tmp/dashboard-shots' );
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
		// A few posts this month and last, for the site numbers.
		for ( let i = 0; i < 4; i++ ) {
			wp( [ 'post', 'create', '--post_status=publish', `--post_title=Post ${ i }`, `--post_date=${ new Date( Date.now() - ( i * 20 * 86400000 ) ).toISOString().slice( 0, 19 ).replace( 'T', ' ' ) }` ] );
		}
		const posts = Number( wp( [ 'eval', 'echo (int) wp_count_posts( "post" )->publish;' ] ).trim() );
		const tag = `[refraction-tag id="stat001" name="site-statistic" settings="${ encodeURIComponent( JSON.stringify( { stat: 'posts', post_type: 'post', period: '' } ) ) }"]`;

		const p1 = dashboard( 'Dashboard', [
			[
				[ w( 'st00001', 'refraction-stat-card', {} ), 25 ],
				[ w( 'st00002', 'refraction-stat-card', { label: 'Published posts', prefix: '', value: '', __dynamic__: { value: tag }, change: '-3.2', tone: 'success', icon: { value: 'fas fa-file-alt', library: 'fa-solid' }, spark_type: 'bars' } ), 25 ],
				[ w( 'st00003', 'refraction-stat-card', { label: 'Refunds', value: '1240', change: '-8', down_is_good: 'yes', tone: 'danger', layout: 'inline', spark_type: 'line' } ), 25 ],
				[ w( 'st00004', 'refraction-stat-card', { label: 'Visitors', prefix: '', value: '128400', compact: 'yes', change: '4.1', tone: 'info', layout: 'filled' } ), 25 ],
			],
			[
				[ w( 'ch00001', 'refraction-chart', { show_values: '' } ), 64 ],
				[ w( 'ch00002', 'refraction-chart', { type: 'donut', card_title: 'Traffic sources', card_subtitle: 'Last 30 days', card_badge: '', labels: 'Search, Social, Direct, Email', series: [ { name: 'Visits', values: '4200, 2100, 1600, 900' } ], legend: 'bottom', center_label: 'Visits' } ), 36 ],
			],
			[
				[ w( 'ch00003', 'refraction-chart', { type: 'area', source: 'wordpress', wp_metric: 'posts_month', wp_months: 3, card_title: 'Posts published', card_subtitle: 'From this site', card_badge: 'Live', card_badge_tone: 'primary', points: 'yes' } ), 50 ],
				[ w( 'ch00004', 'refraction-chart', { type: 'hbar', source: 'table', card_title: 'Top products', card_subtitle: 'Units sold', card_badge: '', table_data: 'Product, Units\nAirport transfer, 320\nCity tour, 210\nGolf day, 140\nWedding car, 90', show_values: 'yes' } ), 50 ],
			],
			[
				[ w( 'tb00001', 'refraction-data-table', { search: 'yes', per_page: 3 } ), 64 ],
				[ w( 'tb00002', 'refraction-data-table', { source: 'posts', post_count: 5, card_title: 'Latest posts', card_subtitle: 'From this site', rows_look: 'lines', header_look: 'filled' } ), 36 ],
			],
			[
				[ w( 'tb00003', 'refraction-data-table', { source: 'cells', card_title: 'Bookings', cell_items: [
					{ _id: 'c01', new_row: 'yes', content: '#2001', icon: { value: 'fas fa-taxi', library: 'fa-solid' } },
					{ _id: 'c02', content: 'Anna Brown', sub: 'anna@example.com', image: { url: `${ BASE }/wp-includes/images/w-logo-blue.png` }, link: { url: '#anna' } },
					{ _id: 'c03', content: '2026-11-02' }, { _id: 'c04', content: '1250.50' }, { _id: 'c05', content: '100' },
					{ _id: 'c06', content: 'Paid', cell_tone: 'danger', cell_bg: '#FFEEDD' },
					{ _id: 'c07', new_row: 'yes', content: '#2002' }, { _id: 'c08', content: 'Group booking, two days', span: 2 }, { _id: 'c09', content: '900' }, { _id: 'c10', content: '40' }, { _id: 'c11', content: 'Pending' },
					{ _id: 'c12', new_row: 'yes', content: '#2003' }, { _id: 'c13', content: 'Leo Grant' }, { _id: 'c14', content: '2026-11-06' }, { _id: 'c15', content: '5000' }, { _id: 'c16', content: '10' }, { _id: 'c17', content: 'Done' },
				] } ), 100 ],
			],
		] );

		const d = await ( await browser.newContext( { viewport: { width: 1400, height: 1000 } } ) ).newPage();
		watch( d );
		await d.goto( p1.url );
		await sleep( 800 );
		await d.evaluate( () => window.scrollTo( 0, document.body.scrollHeight ) );
		await sleep( 900 );
		await d.evaluate( () => window.scrollTo( 0, 0 ) );
		await sleep( 1800 );

		const stat = await d.evaluate( () => [ 'st00001', 'st00002', 'st00003', 'st00004' ].map( ( id ) => {
			const el = document.querySelector( `[data-id="${ id }"]` );
			return { value: el.querySelector( '.rf-stat__value' )?.textContent.trim(), badge: el.querySelector( '.rf-stat__badge' )?.className.replace( 'rf-stat__badge ', '' ), arrow: el.querySelector( '.rf-stat__badge' )?.textContent.trim(), spark: !! el.querySelector( '.rf-stat__spark' ), icon: !! el.querySelector( '.rf-stat__icon svg, .rf-stat__icon i' ) };
		} ) );
		check( 'stat', 'the default card: $48,250 (counted up), ▲ 12.5% in green, an icon and a sparkline', '$48,250' === stat[ 0 ].value && 'is-good' === stat[ 0 ].badge && '▲ 12.5%' === stat[ 0 ].arrow && stat[ 0 ].spark && stat[ 0 ].icon, JSON.stringify( stat[ 0 ] ) );
		check( 'stat', `the Site Statistic tag gives the value: ${ posts } published posts; a fall shows red`, String( posts ) === stat[ 1 ].value && 'is-bad' === stat[ 1 ].badge && '▼ 3.2%' === stat[ 1 ].arrow, JSON.stringify( stat[ 1 ] ) );
		check( 'stat', 'down is good: a fall in refunds shows green; short numbers: 128K', 'is-good' === stat[ 2 ].badge && '128K' === stat[ 3 ].value, JSON.stringify( [ stat[ 2 ], stat[ 3 ] ] ) );

		const bars = await d.evaluate( () => {
			const el = document.querySelector( '[data-id="ch00001"]' );
			const groups = el.querySelectorAll( '.rf-chart__group' );
			const plot = el.querySelector( '.rf-chart__plot' ).getBoundingClientRect();
			const b = groups[ 5 ].querySelector( '.rf-chart__bar' );
			const before = getComputedStyle( b, '::before' );
			return { groups: groups.length, bars: groups[ 0 ].querySelectorAll( '.rf-chart__bar' ).length, drawn: el.querySelector( '.rf-chart' ).classList.contains( 'is-drawn' ), h: Math.round( parseFloat( before.height ) ), plot: Math.round( plot.height ), transform: before.transform, legend: el.querySelectorAll( '.rf-chart__legend li' ).length, ticks: [ ...el.querySelectorAll( '.rf-chart__tick' ) ].map( ( t ) => t.textContent ).join( ',' ), title: el.querySelector( '.rf-dash__title' )?.textContent, badge: el.querySelector( '.rf-dash__badge' )?.textContent, sr: el.querySelectorAll( '.rf-chart__sr tbody tr' ).length };
		} );
		check( 'chart', 'bars: 6 months x 2 series, an axis 0-60 in round steps, the June bar (60) the full plot height, drawn in; card title, badge, legend, screen-reader table', 6 === bars.groups && 2 === bars.bars && '0,20,40,60' === bars.ticks && Math.abs( bars.h - bars.plot ) <= 2 && bars.drawn && 'none' === bars.transform && 'Monthly sales' === bars.title && '+12.5%' === bars.badge && 2 === bars.legend && 6 === bars.sr, JSON.stringify( bars ) );
		await d.hover( '[data-id="ch00001"] .rf-chart__group[data-i="2"]' );
		await sleep( 300 );
		const tip = await d.evaluate( () => {
			const t = document.querySelector( '[data-id="ch00001"] .rf-chart__tip' ); return { shown: t.classList.contains( 'is-shown' ), text: t.textContent };
		} );
		check( 'chart', 'hovering March shows a tooltip with both series', tip.shown && /Mar/.test( tip.text ) && /Sales35/.test( tip.text ) && /Costs30/.test( tip.text ), JSON.stringify( tip ) );

		const donut = await d.evaluate( () => {
			const el = document.querySelector( '[data-id="ch00002"]' ); return { slices: el.querySelectorAll( '.rf-chart__slice' ).length, total: el.querySelector( '.rf-chart__total' )?.textContent, caption: el.querySelector( '.rf-chart__caption' )?.textContent, legend: [ ...el.querySelectorAll( '.rf-chart__legend-value' ) ].map( ( x ) => x.textContent.replace( /\s+/g, ' ' ).trim() ) };
		} );
		check( 'chart', 'donut: 4 slices, the total 8,800 in the middle, a legend with values and shares', 4 === donut.slices && '8,800' === donut.total && 'Visits' === donut.caption && '4,200 48%' === donut.legend[ 0 ], JSON.stringify( donut ) );

		const area = await d.evaluate( () => {
			const el = document.querySelector( '[data-id="ch00003"]' ); const data = JSON.parse( el.querySelector( '.rf-chart' ).getAttribute( 'data-rf-chart' ) ); return { values: data.series[ 0 ].values, labels: data.labels.length, area: !! el.querySelector( '.rf-chart__area' ), line: el.querySelector( '.rf-chart__line' )?.getAttribute( 'd' ).includes( 'C' ), dots: el.querySelectorAll( '.rf-chart__dot' ).length };
		} );
		const recent = Number( wp( [ 'eval', 'global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type=\'post\' AND post_status=\'publish\' AND post_date_gmt >= \'" . gmdate( "Y-m-01", strtotime( gmdate( "Y-m-01" ) . " -2 months" ) ) . "\'" );' ] ).trim() );
		check( 'chart', `area from this site: posts per month for 3 months (${ recent } in all), a smooth line, its fill and points`, 3 === area.labels && area.values.reduce( ( a, v ) => a + Number( v ), 0 ) === recent && area.area && area.line && 3 === area.dots, JSON.stringify( area ) );
		const hbar = await d.evaluate( () => {
			const el = document.querySelector( '[data-id="ch00004"]' ); return { horizontal: !! el.querySelector( '.rf-chart__frame.is-horizontal' ), labels: [ ...el.querySelectorAll( '.rf-chart__label' ) ].map( ( l ) => l.textContent ), values: [ ...el.querySelectorAll( '.rf-chart__value' ) ].map( ( v ) => v.textContent ), w: [ ...el.querySelectorAll( '.rf-chart__bar' ) ].map( ( b ) => Math.round( parseFloat( getComputedStyle( b, '::before' ).width ) ) ) };
		} );
		check( 'chart', 'horizontal bars from a pasted table: products down the side, values at the ends, longest first', hbar.horizontal && 'Airport transfer' === hbar.labels[ 0 ] && '320' === hbar.values[ 0 ] && hbar.w[ 0 ] > hbar.w[ 3 ], JSON.stringify( hbar ) );

		const tableState = () => d.evaluate( () => {
			const el = document.querySelector( '[data-id="tb00001"]' ); const rows = [ ...el.querySelectorAll( 'tbody tr' ) ].filter( ( r ) => ! r.hidden ); return { rows: rows.map( ( r ) => r.cells[ 0 ].textContent ), pages: el.querySelectorAll( '.rf-table-pager button[aria-label^="Page"]' ).length, badges: [ ...el.querySelectorAll( '.rf-table__badge' ) ].map( ( b ) => b.textContent + ':' + b.className.replace( /.*tone--/, '' ) ), total: rows.map( ( r ) => r.cells[ 3 ].textContent ), progress: el.querySelector( '.rf-table__progress i' )?.style.width };
		} );
		let t = await tableState();
		check( 'table', 'orders: 3 rows a page of 4 (2 pages), badges colored by their word, totals formatted, progress bars', 3 === t.rows.length && 2 === t.pages && t.badges.includes( 'Paid:success' ) && t.badges.includes( 'Pending:warning' ) && t.badges.includes( 'Failed:danger' ) && '$1,250.50' === t.total[ 0 ] && '100%' === t.progress, JSON.stringify( t ) );
		await d.click( '[data-id="tb00001"] th:nth-child(4) .rf-table__sort' );
		await d.click( '[data-id="tb00001"] th:nth-child(4) .rf-table__sort' );
		await sleep( 200 );
		t = await tableState();
		const sort = await d.evaluate( () => document.querySelector( '[data-id="tb00001"] th:nth-child(4)' ).getAttribute( 'aria-sort' ) );
		check( 'table', 'sorting by Total twice: highest first ($2,190.00), the heading says descending', '$2,190.00' === t.total[ 0 ] && 'descending' === sort, JSON.stringify( [ t.total, sort ] ) );
		await d.fill( '[data-id="tb00001"] .rf-table-tools input', 'mia' );
		await sleep( 200 );
		t = await tableState();
		check( 'table', 'searching "mia" leaves one row', 1 === t.rows.length && '#1044' === t.rows[ 0 ], JSON.stringify( t.rows ) );
		await d.fill( '[data-id="tb00001"] .rf-table-tools input', 'zzz' );
		await sleep( 200 );
		const empty = await d.evaluate( () => ! document.querySelector( '[data-id="tb00001"] .rf-table__empty' ).hidden );
		check( 'table', 'nothing matching shows the empty text', empty );
		await d.fill( '[data-id="tb00001"] .rf-table-tools input', '' );
		const postsTable = await d.evaluate( () => {
			const el = document.querySelector( '[data-id="tb00002"]' ); return { rows: el.querySelectorAll( 'tbody tr' ).length, link: el.querySelector( 'tbody td a' )?.getAttribute( 'href' ), head: el.querySelector( 'th' )?.textContent };
		} );
		const cells = await d.evaluate( () => {
			const el = document.querySelector( '[data-id="tb00003"]' );
			const rows = [ ...el.querySelectorAll( 'tbody tr' ) ];
			const anna = rows[ 0 ].cells[ 1 ];
			const paid = rows[ 0 ].cells[ 5 ];
			return { rows: rows.length, pic: !! anna.querySelector( 'img.rf-table__pic' ), sub: anna.querySelector( '.rf-table__sub' )?.textContent, link: anna.querySelector( 'a' )?.getAttribute( 'href' ), icon: !! rows[ 0 ].cells[ 0 ].querySelector( '.rf-table__icon svg, .rf-table__icon i' ), tone: paid.querySelector( '.rf-table__badge' )?.className, bg: getComputedStyle( paid ).backgroundColor, span: rows[ 1 ].cells[ 1 ].getAttribute( 'colspan' ), cellsInSpanRow: rows[ 1 ].cells.length, total: rows[ 1 ].cells[ 2 ].textContent };
		} );
		check( 'table', 'cell by cell: a picture, an icon, a small line under, a link, its own badge color and background, a cell spanning two columns', 3 === cells.rows && cells.pic && 'anna@example.com' === cells.sub && '#anna' === cells.link && cells.icon && /rf-dash-tone--danger/.test( cells.tone ) && 'rgb(255, 238, 221)' === cells.bg && '2' === cells.span && 5 === cells.cellsInSpanRow && '$900.00' === cells.total.trim(), JSON.stringify( cells ) );
		await d.click( '[data-id="tb00003"] .rf-table__sort[data-col="3"]' );
		await d.click( '[data-id="tb00003"] .rf-table__sort[data-col="3"]' );
		const firstTotal = await d.evaluate( () => document.querySelector( '[data-id="tb00003"] tbody tr td[data-col="3"]' ).textContent.trim() );
		check( 'table', 'cell by cell: sorting by Total finds the right cells past a spanning cell ($5,000.00 first)', '$5,000.00' === firstTotal, firstTotal );
		check( 'table', 'the latest posts: 5 rows, titles linked', 5 === postsTable.rows && /\?p=|\//.test( postsTable.link || '' ) && /Title/.test( postsTable.head ), JSON.stringify( postsTable ) );
		await d.screenshot( { path: join( SHOTS, 'dashboard.png' ), fullPage: true } );
		await d.context().close();

		// Phone.
		const m = await ( await browser.newContext( { viewport: { width: 390, height: 844 } } ) ).newPage();
		watch( m );
		await m.goto( p1.url );
		await sleep( 1500 );
		const phone = await m.evaluate( () => ( { page: document.documentElement.scrollWidth } ) );
		check( 'phone', 'a phone: no sideways scrolling (the wide table scrolls inside its card)', phone.page <= 390, JSON.stringify( phone ) );
		await m.screenshot( { path: join( SHOTS, 'dashboard-phone.png' ), fullPage: true } );
		await m.context().close();

		// The editor.
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
		const ed = await e.evaluate( () => {
			const cache = window.refraction.widgetsCache;
			return { cats: [ 'refraction-chart', 'refraction-data-table', 'refraction-stat-card' ].map( ( n ) => ( cache[ n ]?.categories || [] ).join() ), dynamic: !! cache[ 'refraction-stat-card' ]?.controls?.value?.dynamic?.active, tag: !! window.refraction.config?.dynamicTags?.tags?.[ 'site-statistic' ] };
		} );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const drawn = await frame.evaluate( () => document.querySelectorAll( '.rf-chart.is-drawn' ).length );
		check( 'editor', 'the three widgets in the Dashboard category, values open to Dynamic Tags, the Site Statistic tag listed, charts drawn in the preview', ed.cats.every( ( c ) => 'refraction-dashboard' === c ) && ed.dynamic && ed.tag && drawn >= 2, JSON.stringify( { ...ed, drawn } ) );
		const filled = await e.evaluate( async () => {
			const c = window.refraction.getContainer( 'tb00001' );
			window.$e.run( 'document/elements/select', { container: c } );
			await new Promise( ( r ) => setTimeout( r, 1500 ) );
			window.$e.run( 'document/elements/settings', { container: c, settings: { manual_input: 'fields' } } );
			await new Promise( ( r ) => setTimeout( r, 1000 ) );
			const row = c.repeaters.rows.children[ 0 ].settings;
			return [ 1, 2, 3, 4, 5, 6 ].map( ( i ) => row.get( `cell_${ i }` ) ).join( ',' );
		} );
		check( 'editor', 'switching to One field per column fills each row\'s fields from its line', '#1042,Anna Brown,2026-11-02,1250.50,100,Paid' === filled, filled );
		await e.evaluate( () => {
			const page = window.refraction.getPanelView().getCurrentPageView();
			page.activateSection( 'section_rows' );
			page._renderChildren();
		} );
		await sleep( 800 );
		await e.evaluate( () => document.querySelector( '.refraction-control-rows .refraction-repeater-row-item-title' )?.click() );
		await sleep( 800 );
		const shown = await e.evaluate( () => {
			const row = document.querySelector( '.refraction-control-rows .refraction-repeater-fields' );
			const visible = [ ...row.querySelectorAll( '.rf-table-row-field' ) ].filter( ( el ) => el.offsetParent );
			return { titles: visible.map( ( el ) => el.querySelector( '.refraction-control-title' )?.textContent.trim() ).join( ',' ), line: !! row.querySelector( '.refraction-control-cells' )?.offsetParent };
		} );
		check( 'editor', 'a typed-in row then shows one field per column, named after the headings, and hides the one-line field', 'Order,Customer,Date,Total,Progress,Status' === shown.titles && ! shown.line, JSON.stringify( shown ) );
		const previewCell = await frame.evaluate( () => new Promise( ( r ) => setTimeout( () => r( document.querySelector( '[data-id="tb00001"] tbody td' )?.textContent.trim() ), 2000 ) ) );
		check( 'editor', 'the preview reads the fields', /#104/.test( previewCell || '' ), previewCell );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall dashboard checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
