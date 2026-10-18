import { __useSelector as useSelector } from '@refraction/store';

import { selectComponents, selectLoadIsPending } from '../store/store';

export const useComponents = () => {
	const components = useSelector( selectComponents );
	const isLoading = useSelector( selectLoadIsPending );

	return { components, isLoading };
};
