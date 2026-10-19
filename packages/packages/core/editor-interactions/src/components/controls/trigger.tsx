import * as React from 'react';
import { __ } from '@wordpress/i18n';

import { type FieldProps } from '../../types';
import { PromotionSelect } from '../../ui/promotion-select';
import { DEFAULT_VALUES } from '../interaction-details';

const TRACKING_DATA = { target_name: 'interactions_trigger', location_l2: 'interactions' } as const;

export const TRIGGER_OPTIONS = {
	load: __( 'Page load', 'refraction' ),
	scrollIn: __( 'Scroll into view', 'refraction' ),
	scrollOn: __( 'While scrolling', 'refraction' ),
	hover: __( 'On hover', 'refraction' ),
	click: __( 'On click', 'refraction' ),
};

export const BASE_TRIGGERS: string[] = [ 'load', 'scrollIn' ];

export function Trigger( { value, onChange }: FieldProps ) {
	const baseOptions = Object.fromEntries(
		Object.entries( TRIGGER_OPTIONS ).filter( ( [ key ] ) => BASE_TRIGGERS.includes( key ) )
	);

	const disabledOptions = Object.fromEntries(
		Object.entries( TRIGGER_OPTIONS ).filter( ( [ key ] ) => ! BASE_TRIGGERS.includes( key ) )
	);

	return (
		<PromotionSelect
			value={ value in baseOptions ? value : DEFAULT_VALUES.trigger }
			onChange={ onChange }
			baseOptions={ baseOptions }
			disabledOptions={ disabledOptions }
			promotionLabel={ __( 'PRO triggers', 'refraction' ) }
			promotionContent={ __( 'Upgrade to unlock more interactions triggers.', 'refraction' ) }
			upgradeUrl="https://github.com/kohid/refraction#readme"
			trackingData={ TRACKING_DATA }
		/>
	);
}
