export default class Heartbeat {
	modal = null;
	externalChangeModal = null;
	document = null;
	lastSyncedAt = 0;
	pendingSyncTime = true;
	lastStateOfDocumentChange = false;

	constructor( document ) {
		this.document = document;
		this.lastStateOfDocumentChange = document.editor.isChanged;

		this.onSend = this.onSend.bind( this );
		this.onTick = this.onTick.bind( this );
		this.onRefreshNonce = this.onRefreshNonce.bind( this );
		this.onDocumentChanged = this.onDocumentChanged.bind( this );
		this.onDocumentLoaded = this.onDocumentLoaded.bind( this );

		this.bindEvents();

		wp.heartbeat.connectNow();
	}

	getModal = () => {
		if ( ! this.modal ) {
			this.modal = this.initModal();
		}

		return this.modal;
	};

	initModal() {
		const modal = refractionCommon.dialogsManager.createWidget( 'confirm', {
			headerMessage: __( 'Take Over', 'refraction' ),
			strings: {
				confirm: __( 'Take Over', 'refraction' ),
				cancel: __( 'Go Back', 'refraction' ),
			},
			defaultOption: 'confirm',
			onConfirm() {
				wp.heartbeat.enqueue( 'refraction_force_post_lock', true );
				wp.heartbeat.connectNow();
			},
			onCancel() {
				parent.history.go( -1 );
			},
		} );

		return modal;
	}

	showLockMessage( lockedUser ) {
		const modal = this.getModal();

		// Translators: %s is locked username.
		modal.setMessage( sprintf( __( '%s has taken over and is currently editing. Do you want to take over this page editing?', 'refraction' ), lockedUser ) )
			.show();
	}

	onSend( event, data ) {
		data.refraction_post_lock = {
			post_ID: this.document.id,
		};

		data.refraction_has_unsaved = this.document.editor.isChanged ? this.document.id : null;
	}

	onTick( event, response ) {
		if ( this.pendingSyncTime && response.refraction_server_time ) {
			this.lastSyncedAt = response.refraction_server_time;
			this.pendingSyncTime = false;
		}

		if ( response.locked_user ) {
			if ( this.document.editor.isChanged ) {
				$e.run( 'document/save/auto', {
					document: this.document,
				} );
			}

			this.showLockMessage( response.locked_user );
		} else {
			this.getModal().hide();
		}

		const mutatedAt = response.refraction_mcp_mutation?.mutated_at;

		if ( mutatedAt && mutatedAt > this.lastSyncedAt ) {
			this.showExternalChangeModal();
		}

		refractionCommon.ajax.addRequestConstant( '_nonce', response.refractionNonce );
	}

	onRefreshNonce( event, response ) {
		const nonces = response[ 'refraction-refresh-nonces' ];

		if ( nonces ) {
			if ( nonces.heartbeatNonce ) {
				refractionCommon.ajax.addRequestConstant( '_nonce', nonces.refractionNonce );
			}

			if ( nonces.heartbeatNonce ) {
				window.heartbeatSettings.nonce = nonces.heartbeatNonce;
			}
		}
	}

	onDocumentLoaded() {
		this.pendingSyncTime = true;
	}

	reloadDocument() {
		$e.internal( 'document/save/set-is-modified', { status: false } );
		this._doReload();
	}

	_doReload() {
		window.location.reload();
	}

	forceSave() {
		this.pendingSyncTime = true;
		$e.run( 'document/save/save', { document: this.document } );
	}

	showExternalChangeModal() {
		if ( this.externalChangeModal ) {
			return;
		}

		const isDirty = this.document.editor.isChanged;

		const baseConfig = {
			headerMessage: __( 'Page Updated by AI', 'refraction' ),
			defaultOption: 'confirm',
			onConfirm: () => this.reloadDocument(),
		};

		const config = isDirty
			? {
				...baseConfig,
				message: __( 'This page was changed externally. Save your changes or reload to get the latest version.', 'refraction' ),
				strings: {
					confirm: __( 'Force Save', 'refraction' ),
					cancel: __( 'Reload', 'refraction' ),
				},
				onConfirm: () => this.forceSave(),
				onCancel: () => this.reloadDocument(),
			}
			: {
				...baseConfig,
				message: __( 'This page was changed externally. Reload to get the latest version.', 'refraction' ),
				strings: {
					confirm: __( 'Reload', 'refraction' ),
				},
			};

		this.externalChangeModal = refractionCommon.dialogsManager.createWidget( isDirty ? 'confirm' : 'alert', {
			...config,
			closeButton: false,
			hide: {
				onOutsideClick: false,
				onEscKeyPress: false,
				onBackgroundClick: false,
			},
		} );

		this.externalChangeModal.show();
	}

	onDocumentChanged() {
		const newChangeOfDocumentState = this.document.editor.isChanged;
		if (newChangeOfDocumentState === this.lastStateOfDocumentChange) {
			return;
		}
		if ( newChangeOfDocumentState ) {
			wp.heartbeat.connectNow();
		}
		this.lastStateOfDocumentChange = newChangeOfDocumentState;
	}

	bindEvents() {
		jQuery( document ).on( {
			'heartbeat-send': this.onSend,
			'heartbeat-tick': this.onTick,
			'heartbeat-tick.wp-refresh-nonces': this.onRefreshNonce,
		} );

		refraction.channels.editor.on( 'status:change', this.onDocumentChanged );
		refraction.on( 'document:loaded', this.onDocumentLoaded );
	}

	destroy() {
		jQuery( document ).off( {
			'heartbeat-send': this.onSend,
			'heartbeat-tick': this.onTick,
			'heartbeat-tick.wp-refresh-nonces': this.onRefreshNonce,
		} );

		refraction.channels.editor.off( 'status:change', this.onDocumentChanged );
		refraction.off( 'document:loaded', this.onDocumentLoaded );
	}
}
