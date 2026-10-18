export {
	McpServer,
	ResourceTemplate,
	type RegisteredResource,
	type ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
export { SamplingMessageSchema } from '@modelcontextprotocol/sdk/types.js';

export {
	isGutenbergEditor,
	isRefractionEditor,
	isRefractionAIActive,
	hasGutenbergUI,
	ensureRefractionFrontend,
	isRefractionEditorReady,
	waitForRefractionEditor,
	waitForRefraction,
	whenRefractionReady,
} from './editor-detection';

export {
	injectElementCSS,
	removeElementCSS,
	updateElementSettings,
	getElementSettings,
	getGutenbergBlockEditorApis,
	validateAndGetGutenbergBlock,
	updateGutenbergBlockAttributes,
	extractElementImageData,
	isSelectAllCheckbox,
} from './elements';

export { callWpApi, extractJSONFromResponse } from './rest-client';
export { initNonceRefresh, refreshNonce, isNonceError } from './nonce-refresh';
export { requireConfirmationMessage } from './validation-utils';

export type {
	RefractionChannels,
	RefractionCommandsInstance,
	RefractionCommonInstance,
	RefractionContainer,
	RefractionDocument,
	RefractionFrontendInstance,
	RefractionInstance,
	JQuery,
	WpApiSettings,
	WpDataInstance,
} from './types';

export {
	get$e,
	getAjaxUrl,
	getRefraction,
	getRefractionAiConfig,
	getRefractionCommon,
	getRefractionFrontend,
	getJQuery,
	getWp,
	getWpApiSettings,
} from './utils';
