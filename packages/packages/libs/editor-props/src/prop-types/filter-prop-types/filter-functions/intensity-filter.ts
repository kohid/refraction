import { z } from '@refraction/schema';

import { createPropUtils } from '../../../utils/create-prop-utils';
import { unknownChildrenSchema } from '../../utils';

export const intensityFilterPropTypeUtil = createPropUtils(
	'intensity',
	z.strictObject( {
		size: unknownChildrenSchema,
	} )
);
