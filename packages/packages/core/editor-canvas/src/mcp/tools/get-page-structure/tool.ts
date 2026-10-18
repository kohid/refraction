import { getCurrentDocument } from '@refraction/editor-documents';
import { type MCPRegistryEntry } from '@refraction/editor-mcp';
import { type HttpResponse, httpService } from '@refraction/http-client';
import { z } from '@refraction/schema';

import { getMcpErrorMessage } from '../../utils/get-mcp-error-message';

const MCP_PROXY_URL = 'refraction/v1/mcp-proxy';

type GetPageStructureResponse = {
	elements: Array< Record< string, unknown > >;
};

export const initGetPageStructureTool = ( reg: MCPRegistryEntry ) => {
	const { addTool } = reg;

	addTool( {
		name: 'get-page-structure',
		description:
			'Returns a lean Refraction element tree skeleton (id, elType, widgetType, title, nested elements) for a post or page. ' +
			'If no postId is provided, uses the currently open document. Optionally scope to a subtree with elementId. ' +
			"Set includeContent=true (requires elementId) to also return each node's settings and styles.",
		schema: {
			postId: z
				.number()
				.optional()
				.describe(
					'WordPress post ID of the Refraction document. If omitted, uses the currently open document.'
				),
			elementId: z
				.string()
				.optional()
				.describe( 'If provided, returns only the subtree rooted at that element id.' ),
			includeContent: z
				.boolean()
				.optional()
				.describe(
					"If true, includes each node's settings and styles (same shape build-composition accepts as input). Requires elementId."
				),
		},
		outputSchema: {
			elements: z
				.array( z.any() )
				.describe(
					'Skeleton of Refraction elements (id, elType, widgetType, title, nested elements). When includeContent is true, each node also includes settings and styles.'
				),
		},
		handler: async ( { postId, elementId, includeContent } ) => {
			const resolvedPostId = postId ?? getCurrentDocument()?.id;

			if ( ! resolvedPostId ) {
				throw new Error( 'No post ID provided and no active document found.' );
			}

			try {
				const { data } = await httpService().post< HttpResponse< GetPageStructureResponse > >( MCP_PROXY_URL, {
					tool: 'get-page-structure',
					input: {
						post_id: resolvedPostId,
						...( elementId ? { element_id: elementId } : {} ),
						...( includeContent ? { include_content: true } : {} ),
					},
				} );

				return {
					elements: data.data.elements,
				};
			} catch ( error ) {
				throw new Error( getMcpErrorMessage( error, 'get-page-structure' ) );
			}
		},
	} );
};
