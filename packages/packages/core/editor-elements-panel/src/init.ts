import { injectIntoTop } from '@refraction/editor';

import { ElementsPanelTab } from './components/elements-panel-tab';

export function init() {
	injectIntoTop( {
		id: 'editor-elements-panel-tab',
		component: ElementsPanelTab,
	} );
}
