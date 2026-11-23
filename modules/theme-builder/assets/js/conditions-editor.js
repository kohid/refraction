import { __ } from '@wordpress/i18n';

/**
 * The display conditions picker, shared by the editor's Display Conditions control and the Theme Builder list
 * (0.147.0): rows of Include / Exclude, where, a narrower choice and, when it needs one, a post, term or user.
 *
 * Value: an array of rule strings such as `include/general` or `exclude/singular/page/7` (grammar in
 * docs/refraction/theme-builder.md). Rows that still miss a required target (for example "Specific author" without
 * an author) stay on screen but are not part of the value.
 */

export const SEARCH_DELAY = 250;

export const h = ( tag, attrs = {}, children = [] ) => {
	const node = document.createElement( tag );

	Object.keys( attrs ).forEach( ( key ) => {
		if ( 'class' === key ) {
			node.className = attrs[ key ];
		} else if ( 'text' === key ) {
			node.textContent = attrs[ key ];
		} else if ( key.startsWith( 'on' ) ) {
			node.addEventListener( key.slice( 2 ), attrs[ key ] );
		} else if ( false !== attrs[ key ] && null !== attrs[ key ] && undefined !== attrs[ key ] ) {
			node.setAttribute( key, true === attrs[ key ] ? '' : attrs[ key ] );
		}
	} );

	[].concat( children ).forEach( ( child ) => {
		if ( child ) {
			node.append( child );
		}
	} );

	return node;
};

function targetKind( target ) {
	const [ kind, subtype ] = String( target ).split( ':' );

	return { kind, subtype: subtype || '' };
}

/**
 * @param {Object}      options
 * @param {HTMLElement} options.mount    Where the picker is drawn.
 * @param {Object}      options.config   The rule groups, lookup endpoint and canEdit (Module::get_conditions_config()).
 * @param {string[]}    options.value    The rules to start with.
 * @param {Function}    options.onChange Called with the rules after every change.
 * @return {{setValue: Function, getValue: Function}} The picker.
 */
