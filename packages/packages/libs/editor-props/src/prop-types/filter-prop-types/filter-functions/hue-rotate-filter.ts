import { z } from '@refraction/schema';

import { createPropUtils } from '../../../utils/create-prop-utils';
import { unknownChildrenSchema } from '../../utils';

export const hueRotateFilterPropTypeUtil = createPropUtils(
	'hue-rotate',
	z.strictObject( {
		size: unknownChildrenSchema,
	} )
);
