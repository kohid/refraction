import { type V1ElementData } from '@refraction/editor-elements';

export const ELEMENT_ADDED_EVENT = 'refraction/canvas/element-added';

export type ElementAddedEvent = {
	element: V1ElementData;
	executedBy: 'mcp_tool' | 'user';
};
