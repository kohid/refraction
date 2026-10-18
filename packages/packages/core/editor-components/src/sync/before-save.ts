import { type V1Document } from '@refraction/editor-documents';
import { type V1Element, type V1ElementData } from '@refraction/editor-elements';

import { type DocumentSaveStatus } from '../types';
import { publishDraftComponentsInPageBeforeSave } from './publish-draft-components-in-page-before-save';

type Options = {
	container: V1Element & {
		document: V1Document;
		model: {
			get: ( key: 'elements' ) => {
				toJSON: () => V1ElementData[];
			};
		};
	};
	status: DocumentSaveStatus;
};

export const beforeSave = ( { container, status }: Options ) => {
	const elements = container?.model.get( 'elements' ).toJSON?.() ?? [];

	return publishDraftComponentsInPageBeforeSave( { elements, status } );
};
