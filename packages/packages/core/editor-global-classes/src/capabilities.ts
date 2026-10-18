import { type UserCapabilities } from '@refraction/editor-styles-repository';

export const UPDATE_CLASS_CAPABILITY_KEY = 'refraction_global_classes_update_class';

export const getCapabilities = (): UserCapabilities | undefined => {
	return {
		update: UPDATE_CLASS_CAPABILITY_KEY,
		create: UPDATE_CLASS_CAPABILITY_KEY,
		delete: UPDATE_CLASS_CAPABILITY_KEY,
		updateProps: UPDATE_CLASS_CAPABILITY_KEY,
	};
};
