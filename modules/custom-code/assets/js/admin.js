import { __ } from '@wordpress/i18n';

/**
 * Refraction > Custom Code: the code editor (WordPress CodeMirror, with syntax hints) and the display
 * conditions picker. Rules are the same strings as the Theme Builder conditions (`include/general`,
 * `exclude/singular/page/7`), kept as JSON in a hidden field.
 */
const config = window.refractionCustomCode || { editors: {}, rules: { conditions: [], canEdit: false } };
const rulesConfig = config.rules;

const h = ( tag, attrs = {}, children = [] ) => {
	const node = document.createElement( tag );

	Object.keys( attrs ).forEach( ( key ) => {
		if ( 'class' === key ) {
			node.className = attrs[ key ];
		} else if ( 'text' === key ) {
			node.textContent = attrs[ key ];
		} else if ( key.startsWith( 'on' ) ) {
			node.addEventListener( key.slice( 2 ), attrs[ key ] );
		} else if ( false !== attrs[ key ] && null != attrs[ key ] ) {
			node.setAttribute( key, true === attrs[ key ] ? '' : attrs[ key ] );
		}
	} );

	[].concat( children ).forEach( ( child ) => child && node.append( child ) );

	return node;
};

/* ------------------------------------------------------------------ code editor */

function initCodeEditor() {
	const textarea = document.getElementById( 'rcc-code' );
	const typeSelect = document.getElementById( 'rcc-type' );

	if ( ! textarea || ! typeSelect || ! window.wp || ! window.wp.codeEditor ) {
		return;
	}

	let instance = null;

	const mount = () => {
		const settings = config.editors[ typeSelect.value ];

		if ( instance ) {
			instance.codemirror.save();
			instance.codemirror.toTextArea();
			instance = null;
		}

		if ( ! settings ) {
			return; // Syntax highlighting is turned off in the user profile: the plain textarea stays.
		}

		instance = window.wp.codeEditor.initialize( textarea, {
			...settings,
			codemirror: { ...settings.codemirror, lineNumbers: true, lineWrapping: true },
		} );
	};

	typeSelect.addEventListener( 'change', mount );
	textarea.form.addEventListener( 'submit', () => instance && instance.codemirror.save() );
	mount();
}

/* ------------------------------------------------------------------ conditions */

const findGroup = ( name ) => rulesConfig.conditions.find( ( group ) => group.name === name );

function parseRule( rule ) {
	const parts = String( rule ).split( '/' );
	const verb = parts.shift();
	const name = parts.shift();
	const group = findGroup( name );

	if ( ! group || ( 'include' !== verb && 'exclude' !== verb ) ) {
		return null;
	}

	let path = parts.join( '/' );
	let target = null;
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

	if ( ! group || ( sub && sub.target && sub.required && ! row.target ) ) {
		return null;
	}

	const parts = [ row.verb, row.name ];

	row.sub && parts.push( row.sub );
	sub && sub.target && row.target && parts.push( String( row.target.id ) );

	return parts.join( '/' );
}

function lookup( params ) {
	const body = new URLSearchParams( { action: rulesConfig.action, _nonce: rulesConfig.nonce, ...params } );

	return fetch( rulesConfig.ajaxUrl, { method: 'POST', credentials: 'same-origin', body } )
		.then( ( response ) => response.json() )
		.then( ( json ) => ( json && json.success ? json.data.items : [] ) )
		.catch( () => [] );
}

