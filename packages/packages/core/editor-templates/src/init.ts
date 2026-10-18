import { injectIntoLogic } from '@refraction/editor';
import { stylesRepository } from '@refraction/editor-styles-repository';
import { registerDataHook } from '@refraction/editor-v1-adapters';
import { __registerSlice as registerSlice } from '@refraction/store';

import { loadTemplates, unloadTemplates } from './load-templates';
import { RenderTemplateStyles } from './render-template-styles';
import { slice } from './store';
import { clearTemplatesStyles, templatesStylesProvider } from './templates-styles-provider';
import { isHandlingTemplateStyles } from './utils';

export function init() {
	if ( ! isHandlingTemplateStyles() ) {
		return;
	}

	registerSlice( slice );
	stylesRepository.register( templatesStylesProvider );

	registerDataHook( 'after', 'editor/documents/attach-preview', async () => {
		unloadTemplates();
		clearTemplatesStyles();

		await loadTemplates();
	} );

	injectIntoLogic( {
		id: 'templates-styles',
		component: RenderTemplateStyles,
	} );
}
