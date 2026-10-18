import { type V1ElementModelProps } from '@refraction/editor-elements';

import { COMPONENT_WIDGET_TYPE } from '../consts';

export function isComponentInstance( elementModel: Partial< V1ElementModelProps > ) {
	return [ elementModel.widgetType, elementModel.elType ].includes( COMPONENT_WIDGET_TYPE );
}
