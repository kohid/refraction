import ComponentBase from 'refraction-api/modules/component-base';
import Document from './document';
import * as commands from './commands/';
import * as internalCommands from './commands/internal/';
import * as hooks from './hooks';

export default class Component extends ComponentBase {
	__construct( args = {} ) {
		super.__construct( args );

		/**
		 * All the documents.
		 *
		 * @type {Object.<Document>}
		 */
		this.documents = {};

		/**
		 * Current document.
		 *
		 * @type {Document}
		 */
		this.currentDocument = null;

		this.saveInitialDocumentToCache();
	}

	getNamespace() {
		return 'editor/documents';
	}

	defaultCommands() {
		return this.importCommands( commands );
	}

	defaultHooks() {
		return this.importHooks( hooks );
	}

	defaultCommandsInternal() {
		return this.importCommands( internalCommands );
	}

	/**
	 * Function add().
	 *
	 * Add's document to the manager.
	 *
	 * @param {Document} document
	 *
	 * @return {Document} document
	 */
	add( document ) {
		const { id } = document;

		// Save the document.
		this.documents[ id ] = document;

		return document;
	}

	/**
	 * Function addDocumentByConfig().
	 *
	 * Add document to manager by config.
	 *
	 * @param {{}} config
	 *
	 * @return {Document} document
	 */
	addDocumentByConfig( config ) {
		return this.add( new Document( config ) );
	}

	/**
	 * Function get().
	 *
	 * Get document by id.
	 *
	 * @param {number} id
	 *
	 * @return {Document|boolean} document, or false if doesn't exist
	 */
	get( id ) {
		if ( undefined !== this.documents[ id ] ) {
			return this.documents[ id ];
		}

		return false;
	}

	/**
	 * Function getCurrent().
	 *
	 * Return's current document.
	 *
	 * @return {Document} document
	 */
	getCurrent() {
		return this.currentDocument;
	}

	/**
	 * Function getCurrentId().
	 *
	 * Return's current document id.
	 *
	 * @return {number} document id
	 */
	getCurrentId() {
		return this.currentDocument.id;
	}

	getInitialId() {
		return refraction.config.initial_document.id;
	}

	setInitialById( id ) {
		const document = this.get( id );

		if ( ! document ) {
			return;
		}

		refraction.config.initial_document = document.config;
		refractionCommon.ajax.addRequestConstant( 'initial_document_id', document.id );
	}

	/**
	 * Function setCurrent().
	 *
	 * set current document by document instance.
	 *
	 * @param {Document} document
	 */
	setCurrent( document ) {
		if ( undefined === this.documents[ document.id ] ) {
			throw Error( `The document with id: '${ document.id }' does not exist/loaded` );
		}

		if ( this.currentDocument ) {
			this.currentDocument.editor.status = 'closed';
		}

		this.currentDocument = this.documents[ document.id ];
		this.currentDocument.editor.status = 'open';

		refractionCommon.ajax.addRequestConstant( 'editor_post_id', document.id );
	}

	isCurrent( id ) {
		return parseInt( id ) === this.currentDocument.id;
	}

	unsetCurrent() {
		this.currentDocument = null;
		refractionCommon.ajax.addRequestConstant( 'editor_post_id', null );
	}

	request( id ) {
		return refractionCommon.ajax.load( this.getRequestArgs( id ), true );
	}

	invalidateCache( id = null ) {
		if ( id ) {
			refractionCommon.ajax.invalidateCache( this.getRequestArgs( id ) );
			return;
		}

		Object.keys( this.documents ).forEach( ( docId ) => {
			refractionCommon.ajax.invalidateCache( this.getRequestArgs( docId ) );
		} );
	}

	getRequestArgs( id ) {
		id = parseInt( id );

		return {
			action: 'get_document_config',
			retry: true,
			unique_id: `document-${ id }`,
			data: { id },
			success: ( config ) => config,
			error: ( data ) => {
				let message;

				if ( _.isString( data ) ) {
					message = data;
				} else if ( data.statusText ) {
					message = refraction.createAjaxErrorMessage( data );

					if ( 0 === data.readyState ) {
						message += ' ' + __( 'Cannot load editor', 'refraction' );
					}
				} else if ( data[ 0 ] && data[ 0 ].code ) {
					message = __( 'Server Error', 'refraction' ) + ' ' + data[ 0 ].code;
				}

				// eslint-disable-next-line no-alert
				alert( message );
			},
		};
	}

	/**
	 * Temp: Don't request initial document via ajax.
	 * Keep the event `refraction:init` before `preview:loaded`.
	 */
	saveInitialDocumentToCache() {
		const document = refraction.config.initial_document;
		refractionCommon.ajax.addRequestCache( this.getRequestArgs( document.id ), document );
	}
}
