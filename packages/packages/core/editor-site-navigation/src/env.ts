import { parseEnv } from '@refraction/env';

export const { env } = parseEnv< {
	is_pages_panel_active: boolean;
} >( '@refraction/editor-site-navigation', ( envData ) => {
	return envData as {
		is_pages_panel_active: boolean;
	};
} );
