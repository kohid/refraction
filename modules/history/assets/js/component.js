import ComponentBase from 'refraction-api/modules/component-base';

export default class Component extends ComponentBase {
	getNamespace() {
		return 'panel/history';
	}

	defaultTabs() {
		return {
			actions: { title: __( 'Actions', 'refraction' ) },
			revisions: { title: __( 'Revisions', 'refraction' ) },
		};
	}

	defaultShortcuts() {
		return {
			actions: {
				keys: 'ctrl+shift+h',
				dependency: () => 'edit' === refraction.channels.dataEditMode.request( 'activeMode' ),
			},
		};
	}

	renderTab( tab ) {
		refraction.getPanelView().setPage( 'historyPage' ).showView( tab );
	}

	activate() {
		// Activate the tab component itself.
		$e.components.activate( this.getTabRoute( this.currentTab ) );
	}

	getTabsWrapperSelector() {
		return '#refraction-panel-elements-navigation';
	}
}
