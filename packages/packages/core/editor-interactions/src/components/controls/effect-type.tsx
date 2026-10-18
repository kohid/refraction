import * as React from 'react';
import { type ToggleButtonGroupItem, ToggleButtonGroupUi } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { type FieldProps } from '../../types';

type EffectType = 'in' | 'out';

export function EffectType( { value, onChange }: FieldProps ) {
	const options: ToggleButtonGroupItem< EffectType >[] = [
		{
			value: 'in',
			label: __( 'In', 'refraction' ),
			renderContent: () => __( 'In', 'refraction' ),
			showTooltip: true,
		},
		{
			value: 'out',
			label: __( 'Out', 'refraction' ),
			renderContent: () => __( 'Out', 'refraction' ),
			showTooltip: true,
		},
	];

	return <ToggleButtonGroupUi items={ options } exclusive onChange={ onChange } value={ value } />;
}
