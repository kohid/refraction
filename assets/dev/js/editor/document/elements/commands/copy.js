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
		} ).map( ( container ) => container.model.toJSON( { copyHtmlCache: true } ) );

		const storageData = {
			type: 'refraction',
			siteurl: refractionCommon.config.urls.rest,
			elements: elementsData,
		};

		refractionCommon.storage.set(
			storageKey,
			storageData,
		);

		// TODO: Use package for clipboard saving
		const clipboard = document.createElement( 'textarea' );
		clipboard.value = JSON.stringify( storageData );
		document.body.appendChild( clipboard );
		clipboard.select();
		document.execCommand( 'copy' );
		document.body.removeChild( clipboard );
	}
}

export default Copy;
