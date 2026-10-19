/**
 * Code Highlight: the copy button. The highlighting itself is printed by the server.
 */
export default class CodeHighlight extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return { selectors: { button: '.refraction-code__copy', code: '.refraction-code__pre code', status: '.refraction-code__status' } };
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$button: this.$element.find( selectors.button ),
			$code: this.$element.find( selectors.code ),
			$status: this.$element.find( selectors.status ),
		};
	}

	getText() {
		return Array.from( this.elements.$code.find( '.refraction-code__line' ) )
			.map( ( line ) => line.textContent.replace( /​/g, '' ) )
			.join( '\n' );
	}

	async copy( text ) {
		if ( navigator.clipboard && window.isSecureContext ) {
			await navigator.clipboard.writeText( text );
			return;
		}

		const area = document.createElement( 'textarea' );

		area.value = text;
		area.setAttribute( 'readonly', '' );
		area.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
		document.body.appendChild( area );
		area.select();

		try {
			if ( ! document.execCommand( 'copy' ) ) {
				throw new Error( 'copy failed' );
			}
		} finally {
			document.body.removeChild( area );
		}
	}

	bindEvents() {
		this.elements.$button.on( 'click', async () => {
			const button = this.elements.$button[ 0 ],
				original = button.dataset.original || button.textContent;

			button.dataset.original = original;

			try {
				await this.copy( this.getText() );
				button.textContent = button.dataset.copied || original;
				this.elements.$status.text( button.dataset.copied || '' );
			} catch ( e ) {
				return;
			}

			clearTimeout( this.timer );
			this.timer = setTimeout( () => {
				button.textContent = original;
				this.elements.$status.text( '' );
			}, 2000 );
		} );
	}

	unbindEvents() {
		this.elements.$button.off();
		clearTimeout( this.timer );
	}
}
