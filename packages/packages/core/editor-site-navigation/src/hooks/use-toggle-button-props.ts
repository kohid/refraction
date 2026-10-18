import { type ToggleActionProps } from '@refraction/editor-app-bar';
import { PagesIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { usePanelActions, usePanelStatus } from '../components/panel/panel';
import { type ExtendedWindow } from '../types';

export function useToggleButtonProps(): ToggleActionProps {
	const { isOpen: selectedState, isBlocked } = usePanelStatus();
	const { open, close } = usePanelActions();

	return {
		title: __( 'Pages', 'refraction' ),
		icon: PagesIcon,
		onClick: () => {
			const extendedWindow = window as unknown as ExtendedWindow;
			const config = extendedWindow?.refractionCommon?.eventsManager?.config;

			if ( config ) {
				extendedWindow.refractionCommon.eventsManager.dispatchEvent( 'top_bar_pages', {
					location: config.locations.topBar,
					secondaryLocation: config.secondaryLocations.refractionLogo,
					trigger: config.triggers.click,
					element: config.elements.buttonIcon,
				} );
			}

			return selectedState ? close() : open();
		},
		selected: selectedState,
		disabled: isBlocked,
	};
}
