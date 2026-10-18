import { __useSelector as useSelector } from '@refraction/store';

import { selectOrder } from '../store';

export const useClassesOrder = () => {
	return useSelector( selectOrder );
};
