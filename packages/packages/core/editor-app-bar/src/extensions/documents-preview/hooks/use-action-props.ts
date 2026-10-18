import { __useActiveDocument as useActiveDocument } from '@refraction/editor-documents';
import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';
import { EyeIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { type ExtendedWindow } from '../../../types';

export default function useActionProps() {
	const document = useActiveDocument();

	return {
		icon: EyeIcon,
		title: __( 'Preview Changes', 'refraction' ),
		onClick: () => {
			const extendedWindow = window as unknown as ExtendedWindow;
			const config = extendedWindow?.refractionCommon?.eventsManager?.config;

			if ( config ) {
				extendedWindow.refractionCommon.eventsManager.dispatchEvent( config.names.topBar.previewPage, {
					location: config.locations.topBar,
					secondaryLocation: config.secondaryLocations[ 'preview-page' ],
					trigger: config.triggers.click,
					element: config.elements.buttonIcon,
				} );
			}

			if ( document ) {
				runCommand( 'editor/documents/preview', {
					id: document.id,
					force: true,
				} );
			}
		},
	};
}
