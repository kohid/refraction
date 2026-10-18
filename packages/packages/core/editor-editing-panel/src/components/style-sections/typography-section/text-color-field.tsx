import * as React from 'react';
import { ColorControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

const TEXT_COLOR_LABEL = __( 'Text color', 'refraction' );

export const TextColorField = () => {
	return (
		<StylesField bind="color" propDisplayName={ TEXT_COLOR_LABEL }>
			<StylesFieldLayout label={ TEXT_COLOR_LABEL }>
				<ColorControl id="text-color-control" />
			</StylesFieldLayout>
		</StylesField>
	);
};
