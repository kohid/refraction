import { __, sprintf } from '@wordpress/i18n';

/**
 * Organic FX library in the editor: upload, rename and delete My Shapes and grain textures without leaving the page.
 * Opened by the "Upload or manage" buttons of the Uploaded shape tabs (Shape Mask, Deco Blob) and of Grain. A new
 * shape or texture is added at once to the panel's lists and to the preview, and picked for the element it was
 * opened from. Shapes are sent as SVG text (the server keeps only path data and a viewBox); textures are turned into
 * ink here (dark parts become the alpha of a PNG) and written again by the server.
 */

const cfg = window.refractionOrganicEditor || { shapes: {}, textures: {} };
const SHAPE_CONTROLS = [ 'rf_mask_mine', 'rf_blob_mine' ];
const SHAPE_SELECTS = [ 'rf_blob_line_shape', 'rf_fs_shapes' ];
const TEXTURE_CONTROLS = [ 'rf_grain_texture' ];
const BUILT_IN_TEXTURES = [ 'film', 'speckle', 'chalk', 'brush', 'fibre', 'halftone', 'dispersion', 'strokes', 'splatter', 'scratches' ];

const toast = ( message ) => {
	try {
		window.refraction.notifications.showToast( { message } );
	} catch ( e ) {}
};

async function post( action, data ) {
	const body = new window.FormData();
	body.append( 'action', 'refraction_ofx_' + action );
	body.append( 'nonce', cfg.nonce );
	Object.keys( data ).forEach( ( k ) => body.append( k, data[ k ] ) );

	const res = await window.fetch( cfg.ajax, { method: 'POST', body, credentials: 'same-origin' } );
	const json = await res.json().catch( () => null );

	if ( ! json || ! json.success ) {
		throw new Error( ( json && json.data && json.data.message ) || __( 'That did not work. Try again.', 'refraction' ) );
	}

	return json.data;
}

// ----------------------------------------------------------------- keeping the panel and the preview in step

const thumb = ( s ) => 'data:image/svg+xml,' + encodeURIComponent( `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ s.vb }" preserveAspectRatio="xMidYMid meet"><path fill="#A4AFB7" fill-rule="${ s.rule }" d="${ s.d }"/></svg>` );

function shapeOptions( name ) {
	const out = {};

	Object.keys( cfg.shapes ).forEach( ( id ) => {
		const s = cfg.shapes[ id ];
		/* Translators: %s: Shape name. */
		out[ id ] = SHAPE_CONTROLS.includes( name ) ? { title: s.name, image: thumb( s ) } : sprintf( __( 'My shape: %s', 'refraction' ), s.name );
	} );

	return out;
}

/**
 * Every control definition with one of these names, in the element configs, the widget configs and the elements on
 * the page (each may hold its own copy).
 *
 * @param {Array} names Control names.
 */
function controlDefs( names ) {
	const found = [];
	const visit = ( controls ) => {
		if ( controls && 'object' === typeof controls ) {
			names.forEach( ( n ) => controls[ n ] && found.push( controls[ n ] ) );
		}
	};
	const r = window.refraction;

	Object.values( ( r.config && r.config.elements ) || {} ).forEach( ( e ) => visit( e && e.controls ) );
	Object.values( r.widgetsCache || {} ).forEach( ( w ) => visit( w && w.controls ) );

	const walk = ( c ) => {
		if ( ! c ) {
			return;
		}

		visit( c.controls );
		visit( c.settings && c.settings.controls );
		( c.children || [] ).forEach( walk );
	};

	try {
		walk( r.documents.getCurrent().container );
	} catch ( e ) {}

	return found;
}

