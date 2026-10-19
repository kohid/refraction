import { __ } from '@wordpress/i18n';

/**
 * Display Conditions control for Header and Footer templates.
 *
 * Value: an array of rule strings such as `include/general` or `exclude/singular/page/7`
 * (grammar in docs/refraction/theme-builder.md). Rows that still miss a required target
 * (for example "Specific author" without an author) stay on screen but are not part of the value.
 */

const config = window.refractionThemeBuilder || { conditions: [], canEdit: false };
const SEARCH_DELAY = 250;

const h = ( tag, attrs = {}, children = [] ) => {
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

const findGroup = ( name ) => config.conditions.find( ( group ) => group.name === name );

/** Split a rule string into an editable row. Unknown shapes become a row that keeps the raw path. */
function parseRule( rule ) {
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
}

function rowToRule( row ) {
	const group = findGroup( row.name );
	const sub = group && group.subs.find( ( item ) => item.value === row.sub );

	if ( ! group ) {
		return null;
	}

	if ( sub && sub.target && sub.required && ! row.target ) {
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
}

function lookup( params ) {
	const body = new URLSearchParams( { action: config.action, _nonce: config.nonce, ...params } );

	return fetch( config.ajaxUrl, { method: 'POST', credentials: 'same-origin', body } )
		.then( ( response ) => response.json() )
		.then( ( json ) => ( json && json.success ? json.data.items : [] ) )
		.catch( () => [] );
}

function targetKind( target ) {
	const [ kind, subtype ] = String( target ).split( ':' );

	return { kind, subtype: subtype || '' };
}

const BaseData = window.refraction.modules.controls.BaseData;

const ConditionsControl = BaseData.extend( {

	onRender() {
		BaseData.prototype.onRender.apply( this, arguments );

		this.mount = this.el.querySelector( '[data-tb-mount]' );
		this.rows = this.readRows();
		this.draw();
		this.resolveLabels();
	},

	applySavedValue() {
		if ( ! this.mount || this.ownChange ) {
			return;
		}

		this.rows = this.readRows();
		this.draw();
		this.resolveLabels();
	},

	readRows() {
		const value = this.getControlValue();

		return ( Array.isArray( value ) ? value : [] ).map( parseRule ).filter( Boolean );
	},

	commit() {
		const rules = [];

		this.rows.forEach( ( row ) => {
			const rule = rowToRule( row );

			if ( rule && ! rules.includes( rule ) ) {
				rules.push( rule );
			}
		} );

		this.ownChange = true;
		this.setValue( rules );
		this.ownChange = false;
	},

	/** Replace "#12" placeholders of saved targets by the real titles. */
	resolveLabels() {
		const groups = {};

		this.rows.forEach( ( row ) => {
			const sub = this.getSub( row );

			if ( row.target && sub && sub.target ) {
				const key = sub.target;
				groups[ key ] = groups[ key ] || new Set();
				groups[ key ].add( row.target.id );
			}
		} );

		Object.keys( groups ).forEach( ( target ) => {
			const { kind, subtype } = targetKind( target );

			lookup( { kind, subtype, ids: [ ...groups[ target ] ].join( ',' ) } ).then( ( items ) => {
				let changed = false;

				this.rows.forEach( ( row ) => {
					const sub = this.getSub( row );
					const item = row.target && sub && sub.target === target && items.find( ( entry ) => entry.id === row.target.id );

					if ( item && row.target.text !== item.text ) {
						row.target.text = item.text;
						changed = true;
					}
				} );

				if ( changed ) {
					this.draw();
				}
			} );
		} );
	},

	getSub( row ) {
		const group = findGroup( row.name );

		return group && group.subs.find( ( item ) => item.value === row.sub );
	},

	hasInclude() {
		return this.rows.some( ( row ) => 'include' === row.verb && rowToRule( row ) );
	},

	addRow( row ) {
		this.rows.push( row );
		this.commit();
		this.draw();
	},

	draw() {
		const disabled = ! config.canEdit;
		const root = h( 'div', { class: 'rtb-cond' + ( disabled ? ' is-readonly' : '' ) } );

		if ( ! this.hasInclude() ) {
			root.append( h( 'div', { class: 'rtb-cond__notice', role: 'status' }, [
				h( 'strong', { text: __( 'Not displayed anywhere', 'refraction' ) } ),
				h( 'span', { text: __( 'Add an Include condition to show this template on your site.', 'refraction' ) } ),
				! disabled && h( 'button', {
					type: 'button',
					class: 'rtb-cond__quick',
					text: __( 'Show on entire site', 'refraction' ),
					onclick: () => this.addRow( { verb: 'include', name: 'general', sub: '', target: null } ),
				} ),
			] ) );
		}

		this.rows.forEach( ( row, index ) => root.append( this.drawRow( row, index, disabled ) ) );

		if ( disabled ) {
			root.append( h( 'p', { class: 'rtb-cond__help', text: __( 'Only administrators can change where this template appears.', 'refraction' ) } ) );
		} else {
			root.append( h( 'button', {
				type: 'button',
				class: 'rtb-cond__add',
				text: __( 'Add condition', 'refraction' ),
				onclick: () => this.addRow( { verb: this.rows.length ? 'exclude' : 'include', name: this.rows.length ? 'singular' : 'general', sub: '', target: null } ),
			} ) );
			root.append( h( 'p', { class: 'rtb-cond__help', text: __( 'Exclude always wins. When several templates match, the most specific one is used.', 'refraction' ) } ) );
		}

		this.mount.replaceChildren( root );
		this.mountId = ( this.mountId || 0 ) + 1;
	},

	drawRow( row, index, disabled ) {
		const group = findGroup( row.name );
		const sub = this.getSub( row );
		const incomplete = sub && sub.target && sub.required && ! row.target;
		const card = h( 'div', { class: 'rtb-cond__row is-' + row.verb + ( incomplete ? ' is-incomplete' : '' ) } );

		const toggle = h( 'div', { class: 'rtb-cond__verb', role: 'group', 'aria-label': __( 'Include or exclude', 'refraction' ) },
			[ [ 'include', __( 'Include', 'refraction' ) ], [ 'exclude', __( 'Exclude', 'refraction' ) ] ].map( ( [ verb, label ] ) => h( 'button', {
				type: 'button',
				class: 'is-' + verb + ( row.verb === verb ? ' is-on' : '' ),
				'aria-pressed': row.verb === verb ? 'true' : 'false',
				disabled,
				text: label,
				onclick: () => {
					row.verb = verb;
					this.commit();
					this.draw();
				},
			} ) ) );

		const remove = h( 'button', {
			type: 'button',
			class: 'rtb-cond__remove',
			'aria-label': __( 'Remove condition', 'refraction' ),
			title: __( 'Remove condition', 'refraction' ),
			disabled,
			text: '×',
			onclick: () => {
				this.rows.splice( index, 1 );
				this.commit();
				this.draw();
			},
		} );

		card.append( h( 'div', { class: 'rtb-cond__head' }, [ toggle, remove ] ) );

		const nameSelect = h( 'select', {
			'aria-label': __( 'Where', 'refraction' ),
			disabled,
			onchange: ( event ) => {
				row.name = event.target.value;
				row.sub = '';
				row.target = null;
				this.commit();
				this.draw();
			},
		}, config.conditions.map( ( item ) => h( 'option', { value: item.name, text: item.label, selected: item.name === row.name } ) ) );

		card.append( nameSelect );

		if ( group && group.subs.length > 1 ) {
			const subSelect = h( 'select', {
				'aria-label': __( 'Narrow down', 'refraction' ),
				disabled,
				onchange: ( event ) => {
					row.sub = event.target.value;
					row.target = null;
					this.commit();
					this.draw();
				},
			}, group.subs.map( ( item ) => h( 'option', { value: item.value, text: item.label, selected: item.value === row.sub } ) ) );

			card.append( subSelect );
		}

		if ( sub && sub.target ) {
			card.append( this.drawTarget( row, sub, disabled ) );
		}

		return card;
	},

	drawTarget( row, sub, disabled ) {
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
					onclick: () => {
						row.target = null;
						this.commit();
						this.draw();
					},
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
						onclick: () => {
							row.target = { id: item.id, text: item.text };
							this.commit();
							this.draw();
						},
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
				close();
			}
		} );

		wrap.append( input, list );

		if ( sub.required ) {
			wrap.append( h( 'small', { class: 'rtb-cond__required', text: __( 'Choose one to apply this condition.', 'refraction' ) } ) );
		}

		return wrap;
	},
} );

if ( window.refraction && window.refraction.addControlView ) {
	window.refraction.addControlView( 'refraction_conditions', ConditionsControl );
}
