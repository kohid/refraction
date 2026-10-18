import After from 'refraction-api/modules/hooks/data/after';

export class KitAfterSave extends After {
	getCommand() {
		return 'document/save/save';
	}

	getConditions( args ) {
		const { status, document = refraction.documents.getCurrent() } = args;
		return 'publish' === status && 'kit' === document.config.type;
	}

	getId() {
		return 'kit-footer-saver-after-save';
	}

	apply( args ) {
		this.trackSiteSettingsSave();

		// On save clear cache of all edited documents and dynamic tags.
		// This is needed because when returning to the editor after saving the kit, it was still displaying the old data.
		this.clearDocumentCache();
		this.clearDynamicTagsCache();

		if ( 'publish' === args.status ) {
			refraction.notifications.showToast( {
				message: __( 'Your changes have been updated.', 'refraction' ),
				buttons: [
					{
						name: 'back_to_editor',
						text: __( 'Back to Editor', 'refraction' ),
						callback() {
							$e.run( 'panel/global/close' );
						},
					},
				],
			} );
		}

		if ( refraction.activeBreakpointsUpdated ) {
			const reloadConfirm = refractionCommon.dialogsManager.createWidget( 'alert', {
				id: 'refraction-save-kit-refresh-page',
				headerMessage: __( 'Reload Refraction Editor', 'refraction' ),
				message: __( 'You have made modifications to the list of Active Breakpoints. For these changes to take effect, you need to reload Refraction Editor.', 'refraction' ),
				position: {
					my: 'center center',
					at: 'center center',
				},
				strings: {
					confirm: __( 'Reload Now', 'refraction' ),
				},
				onConfirm: () => location.reload(),
			} );

			reloadConfirm.show();
		}
	}

	trackSiteSettingsSave() {
		const globalComponent = $e.components.get( 'panel/global' );

		if ( ! globalComponent ) {
			return;
		}

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

		globalComponent.siteSettingsSession.hasSaved = true;
	}

	clearDocumentCache() {
		Object.keys( refraction.documents.documents ).forEach( ( id ) => {
			refraction.documents.invalidateCache( id );
		} );
	}

	clearDynamicTagsCache() {
		refraction.dynamicTags.cleanCache();
		refraction.dynamicTags.loadCacheRequests();
	}
}

export default KitAfterSave;
