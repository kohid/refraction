import { get$e, getRefraction, getRefractionAiConfig, getRefractionFrontend, getWp } from './utils';

type WaitForRefractionOptions = {
	maxRetries: number;
	retryInterval?: number;
	checkFn: () => boolean;
};

const REFRACTION_LOAD_TIMEOUT_MS = 5000;
const REFRACTION_CHECK_INTERVAL_MS = 100;
const DEFAULT_MAX_RETRIES = REFRACTION_LOAD_TIMEOUT_MS / REFRACTION_CHECK_INTERVAL_MS;

const DEFAULT_WAIT_FOR_REFRACTION_OPTIONS: WaitForRefractionOptions = {
	maxRetries: DEFAULT_MAX_RETRIES,
	retryInterval: REFRACTION_CHECK_INTERVAL_MS,
	checkFn: () => !! ( getRefraction() && get$e() ),
};

export function isGutenbergEditor(): boolean {
	return getWp()?.data?.select( 'core/editor' ) !== undefined;
}

export function isRefractionEditor(): boolean {
	const params = new URLSearchParams( window.location.search );
	for ( const [ , value ] of params.entries() ) {
		if ( value.includes( 'refraction' ) ) {
			return true;
		}
	}
	return false;
}

export function isRefractionAIActive(): boolean {
	return !! getRefractionAiConfig();
}

export function hasGutenbergUI(): boolean {
	return !! document.querySelector( '.edit-post-header-toolbar' );
}

export function ensureRefractionFrontend(): void {
	const frontend = getRefractionFrontend() as { elements?: { $body?: unknown } } | undefined;
	if ( ! frontend?.elements?.$body ) {
		throw new Error( 'refractionFrontend or its required components not available' );
	}
}

export function isRefractionEditorReady(): boolean {
	return !! get$e()?.components.get( 'panel' );
}

export function waitForRefractionEditor(): Promise< void > {
	return new Promise( ( resolve ) => {
		if ( isRefractionEditorReady() ) {
			resolve();
			return;
		}

		const checkReady = () => {
			if ( isRefractionEditorReady() ) {
				resolve();
			} else {
				setTimeout( checkReady, 100 );
			}
		};

		if ( document.readyState === 'loading' ) {
			window.addEventListener( 'DOMContentLoaded', checkReady, { once: true } );
		} else {
			checkReady();
		}
	} );
}

export function waitForRefraction(
	options: WaitForRefractionOptions = DEFAULT_WAIT_FOR_REFRACTION_OPTIONS
): Promise< void > {
	const { maxRetries, retryInterval, checkFn } = options;

	return new Promise( ( resolve, reject ) => {
		let attempts = 0;

		const check = () => {
			if ( checkFn() ) {
				resolve();
				return;
			}

			attempts++;

			if ( attempts >= maxRetries ) {
				reject( new Error( `Refraction not loaded after ${ maxRetries } attempts` ) );
				return;
			}

			setTimeout( check, retryInterval );
		};

		check();
	} );
}

export async function whenRefractionReady< T >(
	fn: () => T | Promise< T >,
	options: WaitForRefractionOptions = DEFAULT_WAIT_FOR_REFRACTION_OPTIONS
): Promise< T > {
	await waitForRefraction( options );
	await waitForRefractionEditor();
	return await fn();
}
