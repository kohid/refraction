import { useState, useEffect, useContext } from 'react';
import { useNavigate } from '@reach/router';
import { useConfirmAction } from '@refraction/hooks';
import useQueryParams from 'refraction-app/hooks/use-query-params';

import { SharedContext } from '../../../context/shared-context/shared-context-provider';
import { ImportContext } from '../../../context/import-context/import-context-provider';

import Layout from '../../../templates/layout';
import PageHeader from '../../../ui/page-header/page-header';
import ProcessFailedDialog from '../../../shared/process-failed-dialog/process-failed-dialog';
import InlineLink from 'refraction-app/ui/molecules/inline-link';
import Notice from 'refraction-app/ui/molecules/notice';
import DropZone from 'refraction-app/organisms/drop-zone';
import Button from 'refraction-app/ui/molecules/button';
import RefractionLoading from 'refraction-app/molecules/refraction-loading';
import { appsEventTrackingDispatch } from 'refraction-app/event-track/apps-event-tracking';
import Checkbox from 'refraction-app/ui/atoms/checkbox';
import Dialog from 'refraction-app/ui/dialog/dialog';

import useKit, { KIT_SOURCE_MAP } from '../../../hooks/use-kit';

import './import-kit.scss';

export default function ImportKit() {
	const sharedContext = useContext( SharedContext ),
		importContext = useContext( ImportContext ),
		navigate = useNavigate(),
		{ kitState, kitActions, KIT_STATUS_MAP } = useKit(),
		[ errorType, setErrorType ] = useState( '' ),
		[ isLoading, setIsLoading ] = useState( false ),
		{ referrer, currentPage } = sharedContext.data,
		resetImportProcess = () => {
			importContext.dispatch( { type: 'SET_FILE', payload: null } );
			setErrorType( null );
			setIsLoading( false );
			kitActions.reset();
		},
		eventTracking = ( command, event = null, eventType = 'click', error = null, modalType = null, uploadMethod ) => {
			if ( 'kit-library' === referrer ) {
				let uploadMethodName = null;
				if ( uploadMethod ) {
					uploadMethodName = 'drop' === uploadMethod ? 'drag-drop' : 'browse';
				}

				let element = null;
				if ( event && 'eps-button eps-dialog__button' === event.currentTarget.className.trim() ) {
					element = 'close button';
				} else if ( event && 'eps-button eps-dialog__close-button' === event.currentTarget.className.trim() ) {
					element = 'x';
				}

				appsEventTrackingDispatch(
					command,
					{
						element,
						page_source: 'import',
						event_type: eventType,
						step: currentPage,
						error: 'general' === error ? 'unknown' : error,
						modal_type: modalType,
						method: uploadMethodName,
					},
				);
			}
		},
		getLearnMoreLink = () => (
			<InlineLink url="https://github.com/kohid/refraction#readme" key="learn-more-link" italic onClick={ () => eventTracking( 'kit-library/seek-more-info', null, 'click' ) } >
				{ __( 'Learn More', 'refraction' ) }
			</InlineLink>
		),
		{
			runAction: uploadFile,
			dialog,
			checkbox,
		} = useConfirmAction( {
			doNotShowAgainKey: 'upload_json_warning_generic_message',
			action: ( file, e ) => {
				setIsLoading( true );
				importContext.dispatch( { type: 'SET_FILE', payload: file } );
				eventTracking( 'kit-library/file-upload', null, 'feedback', null, null, e.type );
			},
		} );

	const { source, kit_id: kitId } = useQueryParams().getAll();
	const isLoadingKitFromCloud = [ importContext.data.source, source ].includes( KIT_SOURCE_MAP.CLOUD );

	// On load.
	useEffect( () => {
		sharedContext.dispatch( { type: 'SET_INCLUDES', payload: [] } );
		importContext.dispatch( { type: 'SET_KIT_SOURCE', payload: source } );
		sharedContext.dispatch( { type: 'SET_CURRENT_PAGE_NAME', payload: ImportKit.name } );
	}, [] );

	// Uploading the kit after file is selected.
	useEffect( () => {
		if ( importContext.data.file ) {
			kitActions.upload( { file: importContext.data.file } );
		}
	}, [ importContext.data.file ] );

	// Listening to kit upload state.
	useEffect( () => {
		if ( KIT_STATUS_MAP.UPLOADED === kitState.status ) {
			importContext.dispatch( { type: 'SET_UPLOADED_DATA', payload: kitState.data } );

			if ( isLoadingKitFromCloud && kitState.data.uploaded_kit ) {
				importContext.dispatch( { type: 'SET_FILE', payload: kitState.data.uploaded_kit } );
			}
		} else if ( 'error' === kitState.status ) {
			setErrorType( kitState.data );
		}
	}, [ kitState.status ] );

	// After kit was uploaded.
	useEffect( () => {
		if ( importContext.data.uploadedData && importContext.data.file ) {
			const url = importContext.data.uploadedData.manifest.plugins ? '/import/plugins' : '/import/content';

			navigate( url );
		}
	}, [ importContext.data.uploadedData ] );

	// Trigger import kit from Cloud Library
	useEffect( () => {
		if ( KIT_SOURCE_MAP.CLOUD === source && kitId ) {
			kitActions.upload( { source, kitId } );
		}
	}, [ source, kitId ] );

	return (
		<Layout type="import">
			<section className="e-app-import">
				{ isLoadingKitFromCloud ? (
					<RefractionLoading />
				) : (
					<>
						{
							'kit-library' === referrer &&
							<Button
								className="e-app-import__back-to-library"
								icon="rficon-chevron-left"
								text={ __( 'Back to Website Templates', 'refraction' ) }
								url={ isLoading ? '' : `/kit-library${ isLoadingKitFromCloud ? '/cloud' : '' }` }
							/>
						}

						<PageHeader
							heading={ __( 'Import a Website Template', 'refraction' ) }
							description={ <>
								{ __( 'Upload a .zip file with style, site settings, content, etc. Then, we’ll apply them to your site.', 'refraction' ) }
								{ ' ' }
								{ getLearnMoreLink() }
							</> }
						/>

						<Notice label={ __( 'Heads up!', 'refraction' ) } color="warning" className="e-app-import__notice">
							{ __( 'Before applying a new template, we recommend backing up your site so you can roll back any undesired changes.', 'refraction' ) }
						</Notice>

						<DropZone
							className="e-app-import__drop-zone"
							heading={ __( 'Choose a file to import', 'refraction' ) }
							text={ __( 'Drag & drop the .zip file with your website template', 'refraction' ) }
							secondaryText={ __( 'Or', 'refraction' ) }
							filetypes={ [ 'zip' ] }
							onFileChoose={ () => eventTracking( 'kit-library/choose-file' ) }
							onFileSelect={ uploadFile }
							onError={ () => setErrorType( 'general' ) }
							isLoading={ isLoading }
							buttonText={ __( 'Import from files', 'refraction' ) }
						/>

						{ dialog.isOpen &&
							<Dialog
								title={ __( 'Warning: JSON or ZIP files may be unsafe', 'refraction' ) }
								text={ __( 'Uploading JSON or ZIP files from unknown sources can be harmful and put your site at risk. For maximum safety, upload only JSON or ZIP files from trusted sources.', 'refraction' ) }
								approveButtonColor="link"
								approveButtonText={ __( 'Continue', 'refraction' ) }
								approveButtonOnClick={ dialog.approve }
								dismissButtonText={ __( 'Cancel', 'refraction' ) }
								dismissButtonOnClick={ dialog.dismiss }
								onClose={ dialog.dismiss }
							>
								<label htmlFor="do-not-show-upload-json-warning-again" style={ { display: 'flex', alignItems: 'center', gap: '5px' } }>
									<Checkbox
										id="do-not-show-upload-json-warning-again"
										type="checkbox"
										value={ checkbox.isChecked }
										onChange={ ( event ) => checkbox.setIsChecked( !! event.target.checked ) }
									/>
									{ __( 'Do not show this message again', 'refraction' ) }
								</label>
							</Dialog>
						}
					</>
				) }
				{ errorType && <ProcessFailedDialog
					errorType={ errorType }
					onApprove={ resetImportProcess }
					onModalClose={ ( event ) => eventTracking( 'kit-library/modal-close', event, 'load', null, 'error' ) }
					onError={ () => eventTracking( 'kit-library/modal-open', null, 'load', errorType, 'error' ) }
					onLearnMore={ () => eventTracking( 'kit-library/seek-more-info', null, 'click', null, 'error' ) }
				/> }
			</section>
		</Layout>
	);
}
