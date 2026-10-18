import { type Document } from '@refraction/editor-documents';
import { ajax } from '@refraction/editor-v1-adapters';

// Mirrors the v1 documents manager request args so both share one ajax cache entry, keeping
// `refraction.documents.invalidateCache()` effective. Unlike the manager, this omits `immediately`,
// so component fetches triggered together merge into a single batched request.
const getComponentDocumentParams = ( id: number ) => ( {
	action: 'get_document_config',
	retry: true,
	unique_id: `document-${ id }`,
	data: { id },
} );

const pendingRequests = new Map< number, Promise< Document | null > >();

export const getComponentDocumentData = ( id: number ): Promise< Document | null > => {
	const pendingRequest = pendingRequests.get( id );

	if ( pendingRequest ) {
		return pendingRequest;
	}

	const request = ajax
		.load< { id: number }, Document >( getComponentDocumentParams( id ) )
		.catch( () => null )
		.finally( () => pendingRequests.delete( id ) );

	pendingRequests.set( id, request );

	return request;
};
