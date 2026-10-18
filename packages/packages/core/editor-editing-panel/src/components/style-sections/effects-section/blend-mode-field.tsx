import * as React from 'react';
import { SelectControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

const BLEND_MODE_LABEL = __( 'Blend mode', 'refraction' );

const blendModeOptions = [
	{ label: __( 'Normal', 'refraction' ), value: 'normal' },
	{ label: __( 'Multiply', 'refraction' ), value: 'multiply' },
	{ label: __( 'Screen', 'refraction' ), value: 'screen' },
	{ label: __( 'Overlay', 'refraction' ), value: 'overlay' },
	{ label: __( 'Darken', 'refraction' ), value: 'darken' },
	{ label: __( 'Lighten', 'refraction' ), value: 'lighten' },
	{ label: __( 'Color dodge', 'refraction' ), value: 'color-dodge' },
	{ label: __( 'Color burn', 'refraction' ), value: 'color-burn' },
	{ label: __( 'Saturation', 'refraction' ), value: 'saturation' },
	{ label: __( 'Color', 'refraction' ), value: 'color' },
	{ label: __( 'Difference', 'refraction' ), value: 'difference' },
	{ label: __( 'Exclusion', 'refraction' ), value: 'exclusion' },
	{ label: __( 'Hue', 'refraction' ), value: 'hue' },
	{ label: __( 'Luminosity', 'refraction' ), value: 'luminosity' },
	{ label: __( 'Soft light', 'refraction' ), value: 'soft-light' },
	{ label: __( 'Hard light', 'refraction' ), value: 'hard-light' },
];

export const BlendModeField = () => {
	return (
		<StylesField bind="mix-blend-mode" propDisplayName={ BLEND_MODE_LABEL }>
			<StylesFieldLayout label={ BLEND_MODE_LABEL }>
				<SelectControl options={ blendModeOptions } />
			</StylesFieldLayout>
		</StylesField>
	);
};
