import {
	__privateRunCommand as runCommand,
	__privateUseRouteStatus as useRouteStatus,
} from '@refraction/editor-v1-adapters';
import { StructureIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { type ExtendedWindow, type ToggleActionProps } from '../../../types';

export default function useActionProps(): ToggleActionProps {
	const { isActive, isBlocked } = useRouteStatus( 'navigator' );

	return {
		title: __( 'Structure', 'refraction' ),
		icon: StructureIcon,
		onClick: () => {
			const extendedWindow = window as unknown as ExtendedWindow;
			const config = extendedWindow?.refractionCommon?.eventsManager?.config;

			if ( config ) {
				extendedWindow.refractionCommon.eventsManager.dispatchEvent( config.names.topBar.structure, {
					location: config.locations.topBar,
					secondaryLocation: config.secondaryLocations.structure,
					trigger: config.triggers.toggleClick,
					element: config.elements.buttonIcon,
				} );
			}

			runCommand( 'navigator/toggle' );
		},
		selected: isActive,
		disabled: isBlocked,
	};
}
