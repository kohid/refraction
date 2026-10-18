import * as React from 'react';
import { useBoundProp } from '@refraction/editor-controls';
import { type PopoverActionProps } from '@refraction/editor-ui';
import { DatabaseIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { DynamicSelection } from '../components/dynamic-selection';
import { supportsDynamic } from '../utils';

export const usePropDynamicAction = (): PopoverActionProps => {
	const { propType } = useBoundProp();

	const visible = !! propType && supportsDynamic( propType );

	return {
		visible,
		icon: DatabaseIcon,
		title: __( 'Dynamic tags', 'refraction' ),
		content: ( { close } ) => <DynamicSelection close={ close } />,
	};
};
