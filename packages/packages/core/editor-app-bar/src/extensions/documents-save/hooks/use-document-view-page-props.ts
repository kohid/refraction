import { __useActiveDocument as useActiveDocument } from '@refraction/editor-documents';
import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';
import { useMixpanel } from '@refraction/events';
import { EyeIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

export default function useDocumentViewPageProps() {
	const document = useActiveDocument();
	const { dispatchEvent, config } = useMixpanel();

	return {
		icon: EyeIcon,
		title: __( 'View Page', 'refraction' ),
		onClick: () => {
			const eventName = config?.names?.editorOne?.topBarPublishDropdown;
			if ( eventName ) {
				dispatchEvent?.( eventName, {
					window_name: config?.appTypes?.editor,
					interaction_type: config?.triggers?.click?.toLowerCase(),
					target_type: config?.targetTypes?.dropdownItem,
					target_name: config?.targetNames?.publishDropdown?.viewPage,
					interaction_result: config?.interactionResults?.actionSelected,
					target_location: config?.locations?.topBar?.replace( /\s+/g, '_' ).toLowerCase(),
					location_l1: config?.secondaryLocations?.publishDropdown?.replace( /\s+/g, '_' ).toLowerCase(),
					location_l2: config?.targetTypes?.dropdownItem,
				} );
			}
			if ( document?.id ) {
				runCommand( 'editor/documents/view', {
					id: document.id,
				} );
			}
		},
	};
}
