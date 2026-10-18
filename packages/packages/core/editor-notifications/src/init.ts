import { injectIntoTop } from '@refraction/editor';
import { __registerSlice as registerSlice } from '@refraction/store';

import Wrapper from './components/notifications';
import { notificationsSlice } from './slice';

export function init() {
	registerSlice( notificationsSlice );
	injectIntoTop( {
		id: 'notifications',
		component: Wrapper,
	} );
}
