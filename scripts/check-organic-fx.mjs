#!/usr/bin/env node
/**
 * Organic FX and My Shapes (modules/organic-fx; SQLite test site, Chromium): uploading, renaming and deleting shapes on
 * Refraction > My Shapes (a script in an upload is dropped), Shape Mask on a container and an image (built-in and
 * uploaded shapes), Deco Blob with an offset outline, Grain, Floating Shapes (desktop and phone counts) and Floating
 * Text (words from the list, never overlapping), reduced motion, and the same layers in the editor's preview.
 *
 * Usage: node scripts/check-organic-fx.mjs [--site /tmp/rf-ofx-site] [--port 9381] [--shots /tmp/organic-shots]
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( fileURLToPath( import.meta.url ) );
const { chromium } = require( 'playwright' );

const arg = ( n, d ) => ( process.argv.includes( `--${ n }` ) ? process.argv[ process.argv.indexOf( `--${ n }` ) + 1 ] : d );
const SITE = arg( 'site', '/tmp/rf-ofx-site' );
const PORT = arg( 'port', '9381' );
const SHOTS = arg( 'shots', '/tmp/organic-shots' );
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

function page( title, data ) {
	const id = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, '--porcelain' ] ).trim();
	for ( const [ k, v ] of [ [ '_refraction_edit_mode', 'builder' ], [ '_refraction_template_type', 'wp-page' ], [ '_refraction_data', JSON.stringify( data ) ], [ '_wp_page_template', 'refraction_header_footer' ] ] ) {
		wp( [ 'post', 'meta', 'update', id, k, v ] );
	}
	return { id: Number( id ), url: `${ BASE }/?page_id=${ id }` };
}

const HEART = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>window.pwned=1</script><path onload="window.pwned=2" fill="red" d="M12 21C5 16 2 12.5 2 8.5C2 5.5 4.5 3 7.5 3C9.5 3 11 4 12 5.5C13 4 14.5 3 16.5 3C19.5 3 22 5.5 22 8.5C22 12.5 19 16 12 21Z"/></svg>';
const RING = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

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
	const con = ( id, settings, elements ) => ( { id, elType: 'container', isInner: false, settings: { min_height: { unit: 'px', size: 460 }, background_background: 'classic', ...settings }, elements } );

	try {
		wp( [ 'option', 'delete', 'refraction_my_shapes' ] );

		// ---- My Shapes and grain textures in the editor (no admin page)
		wp( [ 'option', 'delete', 'refraction_grain_textures' ] );
		rmSync( join( WPDIR, 'wp-content/uploads/refraction-grain' ), { recursive: true, force: true } );
		const ctx = await browser.newContext( { viewport: { width: 1500, height: 950 } } );
		const a = await ctx.newPage();
		watch( a );
		await a.goto( `${ BASE }/wp-login.php` );
		await a.fill( '#user_login', 'admin' );
		await a.fill( '#user_pass', 'admin' );
		await Promise.all( [ a.waitForURL( /wp-admin/, { timeout: 120000 } ), a.click( '#wp-submit' ) ] );
		const menu = await a.locator( '#adminmenu a[href*="refraction-my-shapes"]' ).count();
		const oldPage = await ( await fetch( `${ BASE }/wp-admin/admin.php?page=refraction-my-shapes`, { redirect: 'manual' } ) ).status;
		check( 'library', 'no My Shapes page in the WordPress menu any more', 0 === menu, JSON.stringify( [ menu, oldPage ] ) );

		const p0 = page( 'Library', [ con( 'lib0001', { background_color: '#3858E9' }, [ w( 'lib0002', 'heading', { title: 'Library' } ) ] ) ] );
		await a.goto( `${ BASE }/wp-admin/post.php?post=${ p0.id }&action=refraction` );
		await a.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 2500 );
		const openSection = ( id, sec, settings ) => a.evaluate( async ( [ cid, section, set ] ) => {
			const c = window.refraction.getContainer( cid );
			window.$e.run( 'document/elements/select', { container: c } );
			if ( set ) {
				window.$e.run( 'document/elements/settings', { container: c, settings: set } );
			}
			await new Promise( ( r ) => setTimeout( r, 1200 ) );
			const v = window.refraction.getPanelView().getCurrentPageView();
			v.activateTab( 'style' );
			v.activateSection( section );
			v._renderChildren();
		}, [ id, sec, settings ] );
		await openSection( 'lib0001', 'section_rf_mask', { rf_mask_source: 'mine' } );
		await sleep( 600 );
		await a.click( '.refraction-control-rf_mask_mine_upload button' );
		await a.waitForSelector( '.rf-lib__box' );
		await a.setInputFiles( '.rf-lib__drop input[type=file]', { name: 'heart.svg', mimeType: 'image/svg+xml', buffer: Buffer.from( HEART ) } );
		await a.fill( '#rf-lib-name', 'Heart' );
		await a.click( '.rf-lib__go' );
		await a.waitForSelector( '.rf-lib__item[data-id="my-heart"]' );
		await sleep( 1500 );
		const added = await a.evaluate( () => ( {
			item: document.querySelector( '.rf-lib__item[data-id="my-heart"] img' )?.getAttribute( 'src' ),
			setting: [ window.refraction.getContainer( 'lib0001' ).settings.get( 'rf_mask_source' ), window.refraction.getContainer( 'lib0001' ).settings.get( 'rf_mask_mine' ) ],
			pwned: window.pwned,
		} ) );
		const livePreview = await a.frame( { name: 'refraction-preview-iframe' } ).evaluate( () => {
			const el = document.querySelector( '[data-id="lib0001"]' );
			return { cls: el.classList.contains( 'rf-mask--my-heart' ), mask: /data:image/.test( getComputedStyle( el ).maskImage || getComputedStyle( el ).webkitMaskImage ), pwned: window.pwned };
		} );
		check( 'library', 'Uploaded tab > Upload or manage: an SVG file is added as my-heart, shown, picked for the container and masking it at once (no reload); its script never runs', /data:image\/svg/.test( added.item ) && 'mine,my-heart' === added.setting.join() && livePreview.cls && livePreview.mask && undefined === added.pwned && undefined === livePreview.pwned, JSON.stringify( [ added, livePreview ] ) );
		const stored = JSON.parse( wp( [ 'option', 'get', 'refraction_my_shapes', '--format=json' ] ) );
		check( 'library', 'only path data, viewBox and fill rule are stored', '0 0 24 24' === stored[ 'my-heart' ].vb && /^M12 21C/.test( stored[ 'my-heart' ].d ) && ! /script|onload/.test( JSON.stringify( stored ) ), JSON.stringify( stored ).slice( 0, 200 ) );

		await a.fill( '#rf-lib-name', 'Ring' );
		await a.fill( '#rf-lib-code', RING );
		await a.click( '.rf-lib__go' );
		await a.waitForSelector( '.rf-lib__item[data-id="my-ring"]' );
		await a.fill( '#rf-lib-code', '<svg><text>nothing</text></svg>' );
		await a.click( '.rf-lib__go' );
		await a.waitForSelector( '.rf-lib__msg.is-error' );
		const bad = await a.evaluate( () => ( { msg: document.querySelector( '.rf-lib__msg' ).textContent, count: document.querySelectorAll( '.rf-lib__item' ).length } ) );
		check( 'library', 'pasted code adds a shape (a circle); an SVG with no shape is refused with a message', /No shape found/.test( bad.msg ) && 2 === bad.count, JSON.stringify( bad ) );

		await a.fill( '.rf-lib__item[data-id="my-ring"] input[type=text]', 'Halo' );
		await a.press( '.rf-lib__item[data-id="my-ring"] input[type=text]', 'Tab' );
		await sleep( 1200 );
		const renamed = JSON.parse( wp( [ 'option', 'get', 'refraction_my_shapes', '--format=json' ] ) )[ 'my-ring' ]?.name;
		a.once( 'dialog', ( dlg ) => dlg.accept() );
		await a.click( '.rf-lib__item[data-id="my-ring"] .rf-lib__del' );
		await a.waitForFunction( () => ! document.querySelector( '.rf-lib__item[data-id="my-ring"]' ) );
		const mineTiles = await a.evaluate( () => [ ...document.querySelectorAll( '.refraction-control-rf_mask_mine .refraction-visual-choice-element input' ) ].map( ( i ) => i.value ).join() );
		check( 'library', 'a shape can be renamed and deleted, and the panel tiles follow', 'Halo' === renamed && 'my-heart' === mineTiles, JSON.stringify( [ renamed, mineTiles ] ) );
		// Several files dropped at once onto the dialog: all added in turn, the bad one reported by name.
		await a.evaluate( () => {
			const dt = new DataTransfer();
			const svg = ( d ) => `<svg viewBox="0 0 10 10"><path d="${ d }"/></svg>`;
			dt.items.add( new File( [ svg( 'M0 0H10V10Z' ) ], 'blob-a.svg', { type: 'image/svg+xml' } ) );
			dt.items.add( new File( [ '<svg><text>x</text></svg>' ], 'empty.svg', { type: 'image/svg+xml' } ) );
			dt.items.add( new File( [ svg( 'M0 10L5 0L10 10Z' ) ], 'blob-b.svg', { type: 'image/svg+xml' } ) );
			const box = document.querySelector( '.rf-lib__box' );
			[ 'dragenter', 'dragover', 'drop' ].forEach( ( type ) => box.dispatchEvent( new DragEvent( type, { bubbles: true, cancelable: true, dataTransfer: dt } ) ) );
		} );
		await a.waitForSelector( '.rf-lib__item[data-id="my-blob-b"]', { timeout: 30000 } );
		await sleep( 500 );
		const many = await a.evaluate( () => ( {
			items: [ ...document.querySelectorAll( '.rf-lib__item' ) ].map( ( i ) => i.dataset.id ).join(),
			fresh: [ ...document.querySelectorAll( '.rf-lib__item.is-new' ) ].map( ( i ) => i.dataset.id ).join(),
			msg: document.querySelector( '.rf-lib__msg' ).textContent,
			picked: window.refraction.getContainer( 'lib0001' ).settings.get( 'rf_mask_mine' ),
		} ) );
		check( 'library', 'drag and drop several SVGs onto the dialog: each is added under its file name, the first is picked, and a file with no shape is named in the message', 'my-heart,my-blob-a,my-blob-b' === many.items && 'my-blob-a,my-blob-b' === many.fresh && /2 added\. Not added: empty\.svg: No shape found/.test( many.msg ) && 'my-blob-a' === many.picked, JSON.stringify( many ) );
		await a.screenshot( { path: join( SHOTS, 'library-shapes.png' ) } );

		// Textures tab: a picture becomes ink.
		await a.click( '.rf-lib__tabs button:nth-child(2)' );
		const png = await a.evaluate( () => {
			const c = document.createElement( 'canvas' );
			c.width = 256;
			c.height = 256;
			const x = c.getContext( '2d' );
			x.fillStyle = '#fff';
			x.fillRect( 0, 0, 256, 256 );
			x.fillStyle = '#000';
			for ( let i = 0; i < 400; i++ ) {
				x.beginPath();
				x.arc( ( i * 73 ) % 256, ( i * 151 ) % 256, 1 + ( i % 4 ), 0, 7 );
				x.fill();
			}
			return c.toDataURL( 'image/png' ).split( ',' )[ 1 ];
		} );
		await a.setInputFiles( '.rf-lib__drop input[type=file]', { name: 'rough-ink.png', mimeType: 'image/png', buffer: Buffer.from( png, 'base64' ) } );
		await a.click( '.rf-lib__go' );
		await a.waitForSelector( '.rf-lib__item[data-id="tex-rough-ink"]' );
		const tex = JSON.parse( wp( [ 'option', 'get', 'refraction_grain_textures', '--format=json' ] ) );
		const file = join( WPDIR, 'wp-content/uploads/refraction-grain/rough-ink.png' );
		const opt = await a.evaluate( () => window.refraction.getContainer( 'lib0001' ).controls?.rf_grain_texture?.options?.[ 'tex-rough-ink' ] );
		check( 'library', 'Textures tab: a picture is turned into ink, saved as a PNG in uploads and offered as "Uploaded: rough-ink"', 'rough-ink.png' === tex[ 'rough-ink' ]?.file && existsSync( file ) && /Uploaded: rough-ink/.test( opt || '' ), JSON.stringify( [ tex, opt ] ) );
		await a.screenshot( { path: join( SHOTS, 'library-textures.png' ) } );
		await a.keyboard.press( 'Escape' );

		// ---- the page
		const img = { url: `${ BASE }/wp-admin/images/wordpress-logo.png`, id: '' };
		const p1 = page( 'Organic', [
			con( 'ofx0001', { background_color: '#FFF4E0', rf_mask: 'wave-bottom', rf_grain: 'yes', rf_grain_amount: { size: 0.4 }, rf_fs: 'yes', rf_fs_count: 14, rf_fs_count_mobile: 6, rf_ft: 'yes', rf_ft_words: 'Calm\nCraft\nDetail\nFlow\nTogether\nWarm', rf_ft_count: 4, rf_ft_hold: { size: 1 }, rf_ft_effect: 'fade' }, [ w( 'ofx0002', 'heading', { title: 'Organic shapes, gently moving', header_size: 'h1', align: 'center' } ) ] ),
			con( 'ofx0003', { background_color: '#FFFFFF', flex_direction: 'row' }, [ w( 'ofx0004', 'image', { image: img, rf_mask: 'blob-2', rf_blob: 'yes', rf_blob_style: 'both', rf_blob_color: '#2EC4B6' } ) ] ),
			con( 'ofx0005', { background_color: '#E20A17', flex_justify_content: 'center', rf_mask: 'my-heart', rf_blob: 'yes', rf_blob_shape: 'my-heart', rf_blob_style: 'outline' }, [ w( 'ofx0006', 'heading', { title: 'My own shape', align: 'center', title_color: '#FFFFFF' } ) ] ),
		] );

		const d = await ( await browser.newContext( { viewport: { width: 1280, height: 900 } } ) ).newPage();
		watch( d );
		await d.goto( p1.url );
		await sleep( 4000 );
		const front = await d.evaluate( () => {
			const q = ( s ) => document.querySelector( s );
			const mask = ( el ) => el && ( getComputedStyle( el ).maskImage || getComputedStyle( el ).webkitMaskImage );
			const hero = q( '[data-id="ofx0001"]' );
			const words = [ ...hero.querySelectorAll( '.rf-ofx-word' ) ].filter( ( n ) => parseFloat( getComputedStyle( n ).opacity ) > 0.05 );
			const rects = words.map( ( n ) => n.getBoundingClientRect() );
			const hit = ( r, o ) => r.left < o.right && o.left < r.right && r.top < o.bottom && o.top < r.bottom;
			const overlap = rects.some( ( r, i ) => rects.some( ( o, j ) => j > i && hit( r, o ) ) );
			const onTitle = rects.some( ( r ) => hit( r, hero.querySelector( '.refraction-widget' ).getBoundingClientRect() ) );
			const blob = q( '[data-id="ofx0004"] .rf-ofx-blob' );
			const mine = q( '[data-id="ofx0005"]' );
			return {
				heroMask: /data:image\/svg/.test( mask( hero ) ),
				grain: /data:image\/svg/.test( getComputedStyle( hero.querySelector( ':scope > .rf-ofx-grain' ) || hero ).backgroundImage ),
				grainOpacity: getComputedStyle( hero.querySelector( ':scope > .rf-ofx-grain' ) || hero ).opacity,
				shapes: hero.querySelectorAll( '.rf-ofx-fs' ).length,
				moving: getComputedStyle( hero.querySelector( '.rf-ofx-fs' ) ).animationName,
				words: words.map( ( n ) => n.textContent ), overlap, onTitle,
				behind: getComputedStyle( hero.querySelector( '.rf-ofx-shapes' ) ).zIndex,
				imgMask: /data:image\/svg/.test( mask( q( '[data-id="ofx0004"] img' ) ) ),
				blob: blob && { fits: ( () => {
					const i = q( '[data-id="ofx0004"] img' ).getBoundingClientRect();
					const r = blob.getBoundingClientRect();
					return Math.abs( ( r.left + ( r.width / 2 ) ) - ( i.left + ( i.width / 2 ) + ( i.width * 0.08 ) ) ) < 4 && Math.abs( r.width - i.width ) < 4 && Math.abs( r.height - i.height ) < 4;
				} )(), fill: !! blob.querySelector( '.rf-ofx-blob__fill' ), line: !! blob.querySelector( 'svg.rf-ofx-blob__line--offset path' ), color: getComputedStyle( blob.querySelector( '.rf-ofx-blob__fill' ) ).backgroundColor },
				myMask: /data:image\/svg/.test( mask( mine ) ),
				myOutline: mine.querySelector( '.rf-ofx-blob svg' )?.getAttribute( 'viewBox' ),
				clickable: document.elementFromPoint( hero.getBoundingClientRect().left + ( hero.offsetWidth / 2 ), hero.querySelector( 'h1' ).getBoundingClientRect().top + 10 )?.closest( 'h1' ) !== null,
			};
		} );
		check( 'mask', 'a container cut by a wave edge and an image cut to a blob', front.heroMask && front.imgMask, JSON.stringify( front ) );
		check( 'mask', 'an uploaded shape (my-heart) masks a container and draws a Deco Blob outline in its own viewBox', front.myMask && '0 0 24 24' === front.myOutline, JSON.stringify( front ) );
		check( 'blob', 'Deco Blob behind the image: the picture\'s size, a teal fill with an offset outline', front.blob && front.blob.fits && front.blob.fill && front.blob.line && 'rgb(46, 196, 182)' === front.blob.color, JSON.stringify( front.blob ) );
		check( 'grain', 'film grain over the container at the chosen amount', front.grain && '0.4' === front.grainOpacity, JSON.stringify( [ front.grain, front.grainOpacity ] ) );
		check( 'floating shapes', '14 shapes drifting behind the content (the heading stays clickable)', 14 === front.shapes && 'rf-ofx-fs-drift' === front.moving && '-1' === front.behind && front.clickable, JSON.stringify( front ) );
		check( 'floating text', 'up to 4 words from the list showing, never overlapping each other or the heading', front.words.length >= 1 && front.words.length <= 4 && front.words.every( ( x ) => [ 'Calm', 'Craft', 'Detail', 'Flow', 'Together', 'Warm' ].includes( x ) ) && new Set( front.words ).size === front.words.length && ! front.overlap && ! front.onTitle, JSON.stringify( front.words ) );
		await sleep( 3500 );
		const later = await d.evaluate( () => [ ...document.querySelectorAll( '[data-id="ofx0001"] .rf-ofx-word' ) ].map( ( n ) => n.textContent ).join() );
		check( 'floating text', 'the words change over time', later !== front.words.join() || 0 === front.words.length, JSON.stringify( [ front.words, later ] ) );
		await d.locator( '[data-id="ofx0001"]' ).screenshot( { path: join( SHOTS, 'hero.png' ) } );
		await d.screenshot( { path: join( SHOTS, 'page.png' ), fullPage: true } );
		await d.context().close();

		const ph = await ( await browser.newContext( { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' } ) ).newPage();
		watch( ph );
		await ph.goto( p1.url );
		await sleep( 3000 );
		const phone = await ph.evaluate( () => {
			const hero = document.querySelector( '[data-id="ofx0001"]' );
			const fs = hero.querySelector( '.rf-ofx-fs' );
			const t = hero.querySelector( '.refraction-widget' ).getBoundingClientRect();
			const onTitle = [ ...hero.querySelectorAll( '.rf-ofx-word' ) ].some( ( n ) => {
				const r = n.getBoundingClientRect();
				return r.left < t.right && t.left < r.right && r.top < t.bottom && t.top < r.bottom;
			} );
			return { shapes: hero.querySelectorAll( '.rf-ofx-fs' ).length, anim: getComputedStyle( fs ).animationName, inside: fs.getBoundingClientRect().top >= hero.getBoundingClientRect().top - 60, words: hero.querySelectorAll( '.rf-ofx-word' ).length, onTitle };
		} );
		check( 'phone', 'phones get their own count (6); reduced motion keeps the shapes still and in view, and words stay (2 on phones), clear of the heading', 6 === phone.shapes && 'none' === phone.anim && phone.inside && 2 === phone.words && ! phone.onTitle, JSON.stringify( phone ) );
		await ph.screenshot( { path: join( SHOTS, 'phone.png' ), fullPage: true } );
		await ph.context().close();

		// ---- 0.69: mode, placement, flips, flat edge, uploaded tab, motion triggers
		const hd = ( id, title ) => w( id, 'heading', { title, align: 'center', title_color: '#FFFFFF' } );
		const p2 = page( 'Organic panel', [
			con( 'pan0001', { background_color: '#00AA77', rf_mask_mode: 'bg', rf_mask: 'blob-1', rf_mask_overlay: '#000000', rf_mask_overlay_opacity: { size: 0.5 }, rf_grain: 'yes', flex_justify_content: 'center' }, [ hd( 'pan0002', 'Only the background is cut' ) ] ),
			con( 'pan0003', { background_color: '#3858E9', rf_mask: 'circle', rf_mask_w: { size: 50 }, rf_mask_h: { size: 60 }, rf_mask_ax: 'right', rf_mask_flip_h: 'yes' }, [ hd( 'pan0004', 'Placed right' ) ] ),
			con( 'pan0005', { background_color: '#E20A17', rf_mask: 'blob-3', rf_mask_edge: 'left', rf_mask_trigger: 'loop', rf_mask_duration: { size: 1200 } }, [ hd( 'pan0006', 'Flat left edge, moving' ) ] ),
			con( 'pan0007', { background_color: '#F6C94A', rf_mask_source: 'mine', rf_mask: 'blob-1', rf_mask_mine: 'my-heart', rf_blob: 'yes', rf_blob_source: 'mine', rf_blob_mine: 'my-heart', rf_blob_color: '#263238', rf_blob_ax: 'right', rf_blob_size: { unit: '%', size: 40 }, rf_blob_h: { unit: '%', size: 50 }, rf_blob_x: { unit: '%', size: 0 }, rf_blob_y: { unit: '%', size: 0 }, rf_blob_trigger: 'hover' }, [ hd( 'pan0008', 'Uploaded heart' ) ] ),
			con( 'pan0009', { background_color: '#FFFFFF', rf_blob: 'yes', rf_blob_edge: 'left', rf_blob_size: { unit: '%', size: 50 }, rf_blob_x: { unit: '%', size: 0 }, rf_blob_color: '#2EC4B6', rf_blob_flip_v: 'yes' }, [ w( 'pan0010', 'heading', { title: 'Blob against the left edge', align: 'center' } ) ] ),
		] );
		const q = await ( await browser.newContext( { viewport: { width: 1280, height: 900 } } ) ).newPage();
		watch( q );
		await q.goto( p2.url );
		await sleep( 2500 );
		const panel = await q.evaluate( () => {
			const $ = ( id ) => document.querySelector( `[data-id="${ id }"]` );
			const cs = ( el ) => getComputedStyle( el );
			const mask = ( el ) => cs( el ).maskImage || cs( el ).webkitMaskImage;
			const bg = $( 'pan0001' );
			const fill = bg.querySelector( ':scope > .rf-ofx-fill' );
			const right = $( 'pan0003' );
			const edge = $( 'pan0005' );
			const heart = $( 'pan0007' );
			const hb = heart.querySelector( ':scope > .rf-ofx-blob' );
			const clip = $( 'pan0009' ).querySelector( ':scope > .rf-ofx-bclip' );
			const cb = clip?.querySelector( '.rf-ofx-blob' );
			const r = ( el ) => el.getBoundingClientRect();
			return {
				bg: { hostMask: mask( bg ), hostBg: cs( bg ).backgroundColor, fillBg: fill && cs( fill ).backgroundColor, fillMask: fill && /data:image/.test( mask( fill ) ), overlay: fill && getComputedStyle( fill, '::before' ).opacity, grainIn: !! fill?.querySelector( '.rf-ofx-grain' ) },
				right: { w: right.offsetWidth, h: right.offsetHeight, size: right.style.maskSize || right.style.webkitMaskSize, pos: right.style.maskPosition || right.style.webkitMaskPosition, flipped: /scale\(-1/.test( decodeURIComponent( right.style.maskImage || right.style.webkitMaskImage ) ) },
				edge: { pos: edge.style.maskPosition || edge.style.webkitMaskPosition, size: edge.style.maskSize || edge.style.webkitMaskSize },
				heart: { cls: heart.classList.contains( 'rf-mask--my-heart' ) && ! heart.classList.contains( 'rf-mask--blob-1' ), blob: hb?.classList.contains( 'rf-shape--my-heart' ), right: Math.round( r( heart ).right - r( hb ).right ), wr: Math.round( r( hb ).width / r( heart ).width * 100 ), hr: Math.round( r( hb ).height / r( heart ).height * 100 ), state: cs( hb.firstElementChild ).animationPlayState },
				clip: cb && { left: Math.round( r( cb ).left - r( clip ).left ), w: Math.round( r( cb ).width ), cut: 'hidden' === cs( clip ).overflow, flip: /matrix\(1, 0, 0, -1/.test( cs( cb ).transform ) },
			};
		} );
		check( 'mode', 'Clip background only: the container keeps its content unclipped, its background moves to a fill cut to the shape, with the overlay and the grain inside', 'none' === panel.bg.hostMask && 'rgba(0, 0, 0, 0)' === panel.bg.hostBg && 'rgb(0, 170, 119)' === panel.bg.fillBg && panel.bg.fillMask && '0.5' === panel.bg.overlay && panel.bg.grainIn, JSON.stringify( panel.bg ) );
		const [ sw, sh ] = ( panel.right.size || '' ).split( ' ' ).map( parseFloat );
		const [ px ] = ( panel.right.pos || '' ).split( ' ' ).map( parseFloat );
		check( 'placement', 'Width 50%, Height 60%, Horizontal Position right: the mask is half as wide, 60% as tall, against the right side; Flip Horizontal mirrors it', Math.abs( sw - ( panel.right.w / 2 ) ) < 2 && Math.abs( sh - ( panel.right.h * 0.6 ) ) < 2 && Math.abs( px - ( panel.right.w / 2 ) ) < 2 && panel.right.flipped, JSON.stringify( panel.right ) );
		check( 'flat edge', 'Flat edge left: the shape runs past the left side so the edge cuts it straight', parseFloat( panel.edge.pos ) < -10, JSON.stringify( panel.edge ) );
		// The loop rests while out of view: bring it into view first.
		await q.locator( '[data-id="pan0005"]' ).scrollIntoViewIfNeeded();
		const before = await q.evaluate( () => document.querySelector( '[data-id="pan0005"]' ).style.maskSize );
		await sleep( 400 );
		const moved = await q.evaluate( () => document.querySelector( '[data-id="pan0005"]' ).style.maskSize );
		check( 'motion', 'Continuous gentle loop: the mask breathes in view (its size changes over time) and rests out of view', moved !== before && before === panel.edge.size, JSON.stringify( [ panel.edge.size, before, moved ] ) );
		check( 'uploaded tab', 'the Uploaded tab: the mask and the blob use the uploaded heart (the built-in choice is ignored)', panel.heart.cls && panel.heart.blob, JSON.stringify( panel.heart ) );
		check( 'blob placement', 'blob Width 40%, Height 50%, Horizontal Position right', Math.abs( panel.heart.right ) <= 2 && Math.abs( panel.heart.wr - 40 ) <= 1 && Math.abs( panel.heart.hr - 50 ) <= 1, JSON.stringify( panel.heart ) );
		await q.hover( '[data-id="pan0007"]' );
		await sleep( 300 );
		const hovered = await q.evaluate( () => getComputedStyle( document.querySelector( '[data-id="pan0007"] .rf-ofx-blob' ).firstElementChild ).animationPlayState );
		check( 'blob trigger', 'blob motion On hover: paused until the pointer is over it', 'paused' === panel.heart.state && 'running' === hovered, JSON.stringify( [ panel.heart.state, hovered ] ) );
		check( 'blob flat edge', 'blob Flat edge left: in a clipping layer, pushed 30% past the left side; Flip Vertical mirrors it', panel.clip && panel.clip.cut && panel.clip.left < -( panel.clip.w * 0.25 ) && panel.clip.flip, JSON.stringify( panel.clip ) );
		await q.screenshot( { path: join( SHOTS, 'panel-page.png' ), fullPage: true } );
		await q.context().close();

		// ---- Grain: every texture, colour, size, fade, an uploaded texture, and a blob's grain
		const TEX = [ 'film', 'speckle', 'chalk', 'brush', 'fibre', 'halftone', 'dispersion', 'strokes', 'splatter', 'scratches', 'tex-rough-ink' ];
		const g = ( id, t, extra = {} ) => ( { id, elType: 'container', isInner: true, settings: { min_height: { unit: 'px', size: 170 }, width: { unit: '%', size: 23 }, background_background: 'classic', background_color: '#F4EFE6', rf_grain: 'yes', rf_grain_texture: t, rf_grain_amount: { size: 0.9 }, rf_grain_blend: 'normal', ...extra }, elements: [ w( id + 'h', 'heading', { title: t, header_size: 'h6' } ) ] } );
		const p3 = page( 'Grain', [
			{ id: 'grn0000', elType: 'container', isInner: false, settings: { flex_direction: 'row', flex_wrap: 'wrap', flex_gap: { unit: 'px', column: '12', row: '12', isLinked: true } }, elements: TEX.map( ( t, i ) => g( 'grn' + String( i + 1 ).padStart( 4, '0' ), t ) ) },
			con( 'grn0100', { background_color: '#263238', rf_grain: 'yes', rf_grain_texture: 'chalk', rf_grain_color: '#FFFFFF', rf_grain_fade: 'left', rf_grain_reach: { size: 60 }, rf_grain_scale: { size: 80 }, rf_grain_amount: { size: 0.8 }, rf_grain_blend: 'normal', rf_blob: 'yes', rf_blob_grain: 'yes', rf_blob_color: '#F69216' }, [ hd( 'grn0101', 'White chalk fading from the left' ) ] ),
		] );
		const gq = await ( await browser.newContext( { viewport: { width: 1280, height: 900 } } ) ).newPage();
		watch( gq );
		await gq.goto( p3.url );
		await sleep( 2500 );
		const grain = await gq.evaluate( ( ids ) => {
			const layer = ( id ) => document.querySelector( `[data-id="${ id }"] > .rf-ofx-grain` );
			const kinds = ids.map( ( id ) => {
				const l = layer( id );
				const cs = l && getComputedStyle( l );
				if ( ! l ) {
					return 'missing';
				}
				if ( /data:image\/svg/.test( cs.backgroundImage ) ) {
					return 'svg';
				}
				return /refraction-grain\/rough-ink\.png/.test( cs.maskImage || cs.webkitMaskImage ) ? 'uploaded' : 'none';
			} );
			const urls = ids.map( ( id ) => layer( id )?.style.backgroundImage || '' );
			const chalk = layer( 'grn0100' );
			const cs = getComputedStyle( chalk );
			const blobGrain = document.querySelector( '[data-id="grn0100"] .rf-ofx-blob > .rf-ofx-grain' );
			return { kinds, distinct: new Set( urls.filter( Boolean ) ).size, white: /255%2C255%2C255|0 0 0 0 1 0 0 0 0 1 0 0 0 0 1/.test( decodeURIComponent( chalk.style.backgroundImage ) ), fade: /linear-gradient\(to right/.test( cs.maskImage || cs.webkitMaskImage ), blobMasked: !! blobGrain && /--rf-shape|data:image/.test( blobGrain.style.maskImage || blobGrain.style.webkitMaskImage ) };
		}, TEX.map( ( _t, i ) => 'grn' + String( i + 1 ).padStart( 4, '0' ) ) );
		check( 'grain', 'all ten textures draw, each its own pattern, and the uploaded texture paints through its PNG', 10 === grain.kinds.filter( ( k ) => 'svg' === k ).length && 'uploaded' === grain.kinds[ 10 ] && 10 === grain.distinct, JSON.stringify( grain ) );
		check( 'grain', 'Grain Colour white and Fade From left (with reach); the blob\'s grain uses the same texture inside the blob', grain.white && grain.fade && grain.blobMasked, JSON.stringify( grain ) );
		await gq.screenshot( { path: join( SHOTS, 'grain.png' ), fullPage: true } );
		await gq.context().close();

		// ---- the editor's preview
		const e = a;
		await e.setViewportSize( { width: 1500, height: 950 } );
		await e.goto( `${ BASE }/wp-admin/post.php?post=${ p1.id }&action=refraction` );
		await e.waitForFunction( () => window.refraction?.documents?.getCurrent?.()?.container?.children?.length > 0, null, { timeout: 120000 } );
		await sleep( 3500 );
		const frame = e.frame( { name: 'refraction-preview-iframe' } );
		const pre = await frame.evaluate( () => ( { shapes: document.querySelectorAll( '[data-id="ofx0001"] .rf-ofx-fs' ).length, blob: !! document.querySelector( '[data-id="ofx0004"] .rf-ofx-blob__fill' ), mask: document.querySelector( '[data-id="ofx0005"]' ).classList.contains( 'rf-mask--my-heart' ) } ) );
		check( 'editor', 'the preview shows the layers and the uploaded mask', 14 === pre.shapes && pre.blob && pre.mask, JSON.stringify( pre ) );
		await e.evaluate( () => window.$e.run( 'document/elements/settings', { container: window.refraction.getContainer( 'ofx0001' ), settings: { rf_fs_count: 5, rf_fs_shapes: [ 'my-heart' ] } } ) );
		await sleep( 2000 );
		const re = await frame.evaluate( () => ( { n: document.querySelectorAll( '[data-id="ofx0001"] .rf-ofx-fs' ).length, vb: document.querySelector( '[data-id="ofx0001"] .rf-ofx-fs svg' )?.getAttribute( 'viewBox' ) } ) );
		check( 'editor', 'changing the count and picking an uploaded shape redraws the floating shapes', 5 === re.n && '0 0 24 24' === re.vb, JSON.stringify( re ) );
		const option = await e.evaluate( () => {
			const c = window.refraction.getContainer( 'ofx0005' );
			return [ c.controls.rf_mask_mine?.options?.[ 'my-heart' ]?.title, Object.keys( c.controls.rf_mask?.options || {} ).length, c.controls.rf_blob_line_shape?.options?.[ 'my-heart' ] ];
		} );
		check( 'editor', 'the Uploaded picker offers Heart, the Built-in picker the 21 shapes, and the outline list "My shape: Heart"', 'Heart' === option[ 0 ] && 21 === option[ 1 ] && 'My shape: Heart' === option[ 2 ], JSON.stringify( option ) );
		const tiles = await e.evaluate( async () => {
			const c = window.refraction.getContainer( 'ofx0005' );
			window.$e.run( 'document/elements/select', { container: c } );
			await new Promise( ( r ) => setTimeout( r, 1200 ) );
			const view = window.refraction.getPanelView().getCurrentPageView();
			view.activateTab( 'style' );
			view.activateSection( 'section_rf_mask' );
			view._renderChildren();
			await new Promise( ( r ) => setTimeout( r, 600 ) );
			const tabs = [ ...document.querySelectorAll( '.refraction-control-rf_mask_source .refraction-choices-label' ) ].map( ( l ) => l.innerText.trim() );
			const n = document.querySelectorAll( '.refraction-control-rf_mask .refraction-visual-choice-element' ).length;
			const picked = document.querySelector( '.refraction-control-rf_mask input:checked' )?.value;
			return { tabs, n, picked, heading: !! document.querySelector( '.refraction-control-rf_mask_placement' ), trigger: !! document.querySelector( '.refraction-control-rf_mask_trigger' ) };
		} );
		check( 'editor', 'the Shape Mask panel: Built-in / Uploaded tabs, 21 shape tiles with the saved one ticked, Placement and Motion', 'Built-in,Uploaded' === tiles.tabs.join() && 21 === tiles.n && 'my-heart' !== tiles.picked && tiles.heading && tiles.trigger, JSON.stringify( tiles ) );
		await e.locator( '#refraction-panel' ).screenshot( { path: join( SHOTS, 'panel.png' ) } ).catch( () => {} );
		await e.evaluate( () => window.$e.run( 'document/elements/settings', { container: window.refraction.getContainer( 'ofx0005' ), settings: { rf_mask_w: { unit: 'px', size: 50 } } } ) );
		await sleep( 1200 );
		const live = await frame.evaluate( () => {
			const el = document.querySelector( '[data-id="ofx0005"]' );
			return [ parseFloat( el.style.maskSize || el.style.webkitMaskSize ), el.offsetWidth ];
		} );
		check( 'editor', 'changing Width moves the mask at once in the preview', Math.abs( live[ 0 ] - ( live[ 1 ] / 2 ) ) < 2, JSON.stringify( live ) );
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

	console.log( failures ? `\n${ failures } check(s) failed` : '\nall organic fx checks passed' );
	process.exit( failures ? 1 : 0 );
}

main();
