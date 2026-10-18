import { ensureUser } from '@refraction/editor-current-user';
import { registerDataHook } from '@refraction/editor-v1-adapters';

import { ensureCurrentUser } from '../ensure-current-user';

jest.mock( '@refraction/editor-v1-adapters', () => ( {
	...jest.requireActual( '@refraction/editor-v1-adapters' ),
	registerDataHook: jest.fn(),
} ) );

jest.mock( '@refraction/editor-current-user', () => ( {
	ensureUser: jest.fn(),
} ) );

describe( 'ensureCurrentUser', () => {
	it( 'should not fail the attach preview command if user fetch failed', async () => {
		// Arrange.
		jest.mocked( registerDataHook ).mockImplementation( ( _hook, _command, callback ) => {
			return callback( {}, undefined, { commandsCurrentTrace: [] } ) as never;
		} );

		jest.mocked( ensureUser ).mockRejectedValue( new Error( 'User fetch failed' ) );

		// Act.
		await ensureCurrentUser();

		// Assert.
		expect( registerDataHook ).toHaveBeenCalledWith(
			'after',
			'editor/documents/attach-preview',
			expect.any( Function )
		);

		expect( ensureUser ).toHaveBeenCalled();

		expect( ensureCurrentUser ).not.toThrow( 'User fetch failed' );
	} );
} );