export function createConditionsEditor( { mount, config, value = [], onChange = () => {} } ) {
	const findGroup = ( name ) => config.conditions.find( ( group ) => group.name === name );

	// Split a rule string into an editable row. Unknown shapes are left out.
	const parseRule = ( rule ) => {
		const parts = String( rule ).split( '/' );
		const verb = parts.shift();
		const name = parts.shift();
		const group = findGroup( name );

		if ( ! group || ( 'include' !== verb && 'exclude' !== verb ) ) {
			return null;
		}

		let target = null;
		let path = parts.join( '/' );
		const last = parts[ parts.length - 1 ];

		if ( parts.length && /^\d+$/.test( last ) ) {
			const withoutId = parts.slice( 0, -1 ).join( '/' );
			const sub = group.subs.find( ( item ) => item.value === withoutId );

			if ( sub && sub.target ) {
				target = { id: parseInt( last, 10 ), text: '#' + last };
				path = withoutId;
			}
		}

		return { verb, name, sub: path, target };
	};

	const getSub = ( row ) => {
		const group = findGroup( row.name );

		return group && group.subs.find( ( item ) => item.value === row.sub );
	};

	const rowToRule = ( row ) => {
		const group = findGroup( row.name );
		const sub = getSub( row );

		if ( ! group || ( sub && sub.target && sub.required && ! row.target ) ) {
			return null;
		}

		const parts = [ row.verb, row.name ];

		if ( row.sub ) {
			parts.push( row.sub );
		}

		if ( sub && sub.target && row.target ) {
			parts.push( String( row.target.id ) );
		}

		return parts.join( '/' );
	};

	const lookup = ( params ) => {
		const body = new URLSearchParams( { action: config.action, _nonce: config.nonce, ...params } );

		return fetch( config.ajaxUrl, { method: 'POST', credentials: 'same-origin', body } )
			.then( ( response ) => response.json() )
			.then( ( json ) => ( json && json.success ? json.data.items : [] ) )
			.catch( () => [] );
	};

	let rows = [];

	const getValue = () => {
		const rules = [];

		rows.forEach( ( row ) => {
			const rule = rowToRule( row );

			if ( rule && ! rules.includes( rule ) ) {
				rules.push( rule );
			}
		} );

		return rules;
	};

	const commit = () => onChange( getValue() );
	const hasInclude = () => rows.some( ( row ) => 'include' === row.verb && rowToRule( row ) );

	let draw = () => {};

	const change = ( fn ) => () => {
		fn();
		commit();
		draw();
	};

	// Replace "#12" placeholders of saved targets by the real titles.
	const resolveLabels = () => {
		const groups = {};

		rows.forEach( ( row ) => {
			const sub = getSub( row );

			if ( row.target && sub && sub.target ) {
				groups[ sub.target ] = groups[ sub.target ] || new Set();
				groups[ sub.target ].add( row.target.id );
			}
		} );

		Object.keys( groups ).forEach( ( target ) => {
			const { kind, subtype } = targetKind( target );

			lookup( { kind, subtype, ids: [ ...groups[ target ] ].join( ',' ) } ).then( ( items ) => {
				let changed = false;

				rows.forEach( ( row ) => {
					const sub = getSub( row );
					const item = row.target && sub && sub.target === target && items.find( ( entry ) => entry.id === row.target.id );

					if ( item && row.target.text !== item.text ) {
						row.target.text = item.text;
						changed = true;
					}
				} );

				if ( changed ) {
					draw();
				}
			} );
		} );
	};

	const drawTarget = ( row, sub, disabled ) => {
		const { kind, subtype } = targetKind( sub.target );
		const placeholders = {
			post: __( 'Search by title, or leave empty for all', 'refraction' ),
			term: __( 'Search terms', 'refraction' ),
			user: __( 'Search users', 'refraction' ),
		};
		const wrap = h( 'div', { class: 'rtb-cond__target' } );

		if ( row.target ) {
			wrap.append( h( 'span', { class: 'rtb-cond__picked' }, [
				h( 'span', { class: 'rtb-cond__picked-text', text: row.target.text } ),
				! disabled && h( 'button', {
					type: 'button',
					'aria-label': __( 'Clear', 'refraction' ),
					text: '×',
					onclick: change( () => {
						row.target = null;
					} ),
				} ),
			] ) );

			return wrap;
		}

		const list = h( 'ul', { class: 'rtb-cond__results', role: 'listbox', hidden: true } );
		const input = h( 'input', {
			type: 'search',
			autocomplete: 'off',
			role: 'combobox',
			'aria-expanded': 'false',
			placeholder: sub.required ? placeholders[ kind ].replace( /, or leave empty for all$/, '' ) : placeholders[ kind ],
			disabled,
		} );
		let timer = null;
		let serial = 0;

		const close = () => {
			list.hidden = true;
			input.setAttribute( 'aria-expanded', 'false' );
		};

		const search = () => {
			const mine = ++serial;

			lookup( { kind, subtype, q: input.value } ).then( ( items ) => {
				if ( mine !== serial ) {
					return;
				}

				list.replaceChildren( ...( items.length ? items.map( ( item ) => h( 'li', { role: 'option', tabindex: '-1' }, [
					h( 'button', {
						type: 'button',
						onmousedown: ( event ) => event.preventDefault(),
						onclick: change( () => {
							row.target = { id: item.id, text: item.text };
						} ),
					}, [ h( 'span', { text: item.text } ), item.hint && h( 'small', { text: item.hint } ) ] ),
				] ) ) : [ h( 'li', { class: 'is-empty', text: __( 'Nothing found', 'refraction' ) } ) ] ) );
				list.hidden = false;
				input.setAttribute( 'aria-expanded', 'true' );
			} );
		};

		input.addEventListener( 'focus', search );
		input.addEventListener( 'input', () => {
			clearTimeout( timer );
			timer = setTimeout( search, SEARCH_DELAY );
		} );
		input.addEventListener( 'blur', () => setTimeout( close, 120 ) );
		input.addEventListener( 'keydown', ( event ) => {
			if ( 'Escape' === event.key ) {
				event.stopPropagation();
				close();
			}
		} );

		wrap.append( input, list );

		if ( sub.required ) {
			wrap.append( h( 'small', { class: 'rtb-cond__required', text: __( 'Choose one to apply this condition.', 'refraction' ) } ) );
		}

		return wrap;
	};

	const drawRow = ( row, index, disabled ) => {
		const group = findGroup( row.name );
		const sub = getSub( row );
		const incomplete = sub && sub.target && sub.required && ! row.target;
		const card = h( 'div', { class: 'rtb-cond__row is-' + row.verb + ( incomplete ? ' is-incomplete' : '' ) } );

		const toggle = h( 'div', { class: 'rtb-cond__verb', role: 'group', 'aria-label': __( 'Include or exclude', 'refraction' ) },
			[ [ 'include', __( 'Include', 'refraction' ) ], [ 'exclude', __( 'Exclude', 'refraction' ) ] ].map( ( [ verb, label ] ) => h( 'button', {
				type: 'button',
				class: 'is-' + verb + ( row.verb === verb ? ' is-on' : '' ),
				'aria-pressed': row.verb === verb ? 'true' : 'false',
				disabled,
				text: label,
				onclick: change( () => {
					row.verb = verb;
				} ),
			} ) ) );

		const remove = h( 'button', {
			type: 'button',
			class: 'rtb-cond__remove',
			'aria-label': __( 'Remove condition', 'refraction' ),
			title: __( 'Remove condition', 'refraction' ),
			disabled,
			text: '×',
			onclick: change( () => {
				rows.splice( index, 1 );
			} ),
		} );

		card.append( h( 'div', { class: 'rtb-cond__head' }, [ toggle, remove ] ) );

		card.append( h( 'select', {
			'aria-label': __( 'Where', 'refraction' ),
			disabled,
			onchange: ( event ) => change( () => {
				row.name = event.target.value;
				row.sub = '';
				row.target = null;
			} )(),
		}, config.conditions.map( ( item ) => h( 'option', { value: item.name, text: item.label, selected: item.name === row.name } ) ) ) );

		if ( group && group.subs.length > 1 ) {
			card.append( h( 'select', {
				'aria-label': __( 'Narrow down', 'refraction' ),
				disabled,
				onchange: ( event ) => change( () => {
					row.sub = event.target.value;
					row.target = null;
				} )(),
			}, group.subs.map( ( item ) => h( 'option', { value: item.value, text: item.label, selected: item.value === row.sub } ) ) ) );
		}

		if ( sub && sub.target ) {
			card.append( drawTarget( row, sub, disabled ) );
		}

		return card;
	};

	draw = () => {
		const disabled = ! config.canEdit;
		const root = h( 'div', { class: 'rtb-cond' + ( disabled ? ' is-readonly' : '' ) } );

		if ( ! hasInclude() ) {
			root.append( h( 'div', { class: 'rtb-cond__notice', role: 'status' }, [
				h( 'strong', { text: __( 'Not displayed anywhere', 'refraction' ) } ),
				h( 'span', { text: __( 'Add an Include condition to show this template on your site.', 'refraction' ) } ),
				! disabled && h( 'button', {
					type: 'button',
					class: 'rtb-cond__quick',
					text: __( 'Show on entire site', 'refraction' ),
					onclick: change( () => rows.push( { verb: 'include', name: 'general', sub: '', target: null } ) ),
				} ),
			] ) );
		}

		rows.forEach( ( row, index ) => root.append( drawRow( row, index, disabled ) ) );

		if ( disabled ) {
			root.append( h( 'p', { class: 'rtb-cond__help', text: __( 'Only administrators can change where this template appears.', 'refraction' ) } ) );
		} else {
			root.append( h( 'button', {
				type: 'button',
				class: 'rtb-cond__add',
				text: __( 'Add condition', 'refraction' ),
				onclick: change( () => rows.push( { verb: rows.length ? 'exclude' : 'include', name: rows.length ? 'singular' : 'general', sub: '', target: null } ) ),
			} ) );
			root.append( h( 'p', { class: 'rtb-cond__help', text: __( 'Exclude always wins. When several templates match, the most specific one is used.', 'refraction' ) } ) );
		}

		mount.replaceChildren( root );
	};

	const setValue = ( rules ) => {
		rows = ( Array.isArray( rules ) ? rules : [] ).map( parseRule ).filter( Boolean );
		draw();
		resolveLabels();
	};

	setValue( value );

	return { setValue, getValue };
}
