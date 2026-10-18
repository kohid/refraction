import { type PropValue } from '@refraction/editor-props';
import { createLocation, createReplaceableLocation } from '@refraction/locations';

// Repeaters
export const { Slot: RepeaterItemIconSlot, inject: injectIntoRepeaterItemIcon } = createReplaceableLocation< {
	value: PropValue;
} >();

export const { Slot: RepeaterItemLabelSlot, inject: injectIntoRepeaterItemLabel } = createReplaceableLocation< {
	value: PropValue;
} >();

export const { Slot: RepeaterItemActionsSlot, inject: injectIntoRepeaterItemActions } = createLocation< {
	index: number;
} >();
