export function showGlobalStylesDialog() {
	return new Promise( ( resolve, reject ) => {
		let settled = false;

		const dialog = refractionCommon.dialogsManager.createWidget( 'lightbox', {
			id: 'refraction-global-styles-dialog',
			headerMessage: '',
			message: wp.template( 'refraction-global-styles-dialog' )(),
			position: {
				my: 'center',
				at: 'center',
			},
			hide: {
				onBackgroundClick: false,
			},
			onShow: () => {
				setupDialogEventListeners( dialog, ( payload ) => {
					if ( settled ) {
						return;
					}

					settled = true;
					resolve( payload );
					dialog.hide();
				}, ( error ) => {
					if ( settled ) {
						return;
					}

					settled = true;
					reject( error );
					dialog.hide();
				} );
			},
			onHide: () => {
				if ( settled ) {
					return;
				}

				settled = true;
				reject( new Error( 'Dialog closed' ) );
			},
		} );

		dialog.show();
	} );
}

function setupDialogEventListeners( dialog, resolve, reject ) {
	const $content = dialog.getElements( 'message' );
	const $matchRadio = $content.find( '#refraction-global-styles-match' );
	const $keepRadio = $content.find( '#refraction-global-styles-keep' );
	const $createCheckbox = $content.find( '#refraction-global-styles-create' );
	const $checkboxContainer = $content.find( '.refraction-global-styles-dialog__checkbox-container' );
	const $insertBtn = $content.find( '#refraction-global-styles-insert' );
	const $cancelBtn = $content.find( '#refraction-global-styles-cancel' );

	$matchRadio.off( '.refractionGlobalStyles' ).on( 'change.refractionGlobalStyles', () => {
		$checkboxContainer.hide();
	} );

	$keepRadio.off( '.refractionGlobalStyles' ).on( 'change.refractionGlobalStyles', () => {
		$checkboxContainer.show();
	} );

	$insertBtn.off( '.refractionGlobalStyles' ).on( 'click.refractionGlobalStyles', () => {
		let mode;

		if ( $matchRadio.is( ':checked' ) ) {
			mode = 'match_site';
		} else if ( $createCheckbox.is( ':checked' ) ) {
			mode = 'keep_create';
		} else {
			mode = 'keep_flatten';
		}

		resolve( { mode } );
	} );

	$cancelBtn.off( '.refractionGlobalStyles' ).on( 'click.refractionGlobalStyles', () => {
		reject( new Error( 'User cancelled' ) );
	} );
}

export default showGlobalStylesDialog;
