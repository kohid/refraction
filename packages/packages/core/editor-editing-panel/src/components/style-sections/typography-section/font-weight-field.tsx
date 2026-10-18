import * as React from 'react';
import { SelectControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

const FONT_WEIGHT_LABEL = __( 'Font weight', 'refraction' );

const fontWeightOptions = [
	{ value: '100', label: __( '100 - Thin', 'refraction' ) },
	{ value: '200', label: __( '200 - Extra light', 'refraction' ) },
	{ value: '300', label: __( '300 - Light', 'refraction' ) },
	{ value: '400', label: __( '400 - Normal', 'refraction' ) },
	{ value: '500', label: __( '500 - Medium', 'refraction' ) },
	{ value: '600', label: __( '600 - Semi bold', 'refraction' ) },
	{ value: '700', label: __( '700 - Bold', 'refraction' ) },
	{ value: '800', label: __( '800 - Extra bold', 'refraction' ) },
	{ value: '900', label: __( '900 - Black', 'refraction' ) },
];

export const FontWeightField = () => {
	return (
		<StylesField bind="font-weight" propDisplayName={ FONT_WEIGHT_LABEL }>
			<StylesFieldLayout label={ FONT_WEIGHT_LABEL }>
				<SelectControl options={ fontWeightOptions } />
			</StylesFieldLayout>
		</StylesField>
	);
};
