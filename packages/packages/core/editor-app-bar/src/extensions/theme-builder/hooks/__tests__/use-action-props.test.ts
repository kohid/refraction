import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';
import { renderHook } from '@testing-library/react';

import useThemeBuilderActionProps from '../use-action-props';

jest.mock( '@refraction/editor-v1-adapters', () => ( {
	__privateRunCommand: jest.fn(),
} ) );

describe( '@refraction/editor-app-bar - useThemeBuilderActionProps', () => {
	it( 'should open the theme builder', () => {
		// Arrange.
		const command = 'app/open';

		// Act.
		const { result } = renderHook( () => useThemeBuilderActionProps() );
		result.current.onClick?.();

		// Assert.
		expect( runCommand ).toBeCalledTimes( 1 );
		expect( runCommand ).toHaveBeenCalledWith( command );
	} );
} );
