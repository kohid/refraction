import { openIconLibrary } from '../open-icon-library';

describe( 'openIconLibrary', () => {
	const originalRefraction = window.refraction;

	afterEach( () => {
		window.refraction = originalRefraction;
	} );

	it( 'should load libraries and show the icon manager modal', () => {
		// Arrange
		const loadIconLibraries = jest.fn();
		const show = jest.fn();

		window.refraction = {
			iconManager: {
				loadIconLibraries,
				show,
			},
		} as typeof window.refraction;

		// Act
		openIconLibrary();

		// Assert
		expect( loadIconLibraries ).toHaveBeenCalledTimes( 1 );
		expect( show ).toHaveBeenCalledTimes( 1 );
		expect( show ).toHaveBeenCalledWith(
			expect.objectContaining( {
				view: expect.objectContaining( {
					getControlValue: expect.any( Function ),
					setValue: expect.any( Function ),
					applySavedValue: expect.any( Function ),
				} ),
			} )
		);
	} );

	it( 'should call onSelect when the icon manager inserts an icon', () => {
		// Arrange
		const onSelect = jest.fn();
		const show = jest.fn();

		window.refraction = {
			iconManager: {
				loadIconLibraries: jest.fn(),
				show,
			},
		} as typeof window.refraction;

		openIconLibrary( { onSelect } );

		const view = show.mock.calls[ 0 ][ 0 ].view;
		const selectedIcon = { value: 'fas fa-star', library: 'fa-solid' };

		// Act
		view.setValue( selectedIcon );
		view.applySavedValue();

		// Assert
		expect( onSelect ).toHaveBeenCalledWith( selectedIcon );
	} );

	it( 'should pass the currently selected icon to the manager', () => {
		// Arrange
		const show = jest.fn();
		const selected = { value: 'fas fa-heart', library: 'fa-solid' };

		window.refraction = {
			iconManager: {
				loadIconLibraries: jest.fn(),
				show,
			},
		} as typeof window.refraction;

		// Act
		openIconLibrary( { selected } );

		// Assert
		expect( show.mock.calls[ 0 ][ 0 ].view.getControlValue() ).toEqual( selected );
	} );

	it( 'should not throw when the icon manager is unavailable', () => {
		// Arrange
		window.refraction = undefined;

		// Act & Assert
		expect( () => openIconLibrary() ).not.toThrow();
	} );
} );
