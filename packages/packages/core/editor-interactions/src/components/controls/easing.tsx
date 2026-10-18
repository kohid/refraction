import * as React from 'react';
import { __ } from '@wordpress/i18n';

import { type FieldProps } from '../../types';
import { PromotionSelect } from '../../ui/promotion-select';
import { DEFAULT_VALUES } from '../interaction-details';

const TRACKING_DATA = { target_name: 'interactions_easing', location_l2: 'interactions' } as const;

export const EASING_OPTIONS = {
	easeIn: __( 'Ease In', 'refraction' ),
	easeInOut: __( 'Ease In Out', 'refraction' ),
	easeOut: __( 'Ease Out', 'refraction' ),
	backIn: __( 'Back In', 'refraction' ),
	backInOut: __( 'Back In Out', 'refraction' ),
	backOut: __( 'Back Out', 'refraction' ),
	linear: __( 'Linear', 'refraction' ),
};

export const BASE_EASINGS: string[] = [ 'easeIn' ];

export function Easing( {}: FieldProps ) {
	const baseOptions = Object.fromEntries(
		Object.entries( EASING_OPTIONS ).filter( ( [ key ] ) => BASE_EASINGS.includes( key ) )
	);

	const disabledOptions = Object.fromEntries(
		Object.entries( EASING_OPTIONS ).filter( ( [ key ] ) => ! BASE_EASINGS.includes( key ) )
	);

	return (
		<PromotionSelect
			value={ DEFAULT_VALUES.easing }
			baseOptions={ baseOptions }
			disabledOptions={ disabledOptions }
			promotionContent={ __( 'Upgrade to control the smoothness of the interaction.', 'refraction' ) }
			upgradeUrl="https://go.elementor.com/go-pro-interactions-easing-modal/"
			trackingData={ TRACKING_DATA }
		/>
	);
}
