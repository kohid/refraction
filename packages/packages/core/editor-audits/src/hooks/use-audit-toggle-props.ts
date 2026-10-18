import { type ToggleActionProps } from '@refraction/editor-app-bar';
import { __ } from '@wordpress/i18n';

import AuditToggleIcon from '../components/audit-toggle-icon';
import { auditPanel } from '../editor-panel';

export function useAuditToggleProps(): ToggleActionProps {
	const { isOpen } = auditPanel.useFloatingPanelStatus();
	const { toggle } = auditPanel.useFloatingPanelActions();

	return {
		title: __( 'Audit Page', 'refraction' ),
		icon: AuditToggleIcon,
		selected: isOpen,
		onClick: () => toggle(),
	};
}
