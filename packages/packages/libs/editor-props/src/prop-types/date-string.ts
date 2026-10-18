import { z } from '@refraction/schema';

import { createPropUtils } from '../utils/create-prop-utils';

export const dateStringPropTypeUtil = createPropUtils( 'date-string', z.string() );

export type DateStringPropValue = z.infer< typeof dateStringPropTypeUtil.schema >;
