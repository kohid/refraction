import { type MCPRegistryEntry } from '@refraction/editor-mcp';
import { type ExtendedWindow } from '@refraction/editor-responsive';
import { v1ReadyEvent } from '@refraction/editor-v1-adapters';

import { CANVAS_SERVER_NAME } from './widgets-schema-resource';

export const BREAKPOINTS_SCHEMA_URI = 'refraction://breakpoints/list';
export const BREAKPOINTS_SCHEMA_FULL_URI = `${ CANVAS_SERVER_NAME }_${ BREAKPOINTS_SCHEMA_URI }`;

export const initBreakpointsResource = ( reg: MCPRegistryEntry ) => {
	const { resource, sendResourceUpdated } = reg;

	const getBreakpointsList = () => {
		const { breakpoints } = ( window as unknown as ExtendedWindow ).refraction?.config?.responsive || {};
		if ( ! breakpoints ) {
			return [];
		}
		return Object.values( breakpoints )
			.filter( ( bp ) => bp.is_enabled )
			.map( ( bp ) => {
				const { direction: constraint, label, value } = bp;
				return {
					label,
					constraint,
					value,
				};
			} );
	};

	const buildResourceResponse = () => ( {
		contents: [
			{
				uri: BREAKPOINTS_SCHEMA_URI,
				mimeType: 'application/json',
				text: JSON.stringify( getBreakpointsList() ),
			},
		],
	} );

	resource(
		'breakpoints ',
		BREAKPOINTS_SCHEMA_URI,
		{
			description: 'Breakpoints list.',
		},
		() => {
			return buildResourceResponse();
		}
	);

	window.addEventListener( v1ReadyEvent().name, () => {
		sendResourceUpdated( {
			uri: BREAKPOINTS_SCHEMA_URI,
			...buildResourceResponse(),
		} );
	} );
};
