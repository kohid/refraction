import ComponentBase from 'refraction-api/modules/component-base';

export default class Component extends ComponentBase {
	getNamespace() {
		return 'panel/elements';
	}

	defaultTabs() {
		return {
			categories: { title: __( 'Elements', 'refraction' ) },
			global: { title: __( 'Global', 'refraction' ) },
		};
	}

	getTabsWrapperSelector() {
		return '#refraction-panel-elements-navigation';
	}

	renderTab( tab, args = {} ) {
		this.manager.setPage( 'elements', null, args ).showView( tab );
	}

	activateTab( tab ) {
		super.activateTab( tab );

		refractionCommon.eventsManager.dispatchEvent(
			refractionCommon.eventsManager.config.names.v1[ tab ],
			{
				location: refractionCommon.eventsManager.config.locations.widgetPanel,
				secondaryLocation: refractionCommon.eventsManager.config.secondaryLocations[ tab ],
				trigger: refractionCommon.eventsManager.config.triggers.click,
				element: refractionCommon.eventsManager.config.elements.accordionSection,
			},
		);
	}
}
