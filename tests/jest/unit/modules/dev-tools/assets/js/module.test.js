import Module from 'refraction/modules/dev-tools/assets/js/module';

describe( 'modules/dev-tools/assets/js/module.js', () => {
	beforeEach( () => {
		global.refractionDevToolsConfig = {
			deprecation: {
				soft_notices: {
					'refraction/old/hook': [
						'3.5.0',
						'refraction/new/hook',
					],
					'refraction/old/hook2': [
						'3.6.0',
						'refraction/new/hook2',
					],
				},
			},
		};
	} );

	it( 'Should print soft deprecation', () => {
		// Arrange.
		const deprecationMock = new class {
			deprecated = jest.fn();
		};

		const devToolsModule = new Module( deprecationMock );

		// Act.
		devToolsModule.notifyBackendDeprecations();

		// Assert.
		expect( deprecationMock.deprecated ).toBeCalledTimes( 2 );
		expect( deprecationMock.deprecated ).toBeCalledWith( 'refraction/old/hook', '3.5.0', 'refraction/new/hook' );
		expect( deprecationMock.deprecated ).toBeCalledWith( 'refraction/old/hook2', '3.6.0', 'refraction/new/hook2' );
	} );
} );
