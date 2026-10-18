type WindowConfig = {
	restNamespace: string;
	nonce: string;
};

declare global {
	interface Window {
		refractionAudits?: WindowConfig;
	}
}

export function getWindowConfig(): WindowConfig {
	const config = window.refractionAudits;

	if ( ! config ) {
		return { restNamespace: 'refraction/v1', nonce: '' };
	}

	return config;
}
