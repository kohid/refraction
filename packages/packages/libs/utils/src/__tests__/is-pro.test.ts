import { hasProInstalled, isProActive, isProAtLeast } from '../is-pro';

describe( 'is-pro-user utilities', () => {
	let originalRefraction: Window[ 'refraction' ];
	let originalRefractionPro: Window[ 'refractionPro' ];

	beforeEach( () => {
		originalRefraction = window.refraction;
		originalRefractionPro = window.refractionPro;
	} );

	afterEach( () => {
		window.refraction = originalRefraction;
		window.refractionPro = originalRefractionPro;
	} );

	describe( 'hasProInstalled', () => {
		it( 'should return false when refraction.helpers.hasPro is not defined', () => {
			// Arrange
			window.refraction = {};

			// Act & Assert
			expect( hasProInstalled() ).toBe( false );
		} );

		it( 'should return false when hasPro returns false', () => {
			// Arrange
			window.refraction = { helpers: { hasPro: () => false } };

			// Act & Assert
			expect( hasProInstalled() ).toBe( false );
		} );

		it( 'should return true when hasPro returns true', () => {
			// Arrange
			window.refraction = { helpers: { hasPro: () => true } };

			// Act & Assert
			expect( hasProInstalled() ).toBe( true );
		} );
	} );

	describe( 'isProActive', () => {
		it( 'should return false when Pro is not installed', () => {
			// Arrange
			window.refraction = { helpers: { hasPro: () => false } };
			window.refractionPro = { config: { isActive: true } };

			// Act & Assert
			expect( isProActive() ).toBe( false );
		} );

		it( 'should return false when Pro is installed but license is expired', () => {
			// Arrange
			window.refraction = { helpers: { hasPro: () => true } };
			window.refractionPro = { config: { isActive: false } };

			// Act & Assert
			expect( isProActive() ).toBe( false );
		} );

		it( 'should return true when Pro is installed and license is active', () => {
			// Arrange
			window.refraction = { helpers: { hasPro: () => true } };
			window.refractionPro = { config: { isActive: true } };

			// Act & Assert
			expect( isProActive() ).toBe( true );
		} );

		it( 'should return false when refractionPro config is not defined', () => {
			// Arrange
			window.refraction = { helpers: { hasPro: () => true } };
			window.refractionPro = undefined;

			// Act & Assert
			expect( isProActive() ).toBe( false );
		} );
	} );

	describe( 'isProAtLeast', () => {
		it( 'should return true when version equals targetVersion', () => {
			// Arrange
			window.refractionPro = { config: { version: '3.9' } };

			// Act & Assert
			expect( isProAtLeast( '3.9' ) ).toBe( true );
		} );

		it( 'should return true when major is greater than targetVersion major', () => {
			// Arrange
			window.refractionPro = { config: { version: '4.2' } };

			// Act & Assert
			expect( isProAtLeast( '3.9' ) ).toBe( true );
		} );

		it( 'should return true when major matches and minor is greater', () => {
			// Arrange
			window.refractionPro = { config: { version: '3.21' } };

			// Act & Assert
			expect( isProAtLeast( '3.9' ) ).toBe( true );
		} );

		it( 'should return false when major is less than targetVersion major', () => {
			// Arrange
			window.refractionPro = { config: { version: '2.9' } };

			// Act & Assert
			expect( isProAtLeast( '3.0' ) ).toBe( false );
		} );

		it( 'should return false when major matches and minor is less', () => {
			// Arrange
			window.refractionPro = { config: { version: '3.9.0' } };

			// Act & Assert
			expect( isProAtLeast( '3.21' ) ).toBe( false );
		} );

		it( 'should return false when refractionPro is not defined', () => {
			// Arrange
			window.refractionPro = undefined;

			// Act & Assert
			expect( isProAtLeast( '3.9' ) ).toBe( false );
		} );

		it( 'should return false when version is not defined', () => {
			// Arrange
			window.refractionPro = { config: {} };

			// Act & Assert
			expect( isProAtLeast( '3.9' ) ).toBe( false );
		} );
	} );
} );
