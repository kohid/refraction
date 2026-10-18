import { type StyleDefinitionState } from '@refraction/editor-styles';
import { __ } from '@wordpress/i18n';

import { type StyleDefinitionStateWithNormal } from '../../styles-inheritance/types';

export type PseudoStateOption = {
	key: StyleDefinitionStateWithNormal;
	value: StyleDefinitionState | null;
	label: string;
};

export const DEFAULT_PSEUDO_STATES: PseudoStateOption[] = [
	{ key: 'normal', value: null, label: __( 'normal', 'refraction' ) },
	{ key: 'hover', value: 'hover', label: __( 'hover', 'refraction' ) },
	{ key: 'focus', value: 'focus', label: __( 'focus', 'refraction' ) },
	{ key: 'active', value: 'active', label: __( 'active', 'refraction' ) },
];
