import { type StyleDefinitionID } from '@refraction/editor-styles';
import { __useSelector as useSelector, type SliceState } from '@refraction/store';

import { selectClass, type slice } from '../store';

export const useCssClassById = ( id: StyleDefinitionID ) => {
	return useSelector( ( state: SliceState< typeof slice > ) => selectClass( state, id ) );
};
