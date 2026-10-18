import { injectIntoLogic } from '@refraction/editor';
import { toolsMenu } from '@refraction/editor-app-bar';
import { registerPanel } from '@refraction/editor-panels';

import { DesignSystemEntrypoints } from './components/design-system-entrypoints';
import { panel } from './design-system-panel';
import { useOpenDesignSystemToolbar } from './use-open-design-system-toolbar';

export function init() {
	registerPanel( panel );

	injectIntoLogic( {
		id: 'design-system-entrypoints',
		component: DesignSystemEntrypoints,
	} );

	toolsMenu.registerToggleAction( {
		id: 'open-design-system-toolbar',
		priority: 4,
		useProps: useOpenDesignSystemToolbar,
	} );
}
