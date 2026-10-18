import * as React from 'react';
import { SelectControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

const POSITION_LABEL = __( 'Position', 'refraction' );

const positionOptions = [
	{ label: __( 'Static', 'refraction' ), value: 'static' },
	{ label: __( 'Relative', 'refraction' ), value: 'relative' },
	{ label: __( 'Absolute', 'refraction' ), value: 'absolute' },
	{ label: __( 'Fixed', 'refraction' ), value: 'fixed' },
	{ label: __( 'Sticky', 'refraction' ), value: 'sticky' },
];

export const PositionField = () => {
	return (
		<StylesField bind="position" propDisplayName={ POSITION_LABEL }>
			<StylesFieldLayout label={ POSITION_LABEL }>
				<SelectControl options={ positionOptions } />
			</StylesFieldLayout>
		</StylesField>
	);
};
