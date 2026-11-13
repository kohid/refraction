#!/usr/bin/env node
/**
 * Audit of every widget's panel (SQLite test site, Chromium): for each widget and each Content / Style section, how many
 * controls show, how many category headings and state tabs it has. Lists the sections that are long and not organised
 * (many controls, no headings and no tabs), as candidates for the Phone Showcase pattern (parts, states, categories).
 *
 * Usage: node scripts/audit-widget-panels.mjs --port N [--min 14] [--all] [--json out.json] [--flagged out.txt]
 * --all counts every setting a section can show (conditions ignored); without it, the settings shown with every
 * switcher on and the rest at their defaults.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );
const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const PORT = arg( 'port', '8994' );
const MIN = Number( arg( 'min', '14' ) );
const BASE = `http://127.0.0.1:${ PORT }`;

function findChromium() {
	const root = '/opt/pw-browsers';
	for ( const d of readdirSync( root ).filter( ( x ) => /^chromium-\d+$/.test( x ) ).sort().reverse() ) {
		for ( const sub of [ 'chrome-linux64/chrome', 'chrome-linux/chrome' ] ) {
			if ( existsSync( join( root, d, sub ) ) ) { return join( root, d, sub ); }
		}
	}
	return undefined;
}

const browser = await chromium.launch( { executablePath: findChromium(), args: [ '--no-sandbox' ] } );
const a = await browser.newPage();
await a.goto( `${ BASE }/wp-login.php` );
await a.fill( '#user_login', 'admin' );
await a.fill( '#user_pass', 'admin' );
await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000, waitUntil: 'commit' } ), a.click( '#wp-submit' ) ] );
await a.goto( `${ BASE }/wp-admin/post-new.php?post_type=page`, { timeout: 120000 } );
const id = await a.evaluate( () => new URLSearchParams( location.search ).get( 'post' ) || document.querySelector( '#post_ID' )?.value );
await a.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction`, { timeout: 120000 } );
await a.waitForFunction( () => window.refraction && refraction.widgetsCache && Object.keys( refraction.widgetsCache ).length > 20, null, { timeout: 120000 } );
await a.waitForTimeout( 2000 );

const rows = await a.evaluate( ( ALL ) => {
	const skip = new Set( [ 'hidden', 'section', 'tabs', 'tab', 'divider', 'raw_html', 'deprecated_notice', 'alert', 'notice' ] );
	const common = new Set( Object.keys( ( refraction.widgetsCache.common || {} ).controls || {} ) );
	const devices = Object.keys( refraction.config.responsive.activeBreakpoints || {} ).concat( [ 'tablet', 'mobile' ] );
	const deviceCopy = new RegExp( `_(${ devices.join( '|' ) })$` );
	const out = [];
	for ( const [ type, w ] of Object.entries( refraction.widgetsCache ) ) {
		if ( [ 'common', 'common-optimized', 'common-base' ].includes( type ) || ! w.controls || ! w.title ) { continue; }
		const sections = {};
		const values = {};
		// Every feature switched on (switchers and popover toggles), the rest at their defaults: the longest a section gets.
		for ( const c of Object.values( w.controls ) ) { values[ c.name ] = 'switcher' === c.type || 'popover_toggle' === c.type ? ( c.return_value || 'yes' ) : c.default; }
		for ( const c of Object.values( w.controls ) ) {
			if ( ALL ) {
				// Every setting a section can show, whatever is chosen: group controls count once (Background, Border).
				if ( /_background_(?!background$)\w+$/.test( c.name ) || /_border_(width|color)$/.test( c.name ) || /_box_shadow_position$/.test( c.name ) ) { continue; }
			} else if ( 'section' !== c.type && ! refraction.helpers.isActiveControl( c, values, w.controls ) ) { continue; }
			if ( common.has( c.name ) || ! [ 'content', 'style' ].includes( c.tab ) ) { continue; }
			if ( 'section' === c.type ) { sections[ c.name ] = sections[ c.name ] || { tab: c.tab, label: c.label, n: 0, headings: 0, tabs: 0, popovers: 0 }; continue; }
			const s = sections[ c.section ] = sections[ c.section ] || { tab: c.tab, label: c.section, n: 0, headings: 0, tabs: 0, popovers: 0 };
			s.id = c.section;
			if ( 'tabs' === c.type || c.tabs_wrapper ) { s.tabs++; }
			if ( 'heading' === c.type ) { s.headings++; }
			if ( c.popover && c.popover.start ) { s.popovers++; }
			if ( skip.has( c.type ) || c.popover && ! c.popover.start || /legacy/.test( c.classes || '' ) ) { continue; }
			if ( deviceCopy.test( c.name ) ) { continue; }
			const key = c.groupPrefix || c.name;
			s.seen = s.seen || new Set();
			if ( s.seen.has( key ) ) { continue; }
			s.seen.add( key );
			s.n++;
			( s.list = s.list || [] ).push( `${ c.name } [${ c.type }] ${ c.label || '' }` );
		}
		const list = Object.values( sections );
		list.forEach( ( s ) => delete s.seen );
		out.push( { type, title: w.title, total: list.reduce( ( t, s ) => t + s.n, 0 ), sections: list } );
	}
	return out;
}, !! process.argv.includes( '--all' ) );
if ( arg( 'dump' ) ) {
	const [ type, label ] = arg( 'dump' ).split( ':' );
	const list = await a.evaluate( ( [ t, l ] ) => {
		const w = refraction.widgetsCache[ t ];
		const sec = Object.values( w.controls ).find( ( c ) => 'section' === c.type && ( c.label === l || c.name === l ) );
		return Object.values( w.controls ).filter( ( c ) => c.section === sec.name ).map( ( c ) => `${ c.name } ${ c.type }${ c.popover && c.popover.start ? ' popover' : '' }  ${ c.label || '' }` );
	}, [ type, label ] );
	console.log( list.join( '\n' ) );
}
await browser.close();

const flagged = [];
for ( const w of rows.sort( ( x, y ) => y.total - x.total ) ) {
	for ( const s of w.sections ) {
		if ( s.n >= MIN && ! s.tabs && s.headings < 2 ) { flagged.push( { widget: w.title, type: w.type, tab: s.tab, section: s.label, id: s.id, controls: s.n, headings: s.headings, list: s.list } ); }
	}
}
console.log( `${ rows.length } widgets. Long, unorganised sections (>= ${ MIN } controls, no state tabs, < 2 headings): ${ flagged.length }` );
for ( const f of flagged ) { console.log( `${ String( f.controls ).padStart( 3 ) }  ${ f.widget } (${ f.type }) > ${ f.tab } > ${ f.section } [headings ${ f.headings }]` ); }
console.log( '\nWidgets by total controls (top 40):' );
for ( const w of rows.slice( 0, 40 ) ) { console.log( `${ String( w.total ).padStart( 4 ) }  ${ w.title } (${ w.type }), ${ w.sections.length } sections` ); }
if ( arg( 'flagged' ) ) { writeFileSync( arg( 'flagged' ), flagged.map( ( f ) => `## ${ f.type } / ${ f.id } (${ f.widget } > ${ f.section })\n${ f.list.join( '\n' ) }` ).join( '\n\n' ) ); }
if ( arg( 'json' ) ) { writeFileSync( arg( 'json' ), JSON.stringify( rows, null, 1 ) ); }
