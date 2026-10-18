import { type ExtendedWindow } from './types';

const getRefractionConfig = () => {
	const extendedWindow = window as unknown as ExtendedWindow;

	return extendedWindow.refraction?.config ?? {};
};

export const getStylesSchema = () => {
	const config = getRefractionConfig();
	const styleSchema = config?.atomic?.styles_schema ?? {};

	return styleSchema;
};

export const isExistingStyleProperty = ( property: string ): boolean => {
	const stylesSchema = getStylesSchema();
	return Object.keys( stylesSchema ).includes( property );
};
