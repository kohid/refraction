import * as React from 'react';
import { __ } from '@wordpress/i18n';

import { type FieldProps } from '../../types';
import { PromotionSelect } from '../../ui/promotion-select';
import { DEFAULT_VALUES } from '../interaction-details';

const TRACKING_DATA = { target_name: 'interactions_effect', location_l2: 'interactions' } as const;

export const EFFECT_OPTIONS = {
	fade: __( 'Fade', 'refraction' ),
	slide: __( 'Slide', 'refraction' ),
	scale: __( 'Scale', 'refraction' ),
	custom: __( 'Custom', 'refraction' ),
};

export const BASE_EFFECTS: string[] = [ 'fade', 'slide', 'scale' ];

export function Effect( { value, onChange }: FieldProps ) {
	const baseOptions = Object.fromEntries(
		Object.entries( EFFECT_OPTIONS ).filter( ( [ key ] ) => BASE_EFFECTS.includes( key ) )
	);

	const disabledOptions = Object.fromEntries(
		Object.entries( EFFECT_OPTIONS ).filter( ( [ key ] ) => ! BASE_EFFECTS.includes( key ) )
	);

	return (
		<PromotionSelect
			value={ value in baseOptions ? value : DEFAULT_VALUES.effect }
			onChange={ onChange }
			baseOptions={ baseOptions }
			disabledOptions={ disabledOptions }
			promotionLabel={ __( 'PRO effects', 'refraction' ) }
			promotionContent={ __(
				'Upgrade to further customize your animation with opacity, scale, move, rotate and more.',
				'refraction'
			) }
			upgradeUrl="https://github.com/kohid/refraction#readme"
			trackingData={ TRACKING_DATA }
		/>
	);
}
