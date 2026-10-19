import * as React from 'react';
import { createMockPropType, renderControl } from 'test-utils';
import { UrlControl } from '@refraction/editor-controls';
import { fireEvent, screen } from '@testing-library/react';

const propType = createMockPropType( { kind: 'plain' } );

describe( 'UrlControl', () => {
	it( 'should pass the updated payload when input url value changes', () => {
		// Arrange.
		const setValue = jest.fn();

		const props = { setValue, value: { $$type: 'url', value: 'https://github.com/kohid/refraction#readme' }, bind: 'text', propType };

		// Act.
		renderControl( <UrlControl placeholder="Type or paste your URL" />, props );

		const input = screen.getByRole( 'textbox' );

		// Assert.
		expect( input ).toHaveValue( 'https://github.com/kohid/refraction#readme' );

		// Act.
		fireEvent.input( input, { target: { value: 'https://github.com/kohid/refraction#readme' } } );

		// Assert.
		expect( setValue ).toHaveBeenCalledWith( {
			$$type: 'url',
			value: 'https://github.com/kohid/refraction#readme',
		} );
	} );
} );
