// Refraction has no telemetry: the events manager was removed, so every dispatch below is a no-op.
const eventsConfig = {
	triggers: {
		click: 'click',
		pageLoaded: 'pageLoaded',
	},
};

const EVENTS_MAP = {
	PAGE_VIEWS_WEBSITE_TEMPLATES: 'page_views_website_templates',
	KITS_CLOUD_UPGRADE_CLICKED: 'kits_cloud_upgrade_clicked',
	EXPORT_KIT_CUSTOMIZATION: 'export_kit_customization',
	IMPORT_KIT_CUSTOMIZATION: 'import_kit_customization',
	KIT_IMPORT_STATUS: 'kit_import_status',
	KIT_CLOUD_LIBRARY_APPLY: 'kit_cloud_library_apply',
	KIT_CLOUD_LIBRARY_DELETE: 'kit_cloud_library_delete',
	IMPORT_EXPORT_ADMIN_ACTION: 'ie_admin_action',
	KIT_IMPORT_UPLOAD_FILE: 'kit_import_upload_file',
};

export const appsEventTrackingDispatch = () => {};

export class AppsEventTracking {
	static dispatchEvent( eventName, payload ) {
		return window.refractionCommon?.eventsManager?.dispatchEvent?.( eventName, payload );
	}

	static sendPageViewsWebsiteTemplates( page ) {
		return this.dispatchEvent( EVENTS_MAP.PAGE_VIEWS_WEBSITE_TEMPLATES, {
			trigger: eventsConfig.triggers.pageLoaded,
			page_loaded: page,
			secondary_location: page,
		} );
	}

	static sendKitsCloudUpgradeClicked( upgradeLocation ) {
		return this.dispatchEvent( EVENTS_MAP.KITS_CLOUD_UPGRADE_CLICKED, {
			trigger: eventsConfig.triggers.click,
			secondary_location: upgradeLocation,
			upgrade_location: upgradeLocation,
		} );
	}

	static sendExportKitCustomization( payload ) {
		return this.dispatchEvent( EVENTS_MAP.EXPORT_KIT_CUSTOMIZATION, {
			trigger: eventsConfig.triggers.click,
			...payload,
		} );
	}

	static sendImportKitCustomization( payload ) {
		return this.dispatchEvent( EVENTS_MAP.IMPORT_KIT_CUSTOMIZATION, {
			trigger: eventsConfig.triggers.click,
			...payload,
		} );
	}

	static sendKitImportStatus( error = null ) {
		const isError = !! error;

		return this.dispatchEvent( EVENTS_MAP.KIT_IMPORT_STATUS, {
			kit_import_status: ! isError,
			...( isError && { kit_import_error: error.message } ),
		} );
	}

	static sendKitCloudLibraryApply( kitId, kitApplyUrl ) {
		return this.dispatchEvent( EVENTS_MAP.KIT_CLOUD_LIBRARY_APPLY, {
			trigger: eventsConfig.triggers.click,
			kit_cloud_id: kitId,
			...( kitApplyUrl && { kit_apply_url: kitApplyUrl } ),
		} );
	}

	static sendKitCloudLibraryDelete() {
		return this.dispatchEvent( EVENTS_MAP.KIT_CLOUD_LIBRARY_DELETE, {
			trigger: eventsConfig.triggers.click,
		} );
	}

	static sendImportExportAdminAction( actionType ) {
		return this.dispatchEvent( EVENTS_MAP.IMPORT_EXPORT_ADMIN_ACTION, {
			trigger: eventsConfig.triggers.click,
			action_type: actionType,
		} );
	}

	static sendKitImportUploadFile( status ) {
		return this.dispatchEvent( EVENTS_MAP.KIT_IMPORT_UPLOAD_FILE, {
			kit_import_upload_file_status: status,
		} );
	}
}
