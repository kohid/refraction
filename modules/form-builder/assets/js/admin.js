/**
 * Form Builder admin: the design screen (add, remove, reorder fields and statuses, show the options that fit a field
 * type) and the records table (select rows, bulk status change, confirm deletes).
 */
( function () {
	'use strict';

	const { __, _n, sprintf } = window.wp && window.wp.i18n ? window.wp.i18n : { __: ( s ) => s, _n: ( a, b, n ) => ( 1 === n ? a : b ), sprintf: ( s, n ) => s.replace( '%d', n ) };

	const CHOICE_TYPES = [ 'select', 'radio', 'checkbox' ];
	const NUMBER_TYPES = [ 'number', 'currency' ];

	function syncRow( row ) {
		const type = row.querySelector( '[data-role="type"]' );

		if ( ! type ) {
			return;
		}

		row.dataset.type = type.value;
		row.querySelectorAll( '.rfb-only-choice' ).forEach( ( el ) => ( el.hidden = ! CHOICE_TYPES.includes( type.value ) ) );
		row.querySelectorAll( '.rfb-only-number' ).forEach( ( el ) => ( el.hidden = ! NUMBER_TYPES.includes( type.value ) ) );
	}

	function nextIndex( list ) {
		let max = -1;

		list.querySelectorAll( 'input[name], select[name], textarea[name]' ).forEach( ( el ) => {
			const match = el.name.match( /\[(\d+)\]/ );

			if ( match ) {
				max = Math.max( max, Number( match[ 1 ] ) );
			}
		} );

		return max + 1;
	}

	function addRow( list, template, button ) {
		const html = template.innerHTML.replace( /__INDEX__/g, String( nextIndex( list ) ) );
		const holder = document.createElement( 'ol' );

		holder.innerHTML = html;

		const row = holder.firstElementChild;

		if ( ! row ) {
			return;
		}

		row.querySelectorAll( 'input[type="text"], textarea' ).forEach( ( el ) => {
			if ( el.dataset.role === 'key' || el.type === 'hidden' ) {
				return;
			}

			el.value = '';
		} );
		row.querySelectorAll( 'input[type="hidden"][name$="[key]"]' ).forEach( ( el ) => ( el.value = '' ) );
		list.appendChild( row );
		syncRow( row );

		const first = row.querySelector( 'input[type="text"]' );

		if ( first ) {
			first.focus();
		}

		button.dispatchEvent( new CustomEvent( 'rfb:added', { bubbles: true } ) );
	}

	function initDesign( form ) {
		const fields = form.querySelector( '#rfb-fields' );
		const statuses = form.querySelector( '#rfb-statuses' );

		fields.querySelectorAll( '.rfb-row' ).forEach( syncRow );

		[ [ '#rfb-add-field', fields, '#rfb-field-template' ], [ '#rfb-add-status', statuses, '#rfb-status-template' ] ].forEach( ( [ button, list, template ] ) => {
			const trigger = form.querySelector( button );

			if ( trigger ) {
				trigger.addEventListener( 'click', () => addRow( list, form.querySelector( template ), trigger ) );
			}
		} );

		form.addEventListener( 'change', ( event ) => {
			if ( event.target.matches( '[data-role="type"]' ) ) {
				syncRow( event.target.closest( '.rfb-row' ) );
			}
		} );

		form.addEventListener( 'click', ( event ) => {
			const control = event.target.closest( '[data-move], [data-remove], [data-toggle]' );

			if ( ! control ) {
				return;
			}

			const row = control.closest( '.rfb-row' );

			if ( control.hasAttribute( 'data-remove' ) ) {
				if ( row.parentElement.children.length > 1 ) {
					row.remove();
				}
			} else if ( control.dataset.move === 'up' && row.previousElementSibling ) {
				row.parentElement.insertBefore( row, row.previousElementSibling );
				control.focus();
			} else if ( control.dataset.move === 'down' && row.nextElementSibling ) {
				row.parentElement.insertBefore( row.nextElementSibling, row );
				control.focus();
			} else if ( control.dataset.toggle === 'more' ) {
				const more = row.querySelector( '.rfb-row-more' );

				more.hidden = ! more.hidden;
				control.setAttribute( 'aria-expanded', String( ! more.hidden ) );
			}
		} );
	}

	function initTable( form ) {
		const all = document.getElementById( 'rfb-all' );
		const bar = form.querySelector( '.rfb-bulkbar' );
		const label = document.getElementById( 'rfb-selected' );
		const status = document.getElementById( 'rfb-bulk-status' );
		const boxes = () => Array.from( form.querySelectorAll( 'input[name="records[]"]' ) );

		function update() {
			const count = boxes().filter( ( box ) => box.checked ).length;

			bar.hidden = 0 === count;
			label.textContent = sprintf( _n( '%d selected', '%d selected', count, 'refraction' ), count );

			if ( all ) {
				all.checked = count > 0 && count === boxes().length;
			}
		}

		if ( all ) {
			all.addEventListener( 'change', () => {
				boxes().forEach( ( box ) => ( box.checked = all.checked ) );
				update();
			} );
		}

		form.addEventListener( 'change', ( event ) => {
			if ( event.target.name === 'records[]' ) {
				update();
			}
		} );

		if ( status ) {
			status.addEventListener( 'change', () => {
				if ( ! status.value ) {
					return;
				}

				const action = document.createElement( 'input' );
				const value = document.createElement( 'input' );

				action.type = value.type = 'hidden';
				action.name = 'action';
				action.value = form.dataset.statusAction;
				value.name = 'status';
				value.value = status.value;
				form.querySelector( '[name="_wpnonce"]' ).value = form.dataset.statusNonce;
				form.append( action, value );
				form.submit();
			} );
		}
	}

	document.addEventListener( 'click', ( event ) => {
		const confirmButton = event.target.closest( '[data-confirm]' );

		if ( confirmButton && ! window.confirm( confirmButton.dataset.confirm ) ) { // eslint-disable-line no-alert
			event.preventDefault();
		}
	} );

	document.addEventListener( 'DOMContentLoaded', () => {
		const design = document.getElementById( 'rfb-design' );
		const bulk = document.getElementById( 'rfb-bulk' );

		if ( design ) {
			initDesign( design );
		}

		if ( bulk ) {
			initTable( bulk );
		}
	} );
}() );
