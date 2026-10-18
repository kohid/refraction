import { createPropUtils } from '@refraction/editor-props';
import { z } from '@refraction/schema';

export const fontVariablePropTypeUtil = createPropUtils( 'global-font-variable', z.string() );
