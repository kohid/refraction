import { __ } from '@wordpress/i18n';
import { createConditionsEditor, h } from './conditions-editor';

/**
 * Refraction > Theme Builder (0.148.0): "Display conditions" on each template of the list opens the same picker as
 * the editor, in a dialog; Save stores the rules for that template and the list shows them.
 */
const config = window.refractionThemeBuilderAdmin || null;

function open( button ) {
	const postId = button.dataset.rtbConditions;
	const title = button.dataset.rtbTitle || '';
	let rules = [];

	try {
		rules = JSON.parse( button.dataset.rtbRules || '[]' );
	} catch ( e ) {
		rules = [];
	}

	const mount = h( 'div', { class: 'rtb-dialog__body' } );
	const error = h( 'p', { class: 'rtb-dialog__error', role: 'alert', hidden: true } );
	const save = h( 'button', { type: 'button', class: 'button button-primary', text: __( 'Save conditions', 'refraction' ) } );
	const cancel = h( 'button', { type: 'button', class: 'button', text: __( 'Cancel', 'refraction' ) } );
	const dialog = h( 'dialog', { class: 'rtb-dialog', 'aria-labelledby': 'rtb-dialog-title' }, [
		h( 'div', { class: 'rtb-dialog__head' }, [
			h( 'h2', { id: 'rtb-dialog-title', text: __( 'Display conditions', 'refraction' ) } ),
			h( 'p', { text: title } ),
		] ),
		mount,
		error,
		h( 'div', { class: 'rtb-dialog__foot' }, [ cancel, save ] ),
	] );

	const picker = createConditionsEditor( { mount, config: config.conditions, value: rules, onChange: ( value ) => {
		rules = value;
	} } );

	const close = () => {
		dialog.close();
		dialog.remove();
		button.focus();
	};

	cancel.addEventListener( 'click', close );
	dialog.addEventListener( 'cancel', ( event ) => {
		event.preventDefault();
		close();
	} );

	save.addEventListener( 'click', () => {
		save.disabled = true;
		error.hidden = true;

		const body = new URLSearchParams( { action: config.saveAction, _nonce: config.saveNonce, post: postId } );
		picker.getValue().forEach( ( rule ) => body.append( 'rules[]', rule ) );

		fetch( config.conditions.ajaxUrl, { method: 'POST', credentials: 'same-origin', body } )
			.then( ( response ) => response.json() )
			.then( ( json ) => {
				if ( ! json || ! json.success ) {
					throw new Error( ( json && json.data && json.data.message ) || __( 'The conditions could not be saved.', 'refraction' ) );
				}

				// The row shows the saved conditions as the server describes them.
				const cell = button.closest( 'td' );
				const wrap = document.createElement( 'div' );
				wrap.innerHTML = json.data.html;
				cell.replaceChildren( ...wrap.childNodes );
				close();
				cell.querySelector( '[data-rtb-conditions]' )?.focus();
			} )
			.catch( ( err ) => {
				error.textContent = err.message;
				error.hidden = false;
				save.disabled = false;
			} );
	} );

	document.body.append( dialog );
	dialog.showModal();
}

if ( config ) {
	document.addEventListener( 'click', ( event ) => {
		const button = event.target.closest && event.target.closest( '[data-rtb-conditions]' );

		if ( button ) {
			event.preventDefault();
			open( button );
		}
	} );
}
