import * as React from 'react';
import { type ToggleButtonGroupItem, ToggleControl } from '@refraction/editor-controls';
import { AlignCenterIcon, AlignJustifiedIcon, AlignLeftIcon, AlignRightIcon } from '@elementor/icons';
import { withDirection } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { UiProviders } from '../../../styles-inheritance/components/ui-providers';
import { StylesFieldLayout } from '../../styles-field-layout';

type Alignments = 'start' | 'center' | 'end' | 'justify';

const TEXT_ALIGNMENT_LABEL = __( 'Text align', 'refraction' );

const AlignStartIcon = withDirection( AlignLeftIcon );
const AlignEndIcon = withDirection( AlignRightIcon );

const options: ToggleButtonGroupItem< Alignments >[] = [
	{
		value: 'start',
		label: __( 'Start', 'refraction' ),
		renderContent: ( { size } ) => <AlignStartIcon fontSize={ size } />,
		showTooltip: true,
	},
	{
		value: 'center',
		label: __( 'Center', 'refraction' ),
		renderContent: ( { size } ) => <AlignCenterIcon fontSize={ size } />,
		showTooltip: true,
	},
	{
		value: 'end',
		label: __( 'End', 'refraction' ),
		renderContent: ( { size } ) => <AlignEndIcon fontSize={ size } />,
		showTooltip: true,
	},
	{
		value: 'justify',
		label: __( 'Justify', 'refraction' ),
		renderContent: ( { size } ) => <AlignJustifiedIcon fontSize={ size } />,
		showTooltip: true,
	},
];

export const TextAlignmentField = () => {
	return (
		<StylesField bind="text-align" propDisplayName={ TEXT_ALIGNMENT_LABEL }>
			<UiProviders>
				<StylesFieldLayout label={ TEXT_ALIGNMENT_LABEL }>
					<ToggleControl options={ options } />
				</StylesFieldLayout>
			</UiProviders>
		</StylesField>
	);
};