function refreshOptions() {
	const sets = [ ...SHAPE_CONTROLS, ...SHAPE_SELECTS ].map( ( n ) => [ n, shapeOptions( n ) ] );
	const textures = {};

	Object.keys( cfg.textures ).forEach( ( id ) => {
		/* Translators: %s: Texture name. */
		textures[ id ] = sprintf( __( 'Uploaded: %s', 'refraction' ), cfg.textures[ id ].name );
	} );

	controlDefs( [ ...SHAPE_CONTROLS, ...SHAPE_SELECTS, ...TEXTURE_CONTROLS ] ).forEach( ( def ) => {
		const mine = sets.find( ( [ n ] ) => n === def.name );

		if ( mine ) {
			const kept = {};

			// The selects also hold built-in shapes; only the my- entries are replaced.
			Object.keys( def.options || {} ).forEach( ( k ) => {
				if ( 0 !== k.indexOf( 'my-' ) ) {
					kept[ k ] = def.options[ k ];
				}
			} );
			def.options = SHAPE_CONTROLS.includes( def.name ) ? mine[ 1 ] : { ...kept, ...mine[ 1 ] };
		} else {
			const kept = {};
			BUILT_IN_TEXTURES.forEach( ( k ) => {
				if ( def.options && def.options[ k ] ) {
					kept[ k ] = def.options[ k ];
				}
			} );
			def.options = { ...kept, ...textures };
		}
	} );

	// The open panel: give its controls the new lists and draw them again.
	try {
		const page = window.refraction.getPanelView().getCurrentPageView();

		( page.children ? page.children.toArray() : [] ).forEach( ( child ) => {
			const name = child.model && child.model.get( 'name' );
			const def = name && controlDefs( [ name ] )[ 0 ];

			if ( def && [ ...SHAPE_CONTROLS, ...SHAPE_SELECTS, ...TEXTURE_CONTROLS ].includes( name ) ) {
				child.model.set( 'options', def.options );
				child.render();
			}
		} );
	} catch ( e ) {}

	// The preview: mask classes and paths of the shapes, urls of the textures.
	try {
		const win = window.refraction.$preview[ 0 ].contentWindow;
		const doc = win.document;
		let style = doc.getElementById( 'rf-my-shapes-live' );

		if ( ! style ) {
			style = doc.createElement( 'style' );
			style.id = 'rf-my-shapes-live';
			doc.head.appendChild( style );
		}

		style.textContent = Object.values( cfg.shapes ).map( ( s ) => s.css ).join( '' );
		win.refractionMyShapes = {};
		Object.keys( cfg.shapes ).forEach( ( id ) => {
			const s = cfg.shapes[ id ];
			win.refractionMyShapes[ id ] = { d: s.d, vb: s.vb, rule: s.rule };
		} );
		win.refractionGrainTextures = {};
		Object.keys( cfg.textures ).forEach( ( id ) => {
			const t = cfg.textures[ id ];
			win.refractionGrainTextures[ id ] = { url: t.url, w: t.w, h: t.h };
		} );
	} catch ( e ) {}
}

function apply( container, settings ) {
	if ( container ) {
		window.$e.run( 'document/elements/settings', { container, settings } );
	}
}

// ----------------------------------------------------------------- textures: a picture into ink

function toInk( file ) {
	return new Promise( ( resolve, reject ) => {
		const url = window.URL.createObjectURL( file );
		const img = new window.Image();

		img.onload = () => {
			const k = Math.min( 1, 1024 / Math.max( img.naturalWidth, img.naturalHeight ) );
			const canvas = document.createElement( 'canvas' );
			canvas.width = Math.max( 1, Math.round( img.naturalWidth * k ) );
			canvas.height = Math.max( 1, Math.round( img.naturalHeight * k ) );
			const ctx = canvas.getContext( '2d' );
			ctx.drawImage( img, 0, 0, canvas.width, canvas.height );
			const data = ctx.getImageData( 0, 0, canvas.width, canvas.height );
			const px = data.data;

			for ( let i = 0; i < px.length; i += 4 ) {
				const lum = ( 0.2126 * px[ i ] ) + ( 0.7152 * px[ i + 1 ] ) + ( 0.0722 * px[ i + 2 ] );
				px[ i + 3 ] = Math.round( ( 255 - lum ) * px[ i + 3 ] / 255 );
				px[ i ] = 0;
				px[ i + 1 ] = 0;
				px[ i + 2 ] = 0;
			}

			ctx.putImageData( data, 0, 0 );
			window.URL.revokeObjectURL( url );
			resolve( canvas.toDataURL( 'image/png' ) );
		};
		img.onerror = () => {
			window.URL.revokeObjectURL( url );
			reject( new Error( __( 'That picture could not be read. Use a PNG, JPG or WebP.', 'refraction' ) ) );
		};
		img.src = url;
	} );
}

