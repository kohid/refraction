import { getAngieSdk } from '@refraction/editor-mcp';

import { createRefractionCapabilitiesServer } from './refraction-capabilities-mcp-server';

export function init() {
	const sdk = getAngieSdk();
	sdk.waitForReady().then( () => {
		const capabilitiesServer = createRefractionCapabilitiesServer();
		sdk.registerServer( {
			name: 'refraction-capabilities',
			version: '2.0.0',
			description: 'Refraction Capabilities Gateway',
			server: capabilitiesServer,
			capabilities: {
				tools: {},
			},
		} );
		// eslint-disable-next-line no-console
		console.log( '[Refraction Capabilities MCP] Module initialized' );
	} );
}
