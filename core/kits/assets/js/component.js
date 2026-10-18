import * as hooks from './hooks';
import * as commands from './commands/';
import Repeater from './repeater';
import ComponentBase from 'refraction-editor/component-base';

export default class extends ComponentBase {
	pages = {};
	siteSettingsSession = {
		visitedItems: [],
		savedItems: [],
		hasSaved: false,
	};

	__construct( args ) {
		super.__construct( args );

		refraction.on( 'panel:init', () => {
			args.manager.addPanelPages();

			args.manager.addPanelMenuItem();
		} );

		refraction.hooks.addFilter( 'panel/header/behaviors', args.manager.addHeaderBehavior );

		refraction.addControlView( 'global-style-repeater', Repeater );
	}

	getNamespace() {
		return 'panel/global';
	}

	defaultRoutes() {
		return {
			menu: () => {
				refraction.getPanelView().setPage( 'kit_menu' );
				this.currentTab = 'menu';
			},
		};
	}

	defaultCommands() {
		return this.importCommands( commands );
	}

	defaultShortcuts() {
		return {
			open: {
				keys: 'ctrl+k',
				dependency: () => {
					return (
						'kit' !== refraction.documents.getCurrent().config.type &&
						'edit' === refraction.channels.dataEditMode.request( 'activeMode' )
					);
				},
			},
			back: {
				keys: 'esc',
				scopes: [ 'panel' ],
				dependency: () => {
					return refraction.documents.isCurrent( refraction.config.kit_id ) && ! jQuery( '.dialog-widget:visible' ).length;
				},
			},
		};
	}

	defaultHooks() {
		return this.importHooks( hooks );
	}

	renderTab( tab, args ) {
		if ( tab !== this.currentTab ) {
			this.currentTab = tab;
			this.trackVisitedTab( tab );
			refraction.getPanelView().setPage( 'kit_settings' ).content.currentView.activateTab( tab );
		}

		this.activateControl( args.activeControl );
	}

	trackVisitedTab( tabName ) {
		if ( tabName && ! this.siteSettingsSession.visitedItems.includes( tabName ) ) {
			this.siteSettingsSession.visitedItems.push( tabName );
		}
	}

	trackSavedItem( itemName ) {
		if ( itemName && ! this.siteSettingsSession.savedItems.includes( itemName ) ) {
			this.siteSettingsSession.savedItems.push( itemName );
		}
	}

	getSiteSettingsSessionData() {
		return { ...this.siteSettingsSession };
	}

	resetSiteSettingsSession() {
		this.siteSettingsSession = {
			visitedItems: [],
			savedItems: [],
			hasSaved: false,
		};
	}
}
