import { useMutation } from '@refraction/query';

/**
 * Refraction never downloads or installs a theme from this app. The step keeps its shape (a mutation the caller can
 * await) but resolves locally, without a network request.
 */
async function installThemeRequest( _themeSlug: string ): Promise< { success: boolean; message: string } > {
	return { success: true, message: 'No theme is installed by Refraction.' };
}

export function useInstallTheme() {
	return useMutation( {
		mutationFn: ( themeSlug: string ) => installThemeRequest( themeSlug ),
	} );
}
