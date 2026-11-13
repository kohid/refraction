import {
	__privateRunCommand as runCommand,
	__privateUseListenTo as useListenTo,
	windowEvent,
} from '@refraction/editor-v1-adapters';
import { LayoutSidebarIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { type ToggleActionProps } from '../../../types';

const isShown = () => ! document.body.classList.contains( 'refraction-editor-preview' );

// Shows or hides the side panel (floating, or docked left or right; regions/panel/panel.js), as Ctrl+P does.
export default function useActionProps(): ToggleActionProps {
	const shown = useListenTo( windowEvent( 'refraction/panel/visibility' ), isShown );

	return {
		title: __( 'Panel', 'refraction' ),
		icon: LayoutSidebarIcon,
		onClick: () => runCommand( 'panel/toggle' ),
		selected: shown,
	};
}
