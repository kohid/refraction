import { createPropUtils } from '@refraction/editor-props';
import { z } from '@refraction/schema';

export const componentOverridablePropTypeUtil = createPropUtils(
	'overridable',
	z.object( {
		override_key: z.string(),
		origin_value: z
			.object( {
				$$type: z.string(),
				value: z.unknown(),
			} )
			.nullable(),
	} )
);

export type ComponentOverridableProp = z.infer< typeof componentOverridablePropTypeUtil.schema >;

export type ComponentOverridablePropValue = ComponentOverridableProp[ 'value' ];
