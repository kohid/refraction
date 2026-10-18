import { useMemo } from 'react';
import { useBreakpointsMap } from '@refraction/editor-responsive';

import { type PropsResolver } from '../renderers/create-props-resolver';
import { createStylesRenderer } from '../renderers/create-styles-renderer';

const SELECTOR_PREFIX = '.refraction';

export function useStyleRenderer( resolve: PropsResolver ) {
	const breakpoints = useBreakpointsMap();

	return useMemo( () => {
		return createStylesRenderer( {
			selectorPrefix: SELECTOR_PREFIX,
			breakpoints,
			resolve,
		} );
	}, [ resolve, breakpoints ] );
}
