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
	let tab = 'build';
	let dirty = false;
	let drag = null;
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
	const isLayout = ( type ) => [ 'heading', 'paragraph', 'html', 'divider' ].includes( type );
	const hasValue = ( type ) => ! isLayout( type ) && 'step' !== type;
	const hasOptions = ( type ) => [ 'select', 'radio', 'checkbox' ].includes( type );
	const isScalar = ( type ) => hasValue( type ) && ! isContainer( type ) && 'file' !== type && 'checkbox' !== type && 'hidden' !== type;

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
			key: '', label: '', type, required: false, options: [], placeholder: '', help: '', width: 'full', in_table: false, filter: false, public: false,
			default: '', min: null, max: null, content: '', level: 3,
			conditions: { enabled: false, action: 'show', match: 'all', rules: [] },
			css_class: '', hide_label: false, accept: [ 'jpg', 'jpeg', 'png', 'pdf' ], max_size: 5, max_files: 1,
			children: [], min_rows: 0, max_rows: 10, add_label: __( 'Add row', 'refraction' ), source: 'static',
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

		field.width = [ 'text', 'email', 'phone', 'number', 'currency', 'date', 'time', 'datetime', 'select' ].includes( type ) ? 'half' : 'full';

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
			class: 'rfb-input', type: options.type || 'text', value: null === target[ key ] || undefined === target[ key ] ? '' : target[ key ], placeholder: options.placeholder,
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
			class: 'rfb-input', onChange: ( e ) => {
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
			return h( 'div', { class: 'rfb-cv-step' }, h( 'span', null, __( 'New step', 'refraction' ) ), h( 'strong', null, field.label ) );
		}

		if ( 'toggle' === t ) {
			return h( 'div', { class: 'rfb-switch' }, h( 'span', { class: 'rfb-switch-track' } ), h( 'span', { class: 'rfb-switch-text' }, field.label ) );
		}

		if ( [ 'radio', 'checkbox' ].includes( t ) ) {
			return h( 'div', null, label, h( 'div', { class: 'rfb-cv-choices' }, field.options.slice( 0, 4 ).map( ( o ) => h( 'span', { class: 'rfb-check' }, h( 'input', { type: t, disabled: true, tabindex: '-1' } ), h( 'span', null, o.label ) ) ) ) );
		}

		if ( 'file' === t ) {
			return h( 'div', null, label, h( 'div', { class: 'rfb-cv-drop' }, __( 'Choose a file', 'refraction' ), ' · ', field.accept.join( ', ' ).toUpperCase(), ' · ', field.max_size + ' MB' ) );
		}

		if ( 'hidden' === t ) {
			return h( 'div', { class: 'rfb-cv-hidden' }, h( 'span', null, __( 'Hidden field', 'refraction' ) ), h( 'strong', null, field.label ), h( 'em', null, field.source === 'static' ? field.default : ( config.hiddenSources[ field.source ] || '' ) ) );
		}

		if ( 'textarea' === t ) {
			return h( 'div', null, label, h( 'div', { class: 'rfb-input rfb-cv-input rfb-cv-area' }, field.placeholder ) );
		}

		return h( 'div', null, label, h( 'div', { class: 'rfb-input rfb-cv-input' }, field.placeholder || ( 'select' === t ? __( 'Select...', 'refraction' ) : '' ), 'select' === t || 'rating' === t ? h( 'span', { class: 'rfb-cv-caret' }, '▾' ) : null ) );
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
			class: 'rfb-cv-item rfb-cv-' + field.type + ( selected === field._id ? ' is-selected' : '' ) + ' rfb-w-' + field.width,
			draggable: 'true', 'data-id': field._id,
			onClick: ( e ) => {
				e.stopPropagation();
				selected = field._id;
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
			el.append( h( 'div', { class: 'rfb-cv-container' }, h( 'strong', { class: 'rfb-cv-title' }, field.label, 'repeater' === field.type ? ' · ' + __( 'repeats', 'refraction' ) : '' ), list( field.children, field ) ) );
		} else {
			el.append( h( 'div', { class: 'rfb-cv-preview-body' }, faux( field ) ) );
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

		wrapper.append( h( 'div', { class: 'rfb-inline' }, select( c, 'action', { show: __( 'Show', 'refraction' ), hide: __( 'Hide', 'refraction' ) } ), h( 'span', null, __( 'this field when', 'refraction' ) ), select( c, 'match', { all: __( 'all', 'refraction' ), any: __( 'any', 'refraction' ) } ), h( 'span', null, __( 'of these match:', 'refraction' ) ) ) );

		c.rules.forEach( ( rule, i ) => {
			const source = candidates.find( ( f ) => f.key === rule.field );
			const needsValue = ! [ 'empty', 'not_empty' ].includes( rule.op );
			const valueControl = source && [ 'select', 'radio', 'checkbox' ].includes( source.type ) && needsValue
				? select( rule, 'value', Object.fromEntries( [ [ '', __( 'Choose...', 'refraction' ) ], ...source.options.map( ( o ) => [ o.value, o.label ] ) ] ) )
				: ( source && 'toggle' === source.type && needsValue ? select( rule, 'value', { 1: __( 'On', 'refraction' ), 0: __( 'Off', 'refraction' ) } ) : text( rule, 'value', { placeholder: __( 'value', 'refraction' ) } ) );

			wrapper.append( h( 'div', { class: 'rfb-rule' },
				select( rule, 'field', Object.fromEntries( candidates.map( ( f ) => [ f.key, f.label ] ) ), { after: refresh } ),
				select( rule, 'op', config.operators, { after: refresh } ),
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

	function renderInspector() {
		const box = refs.inspector;
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

		if ( ( hasValue( t ) && ! isContainer( t ) && 'file' !== t ) ) {
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

		if ( isScalar( t ) && ! found.parent ) {
			look.push( check( f, 'in_table', __( 'Show as a column in the records table', 'refraction' ) ), check( f, 'public', __( 'Show publicly (in the public list)', 'refraction' ) ) );
		}

		if ( hasOptions( t ) && 'checkbox' !== t && ! found.parent ) {
			look.push( check( f, 'filter', __( 'Add a filter above the table', 'refraction' ) ) );
		}

		box.append( section( __( 'Appearance and table', 'refraction' ), look ) );
	}

	// ---------------------------------------------------------------- build tab

	function palette() {
		const box = h( 'div', { class: 'rfb-palette' } );

		config.palette.forEach( ( group ) => {
			const grid = h( 'div', { class: 'rfb-palette-grid' } );

			Object.entries( group.types ).forEach( ( [ type, label ] ) => {
				grid.append( h( 'button', {
					type: 'button', class: 'rfb-palette-item', draggable: 'true', 'data-type': type,
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
				}, h( 'span', { class: 'rfb-palette-grip', 'aria-hidden': 'true' }, '⋮⋮' ), label ) );
			} );
			box.append( h( 'div', { class: 'rfb-palette-group' }, h( 'h3', null, group.label ), grid ) );
		} );

		return box;
	}

	function renderBuild() {
		renderCanvasOnly();
		renderInspector();
	}

	function buildPanel() {
		refs.canvas = h( 'div', { class: 'rfb-canvas-inner' } );
		refs.canvasWrap = h( 'div', { class: 'rfb-canvas rfb-form rfb-front' }, refs.canvas );
		applyStyle( refs.canvasWrap );
		refs.inspector = h( 'aside', { class: 'rfb-inspector', 'aria-label': __( 'Field settings', 'refraction' ) } );

		const panel = h( 'div', { class: 'rfb-build' },
			h( 'aside', { class: 'rfb-palette-col', 'aria-label': __( 'Field types', 'refraction' ) }, h( 'p', { class: 'rfb-help' }, __( 'Drag a field onto the form, or press Enter on it.', 'refraction' ) ), palette() ),
			h( 'div', { class: 'rfb-canvas-col' }, h( 'div', { class: 'rfb-canvas-scroll' }, refs.canvasWrap, h( 'div', { class: 'rfb-cv-submit' }, h( 'span', { class: 'rfb-btn rfb-btn-primary', 'aria-hidden': 'true' }, state.settings.submit_text ) ) ) ),
			refs.inspector );

		root.addEventListener( 'click', ( event ) => {
			if ( event.target.closest( '.rfb-canvas-inner' ) && ! event.target.closest( '.rfb-cv-item' ) ) {
				selected = null;
				renderBuild();
			}
		} );

		return panel;
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
			if ( refs.stylePreview ) {
				applyStyle( refs.stylePreview );
			}
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
			renderTab();
		} }, __( 'Reset colors and sizes', 'refraction' ) ) );

		refs.stylePreview = h( 'div', { class: 'rfb-canvas rfb-form rfb-front rfb-style-preview' } );
		applyStyle( refs.stylePreview );

		const sample = [ ...state.fields.filter( ( f ) => 'step' !== f.type ).slice( 0, 6 ) ];

		sample.forEach( ( field ) => refs.stylePreview.append( h( 'div', { class: 'rfb-cv-preview-item rfb-w-' + ( isContainer( field.type ) ? 'full' : field.width ) }, isContainer( field.type ) ? h( 'strong', null, field.label ) : faux( field ) ) ) );

		if ( ! sample.length ) {
			refs.stylePreview.append( h( 'p', { class: 'rfb-help' }, __( 'Add fields on the Build tab to see them here.', 'refraction' ) ) );
		}

		refs.stylePreview.append( h( 'div', { class: 'rfb-cv-submit' }, h( 'span', { class: 'rfb-btn rfb-btn-primary' }, state.settings.submit_text ) ) );

		return h( 'div', { class: 'rfb-style' }, controls, h( 'div', { class: 'rfb-style-side' }, h( 'h3', null, __( 'Live preview', 'refraction' ) ), refs.stylePreview ) );
	}

	// ---------------------------------------------------------------- advanced tab

	function toLocal( value ) {
		return value ? value.replace( ' ', 'T' ) : '';
	}

	function advancedPanel() {
		const s = state.settings;
		const emails = all().filter( ( f ) => 'email' === f.type ).reduce( ( map, f ) => Object.assign( map, { [ f.key ]: f.label } ), { '': __( 'None', 'refraction' ) } );
		const dateInput = ( key ) => h( 'input', { class: 'rfb-input', type: 'datetime-local', value: toLocal( s[ key ] ), onInput: ( e ) => { s[ key ] = e.target.value.replace( 'T', ' ' ); markDirty(); } } );
		const reload = renderTab;

		return h( 'div', { class: 'rfb-advanced' },
			h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'h2', null, __( 'After the visitor submits', 'refraction' ) ) ), h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				row( __( 'Success message', 'refraction' ), text( state, 'success_message', { after: () => {} } ) ),
				row( __( 'Redirect to this address instead (optional)', 'refraction' ), text( s, 'redirect_url', { type: 'url', placeholder: 'https://', after: () => {} } ), __( 'Leave empty to show the success message.', 'refraction' ) ),
				row( __( 'Submit button text', 'refraction' ), text( s, 'submit_text', { after: () => {} } ) ) ) ),
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

	const TABS = [
		[ 'build', __( 'Build', 'refraction' ) ],
		[ 'style', __( 'Style', 'refraction' ) ],
		[ 'advanced', __( 'Advanced', 'refraction' ) ],
		[ 'general', __( 'General', 'refraction' ) ],
	];

	function renderTab() {
		refs.body.replaceChildren( 'build' === tab ? buildPanel() : ( 'style' === tab ? stylePanel() : ( 'advanced' === tab ? advancedPanel() : generalPanel() ) ) );

		if ( 'build' === tab ) {
			renderBuild();
		}

		refs.tabs.querySelectorAll( '[role=tab]' ).forEach( ( button ) => {
			const on = button.dataset.tab === tab;

			button.setAttribute( 'aria-selected', String( on ) );
			button.tabIndex = on ? 0 : -1;
			button.classList.toggle( 'is-active', on );
		} );
	}

	function serialise() {
		return JSON.stringify( state, ( key, value ) => ( 'min' === key || 'max' === key ) && '' === value ? null : value );
	}

	function init() {
		refs.live = h( 'div', { class: 'screen-reader-text', 'aria-live': 'polite' } );
		refs.tabs = h( 'div', { class: 'rfb-tabs rfb-design-tabs', role: 'tablist', 'aria-label': __( 'Designer sections', 'refraction' ) }, TABS.map( ( [ id, label ] ) => h( 'button', {
			type: 'button', role: 'tab', class: 'rfb-tab', 'data-tab': id, onClick: () => { tab = id; renderTab(); },
			onKeydown: ( e ) => {
				const order = TABS.map( ( x ) => x[ 0 ] );
				const at = order.indexOf( tab );
				const next = 'ArrowRight' === e.key ? order[ ( at + 1 ) % order.length ] : ( 'ArrowLeft' === e.key ? order[ ( at + order.length - 1 ) % order.length ] : null );

				if ( next ) {
					tab = next;
					renderTab();
					refs.tabs.querySelector( `[data-tab="${ next }"]` ).focus();
				}
			},
		}, label ) ) );
		refs.body = h( 'div', { class: 'rfb-design-body', role: 'tabpanel' } );
		refs.save = h( 'div', { class: 'rfb-sticky-actions' }, h( 'span', { class: 'rfb-save-note', 'aria-live': 'polite' } ), h( 'button', { type: 'submit', class: 'rfb-btn rfb-btn-primary' }, __( 'Save collection', 'refraction' ) ) );

		root.append( refs.tabs, refs.body, refs.save, refs.live );
		state.fields.forEach( tag );
		renderTab();

		form.addEventListener( 'submit', ( event ) => {
			if ( ! state.label.trim() ) {
				event.preventDefault();
				tab = 'general';
				renderTab();
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
			if ( 'Delete' === event.key && selected && ! /^(INPUT|TEXTAREA|SELECT)$/.test( document.activeElement.tagName ) && 'build' === tab ) {
				const found = find( selected );

				if ( found ) {
					removeField( found.field );
				}
			}
		} );
	}

	init();
}() );