function initConditions() {
	const mount = document.getElementById( 'rcc-conditions' );
	const field = document.getElementById( 'rcc-rules' );

	if ( ! mount || ! field ) {
		return;
	}

	let saved = [];

	try {
		saved = JSON.parse( field.value || '[]' );
	} catch ( e ) {
		saved = [];
	}

	const rows = saved.map( parseRule ).filter( Boolean );

	const commit = () => {
		const rules = [];

		rows.forEach( ( row ) => {
			const rule = rowToRule( row );

			if ( rule && ! rules.includes( rule ) ) {
				rules.push( rule );
			}
		} );

		field.value = JSON.stringify( rules );
	};

	const getSub = ( row ) => {
		const group = findGroup( row.name );

		return group && group.subs.find( ( item ) => item.value === row.sub );
	};

	const drawTarget = ( row, sub ) => {
		const [ kind, subtype ] = String( sub.target ).split( ':' );
		const wrap = h( 'div', { class: 'rcc-cond__target' } );

		if ( row.target ) {
			wrap.append( h( 'span', { class: 'rcc-cond__picked' }, [
				h( 'span', { text: row.target.text } ),
				h( 'button', { type: 'button', 'aria-label': __( 'Clear', 'refraction' ), text: '×', onclick: () => {
					row.target = null;
					commit();
					draw();
				} } ),
			] ) );

			return wrap;
		}

		const list = h( 'ul', { class: 'rcc-cond__results', hidden: true } );
		const input = h( 'input', { type: 'search', autocomplete: 'off', placeholder: __( 'Search', 'refraction' ) } );
		let timer = null;

		const search = () => lookup( { kind, subtype: subtype || '', q: input.value } ).then( ( items ) => {
			list.replaceChildren( ...( items.length ? items.map( ( item ) => h( 'li', {}, [
				h( 'button', { type: 'button', onmousedown: ( e ) => e.preventDefault(), onclick: () => {
					row.target = { id: item.id, text: item.text };
					commit();
					draw();
				} }, [ h( 'span', { text: item.text } ), item.hint && h( 'small', { text: item.hint } ) ] ),
			] ) ) : [ h( 'li', { class: 'is-empty', text: __( 'Nothing found', 'refraction' ) } ) ] ) );
			list.hidden = false;
		} );

		input.addEventListener( 'focus', search );
		input.addEventListener( 'input', () => {
			clearTimeout( timer );
			timer = setTimeout( search, 250 );
		} );
		input.addEventListener( 'blur', () => setTimeout( () => ( list.hidden = true ), 120 ) );
		wrap.append( input, list );

		return wrap;
	};

	const drawRow = ( row, index ) => {
		const group = findGroup( row.name );
		const sub = getSub( row );
		const card = h( 'div', { class: 'rcc-cond__row is-' + row.verb } );

		card.append( h( 'div', { class: 'rcc-cond__verb', role: 'group', 'aria-label': __( 'Include or exclude', 'refraction' ) },
			[ [ 'include', __( 'Include', 'refraction' ) ], [ 'exclude', __( 'Exclude', 'refraction' ) ] ].map( ( [ verb, label ] ) => h( 'button', {
				type: 'button',
				class: 'is-' + verb + ( row.verb === verb ? ' is-on' : '' ),
				'aria-pressed': row.verb === verb ? 'true' : 'false',
				text: label,
				onclick: () => {
					row.verb = verb;
					commit();
					draw();
				},
			} ) ) ) );

		card.append( h( 'select', { 'aria-label': __( 'Where', 'refraction' ), onchange: ( e ) => {
			row.name = e.target.value;
			row.sub = '';
			row.target = null;
			commit();
			draw();
		} }, rulesConfig.conditions.map( ( item ) => h( 'option', { value: item.name, text: item.label, selected: item.name === row.name } ) ) ) );

		if ( group && group.subs.length > 1 ) {
			card.append( h( 'select', { 'aria-label': __( 'Narrow down', 'refraction' ), onchange: ( e ) => {
				row.sub = e.target.value;
				row.target = null;
				commit();
				draw();
			} }, group.subs.map( ( item ) => h( 'option', { value: item.value, text: item.label, selected: item.value === row.sub } ) ) ) );
		}

		sub && sub.target && card.append( drawTarget( row, sub ) );
		card.append( h( 'button', { type: 'button', class: 'rcc-cond__remove', 'aria-label': __( 'Remove condition', 'refraction' ), text: '×', onclick: () => {
			rows.splice( index, 1 );
			commit();
			draw();
		} } ) );

		return card;
	};

	function draw() {
		const root = h( 'div', { class: 'rcc-cond' } );

		if ( ! rows.some( ( row ) => 'include' === row.verb && rowToRule( row ) ) ) {
			root.append( h( 'p', { class: 'rcc-cond__none', role: 'status', text: __( 'Not displayed anywhere. Add an Include condition to print this snippet.', 'refraction' ) } ) );
		}

		rows.forEach( ( row, index ) => root.append( drawRow( row, index ) ) );
		root.append( h( 'button', { type: 'button', class: 'button rcc-cond__add', text: __( 'Add condition', 'refraction' ), onclick: () => {
			rows.push( { verb: rows.length ? 'exclude' : 'include', name: rows.length ? 'singular' : 'general', sub: '', target: null } );
			commit();
			draw();
		} } ) );
		root.append( h( 'p', { class: 'description', text: __( 'Exclude always wins. The snippet prints when any Include matches and no Exclude does.', 'refraction' ) } ) );
		mount.replaceChildren( root );
	}

	draw();
}

document.addEventListener( 'DOMContentLoaded', () => {
	initConditions();
	initCodeEditor();
} );
