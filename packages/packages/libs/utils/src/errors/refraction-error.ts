export type RefractionErrorOptions = {
	cause?: Error[ 'cause' ];
	context?: Record< string, unknown > | null;
	code: string;
};

export class RefractionError extends Error {
	readonly context: RefractionErrorOptions[ 'context' ];
	readonly code: RefractionErrorOptions[ 'code' ];

	constructor( message: string, { code, context = null, cause = null }: RefractionErrorOptions ) {
		super( message, { cause } );
		this.context = context;
		this.code = code;
	}
}
