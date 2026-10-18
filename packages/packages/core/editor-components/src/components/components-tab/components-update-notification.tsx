import * as React from 'react';
import { __ } from '@wordpress/i18n';

import { ComponentsUpdateAlert } from '../components-update-alert';

export function ComponentsUpdateNotification() {
	return (
		<ComponentsUpdateAlert
			title={ __( 'Create new Components', 'refraction' ) }
			description={ __( 'To create new components, update Refraction Pro to the latest version.', 'refraction' ) }
		/>
	);
}
