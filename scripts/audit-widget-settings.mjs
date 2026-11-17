#!/usr/bin/env node
/**
 * Audit (0.118.0): in the editor, drops each widget on a page and sets every style setting that has CSS (or a class)
 * to a test value, then checks the widget's CSS (or classes) in the preview changed; lists the settings that change
 * nothing. Settings shown only on a condition are tried when their condition holds with the defaults. About 20 minutes
 * for every Refraction widget.
 *
 * Usage: node scripts/audit-widget-settings.mjs --site /tmp/rf-site --port 8963 [--widgets refraction-focus-stack,...]
 * (default: every refraction-* and rfb-* widget except the event fields).
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );
const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const PORT = arg( 'port', '8963' );
const ONLY = arg( 'widgets', '' );
const WPCLI = arg( 'wpcli', '/tmp/rsite-dl/wpcli.phar' );
const B = `http://127.0.0.1:${ PORT }`;
const SITE = arg( 'site', '/tmp/rf-site' ) + '/wordpress';
const wp = ( a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', WPCLI, `--path=${ SITE }`, '--allow-root', ...a ], { encoding: 'utf8' } );
const pid = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Work', '--porcelain' ] ).trim();
wp( [ 'post', 'meta', 'update', pid, '_refraction_edit_mode', 'builder' ] );
wp( [ 'post', 'meta', 'update', pid, '_refraction_data', JSON.stringify( [ { id: 'wrk0001', elType: 'container', settings: {}, elements: [] } ] ) ] );
const br = await chromium.launch();
const p = await br.newPage( { viewport: { width: 1400, height: 900 } } );
const errors = [];
p.on( 'pageerror', ( e ) => errors.push( e.message.slice( 0, 160 ) ) );
await p.goto( B + '/wp-login.php' );
await p.fill( '#user_login', 'admin' );
await p.fill( '#user_pass', 'admin' );
await Promise.all( [ p.waitForNavigation(), p.click( '#wp-submit' ) ] );
await p.goto( `${ B }/wp-admin/post.php?post=${ pid }&action=refraction`, { timeout: 120000 } );
await p.waitForFunction( () => window.refraction && window.$e && refraction.documents?.getCurrent() && document.querySelector( '.refraction-panel-category' ), null, { timeout: 120000 } );
await p.waitForTimeout( 3000 );
const names = ONLY ? ONLY.split( ',' ) : await p.evaluate( () => Object.keys( refraction.widgetsCache ).filter( ( n ) => /^(refraction-|rfb-)/.test( n ) && ! /^rfb-field-event/.test( n ) ) );
let deadCount = 0;
for ( const name of names ) {
	const res = await p.evaluate( async ( type ) => {
		const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );
		const box = refraction.getPreviewContainer().children[ 0 ];
		box.children.slice().forEach( ( c ) => $e.run( 'document/elements/delete', { container: c } ) );
		const el = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: type } } );
		await wait( 1500 );
		const doc = refraction.$preview[ 0 ].contentDocument;
		const cssOf = () => [ ...doc.querySelectorAll( 'style' ) ].map( ( s ) => s.textContent ).filter( ( t ) => t.includes( `.refraction-element-${ el.id }` ) || t.includes( `rfb-from-${ el.id }` ) ).join( '\n' );
		const classesOf = () => ( doc.querySelector( `.refraction-element-${ el.id }` ) || {} ).className || '';
		const w = refraction.widgetsCache[ type ];
		const dead = [];
		let tried = 0;
		for ( const c of Object.values( w.controls ) ) {
			if ( c.parent || /^_|^rf_|^e_|^motion_fx|^sticky|^hide_/.test( c.name ) || /_(tablet|mobile|laptop|widescreen|mobile_extra|tablet_extra)$/.test( c.name ) ) {
				continue;
			}
			if ( ! c.selectors && ! c.prefix_class ) {
				continue;
			}
			const cur = el.settings.get( c.name );
			let value;
			if ( 'color' === c.type ) {
				value = '#13579b';
			} else if ( 'slider' === c.type ) {
				const unit = ( c.size_units && c.size_units[ 0 ] ) || ( cur && cur.unit ) || 'px';
				const r = ( c.range && c.range[ unit ] ) || { min: 0, max: 100 };
				const size = ( Math.round( ( ( ( r.min ?? 0 ) + ( r.max ?? 100 ) ) / 2 ) * 10 ) / 10 ) + 0.3;
				value = { unit, size: Math.round( size * 10 ) / 10, sizes: [] };
			} else if ( 'dimensions' === c.type ) {
				value = { unit: ( c.size_units && c.size_units[ 0 ] ) || 'px', top: '7', right: '7', bottom: '7', left: '7', isLinked: true };
			} else if ( 'number' === c.type ) {
				value = ( Number( cur ) || 0 ) + 3;
			} else if ( [ 'select', 'choose' ].includes( c.type ) && c.options ) {
				const keys = Object.keys( c.options ).filter( ( k ) => k !== String( cur ?? '' ) && '' !== k );
				if ( ! keys.length ) {
					continue;
				}
				value = keys[ keys.length - 1 ];
			} else if ( 'switcher' === c.type ) {
				value = 'yes' === cur ? '' : ( c.return_value || 'yes' );
			} else {
				continue;
			}
			let active = true;
			try {
				const values = {};
				Object.values( w.controls ).forEach( ( x ) => ( values[ x.name ] = el.settings.get( x.name ) ) );
				active = refraction.helpers.isActiveControl( c, values, w.controls );
			} catch ( e ) {}
			if ( ! active ) {
				continue;
			}
			tried++;
			const beforeCss = cssOf();
			const beforeCls = classesOf();
			$e.run( 'document/elements/settings', { container: el, settings: { [ c.name ]: value }, options: { external: true } } );
			await wait( 350 );
			const changed = cssOf() !== beforeCss || classesOf() !== beforeCls;
			$e.run( 'document/elements/settings', { container: el, settings: { [ c.name ]: cur }, options: { external: true } } );
			await wait( 120 );
			if ( ! changed ) {
				dead.push( `${ c.name } "${ c.label || '' }" (${ c.type }${ c.prefix_class ? ', class' : '' })` );
			}
		}
		return { tried, dead };
	}, name );
	console.log( name, 'tried', res.tried, 'did nothing:', res.dead.length );
	deadCount += res.dead.length;
	res.dead.forEach( ( d ) => console.log( '   ', d ) );
}
console.log( 'errors:', errors.slice( 0, 5 ) );
await br.close();
console.log( deadCount || errors.length ? `\n${ deadCount } setting(s) change nothing` : '\nevery style setting changes the widget' );
process.exit( deadCount || errors.length ? 1 : 0 );
