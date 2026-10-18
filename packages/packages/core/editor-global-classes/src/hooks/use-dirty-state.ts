import { __useSelector as useSelector } from '@refraction/store';

import { selectIsDirty } from '../store';

export const useDirtyState = () => {
	return useSelector( selectIsDirty );
};
