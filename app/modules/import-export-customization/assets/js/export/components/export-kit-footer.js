import { useEffect } from 'react';
import { Button, Stack } from '@elementor/ui';
import { useNavigate } from '@reach/router';

import { useExportContext, EXPORT_STATUS } from '../context/export-context';

/**
 * Export footer. Saving kits to a cloud library was removed with Refraction's remote services, so the only action is
 * exporting the website template as a .zip file.
 */
export default function ExportKitFooter() {
	const navigate = useNavigate();
	const { data, dispatch, hasValidationErrors, isExporting } = useExportContext();

	useEffect( () => {
		if ( isExporting ) {
			navigate( '/export-customization/process' );
		}
	}, [ isExporting, navigate ] );

	const handleExportAsZip = () => {
		if ( hasValidationErrors ) {
			return;
		}

		const hasCloudMediaFormat = 'cloud' === data.customization?.content?.mediaFormat;

		if ( hasCloudMediaFormat ) {
			dispatch( { type: 'SET_MEDIA_FORMAT_VALIDATION', payload: true } );
			return;
		}

		dispatch( { type: 'SET_KIT_SAVE_SOURCE', payload: 'file' } );
		dispatch( { type: 'SET_EXPORT_STATUS', payload: EXPORT_STATUS.EXPORTING } );
	};

	return (
		<Stack direction="row" spacing={ 1 }>
			<Button
				variant="contained"
				color="primary"
				size="small"
				disabled={ hasValidationErrors }
				onClick={ handleExportAsZip }
				data-testid="export-kit-footer-export-zip-button"
			>
				{ __( 'Export as .zip', 'refraction' ) }
			</Button>
		</Stack>
	);
}
