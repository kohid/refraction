import { type StyleDefinitionID, type StyleDefinitionsMap, type StyleVariables } from '@refraction/editor-styles';

export const GLOBAL_STYLES_IMPORTED_EVENT = 'refraction/global-styles/imported';

export type ImportedGlobalStylesPayload = {
	global_variables?: { data: StyleVariables };
	global_classes?: { added_items: StyleDefinitionsMap; added_items_order: StyleDefinitionID[] };
};
