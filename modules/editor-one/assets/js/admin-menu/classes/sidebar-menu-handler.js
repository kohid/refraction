export class SidebarMenuHandler {
	constructor() {
		this.refractionHomeMenu = this.findRefractionHomeMenu();

		if ( this.refractionHomeMenu ) {
			this.deactivateOtherMenus();
			this.activateRefractionMenu();
			this.highlightSubmenu();
		}
	}

	findRefractionHomeMenu() {
		return document.querySelector( '#toplevel_page_refraction-home' );
	}

	deactivateOtherMenus() {
		document.querySelectorAll( '#adminmenu li.wp-has-current-submenu' ).forEach( ( item ) => {
			if ( item !== this.refractionHomeMenu ) {
				item.classList.remove( 'wp-has-current-submenu', 'wp-menu-open', 'selected' );
				item.classList.add( 'wp-not-current-submenu' );

				const link = item.querySelector( ':scope > a' );
				if ( link ) {
					link.classList.remove( 'wp-has-current-submenu', 'wp-menu-open', 'current' );
				}
			}
		} );
	}

	activateRefractionMenu() {
		this.refractionHomeMenu.classList.remove( 'wp-not-current-submenu' );
		this.refractionHomeMenu.classList.add( 'wp-has-current-submenu', 'wp-menu-open', 'selected' );

		const refractionLink = this.refractionHomeMenu.querySelector( ':scope > a.menu-top' );
		if ( refractionLink ) {
			refractionLink.classList.add( 'wp-has-current-submenu', 'wp-menu-open' );
		}
	}

	highlightSubmenu() {
		const currentUrl = new URL( window.location.href );
		const searchParams = currentUrl.searchParams;
		const page = searchParams.get( 'page' );

		let targetSlug = 'refraction';

		if ( 'refraction' === page || 'refraction-home' === page ) {
			targetSlug = 'refraction';
		} else if ( 'e-form-submissions' === page ) {
			targetSlug = 'e-form-submissions';
		} else if ( 'refraction-mcp' === page ) {
			targetSlug = 'refraction-mcp';
		} else if ( 'refraction-agents-ready' === page ) {
			targetSlug = 'refraction-agents-ready';
		} else if ( 'refraction-theme-builder' === page ) {
			targetSlug = 'refraction-theme-builder';
		}

		const submenuItems = this.refractionHomeMenu.querySelectorAll( '.wp-submenu li' );

		submenuItems.forEach( ( item ) => {
			const link = item.querySelector( 'a' );
			if ( ! link ) {
				return;
			}

			item.classList.remove( 'current' );
			link.classList.remove( 'current' );
			link.setAttribute( 'aria-current', '' );

			const linkUrl = new URL( link.href, window.location.origin );
			const linkPage = linkUrl.searchParams.get( 'page' );

			if ( linkPage === targetSlug ) {
				item.classList.add( 'current' );
				link.classList.add( 'current' );
				link.setAttribute( 'aria-current', 'page' );
			}
		} );
	}
}

