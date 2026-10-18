import apiFetch from '@wordpress/api-fetch';

export const saveAngieConsent = async (): Promise< void > => {
	await apiFetch( {
		path: '/refraction/v1/angie/consent',
		method: 'POST',
	} );
};
