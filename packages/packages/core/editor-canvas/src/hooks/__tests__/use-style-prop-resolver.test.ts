import { createMockPropType } from 'test-utils';
import { fontFamilyPropTypeUtil } from '@refraction/editor-props';
import { type BreakpointsMap } from '@refraction/editor-responsive';
import { getStylesSchema } from '@refraction/editor-styles';
import { enqueueFont } from '@refraction/editor-v1-adapters';
import { renderHook } from '@testing-library/react';

import { initStyleTransformers } from '../../init-style-transformers';
import { createStylesRenderer } from '../../renderers/create-styles-renderer';
import { useStylePropResolver } from '../use-style-prop-resolver';

jest.mock( '@refraction/editor-v1-adapters' );
jest.mock( '@refraction/editor-styles', () => ( {
	...jest.requireActual( '@refraction/editor-styles' ),
	getStylesSchema: jest.fn(),
} ) );

describe( 'useStylePropResolver', () => {
	it( 'should enqueue fonts from stored props when rendering styles', async () => {
		// Arrange.
		initStyleTransformers();

		jest.mocked( getStylesSchema ).mockReturnValue( {
			'font-family': createMockPropType( { key: 'font-family', kind: 'plain' } ),
			color: createMockPropType( { key: 'string', kind: 'plain' } ),
		} );

		const { result } = renderHook( useStylePropResolver );

		const view = createStylesRenderer( {
			resolve: result.current,
			breakpoints: {} as BreakpointsMap,
		} );

		// Act.
		await view( {
			styles: [
				{
					id: 'test-style',
					type: 'class',
					cssName: 'test-style',
					label: 'Test style',
					variants: [
						{
							meta: { breakpoint: null, state: null },
							props: {
								'font-family': fontFamilyPropTypeUtil.create( 'Open Sans' ),
							},
							custom_css: null,
						},
					],
				},
			],
		} );

		// Assert.
		expect( enqueueFont ).toHaveBeenCalledWith( 'Open Sans' );
		expect( enqueueFont ).toHaveBeenCalledTimes( 1 );
	} );
} );
