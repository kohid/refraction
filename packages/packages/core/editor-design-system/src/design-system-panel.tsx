import * as React from 'react';
import { reloadCurrentDocument } from '@refraction/editor-documents';
import { createPanel } from '@refraction/editor-panels';
import { changeEditMode } from '@refraction/editor-v1-adapters';

import { DesignSystemPanelContent } from './components/design-system-panel-content';

const PANEL_ID = 'design-system';

export const { panel, usePanelStatus, usePanelActions } = createPanel( {
	id: PANEL_ID,
	component: DesignSystemPanelRoot,
	allowedEditModes: [ 'edit', PANEL_ID ],
	onOpen: () => {
		changeEditMode( PANEL_ID );
	},
	onClose: async () => {
		changeEditMode( 'edit' );
		await reloadCurrentDocument();
	},
	isOpenPreviousElement: true,
} );

function DesignSystemPanelRoot() {
	const { close: closePanel } = usePanelActions();
	return <DesignSystemPanelContent onRequestClose={ closePanel } />;
}
