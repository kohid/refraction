export default class FilesUploadHandler {
	static isUploadEnabled( mediaType ) {
		const unfilteredFilesTypes = [ 'svg', 'application/json' ];

		if ( ! unfilteredFilesTypes.includes( mediaType ) ) {
			return true;
		}

		return refractionCommon.config.filesUpload.unfilteredFiles;
	}

	static setUploadTypeCaller( frame ) {
		frame.uploader.uploader.param( 'uploadTypeCaller', 'refraction-wp-media-upload' );
	}

	static getUnfilteredFilesNonAdminDialog() {
		return refractionCommon.dialogsManager.createWidget( 'alert', {
			id: 'e-unfiltered-files-disabled-dialog',
			headerMessage: __( 'Sorry, you can\'t upload that file yet', 'refraction' ),
			message: __( 'This is because JSON files may pose a security risk.', 'refraction' ) +
				'<br><br>' +
				__( 'To upload them anyway, ask the site administrator to enable unfiltered file uploads.', 'refraction' ),
			strings: {
				confirm: __( 'Got it', 'refraction' ),
			},
		} );
	}

	static getUnfilteredFilesNotEnabledDialog( callback ) {
		const refractionInstance = window.refractionAdmin || window.refraction;

		if ( ! refractionInstance.config.user.is_administrator ) {
			return this.getUnfilteredFilesNonAdminDialog();
		}

		const onConfirm = () => {
			refractionCommon.ajax.addRequest( 'enable_unfiltered_files_upload', {}, true );
			refractionCommon.config.filesUpload.unfilteredFiles = true;
			callback();
		};

		return refractionInstance.helpers.getSimpleDialog(
			'e-enable-unfiltered-files-dialog',
			__( 'Enable Unfiltered File Uploads', 'refraction' ),
			__( 'Before you enable unfiltered files upload, note that such files include a security risk. Refraction does run a process to remove possible malicious code, but there is still risk involved when using such files.', 'refraction' ),
			__( 'Enable', 'refraction' ),
			onConfirm,
		);
	}

	static getUnfilteredFilesNotEnabledImportTemplateDialog( callback ) {
		if ( ! ( window.refractionAdmin || window.refraction ).config.user.is_administrator ) {
			return this.getUnfilteredFilesNonAdminDialog();
		}

		return refractionCommon.dialogsManager.createWidget( 'confirm', {
			id: 'e-enable-unfiltered-files-dialog-import-template',
			headerMessage: __( 'Enable Unfiltered File Uploads', 'refraction' ),
			message: __( 'Before you enable unfiltered files upload, note that such files include a security risk. Refraction does run a process to remove possible malicious code, but there is still risk involved when using such files.', 'refraction' ) +
				'<br /><br />' +
				__( 'If you do not enable uploading unfiltered files, any SVG or JSON (including lottie) files used in the uploaded template will not be imported.', 'refraction' ),
			position: {
				my: 'center center',
				at: 'center center',
			},
			strings: {
				confirm: __( 'Enable and Import', 'refraction' ),
				cancel: __( 'Import Without Enabling', 'refraction' ),
			},
			onConfirm: () => {
				refractionCommon.ajax.addRequest( 'enable_unfiltered_files_upload', {
					success: () => {
						// This utility is used in both the admin and the Editor.
						refractionCommon.config.filesUpload.unfilteredFiles = true;

						callback();
					},
				}, true );
			},
			onCancel: () => callback(),
		} );
	}
}
