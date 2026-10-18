import type { PropType } from '@refraction/editor-props';

import { getPropTypeSettings } from './get-prop-type-settings';

export const getDefaultUnit = ( propType: PropType ) => {
	return getPropTypeSettings( propType )?.default_unit;
};
