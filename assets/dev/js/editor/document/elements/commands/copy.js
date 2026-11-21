export class Copy extends $e.modules.editor.CommandContainerBase {
	validateArgs( args ) {
		this.requireContainer( args );
	}

	apply( args ) {
		const { storageKey = 'clipboard', containers = [ args.container ] } = args;

		if ( ! refraction.selection.isSameType() ) {
			refraction.notifications.showToast( {
				message: __( 'That didn’t work. Try copying one kind of element at a time.', 'refraction' ),
				buttons: [
					{
						name: 'got_it',
						text: __( 'Got it', 'refraction' ),
					},
				],
			} );

			return false;
		}

		const elements = refraction.getPreviewView().$el.find( '.refraction-element' );

		const elementsData = containers.sort( ( first, second ) => {
			return elements.index( first.view.el ) - elements.index( second.view.el );
		} ).map( ( container ) => this.elementData( container ) );

		const storageData = {
			type: 'refraction',
			siteurl: refractionCommon.config.urls.rest,
			elements: elementsData,
		};

		try {
			refractionCommon.storage.set(
				storageKey,
				storageData,
			);
		} catch ( e ) {
			// The browser's storage is full: say so, rather than leave an older copy to be pasted.
			try {
				refractionCommon.storage.set( storageKey, null );
			} catch ( ignore ) {}

			refraction.notifications.showToast( {
				message: __( 'This is too big to copy here. Save it as a template and insert it instead.', 'refraction' ),
			} );

			return false;
		}

		// TODO: Use package for clipboard saving
		const clipboard = document.createElement( 'textarea' );
		clipboard.value = JSON.stringify( storageData );
		document.body.appendChild( clipboard );
		clipboard.select();
		document.execCommand( 'copy' );
		document.body.removeChild( clipboard );
	}
	/**
	 * What is copied of an element. Its children are copied as a save stores them (without the values that are the
	 * defaults: the paste fills them in again), else a widget holding containers (tabs, carousels, Focus Stack,
	 * Showcase Wheel...) came to millions of characters with every view's settings and did not fit the browser's
	 * storage, so Copy did nothing. The element's own settings stay whole, for Paste Style.
	 *
	 * @param {Container} container
	 */
	elementData( container ) {
		const data = container.model.toJSON( { copyHtmlCache: true, remove: [ 'default', 'editSettings', 'defaultEditSettings' ] } );

		data.settings = container.settings.toJSON();

		return data;
	}
}

export default Copy;
