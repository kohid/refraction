import * as React from 'react';
import { ControlAdornmentsProvider } from '@refraction/editor-controls';
import { getFieldIndicators } from '@refraction/editor-editing-panel';
import { PanelBody } from '@refraction/editor-panels';
import { Divider, Stack } from '@elementor/ui';

import { type OverridablePropsGroup } from '../../types';
import { OverridePropsGroup } from './override-props-group';

type InstancePanelBodyProps = {
	groups: OverridablePropsGroup[];
	isEmpty: boolean;
	emptyState: React.ReactNode;
	componentInstanceId?: string;
};

export function InstancePanelBody( { groups, isEmpty, emptyState, componentInstanceId }: InstancePanelBodyProps ) {
	return (
		<PanelBody>
			<ControlAdornmentsProvider items={ getFieldIndicators( 'settings' ) }>
				{ isEmpty ? (
					emptyState
				) : (
					<Stack direction="column" alignItems="stretch">
						{ groups.map( ( group ) => (
							<React.Fragment key={ group.id + componentInstanceId }>
								<OverridePropsGroup group={ group } />
								<Divider />
							</React.Fragment>
						) ) }
					</Stack>
				) }
			</ControlAdornmentsProvider>
		</PanelBody>
	);
}
