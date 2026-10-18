import { SidebarMenuHandler } from 'refraction/modules/editor-one/assets/js/admin-menu/classes/sidebar-menu-handler';

const buildAdminMenu = () => {
	document.body.innerHTML = `
		<ul id="adminmenu">
			<li id="toplevel_page_refraction-home" class="wp-has-submenu">
				<a class="menu-top" href="admin.php?page=refraction">Refraction</a>
				<ul class="wp-submenu">
					<li><a href="admin.php?page=refraction">Editor</a></li>
					<li><a href="admin.php?page=refraction-mcp">Refraction MCP</a></li>
					<li><a href="admin.php?page=refraction-agents-ready">Agent Ready</a></li>
				</ul>
			</li>
		</ul>
	`;
};

const getCurrentSubmenuLabel = () => {
	const currentLink = document.querySelector( '#toplevel_page_refraction-home .wp-submenu li.current a' );

	return currentLink ? currentLink.textContent : null;
};

describe( 'SidebarMenuHandler', () => {
	const originalLocation = window.location;

	afterEach( () => {
		document.body.innerHTML = '';
		delete window.location;
		window.location = originalLocation;
	} );

	it( 'highlights Agent Ready in the WordPress submenu when that page is selected', () => {
		// Arrange.
		delete window.location;
		window.location = new URL( 'https://example.com/wp-admin/admin.php?page=refraction-agents-ready' );
		buildAdminMenu();

		// Act.
		new SidebarMenuHandler();

		// Assert.
		expect( getCurrentSubmenuLabel() ).toBe( 'Agent Ready' );
	} );

	it( 'highlights Refraction MCP in the WordPress submenu when that page is selected', () => {
		// Arrange.
		delete window.location;
		window.location = new URL( 'https://example.com/wp-admin/admin.php?page=refraction-mcp' );
		buildAdminMenu();

		// Act.
		new SidebarMenuHandler();

		// Assert.
		expect( getCurrentSubmenuLabel() ).toBe( 'Refraction MCP' );
	} );
} );
