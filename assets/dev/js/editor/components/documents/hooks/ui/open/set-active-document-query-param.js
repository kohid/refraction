import { setQueryParam } from 'refraction-editor-utils/query-params';

export class SetActiveDocumentQueryParam extends $e.modules.hookUI.After {
	getCommand() {
		return 'editor/documents/open';
	}

	getId() {
		return 'set-active-document-query-param';
	}

	getConditions( args ) {
		// Don't run for the initial/default document because it's redundant.
		return parseInt( args.id ) !== parseInt( refraction.config.initial_document.id );
	}

	apply( args ) {
		const id = parseInt( args.id );

		if ( ! isNaN( id ) ) {
			setQueryParam( 'active-document', args.id );
		}
	}
}

export default SetActiveDocumentQueryParam;
