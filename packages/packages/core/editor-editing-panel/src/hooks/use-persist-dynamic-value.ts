import { type PropValue } from '@refraction/editor-props';
import { useSessionStorage } from '@refraction/session';

import { useElement } from '../contexts/element-context';
import { type DynamicPropValue } from '../dynamics/types';

export const usePersistDynamicValue = < T extends DynamicPropValue | PropValue >( propKey: string ) => {
	const { element } = useElement();
	const prefixedKey = `dynamic/non-dynamic-values-history/${ element.id }/${ propKey }`;
	return useSessionStorage< T >( prefixedKey );
};
