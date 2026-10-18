import { PopoverAction } from '@refraction/editor-ui';

import Action from './action';
import { createMenu } from './create-menu';

export const controlActionsMenu = createMenu( {
	components: {
		Action,
		PopoverAction,
	},
} );
