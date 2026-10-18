import { createPropUtils } from '@refraction/editor-props';
import { z } from '@refraction/schema';

export const customSizeVariablePropTypeUtil = createPropUtils( 'global-custom-size-variable', z.string() );
