import { settingsTransformersRegistry, styleTransformersRegistry } from '@refraction/editor-canvas';
import {
	type ControlComponent,
	injectIntoRepeaterItemIcon,
	injectIntoRepeaterItemLabel,
	registerControlReplacement,
} from '@refraction/editor-controls';
import { type BackgroundOverlayPropType, type PropValue } from '@refraction/editor-props';
import { type InjectedComponent } from '@refraction/locations';
import { controlActionsMenu } from '@refraction/menus';

import {
	BackgroundControlDynamicTagIcon,
	BackgroundControlDynamicTagLabel,
} from './components/background-control-dynamic-tag';
import { DynamicSelectionControl } from './components/dynamic-selection-control';
import { dynamicTransformer } from './dynamic-transformer';
import { usePropDynamicAction } from './hooks/use-prop-dynamic-action';
import { isDynamicPropValue } from './utils';

const { registerPopoverAction } = controlActionsMenu;

export const init = () => {
	registerControlReplacement( {
		component: DynamicSelectionControl as ControlComponent,
		condition: ( { value } ) => isDynamicPropValue( value ),
	} );

	injectIntoRepeaterItemLabel( {
		id: 'dynamic-background-image',
		condition: ( { value } ) =>
			isDynamicPropValue( ( value as BackgroundOverlayPropType ).value?.image?.value?.src ),
		component: BackgroundControlDynamicTagLabel as InjectedComponent< { value: PropValue } >,
	} );

	injectIntoRepeaterItemIcon( {
		id: 'dynamic-background-image',
		condition: ( { value } ) =>
			isDynamicPropValue( ( value as BackgroundOverlayPropType ).value?.image?.value?.src ),
		component: BackgroundControlDynamicTagIcon,
	} );

	registerPopoverAction( {
		id: 'dynamic-tags',
		priority: 20,
		useProps: usePropDynamicAction,
	} );

	styleTransformersRegistry.register( 'dynamic', dynamicTransformer );
	settingsTransformersRegistry.register( 'dynamic', dynamicTransformer );
};
