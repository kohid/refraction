#!/usr/bin/env node
/**
 * Records Dashboard (0.129.0, SQLite test site, Chromium): Sidebar Panel, Records Table, Record Details.
 *
 * A Bookings collection with 14 records (references, pickup times, customers, journeys with stops, fares, statuses).
 * On the site, signed in:
 * - Sidebar Panel docked left: fixed full height at the edge, the page moved aside by its width; floating: 16px from
 *   the edge, rounded, the page moved by width + 2 x gap; docked right; in the page (sticky); on a phone it folds
 *   into a Menu button opening a drawer (overlay, Escape closes), and the page is not moved.
 * - Records Table: 10 rows of 14, count, summary, reference + pickup, initials, journey markers A 1 B, fare, badges;
 *   next page; search; status filter; from/to dates; sorting by a heading; Export CSV; dragging a heading reorders the
 *   columns (kept after a reload) and Reset columns brings them back; rows as cards on a phone.
 * - A row opens the Off-Canvas with Record Details: title, booked date, journey, Call / Email, fare rows, total;
 *   a status button changes the status (stored) and the table shows it.
 * - Signed out: the message instead of records, and the request endpoint refuses; a changed config is refused.
 * In Edit Mode: a new Sidebar Panel holds one container and shows docked at the left; Placement / Side change at
 * once; the phone preview folds it with the drawer open; a Records Table shows the rows and a column moved in the
 * panel moves in the preview; Record Details shows the newest record and a changed section look shows at once.
 *
 * Usage: node scripts/check-records-dashboard.mjs [--site /tmp/rf-fresh-9382] [--port 9382] [--shots DIR]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-fresh-9382' );
const PORT = arg( 'port', '9382' );
const SHOTS = arg( 'shots', '/tmp/records-shots' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const BASE = `http://127.0.0.1:${ PORT }`;
const WPDIR = join( SITE, 'wordpress' );

let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 700 ) }` }` );
};
const wp = ( args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ WPDIR }`, '--allow-root', ...args ], { encoding: 'utf8' } );
const php = ( code ) => wp( [ 'eval', code ] ).trim();
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

let uid = 0;
const id = () => 'rd' + ( ++uid ).toString( 16 ).padStart( 5, '0' );

function page( title, elements ) {
	const pid = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	wp( [ 'post', 'meta', 'update', pid, '_refraction_edit_mode', 'builder' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_template_type', 'wp-page' ] );
	wp( [ 'post', 'meta', 'update', pid, '_refraction_data', JSON.stringify( elements ) ] );
	wp( [ 'post', 'update', pid, '--page_template=refraction_canvas' ] );
	return { id: pid, url: `${ BASE }/?page_id=${ pid }` };
}

/* ------------------------------------------------------------------ data */

const PEOPLE = [ 'Aileen Fraser', 'Jamie Smith', 'Morag Grant', 'Calum Ross', 'Isla MacLeod', 'Ewan Munro', 'Kirsty Bain' ];

function seed() {
	php( `
		$c = new Refraction\\Modules\\FormBuilder\\Classes\\Collections();
		$c->save( [
			'label' => 'Bookings', 'slug' => 'bookings',
			'statuses' => [
				[ 'key' => 'pending', 'label' => 'Pending', 'color' => 'warning' ],
				[ 'key' => 'confirmed', 'label' => 'Confirmed', 'color' => 'primary' ],
				[ 'key' => 'completed', 'label' => 'Completed', 'color' => 'success' ],
				[ 'key' => 'cancelled', 'label' => 'Cancelled', 'color' => 'danger' ],
			],
			'default_status' => 'pending',
			'settings' => [ 'currency_symbol' => '£' ],
			'fields' => [
				[ 'type' => 'text', 'label' => 'Reference', 'key' => 'reference' ],
				[ 'type' => 'datetime', 'label' => 'Pickup', 'key' => 'pickup' ],
				[ 'type' => 'text', 'label' => 'Customer', 'key' => 'customer' ],
				[ 'type' => 'phone', 'label' => 'Phone', 'key' => 'phone' ],
				[ 'type' => 'email', 'label' => 'Email', 'key' => 'email' ],
				[ 'type' => 'text', 'label' => 'From', 'key' => 'from_place' ],
				[ 'type' => 'textarea', 'label' => 'Stops', 'key' => 'stops' ],
				[ 'type' => 'text', 'label' => 'To', 'key' => 'to_place' ],
				[ 'type' => 'text', 'label' => 'Service', 'key' => 'service' ],
				[ 'type' => 'currency', 'label' => 'Fare', 'key' => 'fare' ],
				[ 'type' => 'currency', 'label' => 'Booking fee', 'key' => 'fee' ],
			],
		] );
	` );

	const people = JSON.stringify( PEOPLE );
	php( `
		$d = ( new Refraction\\Modules\\FormBuilder\\Classes\\Collections() )->get( 'bookings' );
		$r = new Refraction\\Modules\\FormBuilder\\Classes\\Records();
		$people = json_decode( '${ people }', true );
		$statuses = [ 'pending', 'confirmed', 'completed', 'cancelled' ];
		for ( $i = 1; $i <= 14; $i++ ) {
			$name = $people[ $i % count( $people ) ];
			$id = $r->insert( $d, [
				'reference' => sprintf( 'ICT-%04d', 1000 + $i ),
				'pickup' => sprintf( '2026-07-%02d 09:%02d', $i, 10 + $i ),
				'customer' => $name,
				'phone' => '+44 7700 9000' . sprintf( '%02d', $i ),
				'email' => strtolower( str_replace( ' ', '.', $name ) ) . '@example.com',
				'from_place' => 'Inverness Airport',
				'stops' => 0 === $i % 3 ? "Culloden Moor\\nNairn" : ( 0 === $i % 2 ? 'Culloden Moor' : '' ),
				'to_place' => 'Eden Court, Inverness',
				'service' => 0 === $i % 2 ? 'Executive' : 'Standard',
				'fare' => (string) ( 20 + $i * 5 ),
				'fee' => '2.50',
			], $statuses[ $i % 4 ] );
			wp_update_post( [ 'ID' => $id, 'post_title' => sprintf( 'ICT-%04d', 1000 + $i ), 'post_date' => sprintf( '2026-06-%02d 10:00:00', $i ), 'post_date_gmt' => sprintf( '2026-06-%02d 10:00:00', $i ) ] );
		}
	` );
}

