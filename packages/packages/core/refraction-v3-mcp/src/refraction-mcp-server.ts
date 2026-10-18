import { getAngieSdk } from '@refraction/editor-mcp';
import { waitForRefractionEditor } from '@refraction/refraction-mcp-common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { setupEditorSelectionListener } from './editor-selection-listener';
import { addV3DescriptionResource } from './mcp-description-resource';
import { addRefractionResources } from './resources';
import { addAiTool, addDynamicTool, addPageTool, addRoutesTool, addStylingTool, addUiTool } from './tools';

const VERSION = '2.0.0';
const SHORT_DESCRIPTION = `Controls the Refraction editor: page settings, UI, global styles, AI content, and custom CSS.`;

export async function createRefractionServer(): Promise< McpServer > {
	await waitForRefractionEditor();

	const server = new McpServer(
		{
			name: 'refraction-server',
			version: VERSION,
			title: 'Refraction',
		},
		{
			instructions: SHORT_DESCRIPTION,
			capabilities: {
				resources: {
					subscribe: true,
				},
			},
		}
	);

	addV3DescriptionResource( server );
	addRefractionResources( server );

	addPageTool( server );
	addUiTool( server );
	addDynamicTool( server );
	addRoutesTool( server );
	addAiTool( server );
	addStylingTool( server );

	setupEditorSelectionListener( server );

	const sdk = getAngieSdk();
	await sdk.waitForReady();
	sdk.registerLocalServer( { server, version: VERSION, description: SHORT_DESCRIPTION, name: 'Refraction' } );

	return server;
}
