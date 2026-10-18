import { type MCPRegistryEntry } from '@refraction/editor-mcp';

import { initClassesResource } from './classes-resource';
import { initManageClassesTool } from './manage-classes-tool';
import initMcpApplyUnapplyGlobalClasses from './mcp-apply-unapply-global-classes';
import initMcpApplyGetGlobalClassUsages from './mcp-get-global-class-usages';

export const initMcpIntegration = ( reg: MCPRegistryEntry, canvasMcpEntry: MCPRegistryEntry ) => {
	initMcpApplyUnapplyGlobalClasses( reg );
	initMcpApplyGetGlobalClassUsages( reg );
	initManageClassesTool( reg );
	initClassesResource( reg, canvasMcpEntry );
};
