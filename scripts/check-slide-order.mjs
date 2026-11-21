#!/usr/bin/env node
/**
 * Slides of the nested widgets (0.138.0), SQLite test site, Chromium: Timed Slides, Focus Stack, Showcase Wheel,
 * Dynamic Container, Nested Carousel, Mega Menu and Tabs. Every slide's container (its content) must stay with its row
 * in the widget's list (its title, picture, background, settings) when slides are moved, added, duplicated and removed,
 * in the editor (Showcase Wheel's slots too), after saving and on the site. In Structure, a slide shows its list name,
 * a click shows that slide with the widget in view, renaming it renames the row, and Duplicate works.
 *
 * Usage: node scripts/check-slide-order.mjs [--site /tmp/rf-slides-site] [--port 9382]
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire( import.meta.url );
const { chromium } = require( 'playwright' );
const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-slides-site' );
const BASE = `http://127.0.0.1:${ arg( 'port', '9382' ) }`;
let failures = 0;
const check = ( area, name, pass, evidence = '' ) => {
	if ( ! pass ) {
		failures++;
	}
	console.log( `${ pass ? 'ok  ' : 'FAIL' }  ${ area } / ${ name }${ pass || ! evidence ? '' : ` -- ${ String( evidence ).slice( 0, 600 ) }` }` );
};
const wp = ( a ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', '/tmp/rsite-dl/wpcli.phar', `--path=${ SITE }/wordpress`, '--allow-root', ...a ], { encoding: 'utf8' } );
const TYPES = ( 'refraction-timed-slides,refraction-focus-stack,refraction-showcase-wheel,refraction-dynamic-container,refraction-nested-carousel,refraction-mega-menu,nested-tabs' ).split( ',' );
const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Slides', '--porcelain' ] ).trim();
wp( [ 'post', 'meta', 'update', id, '_refraction_edit_mode', 'builder' ] );
wp( [ 'post', 'meta', 'update', id, '_refraction_template_type', 'wp-page' ] );
wp( [ 'post', 'meta', 'update', id, '_refraction_data', JSON.stringify( [ { id: 'tgt0001', elType: 'container', settings: {}, elements: [] } ] ) ] );
const browser = await chromium.launch( { executablePath: '/opt/pw-browsers/chromium', args: [ '--no-sandbox' ] } );
// The page is made below; the server is the caller's (scripts/check-*.mjs convention: --site, --port).
const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
let e = await ctx.newPage();
const errs = [];
await e.goto( `${ BASE }/wp-login.php` );
await e.fill( '#user_login', 'admin' );
await e.fill( '#user_pass', 'admin' );
await Promise.all( [ e.waitForURL( /wp-admin/, { waitUntil: 'commit' } ), e.click( '#wp-submit' ) ] );
const open = async () => {
	await e.close();
	e = await ctx.newPage();
	e.on( 'pageerror', ( x ) => errs.push( x.message ) );
	await e.goto( `${ BASE }/wp-admin/post.php?post=${ id }&action=refraction`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
	await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
	await e.waitForTimeout( 2500 );
};
await open();
// One of each, each slide's container marked with a heading C<n>, each item's title T<n>.
const made = await e.evaluate( ( types ) => {
	const doc = refraction.documents.getCurrent().container;
	const out = {};
	types.forEach( ( t ) => {
		const box = $e.run( 'document/elements/create', { container: doc, model: { elType: 'container' }, options: { edit: false } } );
		const w = $e.run( 'document/elements/create', { container: box, model: { elType: 'widget', widgetType: t }, options: { edit: false } } );
		const name = Object.keys( w.repeaters )[ 0 ];
		const titleKey = Object.keys( w.settings.controls[ name ].fields ).find( ( f ) => /title|label|name/.test( f ) && 'text' === w.settings.controls[ name ].fields[ f ].type ) || '_none';
		w.children.forEach( ( c, i ) => {
			$e.run( 'document/elements/create', { container: c, model: { elType: 'widget', widgetType: 'heading', settings: { title: 'C' + ( i + 1 ) } }, options: { edit: false, at: 0 } } );
			$e.run( 'document/elements/settings', { container: w.repeaters[ name ].children[ i ], settings: { [ titleKey ]: 'T' + ( i + 1 ) } } );
		} );
		out[ t ] = { id: w.id, name, titleKey };
	} );
	return out;
}, TYPES );

// In the model and in the preview: is every container (heading C<n>) with its own item (T<n>)?
const state = ( where ) => e.evaluate( ( [ m, w ] ) => {
	const doc = document.querySelector( 'iframe#refraction-preview-iframe' ).contentDocument;
	const out = {};
	Object.entries( m ).forEach( ( [ t, info ] ) => {
		const c = refraction.getContainer( info.id );
		const items = c.repeaters[ info.name ].children;
		const modelPairs = items.map( ( item, i ) => {
			const child = c.children[ i ];
			const h = child && child.children.find( ( x ) => 'heading' === x.model.get( 'widgetType' ) );
			return ( item.settings.get( info.titleKey ) || '?' ) + '=' + ( h ? h.settings.get( 'title' ) : '-' );
		} );
		// Preview: each child container's DOM: the repeater item whose class wraps it.
		const root = doc.querySelector( `[data-id="${ info.id }"]` );
		const domPairs = c.children.map( ( child, i ) => {
			const el = root && root.querySelector( `[data-id="${ child.id }"]` );
			if ( ! el ) {
				return 'missing';
			}
			let p = el.parentElement;
			let item = null;
			while ( p && p !== root ) {
				const cls = [ ...p.classList ].find( ( x ) => x.startsWith( 'refraction-repeater-item-' ) );
				if ( cls ) {
					item = cls.replace( 'refraction-repeater-item-', '' );
					break;
				}
				p = p.parentElement;
			}
			const owner = items.find( ( it ) => it.id === item );
			const h = el.querySelector( '.refraction-heading-title' );
			return ( owner ? owner.settings.get( info.titleKey ) : ( item ? 'other:' + item : 'no-item' ) ) + '=' + ( h ? h.textContent.trim() : '-' );
		} );
		// DOM order of the containers vs the model order.
		const domOrder = root ? [ ...root.querySelectorAll( ':scope [data-element_type="container"]' ) ].filter( ( x ) => c.children.some( ( ch ) => ch.id === x.dataset.id ) ).map( ( x ) => c.children.findIndex( ( ch ) => ch.id === x.dataset.id ) ).join( '' ) : '';
		out[ t ] = { model: modelPairs.join( ' | ' ), dom: domPairs.join( ' | ' ), domOrder };
	} );
	return out;
}, [ made, where ] );
const ok = ( s ) => s.split( ' | ' ).every( ( p ) => /^T(\d+)[^=]*=C\1$/.test( p ) || /^Renamed[^=]*=C3$/.test( p ) || /=-$/.test( p ) );
const report = ( label, s ) => {
	Object.entries( s ).forEach( ( [ t, r ] ) => {
		const n = r.model.split( ' | ' ).length;
		const slotsOk = 'refraction-showcase-wheel' !== t || ok( r.dom );
		check( label, `${ t }: every container with its own row (model, preview order${ 'refraction-showcase-wheel' === t ? ', slots' : '' })`, ok( r.model ) && slotsOk && r.domOrder === [ ...Array( n ).keys() ].join( '' ), JSON.stringify( r ) );
	} );
};
report( 'start', await state() );

// Move the first item to the end (the panel's drag runs document/repeater/move).
await e.evaluate( ( m ) => Object.values( m ).forEach( ( info ) => {
	const c = refraction.getContainer( info.id );
	$e.run( 'document/repeater/move', { container: c, name: info.name, sourceIndex: 0, targetIndex: c.repeaters[ info.name ].children.length - 1 } );
} ), made );
await e.waitForTimeout( 1500 );
report( 'move', await state() );

// Add an item (the panel's Add Item), marked T9 / C9.
await e.evaluate( ( m ) => Object.values( m ).forEach( ( info ) => {
	const c = refraction.getContainer( info.id );
	$e.run( 'document/repeater/insert', { container: c, name: info.name, model: { [ info.titleKey ]: 'T9' } } );
	const last = c.children[ c.children.length - 1 ];
	$e.run( 'document/elements/create', { container: last, model: { elType: 'widget', widgetType: 'heading', settings: { title: 'C9' } }, options: { edit: false, at: 0 } } );
} ), made );
await e.waitForTimeout( 1500 );
report( 'add', await state() );

// Move the new one to the front.
await e.evaluate( ( m ) => Object.values( m ).forEach( ( info ) => {
	const c = refraction.getContainer( info.id );
	$e.run( 'document/repeater/move', { container: c, name: info.name, sourceIndex: c.repeaters[ info.name ].children.length - 1, targetIndex: 0 } );
} ), made );
await e.waitForTimeout( 1500 );
report( 'move new', await state() );


// ---------------------------------------------------------------- Structure
await e.evaluate( () => $e.run( 'navigator/open' ) );
await e.waitForTimeout( 800 );
const frameEl = () => e.frame( { name: 'refraction-preview-iframe' } );
for ( const [ t, info ] of Object.entries( made ) ) {
	const child = await e.evaluate( ( wid ) => {
		const c = refraction.getContainer( wid );
		// Open every level down to the widget in Structure.
		let p = c;
		while ( p ) {
			p.model.trigger( 'request:toggleList', true );
			p = p.parent;
		}
		return { id: c.children[ 2 ].id, title: c.repeaters[ Object.keys( c.repeaters )[ 0 ] ].children[ 2 ].settings.get( refraction.widgetsCache[ c.model.get( 'widgetType' ) ].defaults.repeater_title_setting ) };
	}, info.id );
	await e.evaluate( ( wid ) => {
		const c = refraction.getContainer( wid );
		const nav = refraction.navigator.getLayout().elements.currentView;
		const open = ( view ) => view && view.children && view.children.each( ( v ) => {
			if ( [ wid, ...c.getParentAncestry().map( ( x ) => x.id ) ].includes( v.model.id ) && v.toggleList ) {
				v.toggleList( true );
			}
			open( v );
		} );
		open( nav );
	}, info.id );
	await e.waitForTimeout( 400 );
	const item = e.locator( `#refraction-navigator [data-id="${ child.id }"] > .refraction-navigator__item` );
	const shown = await item.count() ? ( await item.locator( '.refraction-navigator__element__title__text' ).first().textContent() ).trim() : 'NOT IN STRUCTURE';
	// Scroll the preview away, then click the third slide in Structure.
	await frameEl().evaluate( () => window.scrollTo( 0, 0 ) );
	if ( await item.count() ) {
		await item.click();
	}
	await e.waitForTimeout( 1600 );
	const after = await e.evaluate( ( [ wid, cid ] ) => {
		const c = refraction.getContainer( wid );
		const doc = document.querySelector( 'iframe#refraction-preview-iframe' ).contentDocument;
		const root = doc.querySelector( `[data-id="${ wid }"]` );
		const r = root.getBoundingClientRect();
		const vh = doc.defaultView.innerHeight;
		const visible = [ ...root.querySelectorAll( '.refraction-heading-title' ) ].filter( ( h ) => /^C\d$/.test( h.textContent.trim() ) && h.checkVisibility( { opacityProperty: true, visibilityProperty: true } ) && ( () => {
			const b = h.getBoundingClientRect();
			return b.width > 0 && b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom;
		} )() ).map( ( h ) => h.textContent.trim() );
		const headC = refraction.getContainer( cid ).children.find( ( x ) => 'heading' === x.model.get( 'widgetType' ) );
		return { active: c.model.get( 'editSettings' ).get( 'activeItemIndex' ), widgetInView: r.top < vh && r.bottom > 0, top: Math.round( r.top ), visible: visible.join( ',' ), expect: headC ? headC.settings.get( 'title' ) : '?' };
	}, [ info.id, child.id ] );
	// Rename in Structure.
	let renamed = 'n/a';
	if ( await item.count() ) {
		await item.locator( '.refraction-navigator__element__title__text' ).first().dblclick();
		await e.keyboard.type( 'Renamed ' + t.slice( 11, 16 ) );
		await e.keyboard.press( 'Enter' );
		await e.waitForTimeout( 400 );
		renamed = await e.evaluate( ( wid ) => {
			const c = refraction.getContainer( wid );
			return c.repeaters[ Object.keys( c.repeaters )[ 0 ] ].children[ 2 ].settings.get( refraction.widgetsCache[ c.model.get( 'widgetType' ) ].defaults.repeater_title_setting );
		}, info.id );
	}
	// Duplicate from Structure's menu.
	let dup = 'n/a';
	if ( await item.count() ) {
		const before = await e.evaluate( ( wid ) => refraction.getContainer( wid ).children.length, info.id );
		await item.click( { button: 'right' } );
		await e.waitForTimeout( 300 );
		const enabled = await e.evaluate( () => {
			const m = [ ...document.querySelectorAll( '.refraction-context-menu' ) ].find( ( x ) => x.offsetParent );
			const d = m && m.querySelector( '.refraction-context-menu-list__item-duplicate' );
			return d ? ! d.classList.contains( 'refraction-context-menu-list__item--disabled' ) : null;
		} );
		if ( enabled ) {
			await e.click( '.refraction-context-menu:visible .refraction-context-menu-list__item-duplicate' );
			await e.waitForTimeout( 800 );
		} else {
			await e.keyboard.press( 'Escape' );
		}
		const aft = await e.evaluate( ( wid ) => {
			const c = refraction.getContainer( wid );
			const rep = c.repeaters[ Object.keys( c.repeaters )[ 0 ] ].children;
			return [ c.children.length, rep.length ];
		}, info.id );
		dup = enabled ? `${ before } -> ${ aft.join( '/' ) }` : 'disabled';
	}
	const okAll = shown === child.title && after.active === 3 && after.widgetInView && ( 'refraction-mega-menu' === t || after.visible.split( ',' ).includes( after.expect ) ) && /^Renamed/.test( renamed ) && /-> (\d+)\/\1$/.test( dup );
	check( 'structure', `${ t }: the list name, a click shows that slide in view, rename renames the row, Duplicate`, okAll, `title[${ shown } vs ${ child.title }] active[${ after.active }] inView[${ after.widgetInView } ${ after.top }] visible[${ after.visible } want ${ after.expect }] renamed[${ renamed }] dup[${ dup }]` );
}
report( 'after str', await state() );
await e.evaluate( ( m ) => Object.values( m ).forEach( ( info ) => {
	const c = refraction.getContainer( info.id );
	$e.run( 'document/repeater/remove', { container: c, name: info.name, index: 1 } );
	$e.run( 'document/repeater/move', { container: c, name: info.name, sourceIndex: c.repeaters[ info.name ].children.length - 1, targetIndex: 0 } );
} ), made );
await e.waitForTimeout( 1500 );
report( 'rm+move', await state() );

// Save, open again, and the site.
await e.evaluate( async () => {
	await $e.run( 'document/save/publish' );
} );
await e.waitForTimeout( 1500 );
await open();
report( 'reopened', await state() );
const site = await ctx.newPage();
await site.goto( `${ BASE }/?page_id=${ id }` );
await site.waitForTimeout( 1500 );
const siteState = await site.evaluate( ( m ) => {
	const out = {};
	Object.entries( m ).forEach( ( [ t, info ] ) => {
		const root = document.querySelector( `[data-id="${ info.id }"]` );
		const pairs = root ? [ ...root.querySelectorAll( '.refraction-heading-title' ) ].map( ( h ) => {
			let p = h.parentElement;
			while ( p && p !== root ) {
				const cls = [ ...p.classList ].find( ( x ) => x.startsWith( 'refraction-repeater-item-' ) );
				if ( cls ) {
					return cls.replace( 'refraction-repeater-item-', '' ) + '=' + h.textContent.trim();
				}
				p = p.parentElement;
			}
			return 'no-item=' + h.textContent.trim();
		} ) : [];
		out[ t ] = pairs.join( ' | ' );
	} );
	return out;
}, made );
const ids = await e.evaluate( ( m ) => Object.fromEntries( Object.entries( m ).map( ( [ t, info ] ) => {
	const c = refraction.getContainer( info.id );
	return [ t, Object.fromEntries( c.repeaters[ info.name ].children.map( ( it ) => [ it.id, it.settings.get( info.titleKey ) ] ) ) ];
} ) ), made );
Object.entries( siteState ).forEach( ( [ t, s ] ) => {
	const named = s.split( ' | ' ).map( ( p ) => {
		const [ item, h ] = p.split( '=' );
		return ( ids[ t ][ item ] || item ) + '=' + h;
	} ).join( ' | ' );
	const mine = named.split( ' | ' ).filter( ( p ) => /=C\d$/.test( p ) ).join( ' | ' );
	check( 'site', `${ t }: on the site each marked content is in its own slide`, 'refraction-showcase-wheel' !== t || ok( mine ), mine );
} );
check( 'editor', 'no JavaScript errors', ! errs.length, errs.slice( 0, 3 ).join( ' | ' ) );
await browser.close();
console.log( failures ? `\n${ failures } failed` : '\nall passed' );
process.exit( failures ? 1 : 0 );