/* -------------------------------------------------------------- elements */

const panel = ( settings = {}, inner = [] ) => ( {
	id: id(), elType: 'widget', widgetType: 'refraction-sidebar-panel',
	settings: { panel_label: 'Main menu', toggle_text: 'Menu', ...settings },
	elements: [ { id: id(), elType: 'container', isInner: true, settings: { _title: 'Sidebar content', content_width: 'full' }, elements: inner.length ? inner : [
		{ id: id(), elType: 'widget', widgetType: 'heading', settings: { title: 'Sprint Booking', header_size: 'h3', title_color: '#ffffff' }, elements: [] },
		{ id: id(), elType: 'widget', widgetType: 'text-editor', settings: { editor: '<p><a href="#">Bookings</a></p><p><a href="#">Drivers</a></p><p><a href="#">Settings</a></p>' }, elements: [] },
	] } ],
} );

const COLUMNS = [
	{ _id: 'c1', col_label: 'Reference', col_type: 'reference', col_field: '_title', col_sub: 'pickup', col_sort: 'yes' },
	{ _id: 'c2', col_label: 'Customer', col_type: 'person', col_field: 'customer', col_sub: 'phone', col_sort: 'yes' },
	{ _id: 'c3', col_label: 'Journey', col_type: 'journey', col_from: 'from_place', col_stops: 'stops', col_to: 'to_place', col_width: 260 },
	{ _id: 'c4', col_label: 'Service', col_type: 'text', col_field: 'service', col_sort: 'yes' },
	{ _id: 'c5', col_label: 'Fare', col_type: 'money', col_field: 'fare', col_sort: 'yes', col_align: 'end' },
	{ _id: 'c6', col_label: 'Status', col_type: 'badge', col_field: '_status', col_sort: 'yes' },
];

const table = ( settings = {} ) => ( {
	id: id(), elType: 'widget', widgetType: 'refraction-records-table',
	settings: { collection: 'bookings', access: 'admins', per_page: 10, orderby: '_created', order: 'desc', title: 'Bookings', show_count: 'yes', columns: COLUMNS,
		tool_search: 'yes', tool_status: 'yes', tool_dates: 'yes', tool_refresh: 'yes', tool_export: 'yes', reorder: 'yes', cards_on_phone: 'yes',
		search_placeholder: 'Search bookings', open_panel: 'booking-details', denied_text: 'Sign in to see the bookings.', ...settings },
	elements: [],
} );

const SECTIONS = [
	{ _id: 's1', sec_type: 'status', sec_label: 'Status' },
	{ _id: 's2', sec_type: 'field', sec_label: 'Pickup', sec_field: 'pickup', sec_look: 'strong', sec_width: 'half' },
	{ _id: 's3', sec_type: 'field', sec_label: 'Service', sec_field: 'service', sec_width: 'half' },
	{ _id: 's4', sec_type: 'journey', sec_label: 'Journey', sec_from: 'from_place', sec_stops: 'stops', sec_to: 'to_place' },
	{ _id: 's5', sec_type: 'person', sec_label: 'Customer', sec_field: 'customer', sec_phone: 'phone', sec_email: 'email' },
	{ _id: 's6', sec_type: 'heading', sec_label: 'Fare' },
	{ _id: 's7', sec_type: 'field', sec_label: 'Fare', sec_field: 'fare', sec_look: 'money' },
	{ _id: 's8', sec_type: 'field', sec_label: 'Booking fee', sec_field: 'fee', sec_look: 'money' },
	{ _id: 's9', sec_type: 'field', sec_label: 'Total', sec_field: 'fare', sec_look: 'total' },
];

const details = ( settings = {} ) => ( {
	id: id(), elType: 'widget', widgetType: 'refraction-record-details',
	settings: { collection: 'bookings', access: 'admins', title_field: '_title', show_booked: 'yes', booked_label: 'Booked', admin_link: 'yes', sections: SECTIONS, ...settings },
	elements: [],
} );

