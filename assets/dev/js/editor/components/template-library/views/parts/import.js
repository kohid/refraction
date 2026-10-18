import FilesUploadHandler from '../../../../utils/files-upload-handler';
import { showJsonUploadWarningMessageIfNeeded } from 'refraction-utils/json-upload-warning-message';
import { showGlobalStylesDialog } from './global-styles-dialog';

var TemplateLibraryImportView;

TemplateLibraryImportView = Marionette.ItemView.extend( {
	tagName: 'main',

	template: '#tmpl-refraction-template-library-import',

	id: 'refraction-template-library-import',

	ui: {
		uploadForm: '#refraction-template-library-import-form',
		fileInput: '#refraction-template-library-import-form-input',
		icon: '.refraction-template-library-blank-icon i',
	},

	events: {
		'change @ui.fileInput': 'onFileInputChange',
	},

	droppedFiles: null,

	submitForm() {
		let file;

		if ( this.droppedFiles ) {
			file = this.droppedFiles[ 0 ];

			this.droppedFiles = null;
		} else {
			file = this.ui.fileInput[ 0 ].files[ 0 ];

			this.ui.uploadForm[ 0 ].reset();
		}

		const fileReader = new FileReader();

		fileReader.onload = ( event ) => this.importTemplate( file.name, event.target.result.replace( /^[^,]+,/, '' ) );

		fileReader.readAsDataURL( file );
	},

	async importTemplate( fileName, fileData ) {
		const layout = refraction.templates.layout;
		const activeSource = refraction.templates.getFilter( 'source' );

		this.options = {
			data: {
				fileName,
				fileData,
				source: activeSource,
			},
			success: ( successData ) => {
				refraction.templates.clearLastRemovedItems();
				refraction.templates.getTemplatesCollection().add( successData );
				refraction.templates.setToastConfig( {
					show: true,
					options: {
						/* Translators: 1: Number of templates */
						message: sprintf( __( 'You successfully imported %1$d template(s).', 'refraction' ), successData.length ),
						position: {
							my: 'right bottom',
							at: 'right-10 bottom-10',
							of: '#refraction-template-library-modal .dialog-lightbox-widget-content',
						},
					},
				} );

				$e.route( 'library/templates/my-templates' );
				refraction.templates.triggerQuotaUpdate();
				refraction.templates.eventManager.sendTemplateImportEvent( {
					library_type: activeSource,
					file_type: fileName.split( '.' ).pop(),
					template_count: successData.length,
				} );
			},
			error: ( errorData ) => {
				refraction.templates.showErrorDialog( errorData );

				layout.showImportView();
			},
			complete: () => {
				layout.hideLoadingView();
			},
		};

		await showJsonUploadWarningMessageIfNeeded( {
			introductionMap: window.refraction.config.user.introduction,
			IntroductionClass: window.refractionModules.editor.utils.Introduction,
		} );

		if ( fileName.endsWith( '.json' ) ) {
			try {
				const jsonContent = JSON.parse( atob( fileData ) );
				if ( refraction.templates.hasGlobalStyles( jsonContent ) ) {
					try {
						const { mode } = await showGlobalStylesDialog();
						this.options.data.import_mode = mode;
					} catch ( e ) {
						return;
					}
				}
			} catch ( parseError ) {
				console.warn( 'Failed to parse template JSON for global styles check:', parseError ); // eslint-disable-line no-console
			}
		}

		if ( ! refractionCommon.config.filesUpload.unfilteredFiles ) {
			const enableUnfilteredFilesModal = FilesUploadHandler.getUnfilteredFilesNotEnabledImportTemplateDialog( () => this.sendImportRequest() );

			enableUnfilteredFilesModal.show();
		} else {
			this.sendImportRequest();
		}
	},

	sendImportRequest() {
		refractionCommon.ajax.addRequest( 'import_template', this.options );

		refraction.templates.layout.showLoadingView();
	},

	onRender() {
		this.ui.uploadForm.on( {
			'drag dragstart dragend dragover dragenter dragleave drop': this.onFormActions.bind( this ),
			dragenter: this.onFormDragEnter.bind( this ),
			'dragleave drop': this.onFormDragLeave.bind( this ),
			drop: this.onFormDrop.bind( this ),
		} );

		this.resolveIcon();

		refraction.templates.eventManager.sendPageViewEvent( {
			location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.importModal,
		} );
	},

	resolveIcon() {
		const activeSource = refraction.templates.getFilter( 'source' ) || 'local';

		const className = 'local' === activeSource ? 'eicon-library-upload' : 'eicon-library-import';

		this.ui.icon.removeClass().addClass( className );
	},

	onFormActions( event ) {
		event.preventDefault();
		event.stopPropagation();
	},

	onFormDragEnter() {
		this.ui.uploadForm.addClass( 'refraction-drag-over' );
	},

	onFormDragLeave( event ) {
		if ( jQuery( event.relatedTarget ).closest( this.ui.uploadForm ).length ) {
			return;
		}

		this.ui.uploadForm.removeClass( 'refraction-drag-over' );
	},

	onFormDrop( event ) {
		this.droppedFiles = event.originalEvent.dataTransfer.files;

		this.submitForm();
	},

	onFileInputChange() {
		this.submitForm();
	},
} );

module.exports = TemplateLibraryImportView;
