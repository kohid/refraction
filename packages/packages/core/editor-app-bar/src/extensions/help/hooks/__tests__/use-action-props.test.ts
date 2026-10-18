import { renderHook } from '@testing-library/react';

import useActionProps from '../use-action-props';

describe( 'useHelpCenterActionProps', () => {
	it( 'returns an external link to the project page', () => {
		const { result } = renderHook( () => useActionProps() );

		expect( result.current.href ).toBe( 'https://github.com/kohid/refraction' );
		expect( result.current.target ).toBe( '_blank' );
	} );
} );
