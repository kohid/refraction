import * as React from 'react';
import { SelectControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

const OBJECT_FIT_LABEL = __( 'Object fit', 'refraction' );

const positionOptions = [
	{ label: __( 'Fill', 'refraction' ), value: 'fill' },
	{ label: __( 'Cover', 'refraction' ), value: 'cover' },
	{ label: __( 'Contain', 'refraction' ), value: 'contain' },
	{ label: __( 'None', 'refraction' ), value: 'none' },
	{ label: __( 'Scale down', 'refraction' ), value: 'scale-down' },
];

export const ObjectFitField = () => {
	return (
		<StylesField bind="object-fit" propDisplayName={ OBJECT_FIT_LABEL }>
			<StylesFieldLayout label={ OBJECT_FIT_LABEL }>
				<SelectControl options={ positionOptions } />
			</StylesFieldLayout>
		</StylesField>
	);
};
