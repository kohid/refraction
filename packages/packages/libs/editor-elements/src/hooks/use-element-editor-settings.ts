import { __privateUseListenTo as useListenTo, windowEvent } from '@refraction/editor-v1-adapters';

import { getElementEditorSettings } from '../sync/get-element-editor-settings';
import { type ElementID } from '../types';

export const useElementEditorSettings = ( elementId: ElementID ) => {
	return useListenTo(
		windowEvent( 'refraction/element/update_editor_settings' ),
		() => getElementEditorSettings( elementId ),
		[ elementId ]
	);
};
