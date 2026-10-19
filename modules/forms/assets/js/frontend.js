/**
 * Refraction Forms, front end. Progressive enhancement: without this script the form still posts
 * normally and the server renders errors and the success message.
 *
 * - sends the form with fetch() to admin-ajax and shows messages in the live region;
 * - multi-step forms: previous/next, progress indicator, per-step validation;
 * - moves focus to the first problem (or to the success message);
 * - reCAPTCHA v3 token on submit when that provider is configured.
 */
( function () {
	'use strict';

	const READY = 'rfReady';

	const q = ( root, sel ) => Array.prototype.slice.call( root.querySelectorAll( sel ) );

	function message( region, text, type ) {
		region.textContent = '';

		if ( ! text ) {
			return;
		}

		const p = document.createElement( 'p' );
		p.className = 'refraction-form__message refraction-form__message--' + type;

		if ( 'error' === type ) {
			p.setAttribute( 'role', 'alert' );
		}

		p.textContent = text;
		region.appendChild( p );
	}

	function setError( form, key, text ) {
		const box = form.querySelector( '[data-rf-error-for="' + CSS.escape( key ) + '"]' );
		const field = box ? box.closest( '.refraction-form__field' ) : null;

		if ( ! box ) {
			return null;
		}

		box.textContent = text || '';

		if ( field ) {
			field.classList.toggle( 'has-error', !! text );

			q( field, 'input:not([type=hidden]), select, textarea, fieldset' ).forEach( ( el ) => {
				if ( text ) {
					el.setAttribute( 'aria-invalid', 'true' );
				} else {
					el.removeAttribute( 'aria-invalid' );
				}
			} );
		}

		return field;
	}

	function clearErrors( form ) {
		q( form, '[data-rf-error-for]' ).forEach( ( box ) => setError( form, box.getAttribute( 'data-rf-error-for' ), '' ) );
	}

	function firstControl( field ) {
		return field ? field.querySelector( 'input:not([type=hidden]), select, textarea' ) : null;
	}

	function initForm( form ) {
		if ( form.dataset[ READY ] ) {
			return;
		}

		form.dataset[ READY ] = '1';
		form.classList.add( 'refraction-form--js' );
		form.setAttribute( 'novalidate', '' );

		const wrap = form.closest( '.refraction-form-wrap' );
		const region = wrap.querySelector( '[data-rf-messages]' );
		const preview = form.classList.contains( 'refraction-form--preview' );
		const steps = q( form, '[data-rf-step]' );
		const submit = form.querySelector( '.refraction-form__submit' );
		const prev = form.querySelector( '[data-rf-prev]' );
		const next = form.querySelector( '[data-rf-next]' );
		const page = form.querySelector( 'input[name="rf_page"]' );
		let current = 0;

		if ( page ) {
			page.value = window.location.href.split( '#' )[ 0 ];
		}

		// Native messages for each invalid control, written into our error boxes.
		function validateScope( scope ) {
			let first = null;

			q( scope, 'input, select, textarea' ).forEach( ( el ) => {
				if ( 'hidden' === el.type || el.closest( '.refraction-form__hp' ) ) {
					return;
				}

				const field = el.closest( '.refraction-form__field' );
				const key = field ? field.getAttribute( 'data-rf-field' ) || ( field.classList.contains( 'refraction-form__field--math' ) ? 'rf_math' : '' ) : '';

				if ( ! key ) {
					return;
				}

				if ( ! el.checkValidity() ) {
					setError( form, key, el.validationMessage );
					first = first || field;
				} else if ( 'radio' !== el.type && 'checkbox' !== el.type ) {
					setError( form, key, '' );
				}
			} );

			// Radio/checkbox groups: required radios are checked by the browser per name.
			return first;
		}

		function showStep( index, focus ) {
			current = Math.max( 0, Math.min( steps.length - 1, index ) );

			steps.forEach( ( step, i ) => {
				step.hidden = i !== current;
			} );

			if ( prev ) {
				prev.hidden = 0 === current;
			}

			if ( next ) {
				next.hidden = current >= steps.length - 1;
			}

			if ( submit ) {
				submit.hidden = steps.length > 1 && current < steps.length - 1;
			}

			q( wrap, '.refraction-form__progress-item' ).forEach( ( item, i ) => {
				item.classList.toggle( 'is-current', i === current );
				item.classList.toggle( 'is-done', i < current );

				if ( i === current ) {
					item.setAttribute( 'aria-current', 'step' );
				} else {
					item.removeAttribute( 'aria-current' );
				}
			} );

			const bar = wrap.querySelector( '[role=progressbar]' );

			if ( bar ) {
				bar.setAttribute( 'aria-valuenow', String( current + 1 ) );
				bar.querySelector( '.refraction-form__bar-fill' ).style.width = Math.round( ( ( current + 1 ) / steps.length ) * 100 ) + '%';
				const text = wrap.querySelector( '[data-rf-bar-text]' );

				if ( text ) {
					text.textContent = text.textContent.replace( /\d+ (\D+) \d+/, ( current + 1 ) + ' $1 ' + steps.length );
				}
			}

			if ( focus ) {
				const control = firstControl( steps[ current ] );

				if ( control ) {
					control.focus();
				}
			}
		}

		if ( steps.length > 1 ) {
			showStep( 0, false );

			if ( next ) {
				next.addEventListener( 'click', () => {
					const bad = validateScope( steps[ current ] );

					if ( bad ) {
						const control = firstControl( bad );
						control && control.focus();
						message( region, form.dataset.rfInvalid, 'error' );

						return;
					}

					message( region, '', 'error' );
					showStep( current + 1, true );
				} );
			}

			if ( prev ) {
				prev.addEventListener( 'click', () => showStep( current - 1, true ) );
			}
		}

		form.addEventListener( 'input', ( e ) => {
			const field = e.target.closest ? e.target.closest( '.refraction-form__field' ) : null;

			if ( field && field.classList.contains( 'has-error' ) ) {
				const key = field.getAttribute( 'data-rf-field' ) || 'rf_math';
				setError( form, key, '' );
			}
		} );

		form.addEventListener( 'submit', ( event ) => {
			event.preventDefault();

			if ( preview || form.classList.contains( 'refraction-form--sending' ) ) {
				return;
			}

			clearErrors( form );
			message( region, '', 'error' );

			const bad = validateScope( form );

			if ( bad ) {
				const index = steps.indexOf( bad.closest( '[data-rf-step]' ) );

				if ( index > -1 && index !== current ) {
					showStep( index, false );
				}

				message( region, form.dataset.rfInvalid, 'error' );
				const control = firstControl( bad );
				control && control.focus();

				return;
			}

			send();
		} );

		function token( done ) {
			if ( 'recaptcha_v3' !== form.dataset.rfCaptcha || ! window.grecaptcha ) {
				done();

				return;
			}

			window.grecaptcha.ready( () => {
				window.grecaptcha.execute( form.dataset.rfSitekey, { action: 'submit' } ).then( ( value ) => {
					let input = form.querySelector( 'input[name="g-recaptcha-response"]' );

					if ( ! input ) {
						input = document.createElement( 'input' );
						input.type = 'hidden';
						input.name = 'g-recaptcha-response';
						form.appendChild( input );
					}

					input.value = value;
					done();
				}, done );
			} );
		}

		function send() {
			const label = submit ? submit.querySelector( '.refraction-form__submit-text' ) : null;
			const original = label ? label.textContent : '';

			form.classList.add( 'refraction-form--sending' );
			form.setAttribute( 'aria-busy', 'true' );

			if ( submit ) {
				submit.disabled = true;
			}

			if ( label ) {
				label.textContent = form.dataset.rfSending;
			}

			const finish = () => {
				form.classList.remove( 'refraction-form--sending' );
				form.removeAttribute( 'aria-busy' );

				if ( submit ) {
					submit.disabled = false;
				}

				if ( label ) {
					label.textContent = original;
				}
			};

			token( () => {
				window.fetch( form.dataset.rfAjax, { method: 'POST', body: new window.FormData( form ), credentials: 'same-origin' } )
					.then( ( response ) => response.json().catch( () => ( { success: false, message: '', errors: {} } ) ) )
					.then( ( data ) => {
						finish();

						if ( data.success ) {
							if ( data.redirect ) {
								window.location.href = data.redirect;

								return;
							}

							form.reset();
							clearErrors( form );
							showStep( 0, false );
							message( region, data.message, 'success' );
							region.focus();
							form.dispatchEvent( new window.CustomEvent( 'refraction/forms/success', { bubbles: true } ) );

							return;
						}

						let first = null;
						const errors = data.errors || {};

						Object.keys( errors ).forEach( ( key ) => {
							const field = setError( form, key, errors[ key ] );
							first = first || field;
						} );

						if ( first ) {
							const index = steps.indexOf( first.closest( '[data-rf-step]' ) );

							if ( index > -1 ) {
								showStep( index, false );
							}
						}

						message( region, data.message || form.dataset.rfInvalid, 'error' );
						const control = firstControl( first );

						if ( control ) {
							control.focus();
						} else {
							region.focus();
						}
					} )
					.catch( () => {
						finish();
						message( region, form.dataset.rfInvalid, 'error' );
						region.focus();
					} );
			} );
		}
	}

	function initAll( root ) {
		q( root || document, '[data-rf-form]' ).forEach( initForm );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => initAll() );
	} else {
		initAll();
	}

	// The editor preview re-renders widgets; initialise the new markup.
	window.addEventListener( 'refraction/frontend/init', () => {
		if ( window.refractionFrontend && window.refractionFrontend.hooks ) {
			window.refractionFrontend.hooks.addAction( 'frontend/element_ready/refraction-form.default', ( $scope ) => initAll( $scope[ 0 ] ) );
		}
	} );
}() );
