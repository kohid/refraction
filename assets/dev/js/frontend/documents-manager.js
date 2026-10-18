import Document from './document';

export default class extends refractionModules.ViewModule {
	constructor( ...args ) {
		super( ...args );

		this.documents = {};

		this.initDocumentClasses();

		this.attachDocumentsClasses();
	}

	getDefaultSettings() {
		return {
			selectors: {
				document: '.refraction',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$documents: jQuery( selectors.document ),
		};
	}

	initDocumentClasses() {
		this.documentClasses = {
			base: Document,
		};

		refractionFrontend.hooks.doAction( 'refraction/frontend/documents-manager/init-classes', this );
	}

	addDocumentClass( documentType, documentClass ) {
		this.documentClasses[ documentType ] = documentClass;
	}

	attachDocumentsClasses() {
		this.elements.$documents.each( ( index, document ) => this.attachDocumentClass( jQuery( document ) ) );
	}

	attachDocumentClass( $document ) {
		const documentData = $document.data(),
			documentID = documentData.refractionId,
			documentType = documentData.refractionType,
			DocumentClass = this.documentClasses[ documentType ] || this.documentClasses.base;

		this.documents[ documentID ] = new DocumentClass( {
			$element: $document,
			id: documentID,
		} );
	}
}
