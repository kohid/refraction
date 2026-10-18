import { parseEnv } from '@refraction/env';

export const { env } = parseEnv< {
	background_placeholder_image: string;
} >( '@refraction/editor-controls' );
