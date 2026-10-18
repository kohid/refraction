import { injectSiteSettingsTab } from '@refraction/editor-site-settings';

const mockInjectSiteSettingsTab = injectSiteSettingsTab as jest.MockedFunction< typeof injectSiteSettingsTab >;

jest.mock( '@refraction/editor-site-settings', () => ( {
	injectSiteSettingsTab: jest.fn(),
} ) );

import { AGENTS_SITE_SETTINGS_TAB_ID, AgentsSettingsTab } from '../components/agents-settings-tab';
import { init } from '../init';

describe( 'init', () => {
	const originalExperimentalFeatures = window.refractionCommon?.config?.experimentalFeatures;

	afterEach( () => {
		if ( window.refractionCommon?.config ) {
			window.refractionCommon.config.experimentalFeatures = originalExperimentalFeatures ?? {};
		}

		jest.clearAllMocks();
	} );

	it( 'registers the agents site settings tab when the experiment is active', () => {
		// Arrange.
		window.refractionCommon = {
			config: {
				experimentalFeatures: {
					agent_ready: true,
				},
			},
		} as typeof window.refractionCommon;

		// Act.
		init();

		// Assert.
		expect( mockInjectSiteSettingsTab ).toHaveBeenCalledWith( {
			id: AGENTS_SITE_SETTINGS_TAB_ID,
			component: AgentsSettingsTab,
		} );
	} );

	it( 'does not register the agents site settings tab when the experiment is inactive', () => {
		// Arrange.
		window.refractionCommon = {
			config: {
				experimentalFeatures: {},
			},
		} as typeof window.refractionCommon;

		// Act.
		init();

		// Assert.
		expect( mockInjectSiteSettingsTab ).not.toHaveBeenCalled();
	} );
} );
