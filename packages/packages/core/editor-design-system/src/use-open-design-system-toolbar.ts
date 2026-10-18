import { type ToggleActionProps } from '@refraction/editor-app-bar';
import { DropletHalfFilledIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

const EVENT_TOGGLE = 'refraction/toggle-design-system';

import { usePanelStatus } from './design-system-panel';
import { trackDesignSystem } from './import/tracking';
import { getActiveDesignSystemTab } from './initial-tab';

export function useOpenDesignSystemToolbar(): ToggleActionProps {
	const { isOpen } = usePanelStatus();

	return {
		title: __( 'Design System', 'refraction' ),
		icon: DropletHalfFilledIcon,
		onClick: () => {
			if ( ! isOpen ) {
				trackDesignSystem( { event: 'opened' } );
			}

			const tab = getActiveDesignSystemTab();

			window.dispatchEvent(
				new CustomEvent( EVENT_TOGGLE, {
					detail: { tab },
				} )
			);
		},
		selected: isOpen,
	};
}
