import { type z } from '@refraction/schema';

import { createArrayPropUtils } from '../utils/create-prop-utils';
import { stringPropTypeUtil } from './string';

export const stringArrayPropTypeUtil = createArrayPropUtils( stringPropTypeUtil.key, stringPropTypeUtil.schema );

export type StringArrayPropValue = z.infer< typeof stringArrayPropTypeUtil.schema >;
