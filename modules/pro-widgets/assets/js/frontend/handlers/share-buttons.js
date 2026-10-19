/**
 * Share Buttons: the network links need no script. This handler only powers the two actions that have no
 * URL of their own: copy link and print.
 */
export default class ShareButtons extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.refraction-share',
				action: '.refraction-share__button[data-action]',
				status: '.refraction-share__status',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$root: this.$element.find( selectors.root ),
			$actions: this.$element.find( selectors.action ),
			$status: this.$element.find( selectors.status ),
		};
	}

	bindEvents() {
		this.elements.$actions.on( 'click', this.onAction.bind( this ) );
	}

	onDestroy() {
		super.onDestroy();
		window.clearTimeout( this.resetTimer );
	}

	onAction( event ) {
		const button = event.currentTarget,
			action = button.dataset.action;

		if ( 'print' === action ) {
			window.print();
		} else if ( 'copy' === action ) {
			this.copy( button, button.dataset.url || window.location.href );
		}
	}

	copy( button, text ) {
		const done = ( ok ) => this.announce( button, ok );

		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			navigator.clipboard.writeText( text ).then( () => done( true ), () => done( this.legacyCopy( text ) ) );
		} else {
			done( this.legacyCopy( text ) );
		}
	}

	/** Fallback for old browsers or non-secure pages: a hidden textarea and execCommand. */
	legacyCopy( text ) {
		const area = document.createElement( 'textarea' );

		area.value = text;
		area.setAttribute( 'readonly', '' );
		area.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
		document.body.appendChild( area );
		area.select();

		let ok = false;

		try {
			ok = document.execCommand( 'copy' );
		} catch ( e ) {
			ok = false;
		}

		document.body.removeChild( area );

		return ok;
	}

	announce( button, ok ) {
		const status = this.elements.$status[ 0 ];

		if ( status ) {
			status.textContent = ok ? status.dataset.copied : status.dataset.failed;
		}

		button.classList.toggle( 'is-copied', ok );
		window.clearTimeout( this.resetTimer );
		this.resetTimer = window.setTimeout( () => {
			button.classList.remove( 'is-copied' );

			if ( status ) {
				status.textContent = '';
			}
		}, 2500 );
	}
}
