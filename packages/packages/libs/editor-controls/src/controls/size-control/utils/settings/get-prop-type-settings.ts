import { type PropType } from '@refraction/editor-props';

import { type SizeUnit } from '../../types';

type Settings = {
	available_units?: SizeUnit[];
	default_unit?: SizeUnit;
};

export const getPropTypeSettings = ( propType: PropType ) => {
	return propType.settings as Settings;
};
