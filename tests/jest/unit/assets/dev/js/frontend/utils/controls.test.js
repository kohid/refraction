import Controls from 'refraction-frontend-utils/controls';
const responsiveSettingsObject = require( './responsiveSettings.json' );

describe( 'Controls', () => {
	beforeAll( async () => {
		global.refractionFrontend = {
			getCurrentDeviceMode: jest.fn(),
			breakpoints: {
				getActiveBreakpointsList: jest.fn(),
			},
		};

		refractionFrontend.breakpoints.getActiveBreakpointsList.mockReturnValue( [
			'mobile',
			'mobile_extra',
			'tablet',
			'tablet_extra',
			'laptop',
			'desktop',
			'widescreen',
		] );
	} );

	afterAll( () => {
		delete global.refractionFrontend;
	} );

	test( 'Test responsive control values', () => {
		responsiveControlValueTest( 'mobile', 2, 20 );
		responsiveControlValueTest( 'mobile_extra', 'string', 0 );
		responsiveControlValueTest( 'tablet', 'string', 0 );
		responsiveControlValueTest( 'tablet_extra', 'string', 30 );
		responsiveControlValueTest( 'laptop', 1, 10 );
		responsiveControlValueTest( 'desktop', 1, 10 );
		responsiveControlValueTest( 'widescreen', 1, 'widescreenValue' );
	} );

	test( 'Get Control Value', () => {
		// Arrange.
		const controls = new Controls();

		const values = {
			testControl: 'testControlValue',
			testControlObject: {
				testSubControl: 'testSubControlValue',
			},
		};

		// Act - Test regular condition value.
		const controlValue = controls.getControlValue( values, 'testControl' );

		// Assert.
		expect( controlValue ).toBe( 'testControlValue' );

		// Act - Test sub-condition value.
		const subControlValue = controls.getControlValue( values, 'testControlObject', 'testSubControl' );

		// Assert.
		expect( subControlValue ).toBe( 'testSubControlValue' );
	} );
} );

async function responsiveControlValueTest( deviceMode, expectedValue1, expectedValue2 ) {
	// Arrange.
	const controls = new Controls();
	refractionFrontend.getCurrentDeviceMode.mockReturnValue( deviceMode );

	// Act.
	const responsiveSingleControlValue = controls.getResponsiveControlValue( responsiveSettingsObject, 'testControlSingle' ),
		responsiveSubControlValue = controls.getResponsiveControlValue( responsiveSettingsObject, 'testControlParent', 'testSubControl' );

	// Assert.
	expect( responsiveSingleControlValue ).toBe( expectedValue1 );
	expect( responsiveSubControlValue ).toBe( expectedValue2 );
}
