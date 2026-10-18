import * as React from 'react';
import {
	ControlActionsProvider,
	ControlReplacementsProvider,
	getControlReplacements,
} from '@refraction/editor-controls';
import { useSelectedElementSettings } from '@refraction/editor-elements';
import { Panel, PanelBody, PanelHeader, PanelHeaderTitle } from '@refraction/editor-panels';
import { ThemeProvider } from '@refraction/editor-ui';
import { AtomIcon } from '@elementor/icons';
import { createLocation } from '@refraction/locations';
import { controlActionsMenu } from '@refraction/menus';
import { SessionStorageProvider } from '@refraction/session';
import { ErrorBoundary } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { ElementProvider } from '../contexts/element-context';
import { getEditingPanelReplacement } from '../editing-panel-replacement-registry';
import { EditorPanelErrorFallback } from './editing-panel-error-fallback';
import { EditingPanelStickyPromotion } from './editing-panel-sticky-promotion';
import { EditingPanelTabs } from './editing-panel-tabs';

export const { Slot: PanelHeaderTopSlot, inject: injectIntoPanelHeaderTop } = createLocation();

const { useMenuItems } = controlActionsMenu;

export const EditingPanel = () => {
	const { element, elementType, settings } = useSelectedElementSettings();
	const controlReplacements = getControlReplacements();
	const menuItems = useMenuItems().default;

	if ( ! element || ! elementType ) {
		return null;
	}

	/* translators: %s: Element type title. */
	const panelTitle = __( 'Edit %s', 'refraction' ).replace( '%s', elementType.title );

	const { component: ReplacementComponent } = getEditingPanelReplacement( element, elementType ) ?? {};

	let panelContent = (
		<>
			<PanelHeader>
				<PanelHeaderTitle>{ panelTitle }</PanelHeaderTitle>
				<AtomIcon fontSize="small" sx={ { color: 'text.tertiary' } } />
			</PanelHeader>
			<PanelBody sx={ { height: 'auto', flex: 1, minHeight: 0 } }>
				<EditingPanelTabs />
			</PanelBody>
			<EditingPanelStickyPromotion />
		</>
	);

	if ( ReplacementComponent ) {
		panelContent = <ReplacementComponent />;
	}

	return (
		<ErrorBoundary fallback={ <EditorPanelErrorFallback /> }>
			<SessionStorageProvider prefix={ 'refraction' }>
				<ThemeProvider>
					<ControlActionsProvider items={ menuItems }>
						<ControlReplacementsProvider replacements={ controlReplacements }>
							<ElementProvider element={ element } elementType={ elementType } settings={ settings }>
								<Panel>
									<PanelHeaderTopSlot />
									{ panelContent }
								</Panel>
							</ElementProvider>
						</ControlReplacementsProvider>
					</ControlActionsProvider>
				</ThemeProvider>
			</SessionStorageProvider>
		</ErrorBoundary>
	);
};
