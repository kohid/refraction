import { z } from '@refraction/schema';

import { createPropUtils } from '../utils/create-prop-utils';

export const htmlPropTypeUtil = createPropUtils( 'html', z.string().nullable() );

export type HtmlPropValue = z.infer< typeof htmlPropTypeUtil.schema >;
