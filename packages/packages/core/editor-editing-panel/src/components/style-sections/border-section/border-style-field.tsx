import * as React from 'react';
import { SelectControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

const BORDER_TYPE_LABEL = __( 'Border type', 'refraction' );

const borderStyles = [
	{ value: 'none', label: __( 'None', 'refraction' ) },
	{ value: 'solid', label: __( 'Solid', 'refraction' ) },
	{ value: 'dashed', label: __( 'Dashed', 'refraction' ) },
	{ value: 'dotted', label: __( 'Dotted', 'refraction' ) },
	{ value: 'double', label: __( 'Double', 'refraction' ) },
	{ value: 'groove', label: __( 'Groove', 'refraction' ) },
	{ value: 'ridge', label: __( 'Ridge', 'refraction' ) },
	{ value: 'inset', label: __( 'Inset', 'refraction' ) },
	{ value: 'outset', label: __( 'Outset', 'refraction' ) },
];

export const BorderStyleField = () => (
	<StylesField bind="border-style" propDisplayName={ BORDER_TYPE_LABEL }>
		<StylesFieldLayout label={ BORDER_TYPE_LABEL }>
			<SelectControl options={ borderStyles } />
		</StylesFieldLayout>
	</StylesField>
);
