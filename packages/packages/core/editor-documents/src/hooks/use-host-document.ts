import { __useSelector as useSelector } from '@refraction/store';

import { selectHostDocument } from '../store/selectors';

export default function useHostDocument() {
	return useSelector( selectHostDocument );
}
