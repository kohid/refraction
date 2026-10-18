import { __useSelector as useSelector } from '@refraction/store';

import { selectOrderedClasses } from '../store';

export const useOrderedClasses = () => {
	return useSelector( selectOrderedClasses );
};
