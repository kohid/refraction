import { __privateUseListenTo as useListenTo, windowEvent } from '@refraction/editor-v1-adapters';

import { type BreakpointId, type ExtendedWindow } from '../types';

export function useActiveBreakpoint(): BreakpointId | null {
	return useListenTo( windowEvent( 'refraction/device-mode/change' ), getActiveBreakpoint );
}

function getActiveBreakpoint() {
	const extendedWindow = window as unknown as ExtendedWindow;

	return extendedWindow.refraction?.channels?.deviceMode?.request?.( 'currentMode' ) || null;
}
