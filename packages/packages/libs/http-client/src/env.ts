import { parseEnv } from '@refraction/env';

export const { env } = parseEnv< {
	base_url: string;
	headers: Record< string, string >;
} >( '@refraction/http-client' );
