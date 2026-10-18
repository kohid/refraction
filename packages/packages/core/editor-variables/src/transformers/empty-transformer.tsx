import { createTransformer } from '@refraction/editor-canvas';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const EmptyTransformer = createTransformer( ( _value: string ) => {
	return null;
} );
