import { useCallback } from 'react';
import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';

import { type BreakpointId } from '../types';

export function useActivateBreakpoint() {
	return useCallback( ( breakpoint: BreakpointId ) => {
		return runCommand( 'panel/change-device-mode', { device: breakpoint } );
	}, [] );
}
