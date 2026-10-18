import type {
	RefractionCommandsInstance,
	RefractionCommonInstance,
	RefractionFrontendInstance,
	RefractionInstance,
	WpApiSettings,
	WpDataInstance,
} from './types';

interface McpWindow {
	refraction?: RefractionInstance;
	refractionFrontend?: RefractionFrontendInstance;
	$e?: RefractionCommandsInstance;
	refractionCommon?: RefractionCommonInstance;
	wpApiSettings?: WpApiSettings;
	ajaxurl?: string;
	wp?: {
		data: WpDataInstance;
	};
	jQuery?: ( selector: unknown ) => {
		on: ( event: string, callback: ( event: unknown, data: unknown ) => void ) => void;
		get?: ( index: number ) => HTMLElement;
	};
	RefractionAiConfig?: Record< string, unknown >;
}

export const getRefraction = (): RefractionInstance | undefined => ( window as unknown as McpWindow ).refraction;

export const getRefractionFrontend = (): RefractionFrontendInstance | undefined =>
	( window as unknown as McpWindow ).refractionFrontend;

export const get$e = (): RefractionCommandsInstance | undefined => ( window as unknown as McpWindow ).$e;

export const getRefractionCommon = (): RefractionCommonInstance | undefined =>
	( window as unknown as McpWindow ).refractionCommon;

export const getWpApiSettings = (): WpApiSettings | undefined => ( window as unknown as McpWindow ).wpApiSettings;

export const getAjaxUrl = (): string | undefined => ( window as unknown as McpWindow ).ajaxurl;

export const getWp = (): { data: WpDataInstance } | undefined => ( window as unknown as McpWindow ).wp;

export const getJQuery = (): McpWindow[ 'jQuery' ] => ( window as unknown as McpWindow ).jQuery;

export const getRefractionAiConfig = (): Record< string, unknown > | undefined =>
	( window as unknown as McpWindow ).RefractionAiConfig;
