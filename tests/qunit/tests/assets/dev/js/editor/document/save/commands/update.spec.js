export const Update = () => {
	QUnit.module( 'Update', () => {
		QUnit.test( 'Simple', async ( assert ) => {
			const response = await $e.run( 'document/save/update' );

			assert.equal( response.data.status,
				refraction.documents.getCurrent().container.settings.get( 'post_status' ),
			);
		} );
	} );
};

export default Update;
