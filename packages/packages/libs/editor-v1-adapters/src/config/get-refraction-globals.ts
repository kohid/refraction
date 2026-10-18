export const getRefractionConfig = () => {
	return window.refraction?.config ?? {};
};

export const getRefractionFrontendConfig = () => {
	return window.refractionFrontend?.config ?? {};
};
