/**
 * The Items control (rfb_list_items, 0.127.0): a list inside a repeater row. Each item is a line of text and its own
 * icon, picked with the editor's icon library; items are added, removed and moved up or down. Used by Icon List >
 * Changes with the answers, where each row is a whole list for its answers.
 *
 * Value: [ { text, icon: { value, library } } ].
 */
import { __ } from '@wordpress/i18n';
import { svgLibrary, svgIconName, svgMarkup } from '../../../../../assets/dev/js/editor/utils/icon-svg-bodies';

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

	[].concat( children ).forEach( ( child ) => child && node.append( child ) );

	return node;
};

const STYLE = `
.rfb-list-items__list{margin:0 0 8px;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.rfb-list-items__item{display:flex;align-items:center;gap:4px}
.rfb-list-items__item input{flex:1 1 auto;min-width:0}
.rfb-list-items__btn{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid var(--e-a-border-color,#d5d8dc);border-radius:3px;background:var(--e-a-bg-default,#fff);color:inherit;cursor:pointer;font-size:13px;line-height:1}
.rfb-list-items__btn:hover{border-color:var(--e-a-border-color-bold,#69727d)}
.rfb-list-items__btn svg{width:14px;height:14px;fill:currentColor}
.rfb-list-items__icon.is-empty{opacity:.55}
.rfb-list-items__add{width:100%}
`;

function addStyle() {
	if ( document.getElementById( 'rfb-list-items-style' ) ) {
		return;
	}

	document.head.appendChild( h( 'style', { id: 'rfb-list-items-style', text: STYLE } ) );
}

export function registerListItems() {
	const BaseData = window.refraction && window.refraction.modules && window.refraction.modules.controls && window.refraction.modules.controls.BaseData;

	if ( ! BaseData || ! window.refraction.addControlView ) {
		return;
	}

	addStyle();

	const ListItems = BaseData.extend( {
		onRender() {
			BaseData.prototype.onRender.apply( this, arguments );
			this.mount = this.el.querySelector( '[data-rfb-items-mount]' );
			this.items = this.read();
			this.draw();
		},

		applySavedValue() {
			if ( ! this.mount || this.ownChange ) {
				return;
			}

			this.items = this.read();
			this.draw();
		},

		read() {
			const value = this.getControlValue();

			return ( Array.isArray( value ) ? value : [] ).map( ( item ) => ( { text: String( ( item && item.text ) || '' ), icon: item && item.icon && item.icon.value ? item.icon : { value: '', library: '' } } ) );
		},

		commit() {
			this.ownChange = true;
			this.setValue( this.items.map( ( item ) => ( { text: item.text, icon: item.icon } ) ) );
			this.ownChange = false;
		},

		/** The editor's icon library, for one item: the picker talks to a small stand-in of a control. */
		pickIcon( index ) {
			const stand = {
				model: new Backbone.Model( {} ),
				getControlValue: () => this.items[ index ].icon,
				setValue: ( icon ) => {
					this.items[ index ].icon = icon && icon.value ? icon : { value: '', library: '' };
				},
				applySavedValue: () => {
					this.commit();
					this.draw();
				},
			};

			window.refraction.iconManager.show( { view: stand } );
		},

		iconPreview( icon ) {
			const box = h( 'span', { class: 'rfb-list-items__icon' + ( icon.value ? '' : ' is-empty' ) } );

			// Drawn as the editor's own Icon control draws it: inline SVG for Solar and Phosphor, a font icon otherwise.
			if ( icon.value ) {
				const lib = svgLibrary( icon.library );

				if ( lib ) {
					const name = svgIconName( lib, icon.value );
					const svg = name ? svgMarkup( lib, name, () => this.mount && this.draw() ) : '';

					box.innerHTML = svg ? '<i class="' + ( lib.displayPrefix || 'rf-solar' ) + '">' + svg + '</i>' : '';
				} else if ( 'svg' !== icon.library ) {
					box.append( h( 'i', { class: icon.value, 'aria-hidden': 'true' } ) );
				}
			}

			if ( ! box.innerHTML ) {
				box.textContent = '+';
			}

			return box;
		},

		move( index, by ) {
			const to = index + by;

			if ( to < 0 || to >= this.items.length ) {
				return;
			}

			[ this.items[ index ], this.items[ to ] ] = [ this.items[ to ], this.items[ index ] ];
			this.commit();
			this.draw();
		},

		draw() {
			const list = h( 'ul', { class: 'rfb-list-items__list' }, this.items.map( ( item, index ) => h( 'li', { class: 'rfb-list-items__item' }, [
				h( 'button', { type: 'button', class: 'rfb-list-items__btn', title: __( 'Icon (empty: the list\'s own)', 'refraction' ), onclick: () => this.pickIcon( index ) }, [ this.iconPreview( item.icon ) ] ),
				h( 'input', {
					type: 'text',
					value: item.text,
					placeholder: __( '**Ness Farm** – Highland Countryside', 'refraction' ),
					'aria-label': __( 'Item text', 'refraction' ),
					oninput: ( event ) => {
						item.text = event.target.value;
						this.commit();
					},
				} ),
				h( 'button', { type: 'button', class: 'rfb-list-items__btn', title: __( 'Move up', 'refraction' ), text: '↑', onclick: () => this.move( index, -1 ) } ),
				h( 'button', { type: 'button', class: 'rfb-list-items__btn', title: __( 'Move down', 'refraction' ), text: '↓', onclick: () => this.move( index, 1 ) } ),
				h( 'button', {
					type: 'button',
					class: 'rfb-list-items__btn',
					title: __( 'Remove', 'refraction' ),
					text: '×',
					onclick: () => {
						this.items.splice( index, 1 );
						this.commit();
						this.draw();
					},
				} ),
			] ) ) );
			const add = h( 'button', {
				type: 'button',
				class: 'refraction-button rfb-list-items__add',
				text: __( 'Add item', 'refraction' ),
				onclick: () => {
					this.items.push( { text: '', icon: { value: '', library: '' } } );
					this.commit();
					this.draw();
					const inputs = this.mount.querySelectorAll( 'input' );

					if ( inputs.length ) {
						inputs[ inputs.length - 1 ].focus();
					}
				},
			} );

			this.mount.replaceChildren( list, add );
		},
	} );

	window.refraction.addControlView( 'rfb_list_items', ListItems );
}
