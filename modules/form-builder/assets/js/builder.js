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
	typeLabels.panel = __( 'Panel', 'refraction' );
	typeLabels.card = __( 'Choice card', 'refraction' );

	let uid = 0;
	let selected = null;
	let tab = 'field'; // right panel: field | style | advanced | general
	let dirty = false;
	let drag = null;
	let fieldTab = 'settings'; // inside the Field panel: settings | style
	let fieldState = 'normal'; // normal | hover | focus: which look of the selected field the Style tab edits
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
	const isLayout = ( type ) => [ 'heading', 'paragraph', 'html', 'divider', 'image', 'icon_list', 'badge', 'price' ].includes( type );
	const isHost = ( type ) => [ 'accordion', 'tabs', 'columns' ].includes( type );
	const isTransparent = ( type ) => isHost( type ) || 'panel' === type;
	const isChoiceSet = ( type ) => 'choice_set' === type;
	const hasKids = ( type ) => isContainer( type ) || isTransparent( type ) || isChoiceSet( type );
	const hasValue = ( type ) => ! isLayout( type ) && 'step' !== type && ! isTransparent( type );
	const hasOptions = ( type ) => [ 'select', 'radio', 'checkbox' ].includes( type );
	const isScalar = ( type ) => hasValue( type ) && ! isContainer( type ) && ! isChoiceSet( type ) && ! [ 'file', 'checkbox', 'hidden', 'name', 'signature' ].includes( type );
	/** The fields as they store values: Accordion, Tabs and panels are replaced by what is inside them. */
	const flat = ( list ) => list.flatMap( ( f ) => ( isTransparent( f.type ) ? flat( f.children || [] ) : [ f ] ) );

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

	function uniqueKey( base, except, extra = [] ) {
		const taken = new Set( [ ...all().filter( ( f ) => f !== except ).map( ( f ) => f.key ), ...extra ] );
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
			multiple: false, open: false, tab_look: 'line', per: '', per_label: '',
			card_inline: false, card_width: 'auto', card_columns: 1, card_gap: 10, col_gap: 24, list_layout: 'vertical', items: [],
			card_mode: 'standard', marker_pos: '', marker_look: '', price_card: true, price_amount: null, from_card: false,
			card_badge: '', card_subtitle: '', card_price: null, card_note: '', card_details: __( "What's included", 'refraction' ), card_details_open: false,
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
		} else if ( 'icon_list' === type ) {
			field.items = [ __( 'First thing included', 'refraction' ), __( 'Second thing included', 'refraction' ), __( 'Third thing included', 'refraction' ) ].map( ( text ) => ( { text, icon: 'check', link: '' } ) );
		} else if ( isHost( type ) ) {
			const used = [ field.key ];

			field.children = [ 1, 2 ].map( ( n ) => {
				const panel = baseField( 'panel' );

				panel.width = 'columns' === type ? 'half' : 'full';
				panel.label = ( 'tabs' === type ? __( 'Tab', 'refraction' ) : ( 'columns' === type ? __( 'Column', 'refraction' ) : __( 'Panel', 'refraction' ) ) ) + ' ' + n;
				panel.key = uniqueKey( 'panel', null, used );
				used.push( panel.key );
				panel.open = 'accordion' === type && 1 === n;

				return panel;
			} );
		} else if ( isChoiceSet( type ) ) {
			field.marker_pos = 'left';
			field.marker_look = 'radio';
			field.children = newCards( field.key, 2 );
		} else if ( 'badge' === type ) {
			field.content = __( 'Popular', 'refraction' );
			field.width = 'full';
		} else if ( 'price' === type ) {
			field.price_amount = 10;
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

	/** New choice cards (Group cards with one line of text inside), with keys that are free in the form and in this list. */
	function newCards( setKey, count, taken = [] ) {
		const used = [ setKey, ...taken ];
		const cards = [];
		const make = ( type, label, extra = {} ) => {
			const block = baseField( type );

			Object.assign( block, { label, key: uniqueKey( type, null, used ) }, extra );
			used.push( block.key );

			return block;
		};
		const column = ( label, width, children ) => Object.assign( make( 'panel', label ), { width, children } );

		for ( let n = 1; n <= count; n++ ) {
			const card = make( 'group', sprintf( __( 'Option %d', 'refraction' ), all().filter( ( f ) => 'group' === f.type ).length + cards.length + 1 ), { card_mode: 'free', card_price: 10 * n } );
			const title = make( 'heading', __( 'Card title', 'refraction' ), { from_card: true, level: 3 } );
			const text = make( 'paragraph', __( 'Paragraph', 'refraction' ), { content: __( 'Describe this option.', 'refraction' ) } );
			const price = make( 'price', __( 'Price', 'refraction' ), { style: { align: 'right' } } );

			card.children = [ Object.assign( make( 'columns', __( 'Header', 'refraction' ) ), { children: [ column( __( 'Column', 'refraction' ) + ' 1', 'w70', [ title, text ] ), column( __( 'Column', 'refraction' ) + ' 2', 'w30', [ price ] ) ] } ) ];
			cards.push( card );
		}

		return cards;
	}

	function sprintf( text, ...values ) {
		let i = 0;

		return String( text ).replace( /%(?:(\d)\$)?[sd]/g, ( m, n ) => String( values[ n ? Number( n ) - 1 : i++ ] ) );
	}

	/** Gives every field (and child) a private id used by the designer only; it is stripped before saving. */
	function tag( field ) {
		// PHP sends an empty list as [], and properties set on an array are lost when the design is saved as JSON.
		if ( ! field.style || Array.isArray( field.style ) ) {
			field.style = {};
		}

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

		const used = [];

		tag( copy );
		[ copy, ...all( copy.children ) ].forEach( ( f ) => {
			f.key = hasValue( f.type ) ? uniqueKey( f.key + '_copy', null, used ) : uniqueKey( f.type, null, used );
			used.push( f.key );

			if ( ! ( 'step' === f.type || isLayout( f.type ) || 'panel' === f.type ) ) {
				f.label = f.label + ' ' + __( '(copy)', 'refraction' );
			}
		} );

		return copy;
	}

	/** A Group or Repeater inside a choice set is a card. */
	function isCardField( field ) {
		const found = find( field._id );

		return !! found && isContainer( field.type ) && !! found.parent && isChoiceSet( found.parent.type );
	}

	/** The type a field is styled as: a card has its own styles, apart from the Group it is built on. */
	const styleTypeOf = ( field ) => ( isCardField( field ) ? 'card' : field.type );

	/** The card a block sits in (any depth), or null. */
	function cardAround( field ) {
		const chain = ancestors( field._id ) || [];

		return chain.find( ( f, i ) => i > 0 && isContainer( f.type ) && isChoiceSet( chain[ i - 1 ].type ) ) || null;
	}

	/** The fields from the top down to (and including) the one with this id, or null. */
	function ancestors( id, list = state.fields, trail = [] ) {
		for ( const field of list ) {
			if ( field._id === id ) {
				return [ ...trail, field ];
			}

			const inner = ancestors( id, field.children || [], [ ...trail, field ] );

			if ( inner ) {
				return inner;
			}
		}

		return null;
	}

	/** What a list owner is for the nesting rules (mirror of Schema::allowed_in): its kind and the nearest value container around it. */
	function contextOf( owner ) {
		if ( ! owner ) {
			return { parent: '', root: '' };
		}

		const chain = ancestors( owner._id ) || [ owner ];
		let root = '';

		chain.forEach( ( f, i ) => {
			if ( isContainer( f.type ) ) {
				root = i > 0 && isChoiceSet( chain[ i - 1 ].type ) ? 'card' : f.type;
			}
		} );

		const before = chain.length > 1 ? chain[ chain.length - 2 ] : null;
		let parent = owner.type;

		if ( isContainer( owner.type ) && before && isChoiceSet( before.type ) ) {
			parent = 'card';
		} else if ( 'panel' === owner.type ) {
			parent = before && 'columns' === before.type ? 'colpanel' : 'panel';
		}

		return { parent, root };
	}

	/** Can a field of this type be dropped into this list owner (null = the top level)? */
	function canDrop( type, owner ) {
		const { parent, root } = contextOf( owner );

		return allowedIn( type, parent, root );
	}

	function allowedIn( type, parent, root ) {
		if ( '' === parent ) {
			return 'panel' !== type;
		}

		if ( isHost( parent ) ) {
			return 'panel' === type;
		}

		if ( 'choice_set' === parent ) {
			return isContainer( type );
		}

		if ( 'step' === type || 'panel' === type ) {
			return false;
		}

		const inside = [ 'panel', 'colpanel' ].includes( parent );

		if ( [ 'accordion', 'tabs' ].includes( type ) ) {
			return [ '', 'card' ].includes( root ) && ! inside;
		}

		if ( 'columns' === type ) {
			return true;
		}

		if ( isContainer( type ) || isChoiceSet( type ) ) {
			return '' === root;
		}

		if ( 'file' === type ) {
			return ! [ 'repeater', 'card' ].includes( root );
		}

		return ! ( 'signature' === type && 'card' === root );
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

		if ( ! from || ! canDrop( from.field.type, owner ) || ( owner && ( ancestors( owner._id ) || [] ).some( ( f ) => f._id === id ) ) ) {
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

	/** An amount as the collection writes it (mirror of Money::format). */
	function fmtMoney( number, withSymbol = false ) {
		const m = state.settings;
		const decimals = Math.max( 0, Math.min( 4, Number( m.decimals ) || 0 ) );
		const [ whole, part ] = Math.abs( Number( number ) || 0 ).toFixed( decimals ).split( '.' );
		const text = whole.replace( /\B(?=(\d{3})+(?!\d))/g, m.thousands_sep ) + ( part ? m.decimal_sep + part : '' );
		const signed = ( Number( number ) < 0 ? '-' : '' ) + text;

		if ( ! withSymbol || ! m.currency_symbol ) {
			return signed;
		}

		return 'after' === m.currency_position ? signed + ' ' + m.currency_symbol : m.currency_symbol + signed;
	}

	function perText( field ) {
		const names = { hour: __( 'hour', 'refraction' ), day: __( 'day', 'refraction' ), week: __( 'week', 'refraction' ), month: __( 'month', 'refraction' ), quarter: __( 'quarter', 'refraction' ), year: __( 'year', 'refraction' ) };

		if ( 'custom' === field.per ) {
			return field.per_label ? '/ ' + field.per_label : '';
		}

		return names[ field.per ] ? '/ ' + names[ field.per ] : '';
	}

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

		if ( 'icon_list' === t ) {
			return field.items.length
				? h( 'ul', { class: 'rfb-il rfb-il-' + field.list_layout }, field.items.map( ( item ) => {
					const icon = h( 'span', { class: 'rfb-il-icon' } );

					icon.innerHTML = ( config.listIcons && ( config.listIcons[ item.icon ] || config.listIcons.check ) ) || '';

					return h( 'li', { class: 'rfb-il-item' }, icon, h( 'span', { class: 'rfb-il-text' }, item.text ) );
				} ) )
				: h( 'div', { class: 'rfb-cv-drop' }, __( 'Icon List: add items in the settings panel', 'refraction' ) );
		}

		if ( 'badge' === t ) {
			return h( 'span', { class: 'rfb-badge-pill' }, field.content || field.label );
		}

		if ( 'price' === t ) {
			const card = field.price_card ? cardAround( field ) : null;
			const amount = card ? card.card_price : field.price_amount;
			const source = card || field;

			return null === amount || '' === amount || undefined === amount
				? h( 'span', { class: 'rfb-help' }, __( 'Price (no price set)', 'refraction' ) )
				: h( 'span', { class: 'rfb-price' }, h( 'span', { class: 'rfb-price-amount' }, fmtMoney( amount, true ) ), perText( source ) ? h( 'span', { class: 'rfb-price-per' }, ' ' + perText( source ) ) : null );
		}

		if ( 'heading' === t ) {
			const owner = field.from_card ? cardAround( field ) : null;

			return h( 'div', { class: 'rfb-cv-heading rfb-cv-h' + field.level }, owner ? owner.label : ( field.content || field.label ) );
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
			const looks = 'buttons' === ( ( field.style && field.style.choice_look ) || ( ( state.type_styles && state.type_styles[ field.type ] ) || {} ).choice_look );

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

		if ( 'currency' === t ) {
			const symbol = state.settings.currency_symbol ? h( 'span', { class: 'rfb-amount-affix rfb-amount-symbol' }, state.settings.currency_symbol ) : null;
			const per = perText( field ) ? h( 'span', { class: 'rfb-amount-affix rfb-amount-per' }, perText( field ) ) : null;
			const after = 'after' === state.settings.currency_position;

			return h( 'div', null, label, desc, h( 'div', { class: 'rfb-amount' + ( after ? ' is-after' : '' ) }, after ? null : symbol, h( 'div', { class: 'rfb-input rfb-cv-input rfb-amount-input' }, field.placeholder || fmtMoney( 1200.5 ) ), after ? symbol : null, per ) );
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

	/** flex-basis of a card: its own share, or an equal share of the set's cards per row (mirror of the renderer). */
	function cardBasis( card, set ) {
		const percent = 'auto' === card.card_width ? 100 / Math.max( 1, set.card_columns || 1 ) : ( config.widthPercent[ card.card_width ] || 100 );

		return 'calc(' + Math.round( percent * 1000 ) / 1000 + '% - var(--rfb-cc-gap, 10px) * ' + Math.round( ( 1 - percent / 100 ) * 10000 ) / 10000 + ')';
	}

	function block( field, items, index, owner ) {
		const conditional = field.conditions && field.conditions.enabled;
		const isCardItem = !! owner && isChoiceSet( owner.type );
		const el = h( 'div', {
			style: isCardItem ? 'flex-basis:' + cardBasis( field, owner ) : undefined,
			class: 'rfb-cv-item ' + ( isCardItem && isContainer( field.type ) ? 'rfb-cv-card' : 'rfb-cv-' + field.type ) + ( selected === field._id ? ' is-selected' : '' ) + ( selected === field._id && previewState ? ' is-force' : '' ) + ( isCardItem ? '' : ' rfb-w-' + field.width ),
			draggable: 'true', 'data-id': field._id, 'data-rfb-key': field.key,
			onClick: ( e ) => {
				e.stopPropagation();
				if ( selected !== field._id ) {
					fieldState = 'normal'; // a newly picked field starts on its normal look
					previewState = false;
				}

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
			h( 'span', { class: 'rfb-cv-type', title: __( 'Drag to move', 'refraction' ) }, typeLabels[ isCardItem && isContainer( field.type ) ? 'card' : field.type ] || field.type ),
			button( sprintf( __( 'Move %s up', 'refraction' ), field.label ), '↑', () => index > 0 && move( field._id, owner, index - 1 ), 'rfb-cv-move' ),
			button( sprintf( __( 'Move %s down', 'refraction' ), field.label ), '↓', () => index < items.length - 1 && move( field._id, owner, index + 2 ), 'rfb-cv-move' ),
			button( sprintf( __( 'Duplicate %s', 'refraction' ), field.label ), '⧉', () => insert( clone( field ), owner, index + 1 ) ),
			button( sprintf( __( 'Delete %s', 'refraction' ), field.label ), '✕', () => removeField( field ), 'rfb-icon-danger' ) );
		const badges = conditional || field.required
			? h( 'div', { class: 'rfb-cv-badges', 'aria-hidden': 'true' }, conditional ? h( 'span', { class: 'rfb-badge rfb-badge-light-info' }, __( 'Conditional', 'refraction' ) ) : null, field.required ? h( 'span', { class: 'rfb-badge rfb-badge-light-danger' }, __( 'Required', 'refraction' ) ) : null )
			: null;

		el.append( bar );

		if ( badges ) {
			el.append( badges );
		}

		if ( isHost( field.type ) ) {
			const title = h( 'strong', { class: 'rfb-cv-title' + ( field.hide_label ? ' is-faint' : '' ) }, field.label, field.hide_label ? ' ' + __( '(title hidden on the form)', 'refraction' ) : '' );
			const panels = field.children.map( ( panel, i ) => panelBlock( panel, field, i ) );

			const columns = 'columns' === field.type;
			const body = columns ? h( 'div', { class: 'rfb-cv-columns', style: '--rfb-col-gap:' + field.col_gap + 'px' }, panels ) : null;

			el.append( h( 'div', { class: 'rfb-cv-container rfb-cv-host rfb-' + field.type + ( 'tabs' === field.type ? ' rfb-tabs-' + field.tab_look : '' ) }, title, field.description && ! columns ? h( 'p', { class: 'rfb-description' }, field.description ) : null, ...( columns ? [ body ] : ( 'tabs' === field.type ? [ canvasTabs( field ), ...panels ] : panels ) ),
				h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary rfb-cv-addpanel', onClick: ( e ) => { e.stopPropagation(); addPanel( field ); } }, 'tabs' === field.type ? __( 'Add tab', 'refraction' ) : ( 'columns' === field.type ? __( 'Add column', 'refraction' ) : __( 'Add panel', 'refraction' ) ) ) ) );
		} else if ( isChoiceSet( field.type ) ) {
			const title = h( 'strong', { class: 'rfb-cv-title' + ( field.hide_label ? ' is-faint' : '' ) }, field.label, ' · ', field.multiple ? __( 'pick several', 'refraction' ) : __( 'pick one', 'refraction' ) );

			el.append( h( 'div', { class: 'rfb-cv-container rfb-cv-cards', style: '--rfb-cc-gap:' + field.card_gap + 'px' }, title, field.description ? h( 'p', { class: 'rfb-description' }, field.description ) : null, h( 'div', { class: 'rfb-cc-list' }, list( field.children, field ) ),
				h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary rfb-cv-addpanel', onClick: ( e ) => { e.stopPropagation(); addCard( field ); } }, __( 'Add card', 'refraction' ) ) ) );
		} else if ( isContainer( field.type ) && owner && isChoiceSet( owner.type ) ) {
			el.append( cardBlock( field, owner ) );
		} else if ( isContainer( field.type ) ) {
			// Drawn with the real classes (rfb-repeater, rfb-rep-row, rfb-group) so what you style here is what the page gets.
			const title = h( 'strong', { class: 'rfb-cv-title' + ( field.hide_label ? ' is-faint' : '' ) }, field.label, 'repeater' === field.type ? ' · ' + __( 'repeats', 'refraction' ) : '', field.hide_label ? ' ' + __( '(title hidden on the form)', 'refraction' ) : '' );
			const description = field.description ? h( 'p', { class: 'rfb-description' }, field.description ) : null;
			const inner = list( field.children, field );
			const body = 'repeater' === field.type
				? h( 'div', { class: 'rfb-repeater' }, title, description, h( 'div', { class: 'rfb-rows' }, h( 'div', { class: 'rfb-rep-row' }, inner, h( 'span', { class: 'rfb-rep-remove', 'aria-hidden': 'true' }, '×' ) ) ), h( 'span', { class: 'rfb-btn rfb-btn-light-primary', 'data-rfb-add': '', 'aria-hidden': 'true' }, field.add_label ) )
				: h( 'div', { class: 'rfb-group' }, title, description, inner );

			el.append( h( 'div', { class: 'rfb-cv-container' }, body ) );
		} else {
			el.append( h( 'div', { class: 'rfb-cv-preview-body', 'aria-hidden': 'true' }, faux( field ) ) );
		}

		return el;
	}

	/** A panel (or tab) inside an Accordion or Tabs: a titled drop area you can select, move and delete. */
	function panelBlock( panel, host, index ) {
		const accordion = 'accordion' === host.type;
		const kind = 'tabs' === host.type ? __( 'Tab', 'refraction' ) : ( 'columns' === host.type ? __( 'Column', 'refraction' ) : __( 'Panel', 'refraction' ) );
		const button = ( label, symbol, action, extra = '' ) => h( 'button', { type: 'button', class: 'rfb-icon-btn ' + extra, 'aria-label': label, title: label, onClick: ( e ) => { e.stopPropagation(); action(); } }, symbol );
		const tools = [
			button( sprintf( __( 'Move %s up', 'refraction' ), panel.label ), '↑', () => index > 0 && move( panel._id, host, index - 1 ) ),
			button( sprintf( __( 'Move %s down', 'refraction' ), panel.label ), '↓', () => index < host.children.length - 1 && move( panel._id, host, index + 2 ) ),
			button( sprintf( __( 'Delete %s', 'refraction' ), panel.label ), '✕', () => removeField( panel ), 'rfb-icon-danger' ),
		];
		const classes = 'rfb-cv-panel'
			+ ( 'columns' === host.type ? ' rfb-w-' + panel.width : '' )
			+ ( accordion ? ' rfb-acc-item' : '' ) + ( 'tabs' === host.type ? ' rfb-tabpanel' : '' )
			+ ( selected === panel._id ? ' is-selected' : '' ) + ( panel.conditions && panel.conditions.enabled ? ' is-conditional' : '' );

		return h( 'div', {
			class: classes, 'data-id': panel._id, 'data-rfb-key': panel.key, open: accordion ? '' : undefined,
			onClick: ( e ) => {
				e.stopPropagation();
				selected = panel._id;
				tab = 'field';
				fieldState = 'normal';
				previewState = false;
				expand( 'right' );
				renderBuild();
			},
		},
		// An accordion panel is drawn with the real header and body classes, so the Style tab shows here as on the page.
		accordion ? h( 'div', { class: 'rfb-cv-panel-tools' }, tools ) : null,
		accordion ? h( 'div', { class: 'rfb-acc-head' }, panel.label ) : h( 'div', { class: 'rfb-cv-panel-head' }, h( 'strong', null, kind + ': ' + panel.label ), ...tools ),
		accordion ? h( 'div', { class: 'rfb-acc-body' }, list( panel.children, panel ) ) : list( panel.children, panel ) );
	}

	/** The tab row of a Tabs block on the canvas, with the real classes; the tab you picked (or the first) looks selected. */
	function canvasTabs( host ) {
		const current = host.children.find( ( p ) => p._id === selected ) || host.children[ 0 ];

		return h( 'div', { class: 'rfb-tablist', role: 'tablist' }, host.children.map( ( p ) => h( 'span', {
			class: 'rfb-tab' + ( p === current ? ' is-active' : '' ), role: 'tab', 'aria-selected': String( p === current ),
			onClick: ( e ) => { e.stopPropagation(); selected = p._id; renderBuild(); },
		}, p.label ) ) );
	}

	function addPanel( host ) {
		const panel = baseField( 'panel' );

		panel.label = ( 'tabs' === host.type ? __( 'Tab', 'refraction' ) : ( 'columns' === host.type ? __( 'Column', 'refraction' ) : __( 'Panel', 'refraction' ) ) ) + ' ' + ( host.children.length + 1 );
		panel.width = 'columns' === host.type ? 'half' : 'full';
		panel.key = uniqueKey( 'panel' );
		insert( tag( panel ), host, host.children.length );
	}

	function addCard( set ) {
		insert( tag( newCards( set.key, 1, all( set.children ).map( ( f ) => f.key ) )[ 0 ] ), set, set.children.length );
	}

	/** One card of a choice set: its own container (free: the pick control and the blocks you drop in; standard: the fixed header and a details area). */
	function cardBlock( card, set ) {
		const cardLook = ( card.marker_look || set.marker_look || 'radio' );
		const cardPos = ( card.marker_pos || set.marker_pos || 'left' );
		const picked = set.default === card.key || ( selected === card._id && previewState );
		const free = 'free' === card.card_mode;
		const mark = h( 'span', { class: 'rfb-cc-mark' + ( set.multiple ? ' is-check' : '' ) } );

		if ( free ) {
			return h( 'div', { class: 'rfb-cv-container rfb-choice-card rfb-t-card is-free rfb-mpos-' + cardPos + ' rfb-mlook-' + cardLook + ( picked ? ' is-selected' : '' ) },
				h( 'span', { class: 'rfb-cc-pick', 'aria-hidden': 'true' }, mark ),
				h( 'div', { class: 'rfb-cc-content' }, list( card.children, card ) ) );
		}

		const price = null !== card.card_price && '' !== card.card_price
			? h( 'span', { class: 'rfb-cc-price' }, h( 'span', { class: 'rfb-cc-amount' }, fmtMoney( card.card_price, true ) ), perText( card ) ? h( 'span', { class: 'rfb-cc-per' }, ' ' + perText( card ) ) : null )
			: ( card.card_note ? h( 'span', { class: 'rfb-cc-price' }, h( 'span', { class: 'rfb-cc-note' }, card.card_note ) ) : h( 'span', { class: 'rfb-cc-price' } ) );

		return h( 'div', { class: 'rfb-cv-container rfb-choice-card rfb-t-card' + ( picked ? ' is-selected' : '' ) },
			h( 'div', { class: 'rfb-cc-main' }, mark,
				h( 'span', { class: 'rfb-cc-body' }, h( 'span', { class: 'rfb-cc-title' }, card.label, card.card_badge ? h( 'span', { class: 'rfb-cc-badge' }, ' ' + card.card_badge ) : null ), card.card_subtitle ? h( 'span', { class: 'rfb-cc-sub' }, card.card_subtitle ) : null ), price ),
			h( 'div', { class: 'rfb-cc-fields' }, h( 'span', { class: 'rfb-mini' }, card.card_details + ' · ' + __( 'shown, not editable on the form', 'refraction' ) ), list( card.children, card ) ) );
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
		const candidates = all().filter( ( f ) => hasValue( f.type ) && ! isContainer( f.type ) && ! isChoiceSet( f.type ) && 'file' !== f.type && f !== field );
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

	const MARKER_POS = { left: __( 'Left', 'refraction' ), right: __( 'Right', 'refraction' ), 'top-left': __( 'Top left corner', 'refraction' ), 'top-right': __( 'Top right corner', 'refraction' ), hidden: __( 'Hidden (the whole card is clickable)', 'refraction' ) };
	const MARKER_LOOK = { radio: __( 'Radio circle (square when several can be picked)', 'refraction' ), tick: __( 'Tick badge once picked', 'refraction' ), none: __( 'None', 'refraction' ) };

	/** Switching a standard card to a free container keeps how it looked: its title, text, badge and price become blocks. */
	function cardToFree( card ) {
		if ( card.children.some( ( c ) => 'columns' === c.type || ( 'heading' === c.type && c.from_card ) ) ) {
			return;
		}

		const used = [];
		const make = ( type, label, extra = {} ) => {
			const block = tag( Object.assign( baseField( type ), { label, key: uniqueKey( type, null, used ) }, extra ) );

			used.push( block.key );

			return block;
		};
		const left = [ make( 'heading', __( 'Card title', 'refraction' ), { from_card: true, level: 3 } ) ];

		if ( card.card_badge ) {
			left.push( make( 'badge', __( 'Badge', 'refraction' ), { content: card.card_badge } ) );
		}

		if ( card.card_subtitle ) {
			left.push( make( 'paragraph', __( 'Paragraph', 'refraction' ), { content: card.card_subtitle } ) );
		}

		const right = [];

		if ( null !== card.card_price && '' !== card.card_price ) {
			right.push( make( 'price', __( 'Price', 'refraction' ), { style: { align: 'right' } } ) );
		} else if ( card.card_note ) {
			right.push( make( 'paragraph', __( 'Paragraph', 'refraction' ), { content: card.card_note, style: { align: 'right' } } ) );
		}

		const column = ( label, width, children ) => tag( Object.assign( baseField( 'panel' ), { label, width, children, key: uniqueKey( 'panel', null, used ) } ) );
		const header = make( 'columns', __( 'Header', 'refraction' ) );

		header.children = [ column( __( 'Column', 'refraction' ) + ' 1', right.length ? 'w70' : 'full', left ) ];

		if ( right.length ) {
			header.children.push( column( __( 'Column', 'refraction' ) + ' 2', 'w30', right ) );
		}

		card.children = [ header, ...card.children ];
	}

	/** Ready-made splits for the Columns block: label and the width of each column. */
	const SPLITS = [
		[ '50 / 50', [ 'half', 'half' ] ], [ '33 / 33 / 33', [ 'third', 'third', 'third' ] ], [ '25 × 4', [ 'w25', 'w25', 'w25', 'w25' ] ], [ '20 × 5', [ 'w20', 'w20', 'w20', 'w20', 'w20' ] ],
		[ '10 / 90', [ 'w10', 'w90' ] ], [ '20 / 80', [ 'w20', 'w80' ] ], [ '25 / 75', [ 'w25', 'w75' ] ], [ '30 / 70', [ 'w30', 'w70' ] ], [ '40 / 60', [ 'w40', 'w60' ] ],
		[ '60 / 40', [ 'w60', 'w40' ] ], [ '70 / 30', [ 'w70', 'w30' ] ], [ '75 / 25', [ 'w75', 'w25' ] ], [ '80 / 20', [ 'w80', 'w20' ] ], [ '90 / 10', [ 'w90', 'w10' ] ],
		[ '25 / 50 / 25', [ 'w25', 'half', 'w25' ] ], [ '20 / 60 / 20', [ 'w20', 'w60', 'w20' ] ],
	];

	/** Makes the columns match a split: adds columns, or folds the fields of the extra ones into the last kept column. */
	function applySplit( host, widths ) {
		while ( host.children.length < widths.length ) {
			const panel = tag( baseField( 'panel' ) );

			panel.label = __( 'Column', 'refraction' ) + ' ' + ( host.children.length + 1 );
			panel.key = uniqueKey( 'panel' );
			host.children.push( panel );
		}

		if ( host.children.length > widths.length ) {
			const extra = host.children.splice( widths.length );
			const last = host.children[ widths.length - 1 ];

			extra.forEach( ( column ) => last.children.push( ...column.children ) );
		}

		widths.forEach( ( width, i ) => ( host.children[ i ].width = width ) );
		markDirty();
		renderBuild();
	}

	function columnsControls( f, rerender ) {
		const current = f.children.map( ( c ) => c.width ).join( ',' );

		return h( 'div', { class: 'rfb-splits' },
			h( 'span', { class: 'rfb-mini' }, __( 'Split', 'refraction' ) ),
			h( 'div', { class: 'rfb-split-grid', role: 'group', 'aria-label': __( 'Column split', 'refraction' ) }, SPLITS.map( ( [ label, widths ] ) => h( 'button', {
				type: 'button', class: 'rfb-split-btn' + ( widths.join( ',' ) === current ? ' is-active' : '' ), 'aria-pressed': String( widths.join( ',' ) === current ), title: label,
				onClick: () => applySplit( f, widths ),
			}, label ) ) ),
			row( __( 'Space between columns (px)', 'refraction' ), text( f, 'col_gap', { type: 'number', number: true, min: 0, max: 80, after: rerender } ) ),
			h( 'p', { class: 'rfb-help' }, __( 'Pick a split, or add columns and give each its own width. Fields from removed columns move to the last column.', 'refraction' ) ) );
	}

	/** The items of an Icon List: icon, text and an optional link each, in the order shown. */
	function iconItemsEditor( f ) {
		const wrap = h( 'div', { class: 'rfb-il-editor' } );
		const icons = Object.keys( config.listIcons || {} );
		const choices = Object.fromEntries( icons.map( ( name ) => [ name, name.replace( /-/g, ' ' ) ] ) );
		const draw = () => {
			wrap.replaceChildren(
				h( 'span', { class: 'rfb-mini' }, __( 'Items', 'refraction' ) ),
				...f.items.map( ( item, i ) => {
					const preview = h( 'span', { class: 'rfb-il-pick-icon', 'aria-hidden': 'true' } );
					const show = () => { preview.innerHTML = ( config.listIcons && config.listIcons[ item.icon ] ) || ''; };

					show();

					return h( 'div', { class: 'rfb-il-row' },
						h( 'div', { class: 'rfb-il-row-top' }, preview,
							select( item, 'icon', choices, { label: __( 'Icon', 'refraction' ), after: () => { show(); renderCanvasOnly(); } } ),
							h( 'button', { type: 'button', class: 'rfb-icon-btn', 'aria-label': __( 'Move item up', 'refraction' ), onClick: () => { if ( i > 0 ) { f.items.splice( i - 1, 0, f.items.splice( i, 1 )[ 0 ] ); markDirty(); draw(); renderCanvasOnly(); } } }, '↑' ),
							h( 'button', { type: 'button', class: 'rfb-icon-btn', 'aria-label': __( 'Move item down', 'refraction' ), onClick: () => { if ( i < f.items.length - 1 ) { f.items.splice( i + 1, 0, f.items.splice( i, 1 )[ 0 ] ); markDirty(); draw(); renderCanvasOnly(); } } }, '↓' ),
							h( 'button', { type: 'button', class: 'rfb-icon-btn rfb-icon-danger', 'aria-label': __( 'Remove item', 'refraction' ), onClick: () => { f.items.splice( i, 1 ); markDirty(); draw(); renderCanvasOnly(); } }, '✕' ) ),
						text( item, 'text', { label: __( 'Item text', 'refraction' ), placeholder: __( 'Text', 'refraction' ), after: renderCanvasOnly } ),
						text( item, 'link', { label: __( 'Link (optional)', 'refraction' ), placeholder: 'https://', after: () => {} } ) );
				} ),
				h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary', onClick: () => {
					const last = f.items[ f.items.length - 1 ];

					f.items.push( { text: __( 'New item', 'refraction' ), icon: last ? last.icon : 'check', link: '' } );
					markDirty();
					draw();
					renderCanvasOnly();
				} }, __( 'Add item', 'refraction' ) ) );
		};

		draw();

		return wrap;
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
			row( __( 'Alignment', 'refraction' ), select( f, 'image_align', { left: __( 'Left', 'refraction' ), center: __( 'Center', 'refraction' ), right: __( 'Right', 'refraction' ) }, { after } ), __( 'Shows when the width is below 100%.', 'refraction' ) ),
			row( __( 'Alternative text', 'refraction' ), text( f, 'image_alt', { after } ), __( 'Describe the image for people who can not see it. Leave empty for a purely decorative logo.', 'refraction' ) ),
			row( __( 'Link (optional)', 'refraction' ), text( f, 'image_link', { type: 'url', placeholder: 'https://' } ) ) );
	}

	// ---------------------------------------------------------------- field styling (the Style sub-tab of a field)

	const scopeChoice = {}; // field id => 'type' | 'field'

	const FS_LABELS = {
		bg: __( 'Background color', 'refraction' ), border_style: __( 'Border style', 'refraction' ), border_width: __( 'Border width (px)', 'refraction' ), border_color: __( 'Border color', 'refraction' ),
		radius: __( 'Border radius (px)', 'refraction' ), shadow: __( 'Box shadow', 'refraction' ), align: __( 'Alignment', 'refraction' ),
		h_bg: __( 'Background color', 'refraction' ), h_border_color: __( 'Border color', 'refraction' ), h_shadow: __( 'Box shadow', 'refraction' ),
		f_bg: __( 'Background color', 'refraction' ), f_border_color: __( 'Border color', 'refraction' ), f_shadow: __( 'Box shadow', 'refraction' ),
		l_color: __( 'Text color', 'refraction' ), l_family: __( 'Font', 'refraction' ), l_size: __( 'Size (px)', 'refraction' ), l_weight: __( 'Weight', 'refraction' ),
		l_transform: __( 'Capitalization', 'refraction' ), l_spacing: __( 'Letter spacing (px)', 'refraction' ), l_height: __( 'Line height (%)', 'refraction' ), l_italic: __( 'Italic', 'refraction' ),
		lh_color: __( 'Text color', 'refraction' ), lh_bg: __( 'Background color', 'refraction' ), lf_color: __( 'Text color', 'refraction' ), lf_bg: __( 'Background color', 'refraction' ),
		c_color: __( 'Text color', 'refraction' ), c_bg: __( 'Background color', 'refraction' ), c_border_style: __( 'Border style', 'refraction' ), c_border_width: __( 'Border width (px)', 'refraction' ),
		c_border_color: __( 'Border color', 'refraction' ), c_radius: __( 'Border radius (px)', 'refraction' ), c_shadow: __( 'Box shadow', 'refraction' ), c_family: __( 'Font', 'refraction' ),
		c_size: __( 'Text size (px)', 'refraction' ), c_weight: __( 'Text weight', 'refraction' ), c_pad_y: __( 'Padding above and below (px)', 'refraction' ), c_pad_x: __( 'Padding left and right (px)', 'refraction' ),
		ch_color: __( 'Text color', 'refraction' ), ch_bg: __( 'Background color', 'refraction' ), ch_border_color: __( 'Border color', 'refraction' ), ch_shadow: __( 'Box shadow', 'refraction' ),
		cf_color: __( 'Text color', 'refraction' ), cf_bg: __( 'Background color', 'refraction' ), cf_border_color: __( 'Border color', 'refraction' ), cf_shadow: __( 'Box shadow', 'refraction' ),
		d_color: __( 'Text color', 'refraction' ), d_size: __( 'Size (px)', 'refraction' ), d_italic: __( 'Italic', 'refraction' ),
		b_bg: __( 'Background color', 'refraction' ), b_color: __( 'Text color', 'refraction' ), b_border_color: __( 'Border color', 'refraction' ), b_radius: __( 'Border radius (px)', 'refraction' ),
		bh_bg: __( 'Background color', 'refraction' ), bh_color: __( 'Text color', 'refraction' ), bh_border_color: __( 'Border color', 'refraction' ),
		b_on_bg: __( 'Background color', 'refraction' ), b_on_color: __( 'Text color', 'refraction' ), b_on_border_color: __( 'Border color', 'refraction' ),
		pc_color: __( 'Text color', 'refraction' ), pc_size: __( 'Size (px)', 'refraction' ), pc_weight: __( 'Weight', 'refraction' ), pa_accent: __( 'Radio / checkbox color', 'refraction' ),
		ph_color: __( 'Text color', 'refraction' ), po_color: __( 'Text color', 'refraction' ), po_weight: __( 'Weight', 'refraction' ),
		tg_off: __( 'Track color (off)', 'refraction' ), tg_radius: __( 'Track radius (px)', 'refraction' ), tgh_off: __( 'Track color (off)', 'refraction' ), tg_on: __( 'Track color (on)', 'refraction' ), tg_knob: __( 'Knob color', 'refraction' ),
		rows_gap: __( 'Space between rows (px)', 'refraction' ),
		rb_bg: __( 'Background color', 'refraction' ), rb_color: __( 'Text color', 'refraction' ), rb_border_color: __( 'Border color', 'refraction' ), rb_radius: __( 'Border radius (px)', 'refraction' ), rb_size: __( 'Text size (px)', 'refraction' ), rb_weight: __( 'Text weight', 'refraction' ),
		rbh_bg: __( 'Background color', 'refraction' ), rbh_color: __( 'Text color', 'refraction' ), rbh_border_color: __( 'Border color', 'refraction' ),
		rbf_bg: __( 'Background color', 'refraction' ), rbf_color: __( 'Text color', 'refraction' ), rbf_border_color: __( 'Border color', 'refraction' ),
		im_align: __( 'Alignment', 'refraction' ), im_width: __( 'Width (%)', 'refraction' ), im_fit: __( 'Fit', 'refraction' ), im_height: __( 'Height (px)', 'refraction' ),
		il_gap: __( 'Space between items (px)', 'refraction' ), il_ic_color: __( 'Icon color', 'refraction' ), il_ic_bg: __( 'Icon background', 'refraction' ), il_ic_size: __( 'Icon size (px)', 'refraction' ), il_ich_color: __( 'Icon color', 'refraction' ),
		il_tx_color: __( 'Text color', 'refraction' ), il_tx_size: __( 'Text size (px)', 'refraction' ), il_tx_weight: __( 'Text weight', 'refraction' ), il_txh_color: __( 'Text color', 'refraction' ),
		cs_bg: __( 'Background color', 'refraction' ), cs_border_style: __( 'Border style', 'refraction' ), cs_border_width: __( 'Border width (px)', 'refraction' ), cs_border_color: __( 'Border color', 'refraction' ), cs_shadow: __( 'Box shadow', 'refraction' ),
		mk_size: __( 'Size (px)', 'refraction' ), mk_color: __( 'Tick color', 'refraction' ), mk_bg: __( 'Background color', 'refraction' ), mk_border_color: __( 'Border color', 'refraction' ),
		mko_color: __( 'Tick color', 'refraction' ), mko_bg: __( 'Background color', 'refraction' ), mko_border_color: __( 'Border color', 'refraction' ),
		ah_color: __( 'Text color', 'refraction' ), ah_size: __( 'Text size (px)', 'refraction' ), ah_weight: __( 'Text weight', 'refraction' ), ahh_color: __( 'Text color', 'refraction' ), aho_color: __( 'Text color', 'refraction' ),
		tb_color: __( 'Text color', 'refraction' ), tb_size: __( 'Text size (px)', 'refraction' ), tb_weight: __( 'Text weight', 'refraction' ), tbh_color: __( 'Text color', 'refraction' ), tbo_color: __( 'Text color', 'refraction' ),
		tp_bg: __( 'Background color', 'refraction' ), tp_border_style: __( 'Border style', 'refraction' ), tp_border_width: __( 'Border width (px)', 'refraction' ), tp_border_color: __( 'Border color', 'refraction' ), tp_radius: __( 'Border radius (px)', 'refraction' ), tp_pad: __( 'Padding (px)', 'refraction' ),
		ct_color: __( 'Text color', 'refraction' ), ct_size: __( 'Text size (px)', 'refraction' ), ct_weight: __( 'Text weight', 'refraction' ), cp_color: __( 'Text color', 'refraction' ), cp_size: __( 'Text size (px)', 'refraction' ), cp_weight: __( 'Text weight', 'refraction' ),
		rr_color: __( 'Symbol color', 'refraction' ), rr_bg: __( 'Background color', 'refraction' ), rrh_color: __( 'Symbol color', 'refraction' ), rrh_bg: __( 'Background color', 'refraction' ),
	};

	/** The label of a property: its own, or (for the repeater, row and group copies of the box properties) the box property's. */
	const fsLabel = ( key ) => FS_LABELS[ key ] || FS_LABELS[ key.replace( /^(?:rep|row|grp|acc|acch|tab|card|im)_/, '' ) ] || key;

	const FS_ENUMS = {
		border_style: { none: __( 'None', 'refraction' ), solid: __( 'Solid', 'refraction' ), dashed: __( 'Dashed', 'refraction' ), dotted: __( 'Dotted', 'refraction' ), double: __( 'Double', 'refraction' ) },
		shadow: { none: __( 'None', 'refraction' ), soft: __( 'Soft', 'refraction' ), medium: __( 'Medium', 'refraction' ), strong: __( 'Strong', 'refraction' ) },
		align: { left: __( 'Left', 'refraction' ), center: __( 'Center', 'refraction' ), right: __( 'Right', 'refraction' ), justify: __( 'Justify', 'refraction' ) },
		family: { inherit: __( 'Same as the form', 'refraction' ), system: __( 'System', 'refraction' ), serif: __( 'Serif', 'refraction' ), mono: __( 'Monospace', 'refraction' ) },
		weight: { 300: __( 'Light', 'refraction' ), 400: __( 'Normal', 'refraction' ), 500: __( 'Medium', 'refraction' ), 600: __( 'Semi-bold', 'refraction' ), 700: __( 'Bold', 'refraction' ), 800: __( 'Extra bold', 'refraction' ), 900: __( 'Black', 'refraction' ) },
		fit: { cover: __( 'Fill the box (crop)', 'refraction' ), contain: __( 'Show all of it', 'refraction' ), fill: __( 'Stretch', 'refraction' ) },
		im_align: { left: __( 'Left', 'refraction' ), center: __( 'Center', 'refraction' ), right: __( 'Right', 'refraction' ) },
		transform: { none: __( 'None', 'refraction' ), uppercase: __( 'UPPERCASE', 'refraction' ), lowercase: __( 'lowercase', 'refraction' ), capitalize: __( 'Capitalize', 'refraction' ) },
	};

	/** What a group is called in the panel; hover and focus groups carry their state in the tab, so they share the name. */
	function fsGroupTitle( group, type ) {
		const base = group.replace( /_(hover|focus|on)$/, '' );
		const titles = {
			box: __( 'Spacing, background and border', 'refraction' ),
			label: [ 'heading', 'paragraph' ].includes( type ) ? __( 'Text', 'refraction' ) : ( [ 'step', 'group', 'repeater', 'accordion', 'tabs', 'choice_set' ].includes( type ) ? __( 'Title', 'refraction' ) : __( 'Label', 'refraction' ) ),
			control: { divider: __( 'Line', 'refraction' ), image: __( 'Image', 'refraction' ), html: __( 'HTML block', 'refraction' ), signature: __( 'Signature pad', 'refraction' ), file: __( 'File box', 'refraction' ) }[ type ] || __( 'Input', 'refraction' ),
			desc: __( 'Description and help', 'refraction' ),
			choice: __( 'Buttons', 'refraction' ), plain: __( 'Choice text', 'refraction' ), plain_accent: __( 'Radio / checkbox', 'refraction' ),
			toggle: __( 'Switch track', 'refraction' ), toggle_knob: __( 'Switch knob', 'refraction' ),
			image_box: __( 'Image box (.rfb-image)', 'refraction' ), image_img: __( 'The picture', 'refraction' ),
			il_list: __( 'List', 'refraction' ), il_icon: __( 'Icons', 'refraction' ), il_text: __( 'Item text', 'refraction' ),
			rep: __( 'Repeater box (.rfb-repeater)', 'refraction' ), rep_rows: __( 'Rows list', 'refraction' ), row: __( 'Each row (.rfb-rep-row)', 'refraction' ),
			rep_button: __( 'Add-row button', 'refraction' ), rep_remove: __( 'Remove-row button', 'refraction' ), grp: __( 'Group box (.rfb-group)', 'refraction' ),
			acc_item: __( 'Each panel (.rfb-acc-item)', 'refraction' ), acc_head: __( 'Panel header (.rfb-acc-head)', 'refraction' ),
			tab: __( 'Tab buttons (.rfb-tab)', 'refraction' ), tab_panel: __( 'Tab content (.rfb-tabpanel)', 'refraction' ),
			cbox_on: __( 'Spacing, background and border', 'refraction' ), cmark: __( 'Pick control (radio / tick)', 'refraction' ), cmark_size: __( 'Pick control size', 'refraction' ),
			card: __( 'Each card (.rfb-choice-card)', 'refraction' ), card_title: __( 'Card title', 'refraction' ), card_price: __( 'Card price', 'refraction' ),
		};

		return titles[ base ] || titles[ group ];
	}

	/** The third state's name depends on the field: inputs have focus, choices have a selected option, switches are on, boxes become active. */
	function fsFocusName( type ) {
		if ( [ 'radio', 'checkbox' ].includes( type ) ) {
			return __( 'Selected', 'refraction' );
		}

		if ( 'toggle' === type ) {
			return __( 'On', 'refraction' );
		}

		if ( [ 'choice_set', 'card' ].includes( type ) ) {
			return __( 'Selected', 'refraction' );
		}

		if ( 'tabs' === type ) {
			return __( 'Selected tab', 'refraction' );
		}

		return [ 'repeater', 'group', 'accordion' ].includes( type ) ? ( 'accordion' === type ? __( 'Open', 'refraction' ) : __( 'Active', 'refraction' ) ) : __( 'Focus', 'refraction' );
	}

	/** Declarations per group for one style: the same table the server uses (Classes\Field_Style), so the canvas matches the page. */
	function fsDeclarations( style ) {
		const cfg = config.fieldStyle;
		const groups = {};

		Object.entries( style ).forEach( ( [ key, value ] ) => {
			const prop = cfg.properties[ key ];

			if ( ! prop ) {
				return;
			}

			let text = String( value );

			// The picture's alignment is made of margins (mirror of Field_Style::declarations).
			if ( 'im_align' === key ) {
				groups[ prop.group ] = ( groups[ prop.group ] || '' ) + { left: 'margin-left:0;margin-right:auto;', center: 'margin-left:auto;margin-right:auto;', right: 'margin-left:auto;margin-right:0;' }[ value ];
				return;
			}

			if ( 'int' === prop.kind ) {
				text = 'pct' === prop.unit ? String( Math.round( value ) / 100 ) : value + ( '%' === prop.unit ? '%' : 'px' );
			} else if ( 'bool' === prop.kind ) {
				text = 'italic';
			} else if ( 'box-shadow' === prop.css ) {
				text = cfg.shadows[ value ];
			} else if ( 'font-family' === prop.css ) {
				text = cfg.fonts[ value ];
			}

			groups[ prop.group ] = ( groups[ prop.group ] || '' ) + prop.css + ':' + text + ';';
		} );

		[ [ 'box', '' ], [ 'rep', 'rep_' ], [ 'row', 'row_' ], [ 'grp', 'grp_' ], [ 'control', 'c_' ], [ 'acc_item', 'acc_' ], [ 'acc_head', 'acch_' ], [ 'tab', 'tab_' ], [ 'tab_panel', 'tp_' ], [ 'card', 'card_' ], [ 'image_img', 'im_' ], [ 'cbox_on', 'cs_' ] ].forEach( ( [ group, prefix ] ) => {
			if ( ! groups[ group ] ) {
				return;
			}

			const hasStyle = undefined !== style[ prefix + 'border_style' ];
			const hasWidth = undefined !== style[ prefix + 'border_width' ];

			if ( hasWidth && ! hasStyle ) {
				groups[ group ] += 'border-style:solid;';
			} else if ( hasStyle && ! hasWidth && 'none' !== style[ prefix + 'border_style' ] ) {
				groups[ group ] += 'border-width:1px;';
			}
		} );

		return groups;
	}

	/** The parts of a field as they are drawn on the canvas: the preview body stands in for the field, choices sit one level down. */
	function canvasParts() {
		const parts = Object.assign( {}, config.fieldStyle.parts );

		Object.keys( parts ).forEach( ( group ) => {
			parts[ group ] = parts[ group ].split( ',' ).map( ( s ) => s.trim() ).map( ( s ) => {
				if ( s.startsWith( '&.rfb-choice-buttons' ) ) {
					return s.slice( 1 );
				}

				if ( s.startsWith( '&:not(.rfb-choice-buttons)' ) ) {
					return '.rfb-cv-choices' + s.slice( 1 );
				}

				return s;
			} ).join( ', ' );
		} );
		// A choice card is its own container: its box, selected look and pick control are drawn on that container.
		parts.cbox_on = '> .rfb-cv-container.is-selected';
		parts.cmark = '> .rfb-cv-container:not(.is-selected) .rfb-cc-mark';
		parts.cmark_size = '> .rfb-cv-container .rfb-cc-mark';
		parts.cmark_on = '> .rfb-cv-container.is-selected .rfb-cc-mark';
		parts.box = '> .rfb-cv-preview-body, > .rfb-cv-container';
		parts.box_hover = '> .rfb-cv-preview-body:hover, > .rfb-cv-container:hover';
		parts.box_focus = '> .rfb-cv-preview-body:focus-within, > .rfb-cv-container:focus-within';

		return parts;
	}

	/** Builds the rules of one style under a base selector; hover and focus rules also get a forced twin for the "preview" of the selected field. */
	function fsRules( style, base, parts ) {
		const cfg = config.fieldStyle;
		let css = '';

		Object.entries( fsDeclarations( style ) ).forEach( ( [ group, declarations ] ) => {
			const list = parts[ group ].split( ',' ).map( ( s ) => s.trim() );
			const join = ( prefix, s ) => prefix + ( '' === s ? '' : ( s.startsWith( ':' ) ? s : ( s.startsWith( '&' ) ? s.slice( 1 ) : ' ' + s ) ) );
			const selectors = list.map( ( s ) => join( base, s ) );

			if ( 'normal' !== cfg.states[ group ] && base.includes( '.rfb-cv-item' ) ) {
				// The same rule as if the pointer or focus were on the selected field.
				list.forEach( ( s ) => selectors.push( join( base + '.is-force', s.replace( /:(hover|focus-within|focus-visible|focus|active)\b/g, '' ).replace( /^(&?)\s+/, '$1 ' ) ) ) );
			}

			css += selectors.join( ', ' ) + '{' + declarations + '}';
		} );

		return css;
	}

	/** Writes the styling of every field and field type into the canvas, so you see it while you edit. */
	function updateFieldCss() {
		if ( ! refs.fieldCss || ! config.fieldStyle ) {
			return;
		}

		const parts = canvasParts();
		let css = '';

		Object.entries( state.type_styles || {} ).forEach( ( [ type, style ] ) => {
			if ( style && Object.keys( style ).length ) {
				css += fsRules( style, '.rfb-canvas .rfb-cv-item.rfb-cv-' + type, parts );
			}
		} );

		all().forEach( ( field ) => {
			if ( field.style && Object.keys( field.style ).length ) {
				// "rfb-cv-item" keeps this as specific as the shared type rules above it, so the later (own) rule wins.
				css += fsRules( field.style, '.rfb-canvas .rfb-cv-item[data-rfb-key="' + String( field.key ).replace( /[^a-z0-9_-]/g, '' ) + '"]', parts );
			}
		} );

		refs.fieldCss.textContent = css;
	}

	function fsColor( style, key, after ) {
		const label = fsLabel( key );
		const hex = h( 'input', { class: 'rfb-input rfb-hex', type: 'text', maxlength: 11, placeholder: __( 'default', 'refraction' ), 'aria-label': label + ' (hex)', value: style[ key ] || '' } );
		const picker = h( 'input', { type: 'color', 'aria-label': label, value: /^#[0-9a-f]{6}$/.test( style[ key ] || '' ) ? style[ key ] : '#ffffff' } );
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

		return h( 'div', { class: 'rfb-field rfb-w-full rfb-color' }, h( 'span', { class: 'rfb-mini' }, label ), h( 'div', { class: 'rfb-color-row' }, picker, hex, h( 'button', { type: 'button', class: 'rfb-icon-btn', 'aria-label': sprintf( __( 'Reset %s', 'refraction' ), label ), title: __( 'Reset', 'refraction' ), onClick: () => { hex.value = ''; set( '' ); } }, '↺' ) ) );
	}

	function fsNumber( style, key, label, after ) {
		const prop = config.fieldStyle.properties[ key ];
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
		const label = fsLabel( key );

		if ( 'color' === prop.kind ) {
			return fsColor( style, key, after );
		}

		if ( 'int' === prop.kind ) {
			return row( label, fsNumber( style, key, label, after ) );
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
			} } ), h( 'span', null, label ) );
		}

		const base = key.replace( /^(?:rep|row|grp)_/, '' ).replace( /^(?:b_on|ch|cf|rb|rbh|rbf|[lchdbp])_/, '' );
		const kind = [ 'weight', 'border_style', 'shadow', 'transform', 'family', 'fit' ].find( ( k ) => key.endsWith( k ) );
		const labels = FS_ENUMS[ key ] || FS_ENUMS[ kind ] || FS_ENUMS[ base ] || Object.fromEntries( prop.values.map( ( v ) => [ v, v ] ) );
		const choose = h( 'select', { class: 'rfb-input', 'aria-label': label, onChange: ( e ) => {
			if ( '' === e.target.value ) {
				delete style[ key ];
			} else {
				style[ key ] = e.target.value;
			}

			markDirty();
			after();
		} }, h( 'option', { value: '' }, __( 'Default', 'refraction' ) ), prop.values.map( ( v ) => h( 'option', { value: String( v ), selected: String( style[ key ] ) === String( v ) }, labels[ v ] || v ) ) );

		return row( label, choose );
	}

	/** Margin and padding as four boxes: top, right, bottom, left. */
	function fsSides( style, prefix, title, after ) {
		const sides = [ [ 'top', __( 'Top', 'refraction' ) ], [ 'right', __( 'Right', 'refraction' ) ], [ 'bottom', __( 'Bottom', 'refraction' ) ], [ 'left', __( 'Left', 'refraction' ) ] ];

		return h( 'fieldset', { class: 'rfb-choice rfb-sides' }, h( 'legend', { class: 'rfb-mini' }, title + ' (px)' ), h( 'div', { class: 'rfb-sides-row' }, sides.map( ( [ edge, label ] ) => h( 'label', { class: 'rfb-side-box' }, fsNumber( style, prefix + '_' + edge, title + ' ' + label.toLowerCase(), after ), h( 'span', { class: 'rfb-sublabel' }, label ) ) ) ) );
	}

	/** The style being edited: the shared one for every field of this type, or this field's own. */
	function fsScope( f ) {
		if ( ! scopeChoice[ f._id ] ) {
			scopeChoice[ f._id ] = f.style && Object.keys( f.style ).length ? 'field' : 'type';
		}

		return scopeChoice[ f._id ];
	}

	function fieldStylePanel( f ) {
		const cfg = config.fieldStyle;
		const ty = styleTypeOf( f ); // a card is styled as a card, not as the Group it is built on
		const typeName = typeLabels[ ty ] || ty;
		const scope = fsScope( f );
		const typeStyles = state.type_styles || ( state.type_styles = {} );
		const style = 'type' === scope ? ( typeStyles[ ty ] || ( typeStyles[ ty ] = {} ) ) : ( f.style || ( f.style = {} ) );
		const sameType = all().filter( ( x ) => styleTypeOf( x ) === ty ).length;
		const panel = h( 'div', { class: 'rfb-fieldstyle' } );
		const choiceLook = 'buttons' === ( ( f.style && f.style.choice_look ) || ( typeStyles[ ty ] || {} ).choice_look );
		const after = () => renderCanvasOnly();

		// Who is edited: every field of this type (the default), or only this one.
		panel.append( h( 'div', { class: 'rfb-scope', role: 'group', 'aria-label': __( 'Apply the style to', 'refraction' ) },
			h( 'button', { type: 'button', class: 'rfb-scope-btn' + ( 'type' === scope ? ' is-active' : '' ), 'aria-pressed': String( 'type' === scope ), 'data-scope': 'type', onClick: () => { scopeChoice[ f._id ] = 'type'; renderInspector(); } }, sprintf( __( 'All %1$s fields (%2$d)', 'refraction' ), typeName, sameType ) ),
			h( 'button', { type: 'button', class: 'rfb-scope-btn' + ( 'field' === scope ? ' is-active' : '' ), 'aria-pressed': String( 'field' === scope ), 'data-scope': 'field', onClick: () => { scopeChoice[ f._id ] = 'field'; renderInspector(); } }, __( 'Only this field', 'refraction' ) ) ) );
		panel.append( h( 'p', { class: 'rfb-help' }, 'type' === scope
			? sprintf( __( 'Changes apply to every %s field. Choose "Only this field" to give this one its own look.', 'refraction' ), typeName )
			: __( 'This field\'s own style wins over the one shared by its type.', 'refraction' ) ) );

		const groups = cfg.order.filter( ( g ) => cfg.applies[ g ] && ( '*' === cfg.applies[ g ] || cfg.applies[ g ].includes( ty ) ) )
			.filter( ( g ) => ! ( 'card' === ty && 'box_focus' === g ) ) // a card is "Selected", not "focused": its own selected look replaces it
			.filter( ( g ) => ! ( [ 'choice', 'choice_hover', 'choice_on' ].includes( g ) && ! choiceLook ) && ! ( [ 'plain', 'plain_accent', 'plain_hover', 'plain_on' ].includes( g ) && choiceLook ) );
		const states = [ 'normal', 'hover', 'focus' ].filter( ( s ) => groups.some( ( g ) => cfg.states[ g ] === s ) );

		if ( ! states.includes( fieldState ) ) {
			fieldState = 'normal';
		}

		if ( states.length > 1 ) {
			const names = { normal: __( 'Normal', 'refraction' ), hover: __( 'Hover', 'refraction' ), focus: fsFocusName( ty ) };

			panel.append( h( 'div', { class: 'rfb-state-tabs', role: 'tablist', 'aria-label': __( 'Look of the field when', 'refraction' ) }, states.map( ( s ) => h( 'button', {
				type: 'button', role: 'tab', class: 'rfb-state-tab' + ( fieldState === s ? ' is-active' : '' ), 'aria-selected': String( fieldState === s ), 'data-state': s,
				onClick: () => { fieldState = s; previewState = 'normal' !== s; renderInspector(); renderCanvasOnly(); },
			}, names[ s ] ) ) ) );
		}

		previewState = 'normal' !== fieldState;

		if ( 'normal' === fieldState && [ 'radio', 'checkbox' ].includes( f.type ) ) {
			const look = h( 'select', { class: 'rfb-input', 'aria-label': __( 'Choice look', 'refraction' ), onChange: ( e ) => {
				style.choice_look = e.target.value;

				markDirty();
				renderInspector();
				renderCanvasOnly();
			} }, h( 'option', { value: 'default' }, __( 'Plain list', 'refraction' ) ), h( 'option', { value: 'buttons', selected: choiceLook }, __( 'Buttons (like Yes / No)', 'refraction' ) ) );

			panel.append( section( __( 'Choice look', 'refraction' ), row( __( 'Show the choices as', 'refraction' ), look ) ) );
		}

		groups.filter( ( g ) => cfg.states[ g ] === fieldState ).forEach( ( group ) => {
			const keys = Object.keys( cfg.properties ).filter( ( k ) => cfg.properties[ k ].group === group );
			const controls = [];

			keys.filter( ( k ) => /margin_top$|padding_top$/.test( k ) ).forEach( ( k ) => {
				const kind = k.includes( 'margin' ) ? 'margin' : 'padding';

				controls.push( fsSides( style, k.replace( /_top$/, '' ), 'margin' === kind ? __( 'Margin', 'refraction' ) : __( 'Padding', 'refraction' ), after ) );
			} );
			keys.filter( ( k ) => ! /(margin|padding)_(top|right|bottom|left)$/.test( k ) && ! ( 'align' === k && [ 'image', 'divider', 'columns', 'accordion', 'tabs', 'choice_set', 'icon_list' ].includes( f.type ) ) )
				.forEach( ( k ) => controls.push( fsControl( style, k, after ) ) );
			panel.append( section( fsGroupTitle( group, ty ), controls ) );
		} );

		panel.append( h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light', onClick: () => {
			if ( 'type' === scope ) {
				delete typeStyles[ ty ];
			} else {
				f.style = {};
			}

			markDirty();
			renderInspector();
			renderCanvasOnly();
		} }, 'type' === scope ? sprintf( __( 'Reset the style of all %s fields', 'refraction' ), typeName ) : __( 'Reset this field\'s style', 'refraction' ) ) );

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
		const isCard = isContainer( t ) && !! found.parent && isChoiceSet( found.parent.type );
		const topLevel = ! found.parent || isTransparent( found.parent.type );
		const after = renderCanvasOnly;
		const rerender = () => {
			renderInspector();
			renderCanvasOnly();
		};

		box.append( h( 'div', { class: 'rfb-inspector-head' }, h( 'strong', null, typeLabels[ isCard ? 'card' : t ] || t ), h( 'code', null, f.key ) ) );
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
			general.push( row( 'step' === t ? __( 'Step title', 'refraction' ) : ( 'panel' === t ? ( found.parent && 'tabs' === found.parent.type ? __( 'Tab title', 'refraction' ) : __( 'Panel title', 'refraction' ) ) : ( isLayout( t ) ? __( 'Name in the builder', 'refraction' ) : ( isCard ? __( 'Card title', 'refraction' ) : __( 'Label', 'refraction' ) ) ) ), text( f, 'label', { after: () => {
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
		if ( ( 'step' === t || isContainer( t ) || isHost( t ) || isChoiceSet( t ) ) && ! isCard ) {
			general.push(
				h( 'label', { class: 'rfb-check' }, h( 'input', { type: 'checkbox', checked: ! f.hide_label, onChange: ( e ) => { f.hide_label = ! e.target.checked; markDirty(); renderCanvasOnly(); } } ), h( 'span', null, __( 'Show the title on the form', 'refraction' ) ) ),
				row( __( 'Title tag', 'refraction' ), select( f, 'label_tag', { div: 'div', p: 'p', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6' }, { after } ), __( 'Pick a heading level for headings, or p / div for plain text.', 'refraction' ) )
			);
		}

		if ( ( ( hasValue( t ) && 'hidden' !== t ) || 'step' === t || isHost( t ) ) && ! isCard ) {
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

		if ( 'accordion' === t ) {
			general.push( check( f, 'multiple', __( 'Allow several panels to be open at once', 'refraction' ) ) );
		}

		if ( 'columns' === t ) {
			general.push( columnsControls( f, rerender ) );
		}

		if ( 'panel' === t && found.parent && 'columns' === found.parent.type ) {
			general.push( row( __( 'Column width', 'refraction' ), select( f, 'width', config.widths, { after: renderCanvasOnly } ), __( 'On a phone the columns stack.', 'refraction' ) ) );
		}

		if ( 'icon_list' === t ) {
			general.push( row( __( 'Layout', 'refraction' ), select( f, 'list_layout', { vertical: __( 'One under the other', 'refraction' ), horizontal: __( 'Side by side, wrapping', 'refraction' ) }, { after } ) ), iconItemsEditor( f ) );
		}

		if ( 'tabs' === t ) {
			general.push( row( __( 'Tab look', 'refraction' ), select( f, 'tab_look', { line: __( 'Underline', 'refraction' ), pills: __( 'Pills', 'refraction' ) }, { after } ) ) );
		}

		if ( isHost( t ) ) {
			general.push( h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary', onClick: () => { addPanel( f ); } }, 'tabs' === t ? __( 'Add tab', 'refraction' ) : ( 'columns' === t ? __( 'Add column', 'refraction' ) : __( 'Add panel', 'refraction' ) ) ), h( 'p', { class: 'rfb-help' }, __( 'Drag any field into a panel. The fields keep their own answers; a panel only arranges them.', 'refraction' ) ) );
		}

		if ( 'panel' === t && found.parent && 'accordion' === found.parent.type ) {
			general.push( check( f, 'open', __( 'Open when the page loads', 'refraction' ) ) );
		}

		if ( isChoiceSet( t ) ) {
			general.push(
				check( f, 'multiple', __( 'Visitors can pick several cards', 'refraction' ), { after: rerender } ),
				h( 'div', { class: 'rfb-inline' }, row( __( 'Cards per row', 'refraction' ), text( f, 'card_columns', { type: 'number', number: true, min: 1, max: 6, after: rerender } ) ), row( __( 'Space between cards (px)', 'refraction' ), text( f, 'card_gap', { type: 'number', number: true, min: 0, max: 60, after: rerender } ) ) ),
				row( __( 'Pick control position', 'refraction' ), select( f, 'marker_pos', MARKER_POS, { after: rerender } ) ),
				row( __( 'Pick control look', 'refraction' ), select( f, 'marker_look', MARKER_LOOK, { after: rerender } ), __( 'Radio circle, a tick badge that shows once picked, or none (the whole card is still clickable).', 'refraction' ) ),
				row( __( 'Card picked at first', 'refraction' ), select( f, 'default', Object.assign( { '': __( 'None', 'refraction' ) }, Object.fromEntries( f.children.map( ( c ) => [ c.key, c.label ] ) ) ), { after } ) ),
				h( 'button', { type: 'button', class: 'rfb-btn rfb-btn-light-primary', onClick: () => { addCard( f ); } }, __( 'Add card', 'refraction' ) ),
				h( 'p', { class: 'rfb-help' }, __( 'Each card is a Group or Repeater. Fields inside a card are shown on the form but visitors can not change them.', 'refraction' ) )
			);
		}

		if ( isCard ) {
			const free = 'free' === f.card_mode;
			const inherit = ( choices ) => Object.assign( { '': __( 'Same as the set', 'refraction' ) }, choices );

			general.push(
				row( __( 'Card is built as', 'refraction' ), select( f, 'card_mode', { free: __( 'Free container (drop blocks in)', 'refraction' ), standard: __( 'Standard (title, badge, price header)', 'refraction' ) }, { after: () => { if ( 'free' === f.card_mode ) { cardToFree( f ); } rerender(); } } ), free ? __( 'The card name below is what is saved with the record. Everything you see on the card is a block you drop in.', 'refraction' ) : null ),
				row( __( 'Pick control position', 'refraction' ), select( f, 'marker_pos', inherit( MARKER_POS ), { after: rerender } ) ),
				row( __( 'Pick control look', 'refraction' ), select( f, 'marker_look', inherit( MARKER_LOOK ), { after: rerender } ) ),
				h( 'div', { class: 'rfb-inline' }, row( free ? __( 'Price saved with the record', 'refraction' ) : __( 'Price', 'refraction' ), text( f, 'card_price', { type: 'number', number: true, step: 'any', after } ) ), row( __( 'Price period', 'refraction' ), select( f, 'per', config.periods, { after: rerender } ) ) ),
				'custom' === f.per ? row( __( 'Period text', 'refraction' ), text( f, 'per_label', { after, placeholder: __( 'seat', 'refraction' ) } ) ) : null,
				row( __( 'Card width', 'refraction' ), select( f, 'card_width', Object.assign( { auto: __( 'Automatic (the set\'s cards per row)', 'refraction' ) }, config.widths ), { after } ), __( 'Give cards different widths for rows like 3 on top and 4 below.', 'refraction' ) )
			);

			if ( ! free ) {
				general.push(
					h( 'div', { class: 'rfb-inline' }, row( __( 'Badge', 'refraction' ), text( f, 'card_badge', { after, placeholder: __( 'Monthly', 'refraction' ) } ) ) ),
					row( __( 'Short text under the title', 'refraction' ), text( f, 'card_subtitle', { after } ) ),
					row( __( 'Text when there is no price', 'refraction' ), text( f, 'card_note', { after, placeholder: __( 'Price on request', 'refraction' ) } ) ),
					row( __( 'Name of the details link', 'refraction' ), text( f, 'card_details', { after } ) ),
					check( f, 'card_inline', __( 'Always show what is inside (no "What\'s included" link)', 'refraction' ), { after: rerender } ),
					f.card_inline ? null : check( f, 'card_details_open', __( 'Show the details open', 'refraction' ) )
				);
			}
		}

		if ( 'heading' === t && cardAround( f ) ) {
			general.push( check( f, 'from_card', __( 'Show the card\'s name', 'refraction' ), { after: rerender } ) );
		}

		if ( 'badge' === t ) {
			general.push( row( __( 'Badge text', 'refraction' ), text( f, 'content', { after } ) ) );
		}

		if ( 'price' === t ) {
			const around = cardAround( f );

			if ( around ) {
				general.push( check( f, 'price_card', __( 'Show the card\'s price', 'refraction' ), { after: rerender } ), h( 'p', { class: 'rfb-help' }, __( 'Set the card\'s price and period in the card\'s settings. It is also what is saved with the record.', 'refraction' ) ) );
			}

			if ( ! around || ! f.price_card ) {
				general.push( h( 'div', { class: 'rfb-inline' }, row( __( 'Price', 'refraction' ), text( f, 'price_amount', { type: 'number', number: true, step: 'any', after } ) ), row( __( 'Price period', 'refraction' ), select( f, 'per', config.periods, { after: rerender } ) ) ), 'custom' === f.per ? row( __( 'Period text', 'refraction' ), text( f, 'per_label', { after, placeholder: __( 'seat', 'refraction' ) } ) ) : null );
			}
		}

		if ( 'currency' === t ) {
			general.push( row( __( 'Price period', 'refraction' ), select( f, 'per', config.periods, { after: rerender } ), __( 'Shown beside the amount, for example "per month".', 'refraction' ) ), 'custom' === f.per ? row( __( 'Period text', 'refraction' ), text( f, 'per_label', { after, placeholder: __( 'seat', 'refraction' ) } ) ) : null );
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

		if ( hasValue( t ) && ! isContainer( t ) && ! isChoiceSet( t ) && ! [ 'file', 'name', 'signature', 'country' ].includes( t ) ) {
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

		if ( 'step' !== t && 'divider' !== t && 'panel' !== t && ! isCard && ! isHost( t ) || ( isHost( t ) && ! found.parent ) ) {
			look.push( row( __( 'Width', 'refraction' ), select( f, 'width', config.widths, { after: renderCanvasOnly } ), __( 'Shares of a row: fields and columns with widths that add up to 100% sit side by side.', 'refraction' ) ) );
		}

		look.push( row( __( 'CSS class', 'refraction' ), text( f, 'css_class', { placeholder: 'my-class' } ), __( 'Added to the field wrapper so you can style it in Custom CSS.', 'refraction' ) ) );

		if ( hasValue( t ) && 'hidden' !== t && ! isContainer( t ) && ! isChoiceSet( t ) ) {
			look.push( check( f, 'hide_label', __( 'Hide the label (keeps it for screen readers)', 'refraction' ) ) );
		}

		if ( ( isScalar( t ) || 'name' === t ) && topLevel ) {
			look.push( check( f, 'in_table', __( 'Show as a column in the records table', 'refraction' ) ), check( f, 'public', __( 'Show publicly (in the public list)', 'refraction' ) ) );
		}

		if ( hasOptions( t ) && 'checkbox' !== t && topLevel ) {
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
						const target = current && ( isHost( current.field.type ) ? current.field.children[ 0 ] : current.field );
						const owner = target && hasKids( target.type ) && canDrop( type, target ) ? target : null;

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

	/** Currency symbol and number format used by every Amount field, the records table, the public list and the cards. */
	function currencyCard() {
		const m = state.settings;
		const preview = h( 'strong', { class: 'rfb-money-preview' } );
		const refresh = () => {
			preview.textContent = fmtMoney( 1234567.891, true ) + ' ' + __( '(preview)', 'refraction' );
			renderCanvasOnly();
		};

		// The two separators can not be the same character: changing one moves the other, and the control shows it.
		const thousands = select( m, 'thousands_sep', { ',': __( 'Comma (1,200)', 'refraction' ), '.': __( 'Point (1.200)', 'refraction' ), ' ': __( 'Space (1 200)', 'refraction' ), '': __( 'None (1200)', 'refraction' ) }, { after: () => {
			if ( m.thousands_sep === m.decimal_sep ) {
				m.decimal_sep = '.' === m.thousands_sep ? ',' : '.';
				decimal.value = m.decimal_sep;
			}

			refresh();
		} } );
		const decimal = select( m, 'decimal_sep', { '.': __( 'Point (350.45)', 'refraction' ), ',': __( 'Comma (350,45)', 'refraction' ) }, { after: () => {
			if ( m.thousands_sep === m.decimal_sep ) {
				m.thousands_sep = '.' === m.decimal_sep ? ',' : '.';
				thousands.value = m.thousands_sep;
			}

			refresh();
		} } );

		refresh();

		return h( 'div', { class: 'rfb-card' }, h( 'div', { class: 'rfb-card-header' }, h( 'div', null, h( 'h2', null, __( 'Currency', 'refraction' ) ), h( 'p', null, __( 'How amounts are written. Visitors see 1,200 or 350,329.45 as they type; the saved number is always plain.', 'refraction' ) ) ) ),
			h( 'div', { class: 'rfb-card-body rfb-form-grid' },
				h( 'div', { class: 'rfb-field rfb-w-third' }, row( __( 'Currency symbol', 'refraction' ), text( m, 'currency_symbol', { after: refresh, placeholder: '$', maxlength: 6 } ), __( 'For example $, €, £, ₱ or PHP. Leave empty for none.', 'refraction' ) ) ),
				h( 'div', { class: 'rfb-field rfb-w-third' }, row( __( 'Symbol position', 'refraction' ), select( m, 'currency_position', { before: __( 'Before the amount', 'refraction' ), after: __( 'After the amount', 'refraction' ) }, { after: refresh } ) ) ),
				h( 'div', { class: 'rfb-field rfb-w-third' }, row( __( 'Decimal places', 'refraction' ), text( m, 'decimals', { type: 'number', number: true, min: 0, max: 4, after: refresh } ) ) ),
				h( 'div', { class: 'rfb-field rfb-w-half' }, row( __( 'Thousands separator', 'refraction' ), thousands ) ),
				h( 'div', { class: 'rfb-field rfb-w-half' }, row( __( 'Decimal separator', 'refraction' ), decimal ) ),
				h( 'p', { class: 'rfb-help rfb-w-full' }, preview ) ) );
	}

	function generalPanel() {
		const titles = flat( state.fields ).filter( ( f ) => isScalar( f.type ) );
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
			currencyCard(),
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

		// PHP sends an empty list as [] (see tag()); the styles shared by type are an object keyed by type.
		if ( ! state.type_styles || Array.isArray( state.type_styles ) ) {
			state.type_styles = {};
		}

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
