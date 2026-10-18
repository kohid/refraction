import { createPanel } from '@refraction/editor-panels';

import { EditingPanel } from './components/editing-panel';

export const { panel, usePanelActions, usePanelStatus } = createPanel( {
	id: 'editing-panel',
	component: EditingPanel,
} );
