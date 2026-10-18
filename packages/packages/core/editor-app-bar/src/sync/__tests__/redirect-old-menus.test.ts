import { __privateOpenRoute as openRoute } from '@refraction/editor-v1-adapters';

import redirectOldMenus from '../redirect-old-menus';

jest.mock( '@refraction/editor-v1-adapters', () => ( {
	...jest.requireActual( '@refraction/editor-v1-adapters' ),
	__privateOpenRoute: jest.fn(),
} ) );

describe( '@refraction/editor-app-bar - Redirect old menus', () => {
	it( 'should redirect old hamburger menu to the default elements panel', () => {
		// Arrange.
		redirectOldMenus();

		// Act.
		window.dispatchEvent(
			new CustomEvent( 'refraction/routes/open', {
				detail: {
					route: 'panel/menu',
				},
			} )
		);

		// Assert.
		expect( openRoute ).toHaveBeenCalledWith( 'panel/elements/categories' );

		// Act - Change to non-related route.
		window.dispatchEvent(
			new CustomEvent( 'refraction/routes/open', {
				detail: {
					route: 'some/other/route',
				},
			} )
		);

		// Assert - Should not be called again.
		expect( openRoute ).toHaveBeenCalledTimes( 1 );
	} );
} );
