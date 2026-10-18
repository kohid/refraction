import { injectIntoLogic } from '@refraction/editor';
import { registerElementPanelDefaults } from '@refraction/editor-editing-panel';
import { stylesRepository } from '@refraction/editor-styles-repository';
import { __registerSlice as registerSlice } from '@refraction/store';

import { GlobalStylesImportListener } from './components/global-styles-import-listener';
import { PopulateStore } from './components/populate-store';
import { defaultStylesStylesProvider } from './default-styles-provider';
import { slice } from './store';

export function init() {
	registerSlice( slice );

	registerElementPanelDefaults( 'default-style', {
		defaultTab: 'style',
		defaultSectionsExpanded: {
			style: [],
		},
	} );

	stylesRepository.register( defaultStylesStylesProvider );

	injectIntoLogic( {
		id: 'default-styles-import-listener',
		component: GlobalStylesImportListener,
	} );

	injectIntoLogic( {
		id: 'default-styles-populate-store',
		component: PopulateStore,
	} );
}
