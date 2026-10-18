import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { ASSETS_JS, resolveFromRoot } from './paths.mjs';

export const REFRACTION_ONE_LOCALES_PACKAGE_ROOT = resolveFromRoot(
	'node_modules/@elementor/elementor-one-assets',
);

export const REFRACTION_ONE_LOCALES_OUTPUT_DIRECTORY = join(
	ASSETS_JS,
	'locales',
	'refraction-one-assets',
);

export const REFRACTION_ONE_LOCALES_BASE_URL_PATH = 'js/locales/refraction-one-assets/';

export function copyRefractionOneLocales() {
	const sourceDirectory = join( REFRACTION_ONE_LOCALES_PACKAGE_ROOT, 'locales' );

	rmSync( REFRACTION_ONE_LOCALES_OUTPUT_DIRECTORY, { recursive: true, force: true } );
	cpSync( sourceDirectory, REFRACTION_ONE_LOCALES_OUTPUT_DIRECTORY, { recursive: true } );
}

export function verifyRefractionOneLocaleAssets() {
	const englishCommonLocale = join(
		REFRACTION_ONE_LOCALES_OUTPUT_DIRECTORY,
		'en',
		'common.json',
	);

	if ( ! existsSync( englishCommonLocale ) ) {
		throw new Error(
			[
				'Missing copied @elementor/elementor-one-assets locale files.',
				`Expected ${ englishCommonLocale } after the scripts build.`,
				'Run copyRefractionOneLocales during build-scripts.',
			].join( '\n' ),
		);
	}
}
