import { injectIntoTop } from '@refraction/editor';

jest.mock( '@refraction/editor', () => ( {
	injectIntoTop: jest.fn(),
} ) );

import { init } from '../init';

describe( 'init', () => {
	afterEach( () => {
		jest.clearAllMocks();
	} );

	it( 'injects the site settings tab host into the editor shell', () => {
		// Act.
		init();

		// Assert.
		expect( injectIntoTop ).toHaveBeenCalledWith(
			expect.objectContaining( {
				id: 'editor-site-settings-tab',
			} )
		);
	} );
} );
