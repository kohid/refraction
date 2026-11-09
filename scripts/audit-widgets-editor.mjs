/**
 * Widget audit, step 1 (with audit-widgets-render.mjs): reads every widget's controls from the editor and keeps the
 * color settings that apply with the default content (visible by their conditions; not hover, active or open states).
 * Writes them as JSON.
 *
 * Usage: node scripts/audit-widgets-editor.mjs PORT SITE_DIR OUT.json   (a test site from scripts/setup-menu-test-site.sh)
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const require = createRequire( import.meta.url );
const { chromium } = require( 'playwright' );
const [ , , PORT, SITE, OUT ] = process.argv;
const BASE = `http://127.0.0.1:${ PORT }`;
const wp = ( a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', '/tmp/rsite-dl/wpcli.phar', `--path=${ SITE }/wordpress`, '--allow-root', ...a ], { encoding: 'utf8' } );
const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Audit editor', '--porcelain' ] ).trim();
wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
const b = await chromium.launch(); const e = await ( await b.newContext( { viewport: { width: 1500, height: 950 } } ) ).newPage();
await e.goto( `${ BASE }/wp-login.php` ); await e.fill( '#user_login', 'admin' ); await e.fill( '#user_pass', 'admin' );
await Promise.all( [ e.waitForURL( /wp-admin/ ), e.click( '#wp-submit' ) ] );
await e.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction` );
await e.waitForFunction( () => window.refraction?.widgetsCache && Object.keys( window.refraction.widgetsCache ).length > 50, null, { timeout: 180000 } );
await e.waitForTimeout( 3000 );
const data = await e.evaluate( () => {
	const out = {};
	const skipState = /:hover|:focus|:active|\.is-active|active|current|selected|aria-|\.is-open|\.e-active|checked|::placeholder|\(mobile\)|\(tablet\)|\.is-|-hover|e-opened|\[open\]|\.open|bullet-active|hover|visited|e-n-accordion-item\[open|\.e-current/i;
	for ( const [ name, w ] of Object.entries( window.refraction.widgetsCache ) ) {
		const controls = w.controls || {};
		if ( ! w.title || [ 'common', 'common-base', 'common-optimized', 'inner-section' ].includes( name ) ) {
			continue;
		}
		const values = {};
		for ( const [ cid, c ] of Object.entries( controls ) ) {
			values[ cid ] = c.default;
		}
		const colors = [];
		const styleTypes = {};
		for ( const [ cid, c ] of Object.entries( controls ) ) {
			if ( 'style' === c.tab && ! /_(tablet|mobile|mobile_extra|tablet_extra|laptop|widescreen)$/.test( cid ) && ! [ 'section', 'tabs', 'tab', 'divider', 'heading' ].includes( c.type ) ) {
				styleTypes[ cid ] = c.type;
			}
			if ( 'color' !== c.type || ! c.selectors || ! Object.keys( c.selectors ).length || /^(_|motion_fx|rf_|refraction_dc|sticky)/.test( cid ) || /_(tablet|mobile|mobile_extra|tablet_extra|laptop|widescreen)$/.test( cid ) ) {
				continue;
			}
			const sel = Object.keys( c.selectors ).join( ' | ' );
			if ( skipState.test( sel + ' ' + cid ) ) {
				continue;
			}
			let active = true;
			try {
				active = window.refraction.helpers.isActiveControl( c, values, controls );
			} catch ( err ) {
				active = true;
			}
			if ( active ) {
				colors.push( { id: cid, label: String( c.label || '' ).replace( /<[^>]+>/g, '' ), sel, section: c.section } );
			}
		}
		out[ name ] = { title: w.title, colors, styleTypes, categories: w.categories };
	}
	return out;
} );
writeFileSync( OUT, JSON.stringify( data ) );
console.log( Object.keys( data ).length, 'widgets,', Object.values( data ).reduce( ( a, w ) => a + w.colors.length, 0 ), 'colour settings' );
await b.close();
