import { createError } from '@refraction/utils';

export const ActiveDocumentMustExistError = createError( {
	code: 'active_document_must_exist',
	message: 'Active document must exist.',
} );
