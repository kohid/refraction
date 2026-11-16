/**
 * The "new form" and "new event" wizards (0.106.0; markup in modules/form-builder/classes/wizard.php): a dialog in
 * steps. One step shows at a time; Continue checks the step's required boxes first; the steps already reached can be
 * clicked in the list on the left; the last step shows what was chosen; the last button posts the form. Escape and the
 * backdrop close it; focus stays inside while it is open and goes back to the button that opened it.
 */
( function () {
	'use strict';

	function setUp( dialog ) {
		const form = dialog.querySelector( 'form' );
		const panes = Array.from( dialog.querySelectorAll( '.rf-wizard__pane' ) );
		const items = Array.from( dialog.querySelectorAll( '.rf-wizard__nav-item' ) );
		const back = dialog.querySelector( '[data-rf-wizard-back]' );
		const next = dialog.querySelector( '[data-rf-wizard-next]' );
		const submit = dialog.querySelector( '[data-rf-wizard-submit]' );
		const count = dialog.querySelector( '[data-rf-wizard-count]' );
		let current = 0;
		let reached = 0;
		let opener = null;

		// "kind=contact", "kind!=starter:*" (a trailing * matches the start), "notify=yes" (a switch that is on).
		const matches = ( rule ) => {
			const m = /^([\w-]+)(!?=)(.*)$/.exec( rule );

			if ( ! m ) {
				return true;
			}

			const inputs = Array.from( form.elements ).filter( ( el ) => el.name === m[ 1 ] || el.name === m[ 1 ] + '[]' );
			const values = inputs.filter( ( el ) => ( 'radio' !== el.type && 'checkbox' !== el.type ) || el.checked ).map( ( el ) => el.value );
			const wanted = m[ 3 ];
			const hit = values.some( ( v ) => ( wanted.endsWith( '*' ) ? v.startsWith( wanted.slice( 0, -1 ) ) : v === wanted ) );

			return '=' === m[ 2 ] ? hit : ! hit;
		};

		// Several rules joined by commas must all hold: "kind!=starter:*,kind!=events".
		const applyRules = () => {
			dialog.querySelectorAll( '[data-rf-show-if]' ).forEach( ( el ) => {
				el.hidden = ! el.getAttribute( 'data-rf-show-if' ).split( ',' ).every( matches );
			} );
		};

		const isShown = ( el ) => ! el.closest( '[hidden]' ) || el.closest( '.rf-wizard__pane' ) === el.closest( '[hidden]' );

		// The required boxes of a step, the hidden ones left out; the first one not filled is pointed out.
		const valid = ( index ) => {
			const bad = Array.from( panes[ index ].querySelectorAll( 'input, textarea, select' ) ).find( ( el ) => ! el.closest( '[data-rf-show-if][hidden]' ) && ! el.checkValidity() );

			if ( bad ) {
				bad.reportValidity();
				bad.focus();
				return false;
			}

			return true;
		};

		// The last look: each answer under its name, as chosen.
		const review = () => {
			const list = dialog.querySelector( '[data-rf-wizard-review]' );

			if ( ! list ) {
				return;
			}

			list.textContent = '';
			panes.slice( 0, -1 ).forEach( ( pane ) => {
				pane.querySelectorAll( '[data-rf-sum]' ).forEach( ( el ) => {
					if ( el.closest( '[data-rf-show-if][hidden]' ) ) {
						return;
					}

					let value = '';

					if ( 'FIELDSET' === el.tagName ) {
						value = Array.from( el.querySelectorAll( 'input:checked' ) ).map( ( input ) => input.getAttribute( 'data-rf-title' ) || input.value ).join( ', ' );

						// Two sets of cards for one choice (types, ready-made forms): only the one chosen counts.
						if ( ! value ) {
							return;
						}
					} else if ( 'checkbox' === el.type ) {
						value = el.checked ? ( window.wp?.i18n?.__( 'Yes', 'refraction' ) || 'Yes' ) : ( window.wp?.i18n?.__( 'No', 'refraction' ) || 'No' );
					} else {
						value = el.value.trim();
					}

					const dt = document.createElement( 'dt' );
					const dd = document.createElement( 'dd' );

					dt.textContent = el.getAttribute( 'data-rf-sum' );
					dd.textContent = value || '–';
					dd.classList.toggle( 'is-empty', ! value );
					list.append( dt, dd );
				} );
			} );
		};

		const show = ( index ) => {
			current = Math.max( 0, Math.min( panes.length - 1, index ) );
			reached = Math.max( reached, current );
			panes.forEach( ( pane, i ) => ( pane.hidden = i !== current ) );
			items.forEach( ( item, i ) => {
				item.classList.toggle( 'is-current', i === current );
				item.classList.toggle( 'is-done', i < current );
				item.classList.toggle( 'is-reached', i <= reached );
				item.querySelector( 'button' ).tabIndex = i <= reached && i !== current ? 0 : -1;
				item.setAttribute( 'aria-current', i === current ? 'step' : 'false' );
			} );
			back.hidden = 0 === current;
			next.hidden = current === panes.length - 1;
			submit.hidden = current !== panes.length - 1;

			if ( count ) {
				count.textContent = ( count.getAttribute( 'data-rf-of' ) || 'Step %1$d of %2$d' ).replace( '%1$d', current + 1 ).replace( '%2$d', panes.length );
			}

			if ( current === panes.length - 1 ) {
				review();
			}

			applyRules();
			const first = panes[ current ].querySelector( 'input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, input:checked' );

			if ( first && isShown( first ) ) {
				first.focus( { preventScroll: true } );
			}
		};

		const open = ( from ) => {
			opener = from || null;
			dialog.hidden = false;
			document.documentElement.classList.add( 'rf-wizard-open' );
			show( 0 );
		};

		const close = () => {
			dialog.hidden = true;
			document.documentElement.classList.remove( 'rf-wizard-open' );

			if ( opener ) {
				opener.focus();
			}
		};

		next.addEventListener( 'click', () => valid( current ) && show( current + 1 ) );
		back.addEventListener( 'click', () => show( current - 1 ) );
		items.forEach( ( item, i ) => item.querySelector( 'button' ).addEventListener( 'click', () => {
			// Back to any step; forward only to one already reached, through the checks on the way.
			if ( i <= reached && ( i <= current || panes.slice( current, i ).every( ( _, k ) => valid( current + k ) ) ) ) {
				show( i );
			}
		} ) );
		dialog.querySelectorAll( '[data-rf-wizard-close]' ).forEach( ( el ) => el.addEventListener( 'click', close ) );
		form.addEventListener( 'change', applyRules );

		// Two sets of cards for one choice: choosing in one clears the other (same name, so the browser does it).
		form.addEventListener( 'keydown', ( event ) => {
			if ( 'Escape' === event.key ) {
				event.preventDefault();
				close();
			} else if ( 'Enter' === event.key && 'TEXTAREA' !== event.target.tagName && 'BUTTON' !== event.target.tagName && current < panes.length - 1 ) {
				// Enter moves on rather than sending the form from the first step.
				event.preventDefault();
				next.click();
			} else if ( 'Tab' === event.key ) {
				const focusable = Array.from( dialog.querySelectorAll( 'button, input, textarea, select, [tabindex]' ) ).filter( ( el ) => ! el.disabled && el.tabIndex >= 0 && el.offsetParent );
				const first = focusable[ 0 ];
				const last = focusable[ focusable.length - 1 ];

				if ( event.shiftKey && document.activeElement === first ) {
					event.preventDefault();
					last.focus();
				} else if ( ! event.shiftKey && document.activeElement === last ) {
					event.preventDefault();
					first.focus();
				}
			}
		} );

		form.addEventListener( 'submit', ( event ) => {
			// Every step is checked once more; the first with something missing opens.
			for ( let i = 0; i < panes.length; i++ ) {
				if ( ! valid( i ) ) {
					event.preventDefault();
					show( i );
					valid( i );
					return;
				}
			}

			submit.disabled = true;
			submit.classList.add( 'is-busy' );
		} );

		return { open };
	}

	const boot = () => {
		const wizards = {};

		document.querySelectorAll( '.rf-wizard' ).forEach( ( dialog ) => {
			// Out of the admin page's columns, so it sits over the whole screen.
			document.body.appendChild( dialog );
			wizards[ dialog.id ] = setUp( dialog );
		} );

		document.addEventListener( 'click', ( event ) => {
			const opener = event.target.closest( '[data-rf-wizard-open]' );
			const wizard = opener && wizards[ opener.getAttribute( 'data-rf-wizard-open' ) ];

			if ( wizard ) {
				event.preventDefault();
				wizard.open( opener );
			}
		} );

		// Sent back with a missing name: open it again.
		const again = new URLSearchParams( window.location.search ).get( 'wizard' );
		const first = Object.keys( wizards )[ 0 ];

		if ( again && first ) {
			wizards[ first ].open( null );
		}
	};

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
}() );
