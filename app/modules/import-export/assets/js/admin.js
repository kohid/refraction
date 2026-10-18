class Admin {
	/**
	 * Session Storage Key
	 *
	 * @type {string}
	 */
	KIT_DATA_KEY = 'refraction-kit-data';

	/**
	 * Contains the ID of the referrer Kit and the name of the Kit to remove. Stored in session storage.
	 *
	 * @type {Object}
	 */
	cachedKitData;

	/**
	 * The 'Remove Kit' revert button
	 *
	 * @type {Element}
	 */
	revertButton;

	/**
	 * Name of the kit currently active (last imported)
	 *
	 * @type {string}
	 */
	activeKitName;

	constructor() {
		this.activeKitName = this.getActiveKitName();
		this.revertButton = document.getElementById( 'refraction-import-export__revert_kit' );

		if ( this.revertButton ) {
			this.revertButton.addEventListener( 'click', this.onRevertButtonClick.bind( this ) );
			this.maybeAddRevertBtnMargin();
			this.maybeScrollToRevertButton();
		}

		this.maybeShowReferrerKitDialog();
	}

	shouldScrollToRevert() {
		const urlParams = new URLSearchParams( window.location.search );

		return !! urlParams.get( 'scroll_to_revert' );
	}

	maybeAddRevertBtnMargin() {
		if ( ! this.shouldScrollToRevert() ) {
			return;
		}

		this.revertButton.style.marginBottom = this.calculateMargin();
	}

	maybeScrollToRevertButton() {
		if ( ! this.shouldScrollToRevert() ) {
			return;
		}

		this.scrollToBottom();
	}

	/**
	 * CalculateMargin
	 *
	 * @return {string}
	 */
	calculateMargin() {
		const adminBar = document.getElementById( 'wpadminbar' );
		const adminBarHeight = adminBar ? adminBar.offsetHeight : 0;

		const revertKitHeight = this.revertButton.parentElement.offsetHeight;

		return (
			document.body.clientHeight -
			adminBarHeight -
			revertKitHeight -
			document.getElementById( 'wpfooter' ).offsetHeight -
			15 // Extra margin at the top
		) + 'px';
	}

	/**
	 * Scroll to the bottom of the page
	 */
	scrollToBottom() {
		setTimeout( () => {
			window.scrollTo( 0, document.body.scrollHeight );
		} );
	}

	/**
	 * RevertBtnOnClick
	 *
	 * @param {Event} event
	 */
	onRevertButtonClick( event ) {
		event.preventDefault();

		refractionCommon.dialogsManager.createWidget( 'confirm', {
			headerMessage: __( 'Are you sure?', 'refraction' ),
			// Translators: %s is the name of the active Kit
			message: __( 'Removing %s will permanently delete changes made to the Websites Template\'s content and site settings', 'refraction' ).replace( '%s', this.activeKitName ),
			strings: {
				confirm: __( 'Delete', 'refraction' ),
				cancel: __( 'Cancel', 'refraction' ),
			},
			onConfirm: () => this.onRevertConfirm(),
		} ).show();
	}

	onRevertConfirm() {
		const referrerKitId = new URLSearchParams( this.revertButton.href ).get( 'referrer_kit' );

		this.saveToCache( referrerKitId ?? '' );

		location.href = this.revertButton.href;
	}

	maybeShowReferrerKitDialog() {
		const { referrerKitId } = this.getDataFromCache();
		if ( undefined === referrerKitId ) {
			return;
		}

		if ( 0 === referrerKitId.length ) {
			this.createKitDeletedWidget( {
				message: __( 'Try a different Website Template or build your site from scratch.', 'refraction' ),
				strings: {
					confirm: __( 'OK', 'refraction' ),
					cancel: __( 'Library', 'refraction' ),
				},
				onCancel: () => {
					location.href = refractionImportExport.appUrl;
				},
			} );
			this.clearCache();

			return;
		}

		this.createKitDeletedWidget( {
			message: __( 'You\'re ready to apply a new Kit!', 'refraction' ),
			strings: {
				confirm: __( 'Continue to new Kit', 'refraction' ),
				cancel: __( 'Close', 'refraction' ),
			},
			onConfirm: () => {
				location.href = refractionImportExport.appUrl + '/preview/' + referrerKitId;
			},
		} );
		this.clearCache();
	}

	/**
	 * CreateKitDeletedWidget
	 *
	 * @param {Object} options
	 */
	createKitDeletedWidget( options ) {
		const { activeKitName } = this.getDataFromCache();

		refractionCommon.dialogsManager.createWidget( 'confirm', {
			id: 'e-revert-kit-deleted-dialog',
			// Translators: %s is the name of the active Kit
			headerMessage: __( '%s was successfully deleted', 'refraction' ).replace( '%s', activeKitName ),
			message: options.message,
			strings: {
				confirm: options.strings.confirm,
				cancel: options.strings.cancel,
			},
			onConfirm: options.onConfirm,
			onCancel: options.onCancel,
		} ).show();
	}

	/**
	 * Retrieving the last imported kit from the refractionAppConfig global
	 *
	 * @return {string}
	 */
	getActiveKitName() {
		const lastKit = refractionImportExport.lastImportedSession;

		if ( lastKit.kit_title ) {
			return lastKit.kit_title;
		}

		if ( lastKit.kit_name ) {
			return this.convertNameToTitle( lastKit.kit_name );
		}

		return __( 'Your Kit', 'refraction' );
	}

	/**
	 * ConvertNameToTitle
	 *
	 * @param {string} name
	 *
	 * @return {string}
	 */
	convertNameToTitle( name ) {
		return name
			.split( /[-_]+/ )
			.map( ( word ) => word[ 0 ].toUpperCase() + word.substring( 1 ) )
			.join( ' ' );
	}

	saveToCache( referrerKitId ) {
		sessionStorage.setItem(
			this.KIT_DATA_KEY,
			JSON.stringify( {
				referrerKitId,
				activeKitName: this.activeKitName,
			} ),
		);
	}

	getDataFromCache() {
		if ( this.cachedKitData ) {
			return this.cachedKitData;
		}

		try {
			this.cachedKitData = JSON.parse( sessionStorage.getItem( this.KIT_DATA_KEY ) );
		} catch ( e ) {
			return {};
		}

		return this.cachedKitData ?? {};
	}

	clearCache() {
		sessionStorage.removeItem( this.KIT_DATA_KEY );
	}
}

window.addEventListener( 'load', () => {
	new Admin();
} );
