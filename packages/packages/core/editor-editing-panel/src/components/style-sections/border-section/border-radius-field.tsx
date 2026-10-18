import * as React from 'react';
import { type EqualUnequalItems, EqualUnequalSizesControl } from '@refraction/editor-controls';
import { borderRadiusPropTypeUtil } from '@refraction/editor-props';
import {
	BorderCornersIcon,
	RadiusBottomLeftIcon,
	RadiusBottomRightIcon,
	RadiusTopLeftIcon,
	RadiusTopRightIcon,
} from '@elementor/icons';
import { withDirection } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { useDirection } from '../../../hooks/use-direction';
import { UiProviders } from '../../../styles-inheritance/components/ui-providers';

const BORDER_RADIUS_LABEL = __( 'Border radius', 'refraction' );

const StartStartIcon = withDirection( RadiusTopLeftIcon );
const StartEndIcon = withDirection( RadiusTopRightIcon );
const EndStartIcon = withDirection( RadiusBottomLeftIcon );
const EndEndIcon = withDirection( RadiusBottomRightIcon );

const getStartStartLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Top right', 'refraction' ) : __( 'Top left', 'refraction' );

const getStartStartAriaLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Border top right radius', 'refraction' ) : __( 'Border top left radius', 'refraction' );

const getStartEndLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Top left', 'refraction' ) : __( 'Top right', 'refraction' );

const getStartEndAriaLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Border top left radius', 'refraction' ) : __( 'Border top right radius', 'refraction' );

const getEndStartLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Bottom right', 'refraction' ) : __( 'Bottom left', 'refraction' );

const getEndStartAriaLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Border bottom right radius', 'refraction' ) : __( 'Border bottom left radius', 'refraction' );

const getEndEndLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Bottom left', 'refraction' ) : __( 'Bottom right', 'refraction' );

const getEndEndAriaLabel = ( isSiteRtl: boolean ) =>
	isSiteRtl ? __( 'Border bottom left radius', 'refraction' ) : __( 'Border bottom right radius', 'refraction' );

const getCorners = ( isSiteRtl: boolean ): EqualUnequalItems => [
	{
		label: getStartStartLabel( isSiteRtl ),
		ariaLabel: getStartStartAriaLabel( isSiteRtl ),
		icon: <StartStartIcon fontSize={ 'tiny' } />,
		bind: 'start-start',
	},
	{
		label: getStartEndLabel( isSiteRtl ),
		ariaLabel: getStartEndAriaLabel( isSiteRtl ),
		icon: <StartEndIcon fontSize={ 'tiny' } />,
		bind: 'start-end',
	},
	{
		label: getEndStartLabel( isSiteRtl ),
		ariaLabel: getEndStartAriaLabel( isSiteRtl ),
		icon: <EndStartIcon fontSize={ 'tiny' } />,
		bind: 'end-start',
	},
	{
		label: getEndEndLabel( isSiteRtl ),
		ariaLabel: getEndEndAriaLabel( isSiteRtl ),
		icon: <EndEndIcon fontSize={ 'tiny' } />,
		bind: 'end-end',
	},
];

export const BorderRadiusField = () => {
	const { isSiteRtl } = useDirection();

	return (
		<UiProviders>
			<StylesField bind={ 'border-radius' } propDisplayName={ BORDER_RADIUS_LABEL }>
				<EqualUnequalSizesControl
					items={ getCorners( isSiteRtl ) }
					label={ BORDER_RADIUS_LABEL }
					icon={ <BorderCornersIcon fontSize={ 'tiny' } /> }
					tooltipLabel={ __( 'Adjust corners', 'refraction' ) }
					multiSizePropTypeUtil={ borderRadiusPropTypeUtil }
				/>
			</StylesField>
		</UiProviders>
	);
};
