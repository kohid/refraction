import { EditorOneEventManager } from 'refraction-editor-utils/editor-one-events';

const SELECTORS = {
	refractionMenuLink: '#toplevel_page_refraction-home > a.menu-top',
	themeBuilderItem: '[data-slug="refraction-theme-builder"] a, .wp-submenu a[href*="page=refraction-theme-builder"]',
};

export class MenuEventsTracker {
	static attach() {
		this.attachRefractionMenuClick();
		this.attachThemeBuilderClick();
	}

	static attachRefractionMenuClick() {
		const menuLink = document.querySelector( SELECTORS.refractionMenuLink );

		if ( ! menuLink ) {
			return;
		}

		menuLink.addEventListener( 'click', () => {
			EditorOneEventManager.sendWpDashRefractionMenuClick();
		} );
	}

	static attachThemeBuilderClick() {
		document.addEventListener( 'click', ( event ) => {
			const link = event.target.closest( SELECTORS.themeBuilderItem );

			if ( link ) {
				EditorOneEventManager.sendWpDashThemeBuilderClick();
			}
		}, true );
	}

	static trackEditorSubMenuOpened() {
		EditorOneEventManager.sendWpDashEditorSubMenuHover();
	}
}
