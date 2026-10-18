import * as React from 'react';
import { createPortal } from 'react-dom';
import { createDOMElement } from 'test-utils';
import { getCanvasIframeDocument } from '@refraction/editor-v1-adapters';
import { render, renderHook } from '@testing-library/react';

import { useDocumentsCssLinks } from '../use-documents-css-links';

jest.mock( '@refraction/editor-v1-adapters', () => ( {
	...jest.requireActual( '@refraction/editor-v1-adapters' ),
	getCanvasIframeDocument: jest.fn(),
} ) );

describe( 'useDocumentsCssLinks', () => {
	const head = createDOMElement( {
		tag: 'head',
		children: [
			createDOMElement( {
				tag: 'link',
				attrs: { href: '2.css', rel: 'stylesheet', id: 'refraction-post-2-css' },
			} ),
			createDOMElement( {
				tag: 'link',
				attrs: { href: '10.css', rel: 'stylesheet', id: 'refraction-post-10-css' },
			} ),
			createDOMElement( {
				tag: 'link',
				attrs: { href: '5.css', rel: 'stylesheet', id: 'refraction-post-5-css' },
			} ),
			createDOMElement( {
				tag: 'link',
				attrs: { href: 'not-refraction.css', rel: 'stylesheet', id: 'not-refraction-css' },
			} ),
		],
	} );

	const body = createDOMElement( {
		tag: 'body',
		children: [
			createDOMElement( { tag: 'div', attrs: { 'data-refraction-id': '2' } } ),
			createDOMElement( { tag: 'div', attrs: { 'data-refraction-id': '4' } } ),
			createDOMElement( {
				tag: 'div',
				children: [ createDOMElement( { tag: 'div', attrs: { 'data-refraction-id': '5' } } ) ],
			} ),
		],
	} );

	const Component = () => {
		const links = useDocumentsCssLinks();

		return createPortal(
			<>
				{ links.map( ( link ) => (
					<link key={ link.id } { ...link } data-from-hook />
				) ) }
			</>,
			head
		);
	};

	it( 'should return an array of links attrs and remove them from the dom', () => {
		// Arrange.
		const document = { body, head };

		jest.mocked( getCanvasIframeDocument ).mockReturnValue( document as never );

		// Act.
		render( <Component /> );

		// Assert.
		expect( head ).toMatchSnapshot();
	} );

	it( 'should return empty array when iframe document is not available', () => {
		// Arrange.
		jest.mocked( getCanvasIframeDocument ).mockReturnValue( null );

		// Act.
		const { result } = renderHook( () => useDocumentsCssLinks(), { initialProps: {} } );

		// Assert.
		expect( result.current ).toEqual( [] );
	} );
} );
