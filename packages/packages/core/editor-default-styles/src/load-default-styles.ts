import { __dispatch as dispatch } from '@refraction/store';

import { apiClient } from './api';
import { slice } from './store';

export async function loadDefaultStyles() {
	try {
		const response = await apiClient.all();

		const items = response.data.data;

		dispatch(
			slice.actions.load( {
				data: items,
			} )
		);
	} catch {}
}
