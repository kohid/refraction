/**
 * Form Builder front end: conditional visibility, multi-step forms, repeaters and file checks.
 *
 * Works on the public form and on the admin record form (anything with [data-rfb-form]). Without JavaScript the form is
 * still a complete single page: every step is shown, every field is visible, and the server validates everything.
 * The visibility rules here mirror Classes\Conditions (PHP), which has the last word on submit.
 */
( function () {
	'use strict';

	const sprintf = ( text, ...values ) => {
		let i = 0;

		return String( text ).replace( /%(?:(\d)\$)?[sd]/g, ( m, n ) => String( values[ n ? Number( n ) - 1 : i++ ] ) );
	};

	// ---------------------------------------------------------------- conditional visibility

	/** Value of a field as a string, or a list of strings for choices. Hidden fields count as empty. */
	function fieldValue( root, scope, key ) {
		const find = ( container ) => container.querySelector( `[data-rfb-key="${ CSS.escape( key ) }"]` );
		const wrapper = ( scope && find( scope ) ) || find( root );

		if ( ! wrapper || wrapper.hidden ) {
			return '';
		}

		const inputs = Array.from( wrapper.querySelectorAll( 'input, select, textarea' ) ).filter( ( el ) => 'file' !== el.type );

		if ( ! inputs.length ) {
			return '';
		}

		if ( wrapper.dataset.rfbType === 'checkbox' ) {
			return inputs.filter( ( el ) => el.checked ).map( ( el ) => el.value );
		}

		if ( wrapper.dataset.rfbType === 'radio' ) {
			const picked = inputs.find( ( el ) => el.checked );

			return picked ? picked.value : '';
		}

		if ( wrapper.dataset.rfbType === 'toggle' ) {
			const box = inputs.find( ( el ) => 'checkbox' === el.type );

			return box && box.checked ? '1' : '0';
		}

		return String( inputs[ 0 ].value ).trim();
	}

	function matches( rule, actual ) {
		const list = Array.isArray( actual ) ? actual.map( String ) : null;
		const text = null === list ? String( actual ).trim() : list.join( ',' );
		const expected = String( rule.value );
		const numeric = ( v ) => '' !== String( v ).trim() && ! Number.isNaN( Number( v ) );

		switch ( rule.op ) {
			case 'equals':
				return null === list ? text === expected : list.includes( expected );
			case 'not_equals':
				return null === list ? text !== expected : ! list.includes( expected );
			case 'contains':
				return '' !== expected && text.toLowerCase().includes( expected.toLowerCase() );
			case 'not_contains':
				return '' === expected || ! text.toLowerCase().includes( expected.toLowerCase() );
			case 'empty':
				return '' === text;
			case 'not_empty':
				return '' !== text;
			case 'greater':
				return numeric( text ) && numeric( expected ) && Number( text ) > Number( expected );
			case 'less':
				return numeric( text ) && numeric( expected ) && Number( text ) < Number( expected );
			default:
				return false;
		}
	}

	function applyConditions( form ) {
		// Document order: a field hidden earlier counts as empty for the rules after it.
		form.querySelectorAll( '[data-rfb-cond]' ).forEach( ( wrapper ) => {
			let cond;

			try {
				cond = JSON.parse( wrapper.dataset.rfbCond );
			} catch ( e ) {
				return;
			}

			const scope = wrapper.closest( '[data-rfb-scope]' );
			const results = ( cond.rules || [] ).map( ( rule ) => matches( rule, fieldValue( form, scope, rule.field ) ) );
			const matched = 'any' === cond.match ? results.includes( true ) : ! results.includes( false );
			const visible = cond.enabled && cond.rules.length ? ( 'hide' === cond.action ? ! matched : matched ) : true;

			wrapper.hidden = ! visible;
			wrapper.querySelectorAll( 'input, select, textarea, button' ).forEach( ( el ) => {
				if ( ! visible ) {
					el.dataset.rfbWasDisabled = el.disabled ? '1' : '';
					el.disabled = true;
				} else if ( undefined !== el.dataset.rfbWasDisabled ) {
					el.disabled = '1' === el.dataset.rfbWasDisabled;
					delete el.dataset.rfbWasDisabled;
				}
			} );
		} );
	}

	// ---------------------------------------------------------------- repeaters

	function initRepeater( repeater, form ) {
		const rows = repeater.querySelector( '.rfb-rows' );
		const template = repeater.querySelector( '.rfb-row-template' );
		const add = repeater.querySelector( '[data-rfb-add]' );
		const min = Number( repeater.dataset.rfbMin || 0 );
		const max = Number( repeater.dataset.rfbMax || 50 );
		let next = rows.children.length;

		const sync = () => {
			const count = rows.children.length;

			add.disabled = count >= max;
			rows.querySelectorAll( '[data-rfb-remove]' ).forEach( ( button ) => ( button.hidden = count <= Math.max( min, 1 ) ) );
		};

		add.addEventListener( 'click', () => {
			if ( rows.children.length >= max ) {
				return;
			}

			const holder = document.createElement( 'div' );

			holder.innerHTML = template.innerHTML.replace( /__INDEX__/g, String( next++ ) );

			const row = holder.firstElementChild;

			rows.appendChild( row );
			sync();
			applyConditions( form );

			const first = row.querySelector( 'input:not([type=hidden]), select, textarea' );

			if ( first ) {
				first.focus();
			}
		} );

		repeater.addEventListener( 'click', ( event ) => {
			const remove = event.target.closest( '[data-rfb-remove]' );

			if ( remove && repeater.contains( remove ) && rows.children.length > Math.max( min, 1 ) ) {
				remove.closest( '.rfb-rep-row' ).remove();
				sync();
				applyConditions( form );
				add.focus();
			}
		} );

		sync();
	}

	// ---------------------------------------------------------------- files

	function initFile( input ) {
		const error = input.parentElement.querySelector( '.rfb-file-error' );
		const i18n = input.closest( '[data-rfb-form]' ) && input.closest( '[data-rfb-form]' ).dataset.rfbI18n ? JSON.parse( input.closest( '[data-rfb-form]' ).dataset.rfbI18n ) : {};
		const accepted = ( input.dataset.rfbAccept || '' ).split( ',' ).filter( Boolean );

		input.addEventListener( 'change', () => {
			let message = '';
			const files = Array.from( input.files );

			if ( files.length > Number( input.dataset.rfbMaxFiles || 1 ) ) {
				message = sprintf( i18n.tooMany || 'At most %d files.', Number( input.dataset.rfbMaxFiles ) );
			}

			files.forEach( ( file ) => {
				const ext = file.name.split( '.' ).pop().toLowerCase();

				if ( ! message && accepted.length && ! accepted.includes( ext ) ) {
					message = sprintf( i18n.badType || '%s is not allowed.', file.name );
				} else if ( ! message && file.size > Number( input.dataset.rfbMaxSize ) ) {
					message = sprintf( i18n.tooBig || '%s is too large.', file.name );
				}
			} );

			if ( message ) {
				input.value = '';
			}

			error.textContent = message;
			error.hidden = '' === message;
		} );
	}

	// ---------------------------------------------------------------- steps

	function initSteps( form ) {
		const steps = Array.from( form.querySelectorAll( ':scope > [data-rfb-step]' ) );

		if ( steps.length < 2 ) {
			return;
		}

		const i18n = form.dataset.rfbI18n ? JSON.parse( form.dataset.rfbI18n ) : {};
		const submit = form.querySelector( '.rfb-actions' );
		const nextText = form.dataset.rfbNext || 'Next';
		const backText = form.dataset.rfbBack || 'Back';
		const style = form.dataset.rfbProgress || 'steps';
		let current = 0;

		form.classList.add( 'rfb-multistep' );

		const progress = document.createElement( 'div' );

		progress.className = 'rfb-progress rfb-progress-' + style;

		if ( 'none' !== style ) {
			if ( 'bar' === style ) {
				progress.innerHTML = '<div class="rfb-bar" role="progressbar" aria-valuemin="1" aria-valuemax="' + steps.length + '"><span></span></div><p class="rfb-progress-label" aria-live="polite"></p>';
			} else {
				progress.innerHTML = '<ol class="rfb-stepper">' + steps.map( ( step, i ) => '<li data-i="' + i + '"><span class="rfb-stepper-num">' + ( i + 1 ) + '</span><span class="rfb-stepper-title"></span></li>' ).join( '' ) + '</ol>';
				progress.querySelectorAll( '.rfb-stepper-title' ).forEach( ( el, i ) => ( el.textContent = steps[ i ].dataset.rfbTitle || sprintf( i18n.step || 'Step %1$d of %2$d', i + 1, steps.length ) ) );
			}

			form.insertBefore( progress, steps[ 0 ] );
		}

		const back = document.createElement( 'button' );
		const next = document.createElement( 'button' );

		back.type = next.type = 'button';
		back.className = 'rfb-btn rfb-btn-light rfb-back';
		next.className = 'rfb-btn rfb-btn-primary rfb-next';
		back.textContent = backText;
		next.textContent = nextText;
		submit.prepend( next );
		submit.prepend( back );

		const show = ( index, focus ) => {
			current = Math.max( 0, Math.min( steps.length - 1, index ) );
			steps.forEach( ( step, i ) => ( step.hidden = i !== current ) );
			back.hidden = 0 === current;
			next.hidden = current === steps.length - 1;
			submit.querySelector( '.rfb-submit' ).hidden = current !== steps.length - 1;

			const label = sprintf( i18n.step || 'Step %1$d of %2$d', current + 1, steps.length );

			if ( 'bar' === style ) {
				progress.querySelector( '.rfb-bar' ).setAttribute( 'aria-valuenow', String( current + 1 ) );
				progress.querySelector( '.rfb-bar span' ).style.width = ( ( current + 1 ) / steps.length * 100 ) + '%';
				progress.querySelector( '.rfb-progress-label' ).textContent = label + ( steps[ current ].dataset.rfbTitle ? ': ' + steps[ current ].dataset.rfbTitle : '' );
			} else if ( 'steps' === style ) {
				progress.querySelectorAll( 'li' ).forEach( ( li, i ) => {
					li.classList.toggle( 'is-current', i === current );
					li.classList.toggle( 'is-done', i < current );
					li.setAttribute( 'aria-current', i === current ? 'step' : 'false' );
				} );
			}

			if ( focus ) {
				const target = steps[ current ].querySelector( 'input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)' );

				steps[ current ].scrollIntoView( { block: 'nearest', behavior: 'smooth' } );

				if ( target ) {
					target.focus( { preventScroll: true } );
				}
			}
		};

		/** First invalid visible control in a step, after showing a message; null when the step is fine. */
		const firstInvalid = ( step ) => Array.from( step.querySelectorAll( 'input, select, textarea' ) ).find( ( el ) => ! el.disabled && 'hidden' !== el.type && ! el.checkValidity() ) || null;

		next.addEventListener( 'click', () => {
			const bad = firstInvalid( steps[ current ] );

			if ( bad ) {
				bad.reportValidity();
				return;
			}

			show( current + 1, true );
		} );

		back.addEventListener( 'click', () => show( current - 1, true ) );

		form.addEventListener( 'keydown', ( event ) => {
			if ( 'Enter' === event.key && current < steps.length - 1 && ! [ 'TEXTAREA', 'BUTTON' ].includes( event.target.tagName ) ) {
				event.preventDefault();
				next.click();
			}
		} );

		form.addEventListener( 'submit', ( event ) => {
			// Every step must be valid before the server sees it; jump to the first one that is not.
			for ( let i = 0; i < steps.length; i++ ) {
				const bad = firstInvalid( steps[ i ] );

				if ( bad ) {
					event.preventDefault();
					show( i, false );
					bad.reportValidity();
					return;
				}
			}
		} );

		const withError = steps.findIndex( ( step ) => step.querySelector( '.has-error' ) );

		show( withError > -1 ? withError : 0, withError > -1 );
	}

	// ---------------------------------------------------------------- boot

	function init( form ) {
		form.querySelectorAll( '.rfb-repeater' ).forEach( ( repeater ) => initRepeater( repeater, form ) );
		form.querySelectorAll( 'input[type=file][data-rfb-max-size]' ).forEach( initFile );
		form.addEventListener( 'input', () => applyConditions( form ) );
		form.addEventListener( 'change', () => applyConditions( form ) );
		applyConditions( form );
		initSteps( form );

		// Browsers do not validate with novalidate; give the visitor the native hints on submit instead.
		form.addEventListener( 'submit', ( event ) => {
			if ( event.defaultPrevented ) {
				return;
			}

			const bad = Array.from( form.querySelectorAll( 'input, select, textarea' ) ).find( ( el ) => ! el.disabled && 'hidden' !== el.type && ! el.checkValidity() );

			if ( bad ) {
				event.preventDefault();
				bad.reportValidity();
			}
		} );
	}

	document.addEventListener( 'DOMContentLoaded', () => document.querySelectorAll( '[data-rfb-form]' ).forEach( init ) );
}() );
