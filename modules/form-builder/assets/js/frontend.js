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

		if ( wrapper.dataset.rfbType === 'choice_set' ) {
			return pickedCards( wrapper ).map( ( el ) => el.value );
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
		collapseEmpty( form );
	}

	/**
	 * A form built in the page editor: a widget whose field is hidden by a rule, and a container whose widgets are all
	 * hidden, step out of the layout, so they leave no gap (0.90.0).
	 *
	 * @param {Element} form
	 */
	function collapseEmpty( form ) {
		if ( ! form.classList.contains( 'rfb-form-editor' ) ) {
			return;
		}

		form.querySelectorAll( '.refraction-widget' ).forEach( ( widget ) => {
			const field = widget.querySelector( ':scope > [data-rfb-cond], :scope > .refraction-widget-container > [data-rfb-cond]' );

			widget.classList.toggle( 'rfb-off', !! field && field.hidden );
		} );

		// Innermost containers first, so a row of hidden rows is hidden too.
		Array.from( form.querySelectorAll( '.e-con' ) ).reverse().forEach( ( box ) => {
			const items = Array.from( box.querySelectorAll( ':scope > .refraction-element, :scope > .e-con-inner > .refraction-element' ) );

			box.classList.toggle( 'rfb-off', items.length > 0 && items.every( ( item ) => item.classList.contains( 'rfb-off' ) ) );
		} );
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

			// With the calendar, the visible box is the one the browser checks.
			( input._flatpickr && input._flatpickr.altInput ? input._flatpickr.altInput : input ).setCustomValidity( message );
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

	/**
	 * The progress display of a multi-step form (0.98.0): its element and how it follows the current step.
	 *
	 * @param {string}   style  The look ("connected", "bar_percent", "slider", "segments", "ring", "dots", "chevrons",
	 *                          "bar_label", "steps", "bar" or "none").
	 * @param {string[]} titles The steps' titles.
	 * @param {Object}   i18n   The form's texts.
	 * @return {{el: HTMLElement, update: Function}|null} The display, or null for none.
	 */
	function buildProgress( style, titles, i18n ) {
		if ( 'none' === style ) {
			return null;
		}

		const n = titles.length;
		const el = document.createElement( 'div' );
		const pct = ( i ) => Math.round( ( i + 1 ) / n * 100 );
		const esc = ( text ) => String( text ).replace( /[&<>"]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ c ] ) );
		const check = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		const list = ( cls, item ) => '<ol class="' + cls + '">' + titles.map( ( title, i ) => item( title, i ) ).join( '' ) + '</ol>';
		const mark = ( current ) => el.querySelectorAll( 'li' ).forEach( ( li, i ) => {
			li.classList.toggle( 'is-current', i === current );
			li.classList.toggle( 'is-done', i < current );
			li.setAttribute( 'aria-current', i === current ? 'step' : 'false' );
		} );
		let update = mark;

		el.className = 'rfb-progress rfb-progress-' + style;

		switch ( style ) {
			case 'connected':
				el.innerHTML = list( 'rfb-pg-connected', ( title, i ) => '<li><span class="rfb-pg-dot"><span class="rfb-pg-num">' + ( i + 1 ) + '</span><span class="rfb-pg-check">' + check + '</span></span><span class="rfb-pg-name">' + esc( title ) + '</span></li>' );
				break;
			case 'chevrons':
				el.innerHTML = list( 'rfb-pg-chevrons', ( title ) => '<li><span class="rfb-pg-check">' + check + '</span><span class="rfb-pg-name">' + esc( title ) + '</span></li>' );
				break;
			case 'segments':
				el.innerHTML = list( 'rfb-pg-segments', ( title ) => '<li><span class="screen-reader-text">' + esc( title ) + '</span></li>' );
				break;
			case 'bar_percent':
			case 'slider':
			case 'bar_label':
			case 'bar':
				el.innerHTML = ( 'bar_label' === style ? '<div class="rfb-pg-line"><strong class="rfb-pg-pct"></strong><span class="rfb-pg-name"></span><span class="rfb-pg-of"></span></div>' : '' ) +
					'<div class="rfb-bar" role="progressbar" aria-valuemin="1" aria-valuemax="' + n + '"><span></span>' + ( 'slider' === style ? '<i class="rfb-pg-knob"><b class="rfb-pg-bubble"></b></i>' : '' ) + '</div>' +
					( 'bar_percent' === style ? '<p class="rfb-pg-pct" aria-hidden="true"></p>' : '' ) + ( 'bar' === style ? '<p class="rfb-progress-label" aria-live="polite"></p>' : '' );
				update = ( current ) => {
					const value = pct( current ) + '%';

					el.querySelector( '.rfb-bar' ).setAttribute( 'aria-valuenow', String( current + 1 ) );
					el.querySelector( '.rfb-bar' ).setAttribute( 'aria-valuetext', sprintf( i18n.step || 'Step %1$d of %2$d', current + 1, n ) + ': ' + titles[ current ] );
					el.querySelector( '.rfb-bar span' ).style.width = value;
					el.querySelectorAll( '.rfb-pg-pct, .rfb-pg-bubble' ).forEach( ( out ) => ( out.textContent = pct( current ) + ' %' ) );
					el.style.setProperty( '--rfb-pg', value );

					if ( 'bar_label' === style ) {
						el.querySelector( '.rfb-pg-name' ).textContent = titles[ current ];
						el.querySelector( '.rfb-pg-of' ).textContent = sprintf( i18n.step || 'Step %1$d of %2$d', current + 1, n );
					}

					if ( 'bar' === style ) {
						el.querySelector( '.rfb-progress-label' ).textContent = sprintf( i18n.step || 'Step %1$d of %2$d', current + 1, n ) + ': ' + titles[ current ];
					}
				};
				break;
			case 'ring':
			case 'dots':
				el.innerHTML = '<div class="rfb-pg-round">' + ( 'ring' === style
					? '<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="rfb-pg-ring-track" cx="32" cy="32" r="28"/><circle class="rfb-pg-ring-fill" cx="32" cy="32" r="28" pathLength="100"/></svg>'
					: '<span class="rfb-pg-dots" aria-hidden="true">' + Array.from( { length: 12 }, ( _, i ) => '<i style="--i:' + i + '"></i>' ).join( '' ) + '</span>' ) +
					'<span class="rfb-pg-center"></span></div><div class="rfb-pg-text" aria-live="polite"><strong class="rfb-pg-name"></strong><span class="rfb-pg-next"></span></div>';
				update = ( current ) => {
					el.querySelector( '.rfb-pg-center' ).textContent = 'ring' === style ? sprintf( i18n.ofSteps || '%1$d of %2$d', current + 1, n ) : pct( current ) + ' %';
					el.querySelector( '.rfb-pg-name' ).textContent = titles[ current ];
					el.querySelector( '.rfb-pg-next' ).textContent = current < n - 1 ? sprintf( i18n.nextStep || 'Next: %s', titles[ current + 1 ] ) : ( i18n.lastStep || 'Last step' );
					el.style.setProperty( '--rfb-pg-n', String( pct( current ) ) );
					el.querySelectorAll( '.rfb-pg-dots i' ).forEach( ( dot, i ) => dot.classList.toggle( 'is-on', i < Math.round( pct( current ) / 100 * 12 ) ) );
				};
				break;
			default:
				el.innerHTML = list( 'rfb-stepper', ( title, i ) => '<li data-i="' + i + '"><span class="rfb-stepper-num">' + ( i + 1 ) + '</span><span class="rfb-stepper-title">' + esc( title ) + '</span></li>' );
		}

		return { el, update };
	}

	/**
	 * The steps listed in a sidebar beside the form (0.98.0): number (a tick once done), title and description, a line
	 * between them; done steps and the next one can be clicked.
	 *
	 * @param {HTMLElement}   box    The Steps widget's box.
	 * @param {HTMLElement[]} steps  The steps.
	 * @param {string[]}      titles Their titles.
	 * @param {Object}        i18n   The form's texts.
	 * @param {Function}      goTo   Moves to a step (through the checks when forward).
	 * @return {{update: Function}} How it follows the current step.
	 */
	function buildSidebar( box, steps, titles, i18n, goTo ) {
		const nav = document.createElement( 'nav' );
		const heading = box.dataset.rfbSideHeading || '';

		nav.className = 'rfb-steps-side';
		nav.setAttribute( 'aria-label', i18n.stepsLabel || 'Steps' );

		if ( heading ) {
			const h = document.createElement( 'p' );
			h.className = 'rfb-side-heading';
			h.textContent = heading;
			nav.appendChild( h );
		}

		const ol = document.createElement( 'ol' );

		steps.forEach( ( step, i ) => {
			const li = document.createElement( 'li' );
			const button = document.createElement( 'button' );

			button.type = 'button';
			button.className = 'rfb-side-step';
			button.innerHTML = '<span class="rfb-side-num"><span class="rfb-pg-num"></span><svg class="rfb-pg-check" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="rfb-side-text"><strong></strong><span></span></span>';
			button.querySelector( '.rfb-pg-num' ).textContent = String( i + 1 );
			button.querySelector( 'strong' ).textContent = titles[ i ];
			button.querySelector( '.rfb-side-text span' ).textContent = step.dataset.rfbDescription || '';
			button.addEventListener( 'click', () => goTo( i ) );
			li.appendChild( button );
			ol.appendChild( li );
		} );

		nav.appendChild( ol );
		box.prepend( nav );

		return {
			update( current, reached ) {
				ol.querySelectorAll( 'li' ).forEach( ( li, i ) => {
					li.classList.toggle( 'is-current', i === current );
					// Done: before the current step. Visited further on: can be clicked, but not ticked.
					li.classList.toggle( 'is-done', i < current );
					li.classList.toggle( 'is-visited', i > current && i <= reached );
					li.querySelector( 'button' ).disabled = i > reached + 1;
					li.querySelector( 'button' ).setAttribute( 'aria-current', i === current ? 'step' : 'false' );
				} );
			},
		};
	}

	/**
	 * Each step a section of an accordion (0.98.0): a header with its icon (or number), title, description, its status
	 * (Completed, In progress, Not started) and where the form stands; the current step is open below its header.
	 *
	 * @param {HTMLElement[]} steps  The steps.
	 * @param {string[]}      titles Their titles.
	 * @param {Object}        i18n   The form's texts.
	 * @param {Function}      goTo   Moves to a step (through the checks when forward).
	 * @return {{update: Function}} How it follows the current step.
	 */
	function buildAccordion( steps, titles, i18n, goTo ) {
		const heads = steps.map( ( step, i ) => {
			const head = document.createElement( 'button' );

			head.type = 'button';
			head.className = 'rfb-acc-step';
			head.innerHTML = '<span class="rfb-acc-step-icon"></span><span class="rfb-acc-step-main"><span class="rfb-acc-step-title"><strong></strong><em class="rfb-acc-status"></em></span><span class="rfb-acc-step-desc"></span></span><span class="rfb-acc-step-side"><strong></strong><span></span></span><span class="rfb-acc-chev" aria-hidden="true"></span>';
			head.querySelector( '.rfb-acc-step-title strong' ).textContent = titles[ i ];
			head.querySelector( '.rfb-acc-step-desc' ).textContent = step.dataset.rfbDescription || '';

			// The step's icon is the server's own markup; without one, its number.
			if ( step.dataset.rfbIcon ) {
				head.querySelector( '.rfb-acc-step-icon' ).innerHTML = step.dataset.rfbIcon;
			} else {
				head.querySelector( '.rfb-acc-step-icon' ).textContent = String( i + 1 );
				head.querySelector( '.rfb-acc-step-icon' ).classList.add( 'is-number' );
			}

			step.id = step.id || 'rfb-step-' + Math.random().toString( 36 ).slice( 2, 9 );
			head.setAttribute( 'aria-controls', step.id );
			head.addEventListener( 'click', () => goTo( i ) );
			step.before( head );

			return head;
		} );

		return {
			update( current ) {
				heads.forEach( ( head, i ) => {
					const state = i < current ? 'done' : ( i === current && 'now' ) || 'todo';
					const status = { done: i18n.stepDone || 'Completed', now: i18n.stepNow || 'In progress', todo: i18n.stepTodo || 'Not started' }[ state ];
					const sideTop = { done: i18n.stepAllSet || 'All set!', now: sprintf( i18n.step || 'Step %1$d of %2$d', i + 1, steps.length ), todo: '' }[ state ];
					const sideSub = { done: i18n.stepChange || 'Change if needed', now: i18n.stepFill || 'Fill in the details', todo: '' }[ state ];

					head.className = 'rfb-acc-step is-' + state;
					head.setAttribute( 'aria-expanded', i === current ? 'true' : 'false' );
					head.disabled = i > current + 1;
					head.querySelector( '.rfb-acc-status' ).textContent = status;
					head.querySelector( '.rfb-acc-step-side strong' ).textContent = sideTop;
					head.querySelector( '.rfb-acc-step-side span' ).textContent = sideSub;
				} );
			},
		};
	}

	function initSteps( form ) {
		// Steps are sections of the form itself, or of a Steps widget on a form built in the page editor.
		const steps = Array.from( form.querySelectorAll( ':scope > [data-rfb-step], [data-rfb-steps] > [data-rfb-step]' ) );

		if ( steps.length < 2 ) {
			return;
		}

		const i18n = form.dataset.rfbI18n ? JSON.parse( form.dataset.rfbI18n ) : {};
		const actions = form.querySelector( '.rfb-actions' );
		const submitButton = form.querySelector( '.rfb-submit' );
		let submit = actions;

		// A Submit button placed inside a step (page editor forms) would take Back / Next away with that step: they get
		// their own row after the steps instead.
		const lastActions = actions && actions.closest( '[data-rfb-step]' ) ? actions : null;

		if ( ! actions || lastActions ) {
			submit = document.createElement( 'div' );
			submit.className = 'rfb-actions rfb-step-nav';
			steps[ steps.length - 1 ].after( submit );
		}
		const nextText = form.dataset.rfbNext || 'Next';
		const backText = form.dataset.rfbBack || 'Back';
		// Layout and progress (0.98.0): from the Steps widget, else the form settings.
		const box = steps[ 0 ].closest( '[data-rfb-steps]' );
		const layout = box && box.dataset.rfbLayout ? box.dataset.rfbLayout : 'top';
		const style = 'accordion' === layout ? 'none' : ( box && box.dataset.rfbProgressStyle ) || form.dataset.rfbProgress || 'steps';
		const titles = steps.map( ( step, i ) => step.dataset.rfbTitle || sprintf( i18n.step || 'Step %1$d of %2$d', i + 1, steps.length ) );
		let current = 0;
		let reached = 0;

		form.classList.add( 'rfb-multistep' );

		const progress = buildProgress( style, titles, i18n );

		if ( progress ) {
			steps[ 0 ].parentNode.insertBefore( progress.el, steps[ 0 ] );
		}

		// Each step's count ("Step 1/6") above its title.
		if ( box && box.hasAttribute( 'data-rfb-counter' ) ) {
			steps.forEach( ( step, i ) => {
				const head = step.querySelector( '.rfb-step-head' );
				const count = document.createElement( 'p' );

				count.className = 'rfb-step-count';
				count.textContent = sprintf( i18n.stepShort || 'Step %1$d/%2$d', i + 1, steps.length );

				if ( head ) {
					head.prepend( count );
				}
			} );
		}

		// A step clicked in the sidebar or the accordion: back at once, forward only through the checks.
		const goTo = ( index ) => {
			for ( let i = current; i < index; i++ ) {
				const bad = firstInvalid( steps[ i ] );

				if ( bad ) {
					show( i, false );
					report( bad );
					return;
				}
			}

			if ( index <= reached + 1 ) {
				show( index, true );
			}
		};

		const side = 'sidebar' === layout && box ? buildSidebar( box, steps, titles, i18n, goTo ) : null;
		const accordion = 'accordion' === layout ? buildAccordion( steps, titles, i18n, goTo ) : null;

		const back = document.createElement( 'button' );
		const next = document.createElement( 'button' );

		back.type = next.type = 'button';
		back.className = 'rfb-btn rfb-btn-light rfb-back';
		next.className = 'rfb-btn rfb-btn-primary rfb-next';

		// Icons and hover animations from the Steps widget (0.97.0): the icon markup is the server's own.
		const look = steps[ 0 ].closest( '[data-rfb-steps]' );

		[ [ back, 'rfbBack', backText ], [ next, 'rfbNext', nextText ] ].forEach( ( [ button, which, text ] ) => {
			// The attribute data-rfb-back-icon is dataset.rfbBackIcon.
			const data = look ? look.dataset : {};
			const icon = data[ which + 'Icon' ] || '';
			const label = document.createElement( 'span' );

			label.className = 'rfb-btn-text';
			// The Steps widget's own text and ID (0.99.0), else the form settings' text.
			label.textContent = data[ which + 'Text' ] || text;

			if ( data[ which + 'Id' ] && ! document.getElementById( data[ which + 'Id' ] ) ) {
				button.id = data[ which + 'Id' ];
			}
			button.appendChild( label );

			if ( icon ) {
				button.insertAdjacentHTML( 'right' === data[ which + 'Place' ] ? 'beforeend' : 'afterbegin', icon );
			}

			( data[ which + 'Class' ] || '' ).split( ' ' ).filter( Boolean ).forEach( ( name ) => button.classList.add( name ) );
			button.style.cssText += data[ which + 'Style' ] || '';
		} );
		submit.prepend( next );
		submit.prepend( back );

		const show = ( index, focus ) => {
			current = Math.max( 0, Math.min( steps.length - 1, index ) );
			steps.forEach( ( step, i ) => ( step.hidden = i !== current ) );
			back.hidden = 0 === current;

			// On the last step Back sits next to the Submit button placed in that step.
			( current === steps.length - 1 && lastActions ? lastActions : submit ).prepend( back );
			next.hidden = current === steps.length - 1;
			if ( submitButton ) {
				submitButton.hidden = current !== steps.length - 1;
			}

			reached = Math.max( reached, current );

			if ( progress ) {
				progress.update( current );
			}

			if ( side ) {
				side.update( current, reached );
			}

			// The accordion keeps Back and Next inside the open step.
			if ( accordion ) {
				if ( ! ( current === steps.length - 1 && lastActions ) ) {
					steps[ current ].append( submit );
				}

				accordion.update( current );
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

	// ---------------------------------------------------------------- totals (0.90.0)

	/** The pick inputs of a set of choice cards that are checked (not the locked inputs inside the cards). */
	function pickedCards( wrapper ) {
		return Array.from( wrapper.querySelectorAll( '.rfb-cc-main > input, .rfb-cc-pick > input' ) ).filter( ( el ) => el.checked && ! el.disabled );
	}

	const numberOfEl = ( el ) => {
		const n = el && el.dataset ? el.dataset.rfbN : undefined;

		if ( undefined !== n && '' !== n ) {
			return Number( n ) || 0;
		}

		return el && '' !== String( el.value ).trim() && ! Number.isNaN( Number( el.value ) ) ? Number( el.value ) : 0;
	};

	/** The number a field adds to a Total (mirrors Schema::number_of). */
	/**
	 * The days of a booking calendar's answer, in "Y-m-d" and in order (0.96.0).
	 *
	 * @param {HTMLInputElement} input The date input with data-rfb-calendar.
	 * @return {string[]} The days.
	 */
	function bookedDays( input ) {
		const value = ( input.value || '' ).trim();

		if ( '' === value ) {
			return [];
		}

		const parts = 'multiple' === input.dataset.rfbCalendar ? value.split( /\s*,\s*/ ) : value.split( /\s+(?:to|-|–)\s+|\s*\.\.\s*/ );

		return parts.map( ( part ) => part.trim() ).filter( ( part ) => /^\d{4}-\d{2}-\d{2}$/.test( part ) ).sort();
	}

	function nightsBetween( from, to ) {
		return Math.round( ( Date.parse( to + 'T12:00:00Z' ) - Date.parse( from + 'T12:00:00Z' ) ) / 86400000 );
	}

	function numberOf( form, key ) {
		const wrapper = form.querySelector( `[data-rfb-key="${ CSS.escape( key ) }"]` );

		if ( ! wrapper || wrapper.closest( '[data-rfb-cond][hidden]' ) ) {
			return 0;
		}

		const type = wrapper.dataset.rfbType;

		if ( 'total' === type ) {
			const out = wrapper.querySelector( '[data-rfb-total]' );

			return out && 'number' === typeof out.rfbValue ? out.rfbValue : 0;
		}

		if ( 'choice_set' === type ) {
			return pickedCards( wrapper ).reduce( ( sum, el ) => sum + numberOfEl( el ), 0 );
		}

		// A booking calendar: a stay's nights, a return flight's days away, how many days (as the server counts them).
		const calendar = wrapper.querySelector( 'input[data-rfb-calendar]' );

		if ( calendar ) {
			const days = bookedDays( calendar );

			if ( 'multiple' === calendar.dataset.rfbCalendar ) {
				return days.length;
			}

			return 2 === days.length ? nightsBetween( days[ 0 ], days[ 1 ] ) : 0;
		}

		if ( 'select' === type ) {
			const select = wrapper.querySelector( 'select' );

			return select && select.value ? numberOfEl( select.options[ select.selectedIndex ] ) : 0;
		}

		if ( 'radio' === type || 'checkbox' === type ) {
			return Array.from( wrapper.querySelectorAll( 'input' ) ).filter( ( el ) => el.checked ).reduce( ( sum, el ) => sum + numberOfEl( el ), 0 );
		}

		const value = fieldValue( form, null, key );

		return 'toggle' === type ? ( '1' === value ? 1 : 0 ) : ( '' !== value && ! Number.isNaN( Number( value ) ) ? Number( value ) : 0 );
	}

	/**
	 * The Total formula (mirrors Classes\Formula): numbers, {keys}, + - * / ( ) and min, max, round, ceil, floor, abs.
	 *
	 * @param {string}   formula
	 * @param {Function} number  key => number
	 * @return {number|null} null when empty or malformed.
	 */
	function evaluate( formula, number ) {
		const text = String( formula || '' ).trim();
		const tokens = [];
		let i = 0;

		if ( ! text ) {
			return null;
		}

		while ( i < text.length ) {
			const rest = text.slice( i );
			let m;

			if ( /^\s/.test( rest ) ) {
				i++;
			} else if ( ( m = rest.match( /^(\d+(\.\d+)?|\.\d+)/ ) ) ) {
				tokens.push( [ 'num', m[ 0 ] ] );
				i += m[ 0 ].length;
			} else if ( ( m = rest.match( /^\{([a-z][a-z0-9_]*)\}/ ) ) ) {
				tokens.push( [ 'key', m[ 1 ] ] );
				i += m[ 0 ].length;
			} else if ( ( m = rest.match( /^(min|max|round|ceil|floor|abs)\b/ ) ) ) {
				tokens.push( [ 'fn', m[ 0 ] ] );
				i += m[ 0 ].length;
			} else if ( '+-*/(),'.includes( rest[ 0 ] ) ) {
				tokens.push( [ 'op', rest[ 0 ] ] );
				i++;
			} else {
				return null;
			}
		}

		let at = 0;
		const peek = ( op ) => tokens[ at ] && 'op' === tokens[ at ][ 0 ] && op === tokens[ at ][ 1 ];
		const expect = ( op ) => {
			if ( ! peek( op ) ) {
				throw new Error( op );
			}
			at++;
		};
		let sum;
		const atom = () => {
			const token = tokens[ at ];

			if ( ! token ) {
				throw new Error( 'end' );
			}

			if ( 'num' === token[ 0 ] ) {
				at++;
				return Number( token[ 1 ] );
			}

			if ( 'key' === token[ 0 ] ) {
				at++;
				return Number( number( token[ 1 ] ) ) || 0;
			}

			if ( 'fn' === token[ 0 ] ) {
				at++;
				expect( '(' );
				const args = [ sum() ];

				while ( peek( ',' ) ) {
					at++;
					args.push( sum() );
				}

				expect( ')' );

				if ( 'round' === token[ 1 ] ) {
					const f = Math.pow( 10, args[ 1 ] ? Math.trunc( args[ 1 ] ) : 0 );

					return Math.round( args[ 0 ] * f ) / f;
				}

				return 'min' === token[ 1 ] || 'max' === token[ 1 ] ? Math[ token[ 1 ] ]( ...args ) : Math[ token[ 1 ] ]( args[ 0 ] );
			}

			if ( peek( '(' ) ) {
				at++;
				const value = sum();
				expect( ')' );
				return value;
			}

			throw new Error( token[ 1 ] );
		};
		const unary = () => {
			if ( peek( '-' ) ) {
				at++;
				return -unary();
			}

			if ( peek( '+' ) ) {
				at++;
				return unary();
			}

			return atom();
		};
		const product = () => {
			let value = unary();

			while ( peek( '*' ) || peek( '/' ) ) {
				const times = peek( '*' );
				at++;
				const right = unary();

				if ( ! times && 0 === right ) {
					throw new Error( 'division by zero' );
				}

				value = times ? value * right : value / right;
			}

			return value;
		};
		sum = () => {
			let value = product();

			while ( peek( '+' ) || peek( '-' ) ) {
				const plus = peek( '+' );
				at++;
				value = plus ? value + product() : value - product();
			}

			return value;
		};

		try {
			const result = sum();

			return at === tokens.length && Number.isFinite( result ) ? result : null;
		} catch ( e ) {
			return null;
		}
	}

	function formatMoney( number, cfg, total ) {
		const fixed = Math.abs( number ).toFixed( cfg.n );
		const [ whole, part ] = fixed.split( '.' );
		const grouped = cfg.t ? whole.replace( /\B(?=(\d{3})+(?!\d))/g, cfg.t ) : whole;
		const text = ( number < 0 ? '-' : '' ) + grouped + ( part ? cfg.d + part : '' );
		const withSymbol = ! total.symbol ? text : ( total.after ? text + ' ' + total.symbol : total.symbol + text );

		return total.per ? withSymbol + ' ' + total.per : withSymbol;
	}

	function applyTotals( form ) {
		const cfg = moneyOf( form );

		// In page order, so a total can count an earlier total.
		form.querySelectorAll( '[data-rfb-total]' ).forEach( ( out ) => {
			let total;

			try {
				total = JSON.parse( out.dataset.rfbTotal );
			} catch ( e ) {
				return;
			}

			let formula = total.formula;
			const rule = ( total.rules || [] ).find( ( r ) => {
				const cond = r.conditions || {};
				const results = ( cond.rules || [] ).map( ( c ) => matches( c, fieldValue( form, null, c.field ) ) );

				return 'any' === cond.match ? results.includes( true ) : ! results.includes( false );
			} );

			if ( rule ) {
				formula = rule.formula;
			}

			const value = evaluate( formula, ( key ) => numberOf( form, key ) );
			const amount = out.querySelector( '.rfb-total-amount' );

			out.rfbValue = value;
			out.classList.toggle( 'is-empty', null === value );

			if ( amount ) {
				amount.textContent = null === value ? ( total.none || '' ) : formatMoney( value, cfg, total );
			}
		} );
	}

	// ---------------------------------------------------------------- summary, stepper, booking hours (0.90.0)

	const NOT_ANSWERS = [ 'heading', 'paragraph', 'html', 'divider', 'image', 'icon_list', 'badge', 'price', 'summary', 'group', 'repeater', 'columns', 'tabs', 'accordion', 'panel', 'card', 'signature', 'file' ];

	/** The answer of a field as the visitor would read it. */
	function answerText( wrapper, i18n ) {
		const type = wrapper.dataset.rfbType;

		if ( 'total' === type ) {
			const out = wrapper.querySelector( '.rfb-total-amount' );

			return out ? out.textContent.trim() : '';
		}

		if ( 'choice_set' === type ) {
			return pickedCards( wrapper ).map( ( el ) => el.dataset.rfbTitle || el.value ).join( ', ' );
		}

		if ( 'select' === type || 'country' === type ) {
			const select = wrapper.querySelector( 'select' );

			return select && select.value ? select.options[ select.selectedIndex ].text.trim() : '';
		}

		if ( 'radio' === type || 'checkbox' === type ) {
			return Array.from( wrapper.querySelectorAll( 'input' ) ).filter( ( el ) => el.checked ).map( ( el ) => ( el.nextElementSibling ? el.nextElementSibling.textContent : el.value ).trim() ).join( ', ' );
		}

		if ( 'toggle' === type ) {
			const box = wrapper.querySelector( 'input[type=checkbox]' );

			return box && box.checked ? ( i18n.yes || 'Yes' ) : '';
		}

		if ( 'name' === type ) {
			return Array.from( wrapper.querySelectorAll( 'input' ) ).map( ( el ) => el.value.trim() ).filter( Boolean ).join( ' ' );
		}

		const input = wrapper.querySelector( 'input:not([type=hidden]), textarea' );

		if ( ! input ) {
			return '';
		}

		if ( 'datetime' === type ) {
			return input.value.replace( 'T', ' ' );
		}

		return input.value.trim();
	}

	function applySummary( form ) {
		const boxes = form.querySelectorAll( '[data-rfb-summary]' );

		if ( ! boxes.length ) {
			return;
		}

		const i18n = form.dataset.rfbI18n ? JSON.parse( form.dataset.rfbI18n ) : {};
		const rows = [];

		form.querySelectorAll( '.rfb-field[data-rfb-key][data-rfb-type]' ).forEach( ( wrapper ) => {
			if ( NOT_ANSWERS.includes( wrapper.dataset.rfbType ) || wrapper.closest( '[data-rfb-cond][hidden], template, .rfb-choice-card, .rfb-hp' ) ) {
				return;
			}

			const value = answerText( wrapper, i18n );
			const label = wrapper.querySelector( '.rfb-label, .rfb-switch-text' );

			// A field whose label the owner hid (a terms box) is not repeated in the summary.
			if ( value && label && ! label.classList.contains( 'screen-reader-text' ) ) {
				rows.push( [ label.textContent.trim(), value ] );
			}
		} );

		boxes.forEach( ( box ) => {
			const list = box.querySelector( '.rfb-summary-list' );

			list.textContent = '';

			if ( ! rows.length ) {
				const empty = document.createElement( 'div' );
				empty.className = 'rfb-summary-empty';
				empty.textContent = box.dataset.rfbEmpty || '';
				list.appendChild( empty );
				return;
			}

			rows.forEach( ( [ label, value ] ) => {
				const row = document.createElement( 'div' );
				const dt = document.createElement( 'dt' );
				const dd = document.createElement( 'dd' );

				row.className = 'rfb-summary-row';
				dt.textContent = label;
				dd.textContent = value;
				row.append( dt, dd );
				list.appendChild( row );
			} );
		} );
	}

	function initStepper( box ) {
		const input = box.querySelector( 'input' );

		box.addEventListener( 'click', ( event ) => {
			const button = event.target.closest( '[data-rfb-step]' );

			if ( ! button || input.disabled ) {
				return;
			}

			const min = '' !== input.min ? Number( input.min ) : -Infinity;
			const max = '' !== input.max ? Number( input.max ) : Infinity;
			const now = '' === input.value || Number.isNaN( Number( input.value ) ) ? ( min > -Infinity ? min : 0 ) - ( Number( button.dataset.rfbStep ) > 0 ? 1 : -1 ) : Number( input.value );

			input.value = String( Math.min( max, Math.max( min, now + Number( button.dataset.rfbStep ) ) ) );
			input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );
	}

	/**
	 * A phone box with a pattern (0.93.0): # is a digit, every other character is written for the visitor as the digits
	 * reach it ("(555) 123-4567"). The caret stays after the same digit; deleting a bracket or dash deletes the digit
	 * before it, so Backspace never gets stuck.
	 */
	function formatPhone( pattern, digits ) {
		let out = '';
		let next = 0;

		for ( const ch of pattern ) {
			if ( next >= digits.length ) {
				break;
			}

			out += '#' === ch ? digits[ next++ ] : ch;
		}

		return out;
	}

	function initPhone( input ) {
		const pattern = input.dataset.rfbPhone;
		const slots = ( pattern.match( /#/g ) || [] ).length;
		let deleting = false;

		input.addEventListener( 'beforeinput', ( event ) => {
			deleting = 'deleteContentBackward' === event.inputType && input.selectionStart === input.selectionEnd && input.selectionStart > 0 && /\D/.test( input.value[ input.selectionStart - 1 ] );

			if ( deleting ) {
				// Remove the digit before the bracket, space or dash instead.
				event.preventDefault();
				const before = input.value.slice( 0, input.selectionStart ).replace( /\D/g, '' ).slice( 0, -1 );
				const after = input.value.slice( input.selectionStart ).replace( /\D/g, '' );
				apply( before + after, before.length );
				input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			}
		} );

		const apply = ( digits, caretDigits ) => {
			const value = formatPhone( pattern, digits.slice( 0, slots ) );
			input.value = value;

			// Put the caret after the same number of digits as before.
			let pos = 0;
			let seen = 0;

			while ( pos < value.length && seen < caretDigits ) {
				if ( /\d/.test( value[ pos ] ) ) {
					seen++;
				}

				pos++;
			}

			if ( input.ownerDocument.activeElement === input ) {
				input.setSelectionRange( pos, pos );
			}
		};

		input.addEventListener( 'input', ( event ) => {
			if ( ! event.isTrusted && deleting ) {
				deleting = false;
				return;
			}

			const caretDigits = input.value.slice( 0, input.selectionStart ).replace( /\D/g, '' ).length;
			apply( input.value.replace( /\D/g, '' ), caretDigits );
		} );

		if ( '' !== input.value ) {
			apply( input.value.replace( /\D/g, '' ), input.value.length );
		}
	}

	/** A long text that grows with what is typed (0.93.0), up to its max-height (Style: Tallest), then scrolls. */
	function initAutogrow( box ) {
		const fit = () => {
			box.style.height = 'auto';
			const max = parseFloat( getComputedStyle( box ).maxHeight );
			const wanted = box.scrollHeight + box.offsetHeight - box.clientHeight;
			box.style.height = wanted + 'px';
			box.classList.toggle( 'is-capped', ! Number.isNaN( max ) && wanted > max );
		};

		box.addEventListener( 'input', fit );
		fit();
	}

	/**
	 * The Country field with flags (0.93.0, list 0.94.0): the chosen country's flag at the left of the box, and the list
	 * opens as one with a flag beside each country, with a search box (a native list can not show pictures). The real
	 * select stays in the form, so sending, conditions and the summary read it as before.
	 *
	 * @param {HTMLElement} holder The .rfb-flag-box with data-rfb-flags.
	 */
	function initCountry( holder ) {
		const select = holder.querySelector( 'select' );
		const flag = holder.querySelector( '.rfb-flag' );

		// A copy of a field that already had its list (the editor draws fields again): start from the plain select.
		holder.querySelectorAll( '.rfb-cp-button, .rfb-cp-pop' ).forEach( ( el ) => el.remove() );
		const base = holder.dataset.rfbFlags;
		const doc = holder.ownerDocument;
		const flagUrl = ( code ) => base + code.toLowerCase() + '.svg';
		const placeholder = select.options[ 0 ] && '' === select.options[ 0 ].value ? select.options[ 0 ].textContent : '';
		const uid = select.id + '-cp';

		const button = doc.createElement( 'button' );
		button.type = 'button';
		button.className = 'rfb-input rfb-cp-button';
		button.setAttribute( 'aria-haspopup', 'listbox' );
		button.setAttribute( 'aria-expanded', 'false' );
		button.setAttribute( 'aria-controls', uid + '-pop' );

		// The field's label and description now speak for the button.
		const label = select.id ? doc.querySelector( 'label[for="' + select.id + '"]' ) : null;

		if ( label ) {
			label.id = label.id || uid + '-label';
			button.setAttribute( 'aria-labelledby', label.id + ' ' + uid + '-text' );
			label.htmlFor = uid + '-button';
		}

		button.id = uid + '-button';
		[ 'aria-describedby', 'aria-invalid' ].forEach( ( name ) => select.hasAttribute( name ) && button.setAttribute( name, select.getAttribute( name ) ) );
		button.innerHTML = '<span class="rfb-cp-text" id="' + uid + '-text"></span>';

		const pop = doc.createElement( 'div' );
		pop.className = 'rfb-cp-pop';
		pop.id = uid + '-pop';
		pop.hidden = true;
		pop.innerHTML = '<input type="text" class="rfb-input rfb-cp-search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="' + uid + '-list"><ul class="rfb-cp-list" role="listbox" id="' + uid + '-list"></ul><p class="rfb-cp-empty" hidden></p>';

		const search = pop.querySelector( '.rfb-cp-search' );
		const list = pop.querySelector( '.rfb-cp-list' );
		const empty = pop.querySelector( '.rfb-cp-empty' );
		const i18n = holder.closest( '[data-rfb-i18n]' ) ? JSON.parse( holder.closest( '[data-rfb-i18n]' ).dataset.rfbI18n ) : {};
		search.setAttribute( 'aria-label', i18n.countrySearch || 'Search countries' );
		search.placeholder = i18n.countrySearch || 'Search countries';
		empty.textContent = i18n.countryNone || 'No country matches.';

		Array.from( select.options ).filter( ( o ) => '' !== o.value ).forEach( ( o ) => {
			const li = doc.createElement( 'li' );
			li.className = 'rfb-cp-option';
			li.id = uid + '-' + o.value;
			li.setAttribute( 'role', 'option' );
			li.dataset.value = o.value;
			li.innerHTML = '<img alt="" loading="lazy" width="22" height="16" src="' + flagUrl( o.value ) + '"><span></span>';
			li.querySelector( 'span' ).textContent = o.textContent;
			list.appendChild( li );
		} );

		select.classList.add( 'rfb-cp-native' );
		select.tabIndex = -1;
		select.setAttribute( 'aria-hidden', 'true' );
		select.after( button, pop );

		const options = () => Array.from( list.children ).filter( ( li ) => ! li.hidden );
		let active = null;

		const setActive = ( li ) => {
			list.querySelectorAll( '.is-active' ).forEach( ( el ) => el.classList.remove( 'is-active' ) );
			active = li;

			if ( li ) {
				li.classList.add( 'is-active' );
				search.setAttribute( 'aria-activedescendant', li.id );
				li.scrollIntoView( { block: 'nearest' } );
			} else {
				search.removeAttribute( 'aria-activedescendant' );
			}
		};

		const show = () => {
			const code = select.value;
			const known = /^[A-Z]{2}$/.test( code );

			button.querySelector( '.rfb-cp-text' ).textContent = known ? select.options[ select.selectedIndex ].textContent : placeholder;
			button.classList.toggle( 'is-empty', ! known );
			list.querySelectorAll( '[aria-selected]' ).forEach( ( li ) => li.removeAttribute( 'aria-selected' ) );

			if ( known && list.querySelector( '[data-value="' + code + '"]' ) ) {
				list.querySelector( '[data-value="' + code + '"]' ).setAttribute( 'aria-selected', 'true' );
			}

			if ( flag ) {
				flag.hidden = ! known;

				if ( known ) {
					flag.src = flagUrl( code );
				}
			}
		};

		const filter = () => {
			const words = search.value.trim().toLowerCase();

			Array.from( list.children ).forEach( ( li ) => {
				li.hidden = '' !== words && ! li.textContent.toLowerCase().includes( words );
			} );
			empty.hidden = options().length > 0;
			setActive( options()[ 0 ] || null );
		};

		const open = () => {
			pop.hidden = false;
			button.setAttribute( 'aria-expanded', 'true' );
			search.value = '';
			filter();
			setActive( list.querySelector( '[aria-selected="true"]' ) || options()[ 0 ] || null );
			search.focus();
		};

		const close = ( focusButton ) => {
			if ( pop.hidden ) {
				return;
			}

			pop.hidden = true;
			button.setAttribute( 'aria-expanded', 'false' );

			if ( focusButton ) {
				button.focus();
			}
		};

		const pick = ( li ) => {
			if ( ! li ) {
				return;
			}

			select.value = li.dataset.value;
			select.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
			close( true );
		};

		button.addEventListener( 'click', () => ( pop.hidden ? open() : close( true ) ) );
		button.addEventListener( 'keydown', ( event ) => {
			if ( [ 'ArrowDown', 'ArrowUp', 'Enter', ' ' ].includes( event.key ) ) {
				event.preventDefault();
				open();
			}
		} );
		search.addEventListener( 'input', filter );
		search.addEventListener( 'keydown', ( event ) => {
			const all = options();
			const at = all.indexOf( active );

			if ( 'ArrowDown' === event.key || 'ArrowUp' === event.key ) {
				event.preventDefault();
				setActive( all[ Math.max( 0, Math.min( all.length - 1, at + ( 'ArrowDown' === event.key ? 1 : -1 ) ) ) ] || null );
			} else if ( 'Enter' === event.key ) {
				event.preventDefault();
				pick( active );
			} else if ( 'Escape' === event.key ) {
				event.preventDefault();
				close( true );
			} else if ( 'Tab' === event.key ) {
				close( false );
			}
		} );
		list.addEventListener( 'click', ( event ) => pick( event.target.closest( '.rfb-cp-option' ) ) );
		list.addEventListener( 'mousemove', ( event ) => {
			const li = event.target.closest( '.rfb-cp-option' );

			if ( li && li !== active ) {
				setActive( li );
			}
		} );
		doc.addEventListener( 'pointerdown', ( event ) => {
			if ( ! holder.contains( event.target ) ) {
				close( false );
			}
		} );
		// A required country left empty: the browser's message points at the button.
		select.addEventListener( 'invalid', () => button.focus() );
		select.addEventListener( 'change', show );
		show();
	}

	/**
	 * The form's own calendar and clock for a date, time or date and time box (0.95.0, bundled flatpickr). The box the
	 * visitor sees shows a friendly date ("14 November 2026"); the real input keeps the browser format, so sending, totals
	 * and the summary read it as before. Days the form is closed and times outside its hours can not be picked. Without
	 * flatpickr (a script blocked or late) the browser's own picker stays.
	 *
	 * @param {HTMLInputElement} input The date, time or datetime-local input with data-rfb-picker.
	 */
	function initPicker( input ) {
		const view = input.ownerDocument.defaultView;

		if ( ! view.flatpickr ) {
			// Not loaded yet (a late or deferred script, or the editor fetching it for a field just added): try again for
			// a few seconds, then leave the browser's own picker.
			input.rfbPickerTries = ( input.rfbPickerTries || 0 ) + 1;

			if ( input.rfbPickerTries <= 50 ) {
				view.setTimeout( () => initPicker( input ), 200 );
			}

			return;
		}

		if ( input._flatpickr ) {
			return;
		}

		// The editor builds a field's HTML in its own window and moves it into the preview: flatpickr there skips an
		// element of another window without a word. A copy made by the preview's document belongs to the preview.
		if ( ! ( input instanceof view.HTMLElement ) ) {
			const copy = input.ownerDocument.importNode( input, true );

			copy.rfbEnhanced = true;
			input.replaceWith( copy );
			input = copy;
		}

		const kind = input.dataset.rfbPicker;

		// A copy of a field that already had its calendar: drop the copied visible box and give the input its type back.
		if ( 'hidden' === input.type ) {
			const copied = input.nextElementSibling;

			if ( copied && copied.classList.contains( 'flatpickr-input' ) ) {
				copied.remove();
			}

			input.type = input.dataset.rfbCalendar ? 'text' : { date: 'date', time: 'time', datetime: 'datetime-local' }[ kind ] || 'date';
		}
		const form = input.closest( '[data-rfb-i18n]' );
		const i18n = form ? JSON.parse( form.dataset.rfbI18n ) : {};
		const closed = ( input.dataset.rfbClosed || '' ).split( ',' ).filter( ( d ) => '' !== d ).map( Number );
		const hours = ( input.dataset.rfbHours || '' ).split( '-' );
		const step = Number( input.getAttribute( 'step' ) ) || 0;
		// Opening hours (a time or a date and time), else a time box's own earliest and latest.
		let firstTime = 'time' === kind && input.min ? input.min : null;
		let lastTime = 'time' === kind && input.max ? input.max : null;

		if ( 2 === hours.length ) {
			[ firstTime, lastTime ] = hours;
		}

		// The booking calendar (0.96.0): a stay, a flight (one way or return), several days, or one day.
		const calendar = input.dataset.rfbCalendar || 'single';
		const unavailable = input.dataset.rfbUnavailable ? JSON.parse( input.dataset.rfbUnavailable ) : [];
		const [ minNights, maxNights ] = ( input.dataset.rfbNights || '0,0' ).split( ',' ).map( Number );
		const maxPicks = Number( input.dataset.rfbPicks ) || 0;
		const ymd = ( d ) => `${ d.getFullYear() }-${ String( d.getMonth() + 1 ).padStart( 2, '0' ) }-${ String( d.getDate() ).padStart( 2, '0' ) }`;
		const isUnavailable = ( day ) => unavailable.some( ( [ from, to ] ) => day >= from && day <= to );
		const isRange = 'range' === calendar || 'flight' === calendar;
		const nextDay = ( day ) => ymd( new Date( Date.parse( day + 'T12:00:00Z' ) + 86400000 ) );
		let picker = null;

		// Whether a day can be clicked now: closed weekdays and unavailable dates never; for a stay's check-out, only days
		// that keep to the nights and whose nights are all free (the check-out morning itself may be unavailable).
		const blocked = ( date ) => {
			if ( closed.includes( date.getDay() ) ) {
				return true;
			}

			const day = ymd( date );
			const picked = picker ? picker.selectedDates : [];

			if ( 'range' === calendar && 1 === picked.length ) {
				const anchor = ymd( picked[ 0 ] );
				const [ from, to ] = day < anchor ? [ day, anchor ] : [ anchor, day ];
				const nights = nightsBetween( from, to );

				if ( 0 === nights ) {
					return false;
				}

				if ( nights < Math.max( 1, minNights ) || ( maxNights > 0 && nights > maxNights ) ) {
					return true;
				}

				for ( let night = from; night < to; night = nextDay( night ) ) {
					if ( isUnavailable( night ) ) {
						return true;
					}
				}

				return false;
			}

			if ( 'multiple' === calendar && maxPicks > 0 && picked.length >= maxPicks && ! picked.some( ( p ) => ymd( p ) === day ) ) {
				return true;
			}

			// A picked check-out day stays picked, even on an unavailable date (no night is spent there).
			if ( 'range' === calendar && picked.some( ( p ) => ymd( p ) === day ) ) {
				return false;
			}

			return isUnavailable( day );
		};

		// A line under the calendar: the nights of a stay, one way or return, how many days.
		const summary = () => {
			const picked = picker ? picker.selectedDates.map( ymd ).sort() : [];
			let text = '';

			if ( 'range' === calendar ) {
				if ( 1 === picked.length ) {
					text = i18n.pickerCheckout || 'Now choose the check-out day';
				} else if ( 2 === picked.length ) {
					const nights = nightsBetween( picked[ 0 ], picked[ 1 ] );
					text = 1 === nights ? ( i18n.pickerNight || '1 night' ) : sprintf( i18n.pickerNights || '%d nights', nights );
				}
			} else if ( 'flight' === calendar ) {
				if ( 1 === picked.length ) {
					text = i18n.pickerOneWay || 'One way (choose a return day, or not)';
				} else if ( 2 === picked.length ) {
					text = sprintf( i18n.pickerReturn || 'Return, %d days away', nightsBetween( picked[ 0 ], picked[ 1 ] ) );
				}
			} else if ( 'multiple' === calendar && picked.length ) {
				text = maxPicks ? sprintf( i18n.pickerPicksOf || '%1$d of %2$d days', picked.length, maxPicks ) : sprintf( i18n.pickerPicks || '%d days', picked.length );
			}

			return text;
		};

		const formats = {
			date: 'single' === calendar ? { dateFormat: 'Y-m-d', altFormat: 'j F Y' } : { dateFormat: 'Y-m-d', altFormat: 'j M Y' },
			time: { dateFormat: 'H:i', altFormat: 'H:i', enableTime: true, noCalendar: true },
			datetime: { dateFormat: 'Y-m-d\\TH:i', altFormat: 'j F Y, H:i', enableTime: true },
		};
		const config = {
			...( formats[ kind ] || formats.date ),
			altInput: true,
			altInputClass: input.className,
			allowInput: true,
			disableMobile: true,
			time_24hr: true,
			monthSelectorType: 'static',
			minDate: 'time' === kind ? null : input.min || null,
			maxDate: 'time' === kind ? null : input.max || null,
			minTime: firstTime,
			maxTime: lastTime,
			minuteIncrement: step >= 60 ? Math.round( step / 60 ) : 5,
			// A stay or a flight: flatpickr will not let a range cross a disabled day, so its days are greyed out as they
			// are drawn instead (it still will not pick them) and a stay can run over a closed weekday's night.
			disable: ! isRange && ( closed.length || unavailable.length || 'single' !== calendar ) ? [ blocked ] : [],
			onDayCreate( selected, value, instance, dayElem ) {
				if ( isRange && dayElem.dateObj && blocked( dayElem.dateObj ) ) {
					dayElem.classList.add( 'flatpickr-disabled' );
				}
			},
			mode: { range: 'range', flight: 'range', multiple: 'multiple' }[ calendar ] || 'single',
			conjunction: ', ',
			locale: { rangeSeparator: ' to ' },
			closeOnSelect: 'multiple' !== calendar,
			showMonths: ( 'range' === calendar || 'flight' === calendar ) && view.innerWidth >= 720 ? 2 : 1,
			inline: input.hasAttribute( 'data-rfb-inline' ),
			onClose( selected, value, instance ) {
				// Clicking away clears a range with one day; for a flight that day is a one-way trip: put it back.
				if ( 'flight' === calendar && 1 === selected.length ) {
					const departure = selected[ 0 ];

					view.setTimeout( () => {
						if ( 0 === instance.selectedDates.length ) {
							instance.setDate( departure, true );
						}
					}, 0 );
				}
			},
			onChange( selected, value, instance ) {
				// The choice changes which days can be clicked next (a stay's nights, the most days).
				instance.redraw();
				const line = instance.calendarContainer.querySelector( '.rfb-fp-summary' );

				if ( line ) {
					line.textContent = summary();
				}

				// A stay needs its check-out day: say so on the box until it has one.
				if ( 'range' === calendar && instance.altInput ) {
					instance.altInput.setCustomValidity( 1 === selected.length ? ( i18n.pickerCheckout || 'Now choose the check-out day' ) : '' );
				}
			},
			onReady( selected, value, instance ) {
				const box = instance.calendarContainer;
				const styles = view.getComputedStyle( input );

				box.classList.add( 'rfb-fp' );

				// The calendar opens outside the form: it takes the form's colors and font with it.
				[ '--rfb-primary', '--rfb-radius', '--rfb-font', '--rfb-ink', '--rfb-muted', '--rfb-form-bg', '--rfb-button-text' ].forEach( ( name ) => {
					const color = styles.getPropertyValue( name ).trim();

					if ( color ) {
						box.style.setProperty( name, color );
					}
				} );

				// Clear and Today (Now for a time), like the browser's own picker.
				picker = instance;
				const foot = input.ownerDocument.createElement( 'div' );
				foot.className = 'rfb-fp-foot';
				foot.innerHTML = '<button type="button" class="rfb-fp-clear"></button><span class="rfb-fp-summary" aria-live="polite"></span><button type="button" class="rfb-fp-today"></button>';
				foot.querySelector( '.rfb-fp-summary' ).textContent = summary();
				foot.querySelector( '.rfb-fp-clear' ).textContent = i18n.pickerClear || 'Clear';
				foot.querySelector( '.rfb-fp-today' ).textContent = 'time' === kind ? ( i18n.pickerNow || 'Now' ) : ( i18n.pickerToday || 'Today' );
				foot.addEventListener( 'click', ( event ) => {
					if ( event.target.closest( '.rfb-fp-clear' ) ) {
						picker.clear();
						picker.close();
					} else if ( event.target.closest( '.rfb-fp-today' ) ) {
						const now = new Date();

						if ( 'time' === kind || picker.isEnabled( now ) ) {
							picker.setDate( now, true );
						} else {
							picker.jumpToDate( now );
						}
					}
				} );
				box.appendChild( foot );

				if ( picker.altInput ) {
					// The visible box speaks for the field: its label, description and the browser's checks.
					picker.altInput.id = input.id + '-shown';
					[ 'aria-describedby', 'aria-invalid' ].forEach( ( name ) => input.hasAttribute( name ) && picker.altInput.setAttribute( name, input.getAttribute( name ) ) );
					const label = input.id ? input.ownerDocument.querySelector( 'label[for="' + input.id + '"]' ) : null;

					if ( label ) {
						label.htmlFor = picker.altInput.id;
					}
				}
			},
		};

		view.flatpickr( input, config );
	}

	/**
	 * What each field box adds by itself (0.93.0 / 0.94.0): phone patterns, growing long texts, the country list with
	 * flags. Run for each form, and in the editor's preview for each field as it is drawn. Safe to run twice.
	 *
	 * @param {HTMLElement} root A form, or a field widget in the editor.
	 */
	function enhance( root ) {
		// Marked on the element object, not as an attribute: the editor can draw a field again from a copy of its HTML,
		// and a copy must be set up again.
		const once = ( el ) => ! el.rfbEnhanced && ( el.rfbEnhanced = true );

		root.querySelectorAll( 'input[data-rfb-phone]' ).forEach( ( el ) => once( el ) && initPhone( el ) );
		root.querySelectorAll( 'textarea[data-rfb-autogrow]' ).forEach( ( el ) => once( el ) && initAutogrow( el ) );
		root.querySelectorAll( '[data-rfb-flags]' ).forEach( ( el ) => once( el ) && initCountry( el ) );
		root.querySelectorAll( 'input[data-rfb-picker]' ).forEach( ( el ) => once( el ) && initPicker( el ) );
	}

	/** Closed weekdays and opening hours of a date or time box (min, max and step are the browser's own). */
	function initWhen( input, form ) {
		const i18n = form.dataset.rfbI18n ? JSON.parse( form.dataset.rfbI18n ) : {};
		const closed = ( input.dataset.rfbClosed || '' ).split( ',' ).filter( ( d ) => '' !== d ).map( Number );
		const hours = ( input.dataset.rfbHours || '' ).split( '-' );
		const check = () => {
			const value = input.value;
			let message = '';

			if ( value && closed.length && /^\d{4}-\d{2}-\d{2}/.test( value ) ) {
				const day = new Date( value.slice( 0, 10 ) + 'T12:00:00Z' ).getUTCDay();

				message = closed.includes( day ) ? ( i18n.closedDay || 'That day is not available.' ) : '';
			}

			const time = 'time' === input.type || 'time' === input.dataset.rfbPicker ? value : value.slice( 11, 16 );

			if ( ! message && time && 2 === hours.length && ( time < hours[ 0 ] || time > hours[ 1 ] ) ) {
				message = sprintf( i18n.hours || 'Choose a time between %1$s and %2$s.', hours[ 0 ], hours[ 1 ] );
			}

			input.setCustomValidity( message );
		};

		input.addEventListener( 'input', check );
		input.addEventListener( 'change', check );
		check();
	}

	// ---------------------------------------------------------------- page caches

	/**
	 * A page cache (LiteSpeed and the like) can serve the form for days, while its security token lasts a day: when the
	 * page is older than a few minutes, swap in a fresh token before the visitor sends it. The submit waits for it.
	 *
	 * @param {Element} form
	 */
	function refreshToken( form ) {
		const url = form.dataset.rfbTokenUrl;
		const issued = Number( form.dataset.rfbIssued ) || 0;

		if ( ! url || ! window.fetch || Math.abs( ( Date.now() / 1000 ) - issued ) < 300 ) {
			return;
		}

		form.rfbTokenReady = window.fetch( url, { credentials: 'same-origin', cache: 'no-store' } )
			.then( ( response ) => response.json() )
			.then( ( body ) => {
				if ( body && body.success && body.data ) {
					const nonce = form.querySelector( 'input[name="_rfb_nonce"]' );
					const time = form.querySelector( 'input[name="rfb_t"]' );

					if ( nonce ) {
						nonce.value = body.data.nonce;
					}

					if ( time ) {
						time.value = body.data.t;
					}

					form.dataset.rfbIssued = String( body.data.issued );
				}
			} )
			.catch( () => {} )
			.then( () => {
				form.rfbTokenReady = null;
			} );

		// Sent before the fresh token arrived: wait for it, then send.
		form.addEventListener( 'submit', ( event ) => {
			if ( form.rfbTokenReady && ! event.defaultPrevented ) {
				event.preventDefault();
				form.rfbTokenReady.then( () => form.requestSubmit ? form.requestSubmit( event.submitter || undefined ) : form.submit() );
			}
		} );
	}

	// ---------------------------------------------------------------- boot

	function init( form ) {
		if ( form.rfbReady ) {
			return;
		}

		form.rfbReady = true;
		refreshToken( form );
		form.querySelectorAll( '.rfb-repeater' ).forEach( ( repeater ) => initRepeater( repeater, form ) );
		form.querySelectorAll( 'input[type=file][data-rfb-max-size]' ).forEach( initFile );
		form.querySelectorAll( '[data-rfb-signature]' ).forEach( initSignature );
		form.querySelectorAll( 'input[data-rfb-amount]' ).forEach( ( input ) => initAmount( input, form ) );
		form.querySelectorAll( '[data-rfb-accordion]' ).forEach( initAccordion );
		form.querySelectorAll( '[data-rfb-tabs]' ).forEach( initTabs );
		form.querySelectorAll( '.rfb-cards' ).forEach( initCards );
		form.querySelectorAll( '[data-rfb-count]' ).forEach( initStepper );
		enhance( form );
		form.querySelectorAll( 'input[data-rfb-closed], input[data-rfb-hours]' ).forEach( ( input ) => initWhen( input, form ) );

		const update = () => {
			applyConditions( form );
			applyTotals( form );
			applySummary( form );
		};

		form.addEventListener( 'input', update );
		form.addEventListener( 'change', update );
		form.rfbUpdate = update;
		update();
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

	const boot = () => {
		document.querySelectorAll( '[data-rfb-form]' ).forEach( init );
		// The editor's preview draws fields one widget at a time and outside a form: enhance each as it is drawn.
		document.querySelectorAll( '.rfb-field' ).forEach( ( field ) => enhance( field ) );
	};

	const editorHooks = () => {
		const hooks = window.refractionFrontend && window.refractionFrontend.hooks;

		if ( hooks && window.refractionFrontend.isEditMode && window.refractionFrontend.isEditMode() ) {
			hooks.addAction( 'frontend/element_ready/global', ( $scope ) => $scope[ 0 ] && enhance( $scope[ 0 ] ) );
		}
	};

	if ( window.refractionFrontend && window.refractionFrontend.hooks ) {
		editorHooks();
	} else {
		window.addEventListener( 'refraction/frontend/init', editorHooks );
	}

	// Optimisation plugins can load this script after the page is ready (deferred or delayed scripts).
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
}() );
