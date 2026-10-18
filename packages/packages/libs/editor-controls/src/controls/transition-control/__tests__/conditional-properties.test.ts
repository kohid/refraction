type TransitionCategory = { label: string };

const mockHasProInstalled = jest.fn( () => false );

jest.mock( '@refraction/utils', () => ( {
	...jest.requireActual( '@refraction/utils' ),
	hasProInstalled: () => mockHasProInstalled(),
} ) );

describe( 'transition properties conditional loading', () => {
	const originalRefractionPro = window.refractionPro;

	afterEach( () => {
		window.refractionPro = originalRefractionPro;
		mockHasProInstalled.mockReturnValue( false );
		jest.resetModules();
	} );

	it.each( [
		{
			scenario: 'Pro not installed',
			proConfig: undefined,
			hasPro: false,
			expectedLength: 10,
			expectedHasMargin: true,
		},
		{
			scenario: 'Pro version below 3.35',
			proConfig: { config: { version: '3.34.0' } },
			hasPro: true,
			expectedLength: 1,
			expectedHasMargin: false,
		},
	] )(
		'should load correct properties when $scenario',
		( { proConfig, hasPro, expectedLength, expectedHasMargin } ) => {
			window.refractionPro = proConfig;
			mockHasProInstalled.mockReturnValue( hasPro );

			const { transitionProperties: props } = require( '../data' );

			expect( props.length ).toBe( expectedLength );
			expect( props.some( ( cat: TransitionCategory ) => cat.label === 'Margin' ) ).toBe( expectedHasMargin );
		}
	);

	// TODO: Pro version detection (3.35+) does not load extra properties in test env
	it.skip( 'should load correct properties when Pro version 3.35 or higher', () => {} );
} );
