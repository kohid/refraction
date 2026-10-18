import ComponentBase from 'refraction-editor/component-base';

export default class Component extends ComponentBase {
	getNamespace() {
		return 'panel/page-settings';
	}

	defaultTabs() {
		return {
			settings: { title: __( 'Settings', 'refraction' ) },
			style: { title: __( 'Style', 'refraction' ) },
			advanced: { title: __( 'Advanced', 'refraction' ) },
		};
	}

	renderTab( tab, args ) {
		const { activeControl, refresh = false } = args;

		if ( this.shouldRenderPage( tab ) || refresh ) {
			refraction.getPanelView().setPage( 'page_settings' ).activateTab( tab );
		}

		this.activateControl( activeControl );
	}

	shouldRenderPage( tab ) {
		const currentPanelView = refraction.getPanelView();

		const isSamePage = 'page_settings' === currentPanelView.getCurrentPageName();
		const isSameTab = tab === currentPanelView.getCurrentPageView()?.activeTab;

		return ! isSamePage || ! isSameTab;
	}

	getTabsWrapperSelector() {
		return '.refraction-panel-navigation';
	}
}
