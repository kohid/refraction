import { __useSelector as useSelector } from '@refraction/store';

import { selectTemplates } from './store';

export function useLoadedTemplates() {
	return useSelector( selectTemplates );
}
