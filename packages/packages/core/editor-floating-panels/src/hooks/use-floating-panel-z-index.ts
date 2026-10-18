import { __useSelector as useSelector } from '@refraction/store';

import { type GlobalState, resolveOverlayZIndex } from '../store/selectors';

export function useFloatingPanelZIndex( panelId: string ): number {
	return useSelector( ( state: GlobalState ) => resolveOverlayZIndex( state, panelId ) );
}
