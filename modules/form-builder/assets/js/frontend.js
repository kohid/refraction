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

		// A field counts as empty when it, or a panel, card or group around it, is hidden by a rule.
		if ( ! wrapper || wrapper.closest( '[data-rfb-cond][hidden]' ) ) {
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

		if ( inputs[ 0 ].hasAttribute( 'data-rfb-amount' ) ) {
			const plain = parseAmount( inputs[ 0 ].value, moneyOf( root ) );

			return null === plain ? '' : plain;
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

			// Controls stay off while this wrapper, or a panel, card or group around it, is hidden.
			const blocked = ! visible || !! ( wrapper.parentElement && wrapper.parentElement.closest( '[data-rfb-cond][hidden]' ) );

			wrapper.querySelectorAll( 'input, select, textarea, button' ).forEach( ( el ) => {
				if ( blocked ) {
					// Remember the control's own state only the first time it is hidden. This runs on every keystroke and
					// click, so writing it again while hidden would store "disabled" and the control would never come back.
					if ( undefined === el.dataset.rfbWasDisabled ) {
						el.dataset.rfbWasDisabled = el.disabled ? '1' : '';
					}

					el.disabled = true;
				} else if ( undefined !== el.dataset.rfbWasDisabled ) {
					el.disabled = '1' === el.dataset.rfbWasDisabled;
					delete el.dataset.rfbWasDisabled;
				}
			} );
		} );

		form.querySelectorAll( '[data-rfb-tabs]' ).forEach( ( host ) => host.rfbSync && host.rfbSync() );
	}

	// ---------------------------------------------------------------- amounts

	/** The money format the collection chose: thousands separator, decimal separator and decimals. */
	function moneyOf( form ) {
		try {
			return Object.assign( { t: ',', d: '.', n: 2 }, JSON.parse( ( form.closest ? form.closest( '[data-rfb-money]' ) || form : form ).dataset.rfbMoney || '{}' ) );
		} catch ( e ) {
			return { t: ',', d: '.', n: 2 };
		}
	}

	/** What was typed as a plain number string ("1200.5"), or null when it is not an amount. */
	function parseAmount( text, cfg ) {
		let plain = String( text ).replace( /\s/g, '' );

		if ( cfg.t && ' ' !== cfg.t ) {
			plain = plain.split( cfg.t ).join( '' );
		}

		plain = plain.split( cfg.d ).join( '.' );

		return /^-?(\d+(\.\d*)?|\.\d+)$/.test( plain ) ? plain : null;
	}

	/** Writes the digits typed so far as 1,200 or 350,329.45, keeping the caret next to the same digit. */
	function formatAmount( input, cfg, allowNegative ) {
		const value = input.value;
		const caret = null === input.selectionStart ? value.length : input.selectionStart;
		const significant = ( ch ) => /\d/.test( ch ) || ch === cfg.d;
		const before = Array.from( value.slice( 0, caret ) ).filter( significant ).length;
		const negative = allowNegative && value.trim().startsWith( '-' );
		let whole = '';
		let part = '';
		let seen = false;

		Array.from( value ).forEach( ( ch ) => {
			if ( /\d/.test( ch ) ) {
				seen ? ( part += ch ) : ( whole += ch );
			} else if ( ch === cfg.d && ! seen && cfg.n > 0 ) {
				seen = true;
			}
		} );

		whole = whole.replace( /^0+(?=\d)/, '' );
		part = part.slice( 0, cfg.n );

		const grouped = cfg.t ? whole.replace( /\B(?=(\d{3})+(?!\d))/g, cfg.t ) : whole;
		const text = ( negative ? '-' : '' ) + grouped + ( seen ? cfg.d + part : '' );

		if ( text === value ) {
			return;
		}

		input.value = text;

		// Put the caret after the same number of digits as before.
		let count = 0;
		let position = 0;

		while ( position < text.length && count < before ) {
			count += significant( text[ position ] ) ? 1 : 0;
			position++;
		}

		input.setSelectionRange( position, position );
	}

	function initAmount( input, form ) {
		const cfg = moneyOf( form );
		const i18n = form.dataset.rfbI18n ? JSON.parse( form.dataset.rfbI18n ) : {};
		const min = input.dataset.rfbMin;
		const max = input.dataset.rfbMax;
		const check = () => {
			const plain = parseAmount( input.value, cfg );
			const number = null === plain ? NaN : Number( plain );
			let message = '';

			if ( '' !== input.value && Number.isNaN( number ) ) {
				message = i18n.number || 'Enter a number.';
			} else if ( ! Number.isNaN( number ) && undefined !== min && number < Number( min ) ) {
				message = sprintf( i18n.lowest || 'The lowest allowed value is %s.', min );
			} else if ( ! Number.isNaN( number ) && undefined !== max && number > Number( max ) ) {
				message = sprintf( i18n.highest || 'The highest allowed value is %s.', max );
			}

			input.setCustomValidity( message );
		};

		input.addEventListener( 'input', () => {
			formatAmount( input, cfg, Number( min ) < 0 );
			check();
		} );
		input.addEventListener( 'blur', () => {
			// Tidy a lone separator ("12.") and pad to the decimals only when the visitor typed some.
			if ( cfg.d && input.value.endsWith( cfg.d ) ) {
				input.value = input.value.slice( 0, -1 );
			}

			check();
		} );
		formatAmount( input, cfg, Number( min ) < 0 );
		check();
	}

	// ---------------------------------------------------------------- accordion, tabs and choice cards

	/** Shows a control that sits in a closed panel, an inactive tab or closed card details, so its message can be seen. */
	function reveal( el ) {
		let node = el.parentElement;

		while ( node ) {
			if ( node.matches( 'details' ) ) {
				node.open = true;
			}

			if ( node.matches( '.rfb-tabpanel' ) && node.parentElement && node.parentElement.rfbActivate ) {
				node.parentElement.rfbActivate( node );
			}

			node = node.parentElement;
		}
	}

	/** Shows the browser's own message on a control, after opening whatever hides it. */
	function report( bad ) {
		if ( bad.nodeType ) {
			reveal( bad );
		}

		bad.reportValidity();
	}

	function initAccordion( host ) {
		const items = Array.from( host.querySelectorAll( ':scope > .rfb-acc-item' ) );

		if ( host.hasAttribute( 'data-rfb-multiple' ) ) {
			return;
		}

		items.forEach( ( item ) => item.addEventListener( 'toggle', () => {
			if ( item.open ) {
				items.filter( ( other ) => other !== item ).forEach( ( other ) => ( other.open = false ) );
			}
		} ) );

		// Only one panel is open at a time; when several are marked open, the first one wins.
		const open = items.filter( ( item ) => item.open );

		open.slice( 1 ).forEach( ( item ) => ( item.open = false ) );
	}

	function initTabs( host ) {
		const list = host.querySelector( ':scope > .rfb-tablist' );
		const tabs = Array.from( list.querySelectorAll( '[data-rfb-tab]' ) );
		const panels = Array.from( host.querySelectorAll( ':scope > .rfb-tabpanel' ) );
		const visible = () => tabs.filter( ( tab, i ) => ! panels[ i ].hidden );
		const activate = ( index, focus ) => {
			tabs.forEach( ( tab, i ) => {
				const on = i === index;

				tab.setAttribute( 'aria-selected', String( on ) );
				tab.tabIndex = on ? 0 : -1;
				tab.classList.toggle( 'is-active', on );
				panels[ i ].classList.toggle( 'is-active', on );
			} );

			if ( focus ) {
				tabs[ index ].focus();
			}
		};

		host.rfbActivate = ( panel ) => activate( panels.indexOf( panel ), false );
		host.rfbSync = () => {
			tabs.forEach( ( tab, i ) => ( tab.hidden = panels[ i ].hidden ) );

			if ( ! tabs.some( ( tab, i ) => tab.classList.contains( 'is-active' ) && ! panels[ i ].hidden ) ) {
				const first = tabs.findIndex( ( tab, i ) => ! panels[ i ].hidden );

				activate( first < 0 ? 0 : first, false );
			}
		};

		tabs.forEach( ( tab, i ) => tab.addEventListener( 'click', () => activate( i, false ) ) );
		list.addEventListener( 'keydown', ( event ) => {
			const shown = visible();
			const at = shown.indexOf( document.activeElement );

			if ( at < 0 || ! [ 'ArrowLeft', 'ArrowRight', 'Home', 'End' ].includes( event.key ) ) {
				return;
			}

			event.preventDefault();

			const next = 'Home' === event.key ? 0 : ( 'End' === event.key ? shown.length - 1 : ( at + ( 'ArrowRight' === event.key ? 1 : -1 ) + shown.length ) % shown.length );

			activate( tabs.indexOf( shown[ next ] ), true );
		} );

		const withError = panels.findIndex( ( panel ) => panel.querySelector( '.has-error' ) );

		host.setAttribute( 'data-rfb-ready', '' );
		list.hidden = false;
		activate( withError > -1 ? withError : 0, false );
	}

	function initCards( set ) {
		const mark = () => set.querySelectorAll( ':scope .rfb-cc-list > .rfb-choice-card' ).forEach( ( card ) => {
			const input = card.querySelector( '.rfb-cc-main input, .rfb-cc-pick input' );

			card.classList.toggle( 'is-selected', !! input && input.checked );
		} );

		// A free card picks itself when you click anywhere on it (some themes stop the hidden input from receiving the click),
		// but not when the click is on a link, a toggle or a control inside it.
		set.addEventListener( 'click', ( event ) => {
			const card = event.target.closest( '.rfb-choice-card.is-free' );

			if ( ! card || event.target.closest( 'a, summary, button, input, select, textarea, label' ) ) {
				return;
			}

			const input = card.querySelector( '.rfb-cc-pick input' );

			if ( input && ! input.disabled ) {
				input.click();
			}
		} );
		set.addEventListener( 'change', mark );
		mark();
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
			row.querySelectorAll( 'input[data-rfb-amount]' ).forEach( ( input ) => initAmount( input, form ) );
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

	// ---------------------------------------------------------------- signature pad

	const isMissing = ( box ) => box.hasAttribute( 'data-rfb-required' ) && ! box._rfbDrawn && ! box.closest( '[hidden]' );

	function showSignatureError( box ) {
		const error = box.parentElement.querySelector( '.rfb-sig-error' );

		error.hidden = false;
		box.scrollIntoView( { block: 'center', behavior: 'smooth' } );
	}

	function initSignature( box ) {
		const canvas = box.querySelector( 'canvas' );
		const hint = box.querySelector( '.rfb-sig-hint' );
		const value = box.querySelector( '[data-rfb-sig-value]' );
		const clear = box.parentElement.querySelector( '[data-rfb-sig-clear]' );
		const error = box.parentElement.querySelector( '.rfb-sig-error' );
		const context = canvas.getContext( '2d' );
		let drawing = false;
		let last = null;

		box._rfbDrawn = false;

		/** Match the drawing buffer to the box (and the screen's pixel density); keep what was drawn. */
		const fit = () => {
			const box_ = box.getBoundingClientRect();

			if ( box_.width < 1 || box_.height < 1 ) {
				return;
			}

			const ratio = window.devicePixelRatio || 1;
			const saved = box._rfbDrawn ? value.value : '';

			canvas.width = Math.round( box_.width * ratio );
			canvas.height = Math.round( box_.height * ratio );
			context.setTransform( ratio, 0, 0, ratio, 0, 0 );
			context.lineWidth = 2.4;
			context.lineCap = 'round';
			context.lineJoin = 'round';
			context.strokeStyle = '#14213d';
			context.fillStyle = '#14213d';

			if ( saved ) {
				const image = new Image();

				image.onload = () => context.drawImage( image, 0, 0, box_.width, box_.height );
				image.src = saved;
			}
		};

		const point = ( event ) => {
			const rect = canvas.getBoundingClientRect();

			return { x: event.clientX - rect.left, y: event.clientY - rect.top };
		};

		canvas.addEventListener( 'pointerdown', ( event ) => {
			event.preventDefault();
			drawing = true;
			last = point( event );
			canvas.setPointerCapture( event.pointerId );
			context.beginPath();
			context.arc( last.x, last.y, 1.1, 0, Math.PI * 2 );
			context.fill();
		} );

		canvas.addEventListener( 'pointermove', ( event ) => {
			if ( ! drawing ) {
				return;
			}

			const next = point( event );

			context.beginPath();
			context.moveTo( last.x, last.y );
			context.lineTo( next.x, next.y );
			context.stroke();
			last = next;
		} );

		const finish = () => {
			if ( ! drawing ) {
				return;
			}

			drawing = false;
			box._rfbDrawn = true;
			value.value = canvas.toDataURL( 'image/png' );
			hint.hidden = true;
			clear.hidden = false;
			error.hidden = true;
		};

		canvas.addEventListener( 'pointerup', finish );
		canvas.addEventListener( 'pointercancel', finish );

		clear.addEventListener( 'click', () => {
			context.clearRect( 0, 0, canvas.width, canvas.height );
			box._rfbDrawn = false;
			value.value = '';
			hint.hidden = false;
			clear.hidden = true;
		} );

		if ( window.ResizeObserver ) {
			new ResizeObserver( fit ).observe( box ); // Also runs when a hidden step is shown and the box gets its size.
		} else {
			fit();
		}
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
		const firstInvalid = ( step ) => {
			const field = Array.from( step.querySelectorAll( 'input, select, textarea' ) ).find( ( el ) => ! el.disabled && 'hidden' !== el.type && ! el.checkValidity() );
			const pad = Array.from( step.querySelectorAll( '[data-rfb-signature]' ) ).find( isMissing );

			return field || ( pad ? { reportValidity: () => showSignatureError( pad ) } : null );
		};

		next.addEventListener( 'click', () => {
			const bad = firstInvalid( steps[ current ] );

			if ( bad ) {
				report( bad );
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
					report( bad );
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
		form.querySelectorAll( '[data-rfb-signature]' ).forEach( initSignature );
		form.querySelectorAll( 'input[data-rfb-amount]' ).forEach( ( input ) => initAmount( input, form ) );
		form.querySelectorAll( '[data-rfb-accordion]' ).forEach( initAccordion );
		form.querySelectorAll( '[data-rfb-tabs]' ).forEach( initTabs );
		form.querySelectorAll( '.rfb-cards' ).forEach( initCards );
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
			const pad = Array.from( form.querySelectorAll( '[data-rfb-signature]' ) ).find( isMissing );

			if ( bad ) {
				event.preventDefault();
				report( bad );
			} else if ( pad ) {
				event.preventDefault();
				showSignatureError( pad );
			}
		} );
	}

	document.addEventListener( 'DOMContentLoaded', () => document.querySelectorAll( '[data-rfb-form]' ).forEach( init ) );
}() );
