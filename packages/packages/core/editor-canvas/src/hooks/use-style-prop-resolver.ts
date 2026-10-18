import { useMemo } from 'react';
import { getStylesSchema } from '@refraction/editor-styles';
import { enqueueFont } from '@refraction/editor-v1-adapters';

import { createPropsResolver } from '../renderers/create-props-resolver';
import { maybeEnqueueFontFromStyleProp } from '../renderers/enqueue-font-from-style-prop';
import { styleTransformersRegistry } from '../style-transformers-registry';

export function useStylePropResolver() {
	return useMemo( () => {
		return createPropsResolver( {
			transformers: styleTransformersRegistry,
			schema: getStylesSchema(),
			onPropResolve: ( { propValue, propType } ) => {
				maybeEnqueueFontFromStyleProp( propType, propValue, enqueueFont );
			},
		} );
	}, [] );
}
