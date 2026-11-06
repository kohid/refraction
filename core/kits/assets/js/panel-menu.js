import MenuPageView from 'refraction-panel/pages/menu/base';

export default class PanelMenu extends MenuPageView {
	initialize() {
		this.collection = PanelMenu.getGroups();
	}

	onRender() {
		super.onRender?.();

		// The page stays editable from here: clicking one of its elements goes back to editing it (edit-from-preview.js).
		if ( ! this.$el.children( '.refraction-kit-edit-hint' ).length ) {
			this.$el.prepend( jQuery( '<div>', {
				class: 'refraction-kit-edit-hint refraction-panel-alert refraction-panel-alert-info',
				css: { margin: '15px 15px 0' },
				text: __( 'Click anything on the page to go back to editing it. To see the page as visitors do, use Preview (the eye in the top bar).', 'refraction' ),
			} ) );
		}
	}
}

PanelMenu.groups = null;

PanelMenu.createGroupItems = ( groupName ) => {
	const tabs = $e.components.get( 'panel/global' ).getTabs(),
		groupTabs = Object.entries( tabs ).filter( ( [ , tabConfig ] ) => groupName === tabConfig.group );

	return groupTabs.map( ( [ tabId, tabConfig ] ) => {
		return {
			name: tabId,
			icon: tabConfig.icon,
			title: tabConfig.title,
			callback: () => $e.route( 'panel/global/' + tabId ),
		};
	} );
};

PanelMenu.initGroups = () => {
	const agentsItems = PanelMenu.createGroupItems( 'agents' ),
		settingsItems = PanelMenu.createGroupItems( 'settings' ),
		additionalSettingsProps = {
			name: 'settings-additional-settings',
			icon: 'rficon-tools',
			title: __( 'Additional Settings', 'refraction' ),
			type: 'link',
			link: refraction.config.admin_settings_url,
			newTab: true,
		};

	settingsItems.push( additionalSettingsProps );

	const groups = [
		{
			name: 'design_system',
			title: __( 'Design System', 'refraction' ),
			items: PanelMenu.createGroupItems( 'global' ),
		},
		{
			name: 'theme_style',
			title: __( 'Theme Style', 'refraction' ),
			items: PanelMenu.createGroupItems( 'theme-style' ),
		},
	];

	if ( agentsItems.length ) {
		groups.push( {
			name: 'agents',
			title: __( 'Agents', 'refraction' ),
			items: agentsItems,
		} );
	}

	groups.push( {
		name: 'settings',
		title: __( 'Settings', 'refraction' ),
		items: settingsItems,
	} );

	PanelMenu.groups = new Backbone.Collection( groups );
};

PanelMenu.getGroups = () => {
	if ( ! PanelMenu.groups ) {
		PanelMenu.initGroups();
	}

	return PanelMenu.groups;
};
