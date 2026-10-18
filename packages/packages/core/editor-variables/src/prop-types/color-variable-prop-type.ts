import { createPropUtils } from '@refraction/editor-props';
import { z } from '@refraction/schema';

export const colorVariablePropTypeUtil = createPropUtils( 'global-color-variable', z.string() );