// ----------------------------------------------------------------- the dialog

const CSS = `
.rf-lib{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:rgba(10,12,16,.55);font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.rf-lib__box{width:min(920px,94vw);max-height:88vh;display:flex;flex-direction:column;background:var(--e-a-bg-default,#fff);color:var(--e-a-color-txt,#1f2124);border:1px solid var(--e-a-border-color,#d5d8dc);border-radius:10px;box-shadow:0 24px 64px rgba(0,0,0,.35);overflow:hidden}
.rf-lib__head{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--e-a-border-color,#d5d8dc)}
.rf-lib__head h2{margin:0;font-size:15px;font-weight:600;color:inherit;flex:1}
.rf-lib__tabs{display:flex;border:1px solid var(--e-a-border-color,#d5d8dc);border-radius:6px;overflow:hidden}
.rf-lib__tabs button{all:unset;cursor:pointer;padding:5px 14px;font-size:12px}
.rf-lib__tabs button[aria-selected=true]{background:var(--e-a-bg-active,#e6e8ea);font-weight:600}
.rf-lib__close{all:unset;cursor:pointer;font-size:20px;line-height:1;padding:2px 6px;border-radius:4px}
.rf-lib__close:hover,.rf-lib__close:focus-visible{background:var(--e-a-bg-hover,#f1f2f3)}
.rf-lib__body{display:grid;grid-template-columns:280px 1fr;min-height:0;flex:1}
.rf-lib__add{padding:16px;border-right:1px solid var(--e-a-border-color,#d5d8dc);display:flex;flex-direction:column;gap:10px;overflow:auto}
.rf-lib__drop{display:grid;place-items:center;gap:6px;text-align:center;padding:22px 12px;border:1.5px dashed var(--e-a-border-color-bold,#babfc5);border-radius:8px;cursor:pointer}
.rf-lib__drop.is-over,.rf-lib__drop:focus-within{border-color:var(--e-a-color-primary-bold,#2563eb)}.rf-lib__drop.is-over{background:var(--e-a-bg-hover,#f1f2f3)}.rf-lib__drop span{word-break:break-word}.rf-lib input[disabled]{opacity:.6}
.rf-lib__drop input{position:absolute;opacity:0;width:1px;height:1px}
.rf-lib label.rf-lib__label{font-weight:600;font-size:12px}
.rf-lib input[type=text],.rf-lib textarea{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--e-a-border-color,#d5d8dc);border-radius:5px;background:var(--e-a-bg-default,#fff);color:inherit;font:inherit}
.rf-lib textarea{font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;min-height:90px;resize:vertical}
.rf-lib__go{all:unset;cursor:pointer;text-align:center;padding:8px 12px;border-radius:6px;background:var(--e-a-btn-bg-primary,#2563eb);color:var(--e-a-btn-color,#fff);font-weight:600}
.rf-lib__go[disabled]{opacity:.5;cursor:default}
.rf-lib__msg{min-height:1.4em;font-size:12px}
.rf-lib__msg.is-error{color:#c0392b}
.rf-lib__note{font-size:11.5px;opacity:.75;margin:0}
.rf-lib__list{padding:16px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:12px;align-content:start}
.rf-lib__empty{grid-column:1/-1;padding:28px;text-align:center;opacity:.7;border:1px dashed var(--e-a-border-color,#d5d8dc);border-radius:8px}
.rf-lib__item{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--e-a-border-color,#d5d8dc);border-radius:8px}
.rf-lib__item.is-new{border-color:var(--e-a-color-primary-bold,#2563eb)}
.rf-lib__pic{aspect-ratio:1;border-radius:5px;background:var(--e-a-bg-hover,#f1f2f3);display:grid;place-items:center;overflow:hidden}
.rf-lib__pic img{width:78%;height:78%;object-fit:contain}
.rf-lib__pic i{display:block;width:100%;height:100%;background:var(--e-a-color-txt,#1f2124);-webkit-mask-repeat:repeat;mask-repeat:repeat;-webkit-mask-size:220px auto;mask-size:220px auto}
.rf-lib__item input[type=text]{padding:4px 6px;font-size:12px}
.rf-lib__row{display:flex;gap:6px}
.rf-lib__row button{all:unset;cursor:pointer;flex:1;text-align:center;padding:4px 6px;border-radius:4px;font-size:11.5px;border:1px solid var(--e-a-border-color,#d5d8dc)}
.rf-lib__row button:hover,.rf-lib__row button:focus-visible{background:var(--e-a-bg-hover,#f1f2f3)}
.rf-lib__row .rf-lib__del{flex:0 0 auto;color:#c0392b}
@media (max-width:700px){.rf-lib__body{grid-template-columns:1fr}.rf-lib__add{border-right:0;border-bottom:1px solid var(--e-a-border-color,#d5d8dc)}}
`;

