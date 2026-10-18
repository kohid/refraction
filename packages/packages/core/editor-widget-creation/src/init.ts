import { injectIntoTop } from '@refraction/editor';

import { CreateWidget } from './components/create-widget';

export function init() {
	injectIntoTop( {
		id: 'create-widget',
		component: CreateWidget,
	} );
}
