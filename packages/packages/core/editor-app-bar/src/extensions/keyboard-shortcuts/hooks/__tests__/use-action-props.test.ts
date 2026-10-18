import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';
import { renderHook } from '@testing-library/react';

import useActionProps from '../use-action-props';

jest.mock( '@refraction/editor-v1-adapters', () => ( {
	__privateRunCommand: jest.fn(),
} ) );

describe( '@refraction/editor-app-bar - useKeyboardShortcutsActionProps', () => {
	it( 'should open the keyboard shortcuts modal on click', () => {
		// Act.
		const { result } = renderHook( () => useActionProps() );

		result.current.onClick?.();

		// Assert.
		expect( runCommand ).toHaveBeenCalledTimes( 1 );
		expect( runCommand ).toHaveBeenCalledWith( 'shortcuts/open' );
	} );
} );
