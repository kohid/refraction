import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';
import { KeyboardIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { type ActionProps, type ExtendedWindow } from '../../../types';

export default function useActionProps(): ActionProps {
	return {
		icon: KeyboardIcon,
		title: __( 'Keyboard Shortcuts', 'refraction' ),
		onClick: () => {
			const extendedWindow = window as unknown as ExtendedWindow;
			const config = extendedWindow?.refractionCommon?.eventsManager?.config;

			if ( config ) {
				extendedWindow.refractionCommon.eventsManager.dispatchEvent( config.names.topBar.keyboardShortcuts, {
					location: config.locations.topBar,
					secondaryLocation: config.secondaryLocations.refractionLogo,
					trigger: config.triggers.click,
					element: config.elements.link,
				} );
			}

			runCommand( 'shortcuts/open' );
		},
	};
}