const offCanvas = () => ( {
	id: id(), elType: 'widget', widgetType: 'refraction-off-canvas',
	settings: { position: 'right', panel_id: 'booking-details', panel_label: 'Booking details', show_button: '', show_close_button: 'yes', panel_width: { unit: 'px', size: 420 } },
	elements: [ { id: id(), elType: 'container', isInner: true, settings: { content_width: 'full' }, elements: [ details() ] } ],
} );

const dashboard = ( panelSettings = {} ) => [
	{ id: id(), elType: 'container', settings: { content_width: 'full' }, elements: [ panel( panelSettings ) ] },
	{ id: id(), elType: 'container', settings: { content_width: 'full', padding: { unit: 'px', top: '24', right: '24', bottom: '24', left: '24', isLinked: true } }, elements: [ table(), offCanvas() ] },
];

/* ------------------------------------------------------------- measures */

const sidebar = ( p ) => p.evaluate( () => {
	const root = document.querySelector( '.rf-sbp' );
	const panelEl = root.querySelector( '.rf-sbp__panel' );
	const r = panelEl.getBoundingClientRect();
	const cs = getComputedStyle( panelEl );
	const body = getComputedStyle( document.body );
	return {
		position: cs.position, left: Math.round( r.left ), right: Math.round( window.innerWidth - r.right ), top: Math.round( r.top ),
		width: Math.round( r.width ), height: Math.round( r.height ), vh: window.innerHeight, radius: cs.borderTopLeftRadius, visibility: cs.visibility,
		padLeft: body.paddingLeft, padRight: body.paddingRight, folded: root.classList.contains( 'is-folded' ), open: root.classList.contains( 'is-open' ),
		toggle: getComputedStyle( root.querySelector( '.rf-sbp__toggle' ) ).display, overlay: ! root.querySelector( '.rf-sbp__overlay' ).hidden, bg: cs.backgroundColor, bar: document.getElementById( 'wpadminbar' )?.offsetHeight || 0,
	};
} );

const rowsInfo = ( p ) => p.evaluate( () => {
	const rows = [ ...document.querySelectorAll( '.rf-rt tbody tr.rf-rec-row' ) ];
	const heads = [ ...document.querySelectorAll( '.rf-rt thead th' ) ].map( ( th ) => th.textContent.trim() );
	const col = ( name ) => heads.indexOf( name );
	const cell = ( row, name ) => row.querySelector( `td[data-col="${ [ 'Reference', 'Customer', 'Journey', 'Service', 'Fare', 'Status' ].indexOf( name ) }"]` );
	return {
		count: rows.length,
		heads,
		refs: rows.map( ( r ) => cell( r, 'Reference' )?.querySelector( '.rf-rec-main' )?.textContent ),
		fares: rows.map( ( r ) => cell( r, 'Fare' )?.textContent.trim() ),
		statuses: rows.map( ( r ) => cell( r, 'Status' )?.textContent.trim() ),
		total: document.querySelector( '.rf-rt__count' )?.textContent,
		summary: document.querySelector( '.rf-rt__summary' )?.textContent,
		pager: document.querySelector( '.rf-rt__page' )?.textContent.trim(),
		col,
	};
} );

const waitIdle = async ( p ) => {
	await p.waitForFunction( () => ! document.querySelector( '.rf-rt.is-loading, .rf-rd.is-loading' ), null, { timeout: 20000 } );
	await sleep( 150 );
};

async function login( ctx ) {
	const p = await ctx.newPage();
	await p.goto( `${ BASE }/wp-login.php` );
	await p.fill( '#user_login', 'admin' );
	await p.fill( '#user_pass', 'admin' );
	await Promise.all( [ p.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), p.click( '#wp-submit' ) ] );
	return p;
}

