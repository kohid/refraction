import { injectIntoTop } from '@refraction/editor';

import { slice } from '../store/slice';

const mockRegisterSlice = jest.fn();

jest.mock( '@refraction/editor', () => ( {
	injectIntoTop: jest.fn(),
} ) );

jest.mock( '../sync', () => ( {
	sync: jest.fn(),
} ) );

jest.mock( '@refraction/store', () => {
	const actual = jest.requireActual( '@refraction/store' );

	return {
		...actual,
		__registerSlice: ( ...args: unknown[] ) => mockRegisterSlice( ...args ),
	};
} );

import { init } from '../init';
import { sync } from '../sync';

const mockSync = sync as jest.MockedFunction< typeof sync >;

describe( 'init', () => {
	afterEach( () => {
		jest.clearAllMocks();
	} );

	it( 'registers the slice, injects the host, and starts persistence sync', () => {
		// Act.
		init();

		// Assert.
		expect( mockRegisterSlice ).toHaveBeenCalledWith( slice );
		expect( injectIntoTop ).toHaveBeenCalledWith(
			expect.objectContaining( {
				id: 'floating-panels',
			} )
		);
		expect( mockSync ).toHaveBeenCalled();
	} );

	it( 'calls sync before registerSlice', () => {
		// Act.
		init();

		// Assert.
		expect( mockSync.mock.invocationCallOrder[ 0 ] ).toBeLessThan(
			mockRegisterSlice.mock.invocationCallOrder[ 0 ]
		);
	} );
} );
