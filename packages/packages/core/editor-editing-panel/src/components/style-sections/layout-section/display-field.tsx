import * as React from 'react';
import { type ToggleButtonGroupItem, ToggleControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { useStylesInheritanceChain } from '../../../contexts/styles-inheritance-context';
import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

type Displays = 'block' | 'flex' | 'grid' | 'inline-block' | 'inline-flex' | 'none';

const DISPLAY_LABEL = __( 'Display', 'refraction' );

const displayFieldItems: ToggleButtonGroupItem< Displays >[] = [
	{
		value: 'block',
		renderContent: () => __( 'Block', 'refraction' ),
		label: __( 'Block', 'refraction' ),
		showTooltip: true,
	},
	{
		value: 'flex',
		renderContent: () => __( 'Flex', 'refraction' ),
		label: __( 'Flex', 'refraction' ),
		showTooltip: true,
	},
	{
		value: 'grid',
		renderContent: () => __( 'Grid', 'refraction' ),
		label: __( 'Grid', 'refraction' ),
		showTooltip: true,
	},
	{
		value: 'none',
		renderContent: () => __( 'None', 'refraction' ),
		label: __( 'None', 'refraction' ),
		showTooltip: true,
	},
	{
		value: 'inline-block',
		renderContent: () => __( 'In-blk', 'refraction' ),
		label: __( 'Inline-block', 'refraction' ),
		showTooltip: true,
	},
	{
		value: 'inline-flex',
		renderContent: () => __( 'In-flx', 'refraction' ),
		label: __( 'Inline-flex', 'refraction' ),
		showTooltip: true,
	},
];

export const DisplayField = () => {
	const placeholder = useDisplayPlaceholderValue();

	return (
		<StylesField bind="display" propDisplayName={ DISPLAY_LABEL } placeholder={ placeholder }>
			<StylesFieldLayout label={ DISPLAY_LABEL } direction="column">
				<ToggleControl options={ displayFieldItems } maxItems={ 4 } fullWidth={ true } />
			</StylesFieldLayout>
		</StylesField>
	);
};

// TODO - placing this logic deliberately here, and will be removed once applied automatically to all style fields as part of ED-18491
export const useDisplayPlaceholderValue = () => useStylesInheritanceChain( [ 'display' ] )[ 0 ]?.value ?? undefined;
