import { __getState as getState } from '@refraction/store';

import { selectActiveDocument } from '../store/selectors';

export function getCurrentDocument() {
	return selectActiveDocument( getState() );
}
