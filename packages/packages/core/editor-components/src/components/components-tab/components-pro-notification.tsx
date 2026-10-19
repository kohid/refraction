import * as React from 'react';
import { __ } from '@wordpress/i18n';

import { ComponentsUpgradeAlert } from '../components-upgrade-alert';

export const UPGRADE_URL = 'https://github.com/kohid/refraction#readme';

export function ComponentsProNotification() {
	return (
		<ComponentsUpgradeAlert
			title={ __( 'Create new components', 'refraction' ) }
			description={ __( 'Creating new components requires an active Pro subscription.', 'refraction' ) }
			upgradeUrl={ UPGRADE_URL }
		/>
	);
}
