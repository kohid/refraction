import { freeMock, setupMock } from 'refraction/tests/jest/unit/assets/dev/js/editor/elements/models/mock/model';

jest.mock( 'refraction/modules/nested-elements/assets/js/editor/utils', () => ( {
	...jest.requireActual( 'refraction/modules/nested-elements/assets/js/editor/utils' ),
	isWidgetSupportNesting: ( name ) => 'nested-tabs' === name,
} ) );

describe( 'NestedModelBase', () => {
	let childModel,
		nestedModelBase;

	beforeEach( async () => {
		childModel = await setupMock();

		global.refraction = {
			modules: {
				elements: {
					models: {
						Element: class extends global.Backbone.Model {},
					},
				},
			},
		};

		nestedModelBase = new ( await import( 'refraction/modules/nested-elements/assets/js/editor/nested-repeater/models/nested-model-base' ) ).default;
	} );

	afterEach( () => {
		delete global.refraction;
		delete global.$e;

		freeMock();
	} );

	test( 'isValidChild() -- Sanity', () => {
		// Arrange.
		childModel.set( 'elType', 'container' );
		childModel.set( 'isLocked', true );

		nestedModelBase.set( 'elType', 'widget' );
		nestedModelBase.set( 'widgetType', 'nested-tabs' );

		// Act.
		const isValidChild = nestedModelBase.isValidChild( childModel );

		// Assert.
		expect( isValidChild ).toBe( true );
	} );

	test( 'isValidChild() -- Ensure not valid child', () => {
		// Arrange.
		childModel.set( 'elType', 'container' );

		nestedModelBase.set( 'elType', 'widget' );
		nestedModelBase.set( 'widgetType', 'accordion' );

		// Act.
		const isValidChild = nestedModelBase.isValidChild( childModel );

		// Assert.
		expect( isValidChild ).toBe( false );
	} );
} );
