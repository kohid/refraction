import { useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '@reach/router';

import { ExportContext } from '../../../context/export-context/export-context-provider';
import { KIT_SOURCE_MAP } from '../../../hooks/use-kit';

import Layout from '../../../templates/layout';
import ActionsFooter from '../../../shared/actions-footer/actions-footer';
import WizardStep from '../../../ui/wizard-step/wizard-step';
import KitData from '../../../shared/kit-data/kit-data';
import InlineLink from 'refraction-app/ui/molecules/inline-link';
import Button from 'refraction-app/ui/molecules/button';
import DashboardButton from 'refraction-app/molecules/dashboard-button';

import './export-complete.scss';

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

export default function ExportComplete() {
	const exportContext = useContext( ExportContext );
	const isSavedToCloud = KIT_SOURCE_MAP.CLOUD === exportContext.data.kitInfo.source;
	const navigate = useNavigate(),
		downloadLink = useRef( null ),
		getFooter = () => (
			<ActionsFooter>
				{ isSavedToCloud
					? (
						<Button
							text={ __( 'Open library', 'refraction' ) }
							variant="contained"
							color="primary"
							url="/kit-library/cloud"
						/>
					)
					: <DashboardButton text={ __( 'Done', 'refraction' ) } />
				}
			</ActionsFooter>
		),
		downloadFile = () => {
			if ( ! downloadLink.current ) {
				const link = document.createElement( 'a' );

				const defaultKitName = 'refraction-kit';
				const kitName = exportContext.data.kitInfo?.title || defaultKitName;
				const sanitizedKitName = kitName
					.replace( INVALID_FILENAME_CHARS, '' )
					.trim();

				const fileName = sanitizedKitName || defaultKitName;

				link.href = 'data:text/plain;base64,' + exportContext.data.exportedData.file;
				link.download = fileName + '.zip';

				downloadLink.current = link;
			}

			downloadLink.current.click();
		};
	const getDownloadLink = () => (
		<InlineLink onClick={ downloadFile } italic>
			{ __( 'Download manually', 'refraction' ) }
		</InlineLink>
	);
	const getShowMeHowLink = () => (
		<InlineLink url="https://github.com/kohid/refraction#readme" italic>
			{ __( 'Show me how', 'refraction' ) }
		</InlineLink>
	);
	const getTakeMeThereLink = () => (
		<InlineLink url="/kit-library/cloud" italic>
			{ __( 'Take me there', 'refraction' ) }
		</InlineLink>
	);

	useEffect( () => {
		if ( ! exportContext.data.exportedData ) {
			return navigate( '/export' );
		}

		if ( ! isSavedToCloud ) {
			downloadFile();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ exportContext.data.downloadUrl, isSavedToCloud ] );

	const heading = useMemo( () => {
		return isSavedToCloud
			? __( 'Your website template is now saved to the library!', 'refraction' )
			: __( 'Your .zip file is ready', 'refraction' );
	}, [ isSavedToCloud ] );

	const description = useMemo( () => {
		return isSavedToCloud
			? (
				<>
					{ __( 'You can find it in the My Website Templates tab.', 'refraction' ) } { getTakeMeThereLink() }
				</>

			)
			: __( 'Once the download is complete, you can upload it to be used for other sites.', 'refraction' );
	}, [ isSavedToCloud ] );

	const getNotice = () => (
		isSavedToCloud
			? (
				<>
					{ __( 'Build sites faster with Website Templates.', 'refraction' ) } { getShowMeHowLink() }
				</>

			)
			: (
				<>
					{ __( 'Is the automatic download not starting?', 'refraction' ) } { getDownloadLink() }
				</>
			)

	);

	return (
		<Layout type="export" footer={ getFooter() }>
			<WizardStep
				image={ refractionAppConfig.assets_url + 'images/export-complete.svg' }
				heading={ heading }
				description={ description }
				notice={ getNotice() }
			>
				<KitData data={ exportContext.data?.exportedData?.manifest } />
			</WizardStep>
		</Layout>
	);
}
