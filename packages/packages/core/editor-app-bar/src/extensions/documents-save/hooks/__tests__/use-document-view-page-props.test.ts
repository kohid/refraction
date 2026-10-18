import { createMockDocument } from 'test-utils';
import { __useActiveDocument as useActiveDocument } from '@refraction/editor-documents';
import { __privateRunCommand as runCommand } from '@refraction/editor-v1-adapters';
import { renderHook } from '@testing-library/react';

import useViewPageProps from '../use-document-view-page-props';

jest.mock( '@refraction/editor-documents' );
jest.mock( '@refraction/editor-v1-adapters' );

describe( '@refraction/editor-app-bar - useDocumentViewProps', () => {
	it( 'should open the document view', () => {
		// Arrange.
		jest.mocked( useActiveDocument ).mockReturnValue( createMockDocument() );

		const command = 'editor/documents/view';
		const args = { id: 1 };

		// Act.
		const { result } = renderHook( () => useViewPageProps() );
		result.current.onClick();

		// Assert.
		expect( runCommand ).toBeCalledTimes( 1 );
		expect( runCommand ).toHaveBeenCalledWith( command, args );
	} );

	it( 'should not run the command when there is no document', () => {
		// Arrange.
		jest.mocked( useActiveDocument ).mockReturnValue( null );

		// Act.
		const { result } = renderHook( () => useViewPageProps() );
		result.current.onClick();

		// Assert.
		expect( runCommand ).toBeCalledTimes( 0 );
	} );
} );
