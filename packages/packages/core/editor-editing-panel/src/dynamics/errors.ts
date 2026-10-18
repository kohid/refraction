import { createError } from '@refraction/utils';

export const DynamicTagsManagerNotFoundError = createError( {
	code: 'dynamic_tags_manager_not_found',
	message: 'Dynamic tags manager not found',
} );