async function main() {
	mkdirSync( SHOTS, { recursive: true } );
	seed();

	const count = php( `echo ( new Refraction\\Modules\\FormBuilder\\Classes\\Records() )->count( 'bookings' );` );
	check( 'setup', 'a Bookings collection with 14 records', '14' === count, count );

	const board = page( 'Bookings dashboard', dashboard() );
	const floating = page( 'Floating sidebar', dashboard( { look: 'floating' } ) );
	const right = page( 'Right sidebar', [ { id: id(), elType: 'container', settings: {}, elements: [ panel( { side: 'right' } ) ] }, { id: id(), elType: 'container', settings: {}, elements: [ { id: id(), elType: 'widget', widgetType: 'heading', settings: { title: 'Page' }, elements: [] } ] } ] );
	const inline = page( 'Inline sidebar', [ { id: id(), elType: 'container', settings: { flex_direction: 'row', content_width: 'full' }, elements: [ panel( { look: 'inline', width: { unit: 'px', size: 240 } } ), { id: id(), elType: 'container', isInner: true, settings: { min_height: { unit: 'px', size: 2000 } }, elements: [ { id: id(), elType: 'widget', widgetType: 'heading', settings: { title: 'Long page' }, elements: [] } ] } ] } ] );

	const browser = await chromium.launch( existsSync( '/opt/pw-browsers/chromium' ) ? { executablePath: '/opt/pw-browsers/chromium', args: [ '--no-sandbox' ] } : {} );
	const errors = [];

	try {
		const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 }, acceptDownloads: true } );
		const p = await login( ctx );
		p.on( 'pageerror', ( e ) => errors.push( e.message ) );

		// ---------------------------------------------------------- sidebar
		await p.goto( board.url );
		await p.waitForSelector( '.rf-rt tbody tr.rf-rec-row' );
		await sleep( 800 );
		let sb = await sidebar( p );
		check( 'sidebar', 'docked left: fixed at the edge, 260px wide, full height', 'fixed' === sb.position && 0 === sb.left && 260 === sb.width && Math.abs( sb.height - sb.vh + sb.top ) <= 1, JSON.stringify( sb ) );
		check( 'sidebar', 'docked left: the page is moved aside by the panel width', '260px' === sb.padLeft, JSON.stringify( sb ) );
		check( 'sidebar', 'docked left: no Menu button on a wide screen, dark panel by default', 'none' === sb.toggle && 'rgb(18, 26, 44)' === sb.bg, JSON.stringify( sb ) );
		const tableLeft = await p.evaluate( () => Math.round( document.querySelector( '.rf-rt' ).getBoundingClientRect().left ) );
		check( 'sidebar', 'the table starts right of the panel', tableLeft >= 260, String( tableLeft ) );
		await p.screenshot( { path: join( SHOTS, 'dashboard.png' ) } );

		// ------------------------------------------------------------ table
		let info = await rowsInfo( p );
		check( 'table', '10 rows of 14, newest first; count, summary and pager', 10 === info.count && '14' === info.total && /1.10 of 14/.test( info.summary ) && 'Page 1 of 2' === info.pager && 'ICT-1014' === info.refs[ 0 ], JSON.stringify( info ) );
		const first = await p.evaluate( () => {
			const row = document.querySelector( '.rf-rt tbody tr.rf-rec-row' );
			return {
				sub: row.querySelector( 'td[data-col="0"] .rf-rec-sub' )?.textContent,
				avatar: row.querySelector( '.rf-rec-avatar' )?.textContent,
				name: row.querySelector( 'td[data-col="1"] .rf-rec-main' )?.textContent,
				marks: [ ...row.querySelectorAll( '.rf-rec-mark' ) ].map( ( m ) => m.textContent ).join( '' ),
				places: [ ...row.querySelectorAll( '.rf-rec-place-text' ) ].map( ( m ) => m.textContent ),
				fare: row.querySelector( 'td[data-col="4"]' ).textContent.trim(),
				fareAlign: getComputedStyle( row.querySelector( 'td[data-col="4"]' ) ).textAlign,
				badge: row.querySelector( '.rf-rec-badge' )?.textContent,
				badgeColor: getComputedStyle( row.querySelector( '.rf-rec-badge' ) ).color,
				journeyWidth: Math.round( document.querySelector( '.rf-rt thead th[data-col="2"]' ).getBoundingClientRect().width ),
				avatarBg: getComputedStyle( row.querySelector( '.rf-rec-avatar' ) ).backgroundColor,
				startBg: getComputedStyle( row.querySelector( '.is-start .rf-rec-mark' ) ).backgroundColor,
				line: getComputedStyle( row.querySelector( 'td' ) ).borderBottomColor,
			};
		} );
		// ICT-1014: Jamie Smith (14 % 7 = 0 -> Aileen Fraser), stops "Culloden Moor" (14 % 2), fare 90, status 14 % 4 = 2 -> completed.
		check( 'table', 'reference with the pickup below it', /July 14, 2026|14 July 2026|2026/.test( first.sub || '' ) && /9:24|09:24/.test( first.sub || '' ), JSON.stringify( first ) );
		check( 'table', 'person: initials avatar and name', 'AF' === first.avatar && 'Aileen Fraser' === first.name, JSON.stringify( first ) );
		check( 'table', 'the accent and lines apply: tinted avatar circle, filled A marker, row lines', 'rgb(42, 79, 201)' === first.startBg && /^(rgb\(2|color\(srgb 0\.[89])/.test( first.avatarBg ) && ! /rgba\(0, 0, 0, 0\)/.test( first.avatarBg ) && 'rgb(231, 234, 240)' === first.line, JSON.stringify( first ) );
		check( 'table', 'journey: A, numbered stop, B', 'A1B' === first.marks && 'Culloden Moor' === first.places[ 1 ], JSON.stringify( first ) );
		check( 'table', 'fare in the collection currency, aligned to the end', '£90.00' === first.fare && 'end' === first.fareAlign, JSON.stringify( first ) );
		check( 'table', 'status badge in its colour (Completed, green)', 'Completed' === first.badge && 'rgb(31, 138, 76)' === first.badgeColor, JSON.stringify( first ) );
		check( 'table', 'the Journey column has its 260px width', Math.abs( first.journeyWidth - 260 ) <= 2, JSON.stringify( first ) );

		await p.click( '.rf-rt__next' );
		await waitIdle( p );
		info = await rowsInfo( p );
		check( 'table', 'next page: 4 rows, Page 2 of 2', 4 === info.count && 'Page 2 of 2' === info.pager && /11.14 of 14/.test( info.summary ), JSON.stringify( info ) );
		await p.click( '.rf-rt__prev' );
		await waitIdle( p );

		await p.fill( '.rf-rt__search input', 'Jamie Smith' );
		await sleep( 500 );
		await waitIdle( p );
		info = await rowsInfo( p );
		check( 'table', 'search: only Jamie Smith\'s 2 bookings, the count follows', 2 === info.count && '2' === info.total, JSON.stringify( info ) );
		check( 'table', 'Clear shows while a filter is set', await p.isVisible( '.rf-rt__clear' ) );
		await p.click( '.rf-rt__clear' );
		await waitIdle( p );

		await p.selectOption( '.rf-rt__filters select[name=status]', 'confirmed' );
		await waitIdle( p );
		info = await rowsInfo( p );
		check( 'table', 'status filter: only Confirmed rows', info.count > 0 && info.statuses.every( ( s ) => 'Confirmed' === s ), JSON.stringify( info ) );
		await p.click( '.rf-rt__clear' );
		await waitIdle( p );

		await p.fill( '.rf-rt__filters input[name=from]', '2026-06-03' );
		await p.fill( '.rf-rt__filters input[name=to]', '2026-06-05' );
		// The reload starts after the last change (both dates kept): wait for its rows rather than a fixed time.
		await p.waitForFunction( () => 3 === document.querySelectorAll( '.rf-rt tbody tr.rf-rec-row' ).length, null, { timeout: 15000 } ).catch( () => {} );
		await waitIdle( p );
		info = await rowsInfo( p );
		check( 'table', 'from / to dates: booked 3 to 5 June (3 rows)', 3 === info.count && 'ICT-1005,ICT-1004,ICT-1003' === info.refs.join( ',' ), JSON.stringify( info ) );
		await p.click( '.rf-rt__clear' );
		await waitIdle( p );

		await p.click( '.rf-rt thead th[data-col="4"] .rf-rt__sort' );
		await waitIdle( p );
		info = await rowsInfo( p );
		const sortDesc = await p.getAttribute( '.rf-rt thead th[data-col="4"]', 'aria-sort' );
		check( 'table', 'sorting by Fare (highest first)', '£90.00' === info.fares[ 0 ] && 'descending' === sortDesc, JSON.stringify( { fares: info.fares, sortDesc } ) );
		await p.click( '.rf-rt thead th[data-col="4"] .rf-rt__sort' );
		await waitIdle( p );
		info = await rowsInfo( p );
		check( 'table', 'and again: lowest first', '£25.00' === info.fares[ 0 ] && 'ascending' === await p.getAttribute( '.rf-rt thead th[data-col="4"]', 'aria-sort' ), JSON.stringify( info.fares ) );

		const [ download ] = await Promise.all( [ p.waitForEvent( 'download', { timeout: 20000 } ), p.click( '.rf-rt__export' ) ] );
		const file = join( SHOTS, 'export.csv' );
		await download.saveAs( file );
		const csv = readFileSync( file, 'utf8' ).replace( /^\uFEFF/, '' ).trim().split( /\r?\n/ );
		check( 'export', 'Export CSV: the headings and all 14 records', 15 === csv.length && /^Reference,Customer,Journey,Service,Fare,Status/.test( csv[ 0 ] ) && csv.some( ( l ) => /ICT-1014/.test( l ) && /£90\.00/.test( l ) ), csv.slice( 0, 3 ).join( ' / ' ) );

		// ---------------------------------------------------- reorder columns
		await p.dragAndDrop( '.rf-rt thead th[data-col="5"]', '.rf-rt thead th[data-col="0"]' );
		await sleep( 300 );
		info = await rowsInfo( p );
		const cellOrder = await p.evaluate( () => [ ...document.querySelector( '.rf-rt tbody tr.rf-rec-row' ).children ].map( ( td ) => td.dataset.col ).join( '' ) );
		check( 'reorder', 'dragging Status onto Reference puts it first, in the rows too', 'Status' === info.heads[ 0 ] && '501234' === cellOrder, JSON.stringify( { heads: info.heads, cellOrder } ) );
		await p.reload();
		await p.waitForSelector( '.rf-rt tbody tr.rf-rec-row' );
		await sleep( 500 );
		info = await rowsInfo( p );
		check( 'reorder', 'kept after a reload, with Reset columns shown', 'Status' === info.heads[ 0 ] && await p.isVisible( '.rf-rt__reset' ), JSON.stringify( info.heads ) );
		await p.click( '.rf-rt__reset' );
		await sleep( 200 );
		info = await rowsInfo( p );
		check( 'reorder', 'Reset columns brings the set order back', 'Reference' === info.heads[ 0 ] && ! await p.isVisible( '.rf-rt__reset' ), JSON.stringify( info.heads ) );

		// ------------------------------------------------------ row -> details
		await p.click( '.rf-rt tbody tr.rf-rec-row >> nth=1' );
		await p.waitForFunction( () => document.querySelector( '.refraction-offcanvas__layer.is-open' ) && 'ICT-1013' === document.querySelector( '.rf-rd-title' )?.textContent, null, { timeout: 20000 } );
		await sleep( 500 );
		const det = await p.evaluate( () => {
			const root = document.querySelector( '.rf-rd' );
			const q = ( s ) => root.querySelector( s );
			return {
				title: q( '.rf-rd-title' ).textContent,
				booked: q( '.rf-rd-booked' ).textContent,
				current: q( '.rf-rd-status.is-current' )?.textContent,
				statuses: root.querySelectorAll( '.rf-rd-status' ).length,
				marks: [ ...root.querySelectorAll( '.rf-rec-mark' ) ].map( ( m ) => m.textContent ).join( '' ),
				call: q( '.rf-rd-btn[href^="tel:"]' )?.getAttribute( 'href' ),
				mail: q( '.rf-rd-btn[href^="mailto:"]' )?.getAttribute( 'href' ),
				money: [ ...root.querySelectorAll( '.rf-rd-item.is-money .rf-rd-value' ) ].map( ( v ) => v.textContent ),
				total: q( '.rf-rd-item.is-total .rf-rd-value' )?.textContent,
				half: [ ...root.querySelectorAll( '.rf-rd-item.is-half' ) ].map( ( el ) => Math.round( el.getBoundingClientRect().top ) ),
				admin: !! q( '.rf-rd-admin' ),
				selected: document.querySelector( '.rf-rt tr.is-selected td[data-col="0"] .rf-rec-main' )?.textContent,
				panelRight: Math.round( window.innerWidth - document.querySelector( '.refraction-offcanvas__panel' ).getBoundingClientRect().right ),
			};
		} );
		// ICT-1013: Morag Grant? 13 % 7 = 6 -> Kirsty Bain; stops: 13 odd, not % 3 -> none; fare 85; status 13 % 4 = 1 -> confirmed.
		check( 'details', 'a row opens the Off-Canvas at the right with that booking', 'ICT-1013' === det.title && 0 === det.panelRight && 'ICT-1013' === det.selected, JSON.stringify( det ) );
		check( 'details', 'booked date, current status among 4 buttons', /^Booked .*2026/.test( det.booked ) && 'Confirmed' === det.current && 4 === det.statuses, JSON.stringify( det ) );
		check( 'details', 'journey A to B, Call and Email', 'AB' === det.marks && 'tel:+447700900013' === det.call && 'mailto:kirsty.bain@example.com' === det.mail, JSON.stringify( det ) );
		check( 'details', 'fare rows and the total, two half-width fields side by side', '£85.00,£2.50' === det.money.join( ',' ) && '£85.00' === det.total && 2 === det.half.length && det.half[ 0 ] === det.half[ 1 ] && det.admin, JSON.stringify( det ) );
		await p.screenshot( { path: join( SHOTS, 'details-open.png' ) } );

		await p.click( '.rf-rd-status[data-status="completed"]' );
		await p.waitForFunction( () => 'Completed' === document.querySelector( '.rf-rd-status.is-current' )?.textContent, null, { timeout: 20000 } );
		await waitIdle( p );
		await sleep( 600 );
		const stored = php( `echo get_post_meta( ( new WP_Query( [ 'post_type' => 'refraction_fb_record', 'title' => 'ICT-1013', 'fields' => 'ids' ] ) )->posts[0], '_rfb_status', true );` );
		const rowStatus = await p.evaluate( () => document.querySelector( '.rf-rt tr.rf-rec-row[data-id] td[data-col="0"] .rf-rec-main' ) && [ ...document.querySelectorAll( '.rf-rt tr.rf-rec-row' ) ].find( ( r ) => 'ICT-1013' === r.querySelector( 'td[data-col="0"] .rf-rec-main' ).textContent )?.querySelector( '.rf-rec-badge' )?.textContent );
		check( 'details', 'a status button changes the status (stored) and the table row shows it', 'completed' === stored && 'Completed' === rowStatus, JSON.stringify( { stored, rowStatus } ) );
		await p.keyboard.press( 'Escape' );
		await sleep( 400 );

		// --------------------------------------------------------- security
		const tampered = await p.evaluate( async () => {
			const root = document.querySelector( '.rf-rt' );
			const body = new FormData();
			body.append( 'action', 'refraction_records' );
			body.append( 'nonce', root.dataset.nonce );
			body.append( 'config', root.dataset.config.replace( '"a":"admins"', '"a":"logged"' ) );
			body.append( 'sig', root.dataset.sig );
			body.append( 'op', 'rows' );
			const r = await fetch( root.dataset.ajax, { method: 'POST', body } );
			return r.status;
		} );
		check( 'security', 'a changed config is refused', 400 === tampered, String( tampered ) );
		const saved = await p.evaluate( () => ( { config: document.querySelector( '.rf-rt' ).dataset.config, sig: document.querySelector( '.rf-rt' ).dataset.sig, ajax: document.querySelector( '.rf-rt' ).dataset.ajax } ) );

		// ------------------------------------------------------------ phone
		await p.setViewportSize( { width: 390, height: 800 } );
		await sleep( 600 );
		sb = await sidebar( p );
		check( 'phone', 'the sidebar folds: Menu button shown, panel hidden, the page not moved', sb.folded && 'none' !== sb.toggle && 'hidden' === sb.visibility && '0px' === sb.padLeft, JSON.stringify( sb ) );
		await p.click( '.rf-sbp__toggle' );
		await sleep( 500 );
		sb = await sidebar( p );
		check( 'phone', 'the Menu button opens the drawer from the left, over an overlay', sb.open && 'visible' === sb.visibility && 0 === sb.left && sb.overlay, JSON.stringify( sb ) );
		await p.screenshot( { path: join( SHOTS, 'phone-drawer.png' ) } );
		await p.keyboard.press( 'Escape' );
		await sleep( 500 );
		sb = await sidebar( p );
		check( 'phone', 'Escape closes it', ! sb.open && 'hidden' === sb.visibility && ! sb.overlay, JSON.stringify( sb ) );
		const cards = await p.evaluate( () => ( { thead: getComputedStyle( document.querySelector( '.rf-rt thead' ) ).display, td: getComputedStyle( document.querySelector( '.rf-rt tbody td' ) ).display, label: getComputedStyle( document.querySelector( '.rf-rt tbody td' ), '::before' ).content } ) );
		check( 'phone', 'table rows become cards with their headings', 'none' === cards.thead && 'grid' === cards.td && '"Reference"' === cards.label, JSON.stringify( cards ) );
		await p.screenshot( { path: join( SHOTS, 'phone-table.png' ), fullPage: true } );
		await p.setViewportSize( { width: 1440, height: 900 } );

		// ------------------------------------------------ other placements
		await p.goto( floating.url );
		await p.waitForSelector( '.rf-sbp', { state: 'attached' } );
		await sleep( 800 );
		sb = await sidebar( p );
		check( 'sidebar', 'floating: 16px from the edges, rounded, the page moved by 292px', 16 === sb.left && 16 + sb.bar === sb.top && '18px' === sb.radius && '292px' === sb.padLeft, JSON.stringify( sb ) );
		await p.screenshot( { path: join( SHOTS, 'floating.png' ) } );

		await p.goto( right.url );
		await p.waitForSelector( '.rf-sbp', { state: 'attached' } );
		await sleep( 800 );
		sb = await sidebar( p );
		check( 'sidebar', 'docked right: at the right edge, the page moved from the right', 0 === sb.right && '260px' === sb.padRight && '0px' === sb.padLeft, JSON.stringify( sb ) );

		await p.goto( inline.url );
		await p.waitForSelector( '.rf-sbp', { state: 'attached' } );
		await sleep( 800 );
		await p.evaluate( () => window.scrollTo( 0, 800 ) );
		await sleep( 300 );
		sb = await sidebar( p );
		check( 'sidebar', 'in the page: sticky, full screen height, sticks at the top when scrolled, no page move', 'sticky' === sb.position && sb.bar === sb.top && 900 - sb.bar === sb.height && 240 === sb.width && '0px' === sb.padLeft, JSON.stringify( sb ) );

		// -------------------------------------------------------- signed out
		const anon = await browser.newContext( { viewport: { width: 1200, height: 800 } } );
		const ap = await anon.newPage();
		await ap.goto( board.url );
		const out = await ap.evaluate( async ( s ) => {
			const body = new FormData();
			body.append( 'action', 'refraction_records' );
			body.append( 'config', s.config );
			body.append( 'sig', s.sig );
			body.append( 'op', 'rows' );
			const r = await fetch( s.ajax, { method: 'POST', body } );
			return {
				denied: document.querySelector( '.rf-rec-denied' )?.textContent,
				rows: document.querySelectorAll( '.rf-rec-row' ).length,
				details: document.querySelectorAll( '.rf-rd' ).length,
				status: r.status,
				text: ( await r.text() ).slice( 0, 40 ),
			};
		}, saved );
		check( 'security', 'signed out: the message instead of records, no details', /Sign in to see the bookings/.test( out.denied || '' ) && 0 === out.rows && 0 === out.details, JSON.stringify( out ) );
		check( 'security', 'signed out: the request endpoint gives nothing', 400 === out.status && ! /ICT-/.test( out.text ), JSON.stringify( out ) );
		await anon.close();

		// ------------------------------------------------------------ editor
		const blank = page( 'Records editor', [ { id: id(), elType: 'container', settings: {}, elements: [] } ] );
		await p.goto( `${ BASE }/wp-admin/post.php?post=${ blank.id }&action=refraction`, { timeout: 120000 } );
		await p.waitForFunction( () => window.refraction && window.$e && refraction.documents?.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
		await sleep( 2500 );
		const frame = p.frame( { name: 'refraction-preview-iframe' } ) || p.frames().find( ( f ) => f.url().includes( 'refraction-preview' ) );
		const category = await p.evaluate( () => !! document.querySelector( '#refraction-panel-category-refraction-records' ) && [ ...document.querySelectorAll( '#refraction-panel-category-refraction-records .refraction-element .title' ) ].map( ( t ) => t.textContent.trim() ).join( '/' ) );
		check( 'editor', 'a Records category with the three widgets', /Sidebar Panel/.test( category ) && /Records Table/.test( category ) && /Record Details/.test( category ), String( category ) );

		const made = await p.evaluate( async () => {
			const box = refraction.getPreviewContainer().children[ 0 ];
			const el = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'refraction-sidebar-panel' } } );
			await new Promise( ( r ) => setTimeout( r, 1500 ) );
			window.__sbp = el.id;
			return { count: el.children.length, type: el.children[ 0 ]?.model.get( 'elType' ) };
		} );
		check( 'editor', 'a new Sidebar Panel holds one container', 1 === made.count && 'container' === made.type, JSON.stringify( made ) );
		await sleep( 800 );
		sb = await sidebar( frame );
		check( 'editor', 'the preview shows it docked at the left, the page moved aside', 'fixed' === sb.position && 0 === sb.left && '260px' === sb.padLeft, JSON.stringify( sb ) );

		const setSb = ( settings ) => p.evaluate( async ( s ) => {
			const el = refraction.getContainer( window.__sbp );
			$e.run( 'document/elements/settings', { container: el, settings: s } );
			await new Promise( ( r ) => setTimeout( r, 1200 ) );
		}, settings );
		await setSb( { look: 'floating' } );
		sb = await sidebar( frame );
		check( 'editor', 'Placement: Floating shows at once (16px from the edge, rounded)', 16 === sb.left && '18px' === sb.radius && '292px' === sb.padLeft, JSON.stringify( sb ) );
		await setSb( { side: 'right', look: 'docked' } );
		sb = await sidebar( frame );
		check( 'editor', 'Side: Right shows at once (at the right edge, the page moved from the right)', 0 === sb.right && '260px' === sb.padRight && '0px' === sb.padLeft, JSON.stringify( sb ) );
		await setSb( { width: { unit: 'px', size: 320 } } );
		sb = await sidebar( frame );
		check( 'editor', 'Width shows at once and the page move follows', 320 === sb.width && '320px' === sb.padRight, JSON.stringify( sb ) );
		await setSb( { side: 'left', width: { unit: 'px', size: 260 } } );

		const tbl = await p.evaluate( async ( cols ) => {
			const box = refraction.getPreviewContainer().children[ 0 ];
			const el = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'refraction-records-table', settings: { collection: 'bookings', columns: cols } } } );
			window.__rt = el.id;
			const detEl = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: 'refraction-record-details', settings: { collection: 'bookings' } } } );
			window.__rd = detEl.id;
			await new Promise( ( r ) => setTimeout( r, 3000 ) );
			return true;
		}, COLUMNS );
		await frame.waitForSelector( '.rf-rt tbody tr.rf-rec-row', { timeout: 30000 } );
		await sleep( 500 );
		info = await rowsInfo( frame );
		check( 'editor', 'a Records Table shows the bookings in the preview', tbl && 10 === info.count && 'Reference' === info.heads[ 0 ], JSON.stringify( info ) );
		await p.evaluate( async () => {
			const el = refraction.getContainer( window.__rt );
			$e.run( 'document/repeater/move', { container: el, name: 'columns', sourceIndex: 4, targetIndex: 0 } );
			await new Promise( ( r ) => setTimeout( r, 2500 ) );
		} );
		await frame.waitForSelector( '.rf-rt tbody tr.rf-rec-row' );
		info = await rowsInfo( frame );
		check( 'editor', 'moving the Fare column first in the panel moves it in the preview', 'Fare' === info.heads[ 0 ], JSON.stringify( info.heads ) );

		const edDet = await frame.evaluate( () => ( { title: document.querySelector( '.rf-rd-title' )?.textContent, items: document.querySelectorAll( '.rf-rd-item' ).length } ) );
		check( 'editor', 'Record Details shows the newest booking (ICT-1014) to style', 'ICT-1014' === edDet.title && edDet.items >= 4, JSON.stringify( edDet ) );
		await p.evaluate( async () => {
			const el = refraction.getContainer( window.__rd );
			const sections = el.settings.get( 'sections' );
			const total = sections.models.findIndex( ( m ) => 'field' === m.get( 'sec_type' ) );
			$e.run( 'document/elements/settings', { container: el.repeaters.sections.children[ total ], settings: { sec_field: 'fare', sec_look: 'badge' } } );
			await new Promise( ( r ) => setTimeout( r, 2500 ) );
		} );
		const badge = await frame.evaluate( () => document.querySelector( '.rf-rd .rf-rd-item.is-badge .rf-rec-badge' )?.textContent );
		check( 'editor', 'a section changed to a Badge in the panel shows as a badge at once', '£90.00' === badge, String( badge ) );
		await p.screenshot( { path: join( SHOTS, 'editor.png' ) } );

		await p.evaluate( () => refraction.changeDeviceMode( 'mobile' ) );
		await sleep( 2000 );
		sb = await sidebar( frame );
		check( 'editor', 'phone preview: the panel folds and its drawer stays open to edit', sb.folded && sb.open && 'visible' === sb.visibility && ! sb.overlay && '0px' === sb.padLeft, JSON.stringify( sb ) );
		await p.screenshot( { path: join( SHOTS, 'editor-phone.png' ) } );

		check( 'errors', 'no script errors', 0 === errors.length, errors.slice( 0, 3 ).join( ' | ' ) );
	} finally {
		await browser.close();
	}

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall records dashboard checks passed' );
	process.exit( failures ? 1 : 0 );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
