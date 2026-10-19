/**
 * Refraction UI themes: the Settings > Theme picker.
 *
 * A radiogroup of cards: arrow keys move and select (roving tabindex), Space/Enter select the focused card.
 * Choosing applies at once (data-refraction-theme on <html>, removed for Automatic) and then saves to the
 * user's account through admin-ajax (nonce + capability checked on the server). A failed save puts the
 * previous theme back. Config arrives as the localized object `refractionUiTheme`; no inline script.
 */
( function () {
	'use strict';

	var config = window.refractionUiTheme;
	var group = document.querySelector( '#refraction-ui-theme [role="radiogroup"]' );

	if ( ! config || ! group ) {
		return;
	}

	var root = document.documentElement;
	var cards = Array.prototype.slice.call( group.querySelectorAll( '[role="radio"]' ) );
	var status = document.getElementById( 'refraction-ui-theme-status' );
	var saved = currentFromCards();
	var timer = 0;

	function currentFromCards() {
		for ( var i = 0; i < cards.length; i++ ) {
			if ( 'true' === cards[ i ].getAttribute( 'aria-checked' ) ) {
				return cards[ i ].getAttribute( 'data-theme' );
			}
		}
		return config.current || 'auto';
	}

	function paint( theme ) {
		root.classList.add( 'refraction-theming' );
		window.clearTimeout( timer );
		timer = window.setTimeout( function () {
			root.classList.remove( 'refraction-theming' );
		}, 400 );

		if ( 'auto' === theme ) {
			root.removeAttribute( 'data-refraction-theme' );
		} else {
			root.setAttribute( 'data-refraction-theme', theme );
		}
	}

	function mark( theme ) {
		cards.forEach( function ( card ) {
			var on = card.getAttribute( 'data-theme' ) === theme;
			card.setAttribute( 'aria-checked', on ? 'true' : 'false' );
			card.tabIndex = on ? 0 : -1;
		} );
	}

	function say( text, isError ) {
		if ( ! status ) {
			return;
		}
		status.textContent = text;
		status.classList.toggle( 'is-error', !! isError );
	}

	function persist( theme ) {
		var body = new URLSearchParams();
		body.set( 'action', config.action );
		body.set( 'nonce', config.nonce );
		body.set( 'theme', theme );

		say( config.i18n.saving, false );

		return window.fetch( config.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: body } )
			.then( function ( response ) {
				return response.json();
			} )
			.then( function ( json ) {
				if ( ! json || ! json.success ) {
					throw new Error( 'rejected' );
				}
				saved = theme;
				say( config.i18n.saved, false );
			} );
	}

	function choose( theme ) {
		if ( theme === currentFromCards() ) {
			return;
		}

		var previous = saved;

		mark( theme );
		paint( theme );

		persist( theme ).catch( function () {
			mark( previous );
			paint( previous );
			say( config.i18n.error, true );
		} );
	}

	group.addEventListener( 'click', function ( event ) {
		var card = event.target.closest( '[role="radio"]' );

		if ( card && group.contains( card ) ) {
			choose( card.getAttribute( 'data-theme' ) );
		}
	} );

	group.addEventListener( 'keydown', function ( event ) {
		var index = cards.indexOf( document.activeElement );
		var next = -1;

		if ( index < 0 ) {
			return;
		}

		switch ( event.key ) {
			case 'ArrowRight':
			case 'ArrowDown':
				next = ( index + 1 ) % cards.length;
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				next = ( index - 1 + cards.length ) % cards.length;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = cards.length - 1;
				break;
			case ' ':
			case 'Enter':
				event.preventDefault();
				choose( cards[ index ].getAttribute( 'data-theme' ) );
				return;
			default:
				return;
		}

		event.preventDefault();
		cards[ next ].focus();
		choose( cards[ next ].getAttribute( 'data-theme' ) );
	} );
}() );
