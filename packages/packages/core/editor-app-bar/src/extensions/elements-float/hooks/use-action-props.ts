import {
	__privateRunCommand as runCommand,
	__privateUseRouteStatus as useRouteStatus,
} from '@refraction/editor-v1-adapters';
import { WidgetsIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { type ToggleActionProps } from '../../../types';

// Shows or hides the floating Elements window (assets/dev/js/editor/regions/elements-float), as Structure does.
export default function useActionProps(): ToggleActionProps {
	const { isActive, isBlocked } = useRouteStatus( 'elements-float' );

	return {
		title: __( 'Floating Elements', 'refraction' ),
		icon: WidgetsIcon,
		onClick: () => runCommand( 'elements-float/toggle' ),
		selected: isActive,
		disabled: isBlocked,
	};
}
