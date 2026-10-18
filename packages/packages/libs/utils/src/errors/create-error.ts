import { RefractionError, type RefractionErrorOptions } from './refraction-error';

export type CreateErrorParams = {
	code: RefractionErrorOptions[ 'code' ];
	message: string;
};

export const createError = < T extends RefractionErrorOptions[ 'context' ] >( { code, message }: CreateErrorParams ) => {
	return class extends RefractionError {
		constructor( { cause, context }: { cause?: RefractionErrorOptions[ 'cause' ]; context?: T } = {} ) {
			super( message, { cause, code, context } );
		}
	};
};
