export const Save = () => {
	QUnit.module( 'Save', () => {
		QUnit.test( 'Simple', async ( assert ) => {
			const response = await $e.internal( 'document/save/save' );

			assert.equal( response.data.status, 'draft', 'The response status is: "draft"' );
		} );

		QUnit.test( 'Multiple documents', async ( assert ) => {
			const documentConfigs = [
					{ id: 2 },
					{ id: 3 },
				],
				documents = [];

			// Add fake documents.
			documentConfigs.forEach( ( config ) => {
				documents.push( refraction.documents.addDocumentByConfig( config ) );
			} );

			for ( const document of documents ) {
				document.container = refraction.getPreviewContainer();

				const response = await $e.internal( 'document/save/save', { document } );

				assert.equal( response.data.status, 'draft', 'The response status is: "draft"' );
			}
		} );
	} );
};

export default Save;
