import { __ } from '@wordpress/i18n';

/**
 * Editor side of the Loop Builder:
 *  - the `refraction_autocomplete` control (search and pick posts, terms or authors),
 *  - the "Edit the template" and "Create a template" buttons of the Loop Grid and Loop Carousel.
 *
 * Value of the control: an array of IDs, or a single ID string when the control has `multiple: false`.
 */

const config = window.refractionLoopBuilder || { templates: {} };
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

function post( params ) {
	const body = new URLSearchParams( params );

	return fetch( config.ajaxUrl, { method: 'POST', credentials: 'same-origin', body } ).then( ( response ) => response.json() );
}

function lookup( params ) {
	return post( { action: config.lookupAction, _nonce: config.lookupNonce, ...params } )
		.then( ( json ) => ( json && json.success ? json.data.items : [] ) )
		.catch( () => [] );
}

const labelCache = {};
const cacheKey = ( query, id ) => `${ query.kind }:${ id }`;

const BaseData = window.refraction.modules.controls.BaseData;

const AutocompleteControl = BaseData.extend( {

	onRender() {
		BaseData.prototype.onRender.apply( this, arguments );

		this.mount = this.el.querySelector( '[data-ac-mount]' );
		this.query = this.model.get( 'query' ) || { kind: 'post', subtype: 'any' };
		this.multiple = false !== this.model.get( 'multiple' );
		this.items = this.readValue().map( ( id ) => ( { id, text: labelCache[ cacheKey( this.query, id ) ] || '#' + id } ) );
		this.draw();
		this.resolveLabels();
	},

	applySavedValue() {
		if ( ! this.mount || this.ownChange ) {
			return;
		}

		this.items = this.readValue().map( ( id ) => ( { id, text: labelCache[ cacheKey( this.query, id ) ] || '#' + id } ) );
		this.draw();
		this.resolveLabels();
	},

	readValue() {
		const value = this.getControlValue();
		const list = Array.isArray( value ) ? value : ( value ? [ value ] : [] );

		return list.map( ( id ) => parseInt( id, 10 ) ).filter( ( id ) => id > 0 );
	},

	resolveLabels() {
		const missing = this.items.filter( ( item ) => ! labelCache[ cacheKey( this.query, item.id ) ] );

		if ( ! missing.length ) {
			return;
		}

		lookup( { kind: this.query.kind, subtype: this.query.subtype || '', ids: missing.map( ( item ) => item.id ).join( ',' ) } ).then( ( found ) => {
			found.forEach( ( item ) => {
				labelCache[ cacheKey( this.query, item.id ) ] = item.text;
			} );

			this.items.forEach( ( item ) => {
				item.text = labelCache[ cacheKey( this.query, item.id ) ] || item.text;
			} );

			this.draw();
		} );
	},

	commit() {
		const ids = this.items.map( ( item ) => item.id );

		this.ownChange = true;
		this.setValue( this.multiple ? ids : ( ids.length ? String( ids[ 0 ] ) : '' ) );
		this.ownChange = false;
	},

	add( item ) {
		labelCache[ cacheKey( this.query, item.id ) ] = item.text;

		if ( this.items.some( ( existing ) => existing.id === item.id ) ) {
			return;
		}

		this.items = this.multiple ? [ ...this.items, { id: item.id, text: item.text } ] : [ { id: item.id, text: item.text } ];
		this.commit();
		this.draw();
	},

	remove( id ) {
		this.items = this.items.filter( ( item ) => item.id !== id );
		this.commit();
		this.draw();
	},

	draw() {
		const root = h( 'div', { class: 'refraction-ac__box' } );

		if ( this.items.length ) {
			root.append( h( 'ul', { class: 'refraction-ac__chips' }, this.items.map( ( item ) => h( 'li', { class: 'refraction-ac__chip' }, [
				h( 'span', { text: item.text } ),
				h( 'button', {
					type: 'button',
					'aria-label': __( 'Remove', 'refraction' ) + ' ' + item.text,
					text: '×',
					onclick: () => this.remove( item.id ),
				} ),
			] ) ) ) );
		}

		if ( this.multiple || ! this.items.length ) {
			root.append( this.buildSearch() );
		}

		this.mount.replaceChildren( root );
	},

	buildSearch() {
		const wrap = h( 'div', { class: 'refraction-ac__search' } );
		const list = h( 'ul', { class: 'refraction-ac__results', role: 'listbox', hidden: true } );
		const input = h( 'input', {
			type: 'search',
			autocomplete: 'off',
			role: 'combobox',
			'aria-expanded': 'false',
			placeholder: __( 'Type to search…', 'refraction' ),
		} );
		let timer = null;
		let serial = 0;

		const close = () => {
			list.hidden = true;
			input.setAttribute( 'aria-expanded', 'false' );
		};

		const search = () => {
			const mine = ++serial;

			lookup( { kind: this.query.kind, subtype: this.query.subtype || '', q: input.value } ).then( ( found ) => {
				if ( mine !== serial ) {
					return;
				}

				const fresh = found.filter( ( item ) => ! this.items.some( ( existing ) => existing.id === item.id ) );

				list.replaceChildren( ...( fresh.length ? fresh.map( ( item ) => h( 'li', { role: 'option' }, [
					h( 'button', {
						type: 'button',
						onmousedown: ( event ) => event.preventDefault(),
						onclick: () => this.add( item ),
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
} );

if ( window.refraction && window.refraction.addControlView ) {
	window.refraction.addControlView( 'refraction_autocomplete', AutocompleteControl );
}

// --- Loop Grid and Loop Carousel template buttons -------------------------------------------------------

function templateControl( view ) {
	try {
		const page = window.refraction.getPanelView().getCurrentPageView();

		return page.children.find( ( child ) => 'template_id' === child.model.get( 'name' ) );
	} catch ( error ) {
		return null;
	}
}

function selectTemplate( view, id ) {
	const control = templateControl( view );

	if ( control ) {
		const options = { ...( control.model.get( 'options' ) ) };

		Object.keys( config.templates ).forEach( ( key ) => {
			options[ key ] = config.templates[ key ].title;
		} );

		control.model.set( 'options', options );
		control.render();
	}

	window.$e.run( 'document/elements/settings', {
		container: view.options.container,
		settings: { template_id: String( id ) },
	} );
}

if ( window.refraction && window.refraction.channels && window.refraction.channels.editor ) {
	const channel = window.refraction.channels.editor;

	channel.on( 'refraction:loop:edit-template', ( view ) => {
		const id = view.options.container.settings.get( 'template_id' );
		const template = config.templates[ id ];

		if ( template && template.editUrl ) {
			window.open( template.editUrl, '_blank', 'noopener' );
		}
	} );

	channel.on( 'refraction:loop:create-template', ( view ) => {
		const button = view.el.querySelector( 'button' );

		if ( button ) {
			button.disabled = true;
		}

		post( { action: config.createAction, _nonce: config.createNonce, title: __( 'Loop Item', 'refraction' ) } )
			.then( ( json ) => {
				if ( ! json || ! json.success ) {
					throw new Error( json && json.data && json.data.message );
				}

				config.templates[ json.data.id ] = { title: json.data.title, editUrl: json.data.editUrl };
				selectTemplate( view, json.data.id );
				window.open( json.data.editUrl, '_blank', 'noopener' );
			} )
			.catch( ( error ) => {
				window.alert( ( error && error.message ) || __( 'Could not create the template.', 'refraction' ) ); // eslint-disable-line no-alert
			} )
			.finally( () => {
				if ( button ) {
					button.disabled = false;
				}
			} );
	} );
}
