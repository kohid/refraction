import { EditorOneEventManager } from 'refraction-editor-utils/editor-one-events';

export class Back extends $e.modules.CommandBase {
	document = null;
	confirmDialog = null;
	unsavedChangesDialog = [];

	apply() {
		const panelHistory = $e.routes.getHistory( 'panel' );
		const currentRoute = panelHistory[ panelHistory.length - 1 ]?.route;

		// When at the root Site Settings page, back should behave like close —
		// switching back to the initial document and clearing the active-document query param.
		if ( currentRoute === this.component.getNamespace() + '/menu' ) {
			this.getCloseConfirmDialog( event ).show();
			return;
		}

		// If the user is on the global colors/typography page, and there are unsaved changes,
		// prompt the user with a confirmation dialog asking if they would like to save the changes.
		if ( this.isGlobalRoute() ) {
			const kit = refraction.config.kit_id;
			this.document = refraction.documents.get( kit );

			if ( this.isDocumentChanged() ) {
				this.resolveChanges().then( () => {
					return $e.routes.back( 'panel' );
				} );

				return;
			}
		}

		return $e.routes.back( 'panel' );
	}

	markSessionSaved() {
		const globalComponent = this.component;

		if ( ! globalComponent ) {
			return;
		}

		globalComponent.siteSettingsSession.hasSaved = true;

		const currentTab = globalComponent.currentTab;
		let activeSection = null;

		try {
			const panelView = refraction.getPanelView();
			const currentPage = panelView?.getCurrentPageView?.();
			const contentView = currentPage?.content?.currentView;
			activeSection = contentView?.activeSection || null;
		} catch ( e ) {}

		const savedItem = activeSection ? `${ currentTab } - ${ activeSection }` : currentTab;

		if ( savedItem ) {
			globalComponent.trackSavedItem( savedItem );
		}
	}

	trackSiteSettingsSession( targetType, state ) {
		const sessionData = this.component.getSiteSettingsSessionData?.() || {};

		EditorOneEventManager.sendSiteSettingsSession( {
			targetType,
			visitedItems: sessionData.visitedItems || [],
			savedItems: sessionData.savedItems || [],
			state,
		} );

		this.component.resetSiteSettingsSession?.();
	}

	getCloseConfirmDialog( event ) {
		if ( ! this.confirmDialog ) {
			const modalOptions = {
				id: 'refraction-kit-warn-on-close',
				headerMessage: __( 'Exit', 'refraction' ),
				message: __( 'Would you like to exit?', 'refraction' ),
				position: {
					my: 'center center',
					at: 'center center',
				},
				strings: {
					confirm: __( 'Exit', 'refraction' ),
					cancel: __( 'Cancel', 'refraction' ),
				},
				onConfirm: () => {
					this.trackSiteSettingsSession( 'back', 'discard' );
					$e.run( 'panel/global/close' );
				},
			};

			this.confirmDialog = refractionCommon.dialogsManager.createWidget( 'confirm', modalOptions );
		}

		this.confirmDialog.setSettings( 'hide', {
			onEscKeyPress: ! event,
		} );

		return this.confirmDialog;
	}

	isGlobalRoute() {
		const panelHistory = $e.routes.getHistory( 'panel' );

		return /global\/\bglobal-colors|global-typography\b/.test(
			panelHistory[ panelHistory.length - 1 ].route,
		);
	}

	isDocumentChanged() {
		return this.document && this.document.editor.isChanged;
	}

	resolveChanges() {
		return new Promise( ( resolve ) => {
			this.getUnsavedChangesDialog( resolve ).show();
		} );
	}

	getUnsavedChangesDialog( resolve ) {
		if ( ! this.document ) {
			resolve();
			return;
		}

		const document = this.document;

		if ( ! this.unsavedChangesDialog[ document ] ) {
			const modalOptions = {
				id: `refraction-${ document }-save-changes`,
				headerMessage: __( 'Save Changes', 'refraction' ),
				message: __( "Would you like to save the changes you've made?", 'refraction' ),
				position: {
					my: 'center center',
					at: 'center center',
				},
				strings: {
					confirm: __( 'Save', 'refraction' ),
					cancel: __( 'Discard', 'refraction' ),
				},
				onConfirm: () => {
					this.markSessionSaved();
					$e.run( 'document/save/update' ).then( () => {
						this.trackSiteSettingsSession( 'save', 'saved' );
						resolve();
					} );
				},
				onCancel: () => {
					$e.run( 'document/save/discard', { document } ).then( () => {
						this.trackSiteSettingsSession( 'back', 'discard' );
						resolve();
					} );
				},
			};

			this.unsavedChangesDialog[ document ] = refractionCommon.dialogsManager.createWidget(
				'confirm',
				modalOptions,
			);
		}

		this.unsavedChangesDialog[ document ].setSettings( 'hide', {
			onEscKeyPress: ! event,
		} );

		return this.unsavedChangesDialog[ document ];
	}
}

export default Back;