function el( tag, attrs = {}, ...kids ) {
	const n = document.createElement( tag );

	Object.keys( attrs ).forEach( ( k ) => {
		if ( 'text' === k ) {
			n.textContent = attrs[ k ];
		} else if ( 0 === k.indexOf( 'on' ) ) {
			n.addEventListener( k.slice( 2 ), attrs[ k ] );
		} else {
			n.setAttribute( k, attrs[ k ] );
		}
	} );
	kids.forEach( ( kid ) => kid && n.appendChild( kid ) );

	return n;
}

let dialog = null;

/**
 * Opens the library.
 *
 * @param {string} kind      'shapes' or 'textures'.
 * @param {Object} container The element it was opened from (or null).
 * @param {string} target    The setting a new item is picked into (rf_mask_mine, rf_blob_mine, rf_grain_texture).
 */
function open( kind, container, target ) {
	if ( dialog ) {
		dialog.remove();
	}

	if ( ! document.getElementById( 'rf-lib-css' ) ) {
		document.head.appendChild( el( 'style', { id: 'rf-lib-css', text: CSS } ) );
	}

	const state = { kind, fresh: new Set(), say: () => {}, dropped: () => {} };
	const list = el( 'div', { class: 'rf-lib__list', role: 'list' } );
	const add = el( 'div', { class: 'rf-lib__add' } );
	const title = el( 'h2', { id: 'rf-lib-title' } );
	const tabs = el( 'div', { class: 'rf-lib__tabs', role: 'tablist' } );
	const close = () => {
		document.removeEventListener( 'keydown', onKey, true );
		dialog.remove();
		dialog = null;
	};
	const onKey = ( e ) => {
		if ( 'Escape' === e.key ) {
			e.stopPropagation();
			close();
		}
	};

	dialog = el( 'div', { class: 'rf-lib', onclick: ( e ) => e.target === dialog && close() },
		el( 'div', { class: 'rf-lib__box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rf-lib-title' },
			el( 'div', { class: 'rf-lib__head' }, title, tabs, el( 'button', { type: 'button', class: 'rf-lib__close', 'aria-label': __( 'Close', 'refraction' ), text: '×', onclick: close } ) ),
			el( 'div', { class: 'rf-lib__body' }, add, list ) ) );

	function render() {
		const shapes = 'shapes' === state.kind;
		title.textContent = shapes ? __( 'Your shapes', 'refraction' ) : __( 'Your grain textures', 'refraction' );
		tabs.replaceChildren(
			...[ [ 'shapes', __( 'Shapes', 'refraction' ) ], [ 'textures', __( 'Textures', 'refraction' ) ] ].map( ( [ k, label ] ) => el( 'button', { type: 'button', role: 'tab', 'aria-selected': String( k === state.kind ), text: label, onclick: () => {
				state.kind = k;
				state.fresh = new Set();
				render();
			} } ) ) );
		renderAdd( shapes );
		renderList( shapes );
	}

	/**
	 * The files of a drop or a pick that suit the tab: SVGs for shapes, PNG / JPG / WebP pictures for textures.
	 *
	 * @param {FileList} files  Files.
	 * @param {boolean}  shapes The Shapes tab.
	 */
	const suitable = ( files, shapes ) => [ ...( files || [] ) ].filter( ( f ) => ( shapes ? /\.svg$/i.test( f.name ) || 'image/svg+xml' === f.type : /^image\/(png|jpeg|webp)$/.test( f.type ) ) );
	const baseName = ( f ) => f.name.replace( /\.[a-z0-9]+$/i, '' ).slice( 0, 60 );

	function renderAdd( shapes ) {
		const msg = el( 'p', { class: 'rf-lib__msg', role: 'status', 'aria-live': 'polite' } );
		const file = el( 'input', { type: 'file', multiple: 'multiple', accept: shapes ? '.svg,image/svg+xml' : 'image/png,image/jpeg,image/webp' } );
		const hint = shapes ? __( 'Drop SVG files here, or click to choose one or more', 'refraction' ) : __( 'Drop pictures here, or click to choose one or more', 'refraction' );
		const fileName = el( 'span', { text: hint } );
		const drop = el( 'label', { class: 'rf-lib__drop' }, file, el( 'strong', { text: shapes ? __( 'SVG files', 'refraction' ) : __( 'Texture pictures', 'refraction' ) } ), fileName );
		const name = el( 'input', { type: 'text', id: 'rf-lib-name', maxlength: '60', placeholder: shapes ? __( 'Brand blob', 'refraction' ) : __( 'Rough ink', 'refraction' ) } );
		const code = shapes ? el( 'textarea', { id: 'rf-lib-code', spellcheck: 'false', placeholder: '<svg viewBox="0 0 100 100"><path d="M10 50…"/></svg>' } ) : null;
		const go = el( 'button', { type: 'button', class: 'rf-lib__go', text: shapes ? __( 'Add shape', 'refraction' ) : __( 'Add texture', 'refraction' ) } );
		let picked = [];

		const say = ( text, error ) => {
			msg.textContent = text;
			msg.classList.toggle( 'is-error', !! error );
		};

		// Shows what will be added; several files take their names from the files.
		const choose = ( files ) => {
			picked = files;
			fileName.textContent = files.length ? files.map( ( f ) => f.name ).join( ', ' ) : hint;
			name.disabled = files.length > 1;
			const single = shapes ? __( 'Brand blob', 'refraction' ) : __( 'Rough ink', 'refraction' );
			name.placeholder = files.length > 1 ? __( 'Each takes its file name', 'refraction' ) : single;

			if ( 1 === files.length && ! name.value ) {
				name.value = baseName( files[ 0 ] );
			}

			if ( files.length > 1 ) {
				/* Translators: %d: Number of files. */
				go.textContent = shapes ? sprintf( __( 'Add %d shapes', 'refraction' ), files.length ) : sprintf( __( 'Add %d textures', 'refraction' ), files.length );
			} else {
				go.textContent = shapes ? __( 'Add shape', 'refraction' ) : __( 'Add texture', 'refraction' );
			}
		};

		// Adds one file (or the pasted code); returns the new id.
		const addOne = async ( f, label ) => {
			if ( shapes ) {
				const data = await post( 'shape_add', { name: label, svg: f ? await f.text() : code.value } );
				cfg.shapes = data.shapes;

				return data.id;
			}

			const data = await post( 'texture_add', { name: label, png: await toInk( f ) } );
			cfg.textures = data.textures;

			return data.id;
		};

		/** Adds every chosen file one after another, then picks the first new one for the element. */
		const run = async () => {
			const files = picked;

			if ( ! files.length && ! ( shapes && code.value.trim() ) ) {
				say( shapes ? __( 'Choose or drop SVG files, or paste SVG code first.', 'refraction' ) : __( 'Choose or drop pictures first.', 'refraction' ), true );
				return;
			}

			const jobs = files.length ? files.map( ( f ) => [ f, 1 === files.length && name.value ? name.value : baseName( f ) ] ) : [ [ null, name.value ] ];
			const added = [];
			const failed = [];
			go.disabled = true;

			for ( let i = 0; i < jobs.length; i++ ) {
				/* Translators: 1: Number being added, 2: Total. */
				say( jobs.length > 1 ? sprintf( __( 'Adding %1$d of %2$d…', 'refraction' ), i + 1, jobs.length ) : __( 'Adding…', 'refraction' ) );

				try {
					added.push( await addOne( jobs[ i ][ 0 ], jobs[ i ][ 1 ] ) );
				} catch ( e ) {
					failed.push( ( jobs[ i ][ 0 ] ? jobs[ i ][ 0 ].name + ': ' : '' ) + e.message );
				}
			}

			if ( added.length ) {
				state.fresh = new Set( added );
				refreshOptions();

				if ( shapes && ( 'rf_mask_mine' === target || 'rf_blob_mine' === target ) ) {
					apply( container, { [ target.replace( /_mine$/, '' ) + '_source' ]: 'mine', [ target ]: added[ 0 ] } );
				} else if ( ! shapes && 'rf_grain_texture' === target ) {
					apply( container, { rf_grain_texture: added[ 0 ] } );
				}

				/* Translators: %d: Number added. */
				toast( added.length > 1 ? sprintf( __( '%d added; the first is picked.', 'refraction' ), added.length ) : __( 'Added and picked.', 'refraction' ) );
				render();
			}

			if ( failed.length ) {
				// After render() the message lives in the new form.
				const done = added.length ? sprintf( /* Translators: %d: Number added. */ __( '%d added.', 'refraction' ), added.length ) + ' ' : '';
				state.say( done + __( 'Not added:', 'refraction' ) + ' ' + failed.join( ' ' ), true );
			}

			go.disabled = false;
		};

		state.say = say;
		state.dropped = ( dropped ) => {
			const files = suitable( dropped, shapes );

			if ( ! files.length ) {
				say( shapes ? __( 'Only SVG files can be added here.', 'refraction' ) : __( 'Only PNG, JPG or WebP pictures can be added here.', 'refraction' ), true );
				return;
			}

			choose( files );
			run(); // A drop says "add these": no extra click.
		};

		file.addEventListener( 'change', () => choose( suitable( file.files, shapes ) ) );
		go.addEventListener( 'click', run );

		add.replaceChildren(
			drop,
			el( 'label', { class: 'rf-lib__label', for: 'rf-lib-name', text: __( 'Name', 'refraction' ) } ),
			name,
			...( code ? [ el( 'label', { class: 'rf-lib__label', for: 'rf-lib-code', text: __( 'Or paste SVG code', 'refraction' ) } ), code ] : [] ),
			go,
			msg,
			el( 'p', { class: 'rf-lib__note', text: shapes
				? __( 'Drop several SVGs at once to add them all. One filled silhouette per file works best: paths, rectangles, circles, ellipses and polygons are joined into one shape; colours, text and pictures are dropped, so nothing in a file can run. Up to 200 KB each and 100 shapes.', 'refraction' )
				: __( 'Drop several pictures at once to add them all. The dark parts become the grain, painted in the Grain Colour; light parts stay clear. A tileable picture repeats best. Up to 1024 px is kept.', 'refraction' ) } ) );
	}

	function renderList( shapes ) {
		const items = shapes ? cfg.shapes : cfg.textures;
		const ids = Object.keys( items );

		if ( ! ids.length ) {
			list.replaceChildren( el( 'p', { class: 'rf-lib__empty', text: shapes ? __( 'No shapes yet. Add one on the left.', 'refraction' ) : __( 'No textures yet. Add one on the left.', 'refraction' ) } ) );
			return;
		}

		list.replaceChildren( ...ids.map( ( id ) => {
			const it = items[ id ];
			const pic = shapes ? el( 'img', { src: thumb( it ), alt: '' } ) : el( 'i' );

			if ( ! shapes ) {
				pic.style.webkitMaskImage = `url("${ it.url }")`;
				pic.style.maskImage = `url("${ it.url }")`;
			}

			const label = el( 'input', { type: 'text', value: it.name, maxlength: '60', 'aria-label': __( 'Name', 'refraction' ) } );

			if ( shapes ) {
				label.addEventListener( 'change', async () => {
					try {
						cfg.shapes = ( await post( 'shape_rename', { id, name: label.value } ) ).shapes;
						refreshOptions();
						toast( __( 'Renamed.', 'refraction' ) );
					} catch ( e ) {
						toast( e.message );
					}
				} );
			} else {
				label.readOnly = true;
			}

			const use = el( 'button', { type: 'button', text: __( 'Use', 'refraction' ), onclick: () => {
				if ( shapes && ( 'rf_mask_mine' === target || 'rf_blob_mine' === target ) ) {
					apply( container, { [ target.replace( /_mine$/, '' ) + '_source' ]: 'mine', [ target ]: id } );
				} else if ( ! shapes ) {
					apply( container, { rf_grain_texture: id } );
				}

				close();
			} } );
			const del = el( 'button', { type: 'button', class: 'rf-lib__del', 'aria-label': sprintf( /* Translators: %s: Name. */ __( 'Delete %s', 'refraction' ), it.name ), text: __( 'Delete', 'refraction' ), onclick: async () => {
				// eslint-disable-next-line no-alert
				if ( ! window.confirm( shapes ? __( 'Delete this shape? Elements using it lose their mask or blob.', 'refraction' ) : __( 'Delete this texture? Elements using it show no grain.', 'refraction' ) ) ) {
					return;
				}

				try {
					const data = await post( shapes ? 'shape_delete' : 'texture_delete', { id } );

					if ( shapes ) {
						cfg.shapes = data.shapes;
					} else {
						cfg.textures = data.textures;
					}

					refreshOptions();
					render();
				} catch ( e ) {
					toast( e.message );
				}
			} } );

			return el( 'div', { class: 'rf-lib__item' + ( state.fresh.has( id ) ? ' is-new' : '' ), role: 'listitem', 'data-id': id }, el( 'div', { class: 'rf-lib__pic' }, pic ), label, el( 'div', { class: 'rf-lib__row' }, use, del ) );
		} ) );
	}

	// Files can be dropped anywhere on the dialog; the drop zone lights up while they are over it.
	let depth = 0;
	const zone = () => dialog.querySelector( '.rf-lib__drop' );
	dialog.addEventListener( 'dragenter', ( e ) => {
		e.preventDefault();
		depth++;
		zone().classList.add( 'is-over' );
	} );
	dialog.addEventListener( 'dragover', ( e ) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	} );
	dialog.addEventListener( 'dragleave', () => {
		depth = Math.max( 0, depth - 1 );

		if ( ! depth ) {
			zone().classList.remove( 'is-over' );
		}
	} );
	dialog.addEventListener( 'drop', ( e ) => {
		e.preventDefault();
		depth = 0;
		zone().classList.remove( 'is-over' );
		state.dropped( e.dataTransfer.files );
	} );

	document.body.appendChild( dialog );
	document.addEventListener( 'keydown', onKey, true );
	render();
	dialog.querySelector( 'input[type=file]' ).focus();
}

function containerOf( view ) {
	return ( view && ( view.container || ( view.options && view.options.container ) ) ) || ( window.refraction.selection && window.refraction.selection.getElements()[ 0 ] ) || null;
}

window.addEventListener( 'refraction/init', () => {
	const ch = window.refraction.channels.editor;

	if ( ! cfg.can ) {
		return;
	}

	SHAPE_CONTROLS.forEach( ( name ) => ch.on( 'refraction:organicLibrary:' + name, ( view ) => open( 'shapes', containerOf( view ), name ) ) );
	ch.on( 'refraction:organicTextures', ( view ) => open( 'textures', containerOf( view ), 'rf_grain_texture' ) );
	window.refractionOrganicLibrary = { open: ( kind ) => open( kind, containerOf( null ), 'shapes' === kind ? 'rf_mask_mine' : 'rf_grain_texture' ) };
} );
