import { __ } from '@wordpress/i18n';
import { h, config, SEARCH_DELAY } from './editor.js';

/**
 * Preview Settings control for Theme Builder templates: choose the post, archive, search term or 404 page the
 * template is designed against, then "Apply & Preview" to render the editor preview with it.
 *
 * Value: { source: 'post:page', id: 7, search: '', date: '' } (see Preview_Target in PHP).
 */

const lookup = ( params ) => {
	const body = new URLSearchParams( { action: config.previewLookupAction, _nonce: config.nonce, ...params } );

	return fetch( config.ajaxUrl, { method: 'POST', credentials: 'same-origin', body } )
		.then( ( response ) => response.json() )
		.then( ( json ) => ( json && json.success ? json.data.items : [] ) )
		.catch( () => [] );
};

const KIND_LOOKUP = { post: 'post', term: 'term', postype: '', author: 'user' };

const parseSource = ( source ) => {
	const [ kind, sub = '' ] = String( source ).split( ':' );

	return { kind, sub };
};

const forEachContainer = ( container, callback ) => {
	callback( container );
	( container.children || [] ).forEach( ( child ) => forEachContainer( child, callback ) );
};

/** Drop the cached widget HTML so every widget is rendered again with the new preview content. */
const refreshPreview = () => {
	const root = window.refraction.getPreviewContainer && window.refraction.getPreviewContainer();

	if ( root ) {
		forEachContainer( root, ( container ) => {
			if ( container.model && container.model.setHtmlCache ) {
				container.model.setHtmlCache( '' );
			}
		} );
	}

	window.refraction.reloadPreview();
};

const BaseData = window.refraction.modules.controls.BaseData;

