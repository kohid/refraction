import { isAngieAvailable, openAngieInAskMode } from '@refraction/editor-mcp';
import { HelpIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { type ExtendedWindow } from '../../../types';

const HELP_CENTER_URL = 'https://go.elementor.com/editor-top-bar-learn/';
const HELP_CENTER_ANGIE_PROMPT = `${ __( 'Help me with', 'refraction' ) } `;

const dispatchHelpClickEvent = () => {
	const extendedWindow = window as unknown as ExtendedWindow;
	const config = extendedWindow?.refractionCommon?.eventsManager?.config;

	if ( config ) {
		extendedWindow.refractionCommon.eventsManager.dispatchEvent( config.names.topBar.help, {
			location: config.locations.topBar,
			secondaryLocation: config.secondaryLocations.help,
			trigger: config.triggers.click,
			element: config.elements.buttonIcon,
		} );
	}
};

export default function useActionProps() {
	const hasAngieActive = isAngieAvailable();

	if ( hasAngieActive ) {
		return {
			title: __( 'Help Center', 'refraction' ),
			icon: HelpIcon,
			onClick: ( event: React.MouseEvent ) => {
				event.preventDefault();
				dispatchHelpClickEvent();
				openAngieInAskMode( HELP_CENTER_ANGIE_PROMPT );
			},
		};
	}

	return {
		title: __( 'Help Center', 'refraction' ),
		href: HELP_CENTER_URL,
		icon: HelpIcon,
		target: '_blank',
		onClick: () => {
			dispatchHelpClickEvent();
		},
	};
}
