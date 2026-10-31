/**
 * Form Builder designer: drag and drop canvas, field inspector, style editor and advanced settings.
 *
 * The whole design lives in one object (the same shape as the PHP definition); on save it is posted as JSON and
 * Classes\Schema cleans every part of it again, so nothing here is trusted. Everything can also be done without a
 * mouse: palette items add on Enter, blocks have move up / down, duplicate and delete buttons.
 */
( function () {
	'use strict';

	const config = window.refractionBuilder || {};
	const root = document.getElementById( 'rfb-builder' );

	if ( ! root ) {
		return;
	}

	const i18n = window.wp && window.wp.i18n ? window.wp.i18n : { __: ( s ) => s };
	const __ = i18n.__;
	const form = root.closest( 'form' );
	const state = JSON.parse( root.dataset.design );
	const typeLabels = {};

	config.palette.forEach( ( group ) => Object.assign( typeLabels, group.types ) );

	let uid = 0;
	let selected = null;
	let tab = 'field'; // right panel: field | style | advanced | general
	let dirty = false;
	let drag = null;
	let fieldTab = 'settings'; // inside the Field panel: settings | style
	let previewState = false; // show hover and focus looks on the selected field of the canvas
	const refs = {};

	// ---------------------------------------------------------------- tiny DOM helper

	function h( tag, props, ...children ) {
		const el = document.createElement( tag );

		Object.entries( props || {} ).forEach( ( [ name, value ] ) => {
			if ( null === value || undefined === value || false === value ) {
				return;
			}

			if ( 'class' === name ) {
				el.className = value;
			} else if ( name.startsWith( 'on' ) ) {
				el.addEventListener( name.slice( 2 ).toLowerCase(), value );
			} else if ( 'value' === name || 'checked' === name ) {
				el[ name ] = value;
			} else if ( true === value ) {
				el.setAttribute( name, '' );
			} else {
				el.setAttribute( name, String( value ) );
			}
		} );

		children.flat( Infinity ).forEach( ( child ) => {
			if ( null !== child && undefined !== child && false !== child ) {
				el.append( child.nodeType ? child : document.createTextNode( String( child ) ) );
			}
		} );

		return el;
	}

	const markDirty = () => ( dirty = true );

	function announce( message ) {
		if ( refs.live ) {
			refs.live.textContent = message;
		}
	}

	// ---------------------------------------------------------------- field model

	const all = ( list = state.fields ) => list.flatMap( ( field ) => [ field, ...all( field.children || [] ) ] );
	const isContainer = ( type ) => 'group' === type || 'repeater' === type;
	const isLayout = ( type ) => [ 'heading', 'paragraph', 'html', 'divider', 'image' ].includes( type );
	const hasValue = ( type ) => ! isLayout( type ) && 'step' !== type;
	const hasOptions = ( type ) => [ 'select', 'radio', 'checkbox' ].includes( type );
	const isScalar = ( type ) => hasValue( type ) && ! isContainer( type ) && ! [ 'file', 'checkbox', 'hidden', 'name', 'signature' ].includes( type );

	function slugKey( text ) {
		let key = String( text ).toLowerCase().replace( /[^a-z0-9_]+/g, '_' ).replace( /^_+|_+$/g, '' ).slice( 0, 36 );

		if ( key && ! /^[a-z]/.test( key ) ) {
			key = 'f_' + key;
		}

		return key || 'field';
	}

	/** Points every visibility rule that looked at the old key at the new one. */
	function renameKey( field, key ) {
		const old = field.key;

		all().forEach( ( other ) => ( other.conditions.rules || [] ).forEach( ( rule ) => {
			if ( rule.field === old ) {
				rule.field = key;
			}
		} ) );
		state.title_field = state.title_field === old ? key : state.title_field;
		field.key = key;
	}

	function uniqueKey( base, except ) {
		const taken = new Set( all().filter( ( f ) => f !== except ).map( ( f ) => f.key ) );
		let key = slugKey( base );
		let n = 2;

		while ( taken.has( key ) ) {
			key = slugKey( base ).slice( 0, 33 ) + '_' + n++;
		}

		return key;
	}

	function baseField( type ) {
		return {
			style: {},
			key: '', label: '', type, required: false, options: [], placeholder: '', help: '', width: 'full', in_table: false, filter: false, public: false,
			default: '', min: null, max: null, content: '', level: 3,
			conditions: { enabled: false, action: 'show', match: 'all', rules: [] },
			css_class: '', hide_label: false, accept: [ 'jpg', 'jpeg', 'png', 'pdf' ], max_size: 5, max_files: 1,
			children: [], min_rows: 0, max_rows: 10, add_label: __( 'Add row', 'refraction' ), source: 'static',
			description: '', label_tag: 'div', parts: [ 'first', 'last' ], image_id: 0, image_size: 'medium', image_width: 100, image_align: 'left', image_alt: '', image_link: '', sig_height: 180,
		};
	}

	function newField( type ) {
		const field = baseField( type );
		const label = typeLabels[ type ] || type;

		field.label = 'step' === type ? sprintf( __( 'Step %d', 'refraction' ), all().filter( ( f ) => 'step' === f.type ).length + 1 ) : label;
		field.key = uniqueKey( hasValue( type ) && 'step' !== type ? label : type );

		if ( hasOptions( type ) ) {
			field.options = [ 1, 2, 3 ].map( ( n ) => ( { value: 'Option ' + n, label: 'Option ' + n } ) );
		}

		if ( 'heading' === type ) {
			field.content = __( 'Heading', 'refraction' );
		} else if ( 'paragraph' === type ) {
			field.content = __( 'Write something helpful here.', 'refraction' );
		} else if ( 'html' === type ) {
			field.content = '<p>' + __( 'Custom HTML', 'refraction' ) + '</p>';
		} else if ( [ 'group', 'repeater' ].includes( type ) ) {
			field.children = [];
		}

		field.width = [ 'text', 'email', 'phone', 'number', 'currency', 'date', 'time', 'datetime', 'select', 'country' ].includes( type ) ? 'half' : 'full';

		if ( 'step' === type ) {
			field.label_tag = 'h3';
		}

		if ( 'signature' === type ) {
			field.placeholder = __( 'Sign here', 'refraction' );
		}

		// A field you just added follows its label while you rename it; once saved, its key stays put so old answers keep matching.
		Object.defineProperty( field, '_auto', { value: hasValue( type ) && 'step' !== type, enumerable: false, writable: true } );

		return tag( field );
	}

	function sprintf( text, ...values ) {
		let i = 0;

		return String( text ).replace( /%(?:(\d)\$)?[sd]/g, ( m, n ) => String( values[ n ? Number( n ) - 1 : i++ ] ) );
	}

	/** Gives every field (and child) a private id used by the designer only; it is stripped before saving. */
	function tag( field ) {
		Object.defineProperty( field, '_id', { value: ++uid, enumerable: false, writable: true } );
		( field.children || [] ).forEach( tag );

		return field;
	}

	function find( id, list = state.fields, parent = null ) {
		for ( let i = 0; i < list.length; i++ ) {
			if ( list[ i ]._id === id ) {
				return { field: list[ i ], list, index: i, parent };
			}

			const inner = find( id, list[ i ].children || [], list[ i ] );

			if ( inner ) {
				return inner;
			}
		}

		return null;
	}

	function clone( field ) {
		const copy = JSON.parse( JSON.stringify( field ) );

		tag( copy );
		[ copy, ...all( copy.children ) ].forEach( ( f ) => {
			if ( hasValue( f.type ) ) {
				f.key = uniqueKey( f.key + '_copy' );
			} else {
				f.key = uniqueKey( f.type );
			}

			if ( ! ( 'step' === f.type || isLayout( f.type ) ) ) {
				f.label = f.label + ' ' + __( '(copy)', 'refraction' );
			}
		} );

		return copy;
	}

	/** Can a field of this type be dropped into this list owner (null = the top level)? */
	function canDrop( type, owner ) {
		if ( ! owner ) {
			return true;
		}

		if ( isContainer( type ) || 'step' === type ) {
			return false;
		}

		return ! ( 'repeater' === owner.type && 'file' === type );
	}

	function insert( field, owner, index ) {
		const list = owner ? owner.children : state.fields;

		list.splice( Math.max( 0, Math.min( list.length, index ) ), 0, field );
		selected = field._id;
		tab = 'field';
		expand( 'right' );
		markDirty();
		renderBuild();
		announce( sprintf( __( '%1$s added at position %2$d.', 'refraction' ), field.label, list.indexOf( field ) + 1 ) );
	}

	function move( id, owner, index ) {
		const from = find( id );

		if ( ! from || ! canDrop( from.field.type, owner ) || ( owner && owner._id === id ) ) {
			return;
		}

		const targetList = owner ? owner.children : state.fields;
		let to = index;

		from.list.splice( from.index, 1 );

		if ( from.list === targetList && from.index < to ) {
			to--;
		}

		targetList.splice( Math.max( 0, Math.min( targetList.length, to ) ), 0, from.field );
		markDirty();
		renderBuild();
		announce( sprintf( __( '%1$s moved to position %2$d.', 'refraction' ), from.field.label, targetList.indexOf( from.field ) + 1 ) );
	}

	// ---------------------------------------------------------------- style variables (mirror of Classes\Style::variables)

	function styleVars( style ) {
		const fonts = { inherit: 'inherit', system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, Menlo, Consolas, monospace' };
		const shadows = { none: 'none', soft: '0 0 20px rgba(76, 87, 125, 0.08)', strong: '0 12px 40px rgba(76, 87, 125, 0.22)' };
		const pad = { small: '6px 14px', medium: '9px 20px', large: '13px 28px' };

		return {
			'--rfb-primary': style.primary, '--rfb-ink': style.text, '--rfb-muted': style.muted, '--rfb-label': style.label_color,
			'--rfb-input-bg': style.input_bg, '--rfb-input-border': style.input_border, '--rfb-input-text': style.input_text,
			'--rfb-focus': style.focus, '--rfb-error': style.error, '--rfb-form-bg': style.form_bg,
			'--rfb-button-bg': style.button_bg, '--rfb-button-text': style.button_text,
			'--rfb-radius': style.radius + 'px', '--rfb-input-height': style.input_height + 'px', '--rfb-font-size': style.font_size + 'px',
			'--rfb-label-size': style.label_size + 'px', '--rfb-label-weight': style.label_weight, '--rfb-gap': style.gap + 'px',
			'--rfb-padding': style.padding + 'px', '--rfb-border-width': style.border_width + 'px',
			'--rfb-max-width': Number( style.width ) > 0 ? style.width + 'px' : 'none', '--rfb-shadow': shadows[ style.shadow ],
			'--rfb-font': fonts[ style.font_family ], '--rfb-button-padding': pad[ style.button_size ],
		};
	}

	function applyStyle( el ) {
		Object.entries( styleVars( state.style ) ).forEach( ( [ name, value ] ) => el.style.setProperty( name, value ) );
		el.className = el.className.replace( /\brfb-label-\w+|\brfb-btn-(left|center|right|stretch)\b/g, '' ).trim() + ' rfb-label-' + state.style.label_position + ' rfb-btn-' + state.style.button_align;
	}

	// ---------------------------------------------------------------- form controls for the panels

	function row( label, control, help ) {
		return h( 'label', { class: 'rfb-field rfb-w-full' }, h( 'span', { class: 'rfb-mini' }, label ), control, help ? h( 'span', { class: 'rfb-help' }, help ) : null );
	}

	function text( target, key, options = {} ) {
		return h( 'input', {
			class: 'rfb-input', type: options.type || 'text', 'aria-label': options.label, value: null === target[ key ] || undefined === target[ key ] ? '' : target[ key ], placeholder: options.placeholder,
			min: options.min, max: options.max, step: options.step, maxlength: options.maxlength,
			onInput: ( e ) => {
				target[ key ] = options.number ? ( '' === e.target.value ? null : Number( e.target.value ) ) : e.target.value;
				markDirty();
				( options.after || renderCanvasOnly )( e );
			},
		} );
	}

	function area( target, key, options = {} ) {
		return h( 'textarea', {
			class: 'rfb-input', rows: options.rows || 4, onInput: ( e ) => {
				target[ key ] = e.target.value;
				markDirty();
				( options.after || renderCanvasOnly )( e );
			},
		}, target[ key ] || '' );
	}

	function select( target, key, choices, options = {} ) {
		const entries = Array.isArray( choices ) ? choices.map( ( c ) => [ c, c ] ) : Object.entries( choices );

		return h( 'select', {
			class: 'rfb-input', 'aria-label': options.label, onChange: ( e ) => {
				target[ key ] = options.number ? Number( e.target.value ) : e.target.value;
				markDirty();
				( options.after || renderCanvasOnly )( e );
			},
		}, entries.map( ( [ value, label ] ) => h( 'option', { value, selected: String( target[ key ] ) === String( value ) }, label ) ) );
	}

	function check( target, key, label, options = {} ) {
		return h( 'label', { class: 'rfb-check' }, h( 'input', {
			type: 'checkbox', checked: !! target[ key ], onChange: ( e ) => {
				target[ key ] = e.target.checked;
				markDirty();
				( options.after || renderCanvasOnly )( e );
			},
		} ), h( 'span', null, label ) );
	}

	function toggle( target, key, label, help, after ) {
		return h( 'div', { class: 'rfb-field rfb-w-full' }, h( 'label', { class: 'rfb-switch' }, h( 'input', {
			type: 'checkbox', checked: !! target[ key ], onChange: ( e ) => {
				target[ key ] = e.target.checked;
				markDirty();
				( after || ( () => {} ) )( e );
			},
		} ), h( 'span', { class: 'rfb-switch-track', 'aria-hidden': 'true' } ), h( 'span', { class: 'rfb-switch-text' }, label ) ), help ? h( 'p', { class: 'rfb-help' }, help ) : null );
	}

	function section( title, ...children ) {
		return h( 'details', { class: 'rfb-section', open: true }, h( 'summary', null, title ), h( 'div', { class: 'rfb-section-body' }, children ) );
	}

	// ---------------------------------------------------------------- canvas

	function faux( field ) {
		const t = field.type;
		const label = h( 'span', { class: 'rfb-label' + ( field.required ? ' is-required' : '' ) + ( field.hide_label ? ' is-faint' : '' ) }, field.label );
		const desc = field.description ? h( 'p', { class: 'rfb-description' }, field.description ) : null;

		if ( 'image' === t ) {
			return field.image_url
				? h( 'figure', { class: 'rfb-image rfb-align-' + field.image_align, style: '--rfb-image-width:' + field.image_width + '%' }, h( 'img', { src: field.image_url, alt: field.image_alt || '' } ) )
				: h( 'div', { class: 'rfb-cv-drop' }, __( 'Image: choose one in the settings panel', 'refraction' ) );
		}

		if ( 'name' === t ) {
			const names = { prefix: __( 'Prefix', 'refraction' ), first: __( 'First name', 'refraction' ), middle: __( 'Middle name', 'refraction' ), last: __( 'Last name', 'refraction' ) };

			return h( 'div', null, label, desc, h( 'div', { class: 'rfb-name-row' }, [ 'prefix', 'first', 'middle', 'last' ].filter( ( part ) => field.parts.includes( part ) ).map( ( part ) => h( 'div', { class: 'rfb-name-part rfb-name-' + part }, h( 'div', { class: 'rfb-input rfb-cv-input' } ), h( 'span', { class: 'rfb-sublabel' }, names[ part ] ) ) ) ) );
		}

		if ( 'signature' === t ) {
			return h( 'div', null, label, desc, h( 'div', { class: 'rfb-signature', style: '--rfb-sig-height:' + field.sig_height + 'px' }, h( 'span', { class: 'rfb-sig-hint' }, field.placeholder || __( 'Sign here', 'refraction' ) ) ), h( 'span', { class: 'rfb-link-btn' }, __( 'Clear signature', 'refraction' ) ) );
		}

		if ( 'heading' === t ) {
			return h( 'div', { class: 'rfb-cv-heading rfb-cv-h' + field.level }, field.content || field.label );
		}

		if ( 'paragraph' === t ) {
			return h( 'p', { class: 'rfb-cv-paragraph' }, field.content );
		}

		if ( 'html' === t ) {
			return h( 'div', { class: 'rfb-cv-html' }, h( 'code', null, '</>' ), ' ', ( field.content || '' ).replace( /<[^>]*>/g, ' ' ).replace( /\s+/g, ' ' ).trim().slice( 0, 120 ) || __( 'Empty HTML block', 'refraction' ) );
		}

		if ( 'divider' === t ) {
			return h( 'hr', { class: 'rfb-divider' } );
		}

		if ( 'step' === t ) {
			return h( 'div', { class: 'rfb-cv-step' }, h( 'span', null, __( 'New step', 'refraction' ) ), h( 'strong', null, field.label ), field.hide_label ? h( 'em', null, __( '(title hidden on the form)', 'refraction' ) ) : null, field.description ? h( 'small', null, field.description ) : null );
		}

		if ( 'toggle' === t ) {
			return h( 'div', { class: 'rfb-switch' }, h( 'span', { class: 'rfb-switch-track' } ), h( 'span', { class: 'rfb-switch-text' }, field.label ) );
		}

		if ( [ 'radio', 'checkbox' ].includes( t ) ) {
			const looks = field.style && 'buttons' === field.style.choice_look;

			return h( 'div', null, label, desc, h( 'div', { class: 'rfb-cv-choices' + ( looks ? ' rfb-choice-buttons' : '' ) }, field.options.slice( 0, 4 ).map( ( o, i ) => h( 'span', { class: 'rfb-check' }, h( 'input', { type: t, disabled: true, tabindex: '-1', checked: 0 === i } ), h( 'span', null, o.label ) ) ) ) );
		}

		if ( 'file' === t ) {
			return h( 'div', null, label, desc, h( 'div', { class: 'rfb-cv-drop' }, __( 'Choose a file', 'refraction' ), ' · ', field.accept.join( ', ' ).toUpperCase(), ' · ', field.max_size + ' MB' ) );
		}

		if ( 'hidden' === t ) {
			return h( 'div', { class: 'rfb-cv-hidden' }, h( 'span', null, __( 'Hidden field', 'refraction' ) ), h( 'strong', null, field.label ), h( 'em', null, field.source === 'static' ? field.default : ( config.hiddenSources[ field.source ] || '' ) ) );
		}

		if ( 'textarea' === t ) {
			return h( 'div', null, label, desc, h( 'div', { class: 'rfb-input rfb-cv-input rfb-cv-area' }, field.placeholder ) );
		}

		return h( 'div', null, label, desc, h( 'div', { class: 'rfb-input rfb-cv-input' }, field.placeholder || ( [ 'select', 'country' ].includes( t ) ? __( 'Select...', 'refraction' ) : '' ), [ 'select', 'rating', 'country' ].includes( t ) ? h( 'span', { class: 'rfb-cv-caret' }, '▾' ) : null ) );
	}

	function list( items, owner ) {
		const el = h( 'div', { class: 'rfb-cv-list', 'data-owner': owner ? owner._id : '' } );

		if ( ! items.length ) {
			el.append( h( 'div', { class: 'rfb-cv-empty' }, owner ? __( 'Drop fields here', 'refraction' ) : __( 'Drag a field here, or click one in the list on the left.', 'refraction' ) ) );
		}

		items.forEach( ( field, index ) => el.append( block( field, items, index, owner ) ) );

		const accepts = () => !! drag && canDrop( drag.type, owner ) && ! ( owner && drag.id === owner._id );

		// A drop target must also accept the drag on entry, or the browser may skip the drop after a layout change.
		el.addEventListener( 'dragenter', ( event ) => {
			if ( accepts() ) {
				event.preventDefault();
				event.stopPropagation();
			}
		} );
		el.addEventListener( 'dragover', ( event ) => {
			if ( ! drag ) {
				return;
			}

			event.stopPropagation();
			const ok = canDrop( drag.type, owner ) && ! ( owner && drag.id === owner._id );

			el.classList.toggle( 'is-denied', ! ok );

			if ( ! ok ) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = 'new' === drag.kind ? 'copy' : 'move';
			const index = dropIndex( el, event.clientX, event.clientY );

			showLine( el, index );
		} );
		el.addEventListener( 'dragleave', ( event ) => {
			if ( ! el.contains( event.relatedTarget ) ) {
				clearLines();
			}
		} );
		el.addEventListener( 'drop', ( event ) => {
			if ( ! drag ) {
				return;
			}

			event.stopPropagation();
			event.preventDefault();

			const ok = canDrop( drag.type, owner ) && ! ( owner && drag.id === owner._id );
			const index = dropIndex( el, event.clientX, event.clientY );
			const current = drag;

			clearLines();
			drag = null;

			if ( ! ok ) {
				return;
			}

			if ( 'new' === current.kind ) {
				insert( newField( current.type ), owner, index );
			} else {
				move( current.id, owner, index );
			}
		} );

		return el;
	}

	/**
	 * Where a dragged field would land. Fields flow in rows (half and third widths sit side by side), so the item under
	 * the pointer decides: its left half means before it, its right half means after it (full-width items use the top
	 * and bottom halves). Between items it falls back to the first item that starts below the pointer.
	 */
	function dropIndex( listEl, x, y ) {
		const items = Array.from( listEl.children ).filter( ( c ) => c.classList.contains( 'rfb-cv-item' ) );
		const listBox = listEl.getBoundingClientRect();

		for ( let i = 0; i < items.length; i++ ) {
			const box = items[ i ].getBoundingClientRect();

			if ( x >= box.left && x <= box.right && y >= box.top && y <= box.bottom ) {
				const wide = box.width > listBox.width * 0.75;

				return ( wide ? y < box.top + box.height / 2 : x < box.left + box.width / 2 ) ? i : i + 1;
			}
		}

		const index = items.findIndex( ( item ) => y < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2 );

		return -1 === index ? items.length : index;
	}

	/** Draws the insertion marker over the list without moving anything (a marker in the flow shifts the layout under the pointer). */
	function showLine( listEl, index ) {
		clearLines();

		const items = Array.from( listEl.children ).filter( ( c ) => c.classList.contains( 'rfb-cv-item' ) );
		const base = listEl.getBoundingClientRect();
		const line = h( 'div', { class: 'rfb-drop-line', 'aria-hidden': 'true' } );
		const place = ( left, top, width, height ) => Object.assign( line.style, { left: left - base.left + 'px', top: top - base.top + 'px', width: width + 'px', height: height + 'px' } );

		if ( ! items.length ) {
			place( base.left + 4, base.top + 4, base.width - 8, 4 );
		} else if ( index < items.length ) {
			const box = items[ index ].getBoundingClientRect();
			const wide = box.width > base.width * 0.75;

			wide ? place( box.left, box.top - 8, box.width, 4 ) : place( box.left - 8, box.top, 4, box.height );
		} else {
			const box = items[ items.length - 1 ].getBoundingClientRect();
			const wide = box.width > base.width * 0.75;

			wide ? place( box.left, box.bottom + 4, box.width, 4 ) : place( box.right + 4, box.top, 4, box.height );
		}

		listEl.append( line );
	}

	function clearLines() {
		root.querySelectorAll( '.rfb-drop-line' ).forEach( ( line ) => line.remove() );
		root.querySelectorAll( '.is-denied' ).forEach( ( el ) => el.classList.remove( 'is-denied' ) );
	}

	function block( field, items, index, owner ) {
		const conditional = field.conditions && field.conditions.enabled;
		const el = h( 'div', {
			class: 'rfb-cv-item rfb-cv-' + field.type + ( selected === field._id ? ' is-selected' : '' ) + ( selected === field._id && previewState ? ' is-force' : '' ) + ' rfb-w-' + field.width,
			draggable: 'true', 'data-id': field._id, 'data-rfb-key': field.key,
			onClick: ( e ) => {
				e.stopPropagation();
				selected = field._id;
				tab = 'field';
				expand( 'right' );
				renderBuild();
			},
			onDragstart: ( e ) => {
				e.stopPropagation();
				drag = { kind: 'move', id: field._id, type: field.type };
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData( 'text/plain', field.key );
				requestAnimationFrame( () => el.classList.add( 'is-dragging' ) );
			},
			onDragend: () => {
				drag = null;
				clearLines();
				el.classList.remove( 'is-dragging' );
			},
		} );
		const button = ( label, symbol, action, extra = '' ) => h( 'button', { type: 'button', class: 'rfb-icon-btn ' + extra, 'aria-label': label, title: label, onClick: ( e ) => { e.stopPropagation(); action(); } }, symbol );
		const bar = h( 'div', { class: 'rfb-cv-bar' },
			h( 'span', { class: 'rfb-cv-handle', 'aria-hidden': 'true', title: __( 'Drag to move', 'refraction' ) }, '⋮⋮' ),
			h( 'span', { class: 'rfb-cv-type' }, typeLabels[ field.type ] || field.type ),
			conditional ? h( 'span', { class: 'rfb-badge rfb-badge-light-info' }, __( 'Conditional', 'refraction' ) ) : null,
			field.required ? h( 'span', { class: 'rfb-badge rfb-badge-light-danger' }, __( 'Required', 'refraction' ) ) : null,
			h( 'span', { class: 'rfb-cv-actions' },
				button( sprintf( __( 'Move %s up', 'refraction' ), field.label ), '↑', () => index > 0 && move( field._id, owner, index - 1 ) ),
				button( sprintf( __( 'Move %s down', 'refraction' ), field.label ), '↓', () => index < items.length - 1 && move( field._id, owner, index + 2 ) ),
				button( sprintf( __( 'Duplicate %s', 'refraction' ), field.label ), '⧉', () => insert( clone( field ), owner, index + 1 ) ),
				button( sprintf( __( 'Delete %s', 'refraction' ), field.label ), '✕', () => removeField( field ), 'rfb-icon-danger' ) ) );

		el.append( bar );

		if ( isContainer( field.type ) ) {
			el.append( h( 'div', { class: 'rfb-cv-container' }, h( 'strong', { class: 'rfb-cv-title' + ( field.hide_label ? ' is-faint' : '' ) }, field.label, 'repeater' === field.type ? ' · ' + __( 'repeats', 'refraction' ) : '', field.hide_label ? ' ' + __( '(title hidden on the form)', 'refraction' ) : '' ), field.description ? h( 'p', { class: 'rfb-description' }, field.description ) : null, list( field.children, field ) ) );
		} else {
			el.append( h( 'div', { class: 'rfb-cv-preview-body', 'aria-hidden': 'true' }, faux( field ) ) );
		}

		return el;
	}

	function removeField( field ) {
		const found = find( field._id );

		if ( ! found ) {
			return;
		}

		const count = all( [ field ] ).length;

		if ( count > 1 && ! window.confirm( sprintf( __( 'Delete %s and the %d fields inside it?', 'refraction' ), field.label, count - 1 ) ) ) { // eslint-disable-line no-alert
			return;
		}

		found.list.splice( found.index, 1 );
		selected = null;
		markDirty();
		renderBuild();
		announce( sprintf( __( '%s deleted.', 'refraction' ), field.label ) );
	}

	function renderCanvasOnly() {
		updateFieldCss();

		if ( refs.canvas ) {
			const scroll = refs.canvas.parentElement.scrollTop;

			refs.canvas.replaceChildren( list( state.fields, null ) );
			refs.canvas.parentElement.scrollTop = scroll;
		}
	}

	// ---------------------------------------------------------------- inspector

	function conditionsEditor( field ) {
		const c = field.conditions;
		const candidates = all().filter( ( f ) => hasValue( f.type ) && ! isContainer( f.type ) && 'file' !== f.type && f !== field );
		const wrapper = h( 'div', { class: 'rfb-rules' } );
		const refresh = () => {
			renderInspector();
			renderCanvasOnly();
		};

		wrapper.append( toggle( c, 'enabled', __( 'Show or hide this field depending on other answers', 'refraction' ), null, refresh ) );

		if ( ! c.enabled ) {
			return wrapper;
		}

		if ( ! candidates.length ) {
			wrapper.append( h( 'p', { class: 'rfb-help' }, __( 'Add another field first: a rule needs a field to look at.', 'refraction' ) ) );
			return wrapper;
		}

		wrapper.append( h( 'div', { class: 'rfb-inline' }, select( c, 'action', { show: __( 'Show', 'refraction' ), hide: __( 'Hide', 'refraction' ) }, { label: __( 'Show or hide', 'refraction' ) } ), h( 'span', null, __( 'this field when', 'refraction' ) ), select( c, 'match', { all: __( 'all', 'refraction' ), any: __( 'any', 'refraction' ) }, { label: __( 'Match all or any rule', 'refraction' ) } ), h( 'span', null, __( 'of these match:', 'refraction' ) ) ) );

		c.rules.forEach( ( rule, i ) => {
			const source = candidates.find( ( f ) => f.key === rule.field );
			const needsValue = ! [ 'empty', 'not_empty' ].includes( rule.op );
			const valueControl = source && [ 'select', 'radio', 'checkbox' ].includes( source.type ) && needsValue
				? select( rule, 'value', Object.fromEntries( [ [ '', __( 'Choose...', 'refraction' ) ], ...source.options.map( ( o ) => [ o.value, o.label ] ) ] ), { label: __( 'Value to compare with', 'refraction' ) } )
				: ( source && 'toggle' === source.type && needsValue ? select( rule, 'value', { 1: __( 'On', 'refraction' ), 0: __( 'Off', 'refraction' ) }, { label: __( 'Value to compare with', 'refraction' ) } ) : text( rule, 'value', { placeholder: __( 'value', 'refraction' ), label: __( 'Value to compare with', 'refraction' ) } ) );

			wrapper.append( h( 'div', { class: 'rfb-rule' },
				select( rule, 'field', Object.fromEntries( candidates.map( ( f ) => [ f.key, f.label ] ) ), { after: refresh, label: __( 'Field to look at', 'refraction' ) } ),
				select( rule, 'op', config.operators, { after: refresh, label: __( 'Condition', 'refraction' ) } ),
				needsValue ? valueControl : null,
				h( 'button', { type: 'button', class: 'rfb-icon-btn rfb-icon-danger', 'aria-label': __( 'Remove rule', 'refraction' ), onClick: () => { c.rules.splice( i, 1 ); markDirty(); refresh(); } }, '✕' ) ) );
		} );

		wrapper.append( h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary', onClick: () => {
			c.rules.push( { field: candidates[ 0 ].key, op: 'equals', value: '' } );
			markDirty();
			refresh();
		} }, __( 'Add rule', 'refraction' ) ) );

		return wrapper;
	}

	/** Image block settings: pick from the media library, size, width, alignment, alt text and link. */
	function imageControls( f, after, rerender ) {
		const choose = h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary', onClick: () => {
			if ( ! window.wp || ! window.wp.media ) {
				return;
			}

			const frame = window.wp.media( { title: __( 'Choose an image', 'refraction' ), library: { type: 'image' }, button: { text: __( 'Use this image', 'refraction' ) }, multiple: false } );

			frame.on( 'select', () => {
				const picked = frame.state().get( 'selection' ).first().toJSON();

				f.image_id = picked.id;
				f.image_url = ( picked.sizes && picked.sizes.medium ? picked.sizes.medium.url : picked.url );
				f.image_alt = f.image_alt || picked.alt || '';
				markDirty();
				rerender();
			} );
			frame.open();
		} }, f.image_id ? __( 'Change image', 'refraction' ) : __( 'Choose image', 'refraction' ) );
		const remove = f.image_id ? h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-danger', onClick: () => { f.image_id = 0; f.image_url = ''; markDirty(); rerender(); } }, __( 'Remove', 'refraction' ) ) : null;

		return h( 'div', { class: 'rfb-image-controls' },
			h( 'div', { class: 'rfb-image-preview' }, f.image_url ? h( 'img', { src: f.image_url, alt: '' } ) : h( 'span', { class: 'rfb-help' }, __( 'No image chosen yet.', 'refraction' ) ) ),
			h( 'div', { class: 'rfb-inline' }, choose, remove ),
			row( __( 'Size', 'refraction' ), select( f, 'image_size', { thumbnail: __( 'Thumbnail', 'refraction' ), medium: __( 'Medium', 'refraction' ), large: __( 'Large', 'refraction' ), full: __( 'Full', 'refraction' ) }, { after } ) ),
			row( __( 'Width (% of the form)', 'refraction' ), text( f, 'image_width', { type: 'number', number: true, min: 5, max: 100, after } ) ),
			row( __( 'Alignment', 'refraction' ), select( f, 'image_align', { left: __( 'Left', 'refraction' ), center: __( 'Center', 'refraction' ), right: __( 'Right', 'refraction' ) }, { after } ) ),
			row( __( 'Alternative text', 'refraction' ), text( f, 'image_alt', { after } ), __( 'Describe the image for people who can not see it. Leave empty for a purely decorative logo.', 'refraction' ) ),
			row( __( 'Link (optional)', 'refraction' ), text( f, 'image_link', { type: 'url', placeholder: 'https://' } ) ) );
	}

	// ---------------------------------------------------------------- per-field styling (the Style sub-tab of a field)

	const FS_LABELS = {
		bg: __( 'Background color', 'refraction' ), border_style: __( 'Border style', 'refraction' ), border_width: __( 'Border width (px)', 'refraction' ), border_color: __( 'Border color', 'refraction' ),
		radius: __( 'Border radius (px)', 'refraction' ), shadow: __( 'Box shadow', 'refraction' ), align: __( 'Alignment', 'refraction' ),
		h_bg: __( 'Background color', 'refraction' ), h_border_color: __( 'Border color', 'refraction' ), h_shadow: __( 'Box shadow', 'refraction' ),
		l_color: __( 'Text color', 'refraction' ), l_family: __( 'Font', 'refraction' ), l_size: __( 'Size (px)', 'refraction' ), l_weight: __( 'Weight', 'refraction' ),
		l_transform: __( 'Capitalization', 'refraction' ), l_spacing: __( 'Letter spacing (px)', 'refraction' ), l_height: __( 'Line height (%)', 'refraction' ), l_italic: __( 'Italic', 'refraction' ),
		c_color: __( 'Text color', 'refraction' ), c_bg: __( 'Background color', 'refraction' ), c_border_style: __( 'Border style', 'refraction' ), c_border_width: __( 'Border width (px)', 'refraction' ),
		c_border_color: __( 'Border color', 'refraction' ), c_radius: __( 'Border radius (px)', 'refraction' ), c_shadow: __( 'Box shadow', 'refraction' ), c_family: __( 'Font', 'refraction' ),
		c_size: __( 'Text size (px)', 'refraction' ), c_weight: __( 'Text weight', 'refraction' ), c_pad_y: __( 'Padding above and below (px)', 'refraction' ), c_pad_x: __( 'Padding left and right (px)', 'refraction' ),
		ch_color: __( 'Text color', 'refraction' ), ch_bg: __( 'Background color', 'refraction' ), ch_border_color: __( 'Border color', 'refraction' ), ch_shadow: __( 'Box shadow', 'refraction' ),
		cf_border_color: __( 'Border color', 'refraction' ), cf_shadow: __( 'Box shadow', 'refraction' ),
		d_color: __( 'Text color', 'refraction' ), d_size: __( 'Size (px)', 'refraction' ), d_italic: __( 'Italic', 'refraction' ),
		b_bg: __( 'Background color', 'refraction' ), b_color: __( 'Text color', 'refraction' ), b_border_color: __( 'Border color', 'refraction' ), b_radius: __( 'Border radius (px)', 'refraction' ),
		b_on_bg: __( 'Background color', 'refraction' ), b_on_color: __( 'Text color', 'refraction' ), b_on_border_color: __( 'Border color', 'refraction' ),
	};

	const FS_ENUMS = {
		border_style: { none: __( 'None', 'refraction' ), solid: __( 'Solid', 'refraction' ), dashed: __( 'Dashed', 'refraction' ), dotted: __( 'Dotted', 'refraction' ), double: __( 'Double', 'refraction' ) },
		shadow: { none: __( 'None', 'refraction' ), soft: __( 'Soft', 'refraction' ), medium: __( 'Medium', 'refraction' ), strong: __( 'Strong', 'refraction' ) },
		align: { left: __( 'Left', 'refraction' ), center: __( 'Center', 'refraction' ), right: __( 'Right', 'refraction' ), justify: __( 'Justify', 'refraction' ) },
		family: { inherit: __( 'Same as the form', 'refraction' ), system: __( 'System', 'refraction' ), serif: __( 'Serif', 'refraction' ), mono: __( 'Monospace', 'refraction' ) },
		weight: { 300: __( 'Light', 'refraction' ), 400: __( 'Normal', 'refraction' ), 500: __( 'Medium', 'refraction' ), 600: __( 'Semi-bold', 'refraction' ), 700: __( 'Bold', 'refraction' ), 800: __( 'Extra bold', 'refraction' ), 900: __( 'Black', 'refraction' ) },
		transform: { none: __( 'None', 'refraction' ), uppercase: __( 'UPPERCASE', 'refraction' ), lowercase: __( 'lowercase', 'refraction' ), capitalize: __( 'Capitalize', 'refraction' ) },
	};

	/** The label of a style group depends on what the field is: a heading has "text", a divider has a "line". */
	function fsGroupTitle( group, type ) {
		const titles = {
			box: __( 'Spacing, background and border', 'refraction' ), box_hover: __( 'Hover: the whole field', 'refraction' ),
			label: [ 'heading', 'paragraph' ].includes( type ) ? __( 'Text', 'refraction' ) : ( [ 'step', 'group', 'repeater' ].includes( type ) ? __( 'Title', 'refraction' ) : __( 'Label', 'refraction' ) ),
			control: { divider: __( 'Line', 'refraction' ), image: __( 'Image', 'refraction' ), html: __( 'HTML block', 'refraction' ), signature: __( 'Signature pad', 'refraction' ), file: __( 'File box', 'refraction' ) }[ type ] || __( 'Input', 'refraction' ),
			control_hover: __( 'Hover: the input', 'refraction' ), control_focus: __( 'Focus: the input', 'refraction' ), desc: __( 'Description and help', 'refraction' ),
			choice: __( 'Buttons', 'refraction' ), choice_on: __( 'Selected button', 'refraction' ),
		};

		return titles[ group ];
	}

	/** Declarations per group for one field: the same table the server uses (Classes\Field_Style), so the canvas matches the page. */
	function fsDeclarations( style ) {
		const cfg = config.fieldStyle;
		const groups = {};

		Object.entries( style ).forEach( ( [ key, value ] ) => {
			const prop = cfg.properties[ key ];

			if ( ! prop ) {
				return;
			}

			let text = String( value );

			if ( 'int' === prop.kind ) {
				text = 'pct' === prop.unit ? String( Math.round( value ) / 100 ) : value + 'px';
			} else if ( 'bool' === prop.kind ) {
				text = 'italic';
			} else if ( 'box-shadow' === prop.css ) {
				text = cfg.shadows[ value ];
			} else if ( 'font-family' === prop.css ) {
				text = cfg.fonts[ value ];
			}

			groups[ prop.group ] = ( groups[ prop.group ] || '' ) + prop.css + ':' + text + ';';
		} );

		[ [ 'box', 'border_style', 'border_width' ], [ 'control', 'c_border_style', 'c_border_width' ] ].forEach( ( [ group, styleKey, widthKey ] ) => {
			if ( ! groups[ group ] ) {
				return;
			}

			if ( undefined !== style[ widthKey ] && undefined === style[ styleKey ] ) {
				groups[ group ] += 'border-style:solid;';
			} else if ( undefined !== style[ styleKey ] && undefined === style[ widthKey ] && 'none' !== style[ styleKey ] ) {
				groups[ group ] += 'border-width:1px;';
			}
		} );

		return groups;
	}

	/** Writes the styling of every field into the canvas, so you see it while you edit (hover and focus too, for the selected field if asked). */
	function updateFieldCss() {
		if ( ! refs.fieldCss || ! config.fieldStyle ) {
			return;
		}

		const cfg = config.fieldStyle;
		const parts = Object.assign( {}, cfg.parts, { box: '> .rfb-cv-preview-body, > .rfb-cv-container', box_hover: '> .rfb-cv-preview-body:hover, > .rfb-cv-container:hover', choice: '.rfb-choice-buttons .rfb-check', choice_on: '.rfb-choice-buttons .rfb-check:has(input:checked)' } );
		const interactive = [ 'box_hover', 'control_hover', 'control_focus' ];
		let css = '';

		all().forEach( ( field ) => {
			if ( ! field.style || ! Object.keys( field.style ).length ) {
				return;
			}

			const base = '.rfb-canvas [data-rfb-key="' + String( field.key ).replace( /[^a-z0-9_-]/g, '' ) + '"]';

			Object.entries( fsDeclarations( field.style ) ).forEach( ( [ group, declarations ] ) => {
				const list = parts[ group ].split( ',' ).map( ( s ) => s.trim() );
				const selectors = list.map( ( s ) => base + ( '' === s ? '' : ( s.startsWith( ':' ) ? s : ( s.startsWith( '&' ) ? s.slice( 1 ) : ' ' + s ) ) ) );

				if ( interactive.includes( group ) ) {
					// "Preview hover and focus": the same rule, as if the pointer were on the selected field.
					list.forEach( ( s ) => selectors.push( base + '.is-force' + ( '' === s ? '' : ' ' + s.replace( /:(hover|focus-visible|focus)\b/g, '' ) ) ) );
				}

				css += selectors.join( ', ' ) + '{' + declarations + '}';
			} );
		} );

		refs.fieldCss.textContent = css;
	}

	function fsColor( style, key, after ) {
		const hex = h( 'input', { class: 'rfb-input rfb-hex', type: 'text', maxlength: 11, placeholder: __( 'default', 'refraction' ), 'aria-label': FS_LABELS[ key ] + ' (hex)', value: style[ key ] || '' } );
		const picker = h( 'input', { type: 'color', 'aria-label': FS_LABELS[ key ], value: /^#[0-9a-f]{6}$/.test( style[ key ] || '' ) ? style[ key ] : '#ffffff' } );
		const set = ( value ) => {
			if ( value ) {
				style[ key ] = value;
			} else {
				delete style[ key ];
			}

			markDirty();
			after();
		};

		picker.addEventListener( 'input', () => { hex.value = picker.value; set( picker.value ); } );
		hex.addEventListener( 'input', () => {
			if ( '' === hex.value || 'transparent' === hex.value || /^#[0-9a-fA-F]{6}$/.test( hex.value ) ) {
				set( hex.value.toLowerCase() );

				if ( /^#/.test( hex.value ) ) {
					picker.value = hex.value;
				}
			}
		} );

		return h( 'div', { class: 'rfb-field rfb-w-full rfb-color' }, h( 'span', { class: 'rfb-mini' }, FS_LABELS[ key ] ), h( 'div', { class: 'rfb-color-row' }, picker, hex, h( 'button', { type: 'button', class: 'rfb-icon-btn', 'aria-label': sprintf( __( 'Reset %s', 'refraction' ), FS_LABELS[ key ] ), title: __( 'Reset', 'refraction' ), onClick: () => { hex.value = ''; set( '' ); } }, '↺' ) ) );
	}

	function fsNumber( style, key, prop, label, after ) {
		const input = h( 'input', { class: 'rfb-input', type: 'number', min: prop.min, max: prop.max, placeholder: '–', 'aria-label': label, value: undefined === style[ key ] ? '' : style[ key ] } );

		input.addEventListener( 'input', () => {
			if ( '' === input.value ) {
				delete style[ key ];
			} else {
				style[ key ] = Math.max( prop.min, Math.min( prop.max, Math.round( Number( input.value ) ) ) );
			}

			markDirty();
			after();
		} );

		return input;
	}

	function fsControl( style, key, after ) {
		const prop = config.fieldStyle.properties[ key ];

		if ( 'color' === prop.kind ) {
			return fsColor( style, key, after );
		}

		if ( 'int' === prop.kind ) {
			return row( FS_LABELS[ key ], fsNumber( style, key, prop, FS_LABELS[ key ], after ) );
		}

		if ( 'bool' === prop.kind ) {
			return h( 'label', { class: 'rfb-check' }, h( 'input', { type: 'checkbox', checked: !! style[ key ], onChange: ( e ) => {
				if ( e.target.checked ) {
					style[ key ] = true;
				} else {
					delete style[ key ];
				}

				markDirty();
				after();
			} } ), h( 'span', null, FS_LABELS[ key ] ) );
		}

		const labels = FS_ENUMS[ key ] || FS_ENUMS[ key.replace( /^(?:b_on|ch|cf|[lchdb])_/, '' ) ] || Object.fromEntries( prop.values.map( ( v ) => [ v, v ] ) );
		const choose = h( 'select', { class: 'rfb-input', 'aria-label': FS_LABELS[ key ], onChange: ( e ) => {
			if ( '' === e.target.value ) {
				delete style[ key ];
			} else {
				style[ key ] = e.target.value;
			}

			markDirty();
			after();
		} }, h( 'option', { value: '' }, __( 'Default', 'refraction' ) ), prop.values.map( ( v ) => h( 'option', { value: String( v ), selected: String( style[ key ] ) === String( v ) }, labels[ v ] || v ) ) );

		return row( FS_LABELS[ key ], choose );
	}

	/** Margin and padding as four boxes: top, right, bottom, left. */
	function fsSides( style, prefix, title, after ) {
		const sides = [ [ 'top', __( 'Top', 'refraction' ) ], [ 'right', __( 'Right', 'refraction' ) ], [ 'bottom', __( 'Bottom', 'refraction' ) ], [ 'left', __( 'Left', 'refraction' ) ] ];

		return h( 'fieldset', { class: 'rfb-choice rfb-sides' }, h( 'legend', { class: 'rfb-mini' }, title + ' (px)' ), h( 'div', { class: 'rfb-sides-row' }, sides.map( ( [ edge, label ] ) => h( 'label', { class: 'rfb-side-box' }, fsNumber( style, prefix + '_' + edge, config.fieldStyle.properties[ prefix + '_' + edge ], title + ' ' + label.toLowerCase(), after ), h( 'span', { class: 'rfb-sublabel' }, label ) ) ) ) );
	}

	function fieldStylePanel( f ) {
		const cfg = config.fieldStyle;
		const groups = Object.keys( cfg.applies ).filter( ( g ) => '*' === cfg.applies[ g ] || cfg.applies[ g ].includes( f.type ) );
		const style = f.style || ( f.style = {} );
		const panel = h( 'div', { class: 'rfb-fieldstyle' } );
		const choiceLook = 'buttons' === style.choice_look;
		const after = () => {
			renderCanvasOnly();
		};
		const reset = () => {
			f.style = {};
			markDirty();
			renderInspector();
			renderCanvasOnly();
		};

		panel.append( h( 'label', { class: 'rfb-check rfb-preview-state' }, h( 'input', { type: 'checkbox', checked: previewState, onChange: ( e ) => { previewState = e.target.checked; renderCanvasOnly(); } } ), h( 'span', null, __( 'Show hover and focus on the form', 'refraction' ) ) ) );

		groups.forEach( ( group ) => {
			if ( ( 'choice' === group || 'choice_on' === group ) && ! choiceLook ) {
				return;
			}

			const keys = Object.keys( cfg.properties ).filter( ( k ) => cfg.properties[ k ].group === group );
			const controls = [];

			if ( 'box' === group ) {
				controls.push( fsSides( style, 'margin', __( 'Margin', 'refraction' ), after ), fsSides( style, 'padding', __( 'Padding', 'refraction' ), after ) );
			}

			keys.filter( ( k ) => ! /^(margin|padding)_/.test( k ) ).forEach( ( k ) => controls.push( fsControl( style, k, after ) ) );
			panel.append( section( fsGroupTitle( group, f.type ), controls ) );
		} );

		if ( [ 'radio', 'checkbox' ].includes( f.type ) ) {
			const look = h( 'select', { class: 'rfb-input', 'aria-label': __( 'Choice look', 'refraction' ), onChange: ( e ) => {
				if ( 'buttons' === e.target.value ) {
					style.choice_look = 'buttons';
				} else {
					delete style.choice_look;
				}

				markDirty();
				renderInspector();
				renderCanvasOnly();
			} }, h( 'option', { value: 'default' }, __( 'Plain list', 'refraction' ) ), h( 'option', { value: 'buttons', selected: choiceLook }, __( 'Buttons (like Yes / No)', 'refraction' ) ) );

			panel.prepend( section( __( 'Choice look', 'refraction' ), row( __( 'Show the choices as', 'refraction' ), look ) ) );
		}

		panel.append( h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light', onClick: reset }, __( 'Reset this field\'s style', 'refraction' ) ) );

		return panel;
	}

	function renderInspector() {
		const box = refs.rbody;
		const found = selected ? find( selected ) : null;

		box.replaceChildren();

		if ( ! found ) {
			box.append( h( 'div', { class: 'rfb-inspector-empty' }, h( 'strong', null, __( 'Field settings', 'refraction' ) ), h( 'p', null, __( 'Select a field on the form to change its label, rules, visibility and look.', 'refraction' ) ) ) );
			return;
		}

		const f = found.field;
		const t = f.type;
		const after = renderCanvasOnly;
		const rerender = () => {
			renderInspector();
			renderCanvasOnly();
		};

		box.append( h( 'div', { class: 'rfb-inspector-head' }, h( 'strong', null, typeLabels[ t ] || t ), h( 'code', null, f.key ) ) );
		box.append( h( 'div', { class: 'rfb-field-tabs', role: 'tablist', 'aria-label': __( 'Field options', 'refraction' ) }, [ [ 'settings', __( 'Settings', 'refraction' ) ], [ 'style', __( 'Style', 'refraction' ) ] ].map( ( [ id, label ] ) => h( 'button', {
			type: 'button', role: 'tab', class: 'rfb-field-tab' + ( fieldTab === id ? ' is-active' : '' ), 'aria-selected': String( fieldTab === id ), 'data-fieldtab': id,
			onClick: () => { fieldTab = id; renderInspector(); },
		}, label ) ) ) );

		if ( 'style' === fieldTab ) {
			box.append( fieldStylePanel( f ) );
			return;
		}

		// General.
		const general = [];

		if ( 'divider' !== t ) {
			general.push( row( 'step' === t ? __( 'Step title', 'refraction' ) : ( isLayout( t ) ? __( 'Name in the builder', 'refraction' ) : __( 'Label', 'refraction' ) ), text( f, 'label', { after: () => {
				if ( f._auto && f.label.trim() ) {
					renameKey( f, uniqueKey( f.label, f ) );
					const code = box.querySelector( '.rfb-inspector-head code' );
					const keyInput = box.querySelector( '.rfb-key-input' );

					if ( code ) {
						code.textContent = f.key;
					}

					if ( keyInput ) {
						keyInput.value = f.key;
					}
				}

				after();
			} } ) ) );
		}

		// Title options for the structure blocks, shown or hidden on the form and written as the tag you choose.
		if ( 'step' === t || isContainer( t ) ) {
			general.push(
				h( 'label', { class: 'rfb-check' }, h( 'input', { type: 'checkbox', checked: ! f.hide_label, onChange: ( e ) => { f.hide_label = ! e.target.checked; markDirty(); renderCanvasOnly(); } } ), h( 'span', null, __( 'Show the title on the form', 'refraction' ) ) ),
				row( __( 'Title tag', 'refraction' ), select( f, 'label_tag', { div: 'div', p: 'p', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6' }, { after } ), __( 'Pick a heading level for headings, or p / div for plain text.', 'refraction' ) )
			);
		}

		if ( ( hasValue( t ) && 'hidden' !== t ) || 'step' === t ) {
			general.push( row( __( 'Description', 'refraction' ), area( f, 'description', { rows: 2, after } ), __( 'Shown under the label.', 'refraction' ) ) );
		}

		if ( 'image' === t ) {
			general.push( imageControls( f, after, rerender ) );
		}

		if ( 'name' === t ) {
			general.push( h( 'fieldset', { class: 'rfb-choice' }, h( 'legend', { class: 'rfb-mini' }, __( 'Parts of the name', 'refraction' ) ), h( 'div', { class: 'rfb-types' }, [ [ 'prefix', __( 'Prefix', 'refraction' ) ], [ 'first', __( 'First name', 'refraction' ) ], [ 'middle', __( 'Middle name', 'refraction' ) ], [ 'last', __( 'Last name', 'refraction' ) ] ].map( ( [ part, label ] ) => h( 'label', { class: 'rfb-check' }, h( 'input', { type: 'checkbox', checked: f.parts.includes( part ), onChange: ( e ) => {
				const order = [ 'prefix', 'first', 'middle', 'last' ];
				const next = e.target.checked ? [ ...f.parts, part ] : f.parts.filter( ( x ) => x !== part );

				f.parts = order.filter( ( x ) => next.includes( x ) );
				markDirty();
				renderCanvasOnly();
			} } ), h( 'span', null, label ) ) ) ) ) );
		}

		if ( 'signature' === t ) {
			general.push( row( __( 'Text on the pad', 'refraction' ), text( f, 'placeholder', { after } ) ), row( __( 'Pad height (px)', 'refraction' ), text( f, 'sig_height', { type: 'number', number: true, min: 100, max: 400, after } ), __( 'Visitors draw with a mouse, finger or pen. Saved as a private image.', 'refraction' ) ) );
		}

		if ( 'country' === t ) {
			general.push( row( __( 'Pre-selected country', 'refraction' ), select( f, 'default', Object.assign( { '': __( 'None', 'refraction' ) }, config.countries ), { after } ) ) );
		}

		if ( 'heading' === t ) {
			general.push( row( __( 'Heading text', 'refraction' ), text( f, 'content', { after } ) ), row( __( 'Level', 'refraction' ), select( f, 'level', { 2: 'H2', 3: 'H3', 4: 'H4', 5: 'H5', 6: 'H6' }, { number: true, after } ) ) );
		} else if ( 'paragraph' === t ) {
			general.push( row( __( 'Text', 'refraction' ), area( f, 'content', { after } ) ) );
		} else if ( 'html' === t ) {
			general.push( row( __( 'HTML', 'refraction' ), area( f, 'content', { rows: 8, after } ), __( 'Scripts and event handlers are removed when you save.', 'refraction' ) ) );
		}

		if ( hasValue( t ) && 'hidden' !== t && ! isContainer( t ) ) {
			general.push( check( f, 'required', __( 'Required', 'refraction' ), { after: rerender } ) );
		}

		if ( [ 'text', 'textarea', 'email', 'phone', 'url', 'number', 'currency', 'select' ].includes( t ) ) {
			general.push( row( __( 'Placeholder', 'refraction' ), text( f, 'placeholder', { after } ) ) );
		}

		if ( hasValue( t ) && 'hidden' !== t ) {
			general.push( row( __( 'Help text', 'refraction' ), text( f, 'help', { after } ) ) );
		}

		if ( 'hidden' === t ) {
			general.push( row( __( 'Value comes from', 'refraction' ), select( f, 'source', config.hiddenSources, { after: rerender } ) ) );
		}

		if ( hasValue( t ) && ! isContainer( t ) && ! [ 'file', 'name', 'signature', 'country' ].includes( t ) ) {
			general.push( row( 'hidden' === t && 'query' === f.source ? __( 'URL parameter name', 'refraction' ) : ( 'hidden' === t ? __( 'Fixed value', 'refraction' ) : __( 'Default value', 'refraction' ) ), text( f, 'default', { after } ) ) );
		}

		if ( hasValue( t ) ) {
			const keyRow = row( __( 'Field key', 'refraction' ), text( f, 'key', { after: () => { f._auto = false; renameKey( f, slugKey( f.key ) ); } } ), __( 'Used in exports, rules and webhooks. Changing it does not move answers already saved.', 'refraction' ) );

			keyRow.querySelector( 'input' ).classList.add( 'rfb-key-input' );
			general.push( keyRow );
		}

		box.append( section( __( 'General', 'refraction' ), general ) );

		// Choices.
		if ( hasOptions( t ) ) {
			const optionsArea = h( 'textarea', { class: 'rfb-input', rows: 6, onInput: ( e ) => {
				const seen = new Set();

				f.options = e.target.value.split( /\r?\n/ ).map( ( line ) => {
					const parts = line.split( '|' );

					return { value: ( parts.length > 1 ? parts[ 0 ] : parts[ 0 ] ).trim(), label: ( parts.length > 1 ? parts.slice( 1 ).join( '|' ) : parts[ 0 ] ).trim() };
				} ).filter( ( o ) => o.label && ! seen.has( o.value || o.label ) && seen.add( o.value || o.label ) ).map( ( o ) => ( { value: o.value || o.label, label: o.label } ) );
				markDirty();
				renderCanvasOnly();
			} }, f.options.map( ( o ) => ( o.value === o.label ? o.label : o.value + '|' + o.label ) ).join( '\n' ) );

			box.append( section( __( 'Choices', 'refraction' ), row( __( 'One per line, or value|Label', 'refraction' ), optionsArea ) ) );
		}

		// Validation and limits.
		const limits = [];

		if ( [ 'number', 'currency' ].includes( t ) ) {
			limits.push( h( 'div', { class: 'rfb-inline' }, row( __( 'Lowest', 'refraction' ), text( f, 'min', { type: 'number', number: true, step: 'any' } ) ), row( __( 'Highest', 'refraction' ), text( f, 'max', { type: 'number', number: true, step: 'any' } ) ) ) );
		}

		if ( 'file' === t ) {
			limits.push( h( 'fieldset', { class: 'rfb-choice' }, h( 'legend', { class: 'rfb-mini' }, __( 'Allowed file types', 'refraction' ) ), h( 'div', { class: 'rfb-types' }, config.fileTypes.map( ( ext ) => h( 'label', { class: 'rfb-check' }, h( 'input', { type: 'checkbox', checked: f.accept.includes( ext ), onChange: ( e ) => {
				f.accept = e.target.checked ? [ ...f.accept, ext ] : f.accept.filter( ( x ) => x !== ext );
				markDirty();
				renderCanvasOnly();
			} } ), h( 'span', null, ext ) ) ) ) ),
			h( 'div', { class: 'rfb-inline' }, row( __( 'Max size (MB)', 'refraction' ), text( f, 'max_size', { type: 'number', number: true, min: 0.1, max: 64, step: 'any' } ) ), row( __( 'Max files', 'refraction' ), text( f, 'max_files', { type: 'number', number: true, min: 1, max: 10 } ) ) ),
			h( 'p', { class: 'rfb-help' }, __( 'Uploads are private: only administrators can download them.', 'refraction' ) ) );
		}

		if ( 'repeater' === t ) {
			limits.push( h( 'div', { class: 'rfb-inline' }, row( __( 'Minimum rows', 'refraction' ), text( f, 'min_rows', { type: 'number', number: true, min: 0, max: 20 } ) ), row( __( 'Maximum rows', 'refraction' ), text( f, 'max_rows', { type: 'number', number: true, min: 1, max: 50 } ) ) ), row( __( 'Add button text', 'refraction' ), text( f, 'add_label' ) ), check( f, 'required', __( 'At least one row is required', 'refraction' ) ) );
		}

		if ( limits.length ) {
			box.append( section( 'file' === t ? __( 'Upload rules', 'refraction' ) : ( 'repeater' === t ? __( 'Rows', 'refraction' ) : __( 'Limits', 'refraction' ) ), limits ) );
		}

		// Visibility rules.
		if ( 'step' !== t ) {
			box.append( section( __( 'Conditional visibility', 'refraction' ), conditionsEditor( f ) ) );
		}

		// Layout and table.
		const look = [];

		if ( 'step' !== t && 'divider' !== t ) {
			look.push( row( __( 'Width', 'refraction' ), select( f, 'width', { full: __( 'Full', 'refraction' ), half: __( 'Half', 'refraction' ), third: __( 'One third', 'refraction' ) }, { after: renderCanvasOnly } ) ) );
		}

		look.push( row( __( 'CSS class', 'refraction' ), text( f, 'css_class', { placeholder: 'my-class' } ), __( 'Added to the field wrapper so you can style it in Custom CSS.', 'refraction' ) ) );

		if ( hasValue( t ) && 'hidden' !== t && ! isContainer( t ) ) {
			look.push( check( f, 'hide_label', __( 'Hide the label (keeps it for screen readers)', 'refraction' ) ) );
		}

		if ( ( isScalar( t ) || 'name' === t ) && ! found.parent ) {
			look.push( check( f, 'in_table', __( 'Show as a column in the records table', 'refraction' ) ), check( f, 'public', __( 'Show publicly (in the public list)', 'refraction' ) ) );
		}

		if ( hasOptions( t ) && 'checkbox' !== t && ! found.parent ) {
			look.push( check( f, 'filter', __( 'Add a filter above the table', 'refraction' ) ) );
		}

		box.append( section( __( 'Appearance and table', 'refraction' ), look ) );
	}

	// ---------------------------------------------------------------- build tab

	/** Fields panel: collapsible groups of square tiles (icon above the name), like a page builder's widget list. */
	function palette() {
		const box = h( 'div', { class: 'rfb-palette' } );

		config.palette.forEach( ( group ) => {
			const grid = h( 'div', { class: 'rfb-palette-grid' } );

			Object.entries( group.types ).forEach( ( [ type, label ] ) => {
				const icon = h( 'span', { class: 'rfb-palette-icon', 'aria-hidden': 'true' } );

				icon.innerHTML = ( config.typeIcons && config.typeIcons[ type ] ) || ''; // Inline SVG from the plugin's own bundled icons.

				grid.append( h( 'button', {
					type: 'button', class: 'rfb-palette-item', draggable: 'true', 'data-type': type, title: label,
					onDragstart: ( e ) => {
						drag = { kind: 'new', type };
						e.dataTransfer.effectAllowed = 'copy';
						e.dataTransfer.setData( 'text/plain', type );
					},
					onDragend: () => {
						drag = null;
						clearLines();
					},
					onClick: () => {
						const current = selected ? find( selected ) : null;
						const owner = current && isContainer( current.field.type ) && canDrop( type, current.field ) ? current.field : null;

						insert( newField( type ), owner, owner ? owner.children.length : state.fields.length );
					},
				}, icon, h( 'span', { class: 'rfb-palette-label' }, label ) ) );
			} );
			box.append( h( 'details', { class: 'rfb-palette-group', open: true }, h( 'summary', null, group.label ), grid ) );
		} );

		return box;
	}

	function renderBuild() {
		renderCanvasOnly();
		renderRight();
	}

	// ---------------------------------------------------------------- workspace: fields | form | settings

	const TABS = [
		[ 'field', __( 'Field', 'refraction' ) ],
		[ 'style', __( 'Style', 'refraction' ) ],
		[ 'advanced', __( 'Advanced', 'refraction' ) ],
		[ 'general', __( 'General', 'refraction' ) ],
	];

	/** Remembers which side panels the person closed, per browser (a convenience; the page works without it). */
	const memory = {
		get: ( side ) => {
			try {
				return '1' === window.localStorage.getItem( 'refraction-fb-collapsed-' + side );
			} catch ( e ) {
				return false;
			}
		},
		set: ( side, value ) => {
			try {
				window.localStorage.setItem( 'refraction-fb-collapsed-' + side, value ? '1' : '0' );
			} catch ( e ) {} // eslint-disable-line no-empty
		},
	};

	function setCollapsed( side, collapsed ) {
		const panel = refs[ side ];

		refs.workspace.classList.toggle( 'is-' + side + '-collapsed', collapsed );
		panel.classList.toggle( 'is-collapsed', collapsed );
		panel.querySelector( '[data-collapse]' ).setAttribute( 'aria-expanded', String( ! collapsed ) );
		panel.querySelector( '.rfb-collapse-arrow' ).textContent = ( 'left' === side ) !== collapsed ? '‹' : '›';
		panel.querySelector( '.rfb-side-body' ).hidden = collapsed;
		memory.set( side, collapsed );
	}

	const expand = ( side ) => refs[ side ] && refs[ side ].classList.contains( 'is-collapsed' ) && setCollapsed( side, false );

	/** The edge button of a side panel: points toward the edge the panel folds into, and back out when folded. */
	function collapseButton( side, label ) {
		const folded = () => refs[ side ].classList.contains( 'is-collapsed' );

		return h( 'button', {
			type: 'button', class: 'rfb-collapse', 'data-collapse': side, 'aria-expanded': 'true', 'aria-controls': 'rfb-side-' + side,
			title: label, 'aria-label': label, onClick: () => {
				setCollapsed( side, ! folded() );
				announce( folded() ? sprintf( __( '%s panel hidden.', 'refraction' ), label ) : sprintf( __( '%s panel shown.', 'refraction' ), label ) );
			},
		}, h( 'span', { 'aria-hidden': 'true', class: 'rfb-collapse-arrow' }, 'left' === side ? '‹' : '›' ) );
	}

	function workspace() {
		refs.canvas = h( 'div', { class: 'rfb-canvas-inner' } );
		refs.fieldCss = h( 'style' );
		refs.canvasWrap = h( 'div', { class: 'rfb-canvas rfb-form rfb-front' }, refs.fieldCss, refs.canvas );
		applyStyle( refs.canvasWrap );
		refs.submit = h( 'span', { class: 'rfb-btn rfb-btn-primary', 'aria-hidden': 'true' }, state.settings.submit_text );

		refs.left = h( 'aside', { class: 'rfb-side rfb-left', id: 'rfb-side-left', 'aria-label': __( 'Field types', 'refraction' ) },
			h( 'div', { class: 'rfb-side-head' }, h( 'strong', { class: 'rfb-side-title' }, __( 'Fields', 'refraction' ) ), collapseButton( 'left', __( 'Fields', 'refraction' ) ) ),
			h( 'div', { class: 'rfb-side-body' }, h( 'p', { class: 'rfb-help' }, __( 'Drag a field onto the form, or press Enter on it.', 'refraction' ) ), palette() ) );

		refs.tabs = h( 'div', { class: 'rfb-side-tabs', role: 'tablist', 'aria-label': __( 'Settings sections', 'refraction' ) }, TABS.map( ( [ id, label ] ) => h( 'button', {
			type: 'button', role: 'tab', class: 'rfb-side-tab', 'data-tab': id, onClick: () => { tab = id; renderRight(); },
			onKeydown: ( e ) => {
				const order = TABS.map( ( x ) => x[ 0 ] );
				const at = order.indexOf( tab );
				const next = 'ArrowRight' === e.key ? order[ ( at + 1 ) % order.length ] : ( 'ArrowLeft' === e.key ? order[ ( at + order.length - 1 ) % order.length ] : null );

				if ( next ) {
					tab = next;
					renderRight();
					refs.tabs.querySelector( `[data-tab="${ next }"]` ).focus();
				}
			},
		}, label ) ) );
		refs.rbody = h( 'div', { class: 'rfb-side-panel rfb-inspector', role: 'tabpanel' } );
		refs.right = h( 'aside', { class: 'rfb-side rfb-right', id: 'rfb-side-right', 'aria-label': __( 'Settings', 'refraction' ) },
			h( 'div', { class: 'rfb-side-head' }, collapseButton( 'right', __( 'Settings', 'refraction' ) ), h( 'strong', { class: 'rfb-side-title' }, __( 'Settings', 'refraction' ) ) ),
			h( 'div', { class: 'rfb-side-body' }, refs.tabs, refs.rbody ) );

		refs.workspace = h( 'div', { class: 'rfb-workspace' },
			refs.left,
			h( 'div', { class: 'rfb-canvas-col' }, h( 'div', { class: 'rfb-canvas-scroll' }, refs.canvasWrap, h( 'div', { class: 'rfb-cv-submit' }, refs.submit ) ) ),
			refs.right );

		refs.workspace.addEventListener( 'click', ( event ) => {
			if ( event.target.closest( '.rfb-canvas-inner' ) && ! event.target.closest( '.rfb-cv-item' ) ) {
				selected = null;
				renderBuild();
			}
		} );

		return refs.workspace;
	}

	/** Draws the right panel for the current tab. */
	function renderRight() {
		if ( 'field' === tab ) {
			renderInspector();
		} else {
			refs.rbody.replaceChildren( 'style' === tab ? stylePanel() : ( 'advanced' === tab ? advancedPanel() : generalPanel() ) );
		}

		refs.tabs.querySelectorAll( '[role=tab]' ).forEach( ( button ) => {
			const on = button.dataset.tab === tab;

			button.setAttribute( 'aria-selected', String( on ) );
			button.tabIndex = on ? 0 : -1;
			button.classList.toggle( 'is-active', on );
		} );
	}

	// ---------------------------------------------------------------- style tab

	const STYLE_GROUPS = [
		[ __( 'Colors', 'refraction' ), [ 'primary', 'form_bg', 'text', 'muted', 'label_color', 'input_bg', 'input_border', 'input_text', 'focus', 'error' ] ],
		[ __( 'Typography', 'refraction' ), [ 'font_family', 'font_size', 'label_size', 'label_weight', 'label_position' ] ],
		[ __( 'Form box', 'refraction' ), [ 'width', 'padding', 'gap', 'shadow' ] ],
		[ __( 'Inputs', 'refraction' ), [ 'radius', 'input_height', 'border_width' ] ],
		[ __( 'Button', 'refraction' ), [ 'button_bg', 'button_text', 'button_size', 'button_align' ] ],
	];

	const STYLE_LABELS = {
		primary: __( 'Accent color', 'refraction' ), form_bg: __( 'Form background', 'refraction' ), text: __( 'Text color', 'refraction' ), muted: __( 'Help text color', 'refraction' ),
		label_color: __( 'Label color', 'refraction' ), input_bg: __( 'Input background', 'refraction' ), input_border: __( 'Input border', 'refraction' ), input_text: __( 'Input text', 'refraction' ),
		focus: __( 'Focus ring', 'refraction' ), error: __( 'Error color', 'refraction' ), font_family: __( 'Font', 'refraction' ), font_size: __( 'Text size (px)', 'refraction' ),
		label_size: __( 'Label size (px)', 'refraction' ), label_weight: __( 'Label weight', 'refraction' ), label_position: __( 'Label position', 'refraction' ),
		width: __( 'Max width (px, 0 = full)', 'refraction' ), padding: __( 'Padding (px)', 'refraction' ), gap: __( 'Space between fields (px)', 'refraction' ), shadow: __( 'Shadow', 'refraction' ),
		radius: __( 'Corner radius (px)', 'refraction' ), input_height: __( 'Input height (px)', 'refraction' ), border_width: __( 'Border width (px)', 'refraction' ),
		button_bg: __( 'Button color', 'refraction' ), button_text: __( 'Button text', 'refraction' ), button_size: __( 'Button size', 'refraction' ), button_align: __( 'Button position', 'refraction' ),
	};

	const ENUM_LABELS = {
		shadow: { none: __( 'None', 'refraction' ), soft: __( 'Soft', 'refraction' ), strong: __( 'Strong', 'refraction' ) },
		label_position: { top: __( 'Above the input', 'refraction' ), left: __( 'Beside the input', 'refraction' ), hidden: __( 'Hidden', 'refraction' ) },
		button_align: { left: __( 'Left', 'refraction' ), center: __( 'Center', 'refraction' ), right: __( 'Right', 'refraction' ), stretch: __( 'Full width', 'refraction' ) },
		button_size: { small: __( 'Small', 'refraction' ), medium: __( 'Medium', 'refraction' ), large: __( 'Large', 'refraction' ) },
		font_family: { inherit: __( 'Same as the site', 'refraction' ), system: __( 'System', 'refraction' ), serif: __( 'Serif', 'refraction' ), mono: __( 'Monospace', 'refraction' ) },
	};

	function styleControl( key ) {
		const spec = config.styleControls[ key ];
		const live = () => {
			applyStyle( refs.canvasWrap );
		};

		if ( 'color' === spec.type ) {
			const picker = h( 'input', { type: 'color', value: state.style[ key ], 'aria-label': STYLE_LABELS[ key ] } );
			const hex = h( 'input', { class: 'rfb-input rfb-hex', type: 'text', value: state.style[ key ], maxlength: 7, 'aria-label': STYLE_LABELS[ key ] + ' (hex)' } );

			picker.addEventListener( 'input', () => { state.style[ key ] = picker.value; hex.value = picker.value; markDirty(); live(); } );
			hex.addEventListener( 'input', () => {
				if ( /^#[0-9a-fA-F]{6}$/.test( hex.value ) ) {
					state.style[ key ] = hex.value.toLowerCase();
					picker.value = state.style[ key ];
					markDirty();
					live();
				}
			} );

			return h( 'div', { class: 'rfb-field rfb-w-half rfb-color' }, h( 'span', { class: 'rfb-mini' }, STYLE_LABELS[ key ] ), h( 'div', { class: 'rfb-color-row' }, picker, hex ) );
		}

		if ( 'int' === spec.type ) {
			const range = h( 'input', { type: 'range', min: spec.min, max: spec.max, value: state.style[ key ], 'aria-label': STYLE_LABELS[ key ] } );
			const number = h( 'input', { class: 'rfb-input rfb-num', type: 'number', min: spec.min, max: spec.max, value: state.style[ key ], 'aria-label': STYLE_LABELS[ key ] + ' (number)' } );
			const set = ( value ) => {
				state.style[ key ] = Math.max( spec.min, Math.min( spec.max, Number( value ) || 0 ) );
				markDirty();
				live();
			};

			range.addEventListener( 'input', () => { number.value = range.value; set( range.value ); } );
			number.addEventListener( 'input', () => { range.value = number.value; set( number.value ); } );

			return h( 'div', { class: 'rfb-field rfb-w-half' }, h( 'span', { class: 'rfb-mini' }, STYLE_LABELS[ key ] ), h( 'div', { class: 'rfb-range-row' }, range, number ) );
		}

		const choices = ENUM_LABELS[ key ] || Object.fromEntries( spec.values.map( ( v ) => [ v, v ] ) );

		return h( 'div', { class: 'rfb-field rfb-w-half' }, h( 'span', { class: 'rfb-mini' }, STYLE_LABELS[ key ] ), select( state.style, key, choices, { after: live } ) );
	}

	function stylePanel() {
		const controls = h( 'div', { class: 'rfb-style-controls' } );

		STYLE_GROUPS.forEach( ( [ title, keys ] ) => controls.append( section( title, h( 'div', { class: 'rfb-form-grid' }, keys.map( styleControl ) ) ) ) );
		controls.append( section( __( 'Custom CSS', 'refraction' ), row( __( 'Your own rules for this form', 'refraction' ), h( 'textarea', { class: 'rfb-input rfb-code', rows: 8, spellcheck: 'false', onInput: ( e ) => { state.style.custom_css = e.target.value; markDirty(); } }, state.style.custom_css || '' ), __( 'Write "selector" for this form, for example: selector .rfb-label { text-transform: uppercase; }', 'refraction' ) ) ) );
		controls.append( h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light', onClick: () => {
			Object.assign( state.style, config.styleDefaults, { custom_css: state.style.custom_css } );
			markDirty();
			applyStyle( refs.canvasWrap );
			renderRight();
		} }, __( 'Reset colors and sizes', 'refraction' ) ) );

		return h( 'div', { class: 'rfb-style' }, h( 'p', { class: 'rfb-help' }, __( 'Changes show on the form right away.', 'refraction' ) ), controls );
	}

	// ---------------------------------------------------------------- advanced tab

	function toLocal( value ) {
		return value ? value.replace( ' ', 'T' ) : '';
	}

	function advancedPanel() {
		const s = state.settings;
		const emails = all().filter( ( f ) => 'email' === f.type ).reduce( ( map, f ) => Object.assign( map, { [ f.key ]: f.label } ), { '': __( 'None', 'refraction' ) } );
		const dateInput = ( key ) => h( 'input', { class: 'rfb-input', type: 'datetime-local', value: toLocal( s[ key ] ), onInput: ( e ) => { s[ key ] = e.target.value.replace( 'T', ' ' ); markDirty(); } } );
		const reload = renderRight;

		return h( 'div', { class: 'rfb-advanced' },
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'h2', null, __( 'After the visitor submits', 'refraction' ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				row( __( 'Success message', 'refraction' ), text( state, 'success_message', { after: () => {} } ) ),
				row( __( 'Redirect to this address instead (optional)', 'refraction' ), text( s, 'redirect_url', { type: 'url', placeholder: 'https://', after: () => {} } ), __( 'Leave empty to show the success message.', 'refraction' ) ),
				row( __( 'Submit button text', 'refraction' ), text( s, 'submit_text', { after: () => { refs.submit.textContent = s.submit_text; } } ) ) ) ),
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'h2', null, __( 'Multi-step forms', 'refraction' ) ), h( 'p', null, __( 'Add Step fields on the Build tab to split the form into pages.', 'refraction' ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				row( __( 'Progress display', 'refraction' ), select( s, 'progress', { steps: __( 'Numbered steps', 'refraction' ), bar: __( 'Progress bar', 'refraction' ), none: __( 'None', 'refraction' ) }, { after: () => {} } ) ),
				row( __( 'Next button text', 'refraction' ), text( s, 'next_text', { after: () => {} } ) ),
				row( __( 'Back button text', 'refraction' ), text( s, 'back_text', { after: () => {} } ) ) ) ),
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'h2', null, __( 'Notifications', 'refraction' ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				toggle( s, 'notify_enabled', __( 'Email me when someone submits', 'refraction' ), null, reload ),
				s.notify_enabled || s.notify_to ? row( __( 'Send to (comma separated)', 'refraction' ), text( s, 'notify_to', { after: () => {} } ) ) : null,
				s.notify_enabled || s.notify_to ? row( __( 'Subject (optional)', 'refraction' ), text( s, 'notify_subject', { after: () => {} } ) ) : null,
				s.notify_enabled || s.notify_to ? row( __( 'Reply to the visitor using this email field', 'refraction' ), select( s, 'reply_to_field', emails, { after: () => {} } ) ) : null,
				row( __( 'Send each submission to a webhook (optional)', 'refraction' ), text( s, 'webhook_url', { type: 'url', placeholder: 'https://', after: () => {} } ), __( 'Posts the answers as JSON to this address. Only addresses on the public internet are allowed.', 'refraction' ) ) ) ),
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'h2', null, __( 'Access', 'refraction' ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				toggle( s, 'require_login', __( 'Only logged-in visitors can submit', 'refraction' ) ),
				row( __( 'Opens on (optional)', 'refraction' ), dateInput( 'opens' ) ),
				row( __( 'Closes on (optional)', 'refraction' ), dateInput( 'closes' ) ),
				row( __( 'Stop after this many submissions (0 = no limit)', 'refraction' ), text( s, 'max_submissions', { type: 'number', number: true, min: 0, after: () => {} } ) ),
				row( __( 'Message when the form is closed', 'refraction' ), text( s, 'closed_message', { after: () => {} } ) ) ) ),
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'h2', null, __( 'Spam protection', 'refraction' ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				toggle( s, 'honeypot', __( 'Hidden trap field for bots', 'refraction' ) ),
				row( __( 'Minimum seconds to fill in the form', 'refraction' ), text( s, 'min_seconds', { type: 'number', number: true, min: 0, max: 60, after: () => {} } ) ),
				row( __( 'Submissions per visitor per hour (0 = no limit)', 'refraction' ), text( s, 'hourly_limit', { type: 'number', number: true, min: 0, max: 1000, after: () => {} } ) ) ) ) );
	}

	// ---------------------------------------------------------------- general tab (details, statuses, publishing)

	function generalPanel() {
		const titles = state.fields.filter( ( f ) => isScalar( f.type ) );
		const statusRows = h( 'ol', { class: 'rfb-rows' } );
		const redraw = () => {
			statusRows.replaceChildren( ...state.statuses.map( statusRow ) );
			defaultSelect.replaceChildren( ...state.statuses.map( ( s ) => h( 'option', { value: s.key, selected: state.default_status === s.key }, s.label ) ) );
		};
		const statusRow = ( status, i ) => h( 'li', { class: 'rfb-row' }, h( 'div', { class: 'rfb-row-main' },
			h( 'label', { class: 'rfb-row-cell rfb-grow' }, h( 'span', { class: 'rfb-mini' }, __( 'Label', 'refraction' ) ), h( 'input', { class: 'rfb-input', value: status.label, onInput: ( e ) => {
				status.label = e.target.value;
				markDirty();
				const option = defaultSelect.querySelector( `option[value="${ CSS.escape( status.key ) }"]` );

				if ( option ) {
					option.textContent = status.label;
				}
			} } ) ),
			h( 'label', { class: 'rfb-row-cell' }, h( 'span', { class: 'rfb-mini' }, __( 'Color', 'refraction' ) ), select( status, 'color', config.colors, { after: () => {} } ) ),
			h( 'button', { type: 'button', class: 'rfb-icon-btn', 'aria-label': __( 'Move up', 'refraction' ), onClick: () => { if ( i > 0 ) { state.statuses.splice( i - 1, 0, state.statuses.splice( i, 1 )[ 0 ] ); markDirty(); redraw(); } } }, '↑' ),
			h( 'button', { type: 'button', class: 'rfb-icon-btn', 'aria-label': __( 'Move down', 'refraction' ), onClick: () => { if ( i < state.statuses.length - 1 ) { state.statuses.splice( i + 1, 0, state.statuses.splice( i, 1 )[ 0 ] ); markDirty(); redraw(); } } }, '↓' ),
			h( 'button', { type: 'button', class: 'rfb-icon-btn rfb-icon-danger', 'aria-label': __( 'Remove status', 'refraction' ), onClick: () => {
				if ( state.statuses.length > 1 ) {
					state.statuses.splice( i, 1 );
					if ( ! state.statuses.some( ( s ) => s.key === state.default_status ) ) {
						state.default_status = state.statuses[ 0 ].key;
					}
					markDirty();
					redraw();
				}
			} }, '✕' ) ) );
		const defaultSelect = h( 'select', { class: 'rfb-input', onChange: ( e ) => { state.default_status = e.target.value; markDirty(); } } );

		redraw();

		return h( 'div', { class: 'rfb-general' },
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'h2', null, __( 'Details', 'refraction' ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				h( 'div', { class: 'rfb-field rfb-w-half' }, h( 'label', { class: 'rfb-label is-required', for: 'rfb-g-label' }, __( 'Name (plural)', 'refraction' ) ), h( 'input', { class: 'rfb-input', id: 'rfb-g-label', value: state.label, required: true, onInput: ( e ) => { state.label = e.target.value; markDirty(); } } ) ),
				row( __( 'Name (single record)', 'refraction' ), text( state, 'singular', { after: () => {} } ) ),
				row( __( 'Description', 'refraction' ), text( state, 'description', { after: () => {} } ) ),
				row( __( 'Icon', 'refraction' ), select( state, 'icon', config.icons, { after: () => {} } ) ),
				row( __( 'Field used as the record title', 'refraction' ), select( state, 'title_field', Object.fromEntries( titles.map( ( f ) => [ f.key, f.label ] ) ), { after: () => {} } ) ) ) ),
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'div', null, h( 'h2', null, __( 'Statuses', 'refraction' ) ), h( 'p', null, __( 'Every record has one status, shown as a colored badge.', 'refraction' ) ) ),
				h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary', onClick: () => {
					state.statuses.push( { key: '', label: '', color: 'primary' } );
					markDirty();
					redraw();
					statusRows.lastElementChild.querySelector( 'input' ).focus();
				} }, __( 'Add status', 'refraction' ) ) ),
			h( 'div', { class: 'rfb-card-body' }, statusRows, h( 'div', { class: 'rfb-field rfb-w-half' }, h( 'label', { class: 'rfb-label', for: 'rfb-g-default' }, __( 'Status of a new record', 'refraction' ) ), ( defaultSelect.id = 'rfb-g-default' ) && defaultSelect ) ) ),
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'div', null, h( 'h2', null, __( 'Show on your site', 'refraction' ) ), h( 'p', null, __( 'Nothing is public until you turn it on and place the shortcode on a page.', 'refraction' ) ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				toggle( state, 'public_form', __( 'Accept submissions from visitors (public form)', 'refraction' ), null ),
				h( 'p', { class: 'rfb-help rfb-w-full' }, __( 'Shortcode:', 'refraction' ), ' ', h( 'code', null, root.dataset.shortcodeForm ) ),
				toggle( state, 'public_list', __( 'Show records publicly (list)', 'refraction' ), null ),
				h( 'p', { class: 'rfb-help rfb-w-full' }, __( 'Shortcode:', 'refraction' ), ' ', h( 'code', null, root.dataset.shortcodeList ), ' ', __( 'Only the status named in the shortcode and fields marked "Show publicly" are shown.', 'refraction' ) ) ) ) );
	}

	// ---------------------------------------------------------------- shell

	function serialise() {
		return JSON.stringify( state, ( key, value ) => ( 'min' === key || 'max' === key ) && '' === value ? null : value );
	}

	/** Gives the designer the rest of the screen (below the title, above the save bar); stacked panels on small screens keep their natural height. */
	function fitHeight() {
		const wrap = root.closest( '.rfb-wrap' );

		if ( wrap ) {
			wrap.classList.add( 'rfb-wrap-design' );
		}

		if ( window.innerWidth <= 900 ) {
			refs.workspace.style.height = '';
			return;
		}

		const top = refs.workspace.getBoundingClientRect().top + window.scrollY;
		const bottom = refs.save.offsetHeight + 24;

		refs.workspace.style.height = Math.max( 420, window.innerHeight - top - bottom ) + 'px';
	}

	function init() {
		refs.live = h( 'div', { class: 'screen-reader-text', 'aria-live': 'polite' } );
		refs.save = h( 'div', { class: 'rfb-sticky-actions' }, h( 'span', { class: 'rfb-save-note', 'aria-live': 'polite' } ), h( 'button', { type: 'submit', class: 'rfb-btn rfb-btn-primary' }, __( 'Save collection', 'refraction' ) ) );

		state.fields.forEach( tag );
		root.append( workspace(), refs.save, refs.live );
		[ 'left', 'right' ].forEach( ( side ) => memory.get( side ) && setCollapsed( side, true ) );
		renderBuild();
		fitHeight();
		window.addEventListener( 'resize', fitHeight );
		window.addEventListener( 'load', fitHeight );
		window.setTimeout( fitHeight, 400 );

		form.addEventListener( 'submit', ( event ) => {
			if ( ! state.label.trim() ) {
				event.preventDefault();
				tab = 'general';
				expand( 'right' );
				renderRight();
				document.getElementById( 'rfb-g-label' ).focus();
				return;
			}

			document.getElementById( 'rfb-design-json' ).value = serialise();
			dirty = false;
		} );

		window.addEventListener( 'beforeunload', ( event ) => {
			if ( dirty ) {
				event.preventDefault();
				event.returnValue = '';
			}
		} );

		document.addEventListener( 'keydown', ( event ) => {
			if ( 'Delete' === event.key && selected && ! /^(INPUT|TEXTAREA|SELECT)$/.test( document.activeElement.tagName ) ) {
				const found = find( selected );

				if ( found ) {
					removeField( found.field );
				}
			}
		} );
	}

	init();
}() );
