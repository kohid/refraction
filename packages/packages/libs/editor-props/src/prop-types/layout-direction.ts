import { z } from '@refraction/schema';

import { createPropUtils } from '../utils/create-prop-utils';

export const layoutDirectionPropTypeUtil = createPropUtils(
	'layout-direction',
	z.object( {
		row: z.any(),
		column: z.any(),
	} )
);

export type LayoutDirectionPropValue = z.infer< typeof layoutDirectionPropTypeUtil.schema >;
