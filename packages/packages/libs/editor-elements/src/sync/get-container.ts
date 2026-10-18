import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';

import { type ExtendedWindow, type V1Element } from './types';

export function getContainer( id: string ): V1Element | null {
	const extendedWindow = window as unknown as ExtendedWindow;
	const container = extendedWindow.refraction?.getContainer?.( id );

	return container ?? null;
}

export const selectElement = ( elementId: string ) => {
	try {
		const container = getContainer( elementId );

		runCommand( 'document/elements/select', { container } );
	} catch {}
};
