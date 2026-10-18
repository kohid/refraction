import { injectIntoTop } from '@refraction/editor';
import { __registerSlice } from '@refraction/store';

import FloatingPanelsHost from './components/internal/host';
import { slice } from './store/slice';
import { sync } from './sync';

export function init() {
	sync();

	__registerSlice( slice );

	injectIntoTop( { id: 'floating-panels', component: FloatingPanelsHost } );
}
