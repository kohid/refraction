import * as React from 'react';
import { type EqualUnequalItems, EqualUnequalSizesControl } from '@refraction/editor-controls';
import { borderWidthPropTypeUtil } from '@refraction/editor-props';
import { SideAllIcon, SideBottomIcon, SideLeftIcon, SideRightIcon, SideTopIcon } from '@elementor/icons';
import { withDirection } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { useDirection } from '../../../hooks/use-direction';

const BORDER_WIDTH_LABEL = __( 'Border width', 'refraction' );

const InlineStartIcon = withDirection( SideRightIcon );
const InlineEndIcon = withDirection( SideLeftIcon );

const getEdges = ( isSiteRtl: boolean ): EqualUnequalItems => [
	{
		label: __( 'Top', 'refraction' ),
		ariaLabel: __( 'Border top width', 'refraction' ),
		icon: <SideTopIcon fontSize={ 'tiny' } />,
		bind: 'block-start',
	},
	{
		label: isSiteRtl ? __( 'Left', 'refraction' ) : __( 'Right', 'refraction' ),
		ariaLabel: isSiteRtl ? __( 'Border left width', 'refraction' ) : __( 'Border right width', 'refraction' ),
		icon: <InlineStartIcon fontSize={ 'tiny' } />,
		bind: 'inline-end',
	},
	{
		label: __( 'Bottom', 'refraction' ),
		ariaLabel: __( 'Border bottom width', 'refraction' ),
		icon: <SideBottomIcon fontSize={ 'tiny' } />,
		bind: 'block-end',
	},
	{
		label: isSiteRtl ? __( 'Right', 'refraction' ) : __( 'Left', 'refraction' ),
		ariaLabel: isSiteRtl ? __( 'Border right width', 'refraction' ) : __( 'Border left width', 'refraction' ),
		icon: <InlineEndIcon fontSize={ 'tiny' } />,
		bind: 'inline-start',
	},
];

export const BorderWidthField = () => {
	const { isSiteRtl } = useDirection();

	return (
		<StylesField bind={ 'border-width' } propDisplayName={ BORDER_WIDTH_LABEL }>
			<EqualUnequalSizesControl
				items={ getEdges( isSiteRtl ) }
				label={ BORDER_WIDTH_LABEL }
				icon={ <SideAllIcon fontSize={ 'tiny' } /> }
				tooltipLabel={ __( 'Adjust borders', 'refraction' ) }
				multiSizePropTypeUtil={ borderWidthPropTypeUtil }
			/>
		</StylesField>
	);
};
