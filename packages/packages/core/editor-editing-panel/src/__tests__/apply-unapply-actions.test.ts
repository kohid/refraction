import { createMockStyleDefinition, createMockStylesProvider } from 'test-utils';
import { setDocumentModifiedStatus } from '@refraction/editor-documents';
import { updateElementSettings } from '@refraction/editor-elements';
import { stylesRepository } from '@refraction/editor-styles-repository';

import { doApplyClasses } from '../apply-unapply-actions';

jest.mock( '@refraction/editor-documents' );
jest.mock( '@refraction/editor-elements' );
jest.mock( '@refraction/editor-styles-repository', () => ( {
	...jest.requireActual( '@refraction/editor-styles-repository' ),
	stylesRepository: {
		getProviderByKey: jest.fn(),
		getProviders: jest.fn(),
	},
} ) );

describe( 'apply-unapply-actions', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		jest.mocked( stylesRepository.getProviderByKey ).mockReturnValue( undefined );
	} );

	it( 'calls the owning style provider actions.get for each applied class id', () => {
		// Arrange.
		const elementId = 'element-1';
		const appliedStyleId = 'global-class-a';
		const styleDefinition = createMockStyleDefinition( { id: appliedStyleId } );
		const owningProvider = createMockStylesProvider( { key: 'global-classes' }, [ styleDefinition ] );
		const otherProvider = createMockStylesProvider( { key: 'local-classes' }, [
			createMockStyleDefinition( { id: 'other-class' } ),
		] );

		jest.mocked( stylesRepository.getProviders ).mockReturnValue( [ owningProvider, otherProvider ] );

		// Act.
		doApplyClasses( elementId, [ appliedStyleId ] );

		// Assert.
		expect( owningProvider.actions.get ).toHaveBeenCalledWith( appliedStyleId );
		expect( otherProvider.actions.get ).not.toHaveBeenCalled();
		expect( updateElementSettings ).toHaveBeenCalled();
		expect( setDocumentModifiedStatus ).toHaveBeenCalledWith( true );
	} );
} );
