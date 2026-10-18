import * as React from 'react';
import { type ToggleButtonGroupItem, ToggleControl } from '@refraction/editor-controls';
import { ItalicIcon, MinusIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

type FontStyle = 'normal' | 'italic';

const FONT_STYLE_LABEL = __( 'Font style', 'refraction' );

const options: ToggleButtonGroupItem< FontStyle >[] = [
	{
		value: 'normal',
		label: __( 'Normal', 'refraction' ),
		renderContent: ( { size } ) => <MinusIcon fontSize={ size } />,
		showTooltip: true,
	},
	{
		value: 'italic',
		label: __( 'Italic', 'refraction' ),
		renderContent: ( { size } ) => <ItalicIcon fontSize={ size } />,
		showTooltip: true,
	},
];

export const FontStyleField = () => {
	return (
		<StylesField bind="font-style" propDisplayName={ FONT_STYLE_LABEL }>
			<StylesFieldLayout label={ FONT_STYLE_LABEL }>
				<ToggleControl options={ options } />
			</StylesFieldLayout>
		</StylesField>
	);
};