const PreviewControl = BaseData.extend( {

	onRender() {
		BaseData.prototype.onRender.apply( this, arguments );

		this.mount = this.el.querySelector( '[data-tb-preview-mount]' );
		this.sources = this.model.get( 'sources' ) || [];
		this.state = this.readState();
		this.status = '';
		this.draw();
		this.resolveLabel();
	},

	applySavedValue() {
		if ( ! this.mount || this.ownChange ) {
			return;
		}

		this.state = this.readState();
		this.draw();
		this.resolveLabel();
	},

	readState() {
		const value = this.getControlValue();
		const saved = value && ! Array.isArray( value ) && 'object' === typeof value ? value : {};
		const fallback = this.model.get( 'default_source' ) || ( this.sources[ 0 ] && this.sources[ 0 ].value ) || '';
		const known = this.sources.some( ( item ) => item.value === saved.source );

		return {
			source: known ? saved.source : fallback,
			id: parseInt( saved.id, 10 ) || 0,
			search: String( saved.search || '' ),
			date: String( saved.date || '' ),
			label: '',
		};
	},

	commit() {
		const { source, id, search, date } = this.state;

		this.ownChange = true;
		this.setValue( { source, id, search, date } );
		this.ownChange = false;
	},

	/** Replace the "#12" style placeholder by the real title of the saved item. */
	resolveLabel() {
		const { kind, sub } = parseSource( this.state.source );
		const lookupKind = KIND_LOOKUP[ kind ];

		if ( ! lookupKind || ! this.state.id ) {
			return;
		}

		lookup( { kind: lookupKind, subtype: sub, ids: String( this.state.id ) } ).then( ( items ) => {
			const item = items.find( ( entry ) => entry.id === this.state.id );

			if ( item ) {
				this.state.label = item.text;
				this.draw();
			}
		} );
	},

	draw() {
		const { kind, sub } = parseSource( this.state.source );
		const root = h( 'div', { class: 'rtb-cond rtb-prev' } );

		const select = h( 'select', {
			'aria-label': __( 'Preview as', 'refraction' ),
			onchange: ( event ) => {
				this.state = { source: event.target.value, id: 0, search: '', date: '', label: '' };
				this.status = '';
				this.commit();
				this.draw();
			},
		}, this.sources.map( ( item ) => h( 'option', { value: item.value, text: item.label, selected: item.value === this.state.source } ) ) );

		root.append( h( 'label', { class: 'rtb-prev__label', text: __( 'Preview as', 'refraction' ) } ), select );

		if ( KIND_LOOKUP[ kind ] ) {
			root.append( this.drawPicker( KIND_LOOKUP[ kind ], sub ) );
		}

		if ( 'search' === kind ) {
			root.append( h( 'label', { class: 'rtb-prev__label', text: __( 'Search for', 'refraction' ) } ), h( 'input', {
				type: 'text',
				value: this.state.search,
				placeholder: __( 'A word that has results', 'refraction' ),
				maxlength: '100',
				oninput: ( event ) => {
					this.state.search = event.target.value;
					this.commit();
				},
			} ) );
		}

		if ( 'date' === kind ) {
			root.append( h( 'label', { class: 'rtb-prev__label', text: __( 'Year and month', 'refraction' ) } ), h( 'input', {
				type: 'text',
				value: this.state.date,
				placeholder: __( 'For example 2025-03, empty for this year', 'refraction' ),
				maxlength: '7',
				oninput: ( event ) => {
					this.state.date = event.target.value;
					this.commit();
				},
			} ) );
		}

		if ( ! KIND_LOOKUP[ kind ] && 'search' !== kind && 'date' !== kind ) {
			root.append( h( 'p', { class: 'rtb-cond__help', text: 'blog' === kind ? __( 'Shows the latest posts.', 'refraction' ) : ( 'postype' === kind ? __( 'Shows the archive of this post type.', 'refraction' ) : __( 'Shows how the not found page looks.', 'refraction' ) ) } ) );
		}

		root.append( h( 'button', {
			type: 'button',
			class: 'rtb-prev__apply',
			text: __( 'Apply & Preview', 'refraction' ),
			onclick: () => this.apply(),
		} ), h( 'p', { class: 'rtb-prev__status', role: 'status', text: this.status } ) );

		root.append( h( 'p', { class: 'rtb-cond__help', text: __( 'Only the editor preview changes. On your site the template shows the real page.', 'refraction' ) } ) );

		this.mount.replaceChildren( root );
	},

	drawPicker( lookupKind, subtype ) {
		const wrap = h( 'div', { class: 'rtb-prev__picker' } );
		const placeholders = {
			post: __( 'Search by title, or leave empty for the latest', 'refraction' ),
			term: __( 'Search terms, or leave empty for the blog', 'refraction' ),
			user: __( 'Search authors', 'refraction' ),
		};

		if ( this.state.id ) {
			wrap.append( h( 'span', { class: 'rtb-cond__picked' }, [
				h( 'span', { class: 'rtb-cond__picked-text', text: this.state.label || '#' + this.state.id } ),
				h( 'button', {
					type: 'button',
					'aria-label': __( 'Clear', 'refraction' ),
					text: '×',
					onclick: () => {
						this.state.id = 0;
						this.state.label = '';
						this.commit();
						this.draw();
					},
				} ),
			] ) );

			return wrap;
		}

		const list = h( 'ul', { class: 'rtb-cond__results', role: 'listbox', hidden: true } );
		const input = h( 'input', { type: 'search', autocomplete: 'off', role: 'combobox', 'aria-expanded': 'false', placeholder: placeholders[ lookupKind ] } );
		let timer = null;
		let serial = 0;

		const close = () => {
			list.hidden = true;
			input.setAttribute( 'aria-expanded', 'false' );
		};

		const search = () => {
			const mine = ++serial;

			lookup( { kind: lookupKind, subtype, q: input.value } ).then( ( items ) => {
				if ( mine !== serial ) {
					return;
				}

				list.replaceChildren( ...( items.length ? items.map( ( item ) => h( 'li', { role: 'option' }, [
					h( 'button', {
						type: 'button',
						onmousedown: ( event ) => event.preventDefault(),
						onclick: () => {
							this.state.id = item.id;
							this.state.label = item.text;
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

		return wrap;
	},

	apply() {
		const { source, id, search, date } = this.state;
		const body = new URLSearchParams( {
			action: config.previewApplyAction,
			_nonce: config.nonce,
			post_id: String( config.postId ),
			target: JSON.stringify( { source, id, search, date } ),
		} );

		this.commit();
		this.status = __( 'Applying…', 'refraction' );
		this.draw();

		fetch( config.ajaxUrl, { method: 'POST', credentials: 'same-origin', body } )
			.then( ( response ) => response.json() )
			.then( ( json ) => {
				if ( ! json || ! json.success ) {
					throw new Error( ( json && json.data && json.data.message ) || 'failed' );
				}

				this.status = __( 'Preview updated.', 'refraction' );
				this.draw();
				refreshPreview();
			} )
			.catch( ( error ) => {
				this.status = __( 'Could not apply the preview:', 'refraction' ) + ' ' + error.message;
				this.draw();
			} );
	},
} );

if ( window.refraction && window.refraction.addControlView ) {
	window.refraction.addControlView( 'refraction_preview_target', PreviewControl );
}
