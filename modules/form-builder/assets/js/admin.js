/**
 * Form Builder admin: the records table (select rows, bulk status change) and confirmation of deletes.
 */
( function () {
	'use strict';

	const { __, _n, sprintf } = window.wp && window.wp.i18n ? window.wp.i18n : { __: ( s ) => s, _n: ( a, b, n ) => ( 1 === n ? a : b ), sprintf: ( s, n ) => s.replace( '%d', n ) };

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
		const bulk = document.getElementById( 'rfb-bulk' );

		if ( bulk ) {
			initTable( bulk );
		}
	} );
}() );
