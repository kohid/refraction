import { __privateUseListenTo as useListenTo, commandEndEvent } from '@refraction/editor-v1-adapters';

import { type ExtendedWindow } from '../sync/types';

export function useParentElement( elementId: string | null ) {
	return useListenTo(
		[ commandEndEvent( 'document/elements/create' ) ],
		() => {
			if ( ! elementId ) {
				return null;
			}

			const extendedWindow = window as unknown as ExtendedWindow;
			const element = extendedWindow?.refraction?.getContainer?.( elementId );
			if ( ! element ) {
				return null;
			}

			return element.parent;
		},
		[ elementId ]
	);
}
