import { type MCPRegistryEntry } from '@refraction/editor-mcp';
import { type HttpResponse, httpService } from '@refraction/http-client';

const MCP_PROXY_URL = 'refraction/v1/mcp-proxy';
export const BEST_PRACTICES_URI = 'refraction://style/best-practices';

export const initBestPracticesResource = ( reg: MCPRegistryEntry ) => {
	const { resource } = reg;

	resource(
		'style-best-practices',
		BEST_PRACTICES_URI,
		{
			description:
				'Design quality guidelines for avoiding generic AI output: typography, color strategy, spacing, motion, and visual hierarchy best practices.',
			mimeType: 'text/markdown',
		},
		async ( uri: URL ) => {
			const { data } = await httpService().get< HttpResponse< string > >( MCP_PROXY_URL, {
				params: { uri: uri.href },
			} );

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: 'text/markdown',
						text: data.data,
					},
				],
			};
		}
	);
};
